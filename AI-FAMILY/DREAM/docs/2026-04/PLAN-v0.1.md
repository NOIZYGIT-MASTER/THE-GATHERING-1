# NOIZY Discord — Bot Squad Plan v0.1

**Author of record:** Robert Stephen Plowman
**Co-architect:** Claude
**Scope:** A small team of purpose-built Discord bots that run a NOIZY Discord server. Controlled from any device Robert is signed in on (iPad, Mac, phone, web) with no separate admin panel.
**Non-goals (v0.1):** public community growth hacks, voice moderation AI, crypto/tokens, engagement-farming features.

---

## 1. What you're actually building

One Discord server, owned by you. Inside it, a squad of small, specialized bots — each a separate Discord Application with its own token and the minimum permissions it needs. They coordinate through a shared audit log and a shared configuration file. They are controlled by slash commands from inside Discord itself, which means any device where Discord runs is a full control surface.

This is not one mega-bot. It's a team of quiet specialists. Each one is replaceable, auditable, and bounded.

## 2. The squad

Six bots. Six jobs. No overlap.

### Gatekeeper
**Job:** Everyone who joins gets a calm, consent-first welcome. A DM asks one or two questions ("Are you here as a listener, a collaborator, or press?") and assigns roles based on the answer. No silent role grants. No automatic channel access.
**Permissions:** send DMs, add/remove roles, read member join events.
**Can't do:** post in channels, moderate, ban.

### Town Crier
**Job:** Announcements, scheduled posts, cross-posts. Takes slash commands like `/announce channel:#general body:...`. Optional: pulls from a Notion or Google Doc and posts on a schedule.
**Permissions:** post in specified channels, read scheduling config.
**Can't do:** DM members, moderate, delete.

### Sentinel
**Job:** Quiet moderation. Rate limits, link filtering, anti-raid, flagging suspicious join patterns. Every moderation action is logged to the Chronicler with a reason. Never auto-bans without a second signal.
**Permissions:** timeout, delete messages, read audit events.
**Can't do:** ban without human confirmation, DM members unsolicited.

### Architect
**Job:** Provisions channels, categories, roles, and permission overwrites from templates. "Spin up a project channel with these three roles and this permission map" — one command, done. Reversible.
**Permissions:** manage channels, manage roles.
**Can't do:** post, moderate, send DMs.

### Chronicler
**Job:** Durable, append-only audit log. Every joined member, every role change, every moderation action, every Architect provisioning, every cross-post from Town Crier — goes into a private `#audit` channel AND a tamper-evident external log (Cloudflare KV, Postgres, or a flat log file at v0.1). This is the Rosetta stone when anything breaks.
**Permissions:** read audit events, post to `#audit`.
**Can't do:** anything else.

### Concierge
**Job:** Your personal control surface. `/status` shows the state of the other five bots. `/brief` gives you a summary of the last 24 hours. `/roster` lists members by role. `/pause <bot>` and `/resume <bot>` let you quiet an individual bot without killing it. This is the bot you talk to from iPad when you want to know what's happening without opening ten channels.
**Permissions:** read everything, call admin slash commands on the other five bots.
**Can't do:** post publicly, moderate.

### (Optional, later) Bridge
A seventh bot, deferred to v0.2, that connects Discord to Slack, email, Gold Gateway, or NOIZY infrastructure. Worth naming now so you don't overload the other six with integration work.

## 3. Architecture

Single TypeScript monorepo. `pnpm` workspace. Six packages, one per bot, plus a shared `core` package that handles the Discord API client (`discord.js` v14), config, secrets, and the audit-writer interface.

```
noizy-discord/
├── packages/
│   ├── core/              # shared: client, config, audit writer, types
│   ├── gatekeeper/
│   ├── town-crier/
│   ├── sentinel/
│   ├── architect/
│   ├── chronicler/
│   └── concierge/
├── config/
│   ├── server.json        # channel IDs, role IDs, templates
│   ├── scopes.json        # what each bot may do
│   └── audit.json         # audit sink config
├── docker-compose.yml     # one container per bot for local dev
├── README.md
└── SECURITY.md
```

Each bot is a separate Node process with its own token, loaded from a secrets file or your secret manager. No bot has access to another bot's token. The Concierge talks to the others through a local HTTP interface or shared Redis channel — never by assuming co-location.

## 4. Permissions and consent model

Three rules, non-negotiable:

1. **Least privilege per bot.** Each bot's Discord Application has the narrowest permission set it can do its job with. Reviewed in `config/scopes.json`.
2. **Consent before role grants.** Gatekeeper never silently assigns a role. It asks, and the answer is recorded to the audit log with a timestamp.
3. **Human confirmation for irreversible actions.** Bans, mass deletes, and channel deletions all require a slash command from you specifically (matched against your Discord user ID), not any admin.

## 5. Control surface (this is the iPad answer)

You control the whole system through slash commands inside Discord. That means:

- iPad Discord app → full control.
- Mac Discord app → full control.
- Phone Discord app → full control.
- `discord.com` in any browser → full control.

No separate dashboard. No web admin. No app to install beyond Discord itself.

The Concierge bot exposes the top-level commands. Examples:

- `/status` — health of all bots, last heartbeat, last error.
- `/brief since:24h` — summary of joins, moderation actions, announcements.
- `/pause bot:sentinel reason:"testing"` — quiet one bot without stopping the others.
- `/roster role:collaborator` — list members in a role.
- `/provision template:project name:gold-gateway` — Architect spins up a new channel set.
- `/announce channel:#general body:"..." schedule:tomorrow-9am` — Town Crier.

Each command is audited. Each command names the caller. Each command that changes state returns a confirmation with an undo hint when one is possible.

## 6. Deployment

Three viable targets. My recommendation is (C) for v0.1.

- **(A) Your Mac, as a dev setup.** Fine for first-week iteration. Not durable — if the Mac sleeps, bots go dark.
- **(B) A single cheap VPS** (DigitalOcean, Hetzner, $5-10/month). Six containers, one `docker-compose up`. Durable, simple, predictable.
- **(C) Railway or Fly.io.** Per-service deploy, automatic restarts, easy secret management, scale each bot independently. Slightly more config than a VPS, much less ops pain.

Cloudflare Workers are out: Discord bots need a persistent gateway connection, which Workers can't hold. Workers are fine for slash-command HTTP handlers only, but your squad needs gateway access for joins, messages, and moderation events.

## 7. Phased build

Seven phases. Each one is a stop-and-review point, not a sprint.

1. **Phase 0 — Server shape.** Decide the channel layout, role structure, and server rules. One hour, on paper. No code.
2. **Phase 1 — Core + Chronicler.** Ship audit first. You cannot debug the other five without it.
3. **Phase 2 — Gatekeeper.** Welcome flow, consent-based role assignment. Test with a throwaway account.
4. **Phase 3 — Concierge.** Your own control surface next, before anything with write power to the server.
5. **Phase 4 — Architect.** Safe provisioning, reversible, template-driven.
6. **Phase 5 — Town Crier.** Announcements. Scheduled posts.
7. **Phase 6 — Sentinel.** Moderation last, because getting it wrong has the highest cost. Start in observe-only mode for a week.

## 8. Second-order effects worth naming

- **Moderation bots shape culture.** A Sentinel that is too aggressive teaches the community that the server is hostile. Start in observe-only mode and tune before you let it act.
- **Welcome flows are first impressions.** Gatekeeper's tone matters more than its logic. The DM should read like you wrote it, not like a corporate form.
- **Audit logs are evidence, not trophies.** The Chronicler's log is for recovery and accountability. It is not a feed to broadcast what members did. Keep it private.
- **Bot failure modes are social failure modes.** A silent bot is worse than a loud one. If Sentinel falls over, Concierge should surface that in `/status` before a member notices broken moderation.
- **iPad is first-class, not a consolation.** Designing around slash commands means you never get stranded without a laptop. Build it that way from day one.

## 9. Out of scope for v0.1

- AI chat in DMs with members. Not because it's impossible, because consent and tone are not solved for it yet.
- Voice channel moderation.
- Reaction-role self-assignment walls. Consent-first DMs replace them.
- Engagement metrics dashboards. If you want data, ask the Chronicler, don't build analytics.
- Monetization, token gating, NFT-anything.
- Federation across multiple servers.

## 10. Risks

- **Token leakage.** Six tokens, six leak surfaces. Store in a secrets manager, never in the repo, rotate on deploy.
- **Permission creep.** Each bot will be tempted to grow. Review `config/scopes.json` quarterly and cut anything unused.
- **Over-automation.** Bots that act faster than you can observe teach you nothing. Keep human review on irreversible actions.
- **Discord API rate limits.** Architect and Town Crier can hit them during bulk operations. Use `discord.js` rate-limit handling, and throttle at the bot level.
- **Platform risk.** Discord is a third-party. One policy change can alter what any of these bots can do. Don't build anything mission-critical on top of them without a migration path.

## 11. Open questions before we build

1. What's the NOIZY server's purpose in one sentence? (This determines the Gatekeeper script.)
2. Who besides you is an admin on day one? (This determines Concierge's caller whitelist.)
3. What's the tolerance for Sentinel false positives? (This determines whether it starts in observe-only or act mode.)
4. Is there a brand voice doc the Gatekeeper and Town Crier should follow, or do we draft one?
5. Deployment target: (A), (B), or (C) from §6?

## 12. What I will do next if you say go

- Turn this plan into a Copilot prompt (same shape as the Gold Gateway prompt) that builds the six bots in the phased order above.
- Generate `config/scopes.json`, `config/server.json`, and the Chronicler schema as starter files.
- Draft the Gatekeeper welcome DM in your voice, for your review.

Nothing ships without your review. Every bot stops for you at its checkpoint.

---

## Changelog

- **v0.1 (2026-04-16):** Initial squad plan. Six bots, one optional Bridge deferred. Slash-command control surface confirms iPad as first-class. Phased build with Chronicler first, Sentinel last.
