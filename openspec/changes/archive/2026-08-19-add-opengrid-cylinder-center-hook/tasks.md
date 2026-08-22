## 1. Characterize the behavior with failing tests

- [x] 1.1 Add contract tests for the cylinder-only `center-hook` seat value, rejection by the Box/shared seat validator, min-Z bounds, and deterministic STEP/STL suffixes.
- [x] 1.2 Add workspace and persistence tests for round-tripping `center-hook`, restoring it from valid storage, preserving legacy `bottomHolesEnabled` migration, and keeping Box snapshots limited to three seat values.
- [x] 1.3 Add catalog and panel behavior tests for the fourth mutually exclusive `中心卡勾` radio choice, its description, and preservation of the existing three Box choices.
- [x] 1.4 Add Worker/integration tests that exercise the centered two-stage hook, one-solid output, Full/Lite mating envelope, 90-degree capture relationship, and absence of outer locating geometry.

## 2. Extend the cylinder contract and parameter plumbing

- [x] 2.1 Introduce the cylinder-local seat-mode type and validator support for `center-hook` without widening `OpenGridLocatingSeatMode` or the Stackable Box contract.
- [x] 2.2 Update cylinder bounds, hole-center helpers, catalog schema, model parameter exports, raw workspace parsing, and validation diagnostics for the fourth mode while preserving the `hole` default and legacy migration.
- [x] 2.3 Update cylinder persistence normalization and typed state handling so `center-hook` is stored canonically and invalid values cannot overwrite accepted snapshots.
- [x] 2.4 Add localized Traditional Chinese and English labels/descriptions for `中心卡勾` / `Center hook`, including the quarter-turn Snap explanation.

## 3. Build and fuse the centered hook

- [x] 3.1 Add fixed hook geometry constants for the nominal 8 × 4 head, 0.2 mm per-side clearance, short 2.9 mm downward span, round rotation stem, and insertion orientation.
- [x] 3.2 Add the `center-hook` bottom-feature path to the cylinder Worker builder, fusing one centered rectangular head and round rotation stem at Z=0 and skipping stepped holes, round seats, and outer cardinal features.
- [x] 3.3 Preserve all default, thin-bottom, bottom-plate, side-opening, stacking, and honeycomb paths, protecting the hook footprint from destructive post-processing.

## 4. Add quality gates and export behavior

- [x] 4.1 Extend cylinder quality inspection to recognize the hook's centered head/stem envelopes, short Z span, positive insertion and rotation clearance, fused single-solid result, and lack of outer locating geometry.
- [x] 4.2 Update quality error mapping and lifecycle behavior so invalid or stale hook candidates cannot replace the last valid preview or enable export.
- [x] 4.3 Extend deterministic STEP/STL metadata with `-seats-center-hook` and verify preview bounds/export eligibility for all four seat modes.

## 5. Verify regressions and complete the change

- [x] 5.1 Run focused contract, workspace, persistence, catalog, and Worker cylinder tests; fix regressions while keeping tests behavior-focused.
- [x] 5.2 Run the relevant full unit/Worker suites and production checks, including formatting/typecheck/build validation where configured.
- [x] 5.3 Confirm the existing `opengrid-stackable-cylinder` model ID, route, catalog entry, and all existing seat modes remain unchanged, then mark the implementation tasks complete.
- [x] 5.4 Refine the center hook to use a short rectangular capture head and a round rotation stem sized to the Snap passage, then add regression coverage for continuous rotation clearance and the shortened engagement distance.
