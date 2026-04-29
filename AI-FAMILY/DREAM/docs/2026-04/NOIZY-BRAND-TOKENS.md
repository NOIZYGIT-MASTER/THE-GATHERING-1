# NOIZY Brand Tokens — Canonical Dictionary

Single source of truth for allowed brand spellings across code, docs, decks, and infrastructure. Paired with `NOIZY-NAMING-LAW.md` and enforced by `.githooks/pre-commit` + `.github/workflows/noizy-spelling.yml`.

---

## Allowed tokens

```
NOIZY.AI
NOIZYFISH
NOIZYVOX
NOIZYKIDZ
NOIZYLAB
THE WISDOM PROJECT
THE AQUARIUM
```

Short-form aliases (for internal slugs, subdomains, bindings):

```
wisdom
aquarium
```

---

## Slug conventions (machine tokens)

| Use | Convention | Example |
|---|---|---|
| DNS subdomain | lowercase, no spaces | `noizyfish.noizy.ai` |
| Subdomain (short brands) | lowercase, short form | `wisdom.noizy.ai`, `aquarium.noizy.ai` |
| Folder name on disk / OneDrive | UPPERCASE canonical | `NOIZYKIDZ/` |
| KV namespace | `noizy-cache-<slug>` | `noizy-cache-noizykidz` |
| D1 database | `<domain>_db` or descriptive | `consent_db`, `catalogue_db` |
| Worker binding | UPPERCASE with underscore | `NOIZYKIDZ_KV`, `WISDOM_KV` |
| Git branch prefix | lowercase slug | `noizykidz/feature-foo` |

---

## Canonical slug table

| Brand | DNS slug | Folder | KV binding | D1 binding (if brand-specific) |
|---|---|---|---|---|
| NOIZY.AI | `noizy.ai` (apex) | `NOIZY.AI/` | `NOIZY_AI_KV` | — |
| NOIZYFISH | `noizyfish` | `NOIZYFISH/` | `NOIZYFISH_KV` | — |
| NOIZYVOX | `noizyvox` | `NOIZYVOX/` | `NOIZYVOX_KV` | — |
| NOIZYKIDZ | `noizykidz` | `NOIZYKIDZ/` | `NOIZYKIDZ_KV` | — |
| NOIZYLAB | `noizylab` | `NOIZYLAB/` | `NOIZYLAB_KV` | — |
| THE WISDOM PROJECT | `wisdom` | `THE_WISDOM_PROJECT/` | `WISDOM_KV` | — |
| THE AQUARIUM | `aquarium` | `THE_AQUARIUM/` | `AQUARIUM_KV` | — |

---

## Forbidden tokens (the fail list)

Anything matching this pattern is a brand law violation and will be blocked by the guards:

```
noisy + (.ai | vox | fish | kids | kidz | lab | box)
```

…in any casing, with or without whitespace.

Examples that will fail:

```
noisy.ai
Noisy.ai
NOISY.AI
NoisyVox
noisyvox
NOISYVOX
NoisyFish
NoisyKids
NoisyKidz
NoisyLab
NOISY BOX
NOISYBOX
noisybox
Noisy Box
```

The English adjective `noisy` on its own is allowed. See `NOIZY-NAMING-LAW.md` for the full rule and the narrow exceptions for quoting historical assets verbatim.
