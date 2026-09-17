## MODIFIED Requirements

### Requirement: Organizer parameters are typed and independently persisted

The normalized parameter snapshot MUST contain exactly `holeCountX`,
`holeCountY`, `holeSpacingMode`, `holeSpacingX`, `holeSpacingY`, `holeShape`,
`holeDiameter`, `holeWidth`, `holeHeight`, `holeCornerRadius`, `holeDepth`,
`bottomThickness`, `edgeThickness`, and `tiltAngle`.
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
edgeThickness: 1, tiltAngle: 15 }`. In linked spacing mode the two canonical
spacing values MUST be equal; in independent mode they MAY differ.

The component MUST reject missing or unknown fields, unsupported enum values,
non-finite or out-of-range dimensions, a corner radius outside its allowed
range, fractional counts, off-step angles, unsafe cavity-to-interface
collisions, and any derived installed or print-oriented extent above the
existing 500 mm workspace limit. Invalid input MUST produce a field-specific
diagnostic and MUST NOT replace the last valid revision, persist, generate, or
become exportable. A persisted snapshot that predates the new fields MUST fall
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

- **WHEN** any canonical field is missing, unknown, malformed, out of range,
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
