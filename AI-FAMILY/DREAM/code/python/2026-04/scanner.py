"""
GABRIEL Fingerprint Scanner & Duplicate Detector
═════════════════════════════════════════════════════════════════════

Scans files to generate fingerprints (SHA256 hashes) and detects
duplicate files across the codebase.

"""

from __future__ import annotations

import json
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set

from gabriel.config import IGNORE_DIRS
from gabriel.console import console
from gabriel.models import FileFingerprint
from gabriel.models.language import get_language_by_extension
from gabriel.utils import (
    PathManager,
    sha256_file,
    format_size,
    safe_mkdir,
    should_ignore_dir,
    should_ignore_file,
)


class FingerprintScanner:
    """
    Scans files and generates fingerprints for tracking and deduplication.
    
    Supports parallel scanning for performance on large codebases.
    """
    
    def __init__(self, paths: PathManager) -> None:
        self.paths = paths
    
    # ─────────────────────────────────────────────────────────────────
    # Scanning
    # ─────────────────────────────────────────────────────────────────
    
    def scan(
        self,
        parallel: bool = True,
        max_workers: int = 4,
        max_file_size: int = 100 * 1024 * 1024,  # 100MB
    ) -> List[FileFingerprint]:
        """
        Scan all managed directories and generate fingerprints.
        
        Args:
            parallel: Use parallel processing
            max_workers: Number of parallel workers
            max_file_size: Skip files larger than this
            
        Returns:
            List of FileFingerprints
        """
        console.section("Scanning Files for Fingerprints")
        
        # Collect files to scan
        files_to_scan = self._collect_files(max_file_size)
        console.info(f"Found {len(files_to_scan)} files to scan")
        
        if not files_to_scan:
            console.warning("No files found to scan")
            return []
        
        # Scan files
        if parallel and len(files_to_scan) > 100:
            fingerprints = self._scan_parallel(files_to_scan, max_workers)
        else:
            fingerprints = self._scan_sequential(files_to_scan)
        
        # Save fingerprints
        self._save_fingerprints(fingerprints)
        
        console.success(f"Generated {len(fingerprints)} fingerprints")
        
        return fingerprints
    
    def _collect_files(self, max_file_size: int) -> List[Path]:
        """Collect all files to scan from managed directories."""
        files: List[Path] = []
        skipped_size = 0
        
        scan_dirs = self.paths.scannable_dirs()
        
        for scan_dir in scan_dirs:
            if not scan_dir.exists():
                continue
            
            for path in scan_dir.rglob("*"):
                if not path.is_file():
                    continue
                
                # Skip ignored files/dirs
                if should_ignore_file(path):
                    continue
                if any(should_ignore_dir(p) for p in path.parents):
                    continue
                
                # Skip large files
                try:
                    size = path.stat().st_size
                    if size > max_file_size:
                        skipped_size += 1
                        continue
                except OSError:
                    continue
                
                files.append(path)
        
        if skipped_size:
            console.debug(f"Skipped {skipped_size} files over size limit")
        
        return files
    
    def _scan_sequential(self, files: List[Path]) -> List[FileFingerprint]:
        """Scan files sequentially."""
        fingerprints: List[FileFingerprint] = []
        errors = 0
        
        for i, path in enumerate(files):
            if i % 100 == 0:
                console.progress(i, len(files), prefix="Hashing: ")
            
            try:
                fp = self._fingerprint_file(path)
                fingerprints.append(fp)
            except Exception as e:
                errors += 1
                console.debug(f"Error hashing {path}: {e}")
        
        console.progress(len(files), len(files), prefix="Hashing: ")
        
        if errors:
            console.debug(f"Failed to hash {errors} files")
        
        return fingerprints
    
    def _scan_parallel(
        self,
        files: List[Path],
        max_workers: int,
    ) -> List[FileFingerprint]:
        """Scan files in parallel."""
        fingerprints: List[FileFingerprint] = []
        completed = 0
        errors = 0
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(self._fingerprint_file, f): f
                for f in files
            }
            
            for future in as_completed(futures):
                completed += 1
                
                if completed % 100 == 0:
                    console.progress(completed, len(files), prefix="Hashing: ")
                
                try:
                    fp = future.result()
                    fingerprints.append(fp)
                except Exception as e:
                    errors += 1
                    console.debug(f"Error: {e}")
        
        console.progress(len(files), len(files), prefix="Hashing: ")
        
        if errors:
            console.debug(f"Failed to hash {errors} files")
        
        return fingerprints
    
    def _fingerprint_file(self, path: Path) -> FileFingerprint:
        """Generate fingerprint for a single file."""
        stat = path.stat()
        ext = path.suffix.lower()
        
        lang = get_language_by_extension(ext)
        lang_name = lang.name if lang else "unknown"
        
        return FileFingerprint(
            path=path.relative_to(self.paths.root),
            sha256=sha256_file(path),
            size=stat.st_size,
            mtime=stat.st_mtime,
            language=lang_name,
        )
    
    # ─────────────────────────────────────────────────────────────────
    # Persistence
    # ─────────────────────────────────────────────────────────────────
    
    def _save_fingerprints(self, fingerprints: List[FileFingerprint]) -> None:
        """Save fingerprints to disk."""
        safe_mkdir(self.paths.manifest_dir)
        
        path = self.paths.fingerprints_path
        
        # Sort for consistent output
        sorted_fps = sorted(fingerprints, key=lambda f: str(f.path))
        
        data = {
            "version": "1.0",
            "generated_at": datetime.now().isoformat(),
            "root": str(self.paths.root),
            "count": len(fingerprints),
            "fingerprints": [fp.to_dict() for fp in sorted_fps],
        }
        
        path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
        
        console.debug(f"Saved fingerprints: {path}")
    
    def load_fingerprints(self) -> List[FileFingerprint]:
        """Load fingerprints from disk."""
        path = self.paths.fingerprints_path
        
        if not path.exists():
            raise FileNotFoundError(f"No fingerprints found at {path}")
        
        data = json.loads(path.read_text(encoding="utf-8"))
        
        return [
            FileFingerprint.from_dict(fp)
            for fp in data.get("fingerprints", [])
        ]
    
    def fingerprints_exist(self) -> bool:
        """Check if fingerprints have been generated."""
        return self.paths.fingerprints_path.exists()


class DuplicateDetector:
    """
    Detects duplicate files based on fingerprints.
    
    Groups files by SHA256 hash to find exact duplicates.
    """
    
    def __init__(self, paths: PathManager) -> None:
        self.paths = paths
        self.scanner = FingerprintScanner(paths)
    
    # ─────────────────────────────────────────────────────────────────
    # Detection
    # ─────────────────────────────────────────────────────────────────
    
    def find_duplicates(
        self,
        fingerprints: Optional[List[FileFingerprint]] = None,
        min_size: int = 0,
    ) -> Dict[str, List[FileFingerprint]]:
        """
        Find duplicate files by SHA256 hash.
        
        Args:
            fingerprints: Pre-loaded fingerprints (or load from disk)
            min_size: Minimum file size to consider
            
        Returns:
            Dict mapping hash -> list of duplicate fingerprints
        """
        console.section("Detecting Duplicates")
        
        # Load fingerprints if not provided
        if fingerprints is None:
            if not self.scanner.fingerprints_exist():
                console.warning("No fingerprints found. Run 'gabriel scan' first.")
                raise FileNotFoundError("Run 'gabriel scan' first")
            fingerprints = self.scanner.load_fingerprints()
        
        console.info(f"Analyzing {len(fingerprints)} files")
        
        # Group by hash
        hash_groups: Dict[str, List[FileFingerprint]] = defaultdict(list)
        
        for fp in fingerprints:
            if fp.size >= min_size:
                hash_groups[fp.sha256].append(fp)
        
        # Filter to only duplicates (2+ files with same hash)
        duplicates = {
            sha: fps
            for sha, fps in hash_groups.items()
            if len(fps) > 1
        }
        
        console.success(f"Found {len(duplicates)} duplicate groups")
        
        return duplicates
    
    def report_duplicates(
        self,
        duplicates: Dict[str, List[FileFingerprint]],
        max_groups: int = 20,
    ) -> Dict[str, any]:
        """
        Generate a duplicate report.
        
        Args:
            duplicates: Dict from find_duplicates()
            max_groups: Maximum groups to display
            
        Returns:
            Report statistics
        """
        if not duplicates:
            console.info("No duplicates found!")
            return {"groups": 0, "files": 0, "wasted_bytes": 0}
        
        console.section("Duplicate Report")
        
        # Calculate stats
        total_groups = len(duplicates)
        total_files = sum(len(fps) for fps in duplicates.values())
        wasted_bytes = sum(
            fps[0].size * (len(fps) - 1)
            for fps in duplicates.values()
        )
        
        # Sort by wasted space
        sorted_dups = sorted(
            duplicates.items(),
            key=lambda x: x[1][0].size * (len(x[1]) - 1),
            reverse=True,
        )
        
        # Display top duplicates
        for i, (sha, fps) in enumerate(sorted_dups[:max_groups]):
            size = fps[0].size
            wasted = size * (len(fps) - 1)
            
            console.item(
                f"{sha[:12]}... "
                f"({len(fps)} copies, {format_size(wasted)} wasted)"
            )
            
            for fp in fps[:5]:
                console.bullet(str(fp.path))
            
            if len(fps) > 5:
                console.bullet(f"... and {len(fps) - 5} more")
        
        if total_groups > max_groups:
            console.newline()
            console.info(f"... and {total_groups - max_groups} more duplicate groups")
        
        # Summary
        console.newline()
        console.section("Summary")
        
        rows = [
            ["Duplicate groups", str(total_groups)],
            ["Total duplicate files", str(total_files)],
            ["Wasted space", format_size(wasted_bytes)],
        ]
        console.table(["Metric", "Value"], rows)
        
        # Group by language
        by_lang: Dict[str, int] = defaultdict(int)
        for fps in duplicates.values():
            for fp in fps[1:]:  # Count each duplicate (not original)
                by_lang[fp.language] += fp.size
        
        if by_lang:
            console.newline()
            console.info("Wasted space by language:")
            for lang, size in sorted(by_lang.items(), key=lambda x: -x[1])[:5]:
                console.bullet(f"{lang}: {format_size(size)}")
        
        return {
            "groups": total_groups,
            "files": total_files,
            "wasted_bytes": wasted_bytes,
            "by_language": dict(by_lang),
        }
    
    def export_duplicates(
        self,
        duplicates: Dict[str, List[FileFingerprint]],
        path: Optional[Path] = None,
    ) -> Path:
        """
        Export duplicate report to JSON.
        
        Args:
            duplicates: Dict from find_duplicates()
            path: Output path (default: manifest/duplicates.json)
            
        Returns:
            Path where report was saved
        """
        if path is None:
            path = self.paths.manifest_dir / "duplicates.json"
        
        safe_mkdir(path.parent)
        
        # Build export data
        groups = []
        for sha, fps in duplicates.items():
            groups.append({
                "sha256": sha,
                "size": fps[0].size,
                "count": len(fps),
                "wasted_bytes": fps[0].size * (len(fps) - 1),
                "files": [str(fp.path) for fp in fps],
            })
        
        # Sort by wasted space
        groups.sort(key=lambda x: -x["wasted_bytes"])
        
        data = {
            "version": "1.0",
            "generated_at": datetime.now().isoformat(),
            "root": str(self.paths.root),
            "total_groups": len(groups),
            "total_wasted_bytes": sum(g["wasted_bytes"] for g in groups),
            "groups": groups,
        }
        
        path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
        
        console.success(f"Exported duplicates report: {path}")
        
        return path
