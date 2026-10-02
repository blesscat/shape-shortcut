# local-affected-testing Specification

## Purpose

Provide predictable local test commands that select tests affected by Git changes while keeping memory-heavy native CAD execution bounded and preserving a deliberate full-suite path.
## Requirements
### Requirement: Local tests are separated by resource class

The project MUST expose distinct fast and CAD test groups. Fast tests MUST be eligible for normal file parallelism, while the CAD group MUST run no more than one test file at a time. A full local run MUST complete the fast group before starting the CAD group so their worker pools do not overlap.

#### Scenario: Full local test run respects resource boundaries

- **WHEN** a developer starts the full local test command
- **THEN** the fast group MUST run before the CAD group
- **AND** the CAD group MUST use at most one worker

#### Scenario: Native CAD tests are assigned to the bounded group

- **WHEN** an existing test initializes the OpenCascade runtime or belongs to the CAD Worker test suite
- **THEN** that test MUST be assigned to the CAD group
- **AND** it MUST NOT run concurrently with another CAD test file

### Requirement: Local affected tests use Git changes and dependency relationships

The project MUST provide one local command that selects tests affected by staged, unstaged, and untracked working-tree files, and another local command that selects tests affected by the current branch relative to a configurable base ref whose default is `main`. For ordinary existing source files, selection MUST follow static direct and transitive test dependencies. The commands MUST succeed without starting a test worker when no tests are selected.

#### Scenario: Uncommitted source change selects related tests

- **WHEN** a developer changes a tracked source file without committing it
- **THEN** the working-tree affected command MUST run test files that directly or transitively depend on that source file
- **AND** unrelated test files MUST remain unstarted

#### Scenario: New untracked source or test file participates in selection

- **WHEN** a developer adds an untracked source or test file that is not ignored by Git
- **THEN** the working-tree affected command MUST include that path when selecting related tests

#### Scenario: Branch command compares against its base

- **WHEN** a developer runs the branch affected command without specifying another base
- **THEN** the command MUST select from changes between the current worktree and the merge base with local `main`
- **AND** committed, staged, unstaged, and untracked changes MUST participate

#### Scenario: Non-CAD change has no CAD dependants

- **WHEN** all selected changes are unrelated to CAD code and no CAD test depends on them
- **THEN** the affected command MUST NOT start the CAD test group

### Requirement: Untracked CAD dependencies have explicit conservative handling

The affected-test workflow MUST supplement static dependency selection for repository-owned CAD assets and other inputs that are read through paths rather than static imports. A recognized component asset change MUST add the mapped component tests. A shared CAD runtime, mesh, export, initialization, vendor, WASM, package, or test-configuration change MUST run the full CAD group or full suite according to its scope. A deleted, renamed, or otherwise ambiguous CAD path MUST run the full CAD group.

#### Scenario: Component STEP asset selects mapped CAD tests

- **WHEN** a repository-owned component STEP asset changes
- **THEN** the affected command MUST run the CAD tests explicitly mapped to that component asset
- **AND** unrelated component CAD tests MUST remain unstarted unless another change selects them

#### Scenario: Shared CAD infrastructure selects every CAD test

- **WHEN** a shared CAD runtime, meshing, export, initialization, vendor, or WASM input changes
- **THEN** the affected command MUST run the full CAD group with one worker
- **AND** fast tests MUST still be limited to those affected by the selected changes

#### Scenario: Test infrastructure change selects the full suite

- **WHEN** the package manifest, dependency lockfile, or Vitest configuration changes
- **THEN** the affected command MUST run the complete fast and CAD groups in their configured order

#### Scenario: Ambiguous CAD deletion uses the safe fallback

- **WHEN** a CAD-related file is deleted or renamed and its static dependency graph cannot be resolved safely
- **THEN** the affected command MUST run the full CAD group with one worker

### Requirement: Full execution remains an explicit local option

The project MUST retain an explicit local command that runs every existing Vitest test under the configured resource groups. Existing test assertions and application behavior MUST remain unchanged, and this capability MUST NOT introduce CI workflow configuration.

#### Scenario: Developer requests all tests

- **WHEN** a developer runs the explicit full-test command
- **THEN** every fast and CAD test file MUST be scheduled exactly once
- **AND** the configured CAD resource limit MUST still apply

#### Scenario: Repository automation scope remains local

- **WHEN** the local affected-testing capability is installed
- **THEN** no CI workflow or remote test automation MUST be added

### Requirement: CAD test files fit the per-process native CAD memory budget

Each CAD-group test file MUST complete a whole-file run in a single fresh
worker process without the native OpenCascade heap collapsing partway through.
When a file's failing cases all pass in fresh processes but the whole-file run
reports native geometry errors from some point onward, the file MUST be split
along a thematic boundary so that every resulting file fits the budget, and
harness code shared by the split files MUST live in a non-test utility module.

#### Scenario: Whole-file collapse is recovered by splitting

- **WHEN** a CAD test file passes each failing case in a fresh process while
  the whole-file run reports native OCCT failures from a point onward
- **THEN** the file MUST be split so each resulting file completes a
  whole-file run without native geometry collapse
- **AND** the split files MUST remain in the CAD group

#### Scenario: Split harness stays shared and unselected

- **WHEN** split CAD test files share wasm setup, fixtures, parameters, or
  probe helpers
- **THEN** the shared helpers MUST live in a utility module that vitest does
  not select as a test file
- **AND** each split file MUST initialise the native runtime in its own
  beforeAll

