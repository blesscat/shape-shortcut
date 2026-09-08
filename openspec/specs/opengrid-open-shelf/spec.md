## Purpose

本文件定義 OpenGrid 前方開口、整體向前上仰的 Open Shelf component contract、幾何與匯出行為。
## Requirements
### Requirement: Open Shelf has a stable OpenGrid identity

The system MUST register the new component with modelId, buildKey, catalog component directory, CAD-kernel component directory, and model-specific route slug `opengrid-open-shelf`. Its user-facing catalog display name MUST begin with `OpenGrid `, and its CAD route MUST be `/cad/opengrid-open-shelf`. Existing model ids, build keys, route slugs, catalog entries, and exports MUST remain unchanged.

#### Scenario: Resolve the new model identity

- **WHEN** the catalog, route resolver, or Worker receives `opengrid-open-shelf`
- **THEN** each layer MUST resolve the same new component definition
- **AND** no existing OpenGrid definition MUST be substituted

#### Scenario: Preserve existing identities

- **WHEN** the new component is registered
- **THEN** existing OpenGrid model ids, build keys, route slugs, and export file names MUST remain available without migration

### Requirement: Open Shelf parameters are typed and independently validated

The component MUST expose the typed parameter snapshot `{ x, y, height, cellX, cellZ, angle, honeycombMode }`. The six geometric fields MUST retain their existing ranges, steps, formulas, and defaults. `honeycombMode` MUST be boolean and default to `false`. A legacy snapshot containing exactly the six geometric fields MUST normalize to `honeycombMode=false`.

The validator MUST reject non-finite, fractional, unknown, missing geometric, out-of-range, or non-boolean mode fields, and MUST reject a combination whose derived regular rear clear cell height is not positive after accounting for the bottom board, top panel, and `depth * tan(angle)` elevation difference. Valid results MUST contain only typed values and MUST not include derived fields.

#### Scenario: Validate and normalize the default snapshot

- **WHEN** the component validates the legacy default `{ x: 4, y: 3, height: 50, cellX: 1, cellZ: 2, angle: 15 }`
- **THEN** validation MUST succeed with the same geometric values and `honeycombMode=false`
- **AND** the derived footprint MUST remain approximately `111.85 mm × 83.85 mm`

#### Scenario: Enable the typed material-saving mode

- **WHEN** a valid Open Shelf snapshot contains `honeycombMode=true`
- **THEN** validation and Worker dispatch MUST preserve the typed boolean value
- **AND** the six geometric controls and their derived cell-space display MUST remain unchanged

#### Scenario: Reject invalid scalar or mode input

- **WHEN** any geometric field is missing, fractional where an integer is required, non-finite, outside its declared range, or an unknown field is supplied, or `honeycombMode` is not boolean
- **THEN** validation MUST fail with a field-specific diagnostic
- **AND** the invalid snapshot MUST not be sent to the CAD kernel

#### Scenario: Reject a geometrically impossible angle

- **WHEN** a valid height and footprint are combined with an angle that leaves no positive clear height at the rear of a cell
- **THEN** validation MUST fail with an angle/height geometry diagnostic
- **AND** the UI MUST retain the last committed valid model while the new input is invalid

### Requirement: Open Shelf geometry has a front opening and a shared upward inclination

The generated component MUST be centered on X/Y with front at `-Y` and rear at `+Y`. The outer frame MUST use continuous R3.75 mm rounded plan corners matching the existing OpenGrid outer-corner convention. The top rear outer edge and both upper sloped side edges MUST use continuous nominal R0.6 mm rounded transitions. The highest front outer edge of the top panel MUST remain the height datum. The bottom board MUST be horizontal with 2 mm thickness and its upper datum MUST be Z=2 mm. The backboard MUST remain vertical and use 1.2 mm thickness. The two outer side walls MUST use 1.6 mm thickness. Horizontal internal shelves, vertical internal X dividers, and the top panel MUST use the common angle, rising toward the front, and MUST span the complete Y depth to the rear backboard. The top panel's highest outer front surface MUST be Z=`height`; its rear end MUST be lower by the derived depth elevation. When `angle > 0`, the bottom horizontal board and the first common-angle shelf MUST form a separate bottom wedge that is not counted in `cellZ`; `cellZ` MUST count only the regular parallel cells above that wedge. When `angle = 0`, no bottom wedge shelf MUST be added. The model MUST represent a front opening, not an opening on the top face.

#### Scenario: Default side profile is front-open

- **WHEN** the default component is generated
- **THEN** the front at negative Y MUST be open
- **AND** the bottom board MUST remain horizontal
- **AND** the backboard MUST be vertical
- **AND** the shelves and top panel MUST rise toward negative Y

#### Scenario: Every cell reaches the rear

- **WHEN** the component has any valid `y` and `angle`
- **THEN** each horizontal shelf and each internal X divider MUST extend across the full declared Y depth
- **AND** the cell boundary MUST meet or overlap the rear backboard
- **AND** the opening MUST not be implemented by shortening the cell depth

#### Scenario: Inclined cells start above the bottom wedge

- **WHEN** a valid component has `angle > 0` and `cellZ=Z`
- **THEN** the component MUST contain `Z` regular cells above the bottom wedge
- **AND** every regular shelf plane MUST be parallel to the top panel at the full requested angle
- **AND** the bottom wedge MUST contain the complete front-to-rear elevation difference instead of distributing it across the regular cells

#### Scenario: Panel displays the derived cell space

- **WHEN** the six Open Shelf parameters are valid
- **THEN** the parameter panel MUST display the per-cell clear width and depth to the rear backboard
- **AND** it MUST display the regular cell clear height separately from the bottom wedge height

#### Scenario: Outer frame uses rounded corners and upper transitions

- **WHEN** the component is generated at any valid size
- **THEN** the four outer plan corners MUST be continuous circular arcs with nominal R3.75 mm
- **AND** the top rear outer edge and both upper sloped side edges MUST have nominal R0.6 mm rounded transitions
- **AND** the rounded outer profile MUST preserve the declared rectangular X/Y bounds, the four locating peg positions, and the highest front Z=`height` datum

#### Scenario: Overall height uses the world-Z envelope

- **WHEN** a valid component is generated with `height=H`
- **THEN** the highest outer front surface of the top panel MUST be Z=`H` within the CAD tolerance
- **AND** increasing the angle MUST lower the rear top and reduce rear clear cell height
- **AND** the requested H MUST include board thicknesses but MUST exclude the 3.8 mm peg extension below the base

### Requirement: Open Shelf has the specified integrated locating pegs

The component MUST include exactly four nominal corner locating pegs integrated
with the bottom board. Each peg MUST use the shared OpenGrid integrated
corner-seat geometry: a nominal diameter of 5 mm, a total exposed height of
3.8 mm below the bottom board, and a 0.2 mm bottom perimeter chamfer within
that height. Peg centers MUST use the existing OpenGrid stackable-box corner
placement semantics: nominal X/Y extent is `count * 28 mm` and each corner
center is inset 7 mm from that nominal extent. The generated pegs MUST use the
Open Shelf 5 mm interface dimension and MUST NOT include a 7.05 mm retaining
shoulder, flange, or separate 7.05 mm positioning feature.

#### Scenario: Default peg placement matches the OpenGrid interface

- **WHEN** the default component is generated
- **THEN** four downward cylindrical pegs MUST be present
- **AND** their nominal centers MUST be at the four combinations of
  `±(4*28/2-7)` and `±(3*28/2-7)` mm
- **AND** the exposed peg length MUST be 3.8 mm
- **AND** each peg MUST have a 0.2 mm bottom perimeter chamfer

#### Scenario: Pegs are plain 5 mm cylinders

- **WHEN** the generated shape is inspected at any valid size
- **THEN** the peg shaft diameter MUST be 5 mm nominal
- **AND** its bottom edge MUST have the shared 0.2 mm chamfer
- **AND** no 7.05 mm retaining shoulder or flange MUST be present
- **AND** the peg geometry MUST be fused to the bottom board as one printable solid

### Requirement: Open Shelf bounds and exports are deterministic

The component MUST report centered X/Y bounds from the OpenGrid footprint formula,
a minimum Z bound of -3.8 mm for the exposed pegs, and a maximum Z bound equal
to the requested total height. Its STEP and binary STL file names MUST include
the stable component id and all six typed parameter values in deterministic
order. The generated result MUST be a non-empty single solid suitable for the
existing preview, STEP, and STL lifecycle.

#### Scenario: Default bounds include only the peg extension below the base

- **WHEN** the default component is generated
- **THEN** its X/Y bounds MUST be approximately `[-55.925, 55.925]` and
  `[-41.925, 41.925]`
- **AND** its Z bounds MUST be approximately `[-3.8, 50]`

#### Scenario: Equivalent parameters produce stable export names

- **WHEN** two generations use the same typed parameter snapshot
- **THEN** their STEP and STL file names MUST be identical
- **AND** each name MUST begin with `opengrid-open-shelf-`

#### Scenario: Invalid geometry never becomes an exportable revision

- **WHEN** validation fails or the Worker reports a build failure
- **THEN** the last committed valid revision MAY remain visible as stale
- **AND** STEP/STL export MUST remain disabled for the invalid or failed generation

### Requirement: Open Shelf has a protected Hex Mesh material-saving mode

When `honeycombMode=true`, Open Shelf MUST use the same point-up Hex Mesh derivation and protected-boundary clipping behavior as the stackable containers. Eligible outer side walls, internal X dividers, and backboard MUST use the side-cell lattice. Eligible bottom, inclined shelf, and top panels MUST use the smaller floor-cell lattice. Complete and clipped openings MUST retain continuous printable ribs, and the mode MUST NOT implement the separate vertical-groove Ribbed style.

#### Scenario: Disabled mode preserves the merged Open Shelf geometry

- **WHEN** `honeycombMode=false` or a legacy snapshot omits the field
- **THEN** geometry, bounds, panel count, front opening, locating pegs, quality behavior, and the existing export filename MUST remain unchanged

#### Scenario: Vertical panels use protected side Hex Mesh

- **WHEN** a valid Open Shelf has `honeycombMode=true`
- **THEN** eligible outer side walls, internal X dividers, and backboard MUST contain complete and safely clipped staggered side-lattice openings
- **AND** the rounded outer perimeter, front and rear rails, top and bottom rails, shelf-contact bridges, divider-contact bridges, and backboard contacts MUST remain solid
- **AND** cells intersecting those protected boundaries MUST be clipped to the safe region instead of discarded wholesale
- **AND** usable vertical-panel areas MUST NOT contain avoidable broad solid bands caused only by complete-cell rejection

#### Scenario: Inclined shelves open the usable bottom-wedge sides

- **WHEN** a valid Open Shelf has `honeycombMode=true`, `angle>0`, and safe opening area between the bottom rail and first inclined shelf bridge
- **THEN** each eligible outer side wall and internal X divider MUST contain side-lattice openings in that bottom-wedge area
- **AND** cells crossing the horizontal bottom boundary or inclined first-shelf boundary MUST be clipped while both structural bridges remain solid
- **AND** the wedge MUST remain solid only where no valid protected opening area fits

#### Scenario: Bottom and shelf panels use finer Hex Mesh

- **WHEN** a valid Open Shelf has `honeycombMode=true`
- **THEN** eligible bottom, inclined shelf, and top panels MUST contain complete and safely clipped staggered openings smaller than the side-wall openings
- **AND** eligible plate openings MUST pass through their panel so the Hex Mesh remains visible from either exposed face
- **AND** side, front, rear, divider, and panel-intersection bridges MUST remain solid
- **AND** no bottom opening may intersect a locating peg or its structural keep-out
- **AND** cells intersecting a protected perimeter, bridge, or locating-peg keep-out MUST be clipped to that boundary instead of discarded wholesale
- **AND** usable plate areas MUST NOT contain avoidable broad solid bands caused only by complete-cell rejection

#### Scenario: Material-saving Open Shelf preserves its contract

- **WHEN** solid and honeycomb Open Shelves use the same six geometric values
- **THEN** the honeycomb result MUST have lower volume with identical declared bounds
- **AND** the front opening, shared inclination, four plain 5 mm locating pegs, rounded outer frame, and one-solid topology MUST remain valid
- **AND** preview, STEP, and STL export MUST remain available
- **AND** honeycomb export names MUST include a deterministic `-honeycomb` suffix

#### Scenario: Small protected panels use a valid no-cell fallback

- **WHEN** a panel or bottom-wedge side cannot contain a valid opening after all frames and structural keep-outs are applied
- **THEN** that panel MUST remain solid
- **AND** other eligible Open Shelf panels MUST still use Hex Mesh where valid protected opening area remains

### Requirement: Open Shelf workspace integration

The CAD workspace MUST register `opengrid-open-shelf` as an independent model definition, expose its existing `x`, `y`, `height`, `cellX`, `cellZ`, and `angle` geometric controls plus a `honeycombMode` toggle labelled `省料模式（六角鏤空）`, route `/cad/opengrid-open-shelf` to that definition, and dispatch Worker generation to the `opengrid-open-shelf` kernel builder. The component MUST use the existing debounce, latest-wins candidate, commit, mesh, STEP, and STL gates.

#### Scenario: Open Shelf route initializes independently

- **WHEN** a user opens `/cad/opengrid-open-shelf` with browser CAD prerequisites
- **THEN** the workspace MUST initialize `modelId=opengrid-open-shelf`
- **AND** generation 1 MUST use a valid saved snapshot or the Open Shelf defaults
- **AND** the Worker MUST not fall through to another model builder

#### Scenario: Open Shelf controls expose its geometric fields and material mode

- **WHEN** the Open Shelf parameter panel is rendered
- **THEN** it MUST expose outer X/Y grid counts, total height, internal X/Z cell counts, angle controls, and the Hex Mesh toggle
- **AND** the toggle MUST default to unchecked without changing the six slider controls
- **AND** it MUST not expose stackable-box modes, ordinary OpenGrid board fields, or another component's controls

#### Scenario: Open Shelf uses the existing export lifecycle

- **WHEN** a valid Open Shelf generation is committed
- **THEN** the workspace MUST display its mesh and enable the existing STEP/STL export actions
- **AND** a stale, invalid, or failed generation MUST not replace the last committed revision or enable a new export

### Requirement: Open Shelf raw input validation follows the workspace lifecycle

The workspace MUST parse the six Open Shelf geometric fields and `honeycombMode` into the typed snapshot required by the component contract. Empty, fractional, non-finite, unknown, out-of-range, or invalid boolean raw input MUST produce field-specific validation feedback and `model.invalidate`; valid input MUST use the existing debounce and Worker generation lifecycle.

#### Scenario: Invalid Open Shelf input is invalidated

- **WHEN** a user enters an invalid X/Y/height/cell-count/angle/mode value
- **THEN** the workspace MUST show a diagnosable field error
- **AND** it MUST invalidate the pending generation rather than build native geometry
- **AND** export MUST remain disabled while the input is invalid or stale

#### Scenario: Valid Open Shelf input generates typed parameters

- **WHEN** all fields form a valid snapshot and the debounce settles
- **THEN** the Worker request MUST contain typed `x`, `y`, `height`, `cellX`, `cellZ`, `angle`, and `honeycombMode`
- **AND** only the latest valid candidate MUST be eligible for commit

### Requirement: Open Shelf honeycomb fails fast above the engine memory ceiling

Open Shelf honeycomb generation MUST estimate the deterministic lattice cell count from the validated parameters before performing any geometry work. When the estimated count exceeds a declared engine memory limit, generation MUST fail fast with the stable error code `OPENGRID_HONEYCOMB_MEMORY_LIMIT` mapped to a localized diagnostic that names the saving-mode limit and suggests reducing the footprint or disabling the saving mode. When the estimated count is within the limit, generation MUST proceed unchanged. The limit MUST NOT change any geometry: sizes within the limit MUST produce the same result as before, and the solid (non-honeycomb) profile MUST never be subject to the limit.

#### Scenario: An oversized honeycomb shelf fails fast with an actionable diagnostic

- **WHEN** a valid Open Shelf snapshot enables `honeycombMode=true` with an estimated lattice cell count above the declared engine memory limit
- **THEN** generation MUST reject the candidate before any geometry work starts
- **AND** the error MUST expose the stable `OPENGRID_HONEYCOMB_MEMORY_LIMIT` code
- **AND** the user-visible diagnostic MUST be localized and MUST suggest reducing the footprint or disabling the saving mode

#### Scenario: Sizes within the limit keep their existing behavior

- **WHEN** a valid Open Shelf enables `honeycombMode=true` with an estimated cell count within the limit
- **THEN** generation MUST run the existing lattice derivation, quality checks, and exports unchanged
- **AND** the declared limit MUST NOT depend on the UI locale

#### Scenario: The solid profile is never limited

- **WHEN** a valid Open Shelf of any supported size has `honeycombMode=false`
- **THEN** the memory-limit check MUST NOT run
- **AND** generation MUST follow the existing solid-profile contract
