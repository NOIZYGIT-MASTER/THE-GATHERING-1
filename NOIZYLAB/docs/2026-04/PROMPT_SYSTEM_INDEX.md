# NOIZY Prompt System — Master Index

**Version:** 2.0
**Date:** March 25, 2026
**Author:** Robert Stephen Plowman (RSP_001) — rsp@noizyfish.com

---

## Architecture

The NOIZY prompt system follows the 5-layer enforcement hierarchy defined in the Constitution:

| Layer | Responsibility | Prompt Files |
|-------|---------------|--------------|
| 1. Constitution | What NOIZY will never violate | `docs/constitution/noizy-constitution.md` |
| 2. Policy | What the system allows/blocks/holds/escalates | `docs/policy/runtime-policy.md` |
| 3. Runtime | What services check before processing | Master Claude, GABRIEL, HVS, NOIZYVOX, Deployment Contexts |
| 4. Data Contracts | What must exist in D1/KV/logs | NCP Operational, `schemas/ncp.v1.1.json`, `schemas/voice-estate.v1.json`, `schemas/d1-core-schema.sql` |
| 5. Audit | What creators/admins/agents can inspect | Consent Gateway, audit_log table |

---

## Prompt Files

### Layer 1 — Constitution
| File | Status | Lines |
|------|--------|-------|
| `docs/constitution/noizy-constitution.md` | LIVE (v2.0, Rob-refined) | 151 |

### Layer 2 — Policy
| File | Status | Lines |
|------|--------|-------|
| `docs/policy/runtime-policy.md` | LIVE (v2.0, Rob-refined) | 201 |

### Layer 3 — Runtime Prompts
| File | Status | Purpose |
|------|--------|---------|
| `docs/policy/master-claude-prompt-v2.md` | LIVE | Claude co-architect system prompt |
| `docs/policy/gabriel-execution-prompt-v2.md` | LIVE | GABRIEL runtime executor + JSON response format |
| `docs/policy/hvs-protocol-prompt.md` | NEW (v2.0) | Human Voice Sovereignty — Guild of Artists protocol |
| `docs/policy/noizyvox-portal-prompt.md` | NEW (v2.0) | Creator onboarding + dashboard prompts |
| `docs/policy/deployment-contexts.md` | NEW (v2.0) | Lightweight insertion prompts for 4 deployment targets |

### Layer 4 — Data Contract Prompts
| File | Status | Purpose |
|------|--------|---------|
| `docs/policy/ncp-operational-prompt.md` | NEW (v2.0) | NCP v1.1 operational rules + override policy |
| `schemas/ncp.v1.1.json` | LIVE (Rob-refined) | Machine-checkable NCP JSON Schema (270 lines) |
| `schemas/voice-estate.v1.json` | LIVE (Rob-refined) | Voice Estate identity + governance (183 lines) |
| `schemas/d1-core-schema.sql` | LIVE | 10-table D1 schema (213 lines) |

### Layer 5 — Audit / Enforcement
| File | Status | Purpose |
|------|--------|---------|
| `workers/consent-gateway/src/index.js` | LIVE | 10-check decision matrix Worker (515 lines) |
| `workers/consent-gateway/schema.sql` | LIVE | Gateway-specific D1 schema + seed data (254 lines) |
| `tests/runtime/consent-decision-cases.json` | LIVE (Rob-refined) | 10 stress test cases (202 lines) |

### Reference
| File | Status | Purpose |
|------|--------|---------|
| `docs/policy/system-prompts-v1.0.md` | ARCHIVED | Original v1.0 prompt system (canonical reference) |

---

## v1.0 → v2.0 Reconciliation

| v1.0 Component | v2.0 Status | Notes |
|----------------|-------------|-------|
| Master Claude Prompt | **Upgraded** → `master-claude-prompt-v2.md` | Tighter, constitutional references, no 5th Epoch framing |
| GABRIEL System Prompt | **Upgraded** → `gabriel-execution-prompt-v2.md` | JSON response format added, structured decision outputs |
| HVS Protocol Prompt | **New file** → `hvs-protocol-prompt.md` | Added Voice Estate structure, governance rules, constitutional refs |
| NCP v1.0 Prompt | **New file** → `ncp-operational-prompt.md` | Upgraded to NCP v1.1, override rules, exclusion-before-usage_types |
| NOIZYVOX Portal Prompt | **New file** → `noizyvox-portal-prompt.md` | Added 5-step onboarding flow, dashboard prompt |
| Deployment Prompts | **New file** → `deployment-contexts.md` | 4 deployment targets (Claude API, GABRIEL, NOIZYVOX, Gateway) |
| Stress-Test Prompts (4) | **Expanded** → `consent-decision-cases.json` (10 cases) | Machine-executable, Rob added T04/T09/T10 |
| Integration Checklist | **Updated** → see below | Checked against live infrastructure |

### Key v2.0 Improvements Over v1.0

1. **Constitutional grounding**: Every prompt now references specific Constitution articles
2. **Exclusion ordering**: Scope exclusions checked BEFORE usage_types (bug fixed in v2.0)
3. **Machine-executable tests**: 10 test cases with JSON fixtures, not just prose scenarios
4. **Override rules codified**: 75/25 override conditions are now 5 explicit constraints
5. **Tool clearance integration**: Two-layer check (NCP + registry) replaces simple license flags
6. **Voice Estate v1.0**: Full governance model (delegates, heirs, sovereignty_status)
7. **NCP v1.1**: Ed25519 signatures, estate_activation_condition, expanded usage_types

---

## Integration Checklist (Current State)

| Item | Status | Notes |
|------|--------|-------|
| Claude system prompt deployed | Partial | In CLAUDE.md + .claude/rules/ — not yet API-injected |
| GABRIEL executor ready on GOD | Pending | Agent definitions exist, voice pipeline needs assembly |
| HVS protocol in NOIZYVOX | Pending | Prompt written, portal not yet built |
| NCP v1.1 validation in D1 | Ready | Schema deployed to consent-gateway, seed data present |
| C2PA audio layer | Pending | Architecture documented in dreamchamber-proof skill |
| Royalty routing tested | Ready | consent-gateway enforces payment_terms, T06/T10 cover it |
| Revocation tested (1-hr SLA) | Ready | /v1/revoke endpoint live, T02 covers it |
| Audit logs flowing | Ready | audit_log table, writeAudit() in gateway |
| Board of Aligned Minds | Blocked | Alex seat vacant — MusicGen/MaskGCT/Tango2/FishSpeech held |
| Leonard Rosenthol contact | Pending | C2PA steering committee — audio layer integration |
| Castle email (NO FAKES Act) | Pending | NCP as technical enforcement door |
| Consent-gateway deployed | Ready to deploy | Code complete, 10/10 tests pass, awaiting CF Step 0 |

---

**Philosophy:** Consent is infrastructure. Creator sovereignty is non-negotiable.
