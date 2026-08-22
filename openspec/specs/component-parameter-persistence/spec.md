## Purpose

讓每個已註冊 CAD component 的有效參數在同一個瀏覽器與網站 origin 中跨 workspace 初始化保留，同時在沒有可用保存資料時安全地回到 component 預設值。

## Requirements

### Requirement: Per-component parameter state

The system MUST maintain a runtime parameter state entry keyed by each
registered component's stable `modelId`. Each entry MUST contain only typed
values accepted by that component's current validator, and values for one
component MUST NOT replace or merge into another component's entry. The state
MUST contain no active `box-normal` entry after the catalog removal.

#### Scenario: Component parameter entries are isolated

- **WHEN** a user changes parameters for any remaining registered component
- **THEN** only that component's model-id entry MUST change
- **AND** navigating to another component MUST expose that component's own
  parameters
- **AND** stale values for an unregistered `box-normal` model MUST NOT be
  restored or sent to the Worker

### Requirement: Restore valid saved parameters

The system MUST read the versioned browser-persisted parameter record when a model-specific CAD workspace initializes. For the selected `modelId`, a present entry MUST be parsed and validated against the current component definition before it is used; a missing, malformed, or invalid entry MUST fall back to that definition's default parameters.

#### Scenario: First visit uses component defaults

- **GIVEN** no persisted parameter entry exists for the selected component
- **WHEN** the CAD workspace initializes
- **THEN** the parameter controls and generation input MUST use the component definition's default parameters

#### Scenario: Valid saved values are restored

- **GIVEN** a persisted entry for the selected component contains valid values for the current parameter schema
- **WHEN** the CAD workspace initializes
- **THEN** the parameter controls MUST display the persisted values
- **AND** the first generation MUST use those values

#### Scenario: Invalid saved values fall back safely

- **GIVEN** a persisted entry is malformed, has an unknown parameter shape, or fails the current component validation rules
- **WHEN** the CAD workspace initializes
- **THEN** the selected component MUST use its definition's default parameters
- **AND** the invalid entry MUST NOT be sent to the CAD Worker
- **AND** initialization MUST continue without a persistence error being shown as a CAD failure

### Requirement: Persist accepted parameter updates

The system MUST update the runtime parameter state and browser persistence when a component parameter snapshot passes the existing component-specific validation. Persistence MUST contain typed accepted values rather than raw input strings. An invalid or incomplete raw input MUST NOT overwrite the last accepted persisted values.

#### Scenario: Valid input is persisted

- **GIVEN** a user changes a component parameter to a valid value
- **WHEN** the complete snapshot passes component validation
- **THEN** the runtime parameter entry for that component MUST be updated
- **AND** the typed values MUST be written to the versioned browser persistence record

#### Scenario: Invalid input does not overwrite saved values

- **GIVEN** a component has a previously accepted persisted parameter snapshot
- **WHEN** the user enters an empty, fractional, non-finite, or out-of-range value
- **THEN** the existing invalid-input behavior MUST remain in effect
- **AND** the previous accepted persisted snapshot MUST remain unchanged

### Requirement: Persistence failures do not block CAD

The system MUST treat browser persistence as an optional enhancement. If browser storage is unavailable or a read/parse operation fails during initialization, the workspace MUST use the selected component's definition defaults for any unavailable saved entry. If a write operation fails after a valid update, the runtime MUST retain the accepted values in memory. In either case, the storage failure MUST NOT prevent CAD generation, preview, or export and MUST NOT be reported as a CAD Worker or model error.

#### Scenario: Storage is unavailable during initialization

- **GIVEN** browser storage cannot be accessed while the workspace initializes
- **WHEN** the selected component starts
- **THEN** the workspace MUST use the component's default parameters
- **AND** CAD initialization and generation MUST continue normally

#### Scenario: Storage write fails after valid input

- **GIVEN** a valid parameter update is accepted
- **WHEN** browser storage rejects the persistence write
- **THEN** the runtime parameter state MUST still retain the accepted values
- **AND** CAD generation MUST continue without treating the storage failure as a Worker or model error

### Requirement: OpenGrid Snap parameters are persisted independently

The versioned browser persistence MUST store valid Snap parameters under the
stable `opengrid-snap` model id. The entry MUST contain only typed `variant`,
`profile`, `offset`, `footprint`, `fourCornerLocatingHoles`,
`centerRemoverHole`, `magnetHoleShape`, `magnetHoleLength`,
`magnetHoleWidth`, `magnetHoleDiameter`, and `magnetHoleThickness` values
accepted by the current Snap validator, and it MUST remain independent from the
existing `opengrid` board entry and every other model entry. A disabled magnet
MUST persist as `magnetHoleShape=none` with all four magnet dimensions equal to
zero.

#### Scenario: Restore saved Snap parameters

- **GIVEN** browser persistence contains a valid `opengrid-snap` entry with a
  profile, footprint, offset, optional-hole selections, and either disabled or
  valid magnet settings
- **WHEN** the user opens `/cad/opengrid-snap`
- **THEN** the controls MUST display the saved typed profile, variant, shared
  total offset, Full/Half/Quarter footprint, existing feature selections, and
  magnet settings
- **AND** the first generation MUST use those typed values

#### Scenario: Persist a valid Snap update

- **GIVEN** a Snap parameter snapshot with valid variant, profile, offset,
  footprint, mutually compatible existing-hole flags, and either disabled or
  valid magnet settings passes validation
- **WHEN** the workspace accepts the update
- **THEN** persistence MUST update only the `opengrid-snap` entry
- **AND** the stored values MUST be typed values rather than raw input strings
- **AND** no `halfCellX` or `halfCellY` field MAY be written for the Snap entry

#### Scenario: Invalid Snap input does not overwrite persistence

- **GIVEN** a previously accepted `opengrid-snap` entry exists in persistence
- **WHEN** the user enters an invalid or incomplete variant, profile, offset,
  footprint, optional-hole, or magnet value, including a magnet conflict
- **THEN** the previous accepted entry MUST remain unchanged
- **AND** the invalid value MUST NOT be sent to the Worker as `model.generate`

### Requirement: Invalid or legacy Snap persistence falls back safely

The persistence reader MUST reject malformed Snap entries, entries with board
OpenGrid fields, entries with unsupported variants, profiles, offsets,
footprints, directions, non-boolean optional-hole fields, unsupported magnet
shapes, invalid active magnet dimensions, non-zero inactive magnet dimensions,
or conflicting magnet and existing-hole fields. A legacy exact Snap entry
containing the prior `variant`, `offset`, `halfCellX`, and `halfCellY` fields
MAY be normalized by adding the current default profile, optional-hole fields,
and disabled magnet fields and mapping axis cardinality to `footprint=full`,
`half`, or `quarter`. A legacy entry without half-cell fields MAY normalize to
`footprint=full`. Any entry that cannot be normalized safely MUST fall back to
the Snap definition defaults without affecting the existing `opengrid` board
entry or other model entries.

#### Scenario: Legacy full Snap entry normalizes to full footprint

- **GIVEN** persistence contains a legacy valid `opengrid-snap` entry without
  profile, optional-hole, or magnet fields and with `halfCellX=none` and
  `halfCellY=none`
- **WHEN** the user opens `/cad/opengrid-snap`
- **THEN** the reader MUST use `profile=Standard`,
  `fourCornerLocatingHoles=false`, `centerRemoverHole=false`,
  `magnetHoleShape=none`, all magnet dimensions `0`, and `footprint=full`
- **AND** it MUST NOT copy any fields from the `opengrid` board entry

#### Scenario: Legacy single-axis entry normalizes to half footprint

- **GIVEN** persistence contains a legacy valid Snap entry with exactly one
  non-`none` half-cell axis and no magnet fields
- **WHEN** the Snap workspace initializes
- **THEN** the reader MUST use `footprint=half` and disabled magnet values
- **AND** the generated Snap MUST use the canonical left orientation rather
  than preserving a right/top/bottom UI direction

#### Scenario: Legacy dual-axis entry normalizes to quarter footprint

- **GIVEN** persistence contains a legacy valid Snap entry with both half-cell
  axes non-`none` and no magnet fields
- **WHEN** the Snap workspace initializes
- **THEN** the reader MUST use `footprint=quarter` and disabled magnet values
- **AND** the generated Snap MUST use the canonical left-top orientation

#### Scenario: Legacy entry without half-cell fields uses full footprint

- **GIVEN** persistence contains a legacy valid Snap entry with variant and
  offset but no half-cell or magnet fields
- **WHEN** the user opens `/cad/opengrid-snap`
- **THEN** the reader MUST use `footprint=full` and disabled magnet values
- **AND** it MUST NOT infer a footprint or merge fields from the `opengrid`
  board entry

#### Scenario: Legacy board entry is not reused for Snap

- **GIVEN** persistence contains an `opengrid` board snapshot but no valid
  `opengrid-snap` snapshot
- **WHEN** the user opens `/cad/opengrid-snap`
- **THEN** the workspace MUST use the Snap defaults with disabled magnet values
- **AND** it MUST NOT merge board rows, screws, connectors, half-cell
  directions, or variant values into the Snap snapshot

#### Scenario: Malformed new or legacy Snap entry falls back

- **GIVEN** the stored `opengrid-snap` entry contains an invalid profile,
  unsupported footprint, invalid direction, non-boolean optional-hole field,
  unsupported magnet shape, malformed magnet dimensions, a magnet conflict,
  board field, or unsupported extra field
- **WHEN** the Snap workspace initializes
- **THEN** it MUST use the Snap definition defaults with magnet disabled
- **AND** initialization MUST continue without a CAD failure

### Requirement: Stackable-box parameters are persisted independently

The versioned browser persistence MUST store valid
`opengrid-stackable-box` parameters under that stable model ID. The entry MUST
contain typed `x`, `y`, and `height`, typed enum `cornerSeatMode`, typed boolean
`fullBottomHoleGrid`, the existing profile fields, and the typed opening fields
accepted by the current validator. It MUST remain independent from OpenGrid
board and cylinder entries. Legacy `cornerBottomHoles=false/true` values MUST
migrate to `cornerSeatMode='none'/'hole'`; missing legacy values MUST migrate to
`'hole'`. Invalid or incomplete input MUST NOT overwrite the last accepted
entry.

#### Scenario: Restore saved stackable-box seat mode

- **WHEN** persistence contains a valid stackable-box entry with a seat mode
- **THEN** the controls MUST display the saved typed seat selection and all
  other saved values
- **AND** the first generation MUST use those values

#### Scenario: Restore legacy stackable-box hole state

- **WHEN** persistence contains a valid older entry with
  `cornerBottomHoles=false` or `true`
- **THEN** hydration MUST use `cornerSeatMode='none'` or `'hole'`
- **AND** missing legacy fields MUST use the current defaults, including
  `cornerSeatMode='hole'` and `fullBottomHoleGrid=false`
- **AND** the entry MUST not be rejected only because the enum field is absent

#### Scenario: Persist a valid stackable-box update

- **WHEN** a stackable-box snapshot passes validation
- **THEN** persistence MUST update only the stackable-box entry
- **AND** `cornerSeatMode` MUST be stored as its typed enum value
- **AND** the old `cornerBottomHoles` field MUST NOT be written

#### Scenario: Invalid stackable-box input does not overwrite persistence

- **WHEN** an invalid seat mode, incomplete snapshot, or invalid existing
  stackable-box field is supplied
- **THEN** the previous accepted entry MUST remain unchanged
- **AND** the invalid snapshot MUST NOT be sent to the Worker

### Requirement: OpenGrid 分隔器參數獨立保存

The versioned browser-local parameter record MUST store valid `opengrid-divider` snapshots under the stable `opengrid-divider` model id. The entry MUST contain typed `left`, `right`, `up`, `down`, `height`, and `wallThickness` values and MUST remain isolated from both `opengrid` and `opengrid-stackable-box` entries. A legacy divider entry that lacks `wallThickness` MUST be interpreted with the divider default of 2 mm rather than making the existing entry unusable.

#### Scenario: 恢復分隔器參數

- **GIVEN** browser persistence contains a valid `opengrid-divider` entry with directional counts, height, and `wallThickness`
- **WHEN** the user opens `/cad/opengrid-divider`
- **THEN** the controls MUST display the saved directional counts, height, and wall thickness
- **AND** the first generation MUST use those validated typed values

#### Scenario: 舊分隔器快照套用預設厚度

- **GIVEN** browser persistence contains a divider entry with valid legacy `left`, `right`, `up`, `down`, and `height` values but no `wallThickness`
- **WHEN** the divider workspace initializes
- **THEN** it MUST restore the entry with typed `wallThickness=2`
- **AND** it MUST be allowed to persist the upgraded snapshot after validation

#### Scenario: 保存合法更新

- **WHEN** a divider snapshot passes component validation
- **THEN** only the `opengrid-divider` persistence entry MUST be updated
- **AND** raw input strings, derived labels, and invalid partial values MUST NOT be persisted
- **AND** the stored wall thickness MUST remain a typed integer from 1 through 5

#### Scenario: 無效保存值安全回退

- **GIVEN** the stored divider entry is malformed, has an unknown shape, has an invalid `wallThickness`, or fails current validation
- **WHEN** the divider workspace initializes
- **THEN** it MUST use the divider definition defaults
- **AND** it MUST NOT send the invalid snapshot to the Worker
- **AND** existing entries for other components MUST remain unchanged

### Requirement: Pillar parameters are persisted independently

The versioned browser persistence MUST store valid pillar parameters under the stable `opengrid-pillar` model id. Each entry MUST contain either the typed fixed mode `standard` or `thin-shell` with typed `offsetX` and `offsetY`, or the typed `positioning` mode with its integer `length` and typed `offsetX` and `offsetY`. The offsets MUST remain within -0.5 through 0.5 mm at 0.05 mm increments. The OpenGrid pillar entry MUST remain independent from every other component's parameter entry.

#### Scenario: Restore saved pillar parameters

- **GIVEN** browser persistence contains `{ mode: 'thin-shell', offsetX: 0.15, offsetY: -0.1 }` under `opengrid-pillar`
- **WHEN** the user opens `/cad/opengrid-pillar`
- **THEN** the thin-shell radio MUST be selected
- **AND** the X/Y offset controls MUST display the saved typed values
- **AND** the first generation MUST use the fixed 6 mm thin-shell profile translated by those offsets

#### Scenario: Persist a valid pillar update

- **GIVEN** a pillar snapshot with `mode=standard`, `mode=thin-shell`, or `mode=positioning` with a valid length and valid XY offsets passes validation
- **WHEN** the workspace accepts the update
- **THEN** persistence MUST update only the `opengrid-pillar` entry
- **AND** the stored value MUST remain the typed mode, length when applicable, and numeric offsets rather than raw input strings

#### Scenario: Invalid pillar input does not overwrite persistence

- **GIVEN** a previously accepted pillar mode and offset snapshot exists in persistence
- **WHEN** the user selects an unsupported mode or supplies a malformed, fractional-step, or out-of-range length or offset
- **THEN** the previous accepted `opengrid-pillar` entry MUST remain unchanged
- **AND** the invalid value MUST NOT be sent to the Worker as `model.generate`

#### Scenario: Missing or malformed pillar entry falls back safely

- **GIVEN** the persisted `opengrid-pillar` entry is missing or malformed
- **WHEN** the OpenGrid pillar workspace initializes
- **THEN** it MUST use `{ mode: 'standard', offsetX: 0, offsetY: 0 }`
- **AND** the invalid entry MUST NOT be sent to the Worker
- **AND** initialization MUST continue without treating persistence failure as a CAD failure

#### Scenario: Migrate old pillar snapshots

- **GIVEN** the persisted entry uses the old `{ length, baseConnection: false }` shape with a valid length
- **WHEN** the OpenGrid pillar workspace initializes
- **THEN** it MUST use `{ mode: 'positioning', length, offsetX: 0, offsetY: 0 }`
- **GIVEN** the persisted entry uses an old valid `{ mode: 'standard' }` or `{ mode: 'thin-shell' }` shape without offsets
- **WHEN** the OpenGrid pillar workspace initializes
- **THEN** it MUST retain the mode and add `offsetX=0` and `offsetY=0`
- **AND** the old checkbox field MUST NOT remain in the normalized entry

### Requirement: OpenGrid half-cell parameters are persisted with the board

The versioned browser persistence MUST store valid OpenGrid board half-cell directions as typed `halfCellX` and `halfCellY` fields under the stable `opengrid` model id. The entry MUST remain independent from `opengrid-snap`, and it MUST NOT persist a redundant `allowHalfCell` or a derived single/dual mode.

#### Scenario: Restore saved OpenGrid directions

- **GIVEN** browser persistence contains a valid `opengrid` snapshot with `halfCellX=left` and `halfCellY=bottom`
- **WHEN** the user opens `/cad/opengrid`
- **THEN** the board controls MUST display those two directions
- **AND** the first generation MUST use the typed directions with the saved board parameters

#### Scenario: Persist a valid OpenGrid direction update

- **GIVEN** an OpenGrid snapshot passes the current board and half-cell validators
- **WHEN** the workspace accepts the update
- **THEN** persistence MUST update only the `opengrid` entry
- **AND** the persisted half-cell values MUST be enum values rather than raw UI labels or a boolean

#### Scenario: Legacy OpenGrid snapshot uses no-half defaults

- **GIVEN** a legacy valid OpenGrid entry has no half-cell fields and has no unknown half-cell fields
- **WHEN** the OpenGrid workspace initializes
- **THEN** the reader MUST normalize it to `halfCellX=none` and `halfCellY=none` before validation
- **AND** it MUST preserve the other valid OpenGrid parameters

### Requirement: OpenGrid board snapshot persistence

The versioned browser persistence MUST store valid OpenGrid board snapshots
under the stable opengrid model id. The entry MUST contain typed normalized
variant, rows, columns, half-cell, chamfer, connector, generic screw, and
custom-intersection values, and MUST remain isolated from every other
component entry.

#### Scenario: Restore an OpenGrid board snapshot

- **GIVEN** persistence contains a valid normalized opengrid entry
- **WHEN** the user opens /cad/opengrid
- **THEN** the workspace MUST restore the saved typed values
- **AND** the first generation MUST use those values

#### Scenario: Persist an accepted OpenGrid update

- **WHEN** an OpenGrid snapshot passes the current validator
- **THEN** only the opengrid persistence entry MUST be updated
- **AND** raw strings, derived labels, duplicate positions, and incomplete
  values MUST NOT be persisted

### Requirement: Incompatible OpenGrid persistence fallback

The persistence reader MUST reject the former OpenGrid flat-plate snapshot
shape, including 16 mm opening, four-slot, small/large connector, or
M3/M4/M5-only fields. A rejected entry MUST fall back to the current OpenGrid
definition defaults without changing entries for other components. A valid
pre-half-cell OpenGrid entry MAY normalize missing half-cell fields to none.

#### Scenario: Legacy OpenGrid entry

- **GIVEN** persistence contains an old or malformed OpenGrid snapshot
- **WHEN** the OpenGrid workspace initializes
- **THEN** it MUST use the current OpenGrid defaults
- **AND** it MUST not merge rejected fields into the accepted snapshot
- **AND** other component entries MUST remain unchanged

#### Scenario: Invalid OpenGrid half-cell persistence is isolated

- **GIVEN** an OpenGrid entry contains an invalid direction, `allowHalfCell`, or an unsupported half-cell field
- **WHEN** persistence is read
- **THEN** that OpenGrid entry MUST fall back to the OpenGrid definition defaults
- **AND** the `opengrid-snap` entry and all other model entries MUST remain unchanged

### Requirement: Stackable-cylinder parameters are persisted independently

The versioned browser persistence MUST store valid
`opengrid-stackable-cylinder` parameters under that stable model ID. The entry
MUST contain typed integer `diameter` and `height`, typed cylinder enum
`bottomSeatMode` including the cylinder-only `center-hook` value, the existing
profile flags, and all opening values accepted by the current validator. It
MUST remain independent from the board, box, and all other component entries.
Legacy `bottomHolesEnabled=false/true` values MUST migrate to
`bottomSeatMode='none'/'hole'`; missing legacy values MUST migrate to
`'hole'`. Invalid or incomplete input MUST NOT overwrite the last accepted
entry. The shared Box seat enum MUST remain limited to `none`, `hole`, and
`integrated`.

#### Scenario: Restore valid cylinder seat mode

- **WHEN** persistence contains a valid cylinder entry with any supported seat
  mode, including `center-hook`
- **THEN** the controls MUST display the saved typed seat selection
- **AND** the first generation MUST use that selection

#### Scenario: Restore legacy cylinder hole state

- **WHEN** persistence contains a valid legacy cylinder entry with
  `bottomHolesEnabled=false` or `true`
- **THEN** hydration MUST use `bottomSeatMode='none'` or `'hole'`
- **AND** a missing legacy flag MUST use `bottomSeatMode='hole'`
- **AND** opening defaults MUST continue to be restored as before

#### Scenario: Persist a valid cylinder update

- **WHEN** a cylinder snapshot passes validation
- **THEN** persistence MUST update only the cylinder entry
- **AND** `bottomSeatMode` MUST be stored as its typed cylinder enum value
- **AND** the old `bottomHolesEnabled` field MUST NOT be written

#### Scenario: Invalid cylinder input does not overwrite persistence

- **WHEN** an invalid seat mode, incomplete snapshot, or invalid cylinder field
  is supplied
- **THEN** the previous accepted cylinder entry MUST remain unchanged
- **AND** the invalid snapshot MUST NOT be used for initialization or sent to
  the Worker

### Requirement: System-scoped parameter persistence

The versioned browser-local parameter persistence MUST support an optional OpenGrid system context in addition to the stable `modelId`. A valid saved value for `(desk, modelId)` MUST be independent from `(wall, modelId)` and from the unscoped legacy `(modelId)` value. Only validated typed parameter snapshots MAY be persisted.

#### Scenario: Desk and Wall Snap values are isolated

- **GIVEN** a user saves one valid Snap snapshot from the Desk context and a different valid Snap snapshot from the Wall context
- **WHEN** the user navigates between `/cad/opengrid-snap?system=desk` and `/cad/opengrid-snap?system=wall`
- **THEN** each route MUST restore only its own scoped snapshot
- **AND** neither route MUST overwrite the other context's saved value

### Requirement: Scoped persistence precedence and legacy isolation

When a CAD route has a supported system context, initialization MUST prefer the valid saved value for that `(system, modelId)`, then that system's preset, then the model definition defaults. An unscoped legacy entry MUST NOT be used as a silent fallback for a system-scoped route. A route without a supported system context MUST preserve legacy model-id-scoped restore behavior.

#### Scenario: Legacy Snap data does not pollute Desk

- **GIVEN** only an unscoped `opengrid-snap` value exists and no Desk/Snap value exists
- **WHEN** the user opens `/cad/opengrid-snap?system=desk`
- **THEN** the workspace MUST use the Desk preset
- **AND** the unscoped value MUST remain available only to the context-free `/cad/opengrid-snap` route

#### Scenario: Restore defaults uses the active system preset

- **GIVEN** the user is in a supported system context and has changed its parameters
- **WHEN** the user activates `全部恢復預設`
- **THEN** the controls and next generation MUST use the active system preset
- **AND** the reset MUST NOT copy the unscoped model definition value when the system preset differs

### Requirement: Open Shelf parameters are persisted independently

The versioned browser-local parameter record MUST store valid `opengrid-open-shelf` snapshots under that stable model id. The entry MUST contain typed `x`, `y`, `height`, `cellX`, `cellZ`, `angle`, and `honeycombMode` values accepted by the current validator and MUST remain independent from every other OpenGrid component and from the Wall scope. A legacy six-field entry MUST hydrate with `honeycombMode=false`; a missing, malformed, or otherwise invalid entry MUST fall back to the Open Shelf definition defaults.

#### Scenario: Restore valid or legacy Desk Open Shelf parameters

- **GIVEN** browser persistence contains a valid Desk-scoped `opengrid-open-shelf` snapshot
- **WHEN** the user opens `/cad/opengrid-open-shelf?system=desk`
- **THEN** the controls and first generation MUST use its six geometric values and typed material-mode value
- **AND** a legacy snapshot without the toggle MUST restore it as disabled
- **AND** no fields from another component may be merged into the snapshot

#### Scenario: Persist a valid Open Shelf update

- **WHEN** a new Open Shelf snapshot passes validation
- **THEN** only the active `opengrid-open-shelf` persistence entry MUST be updated
- **AND** the stored values MUST remain typed numbers and a boolean rather than raw input strings

#### Scenario: Invalid Open Shelf input does not overwrite persistence

- **GIVEN** a previously accepted Open Shelf snapshot exists
- **WHEN** the user enters an invalid or incomplete value
- **THEN** the previous accepted entry MUST remain unchanged
- **AND** the invalid snapshot MUST not be used for initialization or sent to the Worker

### Requirement: Stale unregistered model entries are ignored

The persistence reader MUST validate candidate entries against the current
model catalog before restoring or rewriting them. Entries keyed by the removed
`box-normal` model ID MUST be ignored, MUST NOT cause initialization failure,
and MUST be omitted from the next successfully written canonical payload.

#### Scenario: Removed model entry is harmless

- **WHEN** browser storage contains a valid-looking `box-normal` entry after the
  model has been removed
- **THEN** no `box-normal` state MUST be restored or generated
- **AND** the remaining component entries MUST continue to restore normally
- **AND** a later successful persistence write MUST omit the stale entry
