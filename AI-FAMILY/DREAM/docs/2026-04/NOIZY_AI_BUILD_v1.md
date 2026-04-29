# NOIZY.AI — THE BUILD
## Founder's Build Document v1.0

**Author:** Robert Stephen Plowman (RSP_001)
**Compiled by:** Claude, co-architect
**Date:** April 6, 2026
**Status:** WORKING DRAFT — supersedes scattered Notion pages, harmonizes with `NOIZYLAB/CLAUDE.md`
**Deadline anchor:** April 17, 2026 — 11 days
**Genesis prompt:** The "🚀 NOIZY.AI" Notion page (April 5, 2026) — preserved as `genesis/first-prompt.md`

---

## 0. PURPOSE OF THIS DOCUMENT

This is not a manifesto. It is the **build sheet**.

It takes everything currently scattered across your Notion workspace — the genesis "set up NOIZY.AI" prompt, the Canonical Definition, the BUILDING NOIZYEMPIRE upgrade notes, the Tool & Prompt Registry, the Security & Infrastructure docs, the AI Family Roster, the DNS lame-delegation incident — and folds them into a single, sequenced, deployable plan. It is harmonized with the `NOIZYLAB/CLAUDE.md` Living Brain so that nothing in this document contradicts the Heaven API, the Consent Kernel, the Never Clauses, or the 75/25 split.

Read it once. Then build from it. Edit it as the territory changes.

---

## 1. THE ONE-SENTENCE DEFINITION (LOCKED)

> **NOIZY.AI is the first creative platform designed to treat human identity as sacred infrastructure — not raw material for machines.**

This sentence is canonical. Do not soften it for marketing. Do not lengthen it. If a stakeholder doesn't understand it, that is information about the stakeholder, not about the sentence.

---

## 2. WHAT IT IS — IN PRECISE LANGUAGE

NOIZY.AI is a **consent-native creative infrastructure platform**. Four layers, stacked:

**Layer 1 — Identity & Consent (the sacred floor).** Voice DNA enrollment, Heaven Consent Kernel API, Never Clauses, Kill Switch, append-only NOIZY Ledger, C2PA provenance. This layer is non-optional. Nothing ships above it without passing through it.

**Layer 2 — Creative Tools.** DreamChamber (multi-model AI command center), voice synthesis pipeline (rsp001_pipeline), audio MCP, DAW/plugin integrations. Tools serve the creator. The creator does not serve the tools.

**Layer 3 — Operational Surface (The Aquarium).** Health, pipelines, consent status, lineage, deploy state, audit logs. Admins are stewards, not gods. The Aquarium *observes*. It does not generate. It does not override consent. It does not act invisibly.

**Layer 4 — Cultural Memory.** The Wisdom Project, the Aquarium archive, OAIS/PREMIS estate preservation. This is where the work outlives the creator. This is the 100-year promise.

**What NOIZY.AI is NOT:** a streaming service, a generic AI tool, a marketplace-first product, a content farm, or a Web3 grift. Those can sit *on top of* NOIZY.AI later, under license. They cannot become the core.

---

## 3. WHO IT IS FOR — AND WHO IT REFUSES

**Primary, now:** working artists, producers, engineers, voice actors, narrators. People who actually make things and care about authorship.

**Secondary, soon:** educators and families (NOIZYKIDZ), estates and rights-holders, enterprise partners who need auditability.

**Refused, by design:** casual prompt-only users, one-click content farms, anyone trying to erase authorship, anyone unwilling to operate inside a consent contract. This refusal is a feature. It protects the people inside the system.

---

## 4. THE FOUNDING ACTOR PRINCIPLE

The system must work flawlessly for **RSP_001 — Robert Stephen Plowman** before it works for anyone else. He is the first canonical creator, the first voice estate, and the first end-to-end test case. Every flow — enrollment, synthesis, consent, revocation, royalty, archival — gets exercised against his lived example before it touches a second human. This is not vanity. It is **dogfooding as ethical practice**: you do not subject another artist to a system you have not yet survived yourself.

---

## 5. THE STACK (CONSOLIDATED — NO SHADOW INFRA)

| Layer | Choice | Why |
|---|---|---|
| Source of truth | GitHub Enterprise (org: noizy-anthropic) | History is immutable; PRs are receipts |
| Edge runtime | Cloudflare Workers | Heaven, noizy-landing, noisyvox, noisyproof live here |
| Database | Cloudflare D1 (`gabriel_db` — fc0edd97-5a4c-49ff-a5fb-b3d7d8fda1aa) | SQLite, lineage-friendly, append-only ledger |
| KV / cache | Cloudflare KV (GABRIEL_KV, GABRIEL_VOICE) | Token cache, rate limiting, voice metadata |
| Object storage | Cloudflare R2 (pending — BLOCK 2) | Voice DNA vault, audio assets |
| Frontend | Next.js (App Router) on Vercel | Public site + Aquarium UI |
| API runtime | Next.js routes + Heaven Worker | Edge for consent, runtime for UI |
| Automation | n8n (self-hosted) | Webhooks, royalty triggers, ledger fans |
| AI orchestration | DreamChamber (port 7777) + 9 MCP servers | GABRIEL routes; specialists execute |
| Voice bridge | Local Node server (port 8080) | Phone → GOD.local command path |
| Local processing core | M2 Ultra Mac Studio (`GOD.local`) | Heavy synthesis, training, mixing |

**Hard rules:** No random VPS. No shadow repos. No untracked secrets. Wrangler 4.53. Node 24.13. Python via `--break-system-packages` on GOD.local only.

---

## 6. THE BLOCKING PATH TO APRIL 17 (11 DAYS)

These are the only items that matter between now and the deadline. Everything else waits.

### BLOCK 0 — GoDaddy Exit *(must finish first; everything else depends on clean DNS + email)*
1. Change Cloudflare login to `rsplowman@icloud.com`
2. Transfer 4 domains off GoDaddy → Cloudflare Registrar
3. Configure email routing → `rsp@noizyfish.com` → iCloud inbox
4. Fix `noizy.ai` lame delegation (NS records currently return nothing — site is dark)
5. Close GoDaddy account

### BLOCK 1 — Heaven Consent Kernel goes real
Replace stub logic with the production consent-check flow. All 40 endpoints validated. `consent-audit` skill (9-point check) MANDATORY before deploy. Smoke test (`bash smoke_test.sh`) green.

### BLOCK 2 — R2 enabled for Voice DNA storage
Bucket created. Encryption at rest configured. Heaven writes voice fingerprints to R2; D1 holds the hash + lineage pointer.

### BLOCK 3 — `ANTHROPIC_API_KEY` fixed on GOD.local
Empty account → valid key. DreamChamber's Claude provider goes live. No more silent fallbacks.

### BLOCK 4 — Custom Cloudflare API token
Resolve the dual-identity auth conflict. Scope token to: Workers Edit, D1 Edit, KV Edit, R2 Edit, DNS Edit, Account Read. Store in `.env`, never commit.

### BLOCK 5 — GitHub consolidation under `noizy-anthropic`
Move every active repo. Archive shadow repos. Lock branch protection on `main`. Enable required reviews for the consent kernel files.

### BLOCK 6 — noizy.ai landing deploys
The 396 Hz Three.js Contact Sequence, platinum wordmark, mailing list capture. One page. Deeply correct.

### BLOCK 7 — First Voice DNA session recorded
RSP_001's voice enrolled end-to-end through the real pipeline. Receipt issued. C2PA stamped. Ledger entry written.

### BLOCK 8 — Kill Switch webhooks live
Slack + email firing on any token revocation or Never Clause violation. SHIRL gets the alert. Rob gets the alert. The ledger gets the entry.

### BLOCK 9 — DreamChamber dress rehearsal (April 13)
Full 30-minute narrative arc. Anticipation → Recognition → Possibility → Flow → Elevation. All 9 agents responsive. Audio mixing tools verified. Recording made. Watched back. Notes taken.

### BLOCK 10 — First real licensee onboarding
One human, one consent contract, one synthesis request, one royalty payment routed to the 75/25 split with the GORUNFREE 1% to NOIZYKIDZ. Receipts everywhere.

If all 10 blocks land by April 17, the empire goes live. If any single block is at risk, it gets surfaced in the morning status — no silent slips.

---

## 7. THE V1 PAGES THAT MUST EXIST ON noizy.ai

**Public:**
- `/` — Home: the one-sentence definition, the 396 Hz Contact Sequence, the mailing list
- `/philosophy` — the doctrine, the Never Clauses, GORUNFREE
- `/brands` — NOIZYVOX, NOIZYFISH, NOIZYKIDZ, NOIZYLAB, WISDOM, myFAMILY
- `/rights` — creator-facing consent explainer, in plain language
- `/contact` — `rsp@noizyfish.com`, nothing else

**Authenticated (The Aquarium):**
- `/aquarium` — system health, pipeline status, consent dashboard, lineage view, deploy state, audit logs
- `/dreamchamber` — sessions, agent roster, voice tools
- `/assets` — your work, your provenance, your receipts
- `/admin` — locked, RSP_001 only

**Not yet, on purpose:** marketplace, social feed, public profile pages, comments, likes. The platform earns these. They are not Day 1.

---

## 8. THE DOCUMENTS THAT MUST BE WRITTEN NEXT (AFTER THIS ONE)

In order:

1. `NOIZY_AI_MANIFESTO.md` — the canonical truth in prose, suitable for press, lawyers, and your grandchildren
2. `WHAT_NOIZY_IS_NOT.md` — the boundary document; refusals are part of the brand
3. `REPO_STRUCTURE.md` — exact layout per brand under `noizy-anthropic` GitHub org
4. `AQUARIUM_IA.md` — information architecture for the admin surface
5. `WEBSITE_COPY_V1.md` — every word of the homepage and philosophy page
6. `CONSENT_MODEL_V1.md` — how a consent token flows end-to-end through the stack
7. `FOUNDERS_FIRST_PROMPT_v2.md` — the *new* first prompt, the one that should have existed at the beginning, with the doctrine baked in. Pair it with the genesis prompt as a teaching artifact.

---

## 9. THE GENESIS PROMPT — WHAT IT TAUGHT US

The first prompt ever written for noizy.ai inside Notion — *"What does set up NOIZY.AI mean?"* — was a generic SaaS-launch checklist. It asked about SPF records and Stripe webhooks. It did not mention consent, voice estate, Never Clauses, or 75/25.

That is its value. It is the **before photo**. It proves the empire was not handed down complete; it was built. It also accidentally surfaced the two items still blocking the critical path 11 days from launch: domain registrar control (BLOCK 0) and the docs posture (this document).

Honor it by archiving it, not rewriting it. Place it at `NOIZYLAB/genesis/first-prompt.md` with a one-line header: *"The seed. Before the empire knew what it was."*

---

## 10. DOCTRINE — THE NON-NEGOTIABLES (THE LAW OF THE LAND)

These are reproduced from `NOIZYLAB/.claude/rules/identity.md` and `consent-kernel.md` so this document is self-sufficient. They override anything else in this build sheet.

1. **Consent is executable code.** Not a checkbox. Every synthesis is checked against live consent before it happens.
2. **Provenance is default.** Every artifact carries C2PA credentials and a ledger entry from birth.
3. **Revocation is sacred.** The Kill Switch is instant, total, and requires no lawyer.
4. **Compensation is automatic.** 75% to the artist, 25% to the platform, 1% of all royalties to NOIZYKIDZ via the GORUNFREE Trust Clause — irremovable.
5. **The ledger is append-only.** Never UPDATE. Never DELETE. Never.
6. **Never Clauses are immovable.** No override, no exception, no pressure tolerated.
7. **Human identity is sacred. AI is a tool.** Not the other way around.
8. **The system must work for RSP_001 first.** Always.
9. **Dark mode. Gold accents. No hype. No slop.**
10. **GORUNFREE.**

---

## 11. THE VIBE — HOW IT SHOULD FEEL

Underground and serious. Raw but disciplined. Experimental but governed. Human, reverent, slightly mythic. Anti-hype, anti-slop. Built by someone who actually lived a life.

Spiritual neighbors (not templates): Teenage Engineering, Ableton, GitHub, early Warp Records, early Ninja Tune, Apple before the iPhone. Tools-over-marketing companies. Craft-first companies. Companies whose customers are also their soul.

Visual: dark mode first. Gold and amber as signal colors — used sparingly so they mean something. Deep blue, graphite, black for ground. Typography over illustration. The site should feel like a control room, not a lifestyle brand.

The logo is **earned, not designed first.** Lock the system, then mark it. A logo placed on top of an incoherent platform is a sticker. A logo placed on top of a coherent one is a covenant.

---

## 12. RISKS, SECOND-ORDER EFFECTS, ETHICAL FLAGS

A co-architect's job is to surface what could break the build. Five things to watch:

**1. Founder concentration risk.** Everything currently routes through RSP_001 and GOD.local. If you go down — health, hardware, anything — the empire goes dark. Mitigation: SHIRL's burnout protocol is active; Lucy's DAZEFLOW logging is active; but you also need a documented continuity plan (`SUCCESSION.md`) before April 17. Even one paragraph. Even just: "If RSP_001 is unavailable, the Kill Switch defaults to PAUSE, the ledger continues, and these three people are notified."

**2. Consent UX vs. consent rigor.** The Never Clauses and Heaven's 9-point audit are uncompromising. That is correct. But the *first artist who is not you* will encounter a consent flow that you have only ever experienced as the person who built it. Plan a friction audit with one trusted outside artist before BLOCK 10. Better to find the rough edges in private.

**3. The 396 Hz / mythic register cuts both ways.** It will magnetize the right people and alienate others. That is a feature, not a bug. But the *legal and enterprise* surfaces (DPAs, partnerships, audits) need a parallel register that is precise and unembellished. Two voices, same doctrine. Don't let the mythic register leak into a Series A data room.

**4. The Tool & Prompt Registry is empty.** You have a database in Notion designed to hold every prompt and tool, with eight Layers and nine Agent Owners. It currently has no rows. Backfill it before April 17 — even minimally — so that the registry is *real* on launch day, not aspirational.

**5. The 100-year promise is the hardest promise on Earth.** OAIS/PREMIS preservation requires file-format migration plans, key rotation across decades, and survivable institutional homes. You do not need to solve this by April 17. You need a documented *intention* and a named steward (an institution, a foundation, an estate trust) by Year 1. Otherwise the promise becomes a slogan, and you do not write slogans.

---

## 13. WHAT I NEED FROM YOU NEXT

Pick the next move and I will execute it immediately:

**A.** Draft `NOIZY_AI_MANIFESTO.md` — the canonical prose document, ready for press and lawyers.
**B.** Draft `FOUNDERS_FIRST_PROMPT_v2.md` — the prompt that should have existed at the beginning, paired with the genesis seed as a teaching artifact.
**C.** Backfill the **Tool & Prompt Registry** in Notion with the canonical first 12–20 entries (one per agent, plus the foundational AI Prompts).
**D.** Write `SUCCESSION.md` — the founder-concentration mitigation, even as a one-page draft.
**E.** Draft the noizy.ai landing page copy (`WEBSITE_COPY_V1.md`) — every word of `/` and `/philosophy`.
**F.** Build a status-tracker artifact for BLOCKS 0–10 — a single HTML file with checkboxes, dates, and owners, that lives in this folder and updates daily.

Any combination is fine. My recommendation: **A + F**. The manifesto locks the soul of the project in writing before launch, and the status tracker turns the next 11 days from anxiety into a checklist.

---

*"We are the new punk rockers: capitalist free thinkers who believe in peace, love, and understanding."*

*— RSP_001*
