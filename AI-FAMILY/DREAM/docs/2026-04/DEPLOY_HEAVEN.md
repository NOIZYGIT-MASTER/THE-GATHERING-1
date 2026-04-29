# HEAVEN — Deploy Guide (v0.5.0)

**Worker name:** `noizy-ai`
**Routes:** `noizy.ai/*`, `www.noizy.ai/*`

**D1 bindings:**
- `AGENT_MEMORY` → `agent-memory` (`b5b58cc9-1f37-4000-adc5-12f9e419662f`)
- `CONSENT_DB` → `consent_db` (`c5547f69-0541-4d1a-bd80-a2f328806513`)
- `MANIFEST_DB` → `manifest_db` (`784ad160-010e-475b-8885-d800945bf945`)
- `CATALOGUE_DB` → `catalogue_db` (`ce0b93f2-45a0-4196-ac56-7b6236aa279f`)

**KV bindings:**
- `SIGNUPS` → `noizy-signups` (`f173a7af5ed74daf8c65d38e042e0b48`)
- `VERDICT_KEYS` → `verdict-keys` (create in Phase 1 below; paste id into wrangler.toml)

**R2 bindings:**
- `VOICE_ARTIFACTS` → `voice-artifacts` (create in Phase 1 below)

**Secret:** `HEAVEN_SHARED_SECRET` (for authenticated consent / synth / verify / rotate endpoints)

Three deploy paths in order of preference. **All paths are location-agnostic** — no hardcoded `/Users/...` or Parallels share paths. Run from the folder the worker lives in, wherever that is on your machine.

---

## Phase 0 — One-time migration (run before first deploy)

The D1 schemas for `consent_db`, `manifest_db`, `catalogue_db`, and a legacy-table stub on `agent-memory`. This is a one-shot. The migration is idempotent — re-running is safe.

```bash
# From inside the heaven/ folder — no hardcoded path needed.
npm run migrate:all
# Equivalent to:
#   wrangler d1 execute consent_db   --remote --file=migrations/001_consent_schema.sql
#   wrangler d1 execute manifest_db  --remote --file=migrations/001_consent_schema.sql
#   wrangler d1 execute catalogue_db --remote --file=migrations/001_consent_schema.sql
#   wrangler d1 execute agent-memory --remote --file=migrations/001_consent_schema.sql
```

Verify:

```bash
npx wrangler d1 execute consent_db --remote --command="SELECT actor_id, status FROM subjects;"
# Expect: one row, RSP_001 / active

npx wrangler d1 execute consent_db --remote --command="SELECT COUNT(*) AS n FROM consent_records;"
# Expect: n >= 3

npx wrangler d1 execute agent-memory --remote --command="SELECT COUNT(*) AS n FROM consent_log;"
# Expect: n >= 0 (table exists — ready for dual-write)
```

---

## Phase 1 — Provision KV for verdict keys + R2 for artifacts

HEAVEN v0.3.0 signs every allowed verdict with an HMAC key in KV, and authorizes audio writes into a dedicated R2 bucket. Create both once.

```bash
# From the heaven/ folder:
npm run kv:create:verdict
# Output looks like:
#   ✨ Success! Add the following to your configuration file:
#   [[kv_namespaces]]
#   binding = "VERDICT_KEYS"
#   id = "abc123..."
#
# Copy the id and paste it into wrangler.toml where it says
# REPLACE_WITH_VERDICT_KEYS_KV_ID.

npm run r2:create:artifacts
# Creates the 'voice-artifacts' bucket. Binding is already in wrangler.toml.
```

---

## Phase 2 — Set the enforcement secret

A single value, never committed. Set once; rotate only when needed.

```bash
npx wrangler secret put HEAVEN_SHARED_SECRET
# Paste a 32+ char random string. Store the same value in any downstream
# caller (NOIZYVOX engine, MCP gateway, etc.).
```

---

## Phase 3 — Deploy

Pick the path that matches the device you're holding.

### Path A — iPad-viable: GitHub Actions

**One-time setup:**

1. Push this `heaven/` folder to a GitHub repo (e.g. `noizyfishinc/noizyempire`).
2. Repo → **Settings → Secrets and variables → Actions → New repository secret.**
3. Name: `CLOUDFLARE_API_TOKEN`. Value: a token from Cloudflare Dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template, scoped to the Fishmusicinc account.
4. The workflow at `.github/workflows/deploy-worker.yml` is already in the repo.

**Deploying from iPad:**

1. Open the repo in Safari.
2. Edit `heaven/worker.js`, `heaven/src/consent-gate.js`, or `heaven/wrangler.toml` in browser.
3. Commit directly to main.
4. The workflow runs. Watch it in the **Actions** tab.
5. When the smoke check passes, `https://noizy.ai/health` returns `{ok:true,…}` with all four D1 bindings `connected:true`.

**Manual trigger from iPad:** Actions tab → "Deploy HEAVEN Worker" → "Run workflow".

### Path B — Local terminal (Mac, GOD, Parallels VM, anywhere)

```bash
# Step 1: cd into the folder this README lives in.
# No hardcoded path. Use pwd to confirm you're in the right spot.
cd "$(dirname "$(readlink -f "$0" 2>/dev/null || echo "$0")")" 2>/dev/null || true
pwd   # should end in /cloudflare-workers/heaven

# Step 2: validate before shipping.
npx wrangler deploy --dry-run

# Step 3: ship it.
npx wrangler deploy

# Step 4: tail logs while you hit the smoke tests.
# (open a second terminal, leave this one running)
npx wrangler tail

# Step 5: curl the health endpoint.
curl -s https://noizy.ai/health | head -c 2000
```

**Note for Parallels/VM deploys:** If `wrangler` can't authenticate inside the VM, run `npx wrangler login` once — it opens a browser auth flow. Token persists in `~/.wrangler/config/default.toml` inside the VM's home directory, not the host's.

**Note on the old `deploy` worker.** The legacy Hello-World worker is named `deploy`. This worker is named `noizy-ai`. After a successful deploy, traffic to `noizy.ai` routes to `noizy-ai` because of the `routes` block. Retire the old one *after* verification:

```bash
npx wrangler delete deploy --force
```

Do not run this before verifying the new deploy. There's no rollback if you delete first and the new deploy fails.

### Path C — Cloudflare Dashboard (browser only)

Fallback if Actions isn't set up and you don't have terminal access.

1. Dashboard → **Workers & Pages** → **Create application** → **Create Worker**.
2. Name it `noizy-ai`. Click **Deploy** (ships the default template).
3. Click the worker → **Quick Edit**.
4. Delete the template code. Paste the entire contents of `worker.js` from this folder. **Do not inline `src/consent-gate.js` manually** — Path C is limited; if you go this route, you must flatten the import first. Prefer Path A or B.
5. **Settings** → **Variables and Secrets** → add:
    - D1 bindings: `AGENT_MEMORY` / `CONSENT_DB` / `MANIFEST_DB` / `CATALOGUE_DB` with matching names.
    - KV binding: `SIGNUPS` → `noizy-signups`.
    - Secret: `HEAVEN_SHARED_SECRET`.
6. **Settings** → **Triggers** → **Add Custom Domain** → `noizy.ai`, `www.noizy.ai`.
7. Visit `https://noizy.ai/health`.

---

## Phase 4 — Rotate the verdict signing key (first time only)

The signer needs a current key before any `/api/synth/request` can hand back a signed token. Rotate once to seed it:

```bash
export HEAVEN_SHARED_SECRET="<same value you set in Phase 2>"
npm run keys:rotate
# Response: { "ok": true, "rotated": true, "new_kid": "k_...", "retired_kid": null, ... }
```

Re-check `/health`:

```bash
curl -s https://noizy.ai/health | jq '.verdict_keys'
# Expect: { "current": true, "previous": false, "current_kid": "k_...", ... }
```

Rotate on a schedule (quarterly is a sensible default). Two keys live at once — current and previous — so rotation is never disruptive to tokens already in flight.

---

## Phase 5 — Verification

Run the smoke tests. In VS Code with REST Client, open `tests/smoke.http` and click "Send Request" on each block. Or translate to curl.

**Minimum green:**

```bash
# All four D1s must say connected:true
curl -s https://noizy.ai/health | jq '.bindings, .agent_memory.connected, .consent_db.connected, .manifest_db.connected, .catalogue_db.connected'

# Public surfaces
curl -s https://noizy.ai/api/gospel | jq '.count'       # expect 12
curl -s https://noizy.ai/api/agents | jq '.count'       # expect 8
curl -s https://noizy.ai/api/empire | jq '.count'       # expect >= 9

# Enforcement — allow case
curl -s -X POST https://noizy.ai/api/consent/check \
  -H "x-heaven-auth: $HEAVEN_SHARED_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"actor_id":"RSP_001","action":"synth","scope":"demo/001","requester_id":"smoke"}' \
  | jq '.verdict.allowed'   # expect true

# Enforcement — deny case (Never-Clause fires)
curl -s -X POST https://noizy.ai/api/consent/check \
  -H "x-heaven-auth: $HEAVEN_SHARED_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"actor_id":"RSP_001","action":"nsfw","scope":"anything"}' \
  | jq '.verdict.allowed, .verdict.clause'  # expect false, NO_NSFW
```

If `/health` shows any D1 binding as `connected:false`, re-check that binding in Dashboard → Worker → Settings → Variables.

---

## Rollback

Dashboard → Workers → `noizy-ai` → **Deployments** tab. Every `wrangler deploy` creates a new version. Click any previous version → **Rollback to this version**. Instant, no DNS change.

---

## What's public, what's not

HEAVEN's HTTP surface is intentionally narrow and **split by auth**.

**Public (unauthenticated):**
- `GET /` — apex home
- `GET /health`
- `GET /api/gospel` · `GET /api/gospel/:n` — 12 principles
- `GET /api/doctrine` · `GET /api/doctrine/:code` — doctrine lines
- `GET /api/agents` — whitelisted columns only: agent_id, agent_name, role, status
- `GET /api/empire` — brand map
- `POST /api/signup` — email capture

**Authenticated (require `x-heaven-auth: $HEAVEN_SHARED_SECRET`):**
- `GET /api/consent/status?actor_id=…`
- `POST /api/consent/check`
- `POST /api/synth/request`

**Never exposed over HTTP** (remain server-side, reachable only through NOIZY MCP):
- `memcells`, `consent_log` (legacy, superseded by consent_db), `lucy_observations`, `ops_accounts`, `ops_platforms`, `system_failures`, `gabriel_commands`, `dreed_registry`, `vox_talent_profiles`.

---

## Field report — what changed in v0.2.0

- Three new D1 bindings wired: `consent_db`, `manifest_db`, `catalogue_db`.
- Consent enforcement surface online: `/api/consent/{status,check}`, `/api/synth/request`.
- Never-Clauses imported as constitutional code, not runtime config.
- Voice of Refusal gives every denial a human sentence and a clause id.
- Deploy manifest auto-recorded on first request after each deploy.
- `DEPLOY_HEAVEN.md` path-agnostic — no `/Users/m2ultra/...`, no Parallels share.

## Field report — what changed in v0.3.0

- **Signed verdicts.** HMAC-SHA256 tokens with rotating keys in KV. NOIZYVOX and any downstream caller must `POST /api/verdict/verify` before emitting audio. A compromised caller can no longer bypass HEAVEN.
- **Artifact gate.** R2 bucket `voice-artifacts` is bound; `/api/synth/request` returns an authorized key prefix (`{actor}/{action}/{scope}/{verdict_id}/{filename}`) plus `max_bytes` and `expires_at`. No verdict, no bucket write.
- **Dual-write bridge.** Every consent event now mirrors into the legacy `agent-memory.consent_log`. Controlled by `DUAL_WRITE_LEGACY` in wrangler.toml — flip to `"false"` when the migration window closes.
- **Key rotation runbook.** `/api/keys/rotate` atomically promotes current → previous, installs a fresh current, retires the old previous. Rotations logged to `manifest_db.deploys` as `heaven-key-rotation` records.
- `/health` now surfaces all seven bindings, both verdict keys (current/previous kids, no material), and the legacy mirror status.

Closes: **NOI-67**, **NOI-75**. Closes the two stress-test gaps flagged at end of v0.2.0: (1) cryptographic trust between HEAVEN and downstream synthesis, (2) audit gap during the `consent_log` → `consent_events` migration.

## Field report — what changed in v0.5.0

- **Active R2 write path.** `PUT /api/r2/write?key=...` streams the request body into the `voice-artifacts` R2 bucket under cryptographic verdict enforcement. HEAVEN is now on the write path itself — no audio byte reaches R2 except through this door.
- **Provenance metadata on every object.** Each R2 object is stamped with custom metadata: `actor_id`, `verdict_id`, `kid`, `declared_size`, `content_type`, `written_at`, `heaven_version`. Auditors can read the provenance directly off the object without needing to cross-reference the catalogue.
- **Catalogue as source of truth.** New table `catalogue_db.artifacts` records every authorized write with etag, size, content type, status (active / revoked / missing), and the signing kid. `GET /api/r2/manifest?actor_id=RSP_001` answers "what audio exists for this actor" by querying the catalogue, not by listing R2.
- **Revocation flow.** `DELETE /api/r2/object?key=...&actor_id=...` deletes the R2 object and marks the catalogue row `revoked`. The catalogue row is retained for audit, not destroyed. The asymmetric design: the actor can revoke their own artifacts even after the original verdict has expired.
- **Content-type allowlist.** Only audio/* content types (wav, mp3, m4a, aac, flac, ogg, webm) and `application/octet-stream` are accepted. A PUT with `application/zip` gets a 415 before any bytes cross the gate.
- **CORS upgrade.** `x-heaven-verdict` added to allowed headers; PUT and DELETE added to allowed methods.

Closes the R2 trust gap flagged at end of v0.4.0: HEAVEN no longer merely authorizes the write, it performs it.

---

## Phase 7 — R2 write flow (the new artifact upload path)

After Phase 3 (deploy) and once you have a signed token from `/api/synth/request`, the full upload flow:

```bash
# 1. Get a signed verdict + authorized key from /api/synth/request.
RESP=$(curl -s -X POST https://noizy.ai/api/synth/request \
  -H "x-heaven-auth: $HEAVEN_SHARED_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"actor_id":"RSP_001","action":"synth","scope":"demo/001","requester_id":"local","filename":"take-01.wav"}')

TOKEN=$(echo "$RESP" | jq -r '.authorization.token')
KEY=$(echo "$RESP"   | jq -r '.artifact_slot.key')

echo "Will upload to key: $KEY"

# 2. PUT the audio. HEAVEN verifies the token, writes to R2, inserts catalogue row.
curl -s -X PUT "https://noizy.ai/api/r2/write?key=$KEY" \
  -H "x-heaven-auth: $HEAVEN_SHARED_SECRET" \
  -H "x-heaven-verdict: $TOKEN" \
  -H "Content-Type: audio/wav" \
  --data-binary "@./take-01.wav" \
  | jq '.ok, .etag, .catalogue.inserted'
# Expect: true, "<etag>", true

# 3. List the actor's authorized artifacts (catalogue is source of truth).
curl -s "https://noizy.ai/api/r2/manifest?actor_id=RSP_001" \
  -H "x-heaven-auth: $HEAVEN_SHARED_SECRET" \
  | jq '.count, .artifacts[0]'

# 4. Revoke when needed.
curl -s -X DELETE "https://noizy.ai/api/r2/object?key=$KEY&actor_id=RSP_001" \
  -H "x-heaven-auth: $HEAVEN_SHARED_SECRET" \
  | jq '.ok, .revoked_at'
```

Refusal reasons you can expect on the PUT path:
- `content_length_required` — the client forgot Content-Length
- `unsupported_content_type` — e.g. sent `application/zip`
- `token_signature_mismatch_or_unknown_kid` — tampered or rotated-out token
- `token_expired` — verdict's TTL elapsed
- `key_outside_authorized_prefix` — key doesn't match the verdict's actor/action/scope
- `nested_path_not_allowed` — key tried to add a subdirectory under the prefix
- `size_exceeds_max_bytes` — declared size > 50 MB

---

## Field report — what changed in v0.4.0

- **R2 write mediator.** `POST /api/r2/authorize-write` closes the last gap from v0.3.0. A caller presents a signed verdict token + the R2 key + the size. HEAVEN cryptographically verifies the token, recomputes the authorized prefix from the signed payload (not the request body), and returns allow/deny with a specific reason code: `key_outside_authorized_prefix`, `nested_path_not_allowed`, `size_exceeds_max_bytes`, etc. A compromised writer cannot forge the prefix because it's derived from the verdict itself.
- **Stream session gate (dormant).** `POST /api/stream/session` runs the full consent → sign flow for `action='stream'`, then calls the Cloudflare Stream API to create a live input. Supports `mode='webrtc'` (sub-second), `srt` (<1s), `llhls` (2-4s), and `hls` (5-10s). Enforces mode-to-scope conventions so a caller can't ask for a low-latency tier under a scope that didn't consent to it. Dormant until Stream accounts are consolidated and `STREAM_ENABLED="true"` + `STREAM_ACCOUNT_ID` + `STREAM_API_TOKEN` are set. When dormant, returns a structurally honest `stream_not_configured` refusal — no silent failures.
- **Stream sessions log.** New table `catalogue_db.stream_sessions` records every issued live input with its verdict, scope, mode, and CF uid.
- `/health` now surfaces `stream.{enabled, has_account_id, has_api_token}` so you can see at a glance what the dormant gate is waiting on.

Closes the R2 mediator gap flagged at end of v0.3.0. Prepares for Stream activation the moment the Cloudflare support ticket resolves.

---

## Phase 6 — Stream activation (after Cloudflare account consolidation)

This phase only runs AFTER the support ticket resolves and `noizy.ai` lives on one consolidated account with Stream enabled. Until then, `/api/stream/session` returns `stream_not_configured` by design.

```bash
# From the heaven/ folder:

# 1. Create a Stream-scoped API token.
#    Dashboard → My Profile → API Tokens → Create Token →
#    Custom → Permissions: "Stream:Edit" on the Fishmusicinc account only.

# 2. Set the secret:
npx wrangler secret put STREAM_API_TOKEN

# 3. Paste your consolidated Fishmusicinc account id into wrangler.toml:
#    [vars]
#    STREAM_ACCOUNT_ID = "2446d788cc4280f5ea22a9948410c355"
#    STREAM_ENABLED    = "true"

# 4. Run the Stream migration:
npm run migrate:stream

# 5. Redeploy:
npx wrangler deploy

# 6. Verify:
curl -s https://noizy.ai/health | jq '.stream'
# Expect: { "enabled": true, "has_account_id": true, "has_api_token": true, ... }
```

Test the flow with a WebRTC live scope:

```bash
curl -s -X POST https://noizy.ai/api/stream/session \
  -H "x-heaven-auth: $HEAVEN_SHARED_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"actor_id":"RSP_001","scope":"demo/live","mode":"webrtc","requester_id":"smoke","label":"first-live-test"}' \
  | jq '.ok, .stream.ok, .stream.session.uid'
```

Note: `scope` for `webrtc` and `srt` modes MUST end in `/live`. For `llhls` it must end in `/near-live`. `hls` accepts any scope. You'll need a consent_record covering `action=stream` on those scopes — add one via `consent_db`:

```sql
INSERT OR IGNORE INTO consent_records
  (record_id, actor_id, action, scope, status, contract_version, signed_by)
VALUES
  ('rec_rsp001_stream_demo_live', 'RSP_001', 'stream', 'demo/live', 'granted', 'v3', 'self:RSP_001'),
  ('rec_rsp001_stream_demo_near', 'RSP_001', 'stream', 'demo/near-live', 'granted', 'v3', 'self:RSP_001');
```
