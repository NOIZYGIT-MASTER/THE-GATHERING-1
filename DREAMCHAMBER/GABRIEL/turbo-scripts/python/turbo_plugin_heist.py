#!/usr/bin/env python3
"""
turbo_plugin_heist.py
The Great Plugin Heist.
Consolidates Audio Plugins & Installers from multiple sources to the Vault.

Identity rule:
- Canonical FISHMUSICINC contact: rsp@fishmusicinc.com
- Legacy alias: rp@fishmusicinc.com (audit-only)
- Legacy GoogleDrive-rp@fishmusicinc.com mount is disabled unless NOIZY_ALLOW_LEGACY_RP_DRIVE=1
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import shutil
from pathlib import Path
from typing import Iterable, Optional

# Configuration
TARGET_EXTENSIONS = {
    ".vst", ".vst3", ".component", ".aaxplugin",
    ".dmg", ".pkg", ".iso", ".zip", ".rar", ".7z",
}

LOCAL_PLUGIN_VAULT = Path.home() / "NOIZY_AI" / "_MEDIA_VAULT" / "NOIZYLAB_LIBRARIES" / "_PLUGINS"
RECEIPT_FILE = Path(os.environ.get("NOIZY_RECEIPT_FILE", str(Path.home() / "NOIZY_AI" / "_RECEIPTS" / "plugin-heist.jsonl")))


def expand(path: str) -> Path:
    return Path(os.path.expanduser(path))


def media_drive_candidates() -> Iterable[Path]:
    env_path = os.environ.get("NOIZY_MEDIA_DRIVE")
    if env_path:
        yield expand(env_path)

    yield Path.home() / "Library/CloudStorage/GoogleDrive-rsplowman@icloud.com/My Drive"
    yield Path.home() / "Library/CloudStorage/GoogleDrive-rsp@fishmusicinc.com/My Drive"
    yield Path.home() / "Library/CloudStorage/GoogleDrive-rsp@noizy.ai/My Drive"
    yield Path.home() / "NOIZY_AI" / "_MEDIA_VAULT"

    if os.environ.get("NOIZY_ALLOW_LEGACY_RP_DRIVE") == "1":
        yield Path.home() / "Library/CloudStorage/GoogleDrive-rp@fishmusicinc.com/My Drive"


def resolve_media_drive(explicit: Optional[str] = None) -> Optional[Path]:
    if explicit:
        candidate = expand(explicit)
        if candidate.exists():
            return candidate
        print(f"⚠️  Explicit drive path missing: {candidate}")

    for candidate in media_drive_candidates():
        if candidate.exists():
            return candidate

    return None


def resolve_vault_root(explicit_drive: Optional[str] = None) -> Path:
    drive = resolve_media_drive(explicit_drive)
    if drive:
        return drive / "NOIZYLAB_LIBRARIES" / "_PLUGINS"
    print("⚠️  No active cloud media drive found. Using local plugin vault.")
    print("   Set NOIZY_MEDIA_DRIVE to override.")
    print("   Legacy rp@fishmusicinc.com mount is ignored unless NOIZY_ALLOW_LEGACY_RP_DRIVE=1.")
    return LOCAL_PLUGIN_VAULT


def emit_receipt(action: str, status: str, **extra: object) -> None:
    RECEIPT_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "tool": "turbo_plugin_heist.py",
        "action": action,
        "status": status,
        "canonical_contact": "rsp@fishmusicinc.com",
        "legacy_alias": "rp@fishmusicinc.com",
        "legacy_drive_enabled": os.environ.get("NOIZY_ALLOW_LEGACY_RP_DRIVE") == "1",
        **extra,
    }
    with RECEIPT_FILE.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload, ensure_ascii=False) + "\n")


def scan_for_loot(source_roots: list[str]) -> list[Path]:
    print("🕵️‍♂️  SCOUTING FOR LOOT (PLUGINS)...")
    loot: list[Path] = []

    for root_dir in source_roots:
        root_path = expand(root_dir)
        if not root_path.exists():
            print(f"   ⚠️  Skipping missing source: {root_path}")
            continue

        print(f"   scanning: {root_path}")
        for path in root_path.rglob("*"):
            if path.is_file() and path.suffix.lower() in TARGET_EXTENSIONS:
                loot.append(path)

    print(f"💎 FOUND {len(loot)} POTENTIAL ASSETS.")
    emit_receipt("scan", "ok", count=len(loot), sources=source_roots)
    return loot


def execute_heist(loot: list[Path], vault_root: Path, dry_run: bool = False) -> None:
    if not loot:
        print("🤷 No loot found.")
        emit_receipt("heist", "empty", destination=str(vault_root), dry_run=dry_run)
        return

    print(f"🏦 OPENING VAULT: {vault_root}")
    vault_root.mkdir(parents=True, exist_ok=True)

    count = 0
    size_mb = 0.0

    for item in loot:
        category = item.parent.name or "Misc"
        dest = vault_root / category / item.name
        dest.parent.mkdir(parents=True, exist_ok=True)

        if not dest.exists() or dest.stat().st_size != item.stat().st_size:
            print(f"   💰 SECURING: {item.name}...")
            try:
                if not dry_run:
                    shutil.copy2(item, dest)
                count += 1
                size_mb += item.stat().st_size / (1024 * 1024)
            except Exception as e:  # noqa: BLE001
                print(f"   ❌ DROP FAILED {item.name}: {e}")

    print("-" * 40)
    print("🏆 HEIST COMPLETE.")
    print(f"   Items Secured: {count}")
    print(f"   Total Value: {size_mb:.1f} MB")
    print("-" * 40)
    emit_receipt("heist", "ok", secured=count, total_mb=round(size_mb, 2), destination=str(vault_root), dry_run=dry_run)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="NOIZY plugin vault consolidator")
    parser.add_argument("sources", nargs="*", help="source roots to scan")
    parser.add_argument("--drive", help="explicit media drive path for this run")
    parser.add_argument("--vault", help="explicit plugin vault destination")
    parser.add_argument("--dry-run", action="store_true", help="show actions without copying")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    vault_root = expand(args.vault) if args.vault else resolve_vault_root(args.drive)

    if args.sources:
        sources = args.sources
    else:
        active_drive = resolve_media_drive(args.drive)
        sources = [str(active_drive)] if active_drive else []
        rsp_drive = Path.home() / "Library/CloudStorage/GoogleDrive-rsplowman@icloud.com/My Drive"
        if rsp_drive.exists() and str(rsp_drive) not in sources:
            sources.append(str(rsp_drive))
        if not sources:
            sources = [str(Path.home() / "NOIZY_AI" / "_MEDIA_VAULT")]

    print("==========================================")
    print("⚡ TURBO PLUGIN HEIST v1.1")
    print("==========================================")
    print("Canonical contact: rsp@fishmusicinc.com")
    print("Legacy alias: rp@fishmusicinc.com audit-only")
    print(f"Vault: {vault_root}")
    if args.dry_run:
        print("Mode: DRY RUN")

    loot = scan_for_loot(sources)
    execute_heist(loot, vault_root, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
