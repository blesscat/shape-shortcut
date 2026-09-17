## MODIFIED Requirements

### Requirement: Organizer-box parameters and linked spacing

The canonical organizer-box snapshot MUST contain typed `holeCountX`,
`holeCountY`, `holeSpacingMode`, `holeSpacingX`, `holeSpacingY`, `holeShape`,
`holeDiameter`, `holeWidth`, `holeHeight`, `holeCornerRadius`, `holeDepth`,
`bottomThickness`, `wallThickness`, `cornerSeatMode`, `boxMode`, and
`stackingClearanceHeight` fields.
`holeSpacingMode` MUST be either `linked` or `independent`; `holeShape` MUST be
one of `circle`, `triangle`, `square`, `pentagon`, `hexagon`, `rectangle`, or
`ellipse`; `cornerSeatMode` MUST be one of `none`, `detachable-corner-seat`, or
`integrated`; and `boxMode` MUST be either `normal` or `stackable`.

Hole counts MUST be positive integers. All dimensional values MUST be finite
millimetres, the bottom thickness MUST be non-negative and default to 1 mm, and
the wall thickness MUST default to 2 mm and MUST NOT exceed 100 mm. Hole width
and hole height MUST stay within the component's existing cavity-diameter
bounds, and the hole corner radius MUST satisfy
`0 <= holeCornerRadius <= min(holeWidth, holeHeight) / 2` for every selected
shape. The wall thickness MUST be at least 2 mm in normal mode and at least
2.95 mm in stackable mode. `stackingClearanceHeight` MUST default to 3.5 mm,
MUST be at least 3.5 mm, and MUST use the Organizer Box's existing 0.5 mm
input increment. The defaults for the new fields MUST be `holeWidth=20`,
`holeHeight=20`, and `holeCornerRadius=0`. The component MUST reject any
snapshot whose derived footprint exceeds the existing OpenGrid 500 mm workspace
limit, whose wall thickness is below the minimum required by the selected body
mode, whose corner radius is outside its allowed range, or whose selected
shape/depth combination is geometrically invalid. In linked spacing mode, the
canonical X and Y spacing values MUST be equal; in independent mode they MAY
differ.

The parameter hydrator MUST accept the exact legacy Organizer Box snapshot
shape containing `bottomInterfaceMode` and migrate it before validation.
Legacy `corner-seat` MUST become `cornerSeatMode=integrated` and
`boxMode=normal`; legacy `detachable-corner-seat` MUST become
`cornerSeatMode=detachable-corner-seat` and `boxMode=normal`; and legacy
`stackable` MUST become `cornerSeatMode=none` and `boxMode=stackable`. Every
legacy migration MUST set `stackingClearanceHeight=3.5` and `wallThickness` to
the 0.5 mm grid value of the migrated body mode's minimum (2 mm normal,
3 mm stackable). Canonical
snapshots missing `wallThickness` MUST fail
validation and fall back through the existing malformed-entry path; no
dedicated hydrator is added for them. Canonical snapshots missing
`holeWidth`, `holeHeight`, or `holeCornerRadius` MUST fail validation through
the same malformed-entry path without a per-field migration. Accepted
persistence, Worker requests, and exports MUST emit only the canonical fields
and MUST NOT emit `bottomInterfaceMode`.

#### Scenario: Default organizer-box snapshot

- **WHEN** the organizer-box route has no valid persisted parameters
- **THEN** it MUST select a circle cavity shape
- **AND** it MUST select linked X/Y spacing
- **AND** it MUST use a 1 mm bottom thickness
- **AND** it MUST use a 2 mm wall thickness
- **AND** it MUST select `鎖定角座`, normalized as
  `cornerSeatMode=detachable-corner-seat`
- **AND** it MUST select `普通模式`, normalized as `boxMode=normal`
- **AND** it MUST use `stackingClearanceHeight=3.5`
- **AND** it MUST use `holeWidth=20`, `holeHeight=20`, and
  `holeCornerRadius=0`

#### Scenario: Linked spacing control

- **WHEN** the user selects linked spacing
- **THEN** the panel MUST expose one spacing value that represents both axes
- **AND** changing that value MUST update both canonical spacing values
- **AND** validation MUST reject a linked snapshot with unequal X/Y spacing

#### Scenario: Independent spacing control

- **WHEN** the user selects independent spacing
- **THEN** the panel MUST expose separate X and Y edge-to-edge spacing values
- **AND** the generated layout MUST use the X value horizontally and the Y
  value vertically

#### Scenario: Legacy bottom-interface snapshot is hydrated

- **WHEN** persistence contains an otherwise valid legacy snapshot with
  `bottomInterfaceMode=stackable`
- **THEN** hydration MUST produce `cornerSeatMode=none`,
  `boxMode=stackable`, `stackingClearanceHeight=3.5`, and
  `wallThickness=3`
- **AND** the next accepted canonical snapshot MUST omit `bottomInterfaceMode`

#### Scenario: Wall thickness control

- **WHEN** the panel renders the wall thickness control
- **THEN** the control MUST use the label `壁厚` with a 0.5 mm increment and a
  100 mm maximum
- **AND** in normal mode its floor MUST be 2 mm and in stackable mode its
  selectable floor MUST be 3 mm (the 0.5 mm grid value of the 2.95 mm
  contract minimum)
- **AND** switching to stackable mode while the current value is below the
  stackable floor MUST raise the value to that floor
- **AND** validation MUST reject a normal-mode snapshot below 2 mm and a
  stackable snapshot below 2.95 mm with a field-specific error

#### Scenario: Reject an out-of-range corner radius

- **WHEN** a snapshot sets `holeCornerRadius` below 0 or above
  `min(holeWidth, holeHeight) / 2`
- **THEN** validation MUST return a field-specific `holeCornerRadius` error
- **AND** the invalid snapshot MUST NOT send `model.generate`, replace the
  last valid revision, or enable export

#### Scenario: Persisted snapshot predating the new fields falls back

- **WHEN** persistence contains a snapshot without `holeWidth`, `holeHeight`,
  or `holeCornerRadius`
- **THEN** hydration MUST reject it through the existing malformed-entry path
- **AND** the component MUST fall back to organizer-box defaults

#### Scenario: Invalid organizer-box input

- **WHEN** a snapshot contains a non-positive count, non-finite or invalid
  dimension, unsupported enum value, overlapping layout, a wall thickness
  below the selected body mode's minimum, a stacking clearance below 3.5 mm
  or off the 0.5 mm input grid, or a footprint above 500 mm
- **THEN** validation MUST return a diagnosable field-specific error
- **AND** the invalid snapshot MUST NOT send `model.generate`
- **AND** it MUST NOT replace the last valid revision or enable export

### Requirement: Shaped blind cavity matrix

The generated organizer box MUST contain one cavity for every combination of
the requested X and Y hole indices. All cavities in one box MUST use the same
selected shape, diameter, width, height, corner radius, depth, and fixed
orientation. A circular cavity MUST use `holeDiameter` as its circular
diameter. A regular polygon cavity MUST use `holeDiameter` as the diameter of
its inscribed circle (the distance between opposite sides), including the 3-,
4-, 5-, and 6-sided choices. A rectangular cavity MUST use `holeWidth` as its
local X extent and `holeHeight` as its local Y extent, MUST round each corner
with radius `holeCornerRadius` (a zero radius MUST produce sharp corners), and
MUST NOT be rotatable: its width axis is always local X and its height axis is
always local Y. An elliptical cavity MUST be a true analytic ellipse rather
than a faceted approximation, MUST use `holeWidth` as its local X axis extent
and `holeHeight` as its local Y axis extent, and MUST NOT be rotatable. A
rectangular or elliptical cavity's outer envelope MUST equal exactly
`holeWidth` × `holeHeight`; the corner radius MUST round inside that envelope
without shrinking it.

`holeSpacingX` and `holeSpacingY` MUST represent the clear distance from the
outer envelope of one cavity to the outer envelope of its adjacent cavity, not
the distance between cavity centers. The cavity array MUST be centered in the
derived outer footprint. Cavities MUST be blind from the top, stop at the
requested depth, and the cavity floor MUST sit the requested bottom thickness
above the active body-interface datum. That datum MUST remain 2 mm in normal
mode and 5 mm in stackable mode for every seat choice, and MUST NOT depend on
`cornerSeatMode`. The body between cavities and all side walls MUST remain
solid. The selected body and seat modes MAY shape the underside within their
specified interface envelopes even where that envelope meets a storage cavity,
and the top stacking structure MAY extend above the cavity-opening plane. The
component MUST NOT expose side-opening controls or generate side openings.

#### Scenario: Circular cavity matrix

- **WHEN** a valid snapshot selects `circle` with X/Y counts, diameter, depth,
  and spacing
- **THEN** the result MUST contain exactly the requested number of circular
  blind cavities
- **AND** adjacent cavity boundaries MUST be separated by the requested X/Y
  edge-to-edge spacing within geometry tolerance
- **AND** every cavity floor MUST sit the requested bottom thickness above the
  active body-interface datum

#### Scenario: Polygon cavity matrix

- **WHEN** a valid snapshot selects `triangle`, `square`, `pentagon`, or
  `hexagon`
- **THEN** every cavity MUST be a regular polygon with the selected side count
- **AND** the selected diameter MUST be measured by its inscribed circle
- **AND** every polygon cavity MUST use the same fixed orientation
- **AND** adjacent polygon outer envelopes MUST respect the requested X/Y
  edge-to-edge spacing

#### Scenario: Rectangular cavity matrix

- **WHEN** a valid snapshot selects `rectangle` with `holeWidth=30`,
  `holeHeight=20`, and `holeCornerRadius=2`
- **THEN** every cavity MUST be a 30 mm × 20 mm rectangle with 2 mm corner
  radii, fixed with the 30 mm extent on local X and the 20 mm extent on local Y
- **AND** adjacent outer envelopes MUST respect the requested X/Y edge-to-edge
  spacing
- **AND** every cavity floor MUST sit the requested bottom thickness above the
  active body-interface datum

#### Scenario: Elliptical cavity matrix

- **WHEN** a valid snapshot selects `ellipse` with `holeWidth=30` and
  `holeHeight=20`
- **THEN** every cavity MUST be a true ellipse whose local X axis extent is
  30 mm and whose local Y axis extent is 20 mm without any faceted
  approximation
- **AND** adjacent outer envelopes MUST respect the requested X/Y edge-to-edge
  spacing

#### Scenario: Deep cavities preserve the bottom

- **WHEN** the user increases `holeDepth` or `bottomThickness`
- **THEN** the cavity floor MUST move according to the requested depth
- **AND** the remaining solid bottom MUST reach at least the body-interface
  datum plus the requested bottom thickness outside every active stacking
  envelope
- **AND** the overall Z extent MUST be derived from cavity depth, bottom
  thickness, body mode, and stackable clearance rather than an unrelated
  manually entered height

#### Scenario: Stacking clearance does not alter storage cavities

- **WHEN** only `stackingClearanceHeight` changes on a stackable Organizer Box
- **THEN** every cavity opening, floor, depth, diameter, center, and spacing
  MUST remain unchanged
- **AND** only the connected structure above the cavity-opening plane and the
  resulting upper Z bound MUST change

### Requirement: Preview, persistence, and exports

Every valid organizer-box snapshot MUST generate a non-empty watertight single
solid centered on X/Y with a valid bottom reference, remain previewable through
the existing Worker revision lifecycle, and support STEP and binary STL export.
The export filenames MUST identify the organizer-box model and include every
parameter that changes cavity, body-mode, corner-seat, or stacking-clearance
geometry, including shape, diameter, counts, spacing, depth, wall thickness,
bottom thickness, corner-seat mode, body mode, and stackable clearance when
active. For `rectangle` the shape token MUST be
`rectangle-w<holeWidth>-h<holeHeight>-r<holeCornerRadius>` and for `ellipse`
it MUST be `ellipse-w<holeWidth>-h<holeHeight>`; in both cases these tokens
MUST replace the diameter token, and existing shape filename tokens MUST
remain unchanged.

Valid organizer-box parameters MUST persist under the independent
`opengrid-organizer-box` model ID. Invalid or incomplete raw input MUST NOT
overwrite the last accepted persisted snapshot, and a malformed persisted entry
MUST fall back to organizer-box defaults without affecting other components.

#### Scenario: Valid result is previewable and exportable

- **WHEN** a valid organizer-box snapshot completes generation in any of the six
  body/seat combinations
- **THEN** the Worker MUST commit a non-empty single solid revision
- **AND** the viewport MUST display the selected cavity matrix, body interface,
  seat interface, and top rail when applicable
- **AND** STEP and STL export MUST be enabled for that revision

#### Scenario: Parameter persistence is isolated

- **WHEN** a valid organizer-box parameter update is accepted
- **THEN** only the `opengrid-organizer-box` persistence entry MUST change
- **AND** navigating to another model MUST NOT inherit organizer-box values

#### Scenario: Name exports for the new shapes

- **WHEN** a valid snapshot selects `rectangle` with `holeWidth=30`,
  `holeHeight=20`, and `holeCornerRadius=2`, or selects `ellipse` with
  `holeWidth=30` and `holeHeight=20`
- **THEN** the STEP and STL filenames MUST contain `rectangle-w30-h20-r2` or
  `ellipse-w30-h20` respectively without a diameter token
- **AND** a `circle` snapshot's filename MUST remain unchanged from the
  existing pattern
