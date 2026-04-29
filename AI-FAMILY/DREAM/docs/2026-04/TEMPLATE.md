# DECISION MATRIX — Template

**Purpose:** a disciplined weighted-scoring format for any decision
that has more than two options and more than one criterion. The
matrix forces the architect — and the agents advising — to name
the criteria, weight them, and score each option against every one.

## When to use a matrix

Use a matrix when:
- There are three or more real options on the table.
- There are two or more criteria that matter.
- The decision will be revisited later (matrices compound value over
  time because they show the reader how the architect was thinking).

Do **not** use a matrix when:
- The decision is a single yes/no.
- The cost of filling the matrix exceeds the cost of the decision.
- The criteria aren't yet clear — in that case, use a decision tree
  first to sharpen the question, then return to the matrix.

## File naming

`decision-matrices/<YYYY-MM-DD>-<slug>.md`

Example: `2026-04-15-which-deploy-surface.md`

## Template

```markdown
# Decision matrix — <question>

**Architect:** Robert Stephen Plowman
**Date:** <YYYY-MM-DD>
**Scope:** <one-line scope>
**Status:** draft | decided | superseded
**Supersedes:** <path to earlier matrix, if any>

## The question

<One sentence. The exact decision being made.>

## Options

| ID | Option | One-line description |
|----|--------|----------------------|
| A  | ...    | ...                  |
| B  | ...    | ...                  |
| C  | ...    | ...                  |

## Criteria and weights

Weights must sum to 100.

| Criterion            | Weight | Rationale                                |
|----------------------|--------|------------------------------------------|
| Durability           | 30     | Must last the 25-year horizon            |
| Cost                 | 15     | Recurring cost is paid in attention too  |
| Ethical footprint    | 25     | Pops non-negotiable                      |
| Time to first value  | 15     | When does it start paying?               |
| Reversibility        | 15     | Can we undo if we learn we're wrong?     |
| **TOTAL**            | **100**|                                          |

## Scoring

Score each option 1–5 against each criterion. Multiply by the weight.
Sum to a weighted score. Show the math.

| Criterion (weight)         | A (raw / weighted) | B (raw / weighted) | C (raw / weighted) |
|----------------------------|--------------------|--------------------|--------------------|
| Durability (30)            | 4 / 120            | 3 /  90            | 5 / 150            |
| Cost (15)                  | 3 /  45            | 5 /  75            | 2 /  30            |
| Ethical footprint (25)     | 5 / 125            | 3 /  75            | 4 / 100            |
| Time to first value (15)   | 2 /  30            | 4 /  60            | 3 /  45            |
| Reversibility (15)         | 4 /  60            | 5 /  75            | 2 /  30            |
| **Weighted total**         | **380**            | **375**            | **355**            |

## Interpretation

The matrix points to **Option A** by 5 points over B. That gap is
narrow enough to be noise — the tiebreaker is ethical footprint and
reversibility, which both favor A.

## Decision

<One paragraph. Which option, why, what convinced the architect beyond
the raw numbers. If the architect overrode the matrix, name that
explicitly and say what the matrix missed.>

## Consequences the architect accepts

- <First consequence, named honestly.>
- <Second consequence.>
- <Third consequence.>

## Review trigger

Revisit this matrix when <concrete condition> — e.g., "Cloudflare
pricing changes by more than 30%", "we onboard a second architect",
"Gabriel's role expands beyond capture".

## Signatures

- Architect: <typed name, date>
- Heaven (long-arc review): <typed name, date>
- Pops (ethics review): <typed name, date>
```

## Non-negotiables

- No matrix is decided without a Pops review of the ethical-footprint
  row. If Pops has a concern, the matrix goes back to draft.
- No matrix is decided without Heaven's long-arc review for any
  decision with `scope >= 1_year`.
- A superseded matrix is never deleted — the new one links back. The
  history of how the architect changed his mind is itself valuable.
