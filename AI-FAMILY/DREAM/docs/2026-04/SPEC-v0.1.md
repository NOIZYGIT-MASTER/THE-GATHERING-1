# Gold Gateway Socket Protocol — Specification v0.1

**Status:** Draft for review
**Author of record:** Robert Stephen Plowman
**Co-architect:** Claude (Anthropic)
**Last updated:** 2026-04-16
**Scope:** Persistent bidirectional socket protocol between a Gold Gateway server and a client, with structured event emission, liveness monitoring, latency diagnostics, agent routing, and auditable consent scope.

---

## 1. Purpose

Gold Gateway is the transport layer between a client (human-facing UI or programmatic consumer) and one or more server-side agents. The protocol's job is to carry structured events with enough metadata that every delivered byte is ordered, timestamped, attributable to an agent, bounded by a consent scope, and recoverable after a transient disconnect.

This document defines v0.1 of the wire protocol. It is intentionally narrow: it specifies the contract, not the implementation. A reference TypeScript/WebSocket implementation follows in a separate artifact and is generated against the JSON Schema in Appendix A.

## 2. Design principles

1. **One envelope, many event types.** Every frame on the wire shares the same outer shape. Event-specific data lives in a typed `payload`.
2. **Server is the clock.** All timestamps are server-side UTC in ISO 8601 with millisecond precision. Client-side clocks are never authoritative.
3. **Heartbeat is liveness, latency is diagnostic.** They are separate events, measured separately, interpreted separately.
4. **Agent selection is explicit and auditable.** Every event carries the agent it was produced by, and every transition between agents is recorded on the wire.
5. **Resume, don't replay blindly.** Sequence numbers plus a bounded server-side replay buffer allow deterministic recovery from transient disconnects.
6. **Consent is structural, not cosmetic.** A consent scope is attached at session start, and every output event can be audited against it.
7. **Fail loud, retry honestly.** Error events carry both a machine code and a retry hint; clients are required to honor exponential backoff with jitter.

## 3. Transport

- Underlying transport: WebSocket (RFC 6455) over TLS 1.3.
- Subprotocol identifier: `gold-gateway.v0.1`.
- Frames: text frames carrying UTF-8 JSON that conforms to the envelope schema in §6.
- Binary frames are reserved for future use and MUST be ignored by v0.1 clients.
- Maximum envelope size: 1 MiB. Payloads larger than this MUST be chunked (see §10 on output framing).

## 4. Protocol versioning

Every session declares its protocol version in the `connected` event:

```json
"protocol_version": "0.1"
```

Clients MUST refuse to operate against a server whose major version does not match their own. Minor version drift is permitted and assumed forward-compatible.

## 5. Session lifecycle

```
[closed]
   │ client opens WebSocket
   ▼
[handshaking]
   │ client sends `hello` with auth + desired agent + consent scope
   ▼
[authenticating]
   │ server validates auth, agent authorization, consent scope
   ├── fail → `error` (fatal) → [closed]
   ▼
[connected]
   │ server emits `connected` with session_id, protocol_version, active_agent
   ▼
[active] ◀──┐
   │        │ heartbeat / latency / output / error (retryable) loop
   │        │
   │ client sends `switch_agent` (optional)
   │        │ server emits `agent_switching` then `agent_selected`
   ▼        │
[switching] ┘
   │
   │ client sends `bye` OR server emits `disconnected`
   ▼
[closed]
```

Transitions not listed above are protocol violations and MUST trigger a fatal `error` event followed by socket closure.

## 6. Event envelope

Every frame on the wire conforms to this envelope:

```json
{
  "type": "output",
  "protocol_version": "0.1",
  "event_id": "evt_01HW9Z4N7C0VG3XKQ2R5TJ8FBS",
  "session_id": "gw_8f3a",
  "sequence": 1842,
  "event_emitted_at": "2026-04-16T04:28:00.123Z",
  "server_received_at": "2026-04-16T04:28:00.118Z",
  "agent": "analysis",
  "consent_scope": "scope_analysis_readonly_v1",
  "payload": { "...": "event-specific" }
}
```

Field contract:

| Field | Required | Description |
|---|---|---|
| `type` | yes | One of the event types in §7. |
| `protocol_version` | yes on `connected`, optional thereafter | Semver string. |
| `event_id` | yes | ULID; globally unique, monotonic within a session. |
| `session_id` | yes after `connected` | Opaque server-generated session identifier. |
| `sequence` | yes after `connected` | Monotonic integer, starts at 1, never decreases. |
| `event_emitted_at` | yes | ISO 8601 UTC, millisecond precision, the instant the server emitted the event. |
| `server_received_at` | optional | ISO 8601 UTC; present when the event is a response to a client message, naming when that message arrived. |
| `agent` | yes after `agent_selected` | The active agent producing this event. |
| `consent_scope` | yes after `connected` | Opaque identifier for the consent scope bound to this session. |
| `payload` | yes | Event-type-specific payload. Conforms to the subschema for `type`. |

See Appendix A for the full JSON Schema.

## 7. Event types

### 7.1 Client → server

- `hello` — initial handshake. Carries `auth`, `requested_agent`, `requested_consent_scope`, `protocol_version`, optional `resume_from`.
- `select_agent` — choose initial agent. Used if `hello` did not specify one.
- `switch_agent` — change agent mid-session. Carries `target_agent` and optional `reason`.
- `ping` — client-originated liveness probe. Server MUST respond with a `pong` carrying the same `ping_id`.
- `ack` — client-side sequence acknowledgement; allows server to advance its replay buffer.
- `bye` — request clean shutdown.

### 7.2 Server → client

- `connected` — session established. Payload includes `session_id`, `protocol_version`, `active_agent`, `consent_scope`, `heartbeat_interval_ms`, `replay_buffer_seconds`, `max_in_flight_bytes`.
- `agent_selected` — confirms the active agent. Emitted after `hello`, `select_agent`, or `switch_agent`.
- `agent_switching` — emitted before `agent_selected` during a switch, so the UI can render a transition state.
- `output` — streamed result content. Payload carries `content_type`, `content`, and optional `chunk_index` / `final` when the output is multi-frame.
- `heartbeat` — periodic liveness beacon. Payload carries `alive: true` and `next_expected_at`.
- `latency` — diagnostic measurement. Payload carries `rtt_ms`, `method` ("ping_pong" | "ack_timing"), and optional `sample_window_ms`.
- `pong` — response to a client `ping`. Payload echoes `ping_id` and server timestamps.
- `error` — transport, protocol, authorization, or agent-execution failure. See §12.
- `disconnected` — session is ending. Payload carries a typed `reason` (see §11).

### 7.3 Example: heartbeat

```json
{
  "type": "heartbeat",
  "protocol_version": "0.1",
  "event_id": "evt_01HW9Z4N7C0VG3XKQ2R5TJ8FBS",
  "session_id": "gw_8f3a",
  "sequence": 1842,
  "event_emitted_at": "2026-04-16T04:28:00.123Z",
  "agent": "analysis",
  "consent_scope": "scope_analysis_readonly_v1",
  "payload": {
    "alive": true,
    "next_expected_at": "2026-04-16T04:28:10.123Z"
  }
}
```

## 8. Authentication and authorization

v0.1 uses bearer-token auth carried in the `hello` event. Tokens MUST be short-lived (recommended: 15 minutes) and MUST be bound to:

- the caller identity,
- the set of agents they are authorized to select,
- the consent scopes they are authorized to bind.

The server MUST validate, in order:

1. token signature and freshness,
2. caller authorization for `requested_agent`,
3. caller authorization for `requested_consent_scope`,
4. that `requested_consent_scope` is valid for `requested_agent`.

Any failure terminates the handshake with a fatal `error` carrying the appropriate code from §12 and closes the socket. The server MUST NOT disclose which of the four checks failed in the error message; the code is sufficient for authorized debugging.

**Token rotation mid-session.** The client MAY send a `hello` with an `auth_refresh` flag and a new token. The server validates and responds with a fresh `connected`-style acknowledgement, or an `error` and closes. Rotation does not reset `sequence`.

## 9. Agent selection and switching

- Initial selection happens in `hello` via `requested_agent`, or via `select_agent` if the server permits deferred selection.
- Mid-session switch: client sends `switch_agent { target_agent, reason? }`.
- Server emits `agent_switching { from, to }`.
- Server cancels any in-flight `output` frames from the previous agent by emitting a final `output { chunk_index, final: true, truncated: true }` for each open stream.
- Server emits `agent_selected { active_agent }`.
- Subsequent events carry the new `agent` value.

**Authorization is re-checked on every switch.** A switch that violates the session's authorization set terminates the session with a fatal `error`.

## 10. Output framing and backpressure

Outputs may be single-frame or chunked. Chunked outputs MUST carry `chunk_index` starting at 0, and the final chunk MUST set `final: true`.

**Backpressure policy (v0.1): credit-based with a published ceiling.**

- `connected` declares `max_in_flight_bytes` (default 4 MiB).
- The server tracks unacknowledged bytes per session.
- When in-flight bytes reach the ceiling, the server pauses emission and emits a single `heartbeat` with `payload.backpressure: true`.
- The client advances credit by sending `ack { up_to_sequence }`.
- If in-flight bytes remain at ceiling for longer than `backpressure_timeout_ms` (default 30 s), the server terminates the session with `disconnected { reason: "client_slow" }`.

This policy bounds server memory and makes slow-client behavior observable rather than latent.

## 11. Heartbeat, latency, and disconnection

### 11.1 Heartbeat

- Default interval: 10 seconds, declared in `connected.payload.heartbeat_interval_ms`.
- Bidirectional: server sends `heartbeat`; client sends `ping`. A session without either direction for two intervals is considered dead.
- A client that misses two consecutive server heartbeats MUST initiate reconnect with `resume_from`.

### 11.2 Latency

- Method is **ping/pong RTT** in v0.1. Server-ack timing is reserved for a future version and MUST NOT be reported as `latency` in v0.1.
- Client sends `ping { ping_id, client_sent_at }`.
- Server responds with `pong { ping_id, server_received_at, server_sent_at }`.
- Client computes `rtt_ms = now - client_sent_at` and MAY display it.
- Server emits its own `latency { rtt_ms, method: "ping_pong" }` event after each pong, sampling over the last N pings (default N = 8). This is the authoritative diagnostic number for dashboards.

### 11.3 Disconnection taxonomy

`disconnected.payload.reason` is a closed enum:

| Reason | Meaning | Client retry? |
|---|---|---|
| `client_bye` | Client requested shutdown. | no |
| `server_shutdown` | Planned server maintenance. | yes, with backoff |
| `auth_expired` | Token expired, no rotation provided. | yes, after re-auth |
| `auth_revoked` | Token revoked mid-session. | no without human action |
| `agent_unauthorized` | Attempted agent switch outside authorization. | no |
| `consent_scope_violation` | Output exceeded bound consent scope. | no without new scope |
| `client_slow` | Backpressure timeout. | yes, with larger buffer |
| `protocol_violation` | Malformed frame or invalid transition. | no without client fix |
| `server_error` | Unrecoverable server-side error. | yes, with backoff |
| `idle_timeout` | No activity beyond threshold. | yes |

Clients MUST distinguish retryable from non-retryable reasons and MUST NOT silently retry on non-retryable ones.

## 12. Errors and retry guidance

Error payload shape:

```json
{
  "error": {
    "code": "AGENT_TIMEOUT",
    "message": "Agent did not respond within 15s",
    "retryable": true,
    "retry_after_ms": 2000,
    "correlation_id": "evt_01HW9Z..."
  }
}
```

Required error codes in v0.1:

- `AUTH_FAILED` — handshake authentication failed. Not retryable without new token.
- `AGENT_NOT_FOUND` — requested agent does not exist. Not retryable.
- `AGENT_UNAUTHORIZED` — caller not permitted for this agent. Not retryable.
- `CONSENT_SCOPE_INVALID` — scope unknown or not valid for agent. Not retryable.
- `AGENT_TIMEOUT` — agent did not respond in time. Retryable.
- `AGENT_ERROR` — agent raised an error. Retryable iff agent signals so.
- `RATE_LIMITED` — caller is over quota. Retryable with `retry_after_ms`.
- `PROTOCOL_ERROR` — malformed frame or invalid transition. Not retryable without client fix.
- `SCHEMA_VERSION_MISMATCH` — declared protocol_version unsupported. Not retryable.
- `INTERNAL` — unclassified server error. Retryable with backoff.

**Client retry contract.** Retryable errors MUST use exponential backoff with jitter: `delay = min(cap, base * 2^attempt) * uniform(0.5, 1.5)`. Default `base = 500 ms`, `cap = 30 s`. `retry_after_ms` on the error, if present, overrides the computed delay as a lower bound.

## 13. Resume and replay

- Every session maintains a bounded server-side replay buffer, declared in `connected.payload.replay_buffer_seconds` (default 60).
- On reconnect, the client sends `hello { resume_from: <last_seen_sequence> }`.
- If the server can satisfy the resume (the requested sequence is still in the buffer), it replays all events from `resume_from + 1` with their original `event_emitted_at` and `sequence`, marking each with `payload.replayed: true`.
- If the server cannot satisfy the resume (buffer has advanced past the requested sequence), it responds with `error { code: "RESUME_UNAVAILABLE", retryable: false }` and the client MUST start a fresh session.

Resume preserves ordering guarantees. It does not re-execute agent work.

## 14. Consent scope and audit

**Consent scope** is a named, versioned policy declaring what the session is authorized to receive. Examples:

- `scope_analysis_readonly_v1` — read-only analysis, no tool execution, no external calls.
- `scope_compose_email_v1` — composition only, may draft but not send.
- `scope_agent_full_v1` — full agent capability within the user's authorization.

Every `output` event MUST be auditable against its bound scope. The server is responsible for enforcement; the client is responsible for display. If an agent attempts an action outside the scope, the server MUST terminate the session with `consent_scope_violation`.

**Audit sink.** In v0.1 the server is REQUIRED to emit a parallel audit stream (out of band from the client socket) containing every `agent_selected`, `switch_agent`, `consent_scope` change, non-retryable `error`, and `consent_scope_violation` disconnect. The audit stream is append-only and tamper-evident.

This makes "agent selection is auditable" a mechanism, not a slogan.

## 15. Clock, timing, and observability

- `event_emitted_at` is the server's emit instant.
- `server_received_at`, when present, is the server's receive instant for the client message that produced this event.
- The difference `event_emitted_at − server_received_at` is the server-side processing delay.
- `rtt_ms` from `latency` is the network + processing round trip.
- Clients MAY log `client_received_at` locally but MUST NOT place it on the wire in v0.1.

Together these let an operator distinguish network latency, server processing delay, and agent execution delay without reverse engineering.

## 16. Schema governance

- The JSON Schema in Appendix A is the source of truth.
- Server and client implementations MUST validate every emitted and received envelope against the schema in development and in staging. Production validation is RECOMMENDED.
- Breaking changes require a major version bump.
- Additive, backward-compatible changes require a minor version bump and a new entry in the changelog file colocated with the schema.

## 17. Reference UI state model

The client UI SHOULD render a status strip derived from protocol state:

```
Gold Gateway | analysis | connected | hb 2s ago | 42 ms | scope:analysis_readonly_v1
```

State variables:

- `connection_state`: handshaking | authenticating | connected | switching | reconnecting | closed.
- `active_agent`: string.
- `last_heartbeat_at`: ISO 8601.
- `latest_rtt_ms`: integer.
- `consent_scope`: string.
- `error_banner`: optional { code, message, retry_in_ms }.

Retry and reconnect controls surface when `error_banner` is present or when `connection_state === 'reconnecting'`.

## 18. What is out of scope for v0.1

- Binary frames and streaming media payloads.
- Multiplexed sessions over a single socket.
- End-to-end encryption beyond TLS (e.g. per-event sealed payloads).
- Federation across Gold Gateway instances.
- Server-ack-based latency measurement.

These are candidates for v0.2 and MUST NOT be emulated by clients in v0.1.

## 19. Example wire trace

```
C→S  hello               { auth, requested_agent: "analysis", requested_consent_scope: "scope_analysis_readonly_v1", protocol_version: "0.1" }
S→C  connected           { session_id: "gw_8f3a", protocol_version: "0.1", active_agent: "analysis", consent_scope: "scope_analysis_readonly_v1", heartbeat_interval_ms: 10000, replay_buffer_seconds: 60, max_in_flight_bytes: 4194304 }
S→C  agent_selected      { active_agent: "analysis" }
S→C  heartbeat           { alive: true, next_expected_at: ... }
C→S  ping                { ping_id: "p1", client_sent_at: ... }
S→C  pong                { ping_id: "p1", server_received_at: ..., server_sent_at: ... }
S→C  latency             { rtt_ms: 42, method: "ping_pong", sample_window_ms: 80000 }
S→C  output              { content_type: "text/plain", content: "Result: ...", chunk_index: 0, final: true }
C→S  ack                 { up_to_sequence: 1845 }
C→S  switch_agent        { target_agent: "compose", reason: "user_selected" }
S→C  agent_switching     { from: "analysis", to: "compose" }
S→C  agent_selected      { active_agent: "compose" }
S→C  heartbeat           { alive: true, ... }
C→S  bye
S→C  disconnected        { reason: "client_bye" }
```

## 20. Open questions for v0.1 → v0.2

1. Should `consent_scope` itself be a composable structure rather than an opaque identifier?
2. Should the audit stream be in-band with a separate consent scope, or strictly out-of-band?
3. Is ULID the right `event_id` format, or should it be a signed token for tamper-evidence?
4. Should the heartbeat carry a load hint so clients can shed traffic cooperatively?

These are deferred to the v0.2 discussion, not blockers for v0.1 implementation.

---

## Appendix A — JSON Schema (excerpt)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://gold-gateway.noizy.ai/schemas/envelope/v0.1",
  "title": "GoldGatewayEnvelope",
  "type": "object",
  "required": ["type", "event_id", "event_emitted_at", "payload"],
  "properties": {
    "type": {
      "type": "string",
      "enum": [
        "hello", "select_agent", "switch_agent", "ping", "ack", "bye",
        "connected", "agent_selected", "agent_switching",
        "output", "heartbeat", "latency", "pong", "error", "disconnected"
      ]
    },
    "protocol_version": { "type": "string", "pattern": "^\\d+\\.\\d+$" },
    "event_id": { "type": "string", "pattern": "^evt_[0-9A-HJKMNP-TV-Z]{26}$" },
    "session_id": { "type": "string" },
    "sequence": { "type": "integer", "minimum": 1 },
    "event_emitted_at": { "type": "string", "format": "date-time" },
    "server_received_at": { "type": "string", "format": "date-time" },
    "agent": { "type": "string" },
    "consent_scope": { "type": "string" },
    "payload": { "type": "object" }
  },
  "allOf": [
    {
      "if": { "properties": { "type": { "const": "error" } } },
      "then": {
        "properties": {
          "payload": {
            "type": "object",
            "required": ["error"],
            "properties": {
              "error": {
                "type": "object",
                "required": ["code", "message", "retryable"],
                "properties": {
                  "code": { "type": "string" },
                  "message": { "type": "string" },
                  "retryable": { "type": "boolean" },
                  "retry_after_ms": { "type": "integer", "minimum": 0 },
                  "correlation_id": { "type": "string" }
                }
              }
            }
          }
        }
      }
    },
    {
      "if": { "properties": { "type": { "const": "disconnected" } } },
      "then": {
        "properties": {
          "payload": {
            "type": "object",
            "required": ["reason"],
            "properties": {
              "reason": {
                "type": "string",
                "enum": [
                  "client_bye", "server_shutdown", "auth_expired", "auth_revoked",
                  "agent_unauthorized", "consent_scope_violation", "client_slow",
                  "protocol_violation", "server_error", "idle_timeout"
                ]
              }
            }
          }
        }
      }
    }
  ]
}
```

The full schema (all event subschemas) lives beside this document as `envelope.schema.json` and is the machine-readable source of truth.

---

## Changelog

- **v0.1 (2026-04-16):** Initial draft. Nine gaps from review closed: authentication/authorization flow, resume semantics, backpressure policy, bidirectional heartbeat, explicit latency method, agent switch semantics, disconnection taxonomy, protocol versioning, retry guidance with jitter. Consent scope and audit stream added as first-class concerns.
