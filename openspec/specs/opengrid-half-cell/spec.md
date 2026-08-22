## Purpose

定義 OpenGrid 底板與 Snap 半格幾何共用的方向、尺寸、連接介面、外框支撐與最終特徵配置契約。

## Requirements

### Requirement: Shared half-cell axis contract

OpenGrid board normalized snapshots MUST continue to use typed axis fields: `halfCellX` MUST be `none`, `left`, or `right`, and `halfCellY` MUST be `none`, `top`, or `bottom`. Snap normalized snapshots MUST instead use `footprint=full`, `half`, or `quarter`; they MUST NOT persist or expose independent Snap X/Y axis fields. `full` MUST map internally to `none/none`, `half` MUST map internally to `left/none`, and `quarter` MUST map internally to `left/top`. The board and Snap mappings MUST remain isolated, and a Snap footprint MUST NOT be inferred from a board snapshot.

#### Scenario: Full board and full Snap

- **WHEN** a valid OpenGrid board uses `halfCellX=none` and `halfCellY=none` and a valid Snap uses `footprint=full`
- **THEN** the board MUST represent its existing full-cell behavior
- **AND** the Snap MUST generate no half-cell boundary geometry

#### Scenario: Board keeps arbitrary supported axis directions

- **WHEN** a valid OpenGrid board uses any supported single or dual axis directions
- **THEN** the board MUST retain its existing direction, dimension, and boundary behavior
- **AND** those directions MUST NOT appear in or modify the Snap footprint snapshot

#### Scenario: Canonical Snap half and quarter mapping

- **WHEN** a valid Snap uses `footprint=half` or `footprint=quarter`
- **THEN** the builder MUST use `left/none` or `left/top` as its internal mapping respectively
- **AND** the mapping MUST be deterministic and independent of any OpenGrid board entry

#### Scenario: Invalid Snap axis fields

- **WHEN** a normalized Snap snapshot contains `halfCellX`, `halfCellY`, opposing directions, `allowHalfCell`, or an independent diagonal field
- **THEN** Snap validation MUST reject it before native CAD work
- **AND** the OpenGrid board validator MUST remain responsible for board axis validation

### Requirement: OpenGrid half-cell dimensions and orientation

The OpenGrid board MUST retain a 28 mm full-cell pitch and add exactly 14 mm on each axis whose half-cell field is not `none`. Its nominal grid dimensions MUST be `columns × 28 + 14` for a selected X half-cell and `rows × 28 + 14` for a selected Y half-cell. The nominal grid MUST remain centered on X/Y with minimum Z=0. `left` MUST occupy the negative-X outer side, `right` the positive-X outer side, `top` the positive-Y outer side, and `bottom` the negative-Y outer side.

When `fitToTarget=true`, `targetWidth` and `targetDepth` MUST define the physical outer envelope in millimetres. Each target axis MUST be at least its nominal grid dimension. Because the remainder is centered, the added distance on each of the two opposite sides MUST be no more than one 14 mm half-cell; equivalently, each target axis MUST be no more than 28 mm beyond its nominal dimension. Any remainder between the nominal grid and the target envelope MUST be divided equally between the two opposite sides of that axis. The target envelope MUST remain centered on X/Y and MUST keep minimum Z=0. The target frame MUST NOT change the 28 mm pitch, half-cell direction, or nominal grid-host centers.

#### Scenario: X-axis half-cell size

- **WHEN** a board has `columns=3`, `rows=2`, `halfCellX=right`, and `halfCellY=none`
- **THEN** its derived width MUST be 98 mm
- **AND** its derived depth MUST remain 56 mm
- **AND** the half-cell boundary MUST be on the positive-X side

#### Scenario: Y-axis half-cell size

- **WHEN** a board has `columns=2`, `rows=3`, `halfCellX=none`, and `halfCellY=top`
- **THEN** its derived width MUST remain 56 mm
- **AND** its derived depth MUST be 98 mm
- **AND** the half-cell boundary MUST be on the positive-Y side

#### Scenario: Dual-axis centered bounds

- **WHEN** a board has both half-cell fields selected
- **THEN** both axis dimensions MUST include one 14 mm extension
- **AND** the final X/Y bounds MUST be symmetric around the world origin within the existing bounds tolerance
- **AND** the board base MUST remain at Z=0

#### Scenario: Centered target envelope

- **WHEN** a board has nominal dimensions 98 by 56 mm, `fitToTarget=true`, `targetWidth=100`, and `targetDepth=58`
- **THEN** its physical envelope MUST be 100 by 58 mm
- **AND** the nominal grid MUST remain centered inside it
- **AND** the physical frame MUST add 1 mm on each X side and 1 mm on each Y side

### Requirement: Full-cell profile remains the base for half-cell geometry

A half-cell OpenGrid board MUST use the existing official OpenGrid profile for every full-cell region and MUST preserve the full-cell pitch, capture/interface profile, optional feature coordinate system, and selected variant thickness. The half-cell extension MUST be produced as an explicit boundary/interface geometry operation; the implementation MUST NOT scale the complete board to achieve a target dimension.

#### Scenario: Half-cell profile compatibility

- **WHEN** a valid Full, Lite, or Heavy board is generated with one or two half-cell axes
- **THEN** its complete-cell probes MUST match the corresponding no-half board profile
- **AND** its half-cell edge MUST expose the selected side and a valid OpenGrid-compatible interface
- **AND** its envelope MUST include only the requested 14 mm axis extensions

#### Scenario: Profile failure is rejected

- **WHEN** a half-cell candidate has the requested envelope but loses the full-cell capture/rail profile or has an invalid half boundary
- **THEN** the quality gate MUST reject the candidate
- **AND** the candidate MUST NOT become the committed model

### Requirement: Half-cell boundary feature placement

OpenGrid generated feature coordinates MUST be derived from the final nominal grid envelope after its selected half-cell extensions are included. Connector locations MUST use the nominal grid outer edge for a selected outer side and MUST include newly eligible half-cell boundary seams on the other selected sides. Generated screw modes MUST include the screw centers introduced by the selected half-cell boundaries. Explicit `custom` screw positions MUST remain unchanged and MUST NOT receive implicit boundary positions. Existing explicit `screwCenter` and `screwEvery` modifiers remain effective when selected; they are not implicit half-cell positions.

When `fitToTarget=true`, the physical target frame MUST be treated as a non-host outer border. It MUST NOT move, duplicate, or add connector and screw locations, and it MUST NOT alter the nominal grid seam coordinate system. All connector and screw cutters MUST still be applied at the final nominal grid level after the complete-cell and half-cell geometry has been fused. Screw cutters MUST be the final OpenGrid feature operation so a hole that crosses a complete-cell / half-cell interface is calculated against the complete resulting solid; the completed feature-cut nominal geometry MUST then be fused with the frame, leaving the frame free of grid features.

#### Scenario: Half-cell outer connectors

- **WHEN** a board selects one or two half-cell axes and connector holes are enabled
- **THEN** connector holes on the selected outer sides MUST be located on the final board boundary
- **AND** connector seams created by the half-cell boundary MUST be included in the generated locations
- **AND** enabling a target frame MUST NOT move those connector holes to the physical frame edge

#### Scenario: Half-cell generated screw centers

- **WHEN** a non-custom screw mode is enabled on a board with a selected half-cell axis
- **THEN** screw centers on the new half-cell boundary MUST be included in the effective generated centers
- **AND** the cutters MUST remove those holes from the final half-cell geometry
- **AND** enabling a target frame MUST NOT add screw centers on the physical frame

#### Scenario: Custom screw positions remain explicit

- **WHEN** `screwMode=custom` is selected with a half-cell axis
- **THEN** the user-provided custom screw positions and any explicitly selected screw modifiers MAY be generated
- **AND** no implicit half-cell boundary screw centers MAY be added

### Requirement: Snap host pitch compatibility

The shared half-cell geometry contract MUST define the Snap host pitch as 28 mm on an internal canonical axis whose footprint dimension is full and 14 mm on an internal canonical axis whose footprint dimension is half. A generated Snap with `footprint=full` MUST fit a 28 × 28 host; `footprint=half` MUST fit a 14 × 28 host; and `footprint=quarter` MUST fit a 14 × 14 host. Its local bounds MUST remain centered on X/Y, and its canonical boundary orientation MUST match the official `xleft/ytop` OpenGrid edge mapping.

#### Scenario: Full-footprint Snap host fit

- **WHEN** a Snap uses `footprint=full`
- **THEN** its final X and Y envelopes MUST fit within 28 mm host pitches
- **AND** its local bounds MUST remain centered on the origin

#### Scenario: Half-footprint Snap host fit

- **WHEN** a Snap uses `footprint=half`
- **THEN** its final X envelope MUST fit within the 14 mm canonical left host pitch
- **AND** its final Y envelope MUST fit within the 28 mm host pitch
- **AND** its left-side interface orientation MUST match the OpenGrid left half-cell contract
- **AND** all four local footprint corners MUST retain the OpenGrid diagonal locking profile through the selected assembly height

#### Scenario: Quarter-footprint Snap host fit

- **WHEN** a Snap uses `footprint=quarter`
- **THEN** its final X and Y envelopes MUST each fit within 14 mm host pitches
- **AND** its canonical left-top boundary interfaces MUST match the official OpenGrid edge profile
- **AND** it MUST remain a valid non-empty B-Rep with a usable central embedding interface
- **AND** all four local footprint corners MUST retain a full-height diagonal locking profile so the result can enter the 1/4 host opening

### Requirement: OpenGrid half-cell workspace controls

The `/cad/opengrid` workspace MUST expose the existing OpenGrid board controls together with an X half-cell direction control containing `none`／`left`／`right` and a Y half-cell direction control containing `none`／`top`／`bottom`. The grid-count controls MUST be ordered X before Y. With no half-cell on an axis, its slider MUST use whole-cell values; when that axis has a selected half-cell direction, its displayed total count MUST use `0.5` increments (`1.5`, `2.5`, ...), retain at least one complete cell, and extend the maximum by `0.5`. The normalized snapshot MAY continue to store the complete-cell count as an integer plus the typed direction field. The panel MUST display nominal derived width, depth, and thickness using the selected directions. It MUST expose persisted target X/Y dimensions and a `fitToTarget` checkbox. When the checkbox is enabled, the panel MUST indicate that the physical outer frame fills the remaining target distance symmetrically; when disabled, the target values MUST NOT change the generated envelope. It MUST NOT expose an `allowHalfCell` checkbox, a separate single/dual mode, or independent diagonal controls.

#### Scenario: Select an X half-cell

- **WHEN** a user chooses `halfCellX=right` and leaves `halfCellY=none`
- **THEN** the pending OpenGrid snapshot MUST include the right X direction
- **AND** the displayed width MUST increase by exactly 14 mm over the same rows/columns without half-cell
- **AND** the displayed depth MUST remain unchanged

#### Scenario: Half-cell grid count display

- **WHEN** a user chooses `halfCellX=left` while the normalized OpenGrid snapshot has `columns=2`
- **THEN** the X grid control MUST appear before the Y grid control
- **AND** the X control MUST display `2.5` total cells and accept the next `0.5` value
- **AND** the normalized snapshot MUST retain `columns=2` with `halfCellX=left`

#### Scenario: Half-cell corner screw placement

- **WHEN** a user selects `rows=5`, `columns=3`, `halfCellX=left`, `halfCellY=none`, and `screwMode=corners`
- **THEN** the generated screw centers MUST include the half-cell/full-cell seam at `x=-35 mm`
- **AND** the generated screw centers MUST include the far full-cell corner row at `x=21 mm`
- **AND** the generated screw centers MUST be `[-35,-42]`, `[-35,42]`, `[21,-42]`, and `[21,42]`
- **AND** the middle full-cell seam at `x=-7 mm` MUST NOT receive screws

#### Scenario: Target frame checkbox

- **WHEN** a user has calculated target dimensions and enables `fitToTarget`
- **THEN** the pending snapshot MUST retain the target width and depth
- **AND** the panel MUST show the target envelope as the derived physical width and depth
- **AND** the generated board MUST use a centered physical frame for the remaining distance

#### Scenario: Select a Y half-cell

- **WHEN** a user chooses `halfCellY=top` and leaves `halfCellX=none`
- **THEN** the pending OpenGrid snapshot MUST include the top Y direction
- **AND** the displayed depth MUST increase by exactly 14 mm
- **AND** the displayed width MUST remain unchanged

#### Scenario: Select both axes

- **WHEN** a user chooses one X direction and one Y direction
- **THEN** the UI MUST describe the pending state as a dual-axis half-cell through the two selected fields
- **AND** both displayed dimensions MUST include their respective 14 mm extension
- **AND** left/right and top/bottom choices MUST remain mutually exclusive

#### Scenario: OpenGrid invalid direction

- **WHEN** a programmatic or persisted OpenGrid value contains an invalid direction or `allowHalfCell`
- **THEN** the panel MUST show a field-specific validation error
- **AND** it MUST send `model.invalidate` rather than `model.generate`
- **AND** the previous accepted preview MAY remain visible but MUST be marked stale

#### Scenario: OpenGrid invalid target

- **WHEN** a programmatic or persisted OpenGrid value contains an invalid target dimension or a target smaller than its nominal envelope
- **THEN** the panel MUST show a field-specific validation error
- **AND** it MUST send `model.invalidate` rather than `model.generate`
- **AND** the previous accepted preview MAY remain visible but MUST be marked stale
