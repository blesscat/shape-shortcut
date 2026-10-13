## Purpose

本文件定義目前 CAD component 的 STL 產生、驗證、命名、下載生命週期與 Bambu Studio 一般檔案匯入相容性。
## Requirements
### Requirement: STL is generated from the committed B-Rep

The system MUST generate STL bytes inside the CAD Worker from the selected component's pinned committed B-Rep revision. It MUST NOT reconstruct STL from the viewport mesh or run the CAD writer on the main thread.

#### Scenario: Successful STL export uses the current revision

- **WHEN** the workspace is ready and the user requests STL for committed revision R1
- **THEN** the Worker MUST validate and pin R1 before writing STL bytes
- **AND** the Worker MUST produce non-empty binary STL bytes from R1's B-Rep
- **AND** a later model revision MUST NOT silently replace R1 as the export source

#### Scenario: STL writer failure preserves the model

- **WHEN** the STL writer fails, returns an empty buffer, or the requested revision is missing
- **THEN** the system MUST emit a structured recoverable STL export error
- **AND** the system MUST NOT trigger a download
- **AND** the committed model and viewport MUST remain available unless Worker recovery is required

### Requirement: STL export contract and metadata are validated

The versioned Worker contract MUST support an `export.stl` command and an STL export-ready response carrying the request correlation, worker epoch, model revision, `format: stl`, `.stl` filename, `model/stl` MIME, and ArrayBuffer bytes. Runtime validation MUST reject unknown, mismatched, empty, stale, or malformed STL export payloads.

#### Scenario: Valid STL response is accepted

- **WHEN** the main thread receives an STL response matching the active operation, worker epoch, model revision, filename, MIME, and non-empty bytes
- **THEN** the response MUST pass validation and trigger exactly one `.stl` browser download

#### Scenario: Invalid STL response is rejected

- **WHEN** the STL response has the wrong format, MIME, extension, request correlation, worker epoch, model revision, or empty bytes
- **THEN** the main thread MUST reject the response
- **AND** the system MUST NOT trigger a download
- **AND** the UI MUST show a diagnosable STL metadata/export error

### Requirement: STL output uses explicit binary tessellation settings

The Worker MUST request binary STL output with explicit STL tessellation tolerance and angular tolerance configuration values. STL settings MUST be separate from preview mesh settings and MUST be applied consistently to every catalog model.

#### Scenario: STL settings are independent from preview settings

- **WHEN** the preview mesh uses its configured viewport tolerance
- **THEN** an STL request MUST use the configured STL tolerance and angular tolerance
- **AND** changing preview-only tessellation settings MUST NOT silently change the STL contract without updating the STL configuration

#### Scenario: STL output follows the project unit convention

- **WHEN** a model is exported to STL
- **THEN** the exported coordinates MUST use the model's millimetre convention
- **AND** the generated filename MUST identify the selected model parameters

### Requirement: STL filenames are defined by the model catalog

Every supported model definition MUST provide a deterministic STL filename.
Existing `box`, modular-grid-base, HSW, hexagonal-column, OpenGrid board, Snap,
divider, pillar, and other registered model filename contracts MUST remain
available. The obsolete `box-normal` filename contract MUST be removed. The
OpenGrid stackable-box and stackable-cylinder filenames MUST encode the typed
locating-seat mode using exactly one of `-seats-none`,
`-seats-detachable-corner-seat`, or `-seats-integrated`, in addition to their
existing dimensions, profile, and opening fingerprints. The removed
`-seats-hole` suffix MUST NOT be emitted. Equivalent typed values entered with
different raw formatting MUST produce the same filename.

#### Scenario: OpenGrid stackable-box STL filename distinguishes seats

- **WHEN** an OpenGrid stackable box is exported in any supported profile
- **THEN** its STL filename MUST contain exactly one deterministic seat suffix
- **AND** changing only `cornerSeatMode` MUST change the filename
- **AND** an integrated export MUST contain `-seats-integrated`

#### Scenario: OpenGrid stackable-cylinder STL filename distinguishes seats

- **WHEN** an OpenGrid stackable cylinder is exported in any supported profile
- **THEN** its STL filename MUST contain exactly one deterministic seat suffix
- **AND** changing only `bottomSeatMode` MUST change the filename
- **AND** an integrated export MUST contain `-seats-integrated`

#### Scenario: The removed hole suffix is never emitted

- **WHEN** any OpenGrid stackable model is exported in any seat mode
- **THEN** its STL filename MUST NOT contain `-seats-hole`
- **AND** the locking-seat export MUST contain
  `-seats-detachable-corner-seat`

#### Scenario: Existing supported model filenames remain deterministic

- **WHEN** a supported non-OpenGrid-stackable model is exported
- **THEN** its existing typed filename contract MUST remain unchanged
- **AND** no filename may contain the removed `box-normal` identity

#### Scenario: STL filename is independent of raw formatting

- **WHEN** two valid snapshots normalize to the same typed parameters but use
  different raw input formatting
- **THEN** their STL filenames MUST be identical

### Requirement: STL download follows existing model lifecycle gates

The STL download action MUST be enabled only for the latest successfully committed model revision. It MUST be disabled during initial loading, model generation, invalid input, stale preview state, Worker recovery/error states, and another active export. The export request MUST be correlated to the selected model revision and Worker epoch.

#### Scenario: STL is available when the model is ready

- **GIVEN** the workspace has a current committed revision and status `ready`
- **WHEN** the user views the export actions
- **THEN** `下載 STL` MUST be enabled
- **AND** selecting it MUST start an STL export for the current revision

#### Scenario: STL is disabled for stale or unavailable models

- **GIVEN** the current input is invalid, a newer generation is building, the Worker is unavailable, or the preview is stale
- **WHEN** the user views the export actions
- **THEN** `下載 STL` MUST be disabled
- **AND** the UI MUST NOT send an STL export request

#### Scenario: STEP and STL remain independent formats

- **WHEN** the user selects either export action while the model is ready
- **THEN** only the selected format MUST be requested and downloaded
- **AND** the existing STEP export behavior MUST remain unchanged

### Requirement: STL export is suitable for normal Bambu Studio import

The system MUST download a non-empty binary `.stl` file that can be opened through Bambu Studio's normal local-file import workflow. This capability MUST NOT claim to launch or control the Bambu Studio desktop application from the browser.

#### Scenario: Downloaded STL is available for slicer import

- **WHEN** STL download completes successfully
- **THEN** the browser MUST receive a `.stl` file with the selected model's dimensions and geometry
- **AND** the user MUST be able to open or import that file in Bambu Studio through its normal file workflow

#### Scenario: No automatic desktop-app integration

- **WHEN** the STL download action completes
- **THEN** the web app MUST only trigger the browser download
- **AND** it MUST NOT require a backend upload, custom URL protocol, native helper, or Bambu Studio installation

### Requirement: Pillar STL metadata

The catalog MUST provide deterministic STL metadata for the `opengrid-pillar` component. The filename MUST use the existing `.stl` extension and `model/stl` MIME. A zero-offset standard pillar MUST use `pillar-9-standard.stl`, a zero-offset thin-shell pillar MUST use `pillar-6-thin-shell.stl`, and a zero-offset positioning pillar MUST use `pillar-{length}-positioning.stl`. When either XY offset is non-zero, the filename MUST append deterministic `-x{offsetX}-y{offsetY}` values before the `.stl` extension. STL generation MUST continue to use the latest successfully committed OpenGrid pillar B-Rep and the existing export lifecycle gates.

#### Scenario: Standard pillar STL filename

- **WHEN** a committed pillar with `mode=standard`, `offsetX=0`, and `offsetY=0` is exported as STL
- **THEN** the filename MUST be `pillar-9-standard.stl`
- **AND** the response MUST carry `format=stl`, MIME `model/stl`, and non-empty binary bytes

#### Scenario: Thin-shell pillar STL filename

- **WHEN** a committed pillar with `mode=thin-shell`, `offsetX=0`, and `offsetY=0` is exported as STL
- **THEN** the filename MUST be `pillar-6-thin-shell.stl`
- **AND** the response MUST be generated from the committed pillar revision

#### Scenario: Positioning pillar STL filename

- **WHEN** a committed pillar with `mode=positioning`, `length=25`, `offsetX=0`, and `offsetY=0` is exported as STL
- **THEN** the filename MUST be `pillar-25-positioning.stl`
- **AND** the response MUST be generated from the committed pillar revision

#### Scenario: Offset pillar STL filename

- **WHEN** a committed pillar with `mode=positioning`, `length=25`, `offsetX=0.25`, and `offsetY=-0.15` is exported as STL
- **THEN** the filename MUST be `pillar-25-positioning-x0.25-y-0.15.stl`
- **AND** the filename MUST distinguish the typed XY position from the zero-offset export

#### Scenario: Pillar STL follows readiness gates

- **WHEN** the pillar mode, length, or offsets are invalid, stale, still generating, or have no committed revision
- **THEN** the STL action MUST be disabled
- **AND** the Worker MUST NOT receive an STL export request
