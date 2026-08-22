## Purpose

提供目前產品中的官方 OpenGrid generator contract。使用者可以設定
Full/Lite/Heavy 板型、grid、half-cell、螺絲、connector 與 chamfer，並取得
可驗證的 B-Rep、preview、STEP 與 binary STL。

## Reference

The implementation profile is based on the official OpenGrid source at commit
61231295ea08c302eff32051769113c48cbda255:

https://github.com/AndyLevesque/QuackWorks/blob/61231295ea08c302eff32051769113c48cbda255/openGrid/openGrid.scad

The implementation retains source attribution and license notes. The old
flat-plate, 16 mm opening, four-slot, and small/large connector schemas are
not compatible with the current normalized snapshot.

## Requirements

### Requirement: OpenGrid product assembly

The existing opengrid product builder MUST use the cell-balanced assembly
strategy for Full, Lite, Heavy, and Hybrid. Whole-profile, row-block, and
prototype-template strategies MAY remain available to explicit benchmark or
geometry-test requests, but MUST NOT be selected as a silent product fallback.

Hybrid MUST be assembled as a one-cell-wide Heavy perimeter around standard
Full-profile interior cells. If either full-cell axis has fewer than three
cells, every full cell is on the perimeter and the result MUST be
Heavy-equivalent.

At every Heavy-to-Full perimeter boundary on a board with an interior, Hybrid
MUST include a one-sided sloped transition on the inward-facing Heavy edge.
The transition MUST rise from the standard Full surface height to the Heavy
envelope height while preserving the outer Heavy edge and the through-cell
openings.

#### Scenario: Product generation uses the selected product strategy

- **WHEN** the Worker receives a valid opengrid snapshot
- **THEN** the product builder MUST dispatch the cell-balanced strategy
- **AND** a product-generation failure MUST remain a generation failure rather
  than silently retrying prototype-template

#### Scenario: Hybrid separates perimeter and interior profiles

- **WHEN** a Hybrid board has at least three rows and three columns
- **THEN** every outer-row or outer-column cell MUST use the Heavy assembly
  profile
- **AND** every non-perimeter cell MUST use the standard Full profile
- **AND** the board MUST remain one valid connected solid

#### Scenario: Small Hybrid board has no interior

- **WHEN** a Hybrid board has one or two full cells on either axis
- **THEN** every generated full cell MUST use the Heavy assembly profile
- **AND** its envelope, feature behavior, and mating surfaces MUST match a
  Heavy board with the same parameters

### Requirement: OpenGrid normalized parameter contract

The existing catalog model id MUST remain opengrid and its normalized
parameters MUST include:

- variant Full, Lite, Heavy, or Hybrid;
- integer rows and columns from 1 through 17;
- halfCellX none, left, or right, and halfCellY none, top, or bottom;
- targetWidth and targetDepth as finite millimetre dimensions, where zero means no saved target;
- fitToTarget as a boolean;
- chamfers none, corners, or everywhere plus four outer-corner flags;
- connectorHoles none or enabled plus independent top, right, bottom, and left
  side flags;
- screwKind official-default or custom;
- generic screw diameter, head diameter, head inset, countersunk toggle, and
  countersunk angle;
- screwMode none, corners, everywhere, by-row-column, or custom;
- screwCenter, screwEvery, row interval, and column interval; and
- sorted custom positions on the internal rows-minus-one by
  columns-minus-one intersection lattice.

The standard pitch MUST be 28 mm. Without half-cell directions, the nominal board width and depth MUST be columns times 28 mm and rows times 28 mm. Each selected half-cell direction MUST add exactly 14 mm on its nominal axis while keeping the board centered and within the 500 mm workspace limit. When `fitToTarget=false`, the target dimensions MUST NOT affect the generated board envelope. When `fitToTarget=true`, each positive target dimension MUST be at least its corresponding nominal dimension. Because the target remainder is centered, each side MUST receive no more than one 14 mm half-cell; equivalently, each target dimension MUST be no more than 28 mm beyond its corresponding nominal dimension. The physical target envelope MUST remain within the 500 mm workspace limit. Hybrid MUST use the same normalized field shape as the other OpenGrid variants and MUST NOT add a variant-specific persistence or Worker field.

The official default MUST be Lite 2 by 2 with corner chamfers, all connector
sides enabled, corner screws, and screw dimensions 4.1 mm, 7.2 mm, 1 mm,
countersunk enabled, and 90 degrees. Its targetWidth and targetDepth MUST be zero and fitToTarget MUST be false.

The normalized snapshot MUST use generic dimensions and MUST NOT retain the
former 16 mm opening, four-slot, small/large connector, or M3/M4/M5-only
schema. Named m3 through m7 UI presets MAY exist only as helpers that write
the generic dimensions.

#### Scenario: Official defaults

- **WHEN** the opengrid route has no valid saved snapshot
- **THEN** the workspace MUST use the official default snapshot
- **AND** the derived board size MUST be 56 by 56 mm with 4 mm thickness
- **AND** target fitting MUST be disabled by default

#### Scenario: Hybrid is accepted without schema branching

- **WHEN** a complete OpenGrid snapshot has `variant=Hybrid`
- **THEN** validation MUST accept it when all existing fields and target fields are valid
- **AND** normalization MUST preserve the Hybrid variant and all feature
  values
- **AND** generated requests MUST use the existing `modelId=opengrid`

#### Scenario: Invalid or legacy snapshot

- **WHEN** a snapshot has an unsupported enum, invalid target type or range, invalid dimension, out-of-range
  grid, duplicate or out-of-range intersection, old schema field, or invalid
  half-cell value
- **THEN** validation MUST reject it before native work
- **AND** the previous accepted preview MUST remain stale
- **AND** incompatible persisted data MUST fall back to the component default
- **WHEN** a legacy snapshot is missing targetWidth, targetDepth, or fitToTarget
- **THEN** persistence hydration MUST add zero, zero, and false respectively before validation

### Requirement: Official tile profile and variants

Each logical cell MUST use the official profiled tile rather than a flat
plate with an invented through-hole. The profile MUST preserve the 28 mm
pitch, 0.8 mm outside extrusion, 0.4 mm top chamfer, 1 mm middle chamfer,
2.4 mm capture inset, 2.6 mm corner-square thickness, 4.2 mm intersection
distance, and 25 mm inner tile size.

Full MUST use 6.8 mm thickness. Lite MUST use the official 4 mm reduced
profile and connector/snap height behavior. Heavy MUST use the official
13.8 mm opposing profiled layers around the 0.2 mm gap and projected middle
layer, rather than a single solid plate. Hybrid MUST use that same Heavy
two-layer assembly only for its one-cell outer perimeter and MUST use a
single standard Full 6.8 mm profiled layer for each interior cell. The Hybrid
board envelope height MUST be 13.8 mm, with its base at Z=0.

#### Scenario: Profiled board envelope

- **WHEN** a valid 1 by 1 or multi-cell board is generated
- **THEN** its outer envelope MUST use the selected grid and half-cell
  dimensions
- **AND** its base MUST remain at Z=0
- **AND** its center opening, capture ledges, corner nodes, and edge rails MUST
  be present

#### Scenario: Hybrid has a Heavy perimeter and Full interior

- **WHEN** a Hybrid board has at least three rows and three columns
- **THEN** the outer perimeter MUST reach the Heavy 13.8 mm envelope and
  preserve the opposing profiled layers and middle bridge
- **AND** the interior cells MUST stop at the standard Full 6.8 mm profile
- **AND** the standard interior openings MUST remain compatible with normal
  OpenGrid Full accessories
- **AND** the inward-facing Heavy edge MUST contain the sloped transition from
  the Full height to the Heavy height

#### Scenario: Hybrid Heavy-to-Full transition

- **WHEN** a Hybrid board has a Heavy perimeter adjacent to a Full interior
- **THEN** a section probe moving inward across the perimeter boundary MUST
  observe a monotonic rise from the Full surface height to the Heavy envelope
  height
- **AND** the opposite/outside Heavy edge MUST retain the Heavy profile
- **AND** no transition material MAY close the through-cell opening

#### Scenario: Hybrid half-cell boundary

- **WHEN** a Hybrid board selects an X half-cell, Y half-cell, or both
- **THEN** every added half-cell boundary host MUST use the Heavy perimeter
  profile
- **AND** the full-cell interior classification and final centered envelope
  MUST remain unchanged

### Requirement: Hybrid inward perimeter transition

For a Hybrid board, each perimeter-to-interior boundary with an adjacent Full
cell MUST contain a sloped transition on the Full side of that boundary. The
transition span MUST be one full 28 mm grid pitch, with the lower end
matching the Full profile toward the interior and the higher end matching the
Heavy perimeter at the boundary. The transition MUST NOT create the sloped
portion in the outward Heavy-side cell.

#### Scenario: Hybrid side transition occupies one full inner cell

- **WHEN** a Hybrid board has at least one Full interior cell and no optional
  feature cuts
- **THEN** a probe moving from the interior cell center toward a selected
  perimeter boundary MUST encounter the Full height first
- **AND** the height MUST rise across a 28 mm transition span toward the
  Heavy boundary
- **AND** the corresponding outward half of the perimeter cell MUST remain at
  the Heavy profile rather than containing the transition ramp
- **AND** the through-opening MUST remain open along the probe line

#### Scenario: Hybrid transition retains the official side profiles

- **WHEN** a Hybrid board is generated with its supported profile and bridge
  settings
- **THEN** the interior end of each transition MUST meet the 6.8 mm Full
  profile within quality-gate tolerance
- **AND** the perimeter end MUST meet the 13.8 mm Heavy profile within
  quality-gate tolerance
- **AND** the generated result MUST remain a valid single solid with positive
  volume

### Requirement: Hybrid inner-corner diagonal transition

At a Hybrid perimeter corner, the two adjacent inward transitions MUST join
in the adjacent inner corner region and form a continuous diagonal ridge
toward the Full interior. The corner join MUST remain within the board
envelope and MUST NOT add an outward diagonal extension or close the
through-opening.

#### Scenario: Hybrid corner transitions converge inward

- **WHEN** a 3 by 3 or larger Hybrid board is generated with all four
  perimeter transitions enabled
- **THEN** each corner's two side transitions MUST be joined by a continuous
  diagonal transition surface in the inner corner region
- **AND** the diagonal join MUST extend from the Heavy corner boundary toward
  the Full interior without entering the through-opening
- **AND** the outer corner cell MUST retain the Heavy perimeter profile without
  an outward-facing ramp
- **AND** the corner through-opening MUST remain measurable

### Requirement: Official chamfer and connector behavior

The generator MUST support none, corners, and everywhere chamfer modes.
Corners mode MUST honor the four independent outer-corner flags without
moving the board envelope.

Connector holes MUST use an enable flag, independent side flags, official
inward-facing cutout geometry, and eligible seam placement. The connector
profile MUST preserve the official primary radius 2.6 mm, dimple radius
2.7 mm, separation 2.5 mm, cut height 2.4 mm, and variant-specific Z
placement. A one-cell axis MUST produce no duplicate seam positions. For
Hybrid, outer perimeter connector cuts MUST reach both Heavy layers, while
standard interior cells MUST retain the Full interface.

#### Scenario: Selected connector sides

- **WHEN** only selected connector sides are enabled
- **THEN** only those outer sides MAY receive connector cutouts
- **AND** unselected edge geometry MUST remain unchanged
- **AND** Hybrid connector cuts MUST remain present through the applicable
  Heavy perimeter layers

### Requirement: Official screw geometry and placement

Screw cutters MUST use the generic through diameter, head diameter, head
inset, countersunk toggle, and countersunk angle. The official default MUST
be 4.1 mm, 7.2 mm, 1 mm, enabled, and 90 degrees. Screw and connector
polygonal profiles MUST use the official 30-side and 50-side resolutions.

Screw positions MUST use the internal tile-intersection lattice. The modes
MUST behave as follows:

- none adds no screws;
- corners selects the de-duplicated outer lattice positions;
- everywhere selects every eligible lattice position;
- by-row-column applies the requested intervals; and
- custom uses exactly the validated custom positions.

The `screwCenter` modifier MUST add one de-duplicated internal lattice position
when both grid axes contain at least two cells. For each even cell-count axis,
it MUST select the exact central lattice coordinate. For each odd cell-count
axis, it MUST select the nearest central lattice coordinate with a stable
upper-left bias: negative X for columns and positive Y for rows in the
centered board coordinate system. A one-cell axis MUST keep the center
modifier invalid because no internal intersection exists on that axis.

Center and interval modifiers MUST add de-duplicated lattice positions.
Custom positions MUST be sorted and de-duplicated by normalization rather than
silently moved into cells.

#### Scenario: Generic screw placement

- **WHEN** a user selects official-default, custom dimensions, or a custom
  internal-intersection matrix
- **THEN** the normalized snapshot MUST contain generic screw dimensions and
  validated lattice positions
- **AND** generated cutters MUST use those dimensions and positions

#### Scenario: Center screw on an even-by-even board

- **WHEN** `screwCenter=true` is selected for a board with even `rows` and
  even `columns`, including the official 2 by 2 board
- **THEN** the center modifier MUST resolve to the exact central internal
  intersection
- **AND** existing `Corners` positions MUST remain de-duplicated with the
  center position

#### Scenario: Center screw on an odd grid

- **WHEN** `screwCenter=true` is selected with `rows >= 2` and `columns >= 2`
  and either axis has an odd cell count
- **THEN** validation MUST accept the snapshot
- **AND** the center modifier MUST resolve to the nearest internal intersection
  using the upper-left tie-breaker
- **AND** the board-level cutter MUST remove a screw hole at that resolved
  position using the selected screw dimensions

#### Scenario: Center screw with an official corner configuration

- **WHEN** `screwKind=official-default`, `screwMode=corners`, and
  `screwCenter=true` are selected on a valid odd-grid board
- **THEN** the official screw dimensions and corner holes MUST remain unchanged
- **AND** the resolved upper-left center-adjacent hole MUST be added to the
  effective screw centers

#### Scenario: Center screw on a one-cell axis

- **WHEN** `screwCenter=true` is selected while `rows < 2` or `columns < 2`
- **THEN** validation MUST reject the snapshot with an internal-intersection
  availability error
- **AND** the UI MUST keep the center control disabled

### Requirement: Half-cell board extension

The board MUST preserve the official full-cell profile and add a 14 mm
boundary host on each selected half-cell axis. left/right MUST map to the
negative/positive X outer side, and top/bottom MUST map to the
positive/negative Y outer side. Feature coordinates, connector placement, screw placement, centering, and variant thickness MUST use the final nominal grid envelope.

When `fitToTarget=true`, the generator MUST add a centered physical outer frame around the nominal grid envelope. The frame MUST use the selected variant's board height, MUST fill only the requested remainder on each axis, and MUST be fused to the completed nominal grid geometry after board feature cutters run on that nominal geometry. The frame MUST NOT receive or create a new grid host, connector seam, screw center, or Snap interface. The final physical bounds MUST equal the requested target dimensions on enabled axes.

The detailed shared half-cell direction, interface, and persistence contract
is defined by the opengrid-half-cell capability.

#### Scenario: Select a half-cell direction

- **WHEN** a user selects one or both half-cell directions
- **THEN** the derived board envelope MUST add 14 mm on each selected axis
- **AND** the board MUST remain centered with feature and connector placement
  on the final envelope

### Requirement: OpenGrid quality gate

Before a candidate is committed, the Worker quality gate MUST check the
expected centered bounds and base placement, positive volume, one-solid
topology, valid B-Rep, finite non-empty mesh, through-cell coverage, official
outer-rail and inner-capture probes, and selected half-cell boundary probes.

Feature-specific connector, screw, chamfer, Heavy-layer, Hybrid perimeter /
Full-interior, lifecycle, and export behavior MUST remain covered by the
contract and Worker integration tests. STEP and binary STL exports MUST be
produced from the quality-gated committed B-Rep revision.

#### Scenario: Invalid profile candidate

- **WHEN** a generated shape has the expected envelope but fails topology,
  mesh, through-cell, rail/capture, or half-cell checks
- **THEN** the candidate MUST be rejected before commit
- **AND** the previous committed revision MAY remain visible but MUST be stale

#### Scenario: Hybrid quality evidence

- **WHEN** a Hybrid board with an interior cell is quality-checked
- **THEN** the report MUST verify the 13.8 mm Heavy perimeter envelope
- **AND** it MUST verify Heavy-layer occupancy on the perimeter and Full-layer
  occupancy in the interior
- **AND** it MUST verify all requested cell openings and a single valid solid

### Requirement: Target frame quality evidence

The OpenGrid quality gate MUST verify target-frame geometry when `fitToTarget=true`. It MUST verify the final centered bounds, positive frame material on every enabled remainder axis, preservation of all nominal cell openings, and the absence of a second grid-host seam or feature location in the frame. A disabled target frame MUST use the existing nominal quality evidence.

#### Scenario: Target frame reaches the requested space

- **WHEN** a target-fitted board is quality-checked
- **THEN** its X/Y bounds MUST match the requested target dimensions within the existing bounds tolerance
- **AND** probes in each requested outer frame strip MUST intersect positive material
- **AND** all nominal cell openings MUST remain through-open

#### Scenario: Target frame keeps the OpenGrid interface stable

- **WHEN** a target-fitted board has connector holes or generated screws
- **THEN** those feature centers MUST equal the corresponding non-fitted nominal board centers
- **AND** probes in the added frame MUST NOT be reported as additional OpenGrid hosts

### Requirement: Optional official reference comparison

The repository MUST treat the official-reference comparison as an optional,
environment-gated test using
binary STL fixtures supplied through OPENGRID_OFFICIAL_REFERENCE_DIR. The test
MUST export the Replicad candidate and compare centered envelope coordinates
within 0.01 mm, absolute volume within 0.5 mm3, and representative section
occupancy with no more than eight fixed-grid mismatches.

The reference comparison MUST remain developer-only. OpenSCAD MUST NOT be
required by the browser, Worker, or production export path. Reference fixture
generation and execution are external verification steps, not product
runtime dependencies.

#### Scenario: Run the optional reference comparison

- **WHEN** OPENGRID_OFFICIAL_REFERENCE_DIR points to the supplied pinned-source
  binary STL fixtures
- **THEN** the test MUST export each selected Replicad candidate and apply the
  documented envelope, volume, and section-occupancy comparisons
- **AND** the test MUST remain skipped when the reference directory is not
  configured

### Requirement: Optional release benchmark

The repository MUST provide an environment-gated benchmark capability that
covers Full, Lite, Heavy, and Hybrid at 1 by 1, 2 by 2, 5 by 5, 10 by 10,
and 17 by 17 within the 500 mm limit. It MUST compare the available assembly strategies,
perform one cold run, one warm-up, and five measured runs, and retain quality
and export failures.

The benchmark MAY write structured and human-readable reports containing the
source commit, environment, selected strategy, fixture results, median, P95,
and known limitations. It MUST remain internal and MUST NOT add a product
route, catalog entry, persistence entry, or Worker protocol version.

#### Scenario: Run the optional reference comparison

- **WHEN** the release benchmark flag is enabled
- **THEN** the benchmark MUST execute the configured Full, Lite, Heavy, and
  Hybrid fixtures with cold, warm-up, and five measured samples
- **AND** quality/export failures MUST remain in the result
- **AND** report files MUST be written only when report output is explicitly
  enabled

### Requirement: OpenGrid Worker and workspace lifecycle

OpenGrid MUST use the existing version-1 Worker contract, route locking,
latest-wins invalidation, cancellation, candidate ownership, revision
pinning, progress, timeout/recovery, STEP export, binary STL export, and
deterministic filenames. A model.generate request MUST carry the complete
normalized snapshot, while model.invalidate MUST remain parameter-free.

The opengrid panel MUST expose variant, rows, columns, half-cell directions,
chamfer mode and corners, connector enable and sides, screw mode, generic
screw dimensions, intervals, and the internal-intersection custom matrix.
It MUST display derived width, depth, and thickness in millimetres.

#### Scenario: Latest-wins OpenGrid generation

- **WHEN** a newer valid or invalid snapshot supersedes a running OpenGrid
  generation
- **THEN** the older candidate MUST NOT commit or replace the newer revision
- **AND** invalidation MUST carry no parameter snapshot
- **AND** preview and exports MUST use the same committed B-Rep revision

### Requirement: OpenGrid board workspace integration

The runtime-validated catalog MUST keep the existing opengrid model id and
route /cad/opengrid bound to the official OpenGrid board definition. The route
MUST use the board's normalized parameter validator and component-local
builder, and MUST preserve the existing candidate, commit, preview, STEP, and
binary STL lifecycle.

#### Scenario: OpenGrid route initial generation

- **GIVEN** a user opens /cad/opengrid with browser CAD prerequisites
- **WHEN** the Worker reports engine.ready
- **THEN** the workspace MUST send generation 1 with modelId=opengrid and a
  valid saved snapshot, or the current OpenGrid defaults when no valid entry
  exists
- **AND** the Worker MUST route the request to the OpenGrid board builder
- **AND** the committed revision, bounds, preview, and exports MUST belong to
  opengrid

#### Scenario: OpenGrid model contract

- **GIVEN** the Worker receives model.generate with modelId=opengrid
- **WHEN** the parameters contain a valid normalized OpenGrid snapshot
- **THEN** the Worker MUST validate the variant, grid, half-cell, chamfer,
  connector, screw, and custom-position fields together
- **AND** a mismatched or invalid snapshot MUST be rejected with a diagnostic
  validation error

### Requirement: OpenGrid board controls

The /cad/opengrid workspace MUST expose Full/Lite/Heavy/Hybrid variant, rows, columns, X/Y half-cell directions, target X/Y dimensions, a persisted physical-target-frame checkbox, chamfer mode and corner flags, connector enable and side flags, generic screw dimensions, screw mode, center/interval modifiers, and an internal-intersection custom screw matrix. It MUST display the derived nominal or target width, depth, and maximum board thickness in millimetres. The target-frame control MUST explain that it adds a centered outer border and does not add grid hosts. The Hybrid description MUST identify its Heavy outer perimeter and standard Full interior rather than presenting it as a uniform 13.8 mm plate. The accessible screw-mode control MUST be rendered before the screw-size-source control, and any conditional row/column interval controls MUST remain associated with the screw-mode control.

#### Scenario: Configure current OpenGrid controls

- **WHEN** a user changes variant, grid, half-cell, target, chamfer, connector, screw, or custom-intersection values
- **THEN** the pending typed snapshot MUST contain those normalized fields
- **AND** selecting Hybrid MUST preserve the existing rows, columns, half-cell, target, feature, and persistence fields
- **AND** derived dimensions MUST use the nominal half-cell envelope unless target fitting is enabled
- **AND** target fitting MUST show the centered physical target envelope when enabled
- **AND** the derived dimensions MUST show Hybrid's 13.8 mm maximum thickness
- **AND** the settled input MUST use the existing debounce and Worker lifecycle

#### Scenario: Screw mode appears before screw size source

- **WHEN** a user views the `/cad/opengrid` parameter panel
- **THEN** the accessible `OpenGrid 螺絲孔模式` select MUST appear before the accessible `OpenGrid 螺絲尺寸來源` select
- **AND** selecting `by-row-column` MUST show its row and column interval controls as part of the screw-mode section

#### Scenario: Hybrid control remains compatible with existing accessories

- **WHEN** a user selects Hybrid and generates a board with an interior cell
- **THEN** the panel MUST explain that interior cells use standard Full
  OpenGrid interfaces
- **AND** the route MUST continue using modelId=opengrid and the existing
  preview, STEP, and STL export controls

### Requirement: OpenGrid board persistence and stale preview

The OpenGrid workspace MUST use the existing per-component persistence and
latest-wins behavior. Invalid input MUST invalidate a newer generation rather
than generating native geometry, and a stale or invalid generation MUST NOT
replace the last committed OpenGrid revision or enable exports.

#### Scenario: OpenGrid invalidation

- **WHEN** a newer OpenGrid draft is invalid or supersedes a running
  generation
- **THEN** the workspace MUST send parameter-free model.invalidate with the
  newer generation
- **AND** the older candidate MUST not commit
- **AND** the last committed preview MAY remain visible but MUST be stale
