# C2PA Audio Layer Outreach — Leonard Rosenthol

**TO:** Leonard Rosenthol, Adobe / C2PA Steering Committee  
**FROM:** Robert Stephen Plowman (MC96ECO), NOIZYFISH INC. / NOIZYVOX  
**DATE:** March 30, 2026  
**RE:** C2PA Audio Manifest Type Submission + Reference Implementation

---

## Opening

Leonard,

We are building the first AI voice consent protocol that runs at the synthesis point — not after. Every AI-generated voice output is cryptographically bound to a machine-readable consent token. No token, no output. The violation becomes architecturally impossible instead of just legally actionable.

We are submitting the Noizy Consent Protocol (NCP v1.0) as a C2PA assertion type and want NOIZYVOX to serve as the reference implementation in the C2PA audio layer specification.

---

## The Technical Proposal

**NCP v1.0 Assertion Type:**
- **Scope:** Defines which use cases are authorized for a particular voice or performance
- **Territory:** Geographic boundaries (e.g., "US only", "EU prohibited")
- **Revocation triggers:** Conditions under which the creator can revoke consent (with 1-hour enforcement SLA)
- **Never Clauses:** 9 hardcoded prohibitions that cannot be overridden by anyone, including the creator
  - Never use for political campaigns
  - Never use for adult content
  - Never use for deepfake/fraud
  - [6 others, architecture-enforced]
- **Audit chain:** Every synthesis event logs actor, timestamp, approved use case, and outcome
- **Enforcement:** Consent check happens *before* synthesis, not after

**Format:** JSON assertion bound to C2PA manifest, signed with creator's key, verified at synthesis time.

**Integration point:** Any voice AI system (ElevenLabs, Descript, custom) that wants to respect creator consent can call the NOIZYVOX gateway (`/verify`) with the consent token. Response: `{approved: true}` or `{approved: false, reason: "..."}`. One line of code.

---

## Why This Matters for C2PA

1. **Closes the consent gap:** C2PA proves provenance (who made this, with what model). NCP proves *authorization* (the creator gave permission). Together they're the full story.

2. **Precedent for AI audio:** Every AI voice product will need consent infrastructure. This spec makes that infrastructure standardized, interoperable, and verified.

3. **Regulatory alignment:** The NO FAKES Act (US) and EU AI Act both require "consent from the voice owner." This is how you verify it technically.

4. **Reduces liability:** Companies that use NCP + C2PA can demonstrate they made every reasonable effort to enforce consent. That's a legal defense.

---

## What Exists Right Now

- **NCP v1.0 spec:** Complete, 12-page technical document, ready to submit
- **Reference implementation:** NOIZYVOX consent gateway, live on Cloudflare Workers + D1, handling real voice requests
- **Test data:** RSP_001 (the author) is the first creator in the system, with full consent matrix and revocation rights
- **Audit trail:** Every synthesis request logged with creator approval/denial
- **Stripe integration:** Royalty payments routed 75% creator / 25% platform, automatic and immutable

---

## The Ask

1. **Formal C2PA assessment:** Review NCP v1.0 and determine if it qualifies as an assertion type in the audio layer spec
2. **Reference implementation review:** Evaluate NOIZYVOX as a reference for C2PA audio compliance
3. **Co-authored specification:** If alignment exists, co-author the C2PA audio manifest spec with NCP as the consent layer
4. **Steering committee discussion:** Present to C2PA steering committee as standard for AI voice authorization

**Timeline:** We need steering committee acknowledgment by Q2 2026 for policy brief submission (EU AI Act alignment window).

---

## Why You Should Care

The voice AI market is going to be $161B by 2034. Right now it's a legal and ethical minefield — lots of voices being synthesized without creator knowledge or payment.

You invented the manifest layer to prove provenance. We're building the permission layer to prove authorization. Together, we make AI voice audio legally real and ethically sound.

The author of this message is RSP_001: the first voice actor in the NOIZYVOX system. My consent is live, my revocation rights are real, my royalties are routing. We're not proposing theory. We're shipping truth.

---

## Next Steps

1. Send you the full NCP v1.0 technical specification (attached / link)
2. Schedule 30-min technical review call
3. If aligned, draft joint submission to C2PA steering committee

---

## Contact

**Robert Stephen Plowman**  
MC96ECO / NOIZYFISH INC. / NOIZYVOX  
rsp@noizyfish.com  
noizy.ai  

---

*"The creator owns themselves. Always. Full stop."*  
*NOIZYVOX — Constitutional Infrastructure for Human Creativity*
