# MEMORY-SEALED — Protocol

**Purpose:** a tamper-evident, append-only memory layer for material the
architect has chosen to preserve without modification. Sealed memory is
not a backup, not a log, not a cache. It is the unedited record.

## The three invariants

1. **Append-only.** Nothing in `memory-sealed/` is ever modified or
   deleted. A correction is a new entry that references the old one.
2. **Consent-gated.** Nothing enters `memory-sealed/` without an
   architect-signed consent event. Pops reviews every write.
3. **Hash-logged.** Every entry's SHA-256 is written to the
   `events` table at the moment of write, so later reads can verify
   the entry has not been altered.

## Directory layout

```
memory-sealed/
  PROTOCOL.md              # this file
  INDEX.md                 # human-readable index, append-only
  entries/
    <YYYY-MM-DD>-<slug>/
      content.<ext>        # the material itself
      manifest.yaml        # who / when / why / consent ref
      hash.txt             # SHA-256 of content.<ext>
```

## Entry manifest schema

```yaml
id:             <YYYY-MM-DD>-<slug>
recorded_by:    <agent>
recorded_at:    <ISO-8601 timestamp>
consent_event:  <event_id from the events table>
architect_sig:  <signature line from the consent event>
kind:           <transcript | decision | artifact | testimony | other>
title:          <short human-readable title>
source:         <where it came from — device, URL, file, utterance>
hash_algo:      sha256
hash:           <hex digest of content.<ext>>
supersedes:     <optional id of an earlier entry this corrects>
notes:          <freeform>
```

## Write procedure

1. Agent proposes the write by emitting an `events` row with
   `kind = 'seal_proposed'` and the candidate manifest.
2. Pops reviews. If approved, the architect signs with a second
   `events` row: `kind = 'seal_consent'` with the same entry id and
   a signature block.
3. The agent performs the write: creates the entry directory, writes
   `content.<ext>`, computes `sha256`, writes `hash.txt` and
   `manifest.yaml`.
4. The agent emits a third `events` row: `kind = 'seal_written'` with
   the recorded hash.
5. The agent appends one line to `INDEX.md` of the form:
   `<id> — <kind> — <title>`.

If any of the three events is missing, the entry is considered
unsealed and must be quarantined until the record is complete.

## Read procedure

1. Reader locates the entry in `INDEX.md`.
2. Reader recomputes `sha256(content.<ext>)` and compares to
   `hash.txt`. Mismatch = integrity violation, halt, alert Pops.
3. Reader may cite the entry by id in any other document. Citations
   are a read-only operation and do not touch the entry.

## Correction procedure

`memory-sealed/` does not permit edits. A correction is a new entry
whose `supersedes` field points to the original. Both entries remain
forever. Anyone reading the original sees, via the index, that a later
entry corrects it.

## Retention

Sealed entries have no expiry. The architect is the only person who can
authorize migration to a different storage substrate (e.g. cold-storage
R2, offline vault). Such a migration is itself a sealed event.

## Non-negotiables

- No agent writes to `memory-sealed/` without the three-event consent
  trail.
- No edits. Ever.
- No deletes. Ever.
- No silent reads that bypass the hash check.
- If the architect ever asks to forget something sealed, the answer is
  a new superseding entry, not a removal. The fact of the request is
  itself recorded.
