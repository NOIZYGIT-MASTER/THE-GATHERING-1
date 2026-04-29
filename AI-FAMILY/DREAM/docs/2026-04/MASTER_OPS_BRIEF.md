# NOIZY EMPIRE — MASTER OPERATIONS BRIEF
## Full Sequential TODO Execution — April 12, 2026
### Robert Stephen Plowman (RSP_001) | NOIZYFISH INC.

---

## AUDIT FINDINGS (executed remotely)

### DNS Status — All 3 Domains

| Domain | NS | A Record | MX | SPF | DKIM | DMARC | HTTP |
|---|---|---|---|---|---|---|---|
| noizy.ai | CF (alex+melinda) ✅ | 172.67.177.214 ✅ | CF Email Routing ✅ | ✅ | ❌ MISSING | ❌ MISSING | 522 — no Worker |
| noizyfish.com | CF (marek+tara) ✅ | NONE ❌ | CF Email Routing ✅ | ✅ | — | — | 000 — dark |
| noizylab.ca | CF (naomi+renan) ✅ | 172.67.175.205 ✅ | ImprovMX ⚠️ | ✅ | — | — | 200 ✅ |

### Cloudflare Account Status
- MCP connected to **secondary account** (not Fishmusicinc canonical)
- Secondary account: 2 D1 databases, 1 worker ("deploy" Hello World, Dec 2025)
- Canonical (Fishmusicinc, 2446d788): 9 D1 databases, 53 KV namespaces — not accessible via current MCP

### HEAVEN Worker Status
- **NOT deployed.** noizy.ai returns 522 (connection timeout — no Worker attached to routes)
- Worker.ts built fresh (this session): ~350 lines, all endpoints functional
- Deployment package ready to deploy from GOD terminal

---

## P0 — CRITICAL. MUST HAPPEN TODAY.

### P0-1: Deploy HEAVEN Worker

**Files ready in this package:**
- `HEAVEN.zip` → download → unzip on GOD → run `bash deploy.sh`

**GOD terminal commands:**
```bash
cd ~/Downloads/HEAVEN_DEPLOY
npm install
npx wrangler whoami        # confirm auth
bash deploy.sh             # deploys + removes stale worker
curl https://noizy.ai/api/health   # verify live
```

**Expected result:** 200 with JSON health payload. 522 gone. noizy.ai is live.

---

### P0-2: Migrate CF Login Email

**Current state:** rsp@noizyfish.com (dead — 550 bounce)
**Target state:** rsp@noizy.ai (live, Cloudflare Email Routing confirmed)

**Steps (CF Dashboard — iPad or Mac):**
1. Go to dash.cloudflare.com → My Profile (top right) → Personal info
2. Change email → enter rsp@noizy.ai
3. Check rsp@noizy.ai inbox for verification email
4. Confirm — login email migrated

**Note:** CF Email Routing for noizy.ai is confirmed live. rsp@noizy.ai will receive the verification.

---

### P0-3: Resolve CF Account Discrepancy

**Two accounts found:**
- Canonical: 2446d788cc4280f5ea22a9948410c355 (Fishmusicinc — 9 D1 databases, 53 KV)
- Secondary: 5f36aa9795348ea681d0b21910dfc82a (2 D1 databases — what MCP is connected to)

**Action:**
1. Log in to dash.cloudflare.com
2. Switch accounts (top left dropdown)
3. Confirm which account holds noizy.ai DNS zone
4. That is the canonical account — update MCP connection if needed

**Note:** HEAVEN deploy.sh uses wrangler which will auth to whichever account `wrangler login` is set to. Confirm `npx wrangler whoami` returns the account holding noizy.ai zone.

---

### P0-4: Enable MFA — CF / GitHub / Microsoft

**Cloudflare:**
dash.cloudflare.com → My Profile → Authentication → Enable 2FA → Authy or 1Password TOTP

**GitHub:**
github.com → Settings → Password and authentication → Enable two-factor authentication

**Microsoft:**
account.microsoft.com → Security → Advanced security options → Two-step verification

**Order:** CF first (most critical — controls all domains). Then GitHub. Then Microsoft.

---

## P1 — THIS WEEK

### P1-1: DNS — Remaining Gaps

**Fix noisy DKIM + DMARC on noizy.ai (CF Dashboard → DNS → Add record):**

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:rsp@noizy.ai; pct=100
```

**Fix noizyfish.com — no A record:**
```
Type: A
Name: @
Value: 192.0.2.1    ← placeholder (or point to a Worker route instead)
TTL: Auto
Proxied: Yes
```
Or: add a Worker route for noizyfish.com → HEAVEN handles it.

**noizylab.ca MX:** Currently ImprovMX. Acceptable for now — low priority to migrate.

---

### P1-2: noizy.ai Home Page
**Status:** Built in HEAVEN worker (see landingPage() function in worker.ts). Goes live the moment HEAVEN deploys.

---

### P1-3: Git Repos — Heal & Push
**Script ready:** `git_heal.sh` in this package

**GOD terminal:**
```bash
chmod +x git_heal.sh
bash git_heal.sh
```
Heals all 5 local repos, sets remotes, commits dirty state, pushes to RSPNOIZY org.

---

### P1-4: NOIZYVOX Portal Build
**Status:** Gate = noizy.ai live. Once HEAVEN is deployed, vox.noizy.ai returns JSON stub.
Full portal HTML build is next build session after P0s are clear.

---

## P2 — ACTIVE BUILDS (next sessions)

| Item | Status | Next step |
|---|---|---|
| DreamChamber IDE on GOD | In progress | Resume after HEAVEN live |
| ENGR Metabeast v2 | Architecture active | Python engine session |
| Swift universal app | Built | Connect to HEAVEN endpoint |
| Operation Voice Army | Designed | Recording session on GOD |
| A.I.V.A. branding | Pending P1-4 | After NOIZYVOX portal |

---

## P3 — OUTREACH / LEGAL (drafts below)

### Chris Castle — Email Draft

**To:** chris@musictech.solutions  
**Subject:** NOIZY — NCP v1.0 and the consent gap in music AI  

Chris,

I'm Robert Stephen Plowman, founder of NOIZYFISH INC. and architect of the NOIZY platform — the world's first consent-native creative infrastructure, built for the 5th Epoch of recorded music.

I've been following your work on AI and music rights closely. What I've built is, I believe, the technical reference implementation of what the policy community is reaching toward: a system called NCP v1.0 (Native Consent Protocol) that treats consent as executable code — logged, revocable, and enforceable at the infrastructure level — not as a terms-of-service line item.

The Plowman Standard (75/25 creator/platform split) is encoded into the platform's constitutional layer, not offered as a preference.

I'd value fifteen minutes of your time. I can send the NCP one-pager in advance.

Robert Stephen Plowman  
rsp@noizy.ai | noizy.ai  
NOIZYFISH INC. | Ottawa, Canada

---

### Leonard Rosenthol — Email Draft

**To:** leonardr@adobe.com  
**Subject:** C2PA + audio — NOIZY PROOF and the missing track  

Leonard,

I'm Robert Stephen Plowman, founder of NOIZYFISH INC. I'm building NOIZY — consent-native creative infrastructure for the music industry — and I've identified a structural gap in C2PA that directly affects what I'm trying to solve.

C2PA currently has no audio provenance track. For recorded music, voice synthesis, and AI-generated audio, this means the single most exploited creative asset — the human voice — has no cryptographic provenance standard.

I've designed NOIZY PROOF, a C2PA-compatible audio provenance layer, and I'd like to discuss whether there's a path to contributing this to the coalition's work.

I'm not asking for anything except a conversation. Twenty minutes, at your convenience.

Robert Stephen Plowman  
rsp@noizy.ai | noizy.ai  
NOIZYFISH INC. | Ottawa, Canada

---

### Casey Chisick — Status
3 legal holds in place (OSC/SEC token mechanics, DAO governance, cross-border royalty flows). No action until counsel retained. Contact: Casey Chisick, Cassels Brock & Blackwell, Toronto.

---

### Investor FAQ — The Ask
**Status:** Still blank. RSP_001 must define instrument, amount, and use-of-funds before any investor conversation.

**Suggested framing to decide on:**
- Instrument: SAFE, priced round, or strategic partnership?
- Amount: What is the minimum to deploy HEAVEN + NOIZYVOX + 6-month runway?
- Use of funds: Engineering, legal (Casey), artist onboarding, or all three?

---

## LOCKED / WAITING

| Item | Gate |
|---|---|
| 2076 Artist Protection Framework | Casey Chisick engagement |
| Google Business Suite Standard | CF + GitHub verification complete |
| n8n workflow activation | Infrastructure stable |

---

## SINGLE COMMAND UNLOCK SEQUENCE

```bash
# 1 — from GOD terminal, HEAVEN directory:
npx wrangler whoami
bash deploy.sh

# 2 — verify:
curl https://noizy.ai/api/health

# 3 — git:
bash git_heal.sh
```

P0-2, P0-3, P0-4 require the CF dashboard (browser). Do those in parallel while HEAVEN deploys.

**Everything downstream opens the moment HEAVEN returns 200.**

---

*Generated: 2026-04-12 | RSP_001 | NOIZYFISH INC. | DAZEFLOW: 1 day = 1 truth*
