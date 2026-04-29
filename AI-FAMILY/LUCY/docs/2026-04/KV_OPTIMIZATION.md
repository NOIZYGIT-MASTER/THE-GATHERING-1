# NOIZY KV Optimization Strategy — Option B

**Decision:** Optimize current setup. Stay free tier.
**Root cause:** 53 KV namespaces used as a state store — wrong tool for the job.
**Fix:** KV = config + cache only. D1 = all state, session data, agent memory.

---

## The 3-Layer Rule (permanent policy)

| Layer | Tool | What goes here |
|---|---|---|
| **Config / Cache** | KV | Worker secrets, feature flags, static config, short-lived cache |
| **State / Memory** | D1 (agent-memory 7b813205) | Lucy PWA state, GABRIEL memory, session logs, all mutable data |
| **Blob / Assets** | R2 | Audio stems, WAV files, large artifacts |

**Anything that changes more than once per session → D1, not KV.**

---

## KV Namespace Audit Target

Current: 53 namespaces. Target: ≤10.

| Keep | Purpose |
|---|---|
| `GABRIEL_CONFIG` | GABRIEL runtime config |
| `HEAVEN_CONFIG` | HEAVEN Worker config |
| `LUCY_CONFIG` | Lucy PWA feature flags |
| `NOIZY_SECRETS` | Auth tokens (read-once, rarely written) |
| `EDGE_CACHE` | Short-lived edge cache (TTL 300s) |
| `BRAND_CONFIG` | Per-brand static config (7 brands) |
| `OPENCODE_CONFIG` | OpenCode session config |

**Delete or merge everything else.** Run `make kv-audit` first to inventory.

---

## Batch Write Protocol

Instead of 1 write per field change, collect all changes and flush once.

```javascript
// BEFORE (burns writes)
await kv.put("lucy:tab", tab);
await kv.put("lucy:user", user);
await kv.put("lucy:view", view);   // = 3 writes

// AFTER (1 write)
await kv.put("lucy:state", JSON.stringify({ tab, user, view }), { expirationTtl: 300 });
```

**Rule:** All KV writes go through `batchWrite(namespace, updates)` — never direct `.put()`.

---

## Migration Plan

### Phase 1 — Audit (today)
Run `make kv-audit` → inventory all 53 namespaces → identify what moves to D1.

### Phase 2 — D1 tables (today)
Run `make migrate-d1` → creates lucy_state, kv_shadow tables in agent-memory.

### Phase 3 — Swap writes (this week)
Update Lucy PWA + GABRIEL to write state to D1. KV writes drop to near zero.

### Phase 4 — Namespace cleanup (this week)
Delete 40+ namespaces. Stay under 10.
