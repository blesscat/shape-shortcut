## Purpose

提供沿用官方 28 mm 整格／14 mm 半格 OpenGrid 間距的獨立分隔牆產生器，讓使用者以四方向 0.5 格步進建立可調高度、具底部定位柱與頂部圓角的可匯出 CAD 零件。

## Requirements

### Requirement: 獨立的分隔牆參數契約

The system MUST expose a runtime-validated component with stable `modelId=opengrid-divider`. Its normalized parameters MUST include non-negative `left`, `right`, `up`, and `down` arm counts that are multiples of 0.5 grid, plus an integer `height` in millimetres. `height` MUST be in the inclusive range 2–500 mm. The normalized parameters MUST also include an integer `wallThickness` from 1 through 5 mm and a boolean `honeycombMode`. One full divider grid MUST be 28 mm, one half-grid MUST be 14 mm, and the divider grid definition MUST resolve from the shared official OpenGrid grid contract rather than defining a separate pitch. The divider's planar footprint MUST continue to use its existing 500 mm safety limit independently of the height range. Every directional arm count MUST be no greater than 10 grids, while the combined planar envelope MUST still be checked independently against the 500 mm limit. The default snapshot MUST be `left=1.5`, `right=1.5`, `up=0`, `down=0`, `height=20`, `wallThickness=2`, and `honeycombMode=false`. Validation MUST accept the six-field legacy snapshot without `honeycombMode` and normalize it to `honeycombMode=false`; when the current seven-field key set is presented, a non-boolean `honeycombMode` MUST fail field-specific validation.

#### Scenario: 合法分隔牆參數

- **WHEN** `left`、`right`、`up`、`down` are non-negative 0.5-grid multiples with at least one non-zero direction, and `height` is an integer from 2 through 500 mm with a planar footprint within 500 mm, and `wallThickness` is an integer from 1 through 5 mm, and `honeycombMode` is a boolean or omitted
- **THEN** the component MUST accept the normalized snapshot
- **AND** the generated arm lengths MUST use 28 mm per configured full grid unit and 14 mm per half-grid unit
- **AND** the snapshot MUST remain independent from `modelId=opengrid`

#### Scenario: 不支援的形狀被拒絕

- **WHEN** all four directions are zero, or any directional value is not a 0.5-grid multiple, negative, non-finite, greater than 10 grids, or outside the supported height, planar footprint, or `wallThickness` range, or `honeycombMode` is present but not boolean
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

#### Scenario: 缺少省料模式欄位的既有快照仍有效

- **WHEN** a previously saved snapshot contains only `left`, `right`, `up`, `down`, `height`, and `wallThickness`
- **THEN** validation MUST accept it and normalize `honeycombMode` to `false`

#### Scenario: 省料模式欄位型別錯誤被拒絕

- **WHEN** the seven-field snapshot presents `honeycombMode` as a non-boolean value
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

The generated body MUST be a continuous connected divider whose base support has a 5 mm plan width and whose upper wall has the selected `wallThickness` plan width. For a thinner upper wall, the base support MUST retain the configured geometry-safety ledge at `Z=0` before the planar chamfer begins. The arm centerlines MUST meet at the central junction. The body MUST use the configured height, start at `Z=0`, and remain a single connected solid after the arms and profile transitions are joined. Every non-zero arm MUST end 2.275 mm inward from its nominal grid endpoint along the arm direction; the same retracted endpoint MUST apply to the 5 mm base support, transition profile, and upper wall, leaving a 1 mm target clearance to the normal OpenGrid box inner wall. The central junction MUST remain the construction anchor even when the four arm counts are asymmetric.

#### Scenario: 5 mm 底部與可調上方厚度

- **WHEN** a valid divider snapshot is generated with `wallThickness` less than 5 mm
- **THEN** each active arm MUST measure 5 mm across its base support footprint at `Z=0`
- **AND** the upper wall MUST measure the selected `wallThickness` across its plan profile above the transition
- **AND** the wall top MUST be at the requested height
- **AND** the bottom of the wall MUST be at `Z=0`

#### Scenario: 厚度等於 5 mm 時維持完整牆體

- **WHEN** a valid divider snapshot is generated with `wallThickness=5`
- **THEN** the divider MUST retain a continuous 5 mm plan width through its full wall profile
- **AND** no unnecessary base-to-wall reduction transition MUST be introduced

#### Scenario: 臂端整體內縮

- **WHEN** a valid divider has any non-zero arm direction
- **THEN** the arm's base support, transition, and upper wall MUST share the same 2.275 mm retracted endpoint
- **AND** no part of that arm's terminal profile MAY remain at the old nominal endpoint

#### Scenario: 不對稱臂長保留方向關係

- **WHEN** the four arm counts are not symmetric
- **THEN** the relative lengths and directions around the central junction MUST match the input counts after applying the same active-end retraction
- **AND** the generator MUST NOT silently recenter the junction independently of the generated shape

### Requirement: 單臂中心定位柱上方延續牆體

The generated divider MUST, when exactly one of `left`, `right`, `up`, or `down` is non-zero,
extend its complete profiled wall from the central arm axis
2.5 mm toward the inactive side. This extension MUST include the 5 mm base
support, any 45-degree transition, and the selected upper wall, so the central
5 mm locating peg has wall directly above its center rather than only on the
active side. The active arm endpoint MUST remain at the existing retracted
station, and the result MUST remain one connected solid.

#### Scenario: 四個方向的單臂中心牆體

- **WHEN** exactly one directional count is non-zero, for any of the four
  directions
- **THEN** the complete wall profile MUST cover the central arm axis and extend
  2.5 mm toward the inactive side
- **AND** the central locating peg MUST have divider wall above its center
- **AND** the active endpoint MUST retain the existing 2.275 mm retraction

#### Scenario: 多臂中心接點維持原狀

- **WHEN** two or more directional counts are non-zero
- **THEN** the central junction MUST use the existing multi-arm wall geometry
- **AND** no single-arm-only 2.5 mm extension MAY be added to an inactive side

### Requirement: 依長度自動配置底部定位柱

The generator MUST automatically add shared OpenGrid locating pegs with nominal diameter 5 mm, a total downward span of 3.8 mm from Z=0 to Z=-3.8, and a 0.2 mm bottom perimeter chamfer. It MUST place one peg at the central junction, then consider positions every 28 mm (two 14 mm official half-grids) along each active arm and emit only positions strictly inside that arm. This MUST keep the maximum initial empty run to two half-grid intervals, avoid dense placement, emit repeated coordinates only once, and fuse every peg to the wall so the result remains one connected solid.

#### Scenario: 短分隔牆定位柱

- **WHEN** `left=1`, `right=1`, `up=1`, and `down=1` form a 3×3 cross
- **THEN** the generator MUST create exactly the central peg and no arm peg
- **AND** each peg MUST be 5 mm in diameter, extend 3.8 mm below the wall base, and have a 0.2 mm bottom perimeter chamfer

#### Scenario: 長臂自動增加支撐

- **WHEN** an arm grows beyond another 28 mm interior locating position
- **THEN** that arm MUST gain one additional peg at the next deterministic 28 mm position
- **AND** existing peg positions MUST remain deterministic

#### Scenario: 分支位置去重

- **WHEN** multiple arms meet at the central junction
- **THEN** only one central peg MUST be created at that coordinate
- **AND** no duplicate peg solids may be produced

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

The committed divider MUST expose finite bounds, a non-empty mesh, and a single B-Rep solid. The wall base MUST be at `Z=0` and the complete bounds MUST include the peg bottom at `Z=-3.8` and the actual shortened 5 mm base support envelope. STEP and binary STL exports MUST be generated from the committed divider B-Rep and MUST be non-empty. Export filenames MUST identify the selected wall thickness and MUST retain the existing identity format for the normalized parameter fields, appending `-honeycomb` when the committed snapshot enables the material-saving mode.

#### Scenario: 可預覽的分隔牆

- **WHEN** a valid candidate passes generation
- **THEN** the viewport MUST display the requested shape, selected upper thickness, 45-degree base chamfer, rounded top, locating pegs, and retracted active arm ends
- **AND** the candidate MUST report finite bounds and a non-empty mesh

#### Scenario: STEP 與 STL 匯出

- **WHEN** the user exports a committed divider model
- **THEN** STEP and STL requests MUST use the committed model revision
- **AND** both downloads MUST contain non-empty geometry for the same normalized parameters, including wall thickness and the fixed active-end retraction
- **AND** exports with different wall thicknesses MUST have distinct deterministic filenames

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

The divider component MUST be documented and identified as an OpenGrid accessory that uses the official 28 mm full-grid／14 mm half-grid contract. It MAY remain an independently generated component with `modelId=opengrid-divider`, but it MUST NOT claim geometric interchangeability with a specific `opengrid` or `opengrid-stackable-box` base unless that separate assembly contract is explicitly verified. Changes to the divider contract MUST NOT alter existing `opengrid` or `opengrid-stackable-box` behavior.

#### Scenario: 既有 OpenGrid 行為保持不變

- **WHEN** a user generates the existing `opengrid` or `opengrid-stackable-box` model
- **THEN** its existing model id, parameter validation, geometry route, and export behavior MUST remain unchanged by the divider component

### Requirement: OpenGrid 分隔器 CAD workspace

The system MUST register `opengrid-divider` as an independent model definition and MUST route `/cad/opengrid-divider` to that definition. The route MUST expose only the divider's `left`, `right`, `up`, `down`, `height`, and `wallThickness` controls without a detailed derived geometry summary. Each directional control MUST accept values from 0 through 10 grids in 0.5-grid steps. The height text input MUST accept 2–500 mm and its slider MUST range from 2–200 mm. It MUST NOT show the repeated technical paragraph describing the official grid, height, slider, or footprint limits. It MUST NOT show the official OpenGrid Full/Lite/Heavy, connector, or screw controls.

#### Scenario: 直接開啟分隔器 route

- **WHEN** a user opens `/cad/opengrid-divider`
- **THEN** the page MUST resolve the route to `modelId=opengrid-divider`
- **AND** the first generation MUST use valid saved divider parameters or the divider definition defaults, including `left=1.5`, `right=1.5`, `up=0`, `down=0`, `height=20`, and `wallThickness=2`
- **AND** the Worker MUST dispatch the request to the divider builder

#### Scenario: 分隔器控制面板

- **WHEN** the divider workspace is rendered
- **THEN** it MUST display four directional grid-count controls with minimum 0, maximum 10, and step 0.5, a height text input with maximum 500 mm and a height slider with maximum 200 mm, and a wall-thickness control with values from 1 through 5 mm
- **AND** the thickness control MUST identify 2 mm as the default
- **AND** it MUST NOT display a separate technical summary for the official 28 mm/14 mm footprint, shape, plane dimensions, chamfer, locating pegs, or total Z bounds
- **AND** it MUST NOT display the repeated official-grid/height-limit paragraph
- **AND** it MUST NOT display controls belonging to another model

### Requirement: 分隔器輸入生命週期

The divider workspace MUST use the existing typed generation, debounce, latest-wins, invalidation, candidate, commit, stale-preview, and export gates for its component-specific parameters, including `wallThickness`.

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
