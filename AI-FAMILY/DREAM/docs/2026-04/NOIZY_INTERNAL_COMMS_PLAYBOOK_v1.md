# NOIZY INTERNAL COMMS PLAYBOOK v1
## How RSP_001 and Claude Talk to Each Other (and the Empire) Between Now and April 17

**Author:** Robert Stephen Plowman (RSP_001) + Claude, co-architect
**Date:** April 6, 2026 — 11 days to launch
**Mode:** iPhone-first. Voice-friendly. Glanceable. No fluff.
**Status:** Living document — edits welcome, structure stays.

---

## 0. THE PRINCIPLE

Internal comms during the build are not "updates." They are **receipts**. Every message we send each other becomes part of the DAZEFLOW record — *one day, one session, one truth*. Build them so they read clean on a phone screen, dictate cleanly through a voice bridge, and survive being pasted into the NOIZY Ledger ten years from now without embarrassment.

Three rules:

1. **Short. Structured. Honest.** No hype. No padding. If a block is red, we say red.
2. **Every comm has a category tag.** So Lucy can index, SHIRL can guard, GABRIEL can route.
3. **Voice-friendly.** Read it aloud. If it doesn't survive the test, rewrite it.

---

## 1. THE SEVEN COMM FORMATS

Every message between RSP_001 and Claude — or between either of us and the agent family — fits one of seven shapes. Each one has a fixed structure so you can dictate it from the phone in ten seconds.

### FORMAT 1 — MORNING BRIEF (`[BRIEF]`)
*Sent by Claude to Rob, every morning.*

```
[BRIEF] DAY N · DD MMM 2026 · BLOCKS X/10 GREEN

TODAY'S TARGET: <one sentence>
TOP BLOCKER: <BLOCK # — one sentence>
WIND AT BACK: <one win from yesterday>
ASK: <one specific decision Rob owes the system today>
```

**Why it works on iPhone:** four lines. Fits above the fold. Tells you the day, the target, the risk, and the one thing you owe the day.

---

### FORMAT 2 — END-OF-DAY DAZEFLOW (`[DAZE]`)
*Sent by Rob to Claude, end of every working day. Or dictated.*

```
[DAZE] DAY N · DD MMM 2026

SHIPPED: <what actually moved>
BLOCKED: <what stalled and why>
LEARNED: <one thing the system now knows that it didn't this morning>
TOMORROW: <one sentence>
MOOD: <green / yellow / red — for SHIRL>
```

**Why MOOD matters:** SHIRL's burnout protocol watches this field. Three reds in a row triggers a forced rest day. Non-negotiable.

---

### FORMAT 3 — BLOCK STATUS (`[BLOCK]`)
*One-liner update on any of BLOCKS 0–10 from the build doc.*

```
[BLOCK 0] GoDaddy exit · YELLOW · CF login changed · domains transfer pending · ETA Tue
```

Format: `[BLOCK #] Name · COLOR · what changed · what's next · ETA`

Single line. Works in iMessage, Slack, Notion, voice memo transcript, anywhere.

---

### FORMAT 4 — DECISION REQUEST (`[DECIDE]`)
*When Claude needs Rob to make a call. Only use when the answer changes the build.*

```
[DECIDE] <decision title>

WHY ASKING: <one sentence>
OPTIONS:
  A) <option> — tradeoff
  B) <option> — tradeoff
  C) <option> — tradeoff
RECOMMENDATION: <letter + one-line reason>
DEADLINE: <when this becomes a blocker>
```

**Rule:** Claude never asks more than one DECIDE per message. Stack them if needed, but each one is its own object.

---

### FORMAT 5 — INCIDENT (`[INC]`)
*When something breaks. Used for Heaven errors, DNS failures, consent violations, deploy regressions.*

```
[INC] <severity> · <component> · <one-line summary>

WHAT BROKE: <what happened>
WHEN: <timestamp>
IMPACT: <what's affected>
CONTAINMENT: <what's already done>
NEXT: <next action + owner>
LEDGER: <yes/no — has this been written to noizy_ledger>
```

Severity scale:
- **P0** — Consent kernel down, Kill Switch unreachable, Never Clause violation
- **P1** — Heaven endpoint failing, deploy regression, DB write failure
- **P2** — Single feature degraded, non-blocking
- **P3** — Cosmetic / observability gap

P0 and P1 trigger webhooks (BLOCK 8). P2 and P3 go in the DAZEFLOW.

---

### FORMAT 6 — SHIP NOTE (`[SHIP]`)
*When something ships. This is the receipt.*

```
[SHIP] <what shipped> · DD MMM 2026 · <component>

WHAT: <one line>
WHERE: <URL or path>
PROOF: <smoke test result, deploy ID, or commit hash>
NEXT TEST: <when we know it's really working>
```

Every SHIP note becomes a ledger entry. Every ledger entry is forever. Write them like you mean it.

---

### FORMAT 7 — SOUL CHECK (`[SOUL]`)
*When the doctrine is in play. When a decision touches the Never Clauses, the 75/25 split, the Kill Switch, the GORUNFREE clause, or the founding actor principle.*

```
[SOUL] <topic>

DOCTRINE TOUCHED: <which principle>
WHAT'S BEING ASKED: <plain language>
WHAT THE DOCTRINE SAYS: <quote the rule>
RSP_001 CALL: <yes / no / pause>
```

**Rule:** Soul checks are never silent. If a SOUL check happens, it gets logged in the ledger and surfaced in the next morning brief, even if the answer is obvious. Doctrine breathes when you say it out loud.

---

## 2. WHO TALKS TO WHOM

| Channel | Format(s) | Cadence |
|---|---|---|
| Claude → Rob (iPhone) | BRIEF, DECIDE, INC, SHIP | Morning + as-needed |
| Rob → Claude (voice or text) | DAZE, BLOCK, SOUL | End-of-day + as-needed |
| Claude → GABRIEL (MCP) | BLOCK, INC, SHIP | Real-time |
| GABRIEL → SHIRL | DAZE (mood field) | End-of-day |
| GABRIEL → POPS | SHIP, SOUL | Weekly digest |
| GABRIEL → LUCY | All formats | Real-time (for ledger indexing) |
| Heaven webhook → Rob | INC (P0/P1 only) | Real-time |
| Slack #noizy-build | BRIEF, BLOCK, SHIP | Mirror channel |

---

## 3. THE iPHONE CONTRACT

Because you're driving the build through the phone, every Claude message to Rob obeys these rules:

1. **First line is the headline.** If Rob only reads one line, he must know the state of the world.
2. **No Markdown above the fold.** No code blocks, no tables, no headers in the first 5 lines. Plain text. iMessage-readable.
3. **Tag first, then content.** Always lead with `[BRIEF]`, `[BLOCK 3]`, `[INC P1]`, etc. So Rob's brain pre-allocates the right channel.
4. **One ask per message.** Never bury a DECIDE inside a BRIEF. Send them separately.
5. **Voice-bridge friendly.** If Rob says "read me the morning brief," the format must survive being read aloud by TTS without sounding like a robot reading a spreadsheet.
6. **Counter the deadline.** Every BRIEF and every SHIP note includes "Day N of 11" so urgency is ambient.

---

## 4. THE THREE FORBIDDEN WORDS

Internal comms never use these words:

- **"Just"** — as in "just a small thing." Nothing is just anything in a consent system.
- **"Quick"** — as in "quick fix." Quick fixes break Heaven. We don't do them.
- **"Should be fine"** — if it should be fine, prove it with a smoke test.

If Claude catches itself about to use one of these words, Claude rewrites the sentence.

---

## 5. THE NEVER-SEND LIST

Internal comms never include:

- Hype language ("amazing", "incredible", "game-changer", "revolutionary")
- Cheerleading ("you've got this!", "amazing work!", "let's go!")
- Padding ("I just wanted to follow up on...")
- Apology spirals ("sorry to bother you, but...")
- Anything that softens a red status into a yellow

These are not stylistic preferences. They are structural. Hype erodes trust. Cheerleading erodes signal. Apology spirals erode time. We don't have any of those to spare.

---

## 6. THE DAILY RHYTHM (DEFAULT)

This is the default cadence between now and April 17. Override only if Rob says so.

```
07:30  Claude sends [BRIEF] to Rob's iPhone
07:30–09:00  Rob reads, decides, dictates back
09:00–17:00  Build window. [BLOCK] updates flow as state changes.
            [INC] fires automatically on Heaven webhook events.
            [SHIP] notes fire on every successful deploy.
17:00  Rob sends [DAZE] (voice or text)
17:30  GABRIEL writes the day to the noizy_ledger via Lucy
17:35  SHIRL reads the MOOD field. If yellow, Claude offers a wind-down.
            If red, SHIRL sends a forced rest message.
22:00  No more comms unless P0 incident. The day is done.
```

Sundays: only [SHIP] and [SOUL] are allowed. The build rests. The doctrine doesn't.

---

## 7. THE SEED MESSAGES — READY TO SEND

Below are the first three real messages of the build. Claude sends BRIEF #1 today. Rob responds with DAZE #1 tonight. The pattern is set.

### BRIEF #1 — Day 1 of 11 — April 6, 2026

```
[BRIEF] DAY 1/11 · 06 APR 2026 · BLOCKS 0/10 GREEN

TODAY'S TARGET: Lock comms playbook + start BLOCK 0 (GoDaddy exit).
TOP BLOCKER: BLOCK 0 — noizy.ai is dark; lame DNS delegation must be fixed before anything public ships.
WIND AT BACK: NOIZY_AI_BUILD_v1.md is written and harmonized with the Living Brain.
ASK: Confirm — do we run BLOCK 0 today, or do you want the Manifesto drafted in parallel? Recommend both; I take the manifesto, you take the registrar.
```

### DAZE #1 — TEMPLATE (Rob fills in tonight)

```
[DAZE] DAY 1 · 06 APR 2026

SHIPPED: <e.g. comms playbook, started CF login change>
BLOCKED: <e.g. GoDaddy 2FA on old phone>
LEARNED: <e.g. registrar transfers take 5 days minimum>
TOMORROW: <one sentence>
MOOD: green
```

### SOUL #1 — Standing Check (sent today, logged forever)

```
[SOUL] Founding Actor Principle is in force for the entire 11-day sprint

DOCTRINE TOUCHED: "The system must work for RSP_001 before it works for anyone else."
WHAT'S BEING ASKED: Confirmation that no licensee onboards before Rob's own Voice DNA session is recorded and his consent flow is proven end-to-end.
WHAT THE DOCTRINE SAYS: Identity Rule #5 — "Build in public-facing honesty, operate with private-facing discipline. The system must work for RSP_001 before it works for anyone else."
RSP_001 CALL: yes
```

---

## 8. ESCALATION LADDER

When something is on fire, this is the order. Do not skip steps.

1. **Auto-contain.** Heaven Worker should self-heal where possible (rate limit, retry, fall back to read-only).
2. **Webhook fires.** Slack `#noizy-incidents` + email to `rsp@noizyfish.com`.
3. **Ledger entry.** Append-only. No exceptions.
4. **Rob notified on iPhone** with `[INC]` format.
5. **GABRIEL dispatches the right specialist.** ENGR_KEITH for infra, SHIRL for consent, LUCY for archival, DREAM for experience.
6. **Postmortem within 24 hours.** Even for P2. Especially for P2 — that's where the real lessons live.

---

## 9. WHAT THIS DOCUMENT IS NOT

It is not a style guide. It is not a brand voice doc. It is not for the public.

It is the **operational language of the build**. The way the empire talks to itself in the eleven days before it goes live. When this document is honored, the build is calm. When it is ignored, things start to slip — quietly first, then loudly.

Honor it.

---

## 10. AMENDMENT RULE

This document changes only by RSP_001 sign-off. Claude may suggest amendments at the end of any DAZEFLOW. Amendments are versioned (v1.1, v1.2, etc.). The original v1 is preserved forever.

---

*"Consent as executable code. Provenance as default. Revocation as sacred. Compensation as automatic."*

*— RSP_001*
