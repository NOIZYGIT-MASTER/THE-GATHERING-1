# NOIZY Naming Law

**Author:** Robert Stephen Plowman
**Version:** 1.0 — April 16, 2026
**Status:** Canonical. Enforced.

---

## The rule

**NOIZY is always spelled N-O-I-Z-Y.**

Never spell NOIZY with an S. This applies to every brand token built on the NOIZY prefix — in code, documents, decks, filenames, folder names, URLs, DNS records, databases, KV namespaces, bindings, git commit messages, slack messages, and published assets.

If a legacy asset contains "NOISY" as a historical artifact, preserve it verbatim only when quoting history (e.g. a screenshot, an archival citation, or a past press release). All new assets must use NOIZY.

---

## Canonical brand tokens

These are the only allowed spellings for NOIZY-family brand names:

| Brand | Canonical token | DNS |
|---|---|---|
| NOIZY.AI | `NOIZY.AI` | `noizy.ai` |
| NOIZYFISH | `NOIZYFISH` | `noizyfish.com`, `noizyfish.noizy.ai` |
| NOIZYVOX | `NOIZYVOX` | `noizyvox.com`, `noizyvox.noizy.ai` |
| NOIZYKIDZ | `NOIZYKIDZ` | `noizykidz.com`, `noizykidz.noizy.ai` |
| NOIZYLAB | `NOIZYLAB` | `noizylab.ca`, `noizylab.noizy.ai` |

Non-NOIZY-prefix brands in the ecosystem retain their own canon:

| Brand | Canonical token | DNS |
|---|---|---|
| The Wisdom Project | `THE WISDOM PROJECT` (long form) / `WISDOM` (short) | `thewisdomproject.com`, `wisdom.noizy.ai` |
| The Aquarium | `THE AQUARIUM` (long form) / `AQUARIUM` (short) | `theaquarium.com`, `aquarium.noizy.ai` |

---

## What counts as a violation

Any of these is a violation, regardless of casing:

- `Noisy.ai`, `noisy.ai`, `NOISY.AI`
- `NoisyVox`, `noisyvox`, `NOISYVOX`
- `NoisyFish`, `noisyfish`, `NOISYFISH`
- `NoisyKids`, `noisykids`, `NOISYKIDS`
- `NoisyKidz`, `noisykidz`, `NOISYKIDZ` (the S in "Noisy" is the violation — the Z in "Kidz" is correct)
- `NoisyLab`, `noisylab`, `NOISYLAB`
- `NOISY BOX`, `NOISYBOX`, `Noisy Box` (historical stand-in for NOIZY — do not reintroduce)

## What is NOT a violation

The English word "noisy" used as a normal adjective is fine.

> "Keep notifications high-signal, not noisy."
> "The room was noisy."
> "A noisy signal-to-noise ratio."

The guards below match `noisy` *immediately followed by a brand suffix* (`.ai`, `vox`, `fish`, `kids`, `kidz`, `lab`, `box`). They do not fire on standalone English "noisy."

---

## Enforcement points

1. **Local — pre-commit hook.** `.githooks/pre-commit`. Installed once per clone via `git config core.hooksPath .githooks`. Blocks the commit before it is created. Emergency bypass: `NOIZY_LAW_BYPASS=1` + commit trailer.
2. **CI — GitHub Actions.** `.github/workflows/noizy-spelling.yml`. Runs on every push and pull request. Blocks merges on violation.
3. **Code review.** Reviewers are expected to catch brand-token drift alongside other review concerns.
4. **OneDrive folder hygiene.** All top-level brand folders use the canonical tokens. No `Noisy*` folders. Drift is audited monthly.
5. **Decks and docs.** New decks must pass a manual pass against this document before publication. Legacy decks are remediated on next edit.

---

## Known legacy violations (remediation queue)

As of 2026-04-16, the following assets contain confirmed violations and are queued for remediation:

- `Presentation 1.pptx` — "NOISY BOX" appears on slides 3 and 19. Replace `NOISY BOX` → `NOIZY`.
- `NOIZYWORLD - THE ECOSYSTEM.pptx` — contains `NoisyVox`, `NoisyFish`, `NoisyKids`, `NoisyLab`, `Noisy.ai` tokens in brand/domain listings. Replace per fix map above.

Remediation is scheduled as a separate task; see `TASKS.md` or the Linear issue tracker.

---

## Enforcement philosophy

This law exists to protect identity. NOIZY is a name, and a name said correctly is a name that can be trusted, searched, found, linked, bought, and defended. A brand whose spelling drifts is a brand whose meaning drifts.

The guards are not adversarial. They are memory. They catch the drift that tired eyes miss.
