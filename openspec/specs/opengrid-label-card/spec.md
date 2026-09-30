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

The label card MUST expose width in integer `gridUnits` from 1 through 10, with each unit corresponding to 10 mm of actual card width, independently of the OpenGrid mounting pitch. Its other parameter groups MUST remain style `flat` or `raised`, an icon from the shared built-in set, and up to two optional text rows of at most six characters each. The panel MUST offer `iconPosition` as `left` or `right`, defaulting missing legacy values to `left`. The panel MUST offer `layout` as `inline` (icon beside text) or `stacked` (icon above text), defaulting missing legacy values to `inline`. The panel MUST offer `groupAlign` as `left`, `center`, or `right`, defaulting missing legacy values to `center`; `groupAlign` MUST apply only to `inline` layout. The panel MUST offer `iconSize` from 3 through 8 mm in 0.5 mm steps, defaulting missing legacy values to 6 mm. Defaults MUST be four units, raised style, the shared default icon, `inline` layout, `center` group alignment, 6 mm icon size and empty text. Validation MUST reject unknown keys, invalid units/icons/styles/layouts/group alignments/icon sizes, overlong text and content wider than the usable face. In `stacked` layout validation MUST reject a non-empty second text row and MUST reject a missing icon. Legacy snapshots with `widthTier` in {20,30,40,60} MUST normalize to the corresponding unit count; mixed widthTier/gridUnits input MUST be rejected.

#### Scenario: Default parameters generate on first open

- **WHEN** the card route opens without saved parameters
- **THEN** it MUST generate a four-unit, 40 mm raised inline card with default icon, center group alignment, 6 mm icon size and no text

#### Scenario: Select widths in label units

- **WHEN** the user selects one, three or five units
- **THEN** the card width MUST be 10, 30 or 50 mm respectively
- **AND** the localized panel MUST display the unit count and resulting millimetres

#### Scenario: Out-of-range or unknown parameters are rejected

- **WHEN** units are fractional, non-finite, zero or above 10, or an icon/style/layout/group alignment/key is unknown, or icon size is outside 3–8 mm or off-step, or text exceeds its supported length or width
- **THEN** validation MUST return a field-specific error and prevent generation and export

#### Scenario: Preserve legacy width settings

- **WHEN** a saved card snapshot has widthTier=30 and no gridUnits
- **THEN** it MUST hydrate as gridUnits=3 while preserving style, icon and text
- **AND** saving MUST use canonical gridUnits

#### Scenario: Stacked layout rejects a second text row

- **WHEN** layout is `stacked` and the second text row is non-empty
- **THEN** validation MUST return a field-specific error on the second row and prevent generation and export

#### Scenario: Stacked layout requires an icon

- **WHEN** layout is `stacked` and the icon is `none`
- **THEN** validation MUST return a field-specific error on `layout` and prevent generation and export

#### Scenario: New keys fall back for legacy snapshots

- **WHEN** a saved snapshot predates `layout`, `groupAlign`, or `iconSize`
- **THEN** hydration MUST apply the defaults `inline`, `center`, and 6 mm without altering the other stored choices


### Requirement: Label Card geometry is a flat plate compatible with the holder pocket

The card MUST be a flat plate whose insertion thickness is nominally 0.6 mm in both styles and whose visible face carries the accent. The X extent MUST equal the selected unit count multiplied by 10 mm and the Y extent MUST equal the shared 12 mm card height. In `flat` style the accent MUST be seated flush with the outward face for a 0.6 mm total thickness; in `raised` style the accent MUST protrude 0.4 mm beyond the outward face for a 1.0 mm total thickness. The insertion thickness MUST be identical in both styles so one holder pocket serves both. The integrated organizer front slot and the label-slot-test coupon MUST derive their pocket geometry from the same 12 mm card height so cards and slots regenerate consistently. The generated bounds MUST be reported before generation.

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

#### Scenario: Card height matches the shared constant

- **WHEN** any card revision is generated
- **THEN** its Y extent MUST equal 12 mm within the documented CAD tolerance
- **AND** the integrated organizer slot pocket for the same parameters MUST be cut from the same 12 mm height


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

Card accents MUST remain inside the 12 mm card height and leave at least 1 mm clear along both width edges. Both styles MUST be insertable into the same integrated organizer slot without their art touching its rails. The system MUST report text that cannot fit rather than truncate it, silently change units or shrink artwork to fit. Geometry quality validation MUST reject actual accent bounds outside the safe face, and generation MUST be rejected when icon geometry overlaps text geometry.

#### Scenario: A one-unit card fits its slot

- **WHEN** an icon-only one-unit card is generated in either style
- **THEN** its artwork MUST stay inside the rail-safe face and the 0.6 mm edge insertion thickness MUST remain unobstructed

#### Scenario: Text is too wide for a narrow card

- **WHEN** six characters are requested on a one-unit card
- **THEN** a text-width diagnostic MUST prevent a new ready/exportable revision


### Requirement: Horizontal artwork with printable text height

In `inline` layout the icon MUST sit to the selected left or right of one or two horizontal text lines, and the combined icon + minimum gap + widest text row MUST be treated as one group positioned `left`, `center`, or `right` inside the safe area per `groupAlign`. Text geometry MUST have a user-selected visible height from 2 to 7 mm (default 7 mm) and MUST NOT be reduced to fit a narrow card. The icon and text MUST keep at least the 2 mm minimum gap, remain vertically centered, and respect the retaining-rail safety margin. In `stacked` layout the icon MUST sit centered above a single centered text row with a vertical separation of at least 1 mm, `iconSize + 1 + textHeight` MUST NOT exceed the 10 mm safe height, `groupAlign` MUST NOT apply, and `stacked` MUST require a selected icon (icon `none` MUST be rejected). Insufficient width or stacked height MUST produce a field diagnostic. Empty text MUST keep the icon centered.

#### Scenario: Switch the icon side

- **WHEN** the user selects left or right for an icon with text in `inline` layout
- **THEN** the icon MUST move to that side without changing the text orientation or selected text height
- **AND** the side choice MUST persist and be included in export filenames

#### Scenario: Centered group on a wide card

- **WHEN** `groupAlign` is `center` and a short text is generated beside the icon on a wide card
- **THEN** the combined icon + gap + text group MUST be horizontally centered in the safe area instead of the text spanning the leftover region

#### Scenario: Group alignment positions the combined group

- **WHEN** `groupAlign` is `left` or `right` in `inline` layout
- **THEN** the combined group MUST be positioned against the corresponding safe-area edge while the minimum 2 mm icon/text gap and the rail margins are preserved

#### Scenario: Stacked layout centers the icon above the text

- **WHEN** layout is `stacked` with an icon and one text row sized to fit
- **THEN** the icon MUST sit horizontally centered above the centered text row with at least a 1 mm vertical gap
- **AND** `groupAlign` MUST NOT shift the stack

#### Scenario: Stacked layout rejects combinations that exceed the safe height

- **WHEN** `iconSize + 1 + textHeight` exceeds 10 mm in `stacked` layout
- **THEN** validation MUST return a field-specific error and prevent generation and export


### Requirement: Adjustable text height and optional icon
The card MUST offer a text-height slider from 2 to 7 mm in 0.5 mm steps, defaulting legacy saved cards to 7 mm. Width validation MUST account for selected height. The icon gallery MUST offer None; text-only cards MUST respect the selected alignment (center by default) and reserve no icon width or icon/text gap. Both parameters MUST persist across reloads. A card with no text and no icon MUST generate a blank plate with STEP/STL export; multipart 3MF export MUST be unavailable for a blank plate.

#### Scenario: Smaller text without icon
- **WHEN** the user selects 4 mm and None
- **THEN** generated text MUST be 4 mm high and horizontally centered without an icon
- **AND** reloading MUST restore both selections

### Requirement: Icon orientation matches the gallery
SVG icons MUST be converted from downward-positive SVG Y to upward-positive CAD Y so that they appear upright beside readable text in the preview and exports.

#### Scenario: Camera icon orientation
- **WHEN** the user selects the camera icon
- **THEN** its raised outline MUST appear at the top and its small indicator MUST appear at the upper left, matching the gallery

### Requirement: Independently aligned text rows
The card MUST offer optional upper and lower text inputs, each with left, center, or right alignment. In `inline` layout alignment MUST use the text block formed by the widest non-empty row, and each row MUST align against that block per its own alignment; in `stacked` layout only one row is permitted and alignment MUST center it. Each row MUST accept up to six supported characters. Both rows share the selected visible glyph height; one nonempty row permits 2–7 mm, two nonempty rows permit 2–4 mm each, with a 0.5 mm gap. Adding a second nonempty row MUST reduce a larger current height to 4 mm and MUST require `inline` layout. The card MUST remain 12 mm high and retain its existing insertion thickness and slot compatibility. Text, alignment, and height MUST persist across reloads. Validation errors MUST identify the affected row.

#### Scenario: Different row alignments
- **WHEN** the user enters M3 above and 10mm below, with upper left alignment and lower right alignment
- **THEN** both rows MUST align against the widest non-empty row as the block reference, remain separated, and preserve these choices after reload and export


### Requirement: Fastener symbol choices
The icon gallery MUST offer slotted, Phillips, hex socket, and Torx drive symbols, simplified sectional pictograms for through, threaded, countersunk, and counterbored holes, and a screw side-view category (`screw-pan`, `screw-hex`). The drive and hole symbols are identification pictograms, not dimensioned manufacturing profiles. Both screw side-view icons MUST render the same pictogram: a small ring on the left, one smooth solid rectangular shaft extending to the right, and a fixed-size rectangular head block at the right end — with no thread teeth and no pointed corners. The shaft length MUST follow the first text row: a `M<dia>x<len>` designation MUST map the shaft length linearly so that it is proportional to the designated length in millimetres, short designations included, and a designation without a length or a non-matching text MUST render a short stub shaft. The ring, shaft, and head block keep fixed thicknesses across all designations — shaft and head block features stay at least 1.5 viewport units and the ring stroke stays at least 1.0 viewport unit at the 16-unit grid — and the whole glyph MUST scale with `iconSize` and stay within the 16-unit icon grid. All icons MUST support both card styles and multipart export, and labels MUST be localized.

#### Scenario: Select a fastener symbol

- **WHEN** a user chooses a fastener symbol
- **THEN** the preview and exported card MUST contain the chosen upright geometry with the spacing rules of its layout

#### Scenario: Screw side view is a ring with a smooth shaft and a rectangular head

- **WHEN** a card uses the `screw-pan` or `screw-hex` icon
- **THEN** the rendered pictogram MUST show a ring on the left, a smooth solid shaft extending to the right, and a fixed-size rectangular head block at the shaft's far end, with no thread teeth and no pointed corners

#### Scenario: Screw shaft length follows the text designation

- **WHEN** a card uses the `screw-pan` icon with text `M4x16` and another uses `M4`
- **THEN** the `M4x16` card MUST render a visibly longer shaft than the `M4` card within the same icon size
- **AND** text without a `M<dia>[x<len>]` designation MUST fall back to the short stub shaft

#### Scenario: Shaft length scales proportionally with the designated length

- **WHEN** two cards of the same icon size use `M2x8` and `M2x20`
- **THEN** the `M2x20` card MUST render a shaft at least twice as long as the `M2x8` card
- **AND** short designations MUST stay proportional, with `M4x6` rendering twice the shaft of `M4x3`

#### Scenario: Screw icons scale with icon size

- **WHEN** the user changes `iconSize` while a screw side-view icon is selected
- **THEN** the generated screw geometry MUST scale to the selected size while keeping shaft and head block features at least 1.5 viewport units thick and the ring stroke at least 1.0 viewport unit

### Requirement: Screw mode dedicated composition

The label card MUST offer a `screwMode` boolean, defaulting missing values to `false`; snapshots without the key MUST behave exactly as before. While `screwMode` is enabled the parameter panel MUST replace the icon gallery, layout, group alignment, icon position, alignment selects, icon-size control, and free-text inputs with three pickers — head type (`phillips`, `torx`, `hex`), diameter (M2, M2.5, M3, M3.5, M4, M5, M6, M8), and integer length in millimetres from 4 through 30 — plus the existing width, style, and text height controls. The card composition MUST be fixed at real scale, independent of `iconSize`: the front-view head symbol (`drive-phillips`, `drive-torx`, or `drive-hex`) at a fixed 4.5 mm, then the existing icon/text gap, then the side-view screw body — a fixed 3 mm × 4.5 mm rectangular head block whose height matches the front symbol, followed by a smooth solid shaft 2 mm thick whose length equals the selected length in millimetres at 1:1 real scale — all centered as a group in the upper safe zone, with a single centered text row below carrying the generated designation `M<diameter>x<length>`. The rendered shaft length on the card face MUST equal the selected length in millimetres so a screw held against the label matches its compartment. `gridUnits`, `style`, and `textHeight` MUST keep their existing ranges and remain adjustable; the stored `iconSize` value MUST be preserved untouched and MUST apply again when screw mode is toggled off.

#### Scenario: Enable screw mode

- **WHEN** the user enables screw mode on a manual card
- **THEN** the panel MUST show only the head, diameter, and length pickers alongside width, style, and text height — with no icon-size control
- **AND** the card MUST generate the real-scale composition with the generated designation instead of any manual icon or text

#### Scenario: Head choice drives the front symbol

- **WHEN** the user selects hex as the head with any diameter and length
- **THEN** the composition MUST lead with the `drive-hex` front symbol at the fixed size
- **AND** selecting phillips or torx MUST lead with the matching drive symbol while the side view keeps the same head block and shaft

#### Scenario: Shaft renders at real scale

- **WHEN** a screw-mode card selects M4 with length 16 on a 30 mm-wide card
- **THEN** the rendered shaft MUST span approximately 16 mm of the card face between the head block and the shaft tip, within the safe face
- **AND** two screw-mode cards differing only in length, 8 mm versus 28 mm, MUST render shafts differing by approximately 20 mm on the card face

#### Scenario: Composition too wide is rejected

- **WHEN** the head symbol, gap, head block, and shaft cannot fit the selected card's safe width — for example M4 with length 30 on a 40 mm-wide card
- **THEN** a field-specific `screwLength` diagnostic MUST prevent generation and export
- **AND** selecting a wider card MUST let the same screw generate

### Requirement: Screw mode derives text and icon values

While `screwMode` is enabled, validation MUST derive the effective icon from the selected head (side-view id), MUST overwrite the effective text with the generated `M<diameter>x<length>` designation, and MUST ignore any stored manual `text`, `textLine2`, `layout`, `groupAlign`, `iconPosition`, `iconSize`, and text-alignment values rather than rejecting or surfacing them. An absent text height MUST hydrate to the 3 mm screw-mode default instead of the manual 7 mm default. The generated designation MUST be exempt from the six-character manual input cap; width validation MUST instead evaluate the full real-scale composition (head-front symbol + gap + designated shaft length + head block, and the designation at the selected text height) against the safe face and return a `screwLength` field diagnostic that prevents generation and export. Screw mode MUST enforce `head-front size + gap + textHeight` within the 10 mm safe height with a field-specific diagnostic. Enabling screw mode MUST NOT resize any stored manual control: the composition has fixed sizes, and the text height MUST be set to the 3 mm screw-mode default. Toggling screw mode off MUST restore the manual controls — including the stored icon size — with empty text rows.

#### Scenario: Stale manual values are ignored

- **WHEN** a snapshot with manual icon, text, and layout values enables `screwMode`
- **THEN** the hydrated card MUST generate only the derived composition and designation without validation errors for the manual values

#### Scenario: Decimal designation generates on a wide card

- **WHEN** the user selects diameter M2.5 with length 30 on a card wide enough for the composition
- **THEN** the designation `M2.5x30` MUST generate without a text-length rejection

#### Scenario: Screw mode enable keeps the stored icon size

- **WHEN** screw mode is enabled on a card with any stored icon size
- **THEN** the stored icon size MUST stay unchanged for restore on toggle-off and the designation height MUST default to 3 mm
- **AND** the generated composition MUST use its fixed real-scale sizes regardless of that stored value

### Requirement: Screw mode persistence and export fingerprints

`mode`, head, diameter, and length choices MUST persist across reloads as canonical parameter keys, and a screw-mode snapshot MUST regenerate the identical composition. Export file names MUST include screw-mode tokens covering the head, diameter, and length (for example `sm-phillips-d4-l16`) such that no screw-mode export can collide with a manual card or a different screw selection. Screw-mode cards MUST export STEP and STL combined geometry and the two-color 3MF package under the existing lifecycle gates.

#### Scenario: Screw selections persist

- **WHEN** the user reloads a screw-mode card with torx, M5, 20 mm
- **THEN** the panel MUST restore torx, M5, and 20 mm and regenerate the identical composition

#### Scenario: File names distinguish screw selections

- **WHEN** the user exports 3MF for screw-mode cards differing only in diameter
- **THEN** the file names MUST differ in the screw tokens while following the existing naming pattern


