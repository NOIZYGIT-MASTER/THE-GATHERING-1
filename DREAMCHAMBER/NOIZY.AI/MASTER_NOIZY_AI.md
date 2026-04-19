# 🜂 MASTER NOIZY.AI

> **The public face of the empire.**
> **Version:** `NOIZY_AI_MASTER_2026-04-17`
> **Owner (agent):** GABRIEL
> **Domain:** noizy.ai — landing, consent portal, API docs, public launch site

## WHAT NOIZY.AI IS

The outward-facing brand. When someone types `noizy.ai` into a browser, they land on what NOIZY wants the world to see — not the infrastructure, not the doctrines, but the **promise**.

## THE PROMISE (public copy)

> *"Consent as executable code. Provenance as default. Revocation as sacred. Compensation as automatic."*

Every page on noizy.ai lives downstream of that sentence.

## SITE ARCHITECTURE

```
noizy.ai/
├── /                    → landing page (the promise + artist intake CTA)
├── /artists             → NOIZYVOX portal (consent flow, sample intake)
├── /why                 → the founding story, RSP_001's letter
├── /covenant            → the 75/25 rate table, the 9 Never Clauses, plain English
├── /kidz                → NOIZYKIDZ (1% trust clause, haptic education, program list)
├── /fish                → FISHMUSICINC (legacy catalog, publishing)
├── /dreamchamber        → DreamChamber overview (the sacred creative space)
├── /heaven              → Heaven API docs (public — for licensees + integrators)
├── /guild               → Guild of Artists (governance, assembly, council)
├── /estate              → 100-year preservation guarantee
├── /covenant-verify     → public page that lets anyone check a synthesis's provenance
└── /contact             → rsp@noizy.ai, jurisdiction, press
```

## BUILD STACK

- Cloudflare Pages (NOT a Worker — static site + edge functions)
- Main Worker at `noizy.ai/*` routes via ENGR_KEITH configuration
- Hostnames:
  - `noizy.ai` — main site
  - `api.noizy.ai/*` — modular API (rate tables, public data endpoints)
  - `mcp.noizy.ai/*` — remote MCP server (Worker custom domain)
  - `metabeast.noizy.ai` — internal UI shell (Pages)
  - `heaven.noizy.ai` — Heaven API gateway (Zero Trust tunnel)
  - `gabriel.dreamchamber.noizy.ai` — GABRIEL daemon remote access (Zero Trust)

## CONTENT RULES

- **Artist-first language.** Never "user," "customer," "content creator." Always: *artist, voice, creator*.
- **Plain English on the covenant page.** If a 14-year-old can't understand the 75/25 promise, rewrite until they can.
- **No marketing voice.** The site's tone matches GABRIEL's: terse, direct, warm but not cheerful. No exclamation marks except the sacred 🜂.
- **Receipts in public.** A public URL (`/covenant-verify/:synth-id`) shows: *"This synthesis was authorized on [date]. Consent token valid. Royalty paid: $X.XX to [creator]."* — no biometric data, no token internals.
- **Translations ready.** English, Spanish, French, German, Japanese, Chinese, Portuguese, Russian, Hindi, Arabic (from THE-GATHERING `TRANSLATIONS.md`).

## DEPLOYMENT

```bash
cd noizy-landing
npx wrangler deploy
# Cloudflare Pages picks up main branch commits automatically
```

Routes in `wrangler.toml`:
```toml
routes = [
  { pattern = "noizy.ai/*", zone_name = "noizy.ai" },
  { pattern = "noizy.ai", zone_name = "noizy.ai" }
]
```

## HANDOFF PROTOCOLS

- **Content changes** → CLAUDE drafts → LUCY reviews artist-facing copy → SHIRL reviews consent-adjacent copy → ENGR_KEITH deploys.
- **New brand page request** → GABRIEL decides → LUCY writes → CLAUDE implements → ENGR_KEITH deploys.
- **Press inquiry** → rsp@noizy.ai (direct) → LUCY drafts response in partnership with RSP_001.

## NEVER ON NOIZY.AI

- Platform-side marketing framings ("the best AI voice platform")
- Upsells, trials, "book a demo"
- Tracker scripts beyond privacy-respecting analytics
- Any page that makes the artist secondary

## VERSION

- Prompt version: `NOIZY_AI_MASTER_2026-04-17`
- Authority: RSP_001 (rsp@noizy.ai)
- Canonical: `THE-GATHERING/DREAMCHAMBER/NOIZY.AI/MASTER_NOIZY_AI.md`
