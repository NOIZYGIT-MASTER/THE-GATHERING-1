# NOIZY LEGAL & REGULATORY ALIGNMENT v1.0
## NO FAKES Act, EU AI Act, Copyright, Liability, Legislative Strategy

**Author:** Robert Stephen Plowman (RSP_001) — rsp@noizyfish.com
**Date:** March 25, 2026
**Status:** Legal Intelligence Document
**Disclaimer:** This document is strategic analysis, not legal advice. Consult qualified counsel for jurisdiction-specific guidance.

---

## 1. NO FAKES ACT (United States)

### Overview

The Nurturing Originals, Fostering Art, and Keeping Entertainment Safe (NO FAKES) Act establishes a federal right of publicity for AI-generated digital replicas of an individual's voice, image, or likeness.

### Key Provisions and NOIZY Alignment

| NO FAKES Requirement | NOIZY Implementation | Status |
|---|---|---|
| Consent required before using likeness/voice | NCP v1.1 consent records | Built |
| Machine-readable consent records | NCP JSON Schema with Ed25519 signatures | Built |
| Right to revoke consent | Kill Switch + 1-hour SLA | Built |
| Enforcement mechanisms | Consent Gateway 10-check matrix | Built |
| Records of authorization | Audit log (append-only, queryable) | Built |
| Posthumous protections | Voice Estate v1.0 (heirs, delegates, governance) | Built |
| Penalties for unauthorized use | NOIZYLAB forensic detection + DMCA integration | Designed |

### NOIZY as Technical Enforcement Layer

The NO FAKES Act creates the legal right. NOIZY provides the enforcement infrastructure.

Specifically:
- NCP v1.1 satisfies the "written consent" requirement with machine-readable precision
- The consent gateway provides real-time enforcement (not just legal recourse after violation)
- C2PA provenance creates the evidentiary chain courts will need for enforcement actions
- The audit log provides the discovery-ready record trail

### Compliance Checklist

- [x] Consent mechanism exists (NCP v1.1)
- [x] Consent is explicit, not implied by registration (Article II)
- [x] Revocation mechanism exists (Kill Switch)
- [x] Revocation is timely (1-hour SLA)
- [x] Records are auditable (audit_log table)
- [x] Posthumous governance exists (Voice Estate v1.0)
- [ ] Pending: Integration with DMCA takedown infrastructure
- [ ] Pending: Template cease-and-desist aligned with NO FAKES provisions
- [ ] Pending: Castle briefing delivered

---

## 2. EU AI ACT (European Union)

### Overview

The EU AI Act (in force since 2024) establishes a risk-based regulatory framework for AI systems, with transparency and accountability requirements.

### Classification

NOIZY's consent gateway is likely classified as **limited risk** (transparency obligations) rather than high risk, because:
- It does not make automated decisions about individuals' rights
- It enforces creator-defined consent, not platform-defined restrictions
- It operates as infrastructure, not as an autonomous decision-maker

However, voice synthesis tools used within the NOIZY ecosystem (XTTS_v2, RVC) may be classified as **high risk** when used to generate realistic human speech. This is why the tool_clearance_registry exists.

### Key Requirements and NOIZY Alignment

| EU AI Act Requirement | NOIZY Implementation | Status |
|---|---|---|
| Transparency: AI-generated content must be labeled | C2PA manifests on all outputs | Built (architecture) |
| Human oversight: meaningful human control | RSP_001 veto, Board governance, Kill Switch | Built |
| Data governance: training data must be documented | Tool clearance registry tracks model provenance | Built |
| Risk assessment: proportionate to risk level | 10-check decision matrix with graduated responses | Built |
| Record-keeping: logs of AI system decisions | Audit log with reason_codes and decision tracking | Built |
| Right to explanation: users can query decisions | /v1/audit/:id endpoint, reason_codes in every response | Built |

### Compliance Checklist

- [x] Content labeling mechanism (C2PA architecture)
- [x] Human oversight chain (Board → RSP_001 → Kill Switch)
- [x] Training data documentation (tool_clearance_registry)
- [x] Decision logging (audit_log with reason_codes)
- [x] Graduated risk response (ALLOW/HOLD/DENY/ESCALATE)
- [ ] Pending: Formal risk assessment document
- [ ] Pending: EU representative designation (if serving EU users)
- [ ] Pending: Data Protection Impact Assessment (DPIA)

---

## 3. COPYRIGHT LAW

### Voice as Copyrightable Work

Current copyright law does not clearly protect voice as a standalone copyrightable work. NOIZY's position:

- Voice recordings ARE copyrightable (sound recordings)
- Vocal style and timbre are NOT clearly copyrightable (idea/expression dichotomy)
- AI-generated voice output has uncertain copyright status (human authorship requirement)

### NOIZY's Strategy

Rather than wait for copyright law to evolve, NOIZY builds consent infrastructure that provides equivalent protection through contract and technology:

1. **NCP as contract:** Consent records are enforceable agreements, regardless of copyright status
2. **Provenance as evidence:** C2PA manifests create documentary proof of origin and consent
3. **Revocation as remedy:** Faster than any court process — consent revoked, use stops in 1 hour
4. **Economic routing as enforcement:** If you're not authorized, you can't route revenue, so there's nothing to monetize

### Jurisdictional Considerations

| Jurisdiction | Voice Protection Status | NOIZY Strategy |
|---|---|---|
| United States | Right of publicity (state-level, NO FAKES pending) | NCP + consent gateway |
| Canada | Personality rights, Copyright Act (evolving) | NCP + Online Harms Act alignment |
| European Union | GDPR (biometric data), AI Act (transparency) | NCP + C2PA + data governance |
| United Kingdom | Passing off, performer's rights | NCP + contractual framework |
| Tennessee (ELVIS Act) | Explicit voice protection in AI context | Model for other states |

---

## 4. LIABILITY FRAMEWORK

### NOIZY's Liability Position

As infrastructure, NOIZY operates in a specific liability posture:

**NOIZY is liable for:**
- Correct enforcement of consent records (if a consent record says DENY, the gateway MUST deny)
- Accurate royalty calculations and timely payouts
- Data security and integrity of Voice Estates
- Honest representation of system capabilities

**NOIZY is NOT liable for:**
- Third-party tools' behavior after receiving ALLOW (tool liability lies with tool provider)
- Content of AI-generated outputs (NOIZY verifies consent, not quality)
- Legal validity of consent in specific jurisdictions (creator's counsel should review)
- Actions of creators or claimants outside the NOIZY ecosystem

### Limitation of Liability

NOIZY's terms of service should include:
- Force majeure for infrastructure failures
- Cap on damages (platform share earned, not gross revenue)
- Mutual indemnification between NOIZY and platform integrators
- No liability for third-party tool failures after ALLOW decision
- Clear SLA with defined remedies for SLA breach (credit, not unlimited damages)

### DMCA Safe Harbor

If NOIZY qualifies as a service provider under DMCA § 512:
- Maintain designated agent for DMCA notices
- Implement notice-and-takedown procedure
- Respond within statutory timeframes
- Document all takedown actions in audit log

**DMCA Agent:** rsp@noizyfish.com (register with Copyright Office)

---

## 5. TEMPLATE LEGAL DOCUMENTS (TO DEVELOP)

| Document | Purpose | Priority |
|---|---|---|
| NCP Terms of Service | Creator-facing agreement for NOIZYVOX membership | High |
| Licensee Agreement | Claimant-facing agreement for voice use authorization | High |
| DMCA Designated Agent Registration | Copyright Office registration | High |
| Cease-and-Desist Template | Enforcement letter for unauthorized voice use | High |
| Privacy Policy | GDPR/PIPEDA-compliant data handling disclosure | High |
| Board Resolution Template | Formal recording of Board decisions | Medium |
| Estate Transfer Agreement | Voice Estate succession document | Medium |
| Platform Integration Agreement | Terms for third-party platform integration | Medium |
| Dispute Resolution Procedure | Formal process for consent/royalty disputes | Medium |
| Contributor License Agreement | For open-source NCP spec contributors | Low |

---

## 6. REGULATORY ENGAGEMENT TIMELINE

| Date | Action | Target |
|---|---|---|
| Mar 2026 | Castle email — NO FAKES Act technical briefing request | Sen. Coons' office |
| Apr 2026 | NCP v1.1 published as open spec on noizy.ai | Public |
| Q2 2026 | DMCA agent registered with Copyright Office | U.S. Copyright Office |
| Q2 2026 | PIPEDA compliance review (Canadian privacy law) | Legal counsel |
| Q3 2026 | EU AI Act formal risk assessment completed | EU compliance |
| Q3 2026 | SAG-AFTRA outreach (performer voice protection) | SAG-AFTRA |
| Q4 2026 | SOCAN/CMRRA outreach (Canadian rights organizations) | SOCAN/CMRRA |
| 2027 | HVS Phase 4 push — legal recognition of voice sovereignty | Multiple jurisdictions |

---

**Version:** 1.0
**Author:** Robert Stephen Plowman (RSP_001) — rsp@noizyfish.com
**Disclaimer:** Strategic analysis only. Not legal advice. Consult qualified counsel.
