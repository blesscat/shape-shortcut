## Purpose

This capability gives the Desk System OpenGrid container entries useful initial dimensions and thin profiles while keeping saved user choices, legacy routes, and the existing CAD model contracts compatible.

## Requirements

### Requirement: Desk stackable-box preset

When a user opens the Desk System entry for `opengrid-stackable-box` without a valid saved Desk snapshot, the system MUST initialize the model with `x=4`, `y=2`, `height=30`, `topRimMode='flat-top'`, and `bottomMode='thin-shell'`. The preset MUST retain the model's validated defaults for all other parameters, including opening controls and bottom-hole controls. The model id, route, footprint contract, clear-height semantics, and export contract MUST remain unchanged.

#### Scenario: Desk box starts with the requested thin-shell dimensions

- **WHEN** a user opens `/cad/opengrid-stackable-box?system=desk` with no valid saved Desk snapshot
- **THEN** the first valid generation MUST use `x=4`, `y=2`, and `height=30`
- **AND** the `盒底` control MUST select `薄殼` and the `上緣` control MUST select `平頂`
- **AND** the panel MUST NOT show a selectable base-plate or legacy thin-shell mode choice
- **AND** the committed model MUST retain `modelId=opengrid-stackable-box`


### Requirement: Desk stackable-cylinder preset

When a user opens the Desk System entry for `opengrid-stackable-cylinder`
without a valid saved Desk snapshot, the system MUST initialize the model
with `innerDiameter=57`, `height=30`, and `bottomPlateMode=false`. The preset
MUST retain the model's validated defaults for all other parameters,
including bottom-hole and opening controls. The model id, route, circular
geometry contract, and export contract MUST remain unchanged.

#### Scenario: Desk cylinder starts with the requested thin-shell dimensions

- **WHEN** a user opens `/cad/opengrid-stackable-cylinder?system=desk` with
  no valid saved Desk snapshot
- **THEN** the first valid generation MUST use `innerDiameter=57` and
  `height=30`
- **AND** the generated geometry MUST use the thin profile
- **AND** the panel MUST NOT show a selectable bottom-profile radio choice
- **AND** the normalized `bottomPlateMode` MUST remain `false`
- **AND** the committed model MUST retain `modelId=opengrid-stackable-cylinder`

### Requirement: Desk preset precedence and legacy isolation

The Desk container presets MUST be used only when the active supported
context is `desk` and no valid saved `(desk, modelId)` snapshot exists. A
valid saved Desk snapshot MUST continue to take precedence over the preset. A
context-free route, or a route whose context is unsupported for the selected
container, MUST continue to use the model definition defaults and its legacy
model-id-scoped persistence behavior; it MUST NOT silently use the Desk
preset.

#### Scenario: Saved Desk box parameters take precedence

- **GIVEN** browser persistence contains a valid saved Desk snapshot for
  `opengrid-stackable-box`
- **WHEN** a user opens `/cad/opengrid-stackable-box?system=desk`
- **THEN** the controls and first generation MUST use the saved Desk snapshot
- **AND** the new `4 × 2 × 30 mm` preset MUST not overwrite it

#### Scenario: Context-free routes retain model defaults

- **WHEN** a user opens `/cad/opengrid-stackable-box` or
  `/cad/opengrid-stackable-cylinder` without a supported Desk context and
  without a valid legacy snapshot
- **THEN** the workspace MUST use the existing model definition defaults
- **AND** it MUST not use the Desk dimensions as an implicit global default

### Requirement: Desk container preview assets represent the effective preset

The visible Desk entries for `opengrid-stackable-box` and
`opengrid-stackable-cylinder` MUST reference non-empty static preview assets
whose models are generated from their corresponding Desk presets with cleared
or isolated browser persistence. The assets MUST retain deterministic
identities `opengrid-stackable-box-desk.png` and
`opengrid-stackable-cylinder-desk.png`, and preview generation MUST NOT
change the model id, Worker protocol, or export contract.

#### Scenario: Desk container previews show the configured entries

- **WHEN** the preview capture and verification workflow processes the Desk
  container entries
- **THEN** it MUST visit the corresponding `?system=desk` routes without
  using an unrelated saved snapshot
- **AND** it MUST verify `opengrid-stackable-box-desk.png` and
  `opengrid-stackable-cylinder-desk.png`
- **AND** each asset MUST represent the requested Desk dimensions and thin
  profile
