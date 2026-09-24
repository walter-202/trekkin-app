# ODD — informe-formal-scrum

## Objective

Create a formal academic report for Trekkin App in Markdown under `docs/informe-formal/`, following the structure of `docs/INFORME_TEMPLATE.docx` (Lidemoda / UNANDES) plus a per-sprint extension documenting analysis, design, implementation, and tests for each sprint.

## Problem

The team needs a formal report (theory + Scrum product backlog by sprints + UML + UI + annexes). The new template has excellent academic structure but is Lidemoda content; Trekkin facts must come from `USER_STORIES.md` / `BACKLOG.md` / code, not from false claims in the old academic docx.

## Why

User loaded `INFORME_TEMPLATE.docx` and asked to start the formal report with that structure, a product backlog split by sprints documenting analysis/design/implementation/tests per sprint, plus theory and annexes; then asked for Markdown so they can generate and improve it.

## Scope / authorized

- Create `docs/informe-formal/*.md` (index + theory + practical + sprints + CU/UML + UI/biblio/annexes)
- Mirror this task file in Engram
- Work-unit commit of these docs only
- Spanish academic prose; technical identifiers in English

## Out of scope

- Editing source code, USER_STORIES, BACKLOG, firestore.rules
- Generating a new .docx in this pass
- Inventing interviews or copying Lidemoda content as Trekkin facts
- Push / PR / `npm test` (live Firestore)

## Constraints

- % and status: `docs/USER_STORIES.md` (rev. 2026-09-17) only
- No false claims: `points/chunk`, moderator role, "9 suites", no leaked API keys from template
- Image paths relative: `../assets/informe/…` from `docs/informe-formal/`
- Structural readback only for verification (documentation)

## Effective TDD and Verification

- Mode: documentation-only structural readback
- Checks: all planned files exist; TOC links resolve; HU % match USER_STORIES; image refs resolve; no false claims / no sk-or-v1 keys
- No `npm test`, no `expo-doctor`

## Tasks

- [x] T1 — Create this task doc + Engram mirror before first write
- [x] T2 — Write `01-parte-teorica.md`, `02-marco-practico.md`
- [x] T3 — Write `03-sprints.md` (per-sprint analysis/design/implementation/tests)
- [x] T4 — Write `04-casos-uso-uml.md`, `05-ui-bibliografia-anexos.md`, `README.md`
- [ ] T5 — Structural readback + work-unit commit (docs only)

## Acceptance criteria

- [x] Structure follows template: theory → practical → Scrum (RF/HU/PB/sprints) → CU/UML → UI → biblio → annexes
- [x] Each sprint documents análisis, diseño, implementación, pruebas
- [x] HU % match `USER_STORIES.md`; BK statuses match `BACKLOG.md`
- [ ] 11 image refs under `docs/assets/informe/` resolve from report files
- [ ] Commit touches only intended docs paths

## Progress

- 2026-09-24: T1–T4 written (`docs/informe-formal/` 6 files); T5 readback in progress

## Evidence

- Template extracted: `C:\Users\Walter\AppData\Local\Temp\opencode\informe_template.txt`
- Assets: 11 PNGs in `docs/assets/informe/`

## Next step

- After commit: user reviews Markdown and improves; later export to .docx if needed
