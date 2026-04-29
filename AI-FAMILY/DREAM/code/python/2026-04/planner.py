"""
GABRIEL Move Planner
═════════════════════════════════════════════════════════════════════

Plans file and folder moves for codebase organization.
Detects projects and loose files, generates move plans.

"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import List, Set

from gabriel.config import VERSION, RESERVED_TOPLEVEL, CODE_EXTENSIONS
from gabriel.console import console
from gabriel.core.detector import ProjectDetector
from gabriel.models import MoveItem, MoveKind, MovePlan, ProjectInfo
from gabriel.models.language import get_language_by_extension
from gabriel.utils import (
    PathManager,
    is_subpath,
    sanitize_name,
    unique_path,
    should_ignore_dir,
    should_ignore_file,
    get_dir_stats,
)


class MovePlanner:
    """
    Plans file and folder moves for organization.
    
    Analyzes the codebase to:
    - Detect project roots
    - Find loose code files
    - Generate a move plan
    """
    
    def __init__(self, paths: PathManager) -> None:
        self.paths = paths
        self.detector = ProjectDetector(paths)
    
    # ─────────────────────────────────────────────────────────────────
    # Plan Creation
    # ─────────────────────────────────────────────────────────────────
    
    def create_plan(self) -> MovePlan:
        """
        Create a complete move plan for the codebase.
        
        Returns:
            MovePlan with all proposed moves
        """
        console.section("Analyzing Repository Structure")
        
        moves: List[MoveItem] = []
        stats = {
            "projects_found": 0,
            "projects_to_move": 0,
            "loose_files_found": 0,
            "total_size_bytes": 0,
            "total_files": 0,
        }
        
        # ─────────────────────────────────────────────────────────────
        # Step 1: Detect projects
        # ─────────────────────────────────────────────────────────────
        
        projects = self.detector.find_project_roots(show_progress=True)
        stats["projects_found"] = len(projects)
        console.success(f"Found {len(projects)} projects")
        
        # ─────────────────────────────────────────────────────────────
        # Step 2: Plan project moves
        # ─────────────────────────────────────────────────────────────
        
        project_roots: List[Path] = []
        
        for project in projects:
            # Skip if already in organized location
            if self._is_already_organized(project.root):
                console.debug(f"Already organized: {project.root}")
                continue
            
            project_roots.append(project.root)
            
            # Generate destination path
            dest_name = self._generate_project_name(project)
            dst = unique_path(self.paths.projects, dest_name)
            
            move = MoveItem(
                src=project.root,
                dst=dst,
                kind=MoveKind.PROJECT,
                reason=f"Project with markers: {', '.join(project.markers_found[:3])}",
                language=project.language,
                size_bytes=project.size_bytes,
                file_count=project.file_count,
                metadata={
                    "has_git": project.has_git,
                    "markers": project.markers_found,
                },
            )
            moves.append(move)
            
            stats["projects_to_move"] += 1
            stats["total_size_bytes"] += project.size_bytes
            stats["total_files"] += project.file_count
        
        if stats["projects_to_move"] > 0:
            console.info(f"Projects to organize: {stats['projects_to_move']}")
        
        # ─────────────────────────────────────────────────────────────
        # Step 3: Find loose code files
        # ─────────────────────────────────────────────────────────────
        
        console.spinner_start("Finding loose code files")
        loose_moves = self._find_loose_files(project_roots)
        console.spinner_stop()
        
        moves.extend(loose_moves)
        stats["loose_files_found"] = len(loose_moves)
        
        if loose_moves:
            loose_size = sum(m.size_bytes for m in loose_moves)
            stats["total_size_bytes"] += loose_size
            stats["total_files"] += len(loose_moves)
            console.success(f"Found {len(loose_moves)} loose code files")
        
        # ─────────────────────────────────────────────────────────────
        # Step 4: Create plan
        # ─────────────────────────────────────────────────────────────
        
        plan = MovePlan(
            version=VERSION,
            created_at=datetime.now(),
            root=self.paths.root,
            moves=moves,
            stats=stats,
        )
        
        return plan
    
    # ─────────────────────────────────────────────────────────────────
    # Loose File Detection
    # ─────────────────────────────────────────────────────────────────
    
    def _find_loose_files(self, exclude_roots: List[Path]) -> List[MoveItem]:
        """
        Find loose code files not part of any project.
        
        Args:
            exclude_roots: Project roots to exclude from search
            
        Returns:
            List of MoveItems for loose files
        """
        moves: List[MoveItem] = []
        exclude_set = set(exclude_roots)
        
        # Scan non-reserved top-level directories
        for top_dir in self.paths.root.iterdir():
            if not top_dir.is_dir():
                continue
            if top_dir.name in RESERVED_TOPLEVEL:
                continue
            if should_ignore_dir(top_dir):
                continue
            
            # Walk the directory
            for path in top_dir.rglob("*"):
                if not path.is_file():
                    continue
                if should_ignore_file(path):
                    continue
                
                # Skip if in ignored directory
                if any(should_ignore_dir(p) for p in path.parents):
                    continue
                
                # Skip if inside any project root
                if any(is_subpath(path, root) for root in exclude_set):
                    continue
                
                # Check if it's a code file
                ext = path.suffix.lower()
                if ext not in CODE_EXTENSIONS:
                    continue
                
                # Skip markdown (usually documentation)
                if ext in (".md", ".markdown", ".mdx"):
                    continue
                
                # Get language info
                lang = get_language_by_extension(ext)
                lang_name = lang.name if lang else "unknown"
                lang_display = lang.display if lang else "Unknown"
                
                # Generate destination
                dst_dir = self.paths.loose_code / lang_name
                dst = unique_path(dst_dir, path.name, is_file=True)
                
                # Get file size
                try:
                    size = path.stat().st_size
                except OSError:
                    size = 0
                
                move = MoveItem(
                    src=path,
                    dst=dst,
                    kind=MoveKind.LOOSE,
                    reason=f"Loose {lang_display} file",
                    language=lang_name,
                    size_bytes=size,
                    file_count=1,
                )
                moves.append(move)
        
        return moves
    
    # ─────────────────────────────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────────────────────────────
    
    def _is_already_organized(self, path: Path) -> bool:
        """Check if path is already in an organized location."""
        organized_dirs = [
            self.paths.projects,
            self.paths.libraries,
            self.paths.templates,
            self.paths.automations,
            self.paths.intake,
            self.paths.archive,
        ]
        
        return any(is_subpath(path, d) for d in organized_dirs if d.exists())
    
    def _generate_project_name(self, project: ProjectInfo) -> str:
        """
        Generate a destination name for a project.
        
        Format: {name}__{language}
        
        Args:
            project: ProjectInfo to name
            
        Returns:
            Sanitized project name
        """
        base_name = sanitize_name(project.name)
        lang = project.language if project.language != "unknown" else "misc"
        
        return f"{base_name}__{lang}"
    
    # ─────────────────────────────────────────────────────────────────
    # Plan Management
    # ─────────────────────────────────────────────────────────────────
    
    def save_plan(self, plan: MovePlan, path: Path = None) -> Path:
        """
        Save a move plan to disk.
        
        Args:
            plan: MovePlan to save
            path: Optional custom path
            
        Returns:
            Path where plan was saved
        """
        if path is None:
            path = self.paths.move_plan_path
        
        plan.save(path)
        console.debug(f"Saved plan: {path}")
        
        return path
    
    def load_plan(self, path: Path = None) -> MovePlan:
        """
        Load a move plan from disk.
        
        Args:
            path: Optional custom path
            
        Returns:
            Loaded MovePlan
            
        Raises:
            FileNotFoundError: If plan doesn't exist
        """
        if path is None:
            path = self.paths.move_plan_path
        
        if not path.exists():
            raise FileNotFoundError(f"No plan found at {path}")
        
        return MovePlan.load(path)
    
    def plan_exists(self) -> bool:
        """Check if a move plan exists."""
        return self.paths.move_plan_path.exists()
    
    # ─────────────────────────────────────────────────────────────────
    # Summary
    # ─────────────────────────────────────────────────────────────────
    
    def print_plan_summary(self, plan: MovePlan) -> None:
        """Print a summary of a move plan."""
        from gabriel.utils.files import format_size
        
        console.section("Plan Summary")
        
        # Stats table
        rows = [
            ["Projects to move", str(plan.stats.get("projects_to_move", 0))],
            ["Loose files", str(plan.stats.get("loose_files_found", 0))],
            ["Total moves", str(len(plan.moves))],
            ["Total files", str(plan.stats.get("total_files", 0))],
            ["Total size", format_size(plan.stats.get("total_size_bytes", 0))],
        ]
        
        console.table(["Metric", "Value"], rows)
        
        # Group by kind
        by_kind: dict[MoveKind, int] = {}
        for move in plan.moves:
            by_kind[move.kind] = by_kind.get(move.kind, 0) + 1
        
        if len(by_kind) > 1:
            console.newline()
            console.info("By type:")
            for kind, count in sorted(by_kind.items(), key=lambda x: -x[1]):
                console.bullet(f"{kind.value}: {count}")
        
        # Group by language
        by_lang: dict[str, int] = {}
        for move in plan.moves:
            by_lang[move.language] = by_lang.get(move.language, 0) + 1
        
        if len(by_lang) > 1:
            console.newline()
            console.info("By language:")
            for lang, count in sorted(by_lang.items(), key=lambda x: -x[1])[:10]:
                console.bullet(f"{lang}: {count}")
            if len(by_lang) > 10:
                console.bullet(f"... and {len(by_lang) - 10} more")
