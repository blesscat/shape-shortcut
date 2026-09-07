## Purpose

Defines the preview-only OpenGrid catalog component, its fixed component-local STEP asset, zero-parameter workspace behavior, and compatibility with existing models.

## Requirements

### Requirement: OpenGrid preview-only catalog component

The system MUST expose the supplied STEP as a catalog component with the stable modelId and route slug `opengrid-snap-remover`. The component MUST appear alongside the existing `box` and `modular-grid-base` entries and MUST be reachable at `/cad/opengrid-snap-remover` through the existing model-specific route architecture.

#### Scenario: 首頁保留全部 component

- **WHEN** a user opens the homepage model catalog
- **THEN** the catalog MUST contain `box`, `modular-grid-base`, and `opengrid-snap-remover`
- **AND** the existing `使用方塊` and `使用模組化網格底板` entries MUST remain visible and link to their existing routes
- **AND** the OpenGrid entry MUST use a display name beginning with `OpenGrid `

#### Scenario: OpenGrid component enters preview

- **WHEN** a user activates the `opengrid-snap-remover` catalog entry
- **THEN** the browser MUST navigate to `/cad/opengrid-snap-remover`
- **AND** the existing CAD fallback and Worker preview flow MUST initialize for that route
- **AND** the preview MUST display a non-empty mesh from the supplied STEP geometry

### Requirement: OpenGrid naming convention

Every new component belonging to OpenGrid MUST use the lowercase `opengrid-<component-slug>` prefix for its stable modelId, buildKey, route slug, catalog component directory, and CAD-kernel component directory. Its user-facing display name MUST begin with `OpenGrid `. Components outside OpenGrid MUST NOT receive this prefix. Existing component IDs MUST remain unchanged unless a separate migration is explicitly specified.

#### Scenario: New OpenGrid component identity

- **WHEN** a future OpenGrid component is added to the catalog
- **THEN** its modelId, buildKey, route slug, catalog directory, and kernel directory MUST share the `opengrid-` prefix
- **AND** its display name MUST begin with `OpenGrid `

#### Scenario: Existing component compatibility

- **WHEN** this change is applied
- **THEN** `box` MUST remain `box`
- **AND** `modular-grid-base` MUST remain `modular-grid-base`
- **AND** their existing routes and exports MUST remain available

### Requirement: Exact component-local STEP asset

The system MUST package the supplied `snap remover.step` under the `opengrid-snap-remover` component-local CAD-kernel directory. The runtime asset MUST be non-empty and byte-for-byte identical to the supplied source file; its SHA-256 MUST be `8f34c88dfea6b2c3352301d68dadc0b43665c0f8424f7da2b61c8dcda38ac41b`. Runtime code MUST NOT read from or depend on `/Users/blesscat/Downloads/`.

#### Scenario: Component asset identity

- **WHEN** the component asset is loaded by the Worker or checked by the asset test
- **THEN** it MUST be non-empty, retain the `.step` extension, and match the recorded SHA-256
- **AND** loading MUST use the repository-owned component asset

### Requirement: Zero-parameter OpenGrid workspace

The `opengrid-snap-remover` definition MUST use an empty parameter object `{}` and an empty parameter schema. Its workspace sidebar MUST NOT render text fields, sliders, or parameter error controls for this component. The sidebar MUST still expose the component name, state/progress, and retry behavior when applicable. The sidebar MUST present the existing STEP download action only in local dev builds; a production build MUST NOT render the STEP download action.

#### Scenario: No parameter controls

- **WHEN** a user opens `/cad/opengrid-snap-remover`
- **THEN** the sidebar MUST show the OpenGrid component name
- **AND** it MUST NOT show a parameter field, slider, parameter legend, or parameter validation message
- **AND** the status area MUST remain available
- **AND** in a local dev build the `下載 STEP` action MUST remain available

#### Scenario: Fixed component export

- **WHEN** the imported OpenGrid model reaches ready state and the user activates `下載 STEP` in a local dev build
- **THEN** the Worker MUST export the committed OpenGrid revision
- **AND** the browser MUST download a non-empty `.step` file named `snap remover.step`
- **AND** the export MUST not require a parameter change

#### Scenario: Production build hides the STEP download action

- **WHEN** a production build renders `/cad/opengrid-snap-remover` and the model reaches ready state
- **THEN** the `下載 STEP` action MUST NOT be rendered
- **AND** the component name, status/progress, and retry behavior MUST remain available

### Requirement: Existing catalog and export preservation

The new preview-only component MUST be additive. It MUST NOT replace, hide, or remove the existing `box` and `modular-grid-base` catalog entries, routes, parameter controls, preview behavior, or dynamic STEP export behavior. Consistent with the workspace-wide STEP presentation rule, the STEP download action on every generator page MUST be presented only in local dev builds; a production build MUST NOT render it, while the catalog entries, routes, parameter controls, and preview behavior MUST remain unchanged.

#### Scenario: Existing box remains usable

- **WHEN** a user opens `/cad/box`
- **THEN** the box width, depth, and height controls MUST remain visible
- **AND** the box preview MUST remain available
- **AND** in a local dev build the box STEP export MUST remain available

#### Scenario: Existing modular grid remains usable

- **WHEN** a user opens `/cad/modular-grid-base`
- **THEN** the rows and columns controls MUST remain visible
- **AND** the modular grid preview MUST remain available
- **AND** in a local dev build the modular grid STEP export MUST remain available
