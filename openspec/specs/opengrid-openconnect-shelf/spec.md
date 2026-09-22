# OpenGrid OpenConnect Shelf Specification

## Purpose

Defines a printable wall-system shelf that presents a native OpenGrid Full surface at 90° to a selectable X/Z grid of locked OpenConnect receptacles while deriving a sloped build surface from four typed controls.

## Requirements

### Requirement: OpenGrid OpenConnect Shelf has a stable wall-component identity

The system MUST register an independent model whose modelId, buildKey, route slug, catalog component directory, and CAD-kernel component directory are all `opengrid-openconnect-shelf`. Its user-facing display name MUST begin with `OpenGrid `, its CAD route MUST be `/cad/opengrid-openconnect-shelf`, and it MUST be discoverable in the OpenGrid Wall subgroup but not the OpenGrid Desk subgroup. Existing model IDs, build keys, route slugs, persisted entries, and export names MUST remain unchanged.

#### Scenario: Resolve the new model consistently

- **WHEN** the catalog, route resolver, parameter store, or CAD Worker receives `opengrid-openconnect-shelf`
- **THEN** every layer MUST resolve the same new component definition
- **AND** no existing OpenGrid model MUST be substituted or migrated

#### Scenario: Show the component only in the wall system

- **WHEN** the model catalog is grouped by OpenGrid system context
- **THEN** `opengrid-openconnect-shelf` MUST appear in the Wall subgroup with a localized `OpenGrid ` display name
- **AND** it MUST NOT appear in the Desk subgroup

### Requirement: Shelf parameters are typed and depth-constrained

The normalized parameter snapshot MUST contain exactly `{ columns, rows, connectorRows, angle, openConnectHorizontalAlignment, openConnectVerticalAlignment }`. `columns`, `rows`, and `connectorRows` MUST be safe integers from 1 through 10, and `angle` MUST be a finite number of degrees aligned to 0.5-degree steps. The defaults MUST be `{ columns: 3, rows: 3, connectorRows: 1, angle: 14, openConnectHorizontalAlignment: 'center', openConnectVerticalAlignment: 'top' }`. For selected Y and Z counts, the maximum valid angle MUST be `floor(atan(((connectorRows * 28) - 7) / (rows * 28)) * 180 / pi)`, and the valid angle range MUST be from 1 degree through that derived maximum, inclusive. Non-finite values, fractional grid counts, angles outside the 0.5-degree step, missing required dimension fields or unknown fields, and out-of-range values MUST be rejected with a field-specific diagnostic.

#### Scenario: Accept the default snapshot

- **WHEN** the component validates `{ columns: 3, rows: 3, connectorRows: 1, angle: 14 }`
- **THEN** validation MUST succeed with the same typed values
- **AND** the derived functional footprint MUST be `84 mm × 84 mm`

#### Scenario: Derive the maximum angle from depth and rear height

- **WHEN** `connectorRows=1` and `rows` is 2, 3, or 4
- **THEN** the maximum integer angle MUST be 20°, 14°, or 10° respectively
- **AND** the angle control and validation diagnostic MUST use the same derived limit
- **AND** changing to `connectorRows=2` with `rows=3` MUST raise the maximum to 30°

#### Scenario: Reject an unsafe depth and angle combination

- **WHEN** a snapshot uses `rows=4`, `connectorRows=1`, and `angle=14`
- **THEN** validation MUST reject `angle` because the derived front height would be below 7 mm
- **AND** the invalid snapshot MUST NOT be sent to the CAD Worker

#### Scenario: Reject malformed or expanded snapshots

- **WHEN** a snapshot has a missing required dimension key, an unknown key, a fractional grid count, an angle outside the 0.5-degree step, a non-finite number, or a value outside its valid range
- **THEN** validation MUST fail with a diagnostic identifying the affected field or parameter object
- **AND** no partially normalized value MUST become exportable or persisted

### Requirement: Functional interfaces are flat and mutually perpendicular

In the installed coordinate system, the generated shelf MUST preserve a complete canonical OpenGrid Full functional surface with nominal width `columns * 28 mm`, nominal depth `rows * 28 mm`, and standard 6.8 mm Full thickness. That surface MUST be planar and horizontal, with its top at the `connectorRows * 28 mm` rear-height datum. The OpenConnect interface MUST be a planar `connectorRows * 28 mm`-high rear face immediately outside the back edge so neither its plate nor its receptacle cutters remove any part of the OpenGrid interface. Every selected connector row MUST remain below the OpenGrid top surface. The OpenGrid surface normal and OpenConnect rear-face normal MUST remain exactly perpendicular for every valid angle; changing `angle` MUST affect only the opposite support side and the whole-model print orientation, not this 90° functional relationship.

#### Scenario: Generate the default functional envelope

- **WHEN** the default 3-column by 3-row shelf is evaluated in installed coordinates
- **THEN** its OpenGrid Full interface MUST have a nominal `84 mm × 84 mm` footprint
- **AND** its rear OpenConnect face MUST be 84 mm wide and 28 mm high
- **AND** the two functional planes MUST meet at 90°
- **AND** the complete rear row of the canonical OpenGrid interface MUST remain present

#### Scenario: Raise the shelf over multiple Z connector rows

- **WHEN** `connectorRows=2`
- **THEN** the rear OpenConnect face and OpenGrid top datum MUST both be 56 mm above the rear lower datum
- **AND** no connector row may protrude above the horizontal OpenGrid surface

#### Scenario: Change shelf depth without tilting the interface

- **WHEN** `rows` changes while `columns` and `angle` remain valid
- **THEN** the OpenGrid depth MUST change in exact 28 mm increments
- **AND** the OpenGrid plane and rear OpenConnect plane MUST remain perpendicular

### Requirement: Every X/Z cell has a native locked OpenConnect receptacle

The rear face MUST contain exactly `columns * connectorRows` upward-oriented OpenConnect receptacles. Every receptacle MUST use the supplied millimetre STEP locked-slot negative at its authored scale and origin, with no scaling, mirroring, or recentering. Its rigid placement MUST match the assembled OpenConnect head direction used by the OpenGrid Snap generator so that the Snap head occupies the locked receptacle without geometric interference. Slot source origins MUST be separated by the 28 mm OpenGrid pitch in X and Z, aligned with the corresponding column centers, placed at `(connectorRow + 0.5) * 28 mm` on the exterior face of the rear plate, and transformed so the cutter enters that plate without reaching the OpenGrid board. No unlocked or user-selectable lock distribution MUST be exposed.

#### Scenario: Cut all default locking slots

- **WHEN** the default three-column shelf is generated
- **THEN** the rear face MUST contain exactly three OpenConnect receptacles on 28 mm centers
- **AND** every receptacle MUST include the supplied locking feature

#### Scenario: Cut multiple vertical locking rows

- **WHEN** a two-column shelf is generated with `connectorRows=2`
- **THEN** its 56 mm-high rear face MUST contain four locked receptacles
- **AND** their centers MUST form a 28 mm-pitch two-by-two X/Z grid below the shelf top

#### Scenario: Preserve the supplied cutter geometry

- **WHEN** a receptacle cutter is loaded and placed
- **THEN** its source-unit dimensions and asymmetric authored origin MUST remain unchanged
- **AND** only rigid rotation and translation MUST be applied before subtraction

#### Scenario: Accept the assembled OpenConnect Snap head

- **WHEN** the OpenConnect head from a generated OpenGrid Snap is placed at the locked position of a shelf receptacle
- **THEN** the head MUST be oriented in the same assembly direction as the receptacle
- **AND** the complete head volume MUST fit within the supplied locked-slot negative within CAD tolerance

#### Scenario: Keep every cutter within its rear row

- **WHEN** any valid column and connector-row count is generated
- **THEN** each slot MUST fit within its corresponding 28 mm-high rear interface row
- **AND** adjacent slot cutters MUST remain distinct and centered on their respective 28 mm X/Z cells

### Requirement: The opposite side forms an open printable rib support

In installed coordinates, the lower edges of the two side ribs, every grid-aligned longitudinal Y-direction rib, every internal grid-aligned transverse X-direction rib, and a full-width front fascia MUST share a sloped plane rising from the rear lower datum toward the front by `rows * 28 * tan(angle)` millimetres. The front fascia MUST occupy only the inside of the nominal front boundary and extend continuously from the OpenGrid underside to that common rib plane. Each `28 mm × 28 mm` cell bay behind the front fascia MUST remain open and no continuous skin or base plate may span the underside. The resulting front height, measured between the common rib plane and the OpenGrid top datum, MUST be at least 7 mm. The rear plate, front fascia, all X/Y ribs, and the OpenGrid Full interface MUST form one connected printable solid without changing the two functional interface planes. The completed model MUST then be rigidly oriented for preview and export so the coplanar support feet lie on `Z=0` as its build surface.

#### Scenario: Default rib plane follows the selected angle

- **WHEN** the default `rows=3` and `angle=14` shelf is built in installed coordinates
- **THEN** its rib plane MUST rise toward the front by approximately `20.94 mm`
- **AND** its front height MUST be approximately `7.06 mm`
- **AND** two internal X-direction ribs MUST cross the full width on the 28 mm row boundaries
- **AND** the exterior front edge MUST be closed to the common rib plane by a full-width fascia
- **AND** all nine cell bays between the X/Y ribs MUST remain open

#### Scenario: Ground every internal X-direction grid line

- **WHEN** a shelf has more than one row
- **THEN** exactly `rows - 1` transverse ribs MUST span its width on 28 mm centers
- **AND** each transverse rib lower edge MUST lie on the same sloped plane as the longitudinal ribs
- **AND** after print orientation every transverse rib MUST contact `Z=0` across every column

#### Scenario: Close the front opening at lower angles

- **WHEN** a valid angle leaves vertical space between the front OpenGrid underside and the sloped build plane
- **THEN** the front fascia MUST extend across every column and all the way down to that build plane
- **AND** no open span may remain between the side ribs at the exterior front edge
- **AND** the fascia MUST NOT extend beyond the nominal `rows * 28 mm` OpenGrid depth

#### Scenario: Export rests on the sloped face

- **WHEN** any valid shelf is committed for preview or export
- **THEN** the whole solid MUST be rotated by the selected angle about the rear lower X-axis and translated only as needed to place its coplanar rib feet on `Z=0`
- **AND** the rigid transform MUST preserve the 90° angle between the OpenGrid and OpenConnect interfaces

#### Scenario: Support geometry remains printable

- **WHEN** the generated B-Rep is validated
- **THEN** it MUST be a non-empty valid single solid with no detached ribs or rear plate
- **AND** the full-width front fascia MUST contact the build plane across every column
- **AND** every cell bay between the X/Y ribs MUST remain unobstructed near the build plane
- **AND** its declared build-plane minimum Z MUST be zero within CAD tolerance

### Requirement: Workspace lifecycle and persistence are independent

The CAD workspace MUST expose `columns`, `rows`, `connectorRows`, `angle`, and the two OpenConnect alignment controls for `opengrid-openconnect-shelf`, present the three grid controls as X, Y, and Z sliders with the Z connector-row slider inside the OpenConnect section, show the current derived maximum angle, and use the existing debounce, latest-wins candidate, commit, mesh, STEP, and STL gates. The angle control MUST be a slider without a free-text input and MUST advance in 0.5-degree steps. When a Y- or Z-count change lowers the derived maximum below the current angle, the workspace MUST atomically clamp the angle to the new maximum before validation, persistence, or generation. Valid typed snapshots MUST persist under the `opengrid-openconnect-shelf` key independently of all other models. A valid legacy three-control snapshot MUST hydrate with `connectorRows=1`. Missing or malformed persisted data MUST fall back to the new defaults; invalid current input MUST leave the last committed valid model visible as stale and MUST disable new exports.

#### Scenario: Initialize the dedicated route

- **WHEN** a user opens `/cad/opengrid-openconnect-shelf?system=wall` with browser CAD prerequisites
- **THEN** the workspace MUST initialize `modelId=opengrid-openconnect-shelf`
- **AND** generation 1 MUST use a valid saved snapshot or `{ columns: 3, rows: 3, connectorRows: 1, angle: 14 }`

#### Scenario: Persist valid shelf controls independently

- **WHEN** a valid shelf snapshot passes validation
- **THEN** persistence MUST update only the `opengrid-openconnect-shelf` entry with typed values
- **AND** entries for `opengrid`, `opengrid-snap`, and every other component MUST remain unchanged

#### Scenario: Clamp the angle when depth lowers its ceiling

- **GIVEN** a two-row shelf has a valid angle of 19.5°
- **WHEN** the user changes the row count to three
- **THEN** the angle slider MUST change to the new 14° maximum without exposing a text input or invalid intermediate snapshot
- **AND** the resulting `{ columns, rows: 3, connectorRows: 1, angle: 14 }` snapshot MUST follow the normal persistence and generation lifecycle

#### Scenario: Clamp the angle when Z lowers its ceiling

- **GIVEN** a three-row shelf has `connectorRows=2` and a valid angle of 29.5°
- **WHEN** the user changes `connectorRows` to one
- **THEN** the angle slider MUST change atomically to the new 14° maximum
- **AND** the resulting snapshot MUST remain valid, persistable, and generatable

#### Scenario: Retain the last valid revision for invalid input

- **WHEN** the user enters an invalid row, column, or angle value
- **THEN** the workspace MUST show a diagnosable field error and invalidate the pending candidate
- **AND** the prior committed mesh MAY remain visible as stale while STEP and STL export for the invalid candidate remain disabled

#### Scenario: Normalize legacy alignment and reject malformed choices

- **WHEN** an otherwise valid snapshot omits either alignment field
- **THEN** the missing horizontal choice MUST normalize to `center` and the missing vertical choice to `top`, preserving its geometry and other values
- **AND** explicit unsupported values, including null and empty strings, MUST be rejected for the affected field

### Requirement: Bounds and exports are deterministic

The component MUST report deterministic bounds for its print-oriented geometry and MUST support the existing committed-B-Rep STEP and binary STL lifecycle. Equivalent typed parameters MUST produce identical filenames. STEP filenames MUST use `opengrid-openconnect-shelf-c{columns}-r{rows}-z{connectorRows}-a{angle}.step`, and STL filenames MUST use the same stem with `.stl`. Invalid or failed generations MUST NOT become exportable revisions.

#### Scenario: Equivalent snapshots produce stable names

- **WHEN** two accepted snapshots normalize to the same typed `columns`, `rows`, `connectorRows`, and `angle`
- **THEN** their STEP and STL filenames MUST be identical
- **AND** both filenames MUST begin with `opengrid-openconnect-shelf-`

#### Scenario: Successful generation supports both exports

- **WHEN** a valid shelf generation is committed
- **THEN** the workspace MUST display its mesh and enable the existing STEP and STL actions
- **AND** both exports MUST originate from that same committed valid B-Rep revision

#### Scenario: Failed generation is not exportable

- **WHEN** asset loading, boolean subtraction, topology validation, or mesh generation fails
- **THEN** the Worker MUST report a diagnosable failure without committing the candidate
- **AND** the failed revision MUST not enable or replace STEP or STL export

### Requirement: OpenConnect and OpenGrid sources are attributed

The component workspace MUST present attribution for David D's OpenGrid design and mitufy's OpenConnect system, identify the OpenConnect source material as Creative Commons Attribution 4.0, and link to the corresponding upstream profiles or project pages. The bundled locked-slot STEP MUST have repository-local provenance documentation. The supplied Gridfinity STL MUST remain a non-runtime design reference and MUST NOT be shipped as generated geometry or a golden compatibility asset.

#### Scenario: Show attribution on the new route

- **WHEN** the new component workspace is displayed
- **THEN** users MUST be able to view credits for both OpenGrid and OpenConnect
- **AND** the OpenConnect credit MUST identify mitufy and the CC BY 4.0 source license

#### Scenario: Keep the reference STL out of runtime assets

- **WHEN** production assets for `opengrid-openconnect-shelf` are enumerated
- **THEN** the locked-slot STEP and its provenance documentation MAY be included
- **AND** the supplied Gridfinity STL MUST NOT be loaded, bundled, or used as the authoritative generated shape

### Requirement: Collapsed OpenConnect rear-grid settings

The `opengrid-openconnect-shelf` panel MUST use the shared OpenConnect section, initially collapsed and expandable by pointer or keyboard. It MUST group rear-grid controls and display horizontal alignment choices left/center/right (靠左／置中／靠右) and vertical top/center/bottom (靠上／置中／靠下), using installed front-view directions. The canonical field `openConnectHorizontalAlignment` MUST accept only `left`, `center`, `right`; `openConnectVerticalAlignment` MUST accept only `top`, `center`, `bottom`. Selections MUST persist, round-trip to generation, and restore to center/top on reset. Alignment MUST translate only the complete rear receptacle grid while preserving pitch, count, authored cutter geometry, cell-safe edge clearance and body geometry. Snap, Wall Cover and grid-board settings MUST remain unchanged.

#### Scenario: Expand and edit rear-grid settings

- **WHEN** the user opens the accessory panel
- **THEN** OpenConnect controls MUST initially be hidden inside a collapsed section
- **AND** activating its header MUST expose the controls with localized accessible labels
- **AND** valid selections MUST reach the generated model and survive reload

#### Scenario: Keep choices usable without spare space

- **WHEN** a rear-grid axis occupies its full available span
- **THEN** all three choices on that axis MUST remain selectable and persistable
- **AND** those choices MUST yield identical geometry without disabled controls or special no-space messaging

#### Scenario: Preserve rear-grid spacing and safe borders

- **WHEN** any of the nine alignment combinations is selected
- **THEN** the complete grid MUST keep its original pitch and receptacle count
- **AND** its occupied cells MUST remain inside the rear interface
- **AND** any spare width or height MUST be allocated according to the selected alignment without resizing the body
