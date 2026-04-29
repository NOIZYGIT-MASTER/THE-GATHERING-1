"""
GABRIEL Structure Validator
═════════════════════════════════════════════════════════════════════

Validates the organized structure for consistency and integrity.
Checks for orphaned files, missing markers, empty directories, etc.

"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import List, Optional, Tuple

from gabriel.console import console
from gabriel.core.detector import ProjectDetector
from gabriel.utils import PathManager, should_ignore_file


class IssueSeverity(Enum):
    """Severity levels for validation issues."""
    
    ERROR = "error"       # Must be fixed
    WARNING = "warning"   # Should be fixed
    INFO = "info"         # Informational


@dataclass
class ValidationIssue:
    """A single validation issue."""
    
    severity: IssueSeverity
    message: str
    path: Optional[Path] = None
    suggestion: Optional[str] = None
    
    def __str__(self) -> str:
        prefix = {
            IssueSeverity.ERROR: "✗",
            IssueSeverity.WARNING: "⚠",
            IssueSeverity.INFO: "ℹ",
        }[self.severity]
        
        msg = f"{prefix} {self.message}"
        if self.path:
            msg += f" [{self.path}]"
        return msg


@dataclass
class ValidationResult:
    """Result of a validation run."""
    
    is_valid: bool
    issues: List[ValidationIssue] = field(default_factory=list)
    checks_passed: int = 0
    checks_failed: int = 0
    timestamp: datetime = field(default_factory=datetime.now)
    
    @property
    def errors(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.severity == IssueSeverity.ERROR]
    
    @property
    def warnings(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.severity == IssueSeverity.WARNING]
    
    @property
    def infos(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.severity == IssueSeverity.INFO]
    
    def add_issue(
        self,
        severity: IssueSeverity,
        message: str,
        path: Optional[Path] = None,
        suggestion: Optional[str] = None,
    ) -> None:
        """Add an issue to the result."""
        self.issues.append(ValidationIssue(
            severity=severity,
            message=message,
            path=path,
            suggestion=suggestion,
        ))
        
        if severity == IssueSeverity.ERROR:
            self.is_valid = False
            self.checks_failed += 1
        else:
            self.checks_passed += 1


class StructureValidator:
    """
    Validates the GABRIEL structure for consistency.
    
    Performs various checks:
    - Control plane exists
    - No orphaned files in root
    - Projects have markers
    - No empty directories
    - Import references are valid
    """
    
    def __init__(self, paths: PathManager) -> None:
        self.paths = paths
        self.detector = ProjectDetector(paths)
    
    # ─────────────────────────────────────────────────────────────────
    # Main Validation
    # ─────────────────────────────────────────────────────────────────
    
    def validate(self, verbose: bool = False) -> ValidationResult:
        """
        Run all validation checks.
        
        Args:
            verbose: Show detailed output
            
        Returns:
            ValidationResult with all issues found
        """
        console.section("Validating Structure")
        
        result = ValidationResult(is_valid=True)
        
        # Run all checks
        checks = [
            ("Control plane", self._check_control_plane),
            ("Root directory", self._check_root_directory),
            ("Project markers", self._check_project_markers),
            ("Empty directories", self._check_empty_directories),
            ("Manifest files", self._check_manifest_files),
            ("Rollback integrity", self._check_rollback_integrity),
        ]
        
        for name, check_fn in checks:
            if verbose:
                console.spinner_start(f"Checking {name}")
            
            try:
                check_fn(result)
                
                if verbose:
                    console.spinner_stop(success=True)
                    
            except Exception as e:
                if verbose:
                    console.spinner_stop(success=False)
                
                result.add_issue(
                    IssueSeverity.ERROR,
                    f"Check '{name}' failed: {e}",
                )
        
        # Print results
        self._print_results(result, verbose)
        
        return result
    
    # ─────────────────────────────────────────────────────────────────
    # Individual Checks
    # ─────────────────────────────────────────────────────────────────
    
    def _check_control_plane(self, result: ValidationResult) -> None:
        """Check that control plane directory exists and is valid."""
        
        if not self.paths.control_plane.exists():
            result.add_issue(
                IssueSeverity.ERROR,
                "Control plane directory missing",
                path=self.paths.control_plane,
                suggestion="Run 'gabriel init' to create structure",
            )
            return
        
        # Check subdirectories
        required_dirs = [
            self.paths.manifest_dir,
            self.paths.logs_dir,
            self.paths.rollback_dir,
        ]
        
        for dir_path in required_dirs:
            if not dir_path.exists():
                result.add_issue(
                    IssueSeverity.WARNING,
                    f"Control plane subdirectory missing: {dir_path.name}",
                    path=dir_path,
                    suggestion="Run 'gabriel init' to recreate",
                )
        
        result.checks_passed += 1
    
    def _check_root_directory(self, result: ValidationResult) -> None:
        """Check for orphaned files in root directory."""
        
        orphaned_files = []
        
        for item in self.paths.root.iterdir():
            if item.is_file():
                # Skip hidden files and common root files
                if item.name.startswith("."):
                    continue
                if item.name.lower() in (
                    "readme.md", "readme.txt", "readme",
                    "license", "license.md", "license.txt",
                    "changelog.md", "changelog",
                    ".gitignore", ".gitattributes",
                    "pyproject.toml", "setup.py", "package.json",
                ):
                    continue
                
                orphaned_files.append(item)
        
        if orphaned_files:
            for f in orphaned_files[:10]:
                result.add_issue(
                    IssueSeverity.WARNING,
                    f"Orphaned file in root: {f.name}",
                    path=f,
                    suggestion="Move to appropriate directory or delete",
                )
            
            if len(orphaned_files) > 10:
                result.add_issue(
                    IssueSeverity.WARNING,
                    f"... and {len(orphaned_files) - 10} more orphaned files",
                )
        else:
            result.checks_passed += 1
    
    def _check_project_markers(self, result: ValidationResult) -> None:
        """Check that projects have valid markers."""
        
        if not self.paths.projects.exists():
            result.checks_passed += 1
            return
        
        projects_without_markers = []
        
        for project_dir in self.paths.projects.iterdir():
            if not project_dir.is_dir():
                continue
            
            # Skip hidden directories
            if project_dir.name.startswith("."):
                continue
            
            markers = self.detector.find_markers(project_dir)
            
            if not markers:
                projects_without_markers.append(project_dir)
        
        if projects_without_markers:
            for p in projects_without_markers[:10]:
                result.add_issue(
                    IssueSeverity.WARNING,
                    f"Project without markers: {p.name}",
                    path=p,
                    suggestion="Add package.json, Cargo.toml, or similar marker file",
                )
            
            if len(projects_without_markers) > 10:
                result.add_issue(
                    IssueSeverity.WARNING,
                    f"... and {len(projects_without_markers) - 10} more projects without markers",
                )
        else:
            result.checks_passed += 1
    
    def _check_empty_directories(self, result: ValidationResult) -> None:
        """Check for empty directories in organized areas."""
        
        empty_dirs = []
        
        check_dirs = [
            self.paths.projects,
            self.paths.libraries,
            self.paths.templates,
        ]
        
        for check_dir in check_dirs:
            if not check_dir.exists():
                continue
            
            for subdir in check_dir.rglob("*"):
                if subdir.is_dir():
                    # Skip hidden directories
                    if any(p.name.startswith(".") for p in subdir.parts):
                        continue
                    
                    # Check if empty
                    contents = list(subdir.iterdir())
                    # Filter out .gitkeep
                    contents = [c for c in contents if c.name != ".gitkeep"]
                    
                    if not contents:
                        empty_dirs.append(subdir)
        
        if empty_dirs:
            for d in empty_dirs[:10]:
                result.add_issue(
                    IssueSeverity.INFO,
                    f"Empty directory: {d.relative_to(self.paths.root)}",
                    path=d,
                    suggestion="Remove or add content",
                )
            
            if len(empty_dirs) > 10:
                result.add_issue(
                    IssueSeverity.INFO,
                    f"... and {len(empty_dirs) - 10} more empty directories",
                )
        else:
            result.checks_passed += 1
    
    def _check_manifest_files(self, result: ValidationResult) -> None:
        """Check manifest files for validity."""
        
        # Check move_plan.json if exists
        if self.paths.move_plan_path.exists():
            try:
                import json
                data = json.loads(self.paths.move_plan_path.read_text(encoding="utf-8"))
                
                if "moves" not in data:
                    result.add_issue(
                        IssueSeverity.WARNING,
                        "move_plan.json missing 'moves' field",
                        path=self.paths.move_plan_path,
                    )
                    
            except json.JSONDecodeError as e:
                result.add_issue(
                    IssueSeverity.ERROR,
                    f"move_plan.json is invalid JSON: {e}",
                    path=self.paths.move_plan_path,
                )
        
        # Check fingerprints.json if exists
        if self.paths.fingerprints_path.exists():
            try:
                import json
                data = json.loads(self.paths.fingerprints_path.read_text(encoding="utf-8"))
                
                if "fingerprints" not in data:
                    result.add_issue(
                        IssueSeverity.WARNING,
                        "fingerprints.json missing 'fingerprints' field",
                        path=self.paths.fingerprints_path,
                    )
                    
            except json.JSONDecodeError as e:
                result.add_issue(
                    IssueSeverity.ERROR,
                    f"fingerprints.json is invalid JSON: {e}",
                    path=self.paths.fingerprints_path,
                )
        
        result.checks_passed += 1
    
    def _check_rollback_integrity(self, result: ValidationResult) -> None:
        """Check rollback files for integrity."""
        
        if not self.paths.rollback_dir.exists():
            result.checks_passed += 1
            return
        
        import json
        
        for rollback_file in self.paths.rollback_dir.glob("*.json"):
            try:
                data = json.loads(rollback_file.read_text(encoding="utf-8"))
                
                # Check required fields
                required = ["id", "created_at", "moves_applied"]
                missing = [f for f in required if f not in data]
                
                if missing:
                    result.add_issue(
                        IssueSeverity.WARNING,
                        f"Rollback file missing fields: {', '.join(missing)}",
                        path=rollback_file,
                    )
                    
            except json.JSONDecodeError as e:
                result.add_issue(
                    IssueSeverity.ERROR,
                    f"Rollback file is invalid JSON: {e}",
                    path=rollback_file,
                )
        
        result.checks_passed += 1
    
    # ─────────────────────────────────────────────────────────────────
    # Output
    # ─────────────────────────────────────────────────────────────────
    
    def _print_results(self, result: ValidationResult, verbose: bool) -> None:
        """Print validation results."""
        
        console.newline()
        
        if result.is_valid:
            console.success("Structure is valid!")
        else:
            console.error("Structure has issues!")
        
        # Print stats
        console.info(f"Checks passed: {result.checks_passed}")
        console.info(f"Checks failed: {result.checks_failed}")
        
        # Print issues by severity
        if result.errors:
            console.newline()
            console.error(f"Errors ({len(result.errors)}):")
            for issue in result.errors:
                console.bullet(issue.message)
                if issue.suggestion and verbose:
                    console.key_value("Fix", issue.suggestion, indent=6)
        
        if result.warnings:
            console.newline()
            console.warning(f"Warnings ({len(result.warnings)}):")
            for issue in result.warnings[:10]:
                console.bullet(issue.message)
            if len(result.warnings) > 10:
                console.bullet(f"... and {len(result.warnings) - 10} more")
        
        if verbose and result.infos:
            console.newline()
            console.info(f"Info ({len(result.infos)}):")
            for issue in result.infos[:5]:
                console.bullet(issue.message)
            if len(result.infos) > 5:
                console.bullet(f"... and {len(result.infos) - 5} more")
