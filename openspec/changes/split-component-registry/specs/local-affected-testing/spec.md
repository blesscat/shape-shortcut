## MODIFIED Requirements

### Requirement: Untracked CAD dependencies have explicit conservative handling

The affected-test workflow MUST supplement static dependency selection for
repository-owned CAD assets and other inputs that are read through paths rather
than static imports. A recognized component asset change MUST add the mapped
component tests. A shared CAD runtime, mesh, export, initialization, vendor,
WASM, package, or test-configuration change MUST run the full CAD group or full
suite according to its scope. A deleted, renamed, or otherwise ambiguous CAD
path MUST run the full CAD group. A change confined to files owned by a single
CAD component MUST select the related tests for that component instead of the
full CAD group, and MUST NOT be classified as a shared CAD infrastructure
change. Worker error rules that belong to no single CAD component are shared
CAD infrastructure, so a change to them MUST select the full CAD group.

#### Scenario: Component STEP asset selects mapped CAD tests

- **WHEN** a repository-owned component STEP asset changes
- **THEN** the affected command MUST run the CAD tests explicitly mapped to that
  component asset
- **AND** unrelated component CAD tests MUST remain unstarted unless another
  change selects them

#### Scenario: Shared CAD infrastructure selects every CAD test

- **WHEN** a shared CAD runtime, meshing, export, initialization, vendor, or WASM
  input changes
- **THEN** the affected command MUST run the full CAD group with one worker
- **AND** fast tests MUST still be limited to those affected by the selected
  changes

#### Scenario: Test infrastructure change selects the full suite

- **WHEN** the package manifest, dependency lockfile, or Vitest configuration
  changes
- **THEN** the affected command MUST run the complete fast and CAD groups in
  their configured order

#### Scenario: Ambiguous CAD deletion uses the safe fallback

- **WHEN** a CAD-related file is deleted or renamed and its static dependency
  graph cannot be resolved safely
- **THEN** the affected command MUST run the full CAD group with one worker

#### Scenario: Component-owned files select related tests

- **WHEN** every changed path is a file owned by a single CAD component,
  including that component's per-component definition module and its
  per-component error rule module
- **THEN** the affected command MUST use related-test selection
- **AND** it MUST NOT run the full CAD group
- **AND** unrelated component CAD tests MUST remain unstarted unless another
  change selects them

#### Scenario: Shared CAD registry change still selects every CAD test

- **WHEN** the shared CAD model registry module, the shared Worker error
  mapping module, or the shared Worker error rule module changes
- **THEN** the affected command MUST run the full CAD group with one worker
