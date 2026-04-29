# NOIZY Portfolio — Monorepo + SSO Plan v0.1

**Author of record:** Robert Stephen Plowman
**Status:** Working draft. Built against `00-GOSPEL-WISDOM-AQUARIUM-v0.1.md`. Not buildable until the open questions in the framework doc are answered.
**Stack decision (confirmed):** Next.js 15 on Cloudflare Pages + Workers, one monorepo, federated SSO from NOIZY.ai.
**Scope:** Architecture, package layout, auth flow, design system, deployment, and phased build for five-to-six production sites.

---

## 1. What this plan commits to

One monorepo. Many sites. One identity layer. One design system. Per-site sovereignty over content and meaning.

- **One repo.** `noizy-portfolio/`. Every property lives here. No per-site forks.
- **One identity.** Sign-in happens at NOIZY.ai. Every other property accepts the resulting session via signed cookies on a shared parent domain plus short-lived JWTs for API calls.
- **One design system.** Tokens, components, voice rules, footer contract — all in `packages/`. Sites consume. Sites do not fork.
- **One audit stream.** Every authenticated cross-property action writes to a shared, append-only audit sink.
- **Separation of deploys.** Each site is its own Cloudflare Pages project with its own custom domain. A deploy of NOIZYKIDS does not touch NOIZYBOX.

## 2. Repo layout

```
noizy-portfolio/
├── package.json                 # pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json                   # build orchestration
├── tsconfig.base.json
├── .eslintrc.cjs
├── .prettierrc
├── README.md
├── GOSPEL.md                    # canonical Gospel text, imported by every site
├── .github/
│   └── workflows/
│       ├── ci.yml               # lint + typecheck + test on PR
│       └── deploy.yml           # per-site deploy on main
├── packages/
│   ├── brand/                   # design tokens
│   │   ├── src/
│   │   │   ├── tokens.ts        # color, typography, spacing, radius, motion
│   │   │   ├── palettes.ts      # per-site accent palette within approved range
│   │   │   └── index.ts
│   │   └── tailwind.preset.cjs  # Tailwind preset consumed by each app
│   ├── ui/                      # shared React components
│   │   ├── src/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx       # carries Gospel link, auth status, audit link
│   │   │   ├── Hero.tsx
│   │   │   ├── CTA.tsx
│   │   │   ├── AuthButton.tsx
│   │   │   ├── ConsentBadge.tsx
│   │   │   ├── PortfolioIndex.tsx
│   │   │   └── index.ts
│   │   └── test/
│   ├── auth/                    # SSO client + session primitives
│   │   ├── src/
│   │   │   ├── client.ts        # /session fetch, /logout, redirect helpers
│   │   │   ├── jwt.ts           # verify short-lived JWTs (Web Crypto)
│   │   │   ├── cookies.ts       # parse/attach shared-domain cookie
│   │   │   ├── scopes.ts        # consent scope enums + guards
│   │   │   └── index.ts
│   │   └── test/
│   ├── audit/                   # audit writer + types
│   │   ├── src/
│   │   │   ├── writer.ts        # pluggable sink: KV, D1, or log
│   │   │   ├── events.ts        # event type union
│   │   │   └── index.ts
│   │   └── test/
│   ├── voice/                   # brand voice rules (machine-readable)
│   │   ├── src/
│   │   │   ├── rules.ts         # forbidden phrases, tone markers
│   │   │   └── index.ts
│   │   └── voice.md             # human-readable voice doc
│   └── content/                 # shared MDX components + primitives
│       ├── src/
│       └── test/
├── apps/
│   ├── noizy-ai/                # hub + auth source
│   │   ├── app/                 # Next.js 15 app router
│   │   ├── workers/
│   │   │   └── auth.ts          # Cloudflare Worker: /session, /login, /logout, /jwt
│   │   ├── wrangler.toml
│   │   ├── next.config.mjs
│   │   ├── tailwind.config.cjs  # extends packages/brand preset
│   │   └── package.json
│   ├── noizybox/                # studio
│   │   ├── app/
│   │   ├── wrangler.toml
│   │   └── package.json
│   ├── noizykids/               # next ones
│   │   ├── app/
│   │   ├── wrangler.toml
│   │   └── package.json
│   ├── noizyvox/                # voice
│   │   ├── app/
│   │   ├── wrangler.toml
│   │   └── package.json
│   ├── noizylab/                # Canadian research
│   │   ├── app/
│   │   ├── wrangler.toml
│   │   └── package.json
│   └── noizyfish/               # pending Robert's confirmation
└── infra/
    ├── cloudflare/
    │   ├── dns.md               # DNS records per domain, documented
    │   └── pages-projects.md    # one project per app, naming rules
    └── secrets/
        └── SECRETS.md           # what lives where, never the values
```

Two notes on the layout:

- `apps/*` are Next.js 15 projects, each deployable independently to its own Cloudflare Pages project. The `workers/` subfolder in `apps/noizy-ai/` holds the auth Worker, which is a separate deploy target (Cloudflare Worker, not Pages).
- `packages/*` compile to ESM. Sites import them via the pnpm workspace. No version drift between sites.

## 3. Identity and SSO

The identity model is the structural spine. If this is wrong, every other promise in the Gospel becomes theatre.

### 3.1 Auth source

NOIZY.ai is the only property that runs the auth Worker. All other sites are auth *consumers*.

The auth Worker exposes four endpoints, all under `auth.noizy.ai` (Cloudflare Worker route):

- `POST /login` — begins a sign-in flow. v0.1 implementation is passwordless email magic-link. No passwords at rest in v0.1.
- `GET /session` — returns the current session (user id, consent scopes, expiry) as JSON, reading the shared cookie.
- `POST /logout` — revokes the session and clears the cookie on the parent domain.
- `POST /jwt` — issues a short-lived (5 minutes) JWT bound to the current session, scoped to an origin. Used for server-to-server or API calls from sibling sites.

### 3.2 Session mechanics

The shared cookie is scoped to `.noizy.ai` (Domain attribute), `HttpOnly`, `Secure`, `SameSite=Lax`, signed with HMAC-SHA256 using a key stored in a Cloudflare Worker secret. This means:

- `noizy.ai` and any `*.noizy.ai` subdomain see the same session.
- Sites on different apex domains (`noizybox.com`, `noizykids.com`, `noizyvox.com`, `noizylab.ca`) do **not** see the cookie. They authenticate via an explicit round-trip to `auth.noizy.ai` that redirects back with a single-use session token.

The first time a user lands on, say, `noizybox.com`, the site checks local storage — no session. If they click Sign In, they are redirected to `auth.noizy.ai/login?return_to=https://noizybox.com/...`. On success, the Worker:

1. Sets the `.noizy.ai` cookie.
2. Mints a single-use session-bootstrap token.
3. Redirects to `https://noizybox.com/auth/callback?token=<bootstrap>`.

The `noizybox.com` callback route exchanges the bootstrap token for a **site-local** `HttpOnly Secure SameSite=Strict` cookie scoped to `.noizybox.com`. From that point on, `noizybox.com` reads its own cookie. When either side logs out, the other is notified via a short-lived webhook-style notification (Worker → Worker) and the site-local cookie is invalidated on next request.

No third-party OAuth providers in v0.1. No passwords. No Google/Apple sign-in.

### 3.3 Consent scopes

Every session carries a `consent_scope` claim. v0.1 scopes (minimal):

- `identity.read` — site may read user's display name and email.
- `audit.read` — site may show the user their own audit receipts.
- `voice.capture` — NOIZYVOX only. Explicit, revocable, and recorded.
- `kids.guardian` — NOIZYKIDS only. Signals the session is a guardian account.

Scopes are additive. A site that tries to read a scope it wasn't granted gets `403 Forbidden` from the local middleware, logged to the audit sink as a scope violation. The user can broaden scope at any time via `auth.noizy.ai/consent`. Narrowing scope invalidates site-local sessions that depended on the narrowed scope.

### 3.4 JWT for API calls

When a site needs to call a sibling site's API (e.g. NOIZYVOX posting a voice capture receipt to NOIZY.ai's audit endpoint), it mints a JWT at `auth.noizy.ai/jwt`. The JWT has:

- `iss`: `auth.noizy.ai`
- `aud`: target origin (e.g. `noizy.ai`)
- `sub`: user id
- `scope`: space-separated consent scopes
- `exp`: `now + 5 minutes`
- Signed ES256 with a key pair held in a Worker secret. Public key published at `https://auth.noizy.ai/.well-known/jwks.json`.

## 4. Design system

### 4.1 Tokens (`packages/brand`)

One source of truth. Every token has a name, a role, and a value. Tokens are the only way a site sets a color, font, spacing, or motion curve.

- **Color roles:** `ink`, `page`, `muted`, `accent`, `accent-secondary`, `success`, `warning`, `danger`, `focus-ring`.
- **Typography roles:** `display`, `heading`, `body`, `ui`, `mono`. Each with weights and sizes indexed 1–6.
- **Spacing scale:** 4px grid, tokens `space-1` through `space-12`.
- **Motion:** `motion-subtle`, `motion-standard`, `motion-expressive`. Durations paired with easing. No one-off animations.
- **Radius:** `radius-none`, `radius-sm`, `radius-md`, `radius-lg`, `radius-full`.

Per-site variation is constrained: each site chooses its `accent` from an approved palette in `packages/brand/palettes.ts`. The choice is a single line in the site's Tailwind config. A site cannot override a role at runtime.

### 4.2 Components (`packages/ui`)

Shared primitives. Every app imports from here. Renaming or altering these components requires a PR against `packages/ui`, not a local copy.

- **Footer.** The one non-negotiable. Every site's footer renders the `PortfolioIndex`, the Gospel link, the current auth status, and a link to the user's audit receipt (or a Sign In prompt). If a site removes or wraps the Footer such that these elements disappear, CI fails.
- **Header, Hero, CTA, AuthButton, ConsentBadge.** Unified behavior. Site content is passed as children.

### 4.3 Voice rules (`packages/voice`)

Machine-readable list of forbidden phrases, required disclosures, and tone markers. At build time, every app's MDX and Markdown is linted against `voice.rules`. Prohibited phrases ("seamless", "game-changing", "blazing fast", marketing puffery) fail the build. Required disclosures (e.g. "This session writes to your audit log") are checked by path — pages under `/capture`, `/consent`, and `/settings` must include them.

### 4.4 Tailwind preset

Every app's `tailwind.config.cjs` extends the preset from `packages/brand`. The preset exposes only tokens. There is no JIT-enabled arbitrary-value footgun; the preset disables arbitrary-value classes for color and typography via `safelist` rules.

## 5. Deployment

One Cloudflare Pages project per app. One Cloudflare Worker for auth. Shared KV/D1 for audit and sessions.

### 5.1 Cloudflare resources

- **Pages projects (one per app):**
  - `noizy-ai` → `noizy.ai`
  - `noizybox` → `noizybox.com`
  - `noizykids` → `noizykids.com`
  - `noizyvox` → `noizyvox.com`
  - `noizylab` → `noizylab.ca`
  - `noizyfish` → `noizyfish.com` (pending)
- **Workers:**
  - `auth` → `auth.noizy.ai` (handles session, login, logout, JWT, JWKS).
- **KV namespaces:**
  - `SESSIONS` — session id → session JSON, short TTL.
  - `LOGIN_TOKENS` — single-use magic-link and bootstrap tokens, TTL 10 minutes.
  - `JWKS_KEYS` — rotating signing keys.
- **D1 database:**
  - `audit` — append-only table of events. One row per action. Indexed by user id and event time.

### 5.2 CI/CD

GitHub Actions.

- **On PR:** `pnpm install`, `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test`, voice-lint, footer-contract check. Any failure blocks merge.
- **On merge to `main`:** Turborepo detects which apps' inputs changed and deploys only those. Each app has its own Pages project and its own Wrangler deploy config.

### 5.3 Environments

- `production` — custom domains.
- `staging` — per-app `*.pages.dev` URLs, feature-flag-gated where needed.
- `preview` — every PR gets a preview URL per changed app.

## 6. Content and per-site sovereignty

Each app owns its `/content` directory. MDX with front matter. The shared components render it. Copy lives with the site that speaks it. The system enforces consistency; the site owns meaning.

- **Hub (noizy-ai):** Landing, Gospel, About, Sign In, Portfolio index.
- **Studio (noizybox):** Product ethos, tool catalog, waitlist.
- **Next ones (noizykids):** What it is, what it refuses to do, invitation request. Stricter voice rules: no engagement language, no CTA urgency, no images of real children without named consent.
- **Voice (noizyvox):** Capture ethics, demo, consent process, access request.
- **Lab (noizylab):** Active experiments, published findings, contact.

Every site's content passes voice-lint at build. Every site's content passes a copyright-check (no lifted blocks of external text over 20 words).

## 7. Audit

`packages/audit` exposes a typed writer. Events are:

- `auth.login`, `auth.logout`, `auth.scope_change`, `auth.scope_violation`
- `capture.voice_start`, `capture.voice_complete` (NOIZYVOX)
- `submission.kids_signup` (NOIZYKIDS)
- `admin.provision`, `admin.content_publish`

Every event is signed at write-time with the Worker's private key and stored append-only in D1. The user can view their own receipts at `noizy.ai/audit`. Operators can view aggregate audit through a signed-in admin view (single admin in v0.1: Robert Stephen Plowman).

## 8. Phased build

Seven phases. Each one is a stop-and-review point.

1. **Phase 0 — Framework questions resolved.** Before any code: Robert's answers to the five open questions in `00-GOSPEL-WISDOM-AQUARIUM-v0.1.md §7`. Not negotiable.
2. **Phase 1 — Monorepo skeleton.** Repo, pnpm workspace, Turborepo, ESLint/Prettier/TypeScript configs, empty `packages/` and `apps/` with stub `package.json` files. CI runs green on an empty tree.
3. **Phase 2 — Design system.** `packages/brand` tokens, Tailwind preset, `packages/ui` with Footer, Header, AuthButton, PortfolioIndex. Storybook optional, feature-flagged.
4. **Phase 3 — Auth Worker.** `apps/noizy-ai/workers/auth.ts`: `/login`, `/session`, `/logout`, `/jwt`, JWKS. Magic-link email via an email provider (to be chosen). Sessions in KV. Unit tests for signature verification, scope enforcement, and JWT issuance.
5. **Phase 4 — Hub site.** `apps/noizy-ai`. Landing, Gospel (imported from `GOSPEL.md`), About, Sign In, Portfolio index. Footer contract enforced.
6. **Phase 5 — Second site (NOIZYBOX).** First consumer of the shared auth. Validates the bootstrap-token round-trip and the site-local cookie model end-to-end. Catches bugs before we replicate to three more sites.
7. **Phase 6 — Remaining sites.** NOIZYKIDS, NOIZYVOX, NOIZYLAB in parallel, each built against the proven template. NOIZYFISH only if confirmed.
8. **Phase 7 — Audit viewer.** User-facing receipt page on `noizy.ai/audit`. Admin aggregate view.

Each phase ends with: a short summary, a diff, an open-questions list, and the tradeoffs chosen.

## 9. Risks and tradeoffs

- **Cloudflare lock-in.** Workers, KV, D1, Pages — this is a Cloudflare-native architecture. Migration to another provider is a significant undertaking. Accepted because the alternative (writing our own edge + auth layer) is worse for v0.1, and because the code in `packages/*` is provider-agnostic.
- **Magic-link email as the only sign-in path.** Slower UX than OAuth. Less surface area for account takeover. Chosen for v0.1 because it keeps the consent model honest: no delegated identity providers, no implicit claims from third parties. Revisit in v0.2 if users demand it.
- **Cross-apex cookie sharing is not possible.** That's why we have the bootstrap-token round-trip between auth.noizy.ai and each sibling site. This adds one redirect on first sign-in per property. Accepted.
- **Six Pages projects = six deploy pipelines.** Turborepo only deploys what changed, but the operational surface still grows linearly. Mitigated by shared CI templates and a single Wrangler configuration approach across apps.
- **Voice-lint at build can block legitimate copy.** The rules file must be curated, not bloated. Every forbidden phrase needs a named reason. Reviewed quarterly, like `config/scopes.json` on the Discord squad.
- **Platform risk (Cloudflare).** Rate changes, policy shifts. Document DNS so migration is possible. Keep content in the repo, not in a CMS we don't control.

## 10. What this monorepo refuses

Reprinted here because the constraints are as important as the features.

- No third-party analytics of any kind (no GA, no Meta pixel, no Plausible-as-cookie, nothing).
- No third-party font CDNs. Self-host the typography defined in tokens.
- No third-party advertising SDKs.
- No dark-pattern UI primitives in `packages/ui` — no confirm-shaming, no fake urgency timers, no pre-checked boxes.
- No `any` in TypeScript. `unknown` at boundaries, narrowed immediately.
- No browser `localStorage` / `sessionStorage` for session or consent state. Sessions are HttpOnly cookies; consent is server-side.
- No client-side feature flags that control consent-relevant UI. Consent UI is server-rendered and audited.

## 11. Open questions

Some cannot be answered without Robert. Some are engineering picks that are fine to defer to Phase 2+.

1. **Email provider.** Resend, Postmark, or self-hosted SMTP? Affects cost, deliverability, and the DPA chain.
2. **Audit retention.** D1 grows. How long do we keep per-user audit events? User-controlled deletion after N days, or indefinite with explicit user deletion only?
3. **NOIZYFISH.com.** Included or dropped?
4. **Admin identity for v0.1.** Confirmed single admin (Robert). Second-party reviewer for sensitive admin actions — same as the Gospel reviewer question from `00`.
5. **Languages.** English-only v0.1? The voice lint will need to know.
6. **Accessibility target.** WCAG 2.1 AA at v0.1, AAA for kids and voice capture flows? Needs to be declared before `packages/ui` is built so components are right the first time.

## 12. What this plan unlocks

Once §11 is resolved and `00-GOSPEL-WISDOM-AQUARIUM-v0.1.md §7` is answered, the Copilot scaffolding prompt (`02-COPILOT-PROMPT-scaffolding.md`) turns this plan into a working repo skeleton. Each phase from §8 becomes a checkpoint the Copilot agent stops at, showing its work, before moving on.

Nothing ships without review. Every site stops at its checkpoint.

---

## Changelog

- **v0.1 (2026-04-16):** Initial plan. Stack confirmed (Next.js 15 + Cloudflare Pages + Workers). Federated SSO with `.noizy.ai` shared cookie plus bootstrap-token round-trip for cross-apex sites. Design system scope defined. Phased build locked at seven phases. Open questions surfaced for resolution before Phase 1.
