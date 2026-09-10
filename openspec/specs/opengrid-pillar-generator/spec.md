## Purpose

提供鎖定角座與物件定位用自訂長度版的 OpenGrid 定位元件，讓使用者能產生可預覽、可驗證並可匯出的單一 CAD solid。

## Requirements

### Requirement: Pillar parameter contract

The system MUST expose an independent OpenGrid component with stable
`modelId=opengrid-pillar` and `buildKey=opengrid-pillar`. Its normalized
parameter snapshot MUST be either exactly
`{ mode: 'detachable-corner-seat', length, offset }` or exactly
`{ mode: 'positioning', length, offset }`. In `positioning` mode, `length`
MUST be a safe integer from 3 through 500 mm. In `detachable-corner-seat`
mode, `length` MUST be a finite numeric millimetre value from 3.0 through
100.0 inclusive and MUST use a 0.1 mm step without automatic rounding.
`offset` MUST be a finite numeric millimetre value from -1 through 1 inclusive,
MUST use a 0.1 mm step without automatic rounding, and MUST be accepted by
both modes. The `offset` value MUST be applied as an additive increment to the
selected mode's body XY diameter; it MUST NOT translate the model in world X
or Y. In `detachable-corner-seat` mode both parameters MUST affect only the
locating cylinder below the retaining head; the keyed leaf retaining head MUST
NOT be resized or reshaped by any parameter. The default snapshot MUST be
exactly `{ mode: 'detachable-corner-seat', length: 3.8, offset: 0 }`.

The positioning mode MUST retain a nominal Ø4.9 mm two-end-chamfer profile
and expose only its total length plus the shared XY diameter increment as user
parameters. The detachable-corner-seat mode MUST expose only its locating
body length plus the shared XY diameter increment; its retaining head and every
shared socket-side dimension MUST remain fixed geometry.

#### Scenario: Default pillar parameters

- **WHEN** a user opens the pillar component without a valid saved snapshot
- **THEN** the component MUST use
  `mode=detachable-corner-seat` with `length=3.8` and `offset=0`
- **AND** the generated model MUST use a centered Ø4.9 mm locating body with
  the fixed shared locking corner-seat retaining head and indicator geometry
  preserved

#### Scenario: Valid pillar modes

- **WHEN** a pillar snapshot contains `mode=positioning` or
  `mode=detachable-corner-seat` with the mode-appropriate fields and a valid
  shared XY diameter increment
- **THEN** validation MUST accept the snapshot
- **AND** the generated model MUST remain centered on the world XY origin
- **AND** each mode's body XY diameter MUST equal 4.9 mm plus `offset`

#### Scenario: Valid detachable corner-seat mode

- **WHEN** a pillar snapshot is exactly
  `{ mode: 'detachable-corner-seat', length: 4.2, offset: 0.1 }`
- **THEN** validation MUST accept the snapshot
- **AND** the generated model MUST use the shared male corner-seat retaining
  head seated on a Ø5.0 mm locating cylinder of height 4.2 mm, centered on
  the world XY origin

#### Scenario: XY diameter increment validation

- **WHEN** a pillar snapshot of either mode contains a fractional-step,
  non-finite, non-numeric, or out-of-range `offset`
- **THEN** validation MUST reject the snapshot with an `offset`-specific
  diagnostic
- **AND** the invalid snapshot MUST NOT be sent as a valid model-generation
  request

#### Scenario: Detachable mode length validation

- **WHEN** a detachable-corner-seat snapshot contains a non-0.1-step,
  non-finite, non-numeric, or out-of-range `length`
- **THEN** validation MUST reject the snapshot with a `length`-specific
  diagnostic
- **AND** it MUST NOT silently resize or reshape the shared retaining head

#### Scenario: Detachable mode rejects adjustable fields

- **WHEN** a detachable-corner-seat snapshot contains a field other than
  `mode`, `length`, or `offset`
- **THEN** validation MUST reject the snapshot with a field-specific
  diagnostic
- **AND** it MUST NOT silently resize the shared fit geometry

#### Scenario: Positioning mode length validation

- **WHEN** a positioning snapshot contains a fractional, non-finite,
  non-numeric, or out-of-range `length`
- **THEN** validation MUST reject the snapshot with a field-specific
  diagnostic
- **AND** the invalid snapshot MUST NOT be sent as a valid model-generation
  request

#### Scenario: Invalid pillar mode

- **WHEN** a pillar snapshot contains a missing, non-string, or unsupported
  `mode`, including the removed `standard` or `thin-shell` values
- **THEN** validation MUST reject the snapshot with a field-specific
  diagnostic
- **AND** the invalid snapshot MUST NOT be sent as a valid model-generation
  request

#### Scenario: Legacy pillar snapshot migration

- **WHEN** persistence contains the old `{ length, baseConnection: false }`
  pillar shape with a valid length
- **THEN** hydration MUST normalize it to
  `{ mode: 'positioning', length, offset: 0 }`
- **WHEN** persistence contains the old `{ mode, offsetX, offsetY }` shape
  with equal valid X/Y values
- **THEN** hydration MUST normalize it to the corresponding `{ mode, offset }`
  shape
- **WHEN** persistence contains the old X/Y shape with unequal values
- **THEN** hydration MUST preserve the valid mode and positioning length when
  available and normalize the shared offset to `0`
- **WHEN** persistence contains `standard` or `thin-shell` mode data, with or
  without legacy offsets
- **THEN** hydration MUST normalize it to
  `{ mode: 'detachable-corner-seat', length: 3.8, offset: 0 }`
- **WHEN** persistence contains a detachable-corner-seat record that carries
  `mode` only, or another malformed pillar record
- **THEN** hydration MUST normalize it to
  `{ mode: 'detachable-corner-seat', length: 3.8, offset: 0 }` or a
  corresponding valid positioning mode when a valid positioning length is
  available
- **AND** an old checkbox state MUST NOT remain as an active user parameter

### Requirement: Pillar geometry quality and export identity

Every valid pillar generation MUST produce one connected solid with finite,
non-empty mesh data and a centered XY envelope. The `positioning` mode MUST
have X/Y envelope extents of ±`(2.45 + offset / 2)` mm because its body is
nominally Ø4.9 mm; the `detachable-corner-seat` mode MUST have X envelope
extents of ±3.321716 mm from the shared leaf head and Y envelope extents of
±`(2.45 + offset / 2)` mm, because the locating body — not the narrower
1.96 mm key — always defines the seat's Y envelope. The positioning mode MUST
have Z bounds `[0, length]`, and the detachable-corner-seat mode MUST have Z
bounds `[0, length + 1.4]`.

The deterministic zero-offset positioning export stem MUST be
`pillar-{length}-positioning`; a non-zero shared offset export MUST append a
deterministic `-xy{offset}` value. The detachable-corner-seat export stem MUST
be `pillar-{length + 1.4}-detachable-corner-seat` and MUST append `-z{length}`
when `length` differs from 3.8 and `-xy{offset}` when `offset` is non-zero, in
that order; the default-parameter stem MUST remain exactly
`pillar-5.2-detachable-corner-seat`. Distinct typed geometry MUST NOT share
export metadata. `.step` and `.stl` extensions MUST remain supplied by the
existing export contracts.

At the default detachable parameters (`length=3.8`, `offset=0`) the pillar
volume MUST be consistent with a Ø4.9 mm parametric locating section fused to
the shared male retaining head with its 0.1 mm top clearance trim applied; it
MUST NOT be required to match the larger fixed male reference volume. At any
other detachable parameter combination the pillar MUST remain one valid
connected solid whose volume is consistent with its parametric locating
section fused to the trimmed shared head.

#### Scenario: Standard quality gate

- **WHEN** a candidate contains the removed `{ mode: 'standard', offset }`
  shape
- **THEN** validation MUST reject the candidate
- **AND** no standard geometry or export MUST be produced

#### Scenario: Thin-shell quality gate

- **WHEN** a candidate contains the removed `{ mode: 'thin-shell', offset }`
  shape
- **THEN** validation MUST reject the candidate
- **AND** no thin-shell geometry or export MUST be produced

#### Scenario: Shared XY diameter increment

- **WHEN** a valid positioning pillar with `length=25` and `offset=1` is
  prepared for commit
- **THEN** its body MUST be Ø5.9 mm
- **AND** its centered bounds MUST be `[-2.95, -2.95, 0]` through
  `[2.95, 2.95, 25]` within the workspace tolerance
- **AND** its Z bounds and axial profile MUST be unchanged from the positioning
  profile

#### Scenario: Positioning quality gate

- **WHEN** a valid positioning pillar with `length=25` and `offset=0.3` is
  prepared for commit
- **THEN** it MUST contain exactly one valid connected solid
- **AND** its mesh MUST be finite and non-empty
- **AND** its centered bounds MUST be `[-2.6, -2.6, 0]` through
  `[2.6, 2.6, 25]` within the workspace tolerance

#### Scenario: Detachable corner-seat quality gate

- **WHEN** a valid detachable-corner-seat candidate is prepared for commit
- **THEN** it MUST contain exactly one valid connected solid
- **AND** its mesh MUST be finite and non-empty
- **AND** its bounds MUST be `[-3.321716, -(2.45 + offset / 2), 0]` through
  `[3.321716, (2.45 + offset / 2), length + 1.4]` within the workspace
  tolerance
- **AND** its volume MUST remain consistent with the parameterized locating
  section fused to the shared male retaining head with the shared 0.1 mm top
  clearance trim applied

#### Scenario: Mode-specific export identity

- **WHEN** a committed positioning pillar with `length=25` and `offset=0` is
  exported
- **THEN** its export stem MUST be `pillar-25-positioning`
- **WHEN** a committed positioning pillar with `length=25` and `offset=0.2`
  is exported
- **THEN** its export stem MUST be `pillar-25-positioning-xy0.2`
- **WHEN** a committed locking corner seat with default parameters is exported
- **THEN** its export stem MUST be `pillar-5.2-detachable-corner-seat`
- **WHEN** a committed locking corner seat with `length=5` and `offset=0.1`
  is exported
- **THEN** its export stem MUST be
  `pillar-6.4-detachable-corner-seat-z5-xy0.1`
- **WHEN** a committed locking corner seat with `length=3.8` and
  `offset=-0.2` is exported
- **THEN** its export stem MUST be
  `pillar-5.2-detachable-corner-seat-xy-0.2`
- **AND** every export MUST use the committed pillar B-Rep rather than a
  viewport mesh reconstruction

### Requirement: Fixed mode-specific pillar geometry

For the `positioning` mode, the generator MUST create one centered cylindrical
body with nominal Ø4.9 mm and a 45-degree equal-distance chamfer of 0.2 mm at
both the lower and upper ends. Both chamfers MUST be included within the
requested total length, and the effective body diameter MUST equal the nominal
diameter plus `offset`. The complete solid MUST remain centered on the
local/world XY origin.

The `detachable-corner-seat` mode MUST combine a parametric locating section
with the shared male retaining head carrying the shared 0.1 mm top clearance
trim. Its locating section MUST span `Z=0` through `Z=length` with maximum
Ø`(4.9 + offset)` mm, beginning with a 0.2 mm-high lead-in chamfer from
Ø`(4.5 + offset)` mm at Z=0 to Ø`(4.9 + offset)` mm at Z=0.2. The keyed leaf
retaining head MUST be derived from the shared fixed male reference geometry
rather than re-modeled, and MUST be seated with its base at `Z=length`: it
MUST keep the shared 1.96 mm nominal key width at its taper datum, flare from
a nominal 4.24 mm length at its base to the maximum 6.64 mm length 1.35 mm
above its base, and finish with a 0.05 mm-high flat wear surface 1.4 mm above
its base. The head MUST remain within the Ø7 mm envelope at every height, and
no retaining-head dimension — including the 0.1 mm top clearance trim — MUST
respond to `length` or `offset`.

#### Scenario: Standard pillar geometry

- **WHEN** the generator receives the removed `{ mode: 'standard', offset }`
  shape
- **THEN** the parameter contract MUST reject it before geometry generation
- **AND** the former standard flange and 0.5 mm upper chamfer MUST no longer
  be part of the supported pillar surface

#### Scenario: Standard pillar XY sizing

- **WHEN** the generator receives a removed standard shape with an XY offset
- **THEN** validation MUST reject it rather than creating a flange-based
  profile

#### Scenario: Thin-shell pillar geometry

- **WHEN** the generator receives the removed `{ mode: 'thin-shell', offset }`
  shape
- **THEN** the parameter contract MUST reject it before geometry generation
- **AND** the former thin-shell profile MUST no longer be part of the
  supported pillar surface

#### Scenario: Positioning pillar geometry

- **WHEN** the generator builds `{ mode: 'positioning', length: 25, offset: 0.1 }`
- **THEN** the model MUST span `Z=0` through `Z=25`
- **AND** the body MUST be Ø5.0 mm and remain centered on X/Y
- **AND** the lower end MUST have a 0.2 mm, 45-degree equal-distance chamfer
- **AND** the upper end MUST have a 0.2 mm, 45-degree equal-distance chamfer
- **AND** both chamfers MUST be included within the requested total length

#### Scenario: Detachable corner-seat geometry

- **WHEN** the generator builds
  `{ mode: 'detachable-corner-seat', length: 3.8, offset: 0 }`
- **THEN** the model MUST span `Z=0` through `Z=5.2`
- **AND** the locating section MUST be Ø4.9 mm with its 0.2 mm lead-in
- **AND** the keyed leaf retaining head and 0.05 mm wear surface MUST match
  the fixed shared reference geometry with the shared 0.1 mm top clearance
  trim applied
- **AND** the head MUST remain within the Ø7 mm envelope at every height

#### Scenario: Detachable corner-seat geometry with parameters

- **WHEN** the generator builds
  `{ mode: 'detachable-corner-seat', length: 5, offset: 0.3 }`
- **THEN** the model MUST span `Z=0` through `Z=6.4`
- **AND** the locating section MUST be a Ø5.2 mm cylinder of height 5 mm with
  the 0.2 mm lead-in from Ø4.8 mm at Z=0
- **AND** the retaining head MUST be the shared reference head seated at
  Z=5 through Z=6.4 with its profile unchanged from the shared geometry apart
  from the shared 0.1 mm top clearance trim

#### Scenario: Fixed dimensions are not user parameters

- **WHEN** a user views or edits the pillar panel in
  `detachable-corner-seat` mode
- **THEN** selecting `鎖定角座` MUST expose the locating-section length and
  one shared XY diameter increment control
- **AND** adjusting either control MUST change only the locating cylinder
  below the retaining head
- **AND** the retaining head and all socket-side geometry MUST stay fixed
- **AND** selecting `物件定位用` MUST expose only the custom total-length and
  one shared XY diameter increment control
- **AND** neither mode MUST expose manual chamfer controls

### Requirement: OpenGrid pillar workspace integration

The runtime-validated component catalog MUST register `opengrid-pillar` as an
independent OpenGrid model definition and MUST route
`/cad/opengrid-pillar` to it. The definition MUST expose exactly one required
radio group with `detachable-corner-seat` and `positioning` choices in that
order, defaulting to `detachable-corner-seat`. Both modes MUST expose one
shared numeric `offset` control. The positioning mode MUST expose its custom
integer `length` field (3–500 mm, initial 10 mm). The detachable-corner-seat
mode MUST expose its locating-section `length` field (3.0–100.0 mm, step
0.1 mm, initial 3.8 mm). The shared offset control MUST accept -1–1 mm in
0.1 mm steps. Switching the radio choice MUST reset the numeric fields to the
newly selected mode's defaults. The Worker MUST dispatch
`modelId=opengrid-pillar` to the pillar builder, and the CAD workspace MUST
not fall through to another component or expose another component's
parameters.

#### Scenario: Pillar initial generation

- **GIVEN** a user opens `/cad/opengrid-pillar` in a supported browser
- **WHEN** the Worker emits `engine.ready`
- **THEN** the main thread MUST send generation 1 using a valid saved pillar
  snapshot or
  `{ mode: 'detachable-corner-seat', length: 3.8, offset: 0 }`
- **AND** the Worker MUST route the request to the independent pillar builder
- **AND** the committed model MUST expose pillar bounds, mesh, and model
  metadata centered on the world XY origin

#### Scenario: Pillar parameter controls

- **GIVEN** a user views the `/cad/opengrid-pillar` workspace
- **WHEN** the parameter panel is rendered
- **THEN** it MUST expose a radio group with clearly labeled `鎖定角座` and
  `物件定位用` choices in that order
- **AND** the locking corner-seat choice MUST be selected by default
- **AND** the locking corner-seat choice MUST show the description
  `搭配各元件的鎖定角座插槽使用，壓入後旋轉即可完成定位與鎖定。`
- **AND** both choices MUST expose one shared `offset` control with range
  -1–1 mm and step 0.1 mm
- **AND** selecting positioning MUST expose a custom integer total-length field
  from 3–500 mm with an initial value of 10 mm
- **AND** selecting detachable corner seat MUST expose a locating-section
  length field from 3.0–100.0 mm with step 0.1 mm and an initial value of
  3.8 mm
- **AND** no fixed-mode diameter, flange-height, or chamfer field MUST be
  exposed

#### Scenario: Mode selection updates the existing model

- **GIVEN** a user views the `/cad/opengrid-pillar` workspace
- **WHEN** the user selects a radio choice or changes a valid field for that
  choice
- **THEN** the workspace MUST validate and generate the corresponding pillar
  mode
- **AND** switching the radio choice MUST reset the numeric fields to the
  newly selected mode's defaults rather than carrying the previous mode's
  values over
- **AND** the accepted typed mode and its mode-appropriate fields MUST be
  persisted under `opengrid-pillar`
- **AND** the generated model MUST remain centered on the world XY origin
  rather than translating in X or Y

#### Scenario: Pillar route isolation

- **GIVEN** a `model.generate` request carries `modelId=opengrid-pillar`
- **WHEN** the Worker validates and builds the request
- **THEN** it MUST accept only the pillar parameter shape for `positioning` or
  `detachable-corner-seat`, with `length` validated per mode (integer 3–500
  for positioning, 0.1-step 3.0–100.0 for the locking corner seat) and the
  shared `offset` allowed in both modes from -1 through 1 in 0.1 mm steps
- **AND** it MUST reject removed `standard` and `thin-shell` shapes and other
  mismatched or unknown parameter shapes
- **AND** it MUST NOT resolve the request through another component's builder
  or template cache

#### Scenario: Invalid pillar input lifecycle

- **WHEN** a user or external caller supplies a missing, malformed, unsupported
  pillar mode or a mode-inappropriate, invalid length or offset
- **THEN** the workspace MUST show a diagnosable field error
- **AND** it MUST send `model.invalidate` rather than `model.generate` for that
  invalid snapshot
- **AND** export MUST remain disabled while the input is invalid or stale

### Requirement: Detachable corner-seat male bottom indicator

When `opengrid-pillar` generates the `detachable-corner-seat` profile at any
valid `length` and `offset`, its exposed Z=0 bottom face MUST contain the
shared 0.5 mm by 3 mm straight-slot indicator recessed by 0.4 mm. The
indicator MUST remain centered on the male seat's local rotational datum, MUST
keep its orientation fixed relative to the retaining head's rotational datum,
MUST not change the outer XY or Z bounds beyond the parameterized locating
section, and MUST preserve the deterministic export identity. The positioning
pillar MUST remain a centered, unmarked cylindrical profile with its new
nominal Ø4.9 mm body and MUST NOT receive this indicator.

#### Scenario: Detachable pillar exposes the lock indicator

- **WHEN** the locking corner-seat pillar is generated at any valid parameters
  and viewed from its bottom
- **THEN** one readable straight-slot recess MUST be present on the Z=0 face
- **AND** the recess depth MUST be 0.4 mm within geometry tolerance
- **AND** its footprint MUST be nominally 0.5 mm wide by 3 mm long

#### Scenario: Detachable indicator preserves the fixed pillar contract

- **WHEN** the marked locking corner seat is prepared for mesh, quality checks,
  or export
- **THEN** it MUST remain one valid connected solid with finite non-empty mesh
  data
- **AND** its keyed leaf retaining head MUST remain unchanged from the shared
  reference geometry apart from the shared 0.1 mm top clearance trim
- **AND** at default parameters its bounds MUST remain
  `[-3.321716, -2.45, 0]` through `[3.321716, 2.45, 5.2]` within geometry
  tolerance
- **AND** its default export stem MUST remain
  `pillar-5.2-detachable-corner-seat`

#### Scenario: Other pillar modes remain unmarked

- **WHEN** a positioning pillar is generated, or a removed standard or
  thin-shell shape is supplied
- **THEN** its mode-specific geometry, quality checks, bounds, mesh, and export
  identity MUST remain consistent with the new Ø4.9 mm nominal body and the
  specified 0.2 mm end chamfers
- **AND** no detachable-seat indicator MUST be added
- **AND** removed modes MUST be rejected rather than receiving an indicator
