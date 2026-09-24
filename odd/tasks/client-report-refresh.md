# ODD — client-report-refresh

## Objective

Refresh `docs/INFORME_PRESENTACION_CLIENTE.md` so it remains the priority report for real progress, while adding code foundations, a deliverables inventory, and higher-quality diagrams (UML + screenshots) taken from the official academic docx — without importing the docx's false claims.

## Problem

The official `docs/Informe_Academico_UNANDES_Trekking.docx` has academic structure, deep code-path architecture, UML PNGs and real UI screenshots, but wrong HU percentages and false technical claims (points/chunk subcollection, moderator role). Our client report is honest but dated 2026-09-15, light on code foundations/deliverables, and has no UML/screenshot evidence.

## Why

User asked to compare both reports; ours wins on real progress; then confirmed ("si") upgrading ours with foundations+code, deliverables, and good diagrams.

## Scope / authorized

- Edit only `docs/INFORME_PRESENTACION_CLIENTE.md`
- Add curated assets under `docs/assets/informe/` extracted from the official docx
- Mirror this task file in Engram
- Work-unit commit of those docs only (no source, no other dirty files)

## Out of scope

- Changing `USER_STORIES.md`, `BACKLOG.md`, source code, or the official docx
- Re-running `npm test` (live Firestore)
- Push / PR

## Constraints

- Progress % source of truth: `docs/USER_STORIES.md` (2026-09-17), not the docx
- Do not copy docx claims: `points/chunk_n`, moderator role, "9 suites"
- Report prose stays Spanish; technical identifiers in English
- Mermaid diagrams remain; UML/screenshots embedded as images

## Effective TDD and Verification

- Mode: documentation-only structural readback (no source mutation; no TDD runner required)
- Checks: all 15 sections present; 11 image refs resolve on disk; HU % match USER_STORIES; no assertive false claims from docx
- No `npm test` (live Firestore smoke); no `expo-doctor` (no native deps touched)

## Tasks

- [x] T1 — Create this task doc + Engram mirror before first write
- [x] T2 — Extract and rename curated UML/screenshot assets from official docx to `docs/assets/informe/` (11 PNGs)
- [x] T3 — Rewrite `INFORME_PRESENTACION_CLIENTE.md`: HU table = USER_STORIES; §8 fundamentos con código; §9 entregables; §10 UML+screenshots; §12 fuente que manda; mermaid intactos
- [ ] T4 — Structural readback of the report + asset paths; work-unit commit (docs only)

## Acceptance criteria

- [x] HU % match `USER_STORIES.md` consolidated figures
- [x] Report contains: fundamentos con código (real paths), entregables, UML + screenshots, existing mermaid set
- [x] No assertive false claims from docx (chunk/moderator/9 suites) — called out as non-authoritative in §12
- [ ] `git diff` for the commit touches only intended docs paths

## Progress

- Started 2026-09-24 on branch `codex/hu10-user-pagination`
- T1–T3 done; structural readback PASS (15 sections, 11/11 images); T4 commit pending

## Evidence

- 46 `*.usecase.ts`, 27 `src/tests/*.test.ts` counted 2026-09-24
- Assets: `docs/assets/informe/*.png` (11 files)
- Readback: sections 1–15 present; image refs resolve

## Next step

- Complete T4: stage only intended docs paths and create work-unit commit
