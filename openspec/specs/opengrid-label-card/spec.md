## Purpose

提供 OpenGrid 標籤卡元件：一張純平板卡片（0.6 mm 入槽厚），可搭配 `opengrid-label-holder` 卡槽座做數秒抽換，也可批量平放列印備用。雙色列印呈現內建 icon 與選配文字，提供齊平（flat）與凸起（raised）兩種樣式。

## Requirements

### Requirement: OpenGrid Label Card model contract

The system MUST register a new independent model with `modelId=opengrid-label-card`, `buildKey=opengrid-label-card`, route slug `opengrid-label-card`, and user-facing display name beginning with `OpenGrid `. The model MUST be offered in both the Desk and Wall system contexts. The card MUST be built from two separate printable parts, a body part and an accent part, and MUST NOT be fused into one solid at the part level. The model MUST NOT expose grip or holder-related parameters.

#### Scenario: Catalogs expose the label card in both contexts

- **WHEN** the user opens the Desk or the Wall component catalog
- **THEN** both catalogs MUST list `OpenGrid Label Card`
- **AND** the model MUST use `opengrid-label-card` consistently for its modelId, buildKey, route slug, and component directories
- **AND** the route `/[locale]/cad/opengrid-label-card` MUST resolve to exactly this catalog definition

#### Scenario: Existing component IDs are preserved

- **WHEN** the catalog is loaded after this change
- **THEN** `opengrid-label-tag` and every other pre-existing model id MUST remain registered and unchanged

### Requirement: Label Card parameter contract

The label card MUST expose exactly four parameter groups: a width tier selected from the shared discrete set `20`, `30`, `40`, `60` millimetres; a card style `flat` or `raised`; an icon identifier from the shared built-in icon set; and optional text of at most 6 characters. The default parameters MUST be width tier `40`, style `raised`, the shared set's default icon, and empty text. Validation MUST reject unknown icon identifiers, styles outside the set, text exceeding the maximum, and any unknown parameter key.

#### Scenario: Default parameters generate on first open

- **WHEN** the user opens `/cad/opengrid-label-card` without a saved parameter snapshot
- **THEN** generation MUST use width tier `40`, style `raised`, the shared default icon, and no text

#### Scenario: Out-of-range or unknown parameters are rejected

- **WHEN** a snapshot carries a width tier outside `{20,30,40,60}`, a style outside `{flat,raised}`, an icon id outside the shared set, or text longer than 6 characters
- **THEN** validation MUST fail with a per-field error and no `model.generate` or export request MAY be sent for that snapshot

### Requirement: Label Card geometry is a flat plate compatible with the holder pocket

The card MUST be a flat plate whose insertion thickness is nominally 0.6 mm in both styles and whose visible face carries the accent. The X extent MUST equal the selected width tier and the Y extent MUST equal the shared 10 mm card height. In `flat` style the accent MUST be seated flush with the outward face for a 0.6 mm total thickness; in `raised` style the accent MUST protrude 0.4 mm beyond the outward face for a 1.0 mm total thickness. The insertion thickness MUST be identical in both styles so one holder pocket serves both. The generated bounds MUST be reported before generation.

#### Scenario: Flat style keeps the card at pocket thickness

- **WHEN** a card is generated with style `flat`
- **THEN** the total Z extent MUST equal 0.6 mm within the documented CAD tolerance
- **AND** the accent MUST be seated in a shallow recess with its visible face coplanar with the outward face

#### Scenario: Raised style protrudes the accent

- **WHEN** a card is generated with style `raised`
- **THEN** the accent MUST protrude 0.4 mm beyond the outward face and the total Z extent MUST equal 1.0 mm within the documented CAD tolerance
- **AND** the insertion thickness (the portion at the outward face plane spanning the card edges) MUST remain 0.6 mm so the raised accent stays clear of the holder pocket

#### Scenario: Width tier changes only the plate length

- **WHEN** the same style, icon, and text are generated at width tiers `20` and `60`
- **THEN** both revisions MUST share the same plate thickness and height within the documented CAD tolerance
- **AND** the X extent of each revision MUST equal its width tier within the documented CAD tolerance

### Requirement: Built-in icon set and optional text share the accent part

The card MUST reuse the shared built-in icon set and the deterministic Traditional Chinese font pipeline. The parameter panel MUST present the set as a gallery picker with localized names. The optional text MUST be fused into the same accent part as the icon; the model MUST always keep exactly two parts, `body` and `accent`, whether or not text is present. Empty text MUST produce an icon-only card and MUST NOT fail generation.

#### Scenario: Icon-only generation

- **WHEN** a valid revision is generated with empty text
- **THEN** the committed parts MUST be exactly `body` and `accent`
- **AND** the accent solid MUST contain only the icon geometry

#### Scenario: Text joins the accent part

- **WHEN** a valid revision is generated with text and an icon
- **THEN** the accent part MUST contain both the icon solid and the text glyph solids

### Requirement: Label Card live preview renders both part colors

When a label card revision is committed with valid body and accent parts, the CAD workspace preview MUST render the body and the accent as separate meshes with deterministic distinct base and accent colors. A candidate without a valid body/accent pair MUST NOT commit as a two-color-ready revision, and the two-color export action MUST remain unavailable for it.

#### Scenario: Committed preview shows two colors

- **WHEN** the label card preview is ready
- **THEN** the viewport MUST show the body in the base color and the accent in the accent color
- **AND** the preview geometry MUST match the revision available to export

### Requirement: Label Card export formats

STEP and STL export MUST emit the combined geometry of the committed revision. 3MF export MUST emit a two-color package with the body part assigned to material slot 1 and the accent part assigned to material slot 2, under the label card's own file name and package metadata. All three formats MUST follow the existing CAD lifecycle gates: available only for the latest committed, ready, non-stale revision.

#### Scenario: STEP and STL export one merged solid

- **WHEN** the user downloads STEP or STL for a committed label card revision
- **THEN** the download MUST contain the full card geometry with both parts geometrically present
- **AND** the file name MUST be derived from `opengrid-label-card` and the generation parameters including the width tier and style

#### Scenario: 3MF keeps body and accent separately addressable

- **WHEN** the user downloads 3MF for a committed label card revision
- **THEN** the package MUST contain one parent build item with independently addressable `body` and `accent` parts
- **AND** `Metadata/model_settings.config` MUST assign body to extruder 1 and accent to extruder 2 with plate filament map `1 2`
- **AND** the package MUST be structurally valid for the existing 3MF validation path
