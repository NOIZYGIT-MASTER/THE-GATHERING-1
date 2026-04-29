# M2 ULTRA — move-off audit

**Architect:** Robert Stephen Plowman
**Date:** 2026-04-15
**Owner:** ENGR
**Scope:** `/CLAUDE TODAY/` workspace on the M2 Ultra

## Headline

Workspace currently holds **8.9 GB**. Approximately **8.0 GB of that is recoverable** — duplicate installers, re-installable dependency trees, and installers whose target apps are already installed.

## Tier 1 — SAFE TO DELETE (duplicates and reinstallable)

Total: **~3.8 GB**. None of these are original work.

### Duplicate installers (identical content, different filenames)

| Size   | Path                                                                   | Reason                                                  |
|--------|------------------------------------------------------------------------|---------------------------------------------------------|
| 2.7 GB | `_TOSORTOUT/Microsoft_365_and_Office_16.107.26040410_Installer (1).pkg` | Identical twin of the `...Installer.pkg` in same folder |
| 269 MB | `_TOSORTOUT/Claude.dmg`                                                | Older copy of the 271 MB `Claude.dmg` at workspace root |
| 131 MB | `./OpenJDK25U-jdk_aarch64_mac_hotspot_25.0.2_10 (1).pkg`               | Duplicate of the non-`(1)` copy beside it               |
| 16 KB  | `_TOSORTOUT/files (1).zip` through `files (4).zip`                     | Incremental duplicate drops                             |

### Re-installable dependency trees (node_modules)

| Size   | Path                                          | Reason                                                    |
|--------|-----------------------------------------------|-----------------------------------------------------------|
| 514 MB | `heaven/node_modules/`                        | Restore with `npm install` in `heaven/`                   |
| 266 MB | `landing/node_modules/`                       | Restore with `npm install` in `landing/`                  |
| 167 MB | `_TOSORTOUT/HEAVEN_DEPLOY/node_modules/`      | HEAVEN_DEPLOY is superseded by `heaven/`; see Tier 2      |

### Commands

```bash
cd "/CLAUDE TODAY"

# Safe deletes — duplicates
rm "_TOSORTOUT/Microsoft_365_and_Office_16.107.26040410_Installer (1).pkg"
rm "_TOSORTOUT/Claude.dmg"
rm "./OpenJDK25U-jdk_aarch64_mac_hotspot_25.0.2_10 (1).pkg"
rm _TOSORTOUT/files\ \(1\).zip _TOSORTOUT/files\ \(2\).zip _TOSORTOUT/files\ \(3\).zip _TOSORTOUT/files\ \(4\).zip

# Safe deletes — node_modules (trivially restorable)
rm -rf heaven/node_modules
rm -rf landing/node_modules
rm -rf _TOSORTOUT/HEAVEN_DEPLOY/node_modules
```

**Pops review before any `rm -rf`.**

## Tier 2 — MOVE TO EXTERNAL / COLD STORAGE

Total: **~4.3 GB**. These are installers whose apps are already installed (or easy to re-download). They belong on an external drive or in an R2 bucket, not in the primary workspace.

| Size   | Path                                                                 | Notes                                                     |
|--------|----------------------------------------------------------------------|-----------------------------------------------------------|
| 2.7 GB | `_TOSORTOUT/Microsoft_365_and_Office_16.107.26040410_Installer.pkg`  | Huge. Microsoft redistributes this on demand.             |
| 307 MB | `_TOSORTOUT/sourcery-1.43.0.zip`                                     | Sourcery installer                                         |
| 307 MB | `_TOSORTOUT/Postman.app`                                             | **Full app bundle in workspace — belongs in `/Applications`.** Move it there, not to cold storage. |
| 271 MB | `./Claude.dmg`                                                       | Keep only if you need offline reinstall.                   |
| 210 MB | `_TOSORTOUT/Linear-1.29.5-universal.dmg`                             | Linear installer.                                          |
| 197 MB | `_TOSORTOUT/installGitKraken.dmg`                                    | GitKraken installer.                                       |
| 187 MB | `_TOSORTOUT/Antigravity.dmg`                                         | Confirm what this is before deleting.                      |
| 185 MB | `./Codex.dmg`                                                        | Installer.                                                 |
| 131 MB | `./OpenJDK25U-jdk_aarch64_mac_hotspot_25.0.2_10.pkg`                 | JDK installer.                                             |
| 118 MB | `_TOSORTOUT/Postman for macOS (arm64).zip`                           | Second Postman artifact.                                   |
| 167 MB | `_TOSORTOUT/HEAVEN_DEPLOY/`                                          | Older heaven deploy. Source superseded by `heaven/`.       |
| 87 MB  | `./node-v24.14.1.pkg`                                                | Node installer.                                            |
| 41 MB  | `_TOSORTOUT/chromeremotedesktop.dmg`                                 | Chrome Remote Desktop installer.                           |
| 30 MB  | `_TOSORTOUT/eim.app`                                                 | Another app bundle in workspace.                           |

### Proposed moves

```bash
# First, MOVE Postman.app and eim.app to /Applications where apps belong:
mv "_TOSORTOUT/Postman.app" /Applications/
mv "_TOSORTOUT/eim.app"     /Applications/

# Then stage installers for external drive (adjust destination):
mkdir -p /Volumes/EXTERNAL/installers-archive-2026-04/
mv ./Claude.dmg ./Codex.dmg ./node-v24.14.1.pkg \
   ./OpenJDK25U-jdk_aarch64_mac_hotspot_25.0.2_10.pkg \
   _TOSORTOUT/*.dmg _TOSORTOUT/*.pkg _TOSORTOUT/*.zip \
   /Volumes/EXTERNAL/installers-archive-2026-04/
```

## Tier 3 — REVIEW BEFORE MOVE

Total: **~0.3 MB** (tiny in size, meaningful in intent).

| Path                            | Question                                                             |
|---------------------------------|----------------------------------------------------------------------|
| `_TOSORTOUT/JAN05_VOICEUPGRADE/` | Historical voice-stack upgrade notes. Archive or import into RSP-NOIZY? |
| `_TOSORTOUT/lucy-stack/`         | Older lucy staging. Superseded by `RSP-NOIZY/agents/lucy/`. Verify, then delete. |
| `_TOSORTOUT/NOIZY/`              | Unknown contents. Read before deciding.                                 |
| `_TOSORTOUT/FISH_FINDER/`        | Likely related to `04_NOIZYFISH/`. Check for overlap.                   |
| `_TOSORTOUT/HEAVEN_DEPLOY 2/`    | 56 KB stub of a duplicate. Probably safe to delete.                     |

## What NOT to touch

Leave these alone:

- Everything in `RSP-NOIZY/` (the master repo).
- `heaven/src/`, `heaven/tests/`, `heaven/migrations/` (code, not dependencies).
- `landing/src/`, `landing/out/` (code and build output).
- All numbered top-level project dirs (`00_COMMAND_CENTER/` through `16.SCREENSHOTS/`).
- `HEAVEN-2036-FUTURE-BACK.md` at the workspace root (imported into RSP-NOIZY, original is the canonical copy).
- `GABRIEL-RECORDING-PIPELINE.md`, `M2-ULTRA-100-REPORT.md`, all the `*.md` strategy docs at the root.

## Recovery ceiling

If all three tiers are actioned cleanly:

- Tier 1 (delete):  **~3.8 GB recovered**
- Tier 2 (move out): **~4.3 GB offloaded**
- Tier 3 (archive):  **~0.3 MB** (symbolic, not space)

**Workspace goes from 8.9 GB → under 1 GB.**

The M2 Ultra keeps its code, its master repo, its strategy docs, and loses the bloat.

## Non-negotiables for this pass

- No `rm` runs until Pops reviews this plan.
- Nothing in `memory-sealed/` (when it exists) is touched.
- No engr-keys manifest is moved.
- External drive destination is verified writable and has a current backup before `mv` operations.
- A tarball snapshot of `_TOSORTOUT/` is taken before any destructive action — cheap insurance.

## Next step

Architect reads this. Architect approves or edits. ENGR generates a confirmed-only script that runs Tier 1 interactively (asking y/n per item), Tier 2 with an explicit external-drive check, Tier 3 as a read pass only.
