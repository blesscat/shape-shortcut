## Purpose

提供沿用官方 28 mm 整格／14 mm 半格 OpenGrid 間距的獨立分隔牆產生器，讓使用者以四方向 0.5 格步進建立可調高度、具底部定位柱與頂部圓角的可匯出 CAD 零件。

## Requirements

### Requirement: 獨立的分隔牆參數契約

The system MUST expose a runtime-validated component with stable `modelId=opengrid-divider`. Its normalized parameters MUST include non-negative `left`, `right`, `up`, and `down` arm counts that are multiples of 0.5 grid, plus an integer `height` in millimetres. `height` MUST be in the inclusive range 2–500 mm. The normalized parameters MUST also include an integer `wallThickness` from 1 through 5 mm and a boolean `honeycombMode`. The normalized parameters MUST additionally include an `alignmentMode` of `free` or `box-fit`; a `boxFitWallGrids` wall length that MUST be a positive multiple of 0.5 grids no greater than 17.5 grids; an `endClearance` from 0.1 through 2.0 mm in 0.05 mm steps; a `pegLengthMode` of `snap`, `thin-shell`, or `stackable`; and a `pegDiameterIncrement` from −1 through 1 mm in 0.1 mm steps. The locating peg diameter MUST stay the fixed 4.9 mm nominal plus the selected `pegDiameterIncrement`. `boxFitWallGrids` and `endClearance` MUST be range-validated in both alignment modes and MUST influence placement only when `alignmentMode=box-fit`; the box-fit alignment footprint on the wall axis MUST be the `boxFitWallGrids` length itself, so no separate target box grid counts exist. One full divider grid MUST be 28 mm, one half-grid MUST be 14 mm, and the divider grid definition MUST resolve from the shared official OpenGrid grid contract rather than defining a separate pitch. The divider's planar footprint MUST continue to use its existing 500 mm safety limit independently of the height range. Every directional arm count MUST be no greater than 10 grids, while the combined planar envelope MUST still be checked independently against the 500 mm limit; directional arm counts MUST be range-validated in `free` alignment mode and MUST be ignored by validation in `box-fit` alignment mode so they cannot block acceptance there. The default snapshot MUST be `left=1.5`, `right=1.5`, `up=0`, `down=0`, `height=20`, `wallThickness=2`, `alignmentMode=free`, `boxFitWallGrids=4.5`, `endClearance=0.15`, `pegLengthMode=snap`, `pegDiameterIncrement=0`, and `honeycombMode=false`. Validation MUST accept snapshots without `honeycombMode` and normalize them to `honeycombMode=false`; when the current key set is presented, a non-boolean `honeycombMode` MUST fail field-specific validation. Validation MUST accept snapshots without `boxFitWallGrids`: in `box-fit` mode the value MUST normalize to the greater of the horizontal and vertical directional sums, and in `free` mode it MUST normalize to `4.5`. Validation MUST accept snapshots that still present `targetBoxGridsX` or `targetBoxGridsY` keys from earlier versions and MUST drop both keys from the normalized output.

#### Scenario: 合法分隔牆參數

- **WHEN** `left`、`right`、`up`、`down` are non-negative 0.5-grid multiples with at least one non-zero direction, and `height` is an integer from 2 through 500 mm with a planar footprint within 500 mm, and `wallThickness` is an integer from 1 through 5 mm, and the alignment, wall-grid, peg length, peg diameter, and peg offset fields satisfy their declared ranges, and `honeycombMode` is a boolean or omitted
- **THEN** the component MUST accept the normalized snapshot
- **AND** the generated arm lengths MUST use 28 mm per configured full grid unit and 14 mm per half-grid unit
- **AND** the snapshot MUST remain independent from `modelId=opengrid`

#### Scenario: 不支援的形狀被拒絕

- **WHEN** in `free` alignment mode all four directions are zero, or in `free` alignment mode any directional value is not a 0.5-grid multiple, negative, non-finite, or greater than 10 grids, or `boxFitWallGrids` is not a positive 0.5-grid multiple or is greater than 17.5 grids, or a value is outside the supported height, planar footprint, or `wallThickness` range, or `honeycombMode` is present but not boolean
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

#### Scenario: 盒內對位牆長範圍

- **WHEN** `boxFitWallGrids` is zero, not a 0.5-grid multiple, or greater than 17.5 grids, or `endClearance` is outside 0.1–2.0 mm or not a 0.05 mm step
- **THEN** validation MUST reject the snapshot with field-specific diagnostics regardless of `alignmentMode`

#### Scenario: 缺少牆長欄位的既有快照正規化

- **WHEN** a saved `free` snapshot contains no `boxFitWallGrids`
- **THEN** validation MUST accept it and normalize `boxFitWallGrids` to `4.5`
- **WHEN** a saved `box-fit` snapshot contains no `boxFitWallGrids`
- **THEN** validation MUST normalize `boxFitWallGrids` to the greater of the horizontal and vertical directional sums

#### Scenario: 目標格數鍵被容忍並捨棄

- **WHEN** a saved snapshot still presents `targetBoxGridsX` or `targetBoxGridsY`
- **THEN** validation MUST accept the snapshot and the normalized output MUST NOT contain either key
- **AND** no placement MAY depend on the dropped values

#### Scenario: 缺少省料模式欄位的既有快照仍有效

- **WHEN** a previously saved snapshot contains only `left`, `right`, `up`, `down`, `height`, and `wallThickness`
- **THEN** validation MUST accept it and normalize `honeycombMode` to `false`

#### Scenario: 省料模式欄位型別錯誤被拒絕

- **WHEN** the current snapshot presents `honeycombMode` as a non-boolean value
- **THEN** validation MUST fail with a `honeycombMode` field diagnostic

### Requirement: 依四方向格數判定形狀

The system MUST derive the displayed shape from the non-zero direction counts and MUST NOT require a separate shape selector. Exactly one non-zero direction MUST be classified as a single-arm shape, exactly two opposite non-zero directions MUST be classified as a straight line, exactly two adjacent non-zero directions MUST be classified as an L shape, exactly three non-zero directions MUST be classified as a T shape, and all four non-zero directions MUST be classified as a cross shape.

#### Scenario: 單臂型

- **WHEN** `left=0`, `right=1`, `up=0`, and `down=0`
- **THEN** the UI and normalized geometry metadata MUST identify the result as a single horizontal arm
- **AND** its centerline span MUST be 28 mm

#### Scenario: 一字型

- **WHEN** `left=1`, `right=1`, `up=0`, and `down=0`
- **THEN** the UI and normalized geometry metadata MUST identify the result as a horizontal straight line
- **AND** its centerline span MUST be 56 mm

#### Scenario: T 型

- **WHEN** `left=1`, `right=1`, `up=2`, and `down=0`
- **THEN** the UI and normalized geometry metadata MUST identify the result as a T shape
- **AND** its horizontal centerline span MUST be 56 mm
- **AND** its upward centerline arm length MUST be 56 mm

#### Scenario: L 型與十字型

- **WHEN** exactly two adjacent directions are non-zero
- **THEN** the result MUST be classified as an L shape
- **WHEN** all four directions are non-zero
- **THEN** the result MUST be classified as a cross shape

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

- **WHEN** a valid divider in `box-fit` alignment mode is generated with `endClearance=0.15` and `boxFitWallGrids=4.5`
- **THEN** every wall end MUST sit 1.425 mm inward from its nominal grid station
- **AND** centering the generated envelope along the wall axis in the box MUST leave 0.15 mm between each wall end and the box inner wall

#### Scenario: 不對稱臂長保留方向關係

- **WHEN** the four arm counts are not symmetric
- **THEN** the relative lengths and directions around the central junction MUST match the input counts after applying the same active-end retraction
- **AND** the generator MUST NOT silently recenter the junction independently of the generated shape

### Requirement: 單臂中心定位柱上方延續牆體

In `free` alignment mode the generated divider MUST, when exactly one of `left`, `right`, `up`, or `down` is non-zero, extend its complete profiled wall from the central arm axis 2.5 mm toward the inactive side. This extension MUST include the 5 mm base support, any 45-degree transition, and the selected upper wall, so the central 5 mm locating peg has wall directly above its center rather than only on the active side. The active arm endpoint MUST remain at the existing retracted station, and the result MUST remain one connected solid. In `box-fit` alignment mode the wall is always a single horizontal arm with `left=boxFitWallGrids` and `right=up=down=0`, so the wall MUST span between the retracted stations of both nominal grid ends without the 2.5 mm inactive-side extension, placing the central junction at the retracted inactive end where no junction peg is emitted.

#### Scenario: 四個方向的單臂中心牆體

- **WHEN** exactly one directional count is non-zero in `free` alignment mode, for any of the four directions
- **THEN** the complete wall profile MUST cover the central arm axis and extend 2.5 mm toward the inactive side
- **AND** the central locating peg MUST have divider wall above its center
- **AND** the active endpoint MUST retain the existing 2.275 mm retraction

#### Scenario: 盒內對位單臂貼牆

- **WHEN** a valid divider in `box-fit` alignment mode uses `boxFitWallGrids=4.5` and `endClearance=0.15`
- **THEN** the wall MUST span 123.15 mm centered on the box center with both ends retracted 1.425 mm from their nominal grid stations
- **AND** no 2.5 mm inactive-side extension MUST be added
- **AND** the wall MUST remain one connected solid

#### Scenario: 多臂中心接點維持原狀

- **WHEN** two or more directional counts are non-zero
- **THEN** the central junction MUST use the existing multi-arm wall geometry
- **AND** no single-arm-only 2.5 mm extension MAY be added to an inactive side

### Requirement: 盒內對位模式

When `alignmentMode=box-fit`, the generator MUST derive peg placement and wall stationing from the `boxFitWallGrids` wall length alone instead of the central-junction anchor. Box-fit MUST materialize the wall as a single horizontal arm with `left=boxFitWallGrids` and `right=up=down=0`; the directional arm counts MUST be ignored by box-fit validation and MUST NOT block acceptance, and they MUST remain preserved unchanged so switching back to `free` mode restores the user's arm values. The straight-arm diagnostic MUST NOT be applied in box-fit mode. The wall axis MUST derive a 28 mm peg lattice anchored at the nominal box bottom hole column at the box center: for a half-integer `boxFitWallGrids` the anchor MUST be the center column so stations are multiples of 28 mm, and for an integer `boxFitWallGrids` the anchor MUST be the ±7 columns so stations satisfy |station| ≡ 7 (mod 28). Pegs MUST sit at wall-axis lattice stations strictly inside the horizontal wall span with Y equal to the wall centerline. The wall span MUST be the `boxFitWallGrids` grid length minus (1.275 mm plus `endClearance`) at both nominal grid stations, centered on the box center, with the central junction sitting at the retracted inactive end and no junction peg emitted there. Centering the exported envelope in the box along the wall axis and placing the transverse centerline on a transverse hole column MUST place every emitted peg on a nominal bottom hole column and leave the selected `endClearance` between each wall end and the box inner wall.

#### Scenario: 半整數格盒中心錨

- **WHEN** a valid divider in `box-fit` mode uses `boxFitWallGrids=4.5`
- **THEN** the emitted peg stations MUST land on 0, ±28, and ±56 relative to the envelope center so every peg sits on a nominal bottom hole column
- **AND** the junction MUST sit at the retracted inactive wall end, so no junction peg is emitted while mid-wall lattice pegs remain
- **AND** the badge MUST state the center anchor and that a center hole column exists

#### Scenario: 整數格盒 ±7 錨

- **WHEN** a valid divider in `box-fit` mode uses `boxFitWallGrids=5`
- **THEN** the peg stations MUST be −63, −35, −7, +7, +35, and +63 relative to the envelope center
- **AND** no peg MUST be emitted at station 0 because the integer grid box has no center column

#### Scenario: 盒內對位單臂無接點柱

- **WHEN** a valid divider in `box-fit` mode uses `boxFitWallGrids=4.5`
- **THEN** the junction MUST sit at the retracted inactive wall end
- **AND** no junction peg MUST be emitted while mid-wall lattice pegs remain

#### Scenario: 超出牆長範圍必須拒絕

- **WHEN** `alignmentMode=box-fit` and `boxFitWallGrids=18`
- **THEN** validation MUST reject the snapshot with a field-specific diagnostic on `boxFitWallGrids`
- **AND** no CAD generation or export MAY be dispatched for the snapshot

#### Scenario: 盒內對位忽略方向臂

- **WHEN** `alignmentMode=box-fit` and the preserved directional counts form an L, T, or cross shape
- **THEN** validation MUST accept the snapshot based on `boxFitWallGrids` and MUST NOT apply a straight-arm diagnostic
- **AND** the directional counts MUST remain preserved unchanged and MUST NOT influence the generated geometry

#### Scenario: 切換模式保留四臂

- **WHEN** the user switches the alignment mode from `free` to `box-fit` and back to `free`
- **THEN** the `left`, `right`, `up`, and `down` values MUST be identical to the values before the switch

#### Scenario: 對位保證

- **WHEN** a valid box-fit divider is exported, centered along the wall axis in the box, and placed with its transverse centerline on a transverse hole column
- **THEN** every emitted peg MUST land on a nominal bottom hole column of the box
- **AND** each wall end MUST keep the selected `endClearance` to the box inner wall

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

### Requirement: 頂部圓角

The generator MUST round the upper wall perimeter with a nominal 1 mm fillet. The fillet MUST apply to the wall top edges only; the bottom wall edge MUST remain sharp while each locating peg MUST use the shared 0.2 mm bottom perimeter chamfer. Inputs that cannot accommodate the required fillet or peg chamfer MUST fail validation or generation with a diagnosable error rather than producing a partial shape.

#### Scenario: 頂部圓角存在

- **WHEN** a valid divider is generated
- **THEN** the upper wall perimeter MUST contain the requested 1 mm rounding
- **AND** the exported B-Rep and preview MUST include the rounded geometry

#### Scenario: 圓角幾何無法成立

- **WHEN** the requested height or wall profile cannot support the 1 mm top fillet
- **THEN** the generator MUST return a diagnosable geometry error
- **AND** it MUST NOT commit or export a partial result

### Requirement: 側邊圓角

The generator MUST round the vertical side edges of the divider with the existing nominal 2.5 mm profile where the local 5 mm base supports it. On thinner upper walls, the side-rounding radius MUST be limited to a geometrically stable value no greater than half of the local wall thickness. The side rounding MUST coexist with the separate 1 mm upper-perimeter fillet, the 45-degree base chamfer, and the shared locating-peg chamfers. The bottom wall edge MUST remain sharp.

#### Scenario: 薄牆側邊圓角穩定

- **WHEN** a valid divider with `wallThickness` from 1 through 5 mm is generated
- **THEN** the upper wall side profile MUST remain valid and connected
- **AND** its side-rounding radius MUST NOT exceed the local upper wall half-width
- **AND** the 5 mm base support MUST retain the largest stable side rounding allowed by its profile

#### Scenario: 圓角與頂部輪廓共存

- **WHEN** a valid divider with an active arm is generated
- **THEN** the side rounding MUST coexist with the separate 1 mm upper-perimeter rounding and the base chamfer
- **AND** the bottom wall edge MUST remain sharp while each locating peg retains its 0.2 mm bottom perimeter chamfer

### Requirement: 45 度過渡斜邊端部圓角

When the selected upper wall is thinner than the 5 mm base support, the generator MUST also round the short profile edges at both ends of each active arm where the 45-degree transition meets the arm end face. The nominal transition-edge radius MUST be 0.4 mm and MUST be capped at the smaller of half the selected upper wall thickness and half the actual transition rise. The transition-edge rounding MUST use the same cleaned-up local fillet operation as the other profile rounds, MUST remain a valid part of the single solid, and MUST be omitted when `wallThickness=5` because no transition edge exists.

#### Scenario: 2 mm 過渡斜邊一起圓角

- **WHEN** a valid divider is generated with `wallThickness=2`
- **THEN** both short 45-degree transition edges at each active arm end MUST produce cylindrical rounding faces
- **AND** the horizontal and vertical arm orientations MUST receive the same edge treatment
- **AND** the transition rounding MUST coexist with the planar 45-degree chamfer, upper-perimeter rounding, and locating pegs in one valid solid

#### Scenario: 薄牆與最小高度的過渡圓角限制

- **WHEN** a valid divider uses `wallThickness` from 1 through 4 mm or the minimum supported height
- **THEN** the transition-edge radius MUST be reduced when needed to fit the local transition geometry
- **AND** generation MUST remain a valid single solid with finite mesh output

#### Scenario: 5 mm 上牆沒有過渡圓角

- **WHEN** a valid divider is generated with `wallThickness=5`
- **THEN** no transition-edge fillet MUST be requested or reported because the profile remains continuously 5 mm wide

### Requirement: 預覽、bounds 與匯出

The committed divider MUST expose finite bounds, a non-empty mesh, and a single B-Rep solid. The wall base MUST be at `Z=0` and the complete bounds MUST include the peg bottom at the selected `pegLengthMode` depth (Z=-3.8, Z=-2, or Z=-5) and the actual shortened 5 mm base support envelope. STEP and binary STL exports MUST be generated from the committed divider B-Rep and MUST be non-empty. Export filenames MUST retain the existing identity format for the normalized directional, thickness, and height fields and MUST extend it with the alignment mode, end clearance, peg length mode, and peg diameter increment fields, appending `-honeycomb` when the committed snapshot enables the material-saving mode, so that snapshots producing different geometry always have distinct deterministic filenames.

#### Scenario: 可預覽的分隔牆

- **WHEN** a valid candidate passes generation
- **THEN** the viewport MUST display the requested shape, selected upper thickness, 45-degree base chamfer, rounded top, locating pegs, and retracted active arm ends
- **AND** the candidate MUST report finite bounds and a non-empty mesh

#### Scenario: STEP 與 STL 匯出

- **WHEN** the user exports a committed divider model
- **THEN** STEP and STL requests MUST use the committed model revision
- **AND** both downloads MUST contain non-empty geometry for the same normalized parameters, including wall thickness, alignment fields, and peg fields
- **AND** exports whose normalized snapshots produce different geometry MUST have distinct deterministic filenames

#### Scenario: 省料模式檔名後綴

- **WHEN** the user exports a committed divider snapshot with `honeycombMode=true`
- **THEN** the STEP and STL filenames MUST append `-honeycomb` before the extension while keeping the existing parameter identity fields
- **AND** the same snapshot with `honeycombMode=false` MUST keep the pre-existing filename without the suffix

### Requirement: 底部 45 度斜角過渡

When the selected upper wall is thinner than the 5 mm base support, the generated profile MUST retain the configured geometry-safety ledge at `Z=0` and then use a symmetric planar 45-degree chamfer rather than a rounded shoulder or an abrupt sharp step. The chamfer MUST use equal horizontal and vertical runs whenever the requested height permits; if the minimum height leaves insufficient room, its vertical rise MAY be capped at `height - 2 * geometrySafetyMargin` while preserving the selected upper wall at the top. When the selected upper wall is 5 mm, the chamfer and the extra ledge MUST be omitted.

#### Scenario: 2 mm 上牆的 45 度斜角過渡

- **WHEN** a valid divider is generated with `wallThickness=2`
- **THEN** the 5 mm base support MUST blend into the 2 mm upper wall through a symmetric 45-degree planar chamfer
- **AND** the main transition surface MUST remain planar rather than becoming a rounded shoulder; only its short end edges receive the separate bounded fillet
- **AND** the generated result MUST remain one valid solid

#### Scenario: 極薄牆的穩定斜角

- **WHEN** a valid divider is generated with `wallThickness=1`
- **THEN** the transition MUST use a stable 45-degree profile whenever the requested height permits, without self-intersection or a zero-thickness region, after the geometry-safety ledge
- **AND** the generator MUST return a diagnostic geometry error rather than a partial result if no valid chamfered profile can be constructed

#### Scenario: 5 mm 上牆不產生多餘斜角

- **WHEN** a valid divider is generated with `wallThickness=5`
- **THEN** the base and upper wall MUST remain a continuous 5 mm profile
- **AND** no separate chamfer feature MUST be added

### Requirement: 不與官方 OpenGrid 相容性混淆

The divider component MUST be documented and identified as an OpenGrid accessory that uses the official 28 mm full-grid／14 mm half-grid contract. It MAY remain an independently generated component with `modelId=opengrid-divider`. In `free` alignment mode it MUST NOT claim geometric interchangeability with a specific `opengrid` or `opengrid-stackable-box` base. In `box-fit` alignment mode the divider MAY claim peg-to-hole alignment with the nominal centered 14 mm bottom hole grid of a `boxFitWallGrids`-grid OpenGrid box, because this change explicitly verifies that assembly contract: the wall axis anchors the peg lattice at the center hole column for half-integer grid counts and at the ±7 hole columns for integer grid counts, and every emitted peg lands on a nominal hole column when the divider is placed per the stated placement rule. Changes to the divider contract MUST NOT alter existing `opengrid` or `opengrid-stackable-box` behavior.

#### Scenario: 既有 OpenGrid 行為保持不變

- **WHEN** a user generates the existing `opengrid` or `opengrid-stackable-box` model
- **THEN** its existing model id, parameter validation, geometry route, and export behavior MUST remain unchanged by the divider component

#### Scenario: 自由模式不宣稱對位

- **WHEN** the divider is generated in `free` alignment mode
- **THEN** documentation and UI MUST NOT claim peg-to-hole interchangeability with a specific box base

### Requirement: OpenGrid 分隔器 CAD workspace

The system MUST register `opengrid-divider` as an independent model definition and MUST route `/cad/opengrid-divider` to that definition. The route MUST expose an alignment-mode selector with `free` and `box-fit` as the first control group after the material-saving toggle, and the peg controls: a peg length selector with the three `pegLengthMode` options labelled with their millimetre depths, and a peg diameter increment input. In `free` mode the route MUST additionally expose the divider's `left`, `right`, `up`, and `down` directional controls accepting values from 0 through 10 grids in 0.5-grid steps. The height text input MUST accept 2–500 mm and its slider MUST range from 2–200 mm, and the wall-thickness control MUST range from 1 through 5 mm; both MUST stay visible in both alignment modes. In `box-fit` mode the route MUST hide the four directional controls and MUST instead expose a wall-grid-length input labelled without an axis suffix, with 0.5-grid steps from 0.5 through 17.5 grids, alongside an end clearance input; it MUST NOT display target box grid inputs. In `box-fit` mode the workspace MUST display a read-only alignment badge derived from the wall grid length stating the anchor column (center for half-integer grids, ±7 for integer grids) and whether a center peg exists; it MUST warn when the wall grid length is integer so no center hole exists. Selecting `box-fit` MUST NOT alter the directional counts, MUST NOT require them to pass validation, and MUST NOT surface a straight-arm diagnostic. It MUST NOT show the repeated technical paragraph describing the official grid, height, slider, or footprint limits. It MUST NOT show the official OpenGrid Full/Lite/Heavy, connector, or screw controls.

#### Scenario: 直接開啟分隔器 route

- **WHEN** a user opens `/cad/opengrid-divider`
- **THEN** the page MUST resolve the route to `modelId=opengrid-divider`
- **AND** the first generation MUST use valid saved divider parameters or the divider definition defaults, including `left=1.5`, `right=1.5`, `up=0`, `down=0`, `height=20`, `wallThickness=2`, `alignmentMode=free`, `boxFitWallGrids=4.5`, `pegLengthMode=snap`, and `pegDiameterIncrement=0`
- **AND** the Worker MUST dispatch the request to the divider builder

#### Scenario: 分隔器控制面板

- **WHEN** the divider workspace is rendered
- **THEN** it MUST display the alignment mode selector as the first control group after the material-saving toggle
- **AND** in `free` mode it MUST display four directional grid-count controls with minimum 0, maximum 10, and step 0.5, a height text input with maximum 500 mm and a height slider with maximum 200 mm, and a wall-thickness control with values from 1 through 5 mm
- **AND** in `box-fit` mode the four directional controls MUST be hidden and a wall-grid-length input with 0.5-grid steps from 0.5 through 17.5 grids MUST be displayed alongside the end clearance input
- **AND** the height and wall-thickness controls MUST remain visible in both alignment modes
- **AND** it MUST NOT display target box grid inputs in either alignment mode
- **AND** it MUST display the peg length selector with three labelled depths and the peg diameter increment input
- **AND** the thickness control MUST identify 2 mm as the default
- **AND** it MUST NOT display a separate technical summary for the official 28 mm/14 mm footprint, shape, plane dimensions, chamfer, locating pegs, or total Z bounds
- **AND** it MUST NOT display the repeated official-grid/height-limit paragraph
- **AND** it MUST NOT display controls belonging to another model

#### Scenario: 盒內對位徽章與警告

- **WHEN** the user selects `box-fit` with the default wall grid length of 4.5
- **THEN** the alignment badge MUST state the center anchor and that a center hole column with a peg on it exists
- **WHEN** the user enters a wall grid length of 5
- **THEN** the alignment badge MUST state the ±7 anchor and warn that the box center has no hole so no center peg will be emitted
- **WHEN** the user enters a wall grid length outside 0.5 through 17.5 grids
- **THEN** the workspace MUST show a field-specific validation error and MUST send `model.invalidate` instead of `model.generate`

#### Scenario: 切換對位模式不產生直臂診斷

- **WHEN** the user selects `box-fit` while the preserved directional counts form an L, T, or cross shape
- **THEN** the directional controls MUST be hidden, the wall MUST generate from the wall grid length, and no straight-arm diagnostic MAY appear
- **WHEN** the user switches back to `free`
- **THEN** the directional controls MUST reappear with the preserved counts unchanged

### Requirement: 分隔器輸入生命週期

The divider workspace MUST use the existing typed generation, debounce, latest-wins, invalidation, candidate, commit, stale-preview, and export gates for its component-specific parameters, including `wallThickness`. The workspace raw panel-state parse MUST carry the boolean material-saving flag into the typed snapshot: a raw `honeycombMode` of `'true'` or `'false'` MUST parse to the corresponding boolean in the `model.generate` snapshot, and the parse MUST NOT silently normalize a presented `honeycombMode` key to `false`.

#### Scenario: 合法輸入建模

- **WHEN** a complete divider snapshot passes validation and input debounce settles
- **THEN** the workspace MUST send a `model.generate` request with `modelId=opengrid-divider`
- **AND** only the latest valid candidate MUST be eligible for commit
- **AND** exports MUST become available only after a matching committed revision exists

#### Scenario: 非法輸入失效化

- **WHEN** any directional count, height, or `wallThickness` is empty, fractional where integer input is required, non-finite, negative, or outside its supported range
- **THEN** the workspace MUST show a field-specific validation error
- **AND** it MUST send `model.invalidate` instead of `model.generate`
- **AND** export MUST remain disabled for the invalid or stale generation

#### Scenario: 省料模式開關進入生成快照

- **WHEN** the user enables the material-saving toggle and the input debounce settles
- **THEN** the next `model.generate` snapshot MUST carry `honeycombMode=true`
- **AND** the generated geometry MUST follow the 分隔牆省料模式幾何（六角鏤空）requirement
- **WHEN** the user disables the toggle
- **THEN** the next `model.generate` snapshot MUST carry `honeycombMode=false` and the geometry MUST return to the solid divider

#### Scenario: 省料模式原始值非法

- **WHEN** the raw panel state presents `honeycombMode` as a value other than `'true'` or `'false'`
- **THEN** the workspace MUST reject the input with a `honeycombMode` field-scoped diagnostic
- **AND** it MUST send `model.invalidate` instead of `model.generate`
- **AND** export MUST remain disabled for the invalid generation

### Requirement: 分隔牆省料模式幾何（六角鏤空）

The divider MUST support an optional material-saving mode that removes hexagonal voids through the upper straight wall thickness using the shared OpenGrid honeycomb lattice (3 mm hexagon inscribed radius, 2.5 mm rib width) resolved from the shared honeycomb contract rather than divider-specific lattice dimensions. Voids MUST be confined to the upper straight wall region above the 45-degree transition chamfer: the 5 mm base support, the transition chamfer, the top rounding band, and the arm end retraction zones MUST remain solid as configured frames. The lattice MUST be clipped to those frames so no partial cell leaves a wall edge below the frame width. With `honeycombMode=false` the generated geometry MUST be identical to the pre-existing divider behavior, and the committed body MUST remain a single connected solid in both modes.

#### Scenario: 開啟省料模式的長牆

- **WHEN** a valid divider with `honeycombMode=true` and sufficient height is generated
- **THEN** the upper straight wall MUST contain hexagonal voids cut through the wall thickness on the shared lattice
- **AND** the base support, transition chamfer, top rounding band, and arm end frames MUST remain solid
- **AND** the committed body MUST remain a single connected solid

#### Scenario: 關閉省料模式維持原幾何

- **WHEN** a valid divider with `honeycombMode=false` is generated
- **THEN** the generated geometry MUST match the pre-existing solid divider for the same directional parameters, height, and wall thickness

#### Scenario: 矮牆省料模式不產生格子

- **WHEN** a divider height is too small to fit a framed lattice row above the transition chamfer with `honeycombMode=true`
- **THEN** generation MUST still produce the valid solid divider without honeycomb voids rather than failing

### Requirement: 分隔牆省料模式 UI 門檻與保護上限

The divider panel MUST expose a material-saving toggle labelled as the shared saving-mode control with a beta hint and, when enabled, a cell-count estimate. The unchecked toggle MUST be disabled with an explanation while the current height cannot fit the framed lattice above the transition chamfer, while an already-enabled toggle MUST remain usable to turn the mode off. A divider-specific cell ceiling (3000 cells) MUST bound the estimated lattice; while the estimate exceeds the ceiling the unchecked toggle MUST be disabled with a reduce-size hint instead of allowing an over-limit build to start. If a snapshot is generated with `honeycombMode=true` while its estimate exceeds the ceiling, the Worker-side guard MUST reject generation with a localized diagnostic and MUST NOT commit a candidate.

#### Scenario: 面板開關與格數預估

- **WHEN** the divider panel is rendered and the current estimate is within the ceiling
- **THEN** the saving-mode toggle MUST be available and default to off
- **AND** enabling it MUST show the beta hint and the estimated cell count

#### Scenario: 矮牆停用開關

- **WHEN** the current height cannot fit the framed lattice above the transition chamfer and the saving mode is not already enabled
- **THEN** the unchecked toggle MUST be disabled with an explanation instead of being enablable without effect
- **AND** an already-enabled toggle MUST remain usable so the mode can be turned off

#### Scenario: 超過格數上限時停用開關

- **WHEN** the estimated honeycomb cell count for the current size exceeds the divider ceiling and the saving mode is not already enabled
- **THEN** the unchecked toggle MUST be disabled with a localized hint to reduce the size
- **AND** a saving-mode generation request MUST NOT be startable from the panel for that size

#### Scenario: 已開啟後放大尺寸的建模防護

- **WHEN** a divider snapshot with `honeycombMode=true` exceeds the cell ceiling at generation time
- **THEN** the Worker MUST fail generation with a localized diagnostic naming the saving-mode limit
- **AND** no candidate MUST be committed for that request

### Requirement: 分隔牆省料模式切削進度

While divider material-saving cutting is in progress, the Worker MUST report cut progress in honeycomb cells using the existing boolean-operation progress reporting, with the estimated cell count as the panel total, consistent with the other saving-mode components.

#### Scenario: 以格為單位回報切削進度

- **WHEN** a divider with `honeycombMode=true` is being generated
- **THEN** the honeycomb cutting stage MUST report completed and total progress in cells
- **AND** the panel estimate MUST match the reported total

### Requirement: 雙色頂部飾圈分割

divider MUST 接受獨立的布林參數 `topRimEnabled`（預設 `false`）與整數參數
`topRimHeight`（預設 `2`，有效範圍 `1..floor(height / 2)`）。即使
`topRimEnabled` 為 `false`，`topRimHeight` MUST 仍正規化為有效整數；範圍限制
MUST 在飾圈啟用時強制執行，違反範圍的值 MUST 被以欄位專屬錯誤拒絕，且不得
觸發 B-Rep 生成。面板 MUST
提供 `雙色飾圈` 開關，且關閉時隱藏 `topRimHeight` 控制項。飾圈 MUST 僅是
視覺分割：牆體幾何、定位柱、蜂窩孔、圓角與所有既有品質規則在未切割實體上
MUST 保持不變。

當 `topRimEnabled` 為 `true` 時，建構管線 MUST 在水平分割面
$Z = \text{height} - \text{topRimHeight}$ 將最終幾何分割為互補的兩個 part：
佔據平面以下全部體積的 `body`，以及佔據平面以上全部體積的 `rim`。未切割的
host shape MUST 作為品質 shape 並滿足所有既有 divider 品質規則。兩個 part
MUST 是非空的有效 B-Rep 實體，其組合必須重現完整牆體幾何，並在分割邊界兩側
保留一致的牆體與定位柱輪廓。Worker candidate 與 committed 紀錄 MUST 以
`body` 與 `rim` 兩個 `partMeshes` 輸出兩個 part。

#### Scenario: 飾圈控制項與預設值

- **WHEN** divider 面板在沒有已持久化飾圈值的情況下初始化
- **THEN** `topRimEnabled` MUST 預設為 `false` 且 `topRimHeight` MUST 預設
  為 `2`
- **AND** `雙色飾圈` 開關 MUST 未勾選且 `topRimHeight` 控制項隱藏
- **AND** 勾選後 MUST 顯示 `topRimHeight` 控制項，範圍為
  `1` 到 `floor(height / 2)`

#### Scenario: 飾圈高度邊界驗證

- **WHEN** `topRimEnabled` 為 `true` 且 `topRimHeight` 小於 `1` 或大於
  `floor(height / 2)`
- **THEN** 參數驗證 MUST 在 `topRimHeight` 回傳欄位專屬錯誤
- **AND** 該無效參數組合 MUST NOT 觸發 B-Rep 生成

#### Scenario: 分割產生互補且非空的 parts

- **WHEN** `topRimEnabled` 為 `true` 且 divider 完成建構
- **THEN** 建構輸出 MUST 包含名稱為 `body` 與 `rim` 的 `parts`
- **AND** `body` 的包圍盒 $Z$ 最大值 MUST 在容差內等於
  $\text{height} - \text{topRimHeight}$
- **AND** `rim` 的包圍盒 $Z$ 最小值 MUST 在容差內等於
  $\text{height} - \text{topRimHeight}$
- **AND** `body` 與 `rim` 的體積總和 MUST 在 0.1% 內等於未切割品質 shape
  的體積

#### Scenario: 飾圈不改變單一實體幾何

- **WHEN** 相同參數分別以 `topRimEnabled=false` 與 `topRimEnabled=true`
  生成
- **THEN** 兩次生成的未切割品質 shape 之包圍盒與體積 MUST 在容差內一致
- **AND** 所有既有 divider 品質閘門 MUST 在兩次生成中皆通過

#### Scenario: 確定性的雙色匯出檔名

- **WHEN** `topRimEnabled` 為 `true`，model definition MUST 回報副檔名前以
  `-rim<topRimHeight>` 結尾的 3MF 檔名
- **AND** 當 `topRimEnabled` 為 `false`，model definition MUST 回報無 3MF
  檔名，且 STL 檔名 MUST 與現有指紋完全一致
