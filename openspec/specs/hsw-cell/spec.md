# hsw-cell Specification

## Purpose

定義以 repository 內 `hsw-cell.step` 為 canonical B-Rep asset 的獨立六角蜂巢 component，包括參數、排列、bounds、單一 solid、無圓角、Worker lifetime 與效能要求。HSW 只共用平台層的 model/message/revision/export lifecycle；不得使用 `box` 或 `modular-grid-base` 的 component-specific builder、assembly、template cache 或 fillet 流程。
## Requirements
### Requirement: HSW parameters and canonical asset

The system MUST provide an `hsw-cell` component with `rows` and `columns` as positive integers in the inclusive range 1–20. The component MUST use the colocated `hsw-cell.step` as its canonical runtime geometry asset. Each generated cell MUST preserve the asset's original scale, orientation, and fixed 8 mm height; the component MUST NOT create a cutter or rebuild the cell procedurally for every request.

#### Scenario: 1x1 canonical HSW cell

- **WHEN** `hsw-cell` is generated with `rows=1` and `columns=1`
- **THEN** the builder MUST use one clone of the validated `hsw-cell.step` asset
- **AND** the resulting B-Rep bounds MUST be approximately `27.25093325 × 23.60000050 × 8 mm` within workspace tolerance
- **AND** the lowest Z MUST be 0 mm

#### Scenario: Invalid HSW counts

- **WHEN** `rows` or `columns` is zero, negative, fractional, non-finite, non-integer, greater than 20, or causes the derived envelope to exceed the workspace limit
- **THEN** generation MUST be rejected before HSW CAD geometry is created
- **AND** the caller MUST receive a stable validation error

#### Scenario: Canonical asset validation

- **WHEN** the Worker initializes the HSW builder
- **THEN** it MUST load the component-local `hsw-cell.step` as a non-empty single-solid B-Rep
- **AND** it MUST validate the expected asset-derived approximately `27.25093325 × 23.60000050 × 8 mm` bounds within tolerance
- **AND** a missing, malformed, non-solid, or incorrectly sized asset MUST produce a diagnosable model-asset error

#### Scenario: Canonical asset is packaged for production

- **WHEN** the application is built for production
- **THEN** the HSW Worker MUST be able to resolve and import the committed component-local `hsw-cell.step` asset through its production URL
- **AND** the production asset MUST pass the same non-empty, single-solid, bounds, and Z=0 validation as the development asset

### Requirement: Flat-top honeycomb placement

The system MUST place exactly `rows × columns` HSW cells without implicit rotation, mirroring, or scaling. With the supplied flat-top orientation, columns MUST advance along X by the asset-derived `columnPitch` approximately 20.43819994 mm, rows MUST advance along Y by the asset-derived `rowPitch` approximately 23.60000050 mm, and alternating columns MUST be offset along Y by the asset-derived `staggerY` approximately 11.80000025 mm. The complete generated envelope MUST be centered on X/Y while the cell base remains at Z=0. Row and column indices MUST be zero-based: `r ∈ [0, rows-1]` and `c ∈ [0, columns-1]`; only columns where `c mod 2 = 1` receive the alternating offset.

#### Scenario: One-column vertical chain

- **WHEN** `columns=1` and `rows>1`
- **THEN** cell centers MUST be separated along Y by the asset-derived `rowPitch` approximately 23.60000050 mm
- **AND** the chain MUST be centered on Y=0
- **AND** no alternating-column offset MUST be applied

#### Scenario: Staggered multi-column layout

- **WHEN** `columns>1`
- **THEN** every zero-based odd-indexed column MUST be shifted by the asset-derived `staggerY` approximately 11.80000025 mm along Y relative to the preceding even-indexed column
- **AND** all requested logical rows MUST remain present in every column
- **AND** adjacent hexagonal cell boundaries MUST meet without a layout gap or unintended volumetric overlap

#### Scenario: Cell orientation is preserved

- **WHEN** an HSW grid contains more than one cell
- **THEN** every cell MUST retain the supplied STEP orientation and opening direction
- **AND** the builder MUST not rotate or mirror individual cells as part of honeycomb placement

### Requirement: Derived HSW bounds and centered placement

The system MUST derive component bounds from the same HSW-specific layout constants used by the HSW Worker builder. For `C=columns` and `R=rows`, the expected envelope width MUST be `outerWidth + (C - 1) × columnPitch`; the expected depth MUST be `outerDepth × R` when `C=1`, otherwise `outerDepth × (R + 0.5)`; and the expected height MUST be 8 mm. The bounds MUST remain centered on X/Y within tolerance. These helpers MUST NOT be imported from or implemented inside `modular-grid-base`.

#### Scenario: Two-by-two HSW bounds

- **WHEN** the component is generated with `rows=2` and `columns=2`
- **THEN** the resulting bounds MUST be approximately `47.68913319 × 59.00000125 × 8 mm`
- **AND** the bounds center on X/Y MUST be the world origin
- **AND** the minimum Z MUST be 0 mm

#### Scenario: Maximum legal HSW bounds

- **WHEN** the component is generated with `rows=20` and `columns=20`
- **THEN** the resulting envelope MUST remain within the configured 500 mm workspace dimension limit
- **AND** the bounds metadata and measured B-Rep bounds MUST agree within tolerance

### Requirement: Single-solid sharp HSW B-Rep

The system MUST fuse adjacent HSW cells into one valid single-solid B-Rep suitable for exact mesh generation, STEP export, and STL export. The finalization path MUST NOT apply an additional planar or edge fillet to the cells or overall envelope; the generated geometry MUST retain the supplied sharp hexagonal boundaries.

#### Scenario: Adjacent HSW cells fuse

- **WHEN** a valid HSW grid contains more than one cell
- **THEN** adjacent cells MUST fuse into one connected solid without gaps
- **AND** the result MUST contain exactly one solid
- **AND** the result MUST pass B-Rep validity and non-empty mesh checks

#### Scenario: No generated corner fillet

- **WHEN** an HSW grid is finalized
- **THEN** the builder MUST NOT run an external-corner fillet stage
- **AND** the outer hexagonal boundaries and cell openings MUST remain sharp as supplied by the STEP asset

### Requirement: Efficient HSW assembly

The system MUST provide a repeatable HSW-only Worker assembly benchmark using the canonical STEP asset, production preview settings, and `1×1`, `2×2`, `5×5`, `10×10`, and `20×20` fixtures. The benchmark MUST distinguish cold asset import from warm cached generation in the same Worker epoch, warm up once, attempt at least five measured runs for each HSW strategy and fixture, and report median/P95 timings for asset loading, assembly/fuse, mesh generation, and total generation. For grids with at least 100 cells, production generation MUST use a canonical-column clone/translate and bounded balanced/block fuse path rather than an unbounded per-cell left-fold. The benchmark MUST NOT use `box` or `modular-grid-base` as an implementation baseline.

#### Scenario: Large HSW grid uses the optimized path

- **GIVEN** a valid `10×10` or `20×20` HSW request
- **WHEN** the Worker assembles the B-Rep
- **THEN** it MUST build one canonical column, clone/translate columns with their alternating Y offsets, and combine bounded column/block groups
- **AND** it MUST not use the unbounded sequential per-cell assembly path
- **AND** the final result MUST still satisfy the single-solid, bounds, mesh, and export requirements

#### Scenario: Optimized path performance gate

- **GIVEN** sequential baseline and optimized results collected on the same reference environment
- **WHEN** the HSW performance gate is evaluated
- **THEN** the optimized path MUST reduce warm cached-generation median time by at least 20% for both `10×10` and `20×20`
- **AND** it MUST not regress warm cached-generation median time by more than 10% for either `1×1` or `2×2`
- **AND** a baseline timeout or failure MUST be retained as an explicit strategy/fixture/phase/error record and MUST NOT be silently omitted from the gate report

#### Scenario: Progress reports logical cell completion

- **WHEN** the Worker builds an HSW grid
- **THEN** progress MUST report `unit=cells`, `total=rows × columns`, and a monotonic completed count beginning at 0 and ending at `rows × columns`
- **AND** the final successful progress event MUST report `completed=rows × columns` for the requested logical grid

### Requirement: Cooperative HSW cancellation and native ownership

The HSW Worker builder MUST check generation freshness before creating each cell or column clone, after clone/translate, and before and after each fuse or finalization boundary. If a newer generation or invalidation makes the operation stale, it MUST stop at the next safe boundary, release all uncommitted native shapes exactly once, and return the existing stale/superseded terminal response.

#### Scenario: HSW generation becomes stale during assembly

- **GIVEN** an HSW generation is assembling and a newer generation becomes latest
- **WHEN** the current atomic CAD call reaches its next safe boundary
- **THEN** the older generation MUST not start another clone or fuse
- **AND** it MUST not commit a candidate or change the current revision
- **AND** it MUST terminate with the original operation correlation and stale/superseded reason

#### Scenario: HSW cancellation cleans intermediate shapes

- **GIVEN** a stale HSW generation owns cells, a partial canonical column, or column fuse groups
- **WHEN** cancellation cleanup runs
- **THEN** every unowned intermediate shape MUST be deleted exactly once
- **AND** the Worker MUST remain able to build the latest HSW generation in the same epoch

### Requirement: HSW template cache and component-local builder boundary

The HSW builder and `hsw-cell.step` asset MUST remain colocated under the HSW component directory. The Worker MUST expose an HSW-specific template loader/cache, import and cache the validated template at most once per Worker epoch, reuse it across HSW generations, and dispose it when the Worker epoch is disposed. HSW generation MUST route through an independent kernel model definition and MUST NOT embed HSW geometry in the generic box builder, `modular-grid-base` builder, or either existing component's template cache.

#### Scenario: HSW asset is reused across generations

- **WHEN** multiple valid HSW generations run in one Worker epoch
- **THEN** the Worker MUST reuse one imported HSW template
- **AND** each generation MUST create its own owned clones or assembly candidates
- **AND** disposing the Worker MUST release the cached template and all pending HSW candidates

### Requirement: HSW component isolation

The HSW component MUST have explicit contract, catalog, kernel, Worker-cache, export metadata, and test dispatch points. A missing HSW registration or unknown HSW model id MUST produce a diagnosable error; it MUST NOT fall through to `box` or `modular-grid-base`. Adding HSW MUST NOT change the existing components' parameter validation, bounds, builder selection, fillet behavior, template-cache lifetime, or filename outputs.

#### Scenario: HSW dispatch does not fall back to modular

- **WHEN** a valid `hsw-cell` request is sent through contract validation, kernel registration, Worker generation, or export filename resolution
- **THEN** every dispatch point MUST resolve explicitly to HSW metadata and HSW component-local implementation
- **AND** no dispatch point MAY resolve the request through `modular-grid-base` as a default branch

#### Scenario: Existing component behavior remains isolated

- **WHEN** the HSW catalog and Worker integration are enabled
- **THEN** existing `box` and `modular-grid-base` requests MUST continue to resolve their original builders, template caches, bounds, fillet behavior, cancellation lifecycle, and export filenames
- **AND** HSW-specific constants or assembly code MUST NOT alter those results

### Requirement: HSW component catalog and route

The runtime-validated component catalog MUST expose an independent `hsw-cell` definition with stable model id, display metadata, rows/columns parameter schema, default parameters `{ rows: 1, columns: 1 }`, bounds metadata, and export filename metadata. The model-specific route `/cad/hsw-cell` MUST bind only to this definition, and the CAD workspace MUST remain route-locked without an in-place model selector.

#### Scenario: HSW route starts the correct component

- **WHEN** a user opens `/cad/hsw-cell` and the CAD runtime is available
- **THEN** the workspace MUST initialize with `modelId=hsw-cell`
- **AND** generation 1 MUST use valid saved HSW rows and columns when available, otherwise the HSW definition's default rows and columns
- **AND** the Worker MUST route the request to the HSW component-local builder

#### Scenario: HSW workspace shows only HSW controls

- **WHEN** a user views the `/cad/hsw-cell` workspace
- **THEN** the UI MUST identify the HSW component
- **AND** it MUST show rows and columns controls for the HSW grid
- **AND** it MUST NOT show box dimensions or a model selector

### Requirement: HSW slider controls and contract validation

The HSW workspace MUST expose `rows` and `columns` as range controls with minimum 1, maximum 20, and step 1. Normal UI interaction MUST use these sliders rather than free-form text input, so the workspace does not need a separate decimal or empty-string input path. Before sending `model.generate`, the main thread MUST still validate the resulting snapshot against the HSW contract; non-finite, out-of-range, mismatched, or programmatically malformed snapshots MUST be rejected without rounding, must advance generation/invalidation semantics, and must not start HSW CAD geometry. A valid HSW snapshot MUST use the existing settled-input debounce behavior.

#### Scenario: Valid HSW parameter change

- **WHEN** a user changes HSW rows or columns to a legal integer and the input settles
- **THEN** the workspace MUST send a newer `model.generate` with `modelId=hsw-cell`
- **AND** the resulting committed bounds MUST match the HSW layout contract within tolerance

#### Scenario: Invalid HSW snapshot is rejected at the contract boundary

- **WHEN** the workspace receives a zero, negative, non-finite, out-of-range, or mismatched HSW snapshot from any source
- **THEN** the workspace MUST show a component-specific validation error
- **AND** it MUST send `model.invalidate` rather than `model.generate`
- **AND** export MUST remain disabled while the input is invalid or stale

### Requirement: HSW Worker preview and revision contract

The Worker MUST return HSW candidate and committed model events with `modelId=hsw-cell`, the validated rows/columns parameters, non-empty mesh, and bounds matching the HSW component contract. The main thread MUST keep the existing candidate commit, stale preview, model revision, and Worker ownership lifecycle for HSW exactly as for other catalog components.

#### Scenario: HSW candidate becomes ready

- **WHEN** a valid HSW generation completes in the Worker
- **THEN** the Worker MUST emit a candidate containing HSW parameters, mesh, and bounds
- **AND** the main thread MUST validate and commit only the latest candidate
- **AND** the viewport MUST display the committed HSW geometry and dimension annotations

### Requirement: HSW STEP metadata

The HSW catalog definition MUST provide the deterministic STEP filename `hsw-cell-{columns}x{rows}.step`. STEP generation MUST use the selected committed HSW B-Rep revision in the Worker and MUST NOT reconstruct the file from the viewport mesh.

#### Scenario: HSW STEP export

- **WHEN** a ready `hsw-cell` revision with `rows=2` and `columns=2` is exported
- **THEN** the request MUST be correlated to that HSW model revision and Worker epoch
- **AND** the suggested filename MUST be `hsw-cell-2x2.step`
- **AND** the downloaded bytes MUST be non-empty exact STEP output from the committed HSW B-Rep

### Requirement: hsw-cell dimension calculation

The `hsw-cell` dimension calculator MUST derive `columns` and `rows` from the
canonical cell envelope and stagger layout owned by this capability: it MUST
choose the greatest legal column count within the existing 1–20 range whose
width fits `targetX` and whose single-row envelope also fits `targetY`, then
choose the greatest legal row count whose envelope depth fits `targetY`. The
calculation MUST account for the additional half-row depth required when
columns are greater than one. Component-specific envelope constants and
stagger rules MUST remain owned by this capability rather than by the shared
dimension-calculator capability.

#### Scenario: Staggered depth limits the calculation

- **GIVEN** targets that can contain a 2 × 2 `hsw-cell` envelope but not a
  third column or row
- **WHEN** the user calculates cells from the target X and Y dimensions
- **THEN** the calculator MUST produce `columns=2` and `rows=2`
- **AND** it MUST use the envelope including the additional half-row depth for
  multiple columns

#### Scenario: Target below one cell envelope is rejected

- **WHEN** a target cannot contain one legal `hsw-cell` envelope in the
  requested direction
- **THEN** the calculator MUST reject the target with an accessible
  field-level diagnostic
- **AND** the current rows and columns MUST remain unchanged

