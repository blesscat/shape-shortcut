# Label Card Layout Modes — Tasks

## 1. Contract (units)

- [x] 1.1 Change `OPENGRID_LABEL_CARD_HEIGHT` to 12 in `opengrid-label-shared.ts`
- [x] 1.2 Add `screw-pan` and `screw-hex` to `OpenGridLabelCardIconId`/`OPENGRID_LABEL_CARD_ICON_IDS` and add `OPENGRID_LABEL_SCREW_ICON_IDS` category constant in `opengrid-label-icons.ts`
- [x] 1.3 Extend `OpenGridLabelCardParameters`/key list with `layout`, `groupAlign`, `iconSize` (types, defaults `inline`/`center`/6, validation: ranges, stacked rejects `textLine2`, stacked `iconSize+1+textHeight ≤ 10`) in `opengrid-label-card.ts`
- [x] 1.4 Add `layout`/`groupAlign`/`iconSize` tokens to the card file name functions and default configuration
- [x] 1.5 Export new key types/constants through `units/model.ts` and the barrel

## 2. Kernel geometry

- [x] 2.1 Create `screw-shape.ts`: parametric side-view screw silhouette (pan/hex head + shaft + thread teeth, single even-odd-safe contour, min feature ≥ 1.5 units) from `(headStyle, shaftRatio, depth, iconSize)`
- [x] 2.2 Add the `M<dia>[x<len>]` text parser (clamp 4–30 mm → ratio 0.35–1.0, fallback 0.65) in `screw-shape.ts`
- [x] 2.3 Thread `iconSize` through `icon-shape.ts` scaling and branch screw-category ids to `screw-shape.ts` from the builder
- [x] 2.4 Rewrite the builder layout: measure block width (widest non-empty row), compute group width, position by `groupAlign` in inline layout; stacked places icon above the centered row with 1 mm vertical gap; keep rail margins and icon/text minimum gap
- [x] 2.5 Update `quality.ts` accent-bound checks for the 12 mm height and add an icon/text overlap rejection

## 3. Workspace validation

- [x] 3.1 Add `layout`/`groupAlign`/`iconSize` to the label-card key list in `model-parameter-keys.ts`
- [x] 3.2 Parse and validate the new fields in `model-raw-parsers/label-card.ts` (stacked rejects `textLine2`, stacked height constraint, ranges/step)
- [x] 3.3 Serialize the new fields in `raw-from-parameters.ts`

## 4. Catalog, panel, i18n

- [x] 4.1 Add `layout`/`groupAlign`/`iconSize` schema fields and defaults in `model-catalog/components/opengrid-label-card.ts`
- [x] 4.2 Add panel controls: layout selector, groupAlign segmented control (inline only), iconSize slider; disable second text row and groupAlign in stacked mode
- [x] 4.3 Add zh-Hant/en i18n labels for the new controls and the two screw icons

## 5. Tests

- [x] 5.1 Update contract tests: new-field validation (ranges, stacked single-row, stacked height constraint), defaults/legacy hydration, file name fingerprint tokens
- [x] 5.2 Update integration tests for the 12 mm bounds and add geometry tests: inline group centering/left/right positioning, stacked stack layout, screw shaft length vs `M4`/`M4x16` designations, screw icon extrusion for both heads
- [x] 5.3 Update workspace round-trip and system-entry-context expectations for the new keys
- [x] 5.4 Run `pnpm exec tsc --noEmit`, `vitest --project=fast`, and the label-card/integrated-slot cad tests; fix fallout

## 6. Spec sync and verification

- [ ] 6.1 Sync the label-card spec delta into main specs and validate
- [x] 6.2 Regenerate the label-card model-previews captures (default inline previews; a stacked sample with screw-pan/M4x16 captured to stacked-sample.png in this change folder)
