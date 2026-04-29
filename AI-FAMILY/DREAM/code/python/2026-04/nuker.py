"""
GABRIEL Source Nuker
═════════════════════════════════════════════════════════════════════

Safely removes original source files after successful moves.
Requires ARM=NUKE environment variable for safety.

⚠️  DESTRUCTIVE OPERATION - USE WITH EXTREME CAUTION ⚠️

"""

from __future__ import annotations

import os
import shutil
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple

from gabriel.console import console
from gabriel.models import MovePlan, RollbackInfo
from gabriel.utils import PathManager, safe_mkdir


@dataclass
class NukeResult:
    """Result of a nuke operation."""
    
    files_removed: int = 0
    dirs_removed: int = 0
    bytes_freed: int = 0
    errors: List[str] = field(default_factory=list)
    aborted: bool = False
    reason: Optional[str] = None


class SourceNuker:
    """
    Removes original source files after successful moves.
    
    SAFETY REQUIREMENTS:
    - ARM=NUKE environment variable must be set
    - Rollback info must exist
    - All moves must have been applied
    - No old references should remain (run verify_refs first)
    """
    
    # Required environment variable for arming
    ARM_ENV_VAR = "ARM"
    ARM_VALUE = "NUKE"
    
    def __init__(self, paths: PathManager) -> None:
        self.paths = paths
    
    # ─────────────────────────────────────────────────────────────────
    # Safety Checks
    # ─────────────────────────────────────────────────────────────────
    
    def is_armed(self) -> bool:
        """Check if nuke is armed via environment variable."""
        return os.environ.get(self.ARM_ENV_VAR) == self.ARM_VALUE
    
    def check_prerequisites(self) -> Tuple[bool, List[str]]:
        """
        Check all prerequisites for nuking.
        
        Returns:
            Tuple of (can_proceed, list of issues)
        """
        issues: List[str] = []
        
        # Check ARM environment variable
        if not self.is_armed():
            issues.append(
                f"Nuke not armed. Set {self.ARM_ENV_VAR}={self.ARM_VALUE} to proceed."
            )
        
        # Check rollback exists
        if not self.paths.latest_rollback_path.exists():
            issues.append(
                "No rollback information found. Run 'gabriel apply' first."
            )
        
        # Check plan exists
        if not self.paths.move_plan_path.exists():
            issues.append(
                "No move plan found. Run 'gabriel plan' first."
            )
        
        return len(issues) == 0, issues
    
    # ─────────────────────────────────────────────────────────────────
    # Nuke Operation
    # ─────────────────────────────────────────────────────────────────
    
    def nuke_sources(
        self,
        plan: Optional[MovePlan] = None,
        rollback: Optional[RollbackInfo] = None,
        force: bool = False,
        dry_run: bool = False,
    ) -> NukeResult:
        """
        Remove original source files.
        
        Args:
            plan: MovePlan to use (loads from disk if not provided)
            rollback: RollbackInfo to verify against (loads if not provided)
            force: Skip confirmation prompts
            dry_run: Only preview, don't delete
            
        Returns:
            NukeResult with stats
        """
        result = NukeResult()
        
        console.section("🔥 NUKE SOURCES 🔥")
        
        if dry_run:
            console.warning("DRY RUN - No files will be deleted")
        
        # ─────────────────────────────────────────────────────────────
        # Safety checks
        # ─────────────────────────────────────────────────────────────
        
        can_proceed, issues = self.check_prerequisites()
        
        if not can_proceed and not dry_run:
            console.error("Prerequisites not met:")
            for issue in issues:
                console.bullet(issue)
            result.aborted = True
            result.reason = "Prerequisites not met"
            return result
        
        # ─────────────────────────────────────────────────────────────
        # Load plan and rollback
        # ─────────────────────────────────────────────────────────────
        
        if plan is None:
            plan = MovePlan.load(self.paths.move_plan_path)
        
        if rollback is None and self.paths.latest_rollback_path.exists():
            rollback = RollbackInfo.load(self.paths.latest_rollback_path)
        
        # Build list of sources to remove
        sources_to_remove: List[Path] = []
        
        if rollback:
            # Use rollback info (more accurate - shows what was actually moved)
            for original, moved_to in rollback.moves_applied:
                original_path = Path(original)
                moved_path = Path(moved_to)
                
                # Only remove if destination exists (move was successful)
                if moved_path.exists():
                    sources_to_remove.append(original_path)
        else:
            # Fall back to plan
            for move in plan.moves:
                if move.dst.exists():
                    sources_to_remove.append(move.src)
        
        # Filter to only existing sources
        existing_sources = [s for s in sources_to_remove if s.exists()]
        
        console.info(f"Sources to remove: {len(existing_sources)}")
        
        if not existing_sources:
            console.success("No sources to remove (already cleaned?)")
            return result
        
        # ─────────────────────────────────────────────────────────────
        # Calculate size
        # ─────────────────────────────────────────────────────────────
        
        total_size = 0
        for source in existing_sources:
            try:
                if source.is_file():
                    total_size += source.stat().st_size
                elif source.is_dir():
                    for f in source.rglob("*"):
                        if f.is_file():
                            total_size += f.stat().st_size
            except OSError:
                pass
        
        from gabriel.utils.files import format_size
        console.info(f"Space to free: {format_size(total_size)}")
        
        # ─────────────────────────────────────────────────────────────
        # Confirmation
        # ─────────────────────────────────────────────────────────────
        
        if not force and not dry_run:
            console.newline()
            console.warning("⚠️  THIS OPERATION IS IRREVERSIBLE ⚠️")
            console.warning("All original sources will be PERMANENTLY DELETED")
            console.newline()
            
            # Show first few
            console.info("Sources to remove:")
            for source in existing_sources[:10]:
                console.bullet(str(source))
            if len(existing_sources) > 10:
                console.bullet(f"... and {len(existing_sources) - 10} more")
            
            console.newline()
            if not console.confirm("Proceed with deletion?", default=False):
                console.warning("Aborted by user")
                result.aborted = True
                result.reason = "User cancelled"
                return result
        
        # ─────────────────────────────────────────────────────────────
        # Execute deletion
        # ─────────────────────────────────────────────────────────────
        
        console.newline()
        
        for i, source in enumerate(existing_sources):
            console.progress(
                i, len(existing_sources),
                prefix="Removing: ",
            )
            
            if dry_run:
                if source.is_dir():
                    result.dirs_removed += 1
                else:
                    result.files_removed += 1
                continue
            
            try:
                if source.is_file():
                    result.bytes_freed += source.stat().st_size
                    source.unlink()
                    result.files_removed += 1
                    console.debug(f"Removed file: {source}")
                    
                elif source.is_dir():
                    # Calculate size before removal
                    for f in source.rglob("*"):
                        if f.is_file():
                            result.bytes_freed += f.stat().st_size
                            result.files_removed += 1
                    
                    shutil.rmtree(source)
                    result.dirs_removed += 1
                    console.debug(f"Removed directory: {source}")
                    
            except Exception as e:
                result.errors.append(f"{source}: {e}")
                console.debug(f"Error removing {source}: {e}")
        
        console.progress(
            len(existing_sources), len(existing_sources),
            prefix="Removing: ",
        )
        
        # ─────────────────────────────────────────────────────────────
        # Cleanup empty parent directories
        # ─────────────────────────────────────────────────────────────
        
        if not dry_run:
            self._cleanup_empty_parents(existing_sources)
        
        # ─────────────────────────────────────────────────────────────
        # Summary
        # ─────────────────────────────────────────────────────────────
        
        console.newline()
        
        if dry_run:
            console.success(
                f"Would remove: {result.files_removed} files, "
                f"{result.dirs_removed} directories"
            )
            console.info(f"Would free: {format_size(total_size)}")
        else:
            console.success(
                f"Removed: {result.files_removed} files, "
                f"{result.dirs_removed} directories"
            )
            console.info(f"Freed: {format_size(result.bytes_freed)}")
        
        if result.errors:
            console.warning(f"Errors: {len(result.errors)}")
            for error in result.errors[:5]:
                console.bullet(error)
        
        return result
    
    def _cleanup_empty_parents(self, removed_paths: List[Path]) -> int:
        """
        Remove empty parent directories after source removal.
        
        Returns:
            Number of directories removed
        """
        removed = 0
        
        # Get unique parent directories
        parents: set[Path] = set()
        for path in removed_paths:
            parents.add(path.parent)
        
        # Sort by depth (deepest first)
        sorted_parents = sorted(parents, key=lambda p: len(p.parts), reverse=True)
        
        for parent in sorted_parents:
            # Don't remove managed directories or root
            if parent == self.paths.root:
                continue
            if parent in [
                self.paths.projects,
                self.paths.libraries,
                self.paths.templates,
                self.paths.automations,
                self.paths.control_plane,
            ]:
                continue
            
            try:
                if parent.exists() and not any(parent.iterdir()):
                    parent.rmdir()
                    removed += 1
                    console.debug(f"Removed empty directory: {parent}")
            except OSError:
                pass
        
        if removed:
            console.debug(f"Cleaned up {removed} empty directories")
        
        return removed
