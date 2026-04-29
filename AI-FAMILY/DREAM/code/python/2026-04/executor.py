"""
GABRIEL Move Executor
═════════════════════════════════════════════════════════════════════

Executes move plans with full rollback capability.
Handles file/directory moves, conflict resolution, and audit logging.

"""

from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple

from gabriel.config import VERSION
from gabriel.console import console
from gabriel.models import MoveItem, MoveKind, MovePlan, RollbackInfo
from gabriel.utils import PathManager, unique_path, safe_mkdir


class MoveExecutor:
    """
    Executes move plans with rollback capability.
    
    Provides safe file/directory movement with:
    - Dry-run support
    - Conflict resolution
    - Full audit trail
    - Rollback capability
    """
    
    def __init__(self, paths: PathManager) -> None:
        self.paths = paths
    
    # ─────────────────────────────────────────────────────────────────
    # Apply Operations
    # ─────────────────────────────────────────────────────────────────
    
    def apply(
        self,
        plan: MovePlan,
        dry_run: bool = False,
        force: bool = False,
    ) -> RollbackInfo:
        """
        Apply a move plan.
        
        Args:
            plan: MovePlan to execute
            dry_run: If True, only preview changes
            force: Skip confirmation prompts
            
        Returns:
            RollbackInfo for undoing the operation
        """
        rollback_id = datetime.now().strftime("%Y%m%d-%H%M%S")
        applied_moves: List[Tuple[str, str]] = []
        skipped = 0
        errors = 0
        
        console.section("Applying Move Plan")
        console.info(f"Total moves: {len(plan.moves)}")
        console.info(f"Plan created: {plan.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        
        if dry_run:
            console.warning("DRY RUN MODE - No files will be moved")
        
        if not dry_run and not force and len(plan.moves) > 0:
            if not console.confirm(f"Apply {len(plan.moves)} moves?"):
                console.warning("Operation cancelled")
                return RollbackInfo(
                    id=rollback_id,
                    created_at=datetime.now(),
                    moves_applied=[],
                )
        
        # Execute moves
        for i, move in enumerate(plan.moves):
            # Progress
            console.progress(
                i, len(plan.moves),
                prefix="Progress: ",
                suffix=f"({i}/{len(plan.moves)})"
            )
            
            result = self._execute_move(move, dry_run)
            
            if result is None:
                skipped += 1
            elif isinstance(result, Exception):
                errors += 1
                console.debug(f"Error: {result}")
            else:
                src_path, dst_path = result
                applied_moves.append((str(src_path), str(dst_path)))
        
        # Final progress
        console.progress(len(plan.moves), len(plan.moves), prefix="Progress: ")
        
        # Create rollback info
        rollback_info = RollbackInfo(
            id=rollback_id,
            created_at=datetime.now(),
            moves_applied=applied_moves,
            metadata={
                "plan_version": plan.version,
                "plan_created": plan.created_at.isoformat(),
                "dry_run": dry_run,
                "skipped": skipped,
                "errors": errors,
            },
        )
        
        # Save rollback info (unless dry run)
        if not dry_run and applied_moves:
            self._save_rollback(rollback_info)
        
        # Summary
        console.newline()
        if dry_run:
            console.success(f"Dry run complete: {len(applied_moves)} moves would be applied")
            if skipped:
                console.info(f"Skipped: {skipped} (missing sources)")
            if errors:
                console.warning(f"Errors: {errors}")
        else:
            console.success(f"Applied {len(applied_moves)} moves")
            if skipped:
                console.info(f"Skipped: {skipped}")
            if errors:
                console.warning(f"Errors: {errors}")
            console.info(f"Rollback ID: {rollback_id}")
        
        return rollback_info
    
    def _execute_move(
        self,
        move: MoveItem,
        dry_run: bool,
    ) -> Optional[Tuple[Path, Path] | Exception]:
        """
        Execute a single move operation.
        
        Args:
            move: MoveItem to execute
            dry_run: If True, only simulate
            
        Returns:
            Tuple of (src, dst) if successful
            None if skipped
            Exception if error
        """
        src = move.src
        dst = move.dst
        
        # Check source exists
        if not src.exists():
            console.debug(f"Source missing: {src}")
            return None
        
        # Handle destination conflicts
        if dst.exists():
            dst = unique_path(
                dst.parent,
                dst.name,
                is_file=(move.kind == MoveKind.LOOSE)
            )
            console.debug(f"Destination exists, using: {dst}")
        
        if dry_run:
            console.debug(f"Would move: {src} → {dst}")
            return (src, dst)
        
        try:
            # Ensure destination parent exists
            safe_mkdir(dst.parent)
            
            # Perform move
            shutil.move(str(src), str(dst))
            console.debug(f"Moved: {src} → {dst}")
            
            return (src, dst)
            
        except Exception as e:
            console.error(f"Failed to move {src}: {e}")
            return e
    
    # ─────────────────────────────────────────────────────────────────
    # Rollback Operations
    # ─────────────────────────────────────────────────────────────────
    
    def rollback(
        self,
        rollback_info: Optional[RollbackInfo] = None,
        rollback_id: Optional[str] = None,
    ) -> int:
        """
        Rollback a previous apply operation.
        
        Args:
            rollback_info: RollbackInfo to use (optional)
            rollback_id: ID of rollback to load (optional)
            
        Returns:
            Number of moves undone
        """
        # Load rollback info if not provided
        if rollback_info is None:
            rollback_info = self._load_rollback(rollback_id)
        
        if rollback_info is None:
            raise FileNotFoundError("No rollback information found")
        
        console.section("Rolling Back Changes")
        console.info(f"Rollback ID: {rollback_info.id}")
        console.info(f"Created: {rollback_info.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        console.info(f"Moves to undo: {len(rollback_info.moves_applied)}")
        
        undone = 0
        errors = 0
        
        # Reverse the moves (in reverse order)
        for original, moved_to in reversed(rollback_info.moves_applied):
            original_path = Path(original)
            moved_path = Path(moved_to)
            
            if not moved_path.exists():
                console.warning(f"Cannot undo: {moved_path} no longer exists")
                continue
            
            try:
                # Ensure original parent exists
                safe_mkdir(original_path.parent)
                
                # Move back
                shutil.move(str(moved_path), str(original_path))
                undone += 1
                console.debug(f"Restored: {moved_path} → {original_path}")
                
            except Exception as e:
                console.error(f"Failed to restore {original}: {e}")
                errors += 1
        
        # Clean up empty directories left behind
        self._cleanup_empty_dirs()
        
        console.newline()
        console.success(f"Rolled back {undone} moves")
        if errors:
            console.warning(f"Errors: {errors}")
        
        return undone
    
    def _cleanup_empty_dirs(self) -> int:
        """
        Remove empty directories in managed areas.
        
        Returns:
            Number of directories removed
        """
        removed = 0
        
        for scan_dir in [self.paths.projects, self.paths.libraries]:
            if not scan_dir.exists():
                continue
            
            # Walk bottom-up to remove empty dirs
            for dirpath in sorted(scan_dir.rglob("*"), reverse=True):
                if dirpath.is_dir():
                    try:
                        # Only remove if empty
                        if not any(dirpath.iterdir()):
                            dirpath.rmdir()
                            removed += 1
                    except OSError:
                        pass
        
        if removed:
            console.debug(f"Cleaned up {removed} empty directories")
        
        return removed
    
    # ─────────────────────────────────────────────────────────────────
    # Rollback Persistence
    # ─────────────────────────────────────────────────────────────────
    
    def _save_rollback(self, info: RollbackInfo) -> None:
        """Save rollback information to disk."""
        safe_mkdir(self.paths.rollback_dir)
        
        # Save as latest
        latest_path = self.paths.latest_rollback_path
        info.save(latest_path)
        
        # Also save timestamped version
        archive_path = self.paths.rollback_dir / f"rollback_{info.id}.json"
        info.save(archive_path)
        
        console.debug(f"Saved rollback info: {archive_path}")
    
    def _load_rollback(self, rollback_id: Optional[str] = None) -> Optional[RollbackInfo]:
        """
        Load rollback information from disk.
        
        Args:
            rollback_id: Specific rollback ID, or None for latest
            
        Returns:
            RollbackInfo or None if not found
        """
        if rollback_id:
            path = self.paths.rollback_dir / f"rollback_{rollback_id}.json"
        else:
            path = self.paths.latest_rollback_path
        
        if not path.exists():
            return None
        
        return RollbackInfo.load(path)
    
    def list_rollbacks(self) -> List[RollbackInfo]:
        """
        List all available rollback points.
        
        Returns:
            List of RollbackInfo sorted by date (newest first)
        """
        rollbacks: List[RollbackInfo] = []
        
        if not self.paths.rollback_dir.exists():
            return rollbacks
        
        for path in self.paths.rollback_dir.glob("rollback_*.json"):
            try:
                info = RollbackInfo.load(path)
                rollbacks.append(info)
            except Exception as e:
                console.debug(f"Failed to load {path}: {e}")
        
        # Sort by date (newest first)
        rollbacks.sort(key=lambda r: r.created_at, reverse=True)
        
        return rollbacks
