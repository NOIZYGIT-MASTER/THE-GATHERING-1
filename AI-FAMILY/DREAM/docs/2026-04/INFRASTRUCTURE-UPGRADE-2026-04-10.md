# NOIZY Infrastructure Upgrade — April 10, 2026
## Built by Claude (Co-Architect) for Robert Stephen Plowman

---

## WHAT WAS BUILT TODAY

### 1. Full MCP Audit (14 connectors tested)
- 12 of 13 original MCPs LIVE and working
- noizy-gemma3 MCP confirmed online (GOD.local bridge) — 14th connector
- Only Stripe needs re-authentication

### 2. D1 Voice Equity Registry Schema — `sql/schema.sql`
14 tables, 30 indexes, seed data for the consent kernel database:
actors, never_clauses, voice_dna, descendants, consent_tokens, licensees, licenses, synth_requests, noizy_ledger, rate_table, estates, union_tiers, audit_log, gap_solver_entries

### 3. KV Namespaces Created
FEATURE_FLAGS + GAP_SOLVER (on Fishmusicinc — need recreation on rsp@noizy.ai)

### 4. wrangler.toml Upgraded → v18.0.0
Workers AI `[ai]` binding added, R2 VOICE_VAULT binding added, version bumped.

### 5. package.json Updated → v18.0.0
New scripts: schema, seed, r2:create, r2:list, kv:create:flags, kv:create:gap, upgrade:wrangler

---

## CRITICAL: DUAL CLOUDFLARE ACCOUNT

| | Cowork MCP | wrangler.toml (canonical) |
|---|---|---|
| Name | Fishmusicinc | rsp@noizy.ai |
| Account ID | 2446d788… | 5f36aa97… |
| Recommendation | Reconnect MCP to rsp@noizy.ai | Keep as canonical |

## 5 BLOCKERS REQUIRING YOUR ACTION

1. `wrangler login` on GOD.local terminal
2. `npm install -g wrangler@latest` (4.53 → 4.81)
3. Enable R2 in Cloudflare Dashboard
4. Reconnect Stripe in Cowork settings
5. Reconnect Cloudflare MCP to rsp@noizy.ai account

## AFTER BLOCKERS CLEARED — RUN SEQUENCE

```bash
wrangler login
npm install -g wrangler@latest
npx wrangler kv namespace create "FEATURE_FLAGS"
npx wrangler kv namespace create "GAP_SOLVER"
# → Update IDs in wrangler.toml
npx wrangler d1 execute gabriel_db --remote --file=sql/schema.sql
npx wrangler d1 execute gabriel_db --remote --file=sql/seed.sql
npx wrangler r2 bucket create noizy-voice-vault
npx wrangler deploy
bash scripts/smoke-test.sh
```
