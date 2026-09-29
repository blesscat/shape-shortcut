# cad-playground Specification

## Purpose

提供 OpenGrid playground 規劃器：讓使用者把多個 CAD component 放進同一個 3D 場景、以 OpenGrid 格子座標擺放、以規劃級 proxy mesh 即時檢視整體配置，並以場景 JSON 檔保存/分享配置、逐片匯出 STEP/STL。

## Requirements

### Requirement: Playground 場景與擺放

The system MUST provide a playground route that holds a scene of multiple component instances. Each instance MUST reference a registered `modelId` with parameters validated by that component's current definition, and a placement of grid cell coordinates (`cellX`, `cellY`) plus a rotation in 90-degree steps. Grid cell coordinates MUST be unitless grid cells on the OpenGrid 28 mm pitch and MUST accept any integer value, including negative values. The playground MUST NOT offer Z-offset or stacking controls; every instance is placed ground-level, and the scene data model MUST carry a `supportedBy` placement field reserved for future stacking that is always `null` in this capability.

The playground MUST offer desktop and wall scene orientations. In desktop orientation the grid plane is horizontal (footprint X/Y, height +Z). In wall orientation the grid is a vertical wall board: columns run along X, rows (`cellY`) run upward along +Z, and pieces mount onto the board with their protrusion toward +Y. Placement, occupancy, and rotation semantics MUST be identical in both orientations — coordinate inputs, rotation steps, and conflict rules; footprint extents for wall display plans are specified in the next paragraph.

A component whose authored geometry is in the flat print frame MUST declare a wall display plan so wall orientation renders it in its installed orientation: the OpenConnect interface face against the wall board, the body protruding toward +Y, and storage openings facing upward. The wall display plan MUST be presentation-level only: it MUST change the rendered transform and the wall footprint, and MUST NOT change the generated proxy mesh geometry or any exported STEP/STL/3MF file, which remain in the print frame. In wall orientation the occupied footprint of such a component MUST span its installed-frame horizontal width and installed vertical height (not the print-frame depth), and the mounted piece MUST sit flush on the wall board plane.

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
- **AND** wall-mount components MUST render with their OpenConnect interface face directly against the wall board (no full-scene rotation)
- **AND** placements, occupancy, and selection MUST be unchanged

#### Scenario: OpenConnect wall pieces display installed orientation

- **GIVEN** a scene in wall orientation containing an `opengrid-openconnect-organizer`, `opengrid-openconnect-shelf`, or `opengrid-openconnect-tissue-box` instance
- **WHEN** the instance renders
- **THEN** its OpenConnect interface face MUST be flush against the wall board with the body protruding toward +Y and storage openings facing upward, following the component's installed tilt
- **AND** the rendered geometry MUST be the same proxy mesh used before, only re-transformed

#### Scenario: Wall footprint uses installed extents

- **GIVEN** a wall-orientation scene with an OpenConnect organizer, shelf, or tissue box instance
- **WHEN** occupancy, drag snapping, and the pending placeholder are evaluated for that instance
- **THEN** the footprint MUST span the installed-frame width and installed vertical height in grid cells
- **AND** the footprint MUST NOT use the print-frame body depth as the vertical span

#### Scenario: Display transform does not affect exports

- **GIVEN** an OpenConnect organizer, shelf, or tissue box instance displayed in installed orientation in wall orientation
- **WHEN** the user exports the instance (or the component in its workspace) as STL or 3MF
- **THEN** the exported geometry MUST remain in the flat print frame with the print base at Z=0
- **AND** the exported file name convention MUST be unchanged

#### Scenario: Camera pose persists and can be reset

- **WHEN** the user orbits or zooms the scene and then revisits the playground or switches orientations
- **THEN** the camera pose for that orientation MUST be restored from browser persistence
- **AND** the selected locale MUST provide a visible reset action that restores the orientation's default pose
- **AND** the reset default pose MUST frame the currently rendered grid
- **AND** resetting MUST cancel any remaining camera motion so the default pose stays fixed

#### Scenario: Default wall camera follows the visible grid

- **GIVEN** the wall orientation has no persisted custom camera pose
- **WHEN** the wall grid extent or viewport aspect changes
- **THEN** the camera MUST target the geometric center of the wall grid
- **AND** the camera MUST view the grid from its component-facing +Y side at an oblique horizontal angle with moderate elevation
- **AND** the camera MUST frame the complete wall grid using its current rectangular extent and viewport aspect
- **AND** clicking the viewport without moving the camera MUST keep the default pose eligible for automatic reframing

#### Scenario: Custom wall camera survives layout changes

- **GIVEN** the user has orbited or zoomed to a custom wall camera pose
- **WHEN** the wall grid extent or viewport aspect changes
- **THEN** the custom camera position and target MUST remain unchanged

#### Scenario: Scene grid extent is user-selectable and remembered

- **WHEN** the user sets whole-cell grid extents for X and Y separately (each clamped to 1–200; default 20×20)
- **THEN** the rendered guide grid MUST cover that rectangular extent in both orientations
- **AND** the values MUST be remembered in this browser and restored on the next visit
- **AND** the logical placement space MUST remain unbounded regardless of the rendered extent

#### Scenario: Wall mode offers only the wall-mount system

- **WHEN** the scene is in wall orientation
- **THEN** the component list MUST offer only wall-system components (and components without a system restriction)
- **AND** desk-system instances MUST NOT render in the scene, appear in the instance list, or occupy placement cells
- **WHEN** the scene is in desktop orientation
- **THEN** only desk-system and unrestricted components MUST be offered and rendered

### Requirement: Pointer drag placement

The playground MUST let a user move a ready proxy instance or pending placeholder by starting a primary-pointer drag on that rendered instance. During the drag, the candidate placement MUST follow the pointer on the active orientation's grid plane and snap to integer OpenGrid cells while preserving the instance's existing rotation. Desktop dragging MUST map to the X/Y placement plane, and wall dragging MUST map to the X/Z wall plane with world Z corresponding to `cellY`. A successful drop MUST update the same placement state and coordinate inputs used by typed placement, and placement-only dragging MUST NOT request new CAD geometry.

The playground MUST keep drag preview state transient until drop. It MUST visibly distinguish a candidate that passes occupancy validation from one that overlaps another instance. Releasing a drag MUST commit the snapped candidate placement regardless of whether it overlaps another instance; a committed overlapping placement MUST be flagged with the conflict color and persistent warning instead of being reverted. Cancelling the pointer interaction MUST restore the original placement without committing the candidate.

Pointer gesture routing MUST depend on where the gesture starts. A primary-pointer drag that starts on an instance MUST manipulate that instance without orbiting or changing the persisted camera pose. A primary-pointer drag that starts on empty viewport space MUST retain the existing camera orbit behavior. A primary press and release on an instance without a drag MUST select it without moving it. For touch input, one contact that starts on an instance MUST move it, one contact that starts on empty space MUST orbit, and a second concurrent contact MUST cancel an active instance preview before the multi-touch camera gesture proceeds.

#### Scenario: Drag ready instance on desktop grid

- **GIVEN** a ready instance at a valid desktop placement
- **WHEN** the user drags the rendered instance by one or more grid cells and releases on a valid candidate
- **THEN** the instance MUST remain under the grabbed pointer offset while moving
- **AND** the drop MUST commit the snapped integer `cellX` and `cellY`
- **AND** the placement coordinate inputs MUST show the committed values
- **AND** the camera pose MUST remain unchanged

#### Scenario: Drag instance on wall grid

- **GIVEN** a visible wall-compatible instance in wall orientation
- **WHEN** the user drags it across the wall plane and releases on a valid candidate
- **THEN** horizontal motion MUST update `cellX`
- **AND** vertical world motion MUST update `cellY`
- **AND** the instance MUST remain mounted to the wall plane with its rotation unchanged

#### Scenario: Drag pending placeholder

- **GIVEN** an instance whose proxy mesh is still pending and whose placeholder is visible
- **WHEN** the user drags and drops that placeholder
- **THEN** the new snapped placement MUST be committed
- **AND** the generated proxy MUST appear at that placement when generation completes

#### Scenario: Overlapping drag commits with a warning

- **GIVEN** two placed instances with non-overlapping footprints
- **WHEN** the user drags one instance to a candidate whose footprint overlaps the other and releases
- **THEN** the dropped placement MUST be committed at the snapped cells
- **AND** both overlapping instances MUST render with the conflict color
- **AND** the persistent overlap warning MUST be visible
- **AND** the camera position, target, and persisted pose state MUST remain unchanged

#### Scenario: Cancelled drag restores placement

- **GIVEN** an active instance drag with an uncommitted candidate
- **WHEN** the pointer interaction is cancelled or the active orientation changes
- **THEN** the instance MUST return to its original placement
- **AND** the candidate MUST NOT be written to the scene

#### Scenario: Empty-space drag still orbits

- **GIVEN** an instance is selected
- **WHEN** the user starts a primary-pointer drag on empty viewport space
- **THEN** the camera MUST orbit using the existing controls
- **AND** the selected instance and every instance placement MUST remain unchanged

#### Scenario: Tap selects without moving

- **WHEN** the user presses and releases a rendered instance without performing a drag
- **THEN** that instance MUST become selected
- **AND** its placement and the camera pose MUST remain unchanged

#### Scenario: Second touch hands off to camera controls

- **GIVEN** one touch contact has started an instance drag preview
- **WHEN** a second touch contact begins
- **THEN** the uncommitted instance preview MUST be cancelled and its original placement restored
- **AND** the concurrent contacts MUST be available to the existing multi-touch camera gesture

### Requirement: 格子佔用驗證

The system MUST derive occupancy from each instance's component footprint in grid cells at its current rotation. A placement or parameter change that makes two instances' footprints overlap MUST be applied; overlap MUST NOT cancel, revert, or block any change. While two instances overlap, every instance participating in an overlap MUST render with the conflict (error) color in place of its normal color, and a persistent visible text warning MUST be shown. The conflict color MUST take precedence over selection and hover color emphasis for the instances it marks. The warning state MUST clear automatically for each instance whose overlap is resolved. Overlap is derived state; it MUST NOT be persisted in the scene JSON.

#### Scenario: Overlap applied and flagged

- **GIVEN** the scene contains an instance occupying grid cells (0,0) through (1,0)
- **WHEN** the user places another instance overlapping any of those cells
- **THEN** the placement MUST be applied and remain at the overlapping cells
- **AND** both overlapping instances MUST render with the conflict color
- **AND** a persistent text warning MUST be visible while the overlap exists

#### Scenario: Warning clears when overlap resolves

- **GIVEN** two instances render flagged with the conflict color
- **WHEN** the user moves, shrinks, or deletes one so the footprints no longer overlap
- **THEN** the affected instances MUST return to their normal colors
- **AND** the persistent warning MUST disappear when no overlap remains

#### Scenario: Conflict color takes precedence

- **GIVEN** an instance renders flagged with the conflict color
- **WHEN** the user selects or hovers that instance
- **THEN** the instance MUST keep the conflict color while flagged

#### Scenario: Adjacent placement accepted

- **WHEN** the user places an instance on grid cells that touch but do not overlap existing instances
- **THEN** the placement MUST be accepted with no conflict marking

#### Scenario: Overlap does not block export

- **GIVEN** an overlapping instance with a ready model
- **THEN** its STL and STEP export actions MUST remain available

### Requirement: Instance 數量上限

A single scene MUST hold at most 100 instances. Adding or importing beyond the limit MUST be rejected with an explicit diagnostic; the system MUST NOT silently truncate.

#### Scenario: Import exceeding the cap

- **GIVEN** the scene already contains 100 instances
- **WHEN** the user imports a scene file with more instances
- **THEN** the import MUST be rejected with an explicit capacity diagnostic
- **AND** the current scene MUST remain unchanged

### Requirement: Schema 驅動的 instance 參數編輯

The playground MUST let the user edit the selected instance's parameters through a generic form generated from that component's parameter schema. The form MUST show the same component help text as the component's own workspace panel, falling back to the component's catalog description. Parameter input MUST reuse the component definition's validation; an invalid value MUST show the component's field diagnostic and MUST NOT be sent for generation. Editing parameters MUST NOT change other instances of the same component. A parameter change that grows the instance's footprint into an overlap with another instance MUST be applied and flagged with the conflict color and persistent warning; it MUST NOT be blocked or reverted.

#### Scenario: Edit instance parameters

- **WHEN** the user changes a parameter of the selected instance to a valid value
- **THEN** only that instance MUST regenerate with the new value
- **AND** other instances with unchanged parameters MUST NOT regenerate

#### Scenario: Parameter growth into overlap is flagged

- **GIVEN** two instances whose footprints do not overlap
- **WHEN** the user increases a size parameter of one instance so its footprint overlaps the other
- **THEN** the parameter change MUST be applied and generation MUST proceed
- **AND** both overlapping instances MUST render with the conflict color
- **AND** the persistent overlap warning MUST be visible

#### Scenario: Invalid input blocked

- **WHEN** the user enters a value outside the component's accepted range
- **THEN** the field MUST show a diagnostic
- **AND** no generation request for that instance MUST be sent until the input is valid

#### Scenario: Component help text shown

- **WHEN** an instance is selected
- **THEN** the parameter form MUST show that component's help text (its workspace panel description, or its catalog description when the panel has none)

### Requirement: 規劃級 proxy 渲染

The playground MUST render every instance with a planning-grade preview mesh generated by the CAD Worker from the component's production builders with only the material-saving (省料) honeycomb features turned off, so grid cutouts, openings, stacking rails, seats, and wall-mount interfaces remain visible. The hexagonal column MUST keep its dedicated silhouette, which is cheaper than a full build while matching its exact outline. The playground MUST NOT display edge-line overlays. Selection or hover MUST be indicated by material color emphasis only. Camera manipulation MUST NOT change the selection: orbiting or zooming keeps the selected instance, and only a direct click on empty space clears it. Instances with identical `modelId` and parameters MUST share one rendered geometry, and a change to one instance's parameters MUST NOT regenerate the shared geometry used by unchanged instances.

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

The playground MUST import a scene JSON file describing `schemaVersion`, a kind marker, an optional grid system, an optional scene palette, and a list of instances. Import MUST validate each instance against the current registered component definitions, reject the import with an explicit diagnostic when the file is malformed, when any `modelId` is not registered, when required fields are missing, or when the instance limit would be exceeded. Placement conflicts inside a well-formed file MUST NOT reject the import; imported overlapping instances MUST be flagged with the conflict color and persistent warning. Legacy parameter values MUST be normalized using the same versioned normalization rules as the components, and unknown fields MUST be ignored. A rejected import MUST NOT modify the current scene.

#### Scenario: Valid scene import

- **WHEN** the user imports a well-formed scene file whose instances all reference registered components with valid parameters
- **THEN** the scene MUST contain those instances with their placements and colors

#### Scenario: In-file placement conflicts import with warnings

- **GIVEN** a well-formed scene file whose instances include overlapping placements
- **WHEN** the file is imported
- **THEN** the scene MUST contain those instances at their file placements
- **AND** the overlapping instances MUST render with the conflict color
- **AND** the persistent overlap warning MUST be visible

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
