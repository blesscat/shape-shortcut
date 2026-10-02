## Purpose

Keep CAD-kernel builder files reviewable by organizing them into focused, single-responsibility modules, while guaranteeing that readability refactors never change generation behavior or the public import surface that `src/` and `tests/` depend on.

## Requirements

### Requirement: OpenGrid builder is organized into focused modules

The OpenGrid CAD-kernel builder directory (`src/cad-kernel/components/opengrid/`) MUST be organized so that geometry construction is grouped into focused modules by responsibility (spatial assembly, tile construction, layer bridges, grid surface, prototype template, hybrid transition, hybrid surface, target frame, cutter construction, connector cutter construction), and the `builder.ts` entry module MUST retain only shared context/strategy types, shared generation helpers, product-base dispatch, board-feature application, top-level orchestration, and the public export surface. The modules produced by this split and the `builder.ts` entry module MUST each stay within the established size band (target roughly 300–500 lines, hard ceiling 550 lines), following the existing `opengrid-stackable-box/` multi-module precedent. Pre-existing modules in the directory that this split does not touch (for example `quality.ts` and `profile.ts`) are out of scope for the size band.

#### Scenario: No oversized builder file remains

- **WHEN** the line counts of `builder.ts` and the modules created by the split in `src/cad-kernel/components/opengrid/` are measured after the change
- **THEN** `builder.ts` and every new module MUST each be at or below 550 lines
- **AND** each new module MUST contain exactly one cohesive responsibility cluster from the approved split map

#### Scenario: Shared helpers keep a single definition

- **WHEN** the shared generation helpers and context/strategy types are examined after the split
- **THEN** each helper and type MUST have exactly one definition, hosted by the `builder.ts` entry module
- **AND** sibling modules MUST import them from the entry module rather than duplicating them

### Requirement: OpenGrid builder public import path is stable

The module path `src/cad-kernel/components/opengrid/builder` MUST remain the public import surface for the OpenGrid B-Rep builder. Every export available from that path before the split MUST remain importable from it after the split with unchanged names, types, and signatures. Source and test consumers MUST keep working without edits to their import statements.

#### Scenario: Existing consumers compile unchanged

- **WHEN** `pnpm check` runs after the split with `src/` and `tests/` import statements untouched
- **THEN** all consumers importing from `components/opengrid/builder` (model index, workers, benchmarks, sibling components, unit and worker tests) MUST type-check successfully

#### Scenario: Re-exported API keeps original names and signatures

- **WHEN** the exports of `src/cad-kernel/components/opengrid/builder` are compared before and after the split
- **THEN** every export available before the split MUST remain importable from that path with the same name, type, and signature, including `buildOpenGridBRep`, `buildOpenGridBRepWithStrategy`, `buildOpenGridCanonicalTile`, `buildOpenGridPrototype`, `importOpenGridPrototypeTemplate`, `loadOpenGridPrototypeTemplate`, `effectiveScrewPositionsForOpenGrid`, `OPENGRID_PRODUCT_STRATEGIES`, `OPENGRID_PROTOTYPE_TEMPLATE_URLS`, and the `OpenGridBuildContext`, `OpenGridAssemblyStrategy`, and `OpenGridProductStrategy` types
- **AND** any newly added exports MUST be limited to internal helpers needed for cross-module imports and MUST NOT change the behavior of existing exports

### Requirement: Readability splits are verbatim and behavior-preserving

A module-split refactor of a CAD-kernel builder MUST move code verbatim: it MUST NOT change logic, identifiers, function signatures, error codes, geometry outputs, progress/phase reporting, or resource disposal behavior. Newly authored code MUST be limited to import statements, re-export barrels, and module file boundaries. The split MUST pass the repository validation gates (`pnpm check`, Prettier check on touched files, and the affected-test command) before it is considered complete.

#### Scenario: Validation gates pass after the split

- **WHEN** the split is complete and `pnpm check`, `pnpm exec prettier --check` on the touched files, and `pnpm test:changed` are run
- **THEN** all three gates MUST pass without test intent changes or new test skips

#### Scenario: Diff contains only moved code and glue

- **WHEN** the change diff is reviewed with move detection enabled
- **THEN** all extracted geometry logic MUST be present verbatim at its new location
- **AND** the only additions MUST be import/export glue and barrel re-exports
