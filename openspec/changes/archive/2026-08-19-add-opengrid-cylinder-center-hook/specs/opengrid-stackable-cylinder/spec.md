## MODIFIED Requirements

### Requirement: OpenGrid stackable-cylinder identity and parameters

The system MUST expose the independently validated
`opengrid-stackable-cylinder` component with
`modelId=opengrid-stackable-cylinder`, `buildKey=opengrid-stackable-cylinder`,
and route `/cad/opengrid-stackable-cylinder`. Its display name MUST remain
`Round Box (圓盒)`. The normalized snapshot MUST contain integer `diameter` and
`height`, boolean `thinBottomMode` and `bottomPlateMode`, enum
`bottomSeatMode`, and the existing twelve typed opening fields.
For the cylinder only, `bottomSeatMode` MUST be exactly `none`, `hole`,
`integrated`, or `center-hook`, with visible labels `無角座`, `角座孔`,
`內建角座`, and `中心卡勾` respectively. The shared Box seat contract MUST
remain limited to its existing three values. The numeric ranges, opening
semantics, profile flags, 1 mm controls, and the mutual exclusion of
`thinBottomMode` and `bottomPlateMode` MUST remain unchanged.

The default snapshot MUST remain `diameter=60`, `height=20`,
`thinBottomMode=false`, `bottomPlateMode=false`, and `bottomSeatMode='hole'`,
with zero-depth openings, bottom length 1, and angle 90. A legacy
`bottomHolesEnabled=false/true` value MUST migrate to
`bottomSeatMode='none'/'hole'`; a missing legacy value MUST migrate to
`'hole'`. A canonical enum value MUST take precedence over a stale boolean,
and unsupported enum values MUST be rejected. Existing model identity, route,
profile, opening, and height contracts MUST remain unchanged.

#### Scenario: Valid cylinder defaults

- **WHEN** the cylinder route initializes without valid persisted parameters
- **THEN** the panel MUST select `角座孔`
- **AND** the normalized snapshot MUST use `bottomSeatMode='hole'`
- **AND** the existing default shell and opening geometry MUST remain unchanged

#### Scenario: Cylinder seat radio group

- **WHEN** a user selects a locating-seat option
- **THEN** exactly one of `無角座`, `角座孔`, `內建角座`, or `中心卡勾` MUST be selected
- **AND** the Worker snapshot MUST contain the corresponding cylinder enum value
- **AND** no `bottomHolesEnabled` field MUST be sent in the canonical snapshot

#### Scenario: Legacy cylinder migration

- **WHEN** persistence contains `bottomHolesEnabled=false` or `true`
- **THEN** hydration MUST produce `bottomSeatMode='none'` or `'hole'`
- **AND** the old no-hole or stepped-hole geometry MUST be preserved
- **AND** a successful update MUST rewrite only the canonical enum field

#### Scenario: Invalid cylinder seat mode

- **WHEN** `bottomSeatMode` is missing from a canonical current snapshot or has
  an unsupported value
- **THEN** validation MUST return a field-specific error
- **AND** the invalid snapshot MUST NOT be generated, exported, or committed

### Requirement: Stepped center mounting hole

When `bottomSeatMode='hole'`, every valid cylinder MUST contain the existing
center floor hole at `(0, 0)` with the profile-specific Ø5/Ø7.05 planar stepped
sections: 4+1 mm in default mode, 1+1 mm in thin-bottom mode, and 2+1 mm in
bottom-plate mode. The transition MUST remain a planar shoulder. When
`bottomSeatMode='none'`, the center and all outer bottom-hole candidates MUST
remain solid. When `bottomSeatMode='integrated'`, the center MUST instead carry
one fused solid Ø5 mm cylinder exactly 3 mm high from Z=-3 mm through Z=0;
there MUST be no stepped center hole at that position. When
`bottomSeatMode='center-hook'`, the center MUST instead carry the centered
two-stage quarter-turn hook defined by the center-hook compatibility
requirement, and MUST NOT contain a stepped hole or round integrated seat.

#### Scenario: Cylinder hole mode preserves the center socket

- **WHEN** a valid cylinder uses `bottomSeatMode='hole'`
- **THEN** the center hole MUST retain the selected profile's existing Ø5 mm
  lower and Ø7.05 mm upper sections
- **AND** its center MUST remain at X=0 and Y=0

#### Scenario: Cylinder no-seat mode is solid

- **WHEN** a valid cylinder uses `bottomSeatMode='none'`
- **THEN** the bottom MUST remain solid at the center and all outer-hole
  candidates
- **AND** no stepped-hole cylindrical faces or integrated seats may be present

#### Scenario: Cylinder integrated center seat

- **WHEN** a valid cylinder uses `bottomSeatMode='integrated'`
- **THEN** the center MUST contain a fused Ø5 mm round seat spanning Z=-3 mm to
  Z=0
- **AND** the center MUST not contain the hole-mode stepped cut
- **AND** the result MUST remain one valid solid

#### Scenario: Cylinder center hook replaces the center seat

- **WHEN** a valid cylinder uses `bottomSeatMode='center-hook'`
- **THEN** the center MUST contain exactly one fused two-stage hook with a
  3.6 × 7.6 mm rectangular head from Z=-2.9 mm through Z=-2.1 mm and a
  centered Ø3.6 mm round rotation stem from Z=-2.1 mm through Z=0
- **AND** the center MUST not contain a stepped hole or a round seat
- **AND** the result MUST remain one valid solid

### Requirement: Four outer cardinal holes from the 14 mm grid

When `bottomSeatMode='hole'`, the builder MUST retain the existing safe outer
cardinal calculation and emit only the outermost four positions
`(±14n,0)` and `(0,±14n)` when the calculated index `n` is at least one. The
profile-specific outer clearance and thin-floor/ramp rules MUST remain
unchanged. When `bottomSeatMode='none'`, no outer hole may be emitted. When
`bottomSeatMode='integrated'`, the same calculated safe positions MUST receive
fused Ø5 mm × 3 mm seats from Z=-3 mm to Z=0 instead of holes. When
`bottomSeatMode='center-hook'`, no outer hole or outer integrated seat may be
emitted. No diagonal, intermediate, or additional positions are permitted in
any mode.

#### Scenario: Hole mode uses the safe cardinal group

- **WHEN** a valid cylinder uses `bottomSeatMode='hole'` and its diameter fits
  the first safe outer layer
- **THEN** it MUST contain exactly the center hole and the four existing
  cardinal holes at the calculated 14 mm layer
- **AND** no diagonal or intermediate hole may be present

#### Scenario: No-seat mode omits all cardinal holes

- **WHEN** a valid cylinder uses `bottomSeatMode='none'`
- **THEN** it MUST contain no center or outer bottom holes
- **AND** no hole-layout failure may be raised solely because holes are absent

#### Scenario: Integrated mode mirrors the safe positions

- **WHEN** a valid cylinder uses `bottomSeatMode='integrated'`
- **THEN** every position that would be a safe outer hole in `hole` mode MUST
  contain one Ø5 mm × 3 mm outward seat
- **AND** the safe outer index and radial positions MUST be identical to hole
  mode for the same diameter and profile

#### Scenario: Center-hook mode has no outer locating group

- **WHEN** a valid cylinder uses `bottomSeatMode='center-hook'`
- **THEN** no 14 mm cardinal position may contain a bottom hole or integrated
  seat
- **AND** the only special locating geometry MUST be the centered rectangular
  hook

### Requirement: Outer-edge hole clearance

The existing outer-edge and thin-bottom ramp clearance calculation MUST apply
to the position set selected by `bottomSeatMode` for hole and integrated modes.
Hole mode MUST validate the Ø7.05 mm hole profile as before. Integrated mode
MUST validate the Ø5 mm seat radius and its fused footprint against the same
safe radial positions; its 3 mm downward extension MUST NOT alter the selected
outer index. None and center-hook modes MUST perform no outer-hole clearance
calculation and MUST not create a false failure for the solid bottom or the
center hook.

#### Scenario: Safe integrated seat placement

- **WHEN** an integrated outer position is selected
- **THEN** its Ø5 mm footprint MUST remain within the existing safe outer and,
  for thin-bottom mode, flat-floor/ramp clearances
- **AND** the seat MUST be fused without changing the cylinder diameter

#### Scenario: Unsafe layer is skipped in both active modes

- **WHEN** the next 14 mm layer would violate the applicable radial clearance
- **THEN** neither a hole nor an integrated seat may be generated at that layer
- **AND** the preceding safe layer or center-only/center-seat layout MUST remain
  unchanged

### Requirement: Cylinder geometry quality and exports

The builder MUST reject any result that is empty, not a single valid solid,
outside its bounds, or invalid for its selected profile, opening, floor, wall,
stacking, clearance, or center-hook contract. In `hole` mode it MUST validate
the existing stepped hole records and compatibility fixture. In `none` mode it
MUST require zero bottom-hole records and zero integrated-seat records. In
`integrated` mode it MUST require the expected center-plus-safe-cardinal seat
records, validate their Ø5 mm diameter and 3 mm Z span from -3 to 0, and retain
the existing shell/opening/stacking checks. In `center-hook` mode it MUST
validate one centered two-stage hook, the 3.6 × 7.6 mm head, the Ø3.6 mm
round rotation stem, the short engagement envelope, positive rotation
clearance, and fusion into the cylinder. The contract bounds MUST use
min Z=-3 mm in `integrated` mode and min Z=-2.9 mm in `center-hook` mode;
max Z and XY bounds MUST remain unchanged.
Valid results MUST remain eligible for preview, STEP export, and binary STL
export.

#### Scenario: All three seat modes are exportable

- **WHEN** a valid cylinder snapshot in any of the existing three seat modes
  completes quality validation
- **THEN** the workspace MUST commit a non-empty preview revision
- **AND** the reported bounds MUST match the selected mode
- **AND** STEP and STL export MUST be enabled for that revision

#### Scenario: Invalid integrated geometry does not replace the model

- **WHEN** an integrated-seat fuse, seat dimension, bounds, shell, opening, or
  stacking quality probe fails
- **THEN** the candidate MUST be rejected with a diagnosable error
- **AND** the last valid committed revision MUST remain visible
- **AND** export MUST remain disabled for the failed snapshot

#### Scenario: All four seat modes are exportable

- **WHEN** a valid cylinder snapshot in any seat mode completes quality
  validation
- **THEN** the workspace MUST commit a non-empty preview revision
- **AND** the reported bounds MUST match the selected mode
- **AND** STEP and STL export MUST be enabled for that revision

#### Scenario: Invalid center hook does not replace the model

- **WHEN** a center-hook dimension, engagement probe, fuse, bounds, shell,
  opening, or stacking quality probe fails
- **THEN** the candidate MUST be rejected with a diagnosable error
- **AND** the last valid committed revision MUST remain visible
- **AND** export MUST remain disabled for the failed snapshot

### Requirement: Deterministic cylinder export metadata

The catalog MUST provide deterministic STEP and STL filenames generated from
typed normalized parameters. Every filename MUST include exactly one seat
suffix: `-seats-none`, `-seats-hole`, `-seats-integrated`, or
`-seats-center-hook`, in addition to the existing diameter, height, profile,
and opening fingerprint identity. The suffix MUST be present even for the
default mode. Filenames MUST NOT depend on raw input formatting and MUST
distinguish all four bottom geometries and all opening settings.

#### Scenario: Cylinder filenames distinguish seat modes

- **WHEN** four cylinders have identical diameter, height, profile, and
  opening values but use the four different seat modes
- **THEN** their STEP and STL filenames MUST be distinct
- **AND** each filename MUST contain its corresponding deterministic seat suffix

#### Scenario: Integrated cylinder export metadata

- **WHEN** an integrated-seat cylinder is exported
- **THEN** both filenames MUST contain `-seats-integrated`
- **AND** the exported geometry MUST contain the selected Ø5 mm × 3 mm seats

#### Scenario: Center-hook cylinder export metadata

- **WHEN** a center-hook cylinder is exported
- **THEN** both filenames MUST contain `-seats-center-hook`
- **AND** the exported geometry MUST include the centered two-stage hook

### Requirement: OpenGrid stackable-cylinder workspace integration

The CAD workspace MUST bind `/cad/opengrid-stackable-cylinder` exclusively to
`modelId=opengrid-stackable-cylinder`. The catalog entry MUST expose the
existing typed diameter, height, profile, and opening controls plus exactly one
visible locating-seat radio group with `無角座`, `角座孔`, `內建角座`, and
`中心卡勾`. The visible panel MUST NOT expose `bottomPlateMode` as a selectable
profile, and MUST NOT expose individual center or outer-hole toggles. The
Worker MUST validate the canonical cylinder enum and route this model ID to the
independent cylinder builder without falling through to another model.

#### Scenario: Cylinder route initializes

- **WHEN** a user opens `/cad/opengrid-stackable-cylinder`
- **THEN** the workspace MUST initialize with
  `modelId=opengrid-stackable-cylinder`
- **AND** the first valid generation MUST use valid saved parameters or the
  defaults, including `bottomSeatMode='hole'` when no seat value exists

#### Scenario: Cylinder seat controls

- **WHEN** a user views the cylinder parameter panel
- **THEN** it MUST show exactly `無角座`, `角座孔`, `內建角座`, and `中心卡勾`
  as mutually exclusive radio choices
- **AND** the existing selected profile descriptions MUST remain unchanged
- **AND** it MUST not show rectangular X/Y, box full-grid, or individual-hole
  controls

#### Scenario: Cylinder Worker dispatch is component-specific

- **WHEN** the Worker receives a cylinder generation request with a seat mode
- **THEN** it MUST validate the cylinder parameter shape and invoke the cylinder
  builder
- **AND** a mismatched or unsupported seat value MUST be rejected with a
  diagnosable validation error

### Requirement: Centered quarter-turn hook compatibility

The `center-hook` cylinder mode MUST use the existing OpenGrid Snap
center-remover profile as its mating interface. The Snap lower passage is a
nominal 8 × 8 mm square and its upper passage is nominally 4 × 8 mm, with the
profile-specific step at Z=4.8 mm for Full and Z=1.9 mm for Lite. The cylinder
MUST generate one centered male hook with a nominal 8 × 4 mm rectangular head,
reduced to 3.6 × 7.6 mm by the fixed 0.2 mm per-side print clearance. The head
MUST be 0.8 mm high, from Z=-2.9 mm through Z=-2.1 mm, and MUST be joined to a
centered round Ø3.6 mm rotation stem from Z=-2.1 mm through Z=0. The stem
MUST extend 0.1 mm beyond the Full 2 mm narrow passage depth, making the total
downward span 2.9 mm rather than a long remover-style shaft. The hook MUST
enter the narrow passage in its insertion orientation, allow continuous
rotation through the passage via the round stem, place the head in the lower
square chamber for both Snap variants before rotation, and remain captured
when rotated 90 degrees around Z until returned to its insertion orientation.

#### Scenario: Center hook fits the Full Snap profile

- **WHEN** a center-hook cylinder is inserted into a Full Snap center-remover
  opening in the insertion orientation
- **THEN** the Ø3.6 mm rotation stem MUST pass through the 4 × 8 mm upper
  passage with 0.2 mm radial clearance on the narrow axis
- **AND** the rectangular head MUST clear the 2 mm narrow passage and enter
  the 8 × 8 mm lower chamber before rotation
- **AND** after a 90-degree Z rotation its 7.6 mm long side MUST be retained
  by the upper passage shoulder

#### Scenario: Center hook fits the Lite Snap profile

- **WHEN** a center-hook cylinder is inserted into a Lite Snap center-remover
  opening in the insertion orientation
- **THEN** the Ø3.6 mm rotation stem MUST pass through the 4 × 8 mm upper
  passage and the rectangular head MUST reach the 8 × 8 mm lower square
  chamber
- **AND** after a 90-degree Z rotation the head MUST remain captured by the
  same quarter-turn principle

#### Scenario: Center hook is printable and fused

- **WHEN** a valid cylinder uses `bottomSeatMode='center-hook'`
- **THEN** the hook MUST be fused to the cylinder at the Z=0 bottom face
- **AND** its 0.2 mm per-side head clearance and Ø3.6 mm stem MUST leave a
  positive printable gap against the mating passage
- **AND** the total hook span MUST remain the configured short 2.9 mm
- **AND** the complete result MUST remain one valid solid
