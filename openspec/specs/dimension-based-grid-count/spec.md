## Purpose

讓使用者能以 X/Y 目標尺寸快速取得網格類 component（`modular-grid-base`、`hsw-cell`）中最接近且不超過目標的合法格數，並保留原有格數控制供後續微調。
## Requirements
### Requirement: Accessible responsive calculator

The dimension calculator MUST have explicit accessible labels, keyboard-operable inputs and action, visible validation feedback, and a layout that remains usable without horizontal overflow on narrow viewports.

#### Scenario: Keyboard user calculates a grid

- **WHEN** a keyboard user focuses the target fields and activates `計算格數`
- **THEN** the calculation MUST run without requiring pointer input
- **AND** any validation error MUST be associated with its target field

#### Scenario: Narrow viewport displays calculator

- **WHEN** either component panel is rendered at a narrow mobile viewport
- **THEN** both target inputs and the `計算格數` action MUST remain reachable and understandable
- **AND** the panel MUST NOT introduce horizontal overflow

### Requirement: OpenGrid dimension calculation respects half-cell directions

The OpenGrid calculator MUST provide a printer-aware full-cell print plan. It MUST
accept target X/Y dimensions and printer X/Y dimensions in millimetres, calculate
full-cell counts using the existing 28 mm pitch, and MUST NOT exceed either target or
printer dimension. The print plan MUST use full-cell counts; it MUST NOT infer, add, or
remove a half-cell direction. The existing `halfCellX` and `halfCellY` selections MUST
remain independently controlled and MUST be preserved when a plan is applied to the
current OpenGrid preview.

#### Scenario: Printer-aware full-cell calculation

- **WHEN** the target is 1000 × 1000 mm and the printer is 256 × 256 mm
- **THEN** the target footprint MUST be calculated as 35 × 35 full cells because
  `floor(1000 / 28) = 35`
- **AND** the per-piece limit MUST be calculated as 9 × 9 full cells because
  `floor(256 / 28) = 9`
- **AND** the recommended plan MUST use 7 × 7 full-cell pieces with 25 total pieces

#### Scenario: Half-cell selections remain unchanged

- **WHEN** a user has selected an X or Y half-cell direction before calculating a
  print plan
- **THEN** the recommendation MUST still be expressed in full-cell counts and
  28 mm full-cell dimensions
- **AND** applying the plan MUST preserve both selected half-cell direction values
- **AND** the planner MUST NOT automatically add a half-cell to the recommended
  piece counts

#### Scenario: Printer and target dimensions are independent

- **WHEN** target X/Y dimensions and printer X/Y dimensions are different on each axis
- **THEN** the planner MUST calculate target counts independently for X and Y
- **AND** it MUST calculate printer limits independently for X and Y
- **AND** every recommended piece MUST fit within both corresponding printer-axis limits

### Requirement: OpenGrid calculation remains compatible with manual controls

Applying a valid OpenGrid print plan MUST apply the primary repeated piece's rows and
columns through the existing parameter flow, while preserving the current half-cell
directions and all unrelated OpenGrid parameters. The existing OpenGrid model identity,
route, preview lifecycle, and manual row/column controls MUST remain unchanged. The
planner MUST report the complete multi-piece plan but MUST NOT pretend that one preview
or one export represents every recommended piece.

#### Scenario: Applying a plan selects the primary piece

- **WHEN** a user calculates a valid plan with a repeated primary piece
- **THEN** the current OpenGrid rows and columns MUST become the primary piece's counts
- **AND** the current preview MUST continue through the existing OpenGrid parameter and
  Worker generation flow
- **AND** the result MUST still show the total target footprint and every piece group

#### Scenario: Manual adjustment remains available after planning

- **WHEN** a user calculates a plan and then changes the OpenGrid row, column, or
  half-cell controls manually
- **THEN** the normal parameter validation and preview lifecycle MUST continue to work
- **AND** the planner result MUST not corrupt unrelated OpenGrid parameters

#### Scenario: Existing OpenGrid identity is preserved

- **WHEN** the revised calculator is used on the OpenGrid panel
- **THEN** the generated component MUST retain the existing OpenGrid model identity,
  build key, route, export identity, and parameter schema
- **AND** `hsw-cell`, `modular-grid-base`, and other shared dimension-calculator
  consumers MUST retain their existing calculation behavior

### Requirement: OpenGrid printer-aware planner inputs and validation

The OpenGrid print planner MUST expose four finite, positive millimetre inputs for
target X, target Y, printer X, and printer Y. Target cell counts MUST be the floor of
the target dimension divided by 28 mm. Printer cell limits MUST be the floor of the
printer dimension divided by 28 mm and MUST be capped by the existing legal maximum
full-cell count for one OpenGrid board. The planner MUST reject any target or printer
axis that cannot contain one 28 mm full cell, show an accessible field-level error, and
leave the current OpenGrid parameters unchanged.

#### Scenario: Valid target and printer dimensions

- **WHEN** all four inputs contain finite positive dimensions and both targets and
  printer axes can contain at least one full cell
- **THEN** the planner MUST produce a valid print plan
- **AND** the target and printer counts MUST be derived independently per axis
- **AND** the current OpenGrid parameters MUST be updated only through a valid plan
  application

#### Scenario: Target below one full cell

- **WHEN** either target axis is less than 28 mm
- **THEN** the corresponding target field MUST show an accessible error explaining that
  at least one full cell is required
- **AND** the current rows, columns, half-cell directions, and accepted snapshot MUST
  remain unchanged

#### Scenario: Printer below one full cell

- **WHEN** either printer axis is less than 28 mm
- **THEN** the corresponding printer field MUST show an accessible error explaining
  that at least one full cell is required
- **AND** the current OpenGrid parameters MUST remain unchanged

#### Scenario: Malformed planner input

- **WHEN** any planner input is blank, non-numeric, non-finite, zero, or negative
- **THEN** the planner MUST show a visible accessible field-level error
- **AND** it MUST NOT throw an uncaught exception or update the current OpenGrid
  parameters

### Requirement: OpenGrid practical repeated-piece recommendation

The planner MUST recommend a rectangular decomposition of the target full-cell
footprint into printable pieces. Every piece width and height MUST be positive integers
within the corresponding printer cell limits. The planner MUST prefer one repeated
piece dimension when a practical exact uniform tiling exists. An exact uniform candidate
is practical only when each of its axis counts is at least half of the corresponding
effective per-piece limit, rounded up, unless that axis target itself is smaller. Among
practical exact candidates, the planner MUST choose the candidate with the greatest
piece area, breaking ties by the fewest pieces. If no practical exact candidate exists,
the planner MUST choose a main piece size in the practical range that minimizes the
axis remainder, breaking ties by the larger main size, then combine the X/Y remainders
into repeated edge and corner groups. It MUST NOT choose a tiny exact divisor solely to
make every piece identical.

#### Scenario: Exact uniform tiling is preferred

- **WHEN** the target is 35 × 35 cells and the printer limit is 9 × 9 cells
- **THEN** the planner MUST choose 7 × 7 cells as the repeated piece size
- **AND** it MUST recommend 5 pieces across, 5 pieces down, and 25 total pieces
- **AND** it MUST not recommend a mixed 9/8-cell decomposition

#### Scenario: Tiny uniform divisor is rejected

- **WHEN** the target is 34 × 34 cells and the printer limit is 9 × 9 cells
- **THEN** the planner MUST NOT choose 2 × 2 cells as the repeated piece size
- **AND** it MUST choose a practical main decomposition using 8-cell main spans and
  2-cell remainders on each axis
- **AND** the resulting groups MUST include 16 pieces of 8 × 8, 4 pieces of 8 × 2,
  4 pieces of 2 × 8, and 1 piece of 2 × 2
- **AND** the total MUST be 25 pieces

#### Scenario: One-axis remainder is consolidated

- **WHEN** only one target axis has a remainder after selecting the practical main
  spans
- **THEN** all full pieces MUST use the same main dimensions
- **AND** the remainder MUST be represented as repeated pieces of one independent
  edge dimension rather than many unrelated sizes

#### Scenario: Two-axis remainders produce a corner group

- **WHEN** both target axes have remainders after selecting the practical main spans
- **THEN** the planner MUST report the main group, each repeated edge group, and one
  corner group when the corner exists
- **AND** each group MUST report its piece cell dimensions, physical dimensions, and
  quantity
- **AND** the sum of all group footprints MUST equal the calculated target cell
  footprint

#### Scenario: Printer capacity is respected

- **WHEN** a valid plan is generated for any printer X/Y dimensions
- **THEN** no recommended piece may exceed the corresponding printer cell limit or
  physical printer dimension
- **AND** no recommended piece may exceed the existing legal OpenGrid board maximum

### Requirement: OpenGrid print-plan result is accessible and understandable

The OpenGrid planner MUST clearly label target and printer inputs with their axis and
millimetre unit, expose a keyboard-operable calculation action, and present validation
errors next to the relevant fields. A valid result MUST visibly communicate the target
cell footprint, printer cell limit, primary piece size, per-group piece quantities, and
total piece count. The result MUST remain usable without horizontal overflow on narrow
viewports.

#### Scenario: Keyboard user calculates a print plan

- **WHEN** a keyboard user focuses the four planner fields and activates the calculation
  action
- **THEN** the planner MUST calculate without requiring pointer input
- **AND** any validation error MUST be associated with its corresponding field

#### Scenario: User can understand a valid recommendation

- **WHEN** a valid print plan is displayed
- **THEN** the result MUST identify the target as full-cell counts and millimetres
- **AND** it MUST identify the printer limit as full-cell counts and millimetres
- **AND** it MUST list each recommended piece group and the total quantity

#### Scenario: Narrow viewport displays the planner

- **WHEN** the OpenGrid panel is rendered at a narrow mobile viewport
- **THEN** all four inputs, the calculation action, validation feedback, and result
  summary MUST remain reachable and understandable
- **AND** the planner MUST NOT introduce horizontal overflow

### Requirement: Dimension calculator controls for grid components

The system MUST provide a row/column count dimension calculator in the
parameter panels of `hsw-cell` and `modular-grid-base`. Each calculator MUST
expose keyboard-operable inputs labeled `X（mm）` and `Y（mm）`, plus an
action labeled `計算格數`. The X input MUST represent the columns direction
and the Y input MUST represent the rows direction. The OpenGrid panel
separately reuses the shared calculator for its print planner and
target-size calculator; those flows are owned by the OpenGrid requirements
below. Each component's parameter panel embeds the shared calculator
component directly, so adding a future grid component MUST NOT require
changing the shared calculator controls.

#### Scenario: hsw-cell panel exposes dimension inputs

- **WHEN** a user opens the `hsw-cell`（六角蜂巢）parameter panel
- **THEN** the panel MUST show the target X and target Y millimeter inputs
- **AND** it MUST show a `計算格數` action
- **AND** the existing 行數／列數 slider controls MUST remain available

#### Scenario: Modular grid panel exposes dimension inputs

- **WHEN** a user opens the 模組化網格底板 parameter panel
- **THEN** the panel MUST show the target X and target Y millimeter inputs
- **AND** it MUST show a `計算格數` action
- **AND** the existing 行數／列數 slider controls MUST remain available

### Requirement: Calculate the largest legal grid within the target

The system MUST accept finite positive millimeter targets and calculate
integer `columns` for X and `rows` for Y within the component's existing 1–20
range. The generated component bounds MUST be no greater than the
corresponding targets, and the selected counts MUST be the closest legal
counts under that constraint.

For `modular-grid-base`, the calculation MUST use its existing 20 mm cell
width and depth: `columns = min(20, floor(targetX / 20))` and
`rows = min(20, floor(targetY / 20))`.

For `hsw-cell`, the calculation MUST use the canonical cell envelope and
stagger layout rules owned by the `hsw-cell` capability specification: it
MUST choose the greatest legal column count whose width fits `targetX` and
whose single-row envelope also fits `targetY`, then choose the greatest legal
row count whose envelope depth fits `targetY`. This MUST account for the
additional half-row depth required when columns are greater than one.

#### Scenario: Modular grid rounds down independently

- **WHEN** the user enters target X `59` mm and target Y `41` mm in the modular grid calculator
- **THEN** the calculator MUST produce `columns=2` and `rows=2`
- **AND** the resulting 40 × 40 mm grid MUST not exceed either target

#### Scenario: hsw-cell grid accounts for staggered depth

- **WHEN** the user enters `hsw-cell` targets that can contain a 2 × 2 cell envelope but not a third column or row
- **THEN** the calculator MUST produce `columns=2` and `rows=2`
- **AND** it MUST use the cell envelope including the additional half-row depth for multiple columns

#### Scenario: Large targets stop at the component maximum

- **WHEN** either calculator receives targets larger than the maximum supported 20 × 20 grid
- **THEN** it MUST return `columns=20` and `rows=20`
- **AND** the generated bounds MUST remain within the existing component limits

### Requirement: Apply a valid calculation without breaking manual adjustment

The system MUST apply a valid calculation to the current component by updating X-direction `columns` and Y-direction `rows` through the existing parameter flow. Applying a calculation MUST trigger the same validation and preview update behavior as manual parameter input, and MUST leave the existing slider controls usable for subsequent adjustments.

#### Scenario: Valid calculation updates the current hsw-cell grid

- **WHEN** a user enters valid `hsw-cell` target dimensions and activates `計算格數`
- **THEN** the panel MUST update the `hsw-cell` columns and rows to the calculated counts
- **AND** the CAD workspace MUST receive the updated component parameters through the existing input flow

#### Scenario: Valid calculation updates the current modular grid

- **WHEN** a user enters valid modular-grid target dimensions and activates `計算格數`
- **THEN** the panel MUST update the modular-grid columns and rows to the calculated counts
- **AND** the user MUST still be able to change those counts with the existing sliders

### Requirement: Reject unusable target dimensions without changing grid counts

The system MUST show an accessible field-level error and MUST NOT change the current rows or columns when either target is blank, malformed, non-finite, non-positive, or too small to contain one legal cell/envelope in the requested direction. Invalid target input MUST NOT interrupt the CAD workspace or prevent manual grid-count adjustment.

#### Scenario: Target below one modular cell

- **WHEN** a modular-grid target is less than 20 mm on X or Y
- **THEN** the corresponding target field MUST show an error explaining that at least one 20 mm cell is required
- **AND** the current rows and columns MUST remain unchanged

#### Scenario: Target below one hsw-cell envelope

- **WHEN** an `hsw-cell` target cannot contain one legal cell envelope
- **THEN** the corresponding target field MUST show an error
- **AND** the current rows and columns MUST remain unchanged

#### Scenario: Malformed target input

- **WHEN** either target contains blank text, non-numeric text, infinity, zero, or a negative value
- **THEN** the calculator MUST show an accessible error without throwing an uncaught exception
- **AND** the current grid parameters MUST remain unchanged

