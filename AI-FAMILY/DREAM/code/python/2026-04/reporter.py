"""
GABRIEL Status Reporter
═════════════════════════════════════════════════════════════════════

Generates status reports and statistics about the organized structure.

"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from gabriel.console import console
from gabriel.models import MovePlan
from gabriel.utils import PathManager, get_dir_stats, format_size


@dataclass
class SectionStats:
    """Statistics for a managed section."""
    
    name: str
    path: Path
    exists: bool
    units: int = 0
    files: int = 0
    size_bytes: int = 0
    
    @property
    def size_display(self) -> str:
        return format_size(self.size_bytes)


@dataclass
class StatusReport:
    """Complete status report."""
    
    root: Path
    timestamp: datetime
    sections: List[SectionStats] = field(default_factory=list)
    pending_plan: Optional[MovePlan] = None
    
    @property
    def total_files(self) -> int:
        return sum(s.files for s in self.sections)
    
    @property
    def total_size(self) -> int:
        return sum(s.size_bytes for s in self.sections)
    
    @property
    def total_units(self) -> int:
        return sum(s.units for s in self.sections)


class StatusReporter:
    """
    Generates status reports for the organized structure.
    """
    
    def __init__(self, paths: PathManager) -> None:
        self.paths = paths
    
    # ─────────────────────────────────────────────────────────────────
    # Report Generation
    # ─────────────────────────────────────────────────────────────────
    
    def generate_report(self, verbose: bool = False) -> StatusReport:
        """
        Generate a complete status report.
        
        Args:
            verbose: Include detailed statistics
            
        Returns:
            StatusReport with all section stats
        """
        report = StatusReport(
            root=self.paths.root,
            timestamp=datetime.now(),
        )
        
        # Define sections to report on
        sections = [
            ("Projects", self.paths.projects),
            ("Libraries", self.paths.libraries),
            ("Templates", self.paths.templates),
            ("Automations", self.paths.automations),
            ("Archive", self.paths.archive),
            ("Intake", self.paths.intake),
        ]
        
        # Gather stats for each section
        for name, path in sections:
            stats = self._get_section_stats(name, path)
            report.sections.append(stats)
        
        # Check for pending plan
        if self.paths.move_plan_path.exists():
            try:
                report.pending_plan = MovePlan.load(self.paths.move_plan_path)
            except Exception:
                pass
        
        return report
    
    def _get_section_stats(self, name: str, path: Path) -> SectionStats:
        """Get statistics for a section."""
        stats = SectionStats(
            name=name,
            path=path,
            exists=path.exists(),
        )
        
        if not path.exists():
            return stats
        
        # Count units (top-level subdirectories)
        stats.units = sum(1 for d in path.iterdir() if d.is_dir())
        
        # Count files and size
        stats.files, stats.size_bytes = get_dir_stats(path)
        
        return stats
    
    # ─────────────────────────────────────────────────────────────────
    # Display
    # ─────────────────────────────────────────────────────────────────
    
    def print_report(self, report: Optional[StatusReport] = None) -> None:
        """
        Print a formatted status report.
        
        Args:
            report: Report to print (generates if not provided)
        """
        if report is None:
            report = self.generate_report()
        
        console.header("GABRIEL Status Report")
        
        console.key_value("Root", str(report.root), indent=2)
        console.key_value("Time", report.timestamp.strftime("%Y-%m-%d %H:%M:%S"), indent=2)
        
        # Section table
        console.section("Sections")
        
        rows = []
        for section in report.sections:
            if section.exists:
                rows.append([
                    section.name,
                    str(section.units),
                    str(section.files),
                    section.size_display,
                ])
            else:
                rows.append([section.name, "-", "-", "-"])
        
        console.table(
            ["Section", "Units", "Files", "Size"],
            rows,
        )
        
        # Totals
        console.newline()
        console.info(f"Total units: {report.total_units}")
        console.info(f"Total files: {report.total_files}")
        console.info(f"Total size: {format_size(report.total_size)}")
        
        # Pending plan
        if report.pending_plan:
            console.section("Pending Plan")
            console.info(f"Created: {report.pending_plan.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
            console.info(f"Moves: {len(report.pending_plan.moves)}")
            console.info("Run 'gabriel apply' to execute")
        
        # Quick health check
        self._print_health_summary(report)
    
    def _print_health_summary(self, report: StatusReport) -> None:
        """Print a quick health summary."""
        console.section("Health")
        
        issues = []
        
        # Check for uninitialized structure
        if not self.paths.control_plane.exists():
            issues.append("Structure not initialized (run 'gabriel init')")
        
        # Check for empty sections
        empty_sections = [s for s in report.sections if s.exists and s.units == 0]
        if empty_sections:
            names = ", ".join(s.name for s in empty_sections)
            issues.append(f"Empty sections: {names}")
        
        # Check for orphaned files in root
        orphans = [
            f for f in self.paths.root.iterdir()
            if f.is_file() and not f.name.startswith(".")
            and f.name.lower() not in (
                "readme.md", "license", "license.md",
                "pyproject.toml", "package.json",
            )
        ]
        if orphans:
            issues.append(f"Orphaned files in root: {len(orphans)}")
        
        if issues:
            for issue in issues:
                console.warning(issue)
        else:
            console.success("All checks passed!")
    
    # ─────────────────────────────────────────────────────────────────
    # Detailed Views
    # ─────────────────────────────────────────────────────────────────
    
    def print_projects(self) -> None:
        """Print detailed project listing."""
        console.section("Projects")
        
        if not self.paths.projects.exists():
            console.warning("Projects directory does not exist")
            return
        
        projects = sorted(self.paths.projects.iterdir())
        projects = [p for p in projects if p.is_dir()]
        
        if not projects:
            console.info("No projects found")
            return
        
        rows = []
        for project in projects:
            file_count, size = get_dir_stats(project)
            
            # Extract language from name if present
            name = project.name
            lang = "?"
            if "__" in name:
                parts = name.rsplit("__", 1)
                name = parts[0]
                lang = parts[1] if len(parts) > 1 else "?"
            
            rows.append([name, lang, str(file_count), format_size(size)])
        
        console.table(
            ["Project", "Language", "Files", "Size"],
            rows,
        )
    
    def print_duplicates_summary(self) -> None:
        """Print summary of duplicate files if available."""
        dups_path = self.paths.manifest_dir / "duplicates.json"
        
        if not dups_path.exists():
            console.info("No duplicates report found (run 'gabriel dedupe')")
            return
        
        import json
        data = json.loads(dups_path.read_text(encoding="utf-8"))
        
        console.section("Duplicates Summary")
        console.info(f"Duplicate groups: {data.get('total_groups', 0)}")
        console.info(f"Wasted space: {format_size(data.get('total_wasted_bytes', 0))}")
