# NOIZY Consent Gateway — Security Posture

**Protocol > promises.**
Protected routes, consent visibility, and revocation authority are enforced by deployable infrastructure and verifiable artifacts.

---

## Route Contract

### Public
- `GET /health` — service health, no auth required

### Protected (X-NOIZY-Key or Bearer JWT)
- `POST /verify` — 10-check consent eligibility decision matrix
- `POST /revoke` — creator revokes consent scope (403 if caller ≠ consent owner)
- `GET /status/:creatorId` — sanitized creator status (returns `{creator_id, status, updated_at}` only)

### Internal Ops Only
- `GET /__proof` — live route posture + binding introspection (requires X-NOIZY-Key)

### Legacy (backward compat)
- `POST /v1/check-eligibility`
- `POST /v1/revoke`
- `GET /v1/consent/:id`
- `GET /v1/audit/:asset_id`

---

## Auth Model

| Status Code | Meaning |
|---|---|
| `401` | Identity missing — no key or invalid key |
| `403` | Identity insufficient — key valid but caller ≠ resource owner |

**Current:** `X-NOIZY-Key` header
**Production upgrade:** `Authorization: Bearer <JWT>` (RS256 via JWKS)

When `JWT_JWKS_URL` is set in env: JWT mode activates automatically.
Without it: API key mode (default).

---

## Revocation Is Sacred

`POST /revoke` enforces:
1. Auth check (401 if no key)
2. Owner check (403 if `caller_id ≠ consent_record.creator_id`)
3. Append-only audit row written to `consent_audit_log` D1 table
4. KV record updated atomically

This provides **verifiable historical action lineage** — not just access control.

---

## Status Is Sanitized

`GET /status/:creatorId` returns **only**:
```json
{
  "creator_id": "...",
  "status": "active | revoked | expired",
  "updated_at": "2026-..."
}
```

Never returned: `events`, `revokeReason`, `never_clauses`, `audit_history`, internal metadata.

---

## Proof Artifacts

- `artifacts/PROOF_BUNDLE_v1.0.json` — cryptographic governance snapshot
- `artifacts/proof/consent-gateway.production.json` — CI-generated deploy proof
- Generated on every deploy via GitHub Actions + uploaded as artifact (90-day retention)

---

## Governance Doctrine

- **Plowman Standard:** 75/25 creator split — hard-coded in every royalty model
- **NCP Protocol:** Every data flow answers "who owns this?"
- **Never Clauses:** Enforced before any synth request reaches the model
- **5th Epoch:** Infrastructure serves human dignity, not extraction

---

*Spine: `workers/consent-gateway/src/` | Auth: `src/jwt-auth.js` | Schema: `schema.sql` | Tests: `test/`*
