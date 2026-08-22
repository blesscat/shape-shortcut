## Why

The OpenGrid Snap already exposes a centered rectangular remover opening with an 8 × 8 mm lower square and a 4 × 8 mm upper passage. The Round Box currently offers only round locating holes or seats, so it cannot use that center opening as a captive quarter-turn attachment point.

## What Changes

- Add a cylinder-only `center-hook` locating mode to the existing Round Box bottom-seat choices.
- Generate one centered rectangular male hook that fits the Snap remover profile, can be inserted in one orientation, and captures after a 90-degree rotation.
- Preserve the existing `none`, `hole`, and `integrated` cylinder seat modes, their legacy migration, and the `opengrid-stackable-cylinder` model identity and route.
- Validate the hook envelope, fit dimensions, engagement depth, single-solid result, preview bounds, and STEP/STL export metadata for both Full and Lite Snap heights.
- Add behavior-focused unit, Worker integration, workspace/persistence, catalog, and export regression coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-stackable-cylinder`: add the centered quarter-turn hook mode and its Snap center-remover compatibility contract while preserving all existing shell, stacking, opening, and seat behavior.
- `component-parameter-persistence`: persist and hydrate the cylinder-only fourth seat value without widening the Box or shared seat contracts.
- `opengrid-locating-assembly-interface`: describe the cylinder-specific center-hook choice alongside the unchanged three-mode seat interface shared by the existing models.

## Impact

- Extends the typed cylinder parameter snapshot, raw workspace parsing, persistence normalization, catalog panel, deterministic STEP/STL filenames, CAD-kernel builder, quality report, and localized labels.
- Reuses the existing repository-owned Snap center-remover dimensions; no Snap model geometry, identity, route, or asset changes are required.
- Existing cylinder snapshots remain valid and default to the current `bottomSeatMode='hole'`; the shared Box seat enum and Box behavior remain unchanged.
- The new geometry is OpenGrid behavior but does not add a new component, so the existing `opengrid-stackable-cylinder` naming is intentionally preserved.
