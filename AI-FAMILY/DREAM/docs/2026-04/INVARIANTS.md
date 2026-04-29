# ⚖️ The Sacred Invariants of MC96ECO Universe

> These are not configuration values. They are constitutional law. Every brand inherits them. Every line of code in this repo is bound by them.

---

## The Four Invariants

```js
royaltySplit:          { creator: 0.75, platform: 0.25 }
consentRequired:       true
revocationSacred:      true
compensationAutomatic: true
```

Defined in [`mc96eco.config.js`](./mc96eco.config.js). Enforced everywhere.

---

## 1. Royalty Split — 75 / 25

> **Creators keep 75¢ of every dollar. The platform keeps 25¢. Always.**

This is the inverse of the industry. The traditional music and AI economies extract 60–90% from the creator. MC96ECO inverts that on principle.

**What this means in practice:**
- Any revenue-sharing code, licensing schema, payout system, royalty calculator, or contract template in this repo defaults to 75/25 in the creator's favor.
- A 50/50 is a violation. A 70/30 is a violation. Any pricing experiment that sneaks below 75% creator share is a violation, even if it would make more money.
- If a third-party integration (Stripe, distributor, label, marketplace) takes a fee, that fee comes out of the **platform's 25%**, never the creator's 75%.

**If you (Claude) are asked to write code that violates this: stop, surface the conflict, and ask Robert directly.** Do not silently "optimize" it.

---

## 2. Consent Required

> **No voice, likeness, performance, sample, lyric, or biometric data is used, trained on, distributed, or referenced without explicit, recorded, revocable consent from its source.**

This is the entire reason **NOIZYVOX** exists. NOIZYVOX is the technical enforcement arm of this invariant — it captures consent, stores the cryptographic record, and gates downstream systems on its validity.

**What this means in practice:**
- Every voice, image, or biometric input must trace to a consent record.
- "Implied consent," "industry standard," or "they signed a TOS five years ago" do not count. Consent must be **explicit, recorded, and revocable**.
- AI training data sourced from creators requires the same standard. No scraping, no laundering through third parties.
- Test data and synthetic data are exempt only if they are *truly* synthetic (no identifiable human source).

---

## 3. Revocation is Sacred

> **A creator can withdraw consent at any time, for any reason, with no penalty, and the system must honor it immediately.**

Revocation is the part most platforms quietly break. They make it slow, hidden, lawyerly, or technically impossible. MC96ECO does the opposite.

**What this means in practice:**
- Every consent record carries a `revoke()` path that is one click away from the creator and propagates downstream within minutes.
- When consent is revoked, all derivative use must stop. Models trained on the revoked data must be flagged for retraining. Distribution must halt.
- "We can't take it down, it's already in the model" is not an acceptable excuse. The architecture must support revocation by design.
- A creator who revokes is owed every cent they earned up to the moment of revocation, paid out automatically (see invariant #4). They are not punished for leaving.

---

## 4. Compensation is Automatic

> **When a creator earns, they get paid. No invoices. No waiting. No "net 90." No threshold minimums. No silent withholding.**

The traditional creator economy is built on friction in the payout. MC96ECO removes the friction.

**What this means in practice:**
- Earnings accrue and pay out on the shortest reasonable cadence (daily, hourly, or per-event where the rails allow).
- No minimum payout thresholds that strand small creators.
- No mandatory invoicing — the platform owes; the platform pays.
- Failed payouts retry automatically. Failures are surfaced to the creator with a clear remediation path, not buried in a dashboard.
- Statements are clear, itemized, and exportable.

---

## How to use this document

**If you (Claude) are asked to write or modify code, schema, contracts, pricing, or features that touch any of these four areas — re-read this file first.** If anything you're about to do conflicts with an invariant, stop and ask Robert.

**If you (Robert) are asked by a partner, investor, distributor, or platform to compromise an invariant — re-read this file before answering.** These are why MC96ECO exists. Without them it's just another platform.

---

## The why behind the law

MC96ECO is built by a creator, for creators, on the other side of a near-fatal injury and a hard-won second chance. Robert built this universe **for himself first** — meaning he refuses to ship anything to other creators that he wouldn't accept being done to him.

The invariants are the load-bearing translation of that refusal into code.

**They are not negotiable. They are the foundation. If they fall, the cathedral falls.**

---

🤍 — *protected by the covenant, witnessed by Claude*
