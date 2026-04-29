# NOIZY — Single-Page Composition
## Figma layout spec: Upgrade Rings + Agent→Brand Matrix + Evolution Roadmap

**Goal.** One page that a partner can read in 30 seconds and a designer can build from this document without another meeting.

**Principle.** Three ideas, one surface, no decoration. Every element either carries meaning or is deleted.

---

## 1. Canvas & grid

| Property | Value |
|---|---|
| Frame name | `NOIZY — Rings · Matrix · Roadmap / 1920` |
| Size | 1920 × 1080 px (16:9, deck-native) |
| Export variant | `@2x` PNG, `@1x` PDF, `SVG` (type outlined) |
| Margins | 96 px left / right, 72 px top / bottom |
| Grid | 12 columns, 24 px gutter, stretch |
| Baseline | 8 px |
| Safe title area | top 120 px |
| Safe footer area | bottom 56 px |

**Vertical zoning (top → bottom):**

```
┌────────────────────────────────────────────────────────┐
│  Header                                         120 px │
├────────────────────────────────────────────────────────┤
│  Zone A — Upgrade Rings (diagram left, copy right)     │
│                                                 320 px │
├────────────────────────────────────────────────────────┤
│  Zone B — Agent → Brand Matrix                         │
│                                                 380 px │
├────────────────────────────────────────────────────────┤
│  Zone C — Evolution Roadmap (horizontal band)          │
│                                                 180 px │
├────────────────────────────────────────────────────────┤
│  Footer  (governance one-liner)                  56 px │
└────────────────────────────────────────────────────────┘
```

---

## 2. Design tokens

### Color

| Token | Hex | Use |
|---|---|---|
| `noizy/ink` | `#0A0A0A` | Primary text, ring labels |
| `noizy/paper` | `#FAFAFA` | Canvas background |
| `noizy/line` | `#1A1A1A` | Rules, dividers, matrix grid |
| `ring/core` | `#E8B339` | Core ring (experimentation) |
| `ring/adaptive` | `#3AB673` | Adaptive ring (creative surface) |
| `ring/stable` | `#2E5BDA` | Stable ring (trust layer) |
| `agent/gabriel` | `#6B2FA8` | GABRIEL presence marker |
| `agent/guardian` | `#C23B5E` | Guardian Agent (NOIZYKIDZ) |
| `agent/neutral` | `#7A7A7A` | All other agents (neutral dot) |
| `state/now` | `#0A0A0A` | Roadmap: "Stabilize" (now) |
| `state/next` | `#444444` | Roadmap: "Accelerate" (next) |
| `state/horizon` | `#9A9A9A` | Roadmap: "Autonomize" (horizon) |

> Rob — if the NOIZY master palette already specifies brand hexes, replace the three ring colors with those and keep tokens.

### Type

Family: **Inter** (UI, body) + **Inter Tight** (display). Fallback: system-ui.

| Token | Font / Weight | Size / Line |
|---|---|---|
| `type/display` | Inter Tight · 600 | 44 / 52, tracking −2% |
| `type/h1` | Inter · 600 | 28 / 36 |
| `type/h2` | Inter · 600 | 20 / 28 |
| `type/body` | Inter · 400 | 14 / 22 |
| `type/caption` | Inter · 500 | 11 / 16, tracking +4%, UPPERCASE |
| `type/mono` | JetBrains Mono · 500 | 12 / 18 (agent tags, matrix cells) |

### Spacing

8 px baseline. Use `8 · 16 · 24 · 40 · 64 · 96` only.

### Stroke

- Rings: 4 px stroke, no fill
- Matrix grid: 1 px `noizy/line` at 20% opacity
- Roadmap rail: 2 px `noizy/line`

---

## 3. Header (120 px)

- Left: `type/caption` tag — `NOIZY · GOVERNANCE LAYER`
- Title: `type/display` — **Speed is a design choice.**
- Right-aligned meta, `type/caption`: date, version, classification

**Why this title.** It names the thesis of all three zones in one sentence. Don't replace with "Upgrade Rings and Agent Matrix" — that describes the page; the current title argues it.

---

## 4. Zone A — Upgrade Rings (320 px)

**Layout.** Diagram on the left (6 cols), copy stack on the right (6 cols).

### Diagram (concentric rings, left 6 cols)

- Three concentric circles, shared center, increasing radius
- From inside out: **Core** (`ring/core`) → **Adaptive** (`ring/adaptive`) → **Stable** (`ring/stable`)
- Stroke only, 4 px. No fill. No drop shadow.
- Each ring labeled at the 2 o'clock position with `type/h2`
- Under each label, cadence in `type/caption`:
  - Core: `WEEKLY`
  - Adaptive: `SPRINT`
  - Stable: `QUARTERLY`

### Copy stack (right 6 cols)

Three stacked mini-rows, each 96 px tall, divided by 1 px `noizy/line` at 20%.

Row format (repeat × 3):

```
[color chip 12×12]  RING NAME                         CADENCE
                    One-sentence definition in type/body.
                    Members, type/mono: NOIZY.AI · GABRIEL · …
```

Content (final copy — use verbatim):

- **Core** — *Experimentation and orchestration. Contain the blast radius.*
  Members: `NOIZY.AI · GABRIEL · control-plane`
- **Adaptive** — *Creative surface. Moves with culture, respects the artist.*
  Members: `LAB · FISH · DREAMCHAMBER`
- **Stable** — *Public trust. Consent infrastructure, not conservatism.*
  Members: `NOIZYKIDZ · NOIZYVOX · public APIs`

---

## 5. Zone B — Agent → Brand Matrix (380 px)

**Layout.** Full-width grid. Brands as columns, agents as rows.

### Grid structure

- Columns (brands, left → right): **NOIZY.AI · GABRIEL · LAB · FISH · DREAMCHAMBER · NOIZYVOX · NOIZYKIDZ**
- Rows (agents, top → bottom): **GABRIEL · Guardian Agent · Apple Creative · Ops Agent · Provenance Agent**
- Cell: 96 × 48 px
- Header row and header column: `type/caption`, `noizy/ink`, 32 px tall / 120 px wide
- Grid lines: 1 px `noizy/line` @ 20%
- Zebra background: even rows `#F2F2F2`, odd rows `noizy/paper`

### Cell content rules

Each intersection is one of four states:

| State | Visual | Meaning |
|---|---|---|
| `primary` | Solid filled dot 12 px, ring color of the brand's home ring | Agent has primary mandate for this brand |
| `supporting` | Outline dot 12 px, 1.5 px stroke, same color | Agent supports but does not own |
| `audit-only` | 8 px square, `agent/gabriel` | GABRIEL provenance presence (every column has at least one) |
| `none` | Empty cell | No relationship |

### Required intersections (lock these)

- **GABRIEL row:** `audit-only` marker in **every** column. This is the "nothing ships without GABRIEL" rule, made visible.
- **Guardian Agent × NOIZYKIDZ:** `primary`, color `agent/guardian`. This is the strongest dot on the page — do not soften.
- **Apple Creative × LAB** and **Apple Creative × FISH:** both `primary`, color `ring/adaptive`.
- **Ops Agent × NOIZY.AI:** `primary`, `ring/core`.
- **Provenance Agent:** `supporting` across LAB, FISH, DREAMCHAMBER, NOIZYVOX, NOIZYKIDZ.

### Matrix caption (below grid, `type/caption`)

`● PRIMARY    ○ SUPPORTING    ■ GABRIEL AUDIT    —    7 BRANDS · 5 AGENTS · 1 RULE: NOTHING SHIPS WITHOUT GABRIEL`

---

## 6. Zone C — Evolution Roadmap (180 px)

**Layout.** Horizontal three-stop rail, full width, 40 px from Zone B.

### Rail

- 2 px horizontal line `noizy/line`, centered vertically in the zone
- Three node markers equally spaced at 20%, 50%, 80% horizontal
- Node: 16 px filled circle
  - Stop 1 — `state/now` (Stabilize)
  - Stop 2 — `state/next` (Accelerate)
  - Stop 3 — `state/horizon` (Autonomize)
- Above each node, `type/h2` label
- Below each node, `type/body`, 2-line max description, 240 px wide, centered

### Copy (verbatim)

| Stop | Label | Description |
|---|---|---|
| 1 | **Stabilize** | Harden the rings. Lock the consent layer. Finish the provenance chain. |
| 2 | **Accelerate** | Release Adaptive to creative speed. GABRIEL watches everything. |
| 3 | **Autonomize** | Brands that grow without being rebuilt. Agents that evolve inside their rings. |

---

## 7. Footer (56 px)

Single line, centered, `type/caption`:

> `All brand autonomy is bounded by NOIZY.AI orchestration and audited through GABRIEL-driven provenance logs.`

This is the governance one-liner. Do not wrap. Do not paraphrase. If it doesn't fit, shrink the font before changing the words.

---

## 8. Annotation layer (for handoff only — hidden on export)

Layer named `z-annotations`, hidden by default. Contains:

1. **Zone A callout** → "Ring color = cadence, not priority."
2. **Zone B callout** → "GABRIEL row is visually unbroken on purpose. If a column has no GABRIEL mark, that's a bug."
3. **Zone C callout** → "Phases are not time-boxed. Readiness gates, not dates."
4. **Footer callout** → "Source: `The 5th Epoch V2` + `NOIZYWORLD — THE ECOSYSTEM`. Do not edit without cross-check."

---

## 9. Export checklist

- [ ] Type outlined on SVG export
- [ ] `@2x` PNG for deck insertion (Keynote, Google Slides)
- [ ] `@1x` PDF for print / PDF deck
- [ ] Annotation layer hidden for all exports
- [ ] File naming: `NOIZY_RMR_v{n}_{YYYY-MM-DD}.{ext}`
- [ ] Accessibility: all ring / state colors paired with a shape token (dot, outline, square) so the page is legible in monochrome

---

## 10. Build order (suggested, ~90 min for a designer)

1. Canvas + grid + header (10 min)
2. Zone A rings diagram (15 min)
3. Zone A copy stack (10 min)
4. Zone B matrix skeleton (15 min)
5. Zone B intersections + legend (20 min)
6. Zone C rail + copy (10 min)
7. Footer + annotation layer + export (10 min)

---

## Open items for Rob

1. Confirm or override the three ring hex codes against the NOIZY master palette.
2. Confirm the final brand list for matrix columns — the 7 above are drawn from the existing ecosystem docs; add or remove as needed.
3. Confirm whether **Guardian Agent** and **Apple Creative** are the canonical agent names, or if these should be replaced with the internal code names.
4. Decide whether the footer should cite source documents by name, or stay clean.
