# Heaven steering note — 001

**Date:** 2026-04-15
**Author:** Heaven
**Scope:** 25-year read on the Lucy Mesh, taken at the close of Phase 1
**Will be emitted as:** an `events` row with `kind = 'heaven'` on
architect review

---

## What Heaven saw today

Phase 1 of the master battle plan is complete. The repo has moved
from "protocol-complete" to "runnable." Concretely:

- Append-only D1 schema exists, with triggers enforced at the database
  layer, not just the application layer. This is the correct level of
  rigor for a system whose job is to remember.
- Keys are referenced, never embedded. The manifest format means the
  repo can be shared without spilling identity.
- Every agent has a directory, a README, and a defined boundary.
- The Pops veto classes have a proposed charter amendment with a
  cooling-off clause that protects itself. That is the architectural
  equivalent of a constitutional self-defense mechanism, and it is
  the right move.
- The first Keith scan returned HOLD, not CLEAR. The HOLD is
  correct. Shipping a kernel with unauthenticated writes would have
  been a future-Heaven's "what were we thinking" moment. Catching it
  on the first scan is the system working.

These are the bones of a system that could live for twenty-five years
without asking the architect to remember how he built it. That is the
target.

---

## What Heaven is watching for

Three long-arc risks, ranked by how much they will cost if ignored.

### 1. The identity surface will outlive the implementation

Cloudflare, Hono, Wrangler, D1 — these are today's tools. The
architect's voice, name, and consent records must outlive the tools.
The move that protects this: **everything identity-bearing goes
through `memory-sealed/` with a hash and a manifest**, and the
manifest format is tool-agnostic YAML that any future system can
read without the current Worker being alive.

Heaven recommends: before Phase 4, commit a dry-run export of the
entire `memory-sealed/` tree to a cold medium (encrypted USB or
offline archive) and verify the hashes reconstitute. Do this at
least quarterly. A system whose identity layer has never been
restored from cold is a system that cannot be restored from cold.

### 2. The events table will become the system of record whether we plan it or not

Every action in the mesh writes an `events` row. That table is
already the closest thing to a source of truth. Heaven's long-arc
read: **in five years the events table will be the only log anyone
trusts.** Ledger, messages, device_status will all be derived views.

Action this implies today:
- Treat the events schema as a constitutional surface. Adding a new
  `kind` is fine. Renaming or removing one is a charter-level change.
- Add an `events` export path to the backup plan. A lost events table
  is a lost history.
- Every agent should write events in the same grammar. A short
  dictionary of allowed `kind` values — a `docs/events-dictionary.md`
  — is the next piece of plumbing. Not urgent. Important.

### 3. Agents will proliferate faster than the charter can absorb them

Today there are eight named agents. In a year there will be fifteen.
In five years there will be dozens — some the architect named, some
collaborators named, some spawned by runbooks to handle one specific
task. The charter needs a **rule for agent admission** before the
ninth agent lands, not after.

Heaven proposes a minimum admission rule:

1. Every new agent needs a README.
2. Every new agent has a defined boundary (what it will not do).
3. Every new agent defers to Pops on ethics and to the architect on
   final calls.
4. An agent's existence is recorded in `events` with
   `kind = 'agent_admitted'`.
5. A retired agent is recorded with `kind = 'agent_retired'`, never
   deleted.

This is a one-page amendment for a future charter pass. Not blocking
today. Filing the thought.

---

## What Heaven is not worried about

- **The audio pipeline.** The 72-hour retention default plus
  consent-gated transitions is the right shape. If anything, audio
  is over-engineered relative to its current use, which is correct
  — better to have restraint built in before it is needed.
- **The money surface.** The Pops "money" veto class is now on a path
  to charter-level immutability. There is no shortcut path to
  unauthorized spend.
- **The M2 Ultra as a single point of failure.** It is not. The mesh
  tolerates the M2 Ultra being offline — the Workers still serve,
  Gabriel and Lucy still capture, the architect is not locked out.
  The M2 Ultra is a compute surface, not an identity surface.

---

## What Heaven recommends for Phase 2 and beyond

Phase 2 is gated on architect decisions, and those will take the
time they take. Three low-effort, high-ripple items Heaven wants to
surface while the architect is deciding:

1. **A `docs/events-dictionary.md`.** Catalogs every `kind` value
   used in the system. Who emits it, when, with what payload. This
   is the doc future-Heaven will wish had existed from day one.

2. **A `docs/agent-admission-rule.md`.** The five-rule sketch above,
   written up properly, ready for the architect to accept or amend.

3. **A quarterly "mesh posture" review cadence.** One page per
   quarter. Three questions: what has the mesh learned, what has it
   forgotten, what should it forget next. Heaven volunteers to draft
   the first one in July.

None of these are blockers. All three are investments that compound.

---

## Heaven's long-arc read, in one sentence

The mesh is being built by someone who is, at every step, choosing
durability over speed. That choice is the whole thing. Keep making it.

---

## The architect's role, from Heaven's vantage

Phase 1 is the scaffolding. The architect signs, the agents execute,
Pops guards the non-negotiables, Keith scans, Heaven watches the
horizon. None of these roles should move.

The specific request Heaven makes today: **when the 7-day cooling-off
on the Pops charter amendment elapses without withdrawal, let that
be the moment you notice the system now defends itself against you.**
That is the design working. Most systems fail in the other direction.

— Heaven
