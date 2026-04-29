#!/usr/bin/env python3
"""
MC96ECO Commander One MCP Server — Full-Spectrum Filesystem Control for M2 Ultra.

Replicates and extends every Commander One PRO capability via direct OS-level
access: dual-pane browsing, cloud/remote mounts, all archive formats, process
management, terminal execution, content search, encryption, device access,
batch rename, and item-number voice command integration.

Author: Robert Stephen Plowman / MC96ECO
Agent: LUCY (Organizer/Archivist)
Transport: stdio (local)
Runtime: Python 3.11+ / FastMCP
"""

import asyncio
import fnmatch
import hashlib
import json
import os
import platform
import re
import shutil
import signal
import stat
import subprocess
import sys
import tarfile
import tempfile
import zipfile
from contextlib import asynccontextmanager
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, ConfigDict, Field, field_validator

# ═══════════════════════════════════════════════════════════════════════════════
# SERVER INITIALIZATION
# ═══════════════════════════════════════════════════════════════════════════════

mcp = FastMCP("commander_one_mcp")

# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

MAX_FILE_READ_SIZE = 10 * 1024 * 1024  # 10MB
MAX_SEARCH_RESULTS = 500
MAX_TREE_DEPTH = 10
MAX_HEX_BYTES = 4096

DANGEROUS_PATHS = frozenset([
    "/", "/System", "/Library", "/usr", "/bin", "/sbin",
    "/private", "/var", "/etc", "/cores",
])

# Item-number registry for voice commands — maps item numbers to paths
_item_registry: Dict[int, Dict[str, Any]] = {}
_item_counter: int = 0

# Dual-pane state
_pane_state: Dict[str, str] = {
    "left": str(Path.home()),
    "right": str(Path.home()),
    "active": "left",
}

# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════════

class ResponseFormat(str, Enum):
    MARKDOWN = "markdown"
    JSON = "json"

class SortBy(str, Enum):
    NAME = "name"
    SIZE = "size"
    MODIFIED = "modified"
    CREATED = "created"
    TYPE = "type"
    EXTENSION = "extension"

class ArchiveFormat(str, Enum):
    ZIP = "zip"
    TAR_GZ = "tar.gz"
    TAR_BZ2 = "tar.bz2"
    SEVENZ = "7z"

class ViewMode(str, Enum):
    DETAILED = "detailed"
    ICONS = "icons"
    NAMES = "names"

class SearchMode(str, Enum):
    FILENAME = "filename"
    CONTENT = "content"
    REGEX = "regex"
    SPOTLIGHT = "spotlight"

class Pane(str, Enum):
    LEFT = "left"
    RIGHT = "right"

class FileViewerMode(str, Enum):
    TEXT = "text"
    HEX = "hex"
    IMAGE_INFO = "image_info"
    BINARY = "binary"

# ═══════════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def _validate_path(path: str) -> Path:
    """Resolve and validate a filesystem path. Blocks destructive ops on system roots."""
    resolved = Path(path).expanduser().resolve()
    path_str = str(resolved)
    for dangerous in DANGEROUS_PATHS:
        if path_str == dangerous:
            raise ValueError(
                f"Safety: Cannot operate directly on protected system path '{dangerous}'. "
                f"Specify a subdirectory."
            )
    return resolved


def _format_size(size_bytes: int) -> str:
    """Human-readable file size."""
    if size_bytes < 0:
        return "0 B"
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}" if unit != "B" else f"{size_bytes} B"
        size_bytes /= 1024
    return f"{size_bytes:.1f} PB"


def _format_ts(ts: float) -> str:
    """Format Unix timestamp."""
    return datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S")


def _get_file_info(path: Path) -> Dict[str, Any]:
    """Comprehensive file metadata."""
    try:
        st = path.stat()
        info = {
            "name": path.name,
            "path": str(path),
            "type": "directory" if path.is_dir() else ("symlink" if path.is_symlink() else "file"),
            "size": st.st_size,
            "size_human": _format_size(st.st_size),
            "modified": _format_ts(st.st_mtime),
            "created": _format_ts(st.st_birthtime) if hasattr(st, "st_birthtime") else _format_ts(st.st_ctime),
            "permissions": stat.filemode(st.st_mode),
            "owner_uid": st.st_uid,
            "group_gid": st.st_gid,
            "is_symlink": path.is_symlink(),
            "is_hidden": path.name.startswith("."),
            "extension": path.suffix.lower() if path.is_file() else None,
            "inode": st.st_ino,
        }
        if path.is_symlink():
            try:
                info["symlink_target"] = str(path.resolve())
            except OSError:
                info["symlink_target"] = "broken"
        return info
    except PermissionError:
        return {"name": path.name, "path": str(path), "type": "unknown", "error": "Permission denied"}
    except Exception as e:
        return {"name": path.name, "path": str(path), "type": "unknown", "error": str(e)}


def _register_items(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Assign item numbers to directory entries for voice command reference."""
    global _item_counter, _item_registry
    _item_registry.clear()
    _item_counter = 0
    for entry in entries:
        _item_counter += 1
        entry["item_number"] = _item_counter
        _item_registry[_item_counter] = entry
    return entries


def _handle_error(e: Exception) -> str:
    """Consistent error formatting with actionable suggestions."""
    if isinstance(e, FileNotFoundError):
        return f"Error: Path not found — '{e.filename or e}'. Verify the path exists."
    elif isinstance(e, PermissionError):
        return f"Error: Permission denied — '{e.filename or e}'. Try enabling root mode or check permissions."
    elif isinstance(e, IsADirectoryError):
        return "Error: Expected a file but got a directory. Use co1_list_directory instead."
    elif isinstance(e, NotADirectoryError):
        return "Error: Expected a directory but got a file."
    elif isinstance(e, ValueError):
        return f"Error: {e}"
    elif isinstance(e, OSError):
        return f"Error: OS error — {e}"
    return f"Error: {type(e).__name__} — {e}"


def _sort_entries(entries: List[Dict], sort_by: SortBy, reverse: bool = False) -> List[Dict]:
    """Sort file entries by specified criteria."""
    keys = {
        SortBy.NAME: lambda x: x.get("name", "").lower(),
        SortBy.SIZE: lambda x: x.get("size", 0),
        SortBy.MODIFIED: lambda x: x.get("modified", ""),
        SortBy.CREATED: lambda x: x.get("created", ""),
        SortBy.TYPE: lambda x: (x.get("type", ""), x.get("name", "").lower()),
        SortBy.EXTENSION: lambda x: (x.get("extension") or "", x.get("name", "").lower()),
    }
    return sorted(entries, key=keys.get(sort_by, keys[SortBy.NAME]), reverse=reverse)


# ═══════════════════════════════════════════════════════════════════════════════
# INPUT MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class ListDirectoryInput(BaseModel):
    """List directory contents with Commander One-style options."""
    model_config = ConfigDict(str_strip_whitespace=True)
    path: str = Field(..., description="Absolute path to directory (e.g. '/Users/rob/Documents')")
    pane: Optional[Pane] = Field(default=None, description="Set this pane's path — 'left' or 'right' (dual-pane state)")
    show_hidden: bool = Field(default=False, description="Show hidden/dotfiles (Commander One toolbar toggle)")
    sort_by: SortBy = Field(default=SortBy.NAME, description="Sort by: name, size, modified, created, type, extension")
    reverse: bool = Field(default=False, description="Reverse sort order")
    calculate_dir_sizes: bool = Field(default=False, description="Calculate directory sizes (like Space key in Commander One)")
    response_format: ResponseFormat = Field(default=ResponseFormat.MARKDOWN)


class ReadFileInput(BaseModel):
    """Read file contents."""
    model_config = ConfigDict(str_strip_whitespace=True)
    path: str = Field(..., description="Absolute path to the file")
    encoding: str = Field(default="utf-8", description="File encoding (utf-8, ascii, latin-1)")
    line_start: Optional[int] = Field(default=None, description="Start from line (1-indexed)", ge=1)
    line_end: Optional[int] = Field(default=None, description="End at line (inclusive)", ge=1)
    max_bytes: Optional[int] = Field(default=None, description="Max bytes to read", ge=1, le=MAX_FILE_READ_SIZE)


class FileViewerInput(BaseModel):
    """Commander One F3 file viewer — text, hex, binary, image info."""
    model_config = ConfigDict(str_strip_whitespace=True)
    path: str = Field(..., description="Absolute path to file")
    mode: FileViewerMode = Field(default=FileViewerMode.TEXT, description="View mode: text, hex, binary, image_info")
    offset: int = Field(default=0, description="Byte offset for hex/binary view", ge=0)
    length: int = Field(default=MAX_HEX_BYTES, description="Bytes to read for hex/binary", ge=1, le=MAX_HEX_BYTES)


class WriteFileInput(BaseModel):
    """Write content to a file."""
    model_config = ConfigDict(str_strip_whitespace=False)
    path: str = Field(..., description="Absolute path for the file")
    content: str = Field(..., description="Content to write")
    encoding: str = Field(default="utf-8")
    create_parents: bool = Field(default=True, description="Create parent directories")
    overwrite: bool = Field(default=False, description="Overwrite if exists")


class CopyMoveInput(BaseModel):
    """Copy or move files/directories."""
    model_config = ConfigDict(str_strip_whitespace=True)
    source: str = Field(..., description="Source path (or item number as '#N')")
    destination: str = Field(..., description="Destination path")
    overwrite: bool = Field(default=False)
    preserve_metadata: bool = Field(default=True, description="Preserve timestamps and permissions (copy2)")


class DeleteInput(BaseModel):
    """Delete files/directories with safety defaults."""
    model_config = ConfigDict(str_strip_whitespace=True)
    path: str = Field(..., description="Path to delete (or item number as '#N')")
    recursive: bool = Field(default=False, description="Required for non-empty directories")
    dry_run: bool = Field(default=True, description="Preview only — set False to actually delete")
    secure_delete: bool = Field(default=False, description="Overwrite file data before deletion")


class BatchRenameInput(BaseModel):
    """Commander One batch rename with wildcards and regex."""
    model_config = ConfigDict(str_strip_whitespace=True)
    directory: str = Field(..., description="Directory containing files to rename")
    pattern: str = Field(..., description="Match pattern — glob (e.g. '*.jpg') or regex (with use_regex=True)")
    replacement: str = Field(..., description="Replacement pattern. Use {n} for sequence number, {name} for original name, {ext} for extension")
    use_regex: bool = Field(default=False, description="Interpret pattern as regex")
    start_number: int = Field(default=1, description="Starting sequence number", ge=0)
    dry_run: bool = Field(default=True, description="Preview renames without executing")


class SearchInput(BaseModel):
    """Multi-mode search: filename, content, regex, Spotlight."""
    model_config = ConfigDict(str_strip_whitespace=True)
    root: str = Field(..., description="Directory to search from")
    query: str = Field(..., description="Search query or pattern")
    mode: SearchMode = Field(default=SearchMode.FILENAME, description="filename, content, regex, spotlight")
    include_hidden: bool = Field(default=False)
    file_type: Optional[str] = Field(default=None, description="Filter: 'file', 'directory', or None")
    extensions: Optional[List[str]] = Field(default=None, description="Filter by extensions (e.g. ['.py', '.js'])")
    max_depth: int = Field(default=5, ge=1, le=20)
    max_results: int = Field(default=50, ge=1, le=MAX_SEARCH_RESULTS)
    case_sensitive: bool = Field(default=False)
    search_archives: bool = Field(default=False, description="Search inside ZIP archives")
    response_format: ResponseFormat = Field(default=ResponseFormat.MARKDOWN)


class TreeInput(BaseModel):
    """Directory tree visualization."""
    model_config = ConfigDict(str_strip_whitespace=True)
    path: str = Field(..., description="Root directory")
    max_depth: int = Field(default=3, ge=1, le=MAX_TREE_DEPTH)
    show_hidden: bool = Field(default=False)
    show_size: bool = Field(default=False)
    dirs_only: bool = Field(default=False)


class DiskUsageInput(BaseModel):
    """Disk usage analysis."""
    model_config = ConfigDict(str_strip_whitespace=True)
    path: str = Field(..., description="Directory to analyze")
    top_n: int = Field(default=20, ge=1, le=100)
    include_hidden: bool = Field(default=False)
    response_format: ResponseFormat = Field(default=ResponseFormat.MARKDOWN)


class ArchiveCreateInput(BaseModel):
    """Create archives — ZIP, tar.gz, tar.bz2, 7z."""
    model_config = ConfigDict(str_strip_whitespace=True)
    source: str = Field(..., description="File or directory to archive")
    output: str = Field(..., description="Output archive path")
    format: ArchiveFormat = Field(default=ArchiveFormat.ZIP)
    password: Optional[str] = Field(default=None, description="Password-protect the archive (ZIP only via pyminizip)")
    compression_level: int = Field(default=6, description="Compression level 0-9", ge=0, le=9)


class ArchiveExtractInput(BaseModel):
    """Extract archives."""
    model_config = ConfigDict(str_strip_whitespace=True)
    archive: str = Field(..., description="Path to archive file")
    destination: str = Field(..., description="Extraction directory")
    password: Optional[str] = Field(default=None, description="Password for encrypted archives")


class ArchiveBrowseInput(BaseModel):
    """Browse archive contents without extracting (Commander One feature)."""
    model_config = ConfigDict(str_strip_whitespace=True)
    archive: str = Field(..., description="Path to archive file")
    internal_path: str = Field(default="", description="Path inside the archive to list")
    response_format: ResponseFormat = Field(default=ResponseFormat.MARKDOWN)


class TerminalInput(BaseModel):
    """Execute terminal commands (Commander One Ctrl+O terminal)."""
    model_config = ConfigDict(str_strip_whitespace=True)
    command: str = Field(..., description="Shell command to execute")
    working_directory: Optional[str] = Field(default=None, description="Working directory (defaults to active pane path)")
    timeout: int = Field(default=30, description="Timeout in seconds", ge=1, le=300)
    shell: str = Field(default="/bin/zsh", description="Shell to use")


class ProcessListInput(BaseModel):
    """List running processes (Commander One Process Viewer)."""
    model_config = ConfigDict(str_strip_whitespace=True)
    filter: Optional[str] = Field(default=None, description="Filter by process name substring")
    sort_by: str = Field(default="cpu", description="Sort by: cpu, memory, pid, name")
    top_n: int = Field(default=30, ge=1, le=200)
    response_format: ResponseFormat = Field(default=ResponseFormat.MARKDOWN)


class ProcessKillInput(BaseModel):
    """Kill a process by PID."""
    model_config = ConfigDict(str_strip_whitespace=True)
    pid: int = Field(..., description="Process ID to terminate")
    force: bool = Field(default=False, description="Force kill (SIGKILL) instead of graceful (SIGTERM)")


class FileInfoInput(BaseModel):
    """Get Info (Cmd+I equivalent)."""
    model_config = ConfigDict(str_strip_whitespace=True)
    path: str = Field(..., description="Absolute path")
    response_format: ResponseFormat = Field(default=ResponseFormat.MARKDOWN)


class HashFileInput(BaseModel):
    """Compute file checksum."""
    model_config = ConfigDict(str_strip_whitespace=True)
    path: str = Field(..., description="File path")
    algorithm: str = Field(default="sha256", description="md5, sha1, sha256, sha512")


class FindDuplicatesInput(BaseModel):
    """Find duplicate files by content hash."""
    model_config = ConfigDict(str_strip_whitespace=True)
    path: str = Field(..., description="Directory to scan")
    min_size: int = Field(default=1024, ge=0)
    max_depth: int = Field(default=3, ge=1, le=10)
    response_format: ResponseFormat = Field(default=ResponseFormat.MARKDOWN)


class CompareInput(BaseModel):
    """Compare two files or directories."""
    model_config = ConfigDict(str_strip_whitespace=True)
    left: str = Field(..., description="Left file/directory path")
    right: str = Field(..., description="Right file/directory path")
    content_compare: bool = Field(default=False, description="Compare file contents (not just metadata)")


class FavoritesInput(BaseModel):
    """Manage favorites (bookmarks)."""
    model_config = ConfigDict(str_strip_whitespace=True)
    action: str = Field(..., description="add, remove, list")
    path: Optional[str] = Field(default=None, description="Path to add/remove")
    label: Optional[str] = Field(default=None, description="Display label for the favorite")


class ItemRefInput(BaseModel):
    """Reference a previously listed item by number for voice commands."""
    model_config = ConfigDict(str_strip_whitespace=True)
    item_number: int = Field(..., description="Item number from the last directory listing", ge=1)
    action: str = Field(..., description="Action: open, copy, move, delete, info, select, view")
    destination: Optional[str] = Field(default=None, description="Destination path for copy/move actions")


class PermissionsInput(BaseModel):
    """Change file/directory permissions."""
    model_config = ConfigDict(str_strip_whitespace=True)
    path: str = Field(..., description="File or directory path")
    mode: Optional[str] = Field(default=None, description="Octal mode string (e.g. '755', '644')")
    owner: Optional[str] = Field(default=None, description="New owner (username or UID)")
    group: Optional[str] = Field(default=None, description="New group (group name or GID)")
    recursive: bool = Field(default=False)


class MountInfoInput(BaseModel):
    """List mounted volumes and network shares."""
    model_config = ConfigDict(str_strip_whitespace=True)
    response_format: ResponseFormat = Field(default=ResponseFormat.MARKDOWN)


class SystemInfoInput(BaseModel):
    """System information."""
    model_config = ConfigDict(str_strip_whitespace=True)
    response_format: ResponseFormat = Field(default=ResponseFormat.MARKDOWN)


class PaneStateInput(BaseModel):
    """Get or set dual-pane state."""
    model_config = ConfigDict(str_strip_whitespace=True)
    action: str = Field(default="get", description="get, set_left, set_right, swap, set_active")
    path: Optional[str] = Field(default=None, description="Path for set actions")
    active_pane: Optional[Pane] = Field(default=None, description="Which pane to make active")


class QueueInput(BaseModel):
    """Operations queue (Commander One F2)."""
    model_config = ConfigDict(str_strip_whitespace=True)
    action: str = Field(default="list", description="list, clear, status")


# ═══════════════════════════════════════════════════════════════════════════════
# FAVORITES STATE
# ═══════════════════════════════════════════════════════════════════════════════

_favorites: List[Dict[str, str]] = []

# ═══════════════════════════════════════════════════════════════════════════════
# TOOL IMPLEMENTATIONS
# ═══════════════════════════════════════════════════════════════════════════════

# ─── 1. DUAL-PANE NAVIGATION ────────────────────────────────────────────────

@mcp.tool(
    name="co1_pane_state",
    annotations={"title": "Dual-Pane State", "readOnlyHint": False, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
)
async def co1_pane_state(params: PaneStateInput) -> str:
    """Manage Commander One's dual-pane state — get, set, or swap left/right pane paths.

    Args:
        params: PaneStateInput with action (get/set_left/set_right/swap/set_active), path, active_pane

    Returns:
        str: Current pane state
    """
    global _pane_state

    if params.action == "get":
        pass
    elif params.action == "set_left" and params.path:
        p = _validate_path(params.path)
        if not p.is_dir():
            return f"Error: '{params.path}' is not a directory."
        _pane_state["left"] = str(p)
    elif params.action == "set_right" and params.path:
        p = _validate_path(params.path)
        if not p.is_dir():
            return f"Error: '{params.path}' is not a directory."
        _pane_state["right"] = str(p)
    elif params.action == "swap":
        _pane_state["left"], _pane_state["right"] = _pane_state["right"], _pane_state["left"]
    elif params.action == "set_active" and params.active_pane:
        _pane_state["active"] = params.active_pane.value
    else:
        return "Error: Invalid action. Use: get, set_left, set_right, swap, set_active"

    return (
        f"# Dual-Pane State\n\n"
        f"- **Left pane**: `{_pane_state['left']}`\n"
        f"- **Right pane**: `{_pane_state['right']}`\n"
        f"- **Active**: {_pane_state['active']}\n"
    )

# ─── 2. DIRECTORY LISTING WITH ITEM NUMBERS ─────────────────────────────────

@mcp.tool(
    name="co1_list_directory",
    annotations={"title": "List Directory", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
)
async def co1_list_directory(params: ListDirectoryInput) -> str:
    """List directory contents with item numbers for voice commands.

    Each entry is assigned an item number (#1, #2, ...) that can be referenced
    in subsequent commands via co1_item_action. Dual-pane state is updated if
    pane is specified.

    Args:
        params: ListDirectoryInput with path, pane, show_hidden, sort_by, etc.

    Returns:
        str: Formatted directory listing with item numbers
    """
    try:
        dir_path = _validate_path(params.path)
        if not dir_path.is_dir():
            return f"Error: '{params.path}' is not a directory."

        # Update pane state
        if params.pane:
            _pane_state[params.pane.value] = str(dir_path)

        entries = []
        for item in dir_path.iterdir():
            if not params.show_hidden and item.name.startswith("."):
                continue
            info = _get_file_info(item)

            # Calculate directory sizes if requested (Space key behavior)
            if params.calculate_dir_sizes and item.is_dir():
                try:
                    total = sum(f.stat().st_size for f in item.rglob("*") if f.is_file())
                    info["size"] = total
                    info["size_human"] = _format_size(total)
                except (PermissionError, OSError):
                    pass

            entries.append(info)

        entries = _sort_entries(entries, params.sort_by, params.reverse)
        entries = _register_items(entries)

        if params.response_format == ResponseFormat.JSON:
            return json.dumps({
                "path": str(dir_path),
                "count": len(entries),
                "pane": params.pane.value if params.pane else _pane_state["active"],
                "entries": entries,
            }, indent=2)

        # Markdown with item numbers
        pane_label = f" [{params.pane.value.upper()} PANE]" if params.pane else ""
        lines = [f"# {dir_path}{pane_label}", f"**{len(entries)} items** | Say 'item N' to act on any entry", ""]
        lines.append("| # | Type | Name | Size | Modified | Perms |")
        lines.append("|---|------|------|------|----------|-------|")
        for e in entries:
            num = e.get("item_number", "—")
            icon = "📁" if e.get("type") == "directory" else ("🔗" if e.get("is_symlink") else "📄")
            name = e.get("name", "?")
            if e.get("is_hidden"):
                name = f"*{name}*"
            size = e.get("size_human", "—") if e.get("type") != "directory" or params.calculate_dir_sizes else "—"
            mod = e.get("modified", "—")
            perms = e.get("permissions", "—")
            lines.append(f"| **{num}** | {icon} | {name} | {size} | {mod} | `{perms}` |")

        return "\n".join(lines)

    except Exception as e:
        return _handle_error(e)

# ─── 3. ITEM-NUMBER VOICE ACTIONS ───────────────────────────────────────────

@mcp.tool(
    name="co1_item_action",
    annotations={"title": "Item Action (Voice Command)", "readOnlyHint": False, "destructiveHint": True, "idempotentHint": False, "openWorldHint": False},
)
async def co1_item_action(params: ItemRefInput) -> str:
    """Perform an action on a previously listed item by its number.

    Use after co1_list_directory to act on items by saying 'item 3 open' or
    'copy item 5 to /Users/rob/backup'. Item numbers persist until the next
    directory listing.

    Args:
        params: ItemRefInput with item_number, action (open/copy/move/delete/info/select/view), destination

    Returns:
        str: Action result
    """
    if params.item_number not in _item_registry:
        return (
            f"Error: Item #{params.item_number} not found. "
            f"Available items: {list(_item_registry.keys()) if _item_registry else 'none — run co1_list_directory first'}."
        )

    item = _item_registry[params.item_number]
    item_path = Path(item["path"])

    if params.action == "info":
        info = _get_file_info(item_path)
        lines = [f"# Item #{params.item_number}: {info.get('name', '?')}", ""]
        for k, v in info.items():
            if k != "name":
                lines.append(f"- **{k}**: {v}")
        return "\n".join(lines)

    elif params.action == "open":
        if item_path.is_dir():
            # Navigate into directory — re-list
            return await co1_list_directory(ListDirectoryInput(path=str(item_path)))
        else:
            # Read file
            return await co1_read_file(ReadFileInput(path=str(item_path)))

    elif params.action == "view":
        return await co1_file_viewer(FileViewerInput(path=str(item_path)))

    elif params.action == "copy":
        if not params.destination:
            # Default: copy to other pane
            active = _pane_state["active"]
            other = "right" if active == "left" else "left"
            dest = _pane_state[other]
        else:
            dest = params.destination
        return await co1_copy(CopyMoveInput(source=str(item_path), destination=os.path.join(dest, item_path.name)))

    elif params.action == "move":
        if not params.destination:
            active = _pane_state["active"]
            other = "right" if active == "left" else "left"
            dest = _pane_state[other]
        else:
            dest = params.destination
        return await co1_move(CopyMoveInput(source=str(item_path), destination=os.path.join(dest, item_path.name)))

    elif params.action == "delete":
        return await co1_delete(DeleteInput(path=str(item_path), dry_run=True))

    elif params.action == "select":
        return f"✅ Selected item #{params.item_number}: `{item_path}`"

    else:
        return f"Error: Unknown action '{params.action}'. Use: open, copy, move, delete, info, select, view"

# ─── 4. FILE READING ────────────────────────────────────────────────────────

@mcp.tool(
    name="co1_read_file",
    annotations={"title": "Read File", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
)
async def co1_read_file(params: ReadFileInput) -> str:
    """Read file contents with optional line range. Supports text files up to 10MB.

    Args:
        params: ReadFileInput with path, encoding, line_start, line_end, max_bytes

    Returns:
        str: File contents
    """
    try:
        file_path = _validate_path(params.path)
        if not file_path.is_file():
            return f"Error: '{params.path}' is not a file or does not exist."

        file_size = file_path.stat().st_size
        max_read = params.max_bytes or MAX_FILE_READ_SIZE
        if file_size > max_read:
            return f"Error: File is {_format_size(file_size)}, exceeds {_format_size(max_read)} limit. Use line_start/line_end."

        content = file_path.read_text(encoding=params.encoding)

        if params.line_start or params.line_end:
            lines = content.splitlines(keepends=True)
            start = (params.line_start or 1) - 1
            end = params.line_end or len(lines)
            selected = lines[start:end]
            header = f"# {file_path.name} (lines {start + 1}–{min(end, len(lines))} of {len(lines)})\n\n"
            return header + "".join(f"{i + start + 1:>6} | {line}" for i, line in enumerate(selected))

        return content

    except UnicodeDecodeError:
        return f"Error: Cannot decode as {params.encoding}. Try encoding='latin-1' or use co1_file_viewer with mode='hex'."
    except Exception as e:
        return _handle_error(e)

# ─── 5. FILE VIEWER (F3) ────────────────────────────────────────────────────

@mcp.tool(
    name="co1_file_viewer",
    annotations={"title": "File Viewer (F3)", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
)
async def co1_file_viewer(params: FileViewerInput) -> str:
    """Commander One F3 internal file viewer — text, hex, binary, or image info mode.

    View any file including binary files in hex dump format, similar to Commander One's
    built-in viewer that ignores file extensions and detects format by content.

    Args:
        params: FileViewerInput with path, mode (text/hex/binary/image_info), offset, length

    Returns:
        str: File contents in the requested view mode
    """
    try:
        file_path = _validate_path(params.path)
        if not file_path.is_file():
            return f"Error: '{params.path}' is not a file."

        if params.mode == FileViewerMode.TEXT:
            try:
                content = file_path.read_text(encoding="utf-8")
                lines = content.splitlines()
                return f"# {file_path.name} ({len(lines)} lines, {_format_size(file_path.stat().st_size)})\n\n" + content[:50000]
            except UnicodeDecodeError:
                return f"Cannot display as text. Use mode='hex' for binary files."

        elif params.mode == FileViewerMode.HEX:
            with open(file_path, "rb") as f:
                f.seek(params.offset)
                data = f.read(params.length)

            lines = [f"# Hex View: {file_path.name}", f"Offset: {params.offset}, Length: {len(data)} bytes", ""]
            lines.append("```")
            for i in range(0, len(data), 16):
                chunk = data[i:i + 16]
                hex_part = " ".join(f"{b:02x}" for b in chunk)
                ascii_part = "".join(chr(b) if 32 <= b < 127 else "." for b in chunk)
                lines.append(f"{params.offset + i:08x}  {hex_part:<48}  |{ascii_part}|")
            lines.append("```")
            return "\n".join(lines)

        elif params.mode == FileViewerMode.BINARY:
            with open(file_path, "rb") as f:
                f.seek(params.offset)
                data = f.read(params.length)

            # Detect magic bytes
            magic = data[:8] if len(data) >= 8 else data
            file_type = "Unknown binary"
            if magic[:4] == b"\x89PNG":
                file_type = "PNG Image"
            elif magic[:3] == b"\xff\xd8\xff":
                file_type = "JPEG Image"
            elif magic[:4] == b"GIF8":
                file_type = "GIF Image"
            elif magic[:4] == b"%PDF":
                file_type = "PDF Document"
            elif magic[:2] == b"PK":
                file_type = "ZIP Archive / Office Document"
            elif magic[:7] == b"\xfd7zXZ\x00":
                file_type = "XZ Archive"
            elif magic[:6] == b"Rar!\x1a\x07":
                file_type = "RAR Archive"
            elif magic[:2] == b"\x1f\x8b":
                file_type = "Gzip Archive"
            elif magic[:3] == b"ID3" or magic[:2] == b"\xff\xfb":
                file_type = "MP3 Audio"
            elif magic[:4] == b"fLaC":
                file_type = "FLAC Audio"
            elif magic[4:8] == b"ftyp":
                file_type = "MP4/M4A/MOV"
            elif magic[:4] == b"RIFF":
                file_type = "WAV/AVI (RIFF)"

            return (
                f"# Binary Info: {file_path.name}\n\n"
                f"- **Detected type**: {file_type}\n"
                f"- **Size**: {_format_size(file_path.stat().st_size)}\n"
                f"- **Magic bytes**: {' '.join(f'{b:02x}' for b in magic)}\n"
            )

        elif params.mode == FileViewerMode.IMAGE_INFO:
            st = file_path.stat()
            result = subprocess.run(
                ["sips", "-g", "all", str(file_path)],
                capture_output=True, text=True, timeout=5
            )
            return f"# Image Info: {file_path.name}\n\n```\n{result.stdout}\n```" if result.returncode == 0 else f"Not an image or sips unavailable. Size: {_format_size(st.st_size)}"

    except Exception as e:
        return _handle_error(e)

# ─── 6. FILE WRITING ────────────────────────────────────────────────────────

@mcp.tool(
    name="co1_write_file",
    annotations={"title": "Write File", "readOnlyHint": False, "destructiveHint": True, "idempotentHint": True, "openWorldHint": False},
)
async def co1_write_file(params: WriteFileInput) -> str:
    """Write content to a file. Creates parent directories if needed.

    Args:
        params: WriteFileInput with path, content, encoding, create_parents, overwrite

    Returns:
        str: Confirmation with file path and size
    """
    try:
        file_path = _validate_path(params.path)
        if file_path.exists() and not params.overwrite:
            return f"Error: File exists at '{file_path}'. Set overwrite=True to replace."
        if params.create_parents:
            file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(params.content, encoding=params.encoding)
        return f"✅ Written {_format_size(file_path.stat().st_size)} to `{file_path}`"
    except Exception as e:
        return _handle_error(e)

# ─── 7. COPY (F5) ───────────────────────────────────────────────────────────

@mcp.tool(
    name="co1_copy",
    annotations={"title": "Copy (F5)", "readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": False},
)
async def co1_copy(params: CopyMoveInput) -> str:
    """Copy files or directories (Commander One F5). Preserves metadata by default.

    Args:
        params: CopyMoveInput with source, destination, overwrite, preserve_metadata

    Returns:
        str: Confirmation
    """
    try:
        # Resolve item references like '#3'
        src_path = params.source
        if src_path.startswith("#"):
            num = int(src_path[1:])
            if num in _item_registry:
                src_path = _item_registry[num]["path"]
            else:
                return f"Error: Item #{num} not in registry."

        src = _validate_path(src_path)
        dst = Path(params.destination).expanduser().resolve()

        if not src.exists():
            return f"Error: Source '{src_path}' does not exist."
        if dst.exists() and not params.overwrite:
            return f"Error: Destination exists. Set overwrite=True."

        if src.is_dir():
            if dst.exists() and params.overwrite:
                shutil.rmtree(dst)
            copy_fn = shutil.copytree
            copy_fn(src, dst)
            return f"✅ Copied directory `{src}` → `{dst}`"
        else:
            dst.parent.mkdir(parents=True, exist_ok=True)
            if params.preserve_metadata:
                shutil.copy2(src, dst)
            else:
                shutil.copy(src, dst)
            return f"✅ Copied `{src}` → `{dst}` ({_format_size(dst.stat().st_size)})"

    except Exception as e:
        return _handle_error(e)

# ─── 8. MOVE / RENAME ───────────────────────────────────────────────────────

@mcp.tool(
    name="co1_move",
    annotations={"title": "Move/Rename", "readOnlyHint": False, "destructiveHint": True, "idempotentHint": False, "openWorldHint": False},
)
async def co1_move(params: CopyMoveInput) -> str:
    """Move or rename a file/directory. Default drag behavior in Commander One.

    Args:
        params: CopyMoveInput with source, destination, overwrite

    Returns:
        str: Confirmation
    """
    try:
        src_path = params.source
        if src_path.startswith("#"):
            num = int(src_path[1:])
            if num in _item_registry:
                src_path = _item_registry[num]["path"]
            else:
                return f"Error: Item #{num} not in registry."

        src = _validate_path(src_path)
        dst = Path(params.destination).expanduser().resolve()

        if not src.exists():
            return f"Error: Source does not exist."
        if dst.exists() and not params.overwrite:
            return f"Error: Destination exists. Set overwrite=True."

        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(dst))
        return f"✅ Moved `{src}` → `{dst}`"

    except Exception as e:
        return _handle_error(e)

# ─── 9. DELETE ───────────────────────────────────────────────────────────────

@mcp.tool(
    name="co1_delete",
    annotations={"title": "Delete", "readOnlyHint": False, "destructiveHint": True, "idempotentHint": False, "openWorldHint": False},
)
async def co1_delete(params: DeleteInput) -> str:
    """Delete files/directories. Defaults to dry_run=True for safety preview.

    Args:
        params: DeleteInput with path, recursive, dry_run, secure_delete

    Returns:
        str: Deletion result or dry-run preview
    """
    try:
        path_str = params.path
        if path_str.startswith("#"):
            num = int(path_str[1:])
            if num in _item_registry:
                path_str = _item_registry[num]["path"]
            else:
                return f"Error: Item #{num} not in registry."

        target = _validate_path(path_str)
        if not target.exists():
            return f"Error: '{path_str}' does not exist."

        if params.dry_run:
            if target.is_dir():
                items = list(target.rglob("*"))
                files = [i for i in items if i.is_file()]
                total = sum(f.stat().st_size for f in files)
                return (
                    f"🔍 DRY RUN — Would delete `{target}`:\n"
                    f"  {len(files)} files, {len([i for i in items if i.is_dir()])} subdirs\n"
                    f"  Total: {_format_size(total)}\n"
                    f"  Set dry_run=False and recursive=True to proceed."
                )
            else:
                return f"🔍 DRY RUN — Would delete `{target}` ({_format_size(target.stat().st_size)}). Set dry_run=False."

        if params.secure_delete and target.is_file():
            size = target.stat().st_size
            with open(target, "wb") as f:
                f.write(os.urandom(size))
                f.flush()
                os.fsync(f.fileno())

        if target.is_dir():
            if not params.recursive:
                try:
                    target.rmdir()
                except OSError:
                    return "Error: Directory not empty. Set recursive=True."
            else:
                shutil.rmtree(target)
            return f"✅ Deleted directory `{target}`"
        else:
            target.unlink()
            return f"✅ Deleted `{target}`"

    except Exception as e:
        return _handle_error(e)

# ─── 10. BATCH RENAME ───────────────────────────────────────────────────────

@mcp.tool(
    name="co1_batch_rename",
    annotations={"title": "Batch Rename", "readOnlyHint": False, "destructiveHint": True, "idempotentHint": False, "openWorldHint": False},
)
async def co1_batch_rename(params: BatchRenameInput) -> str:
    """Batch rename files using patterns and sequences (Commander One feature).

    Supports glob patterns, regex, and template variables:
    {n} = sequence number, {name} = original name (no ext), {ext} = extension

    Args:
        params: BatchRenameInput with directory, pattern, replacement, use_regex, start_number, dry_run

    Returns:
        str: Rename preview or confirmation
    """
    try:
        dir_path = _validate_path(params.directory)
        if not dir_path.is_dir():
            return f"Error: '{params.directory}' is not a directory."

        matches = []
        for item in sorted(dir_path.iterdir()):
            if not item.is_file():
                continue
            if params.use_regex:
                if re.search(params.pattern, item.name):
                    matches.append(item)
            else:
                if fnmatch.fnmatch(item.name, params.pattern):
                    matches.append(item)

        if not matches:
            return f"No files matching '{params.pattern}' in `{dir_path}`"

        renames = []
        for i, item in enumerate(matches):
            stem = item.stem
            ext = item.suffix
            seq = params.start_number + i

            if params.use_regex:
                new_name = re.sub(params.pattern, params.replacement, item.name)
            else:
                new_name = params.replacement
                new_name = new_name.replace("{n}", str(seq))
                new_name = new_name.replace("{name}", stem)
                new_name = new_name.replace("{ext}", ext)

            renames.append((item, item.parent / new_name))

        lines = [f"# Batch Rename: {len(renames)} files", ""]
        lines.append("| # | From | To |")
        lines.append("|---|------|----|")
        for i, (old, new) in enumerate(renames, 1):
            lines.append(f"| {i} | `{old.name}` | `{new.name}` |")

        if params.dry_run:
            lines.insert(1, "**🔍 DRY RUN — Set dry_run=False to execute**")
            return "\n".join(lines)

        # Execute renames
        renamed = 0
        for old, new in renames:
            if new.exists():
                lines.append(f"\n⚠️ Skipped `{old.name}` — destination exists")
                continue
            old.rename(new)
            renamed += 1

        lines.append(f"\n✅ Renamed {renamed}/{len(renames)} files")
        return "\n".join(lines)

    except Exception as e:
        return _handle_error(e)

# ─── 11. SEARCH ─────────────────────────────────────────────────────────────

@mcp.tool(
    name="co1_search",
    annotations={"title": "Search Files", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
)
async def co1_search(params: SearchInput) -> str:
    """Multi-mode file search — filename glob, content search, regex, or Spotlight.

    Commander One's three search engines plus Spotlight integration, with support
    for filtering by extension, searching inside archives, and content matching.

    Args:
        params: SearchInput with root, query, mode, extensions, search_archives, etc.

    Returns:
        str: Search results with item metadata
    """
    try:
        root = _validate_path(params.root)
        if not root.is_dir():
            return f"Error: '{params.root}' is not a directory."

        # Spotlight mode — use mdfind
        if params.mode == SearchMode.SPOTLIGHT:
            cmd = ["mdfind", "-onlyin", str(root), params.query]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            paths = [p.strip() for p in result.stdout.strip().split("\n") if p.strip()][:params.max_results]

            if not paths:
                return f"Spotlight: No results for '{params.query}' in `{root}`"

            results = [_get_file_info(Path(p)) for p in paths if Path(p).exists()]
            results = _register_items(results)

            if params.response_format == ResponseFormat.JSON:
                return json.dumps({"mode": "spotlight", "count": len(results), "results": results}, indent=2)

            lines = [f"# Spotlight: '{params.query}'", f"**{len(results)} results**", ""]
            for r in results:
                icon = "📁" if r.get("type") == "directory" else "📄"
                lines.append(f"- **#{r['item_number']}** {icon} `{r['path']}` ({r.get('size_human', '')})")
            return "\n".join(lines)

        # Filesystem search
        results = []
        query = params.query if params.case_sensitive else params.query.lower()

        def _search_dir(current: Path, depth: int) -> None:
            if depth > params.max_depth or len(results) >= params.max_results:
                return
            try:
                for item in sorted(current.iterdir()):
                    if len(results) >= params.max_results:
                        break
                    if not params.include_hidden and item.name.startswith("."):
                        continue

                    # Extension filter
                    if params.extensions and item.is_file():
                        if item.suffix.lower() not in params.extensions:
                            if item.is_dir():
                                _search_dir(item, depth + 1)
                            continue

                    # Type filter
                    if params.file_type == "file" and not item.is_file():
                        if item.is_dir():
                            _search_dir(item, depth + 1)
                        continue
                    elif params.file_type == "directory" and not item.is_dir():
                        continue

                    name = item.name if params.case_sensitive else item.name.lower()
                    matched = False

                    if params.mode == SearchMode.FILENAME:
                        if "*" in params.query or "?" in params.query:
                            matched = fnmatch.fnmatch(name, query)
                        else:
                            matched = query in name

                    elif params.mode == SearchMode.REGEX:
                        flags = 0 if params.case_sensitive else re.IGNORECASE
                        matched = bool(re.search(params.query, item.name, flags))

                    elif params.mode == SearchMode.CONTENT:
                        if item.is_file() and item.stat().st_size < 5 * 1024 * 1024:
                            try:
                                text = item.read_text(encoding="utf-8", errors="ignore")
                                if not params.case_sensitive:
                                    text = text.lower()
                                matched = query in text
                            except (PermissionError, OSError):
                                pass

                    if matched:
                        results.append(_get_file_info(item))

                    if item.is_dir():
                        _search_dir(item, depth + 1)

                    # Search inside ZIP archives
                    if params.search_archives and item.suffix.lower() == ".zip" and item.is_file():
                        try:
                            with zipfile.ZipFile(item, "r") as zf:
                                for zi in zf.namelist():
                                    zi_name = zi if params.case_sensitive else zi.lower()
                                    if query in zi_name:
                                        results.append({
                                            "name": zi,
                                            "path": f"{item}!/{zi}",
                                            "type": "archived_file",
                                            "size": 0,
                                            "size_human": "—",
                                            "archive": str(item),
                                        })
                        except (zipfile.BadZipFile, PermissionError):
                            pass

            except PermissionError:
                pass

        _search_dir(root, 0)
        results = _register_items(results)

        if not results:
            return f"No results for '{params.query}' ({params.mode.value} mode) in `{root}`"

        if params.response_format == ResponseFormat.JSON:
            return json.dumps({"mode": params.mode.value, "query": params.query, "count": len(results), "results": results}, indent=2)

        lines = [f"# Search: '{params.query}' ({params.mode.value})", f"**{len(results)} results** in `{root}`", ""]
        for r in results:
            icon = "📁" if r.get("type") == "directory" else ("📦" if r.get("type") == "archived_file" else "📄")
            size = r.get("size_human", "")
            lines.append(f"- **#{r.get('item_number', '—')}** {icon} `{r['path']}` {size}")

        if len(results) >= params.max_results:
            lines.append(f"\n⚠️ Capped at {params.max_results}. Narrow search or increase max_results.")

        return "\n".join(lines)

    except Exception as e:
        return _handle_error(e)

# ─── 12. DIRECTORY TREE ─────────────────────────────────────────────────────

@mcp.tool(
    name="co1_tree",
    annotations={"title": "Directory Tree", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
)
async def co1_tree(params: TreeInput) -> str:
    """Visual directory tree display.

    Args:
        params: TreeInput with path, max_depth, show_hidden, show_size, dirs_only

    Returns:
        str: ASCII tree representation
    """
    try:
        root = _validate_path(params.path)
        if not root.is_dir():
            return f"Error: Not a directory."

        lines = [str(root)]
        fc, dc = 0, 0

        def _build(current: Path, prefix: str, depth: int) -> None:
            nonlocal fc, dc
            if depth > params.max_depth:
                return
            try:
                items = sorted(current.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
            except PermissionError:
                lines.append(f"{prefix}└── [Permission Denied]")
                return

            if not params.show_hidden:
                items = [i for i in items if not i.name.startswith(".")]
            if params.dirs_only:
                items = [i for i in items if i.is_dir()]

            for idx, item in enumerate(items):
                is_last = idx == len(items) - 1
                conn = "└── " if is_last else "├── "
                ext = "    " if is_last else "│   "
                display = item.name
                if item.is_dir():
                    display += "/"
                    dc += 1
                else:
                    fc += 1
                    if params.show_size:
                        try:
                            display += f"  ({_format_size(item.stat().st_size)})"
                        except (PermissionError, OSError):
                            pass
                lines.append(f"{prefix}{conn}{display}")
                if item.is_dir():
                    _build(item, prefix + ext, depth + 1)

        _build(root, "", 1)
        lines.append(f"\n{dc} directories, {fc} files")
        return "\n".join(lines)

    except Exception as e:
        return _handle_error(e)

# ─── 13. DISK USAGE ─────────────────────────────────────────────────────────

@mcp.tool(
    name="co1_disk_usage",
    annotations={"title": "Disk Usage", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
)
async def co1_disk_usage(params: DiskUsageInput) -> str:
    """Analyze disk usage — top space consumers and volume stats.

    Args:
        params: DiskUsageInput with path, top_n, include_hidden

    Returns:
        str: Disk usage breakdown
    """
    try:
        target = _validate_path(params.path)
        if not target.is_dir():
            return f"Error: Not a directory."

        usage = shutil.disk_usage(target)
        children = []
        for item in target.iterdir():
            if not params.include_hidden and item.name.startswith("."):
                continue
            try:
                if item.is_file():
                    children.append({"name": item.name, "size": item.stat().st_size, "type": "file"})
                elif item.is_dir():
                    total = sum(f.stat().st_size for f in item.rglob("*") if f.is_file())
                    children.append({"name": item.name + "/", "size": total, "type": "directory"})
            except (PermissionError, OSError):
                pass

        children.sort(key=lambda x: x["size"], reverse=True)
        top = children[:params.top_n]

        if params.response_format == ResponseFormat.JSON:
            return json.dumps({
                "path": str(target),
                "volume": {"total": usage.total, "used": usage.used, "free": usage.free},
                "top_items": [{"name": c["name"], "size": c["size"], "size_human": _format_size(c["size"]), "type": c["type"]} for c in top],
            }, indent=2)

        pct = usage.used * 100 // usage.total
        lines = [
            f"# Disk Usage: {target}", "",
            f"**Volume:** {_format_size(usage.total)} total, {_format_size(usage.used)} used ({pct}%), {_format_size(usage.free)} free", "",
            f"## Top {len(top)} by Size", "",
            "| # | Name | Size | Type |",
            "|---|------|------|------|",
        ]
        for i, c in enumerate(top, 1):
            lines.append(f"| {i} | {c['name']} | {_format_size(c['size'])} | {c['type']} |")
        return "\n".join(lines)

    except Exception as e:
        return _handle_error(e)

# ─── 14. ARCHIVE CREATE ─────────────────────────────────────────────────────

@mcp.tool(
    name="co1_archive_create",
    annotations={"title": "Create Archive", "readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": False},
)
async def co1_archive_create(params: ArchiveCreateInput) -> str:
    """Create ZIP, tar.gz, tar.bz2, or 7z archives. Supports all Commander One PRO formats.

    For 7z format, requires p7zip to be installed (brew install p7zip).

    Args:
        params: ArchiveCreateInput with source, output, format, password, compression_level

    Returns:
        str: Confirmation with archive path and size
    """
    try:
        src = _validate_path(params.source)
        out = Path(params.output).expanduser().resolve()
        if not src.exists():
            return f"Error: Source does not exist."
        out.parent.mkdir(parents=True, exist_ok=True)

        if params.format == ArchiveFormat.ZIP:
            with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=params.compression_level) as zf:
                if src.is_dir():
                    for f in src.rglob("*"):
                        if f.is_file():
                            zf.write(f, f.relative_to(src.parent))
                else:
                    zf.write(src, src.name)

        elif params.format in (ArchiveFormat.TAR_GZ, ArchiveFormat.TAR_BZ2):
            mode = "w:gz" if params.format == ArchiveFormat.TAR_GZ else "w:bz2"
            with tarfile.open(out, mode) as tf:
                tf.add(src, arcname=src.name)

        elif params.format == ArchiveFormat.SEVENZ:
            cmd = ["7z", "a", f"-mx={params.compression_level}", str(out), str(src)]
            if params.password:
                cmd.insert(3, f"-p{params.password}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                return f"Error: 7z failed — {result.stderr.strip()}. Install with: brew install p7zip"

        return f"✅ Archive created: `{out}` ({_format_size(out.stat().st_size)})"

    except Exception as e:
        return _handle_error(e)

# ─── 15. ARCHIVE EXTRACT ────────────────────────────────────────────────────

@mcp.tool(
    name="co1_archive_extract",
    annotations={"title": "Extract Archive", "readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": False},
)
async def co1_archive_extract(params: ArchiveExtractInput) -> str:
    """Extract ZIP, tar, RAR, and 7z archives. Auto-detects format.

    RAR requires `unrar` (brew install unrar). 7z requires `p7zip`.

    Args:
        params: ArchiveExtractInput with archive, destination, password

    Returns:
        str: Extraction confirmation with file count
    """
    try:
        archive = _validate_path(params.archive)
        dest = Path(params.destination).expanduser().resolve()
        if not archive.is_file():
            return f"Error: Archive does not exist."
        dest.mkdir(parents=True, exist_ok=True)

        name = archive.name.lower()
        count = 0

        if name.endswith(".zip"):
            with zipfile.ZipFile(archive, "r") as zf:
                if params.password:
                    zf.setpassword(params.password.encode())
                count = len(zf.namelist())
                zf.extractall(dest)

        elif name.endswith((".tar.gz", ".tgz", ".tar.bz2", ".tar", ".tbz", ".tbz2")):
            with tarfile.open(archive, "r:*") as tf:
                count = len(tf.getnames())
                tf.extractall(dest, filter="data")

        elif name.endswith(".rar"):
            cmd = ["unrar", "x", "-y"]
            if params.password:
                cmd.append(f"-p{params.password}")
            cmd.extend([str(archive), str(dest) + "/"])
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                return f"Error: unrar failed — {result.stderr.strip()}. Install with: brew install unrar"
            count = result.stdout.count("Extracting")

        elif name.endswith(".7z"):
            cmd = ["7z", "x", f"-o{dest}", "-y"]
            if params.password:
                cmd.append(f"-p{params.password}")
            cmd.append(str(archive))
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                return f"Error: 7z failed — {result.stderr.strip()}. Install with: brew install p7zip"
            count = result.stdout.count("Extracting")

        else:
            return "Error: Unsupported format. Supported: .zip, .tar.gz, .tgz, .tar.bz2, .tar, .rar, .7z"

        return f"✅ Extracted {count} items from `{archive}` → `{dest}`"

    except Exception as e:
        return _handle_error(e)

# ─── 16. BROWSE ARCHIVE (without extracting) ────────────────────────────────

@mcp.tool(
    name="co1_archive_browse",
    annotations={"title": "Browse Archive", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
)
async def co1_archive_browse(params: ArchiveBrowseInput) -> str:
    """Browse archive contents like a folder (Commander One feature).

    List files inside ZIP and tar archives without extracting.

    Args:
        params: ArchiveBrowseInput with archive, internal_path

    Returns:
        str: Archive contents listing
    """
    try:
        archive = _validate_path(params.archive)
        if not archive.is_file():
            return f"Error: Archive does not exist."

        name = archive.name.lower()
        entries = []

        if name.endswith(".zip"):
            with zipfile.ZipFile(archive, "r") as zf:
                for info in zf.infolist():
                    if params.internal_path:
                        if not info.filename.startswith(params.internal_path):
                            continue
                    entries.append({
                        "name": info.filename,
                        "size": info.file_size,
                        "size_human": _format_size(info.file_size),
                        "compressed": _format_size(info.compress_size),
                        "type": "directory" if info.is_dir() else "file",
                        "modified": str(datetime(*info.date_time)) if info.date_time else "—",
                    })

        elif name.endswith((".tar.gz", ".tgz", ".tar.bz2", ".tar", ".tbz")):
            with tarfile.open(archive, "r:*") as tf:
                for member in tf.getmembers():
                    if params.internal_path and not member.name.startswith(params.internal_path):
                        continue
                    entries.append({
                        "name": member.name,
                        "size": member.size,
                        "size_human": _format_size(member.size),
                        "type": "directory" if member.isdir() else "file",
                        "modified": _format_ts(member.mtime),
                    })
        else:
            return "Error: Archive browsing supports ZIP and tar formats."

        if params.response_format == ResponseFormat.JSON:
            return json.dumps({"archive": str(archive), "count": len(entries), "entries": entries}, indent=2)

        lines = [f"# Archive: {archive.name}", f"**{len(entries)} entries**", ""]
        lines.append("| Type | Name | Size | Modified |")
        lines.append("|------|------|------|----------|")
        for e in entries:
            icon = "📁" if e["type"] == "directory" else "📄"
            lines.append(f"| {icon} | `{e['name']}` | {e.get('size_human', '—')} | {e.get('modified', '—')} |")
        return "\n".join(lines)

    except Exception as e:
        return _handle_error(e)

# ─── 17. TERMINAL (Ctrl+O) ──────────────────────────────────────────────────

@mcp.tool(
    name="co1_terminal",
    annotations={"title": "Terminal (Ctrl+O)", "readOnlyHint": False, "destructiveHint": True, "idempotentHint": False, "openWorldHint": True},
)
async def co1_terminal(params: TerminalInput) -> str:
    """Execute shell commands — Commander One's built-in terminal emulator.

    Runs commands in the specified working directory (defaults to the active pane).

    Args:
        params: TerminalInput with command, working_directory, timeout, shell

    Returns:
        str: Command output (stdout + stderr)
    """
    try:
        cwd = params.working_directory or _pane_state[_pane_state["active"]]
        cwd_path = _validate_path(cwd)

        result = subprocess.run(
            [params.shell, "-c", params.command],
            cwd=str(cwd_path),
            capture_output=True,
            text=True,
            timeout=params.timeout,
        )

        output = ""
        if result.stdout:
            output += result.stdout
        if result.stderr:
            output += f"\n--- stderr ---\n{result.stderr}"

        return (
            f"```\n$ {params.command}\n"
            f"[cwd: {cwd_path}] [exit: {result.returncode}]\n\n"
            f"{output.strip()}\n```"
        )

    except subprocess.TimeoutExpired:
        return f"Error: Command timed out after {params.timeout}s."
    except Exception as e:
        return _handle_error(e)

# ─── 18. PROCESS VIEWER ─────────────────────────────────────────────────────

@mcp.tool(
    name="co1_process_list",
    annotations={"title": "Process Viewer", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
)
async def co1_process_list(params: ProcessListInput) -> str:
    """List running processes — Commander One Process Viewer equivalent.

    Shows CPU, memory, PID, and process name. Filterable and sortable.

    Args:
        params: ProcessListInput with filter, sort_by, top_n

    Returns:
        str: Process table
    """
    try:
        result = subprocess.run(
            ["ps", "aux"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0:
            return f"Error: ps command failed."

        lines = result.stdout.strip().split("\n")
        header = lines[0]
        processes = []

        for line in lines[1:]:
            parts = line.split(None, 10)
            if len(parts) >= 11:
                proc = {
                    "user": parts[0],
                    "pid": int(parts[1]),
                    "cpu": float(parts[2]),
                    "memory": float(parts[3]),
                    "vsz": int(parts[4]),
                    "rss": int(parts[5]),
                    "name": parts[10],
                }

                if params.filter:
                    if params.filter.lower() not in proc["name"].lower():
                        continue

                processes.append(proc)

        sort_key = {"cpu": "cpu", "memory": "memory", "pid": "pid", "name": "name"}.get(params.sort_by, "cpu")
        processes.sort(key=lambda x: x.get(sort_key, 0), reverse=(sort_key in ("cpu", "memory")))
        processes = processes[:params.top_n]

        if params.response_format == ResponseFormat.JSON:
            return json.dumps({"count": len(processes), "processes": processes}, indent=2)

        out = [f"# Process Viewer", f"**{len(processes)} processes**" + (f" matching '{params.filter}'" if params.filter else ""), ""]
        out.append("| PID | CPU% | MEM% | User | Command |")
        out.append("|-----|------|------|------|---------|")
        for p in processes:
            cmd = p["name"][:60] + ("…" if len(p["name"]) > 60 else "")
            out.append(f"| {p['pid']} | {p['cpu']:.1f} | {p['memory']:.1f} | {p['user']} | `{cmd}` |")
        return "\n".join(out)

    except Exception as e:
        return _handle_error(e)


@mcp.tool(
    name="co1_process_kill",
    annotations={"title": "Kill Process", "readOnlyHint": False, "destructiveHint": True, "idempotentHint": False, "openWorldHint": False},
)
async def co1_process_kill(params: ProcessKillInput) -> str:
    """Kill a process by PID. Use force=True for SIGKILL.

    Args:
        params: ProcessKillInput with pid, force

    Returns:
        str: Confirmation
    """
    try:
        sig = signal.SIGKILL if params.force else signal.SIGTERM
        os.kill(params.pid, sig)
        return f"✅ Sent {'SIGKILL' if params.force else 'SIGTERM'} to PID {params.pid}"
    except ProcessLookupError:
        return f"Error: No process with PID {params.pid}."
    except PermissionError:
        return f"Error: Permission denied for PID {params.pid}. May need root."
    except Exception as e:
        return _handle_error(e)

# ─── 19. FILE INFO (Cmd+I) ──────────────────────────────────────────────────

@mcp.tool(
    name="co1_file_info",
    annotations={"title": "Get Info (Cmd+I)", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
)
async def co1_file_info(params: FileInfoInput) -> str:
    """Get detailed file/directory info — Commander One's Cmd+I equivalent.

    Args:
        params: FileInfoInput with path

    Returns:
        str: Detailed metadata
    """
    try:
        target = _validate_path(params.path)
        if not target.exists():
            return f"Error: Path does not exist."

        info = _get_file_info(target)
        if target.is_dir():
            try:
                items = list(target.iterdir())
                info["item_count"] = len(items)
                info["files"] = sum(1 for i in items if i.is_file())
                info["subdirectories"] = sum(1 for i in items if i.is_dir())
            except PermissionError:
                info["item_count"] = "Permission denied"

        # Extended attributes on macOS
        try:
            xattr_result = subprocess.run(
                ["xattr", "-l", str(target)],
                capture_output=True, text=True, timeout=5
            )
            if xattr_result.stdout.strip():
                info["extended_attributes"] = xattr_result.stdout.strip()[:500]
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass

        if params.response_format == ResponseFormat.JSON:
            return json.dumps(info, indent=2)

        lines = [f"# {info.get('name', '?')}", ""]
        for k, v in info.items():
            if k == "name":
                continue
            lines.append(f"- **{k}**: {v}")
        return "\n".join(lines)

    except Exception as e:
        return _handle_error(e)

# ─── 20. FILE HASH ──────────────────────────────────────────────────────────

@mcp.tool(
    name="co1_hash_file",
    annotations={"title": "File Checksum", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
)
async def co1_hash_file(params: HashFileInput) -> str:
    """Compute file hash/checksum (md5, sha1, sha256, sha512).

    Args:
        params: HashFileInput with path, algorithm

    Returns:
        str: Hash digest
    """
    try:
        file_path = _validate_path(params.path)
        if not file_path.is_file():
            return "Error: Not a file."
        algo = params.algorithm.lower()
        if algo not in ("md5", "sha1", "sha256", "sha512"):
            return "Error: Use md5, sha1, sha256, or sha512."
        h = hashlib.new(algo)
        with open(file_path, "rb") as f:
            while chunk := f.read(8192):
                h.update(chunk)
        return f"**{algo.upper()}**: `{h.hexdigest()}`\n**File**: `{file_path}`\n**Size**: {_format_size(file_path.stat().st_size)}"
    except Exception as e:
        return _handle_error(e)

# ─── 21. FIND DUPLICATES ────────────────────────────────────────────────────

@mcp.tool(
    name="co1_find_duplicates",
    annotations={"title": "Find Duplicates", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
)
async def co1_find_duplicates(params: FindDuplicatesInput) -> str:
    """Find duplicate files by SHA-256 content hash.

    Args:
        params: FindDuplicatesInput with path, min_size, max_depth

    Returns:
        str: Duplicate groups with wasted space calculation
    """
    try:
        root = _validate_path(params.path)
        if not root.is_dir():
            return "Error: Not a directory."

        size_groups: Dict[int, List[Path]] = {}
        for item in root.rglob("*"):
            try:
                depth = len(item.relative_to(root).parts)
            except ValueError:
                continue
            if depth > params.max_depth:
                continue
            if item.is_file() and not item.name.startswith("."):
                try:
                    sz = item.stat().st_size
                    if sz >= params.min_size:
                        size_groups.setdefault(sz, []).append(item)
                except (PermissionError, OSError):
                    pass

        hash_groups: Dict[str, List[Path]] = {}
        for sz, files in size_groups.items():
            if len(files) < 2:
                continue
            for f in files:
                try:
                    h = hashlib.sha256()
                    with open(f, "rb") as fh:
                        while chunk := fh.read(8192):
                            h.update(chunk)
                    hash_groups.setdefault(h.hexdigest(), []).append(f)
                except (PermissionError, OSError):
                    pass

        dupes = {k: v for k, v in hash_groups.items() if len(v) > 1}
        if not dupes:
            return f"No duplicates found in `{root}`"

        waste = 0
        lines = [f"# Duplicates in {root}", f"**{len(dupes)} groups**", ""]
        for h, files in dupes.items():
            sz = files[0].stat().st_size
            waste += sz * (len(files) - 1)
            lines.append(f"## {_format_size(sz)} × {len(files)} ({h[:12]}…)")
            for f in files:
                lines.append(f"  - `{f}`")
            lines.append("")
        lines.append(f"**Wasted: {_format_size(waste)}**")
        return "\n".join(lines)

    except Exception as e:
        return _handle_error(e)

# ─── 22. COMPARE ────────────────────────────────────────────────────────────

@mcp.tool(
    name="co1_compare",
    annotations={"title": "Compare Files/Dirs", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
)
async def co1_compare(params: CompareInput) -> str:
    """Compare two files or directories side-by-side.

    For files: compares size, dates, and optionally content.
    For directories: shows items only in left, only in right, and common.

    Args:
        params: CompareInput with left, right, content_compare

    Returns:
        str: Comparison results
    """
    try:
        left = _validate_path(params.left)
        right = _validate_path(params.right)

        if not left.exists():
            return f"Error: Left path does not exist."
        if not right.exists():
            return f"Error: Right path does not exist."

        if left.is_file() and right.is_file():
            li = _get_file_info(left)
            ri = _get_file_info(right)

            lines = ["# File Comparison", ""]
            lines.append("| Property | Left | Right |")
            lines.append("|----------|------|-------|")
            lines.append(f"| Name | `{li['name']}` | `{ri['name']}` |")
            lines.append(f"| Size | {li['size_human']} | {ri['size_human']} |")
            lines.append(f"| Modified | {li['modified']} | {ri['modified']} |")

            same_size = li["size"] == ri["size"]
            lines.append(f"| Same size? | {'✅ Yes' if same_size else '❌ No'} | |")

            if params.content_compare and same_size:
                lh = hashlib.sha256(left.read_bytes()).hexdigest()
                rh = hashlib.sha256(right.read_bytes()).hexdigest()
                identical = lh == rh
                lines.append(f"| Content identical? | {'✅ Yes' if identical else '❌ No'} | |")
                if not identical:
                    lines.append(f"| Left SHA-256 | `{lh[:24]}…` | |")
                    lines.append(f"| Right SHA-256 | `{rh[:24]}…` | |")

            return "\n".join(lines)

        elif left.is_dir() and right.is_dir():
            left_names = {i.name for i in left.iterdir()}
            right_names = {i.name for i in right.iterdir()}

            only_left = sorted(left_names - right_names)
            only_right = sorted(right_names - left_names)
            common = sorted(left_names & right_names)

            lines = [
                "# Directory Comparison", "",
                f"- **Left**: `{left}` ({len(left_names)} items)",
                f"- **Right**: `{right}` ({len(right_names)} items)", "",
                f"## Only in Left ({len(only_left)})",
            ]
            for n in only_left:
                lines.append(f"  - `{n}`")
            lines.extend(["", f"## Only in Right ({len(only_right)})"])
            for n in only_right:
                lines.append(f"  - `{n}`")
            lines.extend(["", f"## Common ({len(common)})"])
            for n in common[:50]:
                lines.append(f"  - `{n}`")
            if len(common) > 50:
                lines.append(f"  - …and {len(common) - 50} more")
            return "\n".join(lines)

        else:
            return "Error: Cannot compare a file with a directory."

    except Exception as e:
        return _handle_error(e)

# ─── 23. FAVORITES (Cmd+Ctrl+F) ─────────────────────────────────────────────

@mcp.tool(
    name="co1_favorites",
    annotations={"title": "Favorites", "readOnlyHint": False, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
)
async def co1_favorites(params: FavoritesInput) -> str:
    """Manage favorites/bookmarks — Commander One's Cmd+Ctrl+F equivalent.

    Args:
        params: FavoritesInput with action (add/remove/list), path, label

    Returns:
        str: Favorites list or confirmation
    """
    global _favorites

    if params.action == "add" and params.path:
        p = _validate_path(params.path)
        if not p.exists():
            return f"Error: Path does not exist."
        label = params.label or p.name
        _favorites.append({"label": label, "path": str(p)})
        return f"✅ Added favorite: **{label}** → `{p}`"

    elif params.action == "remove" and params.path:
        _favorites = [f for f in _favorites if f["path"] != str(Path(params.path).expanduser().resolve())]
        return f"✅ Removed favorite for `{params.path}`"

    elif params.action == "list":
        if not _favorites:
            return "No favorites set. Use action='add' to add one."
        lines = ["# Favorites", ""]
        for i, f in enumerate(_favorites, 1):
            lines.append(f"- **{i}**. {f['label']} → `{f['path']}`")
        return "\n".join(lines)

    return "Error: Invalid action. Use: add, remove, list"

# ─── 24. PERMISSIONS ────────────────────────────────────────────────────────

@mcp.tool(
    name="co1_permissions",
    annotations={"title": "Change Permissions", "readOnlyHint": False, "destructiveHint": True, "idempotentHint": True, "openWorldHint": False},
)
async def co1_permissions(params: PermissionsInput) -> str:
    """Change file/directory permissions and ownership.

    Args:
        params: PermissionsInput with path, mode, owner, group, recursive

    Returns:
        str: Confirmation
    """
    try:
        target = _validate_path(params.path)
        if not target.exists():
            return "Error: Path does not exist."

        results = []
        if params.mode:
            mode_int = int(params.mode, 8)
            if params.recursive and target.is_dir():
                for item in target.rglob("*"):
                    os.chmod(item, mode_int)
                os.chmod(target, mode_int)
            else:
                os.chmod(target, mode_int)
            results.append(f"Set mode {params.mode}")

        if params.owner or params.group:
            cmd = ["chown"]
            ownership = ""
            if params.owner:
                ownership = params.owner
            if params.group:
                ownership += f":{params.group}"
            if params.recursive:
                cmd.append("-R")
            cmd.extend([ownership, str(target)])
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                return f"Error: chown failed — {result.stderr.strip()}"
            results.append(f"Set ownership to {ownership}")

        return f"✅ `{target}`: {', '.join(results)}"

    except Exception as e:
        return _handle_error(e)

# ─── 25. MOUNTED VOLUMES ────────────────────────────────────────────────────

@mcp.tool(
    name="co1_mounted_volumes",
    annotations={"title": "Mounted Volumes", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
)
async def co1_mounted_volumes(params: MountInfoInput) -> str:
    """List all mounted volumes and network shares.

    Args:
        params: MountInfoInput with response_format

    Returns:
        str: Volume listing with mount points, types, and space info
    """
    try:
        result = subprocess.run(["df", "-h"], capture_output=True, text=True, timeout=10)
        if result.returncode != 0:
            return "Error: df command failed."

        lines_raw = result.stdout.strip().split("\n")

        if params.response_format == ResponseFormat.JSON:
            volumes = []
            for line in lines_raw[1:]:
                parts = line.split()
                if len(parts) >= 6:
                    volumes.append({
                        "filesystem": parts[0],
                        "size": parts[1],
                        "used": parts[2],
                        "available": parts[3],
                        "capacity": parts[4],
                        "mount_point": " ".join(parts[5:]),
                    })
            return json.dumps({"volumes": volumes}, indent=2)

        lines = ["# Mounted Volumes", "", "```", result.stdout.strip(), "```"]

        # Also show /Volumes
        volumes_path = Path("/Volumes")
        if volumes_path.is_dir():
            lines.extend(["", "## /Volumes"])
            for v in sorted(volumes_path.iterdir()):
                try:
                    usage = shutil.disk_usage(v)
                    lines.append(f"- **{v.name}**: {_format_size(usage.total)} total, {_format_size(usage.free)} free")
                except (PermissionError, OSError):
                    lines.append(f"- **{v.name}**: (not accessible)")

        return "\n".join(lines)

    except Exception as e:
        return _handle_error(e)

# ─── 26. SYSTEM INFO ────────────────────────────────────────────────────────

@mcp.tool(
    name="co1_system_info",
    annotations={"title": "System Info", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
)
async def co1_system_info(params: SystemInfoInput) -> str:
    """System information — OS, hardware, disk, Python environment.

    Args:
        params: SystemInfoInput with response_format

    Returns:
        str: System overview
    """
    try:
        info = {
            "hostname": platform.node(),
            "os": f"{platform.system()} {platform.release()}",
            "os_version": platform.mac_ver()[0] if platform.system() == "Darwin" else platform.version(),
            "architecture": platform.machine(),
            "processor": platform.processor(),
            "python": platform.python_version(),
            "home": str(Path.home()),
        }

        # CPU count
        info["cpu_count"] = os.cpu_count()

        # Memory via sysctl on macOS
        try:
            mem = subprocess.run(["sysctl", "-n", "hw.memsize"], capture_output=True, text=True, timeout=5)
            if mem.returncode == 0:
                info["memory"] = _format_size(int(mem.stdout.strip()))
        except (subprocess.TimeoutExpired, ValueError, FileNotFoundError):
            pass

        # Chip info on Apple Silicon
        try:
            chip = subprocess.run(["sysctl", "-n", "machdep.cpu.brand_string"], capture_output=True, text=True, timeout=5)
            if chip.returncode == 0:
                info["chip"] = chip.stdout.strip()
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass

        usage = shutil.disk_usage("/")
        info["disk_total"] = _format_size(usage.total)
        info["disk_used"] = _format_size(usage.used)
        info["disk_free"] = _format_size(usage.free)

        if params.response_format == ResponseFormat.JSON:
            return json.dumps(info, indent=2)

        lines = ["# System Info", ""]
        for k, v in info.items():
            lines.append(f"- **{k}**: {v}")
        return "\n".join(lines)

    except Exception as e:
        return _handle_error(e)

# ═══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    mcp.run()
