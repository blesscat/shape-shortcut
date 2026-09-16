# Proposal: Rectangle and ellipse cavity shapes for Organizer Box and OpenConnect Organizer

## Why

Both organizer components only offer a circle plus regular polygons (3-6 sides),
all sized by a single inscribed `holeDiameter`. Users storing rectangular items
(batteries, tool bits, cards) or oval items cannot match the cavity to the item
without wasting space, so the two most requested cavity primitives - a
rectangle with a corner radius and a true ellipse - should accept explicit
width/height sizing.

## What Changes

- Add `rectangle` and `ellipse` to the cavity `holeShape` enum of BOTH
  `opengrid-organizer-box` (Organizer Box / 收納方盒) and
  `opengrid-openconnect-organizer` (OpenConnect Organizer / 壁掛收納方格).
- Add three typed parameters to both components: `holeWidth` (cavity extent
  along local X), `holeHeight` (cavity extent along local Y), and
  `holeCornerRadius` (rectangle-only corner radius `r`). The existing five
  shapes keep using `holeDiameter` unchanged; `holeWidth`/`holeHeight` apply
  only to `rectangle` and `ellipse`, and `holeCornerRadius` applies only to
  `rectangle`.
- Rectangle cavities use `holeWidth` × `holeHeight` with corner radius
  `holeCornerRadius` (0 = sharp corners); ellipse cavities are true ellipses
  (no polygon approximation) with the width extent on local X and the height
  extent on local Y. No rotation parameter: width is always X, height is
  always Y.
- Envelope-based layout generalizes: a rectangle/ellipse cavity envelope is
  exactly `holeWidth` × `holeHeight`, feeding the existing
  envelope + spacing pitch, body derivation, workspace limit, and connector
  occupancy math unchanged.
- Parameter panels show diameter for the existing five shapes and swap to
  width / height (plus corner radius for rectangle) when `rectangle` or
  `ellipse` is selected.
- Export filenames encode the new shape parameters
  (`rectangle-w30-h20-r2`, `ellipse-w30-h20`) in place of the `d` token for
  the new shapes; existing shape filenames are unchanged.
- Persisted raw snapshots missing the new fields fall back to the new defaults
  through the existing raw-to-typed hydration path; no dedicated migration.
- No new component: existing model IDs, build keys, route slugs, catalog and
  CAD-kernel directories are intentionally preserved unchanged.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `opengrid-openconnect-organizer`: typed snapshot gains `holeWidth`,
  `holeHeight`, `holeCornerRadius`; `holeShape` gains `rectangle` and
  `ellipse`; cavity matrix requirement defines rectangular (with corner
  radius) and elliptical cavities and their envelope semantics; filename
  requirement covers the new shape tokens.
- `opengrid-organizer-box`: typed snapshot gains `holeWidth`, `holeHeight`,
  `holeCornerRadius`; `holeShape` gains `rectangle` and `ellipse`; cavity
  matrix requirement defines rectangular (with corner radius) and elliptical
  cavities and their envelope semantics; filename requirement covers the new
  shape tokens.

## Impact

- `src/cad-contract/units/opengrid-organizer-box.ts` and
  `src/cad-contract/units/opengrid-openconnect-organizer.ts`: shape union,
  configuration bounds/defaults, validation (including the
  `holeCornerRadius <= min(holeWidth, holeHeight) / 2` cross-field rule),
  envelope/layout helpers, file names.
- `src/components/cad/workspace/validation.ts`: raw-to-typed hydration gains
  defaults for the three new fields.
- `src/cad-kernel/components/opengrid-organizer-box/` and
  `src/cad-kernel/components/opengrid-openconnect-organizer/`: builder cavity
  cutters (rounded-rectangle sketch, ellipse sketch) and quality assertions
  (new expected face/geometry types; requires confirming replicad's geomType
  for an extruded ellipse and rounded-rectangle corner faces).
- Panels for both components: shape selector options plus conditional
  diameter/width/height/radius fields; i18n labels in `src/i18n/catalog.ts`.
- Worker dispatch (`src/workers/cad-worker-generation.ts`) parameter-key lists
  for both models.
- Tests: contract unit tests, builder/quality tests, panel e2e for both
  components.
- Two pre-existing HEAD breakages are repaired in passing because verification
  cannot pass without them: `opengrid-divider.ts` referenced the removed
  `interfaceFloorDatum` configuration key (now
  `interfaceFloorDatumStackable`, the same value 5 mm it held before the
  rename), and two stale e2e expectations (`底部加厚（Z）` label renamed at
  HEAD, and the organizer-box export filename expectation missing the `wt`
  wall-thickness token that the HEAD file stem already emits and the synced
  spec requires).
