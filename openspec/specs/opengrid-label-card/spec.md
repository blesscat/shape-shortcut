## Purpose

提供 OpenGrid 標籤卡元件：一張純平板卡片（0.6 mm 入槽厚），可搭配 收納方格一體卡槽或卡槽測試件做數秒抽換，也可批量平放列印備用。雙色列印呈現內建 icon 與選配文字，提供齊平（flat）與凸起（raised）兩種樣式。

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
- **THEN** the retired `opengrid-label-tag` and `opengrid-label-holder` MUST be absent from catalogs, routes and generation; other model IDs MUST remain unchanged

### Requirement: Label Card parameter contract

The label card MUST expose width in integer `gridUnits` from 1 through 10, with each unit corresponding to 10 mm of actual card width, independently of the OpenGrid mounting pitch. Its other parameter groups MUST remain style `flat` or `raised`, an icon from the shared built-in set, and optional text of at most six characters. The panel MUST offer `iconPosition` as `left` or `right`, defaulting missing legacy values to `left`. Defaults MUST be four units, raised style, the shared default icon and empty text. Validation MUST reject unknown keys, invalid units/icons/styles, overlong text and content wider than the usable face. Legacy snapshots with `widthTier` in {20,30,40,60} MUST normalize to the corresponding unit count; mixed widthTier/gridUnits input MUST be rejected.

#### Scenario: Default parameters generate on first open

- **WHEN** the card route opens without saved parameters
- **THEN** it MUST generate a four-unit, 40 mm raised card with default icon and no text

#### Scenario: Select widths in label units

- **WHEN** the user selects one, three or five units
- **THEN** the card width MUST be 10, 30 or 50 mm respectively
- **AND** the localized panel MUST display the unit count and resulting millimetres

#### Scenario: Out-of-range or unknown parameters are rejected

- **WHEN** units are fractional, non-finite, zero or above 10, or an icon/style/key is unknown, or text exceeds its supported length or width
- **THEN** validation MUST return a field-specific error and prevent generation and export

#### Scenario: Preserve legacy width settings

- **WHEN** a saved card snapshot has widthTier=30 and no gridUnits
- **THEN** it MUST hydrate as gridUnits=3 while preserving style, icon and text
- **AND** saving MUST use canonical gridUnits

### Requirement: Label Card geometry is a flat plate compatible with the holder pocket

The card MUST be a flat plate whose insertion thickness is nominally 0.6 mm in both styles and whose visible face carries the accent. The X extent MUST equal the selected unit count multiplied by 10 mm and the Y extent MUST equal the shared 10 mm card height. In `flat` style the accent MUST be seated flush with the outward face for a 0.6 mm total thickness; in `raised` style the accent MUST protrude 0.4 mm beyond the outward face for a 1.0 mm total thickness. The insertion thickness MUST be identical in both styles so one holder pocket serves both. The generated bounds MUST be reported before generation.

#### Scenario: Flat style keeps the card at pocket thickness

- **WHEN** a card is generated with style `flat`
- **THEN** the total Z extent MUST equal 0.6 mm within the documented CAD tolerance
- **AND** the accent MUST be seated in a shallow recess with its visible face coplanar with the outward face

#### Scenario: Raised style protrudes the accent

- **WHEN** a card is generated with style `raised`
- **THEN** the accent MUST protrude 0.4 mm beyond the outward face and the total Z extent MUST equal 1.0 mm within the documented CAD tolerance
- **AND** the insertion thickness (the portion at the outward face plane spanning the card edges) MUST remain 0.6 mm so the raised accent stays clear of the holder pocket

#### Scenario: Width tier changes only the plate length

- **WHEN** the same style, icon, and text are generated at unit counts `2` and `6`
- **THEN** both revisions MUST share the same plate thickness and height within the documented CAD tolerance
- **AND** the X extent of each revision MUST equal its unit count multiplied by 10 mm within the documented CAD tolerance

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
- **AND** the file name MUST be derived from `opengrid-label-card` and the generation parameters including the unit-derived width in millimetres, style and icon position

#### Scenario: 3MF keeps body and accent separately addressable

- **WHEN** the user downloads 3MF for a committed label card revision
- **THEN** the package MUST contain one parent build item with independently addressable `body` and `accent` parts
- **AND** `Metadata/model_settings.config` MUST assign body to extruder 1 and accent to extruder 2 with plate filament map `1 2`
- **AND** the package MUST be structurally valid for the existing 3MF validation path

### Requirement: Card content leaves retaining rails clear

Card accents MUST remain inside the 10 mm card height and leave at least 1 mm clear along both width edges. Both styles MUST be insertable into the same integrated organizer slot without their art touching its rails. The system MUST report text that cannot fit rather than truncate it, silently change units or shrink artwork to fit. Geometry quality validation MUST reject actual accent bounds outside the safe face.

#### Scenario: A one-unit card fits its slot

- **WHEN** an icon-only one-unit card is generated in either style
- **THEN** its artwork MUST stay inside the rail-safe face and the 0.6 mm edge insertion thickness MUST remain unobstructed

#### Scenario: Text is too wide for a narrow card

- **WHEN** six characters are requested on a one-unit card
- **THEN** a text-width diagnostic MUST prevent a new ready/exportable revision

### Requirement: Horizontal artwork with printable text height

With text present, the icon MUST sit to the selected left or right of a single horizontal text line. Text geometry MUST have a visible height of 7 mm and MUST NOT be reduced to fit a narrow card. The icon and text MUST have clear separation, remain vertically centered, and respect the retaining-rail safety margin. Insufficient width MUST produce a text-width diagnostic. Empty text MUST keep the icon centered.

#### Scenario: Switch the icon side

- **WHEN** the user selects left or right for an icon with text
- **THEN** the icon MUST move to that side without changing the text orientation or 7 mm height
- **AND** the side choice MUST persist and be included in export filenames
