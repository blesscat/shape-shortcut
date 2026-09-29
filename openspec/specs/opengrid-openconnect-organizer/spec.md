# OpenGrid OpenConnect Organizer Specification

## Purpose

Provide a directly wall-mounted OpenGrid organizer with configurable shaped
cavities, an integrated locked OpenConnect female interface, and a forward
tilt that moves the cavity openings toward the user for easier access.

## Requirements

### Requirement: Stable wall-organizer component identity

The system MUST expose an independent OpenGrid component whose model ID, build
key, route slug, catalog component directory, and CAD-kernel component
directory are all `opengrid-openconnect-organizer`. Its user-facing display
name MUST begin with `OpenGrid `, its CAD route MUST be
`/cad/opengrid-openconnect-organizer`, and it MUST be discoverable in the
OpenGrid Wall subgroup but not the OpenGrid Desk subgroup. Existing model IDs,
routes, persisted entries, generators, and export names MUST remain unchanged.

#### Scenario: Resolve the organizer consistently

- **WHEN** the catalog, route resolver, persistence layer, or CAD Worker receives
  `opengrid-openconnect-organizer`
- **THEN** every layer MUST resolve the same independent component
- **AND** no existing OpenGrid model MUST be substituted or migrated

#### Scenario: Show the organizer only in the wall system

- **WHEN** the OpenGrid catalog is grouped by system context
- **THEN** `opengrid-openconnect-organizer` MUST appear in the Wall subgroup
- **AND** it MUST NOT appear in the Desk subgroup

### Requirement: Organizer parameters are typed and independently persisted

The normalized parameter snapshot MUST contain exactly `holeCountX`,
`holeCountY`, `holeSpacingMode`, `holeSpacingX`, `holeSpacingY`, `holeShape`,
`holeDiameter`, `holeWidth`, `holeHeight`, `holeCornerRadius`, `holeDepth`,
`bottomThickness`, `edgeThickness`, `tiltAngle`, `openConnectHorizontalAlignment`,
`openConnectVerticalAlignment`, `labelSlotEnabled`, and `labelGridUnits`.
`labelSlotEnabled` MUST be boolean and `labelGridUnits` MUST be an integer from 1 through 10.
`holeSpacingMode` MUST be either `linked` or `independent`, and `holeShape`
MUST be one of `circle`, `triangle`, `square`, `pentagon`, `hexagon`,
`rectangle`, or `ellipse`.

Hole counts MUST be safe integers from 1 through 20. X/Y spacing MUST be finite
from 0.5 through 300 mm, hole diameter MUST be finite from 1 through 300 mm,
hole width and hole height MUST each be finite from 1 through 300 mm, the hole
corner radius MUST be finite and MUST satisfy
`0 <= holeCornerRadius <= min(holeWidth, holeHeight) / 2` for every selected
shape, hole depth MUST be finite from 1 through 500 mm, and bottom thickness
MUST be finite from 0 through 100 mm. `edgeThickness` MUST be finite from 0.4
through 100 mm. `tiltAngle` MUST be a finite value from 0 through 45 degrees on
whole-degree steps. The defaults MUST be `{ holeCountX: 2,
holeCountY: 2, holeSpacingMode: 'linked', holeSpacingX: 1, holeSpacingY: 1,
holeShape: 'circle', holeDiameter: 20, holeWidth: 20, holeHeight: 20,
holeCornerRadius: 0, holeDepth: 28, bottomThickness: 1,
edgeThickness: 1, tiltAngle: 15, openConnectHorizontalAlignment: 'center', openConnectVerticalAlignment: 'top' }`. In linked spacing mode the two canonical
spacing values MUST be equal; in independent mode they MAY differ.

The component MUST reject missing required geometry fields or unknown fields, unsupported enum values,
non-finite or out-of-range dimensions, a corner radius outside its allowed
range, fractional counts, off-step angles, unsafe cavity-to-interface
collisions, and any derived installed or print-oriented extent above the
existing 500 mm workspace limit. Invalid input MUST produce a field-specific
diagnostic and MUST NOT replace the last valid revision, persist, generate, or
become exportable. A persisted snapshot that predates the required cavity shape fields MUST fall
back to the defaults through the existing malformed-entry path without a
per-field migration, and no other component's persisted entry MAY be affected.

#### Scenario: Initialize the default organizer

- **WHEN** the organizer route starts without a valid saved snapshot
- **THEN** it MUST initialize the exact default snapshot with `holeDepth=28`
- **AND** its first Worker request MUST use
  `modelId=opengrid-openconnect-organizer`

#### Scenario: Link the X and Y spacing controls

- **WHEN** the user selects linked spacing and changes its visible spacing value
- **THEN** both canonical spacing fields MUST receive that value
- **AND** validation MUST reject a linked snapshot whose X/Y values differ

#### Scenario: Configure the axes independently

- **WHEN** the user selects independent spacing
- **THEN** the panel MUST expose separate X and Y edge-to-edge spacing controls
- **AND** generation MUST preserve both accepted values

#### Scenario: Configure the outer edge and open bottom

- **WHEN** the user sets `edgeThickness` and `bottomThickness=0`
- **THEN** the cavity matrix MUST retain at least the selected edge distance on
  both local X and Y sides
- **AND** every cavity MUST open through the body underside

#### Scenario: Use whole-degree forward tilt

- **WHEN** the user changes the forward-tilt control
- **THEN** the accepted value MUST change in one-degree steps
- **AND** a fractional-degree value MUST be rejected

#### Scenario: Reject invalid organizer input

- **WHEN** any required geometry field is missing, unknown, malformed, out of range,
  or produces an unsafe or oversized layout
- **THEN** validation MUST identify the affected field or parameter object
- **AND** no generation, persistence, or export MUST be accepted for that input

#### Scenario: Reject an out-of-range corner radius

- **WHEN** a snapshot sets `holeCornerRadius` below 0 or above
  `min(holeWidth, holeHeight) / 2`
- **THEN** validation MUST report a field-specific `holeCornerRadius` error
- **AND** no generation, persistence, or export MUST be accepted for that input

#### Scenario: Persisted snapshot predating the new fields falls back

- **WHEN** persistence contains a snapshot without `holeWidth`, `holeHeight`,
  or `holeCornerRadius`
- **THEN** hydration MUST reject it through the existing malformed-entry path
- **AND** the component MUST fall back to its default snapshot

### Requirement: Shaped cavities form a centered local matrix

The organizer MUST contain exactly one cavity for every requested X/Y
index pair. Every cavity in one result MUST share the selected shape, diameter,
width, height, corner radius, depth, orientation, and axis. A circular cavity
MUST use `holeDiameter` as its diameter. A triangular, square, pentagonal, or
hexagonal cavity MUST be a regular polygon and use `holeDiameter` as its
inscribed-circle diameter, equal to the distance between opposite sides where
such opposite sides exist. A rectangular cavity MUST use `holeWidth` as its
local X extent and `holeHeight` as its local Y extent, MUST round each corner
with radius `holeCornerRadius` (a zero radius MUST produce sharp corners), and
MUST NOT be rotatable: its width axis is always local X and its height axis is
always local Y. An elliptical cavity MUST be a true analytic ellipse rather
than a faceted approximation, MUST use `holeWidth` as its local X axis extent
and `holeHeight` as its local Y axis extent, and MUST NOT be rotatable.

For the selected shape's fixed local orientation, let `envelopeX` and
`envelopeY` be its outer X/Y envelope. A rectangular or elliptical cavity
envelope MUST equal exactly `holeWidth` × `holeHeight`; the corner radius MUST
round inside that envelope without shrinking it. The local center pitches MUST
be `envelopeX + holeSpacingX` and `envelopeY + holeSpacingY`; therefore the
spacing values represent clear outer-envelope-to-outer-envelope material, not
center distance. The cavity matrix MUST be centered in the organizer opening
plane. Each cavity MUST stop at the requested axial depth and leave exactly the
requested positive bottom thickness, within geometry tolerance, between its
floor and the parallel body underside. When `bottomThickness=0`, every cavity
MUST pass fully through the parallel body underside and MUST NOT retain a cavity
floor. Side walls and material between adjacent cavities MUST remain solid.

The local body width MUST be
`max(28 mm, requiredSpanX + 2 * edgeThickness)`, and the local body depth MUST
be `requiredSpanY + 2 * edgeThickness`; neither dimension MAY be rounded up to
a 28 mm Desk-style grid envelope. The cavity matrix MUST remain centered, so
the clear X/Y distance from its outer envelope to each corresponding body edge
MUST be at least `edgeThickness`. Any extra width required by the 28 mm minimum
MUST be divided equally between the two X edges.

The two front-facing vertical outer corners, farthest from the wall interface,
MUST use a target radius of 2.5 mm. The actual radius MUST be the smallest of
2.5 mm, `edgeThickness * (2 + sqrt(2))`, and `bodyDepth - 0.05 mm`. These
limits MUST keep the worst-case square cavity envelope inside the rounded body
and preserve at least 0.05 mm of straight side before the rear corner. This
rounding MUST NOT be applied to the two rear vertical body corners.

#### Scenario: Generate circular cavities

- **WHEN** a valid snapshot selects `circle`
- **THEN** the result MUST contain exactly `holeCountX * holeCountY` circular
  cavities
- **AND** their diameter, depth, X/Y edge spacing, and bottom thickness MUST
  match the accepted snapshot within geometry tolerance

#### Scenario: Generate through-open cavities

- **WHEN** `bottomThickness=0`
- **THEN** every requested cavity MUST open through both the organizer opening
  plane and the parallel body underside
- **AND** the surrounding perimeter and inter-cavity walls MUST remain solid

#### Scenario: Size the outer body without grid rounding

- **WHEN** the selected cavity matrix plus its two X edge thicknesses is less
  than 28 mm wide
- **THEN** the body width MUST be exactly 28 mm
- **AND** for every larger matrix the body width MUST follow its continuous
  cavity-envelope calculation without rounding to a 28 mm multiple

#### Scenario: Round the two front vertical corners

- **WHEN** the organizer is generated with the default `edgeThickness=1 mm`
- **THEN** its two front-facing vertical outer corners MUST each have a 2.5 mm
  radius
- **AND** the rear vertical body corners MUST remain unrounded

#### Scenario: Preserve a thinner selected edge

- **WHEN** the requested R2.5 corner would violate the selected edge allowance
- **THEN** each front-corner radius MUST be limited to
  `edgeThickness * (2 + sqrt(2))`
- **AND** the accepted thin-edge layout MUST remain a valid connected solid

#### Scenario: Preserve a shallow-body rear edge

- **WHEN** the target radius would leave less than 0.05 mm of straight body
  side before a rear corner
- **THEN** each front-corner radius MUST be limited to `bodyDepth - 0.05 mm`
- **AND** the accepted shallow body MUST remain a valid connected solid

#### Scenario: Generate regular polygon cavities

- **WHEN** a valid snapshot selects `triangle`, `square`, `pentagon`, or
  `hexagon`
- **THEN** every cavity MUST use the corresponding regular polygon
- **AND** its inscribed-circle diameter, fixed orientation, depth, X/Y outer
  envelope spacing, and bottom thickness MUST match the accepted snapshot

#### Scenario: Generate rectangular cavities

- **WHEN** a valid snapshot selects `rectangle` with `holeWidth=30`,
  `holeHeight=20`, and `holeCornerRadius=2`
- **THEN** every cavity MUST be a 30 mm × 20 mm rectangle with 2 mm corner
  radii, fixed with the 30 mm extent on local X and the 20 mm extent on local Y
- **AND** adjacent outer envelopes MUST respect the requested X/Y edge-to-edge
  spacing
- **AND** depth and bottom thickness MUST match the accepted snapshot

#### Scenario: Generate sharp rectangular cavities

- **WHEN** a valid snapshot selects `rectangle` with `holeCornerRadius=0`
- **THEN** every cavity MUST be a sharp-cornered rectangle without any corner
  rounding
- **AND** its envelope MUST remain exactly `holeWidth` × `holeHeight`

#### Scenario: Generate elliptical cavities

- **WHEN** a valid snapshot selects `ellipse` with `holeWidth=30` and
  `holeHeight=20`
- **THEN** every cavity MUST be a true ellipse whose local X axis extent is
  30 mm and whose local Y axis extent is 20 mm without any faceted
  approximation
- **AND** adjacent outer envelopes MUST respect the requested X/Y edge-to-edge
  spacing

#### Scenario: Change shape without changing the requested counts

- **WHEN** the selected shape changes while both hole counts remain fixed
- **THEN** the cavity count MUST remain unchanged
- **AND** the body and connector occupancy MUST recalculate from the new fixed
  shape envelope without overlapping adjacent cavities
### Requirement: Positive tilt moves cavity openings toward the user

In installed coordinates the wall and the integrated OpenConnect female
opening plane MUST be parallel to the X/Z plane, the negative Y direction MUST
point away from the wall toward the user, and positive Z MUST point upward.
This preserves the installed orientation already used by the OpenConnect
Shelf. For `tiltAngle = a`, the normalized axis from every cavity floor toward
its opening MUST be `[0, -sin(a), cos(a)]`. At zero degrees the cavity axes MUST
be vertical. At every positive angle each cavity opening MUST therefore be
farther from the wall than its floor; the lower body MUST NOT be tilted toward
the user instead.

Hole diameter, depth, bottom thickness, edge thickness, polygon orientation,
cavity-center spacing, and matrix centering MUST be measured in the organizer's
local tilted frame. Changing only `tiltAngle` MUST rigidly change that local
frame relative to the wall interface without changing any of those local
cavity measurements or rotating the OpenConnect female interface.

#### Scenario: Keep zero tilt vertical

- **WHEN** `tiltAngle=0`
- **THEN** every cavity floor-to-opening axis MUST be parallel to positive Z
- **AND** an opening center MUST have the same wall distance as its floor center

#### Scenario: Tilt the top toward the user

- **WHEN** `tiltAngle` is greater than zero
- **THEN** every cavity opening center MUST be farther from the wall than its
  corresponding floor center by `holeDepth * sin(tiltAngle)` within geometry
  tolerance
- **AND** every floor center MUST remain below its opening by
  `holeDepth * cos(tiltAngle)` within geometry tolerance

#### Scenario: Preserve local cavity geometry across angle changes

- **WHEN** two accepted snapshots differ only by `tiltAngle`
- **THEN** their local cavity shape, count, diameter, depth, spacing, bottom
  thickness, and edge thickness MUST be identical
- **AND** their OpenConnect female opening planes MUST both remain parallel to
  the wall

### Requirement: Locked OpenConnect females are integrated directly in the body

The organizer MUST be one connected body with a flat rear interface whose
OpenConnect female opening plane is parallel to the wall and whose insertion
axis is perpendicular to the wall. The female receptacles MUST be subtracted
directly from this integrated rear surface. The result MUST NOT require or emit
a separate mounting base, rear plate part, adapter, OpenGrid desk interface,
corner seat, foot, or second printable solid.

The rear interface MUST use the 28 mm OpenGrid pitch without forcing the body
width or height to a pitch multiple. Its width MUST equal the continuously
derived body width. Its height MUST equal
`max(28 mm, holeDepth + bottomThickness)`. The derived column count MUST be
`max(1, floor(bodyWidth / 28 mm))`, and the derived row count MUST be
`max(1, floor(rearInterfaceHeight / 28 mm))`. Consequently every width or
height from 28 mm through values below 56 mm MUST retain one receptacle on that
axis, and the second receptacle MUST first appear at exactly 56 mm.

The interface MUST contain one locked female receptacle in every derived X/Z
cell. The complete column and row groups MUST follow the selected horizontal
and vertical alignment in installed front-view coordinates. Each group occupies
count * 28 mm; its unused span MUST be placed after, split equally around, or
before the group for start, center, or end alignment respectively. Left is the
horizontal start and top is the vertical start. Receptacle origins MUST remain
14 mm inside their cell edges with unchanged 28 mm pitch. Defaults MUST center
the columns and top-align the rows, leaving unused height below the row group.

Every receptacle MUST preserve the supplied locked OpenConnect negative at its
authored millimetre scale and asymmetric origin. Only rigid placement MAY be
applied. Each opening plane MUST remain parallel to the wall for every angle,
and the placed negative MUST accept the existing assembled OpenGrid Snap
OpenConnect head. Receptacles, cavities, and the transition joining the tilted
body to the rear interface MUST retain at least 0.5 mm of separating material
and MUST form one watertight solid.

At every positive `tiltAngle`, the upper transition surface MUST meet the front
top edge of the rear interface. The rear-interface plate MUST NOT stand above
that transition as a separate projecting lip between the tilted body and the
wall-facing plate.

#### Scenario: Mount directly with the default interface

- **WHEN** the default two-by-two circular organizer is generated
- **THEN** its integrated rear surface MUST derive one OpenConnect column and
  one OpenConnect row
- **AND** it MUST contain exactly one locked female receptacle without any
  separate mounting part

#### Scenario: Keep female openings parallel to the wall

- **WHEN** any valid `tiltAngle` is generated in installed coordinates
- **THEN** every OpenConnect female opening plane MUST remain parallel to the
  wall plane
- **AND** every OpenConnect insertion axis MUST remain perpendicular to the wall

#### Scenario: Keep the tilted transition flush with the rear interface

- **WHEN** the organizer is generated with a positive `tiltAngle`
- **THEN** the transition MUST extend continuously from the tilted body to the
  front top edge of the rear interface
- **AND** the rear-interface plate MUST NOT form a separate projecting upper lip

#### Scenario: Grow connector occupancy with the organizer

- **WHEN** the continuous body width or interface height crosses from below
  56 mm to exactly 56 mm
- **THEN** the corresponding OpenConnect count MUST grow from one to two
- **AND** each additional completed 28 mm span MUST add one receptacle on that axis
  while the complete group follows the selected alignment

#### Scenario: Center columns and top-align rows

- **WHEN** the default center/top alignment is selected and the body dimensions leave width or height that is not occupied by
  the derived 28 mm connector group
- **THEN** the column group MUST have equal unused width on its left and right
- **AND** all unused interface height MUST remain below the row group

#### Scenario: Accept the existing OpenConnect head

- **WHEN** an assembled OpenGrid Snap OpenConnect head is placed at a locked
  position of the organizer
- **THEN** the complete head MUST fit the authored female negative within CAD
  tolerance
- **AND** no scaling, mirroring, or shape substitution MAY be required

#### Scenario: Normalize legacy alignment and reject malformed choices

- **WHEN** an otherwise valid snapshot omits either alignment field
- **THEN** the missing horizontal choice MUST normalize to `center` and the missing vertical choice to `top`, preserving its geometry and other values
- **AND** explicit unsupported values, including null and empty strings, MUST be rejected for the affected field

### Requirement: Preview, generation, and exports are deterministic

Every valid snapshot MUST generate a non-empty valid watertight single solid.
The tilted cavity body, integrated rear interface, and connecting transition
MUST remain connected for every valid parameter combination. The committed
result MUST use a deterministic print orientation that places the parallel body
underside on `Z=0` and leaves the cavities open upward; this whole-result rigid
orientation MUST preserve the installed relationship between the cavity axes
and the OpenConnect interface.

Valid snapshots MUST use the existing latest-wins Worker candidate, commit,
mesh, STEP, and binary STL lifecycle and persist independently under
`opengrid-openconnect-organizer`. STEP and STL filenames MUST begin with
`opengrid-openconnect-organizer-` and include every parameter that can change
geometry. For `rectangle` the shape token MUST be
`rectangle-w<holeWidth>-h<holeHeight>-r<holeCornerRadius>`; for `ellipse` it
MUST be `ellipse-w<holeWidth>-h<holeHeight>`; in both cases these tokens MUST
replace the diameter token. Existing shape filename tokens MUST remain
unchanged. Equivalent normalized snapshots MUST produce identical bounds and
filenames, and failed or invalid generations MUST never become exportable.

#### Scenario: Generate and export a valid organizer

- **WHEN** a valid organizer candidate completes generation and mesh validation
- **THEN** the viewport MUST commit one non-empty single-solid revision
- **AND** STEP and binary STL export MUST be enabled for that same revision

#### Scenario: Rest on the body underside for printing

- **WHEN** a valid tilted organizer is prepared for preview or export
- **THEN** its parallel body underside MUST lie on `Z=0` within geometry
  tolerance
- **AND** every cavity MUST open upward in print coordinates

#### Scenario: Persist parameters independently

- **WHEN** a valid organizer snapshot is accepted
- **THEN** only the `opengrid-openconnect-organizer` persistence entry MUST
  change
- **AND** no other OpenGrid component snapshot MUST inherit its values

#### Scenario: Keep failed candidates out of exports

- **WHEN** asset loading, Boolean construction, topology validation, or meshing
  fails
- **THEN** the candidate MUST report a diagnosable failure without replacing the
  last committed revision
- **AND** the failed candidate MUST NOT enable STEP or STL export

#### Scenario: Name exports for the new shapes

- **WHEN** a valid snapshot selects `rectangle` with `holeWidth=30`,
  `holeHeight=20`, and `holeCornerRadius=2`, or selects `ellipse` with
  `holeWidth=30` and `holeHeight=20`
- **THEN** the STEP and STL filenames MUST contain
  `rectangle-w30-h20-r2` or `ellipse-w30-h20` respectively without a diameter
  token
- **AND** a `circle` snapshot's filename MUST remain unchanged from the
  existing pattern
### Requirement: OpenGrid and OpenConnect sources are attributed

The component workspace MUST expose the existing OpenGrid attribution and the
OpenConnect attribution for the locked female source, including its applicable
source license and upstream project link. Repository-local provenance MUST
identify the authored asset dimensions and integrity data used by both this
component and the existing OpenConnect Shelf.

#### Scenario: Show attribution on the organizer route

- **WHEN** the organizer workspace is displayed
- **THEN** the user MUST be able to view both OpenGrid and OpenConnect credits
- **AND** the OpenConnect credit MUST identify its source license and project

#### Scenario: Preserve asset provenance

- **WHEN** production assets for the organizer are enumerated
- **THEN** the locked female asset MUST have repository-local provenance
- **AND** no unrelated reference mesh MAY become runtime or golden geometry

### Requirement: Collapsed OpenConnect rear-grid settings

The `opengrid-openconnect-organizer` panel MUST use the shared OpenConnect section, initially collapsed and expandable by pointer or keyboard. It MUST group rear-grid controls and display horizontal alignment choices left/center/right (靠左／置中／靠右) and vertical top/center/bottom (靠上／置中／靠下), using installed front-view directions. The canonical field `openConnectHorizontalAlignment` MUST accept only `left`, `center`, `right`; `openConnectVerticalAlignment` MUST accept only `top`, `center`, `bottom`. Selections MUST persist, round-trip to generation, and restore to center/top on reset. Alignment MUST translate only the complete rear receptacle grid while preserving pitch, count, authored cutter geometry, cell-safe edge clearance and body geometry. Snap, Wall Cover and grid-board settings MUST remain unchanged.

#### Scenario: Expand and edit rear-grid settings

- **WHEN** the user opens the accessory panel
- **THEN** OpenConnect controls MUST initially be hidden inside a collapsed section
- **AND** activating its header MUST expose the controls with localized accessible labels
- **AND** valid selections MUST reach the generated model and survive reload

#### Scenario: Keep choices usable without spare space

- **WHEN** a rear-grid axis occupies its full available span
- **THEN** all three choices on that axis MUST remain selectable and persistable
- **AND** those choices MUST yield identical geometry without disabled controls or special no-space messaging

#### Scenario: Preserve rear-grid spacing and safe borders

- **WHEN** any of the nine alignment combinations is selected
- **THEN** the complete grid MUST keep its original pitch and receptacle count
- **AND** its occupied cells MUST remain inside the rear interface
- **AND** any spare width or height MUST be allocated according to the selected alignment without resizing the body

### Requirement: Two-color top accent rim shell partitioning

The OpenConnect organizer MUST accept an independent boolean `topRimEnabled`
(defaulting to `false`) and an integer `topRimHeight` (defaulting to `2`,
valid range `1..floor(bodyThickness / 2)` where `bodyThickness` is the derived
cavity depth plus bottom thickness). `topRimHeight` MUST normalize to a valid
integer even when `topRimEnabled` is `false`; the range bound MUST be enforced
whenever the rim is enabled, and violated values MUST be rejected with a
field-specific error that prevents B-Rep generation.
The panel MUST expose a `雙色飾圈` (`Two-Color Rim`) toggle whose
`topRimHeight` control stays hidden while the toggle is off. The accent rim
MUST remain a visual partition only: cavities, locked slots, tilt semantics,
the installed-envelope contract, and every existing quality rule of the uncut
solid MUST remain unchanged.

When `topRimEnabled` is `true`, the build pipeline MUST partition the final
print-orientation geometry at the horizontal split plane
$Z = \text{bodyThickness} - \text{topRimHeight}$ — the opening plane of the
flat-lying print model, not the overall shape maximum — into two complementary
parts: a `body` solid occupying everything below the plane and a `rim` solid
occupying everything above it. The exported print model MUST keep lying flat
with its opening plane parallel to the print bed, so the accent band stays
flush with the print face with uniform width. The uncut host shape MUST serve
as the quality shape and MUST satisfy all existing organizer quality rules,
including the print-underside-at-zero gate. Both parts MUST be non-empty valid
B-Rep solids whose combined compound reproduces the complete container
geometry. The Worker candidate and committed records MUST emit both parts as
distinct `partMeshes` assigned to `body` and `rim`.

#### Scenario: Top rim controls and defaults

- **WHEN** the OpenConnect organizer panel initializes without persisted rim
  values
- **THEN** `topRimEnabled` MUST default to `false` and `topRimHeight` to `2`
- **AND** the `雙色飾圈` toggle MUST be unchecked and the `topRimHeight`
  control MUST be hidden
- **AND** checking the toggle MUST reveal the `topRimHeight` control bounded
  from `1` to `floor(bodyThickness / 2)`

#### Scenario: Top rim height bound validation

- **WHEN** `topRimEnabled` is `true` and `topRimHeight` is less than `1` or
  greater than `floor(bodyThickness / 2)`
- **THEN** parameter validation MUST fail with a field-specific error on
  `topRimHeight`
- **AND** the invalid parameter set MUST NOT trigger B-Rep generation

#### Scenario: Partitioning creates complementary non-empty parts

- **WHEN** `topRimEnabled` is `true` and the organizer is built
- **THEN** the build output MUST contain `parts` with names `body` and `rim`
- **AND** the bounding box $Z$ maximum of `body` MUST equal
  $\text{bodyThickness} - \text{topRimHeight}$ within tolerance at the opening
  plane
- **AND** the bounding box $Z$ minimum of `rim` MUST equal
  $\text{bodyThickness} - \text{topRimHeight}$ within tolerance at the opening
  plane
- **AND** the volume sum of `body` and `rim` MUST match the uncut quality
  shape volume within 0.1%

#### Scenario: Accent band stays flush with the print face

- **WHEN** `topRimEnabled` is `true` and the organizer is exported for
  printing
- **THEN** the print model MUST remain flat with its underside at $Z=0$ and
  its opening plane parallel to the print bed
- **AND** the rim band MUST span a uniform
  $\text{topRimHeight}$ measured perpendicular to the print face
- **AND** the existing print-underside quality gate MUST pass unchanged

#### Scenario: Deterministic two-color export filenames

- **WHEN** `topRimEnabled` is `true`, the model definition MUST report a 3MF
  filename whose stem ends with `-rim<topRimHeight>` before the `.3mf`
  extension
- **AND** when `topRimEnabled` is `false`, the model definition MUST report no
  3MF filename and the STL filename MUST remain unchanged from its current
  fingerprint
