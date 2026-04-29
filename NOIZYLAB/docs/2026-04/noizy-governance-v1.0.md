# NOIZY GOVERNANCE v1.0
## Board Authority, License Flag Enforcement, Revenue Engine, Creator Protection

**Author:** Robert Stephen Plowman (RSP_001) — rsp@noizyfish.com
**Date:** March 25, 2026
**Status:** Binding Governance Doctrine
**Authority:** NOIZY Constitution v2.0, Articles IV, VI, VII

---

## 1. GOVERNANCE STRUCTURE

### 1.1 Board of Aligned Minds

The Board of Aligned Minds is the governing body for operational decisions that require multi-stakeholder input. It does not override the Constitution — it operates within it.

**Composition:**
- Minimum 3 seats required for quorum
- RSP_001 holds permanent founding seat with veto authority on constitutional matters
- Additional seats allocated to: technical lead, creator representative, legal/ethics advisor
- Current vacancy: Alex's seat (BLOCKING — license flag reviews cannot proceed)

**Authority Matrix:**

| Decision Type | Required Approvers | Quorum | Veto |
|---|---|---|---|
| Tool clearance (commercial) | Board majority | 3 seats | RSP_001 |
| Tool clearance (non-commercial) | RSP_001 alone | 1 | — |
| Constitutional amendment | RSP_001 only | 1 | — |
| Revenue model change | Board majority + RSP_001 | 3 | RSP_001 |
| New creator onboarding | Automated (NCP validation) | 0 | — |
| Consent revocation | Creator alone (Kill Switch) | 0 | — |
| Emergency shutdown | RSP_001 alone | 1 | — |
| Licensee dispute resolution | Board majority | 3 | — |
| Platform integration approval | Board majority | 3 | RSP_001 |
| Agent behavior modification | RSP_001 alone | 1 | — |

### 1.2 Decision Recording

Every Board decision must be:
- Recorded with timestamp, participants, vote outcome
- Logged to audit_log (actor_type: "admin", action: "board_decision")
- Retrievable by any creator whose assets are affected
- Immutable once recorded (append-only ledger, Article VII)

---

## 2. LICENSE FLAG ENFORCEMENT

### 2.1 Tool Clearance Registry

The tool_clearance_registry table in D1 is the single source of truth for which AI tools/models may be used in the NOIZY ecosystem.

**Clearance Levels:**

| Status | Meaning | Commercial Use | Board Review Required |
|---|---|---|---|
| approved | Fully cleared | Yes | Already completed |
| restricted | Cleared with conditions | Per-condition | Case-by-case |
| pending_review | Awaiting board decision | No | Yes — BLOCKED until quorum |
| blocked | Explicitly prohibited | No | Board decision recorded |

**Current Registry State (March 25, 2026):**

| Tool | Status | Commercial | Notes |
|---|---|---|---|
| XTTS_v2 | approved | Yes | Primary TTS engine |
| RVC | approved | Yes | Voice conversion |
| Librosa | approved | Yes | Acoustic analysis only |
| pedalboard | approved | Yes | Audio effects processing |
| Whisper | approved | Yes | Transcription only |
| MusicGen | pending_review | No | Blocked — Alex seat vacant |
| MaskGCT | pending_review | No | Blocked — Alex seat vacant |
| Tango 2 | pending_review | No | Blocked — Alex seat vacant |
| FishSpeech | pending_review | No | Blocked — Alex seat vacant |

### 2.2 Clearance Review Process

1. Tool submitted for review (by RSP_001 or Board member)
2. Technical assessment: capabilities, data handling, license terms
3. Ethical assessment: consent model, training data provenance, creator impact
4. Commercial assessment: revenue implications, liability exposure
5. Board vote (quorum required for commercial clearance)
6. Decision recorded to tool_clearance_registry + audit_log
7. Consent gateway updated (immediate enforcement)

### 2.3 Emergency Tool Suspension

RSP_001 can immediately change any tool's status to "blocked" without Board quorum if:
- A consent violation is discovered involving that tool
- A security vulnerability is identified
- A creator files a formal complaint linked to that tool
- Training data provenance cannot be verified

Emergency suspensions are logged and reviewed at next Board meeting.

---

## 3. REVENUE ENGINE

### 3.1 The 75/25 Standard (Article IV)

The NOIZY default economic standard:
- **75%** to the creator whose voice/identity/asset generated the value
- **25%** to the platform (NOIZY infrastructure, operations, development)

This is not a recommendation. It is the constitutional default.

### 3.2 Revenue Flow Architecture

```
Usage Event (synthesis, derivative, etc.)
    ↓
Consent Gateway verifies eligibility (10-check matrix)
    ↓ ALLOW
Royalty Event created
    ↓
    ├── creator_amount = gross × (payment_terms.creator_pct / 100)
    ├── platform_amount = gross × (payment_terms.platform_pct / 100)
    ├── currency = payment_terms.currency
    └── payout_due_at = now + payment_terms.payout_window_days
    ↓
Payout processed (pending → scheduled → paid)
    ↓
Logged to royalty_events (append-only)
```

### 3.3 Override Rules (Article IV, Section 3)

The 75/25 default may ONLY be modified when ALL five conditions are met:

1. **Explicit creator approval** — creator signs the modified NCP
2. **Explicit claimant approval** — claimant signs the modified NCP
3. **Contract-scoped** — override applies ONLY to that specific NCP record
4. **Time-bounded** — override inherits the NCP term (never permanent)
5. **Non-inheriting** — child contracts or renewals revert to 75/25

Overrides are logged with `override_applies: true` in payment_terms_json.
Every override is visible in the creator's dashboard and audit trail.

### 3.4 Payout Schedule

| Event | Timeline |
|---|---|
| Usage event occurs | Immediate logging |
| Royalty calculated | Within 1 minute of usage event |
| Payout scheduled | Within 24 hours |
| Payout executed | Within 7 days (default payout_window_days) |
| Creator dashboard updated | Real-time |
| Audit log entry | Immediate (append-only) |

### 3.5 Revenue Disputes

If a creator disputes a royalty calculation:
- dispute_status set to "filed" on the consent_record
- All new usage events for that consent → ESCALATE (Check 9)
- Board reviews within 30 days
- Historical payments are NOT clawed back (Article V)
- Resolution recorded to audit_log

---

## 4. CREATOR PROTECTION

### 4.1 Kill Switch (Article V)

RSP_001 — and any creator for their own assets — can revoke any consent token instantly.

**Kill Switch triggers immediate enforcement:**
- New synthesis requests: DENIED
- New training jobs: DENIED
- New derivative generation: DENIED
- Active routing eligibility: INVALIDATED
- API requests for revoked scope: REJECTED
- Pending jobs: MARKED FOR CANCELLATION
- Creator dashboard: UPDATED
- Revocation event: WRITTEN TO AUDIT LOG
- Historical royalties: PRESERVED (creator keeps what they earned)
- Dependent agents/services: NOTIFIED

**Enforcement SLA: 1 hour.** No exceptions.

### 4.2 Never Clauses

Immovable prohibitions that cannot be overridden by any entity, including RSP_001:

1. **Never synthesize without consent** — no NCP, no synthesis
2. **Never train without consent** — training on creator assets requires explicit authorization
3. **Never bypass revocation** — revoked consent means STOP, immediately
4. **Never obscure provenance** — every output must carry traceable origin
5. **Never pool creator assets** — individual sovereignty, not collective dilution
6. **Never reduce below floor** — creator percentage cannot go below 50% even with override
7. **Never delete audit records** — append-only ledger, forever

### 4.3 Estate Protection

When a creator can no longer manage their own assets (death, incapacitation):
- Voice Estate transfers to designated heirs
- Governance rules in voice_estates.governance_json apply
- Delegates with appropriate permissions can manage consent
- Estate activation conditions are explicit and machine-readable
- No platform entity gains control by default

### 4.4 Data Portability

Creators can export at any time:
- All consent records (NCP format)
- All usage events
- All royalty events
- Voice Estate governance records
- Full audit trail

NOIZY does not hold creator data hostage. Zero lock-in. (Article VI)

---

## 5. OPERATIONAL GOVERNANCE

### 5.1 Incident Response

| Severity | Response Time | Escalation |
|---|---|---|
| P0 — Consent violation in production | 15 minutes | RSP_001 + Board |
| P1 — Royalty routing failure | 1 hour | RSP_001 |
| P2 — Provenance pipeline down | 4 hours | Technical lead |
| P3 — Dashboard display issue | 24 hours | Technical lead |
| P4 — Documentation gap | 1 week | Any team member |

### 5.2 Audit Cadence

| Audit Type | Frequency | Responsible |
|---|---|---|
| Consent integrity check | Daily (automated) | GABRIEL |
| Royalty reconciliation | Weekly | System + RSP_001 review |
| Tool clearance review | Monthly (Board meeting) | Board of Aligned Minds |
| Full security audit | Quarterly | RSP_001 + external review |
| Constitutional compliance | Annually | RSP_001 |

---

**Version:** 1.0
**Constitutional Authority:** Articles I-VII of NOIZY Constitution v2.0
**Amendment:** Governance changes require RSP_001 approval. Board composition changes require Board majority + RSP_001.
