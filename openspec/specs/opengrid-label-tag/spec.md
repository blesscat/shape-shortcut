## Purpose

提供一個 OpenGrid 標籤卡扣元件：0.6 mm 薄標籤板加上 U 型摩擦夾，可夾在任何面板邊緣（壁掛元件側面、方盒內分隔牆或盒壁頂邊），以雙色列印呈現內建 icon 與選配文字，作為生態系的第二個雙色 3MF 元件。

## Requirements

### Requirement: OpenGrid Label Tag model contract

The system MUST register a new independent model with `modelId=opengrid-label-tag`, `buildKey=opengrid-label-tag`, route slug `opengrid-label-tag`, and user-facing display name beginning with `OpenGrid `. The model MUST be offered in both the Desk and Wall system contexts. The label tag MUST be built from two separate printable parts, a body part and an icon accent part, and MUST NOT be implemented as a single fused solid at the part level. The model MUST NOT expose unrelated OpenGrid Snap parameters or a font picker.

#### Scenario: Catalogs expose the label tag in both contexts

- **WHEN** the user opens the Desk component catalog or the Wall component catalog
- **THEN** both catalogs MUST list `OpenGrid Label Tag`
- **AND** the model MUST use `opengrid-label-tag` consistently for its modelId, buildKey, route slug, and component directories
- **AND** the route `/[locale]/cad/opengrid-label-tag` MUST resolve to exactly this catalog definition

#### Scenario: Existing component IDs are preserved

- **WHEN** the catalog is loaded after this change
- **THEN** every pre-existing model id MUST remain registered and unchanged
- **AND** no existing route MAY redirect or alias to `opengrid-label-tag`

### Requirement: Label Tag parameter contract

The label tag MUST expose exactly four parameter groups: a width tier selected from the discrete set `20`, `30`, `40`, `60` millimetres; a grip thickness in the inclusive range 0.8–5 mm; an icon identifier from the built-in icon set; and optional text of at most 6 characters. The default parameters MUST be width tier `40`, grip thickness `1.2`, the set's default icon, and empty text. Validation MUST reject unknown icon identifiers, out-of-range grip thickness, text exceeding the maximum, and any unknown parameter key. Decimal grip thickness values in range MUST be accepted; width tiers outside the discrete set MUST be rejected.

#### Scenario: Default parameters generate on first open

- **WHEN** the user opens `/cad/opengrid-label-tag` without a saved parameter snapshot
- **THEN** generation MUST use width tier `40`, grip thickness `1.2`, the default icon, and no text

#### Scenario: Out-of-range or unknown parameters are rejected

- **WHEN** a snapshot carries a width tier outside `{20,30,40,60}`, grip thickness below `0.8` or above `5`, an icon id outside the built-in set, or text longer than 6 characters
- **THEN** validation MUST fail with a per-field error and no `model.generate` or export request MAY be sent for that snapshot

### Requirement: Label Tag geometry is a thin plate with a U-shaped friction clip

The printable geometry MUST combine a label plate nominally 0.6 mm thick and 10 mm tall with a stiffer saddle clip whose opening grips a panel edge of the selected grip thickness. The clip MUST include a fixed nominal clearance of 0.2 mm total to the gripped panel so the assembled fit is friction-based and removable, keeping each spring arm's installation deflection within layer-bond safe limits. The plate MUST hang parallel to the gripped panel plane, offset outward from the panel face by the clip: clipped onto a horizontal box wall or divider top edge the label hangs downward inside the box facing the box opening, and clipped onto a vertical panel side edge the label reads outward from that face. The clip engagement along the gripped panel edge MUST be at least 5 mm. The generated bounds MUST equal the selected width tier for X, the plate height plus clip envelope for Y, and the grip stack-up for Z, and MUST be reported before generation.

#### Scenario: Gripping a box wall

- **WHEN** a label tag generated with grip thickness `1.2` is virtually assembled onto a 1.2 mm panel edge
- **THEN** the clip opening MUST accept the panel with the fixed nominal clearance on each gripping face
- **AND** the label plate MUST hang parallel to the panel plane, offset outward from the panel face without touching it

#### Scenario: Width tier changes only the plate length

- **WHEN** the same icon, text, and grip thickness are generated at width tiers `20` and `60`
- **THEN** both revisions MUST share the same plate thickness, plate height, and clip geometry within the documented CAD tolerance
- **AND** the X extent of each revision MUST equal its width tier within the documented CAD tolerance

#### Scenario: Installation deflection stays within layer-bond limits

- **WHEN** any label tag revision is generated
- **THEN** the clip spring arms MUST each deflect at most 0.1 mm to accept a panel of the selected grip thickness
- **AND** the arms MUST retain at least 0.8 mm of thickness at their flexure

### Requirement: Built-in curated icon set

The component MUST ship a built-in set of filled-outline icons curated for storage labeling with at least 16 and at most 24 icons, bundled as vector path data local to the component. The parameter panel MUST present the set as a gallery picker with localized names. A selected icon MUST be realized as a filled solid seated in a shallow recess of the plate so its visible (outward) face is coplanar with the plate face, following the same flush treatment as Wall Cover flat text. Icons MUST NOT be rendered as strokes, viewport-only materials, or decals outside the printable geometry.

#### Scenario: Icon gallery lists the whole set

- **WHEN** the user opens the label tag parameter panel
- **THEN** the icon picker MUST list every icon in the built-in set with its localized label
- **AND** each listed icon MUST be a valid generation input

#### Scenario: Icon is a filled flush solid

- **WHEN** a revision with a selected icon is quality-checked
- **THEN** the icon part MUST be a non-empty solid whose visible (outward) face is coplanar with the plate face within the documented CAD tolerance
- **AND** the body MUST carry a matching recess so the icon does not protrude above the plate

### Requirement: Optional label text shares the accent part

The optional text MUST be rendered on the plate below the icon using the same deterministic Traditional Chinese font pipeline as Wall Cover, at a size bounded by the selected width tier. When text is present it MUST be fused into the same accent part as the icon; the model MUST always keep exactly two parts, `body` and `icon`, whether or not text is present. Empty text MUST produce an icon-only plate and MUST NOT fail generation.

#### Scenario: Icon-only generation

- **WHEN** a valid revision is generated with empty text
- **THEN** the committed parts MUST be exactly `body` and `icon`
- **AND** the icon accent solid MUST contain only the icon geometry

#### Scenario: Text joins the accent part

- **WHEN** a valid revision is generated with text `螺絲` and an icon
- **THEN** the accent part MUST contain both the icon solid and the text glyph solids
- **AND** the text visible (outward) face MUST remain flush with the plate face within the documented CAD tolerance

### Requirement: Label Tag live preview renders both part colors

When a label tag revision is committed with valid body and icon parts, the CAD workspace preview MUST render the body and the icon accent as separate meshes with deterministic distinct base and accent colors, matching the printable part boundaries. A candidate without a valid body/icon pair MUST NOT commit as a two-color-ready revision, and the two-color export action MUST remain unavailable for it.

#### Scenario: Committed preview shows two colors

- **WHEN** the label tag preview is ready
- **THEN** the viewport MUST show the body in the base color and the icon accent in the accent color
- **AND** the preview geometry MUST match the revision available to export

### Requirement: Label Tag export formats

STEP and STL export MUST emit the combined single-solid geometry of the committed revision. 3MF export MUST emit a two-color package with the body part assigned to material slot 1 and the icon accent part assigned to material slot 2, under the label tag's own file name and package metadata. All three formats MUST follow the existing CAD lifecycle gates: available only for the latest committed, ready, non-stale revision.

#### Scenario: STEP and STL export one merged solid

- **WHEN** the user downloads STEP or STL for a committed label tag revision
- **THEN** the download MUST contain the full geometry including clip and plate with both parts geometrically present
- **AND** the file name MUST be derived from `opengrid-label-tag` and the generation parameters

#### Scenario: 3MF keeps body and icon separately addressable

- **WHEN** the user downloads 3MF for a committed label tag revision
- **THEN** the package MUST contain one parent build item with independently addressable `body` and `icon` parts
- **AND** `Metadata/model_settings.config` MUST assign body to extruder 1 and icon to extruder 2 with plate filament map `1 2`
- **AND** the package MUST be structurally valid for the existing 3MF validation path

#### Scenario: Unsupported revisions cannot export

- **WHEN** the latest revision is stale, failed, or lacks the body/icon part pair
- **THEN** all export actions MUST be unavailable or rejected with a structured recoverable error
