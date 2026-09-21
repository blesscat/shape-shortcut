## Purpose

提供一個只隸屬於 Wall、可貼合既有表面的獨立 cover 元件，讓本體與平面文字能以不同材料列印，並使用指定的 Snap cover STEP 幾何。

## Requirements

### Requirement: OpenGrid Wall Cover model contract

The system MUST register a new independent model with `modelId=opengrid-wall-cover`, `buildKey=opengrid-wall-cover`, route slug `opengrid-wall-cover`, and user-facing display name beginning with `OpenGrid `. The model MUST belong to the Wall system only and MUST NOT be offered as a Desktop model. Its prototype configuration MUST use the supplied Snap cover STEP geometry within the Snap Lite Standard full-footprint envelope at offset zero, while keeping the cover body and its flat text as separate printable parts. The model MUST expose one text parameter with the default value `A`; it MUST NOT expose unrelated Snap parameters, a font picker, or any additional arbitrary model parameters.

#### Scenario: Wall catalog exposes the cover

- **WHEN** the user opens the Wall component catalog
- **THEN** the catalog MUST list `OpenGrid Wall Cover`
- **AND** the model MUST use `opengrid-wall-cover` consistently for its modelId, buildKey, route slug, and component directories
- **AND** the Desktop catalog MUST NOT list the cover

#### Scenario: Prototype uses the supplied cover STEP

- **WHEN** a new Wall Cover revision is generated
- **THEN** generation MUST load `src/cad-kernel/components/opengrid-wall-cover/assets/opengrid-snap-cover.step`
- **AND** the loaded asset MUST contain the expected nine-solid cover assembly within the nominal Snap Lite full-footprint envelope
- **AND** the result MUST contain a cover body part and a separate flat text part

#### Scenario: Wall Cover starts with the default label

- **WHEN** the user opens the Wall Cover route without a valid saved parameter snapshot
- **THEN** the text control MUST contain `A`
- **AND** the first valid revision MUST use `A` as its only label

### Requirement: Wall Cover is a surface-level two-part assembly

The Wall Cover MUST represent the text as a separate printable solid seated in a shallow surface recess of the cover body. The text top surface MUST be coplanar with the cover top within the documented CAD tolerance; it MUST NOT be raised above the surface, embossed, or represented only by a viewport material. The two parts MUST remain independently addressable for material or extruder assignment.

#### Scenario: Text is coplanar rather than embossed

- **WHEN** a valid prototype Wall Cover is quality-checked
- **THEN** the body and text maximum Z values MUST match within the documented CAD tolerance
- **AND** the text MUST occupy the surface recess without extending above the cover
- **AND** the cover MUST preserve the nominal Snap Lite outer bounds within the documented CAD tolerance

#### Scenario: Body and text remain independently selectable

- **WHEN** a Wall Cover revision is committed
- **THEN** the committed revision MUST retain separate body and text parts
- **AND** a downstream preview or export MUST be able to assign different colors or extruders to those parts
- **AND** no operation MAY require flattening them into one display-only mesh

### Requirement: Wall Cover live preview renders both part colors

When a Wall Cover revision is committed and its body/text parts are available, the CAD workspace preview MUST render the body and text as separate meshes using the shared primary color for the body and secondary color for text. The default colors MUST be distinct; users MAY select equal colors without merging the separate parts. The preview MUST use the same part boundaries and relative placement as the printable revision, and the text MUST remain visually flush with the cover surface.

#### Scenario: Committed cover preview shows two colors

- **WHEN** the Wall Cover preview is ready
- **THEN** the viewport MUST show the cover body in the base color and the flat text in the accent color
- **AND** the text color MUST not depend only on a color painted onto a combined mesh
- **AND** the preview geometry MUST match the revision that can be sent to export

#### Scenario: Preview falls back safely when a part is unavailable

- **WHEN** a Wall Cover candidate does not contain a valid body/text part pair
- **THEN** the candidate MUST NOT be committed as a two-color-ready revision
- **AND** the preview MUST report the generation as stale or failed according to the existing CAD lifecycle
- **AND** a two-color export action MUST remain unavailable

### Requirement: Wall Cover uses a component-local STEP asset

The Wall Cover MUST keep its stable modelId, route, parameter contract, preview
part contract, and export contract while loading its component-local STEP asset.
The asset MUST remain scoped to the Wall Cover component and MUST preserve the
surface-level, separate-body/text semantics.

#### Scenario: Supplied STEP is used without changing the public model

- **WHEN** the Wall Cover is generated
- **THEN** the production geometry source MUST be the component-local supplied STEP
- **AND** existing Wall Cover snapshots and routes MUST continue to identify the same `opengrid-wall-cover` model
- **AND** the viewport and export consumers MUST continue receiving the same logical body/text part roles

### Requirement: Wall Cover generates one flat cover per supported character

For a valid Wall Cover text value containing one through eight supported
characters, the system MUST generate one nominal cover for each character in
input order. Leading, trailing, and internal Unicode whitespace MUST be
ignored before counting characters; an input that contains no characters after
normalization MUST be invalid. The generated covers MUST be laid out from
left to right with a clear printable gap, while each cover retains its own
body and text geometry.

#### Scenario: Latin input creates multiple covers

- **WHEN** the user enters `IAN`
- **THEN** the next committed revision MUST contain three cover instances in the order `I`, `A`, `N`
- **AND** each cover instance MUST contain exactly one corresponding text glyph
- **AND** the instances MUST be separated so their printable bodies do not overlap

#### Scenario: Traditional Chinese input creates multiple covers

- **WHEN** the user enters `收納`
- **THEN** the next committed revision MUST contain two cover instances in the order `收`, `納`
- **AND** each instance MUST contain one corresponding Traditional Chinese glyph

#### Scenario: Maximum text length is eight characters

- **WHEN** the user enters a normalized value containing exactly eight supported characters
- **THEN** the input MUST pass the Wall Cover parameter validation
- **AND** generation MUST create eight ordered cover instances

#### Scenario: Text longer than eight characters is rejected

- **WHEN** a nine-or-more-character value reaches the Wall Cover parameter
  contract from a persisted snapshot, API caller, or non-UI command
- **THEN** the input MUST be invalid
- **AND** the workspace MUST not send a generation request for that snapshot
- **AND** the previous committed revision MAY remain visible but MUST be marked stale
- **AND** two-color export MUST remain unavailable for the invalid snapshot

#### Scenario: Wall Cover input is capped at eight characters

- **WHEN** the user types or pastes more than eight characters into the Wall
  Cover text control
- **THEN** the control MUST expose an eight-character maximum
- **AND** the control MUST retain no more than the first eight entered
  characters before passing the value to workspace validation
- **AND** the character count MUST never exceed `8 / 8`

#### Scenario: Empty or unsupported text is rejected

- **WHEN** the user enters only whitespace or a character without a glyph in the bundled font
- **THEN** the input MUST be invalid with a diagnosable field error
- **AND** the workspace MUST not commit a new revision or enable two-color export for that snapshot

### Requirement: Wall Cover uses a deterministic Traditional Chinese font

The generated label glyphs MUST use the bundled `Noto Sans CJK TC Bold`
default font for Latin, numeric, punctuation, and Traditional Chinese input.
The font geometry MUST be part of the printable text part, not a viewport-only
label, and the same glyph outlines and placements MUST be used by preview and
export. Glyphs MUST be centered and scaled to the usable label area without
extending outside their cover.

#### Scenario: Default font renders Latin and Traditional Chinese labels

- **WHEN** a valid Wall Cover revision contains `IAN` or `收納`
- **THEN** the preview MUST display the corresponding glyphs using the default bundled font
- **AND** the printable text part MUST contain non-empty geometry for every displayed glyph
- **AND** preview and export MUST use matching glyph placement

#### Scenario: Font asset is unavailable

- **WHEN** the default font cannot be loaded before a Wall Cover revision is generated
- **THEN** generation MUST fail with a recoverable, diagnosable error
- **AND** the workspace MUST not commit a text revision or enable two-color export

### Requirement: Multiple Wall Covers remain flat two-part assemblies

Every generated cover instance MUST retain a body region and a separate text
solid. The top of each text solid MUST be coplanar with its corresponding cover
top within the documented CAD tolerance; text MUST NOT be embossed, raised, or
represented only by a viewport material. The aggregated revision MUST preserve
the logical `body` and `text` part roles for preview and export.

#### Scenario: Multiple labels remain coplanar

- **WHEN** a valid `IAN` or Traditional Chinese revision is quality-checked
- **THEN** every text instance maximum Z MUST match its corresponding body top within the documented CAD tolerance
- **AND** no text instance MAY extend above its cover
- **AND** the nominal outer bounds of every cover MUST remain unchanged

#### Scenario: Body and text roles remain independently addressable

- **WHEN** a multi-cover revision is committed
- **THEN** the revision MUST expose an aggregate body part and an aggregate text part
- **AND** downstream preview and export MUST be able to assign different colors or extruders to those two roles
- **AND** the parts MUST NOT be flattened into a single display-only mesh
