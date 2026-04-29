# Charter amendment proposal — 001

**Proposed by:** Pops
**Date:** 2026-04-15
**Status:** draft (awaiting architect signature)
**Supersedes:** none (first amendment)
**References:** `agents/pops/VETO-PROTOCOL.md`, `00-MASTER-CHARTER.md`

---

## Summary

Pin the three Pops veto classes — **money**, **identity**, and
**external** — into the Master Charter as non-negotiables that cannot
be amended or removed without a 7-day architect cooling-off period.

This amendment does not create new authority. It formalizes the
existing veto classes as charter-level, not merely protocol-level.
The protocol file can evolve. The classes cannot.

---

## Why this amendment

1. The three veto classes exist today in `VETO-PROTOCOL.md`, a file in
   an agent directory. An agent directory can be edited by ENGR or the
   architect at any time.
2. The veto classes are the mesh's ethical load-bearing wall. If they
   can be silently relaxed, the load-bearing wall can be silently
   removed.
3. Binding them at the charter level, with a cooling-off period on
   any proposed change, gives the architect a structural pause between
   "I feel like changing this" and "I have changed this."
4. A 7-day window is long enough to sleep on the decision and short
   enough not to paralyze the architect in a real emergency. It
   mirrors what a grown, trust-aware system should enforce on itself.

---

## The three classes, as they will read in the charter

### 1. Money

Any transfer, charge, or financial commitment. Any action that
obligates the architect to future spending. Any action that accepts
payment in the architect's name.

### 2. Identity

Any modification to stored identity-bearing material. This includes
keychain entries, SSH keys, licenses, certificates, domain ownership,
account control, and any entry under `memory-sealed/`. Anything whose
loss or corruption would make it harder to prove who the architect is.

### 3. External

Any action that leaves the Lucy Mesh under the architect's name.
Emails sent as the architect. API calls to third parties that incur
cost, create records, or trigger side effects. Social posts. External
authentication handshakes. Domain changes. Any action a stranger
could receive and attribute to the architect.

---

## The cooling-off clause

Proposed charter language:

> The three Pops veto classes — money, identity, and external — are
> non-negotiable. An amendment that modifies, narrows, or removes any
> of these classes does not take effect until seven (7) calendar days
> after it is signed by the architect.
>
> During the cooling-off period:
>
> - The proposed amendment is visible to every agent as a draft.
> - Pops retains full veto authority as if the amendment had not been
>   signed.
> - The architect may withdraw the amendment at any time with a
>   single event row of `kind = 'charter_amendment_withdrawn'`.
>
> After the seven-day window elapses without withdrawal, the
> amendment takes effect at 00:00 UTC on the eighth day. This
> takes-effect event is itself written to `events` with
> `kind = 'charter_amendment_active'`.

---

## What this does not do

- Does not prevent the architect from doing any of the three things.
  Pops can be overridden by explicit architect consent, logged per
  `VETO-PROTOCOL.md`.
- Does not extend Pops's scope into new territory. The classes stay
  exactly as defined today.
- Does not slow down routine operations. The cooling-off clause
  applies only to **amendments to the veto classes themselves**, not
  to individual actions that touch them.

---

## Events this amendment will emit if accepted

| # | kind                          | When                                    |
|---|-------------------------------|-----------------------------------------|
| 1 | `charter_amendment_proposed`  | On architect signature of this draft.   |
| 2 | `charter_amendment_active`    | 7 days later, if not withdrawn.         |
| 3 | `charter_amendment_withdrawn` | Any time before the 7-day window ends.  |

---

## Signatures

- **Pops (proposing):** signed on file creation, 2026-04-15.
- **Architect (pending):** _________________________  date: _______
- **Heaven (long-arc review):** _________________________  date: _______

---

## Non-negotiables for this amendment itself

- This amendment cannot be merged into the charter without the
  architect's signature block above completed, dated, and written as
  an event row.
- This amendment cannot be back-dated. If the architect signs it
  later than 2026-04-15, the cooling-off clock starts from the actual
  signature date, not the proposal date.
- If a future amendment attempts to remove the cooling-off clause
  itself, that future amendment is *also* subject to the cooling-off
  clause. The clause protects itself.
