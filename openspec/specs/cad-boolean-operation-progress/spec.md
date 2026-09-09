## Purpose

Provide a shared, generation-scoped progress experience for long-running CAD fuse, cut, and intersect work during B-Rep construction.

## Requirements

### Requirement: CAD builders expose boolean-operation subprogress

Every production CAD generation path that executes through the shared Worker pipeline MUST report the boundaries of its relevant fuse, cut, and intersect operations while the top-level stage remains `building`.

For each reported operation, the Worker MUST publish an active update before invoking the native boolean operation and a completion update after it returns. The update MUST identify the operation kind and MAY include completed and total counts when the builder knows them. A builder MUST NOT claim progress inside a native operation unless the underlying runtime provides a reliable callback for it.

#### Scenario: Long fuse is visible before completion

- **WHEN** a CAD builder begins a fuse that can take a noticeable amount of time
- **THEN** the Worker publishes an active `fuse` subphase before entering the native call
- **AND** the UI can show that fuse is in progress until a completion update arrives

#### Scenario: Cut and intersect use the same capability

- **WHEN** a CAD builder performs a cut or intersect operation
- **THEN** it reports the operation as `cut` or `intersect` through the same progress contract
- **AND** the UI presents it as the current building subphase without changing the top-level stage

#### Scenario: A builder has no boolean work

- **WHEN** a build path performs no fuse, cut, or intersect operations
- **THEN** it does not emit fabricated boolean-operation updates
- **AND** the existing top-level progress behavior remains valid

### Requirement: Boolean counts and elapsed time have honest semantics

When a builder can determine the number of boolean invocations in the current
operation scope, progress MUST expose a count whose completed value starts at
zero and increases only after a corresponding operation completes. A builder
MAY report the count in a derived domain unit instead of raw invocations when
each operation processes a known number of units; in that case the total MUST
be the domain-unit total and a completed operation MUST advance the count by
the units it actually processed. The completed value MUST NOT exceed total,
and the final completed value MUST equal total. When the total is unknown,
progress MUST omit the total or mark the operation indeterminate rather than
inventing a percentage.

An active operation MUST expose elapsed time that is monotonic for the
lifetime of that operation. The UI MUST continue advancing the displayed
elapsed time while the native call is in flight, even when no inner native
progress callback exists.

#### Scenario: Known boolean total

- **WHEN** a builder declares a scope containing a known number of fuse, cut,
  or intersect calls
- **THEN** the UI can show the completed operation count and total
- **AND** the count advances only after each native call returns successfully

#### Scenario: Known domain-unit total

- **WHEN** a builder declares a scope in a derived domain unit where each
  native call processes a known number of units
- **THEN** the UI can show the completed unit count and total
- **AND** the count advances only after each native call returns successfully
- **AND** one native call MAY advance the count by more than one unit

#### Scenario: Unknown boolean total

- **WHEN** the number of operations cannot be known without an extra geometry
  pass
- **THEN** the UI shows the operation kind and elapsed time without a
  determinate percentage
- **AND** the progress contract does not report a misleading total

#### Scenario: Total is derived from build inputs

- **WHEN** a builder can derive a boolean scope total from input arrays,
  feature flags, or a fixed operation shape without executing extra geometry
- **THEN** the builder reports that total and the UI shows the remaining count
  while the scope is active
- **AND** the builder keeps separate scopes when fuse, cut, or intersect
  counts have different meanings

#### Scenario: Native operation has no inner callback

- **WHEN** a native boolean call takes several seconds and exposes no reliable
  inner progress callback
- **THEN** the UI continues to show the active operation and increasing
  elapsed time
- **AND** it does not present a guessed or synthetic percentage for that call

### Requirement: The progress indicator retains the four-stage model

The user-facing progress indicator MUST retain the existing top-level stages `loading`, `building`, `meshing`, and `exporting`. Boolean details MUST appear as a subphase of `building`, including the operation kind and, when available, a count or elapsed time. The indicator MUST NOT turn operation counts into a fake end-to-end percentage.

#### Scenario: Building subphase is shown

- **WHEN** an active boolean-operation update is received during the `building` stage
- **THEN** the indicator keeps `building` as the current top-level stage
- **AND** it shows a human-readable detail such as assembling B-Rep, fuse N of M, cut N of M, intersect N of M, or an elapsed-only equivalent

#### Scenario: Operation advances between calls

- **WHEN** one boolean call completes and the next boolean call starts
- **THEN** the indicator replaces the previous operation detail with the new operation kind and current count
- **AND** it does not reset the top-level stage or display a backwards overall percentage

#### Scenario: Building elapsed time spans all boolean calls

- **WHEN** a build remains in the `building` stage while several boolean calls run
- **THEN** the indicator shows one elapsed timer accumulated from entry into `building`
- **AND** the timer does not reset when the boolean operation kind or count changes
- **AND** individual boolean-call durations remain diagnostic data rather than separate user-facing timers

### Requirement: Boolean progress obeys operation lifecycle rules

Boolean subprogress MUST use the same generation and model-revision correlation as the enclosing CAD operation. Runtime consumers MUST ignore stale updates from superseded generations, and cancellation MUST prevent later updates from an obsolete operation from becoming visible. Terminal success, error, cancellation, timeout, recovery, or invalidation MUST clear the boolean detail together with the enclosing progress state.

#### Scenario: Superseded generation reports late

- **WHEN** generation A is superseded by generation B and A later emits a boolean update
- **THEN** the UI ignores A's update
- **AND** progress remains associated with generation B only

#### Scenario: Build is cancelled during a boolean operation

- **WHEN** the active build is cancelled while a fuse, cut, or intersect call is in progress
- **THEN** the runtime clears the active boolean detail when cancellation becomes terminal
- **AND** a late completion from the cancelled generation cannot restore the stale detail

#### Scenario: Build completes or fails

- **WHEN** the enclosing CAD operation reaches success, error, timeout, recovery, or invalidation
- **THEN** the active boolean detail is cleared
- **AND** no previous operation count or elapsed timer remains visible for the next operation

### Requirement: Boolean timing diagnostics are cumulative

Performance diagnostics and benchmark output MUST aggregate the elapsed durations of all reported boolean operations in the measured build, with a breakdown by operation kind when supported. A timing field representing a boolean phase MUST NOT silently contain only the duration of the last operation.

#### Scenario: Multiple fuse calls are measured

- **WHEN** a build executes multiple fuse calls
- **THEN** the reported fuse timing is the sum of those calls, subject to the benchmark's documented measurement boundaries
- **AND** the result is not replaced by the final fuse duration

#### Scenario: Mixed boolean calls are measured

- **WHEN** a build executes fuse, cut, and intersect calls
- **THEN** the diagnostics expose a cumulative total and preserve per-kind attribution when the output format supports it
- **AND** existing non-boolean phase timings remain separately identifiable

### Requirement: Honeycomb saving-mode cuts report cell-unit progress

While a material-saving (honeycomb) build is cutting, each OpenGrid
stackable-box, stackable-cylinder, and Open Shelf builder MUST report cut
progress with a total equal to the number of honeycomb cells being cut and
MUST advance the completed count by the number of cells a native operation
processed, immediately after that operation returns. The reported progress
MUST identify the unit as honeycomb cells so the count is not read as native
operation or batch counts. Cell-unit reporting MUST NOT change the number,
grouping, or construction of native boolean operations.

#### Scenario: Batched cutters report cells

- **WHEN** a saving-mode builder cuts a batch of honeycomb cutters in one
  native cut
- **THEN** the reported cut progress advances by that batch's cell count after
  the cut returns
- **AND** the visible unit is honeycomb cells, not cutter batches

#### Scenario: Panel cutters report cells

- **WHEN** the stackable-box saving-mode builder cuts a lattice panel
  containing multiple cells in one native cut
- **THEN** the reported cut progress advances by that panel's cell count after
  the cut returns

#### Scenario: Final count equals the cell total

- **WHEN** the last honeycomb cut of a saving-mode build returns
- **THEN** the reported completed count equals the declared cell total

#### Scenario: Preparation cuts do not corrupt cell counts

- **WHEN** a saving-mode builder performs native cuts to prepare cutters, such
  as clipping a protection slot out of a lattice panel
- **THEN** those preparation operations do not advance the cell-unit count or
  its total
