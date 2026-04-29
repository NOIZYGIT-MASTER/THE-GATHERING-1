# SESSION STATE — Schema

**Purpose:** one schema for what the mesh remembers about a session,
across three tiers: device-local (localStorage on PWAs), edge (D1 on
Cloudflare), and sealed (memory-sealed/ when the architect elevates
an item). Every agent reads and writes against this same shape.

## Tier 1 — Device-local (localStorage / native storage)

Ephemeral, per-device. Cleared when the device clears its site data.
Used for the immediate in-flight interaction only.

| Key                       | Type     | Meaning                                             |
|---------------------------|----------|-----------------------------------------------------|
| `lucy.device_id`          | string   | Stable uuid for this device. Written once at init.  |
| `lucy.session_id`         | string   | Current conversation id. Rotates on explicit new.   |
| `lucy.last_sync_at`       | ISO-8601 | Last time this device pulled from edge.             |
| `lucy.pending_events`     | array    | Event rows queued for upload while offline.         |
| `lucy.voice_state`        | string   | One of the states in voice-state-logic.             |
| `lucy.voice_buffer_id`    | string   | Id of the current capture, if any.                  |
| `lucy.consent_flags`      | object   | Per-surface consent booleans (mic, clipboard, etc). |
| `lucy.ui_prefs`           | object   | Rendering preferences only. Never logic.            |

**Rule:** nothing under `lucy.*` ever holds secrets or raw transcripts.
Transcripts are referenced by id, and the id resolves via D1.

## Tier 2 — Edge (Cloudflare D1)

Authoritative, durable, queryable. Every agent reads from here.

### `sessions`
```sql
id              TEXT PRIMARY KEY,   -- uuid
architect_id    TEXT NOT NULL,      -- 'rsp'
started_at      TEXT NOT NULL,      -- ISO-8601
ended_at        TEXT,               -- null if open
device_id       TEXT NOT NULL,
channel         TEXT NOT NULL,      -- 'voice' | 'chat' | 'mixed'
label           TEXT                -- freeform, architect-editable
```

### `messages`
```sql
id              TEXT PRIMARY KEY,
session_id      TEXT NOT NULL REFERENCES sessions(id),
role            TEXT NOT NULL,      -- 'architect' | 'agent'
agent           TEXT,               -- which agent, if role='agent'
created_at      TEXT NOT NULL,
kind            TEXT NOT NULL,      -- 'text' | 'voice_transcript' | 'tool_call'
payload         TEXT NOT NULL,      -- JSON-encoded body
parent_id       TEXT                -- for tool-call → tool-result links
```

### `device_status`
```sql
device_id       TEXT PRIMARY KEY,
last_seen_at    TEXT NOT NULL,
online          INTEGER NOT NULL,   -- 0 | 1
version         TEXT,               -- client build id
notes           TEXT
```

### `events`
```sql
id              TEXT PRIMARY KEY,
created_at      TEXT NOT NULL,
actor           TEXT NOT NULL,      -- which agent or device
kind            TEXT NOT NULL,      -- controlled vocabulary
session_id      TEXT,               -- if scoped to a session
ref_id          TEXT,               -- pointer into another table
payload         TEXT                -- JSON, optional
```

**Rule:** every mutation anywhere in the mesh writes an `events` row.
No silent writes.

## Tier 3 — Sealed (memory-sealed/)

Opt-in, append-only, hash-verified. See
[`../memory-sealed/PROTOCOL.md`](../memory-sealed/PROTOCOL.md).

Items elevate from Tier 2 to Tier 3 only with architect consent. The
elevation itself is a three-event trail: `seal_proposed` →
`seal_consent` → `seal_written`.

## Rehydration flow

When a device comes online:

1. Read `lucy.device_id` and `lucy.session_id` from local storage.
2. Call edge `GET /session/<session_id>?since=<last_sync_at>`.
3. Receive: updated session row, new messages, any events scoped to
   that session.
4. Merge into UI. Update `lucy.last_sync_at`.
5. Drain `lucy.pending_events` to the edge. Clear on 200 OK.
6. Resume the voice state machine from `lucy.voice_state`, unless the
   stored state is not `idle` — in which case the device transitions
   to `idle` and emits a `voice_state` event explaining the reset.

## Non-negotiables

- Device-local is never authoritative. If Tier 1 and Tier 2 disagree,
  Tier 2 wins and the device silently updates its local copy.
- Edge is never modified outside the published write paths (Workers +
  migrations). Ad-hoc edits are forbidden.
- Sealed is append-only. Tier 2 never overwrites Tier 3.
- Pops has veto authority on any schema migration that changes the
  meaning of a column, drops a column, or changes a retention policy.
