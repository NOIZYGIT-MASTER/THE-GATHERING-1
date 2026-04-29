# NOIZY Release Runbook

**Purpose:** Safely ship noizy.ai by enforcing: inventory → tests → proof → deploy → verify.
**Golden rule:** No assumptions. Missing info = BLOCKED. Never print secrets.

---

## 0) Pre-flight Gate (PASS/FAIL)

Before any production deploy, explicitly verify all of these:

| Check | Required |
|---|---|
| Config format (wrangler.jsonc preferred; wrangler.toml validated) | PASS |
| Env bindings present per environment (vars, KV, D1) | PASS |
| Placeholder scan clean (no PLACEHOLDER/REPLACE_ME/TODO) | PASS |
| Tests pass (workers + router) | PASS |
| Proof bundle generated (deterministic path) | PASS |
| Route integrity verified (router does not strip path or query) | PASS |
| Consent auth/authz verified (/revoke + /status protected) | PASS |
| Required secrets present in CI (never echoed) | PASS |

**Any FAIL → NO-GO.**

---

## 1) Inventory (required)

```bash
find . -name "wrangler.toml" -o -name "wrangler.jsonc" 2>/dev/null
find .github/workflows -type f -maxdepth 1 -name "*.yml" 2>/dev/null
```

Record:
- worker name(s)
- routes
- envs (staging / production)
- bindings (KV / D1)

---

## 2) Wrangler Authentication (required)

```bash
npx wrangler whoami
```

If not authenticated → **STOP** (`npx wrangler login` first).

---

## 3) Placeholder Guard (required)

```bash
bash scripts/check-no-placeholders.sh
```

If blocked → **STOP and fix before continuing.**

---

## 4) Install & Test (required)

```bash
(cd cloudflare/workers/consent-gateway && npm ci && npm test)
(cd cloudflare/workers/cb01-router     && npm ci && npm test)
```

---

## 5) Proof Bundle (required)

```bash
node scripts/generate-proof-bundle.mjs
ls -la artifacts/proof/
```

Bundle must include: `worker_name`, `environment`, `deployed_at`, `git_sha`,
`routing_contract`, `routes_public`, `routes_protected`, active KV + D1 binding names.

---

## 6) Staging Deploy (required before prod)

```bash
npx wrangler deploy --env staging
npx wrangler tail --env staging
```

Verify routes manually or via smoke test:
- `/health` → 200 (public)
- `/verify` → expected response
- `/revoke` without auth → 401
- `/status/:creatorId` → not leaking data

---

## 7) Production Deploy (only if ALL PASS)

```bash
npx wrangler deploy --env production
npx wrangler tail --env production
```

---

## 8) Evidence (attach to PR)

- curl / httpie outputs
- deploy logs
- proof bundle artifact (`artifacts/proof/*.json`)
- reviewer confirmation that routes and bindings match proof

---

## n8n Webhooks (noizy.app.n8n.cloud)

| Workflow | Endpoint |
|---|---|
| Evidence Pack | `POST /webhook/generate-evidence` |
| Enterprise Sync | `POST /webhook/enterprise-sync` |

Required n8n env vars (Settings → Variables):
- `DISCORD_AUDIT_WEBHOOK`
- `DISCORD_DEPLOY_WEBHOOK`

Python client: `from n8n_client import generate_evidence, enterprise_sync`

---

## Related files

| File | Purpose |
|---|---|
| [GABRIEL_PROMPT.md](./GABRIEL_PROMPT.md) | Release Commander system prompt for Claude Code |
| [scripts/check-no-placeholders.sh](./scripts/check-no-placeholders.sh) | Hard-fail placeholder scan |
| [scripts/generate-proof-bundle.mjs](./scripts/generate-proof-bundle.mjs) | Proof bundle generator |
| [.github/workflows/release-gate.yml](./.github/workflows/release-gate.yml) | CI hard gate |
| [ops/docker-compose.noizyops.yml](./ops/docker-compose.noizyops.yml) | Docker + Tailscale ops overlay |
