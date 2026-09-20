## Purpose

定義瀏覽器端 CAD Worker 如何把可分色的 Snap body 與平面文字 part 封裝成可驗證、可下載且可交給一般切片器匯入的 3MF 檔案。

## Requirements

### Requirement: 3MF is generated from the committed multipart revision

For a committed supported dual-color revision — `opengrid-wall-cover` with
valid body and flat-text parts, or `opengrid-label-tag` with valid body and
icon accent parts — the system MUST generate 3MF bytes inside the CAD Worker
from the pinned B-Rep parts of that model. It MUST NOT reconstruct the package
from the viewport mesh alone or run CAD export on the main thread. The system
MUST reject unsupported models or invalid configurations with a structured
recoverable export error. The former `opengrid-snap` `topText=SNAP` path MUST
not be an export target.

#### Scenario: Successful Wall Cover 3MF export

- **WHEN** the workspace is ready and the user requests 3MF for a committed
  `opengrid-wall-cover` revision
- **THEN** the Worker MUST pin that revision before writing the package
- **AND** the package MUST be non-empty and contain a body object and a flat
  text object with their relative placement preserved
- **AND** the main thread MUST receive one validated `.3mf` download

#### Scenario: Successful Label Tag 3MF export

- **WHEN** the workspace is ready and the user requests 3MF for a committed
  `opengrid-label-tag` revision with valid body and icon parts
- **THEN** the Worker MUST pin that revision before writing the package
- **AND** the package MUST be non-empty and contain a body object and an icon
  accent object with their relative placement preserved
- **AND** the main thread MUST receive one validated `.3mf` download named
  after `opengrid-label-tag`

#### Scenario: Unsupported 3MF export is rejected

- **WHEN** the user requests 3MF for a revision without supported dual-color
  multipart data, including an `opengrid-snap` revision
- **THEN** the Worker MUST emit a structured recoverable 3MF export error
- **AND** it MUST NOT emit export-ready bytes or trigger a download

### Requirement: 3MF package carries distinct parts and material metadata

The generated 3MF package MUST be a valid ZIP-based 3MF package with a model
part, package relationships, content types, and a separate object model. Its
Bambu-compatible model MUST contain one parent object with distinct
base-body and accent component mesh objects, two deterministic material
entries, and preserved part coordinates. The parent object MUST be the only
build item; the base and accent parts MUST remain independently addressable
through `Metadata/model_settings.config`. For Wall Cover the accent part is
the flat text and for Label Tag it is the icon accent; part naming inside the
package MUST distinguish the two models (`body`/`text` versus
`body`/`icon`). The package MUST use millimetres without a hidden scale; its
build item MUST apply the supported printer's plate-centering translation
while component and part matrices remain identity. It MUST also carry a valid
Bambu project configuration in `Metadata/project_settings.config`
identifying a supported Bambu printer and two project filament slots. Bambu
Studio metadata MUST assign model part `1` (body) to extruder/filament slot
`1`, model part `2` (accent) to extruder/filament slot `2`, and declare the
plate filament map `1 2`.

#### Scenario: Body and accent have separate material assignments

- **WHEN** a generated Wall Cover or Label Tag 3MF package is inspected
- **THEN** it MUST contain two non-empty mesh objects for the body and the
  accent part
- **AND** it MUST contain two material entries with different deterministic
  display colours
- **AND** the accent object MUST be assigned to the accent material while the
  body object MUST be assigned to the base material

#### Scenario: Body and accent remain independently selectable

- **WHEN** a slicer imports a generated Wall Cover or Label Tag 3MF package
- **THEN** the build MUST expose one parent item containing independently
  addressable body and accent parts
- **AND** the package MUST NOT flatten the two color parts into one mesh or
  emit unrelated build items

#### Scenario: Package structure is importable

- **WHEN** a 3MF response is passed to a ZIP/XML structural validator
- **THEN** it MUST contain `[Content_Types].xml`, `_rels/.rels`,
  `3D/3dmodel.model`, `3D/_rels/3dmodel.model.rels`,
  `3D/Objects/object_1.model`, `Metadata/project_settings.config`, and
  `Metadata/model_settings.config`
- **AND** the model XML MUST declare millimetre units, finite vertices, and
  valid triangle indices

#### Scenario: Parent object is centered on the supported printer plate

- **WHEN** a Wall Cover or Label Tag 3MF package is generated for the
  supported Bambu A1 project profile
- **THEN** the single parent build item MUST use the plate-centering transform
  `1 0 0 0 1 0 0 0 1 128 128 0`
- **AND** component and part transforms MUST remain identity so their
  relative placement is unchanged

#### Scenario: Bambu Studio receives distinct default filament assignments

- **WHEN** Bambu Studio imports the generated Wall Cover or Label Tag package
- **THEN** its model settings MUST map body part `1` to filament slot `1`
- **AND** its model settings MUST map the accent part `2` to filament slot `2`
- **AND** the plate metadata MUST contain `filament_maps=1 2`

### Requirement: 3MF export metadata and response are validated

The versioned Worker contract MUST support an `export.3mf` command and an
export-ready response carrying request correlation, Worker epoch, model
revision, `format: 3mf`, a `.3mf` filename, `model/3mf` MIME, and non-empty
ArrayBuffer bytes. Runtime validation MUST reject unknown, mismatched, empty,
stale, or malformed 3MF metadata and MUST NOT trigger a download for a rejected
response. The contract MUST identify the supported dual-color model
(`opengrid-wall-cover` or `opengrid-label-tag`) that requested the export, and
MUST not treat an `opengrid-snap` revision as a supported multipart export.

#### Scenario: Valid 3MF metadata is accepted

- **WHEN** the main thread receives a 3MF response matching the active
  operation, Worker epoch, model revision, filename, MIME, and non-empty
  package bytes for a supported dual-color model
- **THEN** the response MUST pass validation
- **AND** the browser MUST trigger exactly one `.3mf` download

#### Scenario: Invalid 3MF metadata is rejected

- **WHEN** a 3MF response has the wrong format, MIME, extension, request
  correlation, Worker epoch, model revision, empty bytes, unsupported model,
  or invalid package structure
- **THEN** the main thread MUST reject the response
- **AND** the system MUST show a diagnosable 3MF metadata/export error
- **AND** no download MUST be triggered

### Requirement: 3MF download follows existing model lifecycle gates

The 3MF action MUST be enabled only for the latest successfully committed
supported dual-color revision — `opengrid-wall-cover` with valid body/text
parts or `opengrid-label-tag` with valid body/icon parts — while the
workspace is ready, not stale, and not already exporting. The request MUST be
correlated to the selected model revision and Worker epoch. The action MUST
remain unavailable for `opengrid-snap`, including any legacy `topText=SNAP`
snapshot. STEP and STL actions MUST remain independent and their existing
lifecycle behavior MUST remain unchanged.

#### Scenario: 3MF is available for the supported Wall Cover

- **GIVEN** the current revision is a committed, ready, non-stale
  `opengrid-wall-cover` with valid body/text parts
- **WHEN** the user views the export actions
- **THEN** `下載 3MF` / `Download 3MF` MUST be enabled
- **AND** selecting it MUST start an `export.3mf` request for that revision

#### Scenario: 3MF is available for the supported Label Tag

- **GIVEN** the current revision is a committed, ready, non-stale
  `opengrid-label-tag` with valid body/icon parts
- **WHEN** the user views the export actions
- **THEN** `下載 3MF` / `Download 3MF` MUST be enabled
- **AND** selecting it MUST start an `export.3mf` request for that revision
  whose filename names `opengrid-label-tag`

### Requirement: 3MF exports all requested Wall Cover instances as one flat two-color assembly

For a committed `opengrid-wall-cover` revision containing one through eight
generated cover instances, the system MUST export one valid 3MF package that
contains all instances in their previewed positions. The package MUST retain
one independently addressable body role and one independently addressable text
role, with body assigned to material slot 1 and text assigned to material slot
2. Every text top surface MUST remain coplanar with its corresponding cover
top in the exported geometry.

#### Scenario: IAN exports three covers in one package

- **WHEN** the user requests 3MF for a committed Wall Cover revision generated from `IAN`
- **THEN** the Worker MUST return one non-empty `.3mf` download
- **AND** the package MUST contain all three body instances and all three text glyph instances in their left-to-right positions
- **AND** the package MUST preserve separate body and text material assignments
- **AND** the package MUST contain one parent build item rather than one build item per character

#### Scenario: Eight-cover export remains bounded

- **WHEN** the user requests 3MF for a committed revision containing eight valid characters
- **THEN** the package MUST contain all eight cover instances
- **AND** its body and text parts MUST remain independently selectable
- **AND** no additional material slot or unrelated build item MAY be emitted

#### Scenario: Flat text remains flush after export

- **WHEN** a generated multi-cover 3MF package is inspected
- **THEN** each exported text instance MUST have the same maximum Z as its corresponding body surface within the documented CAD tolerance
- **AND** no exported text instance MAY protrude above the cover

#### Scenario: Bambu A1 profile remains fixed

- **WHEN** a Wall Cover 3MF package is generated
- **THEN** it MUST continue to use the existing Bambu Lab A1, 0.4 mm nozzle, two-filament project profile
- **AND** body MUST map to filament slot 1
- **AND** text MUST map to filament slot 2
- **AND** the plate filament map MUST remain `1 2`

#### Scenario: Unsupported multi-cover export is rejected

- **WHEN** the committed revision lacks a valid body/text pair, contains invalid text, or contains more than eight generated covers
- **THEN** the Worker MUST return a structured recoverable export error
- **AND** it MUST NOT emit export-ready bytes or trigger a download
