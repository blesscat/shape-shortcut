## ADDED Requirements

### Requirement: Component model definitions and error rules are owned per component

Every CAD component MUST own its model definition, and the Worker error rules
that belong to it, in module files that belong to that component, and MUST NOT
require edits to the shared registry modules `src/cad-kernel/model/index.ts` or
`src/workers/error-mapping.ts` in order to add or change that component. The
shared registry modules MUST discover those modules automatically and MUST keep
the public registry surface named in the scenario below with unchanged names,
types, and signatures.

#### Scenario: Adding a component does not edit the shared registries

- **WHEN** a component's definition module and error rule module are added under
  that component's own directories
- **THEN** neither `src/cad-kernel/model/index.ts` nor
  `src/workers/error-mapping.ts` MUST require any change
- **AND** the shared registries MUST expose that component's definition and
  error rules after the change

#### Scenario: Rules that belong to no component live in a shared rule module

- **WHEN** a Worker error rule is emitted by shared cross-component code and
  therefore belongs to no single CAD component
- **THEN** that rule MUST live in the shared rule module
- **AND** it MUST NOT be distributed across per-component rule modules

#### Scenario: Every component is collected exactly once

- **WHEN** the collected model definitions are inspected
- **THEN** each component definition module MUST contribute exactly one
  definition
- **AND** every collected definition id MUST be a known model id
- **AND** no two collected definitions MUST share the same id
- **AND** a malformed, duplicated, or missing per-component module MUST fail the
  check instead of being silently ignored

#### Scenario: Changing one component touches only that component's files

- **WHEN** a component's builder, definition module, or error rule module is
  changed
- **THEN** no shared registry module MUST require any change
- **AND** the changed paths MUST remain confined to files owned by that
  component

#### Scenario: Shared registry public surface is the named registry contract

- **WHEN** the exports of `src/cad-kernel/model/index.ts` and
  `src/workers/error-mapping.ts` are inspected after the split
- **THEN** `src/cad-kernel/model/index.ts` MUST export exactly the eight
  registry symbols `KernelBuildContext`, `KernelBuildPhase`,
  `KernelModelDefinition`, `KernelModelBuildResult`, `kernelModelDefinitions`,
  `getKernelModelDefinition`, `buildModelBRep`, and `buildModelBRepWithParts`
- **AND** `src/workers/error-mapping.ts` MUST export exactly the two mapping
  symbols `cadErrorCodeFor` and `cadErrorStageFor`
- **AND** the 21 per-component `*KernelDefinition` constants that existed before
  the split MUST be removed, because no source or test consumer imports them
- **AND** source and test consumers of the named symbols MUST keep working
  without edits to their import statements

### Requirement: Error rule matching order is preserved

The Worker error mapping MUST keep its first-match substring semantics. The
relative order of every pair of rules whose results differ MUST be preserved
across the split, including every pair in which one rule's pattern is a prefix
of the other's.

#### Scenario: Prefix-overlapping rules keep their relative order

- **WHEN** a message contains `OPENGRID_SNAP_HOLD_REFERENCE_MISSING`,
  `OPENGRID_SNAP_HOLD_REFERENCE_INVALID`,
  `OPENGRID_SNAP_HOLD_REFERENCE_LOAD_FAILED`,
  `OPENGRID_ORGANIZER_BOX_PARAMETERS_INVALID`, or
  `OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT`
- **THEN** the resolved error code and error stage MUST equal the code and stage
  the same message resolved to before the split
- **AND** the more specific rule MUST still be evaluated before the rule it is a
  prefix of

#### Scenario: Every existing rule keeps its result

- **WHEN** the resolved error code and error stage are compared before and after
  the split for every rule that exists today
- **THEN** each existing rule MUST resolve to the identical error code
- **AND** each existing rule MUST resolve to the identical error stage

## MODIFIED Requirements

### Requirement: Readability splits are verbatim and behavior-preserving

A module-split refactor of a CAD-kernel builder, of a shared CAD registry, or of
a shared Worker error mapping MUST move code verbatim: it MUST NOT change logic,
identifiers, function signatures, error codes, error stages, geometry outputs,
progress/phase reporting, or resource disposal behavior. Newly authored code
MUST be limited to import statements, re-export barrels, module file boundaries,
the collection code that replaces a hand-written per-component list, and the
declarative order keys and equivalent rule data structure that replace a
hand-written if-chain. The
split MUST be covered by characterization tests that compare the collected
registry contents and the resolved error mapping before and after the split, and
it MUST pass the repository validation gates (`pnpm check`, Prettier check on
touched files, and the affected-test command) before it is considered complete.

#### Scenario: Validation gates pass after the split

- **WHEN** the split is complete and `pnpm check`, `pnpm exec prettier --check`
  on the touched files, and `pnpm test:changed` are run
- **THEN** all three gates MUST pass without test intent changes or new test
  skips

#### Scenario: Diff contains only moved code and glue

- **WHEN** the change diff is reviewed with move detection enabled
- **THEN** all extracted geometry logic and all extracted error rules MUST be
  present verbatim at their new location
- **AND** the only additions MUST be import/export glue, barrel re-exports,
  collection code, and the declarative rule order keys that replace a
  hand-written if-chain

#### Scenario: Generated geometry is unchanged

- **WHEN** the same component and parameters are generated before and after the
  split
- **THEN** the generated shape MUST be identical
