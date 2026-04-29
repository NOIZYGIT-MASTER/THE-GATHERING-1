# NOIZY Runtime Policy v2.0
**Status:** Policy Ready
**Date:** March 25, 2026
**Derived from:** NOIZY Constitution v2.0
**Applies to:** consent-gateway, Heaven, GABRIEL, all NOIZY services

---

## Purpose

This document defines what the NOIZY system allows, blocks, holds, and escalates.
Every runtime service must implement these rules. When a runtime check is ambiguous,
the ruling in this policy document is authoritative.

---

## The Action Decision Matrix

Every request touching a creator-linked asset must pass all applicable checks.
Checks run in order. First failure determines outcome.

| # | Check | Pass Condition | Failure Outcome |
|---|---|---|---|
| 1 | Identity linked | creator_id or hvs_id exists in registry | HOLD |
| 2 | Consent exists | NCP record found for creator + claimant + scope | DENY |
| 3 | Consent active | consent_status = active | DENY |
| 4 | Scope valid | requested action_type in usage_types | DENY |
| 5 | Time valid | NOW >= term_start AND NOW <= term_end | DENY |
| 6 | Tool authorized | requested tool_name in authorized_tools | HOLD or DENY |
| 7 | Provenance ready | provenance pipeline available for required manifest | HOLD |
| 8 | Royalty route ready | creator payout destination configured where monetization applies | HOLD |
| 9 | Dispute clear | dispute_status = none | ESCALATE |
| 10 | Revocation clear | revoked_at is null AND no active revocation event | DENY |

### Check 6 — Tool Authorization Detail

- If the tool exists in tool_clearance_registry with clearance_status = blocked → **DENY**
- If the tool exists with clearance_status = pending_review → **HOLD**
- If the tool is not in authorized_tools for this NCP record → **HOLD** (creator may not have authorized it)
- If the tool is not in tool_clearance_registry at all → **HOLD** (unknown tools require review)

---

## Decision Outputs

### ALLOW
All required checks pass. Execution may proceed.
- Log audit row with decision = ALLOW and all matched reason_codes
- Return consent_record_id, provenance_required, royalty_route_status

### HOLD
Authorization may be valid but execution dependencies are incomplete or repairable.
- Do not execute
- Return specific hold reason_codes
- Creator or claimant can repair the dependency and resubmit

### DENY
Authorization is absent, expired, revoked, or out of scope.
- Do not execute
- Return specific deny reason_codes
- Log audit row
- No retry without new consent

### ESCALATE
Human review required due to ambiguity, dispute, or exceptional condition.
- Do not execute
- Notify RSP_001 or designated reviewer
- Log audit row with escalation flag
- Hold the request in escalation queue

---

## Reason Codes

### DENY codes
- `CONSENT_NOT_FOUND` — no NCP record exists for this creator + claimant + scope
- `CONSENT_INACTIVE` — consent_status is not active (draft, expired, suspended, disputed)
- `CONSENT_REVOKED` — revoked_at is set or active revocation event exists
- `CONSENT_EXPIRED` — NOW > term_end
- `USAGE_NOT_IN_SCOPE` — requested action_type not in usage_types
- `USAGE_EXCLUDED_BY_SCOPE` — requested action matches scope.exclusions
- `TERRITORY_NOT_AUTHORIZED` — requested territory not in scope.geographic
- `TOOL_BLOCKED` — tool_name in tool_clearance_registry with clearance_status = blocked

### HOLD codes
- `IDENTITY_NOT_FOUND` — creator_id or hvs_id not in registry
- `TOOL_NOT_AUTHORIZED` — tool_name not in this NCP's authorized_tools
- `TOOL_PENDING_REVIEW` — tool in clearance_registry with status = pending_review
- `TOOL_UNKNOWN` — tool not in clearance_registry
- `PROVENANCE_PIPELINE_UNAVAILABLE` — manifest subsystem unavailable
- `ROYALTY_ROUTE_NOT_READY` — creator payout destination not configured

### ESCALATE codes
- `DISPUTED_RIGHTS_ASSERTION` — dispute_status != none
- `COMPETING_ESTATE_CLAIMS` — multiple parties claiming authority over same voice estate
- `EXCEPTIONAL_CONDITION` — manual review flagged by runtime operator

---

## Revocation SLA Policy

When a consent revocation is received, all of the following must complete
within 1 hour of revocation effective_at:

| Action | System Responsible |
|---|---|
| Deny new synthesis requests | consent-gateway |
| Deny new training jobs | consent-gateway |
| Deny new derivative generation | consent-gateway |
| Invalidate active routing eligibility | consent-gateway + GABRIEL |
| Reject API requests for revoked scope | consent-gateway |
| Mark pending jobs for cancellation | GABRIEL |
| Update creator dashboard status | NOIZYVOX portal |
| Write revocation event to audit log | Heaven |
| Preserve historical royalty records | Heaven ledger (read-only) |
| Preserve historical provenance records | NOIZY PROOF (read-only) |
| Notify dependent agents/services | GABRIEL broadcast |

SLA breach must be logged as a critical audit event and escalated to RSP_001.

---

## Royalty Override Policy

The NOIZY default is 75/25 (creator/platform).

A contract-scoped override is valid only when ALL of the following are true:
- explicit creator approval (signed)
- explicit claimant approval (signed)
- scoped to a specific NCP agreement (not global)
- time-bounded (no perpetual overrides without auto_renew = true + re-consent)
- visible in the audit trail

An override applies **only to its covered NCP agreement**.
It does not change the platform default for any other agreement.

---

## Tool Clearance Registry Policy

No tool or model may be used in voice synthesis or processing unless it appears
in tool_clearance_registry with clearance_status = approved.

Current status (March 2026):

| Tool | Status | Commercial | Notes |
|---|---|---|---|
| XTTS v2 | approved | yes | Cleared for commercial synthesis |
| RVC | approved | yes | Cleared for voice conversion |
| Librosa | approved | yes | Cleared for acoustic analysis |
| pedalboard | approved | yes | Cleared for audio effects |
| MusicGen | pending_review | no | Non-commercial only pending board review |
| MaskGCT | pending_review | no | Non-commercial only pending board review |
| Tango 2 | pending_review | no | Non-commercial only pending board review |
| FishSpeech | pending_review | no | Non-commercial only pending board review |

Board review blocker: Alex seat vacancy on Board of Aligned Minds.
Unblocking action: Replace Alex (see OUTREACH_DRAFTS.md).

---

## Provenance Status Definitions

| Status | Meaning |
|---|---|
| verified | All required provenance present and consistent |
| missing | Expected provenance is absent |
| corrupted | Manifest or hash chain exists but fails validation |
| mismatch | Metadata does not match source asset / consent record / model path |
| revoked_source | Output traces to a source now revoked for new use |
| legacy_unverified | Pre-NOIZY or imported asset with incomplete provenance history |

An output with provenance_status of anything other than `verified` must not be
distributed as a trusted asset without explicit admin override and audit log entry.

---

## Runtime Enums

### consent_status
`draft` | `pending_signature` | `active` | `expired` | `revoked` | `suspended` | `disputed`

### decision
`ALLOW` | `HOLD` | `DENY` | `ESCALATE`

### payout_status
`pending` | `scheduled` | `paid` | `failed` | `held`

### estate_status
`active` | `inactive` | `transferred` | `probate_pending`

### sovereignty_status
`claimed` | `verified` | `contested` | `inactive`

### provenance_status
`verified` | `missing` | `corrupted` | `mismatch` | `revoked_source` | `legacy_unverified`

---

**Version:** 2.0
**Status:** Policy Ready
**Derived from:** NOIZY Constitution v2.0 Articles I–VII
