"""
GABRIEL Project Detector
═════════════════════════════════════════════════════════════════════

Detects and analyzes project directories within the codebase.
Identifies project roots by marker files and analyzes language composition.

"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import List, Optional, Set

from gabriel.config import RESERVED_TOPLEVEL
from gabriel.console import console
from gabriel.models import ProjectInfo
from gabriel.models.language import detect_language, get_language_by_extension
from gabriel.utils import (
    PathManager,
    get_dir_stats,
    get_latest_mtime,
    is_subpath,
    should_ignore_dir,
)


# ═══════════════════════════════════════════════════════════════════
# PROJECT MARKERS
# ═══════════════════════════════════════════════════════════════════

PROJECT_MARKERS: tuple[str, ...] = (
    # ─────────────────────────────────────────────────────────────────
    # Version control (highest priority)
    # ─────────────────────────────────────────────────────────────────
    ".git",
    ".hg",
    ".svn",
    
    # ─────────────────────────────────────────────────────────────────
    # Rust
    # ─────────────────────────────────────────────────────────────────
    "Cargo.toml",
    
    # ─────────────────────────────────────────────────────────────────
    # Go
    # ─────────────────────────────────────────────────────────────────
    "go.mod",
    
    # ─────────────────────────────────────────────────────────────────
    # Elixir
    # ─────────────────────────────────────────────────────────────────
    "mix.exs",
    
    # ─────────────────────────────────────────────────────────────────
    # Haskell
    # ─────────────────────────────────────────────────────────────────
    "stack.yaml",
    "cabal.project",
    "package.yaml",
    
    # ─────────────────────────────────────────────────────────────────
    # Scala
    # ─────────────────────────────────────────────────────────────────
    "build.sbt",
    
    # ─────────────────────────────────────────────────────────────────
    # Clojure
    # ─────────────────────────────────────────────────────────────────
    "deps.edn",
    "project.clj",
    "shadow-cljs.edn",
    
    # ─────────────────────────────────────────────────────────────────
    # Swift
    # ─────────────────────────────────────────────────────────────────
    "Package.swift",
    
    # ─────────────────────────────────────────────────────────────────
    # Dart/Flutter
    # ─────────────────────────────────────────────────────────────────
    "pubspec.yaml",
    
    # ─────────────────────────────────────────────────────────────────
    # Python
    # ─────────────────────────────────────────────────────────────────
    "pyproject.toml",
    "setup.py",
    "setup.cfg",
    "requirements.txt",
    "Pipfile",
    "poetry.lock",
    
    # ─────────────────────────────────────────────────────────────────
    # JavaScript/TypeScript/Node
    # ─────────────────────────────────────────────────────────────────
    "package.json",
    "tsconfig.json",
    "deno.json",
    "deno.jsonc",
    "bun.lockb",
    
    # ─────────────────────────────────────────────────────────────────
    # Java/Kotlin/JVM
    # ─────────────────────────────────────────────────────────────────
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "gradlew",
    "settings.gradle",
    "settings.gradle.kts",
    
    # ─────────────────────────────────────────────────────────────────
    # C/C++
    # ─────────────────────────────────────────────────────────────────
    "CMakeLists.txt",
    "Makefile",
    "meson.build",
    "configure.ac",
    "conanfile.txt",
    "vcpkg.json",
    
    # ─────────────────────────────────────────────────────────────────
    # .NET / C#
    # ─────────────────────────────────────────────────────────────────
    "*.csproj",
    "*.fsproj",
    "*.sln",
    "global.json",
    
    # ─────────────────────────────────────────────────────────────────
    # Ruby
    # ─────────────────────────────────────────────────────────────────
    "Gemfile",
    "Rakefile",
    "*.gemspec",
    
    # ─────────────────────────────────────────────────────────────────
    # PHP
    # ─────────────────────────────────────────────────────────────────
    "composer.json",
    "artisan",
    
    # ─────────────────────────────────────────────────────────────────
    # Nim
    # ─────────────────────────────────────────────────────────────────
    "*.nimble",
    
    # ─────────────────────────────────────────────────────────────────
    # Zig
    # ─────────────────────────────────────────────────────────────────
    "build.zig",
    
    # ─────────────────────────────────────────────────────────────────
    # Julia
    # ─────────────────────────────────────────────────────────────────
    "Project.toml",
    
    # ─────────────────────────────────────────────────────────────────
    # R
    # ─────────────────────────────────────────────────────────────────
    "DESCRIPTION",
    
    # ─────────────────────────────────────────────────────────────────
    # Container/Infrastructure
    # ─────────────────────────────────────────────────────────────────
    "Dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    "Vagrantfile",
    "terraform.tf",
    "main.tf",
    "serverless.yml",
    "serverless.yaml",
    "pulumi.yaml",
    "cdk.json",
)


class ProjectDetector:
    """
    Detects and analyzes project directories.
    
    Scans the filesystem for project markers (package.json, Cargo.toml, etc.)
    and builds a list of project roots with metadata.
    """
    
    def __init__(self, paths: PathManager) -> None:
        self.paths = paths
        self._marker_cache: dict[Path, list[str]] = {}
    
    # ─────────────────────────────────────────────────────────────────
    # Marker Detection
    # ─────────────────────────────────────────────────────────────────
    
    def find_markers(self, directory: Path) -> list[str]:
        """
        Find project markers in a directory.
        
        Args:
            directory: Directory to scan
            
        Returns:
            List of marker filenames found
        """
        if directory in self._marker_cache:
            return self._marker_cache[directory]
        
        found: list[str] = []
        
        for marker in PROJECT_MARKERS:
            if "*" in marker:
                # Glob pattern (e.g., "*.csproj")
                if list(directory.glob(marker)):
                    found.append(marker)
            else:
                # Direct file check
                if (directory / marker).exists():
                    found.append(marker)
        
        self._marker_cache[directory] = found
        return found
    
    def has_markers(self, directory: Path) -> bool:
        """Check if directory has any project markers."""
        return len(self.find_markers(directory)) > 0
    
    # ─────────────────────────────────────────────────────────────────
    # Project Analysis
    # ─────────────────────────────────────────────────────────────────
    
    def analyze_project(self, root: Path) -> ProjectInfo:
        """
        Analyze a project directory and extract information.
        
        Args:
            root: Project root directory
            
        Returns:
            ProjectInfo with analysis results
        """
        markers = self.find_markers(root)
        language = detect_language(root)
        file_count, size_bytes = get_dir_stats(root)
        has_git = (root / ".git").exists()
        last_modified = get_latest_mtime(root)
        
        return ProjectInfo(
            root=root,
            name=root.name,
            language=language,
            markers_found=markers,
            file_count=file_count,
            size_bytes=size_bytes,
            has_git=has_git,
            last_modified=last_modified,
            metadata={
                "relative_path": str(root.relative_to(self.paths.root)) 
                    if is_subpath(root, self.paths.root) else str(root),
            },
        )
    
    # ─────────────────────────────────────────────────────────────────
    # Project Discovery
    # ─────────────────────────────────────────────────────────────────
    
    def find_project_roots(self, show_progress: bool = True) -> list[ProjectInfo]:
        """
        Find all project roots in the repository.
        
        Scans non-reserved top-level directories for project markers,
        selecting the highest-level roots while respecting nested
        git repositories.
        
        Args:
            show_progress: Show spinner during scan
            
        Returns:
            List of ProjectInfo for each detected project
        """
        if show_progress:
            console.spinner_start("Scanning for projects")
        
        candidates: list[Path] = []
        
        # Scan non-reserved top-level directories
        for top_dir in self.paths.root.iterdir():
            if not top_dir.is_dir():
                continue
            if top_dir.name in RESERVED_TOPLEVEL:
                continue
            if should_ignore_dir(top_dir):
                continue
            
            # Check top_dir itself
            if self.has_markers(top_dir):
                candidates.append(top_dir)
            
            # Walk subdirectories
            for subdir in self._walk_directories(top_dir):
                if self.has_markers(subdir):
                    candidates.append(subdir)
        
        if show_progress:
            console.spinner_stop()
        
        # Deduplicate and select highest-level roots
        selected = self._select_project_roots(candidates)
        
        # Analyze each project
        projects: list[ProjectInfo] = []
        for root in selected:
            try:
                info = self.analyze_project(root)
                projects.append(info)
            except Exception as e:
                console.debug(f"Failed to analyze {root}: {e}")
        
        # Sort by path for consistent output
        projects.sort(key=lambda p: str(p.root).lower())
        
        return projects
    
    def _walk_directories(self, start: Path) -> list[Path]:
        """
        Walk directory tree, respecting ignore patterns.
        
        Args:
            start: Starting directory
            
        Returns:
            List of all subdirectories
        """
        dirs: list[Path] = []
        
        try:
            for item in start.iterdir():
                if item.is_dir():
                    if should_ignore_dir(item):
                        continue
                    dirs.append(item)
                    # Recursively walk subdirectories
                    dirs.extend(self._walk_directories(item))
        except PermissionError:
            console.debug(f"Permission denied: {start}")
        except OSError as e:
            console.debug(f"OS error scanning {start}: {e}")
        
        return dirs
    
    def _select_project_roots(self, candidates: list[Path]) -> list[Path]:
        """
        Select highest-level project roots from candidates.
        
        Avoids selecting nested directories unless they have their
        own .git and the parent doesn't.
        
        Args:
            candidates: All detected project directories
            
        Returns:
            Filtered list of project roots
        """
        # Sort by path depth (shortest first = highest level)
        sorted_candidates = sorted(
            set(candidates),
            key=lambda p: (len(p.parts), str(p).lower())
        )
        
        selected: list[Path] = []
        
        for candidate in sorted_candidates:
            # Check if inside an already-selected root
            parent_selected = next(
                (s for s in selected if is_subpath(candidate, s)),
                None
            )
            
            if parent_selected is None:
                # Not inside any selected project
                selected.append(candidate)
            else:
                # Inside a selected project - only add if it has .git
                # and the parent doesn't (nested git repo)
                if (candidate / ".git").exists() and not (parent_selected / ".git").exists():
                    selected.append(candidate)
        
        return sorted(selected, key=lambda p: str(p).lower())
    
    # ─────────────────────────────────────────────────────────────────
    # Utilities
    # ─────────────────────────────────────────────────────────────────
    
    def clear_cache(self) -> None:
        """Clear the marker cache."""
        self._marker_cache.clear()
    
    def get_project_at(self, path: Path) -> Optional[ProjectInfo]:
        """
        Get project info for a specific path.
        
        Args:
            path: Path to check
            
        Returns:
            ProjectInfo if path is a project root, None otherwise
        """
        if not path.is_dir():
            return None
        
        if not self.has_markers(path):
            return None
        
        return self.analyze_project(path)
    
    def find_containing_project(self, path: Path) -> Optional[ProjectInfo]:
        """
        Find the project that contains a given path.
        
        Walks up the directory tree to find the nearest project root.
        
        Args:
            path: File or directory path
            
        Returns:
            ProjectInfo of containing project, or None
        """
        current = path if path.is_dir() else path.parent
        
        while current != current.parent:  # Stop at filesystem root
            if self.has_markers(current):
                return self.analyze_project(current)
            current = current.parent
        
        return None
