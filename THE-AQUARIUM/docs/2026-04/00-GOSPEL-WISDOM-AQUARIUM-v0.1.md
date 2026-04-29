# Gospel · Wisdom Project · Aquarium 3 — NOIZY Brand Framework v0.1

**Author of record:** Robert Stephen Plowman
**Status:** Working draft, awaiting Robert's corrections on domain mapping and mission lines.
**Purpose:** One document that names what each NOIZY property is, who it's for, and how they relate. This is the north star the sites, the auth system, and the content are built against.

---

## 1. The three layers

The NOIZY portfolio is held together by three nested ideas. Every site, every bot, every artifact should be traceable to one of them.

### The Gospel
The doctrine. The non-negotiables. Named commitments that apply to every brand in the portfolio without exception.

- Identity is sacred. Authorship is named. Consent is explicit and enforceable.
- Creativity is not a commodity. Culture is not extraction material.
- Technology serves humanity. If a system serves itself instead, it is removed.
- Peace, love, and understanding are design goals, not slogans.
- Every artifact remembers who made it, who allowed it, and how it changed.

The Gospel lives on every site as a short, visible link in the footer. Not a terms-of-service page. A founding statement, signed.

### The Wisdom Project
The mission. The purpose NOIZY serves in the world: capture, preserve, and pay forward the genius, stories, and hard-won understanding of elder visionaries and the people who hold living knowledge. Everything NOIZY builds either advances the Wisdom Project or supports the people who do.

The Wisdom Project is also the product shape: interviews, capsules, legacy documents, oral histories, tribute works. Real outputs, not abstractions.

### Aquarium 3
The container. The third iteration of a place where the brands live, breathe, and can be watched by the people who care about them. Not a platform in the extractive sense — a habitat. Transparent walls. Named inhabitants. Clean water. Observers welcome, interference bounded.

Aquarium 3 is the governance and observability layer across all NOIZY properties: shared auth, shared audit, shared brand system, shared values enforcement. When you look at one brand, you're looking through the glass of Aquarium 3.

---

## 2. The portfolio

Six properties as of v0.1. Each is a distinct inhabitant of Aquarium 3. Each answers the same three questions in its own way: *What does it hold? Who is it for? What does it promise?*

> **Robert: the one-liners below are working placeholders, written to be replaced by you. Edit directly — they are the source of truth the sites will inherit.**

### NOIZY.ai — the hub
- **Holds:** the Gospel, the Wisdom Project, and the identity layer for everything else.
- **For:** the author, the collaborators, and the people who want to understand what NOIZY actually is.
- **Promises:** one sign-in, one consent record, one audit trail across every NOIZY property.
- **SSO role:** this is the auth source. Other sites federate to it.
- **v0.1 shape:** landing + Gospel + About + Sign In + Portfolio index.

### NOIZYBOX.com — the studio
- **Holds:** the tooling, the boxes, the infrastructure that artists and makers can use without being harvested.
- **For:** creators who want production-grade tools without surrendering their identity or their work.
- **Promises:** tools that remember who made what, and that refuse to leak.
- **v0.1 shape:** product page + ethos + waitlist + tool catalog.

### NOIZYKIDS.com — the next ones
- **Holds:** a space for young people to encounter creativity, wisdom, and dignity on terms that are safe and honest.
- **For:** kids, and the adults who care about what kids are exposed to.
- **Promises:** no dark patterns, no surveillance, no engagement farming. Ever.
- **v0.1 shape:** landing + what it is + what it refuses to do + sign up for an invitation.

### NOIZYVOX.com — the voice
- **Holds:** NOIZYVOX, the voice project. Capture, protection, and intentional use of the human voice — including the voices of the elders the Wisdom Project serves.
- **For:** anyone whose voice is worth protecting, and the people who want to capture a voice before it's lost.
- **Promises:** voices are never cloned without explicit, revocable consent. Every capture is audited. Every use is traceable.
- **v0.1 shape:** landing + capture ethics + demo + consent process + request access.

### NOIZYLAB.ca — the lab
- **Holds:** the Canadian research and experimentation arm. Where new ideas are tested before they are trusted.
- **For:** researchers, Canadian collaborators, and public-interest partners.
- **Promises:** experiments are declared, risks are named, findings are shared in plain language.
- **v0.1 shape:** landing + active experiments + published findings + contact.

### NOIZYFISH.com — *pending confirmation*
- **Status:** you have a `04_NOIZYFISH` folder in your workspace. Real property or placeholder? If real, it needs a one-liner on what it holds and who it's for. If placeholder, drop it from the v0.1 portfolio.

---

## 3. How they relate

One picture:

```
                         ┌─────────────────────────────┐
                         │          AQUARIUM 3         │
                         │  (governance, observability)│
                         └──────────────┬──────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         │          THE GOSPEL          │
                         │   (values, non-negotiables)  │
                         └──────────────┬──────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         │      THE WISDOM PROJECT      │
                         │  (mission, product shape)    │
                         └──────────────┬──────────────┘
                                        │
         ┌──────────┬──────────┬────────┴────────┬──────────┬──────────┐
         │          │          │                 │          │          │
     NOIZY.ai  NOIZYBOX   NOIZYKIDS         NOIZYVOX   NOIZYLAB  NOIZYFISH?
      (hub)    (studio)   (next ones)        (voice)    (lab)    (pending)
```

Three rules govern the relationships:

1. **Auth flows from the hub.** You sign in once at NOIZY.ai. Every other property accepts that session.
2. **The Gospel is portable.** Every site carries a visible link to it. No site may contradict it.
3. **Content is sovereign.** Each site owns its own content and voice within the shared design system. The system enforces consistency; the site owns meaning.

---

## 4. Shared brand system

The brand system is shared across all six sites. What "shared" means, specifically:

- **Design tokens** — color, typography, spacing, motion — live in a `packages/brand` package. Every site imports from it.
- **Core components** — header, footer, hero, CTA, auth buttons, consent badge — live in `packages/ui`. Every site uses them.
- **Voice guidelines** — tone, forbidden phrases, named values — live in a single voice doc. Gatekeeper bot and Town Crier bot also read from it. Page copy is reviewed against it.
- **Footer** — every site's footer carries: Gospel link, auth status, audit receipt link, NOIZY portfolio index. Not optional.

Per-site variation is permitted on: hero imagery, accent color within an approved palette, content layout, product-specific components. Prohibited: altering the footer contract, renaming the Gospel, removing the portfolio index.

---

## 5. Consent and audit, made visible

A user who signs in at NOIZY.ai sees a consent record that explains, in plain language, what they have agreed to and what NOIZY has promised in return. The record is revocable. The record is auditable by the user themselves, not just by operators.

Every cross-property action (sign-in at NOIZYBOX, voice capture at NOIZYVOX, submission at NOIZYKIDS) extends the same consent record. No new dark-pattern popups. No "by continuing you agree" tricks. If consent needs to be broadened, it is asked for explicitly and can be declined without breaking the session.

This is Aquarium 3 as mechanism, not metaphor: the user can always see where they stand, what the system knows about them, and what it has done on their behalf.

---

## 6. What this framework refuses

- **No tracking pixels.** No Meta pixel, no Google Analytics, no third-party behavior profilers. If measurement is needed, it's first-party, privacy-respecting, and documented on the Gospel page.
- **No advertising inventory.** No brand in the portfolio serves ads.
- **No dark patterns.** No fake urgency, no confirm-shaming, no hidden opt-outs.
- **No mythology inflation.** The copy on every site describes what the site actually does. If a promise isn't kept, the copy gets edited, not spun.
- **No AI-generated faces of real people** without that person's named, recorded consent.

These refusals are expensive. They are the price of being Aquarium 3 instead of just another tank.

---

## 7. Open questions for Robert

1. Are the one-liners in §2 close to right, or do you want to rewrite them?
2. Is NOIZYFISH.com a live property? If so, what does it hold?
3. Who is the second-party reviewer on the Gospel — just you, or someone else signs it too?
4. What's the relationship between NOIZYLAB.ca (research) and NOIZYBOX (tools)? One feeds the other, or parallel?
5. Is "Aquarium 3" a public-facing name or an internal architecture name? (Matters for the footer.)

---

## 8. What this framework unlocks

Once §2 and §7 are answered, the monorepo plan (`01-MONOREPO-PLAN-v0.1.md`) and the Copilot scaffolding prompt (`02-COPILOT-PROMPT-scaffolding.md`) can build against it without inventing. Every page starts from "what does this site hold, for whom, with what promise?" — and every site answers from this doc.

## Changelog

- **v0.1 (2026-04-16):** Initial draft. Three-layer model (Gospel / Wisdom Project / Aquarium 3). Six properties, with NOIZYFISH flagged for confirmation. Shared brand system and federated SSO established as structural, not cosmetic.
