#!/usr/bin/env python3
"""
turbo_plugin_heist.py
The Great Plugin Heist.
Consolidates Audio Plugins & Installers from multiple sources to the Vault.
"""
import os
import sys
import shutil
from pathlib import Path

# Configuration
TARGET_EXTENSIONS = {
    # Binaries
    ".vst", ".vst3", ".component", ".aaxplugin",
    # Installers/Archives
    ".dmg", ".pkg", ".iso", ".zip", ".rar", ".7z"
}

LOCAL_PLUGIN_VAULT = Path.home() / "NOIZY_AI" / "_MEDIA_VAULT" / "NOIZYLAB_LIBRARIES" / "_PLUGINS"


def resolve_media_drive() -> Path | None:
    """Resolve active media drive without depending on the legacy rp@fishmusicinc.com mount."""
    env_path = os.environ.get("NOIZY_MEDIA_DRIVE")
    if env_path:
        candidate = Path(os.path.expanduser(env_path))
        if candidate.exists():
            return candidate
        print(f"⚠️  NOIZY_MEDIA_DRIVE is set but missing: {candidate}")

    candidates = [
        Path.home() / "Library/CloudStorage/GoogleDrive-rsplowman@icloud.com/My Drive",
        Path.home() / "Library/CloudStorage/GoogleDrive-rsp@fishmusicinc.com/My Drive",
        Path.home() / "Library/CloudStorage/GoogleDrive-rsp@noizy.ai/My Drive",
    ]

    if os.environ.get("NOIZY_ALLOW_LEGACY_RP_DRIVE") == "1":
        candidates.append(Path.home() / "Library/CloudStorage/GoogleDrive-rp@fishmusicinc.com/My Drive")

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return None


def resolve_vault_root() -> Path:
    drive = resolve_media_drive()
    if drive:
        return drive / "NOIZYLAB_LIBRARIES" / "_PLUGINS"
    print("⚠️  No active cloud media drive found. Using local plugin vault.")
    print("   Set NOIZY_MEDIA_DRIVE to override.")
    print("   Legacy rp@fishmusicinc.com mount is ignored unless NOIZY_ALLOW_LEGACY_RP_DRIVE=1.")
    return LOCAL_PLUGIN_VAULT


# The Vault (Destination)
VAULT_ROOT = resolve_vault_root()


def scan_for_loot(source_roots):
    print("🕵️‍♂️  SCOUTING FOR LOOT (PLUGINS)...")
    loot = []
    
    for root_dir in source_roots:
        root_path = Path(root_dir)
        if not root_path.exists():
            print(f"   ⚠️  Skipping missing source: {root_path}")
            continue
            
        print(f"   scanning: {root_path}")
        
        # We walk only searching for target directories or files
        for path in root_path.rglob("*"):
            if path.is_file() and path.suffix.lower() in TARGET_EXTENSIONS:
                # Basic heuristic: if path contains 'Plugin' or 'VST' or 'Audio' or 'Installer'
                # OR if we are explicitly scanning a "Plugins" folder (handled by caller passing specific roots)
                loot.append(path)
                
    print(f"💎 FOUND {len(loot)} POTENTIAL ASSETS.")
    return loot


def execute_heist(loot):
    if not loot:
        print("🤷 No loot found.")
        return

    print(f"🏦 OPENING VAULT: {VAULT_ROOT}")
    VAULT_ROOT.mkdir(parents=True, exist_ok=True)
    
    count = 0
    size_mb = 0
    
    for item in loot:
        # Organize by Extension or Keep Structure?
        # Let's flatten slightly: Vault / [Extension] / [Filename]
        # Or better: Vault / [ParentFolder] / [Filename] to keep context
        
        # Strategy: Use parent dir name as category if meaningful, else "Misc"
        category = item.parent.name
        
        # Destination
        dest = VAULT_ROOT / category / item.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        
        if not dest.exists() or dest.stat().st_size != item.stat().st_size:
            print(f"   💰 SECURING: {item.name}...")
            try:
                shutil.copy2(item, dest)
                count += 1
                size_mb += item.stat().st_size / (1024 * 1024)
            except Exception as e:
                print(f"   ❌ DROP FAILED {item.name}: {e}")
        else:
            # print(f"   ✅ {item.name} IS SECURE.")
            pass

    print("-" * 40)
    print(f"🏆 HEIST COMPLETE.")
    print(f"   Items Secured: {count}")
    print(f"   Total Value: {size_mb:.1f} MB")
    print("-" * 40)


def main():
    # Candidates for source scanning
    # We expect arguments or defaults
    
    sources = []
    if len(sys.argv) > 1:
        sources = sys.argv[1:]
    else:
        # Default Auto-Scan locations based on current identity map.
        # Override cloud storage with NOIZY_MEDIA_DRIVE when needed.
        base_fish = str(resolve_media_drive() or LOCAL_PLUGIN_VAULT.parent)
        base_rsp = os.path.expanduser("~/Library/CloudStorage/GoogleDrive-rsplowman@icloud.com/My Drive")
        sources = [base_fish, base_rsp]

    print("==========================================")
    print("⚡ TURBO PLUGIN HEIST v1.0")
    print("==========================================")
    
    loot = scan_for_loot(sources)
    execute_heist(loot)

if __name__ == "__main__":
    main()

