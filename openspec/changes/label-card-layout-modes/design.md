# Label Card Layout Modes — Design

## Context

The label card is a two-part (body + accent) model built in
`src/cad-kernel/components/opengrid-label-card/`, contract in
`src/cad-contract/units/opengrid-label-card.ts`, shared constants in
`opengrid-label-shared.ts`. The builder currently lays the icon flush to the
safe-area edge, reserves `iconSize + iconTextGap`, and lets text fill the whole
leftover region. Icons are static SVG paths extruded through
`icon-shape.ts`; only the eight fastener pictograms are hand-drawn solids. The
card height constant `OPENGRID_LABEL_CARD_HEIGHT = 10` also drives the
integrated organizer slot pocket (`label-slot.ts`) and the label-slot-test
coupon, so card and slot regenerate together. The validation side was recently
split into `src/components/cad/workspace/validation/` modules
(model-parameter-keys, model-raw-parsers/*, raw-from-parameters).

## Goals / Non-Goals

**Goals:**

- Inline group layout: icon + minimum gap + text block positioned as one unit
  (`groupAlign`), instead of text filling leftover space.
- Stacked layout: icon centered above a single text row, whole stack centered.
- Adjustable `iconSize` in both layouts.
- Row alignment measured against the widest non-empty row.
- Bold parametric side-view screw icons (`screw-pan`, `screw-hex`) whose shaft
  length follows the first text row's `M<dia>[x<len>]` designation, isolated in
  their own module and gated on the icon category.
- Card height 12 mm so the stacked layout fits readable sizes; slot pocket and
  coupon regenerate from the same constant.

**Non-Goals:**

- No free-drag canvas placement or arbitrary icon offsets.
- No standalone screw-tag model; the category lives inside the label card.
- No changes to other icons' static path pipeline or to the general two-row
  text feature in inline layout.
- No card width model change (gridUnits × 10 mm stays).

## Decisions

- **Height as a shared constant (10 → 12).** Card, slot pocket, and coupon all
  read `OPENGRID_LABEL_CARD_HEIGHT`; one constant keeps them consistent, and
  nothing is merged to main yet so there is no legacy fleet of 10 mm slots to
  honor. Alternative considered: parameterizing height per card — rejected
  because the slot pocket must match the card and a second dimension would
  complicate the file name fingerprint for little value.
- **Layout as an enum parameter, not derived.** `layout: 'inline' | 'stacked'`
  with default `inline`; stacked forces a single text row at validation time
  (field error on `textLine2`) rather than silently ignoring it, so persistence
  round-trips stay lossless.
- **Group layout math.** Block width = max measured bounding-box width of
  non-empty rows (the builder already measures rows for the TOO_WIDE check; the
  same measurement is reused). Group width = (has icon ? iconSize : 0) +
  (has icon && has text ? 2 : 0) + blockWidth. Inline positions the group at
  `groupAlign` inside `[-safeHalfWidth, safeHalfWidth]`; rows align inside the
  block per their own alignment. Stacked centers the icon above the row with a
  1 mm vertical gap inside the 10 mm safe height.
- **Validation order for stacked constraints.** `iconSize + 1 + textHeight`
  against the 10 mm safe height is a contract-level field error
  (`field: 'iconSize'` on overflow), while a second non-empty row is a
  `textLine2` error — both at raw-parse/validate time so no ready revision can
  carry an impossible layout.
- **Screw icons as a category, not a new model.**
  `OPENGRID_LABEL_SCREW_ICON_IDS = ['screw-pan', 'screw-hex']` in
  `opengrid-label-icons.ts`; `icon-shape.ts` routes those ids to the new
  `screw-shape.ts` module which returns an extruded single silhouette (head +
  shaft + thread teeth) from `(style, shaftRatio, depth, iconSize)`. Text
  parsing (`/M\d+(?:x(\d+))?/i`, first non-empty row; length clamped 4–30 mm to
  ratio 0.35–1.0, fallback 0.55) also lives there. Non-screw icons never reach
  this code, so general labels are unaffected. Alternatives: static per-length
  icons (rejected: manual, loses the linkage), a separate screw-tag model
  (rejected: duplicates the layout engine being built here).
- **Even-odd safety for parametric icons.** The screw silhouette is one
  continuous outline (head profile flows into the shaft; thread teeth are
  notches in the outline), so no overlapping contours exist and even-odd
  grouping cannot produce holes.
- **File name fingerprint.** `layout`, `groupAlign`, and `iconSize` join the
  existing token list; all three change geometry, so exports must not collide.
- **Row alignment semantics.** `textAlignment`/`textLine2Alignment` keep their
  keys and persistence; their reference frame changes from "leftover region" to
  "widest non-empty row" in inline layout. Centered rows in a group-centered
  card visually coincide with the old center alignment; left/right rows now hug
  the text block, which is the requested behavior.

## Risks / Trade-offs

- [Printed organizers from earlier builds have 10 mm slots] → Accepted by the
  user; nothing is on main, and slot + card regenerate together from one
  constant going forward.
- [Stacked layout squeezes text to ~3.5–5 mm] → Mitigated by the explicit
  `iconSize + 1 + textHeight ≤ 10` validation with a field error instead of
  silent shrink.
- [12 mm touches slot pocket, coupon, quality bounds, and several tests] →
  Mitigation: single-constant change plus a mechanical assertion update pass;
  integration tests regenerate real OCC geometry.
- [Parametric screw icons bypass the static path pipeline] → Mitigated by
  routing through `icon-shape.ts` (same extrude/translate/depth conventions)
  and extending the existing "every icon extrudes non-empty" integration test
  with shaft-ratio cases.
- [Wider file names] → Accepted; tokens are short and collisions would be a
  correctness bug.

## Migration Plan

Legacy snapshots hydrate missing keys to `inline` / `center` / 6 mm; no stored
data is rewritten until the next save. Height change is compile-time constant —
no data migration. Rollback is reverting the commit; geometry regenerates.

## Open Questions

(none)
