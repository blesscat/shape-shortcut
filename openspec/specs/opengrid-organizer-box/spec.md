## Purpose

Provide an OpenGrid-compatible solid organizer box for storing batteries, tool
bits, and similar items in a configurable matrix of shaped, blind top cavities.

## Requirements

### Requirement: Stable organizer-box component contract

The system MUST expose a new OpenGrid component with stable
`modelId=opengrid-organizer-box`, build key `opengrid-organizer-box`, and route
slug `opengrid-organizer-box`. Its user-facing display name MUST begin with
`OpenGrid `, and its parameter state, preview, generation, and export identity
MUST remain independent from existing OpenGrid component IDs. Existing model
IDs and their behavior MUST remain unchanged.

#### Scenario: Organizer box is discoverable

- **WHEN** the model chooser or OpenGrid catalog is rendered
- **THEN** it MUST list the organizer box under the OpenGrid family
- **AND** its selection entry MUST navigate to the
  `/cad/opengrid-organizer-box` route
- **AND** the route MUST show only organizer-box controls

#### Scenario: Organizer box initializes independently

- **WHEN** the organizer-box route starts without a valid saved snapshot
- **THEN** it MUST use the organizer-box defaults
- **AND** the first Worker generation MUST use
  `modelId=opengrid-organizer-box`
- **AND** no existing component's parameters MUST be copied into the snapshot

### Requirement: Organizer-box parameters and linked spacing

The canonical organizer-box snapshot MUST contain typed `holeCountX`,
`holeCountY`, `holeSpacingMode`, `holeSpacingX`, `holeSpacingY`, `holeShape`,
`holeDiameter`, `holeDepth`, `bottomThickness`, `wallThickness`,
`cornerSeatMode`, `boxMode`, and `stackingClearanceHeight` fields.
`holeSpacingMode` MUST be either `linked` or `independent`; `holeShape` MUST be
one of `circle`, `triangle`, `square`, `pentagon`, or `hexagon`;
`cornerSeatMode` MUST be one of `none`, `detachable-corner-seat`, or
`integrated`; and `boxMode` MUST be either `normal` or `stackable`.

Hole counts MUST be positive integers. All dimensional values MUST be finite
millimetres, the bottom thickness MUST be non-negative and default to 1 mm, and
the wall thickness MUST default to 2 mm and MUST NOT exceed 100 mm. The wall
thickness MUST be at least 2 mm in normal mode and at least 2.95 mm in
stackable mode. `stackingClearanceHeight` MUST default to 3.5 mm, MUST be at
least 3.5 mm, and MUST use the Organizer Box's existing 0.5 mm input increment.
The component MUST reject any snapshot whose derived footprint exceeds the
existing OpenGrid 500 mm workspace limit, whose wall thickness is below the
minimum required by the selected body mode, or whose selected shape/depth
combination is geometrically invalid. In linked spacing mode, the canonical X
and Y spacing values MUST be equal; in independent mode they MAY differ.

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
dedicated hydrator is added for them. Accepted persistence, Worker requests,
and exports MUST emit only the canonical fields and MUST NOT emit
`bottomInterfaceMode`.

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
selected shape, diameter, depth, and fixed orientation. A circular cavity MUST
use `holeDiameter` as its circular diameter. A regular polygon cavity MUST use
`holeDiameter` as the diameter of its inscribed circle (the distance between
opposite sides), including the 3-, 4-, 5-, and 6-sided choices.

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

### Requirement: Derived OpenGrid footprint and fixed cavity orientation

The organizer-box X/Y footprint MUST be derived from the cavity count, selected
shape envelope, edge-to-edge spacing, and the requested `wallThickness`. The
derivation MUST choose the smallest legal OpenGrid footprint that contains the
centered cavity matrix plus `wallThickness` of wall material outside the cavity
matrix on every side, quantized to whole 0.5-cell steps: the grid count MUST be
`ceil((cavity span + 2 × wallThickness + 0.15 mm) / 14 mm) × 0.5` cells and
MUST be at least 1 cell, because a half-cell footprint cannot host the
four-corner bottom interface. The footprint MUST be
`gridCount × 28 mm − 0.15 mm` per axis, so the delivered wall per side MUST
always meet or exceed the requested `wallThickness`. The resulting footprint
MUST use the existing 28 mm OpenGrid pitch and existing per-axis exterior
clearance, and the derived grid counts MUST be available to the UI as read-only
calculated values. Corner-seat mode MUST NOT influence the derived footprint.

All cavities MUST share one deterministic orientation relative to the world X/Y
axes. Orientation MUST NOT be independently configurable per cavity or per axis.

#### Scenario: Cavity layout determines grid occupancy

- **WHEN** the user changes either cavity count, cavity diameter,
  linked/independent spacing, or wall thickness
- **THEN** the derived X/Y grid occupancy and outer footprint MUST recalculate
- **AND** the cavity matrix MUST remain centered
- **AND** every active bottom interface position MUST remain on the derived
  footprint's fixed OpenGrid locations

#### Scenario: Wall thickness trades material for capacity

- **WHEN** a single 20 mm circular cavity is requested with `wallThickness=2`
  in normal mode
- **THEN** the derived footprint MUST occupy exactly 1 OpenGrid cell per axis
- **AND** the same request with a wall thickness above
  `(28 mm − 0.15 mm − 20 mm) / 2` MUST occupy at least 1.5 cells

#### Scenario: Layout does not fit

- **WHEN** the requested cavity matrix cannot fit inside the largest safe
  OpenGrid footprint within the 500 mm workspace limit
- **THEN** validation MUST reject the snapshot with a layout error
- **AND** no new Worker generation or export request MUST be sent

### Requirement: Integrated detachable corner-seat sockets

When `cornerSeatMode=detachable-corner-seat`, the Organizer Box MUST form four
keyed female corner-seat sockets directly in the box body at the existing
four-corner locating positions, regardless of body mode. Each socket MUST use
the shared detachable-seat female geometry with a nominal Ø11 mm by 1.5 mm
material envelope at the shared Z=3.8 mm through Z=5.3 mm source band. The
socket holder MUST remain part of the one exported box solid and MUST NOT be
emitted as a separate printable part.

Viewed from the box bottom, the sockets MUST use the deterministic corner
rotations upper-left 0°, upper-right 90°, lower-right 180°, and lower-left 270°.
Because the normal-mode body-interface datum is 2 mm, each 1.5 mm-deep socket
MUST retain at least 0.5 mm of solid roof above it, and storage cavities MAY
sit directly above the socket envelope. The mode MUST NOT generate built-in
downward feet. A stackable body MUST retain its box-to-box bottom and top
stacking interfaces in addition to these sockets.

#### Scenario: Detachable sockets are part of the box

- **WHEN** a valid Organizer Box snapshot selects
  `cornerSeatMode=detachable-corner-seat`
- **THEN** the generated result MUST remain one connected watertight solid
- **AND** it MUST contain the four shared female socket profiles at the fixed
  corner positions
- **AND** no socket holder or male seat MUST be fused below the box or emitted
  as another solid

#### Scenario: Socket rotations follow the four corners

- **WHEN** the detachable socket layout is inspected from the box bottom
- **THEN** the upper-left, upper-right, lower-right, and lower-left socket
  profiles MUST use rotations 0°, 90°, 180°, and 270° respectively
- **AND** all four sockets MUST accept the same unmirrored male corner-seat
  geometry after the male part is rotated to the corresponding orientation

#### Scenario: Detachable socket roof is too thin

- **WHEN** any snapshot with `cornerSeatMode=detachable-corner-seat` is
  validated
- **THEN** no dedicated socket-roof rejection MUST run
- **AND** the 0.5 mm roof MUST instead follow from the body-interface datum
  (2 mm normal / 5 mm stackable) always exceeding the 1.5 mm socket depth
- **AND** storage cavities MAY sit directly above the socket envelope

#### Scenario: Detachable seats compose with stacking

- **WHEN** the user selects `cornerSeatMode=detachable-corner-seat` and
  `boxMode=stackable`
- **THEN** the generated underside MUST contain both the four detachable
  sockets and the standard box-to-box stacking profile
- **AND** the generated top MUST contain the standard stacking rail
- **AND** built-in downward feet MUST be absent

#### Scenario: Detachable mode excludes existing interfaces

- **WHEN** the user selects `cornerSeatMode=detachable-corner-seat` and
  `boxMode=normal`
- **THEN** the generated underside MUST contain neither the four existing
  downward built-in feet nor the box-to-box stacking profile
- **AND** the box lower Z bound MUST remain at its body bottom datum

### Requirement: Preview, persistence, and exports

Every valid organizer-box snapshot MUST generate a non-empty watertight single
solid centered on X/Y with a valid bottom reference, remain previewable through
the existing Worker revision lifecycle, and support STEP and binary STL export.
The export filenames MUST identify the organizer-box model and include every
parameter that changes cavity, body-mode, corner-seat, or stacking-clearance
geometry, including shape, diameter, counts, spacing, depth, wall thickness,
bottom thickness, corner-seat mode, body mode, and stackable clearance when
active.

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

### Requirement: Independent corner-seat and body modes

The Organizer Box parameter panel MUST place two independent radio groups at
the top of its adjustable controls, before cavity count, spacing, shape, or
dimension fields. The first group MUST match the OpenGrid Box corner-seat UI,
use the label `角座模式`, and expose `無角座`, `鎖定角座`, and `內建角座`,
normalized as `none`, `detachable-corner-seat`, and `integrated`. The second
group MUST use the label `盒體模式` and expose `普通模式` and `堆疊模式`,
normalized as `normal` and `stackable`.

The groups MUST be independently selectable and MUST represent all six
combinations. In normal mode, the box MUST retain the current flat exterior top
and MUST generate neither the box-to-box bottom stacking profile nor its top
rail; only the selected corner-seat geometry applies. In stackable mode, the
box MUST generate both the standard box-to-box bottom stacking profile and its
matching top rail, and MUST additionally apply the selected corner-seat mode.
`none` MUST add no seat geometry; `detachable-corner-seat` MUST add the shared
female sockets; and `integrated` MUST fuse the shared built-in feet spanning
Z=-3.8 mm to Z=0 with a 0.2 mm bottom perimeter chamfer. Seat geometry MUST NOT
replace or suppress stacking geometry.

#### Scenario: Controls appear first and match OpenGrid Box

- **WHEN** the Organizer Box parameter panel is rendered
- **THEN** `角座模式` MUST be the first adjustable control group
- **AND** `盒體模式` MUST immediately follow it
- **AND** their corner-seat labels and selection behavior MUST match the
  OpenGrid Box UI
- **AND** cavity count and all remaining controls MUST follow both groups

#### Scenario: Normal mode preserves the current non-stacking body

- **WHEN** `boxMode=normal` is selected with any corner-seat mode
- **THEN** the exterior top MUST remain flat around the cavity openings
- **AND** no bottom stacking profile or top stacking rail MUST be generated
- **AND** the selected corner-seat geometry alone MUST determine the locating
  interface

#### Scenario: Body and seat selections compose

- **WHEN** the user changes either radio group
- **THEN** the other group's selection MUST remain unchanged
- **AND** the canonical snapshot MUST contain exactly one `boxMode` and one
  `cornerSeatMode`
- **AND** each of the six combinations MUST validate and generate as one
  connected watertight solid for otherwise valid parameters

### Requirement: Stackable top rail and Z clearance

When `boxMode=stackable`, the Organizer Box MUST preserve the existing OpenGrid
Box bottom stacking profile and add the exact matching stepped top stacking
rail around the outer perimeter. The fixed rail profile MUST retain the
OpenGrid Box's 0.1 mm outer inset, 2 mm nominal rail width, 7.55 mm total
height, and its 1.75 mm inner chamfer, 1.2 mm inner vertical, 0.8 mm middle
chamfer, 1.8 mm outer vertical, and 2 mm outer chamfer sequence. The rail MUST
remain a connected part of the one Organizer Box solid and MUST mate with a
standard OpenGrid Box bottom interface of the same footprint.

`stackingClearanceHeight` MUST directly equal the vertical distance from the
Organizer Box cavity-opening plane to the nominal Z=0 bottom datum of the box
stacked above. The fixed rail's mating datum is 3.20 mm above its base
(1.75 mm inner chamfer + 1.2 mm inner vertical + 0.25 mm stacking clearance),
so the system MUST place a straight perimeter riser of
`stackingClearanceHeight - 3.20 mm` below the unchanged rail. The user-facing
control MUST be labeled `堆疊淨空（Z）`, MUST appear only in stackable mode,
and MUST have a 3.5 mm minimum/default on the 0.5 mm input grid. Its value MUST
remain canonical when normal mode is selected so toggling modes preserves the
last accepted setting, but it MUST NOT affect normal-mode geometry or export
identity while inactive.

In stackable mode `wallThickness` MUST be at least 2.95 mm, which is the
standard rail's maximum inward reach and also the bottom seam bed opening
half-width plus clearance, so the top rail seat and the bottom seam channel
remain inside the wall footprint at the mode floor. Validation MUST reject a
stackable snapshot whose `wallThickness` is below 2.95 mm. Wall thickness MUST
NOT govern the vertical clearance above the cavities; `stackingClearanceHeight`
alone MUST govern that space. Integrated feet or detachable sockets occupy
their corner interface locations below the upper box datum, MUST NOT be counted
as part of the requested vertical clearance, and MAY sit beneath storage
cavities.

#### Scenario: Minimum Z preserves the standard stacking structure

- **WHEN** a user selects stackable mode with
  `stackingClearanceHeight=3.5`
- **THEN** the fixed rail MUST sit on a 0.3 mm straight perimeter riser
- **AND** the upper box's nominal bottom datum MUST be 3.5 mm above the cavity
  opening plane within geometry tolerance
- **AND** no rail segment MUST be truncated, lowered into a cavity, or changed
  from the standard OpenGrid Box profile

#### Scenario: Z below the input-safe minimum is rejected

- **WHEN** `stackingClearanceHeight` is less than 3.5 mm or not aligned to a
  0.5 mm increment
- **THEN** validation MUST report a field-specific
  `stackingClearanceHeight` error
- **AND** no generation, persistence replacement, or export MUST occur

#### Scenario: Stackable wall below the rail ring is rejected

- **WHEN** a stackable snapshot sets `wallThickness` below 2.95 mm
- **THEN** validation MUST report a field-specific `wallThickness` error
- **AND** no generation, persistence replacement, or export MUST occur

#### Scenario: Increased Z raises only the top stacking structure

- **WHEN** the user increases `stackingClearanceHeight` by 0.5 mm in stackable
  mode
- **THEN** the rail and upper box seating datum MUST rise by exactly 0.5 mm
- **AND** the standard rail cross-section, bottom stacking interface, selected
  corner-seat geometry, cavity geometry, and cavity-opening plane MUST remain
  unchanged

#### Scenario: Stackable box mates above the Organizer Box

- **WHEN** a standard OpenGrid Box with a matching footprint is placed on a
  stackable Organizer Box
- **THEN** its bottom stacking profile MUST seat on the Organizer Box top rail
  with the existing 0.25 mm stacking clearance
- **AND** its nominal bottom datum MUST be exactly the requested
  `stackingClearanceHeight` above the Organizer Box cavity-opening plane within
  geometry tolerance
