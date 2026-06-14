#!/usr/bin/env python3
"""Small SQLite API for n8n, Node-RED, iTerm.ai, and local dashboards."""

from __future__ import annotations

import argparse
import json
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


def ensure_db(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute(
        """
        create table if not exists events (
            id integer primary key autoincrement,
            source text not null,
            event_type text not null,
            payload text not null,
            created_at datetime default current_timestamp
        )
        """
    )
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
    return conn


class Handler(BaseHTTPRequestHandler):
    db_path: Path

    def json_response(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        conn = ensure_db(self.db_path)

        if parsed.path == "/health":
            self.json_response(200, {"ok": True})
            return

        if parsed.path == "/files":
            params = parse_qs(parsed.query)
            kind = params.get("kind", [None])[0]
            limit = min(int(params.get("limit", ["100"])[0]), 1000)
            if kind:
                rows = conn.execute(
                    "select path, source_root, kind, extension, size_bytes, mtime from files where kind = ? limit ?",
                    (kind, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    "select path, source_root, kind, extension, size_bytes, mtime from files limit ?",
                    (limit,),
                ).fetchall()
            self.json_response(200, {"files": [dict(zip(("path", "source_root", "kind", "extension", "size_bytes", "mtime"), row)) for row in rows]})
            return

        if parsed.path == "/summary":
            rows = conn.execute("select kind, count(*), coalesce(sum(size_bytes), 0) from files group by kind").fetchall()
            self.json_response(200, {"summary": [{"kind": row[0], "count": row[1], "size_bytes": row[2]} for row in rows]})
            return

        self.json_response(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        conn = ensure_db(self.db_path)

        if parsed.path == "/events":
            payload = self.read_json()
            source = str(payload.get("source", "unknown"))
            event_type = str(payload.get("event_type", "event"))
            conn.execute(
                "insert into events (source, event_type, payload) values (?, ?, ?)",
                (source, event_type, json.dumps(payload)),
            )
            conn.commit()
            self.json_response(201, {"ok": True})
            return

        self.json_response(404, {"error": "not found"})


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", required=True, help="SQLite database path")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args()

    Handler.db_path = Path(args.db)
    ensure_db(Handler.db_path).close()
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"master library API: http://{args.host}:{args.port}")
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
