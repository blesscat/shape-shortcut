# opengrid-label-card 參數契約（Delta）

## MODIFIED Requirements

### Requirement: Label Card parameter contract

The label card MUST expose width in integer `gridUnits` from 1 through 10, with each unit corresponding to 10 mm of actual card width, independently of the OpenGrid mounting pitch. Its other parameter groups MUST remain style `flat` or `raised`, an icon from the shared built-in set, and up to two optional text rows of at most six characters each. The panel MUST offer `iconPosition` as `left` or `right`, defaulting missing legacy values to `left`. The panel MUST offer `layout` as `inline` (icon beside text) or `stacked` (icon above text), defaulting missing legacy values to `inline`. The panel MUST offer `groupAlign` as `left`, `center`, or `right`, defaulting missing legacy values to `center`; `groupAlign` MUST apply only to `inline` layout. The panel MUST offer `iconSize` from 3 through 8 mm in 0.5 mm steps, defaulting missing legacy values to 6 mm. Defaults MUST be four units, raised style, the shared default icon, `inline` layout, `center` group alignment, 6 mm icon size and empty text. Validation MUST reject unknown keys, invalid units/icons/styles/layouts/group alignments/icon sizes, overlong text and content wider than the usable face. In `stacked` layout validation MUST reject a non-empty second text row. Legacy snapshots with `widthTier` in {20,30,40,60} MUST normalize to the corresponding unit count; mixed widthTier/gridUnits input MUST be rejected.

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

### Requirement: Horizontal artwork with printable text height

In `inline` layout the icon MUST sit to the selected left or right of one or two horizontal text lines, and the combined icon + minimum gap + widest text row MUST be treated as one group positioned `left`, `center`, or `right` inside the safe area per `groupAlign`. Text geometry MUST have a user-selected visible height from 2 to 7 mm (default 7 mm) and MUST NOT be reduced to fit a narrow card. The icon and text MUST keep at least the 2 mm minimum gap, remain vertically centered, and respect the retaining-rail safety margin. In `stacked` layout the icon MUST sit centered above a single centered text row separated by a 1 mm vertical gap, `iconSize + 1 + textHeight` MUST NOT exceed the 10 mm safe height, and `groupAlign` MUST NOT apply. Insufficient width or stacked height MUST produce a field diagnostic. Empty text MUST keep the icon centered.

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
- **THEN** the icon MUST sit horizontally centered above the centered text row with a 1 mm vertical gap
- **AND** `groupAlign` MUST NOT shift the stack

#### Scenario: Stacked layout rejects combinations that exceed the safe height

- **WHEN** `iconSize + 1 + textHeight` exceeds 10 mm in `stacked` layout
- **THEN** validation MUST return a field-specific error and prevent generation and export

### Requirement: Card content leaves retaining rails clear

Card accents MUST remain inside the 12 mm card height and leave at least 1 mm clear along both width edges. Both styles MUST be insertable into the same integrated organizer slot without their art touching its rails. The system MUST report text that cannot fit rather than truncate it, silently change units or shrink artwork to fit. Geometry quality validation MUST reject actual accent bounds outside the safe face and reject icon geometry that overlaps text geometry.

#### Scenario: A one-unit card fits its slot

- **WHEN** an icon-only one-unit card is generated in either style
- **THEN** its artwork MUST stay inside the rail-safe face and the 0.6 mm edge insertion thickness MUST remain unobstructed

#### Scenario: Text is too wide for a narrow card

- **WHEN** six characters are requested on a one-unit card
- **THEN** a text-width diagnostic MUST prevent a new ready/exportable revision

### Requirement: Independently aligned text rows
The card MUST offer optional upper and lower text inputs, each with left, center, or right alignment. In `inline` layout alignment MUST use the text block formed by the widest non-empty row, and each row MUST align against that block per its own alignment; in `stacked` layout only one row is permitted and alignment MUST center it. Each row MUST accept up to six supported characters. Both rows share the selected visible glyph height; one nonempty row permits 2–7 mm, two nonempty rows permit 2–4 mm each, with a 0.5 mm gap. Adding a second nonempty row MUST reduce a larger current height to 4 mm and MUST require `inline` layout. The card MUST remain 12 mm high and retain its existing insertion thickness and slot compatibility. Text, alignment, and height MUST persist across reloads. Validation errors MUST identify the affected row.

#### Scenario: Different row alignments
- **WHEN** the user enters M3 above and 10mm below, with upper left alignment and lower right alignment
- **THEN** both rows MUST align against the widest non-empty row as the block reference, remain separated, and preserve these choices after reload and export

### Requirement: Fastener symbol choices
The icon gallery MUST offer slotted, Phillips, hex socket, and Torx drive symbols, simplified sectional pictograms for through, threaded, countersunk, and counterbored holes, and a screw side-view category (`screw-pan`, `screw-hex`). The drive and hole symbols are identification pictograms, not dimensioned manufacturing profiles. The screw side-view icons MUST be drawn as bold solid silhouettes — pan or hex head plus a shaft with thread teeth — whose minimum feature stays at least 1.5 viewport units at the 16-unit grid, and MUST scale with `iconSize`. For the screw side-view category the shaft length MUST follow the first text row: a `M<dia>x<len>` designation maps a 4–30 mm length to a 0.35–1.0 shaft ratio, and a designation without a length or a non-matching text MUST use the 0.65 fallback ratio. All icons MUST support both card styles and multipart export, and labels MUST be localized.

#### Scenario: Select a fastener symbol

- **WHEN** a user chooses a fastener symbol
- **THEN** the preview and exported card MUST contain the chosen upright geometry with the spacing rules of its layout

#### Scenario: Screw shaft length follows the text designation

- **WHEN** a card uses the `screw-pan` icon with text `M4x16` and another uses `M4`
- **THEN** the `M4x16` card MUST render a visibly longer shaft than the `M4` card within the same icon size
- **AND** text without a `M<dia>[x<len>]` designation MUST fall back to the medium shaft ratio

#### Scenario: Screw icons scale with icon size

- **WHEN** the user changes `iconSize` while a screw side-view icon is selected
- **THEN** the generated screw geometry MUST scale to the selected size while keeping every feature at least 1.5 viewport units thick
