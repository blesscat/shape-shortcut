# Shape Shortcut design-system refresh verification

Change: `refresh-site-design-system`.

## Scope and ownership

Implementation checkout: isolated `codex/refresh-site-design-system`, based on
`ec0635564a5937e0a2f3c60d84a67587c2c17e2e`. The original planning checkout is preserved.

- A: semantic tokens, shared shell/components, navigation, branding.
- B: public pages, model cards, documentation, static presentation assets.
- C: CAD/Playground presentation and mobile comparison.
- Integration: cross-route tests, evidence, two independent reviewers, spec sync.

Existing token names and component APIs remain the shared contract. The header
reserves its geometry; `--site-header-height` is the anchor-offset contract.
Model identifiers, route contexts, saved parameters and palettes, presets,
geometry and export formats are outside the migration scope.

## Verification status

This record is updated with executed checks, not intended checks.

- Initial frozen-lockfile dependency installation: passed, pnpm 11.20.0.
- Initial `pnpm check`: passed, zero Svelte errors/warnings.
- Isolated dev server: port 3468; do not reuse the original checkout server.
- Public route matrix: 40 passed across Chromium/Firefox, both locales/themes,
  widths 320/390/760/761/1440. Checks cover horizontal overflow, body/action
  contrast and rendered headings; this is not every control-state contrast check.
  Representative actual screenshots are under `screenshots/`.
- `pnpm test:branch`: 46 files, 587 tests passed.
- `pnpm build`: passed, 73 generated pages.
- `pnpm format:check`: fails on seven unchanged base files only:
  `src/features/cad/playground/{occupancy,stacking-compatibility,store}.ts` and
  `tests/unit/playground-{occupancy,scene-file,store-drag-stacking,store-overlap}.test.ts`.
  Their contents are identical to base ec063556; no unrelated formatting edits.
- Final public Chromium integration after content/dialog fixes: 58 passed / 2 support-configuration skips.
- CAD layout: desktop cap/independent scroll and short 844×390 desktop checks
  passed; the 760/761 boundary passed after an HMR-interrupted run.
- Initial fit: 12/12 across box, HSW, OpenGrid and tall shelf at 1440/761/390px;
  the same test detects clipping on exact base. Padding is fixed at initial
  workspace scene mount; thumbnail capture still uses its existing margin.
- Progressive preview/camera preservation: 22/22 passed.
- Box/error suite: 13/13; localized workspace headers: 2/2.
- Playground: 40 unique cases passed across the initial run and three isolated
  HMR reruns; persistence 2/2 and mesh progress 1/1 passed.
- Mobile recovery/export: 4/4 across locale/theme pairs. Drawer/gesture and
  simplified badge regressions passed. This is browser emulation only.
- Final `pnpm check`: zero errors/warnings. Final build: 73 pages.
- Changed source/test/script formatting and `git diff --check`: passed.
- Final reference snapshot verification: 24 images individually reviewed; the three normal Chromium suites passed 10/10 without snapshot-update flags.
- Public content checks: 26 passed / 2 support-configuration skips; docs
  chapter navigation with and without JavaScript passed Chromium and Firefox
  (4); narrow chooser (2), native-scroll portrait/landscape/deep-link cases (6),
  44px docs actions (2), updated localized category summaries (1).
- Static asset pipelines: 38 catalog previews regenerated, final verification
  2 passed; 4 home images and source hashes/dimensions; 12 SVG diagrams;
  18 assembly media plus 38 contact checks; 6 scroll meshes with freshness
  checks. Existing geometry and material colors retained.
- Independent review: round 3 passed with both fresh reviewers reporting no actionable P0–P3 findings; five earlier P2 findings were fixed. See independent-review.md.
- Physical phone keyboard/touch/orientation: not verified; user explicitly chose Android review after the draft PR.
- Deployment: not performed by this PR workflow.

## Mobile release rule

A split panel is eligible only after the complete CAD and Playground comparison
passes, including real phone checks. Missing or failed evidence retains the
legacy translucent overlay for both products. Desktop emulation is not physical
phone evidence, and an opaque overlay is not an acceptable substitute.

## Reviewable deliverables and recovery

- `contract.md`: semantic colors, state pairs, typography, radii and shell APIs.
- `baseline.html` and `baseline-*.png`: design sketches, not runtime evidence.
- `screenshots/`: selected actual browser captures, with locale/theme/width in names.
- `roadmap.md`: R1/R2 sequencing and acceptance boundaries; future work is not implemented.

Release CSS, HTML/icon references and generated media together. A rollback should
revert this UI/assets/spec commit set together and preserve existing localStorage,
scene files, parameter identities and model palettes. There is no database or
saved-data migration. This PR workflow does not deploy or merge to main.

All recorded checks here are local unless explicitly labeled otherwise. Browser
emulation does not establish phone keyboard/touch/orientation behavior. CI status
must be read from the eventual PR; no local result is claimed as CI approval.

## Review fixes verification

Navigation/dialog/focus/footer: 26/26 Chromium + Firefox. CAD derived-text contrast, narrow development-action reservation and desktop containment: 5/5. Type/Svelte check: zero errors/warnings. Build: 73 pages. Android remains PR-after verification per user request.

Round-2 focus fixes: 38/38 Chromium + Firefox checks passed, including disclosures, assembly controls, CAD exports, navigation pinning/reload/return-to-top. Type/Svelte check remains zero errors/warnings; build 73 pages; changed-file formatting and strict OpenSpec validation passed.

## OpenSpec handoff

Final apply state before archive: `all_done`, 37/37 tasks; all four artifacts done.
Separate main-spec sync updated 32 requirements and added 5 across 11 capabilities,
preserving unrelated requirements and Purpose sections. Thirteen scenario titles
were explicitly renamed for the new palette/navigation wording, retaining their
behavioral coverage. `openspec validate --specs`: 62 passed, 0 failed.

Every delta was verified against its synchronized main requirement before archive.
Archive: `openspec/changes/archive/2026-10-23-refresh-site-design-system/`. All 15
artifact files, including `.openspec.yaml`, were preserved with identical content
hashes. The repository ignores this archive directory, so it is intentionally
local and not force-added. Main specs and these verification/roadmap documents
are the reviewable published handoff. This workflow has not merged or deployed.
