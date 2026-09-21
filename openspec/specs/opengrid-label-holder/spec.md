## Purpose

提供 OpenGrid 標籤卡槽座元件：沿用鞍座夾夾在任何面板邊緣，外側面的淺口袋以 snap-fit detent 咬住 `opengrid-label-card` 標籤卡，支援直放與橫放、數秒抽換；座體單色列印，一個盒位只需一個。

## Requirements

### Requirement: OpenGrid Label Holder model contract

The system MUST register a new independent model with `modelId=opengrid-label-holder`, `buildKey=opengrid-label-holder`, route slug `opengrid-label-holder`, and user-facing display name beginning with `OpenGrid `. The model MUST be offered in both the Desk and Wall system contexts. The holder MUST be generated as a single fused solid intended for single-color printing, and MUST NOT carry the card, icon, or text geometry. The model MUST NOT expose icon or text parameters.

#### Scenario: Catalogs expose the label holder in both contexts

- **WHEN** the user opens the Desk or the Wall component catalog
- **THEN** both catalogs MUST list `OpenGrid Label Holder`
- **AND** the model MUST use `opengrid-label-holder` consistently for its modelId, buildKey, route slug, and component directories

#### Scenario: Holder is single color

- **WHEN** the user views the export actions for a committed holder revision
- **THEN** STEP and STL downloads MUST be available
- **AND** no two-color 3MF action MAY be offered for this model

### Requirement: Label Holder parameter contract

The label holder MUST expose exactly two parameter groups: a width tier selected from the shared discrete set `20`, `30`, `40`, `60` millimetres that MUST match the intended card's width tier, and a grip thickness in the inclusive range 0.8–5 mm. The default parameters MUST be width tier `40` and grip thickness `1.2`. Validation MUST reject width tiers outside the discrete set, grip thickness outside the range, and any unknown parameter key.

#### Scenario: Default parameters generate on first open

- **WHEN** the user opens `/cad/opengrid-label-holder` without a saved parameter snapshot
- **THEN** generation MUST use width tier `40` and grip thickness `1.2`

#### Scenario: Out-of-range parameters are rejected

- **WHEN** a snapshot carries a width tier outside `{20,30,40,60}` or grip thickness below `0.8` or above `5`
- **THEN** validation MUST fail with a per-field error and no `model.generate` or export request MAY be sent for that snapshot

### Requirement: Label Holder geometry is the saddle clip with a card pocket

The holder MUST reuse the saddle clip attachment: a back wall that bears on the gripped panel edge, two arms gripping the panel faces with a fixed 0.2 mm total clearance, and at least 5 mm engagement along the panel edge. The outward face of the base MUST carry a shallow card pocket that accepts the card of the same width tier: the pocket MUST be shallower than the card's 0.6 mm insertion thickness so the card's visible face sits exposed and slightly proud of the base face, and the pocket walls MUST contain the card on all four sides. Near the mouth end, the pocket's two side walls MUST each carry a detent protrusion toward the pocket interior so the card's side edges are gripped with a small snap interference.

#### Scenario: Gripping a box wall

- **WHEN** a holder generated with grip thickness `1.2` is virtually assembled onto a 1.2 mm panel edge
- **THEN** the clip opening MUST accept the panel with the fixed nominal clearance on each gripping face
- **AND** the card pocket MUST sit on the outward face with its opening unobstructed

#### Scenario: Pocket seats the matching card

- **WHEN** a card of the same width tier and 0.6 mm insertion thickness is seated into the pocket
- **THEN** the pocket MUST accept the card with a fixed wall clearance on each side
- **AND** the card's insertion face MUST sit 0.15 mm proud of the base face; a raised-style accent face sits 0.55 mm proud

### Requirement: Detent snap retention works in any mounting orientation

The pocket's detent protrusions MUST engage the card's side edges near the mouth so the card is retained by the snap interference regardless of gravity direction: the pocket walls contain the card against gravity, and the detents add the perceptible click and vibration resistance. Each detent protrusion MUST be 0.25 mm toward the pocket interior so the insertion click is perceptible, the card's side edges spread the walls slightly on insertion, and the walls return to their rest position afterwards.

#### Scenario: Any mounting orientation retains the card

- **WHEN** a holder is mounted on a horizontal box wall or on a vertical panel edge
- **THEN** the pocket walls MUST retain the seated card against gravity in both orientations
- **AND** each detent protrusion MUST be 0.25 mm toward the pocket interior

#### Scenario: Card stays removable

- **WHEN** a pulling force is applied to the card's exposed face
- **THEN** the detent interference MUST release without permanent deformation

### Requirement: Label Holder quality gate and bounds

A generated holder MUST pass a component-local quality gate that verifies: the single fused solid exists; the bounds equal the width tier plus the pocket frame envelope for X, the shared hang-plus-clip envelope for Y, and the grip stack-up for Z; the pocket is hollow over the card seat region (measured by boolean probe, not arithmetic); and both detent protrusions are present with symmetric engagement volumes within tolerance. The generated bounds MUST be reported before generation.

#### Scenario: Quality gate enforces pocket and detent geometry

- **WHEN** a holder revision is generated
- **THEN** the gate MUST verify the pocket hollowness, detent presence, detent symmetry, and bounds before the candidate can be committed
- **AND** a failed gate MUST reject the candidate with a structured diagnostic

### Requirement: Label Holder export formats

STEP and STL export MUST emit the combined single-solid geometry of the committed holder revision under the holder's own parameter-derived file names. All formats MUST follow the existing CAD lifecycle gates: available only for the latest committed, ready, non-stale revision.

#### Scenario: STEP and STL export the holder

- **WHEN** the user downloads STEP or STL for a committed holder revision
- **THEN** the file name MUST be derived from `opengrid-label-holder` and the generation parameters including the width tier and grip thickness
- **AND** the geometry MUST include the saddle clip and the card pocket
