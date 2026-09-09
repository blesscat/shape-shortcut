## Why

CAD generation currently keeps the same OpenCascade WASM runtime across
parameter changes. Although stale generations are rejected, the native heap
can remain at a high-water mark and later generations can fail under memory
pressure. The workspace also emits invalidation traffic for every input
change, even though only the final settled snapshot needs to be generated.

## What Changes

- Give all model generations a dedicated 10-minute absolute build/mesh budget,
  retaining existing initialization, candidate commit, and export deadlines.
  Progress does not extend the deadline indefinitely; settled new input still
  replaces the old Worker immediately after debounce.

- Debounce Worker-bound generation control so rapid valid input changes produce
  only one generation for the latest settled snapshot.
- Use a fresh dedicated CAD Worker for every debounced valid model generation,
  regardless of model type or geometry profile.
- Preserve the latest UI parameter snapshot and preview mesh while the new
  Worker initializes, but mark the preview stale and disable export until the
  new generation commits.
- Ensure the new Worker receives exactly one current snapshot after
  `engine.ready`; it must not first generate an automatic duplicate default
  snapshot.
- Advance the Worker epoch and ignore results, commits, exports, and errors
  from a terminated or superseded Worker.
- Keep invalid snapshots on the validation/invalidation path without starting
  a new model build or an unnecessary Worker initialization.
- Preserve all existing model IDs, parameter contracts, geometry behavior, and
  export formats.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cad-workspace`: change generation settling, Worker lifecycle isolation,
  stale-preview behavior, export availability, and latest-wins handling.

## Impact

- Affects the workspace generation scheduler, CAD Worker startup and epoch
  handling, committed-preview state, and export gating.
- Adds Worker lifecycle and browser end-to-end coverage for rapid input,
  repeated generation, initialization, stale results, and export recovery.
- Uses the measured browser initialization cost of approximately 1.56 seconds
  on a cold load and 0.23–0.46 seconds with the WASM asset cached.
- No new runtime dependency, backend service, branch, or pull request is
  required; implementation remains on the existing PR branch.
