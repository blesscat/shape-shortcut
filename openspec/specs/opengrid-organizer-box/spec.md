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

The canonical organizer-box snapshot MUST contain typed
`holeCountX`, `holeCountY`, `holeSpacingMode`, `holeSpacingX`, `holeSpacingY`,
`holeShape`, `holeDiameter`, `holeDepth`, `bottomThickness`, and
`bottomInterfaceMode` fields. `holeSpacingMode` MUST be either `linked` or
`independent`; `holeShape` MUST be one of `circle`, `triangle`, `square`,
`pentagon`, or `hexagon`; and `bottomInterfaceMode` MUST be exactly one of
`corner-seat`, `detachable-corner-seat`, or `stackable`.

Hole counts MUST be positive integers. All dimensional values MUST be finite
positive millimetres, and the bottom thickness MUST default to 1 mm. The
component MUST reject any snapshot whose derived footprint exceeds the existing
OpenGrid 500 mm workspace limit, whose cavities cannot fit with the required
material boundaries, whose detachable sockets would leave less than 0.5 mm of
roof material, or whose selected shape/depth combination is geometrically
invalid. In linked spacing mode, the canonical X and Y spacing values MUST be
equal; in independent mode they MAY differ.

#### Scenario: Default organizer-box snapshot

- **WHEN** the organizer-box route has no valid persisted parameters
- **THEN** it MUST select a circle cavity shape
- **AND** it MUST select linked X/Y spacing
- **AND** it MUST use a 1 mm bottom thickness
- **AND** it MUST select `鎖定角座`, normalized as
  `bottomInterfaceMode=detachable-corner-seat`

#### Scenario: Linked spacing control

- **WHEN** the user selects linked spacing
- **THEN** the panel MUST expose one spacing value that represents both axes
- **AND** changing that value MUST update both canonical spacing values
- **AND** validation MUST reject a linked snapshot with unequal X/Y spacing

#### Scenario: Independent spacing control

- **WHEN** the user selects independent spacing
- **THEN** the panel MUST expose separate X and Y edge-to-edge spacing values
- **AND** the generated layout MUST use the X value horizontally and the Y value
  vertically

#### Scenario: Invalid organizer-box input

- **WHEN** a snapshot contains a non-positive count, non-finite or invalid
  dimension, unsupported enum value, overlapping layout, insufficient boundary
  or detachable-socket roof material, or a footprint above 500 mm
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
requested depth, and leave the requested bottom thickness below each cavity
floor. The body between cavities and all side walls MUST remain solid. A
selected fixed bottom interface MAY shape the underside within its specified
interface envelope, but it MUST NOT reach a storage cavity; the component MUST
NOT expose side-opening controls or generate side openings.

When `bottomInterfaceMode` is `detachable-corner-seat`, `bottomThickness` MUST
be the vertical distance from the integrated corner-seat holder top to the
storage-cavity floor. The holder depth below that datum MUST NOT be added to the
requested thickness.

#### Scenario: Circular cavity matrix

- **WHEN** a valid snapshot selects `circle` with X/Y counts, diameter, depth,
  and spacing
- **THEN** the result MUST contain exactly the requested number of circular
  blind cavities
- **AND** adjacent cavity boundaries MUST be separated by the requested X/Y
  edge-to-edge spacing within geometry tolerance
- **AND** every cavity floor MUST remain the requested bottom thickness above
  the body bottom datum

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
- **AND** outside a selected interface envelope the remaining solid bottom MUST
  remain at least the requested thickness
- **AND** a detachable socket MUST retain at least 0.5 mm of solid roof before
  the cavity floor
- **AND** in detachable-corner-seat mode the socket roof thickness MUST equal
  the requested `bottomThickness` within geometry tolerance
- **AND** the overall Z extent MUST be derived from the cavity depth, bottom
  thickness, and selected fixed bottom interface rather than an unrelated
  manually entered height

### Requirement: Derived OpenGrid footprint and fixed cavity orientation

The organizer-box X/Y footprint MUST be derived from the cavity count, selected
shape envelope, and edge-to-edge spacing. The derivation MUST choose the
smallest legal OpenGrid footprint that contains the centered cavity matrix while
preserving the fixed boundary clearance required by the selected bottom
interface. The resulting footprint MUST use the existing 28 mm OpenGrid pitch
and existing per-axis exterior clearance, and the derived grid counts MUST be
available to the UI as read-only calculated values.

All cavities MUST share one deterministic orientation relative to the world X/Y
axes. Orientation MUST NOT be independently configurable per cavity or per axis.

#### Scenario: Cavity layout determines grid occupancy

- **WHEN** the user changes either cavity count, cavity diameter, or linked/
  independent spacing
- **THEN** the derived X/Y grid occupancy and outer footprint MUST recalculate
- **AND** the cavity matrix MUST remain centered
- **AND** the selected bottom interface positions MUST remain on the derived
  footprint's fixed OpenGrid locations

#### Scenario: Layout does not fit

- **WHEN** the requested cavity matrix cannot fit inside the largest safe
  OpenGrid footprint or would collide with a fixed interface boundary
- **THEN** validation MUST reject the snapshot with a layout error
- **AND** no new Worker generation or export request MUST be sent

### Requirement: Mutually exclusive bottom interfaces

The organizer-box panel MUST expose exactly one radio group with exactly three
options: `四角固定座`, `鎖定角座`, and `堆疊結構`. The normalized
`bottomInterfaceMode` MUST contain exactly one corresponding value.

In `corner-seat` mode, the result MUST preserve the existing Grid Box fixed
four-corner locating-seat positions and use the existing `integrated` built-in
foot geometry, including the existing de-duplication behavior for small
footprints. It MUST fuse four downward solid feet from Z=-3 mm to Z=0 mm, MUST
NOT generate insertable socket holes, and MUST NOT generate the full box-to-box
stacking guide. In `detachable-corner-seat` mode, the result MUST form the
shared keyed female socket geometry directly in the box body, MUST NOT fuse a
male seat or separate holder, and MUST NOT generate the full stacking guide. In
`stackable` mode, the result MUST preserve the existing normal box-to-box
bottom stacking geometry and MUST NOT generate either kind of four-corner
seat. The three interface modes MUST NOT be combined.

#### Scenario: Four-corner interface selection

- **WHEN** the user selects `四角固定座`
- **THEN** exactly that radio option MUST be selected
- **AND** the generated result MUST contain four downward built-in locating feet
- **AND** the generated result MUST NOT require a separate foot inserted from below
- **AND** both the detachable sockets and full stacking guide MUST be absent

#### Scenario: Locking corner-seat selection

- **WHEN** the user selects `鎖定角座`
- **THEN** exactly that radio option MUST be selected
- **AND** the generated result MUST contain the four integrated female sockets
- **AND** the downward built-in feet and full stacking guide MUST be absent

#### Scenario: Stacking interface selection

- **WHEN** the user selects `堆疊結構`
- **THEN** exactly that radio option MUST be selected
- **AND** the generated result MUST contain the normal box-to-box stacking
  interface
- **AND** both four-corner fixed and detachable interfaces MUST be absent

#### Scenario: Interface modes remain exclusive

- **WHEN** a user switches between bottom-interface radio options
- **THEN** the canonical snapshot MUST contain only the newly selected mode
- **AND** the preview bounds and generated underside MUST update to that mode
- **AND** no combined mode or legacy boolean MUST be emitted

### Requirement: Integrated detachable corner-seat sockets

When `bottomInterfaceMode=detachable-corner-seat`, the Organizer Box MUST form
four keyed female corner-seat sockets directly in the box body at the existing
four-corner locating positions. Each socket MUST use the shared detachable-seat
female geometry with a nominal Ø7 mm by 1.75 mm material envelope and its two
retaining tabs. The socket holder MUST remain part of the one exported box
solid and MUST NOT be emitted as a separate printable part.

Viewed from the box bottom, the sockets MUST use the deterministic corner
rotations upper-left 0°, upper-right 90°, lower-right 180°, and lower-left 270°.
The mode MUST preserve at least 0.5 mm of solid roof between each 1.75 mm-deep
socket and the nearest storage cavity, MUST NOT generate built-in downward
feet, and MUST NOT generate the box-to-box stacking guide.

#### Scenario: Detachable sockets are part of the box

- **WHEN** a valid Organizer Box snapshot selects `detachable-corner-seat`
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

- **WHEN** the requested bottom thickness would leave less than 0.5 mm of
  material above a 1.75 mm-deep detachable socket
- **THEN** Organizer Box validation MUST return a diagnosable bottom-interface
  or bottom-thickness error
- **AND** the invalid snapshot MUST NOT replace the last valid revision or
  enable export

#### Scenario: Detachable mode excludes existing interfaces

- **WHEN** the user selects `detachable-corner-seat`
- **THEN** the generated underside MUST contain neither the four existing
  downward built-in feet nor the box-to-box stacking guide
- **AND** the box lower Z bound MUST remain at its body bottom datum

### Requirement: Preview, persistence, and exports

Every valid organizer-box snapshot MUST generate a non-empty watertight single
solid centered on X/Y with a valid bottom reference, remain previewable through
the existing Worker revision lifecycle, and support STEP and binary STL export.
The export filenames MUST identify the organizer-box model and include every
parameter that changes cavity geometry or bottom-interface geometry, including
shape, diameter, counts, spacing, depth, bottom thickness, and interface mode.

Valid organizer-box parameters MUST persist under the independent
`opengrid-organizer-box` model ID. Invalid or incomplete raw input MUST NOT
overwrite the last accepted persisted snapshot, and a malformed persisted entry
MUST fall back to organizer-box defaults without affecting other components.

#### Scenario: Valid result is previewable and exportable

- **WHEN** a valid organizer-box snapshot completes generation
- **THEN** the Worker MUST commit a non-empty single solid revision
- **AND** the viewport MUST display the selected cavity matrix and underside
  interface
- **AND** STEP and STL export MUST be enabled for that revision

#### Scenario: Parameter persistence is isolated

- **WHEN** a valid organizer-box parameter update is accepted
- **THEN** only the `opengrid-organizer-box` persistence entry MUST change
- **AND** navigating to another model MUST NOT inherit organizer-box values

### Requirement: Detachable socket bottom lock indicators

When `bottomInterfaceMode=detachable-corner-seat`, the Organizer Box MUST add
one shared 2 mm by 2 mm triangular recess beside each of its four female socket
openings. Each recess MUST be 0.15 mm deep, remain on the exposed box-bottom
surface outside the nominal Ø7 mm socket envelope, and remain clear of the
keyed passage, retaining tabs, storage cavities, and outer boundary.

The four socket poses MUST retain the existing bottom-view orientations:
upper-left 0°, upper-right 90°, lower-right 180°, and lower-left 270°. For each
pose, the indicator center MUST remain on the deterministic locked centerline
outside the socket envelope. The upper-left and lower-right canonical
indicators MUST be moved to the opposite side of their sockets, as shown by the
reference arrows, while retaining the same 0.15 mm boundary clearance. The
upper-right and lower-left indicators MUST remain on their existing sides. With
the shared triangle's local apex pointing along +X, these directions MUST
remain deterministic in the same corner order.

#### Scenario: Locking corner-seat mode shows four indicators

- **WHEN** a valid Organizer Box snapshot selects `鎖定角座`, normalized as
  `bottomInterfaceMode=detachable-corner-seat`
- **THEN** the generated single box solid MUST contain four readable triangular
  recesses on its bottom surface
- **AND** every recess MUST be nominally 2 mm by 2 mm and 0.15 mm deep within
  geometry tolerance
- **AND** all four recesses MUST remain outside their socket openings and
  preserve the existing socket passage and retaining tabs

#### Scenario: Corner indicators follow deterministic locked directions

- **WHEN** the detachable socket layout is inspected from the box bottom
- **THEN** the indicator rotations MUST be 270°, 0°, 90°, and 180° in
  upper-left, upper-right, lower-right, and lower-left order
- **AND** each indicator center MUST lie on the corresponding locked male
  triangle's apex direction, outside the socket envelope
- **AND** each socket MUST accept the same unmirrored male seat in its existing
  insertion orientation
- **AND** turning that male clockwise 90° MUST make the two visible triangles
  point to one another

#### Scenario: Indicators do not change Organizer Box interfaces

- **WHEN** a marked detachable Organizer Box is validated, meshed, or exported
- **THEN** it MUST remain one valid connected watertight solid
- **AND** its socket roof thickness, cavity floors, lower Z datum, bounds, and
  export identity MUST remain unchanged
- **AND** the box MUST still contain neither built-in downward feet nor the
  full stacking guide

#### Scenario: Other bottom-interface modes remain unmarked

- **WHEN** the Organizer Box uses `corner-seat` or `stackable`
- **THEN** no detachable socket indicator recess MUST be generated
- **AND** the existing bottom interface geometry MUST remain unchanged
