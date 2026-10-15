# cad-playground Specification

## Purpose

提供 OpenGrid playground 規劃器：讓使用者把多個 CAD component 放進同一個 3D 場景、以 OpenGrid 格子座標擺放、以規劃級 proxy mesh 即時檢視整體配置，並以場景 JSON 檔保存/分享配置、逐片匯出 STEP/STL。
## Requirements
### Requirement: Playground 場景與擺放

The system MUST provide a playground route that holds a scene of multiple component instances. Each instance MUST reference a registered `modelId` with parameters validated by that component's current definition, and two independent placements — a desktop placement and a wall placement — each of grid cell coordinates (`cellX`, `cellY`) plus a rotation in 90-degree steps. Grid cell coordinates MUST be unitless grid cells on the OpenGrid 28 mm pitch and MUST accept any integer value, including negative values. In desktop orientation, an instance whose footprint overlaps other instances' footprints MUST automatically stack on top of them when the two instances' stacking interfaces are compatible — cylinders only on a cylinder of the same inner diameter, and stackable boxes and organizer boxes only when the upper instance's bottom interface and the lower instance's top interface are both in stacking mode; its rendered base Z in mm MUST equal the compatible supporting instance's stacking datum minus its seating drop — the interface engagement both mated pieces share, so seated pieces visually interlock and their interface height counts once — plus a small render gap; where several compatible instances overlap, the greatest resulting base Z wins, and an instance overlapping nothing MUST stay at Z=0. An overlapping pair whose stacking interfaces are incompatible MUST NOT stack: both instances stay at their current level and are flagged as a conflict per the grid occupancy requirement. All models without a stacking interface can neither receive nor seat pieces. Stacking Z MUST be derived state computed from instance order and model heights; it MUST NOT be authored per instance, and the scene MUST NOT offer a manual Z-offset input. The scene data model MUST carry a `supportedBy` placement field reserved for future stacking that is always `null` in this capability. Instance array order MUST be the deterministic stacking order: re-importing a scene file MUST reproduce the same stacked Z for every instance.

The playground MUST offer desktop and wall scene orientations. In desktop orientation the grid plane is horizontal (footprint X/Y, height +Z). In wall orientation the grid is a vertical wall board: columns run along X, rows (`cellY`) run upward along +Z, and pieces mount onto the board with their protrusion toward +Y. Each orientation MUST render and edit only its own placement: the desktop orientation renders from the desktop placement and the wall orientation renders from the wall placement, and a placement edit in one orientation MUST NOT change the instance's position or rotation in the other. Automatic Z stacking and height-limit evaluation are desktop-orientation behaviors: wall orientation keeps every instance flush on the wall board, performs no Z stacking, and its occupancy and conflict rules stay two-dimensional — except that an overlapping pair whose desktop stacking interfaces are compatible remains conflict-free on the wall board, and instances the active orientation does not display never participate in occupancy, conflicts, or height evaluation.

A component whose authored geometry is in the flat print frame MUST declare a wall display plan so wall orientation renders it in its installed orientation: the OpenConnect interface face against the wall board, the body protruding toward +Y, and storage openings facing upward. The wall display plan MUST be presentation-level only: it MUST change the rendered transform and the wall footprint, and MUST NOT change the generated proxy mesh geometry or any exported STEP/STL/3MF file, which remain in the print frame. The plan MUST compose the component's full print-to-installed transform — rotation plus any installed-frame translation — so the mounted piece sits flush on the wall board plane. In wall orientation the occupied footprint of such a component MUST span its installed-frame horizontal width and installed vertical height (not the print-frame depth). When the plan declares the component's OpenConnect socket cell origins, the wall placement MUST anchor on the socket grid — the socket cell span's minimum corner at the placement cell — so every socket registers with a wall board cell, the body may overhang the socket span, and occupancy MUST follow the socket-anchored mounted body footprint.

#### Scenario: Add instance to scene

- **WHEN** the user adds a registered component to the playground
- **THEN** the scene MUST contain a new instance with that component's default parameters and an independently assigned desktop placement and wall placement
- **AND** the instance MUST appear in the 3D scene at the position the active orientation's placement describes

#### Scenario: Rotation input edits the active orientation

- **WHEN** the user sets the selected instance's rotation input to 0/90/180/270
- **THEN** the active orientation's placement MUST update to that rotation
- **AND** the instance MUST render at the corresponding orientation in the active scene orientation

#### Scenario: Unbounded coordinates

- **WHEN** an instance is dragged or imported at any integer grid coordinate, including negative values
- **THEN** the placement MUST be accepted and rendered without a boundary error

#### Scenario: Overlapping desktop placement stacks on top

- **GIVEN** the desktop scene contains an instance whose footprint occupies grid cells
- **WHEN** the user places another instance whose footprint overlaps those cells
- **THEN** the placement MUST be applied and the new instance MUST render resting on the lower instance's top with a small fixed clearance
- **AND** no conflict color or overlap warning MUST appear for the stacked pair

#### Scenario: Stack order is deterministic across re-import

- **GIVEN** a saved scene file whose instances stack in overlapping footprints
- **WHEN** the file is imported into a fresh playground
- **THEN** every instance MUST render at the same stacked Z it had when exported

#### Scenario: Removing a lower instance drops the upper stack

- **GIVEN** three desktop instances stacked in the same overlapping footprint
- **WHEN** the bottom instance is deleted
- **THEN** the remaining instances MUST re-derive their stacked Z and the upper instances MUST settle onto the new lowest top

#### Scenario: Stacking renders in desktop orientation only

- **WHEN** the scene is switched to wall orientation
- **THEN** every instance MUST render mounted on the wall board at Z derived from its wall placement row
- **AND** no instance MUST be lifted by desktop stacking

#### Scenario: Wall orientation mounts pieces vertically

- **WHEN** the user switches the scene to wall orientation
- **THEN** the grid MUST render as a vertical board, rows extending upward along +Z
- **AND** wall-mount components MUST render with their OpenConnect interface face directly against the wall board (no full-scene rotation)
- **AND** each instance MUST render from its wall placement, and its desktop placement MUST remain unchanged

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
### Requirement: Per-orientation instance placement

Each playground instance MUST carry two independent placements: a desktop placement and a wall placement, each holding grid cell coordinates (`cellX`, `cellY`) and a rotation in 90-degree steps. Every placement edit MUST write only the active scene orientation's placement: desktop edits MUST NOT move the instance in wall orientation, and wall edits MUST NOT move the instance in desktop orientation. When an instance is added, duplicated, or imported, each scene orientation that displays the instance's component MUST have its placement assigned by an independent free-cell scan; the orientations MUST NOT copy placements from each other. Switching scene orientation MUST NOT modify either placement.

#### Scenario: Wall drag leaves the desktop placement untouched

- **GIVEN** a dual-system instance with independent desktop and wall placements
- **WHEN** the user drags it to a new cell in wall orientation
- **THEN** the wall placement MUST update to the dropped cells
- **AND** the desktop placement MUST remain exactly as it was

#### Scenario: Desktop drag leaves the wall placement untouched

- **GIVEN** a dual-system instance with independent desktop and wall placements
- **WHEN** the user drags it to a new cell in desktop orientation
- **THEN** the desktop placement MUST update to the dropped cells
- **AND** the wall placement MUST remain exactly as it was

#### Scenario: Add assigns both orientations independently

- **WHEN** the user adds a component that displays in both orientations
- **THEN** the desktop placement and the wall placement MUST each be assigned a free-cell position by an independent scan
- **AND** neither placement MUST be derived by copying the other

#### Scenario: Rotation input edits only the active orientation

- **GIVEN** the scene is in wall orientation with an instance selected
- **WHEN** the user changes the instance's rotation input to 90
- **THEN** only the wall placement's rotation MUST become 90
- **AND** the desktop placement's rotation MUST remain unchanged

### Requirement: Pointer drag placement

The playground MUST let a user move a ready proxy instance or pending placeholder by starting a primary-pointer drag on that rendered instance. During the drag, the candidate placement MUST follow the pointer on the active orientation's grid plane and snap to integer OpenGrid cells while preserving the instance's existing rotation. Desktop dragging MUST map to the X/Y placement plane, and wall dragging MUST map to the X/Z wall plane with world Z corresponding to `cellY`. A successful drop MUST update only the active orientation's placement — desktop drops write the desktop placement, wall drops write the wall placement — and the other orientation's placement MUST remain unchanged. Placement-only dragging MUST NOT request new CAD geometry.

The playground MUST keep drag preview state transient until drop. It MUST visibly distinguish a candidate that passes occupancy validation from one that overlaps another instance. Releasing a drag MUST commit the snapped candidate placement regardless of whether it overlaps another instance; a committed overlapping placement MUST be flagged with the conflict color and persistent warning instead of being reverted. Cancelling the pointer interaction MUST restore the original placement without committing the candidate.

Pointer gesture routing MUST depend on where the gesture starts. A primary-pointer drag that starts on an instance MUST manipulate that instance without orbiting or changing the persisted camera pose. A primary-pointer drag that starts on empty viewport space MUST retain the existing camera orbit behavior. A primary press and release on an instance without a drag MUST select it without moving it. For touch input, one contact that starts on an instance MUST move it, one contact that starts on empty space MUST orbit, and a second concurrent contact MUST cancel an active instance preview before the multi-touch camera gesture proceeds.

#### Scenario: Drag ready instance on desktop grid

- **GIVEN** a ready instance at a valid desktop placement
- **WHEN** the user drags the rendered instance by one or more grid cells and releases on a valid candidate
- **THEN** the instance MUST remain under the grabbed pointer offset while moving
- **AND** the drop MUST commit the snapped integer `cellX` and `cellY` to the desktop placement
- **AND** the wall placement MUST remain unchanged
- **AND** the camera pose MUST remain unchanged

#### Scenario: Drag instance on wall grid

- **GIVEN** a visible wall-compatible instance in wall orientation
- **WHEN** the user drags it across the wall plane and releases on a valid candidate
- **THEN** horizontal motion MUST update the wall placement's `cellX`
- **AND** vertical world motion MUST update the wall placement's `cellY`
- **AND** the instance MUST remain mounted to the wall plane with its rotation unchanged
- **AND** the desktop placement MUST remain unchanged

#### Scenario: Drag pending placeholder

- **GIVEN** an instance whose proxy mesh is still pending and whose placeholder is visible
- **WHEN** the user drags and drops that placeholder
- **THEN** the new snapped placement MUST be committed to the active orientation's placement
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

The system MUST derive occupancy from each instance's component footprint in grid cells at its current rotation. A placement or parameter change that makes two instances' footprints overlap MUST be applied; overlap MUST NOT cancel, revert, or block any change. In desktop orientation, an X/Y footprint overlap MUST be treated as a conflict only when the two instances' stacking interfaces are incompatible and their stacked Z spans also intersect; a stacked instance resting above another MUST NOT be flagged. Two instances with incompatible stacking interfaces never stack, so their identical ground-level spans always conflict. When a conflict exists, every instance participating in that collision MUST render with the conflict (error) color in place of its normal color, and a persistent visible text warning MUST be shown. The conflict color MUST take precedence over selection and hover color emphasis for the instances it marks. The warning state MUST clear automatically for each instance whose conflict is resolved. Conflict and height-limit flags are derived state; they MUST NOT be persisted in the scene JSON. In wall orientation occupancy and conflicts stay two-dimensional, except that an overlapping pair whose desktop stacking interfaces are compatible MUST NOT be flagged; instances the orientation does not display never participate.

#### Scenario: Stacked overlap is not a conflict

- **GIVEN** the desktop scene contains an instance occupying grid cells
- **WHEN** another instance is placed overlapping those cells and stacks on top of it
- **THEN** neither instance MUST render with the conflict color
- **AND** no overlap warning MUST be shown

#### Scenario: Unresolved height keeps the overlap conflict

- **GIVEN** a desktop instance whose height is not resolvable (no bounds)
- **WHEN** another instance's footprint overlaps it and cannot stack (no top to rest on)
- **THEN** both instances MUST render with the conflict color
- **AND** a persistent text warning MUST be visible while the unresolved overlap exists

#### Scenario: Wall orientation keeps two-dimensional conflicts

- **GIVEN** a wall-orientation scene with two overlapping wall placements
- **WHEN** the conflict set is derived
- **THEN** both instances MUST render with the conflict color
- **AND** no Z stacking applies on the wall board

#### Scenario: Warning clears when overlap resolves

- **GIVEN** two instances render flagged with the conflict color
- **WHEN** the user moves, shrinks, or deletes one so the footprints no longer overlap at intersecting Z spans
- **THEN** the affected instances MUST return to their normal colors
- **AND** the persistent warning MUST disappear when no conflict remains

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

The playground MUST let the user edit the selected instance's parameters through the component's own workspace parameter panel — the same panel components the component's `/cad/<modelId>` workspace renders — instead of a generic form generated from the parameter schema. The panel MUST include every behavior authored for that component's workspace panel: declared parameter fields, conditional sections, model-specific calculators and estimate tools, advanced sub-settings, and the 3MF export notes where declared. Components whose editing surface is a typed parameter object (for example `opengrid`, `opengrid-label-card`, `opengrid-wall-cover`) MUST be fully editable in the playground through the same typed parameter flow the workspace uses. Parameter input MUST reuse the component definition's validation; an invalid value MUST show the component's field diagnostic and MUST NOT be sent for generation. Editing parameters MUST NOT change other instances of the same component. A parameter change that grows the instance's footprint into an overlap with another instance MUST be applied and flagged with the conflict color and persistent warning; it MUST NOT be blocked or reverted. The form MUST show the same component help text as the component's own workspace panel, falling back to the component's catalog description. The playground MUST NOT render the workspace export action row inside the instance panel; per-instance export, retry, duplicate, and delete remain the playground instance actions.

#### Scenario: Edit instance parameters

- **WHEN** the user changes a parameter of the selected instance to a valid value
- **THEN** only that instance MUST regenerate with the new value
- **AND** other instances with unchanged parameters MUST NOT regenerate

#### Scenario: Typed-parameter component is fully editable

- **GIVEN** a scene containing an `opengrid` instance (component whose catalog parameter schema is empty)
- **WHEN** the user edits its parameters through the instance panel, including conditional sections and the grid dimension or print plan calculators
- **THEN** the instance MUST adopt the edited typed parameters, pass validation, and regenerate
- **AND** the rendered panel MUST be the same component panel the `/cad/opengrid` workspace renders

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

#### Scenario: No workspace export row in the instance panel

- **WHEN** the user opens the selected instance's parameter panel
- **THEN** the panel MUST NOT render the workspace export/retry action row
- **AND** per-instance export, retry, duplicate, and delete MUST remain available as playground instance actions
### Requirement: Instance 面板 presets 與回復預設

The playground instance panel MUST render the component's preset button row (restore-defaults button followed by each declared preset, in definition order) with the same behavior as the component workspace panel: applying a preset MUST resolve `defaultParameters` composed with the preset's `overrides` through the shared preset resolution and MUST apply the resolved full parameter set to the selected instance only, via the component's existing validation pipeline. Restore-defaults MUST apply the component's system preset for the instance's editing-time system context when one exists, and the definition defaults otherwise. Preset application and restore-defaults MUST be scoped to the selected instance and MUST NOT change other instances, workspace-saved parameters, or the browser-wide parameter persistence used by component workspaces. A preset that fails validation MUST NOT be applied and MUST leave the instance unchanged. After a preset or restore-defaults application the panel MUST remount its parameter controls so every control reflects the applied values.

#### Scenario: Preset applies to the selected instance only

- **GIVEN** a scene with two `opengrid-stackable-box` instances and the first selected
- **WHEN** the user applies the `3x3-desk-style` preset on the selected instance
- **THEN** the selected instance MUST adopt the preset's resolved parameter set and regenerate
- **AND** the other instance MUST keep its current parameters and MUST NOT regenerate

#### Scenario: Restore defaults honors the system context

- **GIVEN** a wall-orientation scene containing an imported `opengrid-snap` instance whose editing-time system context is `wall`
- **WHEN** the user clicks restore-defaults on that instance
- **THEN** the instance MUST receive the component's `wall` system preset values
- **AND** other instances MUST remain unchanged

#### Scenario: Invalid preset is not applied

- **WHEN** a preset's resolved parameter set fails the component's parameter validation
- **THEN** the selected instance MUST keep its current parameters, raw inputs, and field errors
- **AND** no generation request for that instance MUST be sent
### Requirement: Instance 編輯期 system context

Each playground instance MUST carry an editing-time OpenGrid system context used by the instance parameter panel for system-aware defaults, restore-defaults, and system selection controls. A new or imported instance MUST default its system context from the scene orientation (`desktop`→`desk`, `wall`→`wall`). A component panel's system context selection control (for example the desk/wall switch on the `opengrid-snap` panel) MUST change only the selected instance's system context. The instance system context MUST be editing-time state: it MUST NOT be written to the scene JSON, MUST NOT persist across export/import, and MUST NOT read from or write to the workspace browser persistence for component parameters. Scene import MUST accept current-version scene files unchanged, deriving each instance's system context from the scene orientation.

#### Scenario: Context defaults from scene orientation

- **WHEN** the user adds any component instance in a desktop-orientation scene
- **THEN** the instance's editing-time system context MUST be `desk`
- **AND** a wall-orientation scene MUST default the context to `wall`

#### Scenario: Panel system switch affects only that instance

- **GIVEN** an imported `opengrid-snap` instance in a desktop-orientation scene
- **WHEN** the user switches its panel's system switch to `wall`
- **THEN** only that instance's editing-time system context MUST become `wall`
- **AND** its restore-defaults MUST apply the `wall` system preset while other instances keep their own context

#### Scenario: Context is not persisted in the scene file

- **GIVEN** an instance whose editing-time system context was changed away from the orientation default
- **WHEN** the user exports the scene and imports it into a fresh playground
- **THEN** the imported instance MUST have the orientation-default system context
- **AND** its parameters, placements, and colors MUST be unchanged from the export
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

The playground MUST import a scene JSON file describing `schemaVersion`, a kind marker, an optional grid system, an optional scene palette, an optional scene Z height limit `maxHeightMm`, and a list of instances, where each instance carries a desktop `placement` and a required `wallPlacement`. A current-version settings file whose single instance omits both placement blocks (the component-workspace export shape) MUST be accepted as an unplaced instance that receives free-cell placements in each displayed orientation during import; omitting only one of the two blocks MUST be rejected as malformed. Import MUST reject files whose `schemaVersion` differs from the current schema version with the unsupported-version diagnostic; older scene files MUST NOT be migrated. Import MUST validate each instance against the current registered component definitions, reject the import with an explicit diagnostic when the file is malformed, when any `modelId` is not registered, when required fields are missing, or when the instance limit would be exceeded. Placement conflicts inside a well-formed file MUST NOT reject the import; imported instances whose Z spans collide MUST be flagged with the conflict color and persistent warning. A well-formed `maxHeightMm` MUST be applied as the scene height limit; an absent or invalid `maxHeightMm` MUST import as no limit instead of rejecting. Legacy parameter values MUST be normalized using the same versioned normalization rules as the components, and unknown fields MUST be ignored. A rejected import MUST NOT modify the current scene.

#### Scenario: Valid scene import

- **WHEN** the user imports a well-formed scene file whose instances all reference registered components with valid parameters
- **THEN** the scene MUST contain those instances with their desktop placements, wall placements, and colors

#### Scenario: Workspace settings file imports as an unplaced instance

- **GIVEN** a current-version settings file whose single instance omits both placement blocks
- **WHEN** the user imports it into the playground
- **THEN** the scene MUST contain that instance with both placements assigned by free-cell scans in each displayed orientation

#### Scenario: Partially placed instance rejected as malformed

- **GIVEN** a current-version file whose instance carries a desktop `placement` but omits `wallPlacement`
- **WHEN** the user imports it
- **THEN** the import MUST be rejected with the malformed-file diagnostic

#### Scenario: Older schema version rejected

- **GIVEN** a scene file whose `schemaVersion` differs from the current schema version
- **WHEN** the user imports it
- **THEN** the import MUST be rejected with the unsupported-version diagnostic
- **AND** the current scene MUST remain unchanged

#### Scenario: Height limit imports with the scene

- **GIVEN** a well-formed scene file with `maxHeightMm` set to a positive number
- **WHEN** the file is imported
- **THEN** the playground MUST use that value as the scene height limit
- **GIVEN** a scene file without `maxHeightMm`, or with a value that is not a positive number
- **WHEN** the file is imported
- **THEN** the scene MUST import with no height limit and no height-limit warning

#### Scenario: In-file placement conflicts import with warnings

- **GIVEN** a well-formed scene file whose instances include footprint overlaps that collide in Z
- **WHEN** the file is imported
- **THEN** the scene MUST contain those instances at their file placements
- **AND** the colliding instances MUST render with the conflict color
- **AND** the persistent conflict warning MUST be visible

#### Scenario: Unknown model rejected

- **WHEN** an imported instance references a `modelId` that is not registered
- **THEN** the import MUST be rejected with a diagnostic naming the unknown model
- **AND** the current scene MUST remain unchanged

#### Scenario: Legacy value normalization

- **GIVEN** an imported instance contains a legacy parameter value that has a defined normalized replacement
- **WHEN** the file is imported
- **THEN** the instance MUST use the normalized value
### Requirement: 匯入方向可見性提示

After a successful scene import, the playground MUST compare the imported instances against the set of components the current scene orientation displays. When at least one imported instance references a component that the current scene orientation does not display, the playground MUST show an informational notice stating how many imported instances belong to the other scene orientation and naming that orientation (desktop or wall). The notice MUST be informational: it MUST NOT reject the import, MUST NOT modify the imported scene, and MUST disappear once the user switches to a scene orientation that displays the remaining instances or starts another import. A rejected import MUST NOT show this notice; the existing import diagnostics keep precedence.

#### Scenario: All imported instances belong to the other orientation

- **GIVEN** the playground is in the desktop scene orientation
- **WHEN** the user imports a well-formed scene file whose instances all reference wall-only components
- **THEN** the import MUST succeed
- **AND** the notice MUST state that the imported instances belong to the wall orientation

#### Scenario: Some imported instances belong to the other orientation

- **GIVEN** the playground is in the desktop scene orientation
- **WHEN** the user imports a well-formed scene file mixing desk components and wall-only components
- **THEN** the import MUST succeed and the desk instances MUST be visible
- **AND** the wall-only instances MUST stay hidden in the desktop orientation
- **AND** the notice MUST state how many imported instances belong to the wall orientation

#### Scenario: Notice clears after switching orientation

- **GIVEN** an import produced the orientation notice
- **WHEN** the user switches to the scene orientation named by the notice
- **THEN** the previously hidden instances MUST become visible
- **AND** the notice MUST no longer be shown

#### Scenario: Rejected import shows no orientation notice

- **WHEN** the user imports a malformed scene file
- **THEN** the import MUST be rejected with the existing import diagnostic
- **AND** the orientation notice MUST NOT appear
### Requirement: 場景 JSON 匯出

The playground MUST export the current scene as a JSON file containing the current schema version, kind marker, grid system, scene palette, an optional `maxHeightMm` scene height limit (present exactly when a limit is set), and every instance with its optional `label`, `parameters`, desktop `placement`, `wallPlacement`, and effective colors. The exported file MUST be importable by the playground again and MUST be accepted as a single-instance settings file when it contains exactly one instance.

#### Scenario: Round trip

- **WHEN** the user exports the current scene and imports the downloaded file into a fresh playground
- **THEN** the scene MUST contain the same instances, desktop placements, wall placements, colors, and height limit

#### Scenario: Limit omitted when unset

- **GIVEN** a scene with no height limit set
- **WHEN** the user exports the scene
- **THEN** the exported file MUST NOT contain a `maxHeightMm` field
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
### Requirement: 窄版場景 sidebar bottom drawer

在 cad breakpoint（`max-cad`，≤760px）以下，Playground MUST 將 sidebar 內容
（新增元件、instance 清單、選中 instance 編輯器，含複製、刪除、重試與
per-instance 匯出）放進與 workspace 同款的非強制互動 bottom drawer：預設
收合、由常駐 pill 開啟、65dvh 高度、內容內部捲動、半透明面板底色（純 alpha、
無 backdrop 或 blur）、底部安全區內距；drawer 開啟時頁面捲動 MUST 鎖定，
未被 drawer 覆蓋的場景 viewport 區域 MUST 維持既有互動（拖曳、旋轉、點選
instance），pill 在 drawer 開啟時 MUST 可再次點擊以收合。頁面 header 的
view mode、grid cells 與場景匯入/匯出 MUST 留在原位。Breakpoint 以上
（≥761px）MUST 維持既有 sidebar 版面。

#### Scenario: 收合 pill 開啟 sidebar drawer

- **WHEN** 使用者在窄版 Playground 點擊 sidebar pill
- **THEN** drawer MUST 以半透明底部面板展開，pill 的 `aria-expanded` MUST 轉為 `true`
- **AND** sidebar 全部內容 MUST 在 drawer 內可用，且不造成頁面水平溢出

#### Scenario: Drawer 內的 instance 編輯保持完整

- **WHEN** 使用者在 drawer 內選取另一個 instance
- **THEN** 選中 instance 的編輯器（參數、擺放、顏色、複製/刪除/重試與 per-instance 匯出）MUST 對應新選取的 instance
- **AND** 場景 viewport 的既有互動契約（拖曳擺放、空手勢 orbit、點選選取）MUST 不變

#### Scenario: 桌面版面維持 sidebar

- **WHEN** viewport 寬度大於 760px
- **THEN** Playground MUST 維持既有 sidebar 版面
- **AND** MUST NOT 渲染 drawer 或 sidebar pill
### Requirement: Playground add-component choices

The Playground add-component selector MUST offer only the approved models for the active scene orientation, in the order defined below, using their existing localized catalog labels. The selector restriction MUST apply equally to the desktop sidebar and narrow-screen drawer. Switching orientations MUST clear any pending choice unavailable in the new orientation and disable the add action until a valid model is selected. Registered models outside these choices MUST remain compatible with scene import, parameter editing, rendering under the existing orientation rules, and per-instance export.

#### Scenario: Desktop choices

- **WHEN** the Playground is in desktop orientation
- **THEN** the enabled model choices MUST be exactly `opengrid-stackable-box`, `opengrid-stackable-cylinder`, `opengrid-organizer-box`, and `opengrid-open-shelf`, in that order
- **AND** the disabled choose-model placeholder MUST remain available as the initial selection

#### Scenario: Wall choices

- **WHEN** the Playground is in wall orientation
- **THEN** the enabled model choices MUST be exactly `opengrid-openconnect-shelf`, `opengrid-openconnect-organizer`, `opengrid-openconnect-tissue-box`, and `opengrid-wall-cover`, in that order

#### Scenario: Narrow-screen choices

- **WHEN** the user opens the Playground sidebar drawer below the CAD breakpoint
- **THEN** its selector MUST offer the same ordered choices as the desktop sidebar for the active orientation
- **AND** switching between desktop and wall orientations MUST update those choices in the drawer

#### Scenario: Orientation switch clears an unavailable choice

- **GIVEN** the user has selected a model to add in one orientation
- **WHEN** the user switches to the other orientation where that model is unavailable
- **THEN** the pending model choice MUST reset to the disabled choose-model placeholder
- **AND** the add action MUST be disabled until the user selects an offered model
- **AND** clearing MUST take effect while the narrow-screen drawer is closed, including switching away and back before reopening it

#### Scenario: Importing a registered model outside the selector

- **WHEN** the user imports a valid scene containing a registered model absent from the add-component selector
- **THEN** the scene MUST be accepted under the existing scene validation rules
- **AND** the imported instance MUST retain parameter editing and per-instance export and render in its supported scene orientations
- **AND** importing it MUST NOT add that model to the selector
### Requirement: Wall Cover mounts at grid cell centers

In wall orientation, each character of an `opengrid-wall-cover` instance MUST be centered horizontally and vertically in its own consecutive 28 mm logical grid cell. At rotation zero, the first character center MUST be at world X=`(cellX + 0.5) * 28 mm` and world Z=`(cellY + 0.5) * 28 mm`, with the cover base seated at world Y=0. Its nominal envelope MUST leave 1.2 mm clearance to all four edges of its cell. Placement MUST anchor the minimum corner of the rotated character-cell span, independently of whether the remover opening is enabled.

Ready meshes, pending placeholders, rotation input, and drag placement MUST use the same cell-centered mounting transform. Occupancy MUST follow the rotated mounted body footprint, covering exactly one logical cell per character for all four right-angle rotations. Existing scene placement fields, integer coordinates, and parameter snapshots MUST remain compatible.

#### Scenario: Single cover has equal margins

- **WHEN** a one-character Wall Cover is placed at any integer cell coordinates in wall orientation
- **THEN** its center MUST coincide with that logical grid cell's center
- **AND** its nominal top, bottom, left, and right margins MUST each be 1.2 mm
- **AND** this centering MUST also apply when its remover opening is disabled

#### Scenario: Multiple covers each occupy a centered cell

- **WHEN** a Wall Cover containing two through eight normalized characters is placed at rotation zero
- **THEN** each cover MUST align with a distinct consecutive horizontal cell center
- **AND** the occupied range MUST contain exactly the character count in columns and one row

#### Scenario: Rotated covers keep centering and occupancy

- **WHEN** a multi-character Wall Cover is rotated to 90, 180, or 270 degrees at positive or negative integer coordinates
- **THEN** each cover MUST remain centered in a logical grid cell with the same four nominal margins
- **AND** occupancy MUST cover the rendered character-cell span, swapping columns and rows for 90 and 270 degrees
- **AND** an adjacent non-overlapping cover MUST NOT be marked as conflicting

#### Scenario: Pending cover and drag placement share the mount

- **WHEN** a pending Wall Cover is rotated via the rotation input or moved by pointer dragging and its proxy later becomes ready
- **THEN** the ready cover MUST use the same cell-centered placement as its placeholder
- **AND** placement-only edits MUST NOT request regenerated CAD geometry

#### Scenario: Saved scene keeps its logical placement

- **WHEN** a current-version scene containing Wall Cover instances is imported, exported, or revisited
- **THEN** its integer coordinates and rotations MUST retain their meanings in each orientation's placement
- **AND** the Wall Cover instances MUST render using the cell-centered placement
### Requirement: 場景 Z 高度上限

The playground MUST let the user set an optional scene Z height limit in millimeters through the desktop-orientation toolbar beside the grid extent inputs. The limit MUST be a positive number; clearing the input MUST remove the limit. When no limit is set, the playground MUST NOT evaluate or flag instance heights. When a limit is set in desktop orientation, any displayed floor instance whose stacked top Z (stacked base Z plus instance height in mm) exceeds the limit MUST render with the conflict (error) color and be included in a persistent visible text warning that states how many instances exceed the limit; instances fully below the limit MUST stay unflagged, including the instances a flagged one rests on. The flag MUST clear automatically when the instance drops back within the limit or the limit is removed. The conflict color MUST take precedence over selection and hover color emphasis for instances it marks. Height-limit flags are derived state; they MUST NOT be persisted in the scene JSON. Wall orientation MUST NOT evaluate the height limit.

#### Scenario: Crossing instance flagged

- **GIVEN** the desktop scene has a height limit of 100 mm
- **WHEN** stacked instances reach a top of 130 mm
- **THEN** only the instance whose top exceeds 100 mm MUST render with the conflict color
- **AND** the instances it rests on MUST stay unflagged
- **AND** a persistent warning MUST state that one instance exceeds the limit

#### Scenario: Flag clears when the stack shrinks

- **GIVEN** an instance flagged for exceeding the height limit
- **WHEN** the user removes or shrinks instances so its stacked top falls back within the limit
- **THEN** the flag and the warning MUST clear

#### Scenario: No limit never flags

- **GIVEN** a scene with no height limit set
- **WHEN** instances stack to any height
- **THEN** no height-limit flag or warning MUST appear

#### Scenario: Limit edit persists through export

- **GIVEN** the user sets a height limit in the desktop-orientation toolbar
- **WHEN** the scene is exported and re-imported
- **THEN** the imported scene MUST carry the same limit

#### Scenario: Wall orientation skips the height check

- **GIVEN** a scene with a height limit set
- **WHEN** the scene is switched to wall orientation
- **THEN** no instance MUST be height-flagged in wall orientation

### Requirement: 刪除鍵刪除選中實例

The playground MUST delete the currently selected instance when the user presses the Delete or Backspace key, unless focus is inside a text input, textarea, select, or content-editable element. Deleting via either key MUST behave exactly like the instance panel's delete action, and held-down repeats MUST delete at most one instance per key press.

#### Scenario: Delete removes the selected instance

- **WHEN** an instance is selected and the user presses Delete or Backspace outside of any text field
- **THEN** that instance MUST be removed from the scene exactly once
- **AND** typing either key inside a text field MUST NOT delete any instance

### Requirement: Playground instance parameter inputs are interpreted by field type

The playground instance parameter store MUST interpret each raw parameter
input according to the field's type as declared by the component definition:
numeric fields by their numeric value, enum fields by their literal option
value, and boolean fields by their boolean value. A selection that is valid
per the component's contract validation MUST be adopted into the instance's
effective typed parameters and MUST drive regeneration. The store MUST NOT
apply a single numeric coercion to every field.

#### Scenario: Stacking mode selection takes effect

- **WHEN** the user selects `堆疊模式` (`boxMode='stackable'`) on an
  `opengrid-organizer-box` playground instance whose other parameters are
  valid for stacking
- **THEN** the instance's effective typed parameters MUST adopt
  `boxMode='stackable'`
- **AND** the regenerated model MUST use the stacking body interface
- **AND** the mode control MUST keep showing the selected stacking option

#### Scenario: Enum selection is not coerced to a number

- **WHEN** any playground instance control submits an enum option value
- **THEN** the store MUST NOT reject the input merely because the value is
  non-numeric

### Requirement: Multi-step parameter edits accumulate before validation

When a panel applies one logical edit as a sequence of raw input updates
(for example selecting `boxMode='stackable'` and then raising
`wallThickness` to the mode floor), the store MUST validate the accumulated
raw input, and the effective typed parameters MUST reflect every step of the
sequence. A step that is individually invalid MUST NOT discard the steps
that follow it.

#### Scenario: Mode switch with wall raise lands both values

- **GIVEN** an `opengrid-organizer-box` playground instance with
  `wallThickness=2` in normal mode
- **WHEN** the panel selects `boxMode='stackable'` and then submits
  `wallThickness=3`
- **THEN** the effective typed parameters MUST be
  `boxMode='stackable'` with `wallThickness=3`
- **AND** no field error from the intermediate step MUST remain visible

### Requirement: Rejected inputs stay consistent with effective parameters

When an input is rejected by validation, the last valid committed parameters
MUST remain the effective model, the attempted raw selection MUST remain
accompanied by a visible field error, and no state without a visible error
MAY show a selection that differs from the effective typed parameters.

#### Scenario: Invalid combination keeps the error visible

- **WHEN** a submitted raw parameter set fails contract validation
- **THEN** the last valid model MUST remain rendered
- **AND** the rejected field's error MUST stay visible
- **AND** once a later valid input is committed, the attempted selection and
  the effective parameters MUST agree with no stale error

### Requirement: Field errors name the specific field

Every playground parameter field that can raise a validation issue MUST have
a localized field label in every supported locale, and field-level validation
messages MUST render that label. Enum and boolean parameter fields of
playground-selectable components MUST NOT fall back to the generic
`參數` label.

#### Scenario: Box mode error names the field

- **WHEN** a `boxMode` validation issue is displayed in the zh-Hant locale
- **THEN** the message MUST begin with the localized field name `盒體模式`
- **AND** MUST NOT begin with the generic label `參數`
