# cad-playground Specification

## Purpose

提供 OpenGrid playground 規劃器：讓使用者把多個 CAD component 放進同一個 3D 場景、以 OpenGrid 格子座標擺放、以規劃級 proxy mesh 即時檢視整體配置，並以場景 JSON 檔保存/分享配置、逐片匯出 STEP/STL。

## Requirements

### Requirement: Playground 場景與擺放

The system MUST provide a playground route that holds a scene of multiple component instances. Each instance MUST reference a registered `modelId` with parameters validated by that component's current definition, and a placement of grid cell coordinates (`cellX`, `cellY`) plus a rotation in 90-degree steps. Grid cell coordinates MUST be unitless grid cells on the OpenGrid 28 mm pitch and MUST accept any integer value, including negative values. The playground MUST NOT offer Z-offset or stacking controls; every instance is placed ground-level, and the scene data model MUST carry a `supportedBy` placement field reserved for future stacking that is always `null` in this capability.

The playground MUST offer desktop and wall scene orientations. In desktop orientation the grid plane is horizontal (footprint X/Y, height +Z). In wall orientation the grid is a vertical wall board: columns run along X, rows (`cellY`) run upward along +Z, and pieces mount onto the board with their protrusion toward +Y. Placement, occupancy, and rotation semantics MUST be identical in both orientations.

#### Scenario: Add instance to scene

- **WHEN** the user adds a registered component to the playground
- **THEN** the scene MUST contain a new instance with that component's default parameters at a placement the user can edit
- **AND** the instance MUST appear in the 3D scene at the position its placement describes

#### Scenario: Placement via coordinate input

- **WHEN** the user types integer values into the selected instance's `cellX`/`cellY` inputs and a rotation of 0/90/180/270
- **THEN** the instance's placement MUST update to those values
- **AND** the instance MUST render at the corresponding grid position and orientation

#### Scenario: Unbounded coordinates

- **WHEN** the user enters any integer grid coordinate, including negative values
- **THEN** the placement MUST be accepted and rendered without a boundary error

#### Scenario: Wall orientation mounts pieces vertically

- **WHEN** the user switches the scene to wall orientation
- **THEN** the grid MUST render as a vertical board, rows extending upward along +Z
- **AND** every instance MUST render mounted on the board with its protrusion toward +Y
- **AND** placements, occupancy, and selection MUST be unchanged

### Requirement: 格子佔用驗證

The system MUST prevent two instances in the same scene from occupying overlapping ground footprints. Occupancy MUST be derived from each instance's component footprint in grid cells at its current rotation. A placement that would overlap another instance MUST be rejected with a visible diagnostic and MUST NOT be applied.

#### Scenario: Overlap rejected

- **GIVEN** the scene contains an instance occupying grid cells (0,0) through (1,0)
- **WHEN** the user places another instance overlapping any of those cells
- **THEN** the placement MUST be rejected with a visible diagnostic
- **AND** the overlapping instance MUST keep its previous valid placement

#### Scenario: Adjacent placement accepted

- **WHEN** the user places an instance on grid cells that touch but do not overlap existing instances
- **THEN** the placement MUST be accepted

### Requirement: Instance 數量上限

A single scene MUST hold at most 100 instances. Adding or importing beyond the limit MUST be rejected with an explicit diagnostic; the system MUST NOT silently truncate.

#### Scenario: Import exceeding the cap

- **GIVEN** the scene already contains 100 instances
- **WHEN** the user imports a scene file with more instances
- **THEN** the import MUST be rejected with an explicit capacity diagnostic
- **AND** the current scene MUST remain unchanged

### Requirement: Schema 驅動的 instance 參數編輯

The playground MUST let the user edit the selected instance's parameters through a generic form generated from that component's parameter schema. The form MUST show the same component help text as the component's own workspace panel, falling back to the component's catalog description. Parameter input MUST reuse the component definition's validation; an invalid value MUST show the component's field diagnostic and MUST NOT be sent for generation. Editing parameters MUST NOT change other instances of the same component.

#### Scenario: Edit instance parameters

- **WHEN** the user changes a parameter of the selected instance to a valid value
- **THEN** only that instance MUST regenerate with the new value
- **AND** other instances with unchanged parameters MUST NOT regenerate

#### Scenario: Invalid input blocked

- **WHEN** the user enters a value outside the component's accepted range
- **THEN** the field MUST show a diagnostic
- **AND** no generation request for that instance MUST be sent until the input is valid

#### Scenario: Component help text shown

- **WHEN** an instance is selected
- **THEN** the parameter form MUST show that component's help text (its workspace panel description, or its catalog description when the panel has none)

### Requirement: 規劃級 proxy 渲染

The playground MUST render every instance with a planning-grade preview mesh generated by the CAD Worker from the component's characteristic geometry: the production builders with the material-saving (省料) honeycomb features and OpenConnect interface features turned off, so grid cutouts, openings, stacking rails, and seats remain visible. Shape silhouettes that are cheaper than a full build (hexagonal columns, cylinders) MUST keep their dedicated outline, and the OpenConnect family MUST render as its footprint envelope. The playground MUST NOT display full-detail feature systems (省料 honeycomb, OpenConnect interfaces) or edge-line overlays. Selection or hover MUST be indicated by material color emphasis only. Camera manipulation MUST NOT change the selection: orbiting or zooming keeps the selected instance, and only a direct click on empty space clears it. Instances with identical `modelId` and parameters MUST share one rendered geometry, and a change to one instance's parameters MUST NOT regenerate the shared geometry used by unchanged instances.

#### Scenario: Scene renders without full detail

- **WHEN** a scene containing instances is displayed
- **THEN** every instance MUST render as a proxy mesh without edge-line overlays
- **AND** the viewport MUST remain responsive while the scene is displayed

#### Scenario: Selection emphasis

- **WHEN** the user selects or hovers an instance
- **THEN** that instance MUST be emphasized by material color
- **AND** no additional detailed mesh generation MAY be triggered by selection alone

#### Scenario: Orbiting keeps the selection

- **WHEN** the user drags to orbit or scrolls to zoom after selecting an instance
- **THEN** the instance MUST stay selected
- **AND** only a direct click on empty space MUST clear the selection

#### Scenario: Shared geometry reuse

- **GIVEN** the scene contains multiple instances with identical modelId and parameters
- **WHEN** one of them changes parameters
- **THEN** only the changed instance's mesh MUST regenerate
- **AND** the remaining identical instances MUST continue sharing one geometry

### Requirement: Pending instance 佔位與逐片生成

Generation for scene instances MUST be scheduled so the UI stays responsive. An instance whose proxy mesh is not yet available MUST render as a placeholder occupying its planned footprint, and completed instances MUST render as they finish. A generation failure for one instance MUST be reported on that instance only and MUST NOT prevent or corrupt other instances' meshes or the scene state.

#### Scenario: Placeholder until ready

- **WHEN** an instance is added and its proxy mesh has not finished generating
- **THEN** the scene MUST show a placeholder at the instance's placement
- **AND** the placeholder MUST be replaced by the proxy mesh when generation completes

#### Scenario: Isolated failure

- **GIVEN** multiple instances are generating
- **WHEN** one instance's generation fails
- **THEN** the failure state MUST be shown only for that instance
- **AND** other instances' completed meshes and placements MUST remain unchanged

### Requirement: Per-instance 顏色

Each scene MUST have a primary/secondary palette used as the default for its instances, and each instance MAY override it with its own primary/secondary colors. Missing or invalid instance colors MUST fall back to the scene palette, and an invalid or missing scene palette MUST fall back to the shared default palette. Instance color edits MUST NOT change the browser-wide color preference used by component workspaces, and component workspace palette changes MUST NOT change instances whose colors were explicitly set.

#### Scenario: Per-instance override

- **GIVEN** a scene palette and two instances
- **WHEN** the user sets a distinct primary color on one instance
- **THEN** that instance MUST render with its override color
- **AND** the other instance MUST continue rendering with the scene palette

#### Scenario: Invalid color falls back

- **WHEN** an imported instance contains a malformed color value
- **THEN** that instance MUST render with the scene palette color
- **AND** the import MUST NOT be rejected for the malformed color

#### Scenario: Editor palette independence

- **WHEN** the user changes the browser-wide palette in a component workspace
- **THEN** instance colors in a saved or in-memory scene MUST remain unchanged

### Requirement: 場景 JSON 匯入

The playground MUST import a scene JSON file describing `schemaVersion`, a kind marker, an optional grid system, an optional scene palette, and a list of instances. Import MUST validate each instance against the current registered component definitions, reject the import with an explicit diagnostic when the file is malformed, when any `modelId` is not registered, when required fields are missing, or when the instance limit would be exceeded. Legacy parameter values MUST be normalized using the same versioned normalization rules as the components, and unknown fields MUST be ignored. A rejected import MUST NOT modify the current scene.

#### Scenario: Valid scene import

- **WHEN** the user imports a well-formed scene file whose instances all reference registered components with valid parameters
- **THEN** the scene MUST contain those instances with their placements and colors

#### Scenario: Unknown model rejected

- **WHEN** an imported instance references a `modelId` that is not registered
- **THEN** the import MUST be rejected with a diagnostic naming the unknown model
- **AND** the current scene MUST remain unchanged

#### Scenario: Legacy value normalization

- **GIVEN** an imported instance contains a legacy parameter value that has a defined normalized replacement
- **WHEN** the file is imported
- **THEN** the instance MUST use the normalized value

### Requirement: 場景 JSON 匯出

The playground MUST export the current scene as a JSON file containing the schema version, kind marker, grid system, scene palette, and every instance with its optional `label`, `parameters`, placement, and effective colors. The exported file MUST be importable by the playground again and MUST be accepted as a single-instance settings file when it contains exactly one instance.

#### Scenario: Round trip

- **WHEN** the user exports the current scene and imports the downloaded file into a fresh playground
- **THEN** the scene MUST contain the same instances, placements, and colors

### Requirement: 每片 STEP/STL 匯出清單

The playground MUST export binary STL for individual instances with a committed proxy-independent model revision for that instance's parameters, reusing the component's existing export filename convention. STEP download MUST follow the workspace policy and be offered in development builds only. When an instance has a label, the file name MUST append the sanitized label; otherwise it MUST append the instance index. Instances whose parameters are invalid or whose mesh is not ready MUST NOT offer export.

#### Scenario: Export labeled instance

- **GIVEN** an instance with label `底層左邊` and ready model
- **WHEN** the user downloads its STL
- **THEN** the downloaded file MUST use the component's filename convention suffixed with the label

#### Scenario: Unlabeled collision-free names

- **GIVEN** two instances of the same component with identical parameters and no labels
- **WHEN** the user downloads both
- **THEN** the two files MUST have distinct names derived from their instance index

#### Scenario: Not-ready instance has no export

- **WHEN** an instance has no committed model revision
- **THEN** its export actions MUST be unavailable
