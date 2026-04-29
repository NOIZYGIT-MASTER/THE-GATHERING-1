# ENGR — Audit cadence

**Purpose:** name which audits run, on what schedule, against which
targets, and where the output lands. Without a cadence, audits become
one-time heroics. With a cadence, the mesh notices drift before drift
becomes damage.

## Cadence table

| Audit                        | Frequency | Target                         | Script                                | Output                                             | Reviewer      |
|------------------------------|-----------|--------------------------------|---------------------------------------|----------------------------------------------------|---------------|
| Workspace move-off           | Monthly   | `/CLAUDE TODAY/` on M2 Ultra   | (manual + `du -sh`)                   | `agents/engr/audits/M2-ULTRA-MOVE-OFF-<date>.md`   | Architect, Pops |
| Mickey P read-only audit     | Quarterly | Mickey P, both users           | `agents/engr/scripts/mickey-p-audit.sh` | `agents/engr/audits/mickey-p/<date>/`              | Architect     |
| Mesh reachability probe      | Weekly    | Every mesh node                | `agents/engr/scripts/mesh-probe.sh`   | stdout log, filed by Keith as `scans/<date>-mesh.md` | Keith         |
| 6-risk scan                  | Per deploy| The changeset being deployed   | Keith reads the diff                  | `agents/keith/scans/<date>-<scope>.md`             | Architect     |
| Key rotation check           | Weekly    | Every manifest in `engr-keys/` | (manual: `last_rotated` > cadence?)   | `agents/engr/audits/keys/<date>.md`                | Pops          |
| Memory-sealed integrity       | Monthly   | Every entry in `memory-sealed/`| (sha256 recompute + compare)          | `agents/engr/audits/sealed/<date>.md`              | Pops          |
| Event-log sanity              | Weekly    | `events` table (D1)            | SQL: orphan writes, missing kinds     | `agents/engr/audits/events/<date>.md`              | Keith         |
| Voice-pipeline retention     | Weekly    | Device-local audio buffers     | (each device reports via event row)   | `agents/engr/audits/retention/<date>.md`           | Architect     |
| Dependency CVE scan          | Weekly    | `package.json` in heaven/ landing/ | `npm audit` + `pip-audit`         | `agents/keith/scans/<date>-deps.md`                | Keith         |
| Charter drift review         | Quarterly | `00-MASTER-CHARTER.md` vs. reality | (manual reading pass)             | Heaven steering note in `events`                   | Heaven        |

## Reading the table

- **Per deploy** audits block the deploy until CLEAR.
- **Weekly** audits should land every Monday. A missed week is a
  yellow flag; a missed month is a red flag and escalates to Pops.
- **Monthly** audits should land within the first five calendar days of
  the month.
- **Quarterly** audits land within the first two weeks of Jan / Apr /
  Jul / Oct.

## What counts as a pass

An audit passes when its output file exists, is dated within the
cadence window, names the target, and ends with an explicit verdict
line. The verdict line is one of:

- `VERDICT: clean` — no action needed.
- `VERDICT: advisory — <one-line summary>` — items to watch; no action forced.
- `VERDICT: action required — <one-line summary>` — concrete work to do.
- `VERDICT: halt — <one-line summary>` — stop deploys or writes until resolved.

No verdict line = the audit didn't happen.

## What counts as a fail

Any of these is a fail, regardless of the verdict:

- Missed cadence window by more than one period.
- Output file present but empty, or lacks the verdict line.
- Audit run by a different agent than named, without architect
  approval.
- Audit script run with `--skip` or similar flags.

Fails get an event row: `kind = 'audit_fail'`, with the audit id, the
cadence, and the reason.

## Rotation of responsibility

ENGR owns running the audits. Keith owns reading the output of the
code-facing audits (6-risk, dependency, event-log). Pops owns reviewing
anything that touches identity (keys, sealed, charter). Heaven owns
reviewing anything with a multi-year horizon (charter drift).

The architect reviews every audit output that is marked **action
required** or **halt**.

## Non-negotiables

- No audit modifies the system it audits. Audits are read-only.
- No audit output is deleted. Superseded audits remain, dated, in the
  same directory.
- No cadence is silently relaxed. A cadence change is a charter edit,
  which requires architect consent and a 7-day cooling-off per the
  Pops veto protocol on charter amendments.
- An audit is not "done" until its output file is committed.
