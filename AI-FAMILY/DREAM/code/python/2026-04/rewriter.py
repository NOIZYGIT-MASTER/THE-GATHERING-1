"""
GABRIEL Reference Rewriter
═════════════════════════════════════════════════════════════════════

Rewrites file references (imports, requires, paths) after moves.
Updates import statements, relative paths, and references.

"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Pattern, Set, Tuple

from gabriel.console import console
from gabriel.models import MovePlan
from gabriel.utils import PathManager, safe_mkdir


@dataclass
class RewriteResult:
    """Result of a rewrite operation."""
    
    files_scanned: int = 0
    files_modified: int = 0
    references_updated: int = 0
    errors: List[str] = field(default_factory=list)
    
    def __str__(self) -> str:
        return (
            f"Scanned: {self.files_scanned}, "
            f"Modified: {self.files_modified}, "
            f"References: {self.references_updated}"
        )


class ReferenceRewriter:
    """
    Rewrites file references after moves.
    
    Supports:
    - Python imports (from/import)
    - JavaScript/TypeScript imports (import/require)
    - Relative paths in any file
    - Config file paths
    """
    
    def __init__(self, paths: PathManager) -> None:
        self.paths = paths
        
        # File extensions to scan for references
        self.scannable_extensions: Set[str] = {
            # Python
            ".py", ".pyi",
            # JavaScript/TypeScript
            ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
            # Config
            ".json", ".yaml", ".yml", ".toml",
            # Misc
            ".md", ".txt", ".rst",
        }
        
        # Patterns for different languages
        self._patterns: Dict[str, List[Pattern]] = {
            "python": [
                # from x import y
                re.compile(r'^(\s*from\s+)([a-zA-Z0-9_.]+)(\s+import)', re.MULTILINE),
                # import x
                re.compile(r'^(\s*import\s+)([a-zA-Z0-9_.]+)', re.MULTILINE),
            ],
            "javascript": [
                # import x from 'y'
                re.compile(r'''(import\s+.*?\s+from\s+['"])([^'"]+)(['"])'''),
                # require('x')
                re.compile(r'''(require\s*\(\s*['"])([^'"]+)(['"]\s*\))'''),
                # dynamic import('x')
                re.compile(r'''(import\s*\(\s*['"])([^'"]+)(['"]\s*\))'''),
            ],
            "relative": [
                # ./path or ../path
                re.compile(r'''(['"])(\.\./[^'"]+|\.\/[^'"]+)(['"])'''),
            ],
        }
    
    # ─────────────────────────────────────────────────────────────────
    # Main Rewrite
    # ─────────────────────────────────────────────────────────────────
    
    def rewrite_from_plan(
        self,
        plan: MovePlan,
        dry_run: bool = False,
    ) -> RewriteResult:
        """
        Rewrite references based on a move plan.
        
        Args:
            plan: MovePlan with source->destination mappings
            dry_run: If True, only preview changes
            
        Returns:
            RewriteResult with stats
        """
        console.section("Rewriting References")
        
        if dry_run:
            console.warning("DRY RUN - No files will be modified")
        
        # Build path mapping from plan
        path_map = self._build_path_map(plan)
        console.info(f"Path mappings: {len(path_map)}")
        
        if not path_map:
            console.warning("No path mappings to apply")
            return RewriteResult()
        
        # Collect files to scan
        files_to_scan = self._collect_scannable_files()
        console.info(f"Files to scan: {len(files_to_scan)}")
        
        # Scan and rewrite
        result = RewriteResult()
        
        for i, file_path in enumerate(files_to_scan):
            if i % 50 == 0:
                console.progress(i, len(files_to_scan), prefix="Scanning: ")
            
            try:
                modified = self._rewrite_file(file_path, path_map, dry_run)
                result.files_scanned += 1
                
                if modified > 0:
                    result.files_modified += 1
                    result.references_updated += modified
                    
            except Exception as e:
                result.errors.append(f"{file_path}: {e}")
                console.debug(f"Error processing {file_path}: {e}")
        
        console.progress(len(files_to_scan), len(files_to_scan), prefix="Scanning: ")
        
        # Summary
        console.newline()
        if dry_run:
            console.success(f"Would modify {result.files_modified} files")
            console.info(f"Would update {result.references_updated} references")
        else:
            console.success(f"Modified {result.files_modified} files")
            console.info(f"Updated {result.references_updated} references")
        
        if result.errors:
            console.warning(f"Errors: {len(result.errors)}")
        
        return result
    
    # ─────────────────────────────────────────────────────────────────
    # Path Mapping
    # ─────────────────────────────────────────────────────────────────
    
    def _build_path_map(self, plan: MovePlan) -> Dict[str, str]:
        """
        Build path mapping from move plan.
        
        Returns dict mapping old_path -> new_path for various formats:
        - Absolute paths
        - Relative to root
        - Module-style (dots)
        """
        path_map: Dict[str, str] = {}
        
        for move in plan.moves:
            old = move.src
            new = move.dst
            
            # Absolute paths
            path_map[str(old)] = str(new)
            
            # Relative to root
            try:
                old_rel = old.relative_to(self.paths.root)
                new_rel = new.relative_to(self.paths.root)
                path_map[str(old_rel)] = str(new_rel)
            except ValueError:
                pass
            
            # POSIX style (forward slashes)
            path_map[str(old).replace(os.sep, "/")] = str(new).replace(os.sep, "/")
            
            # Module-style (for Python imports)
            if old.suffix in (".py", ""):
                old_mod = str(old.with_suffix("")).replace(os.sep, ".").replace("/", ".")
                new_mod = str(new.with_suffix("")).replace(os.sep, ".").replace("/", ".")
                
                # Extract just the module name part
                old_parts = old_mod.split(".")
                new_parts = new_mod.split(".")
                
                for i in range(len(old_parts)):
                    old_mod = ".".join(old_parts[i:])
                    new_mod = ".".join(new_parts[i:])
                    if old_mod and new_mod:
                        path_map[old_mod] = new_mod
        
        return path_map
    
    # ─────────────────────────────────────────────────────────────────
    # File Collection
    # ─────────────────────────────────────────────────────────────────
    
    def _collect_scannable_files(self) -> List[Path]:
        """Collect all files that should be scanned for references."""
        files: List[Path] = []
        
        scan_dirs = [
            self.paths.projects,
            self.paths.libraries,
            self.paths.automations,
            self.paths.templates,
        ]
        
        for scan_dir in scan_dirs:
            if not scan_dir.exists():
                continue
            
            for path in scan_dir.rglob("*"):
                if path.is_file():
                    if path.suffix.lower() in self.scannable_extensions:
                        files.append(path)
        
        return files
    
    # ─────────────────────────────────────────────────────────────────
    # File Rewriting
    # ─────────────────────────────────────────────────────────────────
    
    def _rewrite_file(
        self,
        file_path: Path,
        path_map: Dict[str, str],
        dry_run: bool,
    ) -> int:
        """
        Rewrite references in a single file.
        
        Returns:
            Number of references updated
        """
        try:
            content = file_path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, PermissionError):
            return 0
        
        original = content
        references_updated = 0
        
        # Apply replacements
        for old_path, new_path in path_map.items():
            if old_path in content:
                # Simple string replacement for now
                # Could be made smarter with regex for word boundaries
                count = content.count(old_path)
                content = content.replace(old_path, new_path)
                references_updated += count
        
        # Write back if changed
        if content != original and not dry_run:
            file_path.write_text(content, encoding="utf-8")
            console.debug(f"Updated: {file_path}")
        
        return references_updated


class ReferenceVerifier:
    """
    Verifies that no old references remain after rewriting.
    """
    
    def __init__(self, paths: PathManager) -> None:
        self.paths = paths
    
    def verify_no_old_refs(
        self,
        plan: MovePlan,
    ) -> Tuple[bool, List[Tuple[Path, str, int]]]:
        """
        Verify no old references remain.
        
        Args:
            plan: MovePlan with original paths
            
        Returns:
            Tuple of (success, list of (file, old_ref, line_number))
        """
        console.section("Verifying References")
        
        # Get old paths to search for
        old_paths: Set[str] = set()
        for move in plan.moves:
            old_paths.add(str(move.src))
            old_paths.add(str(move.src.name))
            try:
                old_paths.add(str(move.src.relative_to(self.paths.root)))
            except ValueError:
                pass
        
        console.info(f"Checking for {len(old_paths)} old paths")
        
        # Scan files
        found_refs: List[Tuple[Path, str, int]] = []
        files_scanned = 0
        
        scan_dirs = [
            self.paths.projects,
            self.paths.libraries,
            self.paths.automations,
        ]
        
        scannable_extensions = {".py", ".js", ".ts", ".jsx", ".tsx", ".json", ".yaml", ".yml"}
        
        for scan_dir in scan_dirs:
            if not scan_dir.exists():
                continue
            
            for path in scan_dir.rglob("*"):
                if path.is_file() and path.suffix.lower() in scannable_extensions:
                    files_scanned += 1
                    
                    try:
                        lines = path.read_text(encoding="utf-8").splitlines()
                        
                        for line_num, line in enumerate(lines, 1):
                            for old_path in old_paths:
                                if old_path in line:
                                    found_refs.append((path, old_path, line_num))
                                    
                    except (UnicodeDecodeError, PermissionError):
                        pass
        
        console.info(f"Scanned {files_scanned} files")
        
        if found_refs:
            console.error(f"Found {len(found_refs)} old references!")
            
            # Group by file
            by_file: Dict[Path, List[Tuple[str, int]]] = {}
            for path, ref, line in found_refs:
                if path not in by_file:
                    by_file[path] = []
                by_file[path].append((ref, line))
            
            # Show first few
            for path, refs in list(by_file.items())[:10]:
                console.item(str(path.relative_to(self.paths.root)))
                for ref, line in refs[:3]:
                    console.bullet(f"Line {line}: {ref}")
                if len(refs) > 3:
                    console.bullet(f"... and {len(refs) - 3} more")
            
            if len(by_file) > 10:
                console.info(f"... and {len(by_file) - 10} more files")
            
            return False, found_refs
        else:
            console.success("No old references found!")
            return True, []
