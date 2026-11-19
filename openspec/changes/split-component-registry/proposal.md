# Proposal

## Why

`src/cad-kernel/model/index.ts` (909 lines) and `src/workers/error-mapping.ts`
(221 lines) are the two shared registry files that every CAD component change
has to touch: the first holds every component's model definition, the second
holds every component's error rules. Both are listed in `sharedCadPrefixes` in
`scripts/affected-tests.mjs` (`scripts/affected-tests.mjs:23` and
`scripts/affected-tests.mjs:27`), so any change under them is classified as
"shared CAD infrastructure changed" and `pnpm test:branch` runs the entire CAD
suite — about 841 tests and 57 minutes. PR #210 (game-box) paid that on every
run of the branch, even for commits that only touched game-box files; the
related-test mode on such a commit still had to run 248 tests in 160 seconds.

## What Changes

- Move each component's model definition out of `src/cad-kernel/model/index.ts`
  into a per-component module that lives next to that component's builder
  (`src/cad-kernel/components/<component>/definition.ts`).
- Move each component's error rules out of `src/workers/error-mapping.ts` into
  per-component rule modules (`src/workers/error-rules/<component>.ts`).
- Collect both sets automatically from the two shared modules, so adding or
  changing a component never requires editing `src/cad-kernel/model/index.ts`
  or `src/workers/error-mapping.ts`.
- Keep the first-match error-rule order byte-for-byte equivalent to today's
  order, and keep the public import surface of both shared modules named and
  unchanged for the symbols that consumers actually use.
- Leave `scripts/affected-tests.mjs` unchanged: the shared prefixes still point
  at the same two shared files, and the new per-component files live outside
  those prefixes, so a component change now selects the related tests instead
  of the full CAD suite.
- Change no behaviour: generated geometry, error codes, error stages, model
  IDs, parameter contracts, and export formats stay identical.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cad-kernel-module-organization`: CAD-kernel component definitions and Worker
  error rules become per-component owned modules that the shared registries
  collect automatically, instead of per-component entries that live inside two
  shared files.
- `local-affected-testing`: a change that only touches component-owned files
  selects the related tests instead of the full CAD group, and a change to the
  shared registries still selects the full CAD group.

## Impact

- Source: `src/cad-kernel/model/index.ts` and `src/workers/error-mapping.ts`
  shrink to shared context, shared dispatch, and collection; new per-component
  modules appear under `src/cad-kernel/components/<component>/` and
  `src/workers/error-rules/`.
- Tests: new characterization tests for the registry contents, the error-rule
  order, the geometry baseline, and the affected-test plan. The glob approach
  changes no import path, so existing tests keep their import statements
  unchanged; the only edit to an existing test is the order-independent
  rewrite of the `kernelModelDefinitions` order assertion in
  `tests/unit/hsw-cell-kernel.test.ts`.
- Public contract: unchanged for the named registry surface.
  `KernelBuildContext`, `KernelModelDefinition`, `KernelModelBuildResult`,
  `KernelBuildPhase`, `kernelModelDefinitions`, `getKernelModelDefinition`,
  `buildModelBRep`, `buildModelBRepWithParts`, `cadErrorCodeFor`, and
  `cadErrorStageFor` keep their names, types, and signatures. The 21
  per-component `*KernelDefinition` constants are removed: they have no
  consumer anywhere in `src/`, `tests/`, or `e2e/`, and keeping them would
  force an edit of the shared file for every new component.
- No new dependency, no schema change, no data migration, no CI change.
- Existing component IDs are intentionally preserved; this change introduces no
  new component and therefore does not add any `opengrid-<component-slug>`
  identifier.
