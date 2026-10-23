# CAD and Playground author visual check

Local Chromium captures on port 3468, 2026-10-23. Desktop is 1280 × 900; mobile is 390 × 844. This is implementation-author cross-review, not independent acceptance review. No product code or reference snapshots were changed for capture.

| Image | State and observation |
| --- | --- |
| cad-ready-dark.png | Final box ready; enabled STL export. Clear panel/action contrast. The 520 px cap and corrected mount-time fit show the complete model and dimensions. Earlier exact-base clipping evidence is recorded in the checkpoint below, not in this final image. |
| cad-mobile-overlay-dark-before-fix.png | Original loading capture: actions, parameters and progress overlap. Historical evidence only. |
| cad-mobile-overlay-dark.png | Re-captured after frozen mobile layout, with ready model and enabled STL export. Actions occupy a separate row above the viewport, the drawer shows a visible model through its translucent background, and inputs/status remain readable. Chromium emulation only; Android physical review follows the PR per user direction. |
| cad-loading-light.png | WASM requests temporarily held to expose loading. Fallback model, warning badge, disabled exports and progress are legible. |
| cad-error-dark.png | HSW asset request intentionally returned 404. Error toast and failed fallback badge are visible; the retained retry/export controls are lower in the independently scrolling parameter panel. Top-right toast overlaps theme/locale header controls while shown. |
| playground-ready-light.png | Real ready Grid Box in an 8 × 8 scene. Neutral canvas and panel hierarchy are clear; initial scene occupies a small central area. |
| playground-mobile-overlay-light.png | Same scene resized, sidebar open. Model remains visible through overlay. Header scene controls also show through its upper area, causing some text interference. |

All six files were opened and visually inspected. These captures are representative states, not a complete route/model/viewport matrix or export correctness proof. Error and loading are deliberately controlled local states. Subsequent integration fixes require fresh captures for final acceptance. Playground overlay text bleed is a known legacy limitation; preserving live model visibility remains intentional, so this observation does not authorize replacing the panel with an opaque one.

## Snapshot review checkpoint

Initial Chromium run (single worker, output `/tmp/shape-refresh-snapshots`): 6 passed, 4 failed. Three failures were screenshots; the fourth expected an older integer-validation message. A separate temporary configuration produced candidates only under `/tmp/shape-refresh-snapshots/candidate`; no tracked reference was accepted at this checkpoint.

Visual comparison rejected the narrow gizmo candidate: a blue STL action partially covers its upper-left corner, unlike the stored reference. This is a current overlap regression, reported to C. Desktop box framing differs from stored references but matches exact-base runtime; nevertheless the change promises a 520 px desktop cap, so C is revising the viewport height budget. Final screenshot acceptance is deferred until that layout is frozen, then each changed reference must be visually reviewed again.

Frozen-layout candidate review inspected all 24 old/new pairs in eight comparison sheets under `/tmp/shape-refresh-snapshots/review-*.png`. The mobile STL/gizmo overlap is resolved. The desktop 520 px cap intentionally changes canvas aspect ratio, but HSW/OpenGrid initial and several orbit views now clip at the canvas edges; these were escalated rather than accepted automatically. At this checkpoint no reference was copied. The desktop gizmo test's obsolete `>520` assertion was reconciled with the explicit cap contract. Its obsolete localized integer-error expectation was reconciled with the exact-base evidence, preserving error role, `aria-invalid`, stale-preview and geometry checks.

## Final accepted references

After the initial-fit correction, all 24 pairs were inspected again: six orbit views each for box, HSW cell and OpenGrid; four light gizmo captures; dark viewport and dark gizmo. Complete models remain visible in every representative view, surfaces retain readable lighting, and gizmo axes are unobscured. The 24 reviewed candidates were then copied individually into their corresponding reference directories. No unreviewed directory-wide snapshot update was used.

These are deliberate layout and initial-fit changes as well as palette changes: desktop CAD now caps the viewport at 520 px, and mount-time bounds padding preserves room around geometry. This changes framing/zoom and the drag-relative orbit appearances. It does not represent a geometry change. Theme and mesh-update camera preservation are covered separately by C's regression suite. Thumbnail framing retains its separate setting.

Final ready, forced-loading, forced-error and mobile-ready drawer screenshots were re-captured and opened after the fit correction. Models are complete and status text remains readable. The previously noted toast/header overlap and translucent Playground header bleed remain documented limitations. Android/physical keyboard validation remains scheduled after the PR; these desktop Chromium captures do not claim it passed.

Final normal verification (without `--update-snapshots`): **10/10 Chromium tests passed** across `system-dark-mode`, `cad-lighting` and `cad-viewport-gizmo`, one worker, output `/tmp/shape-refresh-snapshots/final-verification`. The temporary candidate/base configurations and capture script were removed. `git diff --check` passed for the touched test and review record.
