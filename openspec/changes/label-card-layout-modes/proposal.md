# Label Card Layout Modes

## Why

The label card's text region currently takes all remaining safe-area width after
the icon, so centered text floats far from the icon on wide cards and the far
side looks empty. Icons are also a fixed 6 mm, and every icon except the hand-
drawn fastener pictograms is a thin Bootstrap outline (~0.38 mm strokes) that
prints poorly at 6 mm. Screw organizers need bold side-view screw icons whose
shaft length reflects the screw designation, plus a stacked icon-above-text
layout that only fits on a taller card.

## What Changes

- **BREAKING**: card height constant `OPENGRID_LABEL_CARD_HEIGHT` changes from
  10 mm to 12 mm; the integrated organizer front-slot pocket and the
  label-slot-test coupon regenerate from the same constant. Labels printed from
  earlier builds no longer fit slots printed from this build.
- New `layout` parameter: `inline` (icon beside text, default, current
  behavior) or `stacked` (icon above text, whole group centered, single text
  row only).
- New `groupAlign` parameter (`left`/`center`/`right`, default `center`): the
  combined icon + minimum gap + text block is positioned as one unit inside the
  safe area in inline layout, replacing "text fills the leftover region".
- New `iconSize` parameter (3–8 mm, step 0.5, default 6) scaling the icon in
  both layouts; stacked layout enforces `iconSize + 1 + textHeight ≤ 10`.
- Text row alignment (`textAlignment`, `textLine2Alignment`) is now measured
  against the widest text row (block-relative) instead of the leftover region.
- New screw icon category `screw-pan` and `screw-hex`: bold parametric side-
  view screw silhouettes (head + shaft + thread teeth) whose shaft length
  follows the first text row's `M<dia>[x<len>]` designation (4–30 mm mapped to
  0.35–1.0 shaft ratio, fallback 0.55). The category is isolated in
  `screw-shape.ts`; non-screw icons keep the static path pipeline unchanged.
- File name fingerprints gain `layout`, `groupAlign`, and `iconSize` tokens.
- Legacy parameter snapshots without the new keys fall back to the defaults
  (`inline`, `center`, 6).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `opengrid-label-card`: card height 10 → 12 mm, two layout modes with group
  alignment, adjustable icon size, block-relative row alignment, and the
  parametric screw icon category with text-linked shaft length.

## Impact

- `src/cad-contract/units/opengrid-label-shared.ts` (height constant), `opengrid-label-icons.ts` (new ids + category), `opengrid-label-card.ts` (new parameters, validation, defaults, file names)
- `src/cad-contract/units/model.ts` + `index.ts` (export new keys)
- `src/cad-kernel/components/opengrid-label-card/` (`screw-shape.ts` new, `icon-shape.ts` category routing, `builder.ts` layout algorithm, `quality.ts` bounds)
- `src/components/cad/workspace/validation/` (label-card keys, parser, raw-from-parameters)
- `src/features/cad/model-catalog/components/opengrid-label-card.ts` (schema, defaults), component panel UI, `src/i18n/catalog.ts`
- `openspec/specs/opengrid-label-card/spec.md` (delta), integrated organizer slot + slot-test coupon geometry regenerate from the shared constant
- Tests: contract validation, label-card integration geometry (bounds 12, group centering, stacked, screw shaft length), workspace round-trips, file name fingerprints
