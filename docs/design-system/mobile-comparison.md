# Mobile panel comparison and fallback decision

Decision: ship the existing translucent overlay globally for CAD and Playground. The opaque split is rejected for this release; it is a test-only DOM experiment, never imported into product code.

## Reproduction and evidence

Run `CAD_REVIEW_URL=http://127.0.0.1:3468 node scripts/design-review/mobile-panel-comparison.mjs`.

The run produced 60 layout observations: 360×640, 390×844, 844×390, 760×720, 761×720; light/dark; en/zh-Hant; stackable box, OpenConnect shelf, Playground. These are observations, **not 60 passing acceptance cases**. See [raw observations](./evidence/cad/prototype-comparison.json) and [rejected split screenshot](./evidence/cad/rejected-split-candidate.png).

The candidate's viewport extends behind the site navigation; the model is cropped and fixed progress can cover the parameter area. Its reported unobscured-height metric subtracts the drawer only and does not account for header/progress occlusion, so it cannot establish usable model visibility. Many records contain provisional geometry. The script exercises an experimental keyboard range control, not production divider semantics.

No physical device, software keyboard, camera direction/target/zoom preservation, complete loading/stale/invalid/retry/export matrix, or production touch divider was validated. Those are missing evidence, not passes. The negative prototype result and these missing gates independently prevent split promotion. Legacy has no divider, so divider-specific acceptance is not applicable to the shipped fallback. A future split proposal must repeat the full joint gate.

## Legacy behavior verification

The production drawer retains its translucent 65dvh overlay, external export buttons, scroll locking, Escape/focus return, and unchanged viewport box on open/close. Extra export status and format explanations now live inside the mobile drawer to avoid covering the simplified-model badge; desktop retains them next to the exports.

Initial focused Chromium run: 46 passed / 5 failed across box, progressive preview, grid dimensions, failure toast, mobile drawer and Playground mobile. The branch-caused mobile badge overlap was fixed and its targeted test passes. The ready status test was updated to assert the new localized compact status and absence of progress. All six targeted status/drawer regressions then passed. Grid-dimensions tests and Playground mobile gesture tests passed. No physical-device claim follows from emulation. A further four mobile recovery/export cases passed across both locales and both themes: forced asset failure, localized error, disabled export, terminal progress clearing, dismiss, successful retry, and downloaded STL. See `tests/e2e/cad-refresh-recovery.spec.ts`.

## Camera and exact-base comparison

The stored dark box snapshot shows a smaller model than current code, but exact base `ec06355` already clips the same bottom model corner. We rendered exact base in an isolated worktree/server and compared against this branch. See [baseline](./evidence/cad/baseline-box-dark.png) and [refreshed](./evidence/cad/refreshed-box-dark.png).

At 1440×900 both viewport boxes are 988.8125×644 and both canvas boxes 986.8125×642. Viewport top changes from 228.78125 to 199.59375; model position within the canvas is unchanged. No camera adjustment was made to accommodate the visual refresh.

An actual refresh regression was found and fixed: CSS grid display overrode the static fallback's `hidden` attribute. An explicit `[hidden] { display: none }` rule now removes the placeholder after hydration.

The older desktop no-document-scroll/520px-cap tests fail at exact base too. OpenGrid at 1280×720 has document height 1151 at base and 1121 after refresh; at 1600×1394 it is 1850 versus 1821, with viewport height 1138 in both. These assertions were not weakened; the promised desktop overflow/cap contract was subsequently implemented as documented below. Exact-base runs also reproduce the obsolete empty-preview assertion and obsolete error-toast wording assertion. Logs: `/tmp/shape-cad-baseline-tests.log`, `/tmp/shape-cad-tests.log`; output directories use matching names.

## Checklist interpretation

The planning checklist originally phrased 5.1–5.3 as implementation/full-matrix/
physical-device actions. It now makes their conditional gate role explicit to
match design D4 and both CAD delta specifications: a missing or failed required
check selects the already-approved legacy branch. No promotion criterion was
relaxed. Checklist completion records the failed eligibility decision, not a
completed split implementation or physical test. The independent compliance
review must assess this interpretation before the change can be archived.

## Final layout correction and Android follow-up

Although desktop overflow and the missing 520px cap reproduced at exact base, this change explicitly promises those contracts. They have now been implemented: CAD-only desktop shell spacing, an explicit viewport/sidebar budget capped at 520px, and a bounded independently scrollable attribution region preserving all credits and links. At 761×720 and 1280×720 the document is 720px high with a 360px viewport; at 1600×1394 the viewport is 520px; at 844×390 the viewport is 110px and the footer remains within the screen. The earlier baseline screenshots above document investigation, not the final capped presentation.

Mobile export actions now occupy a reserved 112px row above the viewport within the same workspace anchor. The static fallback reserves that row too. This avoids the narrow gizmo and simplified badge while drawer open/close leaves the viewport rectangle unchanged. Mobile document scrolling remains normal when the drawer is closed.

The user explicitly selected Android review after the PR is pushed (2026-10-23: “android 幫我推到pr我再去看”). This authorizes that review sequence; it does not mark physical-device or software-keyboard verification passed. The split remains rejected and legacy overlay remains the shipped mode.

See [Android checklist](android-checklist.md). This does not authorize split promotion or claim a preview deployment already exists.

Final desktop layout verification: existing workspace-layout cases and the new short-desktop case pass. The responsive 760→761 breakpoint check passes independently after an HMR-interrupted run. The final type/Svelte check reports zero errors and warnings. Exact-base gizmo invalid-number wording failure is retained in `evidence/cad/exact-base-gizmo.log` without weakening its assertion.

Final task 4.7 / 5.6 validation: the 44-case workspace/Playground/mesh/persistence run produced 40 passes and four failures. Three Playground cases were interrupted by HMR navigation during layout editing; all three passed isolated reruns after freeze. Workspace-header's fourth failure reproduced at exact base and expected an obsolete unlocalized return URL; its test now checks the actual localized routes. Persistence passed 2/2, mesh progress passed 1/1, and all 40 Playground cases passed across the initial and isolated reruns. This is not represented as a single 44/44 run.

Box and failure-toast tests now assert existing current behavior: a labeled simplified model before WASM, four visible progress stages and stable viewport rectangles; a localized error reason plus MODEL_ASSET_INVALID, alert, dismissal and disabled exports. Their obsolete expectations reproduced at exact base. The resulting complete box/error suite passes 13/13. No product error behavior or timeout was changed.

## Initial workspace fit correction

The final layout's 520px cap made the existing over-tight initial fit unacceptable for release. `initialWorkspacePadding` now derives world-space padding from the first mesh's bounds, allowing the bounding sphere to fit after the initial viewing angle is restored. It is captured once with `untrack` at scene mount: theme changes, parameter updates, and provisional-to-exact mesh replacement do not recalculate it or reset user camera state. Thumbnail presentation retains its existing fixed padding of 20. No Fit/Reset control or geometry behavior was added.

The new rendered-pixel regression detects blue model geometry touching canvas edges across desktop, breakpoint and mobile aspect ratios. The exact-base box fails it; box, HSW cell and OpenGrid pass all nine final cases. See `evidence/cad/initial-fit-exact-base.log`, `initial-fit.log`, and the before/after `hsw-base-at-520px.png` / `hsw-initial-fit-fixed.png`. This correction supersedes the earlier investigation's unchanged-camera-framing statement: initial framing is intentionally improved, while subsequent camera-preservation contracts remain unchanged.

The temporary exact-base server and worktree have been removed after preserving the comparison evidence. Localized header coverage now passes both Chinese and English return routes (2/2).

Final initial-fit validation also passes the tall compound OpenConnect shelf at all three widths (3/3), for 12 initial-fit cases overall. The full progressive-preview/camera-preservation suite passes 22/22 after the correction, and the final type/Svelte check reports zero errors and warnings. Theme preservation and reviewed visual snapshots belong to the separate visual-agent suite; its final results must be checked before completion.

## Review round 1 corrections

The derived cylinder outer diameter now uses the foreground token rather than the muted surface token. A rendered-browser test checks the actual text against its nearest opaque background in both light and dark modes and requires WCAG contrast of at least 4.5:1.

The 112px mobile action reservation is retained for production and wider screens. DEV includes STEP and needs three button rows for the English tissue-box at 320px, so DEV widths up to 380px reserve 160px. Static fallback and hydrated workspace share the same CSS variable. A 320×640 English DEV regression confirms action bounds remain above the viewport, both reservations match, and opening the drawer keeps the viewport rectangle unchanged.

The two new regressions plus existing desktop, wide and short-desktop layout cases all pass (5/5) after the footer's 44px touch-target correction. See `evidence/cad/review-round1-fixes.log`.
