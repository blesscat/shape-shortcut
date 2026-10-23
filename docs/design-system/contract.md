# Shared visual contract

Baseline: `baseline.html` contains schematic home/models/CAD light/dark compositions and actual-size favicon placements. It is not a production screenshot or proof of mobile-device acceptance. Review actual pages after integration.

## Frozen semantic pairs

| Role                     | Light             | Dark              |
| ------------------------ | ----------------- | ----------------- |
| Page                     | #F8F7F4           | #181A20           |
| Card/panel               | #FFFFFF           | #22252D           |
| Secondary surface        | #F0F0ED           | #2C303A           |
| Ink / muted              | #252833 / #626775 | #F1F2F6 / #ADB3C2 |
| Action / label           | #4659CF / #FFFFFF | #A8B5FF / #181A20 |
| Hover / pressed          | #3748B5 / #2E3D9F | #BBC5FF / #95A5F4 |
| Focus / link             | #4659CF           | #A8B5FF           |
| Selected soft / text     | #ECEFFC / #3748B5 | #2B3352 / #A8B5FF |
| Required field border    | #7D8493           | #828B9E           |
| Disabled surface / text  | #E5E7EB / #626775 | #303540 / #ADB3C2 |
| Success surface / text   | #EAF6EE / #1F7A3A | #23392B / #5CD68A |
| Warning surface / text   | #FFF4D6 / #69470D | #493812 / #FFE4A4 |
| Error text               | #A32828           | #FF9D9D           |
| Viewport / preview plate | #F0F1F4           | #181A20           |

Both CSS system fallback and explicit `.dark` use identical values. Action text always uses `--color-primary-foreground`, never assumed white. Disabled controls use paired surface/text without reducing whole-control opacity. Selected states also expose native checked/pressed state. Error/stale states retain text/symbols.

## Component and shell APIs

Existing Button variants remain, including `neon` as a compatibility alias for the primary action. Cards remain static by default; clickable surfaces opt into visible border/background response. Control/image radius 10px; cards 16px; large containers/dialogs 20px. Tags/segmented controls may stay pills. No decorative glow or static-card lift.

`--site-header-height`: 80px desktop; 128px at <=760px. Reserved shell height does not change on scroll; visible chrome shrinks by 8px. Content anchors use header height plus 16px. Navigation links stay directly available at >=1024px; medium widths use the disclosure on one row; small screens use native disclosure (works without JS), Escape/close restores trigger focus. Theme/locale do not change reserved height. Main content max 1200px unless `fullWidth` requested; CAD retains its existing 760px breakpoint.

UI/navigation use Nunito + Noto Sans TC; numeric/technical labels retain JetBrains Mono. Long text wraps. The baseline must be checked at 320/390px and desktop, then actual pages must be verified in both locales/themes. Readability thresholds: text 4.5:1, necessary control boundaries/focus 3:1. Manual state/browser checks remain required beyond pairwise arithmetic.

## Verification record

- Schematic desktop/mobile baseline rendered and desktop reviewed: paper/graphite distinction, readable paired actions and long-name wrapping are visible. Actual pages are independently reviewed during integration.
- Favicon raster headers: ICO 16/32/48px, touch PNG 180px. Actual-size S silhouette inspected in baseline.
- `pnpm check`: 0 errors / 0 warnings.
- Focused Chromium navigation/theme/favicon: 8 passed (both locales; stable content position; 320px menu; no-JS disclosure; Escape/focus; reduced motion; theme persistence; icon head/asset responses).
- These checks do not constitute the full cross-route or real-device CAD acceptance matrix.

## Pairwise arithmetic (not rendered-page validation)

| Pair                 | Contrast |
| -------------------- | -------- |
| Light action         | 5.85:1   |
| Light hover          | 7.62:1   |
| Light pressed        | 9.19:1   |
| Dark action          | 8.88:1   |
| Dark hover           | 10.39:1  |
| Dark pressed         | 7.43:1   |
| Light disabled       | 4.56:1   |
| Dark disabled        | 5.85:1   |
| Light field boundary | 3.75:1   |
| Dark field boundary  | 4.48:1   |
| Light info           | 5.93:1   |

## Cross-domain review

Readonly review of B/C at 320px found no horizontal overflow on en/models, zh-Hant/docs or en/about. Both 390px/320px baseline images were visually inspected: names wrap and light/dark hierarchy is retained (schematic, not mobile split acceptance).

Reported to domain owners: remaining calculator white action labels and disabled foreground pairing (C); 20px standalone document links and half-opacity focus rings (B). Integration must verify their fixes. A found model dialogs extending below a 700px viewport because a 64px top offset was combined with a viewport-minus-32px maximum height; narrow dialog top is now 16px. A focused check covers viewport fit, scrolling to the final content, close-button keyboard reachability and returning focus to the opener.

This author cross-review is not the formal independent reviewer round.

Dialog regression: Chromium 320×700 check passed (1/1): within viewport, final content visible after scrolling, close focusable/activatable by keyboard, opener focus restored. B reported correcting standalone docs target heights and home/About focus rings; these remain subject to integration verification.
