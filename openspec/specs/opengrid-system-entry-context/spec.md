## Purpose

This capability gives OpenGrid model entries a stable Desk or Wall context so that entry links, initial presets, saved parameters, and generated preview assets remain aligned without creating duplicate CAD models.

## Requirements

### Requirement: Snap system radio uses separate persistence scopes

The `/cad/opengrid-snap` panel MUST expose a top-level radio group with exactly
`desk` and `wall` choices. The selected choice MUST select the corresponding
system-scoped Snap parameter snapshot and default values without adding a
system field to the normalized CAD parameter contract or changing the
`opengrid-snap` model ID, route, Worker request model ID, or export contract.
The Desk and Wall scopes MUST persist independently; changing the radio MUST
not overwrite the inactive scope. A supported `?system=desk` or `?system=wall`
route MUST initialize the radio to that choice. A context-free Snap route MUST
retain its existing model-default behavior until the user explicitly chooses a
system scope. Switching scopes MUST use the existing invalid-input and
generation lifecycle, with no additional system-mismatch blocking rule.

#### Scenario: Desk and Wall Snap values persist independently

- **GIVEN** the user has different valid Snap values in the Desk and Wall radio
  scopes
- **WHEN** the user switches between the two radio choices
- **THEN** each choice MUST restore its own saved values
- **AND** changing one scope MUST NOT overwrite the other scope

#### Scenario: Route context initializes the matching radio

- **WHEN** the user opens `/cad/opengrid-snap?system=desk` or
  `/cad/opengrid-snap?system=wall`
- **THEN** the top radio MUST select the corresponding system before the first
  generation
- **AND** the existing scoped preset and persistence precedence MUST remain
  applicable

#### Scenario: Radio switching preserves the existing model lifecycle

- **WHEN** the user changes the Snap system radio to another valid scope
- **THEN** the workspace MUST validate and generate the selected scope's
  parameters through the existing debounce and latest-wins lifecycle
- **AND** the Worker request MUST continue to use `modelId=opengrid-snap`
- **AND** no separate system-mismatch rejection MUST be added

### Requirement: Snap system radio controls system-specific options

In the Desk radio scope, the Snap panel MUST expose the footprint, four-corner
locating-hole, and center-remover controls. In the Wall radio scope, the
footprint MUST be fixed to `full` and the locating-hole and center-remover
controls MUST not be user-selectable. The OpenConnect option MUST be exposed
in the Wall scope and MUST not be exposed as a user-selectable option in the
Desk scope. Variant, profile, XY offset, and existing magnet controls MUST
remain available according to their existing Snap contracts unless a separate
footprint rule disables them. The Wall scope MUST default `offset=0` and
`openConnect=false`; the Desk scope MUST default `openConnect=false`.

#### Scenario: Desk scope exposes desktop-only Snap controls

- **WHEN** the Desk radio is selected
- **THEN** the panel MUST show the footprint, locating-hole, and center-remover
  controls
- **AND** the OpenConnect option MUST not be user-selectable
- **AND** the saved Desk values MUST remain available to the generation request

#### Scenario: Wall scope fixes the footprint and exposes OpenConnect

- **WHEN** the Wall radio is selected
- **THEN** the panel MUST retain `footprint=full`
- **AND** the locating-hole and center-remover controls MUST be hidden or
  otherwise unavailable for editing
- **AND** the OpenConnect option MUST be visible
- **AND** the XY offset control MUST remain adjustable with a default value of
  `0`

#### Scenario: Wall scope normalizes hidden fixed-footprint options

- **GIVEN** a persisted Wall Snap snapshot contains a valid partial footprint
  or enables a locating/remover flag
- **WHEN** the Wall radio scope is loaded
- **THEN** the active snapshot MUST use `footprint=full`
- **AND** `fourCornerLocatingHoles` and `centerRemoverHole` MUST be `false`
- **AND** the scope switch MUST remain a valid state transition rather than a
  system-mismatch validation error

#### Scenario: Wall OpenConnect offset keeps the head at source size

- **WHEN** the Wall scope enables OpenConnect and changes the XY offset
- **THEN** the Snap assembly MUST use the requested adjusted XY envelope
- **AND** the OpenConnect head MUST remain at its source dimensions
- **AND** the final interface placement MUST use the adjusted Snap before the
  head is composed

#### Scenario: Existing magnet controls remain scope-independent

- **WHEN** the user switches between Desk and Wall radio scopes
- **THEN** the existing magnet controls MUST remain available according to the
  current magnet contract
- **AND** the selected scope MUST persist its own magnet values independently

### Requirement: Stable OpenGrid system contexts and effective presets

The system MUST recognize exactly two OpenGrid system contexts, `desk` and
`wall`, from the model-entry link query. The context MUST NOT change the
existing model id, build key, route slug, Worker request model id, or export
contract. For `opengrid`, the Wall preset MUST be a validated clone of the
model definition defaults with `variant=Full`, `rows=4`, and `columns=4`.
The Wall preset MUST retain the model definition defaults for all other
OpenGrid parameters, including `chamfers=corners`, `screwMode=corners`,
connector controls, screw dimensions, modifiers, and an empty custom position
list. The Desk preset MUST override `rows=4`, `columns=4`, `chamfers=none`,
and `screwMode=none` on that clone. The Desk preset MUST retain the model
definition defaults for all other OpenGrid parameters, including connector
controls, screw dimensions, modifiers, and an empty custom position list. For
`opengrid-snap`, the Desk preset MUST be
`variant=Lite`, `profile=Standard`, `footprint=full`, `offset=0.25` for the X/Y
increment, `fourCornerLocatingHoles=true`, and `centerRemoverHole=true`; the
Wall preset MUST be `variant=Full`, `profile=Standard`, `footprint=full`,
`offset=0`, `fourCornerLocatingHoles=false`, and
`centerRemoverHole=false`. Both Snap presets MUST also contain
`magnetHoleShape=none` and zero values for `magnetHoleLength`,
`magnetHoleWidth`, `magnetHoleDiameter`, and `magnetHoleThickness`. The
magnet controls MUST remain available in both contexts; context selection MUST
NOT hide or enable them independently. For `opengrid-pillar`, the Desk preset
MUST be exactly `{ mode: 'detachable-corner-seat' }`. For
`opengrid-stackable-box`, the Desk
preset MUST be `x=4`, `y=2`, `height=30`, `topRimMode='flat-top'`, and
`bottomMode='thin-shell'`. For `opengrid-stackable-cylinder`, the Desk preset MUST
be `innerDiameter=57`, `height=30`, and `bottomPlateMode=false`. Any other
visible OpenGrid entry MUST use its validated model definition defaults in
the Desk context and MUST NOT appear in the Wall context.

#### Scenario: Desk Snap entry resolves its preset

- **WHEN** a user opens `/cad/opengrid-snap?system=desk` without a valid
  Desk/Snap saved snapshot
- **THEN** the workspace MUST initialize `opengrid-snap` with the Desk preset
- **AND** the preset MUST have the disabled magnet values
- **AND** the Worker request MUST continue to use `modelId=opengrid-snap`

#### Scenario: Wall Snap entry resolves its preset

- **WHEN** a user opens `/cad/opengrid-snap?system=wall` without a valid
  Wall/Snap saved snapshot
- **THEN** the workspace MUST initialize `opengrid-snap` with the Wall preset
- **AND** the preset MUST have the disabled magnet values
- **AND** the Worker request MUST continue to use `modelId=opengrid-snap`

#### Scenario: Desk pillar entry resolves the thin-shell preset

- **WHEN** a user opens `/cad/opengrid-pillar?system=desk` without a valid
  Desk/Pillar saved snapshot
- **THEN** the workspace MUST initialize `opengrid-pillar` with
  `{ mode: 'detachable-corner-seat' }`
- **AND** the Worker request MUST continue to use `modelId=opengrid-pillar`

#### Scenario: Desk board entry resolves the no-feature preset

- **WHEN** a user opens `/cad/opengrid?system=desk` without a valid Desk/OpenGrid saved snapshot
- **THEN** the workspace MUST initialize `opengrid` with `rows=4`, `columns=4`, `chamfers=none`, and `screwMode=none`
- **AND** the remaining OpenGrid parameters MUST retain the validated model definition defaults
- **AND** the Worker request MUST continue to use `modelId=opengrid`

#### Scenario: Wall and context-free board routes retain official defaults

- **WHEN** a user opens `/cad/opengrid?system=wall` or `/cad/opengrid` without a valid saved snapshot
- **THEN** the Wall route MUST initialize `opengrid` with `variant=Full`, `rows=4`, and `columns=4`
- **AND** the Wall route MUST retain `chamfers=corners` and `screwMode=corners`
- **AND** the context-free route MUST retain `variant=Lite`, `rows=2`, `columns=2`, `chamfers=corners`, and `screwMode=corners`
- **AND** the context-free route MUST use legacy model-id-scoped persistence and model definition defaults
- **AND** both routes MUST retain the validated model definition defaults for all unspecified OpenGrid parameters

#### Scenario: Saved Desk board parameters take precedence

- **GIVEN** browser persistence contains a valid saved Desk/OpenGrid snapshot
- **WHEN** a user opens `/cad/opengrid?system=desk`
- **THEN** the workspace MUST use the saved Desk snapshot instead of replacing it with the no-feature Desk preset

#### Scenario: Saved Wall board parameters take precedence

- **GIVEN** browser persistence contains a valid saved Wall/OpenGrid snapshot
- **WHEN** a user opens `/cad/opengrid?system=wall`
- **THEN** the workspace MUST use the saved Wall snapshot instead of replacing it with the Full 4 × 4 Wall preset

#### Scenario: Unknown context falls back to legacy route behavior

- **WHEN** a direct CAD route has no `system` query or has an unsupported `system` value
- **THEN** the route MUST use legacy model-id-scoped persistence and model definition defaults
- **AND** it MUST NOT silently select the Desk or Wall preset


### Requirement: Context-aware OpenGrid board restore behavior

The OpenGrid board panel MUST use the active context's effective preset as the baseline for individual changed indicators and field-level restore controls. A context-free panel MUST use the validated model definition defaults. The whole-panel restore action MUST continue to restore the same effective preset.

#### Scenario: Desk board field restore returns to Desk defaults

- **GIVEN** a user is on `/cad/opengrid?system=desk` and changes the chamfer or screw-hole mode
- **WHEN** the user activates the corresponding field-level restore control
- **THEN** that field MUST return to `chamfers=none` or `screwMode=none`
- **AND** the field MUST no longer be marked as changed from the Desk effective preset

#### Scenario: Desk board whole restore returns to Desk defaults

- **GIVEN** a user is on `/cad/opengrid?system=desk` with modified board parameters
- **WHEN** the user activates `全部恢復預設`
- **THEN** the board MUST return to the Desk effective preset, including `rows=4`, `columns=4`, `chamfers=none`, and `screwMode=none`

#### Scenario: Context-free board field restore returns to official defaults

- **GIVEN** a user is on `/cad/opengrid` and changes the chamfer or screw-hole mode
- **WHEN** the user activates the corresponding field-level restore control
- **THEN** that field MUST return to the official defaults `chamfers=corners` or `screwMode=corners`

### Requirement: Context-specific model-selection entries

The `/models` chooser MUST render the OpenGrid entries under `Desk System` and `Wall Related` subgroups before the HSW series. `opengrid` and `opengrid-snap` MUST appear in both subgroups with links carrying the corresponding context; every other visible OpenGrid model MUST appear only in Desk; HSW MUST remain a single context-free entry. The duplicated entries MUST retain the same stable model id and model-specific CAD route.

#### Scenario: OpenGrid entries carry context links

- **WHEN** a user opens `/models`
- **THEN** the Desk bottom-plate and Snap links MUST be `/cad/opengrid?system=desk` and `/cad/opengrid-snap?system=desk`
- **AND** the Wall bottom-plate and Snap links MUST be `/cad/opengrid?system=wall` and `/cad/opengrid-snap?system=wall`
- **AND** the Wall subgroup MUST NOT contain the other OpenGrid components

### Requirement: Context-specific preview identity

Every visible catalog entry MUST expose one static preview image metadata record. A context-specific entry MUST use a deterministic asset identity containing its model id and context, while a context-free entry MUST retain the `<modelId>.png` identity. A preview asset MUST be generated from the entry's effective system preset and a stable thumbnail camera; the asset MUST remain presentation-only and MUST NOT alter Worker or export contracts.

#### Scenario: Desk and Wall Snap previews are distinct assets

- **WHEN** the preview capture workflow processes the Desk and Wall Snap entries
- **THEN** it MUST visit the corresponding context routes
- **AND** it MUST write and verify separate assets for `opengrid-snap-desk.png` and `opengrid-snap-wall.png`
- **AND** each asset MUST be generated from that context's preset rather than the other context's preset or a persisted browser value

### Requirement: System context controls initial CAD generation

The CAD workspace MUST resolve the supported `desk` or `wall` context before its first generation. It MUST initialize from the valid scoped snapshot, system preset, or model definition default according to the persistence precedence, while keeping the existing model id, generation lifecycle, viewport behavior, and export gates unchanged.

#### Scenario: Context route initializes the matching Snap geometry

- **WHEN** a user opens `/cad/opengrid-snap?system=desk` or `/cad/opengrid-snap?system=wall` without scoped saved values
- **THEN** generation 1 MUST use the corresponding context preset
- **AND** the Desk preset MUST use an X/Y increment of `0.25`
- **AND** the committed model MUST retain `modelId=opengrid-snap`
- **AND** the model MUST remain previewable and exportable through the existing Worker lifecycle

### Requirement: System-aware restore defaults

When a supported system context is active, the CAD workspace's restore-defaults action MUST apply the active system preset and persist the validated result in that system scope. The context-free route MUST continue to restore the model definition defaults.

#### Scenario: Wall reset restores Wall Snap defaults

- **WHEN** a user changes Wall Snap parameters and activates `全部恢復預設`
- **THEN** the controls MUST return to Full/Standard/full/0 with both optional hole flags disabled
- **AND** the next valid generation MUST use those values

### Requirement: Active system label on the CAD edit page

The CAD edit page MUST show the validated active system name above the model title when a supported OpenGrid system context is present. Desk MUST show `目前系統：Desk System`, and Wall MUST show `目前系統：Wall Related`. A context-free or unsupported route MUST omit the system label.

#### Scenario: Desk edit page identifies the active system

- **WHEN** a user opens `/cad/opengrid-snap?system=desk`
- **THEN** the page MUST show `目前系統：Desk System` above the model title

#### Scenario: Wall edit page identifies the active system

- **WHEN** a user opens `/cad/opengrid-snap?system=wall`
- **THEN** the page MUST show `目前系統：Wall Related` above the model title
