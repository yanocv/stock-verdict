# KabuCheck documentation

> **Docs-first phase** (owner decision, 2026-11-19): coding is paused. Every document below is written and approved first; the code is then revisited and built against them.
> Exception (owner, 2026-11-23): targeted verdict fixes resumed because BUY verdicts were practically impossible; each is documented in `CALCULATIONS.md` and `ENGINE_SPEC.md` as usual.
> Language: **English**. Format: **Markdown** in this folder (diagrams in Mermaid), plus **Excel** (`.xlsx`) for the table-heavy documents.

## Documentation set

Written in this order; each builds on the ones above it.

| # | Document | File | Status |
|---|---|---|---|
| 1 | Requirements Definition | `01-requirements.md` | Not started |
| 2 | Tech Stack | `02-tech-stack.md` | Not started |
| 3 | Business Flow | `03-business-flow.md` | Not started |
| 4 | Screen Transitions | `04-screen-transitions.md` | Not started |
| 5 | Figma design (updated to the requirements) | Figma + `05-design.md` (links and notes) | Not started |
| 6 | Specification Rules List (every rule with an ID) | `06-specification-rules.xlsx` | Not started |
| 7 | Calculation Rules (same rule IDs) | `07-calculation-rules.md` (from `CALCULATIONS.md`) | Not started |
| 8 | ER Diagram | `08-er-diagram.md` (from `DATABASE.md`) | Not started |
| 9 | Database Table Definitions | `09-table-definitions.xlsx` | Not started |
| 10 | Field Definitions / Field List | `10-field-list.xlsx` | Not started |
| 11 | API Specification | `11-api-specification.md` | Not started |

## Existing documents

They feed the set above and will be merged into it, then retired or kept as background:

| File | Becomes part of |
|---|---|
| `PROJECT_SUMMARY_FOR_AI_AGENTS.md`, `docs_APP_FEATURES.md` | 1 Requirements |
| `ENGINE_SPEC.md` (plans, owner decisions, principles) | 1, 6 |
| `CALCULATIONS.md` (as-built maths) | 7 |
| `DATABASE.md` (ER draft) | 8, 9 |
| `docs_INVESTMENT_PHILOSOPHY.md`, `docs_MASTER_PARAMETERS.md` | 6, 7 (background) |
| `docs_PROJECT_KNOWLEDGE_BASE.md`, `docs_PITCH_DECK.md` | Background |
