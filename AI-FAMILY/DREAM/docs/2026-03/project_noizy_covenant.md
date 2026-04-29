---
name: NOIZY Covenant — Ethically Executable Infrastructure
description: Machine-enforceable ethical framework — consent precedes action, restoration over punishment, mentorship over extraction, drift structurally prevented
type: project
---

The NOIZY Covenant is not documentation. It is mechanical enforcement of civilizational values built into the infrastructure layer.

**Core assertions (all must pass or deployment is blocked):**
1. Required entities exist: creators (hvs_actors), consent_records (hvs_consent_tokens), lineage_links (hvs_lineage), restoration_cases (hvs_restoration_cases)
2. Forbidden names rejected: "users", "assets", "content", any extraction scoring (engagement, virality, profit)
3. Consent must be explicit and revocable at all times
4. Lineage must be traceable — invisible mentorship is a covenant failure
5. Restoration cases must have repair plans — punishment without repair is forbidden
6. AI output is advisory only — never authoritative
7. Refusal must be enabled — system can always say no (kill switch)

**Enforcement points:** CI/CD pipeline, schema migrations, prompt registry, model deployment gate.

**Key file:** `src/covenant.js` — 9-check validator, imported into Heaven17 worker.
**Canonical doc:** `NOIZY_COVENANT.md` — the law of the empire.
**API endpoint:** `GET /api/v1/covenant/validate` — live validation against D1.

**Why:** Rob's explicit instruction that NOIZY is not a marketplace, not extraction, not punishment. The covenant makes this structurally impossible to drift from.

**How to apply:** Every new table, endpoint, prompt, or system instruction must pass covenant validation. If it extracts, scores creators, removes agency, or lacks restoration paths — it doesn't ship.
