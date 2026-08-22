## Purpose

提供堆疊版、薄殼版與物件定位用自訂長度版的圓柱支柱 component，讓使用者能產生可預覽、可驗證並可匯出的單一 CAD solid。

## Requirements

### Requirement: Pillar parameter contract

The system MUST expose an independent OpenGrid component with stable
`modelId=opengrid-pillar` and `buildKey=opengrid-pillar`. Its normalized
parameter snapshot MUST be either exactly `{ mode: 'standard', offset }`,
exactly `{ mode: 'thin-shell', offset }`, exactly
`{ mode: 'positioning', length, offset }`, or exactly
`{ mode: 'detachable-corner-seat' }`. `length` MUST be a safe integer from 3
through 500 mm and MUST be accepted only by `positioning`. `offset` MUST be a
finite numeric millimetre value from -0.5 through 0.5 inclusive, MUST use a
0.05 mm step without automatic rounding, and MUST be accepted only by
`standard`, `thin-shell`, and `positioning`. The same `offset` value MUST be
applied as an additive increment to the corresponding XY diameters in those
three profiles; it MUST NOT translate the model in world X or Y. The
detachable-corner-seat profile MUST remain fixed to the shared reference
geometry and MUST reject adjustable length or offset fields. The default
snapshot MUST be `{ mode: 'standard', offset: 0 }`.

The standard and thin-shell total lengths, nominal body diameter, nominal
flange dimensions, and chamfer dimensions MUST remain fixed geometry and MUST
NOT be exposed as user parameters. The positioning mode MUST retain the nominal
Ø5 mm two-end-chamfer profile and expose only its total length plus the shared
XY diameter increment as user parameters.

#### Scenario: Default pillar parameters

- **WHEN** a user opens the pillar component without a valid saved snapshot
- **THEN** the component MUST use `mode=standard` and `offset=0`
- **AND** the generated model MUST use the standard 9 mm fixed-length assembly profile centered at the world XY origin

#### Scenario: Valid pillar modes

- **WHEN** a pillar snapshot contains `mode=standard`, `mode=thin-shell`, or
  `mode=positioning` with the mode-appropriate fields and a valid shared XY
  diameter increment
- **THEN** validation MUST accept the snapshot
- **AND** the generated model MUST remain centered on the world XY origin with
  each applicable XY diameter equal to its nominal diameter plus `offset`
- **AND** all Z dimensions and total lengths MUST remain unchanged

#### Scenario: Valid detachable corner-seat mode

- **WHEN** a pillar snapshot is exactly `{ mode: 'detachable-corner-seat' }`
- **THEN** validation MUST accept the snapshot
- **AND** the generated model MUST use the fixed shared male corner-seat
  geometry centered on the world XY origin

#### Scenario: XY diameter increment validation

- **WHEN** an adjustable pillar snapshot contains a fractional-step,
  non-finite, non-numeric, or out-of-range `offset`
- **THEN** validation MUST reject the snapshot with an `offset`-specific diagnostic
- **AND** the invalid snapshot MUST NOT be sent as a valid model-generation request

#### Scenario: Detachable mode rejects adjustable fields

- **WHEN** a detachable-corner-seat snapshot contains `offset`, `length`, or
  another unsupported field
- **THEN** validation MUST reject the snapshot with a field-specific diagnostic
- **AND** it MUST NOT silently resize the shared fit geometry

#### Scenario: Positioning mode length validation

- **WHEN** a positioning snapshot contains a fractional, non-finite, non-numeric, or out-of-range `length`
- **THEN** validation MUST reject the snapshot with a field-specific diagnostic
- **AND** the invalid snapshot MUST NOT be sent as a valid model-generation request

#### Scenario: Invalid pillar mode

- **WHEN** a pillar snapshot contains a missing, non-string, or unsupported `mode`
- **THEN** validation MUST reject the snapshot with a field-specific diagnostic
- **AND** the invalid snapshot MUST NOT be sent as a valid model-generation request

#### Scenario: Legacy pillar snapshot migration

- **WHEN** persistence contains the old `{ length, baseConnection: false }` pillar shape with a valid length
- **THEN** hydration MUST normalize it to `{ mode: 'positioning', length, offset: 0 }`
- **WHEN** persistence contains the old `{ mode, offsetX, offsetY }` shape with equal valid X/Y values
- **THEN** hydration MUST normalize it to the corresponding `{ mode, offset }` shape
- **WHEN** persistence contains the old X/Y shape with unequal values
- **THEN** hydration MUST preserve the valid mode and positioning length when available and normalize the shared offset to `0`
- **WHEN** persistence contains an old mode-only snapshot or another malformed pillar record
- **THEN** hydration MUST normalize it to `{ mode: 'standard', offset: 0 }` or
  another corresponding valid adjustable mode with zero offset
- **AND** an old checkbox state MUST NOT remain as an active user parameter

### Requirement: Pillar geometry quality and export identity

Every valid pillar generation MUST produce one connected solid with finite,
non-empty mesh data and a centered XY envelope whose diameter is determined by
the selected profile. The `standard` and `thin-shell` modes MUST have X/Y
envelope extents of ±`(3.5 + offset / 2)` mm because their largest nominal
flange is Ø7 mm; the `positioning` mode MUST have X/Y envelope extents of
±`(2.5 + offset / 2)` mm because its body is nominally Ø5 mm; and the fixed
`detachable-corner-seat` mode MUST have X/Y envelope extents of ±2.5 mm. The
standard mode MUST have Z bounds `[0, 9]`, the thin-shell mode MUST have Z
bounds `[0, 6]`, positioning mode MUST have Z bounds `[0, length]`, and the
detachable-corner-seat mode MUST have Z bounds `[0, 5.3]`.

The deterministic zero-offset export stems MUST be `pillar-9-standard`,
`pillar-6-thin-shell`, and `pillar-{length}-positioning`; a non-zero shared
offset export MUST append a deterministic `-xy{offset}` value. The fixed
detachable mode export stem MUST be `pillar-5.3-detachable-corner-seat`.
Distinct typed geometry MUST NOT share export metadata. `.step` and `.stl`
extensions MUST remain supplied by the existing export contracts.

#### Scenario: Standard quality gate

- **WHEN** a valid standard pillar candidate with `offset=0` is prepared for commit
- **THEN** it MUST contain exactly one valid connected solid
- **AND** its mesh MUST be finite and non-empty
- **AND** its bounds MUST be `[-3.5, -3.5, 0]` through `[3.5, 3.5, 9]` within the workspace tolerance

#### Scenario: Thin-shell quality gate

- **WHEN** a valid thin-shell pillar candidate with `offset=0` is prepared for commit
- **THEN** it MUST contain exactly one valid connected solid
- **AND** its mesh MUST be finite and non-empty
- **AND** its bounds MUST be `[-3.5, -3.5, 0]` through `[3.5, 3.5, 6]` within the workspace tolerance

#### Scenario: Shared XY diameter increment

- **WHEN** a valid standard pillar with `offset=0.5` is prepared for commit
- **THEN** its lower flange MUST be Ø7.5 mm and its body MUST be Ø5.5 mm
- **AND** its centered bounds MUST be `[-3.75, -3.75, 0]` through `[3.75, 3.75, 9]` within the workspace tolerance
- **AND** its Z bounds and axial profile MUST be unchanged from the standard profile

#### Scenario: Positioning quality gate

- **WHEN** a valid positioning pillar with `length=25` and `offset=0.25` is prepared for commit
- **THEN** it MUST contain exactly one valid connected solid
- **AND** its mesh MUST be finite and non-empty
- **AND** its centered bounds MUST be `[-2.625, -2.625, 0]` through `[2.625, 2.625, 25]` within the workspace tolerance

#### Scenario: Detachable corner-seat quality gate

- **WHEN** a valid detachable-corner-seat candidate is prepared for commit
- **THEN** it MUST contain exactly one valid connected solid
- **AND** its mesh MUST be finite and non-empty
- **AND** its bounds MUST be `[-2.5, -2.5, 0]` through `[2.5, 2.5, 5.3]`
  within the workspace tolerance
- **AND** its volume MUST match the shared male reference volume within the
  configured B-Rep quality tolerance

#### Scenario: Mode-specific export identity

- **WHEN** a committed standard pillar with zero offset is exported
- **THEN** its export stem MUST be `pillar-9-standard`
- **WHEN** a committed thin-shell pillar with zero offset is exported
- **THEN** its export stem MUST be `pillar-6-thin-shell`
- **WHEN** a committed positioning pillar with `length=25` and `offset=0.25` is exported
- **THEN** its export stem MUST identify the shared XY diameter increment as `pillar-25-positioning-xy0.25`
- **WHEN** a committed detachable corner seat is exported
- **THEN** its export stem MUST be `pillar-5.3-detachable-corner-seat`
- **AND** every export MUST use the committed pillar B-Rep rather than a
  viewport mesh reconstruction

### Requirement: Fixed mode-specific pillar geometry

For the `standard` and `thin-shell` modes, the generator MUST create one centered cylindrical body with nominal Ø5 mm, a flat sharp-edged lower flange with nominal Ø7 mm and axial height 0.8 mm, and a sharp 90-degree shoulder between the flange and body. The upper end MUST retain the existing 0.5 mm, 45-degree equal-distance chamfer. The flange and upper chamfer MUST be included within the fixed total length: 9 mm for `standard` and 6 mm for `thin-shell`. The effective body and flange diameters MUST each equal their nominal diameter plus `offset`; the same additive offset MUST be applied to both diameters. The complete solid MUST remain centered on the local/world XY origin, and all axial heights, chamfer distances, and Z stations MUST remain unchanged.

The `detachable-corner-seat` mode MUST use the shared fixed male geometry. Its
locating section MUST span Z=0 through Z=3.8 with maximum Ø5 mm, beginning with a
0.2 mm-high lead-in chamfer from Ø4.6 mm at Z=0 to Ø5 mm at Z=0.2. Its keyed
45-degree retaining head MUST begin at Z=3.8 and retain the shared 1.8 mm key
width. The head taper MUST end at Z=5.15, followed by a 0.15 mm-high flat wear
surface ending at Z=5.3. No detachable-seat dimension MUST be user adjustable.

#### Scenario: Standard pillar geometry

- **WHEN** the generator builds `{ mode: 'standard', offset: 0 }`
- **THEN** the model MUST span `Z=0` through `Z=9`
- **AND** the lower `Z=0` to `Z=0.8` segment MUST be nominally Ø7 mm with a flat bottom
- **AND** the nominal Ø7-to-Ø5 transition at `Z=0.8` MUST be sharp
- **AND** the upper 0.5 mm chamfer MUST remain present

#### Scenario: Standard pillar XY sizing

- **WHEN** the generator builds `{ mode: 'standard', offset: 0.5 }`
- **THEN** the lower `Z=0` to `Z=0.8` segment MUST be Ø7.5 mm
- **AND** the straight body MUST be Ø5.5 mm
- **AND** the model MUST remain centered on X/Y with Z bounds `0` through `9`

#### Scenario: Thin-shell pillar geometry

- **WHEN** the generator builds `{ mode: 'thin-shell', offset: 0 }`
- **THEN** the model MUST span `Z=0` through `Z=6`
- **AND** the lower `Z=0` to `Z=0.8` segment MUST be nominally Ø7 mm with a flat bottom
- **AND** the nominal Ø7-to-Ø5 transition at `Z=0.8` MUST be sharp
- **AND** the upper 0.5 mm chamfer MUST remain present

#### Scenario: Positioning pillar geometry

- **WHEN** the generator builds `{ mode: 'positioning', length: 25, offset: 0.1 }`
- **THEN** the model MUST span `Z=0` through `Z=25`
- **AND** the body MUST be Ø5.1 mm and remain centered on X/Y
- **AND** the lower end MUST retain the original 1 mm, 45-degree chamfer
- **AND** the upper end MUST retain the original 0.5 mm, 45-degree chamfer
- **AND** both chamfers MUST be included within the requested total length

#### Scenario: Detachable corner-seat geometry

- **WHEN** the generator builds `{ mode: 'detachable-corner-seat' }`
- **THEN** the model MUST span `Z=0` through `Z=5.3`
- **AND** the bottom lead-in, Ø5 locating section, keyed retaining head, and
  0.15 mm wear surface MUST match the shared reference geometry

#### Scenario: Fixed dimensions are not user parameters

- **WHEN** a user views or edits the pillar panel
- **THEN** selecting standard or thin-shell MUST be sufficient to select the complete fixed geometry profile
- **AND** those fixed modes MUST expose only one shared XY diameter increment control in addition to the mode selector
- **AND** those fixed modes MUST NOT expose a manual length, diameter, flange-height, or chamfer control
- **AND** selecting positioning MUST expose only the custom total-length and one shared XY diameter increment control
- **AND** selecting detachable corner seat MUST expose neither length nor
  offset controls

### Requirement: OpenGrid pillar workspace integration

The runtime-validated component catalog MUST register `opengrid-pillar` as an
independent OpenGrid model definition and MUST route
`/cad/opengrid-pillar` to it. The definition MUST expose exactly one required
radio group with `standard`, `thin-shell`, `positioning`, and
`detachable-corner-seat` choices, defaulting to `standard`. The first three
modes MUST expose one shared numeric `offset` control. The positioning mode
MUST additionally expose only its custom integer `length` field. The
detachable-corner-seat mode MUST expose no numeric geometry controls. The
Worker MUST dispatch `modelId=opengrid-pillar` to the pillar builder, and the
CAD workspace MUST not fall through to another component or expose another
component's parameters.

#### Scenario: Pillar initial generation

- **GIVEN** a user opens `/cad/opengrid-pillar` in a supported browser
- **WHEN** the Worker emits `engine.ready`
- **THEN** the main thread MUST send generation 1 using a valid saved pillar snapshot or `{ mode: 'standard', offset: 0 }`
- **AND** the Worker MUST route the request to the independent pillar builder
- **AND** the committed model MUST expose pillar bounds, mesh, and model metadata centered on the world XY origin

#### Scenario: Pillar parameter controls

- **GIVEN** a user views the `/cad/opengrid-pillar` workspace
- **WHEN** the parameter panel is rendered
- **THEN** it MUST expose a radio group with clearly labeled `堆疊版`, `薄殼版`,
  `物件定位用`, and `可拆式角座` choices
- **AND** the standard choice MUST be selected by default
- **AND** standard, thin-shell, and positioning MUST expose one shared `offset`
  control with range -0.5–0.5 mm and step 0.05 mm
- **AND** selecting positioning MUST expose a custom integer total-length field from 3–500 mm
- **AND** selecting detachable corner seat MUST hide both `offset` and `length`
- **AND** fixed modes MUST NOT expose adjustable nominal length, diameter,
  flange-height, or chamfer fields

#### Scenario: Mode selection updates the existing model

- **GIVEN** a user views the `/cad/opengrid-pillar` workspace
- **WHEN** the user selects a radio choice or changes a valid field for that
  choice
- **THEN** the workspace MUST validate and generate the corresponding pillar
  mode
- **AND** the accepted typed mode and its mode-appropriate fields MUST be
  persisted under `opengrid-pillar`
- **AND** the generated model MUST remain centered on the world XY origin rather than translating in X or Y

#### Scenario: Pillar route isolation

- **GIVEN** a `model.generate` request carries `modelId=opengrid-pillar`
- **WHEN** the Worker validates and builds the request
- **THEN** it MUST accept only the pillar parameter shape for the selected mode,
  with `length` allowed only for positioning, `offset` allowed only for the
  three adjustable modes, and neither field allowed for detachable corner seat
- **AND** it MUST reject mismatched or unknown parameter shapes
- **AND** it MUST NOT resolve the request through another component's builder or template cache

#### Scenario: Invalid pillar input lifecycle

- **WHEN** a user or external caller supplies a missing, malformed, unsupported
  pillar mode or a mode-inappropriate, invalid length or offset
- **THEN** the workspace MUST show a diagnosable field error
- **AND** it MUST send `model.invalidate` rather than `model.generate` for that invalid snapshot
- **AND** export MUST remain disabled while the input is invalid or stale

### Requirement: Detachable corner-seat male bottom indicator

When `opengrid-pillar` generates the fixed
`{ mode: 'detachable-corner-seat' }` profile, the exposed Z=0 bottom face MUST
contain the shared 2 mm by 2 mm triangular indicator recessed by 0.15 mm. The
indicator MUST remain centered on the male seat's local rotational datum, MUST
not change the outer XY or Z bounds, and MUST not change any user parameters or
the deterministic export identity. Standard, thin-shell, and positioning pillar
modes MUST remain unchanged and MUST NOT receive this indicator.

#### Scenario: Detachable pillar exposes the lock indicator

- **WHEN** the detachable-corner-seat pillar is generated and viewed from its
  bottom
- **THEN** one readable triangular recess MUST be present on the Z=0 face
- **AND** the recess depth MUST be 0.15 mm within geometry tolerance
- **AND** its footprint MUST be nominally 2 mm wide by 2 mm long

#### Scenario: Detachable indicator preserves the fixed pillar contract

- **WHEN** the marked detachable pillar is prepared for mesh, quality checks,
  or export
- **THEN** it MUST remain one valid connected solid with finite non-empty mesh
  data
- **AND** its bounds MUST remain `[-2.5, -2.5, 0]` through
  `[2.5, 2.5, 5.3]` within geometry tolerance
- **AND** its keyed retaining head, 3.8 mm locating section, and hand-fit
  interface MUST remain unchanged
- **AND** its export stem MUST remain
  `pillar-5.3-detachable-corner-seat`

#### Scenario: Other pillar modes remain unmarked

- **WHEN** a standard, thin-shell, or positioning pillar is generated
- **THEN** its existing geometry, quality checks, bounds, mesh, and export
  identity MUST remain unchanged
- **AND** no detachable-seat indicator MUST be added
