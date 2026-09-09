## Why

Large stackable boxes in material-saving honeycomb mode can exhaust the fixed
OpenCascade WASM memory ceiling after several minutes of generation. The
current builder retains many native cutter solids and then performs repeated
full-shape quality booleans; a 7x7 box at a taller height can fail even though
the honeycomb geometry itself is valid. The mode needs a bounded-memory
construction strategy so larger practical boxes remain previewable and
exportable without changing the existing box contract.

## What Changes

- Change honeycomb construction to produce and dispose of side and bottom
  geometry in bounded batches instead of retaining all native cutters and
  intermediate clipped batches.
- Replace per-cell 3D subtraction for eligible box side panels with a planar
  lattice profile extruded as a panel, while preserving clipped boundary cells,
  printable ribs, opening bridges, rails, transitions, and protected frames.
- Replace eligible bottom-floor per-cell subtraction with a protected planar
  lattice profile that preserves sockets, ordinary holes, safety rings, seams,
  guides, and base-plate or thin-shell structures.
- Keep honeycomb geometry as one valid non-empty solid with the existing
  footprint, height, mode, opening, interface, preview, and STEP/STL contracts.
- Keep the existing honeycomb quality gate and add memory-bounded validation
  coverage for 7x7 boxes at taller heights and for all supported corner-seat
  modes; a genuine unsupported memory ceiling must fail diagnostically without
  replacing the last valid model.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-stackable-box`: require memory-bounded honeycomb construction and
  preserve the existing Hex Mesh geometry, protected-feature, quality, and
  export behavior for larger practical box sizes. The existing
  `opengrid-stackable-box` model ID, route, and parameter contract are
  intentionally preserved.

## Impact

- Affects the stackable-box honeycomb builder, lattice profile generation,
  quality-gate integration, and related unit/integration/performance fixtures.
- Changes the internal B-Rep construction strategy but does not change the
  public parameter or model APIs.
- May reduce the number of expensive full-shape booleans and native OpenCascade
  allocations while increasing the importance of profile topology and solid
  parity tests.
- No dependency, WASM binary, or user-facing model identity migration is
  required.
