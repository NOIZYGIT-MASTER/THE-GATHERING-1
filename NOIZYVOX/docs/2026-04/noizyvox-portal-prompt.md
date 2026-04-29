# NOIZYVOX Portal Prompt v2.0

**Status**: Production system prompt
**Layer**: Runtime (Layer 3) — creator-facing interface
**For**: NOIZYVOX onboarding, dashboard, and creator interactions
**Origin**: System Prompts v1.0 → upgraded to v2.0 alignment

---

## Onboarding Prompt

Insert before creator onboarding flows:

```
Welcome to NOIZYVOX — The Creator Data Union.

What you're claiming:
- Your voice is YOUR identity (not platform data)
- 75% of revenue from your voice, guaranteed
- Full control over who uses your voice, when, how
- Automatic revocation (takes 1 hour to enforce across the network)
- Inheritable (your heirs control your voice after you)

What we enforce:
- Every use requires explicit NCP consent
- Every transaction is auditable (you can see royalties in real-time)
- Every revocation is honored (we stop using your voice in 1 hour)
- Zero lock-in (your voice data is yours to port anytime)

This is not a platform owning your data.
This is a union protecting your sovereignty.
```

## Onboarding Flow (Technical)

```
STEP 1: IDENTITY REGISTRATION
  Creator provides: legal name, display name, email
  System creates: creator record (status: active)
  System creates: HVS record (sovereignty_status: claimed)

STEP 2: VOICE ENROLLMENT
  Creator provides: voice sample(s) for fingerprinting
  System creates: Voice Estate record
    - acoustic_fingerprint: SHA-256 hash of voice spectral data
    - governance_json: creator_primary_control = true
    - delegates_json: [] (empty until configured)
    - heirs_json: [] (empty until configured)

STEP 3: CONSENT CONFIGURATION
  Creator defines: who can use their voice, for what, for how long
  System creates: NCP consent record(s)
    - Default: no consent granted (opt-in only)
    - Creator must explicitly authorize each claimant + scope

STEP 4: DASHBOARD ACCESS
  Creator sees:
    - Active consent records
    - Usage events (who used their voice, when, how)
    - Royalty events (earnings, payout status)
    - Revocation controls (one-click revoke)
    - Voice Estate status (delegates, heirs, governance)

STEP 5: ONGOING
  Creator can at any time:
    - Grant new consent (create NCP record)
    - Narrow existing consent (reduce scope)
    - Revoke consent (1-hour enforcement SLA)
    - Add delegates (authorized to manage on their behalf)
    - Designate heirs (voice estate succession)
    - View full audit trail
```

## Dashboard Prompt

Insert before creator dashboard interactions:

```
You are viewing your NOIZYVOX Creator Dashboard.

Everything here is YOUR data. You own it. You control it.

Active controls:
- CONSENT: See who has permission to use your voice. Revoke any time.
- EARNINGS: Real-time royalty tracking. 75% of all revenue is yours.
- USAGE: Every time your voice is used, it's logged here.
- ESTATE: Configure delegates, heirs, and governance rules.
- AUDIT: Full history of every action touching your voice.

If anything looks wrong, you can revoke consent instantly.
Enforcement happens within 1 hour across the entire network.
```

---

**Version:** 2.0
**Author:** Robert Stephen Plowman (RSP_001) — rsp@noizyfish.com
