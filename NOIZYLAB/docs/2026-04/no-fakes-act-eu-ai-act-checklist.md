# NOIZY Compliance Checklist
## NO FAKES Act (US) × EU AI Act — Mapped to NOIZY Architecture

**Version:** 1.0  
**Maintained by:** rsp@noizyfish.com  
**Last reviewed:** 2026-01-01  
**Status:** Living document — update on each platform release

---

## 1. NO FAKES Act (US) — Digital Voice and Likeness Protection

*Proposed federal legislation prohibiting the creation of AI-generated replicas (voice, likeness) without explicit consent.*

### Coverage Summary

The NO FAKES Act creates a federal right to control unauthorized AI-generated replicas of an individual's voice or visual likeness. It applies to platforms that produce, host, or distribute such replicas.

### Compliance Checklist

| # | Requirement | NOIZY Control | Status | Evidence Location |
|---|-------------|---------------|--------|-------------------|
| NF-01 | Explicit written consent required before creating any AI voice replica | NCP token required; synthesis blocked without ACTIVE token | ✅ Compliant | `schemas/ncp.v1.1.json`, `workers/consent-gateway/src/index.js` CHECK-1 |
| NF-02 | Right to revoke consent at any time | Revocation enforced within 1 hour (NC-04) | ✅ Compliant | `docs/policy/runtime-policy.md` §4, `workers/consent-gateway/src/index.js` CHECK-7 |
| NF-03 | Disclosure to end users that content is AI-generated | C2PA manifest attached to all synthetic outputs | ✅ Compliant | Heaven `src/index.js` `/synth-requests` C2PA block |
| NF-04 | Notice to creator when their likeness is used | Audit log entry + royalty event on every synthesis | ✅ Compliant | `workers/consent-gateway/schema.sql` usage\_events, royalty\_events |
| NF-05 | No use of deceased person's likeness without estate authorization | Voice Estate governance required; heir approval mandatory | ✅ Compliant | `schemas/voice-estate.v1.json` §heirs, §governance\_rules |
| NF-06 | Platform liability for unauthorized replicas hosted | Never Clause NC-07 (no identity forgery) blocks synthesis | ✅ Compliant | `docs/constitution/noizy-constitution.md` Art. 2 |
| NF-07 | Safe harbor for platforms with robust consent controls | NCP v1.1 provides machine-enforceable consent evidence | ✅ Positioned | `schemas/ncp.v1.1.json` |
| NF-08 | Takedown mechanism for unauthorized replicas | Revocation API + `revocation_events` table; 1-hour SLA | ✅ Compliant | `workers/consent-gateway/src/index.js` POST /revoke |
| NF-09 | Compensation to creator for use of voice | 75/25 royalty split enforced; `royalty_events` logged | ✅ Compliant | `docs/policy/runtime-policy.md` §6 |
| NF-10 | Record retention for consent and usage | Immutable audit\_log; no DELETE endpoint | ✅ Compliant | `workers/consent-gateway/schema.sql` audit\_log |

**NO FAKES Act Score: 10/10 requirements addressed**

### Gaps / Open Items

- NF-07 (safe harbor) depends on legislative final text — monitor bill progress.
- NF-06 (platform liability) may require legal opinion letter for enterprise customers.

---

## 2. EU AI Act — High-Risk AI System Requirements

*Regulation (EU) 2024/1689 — applies to AI systems deployed in the EU that are classified as high-risk or general-purpose AI.*

### Classification Assessment

| System | Classification | Rationale |
|--------|---------------|-----------|
| Voice synthesis (MusicGen, MaskGCT, FishSpeech) | **High-Risk (Annex III)** | Biometric-adjacent, creative content, cultural impact |
| Consent Gateway (Heaven) | **Limited Risk** | Does not make autonomous decisions affecting rights |
| Gabriel AI Orchestration | **General-Purpose AI (GPAI)** | Multi-modal, multi-provider orchestration layer |
| DreamChamber UI | **Minimal Risk** | Human-in-the-loop, creator consent required |

### High-Risk AI System Requirements (Annex III)

| # | Requirement | NOIZY Control | Status | Evidence |
|---|-------------|---------------|--------|----------|
| EU-HR-01 | Risk management system | Adversarial threat model; 9 Never Clauses as immovable constraints | ✅ | `docs/constitution/noizy-constitution.md` Art. 7 |
| EU-HR-02 | Data governance — training data quality | No training on unconsented voice data; NCP required before data use | ✅ | NCP CHECK-1, CHECK-6 in consent gateway |
| EU-HR-03 | Technical documentation | CLAUDE.md, NOIZY\_SYSTEM\_PROMPTS\_v2.0.md, schemas/ | ✅ | Repo docs/ |
| EU-HR-04 | Record-keeping / logging | Immutable audit\_log on all synthesis events | ✅ | `workers/consent-gateway/schema.sql` |
| EU-HR-05 | Transparency to users | C2PA manifests; NOIZYVOX onboarding disclosure | ✅ | Heaven C2PA block |
| EU-HR-06 | Human oversight | Board override API; escalation decision pathway | ✅ | `enterprise/board-override-api.md` |
| EU-HR-07 | Accuracy, robustness, cybersecurity | NCP token validation; signature verification; 10-check matrix | ✅ | `workers/consent-gateway/src/index.js` |
| EU-HR-08 | Conformity assessment | Internal assessment framework — 3rd party audit pending | ⚠️ In Progress | Schedule audit Q2 2026 |
| EU-HR-09 | Registration in EU database | Pending legislative implementation date | ⚠️ Pending | Monitor EUR-Lex |
| EU-HR-10 | Post-market monitoring | Usage\_events + feedback loop via Gabriel adaptive learning | ✅ | GabrielProfile.js |

### General-Purpose AI (GPAI) Model Requirements — Art. 53

| # | Requirement | NOIZY Control | Status |
|---|-------------|---------------|--------|
| EU-GP-01 | Technical documentation (model card) | Provider model cards required in tool\_clearance\_registry | ✅ |
| EU-GP-02 | Copyright compliance policy | NCP token blocks unconsented use; PREMIS provenance | ✅ |
| EU-GP-03 | Summary of training data | Passed through to underlying provider (Anthropic, OpenAI) — inherit compliance | ⚠️ Verify per provider |
| EU-GP-04 | Adversarial testing | Consent-decision-cases.json stress suite; red team schedule needed | ⚠️ Add red team |
| EU-GP-05 | Incident reporting to Commission | Audit log exportable; incident response playbook needed | ⚠️ Create playbook |

### Transparency Obligations — Art. 50

| # | Requirement | NOIZY Control | Status |
|---|-------------|---------------|--------|
| EU-T-01 | Disclose AI-generated content to recipients | C2PA manifest on all outputs; `synthetic: true` metadata | ✅ |
| EU-T-02 | Deep fake disclosure | `content_type: synthetic_voice` flagged in C2PA | ✅ |
| EU-T-03 | Watermarking of AI-generated audio | 3-layer watermarking (planned in DreamChamber proof layer) | ⚠️ Implement |

---

## 3. Cross-Framework Gap Analysis

| Gap | Risk Level | Owner | Target Date |
|-----|-----------|-------|-------------|
| 3rd party conformity assessment (EU-HR-08) | High | RSP_001 | Q2 2026 |
| EU GPAI registration (EU-HR-09) | Medium | RSP_001 | On EU implementation date |
| Red team adversarial testing schedule | High | RSP_001 | Q1 2026 |
| Incident response playbook | Medium | RSP_001 | Q1 2026 |
| Audio watermarking (EU-T-03) | Medium | DreamChamber team | Q2 2026 |
| Per-provider training data summary (EU-GP-03) | Low | RSP_001 | Q2 2026 |
| NO FAKES Act safe harbor legal opinion | Medium | Legal counsel | On bill passage |

---

## 4. Evidence Registry

| Control ID | File | Description |
|------------|------|-------------|
| NCP token schema | `schemas/ncp.v1.1.json` | Machine-readable consent contract |
| Consent gateway | `workers/consent-gateway/src/index.js` | 10-check decision matrix |
| DB schema | `workers/consent-gateway/schema.sql` | Audit log, revocation events |
| Runtime policy | `docs/policy/runtime-policy.md` | Revocation SLA, royalty policy |
| Constitution | `docs/constitution/noizy-constitution.md` | 7 Articles, Never Clauses |
| Voice estate | `schemas/voice-estate.v1.json` | Estate governance, heir rules |
| Stress tests | `tests/runtime/consent-decision-cases.json` | 10 test cases |
| C2PA | Heaven `src/index.js` synth-requests block | Provenance manifest |

---

## 5. Review Schedule

| Review | Frequency | Trigger |
|--------|-----------|---------|
| Full checklist review | Quarterly | Scheduled |
| NO FAKES Act update | On bill milestone | Legislative alert |
| EU AI Act update | On implementation notice | EUR-Lex monitoring |
| Incident review | Within 48h of incident | Any P0 consent failure |
