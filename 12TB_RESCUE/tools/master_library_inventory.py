#!/usr/bin/env python3
"""Create a SQLite inventory for source drives without copying files."""

from __future__ import annotations

import argparse
import os
import sqlite3
from pathlib import Path


AUDIO_EXTS = {
    ".wav", ".aif", ".aiff", ".mp3", ".flac", ".m4a", ".aac", ".ogg",
    ".opus", ".caf", ".bwf", ".wv", ".snd", ".sd2", ".au", ".amr",
    ".ac3", ".dts", ".mid", ".midi", ".nki", ".nkm", ".nkc", ".nkx",
    ".nks", ".nicnt", ".ncw", ".sf2", ".sfz", ".rex", ".rx2",
}

VIDEO_EXTS = {
    ".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm", ".wmv", ".mpg",
    ".mpeg", ".flv", ".3gp", ".mxf", ".mts", ".m2ts", ".vob", ".ogv",
}

CODE_EXTS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".sh", ".zsh",
    ".bash", ".ps1", ".json", ".jsonc", ".yaml", ".yml", ".toml", ".ini",
    ".cfg", ".md", ".html", ".css", ".scss", ".sql", ".dockerfile",
}

DOC_EXTS = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".pages",
    ".numbers", ".key", ".txt", ".rtf",
}

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", ".cache",
    ".Trash", ".Trashes", ".Spotlight-V100", ".fseventsd",
}


def classify(path: Path) -> str:
    suffix = path.suffix.lower()
    name = path.name
    if suffix in AUDIO_EXTS:
        return "audio"
    if suffix in VIDEO_EXTS:
        return "video"
    if suffix in CODE_EXTS or name in {"Makefile", "Dockerfile"}:
        return "code"
    if suffix in DOC_EXTS:
        return "doc"
    if suffix in {".dmg", ".pkg", ".iso", ".img", ".zip", ".rar", ".7z", ".tar", ".gz"}:
        return "archive_installer"
    return "other"


def connect(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute(
        """
        create table if not exists files (
            path text primary key,
            source_root text not null,
            kind text not null,
            extension text,
            size_bytes integer,
            mtime integer
        )
        """
    )
    conn.execute("create index if not exists idx_files_kind on files(kind)")
    conn.execute("create index if not exists idx_files_source on files(source_root)")
    return conn


def walk_source(conn: sqlite3.Connection, root: Path, limit: int | None) -> int:
    count = 0
    for current_root, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for filename in files:
            path = Path(current_root) / filename
            try:
                stat = path.stat()
            except OSError:
                continue
            conn.execute(
                """
                insert or replace into files
                    (path, source_root, kind, extension, size_bytes, mtime)
                values (?, ?, ?, ?, ?, ?)
                """,
                (
                    str(path),
                    str(root),
                    classify(path),
                    path.suffix.lower(),
                    stat.st_size,
                    int(stat.st_mtime),
                ),
            )
            count += 1
            if limit and count >= limit:
                return count
    return count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", required=True, help="SQLite database output path")
    parser.add_argument("--limit", type=int, help="Optional per-source file limit")
    parser.add_argument("sources", nargs="+", help="Source folders to inventory")
    args = parser.parse_args()

    conn = connect(Path(args.db))
    total = 0
    for source in args.sources:
        root = Path(source)
        if not root.exists():
            print(f"skip missing: {root}")
            continue
        print(f"scanning: {root}")
        total += walk_source(conn, root, args.limit)
        conn.commit()

    for kind, count in conn.execute("select kind, count(*) from files group by kind order by count(*) desc"):
        print(f"{kind}: {count}")
    print(f"total indexed: {total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
