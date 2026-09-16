## ADDED Requirements

### Requirement: 盒內對位模式

When `alignmentMode=box-fit`, the generator MUST derive peg placement and wall stationing from `targetBoxGridsX` and `targetBoxGridsY` instead of the central-junction anchor. Box-fit alignment MUST support only single-arm and straight dividers; L, T, and cross snapshots MUST be rejected with a field diagnostic in box-fit mode while remaining valid in free mode. Each axis MUST derive a 28 mm peg lattice anchored at the nominal box bottom hole column nearest that axis's box center: for a half-integer grid count the anchor MUST be the center column so stations are multiples of 28 mm, and for an integer grid count the anchor MUST be the ±7 columns so stations satisfy |station| ≡ 7 (mod 28). Horizontal-arm pegs MUST sit at X lattice stations strictly inside the horizontal wall span with Y equal to the arm centerline; vertical-arm pegs MUST sit at Y lattice stations strictly inside the vertical wall span with X equal to the arm centerline; shared coordinates MUST be emitted once; and a junction peg MUST be emitted only when the junction point lies on a lattice station of every axis it depends on. Each axis wall span MUST be the directional sum in grids minus (1.275 mm plus `endClearance`) at both nominal grid stations, centered on that axis's box center; for straight dividers the junction offset is (L−R)×14 mm in X and (U−D)×14 mm in Y, and for single-arm dividers the junction sits at the retracted inactive end. The snapshot MUST be invalid when an axis directional sum exceeds its target grid count. For these supported shapes, centering the exported envelope in the target box along the wall axis and placing the transverse centerline on a transverse hole column MUST place every emitted peg on a nominal bottom hole column and leave the selected `endClearance` between each wall end and the box inner wall.

#### Scenario: 半整數格盒中心錨

- **WHEN** a valid divider in `box-fit` mode uses `targetBoxGridsX=4.5`, `targetBoxGridsY=4.5`, `left=2`, and `right=2.5`
- **THEN** the emitted peg stations MUST land on 0, ±28, and ±56 relative to the envelope center so every peg sits on a nominal bottom hole column
- **AND** the junction MUST sit 7 mm off the box center, so no peg is emitted at the junction itself while the alignment info reports the center lattice anchor and center hole
- **AND** the badge MUST state the center anchor and that a center hole column exists

#### Scenario: 整數格盒 ±7 錨

- **WHEN** a valid divider in `box-fit` mode uses `targetBoxGridsX=5`, `targetBoxGridsY=5`, `left=2.5`, and `right=2.5`
- **THEN** the horizontal peg X stations MUST be −63, −35, −7, +7, +35, and +63 relative to the envelope center
- **AND** no peg MUST be emitted at station 0 because the integer grid box has no center column

#### Scenario: 橫向整數格的中心線指引

- **WHEN** `targetBoxGridsX=4.5` and `targetBoxGridsY=5` for a horizontal straight divider
- **THEN** the wall centerline at Y=0 MUST NOT coincide with a Y hole column because the Y axis is integer-grid
- **AND** the workspace badge MUST state that the divider centerline must be placed on a Y-axis ±7 hole column instead of the box center row

#### Scenario: 盒內對位單臂無接點柱

- **WHEN** a valid divider in `box-fit` mode uses `right=4.5` with matching `targetBoxGridsX`
- **THEN** the junction MUST sit at the retracted inactive wall end
- **AND** no junction peg MUST be emitted while mid-wall lattice pegs remain

#### Scenario: 盒內對位僅支援單臂與一字型

- **WHEN** `alignmentMode=box-fit` and the active directions form an L, T, or cross shape
- **THEN** validation MUST reject the snapshot with the straight-arm diagnostic
- **AND** the same directional counts MUST remain accepted when `alignmentMode=free`

#### Scenario: 超過目標格數必須拒絕

- **WHEN** `alignmentMode=box-fit`, `targetBoxGridsX=4.5`, and `left=3` with `right=2`
- **THEN** validation MUST reject the snapshot with a directional-sum diagnostic
- **AND** no CAD generation or export MAY be dispatched for the snapshot

#### Scenario: 對位保證

- **WHEN** a valid box-fit single-arm or straight divider is exported, centered along its wall axis in the box, and placed with its transverse centerline on a transverse hole column
- **THEN** every emitted peg MUST land on a nominal bottom hole column of the box
- **AND** each wall end MUST keep the selected `endClearance` to the box inner wall

## MODIFIED Requirements

### Requirement: 獨立的分隔牆參數契約

The system MUST expose a runtime-validated component with stable `modelId=opengrid-divider`. Its normalized parameters MUST include non-negative `left`, `right`, `up`, and `down` arm counts that are multiples of 0.5 grid, plus an integer `height` in millimetres. `height` MUST be in the inclusive range 2–500 mm. The normalized parameters MUST also include an integer `wallThickness` from 1 through 5 mm. The normalized parameters MUST additionally include an `alignmentMode` of `free` or `box-fit`; `targetBoxGridsX` and `targetBoxGridsY` counts that MUST each be a positive multiple of 0.5 grids no greater than 17.5 grids; an `endClearance` from 0.1 through 2.0 mm in 0.05 mm steps; a `pegLengthMode` of `snap`, `thin-shell`, or `stackable`; and a `pegDiameterIncrement` from −1 through 1 mm in 0.1 mm steps. The locating peg diameter MUST stay the fixed 4.9 mm nominal plus the selected `pegDiameterIncrement`. `targetBoxGridsX`, `targetBoxGridsY`, and `endClearance` MUST be range-validated in both alignment modes and MUST influence placement only when `alignmentMode=box-fit`. One full divider grid MUST be 28 mm, one half-grid MUST be 14 mm, and the divider grid definition MUST resolve from the shared official OpenGrid grid contract rather than defining a separate pitch. The divider's planar footprint MUST continue to use its existing 500 mm safety limit independently of the height range. Every directional arm count MUST be no greater than 10 grids, while the combined planar envelope MUST still be checked independently against the 500 mm limit. The default snapshot MUST be `left=1.5`, `right=1.5`, `up=0`, `down=0`, `height=20`, `wallThickness=2`, `alignmentMode=free`, `targetBoxGridsX=4.5`, `targetBoxGridsY=4.5`, `endClearance=0.15`, `pegLengthMode=snap`, and `pegDiameterIncrement=0`.

#### Scenario: 合法分隔牆參數

- **WHEN** `left`、`right`、`up`、`down` are non-negative 0.5-grid multiples with at least one non-zero direction, and `height` is an integer from 2 through 500 mm with a planar footprint within 500 mm, and `wallThickness` is an integer from 1 through 5 mm, and the alignment, peg length, peg diameter, and peg offset fields satisfy their declared ranges
- **THEN** the component MUST accept the normalized snapshot
- **AND** the generated arm lengths MUST use 28 mm per configured full grid unit and 14 mm per half-grid unit
- **AND** the snapshot MUST remain independent from `modelId=opengrid`

#### Scenario: 不支援的形狀被拒絕

- **WHEN** all four directions are zero, or any directional value is not a 0.5-grid multiple, negative, non-finite, greater than 10 grids, or outside the supported height, planar footprint, or `wallThickness` range
- **THEN** validation MUST fail with field-specific diagnostics
- **AND** the system MUST NOT send the snapshot for CAD generation or export

#### Scenario: Maximum manual height preserves the planar limit

- **WHEN** a valid divider shape has `height=500` and a planar footprint within 500 mm
- **THEN** validation MUST accept the snapshot
- **AND** the wall top MUST be at Z=500 mm
- **AND** a shape whose planar footprint exceeds 500 mm MUST remain invalid even when its height is within 2–500 mm

#### Scenario: 十格臂長上限

- **WHEN** an otherwise valid directional arm uses `count=10`
- **THEN** the arm MUST be accepted and its nominal grid length MUST be 280 mm

#### Scenario: 超過十格的臂格數

- **WHEN** a directional arm uses `count=10.5`
- **THEN** validation MUST reject that arm because the per-direction maximum is 10 grids

#### Scenario: 組合平面上限仍然獨立生效

- **WHEN** `left=10` and `right=10` produce a 560 mm nominal horizontal span
- **THEN** validation MUST reject the snapshot because its planar footprint exceeds 500 mm even though each individual arm is within the 10-grid limit

#### Scenario: 定位柱直徑與偏移範圍

- **WHEN** `pegDiameterIncrement` is outside −1 through 1 mm or not a 0.1 mm step
- **THEN** validation MUST reject the snapshot with a field-specific diagnostic for `pegDiameterIncrement`

#### Scenario: 盒內對位必須提供目標格數

- **WHEN** `targetBoxGridsX` or `targetBoxGridsY` is absent, zero, not a 0.5-grid multiple, or greater than 17.5 grids, or `endClearance` is outside 0.1–2.0 mm or not a 0.05 mm step
- **THEN** validation MUST reject the snapshot with field-specific diagnostics regardless of `alignmentMode`
- **AND** legacy snapshots without these keys MUST still be accepted with the definition defaults filled in

### Requirement: 連續 5 mm 分隔牆幾何

The generated body MUST be a continuous connected divider whose base support has a 5 mm plan width — widening to the effective peg diameter when `pegDiameterIncrement` pushes the peg past 5 mm — and whose upper wall has the selected `wallThickness` plan width. For a thinner upper wall, the base support MUST retain the configured geometry-safety ledge at `Z=0` before the planar chamfer begins. The arm centerlines MUST meet at the central junction. The body MUST use the configured height, start at `Z=0`, and remain a single connected solid after the arms and profile transitions are joined. In `free` alignment mode every non-zero arm MUST end 2.275 mm inward from its nominal grid endpoint along the arm direction; in `box-fit` alignment mode every wall end MUST instead be retracted 1.275 mm plus the selected `endClearance` from its nominal grid station. In both modes the same retracted endpoint MUST apply to the 5 mm base support, transition profile, and upper wall, leaving a 1 mm target clearance to the normal OpenGrid box inner wall in `free` mode and the selected `endClearance` in `box-fit` mode. The central junction MUST remain the construction anchor in `free` mode even when the four arm counts are asymmetric.

#### Scenario: 5 mm 底部與可調上方厚度

- **WHEN** a valid divider snapshot is generated with `wallThickness` less than 5 mm
- **THEN** each active arm MUST measure max(5 mm, effective peg diameter) across its base support footprint at `Z=0`
- **AND** the upper wall MUST measure the selected `wallThickness` across its plan profile above the transition
- **AND** the wall top MUST be at the requested height
- **AND** the bottom of the wall MUST be at `Z=0`

#### Scenario: 厚度等於 5 mm 時維持完整牆體

- **WHEN** a valid divider snapshot is generated with `wallThickness=5`
- **THEN** the divider MUST retain a continuous 5 mm plan width through its full wall profile
- **AND** no unnecessary base-to-wall reduction transition MUST be introduced

#### Scenario: 臂端整體內縮

- **WHEN** a valid divider in `free` alignment mode has any non-zero arm direction
- **THEN** the arm's base support, transition, and upper wall MUST share the same 2.275 mm retracted endpoint
- **AND** no part of that arm's terminal profile MAY remain at the old nominal endpoint

#### Scenario: 盒內對位的可調端部間隙

- **WHEN** a valid divider in `box-fit` alignment mode is generated with `endClearance=0.15` and directional sums equal to the per-axis target grid counts
- **THEN** every wall end MUST sit 1.425 mm inward from its nominal grid station
- **AND** centering the generated envelope along the wall axis in the target box MUST leave 0.15 mm between each wall end and the box inner wall

#### Scenario: 不對稱臂長保留方向關係

- **WHEN** the four arm counts are not symmetric
- **THEN** the relative lengths and directions around the central junction MUST match the input counts after applying the same active-end retraction
- **AND** the generator MUST NOT silently recenter the junction independently of the generated shape

### Requirement: 單臂中心定位柱上方延續牆體

In `free` alignment mode the generated divider MUST, when exactly one of `left`, `right`, `up`, or `down` is non-zero, extend its complete profiled wall from the central arm axis 2.5 mm toward the inactive side. This extension MUST include the 5 mm base support, any 45-degree transition, and the selected upper wall, so the central 5 mm locating peg has wall directly above its center rather than only on the active side. The active arm endpoint MUST remain at the existing retracted station, and the result MUST remain one connected solid. In `box-fit` alignment mode the single-arm wall MUST instead span between the retracted stations of both nominal grid ends without the 2.5 mm inactive-side extension, placing the central junction at the retracted inactive end where no junction peg is emitted.

#### Scenario: 四個方向的單臂中心牆體

- **WHEN** exactly one directional count is non-zero in `free` alignment mode, for any of the four directions
- **THEN** the complete wall profile MUST cover the central arm axis and extend 2.5 mm toward the inactive side
- **AND** the central locating peg MUST have divider wall above its center
- **AND** the active endpoint MUST retain the existing 2.275 mm retraction

#### Scenario: 盒內對位單臂貼牆

- **WHEN** a valid divider in `box-fit` alignment mode uses `right=4.5`, `targetBoxGridsX=4.5`, and `endClearance=0.15`
- **THEN** the wall MUST span 123.15 mm centered on the target box center with both ends retracted 1.425 mm from their nominal grid stations
- **AND** no 2.5 mm inactive-side extension MUST be added
- **AND** the wall MUST remain one connected solid

#### Scenario: 多臂中心接點維持原狀

- **WHEN** two or more directional counts are non-zero
- **THEN** the central junction MUST use the existing multi-arm wall geometry
- **AND** no single-arm-only 2.5 mm extension MAY be added to an inactive side

### Requirement: 依長度自動配置底部定位柱

The generator MUST automatically add shared OpenGrid locating pegs with the fixed 4.9 mm nominal diameter adjusted by the selected `pegDiameterIncrement` (−1 through 1 mm in 0.1 mm steps, effective diameter 4.9 mm + increment), a downward span selected by `pegLengthMode` — 3.8 mm from Z=0 to Z=-3.8 for `snap`, 2 mm for `thin-shell`, and 5 mm for `stackable` — and a 0.2 mm bottom perimeter chamfer on every peg. The diameter increment is a print-fit adjustment of the peg size and MUST NOT participate in alignment-lattice placement or move any peg center. When the effective peg diameter exceeds the 5 mm base support, the base support and its 45-degree transition MUST widen to the effective peg diameter so the peg stays fully supported and printable. In `free` alignment mode the generator MUST place one peg at the central junction, then consider positions every 28 mm (two 14 mm official half-grids) along each active arm and emit only positions strictly inside that arm; this MUST keep the maximum initial empty run to two half-grid intervals, avoid dense placement, emit repeated coordinates only once, and fuse every peg to the wall so the result remains one connected solid.

#### Scenario: 短分隔牆定位柱

- **WHEN** `left=1`, `right=1`, `up=1`, and `down=1` form a 3×3 cross
- **THEN** the generator MUST create exactly the central peg and no arm peg
- **AND** each peg MUST use the selected diameter, extend the selected `pegLengthMode` length below the wall base, and have a 0.2 mm bottom perimeter chamfer

#### Scenario: 長臂自動增加支撐

- **WHEN** an arm grows beyond another 28 mm interior locating position
- **THEN** that arm MUST gain one additional peg at the next deterministic 28 mm position
- **AND** existing peg positions MUST remain deterministic

#### Scenario: 分支位置去重

- **WHEN** multiple arms meet at the central junction
- **THEN** only one central peg MUST be created at that coordinate
- **AND** no duplicate peg solids may be produced

#### Scenario: 預設直徑為 4.9 mm

- **WHEN** a valid divider is generated without overriding `pegDiameterIncrement`
- **THEN** every peg MUST measure 4.9 mm across, leaving 0.15 mm total clearance to the nominal Ø5.05 bottom hole
- **AND** a `pegDiameterIncrement` of 0.1 mm MUST grow every peg to Ø5 mm while the peg centers stay on the lattice
- **AND** a `pegDiameterIncrement` past 0.1 mm MUST widen the base support to the effective peg diameter so the peg never overhangs it

#### Scenario: 定位柱長度對應盒底模式

- **WHEN** `pegLengthMode` is `snap`, `thin-shell`, or `stackable`
- **THEN** the peg bottom MUST reach Z=-3.8, Z=-2, or Z=-5 respectively
- **AND** bounds, previews, and exports MUST reflect the selected downward span

#### Scenario: 直徑增量不改變對位格點

- **WHEN** `pegDiameterIncrement` is non-zero
- **THEN** every peg MUST grow or shrink around its computed lattice center without moving that center
- **AND** the alignment lattice itself MUST remain anchored by the alignment mode rules

### Requirement: 預覽、bounds 與匯出

The committed divider MUST expose finite bounds, a non-empty mesh, and a single B-Rep solid. The wall base MUST be at `Z=0` and the complete bounds MUST include the peg bottom at the selected `pegLengthMode` depth (Z=-3.8, Z=-2, or Z=-5) and the actual shortened 5 mm base support envelope. STEP and binary STL exports MUST be generated from the committed divider B-Rep and MUST be non-empty. Export filenames MUST retain the existing identity format for the normalized directional, thickness, and height fields and MUST extend it with the alignment mode, target box grids, end clearance, peg length mode, and peg diameter increment fields so that snapshots producing different geometry always have distinct deterministic filenames.

#### Scenario: 可預覽的分隔牆

- **WHEN** a valid candidate passes generation
- **THEN** the viewport MUST display the requested shape, selected upper thickness, 45-degree base chamfer, rounded top, locating pegs, and retracted active arm ends
- **AND** the candidate MUST report finite bounds and a non-empty mesh

#### Scenario: STEP 與 STL 匯出

- **WHEN** the user exports a committed divider model
- **THEN** STEP and STL requests MUST use the committed model revision
- **AND** both downloads MUST contain non-empty geometry for the same normalized parameters, including wall thickness, alignment fields, and peg fields
- **AND** exports whose normalized snapshots produce different geometry MUST have distinct deterministic filenames

### Requirement: 不與官方 OpenGrid 相容性混淆

The divider component MUST be documented and identified as an OpenGrid accessory that uses the official 28 mm full-grid／14 mm half-grid contract. It MAY remain an independently generated component with `modelId=opengrid-divider`. In `free` alignment mode it MUST NOT claim geometric interchangeability with a specific `opengrid` or `opengrid-stackable-box` base. In `box-fit` alignment mode the divider MAY claim peg-to-hole alignment with the nominal centered 14 mm bottom hole grid of the `targetBoxGridsX` × `targetBoxGridsY` OpenGrid box, because this change explicitly verifies that assembly contract: each axis anchors the peg lattice at its nearest-to-center hole column, and every emitted peg lands on a nominal hole column when the divider is placed per the stated placement rule. Changes to the divider contract MUST NOT alter existing `opengrid` or `opengrid-stackable-box` behavior.

#### Scenario: 既有 OpenGrid 行為保持不變

- **WHEN** a user generates the existing `opengrid` or `opengrid-stackable-box` model
- **THEN** its existing model id, parameter validation, geometry route, and export behavior MUST remain unchanged by the divider component

#### Scenario: 自由模式不宣稱對位

- **WHEN** the divider is generated in `free` alignment mode
- **THEN** documentation and UI MUST NOT claim peg-to-hole interchangeability with a specific box base

### Requirement: OpenGrid 分隔器 CAD workspace

The system MUST register `opengrid-divider` as an independent model definition and MUST route `/cad/opengrid-divider` to that definition. The route MUST expose the divider's `left`, `right`, `up`, `down`, `height`, and `wallThickness` controls plus the alignment and peg controls: an alignment-mode selector with `free` and `box-fit`, target box grid inputs for X and Y shown in `box-fit` mode, an end clearance input shown in `box-fit` mode, a peg length selector with the three `pegLengthMode` options labelled with their millimetre depths, and a peg diameter increment input. Each directional control MUST accept values from 0 through 10 grids in 0.5-grid steps. The height text input MUST accept 2–500 mm and its slider MUST range from 2–200 mm. In `box-fit` mode the workspace MUST display a read-only alignment badge derived from the target grid counts stating each axis anchor column (center for half-integer grids, ±7 for integer grids), whether a center peg exists, and the required transverse centerline placement when an axis is integer-grid; it MUST warn when an axis grid count is integer so no center hole exists, MUST reject an axis directional sum exceeding its target grid count with a field-specific diagnostic, and MUST reject L, T, and cross shapes in box-fit mode with the straight-arm diagnostic while keeping them available in free mode. It MUST NOT show the repeated technical paragraph describing the official grid, height, slider, or footprint limits. It MUST NOT show the official OpenGrid Full/Lite/Heavy, connector, or screw controls.

#### Scenario: 直接開啟分隔器 route

- **WHEN** a user opens `/cad/opengrid-divider`
- **THEN** the page MUST resolve the route to `modelId=opengrid-divider`
- **AND** the first generation MUST use valid saved divider parameters or the divider definition defaults, including `left=1.5`, `right=1.5`, `up=0`, `down=0`, `height=20`, `wallThickness=2`, `alignmentMode=free`, `pegLengthMode=snap`, and `pegDiameterIncrement=0`
- **AND** the Worker MUST dispatch the request to the divider builder

#### Scenario: 分隔器控制面板

- **WHEN** the divider workspace is rendered
- **THEN** it MUST display four directional grid-count controls with minimum 0, maximum 10, and step 0.5, a height text input with maximum 500 mm and a height slider with maximum 200 mm, and a wall-thickness control with values from 1 through 5 mm
- **AND** it MUST display the alignment mode selector, the peg length selector with three labelled depths, and the peg diameter increment input
- **AND** the thickness control MUST identify 2 mm as the default
- **AND** it MUST NOT display a separate technical summary for the official 28 mm/14 mm footprint, shape, plane dimensions, chamfer, locating pegs, or total Z bounds
- **AND** it MUST NOT display the repeated official-grid/height-limit paragraph
- **AND** it MUST NOT display controls belonging to another model

#### Scenario: 盒內對位徽章與警告

- **WHEN** the user selects `box-fit` with the default straight divider and enters X and Y target grid counts of 4.5
- **THEN** the alignment badge MUST state the center anchor on both axes and that a center hole column with a peg on it exists
- **WHEN** the user enters X and Y target grid counts of 5
- **THEN** the alignment badge MUST state the ±7 anchor on both axes and warn that the box center has no hole so no center peg will be emitted
- **WHEN** the horizontal directional sum exceeds `targetBoxGridsX`
- **THEN** the workspace MUST show a field-specific validation error and MUST send `model.invalidate` instead of `model.generate`
- **WHEN** the user raises an arm in box-fit mode so the shape becomes an L
- **THEN** the workspace MUST show the straight-arm diagnostic and MUST NOT send the snapshot for generation
