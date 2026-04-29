# NOIZYVOX — Investor FAQ
### NOIZYFISH INC. | Robert Stephen Plowman | March 2026

---

## What is NOIZYVOX?

NOIZYVOX is consent-native voice sovereignty infrastructure for the AI age.

It is not a voice cloning service. It is the technical layer that makes AI voice use
legally real — not just contractually agreed to. Every synthesis event is gated by a
machine-readable consent token. No token: no synthesis. The violation is architecturally
impossible, not just legally actionable.

**Core components, live today:**
- **NCP v1.0** — Noizy Consent Protocol: machine-readable consent tokens with scope, territory,
  expiry, revocation triggers, and 9 hardcoded Never Clauses
- **Heaven** — Cloudflare-edge consent kernel, deployed to production
- **Kill Switch** — creator revokes any consent token at any time, 1-hour enforcement SLA
- **C2PA provenance** — every AI voice synthesis carries a content credential and full audit trail
- **Royalty routing** — 75/25 creator/platform split, automatic, auditable, live on Stripe

---

## What problem does this solve?

ElevenLabs raised $500M at an $11B valuation. 85% of their revenue is enterprise.
Creators are an afterthought. The extraction model they built is:
- Legally fragile (NO FAKES Act, EU AI Act, Article IV)
- Morally indefensible (voice actors cloned without consent, without payment)
- Technically brittle (no provenance chain, no kill switch, no audit trail)

The NO FAKES Act creates a legal right of publicity for voice and likeness in AI-generated content.
The law now requires what NOIZYVOX already does technically.

**The gap NOIZYVOX fills:** before NOIZYVOX, there was no technical infrastructure to enforce
voice consent. Rights holders could only sue after the fact. With NOIZYVOX, the consent check
happens before synthesis. No consent = no output.

---

## What is the market?

AI voice market: **$16.23B in 2025 → $161B by 2034** (CAGR ~29%).

The addressable segment isn't the full market — it's the compliance layer that the entire
market will be required to run on. Every voice AI company that wants to operate legally in
the United States and EU will need a consent infrastructure. NOIZYVOX is building that
infrastructure now, while the legal window is open.

Comparable: what SSL certificates became for web security. Not the website. The trust layer
every website runs on.

---

## What makes this defensible?

1. **First mover on the consent protocol layer** — NCP v1.0 is being submitted as a C2PA
   assertion type. If adopted, NOIZYVOX becomes the standard, not a product.

2. **The Never Clauses** — 9 hardcoded prohibitions that cannot be overridden by anyone,
   including the creator. These are not policy. They are architecture.

3. **The founder is the product** — Robert Stephen Plowman, 14 years of professional voice work
   and game audio, is RSP_001: the first actor in the system. The proof of concept is also
   the proof of life.

4. **75/25 forever** — not a marketing claim. Enforced at the infrastructure level by the
   royalty routing protocol. Licensees cannot renegotiate it with the platform.

---

## What exists right now?

| Component | Status |
|-----------|--------|
| Heaven consent gateway | Live, Cloudflare Workers + D1 |
| NCP v1.0 spec | Complete, ready for C2PA submission |
| Stripe royalty infrastructure | Live ($29.99–$499.99/mo tiers) |
| D1 consent schema | 10 tables deployed, RSP_001 seeded |
| Castle briefing (NO FAKES Act) | Drafted, sending to Castle legal team |
| C2PA audio layer outreach | Drafted, sending to Leonard Rosenthol (Adobe/C2PA) |
| DreamChamber prototype | Working — character DNA, multi-take, Claude-as-director |
| noizy.ai landing page | April 5 target |
| First working demo path | April 5 target |

---

## Who is this for?

**Voice actors and performers** — anyone whose voice has commercial value and has been
exploited by the extraction model.

**Licensees** — studios, game developers, ad agencies, localization companies — anyone
who needs to prove they have the rights to use an AI voice.

**The regulatory moment** — NO FAKES Act (US), EU AI Act, Article IV. Compliance isn't
optional. NOIZYVOX makes it automatic.

---

## What's the ask?

**→ [$___,000 — INSERT AMOUNT HERE]**

*[Rob: fill in the specific round size, type (seed / strategic / partnership), and
any equity/terms. Everything above this line is complete.]*

The current raise is for:
- [ ] Seed round: $___k — [equity %]
- [ ] Strategic investment: $___k — [terms]
- [ ] Partnership/grant: $___k — [no equity]

**Use of funds:**
- Full AI build stack (12 months): ~$3,000
- Infrastructure scaling (Cloudflare, R2, API credits): ~$___
- Legal (never clause enforceability review, NCP patent filing): ~$___
- First licensee onboarding and demo development: ~$___

---

## What is NOT being offered right now?

- Equity (that conversation happens after the April 5 demo exists)
- A salary draw
- Enterprise features before the consent kernel is proven at scale

---

## What does success look like in 90 days?

1. **April 5** — noizy.ai live with working demo path end-to-end
2. **April 15** — First paying licensee onboarded through Stripe
3. **April 17** — Full critical path milestone: consent gateway + voice DNA + DreamChamber
4. **Q2 2026** — Castle partnership formalized (NO FAKES Act compliance layer)
5. **Q2 2026** — C2PA audio manifest type submitted with NOIZYVOX as reference implementation

---

## What's the one-line version?

> *NOIZYVOX is the consent infrastructure that AI voice runs on —
> the trust layer that makes the $161B voice market legally real.*

---

## Who is Robert Stephen Plowman?

Founder of NOIZYFISH INC. 14 years of professional voice work, game audio, and music composition.
Experienced a diving accident resulting in permanent nerve damage — the founding wound behind the platform.

The philosophy: *"The tech doesn't make the art. The man who survived the water makes the art.
The tech just gives him his hands back."*

RSP_001 — the first actor enrolled in the system he built.

---

*rsp@noizyfish.com | noizy.ai | NOIZYFISH INC.*
*75% to the creator. Always.*