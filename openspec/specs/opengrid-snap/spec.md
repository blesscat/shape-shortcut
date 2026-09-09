## Purpose

定義 OpenGrid Snap 元件的參數契約、參考幾何、profile 與 footprint 衍生幾何、品質驗證、生命週期與匯出一致性。

## Requirements

### Requirement: OpenGrid Snap model contract

The system MUST register the independent `opengrid-snap` model with `Full` and
`Lite` variants and `Standard` and `Directional` profiles. Its normalized
parameter snapshot MUST contain exactly `variant`, `profile`, `offset`,
`footprint`, `fourCornerLocatingHoles`, `centerRemoverHole`,
`openConnect`, `magnetHoleShape`, `magnetHoleLength`, `magnetHoleWidth`,
`magnetHoleDiameter`, and `magnetHoleThickness`. `variant` MUST be `Full` or
`Lite`; `profile` MUST be `Standard` or `Directional`; and `footprint` MUST be
`full`, `half`, or `quarter`. `openConnect` MUST remain boolean for
persistence and request compatibility. After normalization, it MUST preserve
the explicit boolean for a full-footprint snapshot and MUST be `false` for
`half` or `quarter`. Incoming full-footprint snapshots that omit
`openConnect` MUST use the default `false`; an explicit `true` MUST remain
true. The selected profile and variant
MUST be used without substituting a Directional profile for a Standard
profile. `topText` MUST be `none` in every newly created or normalized Snap
snapshot and MUST have no geometric effect. The Snap UI MUST NOT offer `SNAP`
as an active text choice. `magnetHoleShape` MUST be `none`, `square`, or
`round`. When the shape
is `none`, all four magnet dimensions MUST be zero and the magnet feature MUST
have no geometric effect. When the shape is `square`,
`magnetHoleLength`, `magnetHoleWidth`, and `magnetHoleThickness` MUST be
finite positive values and `magnetHoleDiameter` MUST be zero. When the shape
is `round`, `magnetHoleDiameter` and `magnetHoleThickness` MUST be finite
positive values and `magnetHoleLength` and `magnetHoleWidth` MUST be zero. The
magnet feature MUST be mutually exclusive with
`fourCornerLocatingHoles` and `centerRemoverHole`; invalid combinations MUST
be rejected. For `footprint=half` or `footprint=quarter`, the magnet shape MUST
be `none`, all magnet dimensions MUST be zero, and `openConnect` MUST be
false. The system radio used to select Desktop or Wall persistence MUST NOT be
added to this normalized CAD snapshot or change the existing `opengrid-snap`
modelId, buildKey, route, Worker request model id, or export contract. A Snap
snapshot MUST NOT contain board rows, columns, Heavy, screws, connectors,
chamfers, `halfCellX`, `halfCellY`, `allowHalfCell`, or
direction-specific/diagonal fields. The OpenGrid board MAY continue to use its
own `halfCellX` and `halfCellY` contract. The existing `opengrid-snap` modelId,
buildKey, and route MUST remain unchanged. A zero-offset, full-footprint
Standard snapshot with all features disabled MUST use the repository-owned
Bare Standard reference or its equivalent programmatic baseline. When
`openConnect=true`, it MUST include the selected OpenConnect composition; when
`openConnect=false`, it MUST remain a Snap-only result.

#### Scenario: Valid full-footprint Standard snapshot

- **WHEN** a persisted or imported full-footprint Standard snapshot has
  `variant=Full`, `offset=0`, all optional body features disabled, and
  `openConnect=true`
- **THEN** normalization MUST preserve `openConnect=true`
- **AND** generation MUST select the Full Bare Standard baseline and include
  the OpenConnect composition
- **AND** the body MUST remain solid except for fixed geometry already present
  in the source profile

#### Scenario: Valid full-footprint Snap without OpenConnect

- **WHEN** a full-footprint Snap snapshot explicitly sets `openConnect=false`
- **THEN** normalization and validation MUST preserve the disabled state
- **AND** generation MUST return the selected Snap assembly without loading or
  composing the OpenConnect head or underside notch
- **AND** the result's external height MUST remain the selected Snap height

#### Scenario: Valid OpenConnect profile and variant matrix

- **WHEN** a complete full-footprint snapshot selects any of `Standard Lite`,
  `Standard Full`, `Directional Lite`, or `Directional Full` with
  `openConnect=true`
- **THEN** validation and generation MUST accept the selected profile and
  variant
- **AND** generation MUST include OpenConnect geometry for that exact profile
  and variant
- **AND** generation MUST retain the selected profile without substituting a
  Directional profile for a Standard profile

#### Scenario: OpenConnect is not accepted for a fixed partial footprint

- **WHEN** a snapshot has `footprint=half` or `footprint=quarter`
- **THEN** normalization MUST produce `openConnect=false`
- **AND** validation MUST reject a normalized snapshot that sets
  `openConnect=true` with a diagnosable field error
- **AND** the Worker MUST use the existing fixed partial-footprint asset
  without OpenConnect geometry

#### Scenario: Valid square magnet snapshot

- **WHEN** a full-footprint snapshot selects `magnetHoleShape=square` with
  positive length, width, and thickness, zero diameter, both existing hole
  flags `false`, and `openConnect=true`
- **THEN** validation MUST accept it when the dimensions fit the selected
  profile's printable body and retaining structure
- **AND** generation MUST apply one centered square magnet feature while
  retaining the selected OpenConnect composition

#### Scenario: Valid round magnet snapshot

- **WHEN** a full-footprint snapshot selects `magnetHoleShape=round` with
  positive diameter and thickness, zero length and width, both existing hole
  flags `false`, and `openConnect=true`
- **THEN** validation MUST accept it when the dimensions fit the selected
  profile's printable body and retaining structure
- **AND** generation MUST apply one centered round magnet feature while
  retaining the selected OpenConnect composition

#### Scenario: Valid canonical half-footprint snapshot

- **WHEN** a complete Snap snapshot has `variant=Lite`, `profile=Standard`,
  `offset=0`, `footprint=half`, both existing hole flags `false`,
  `magnetHoleShape=none`, all magnet dimensions `0`, and `openConnect=false`
- **THEN** validation MUST accept it
- **AND** production preview generation MUST use the repository-owned fixed
  `snap-half.step` asset without an OpenConnect head
- **AND** the fixed result MUST fit one 14 mm axis host and one 28 mm host axis

#### Scenario: Valid canonical quarter-footprint snapshot

- **WHEN** a complete Snap snapshot has `variant=Lite`,
  `profile=Directional`, `offset=0`, `footprint=quarter`, both existing hole
  flags `false`, `openConnect=false`, `magnetHoleShape=none`, and all magnet
  dimensions `0`
- **THEN** validation MUST accept it
- **AND** production preview generation MUST use the repository-owned fixed
  `snap-quarter.step` asset without an OpenConnect head
- **AND** the fixed result MUST fit both 14 mm host axes

#### Scenario: Legacy Snap snapshots normalize OpenConnect and surface text

- **WHEN** a persisted or imported Snap snapshot predates the `openConnect` or
  `topText` fields and otherwise contains a valid current Snap configuration
- **THEN** normalization MUST add `openConnect=false` and `topText=none`
- **AND** the normalized snapshot MUST remain compatible with the existing
  single-color generation and export contract

#### Scenario: Legacy Snap surface text is moved to Wall Cover

- **WHEN** a persisted or imported Snap snapshot contains the legacy
  `topText=SNAP` value
- **THEN** normalization MUST replace it with `topText=none`
- **AND** generation MUST produce ordinary single-color Snap geometry without
  a text cavity or separate text part
- **AND** the Wall Cover model MUST be used for the dual-color surface text
  use case

#### Scenario: Legacy Snap snapshots default OpenConnect off when absent

- **WHEN** a persisted or imported full-footprint Snap snapshot predates the
  `openConnect` field
- **THEN** normalization MUST add the field with `openConnect=false`
- **AND** the normalized snapshot MUST remain compatible with the existing
  generation and export contract

#### Scenario: Board or direction fields are rejected by the normalized Snap validator

- **WHEN** a normalized Snap snapshot contains forbidden board/direction fields,
  an unknown OpenConnect value, an unknown `topText` value, an unknown magnet
  shape, non-zero inactive magnet dimensions, non-positive or non-finite active
  dimensions, or a magnet conflict with an existing hole flag
- **THEN** validation MUST reject the snapshot as a model-parameter mismatch
- **AND** the Worker MUST NOT generate or export that snapshot

### Requirement: OpenConnect reference geometry and composition

Every valid full-footprint Snap with `openConnect=true` MUST load the repository-owned
`openConnect_head.step` geometry as the production OpenConnect head. The head's
source dimensions and Z geometry MUST remain unchanged; the supplied STL
references MAY serve as placement evidence but MUST NOT be treated as a second
production mesh. The selected Snap profile and variant MUST be built first and
MUST receive the requested full-footprint XY offset transform. The final
OpenConnect interface position MUST then be derived from that adjusted Snap.
The unchanged head MUST be composed at that position and MUST NOT receive the
Snap's XY scale transform. Before head composition, every Standard and
Directional result MUST receive the fixed negative-Y underside notch inferred
from the supplied STEP reference and supporting STL references. The notch MUST
be a variant-specific stepped, multi-segment profile rather than a single
rectangular cut: its lower pockets MUST leave the central step/support profile
visible, while the top-reaching segment or segments reach the selected Snap
top. It MUST remove material without increasing the external height. Both Lite
and Full heads MUST start directly at the selected Snap top.

#### Scenario: OpenConnect uses the supplied STEP size

- **WHEN** a valid full-footprint Snap with `openConnect=true` selects any
  Standard or Directional profile and either variant
- **THEN** the generated result MUST contain the selected Snap assembly and
  the OpenConnect head from the repository-owned STEP source
- **AND** the head's measurable source dimensions MUST match the STEP source
  within the configured CAD tolerance
- **AND** both variants MUST place the head directly at the selected Snap top
- **AND** the selected Snap MUST contain the supplied STEP's stepped
  negative-Y underside notch through its top while neighboring support material
  and material below the notch remain present
- **AND** the STL reference MUST not add duplicate or unrelated production
  geometry

#### Scenario: Lite notch follows the supplied Lite STEP

- **WHEN** a Standard or Directional Lite full-footprint Snap enables
  OpenConnect
- **THEN** the underside notch MUST use a 5 mm-wide top-reaching segment from
  `y=-12.4` to `y=-10.9` and `z=1.9` to the selected Snap top
- **AND** it MUST use a second 5 mm-wide lower pocket from `y=-10.9` to
  `y=-10.4` and `z=2.0` to `z=2.5`
- **AND** both segments MUST remain centered on `x=-2.5` to `x=2.5`
- **AND** the cut MUST preserve neighboring side material and the support
  geometry below the notch

#### Scenario: Wall offset adjusts Snap before OpenConnect composition

- **WHEN** a valid full-footprint Snap uses `openConnect=true` and
  `offset=0` or a positive valid offset
- **THEN** the selected Snap assembly MUST use its normal full-footprint XY
  transform and retain its selected profile and variant Z bounds
- **AND** the OpenConnect head MUST retain its original XY dimensions
- **AND** the fixed underside notch MUST follow the selected Snap's XY
  transform
- **AND** the OpenConnect interface MUST be placed using the final adjusted
  Snap coordinates before the fixed head is composed

#### Scenario: Snap-only cutters do not resize the OpenConnect head

- **WHEN** a valid full-footprint snapshot uses `openConnect=true` and also
  enables a Snap-local optional cutter applicable to the active system scope
- **THEN** the cutter MUST apply to the Snap geometry according to the existing
  feature contract
- **AND** the OpenConnect head placement MUST remain fixed relative to the
  adjusted Snap without scaling the head

### Requirement: OpenConnect quality and committed export metadata

Before committing a full-footprint candidate, the Worker MUST verify that the
selected Snap assembly, fixed underside notch, and OpenConnect head are
present when `openConnect=true`, the head remains within its source geometry
tolerance, the final interface placement is valid, the result has valid B-Rep
geometry, and the committed mesh is finite and non-empty. Every
OpenConnect-enabled full-footprint STEP and STL filename MUST identify the
composition. An OpenConnect-free full-footprint candidate MUST use the plain
Snap quality path and export without the OpenConnect suffix. A failed quality
check MUST discard the candidate and keep STEP/STL export disabled for that
generation.

#### Scenario: Valid OpenConnect candidate becomes exportable

- **WHEN** an OpenConnect-enabled full-footprint candidate passes
  source-geometry, interface, assembly, B-Rep, mesh, and generation checks
- **THEN** it MAY be committed
- **AND** the viewport, STEP export, and STL export MUST refer to the same
  committed revision
- **AND** its filenames MUST identify the OpenConnect composition

#### Scenario: Invalid OpenConnect candidate remains stale

- **WHEN** the OpenConnect source cannot be loaded, the underside notch is
  missing, the interface is misplaced, the head is scaled or missing, or the
  combined result fails B-Rep or mesh validation
- **THEN** the candidate MUST be discarded
- **AND** the previous committed preview MAY remain visible but MUST be marked
  stale
- **AND** STEP/STL export MUST remain disabled for the failed generation

#### Scenario: OpenConnect-free full candidate uses Snap quality

- **WHEN** a full-footprint candidate has `openConnect=false`
- **THEN** the Worker MUST quality-check the Snap assembly without requiring
  the OpenConnect head or underside notch
- **AND** a valid candidate MUST remain exportable with filenames that omit the
  OpenConnect suffix

### Requirement: Central magnet pocket geometry

For a valid `footprint=full` snapshot with `magnetHoleShape=square` or
`magnetHoleShape=round`, the generated Snap MUST contain exactly one centered
magnet cavity. The cavity MUST begin at the underside of the selected Snap and
extend upward along Z by the requested `magnetHoleThickness`; the thickness
field MUST use the same meaning for square and round shapes. The square cavity
MUST use the requested length and width in the XY plane. The round cavity MUST
use the requested diameter in the XY plane. The cavity MUST remain centered at
the Snap origin and its requested dimensions MUST remain fixed when a valid
non-zero outer offset scales the non-hole assembly.

#### Scenario: Square cavity uses the requested dimensions

- **WHEN** a valid square magnet snapshot is generated
- **THEN** the underside cavity MUST measure the requested length and width
  within the documented CAD tolerance
- **AND** its Z extent MUST equal the requested thickness within tolerance
- **AND** no second magnet cavity MAY be present

#### Scenario: Round cavity uses the requested dimensions

- **WHEN** a valid round magnet snapshot is generated
- **THEN** the underside cavity MUST measure the requested diameter within the
  documented CAD tolerance
- **AND** its Z extent MUST equal the requested thickness within tolerance
- **AND** no second magnet cavity MAY be present

#### Scenario: Four retaining openings connect the cavity

- **WHEN** either magnet shape is generated
- **THEN** four cardinal openings at the annotated top, bottom, left, and right
  red-frame positions MUST run directly from the central cavity to each
  profile's corresponding existing side gap
- **AND** each opening MUST be 2 mm wide in the XY plane within tolerance
- **AND** the opening endpoint MUST stop at the outer edge of that gap while
  retaining the surrounding material needed to clamp a press-fit magnet rather
  than removing the entire outer support

#### Scenario: Magnet geometry is applied after non-hole scaling

- **WHEN** a valid magnet snapshot uses a positive outer offset
- **THEN** the selected profile and non-hole assembly MUST receive their normal
  XY transform first
- **AND** the central cavity dimensions, center, Z thickness, and 2 mm opening
  width MUST remain unchanged

### Requirement: Magnet feature conflicts and footprint controls

The Snap panel MUST expose the magnet shape and its shape-specific dimensions
next to the existing locating-hole and remover-hole controls on every supported
Snap route. The shape-specific numeric dimensions MUST use slider controls, and
their displayed labels MUST omit the `magnet-hole` prefix. Length, width, and
diameter sliders MUST range from 1 mm through 15 mm, default to 5 mm, and use
0.05 mm steps. Thickness MUST range from 1 mm through 6 mm and use 0.05 mm
steps for the Full variant. The inactive shape option MUST be labelled `無` in
the Traditional Chinese locale and `None` in English. The controls MUST NOT
be hidden or enabled only by `system=wall`.
Selecting a square or round magnet mode MUST clear or disable both existing
hole controls, and selecting either existing hole feature MUST return the
magnet mode to `none`; the resulting normalized snapshot MUST never contain a
conflicting combination. Selecting `Half` or `Quarter` MUST reset the magnet
mode and dimensions to their inactive values and disable all magnet controls.

#### Scenario: Magnet controls appear with existing hole controls

- **WHEN** a user opens any supported `/cad/opengrid-snap` route
- **THEN** the panel MUST show the magnet mode alongside locating-hole and
  remover-hole controls
- **AND** no route context condition MAY be required to display the controls

#### Scenario: Magnet selection disables conflicting features

- **WHEN** a user selects square or round magnet mode
- **THEN** the locating-hole and remover-hole controls MUST become inactive or
  unchecked
- **AND** the next valid generation MUST contain only the magnet feature among
  these mutually exclusive features

#### Scenario: Existing hole selection disables the magnet

- **WHEN** a user enables locating holes or the remover hole while magnet mode
  is active
- **THEN** magnet mode MUST return to `none` and its dimensions MUST become
  inactive
- **AND** the next valid generation MUST contain the selected existing feature
  without a magnet cavity

#### Scenario: Half and quarter reject magnet customization

- **WHEN** a user selects `Half` or `Quarter`
- **THEN** the magnet mode and all magnet dimensions MUST reset to inactive
  values
- **AND** the controls MUST be disabled with an explanation that fixed
  footprints do not accept holes
- **AND** the fixed repository-owned STEP asset MUST remain unchanged

### Requirement: Magnet quality and committed export metadata

Before committing a magnet-enabled candidate, the Worker MUST verify the
centered cavity shape, requested XY dimensions, requested underside Z
thickness, four 2 mm connecting openings, preserved retaining material, valid
B-Rep, finite non-empty mesh, and complete selected Snap assembly. A failed
magnet quality check MUST discard the candidate and keep STEP/STL export
disabled for that generation. Full-footprint magnet-enabled STEP and STL
filenames MUST identify the magnet shape and all active dimensions so that two
different magnet configurations cannot overwrite each other's exports. A
magnet-disabled Full filename MUST retain the existing filename format, and
Half/Quarter filenames MUST remain `Half.step` and `Quarter.step`.

#### Scenario: Valid magnet candidate becomes exportable

- **WHEN** a magnet-enabled Full candidate passes all cavity, opening,
  retention, assembly, B-Rep, mesh, and generation checks
- **THEN** it MAY be committed
- **AND** the viewport, STEP export, and STL export MUST refer to that same
  committed revision
- **AND** the generated filenames MUST distinguish its magnet shape and active
  dimensions

#### Scenario: Invalid magnet candidate remains stale

- **WHEN** a magnet candidate loses the requested cavity, has an incorrect
  opening width, removes required retaining material, exceeds the selected
  profile's safe geometry, or fails B-Rep/mesh validation
- **THEN** the candidate MUST be discarded
- **AND** the previous committed preview MAY remain visible but MUST be marked
  stale
- **AND** STEP/STL export MUST remain disabled for the failed generation

### Requirement: Complete reference assembly preservation

For production Worker previews, the fixed Half and Quarter asset requirement below takes precedence over the generated half-cell derivation. The canonical derivation remains available for direct builder contexts that do not provide a fixed-footprint asset loader.

For a full-footprint Standard snapshot, the generated Snap result MUST preserve the complete reference assembly, including one Body, four Side Holder solids, and four Snap solids, for a total of nine solids. It MUST remain centered on X/Y and based at Z=0, with the variant-specific Z profile from the Bare Standard reference. At `offset=0`, every member MUST match the selected Bare Standard reference within the documented CAD tolerance. At a positive offset, every non-hole member MUST receive the same canonical X/Y scale transform for its axis; the central Body and Snap interface MUST NOT be held at their zero-offset XY dimensions. Half and quarter snapshots MUST first transform the complete selected assembly and MUST then satisfy the project-owned footprint-fit quality requirement; they MUST NOT be required to retain nine solids after explicit clipping/recomposition. A full-footprint Directional snapshot MUST preserve the topology permitted by its own Directional profile, including a valid fused B-Rep when the source profile is fused, and MUST preserve its canonical asymmetric directional envelope after the offset transform.

#### Scenario: Zero-offset Full Standard assembly

- **WHEN** Full Standard is generated with `offset=0`, `footprint=full`, and both optional hole fields `false`
- **THEN** the candidate MUST contain nine valid solids
- **AND** its XY envelope MUST match the Full Bare Standard reference within the documented CAD tolerance
- **AND** its Z bounds MUST match approximately 0 through 6.8 mm within tolerance

#### Scenario: Zero-offset Lite Standard assembly

- **WHEN** Lite Standard is generated with `offset=0`, `footprint=full`, and both optional hole fields `false`
- **THEN** the candidate MUST contain nine valid solids
- **AND** its XY envelope MUST match the Lite Bare Standard reference within the documented CAD tolerance
- **AND** its Z bounds MUST match approximately 0 through 3.4 mm within tolerance

#### Scenario: Positive-offset Standard scales every assembly member

- **WHEN** Full or Lite Standard is generated with `footprint=full` and a valid positive `offset`
- **THEN** the Body, four Side Holders, and four Snap solids MUST all reflect the requested canonical X/Y scale
- **AND** the candidate MUST still contain nine valid solids
- **AND** its Z bounds MUST match the selected Bare Standard variant
- **AND** the output MUST NOT achieve the requested envelope only by adding rectangular material to the outermost solids

#### Scenario: Directional assembly preserves its profile

- **WHEN** Full or Lite Directional is generated with `footprint=full`
- **THEN** the candidate MUST match the selected Directional profile's documented topology and Z bounds
- **AND** its canonical directional asymmetry MUST remain visible in the expected boundary probes
- **AND** a positive offset MUST scale that Directional profile itself without substituting a Standard assembly
- **AND** it MUST NOT be accepted merely because a rotated Standard assembly has a similar volume

#### Scenario: Central-only full-footprint output is rejected

- **WHEN** a full-footprint generated result contains only the central Body or has lost the required profile assembly members
- **THEN** the Snap quality gate MUST reject the candidate
- **AND** the candidate MUST NOT become the committed model

### Requirement: Total centered outer offset

The production Half and Quarter preview assets MUST ignore offset changes and use their repository-owned fixed geometry; only Full uses the incremental offset transform described below.

`offset` MUST represent one shared total width and depth increment, not a per-side increment. For a Standard full-footprint axis, its nominal Snap envelope MUST be 25.6 mm; for the selected axis of a half footprint and both axes of a quarter footprint, its nominal host envelope MUST be 12.8 mm. The requested Standard bounds MUST be applied symmetrically around the canonical host center. Directional profiles MUST preserve their documented canonical asymmetry while applying the same shared host-dimension policy. For a positive offset, the builder MUST compute an X and Y target span for the complete pre-footprint assembly: an unselected full axis MUST use its source full span plus `offset`, while an axis that will be clipped to a half or quarter footprint MUST use its source full span plus `2 * offset` before clipping. The builder MUST apply the corresponding X/Y scale transform to all non-hole reference geometry about the canonical full-assembly center, with Z unchanged. The offset operation MUST preserve the selected profile, optional hole diameters, optional hole centers, optional cutter dimensions, and selected footprint; the XY dimensions of non-hole central/interface geometry MUST follow the transform rather than remain fixed. The builder MUST NOT implement the offset only by fusing rectangular outer strips, and MUST NOT scale any hole cutter.

#### Scenario: Symmetric positive Standard full-footprint offset

- **WHEN** Standard is generated with `footprint=full` and `offset=0.2`
- **THEN** the overall width and depth MUST each increase by 0.2 mm within tolerance
- **AND** the X/Y host center MUST remain at the origin
- **AND** representative Body, Side Holder, and Snap XY measurements MUST match the corresponding canonical scale
- **AND** optional-hole probes MUST retain their zero-offset dimensions and centers

#### Scenario: Canonical half-footprint host adjustment

- **WHEN** a Snap changes from `footprint=full` to `footprint=half` while keeping `offset=0`
- **THEN** the requested canonical X envelope MUST change from 25.6 mm to 12.8 mm
- **AND** the canonical Y envelope MUST remain 25.6 mm
- **AND** the complete assembly MUST be scaled to the required pre-clip span before the canonical boundary operation
- **AND** the scaled profile and variant Z bounds MUST remain valid

#### Scenario: Canonical quarter-footprint host adjustment

- **WHEN** a Snap changes from `footprint=full` to `footprint=quarter` while keeping `offset=0`
- **THEN** both canonical host envelopes MUST fit within 14 mm
- **AND** the complete assembly MUST be scaled and then clipped with the canonical quarter boundary operation
- **AND** no hole diameter, cutter profile dimension, or hole center MAY change

#### Scenario: Fixed holes do not scale with offset

- **WHEN** the same profile and feature selection is generated at two valid offsets
- **THEN** every locating hole MUST retain its configured diameter and center
- **AND** every locating-hole slot MUST retain its configured width and step profile
- **AND** the center remover profile MUST retain its configured dimensions
- **AND** all optional cutters MUST be applied after the non-hole assembly scale
- **AND** the non-hole Body, holder, Snap, and profile geometry MUST follow the requested X/Y transform

#### Scenario: Footprint clipping does not translate fixed holes

- **WHEN** a half or quarter footprint is clipped and recentered
- **THEN** the recentering translation MUST apply only to the non-hole assembly
- **AND** every retained optional hole and slot MUST remain at its documented final coordinate
- **AND** a fixed locating hole that cannot fit completely inside the selected footprint MUST NOT be resized, partially cut, or moved to fit

#### Scenario: Invalid or intrusive offset

- **WHEN** an offset is non-finite, outside the configured range, off-step, or would make the selected footprint exceed its 14 mm host pitch or cause fixed-size holes/cutters to intrude into invalid geometry
- **THEN** validation or the geometry gate MUST reject the request with a diagnosable field-specific error
- **AND** no invalid candidate MAY be committed or exported

### Requirement: Reference asset loading and disposal

The Worker MUST resolve each selected `profile` and `variant` through repository-owned OpenGrid Snap assets or profile definitions under the `opengrid-snap` component directory. Standard may use a programmatic baseline, while Directional may use a bundled source-backed reference or an equivalent repository-owned profile definition, but production generation MUST NOT read `/Users/.../Downloads` or any other developer-local path. Any imported reference MUST be cached at most once per Worker epoch for its profile/variant key, failed cache promises MUST be removed so a later generation can retry, and loaded references MUST be released during disposal.

#### Scenario: Profile/variant reference cache reuse

- **WHEN** multiple generations use the same profile and variant in one Worker epoch
- **THEN** the corresponding asset or validated profile reference MUST be initialized only once
- **AND** it MUST NOT be shared with a different profile or variant

#### Scenario: Reference load retry

- **WHEN** a source-backed reference import or profile validation fails
- **THEN** the failed promise MUST be removed from the matching cache entry
- **AND** a later generation MUST be able to retry the load

#### Scenario: Worker disposal

- **WHEN** the Worker is disposed while a Snap profile reference is loaded or loading
- **THEN** the reference MUST be released exactly once when available
- **AND** no later request MAY use the disposed reference

### Requirement: Snap quality and committed exports

For Half and Quarter fixed previews, asset validation MUST verify a millimetre STEP source, non-empty solid geometry, finite bounds, and a non-empty mesh; the generated Full-footprint profile quality gate is not applicable.

Before candidate registration, the Worker MUST verify the requested host envelope, the selected profile's expected X/Y transform and Z bounds, directional probes, valid B-Rep, finite non-empty mesh, complete assembly topology, fixed optional-hole dimensions and centers, and the selected optional-hole state. Standard full-footprint snapshots MUST pass the nine-solid topology check; Directional snapshots MUST pass their profile-specific topology check. Half and quarter snapshots MUST pass the project-owned footprint quality requirements instead of the Standard nine-solid check. STEP and binary STL exports MUST use the same committed Snap revision that the viewport displays.

#### Scenario: Valid feature/profile candidate becomes exportable

- **WHEN** a Standard or Directional candidate passes its applicable envelope, expected scale geometry, topology, B-Rep, mesh, fixed-hole, feature-state, and generation checks
- **THEN** it MAY be committed
- **AND** the viewport and STEP/STL export MUST refer to that same committed revision

#### Scenario: Quality failure keeps the old preview stale

- **WHEN** a new Snap generation fails an applicable hole-dimension, profile-scale, outer-envelope, topology, or footprint quality check
- **THEN** the new candidate MUST be discarded
- **AND** the previous committed preview MAY remain visible but MUST be marked stale
- **AND** STEP/STL export MUST remain disabled for the failed generation

### Requirement: Project-owned half-cell Snap derivation

For any snapshot with `footprint=half` or `footprint=quarter`, the Worker MUST first build the complete selected Body, Snap, and Side Holder reference assembly without optional cuts. It MUST apply the required pre-footprint X/Y scale to all non-hole assembly members, then apply the selected optional body cutters with their fixed dimensions and centers, and then apply one common official OpenGrid-compatible boundary operation to all affected solids. `footprint=half` MUST use the canonical `halfCellX=left, halfCellY=none` mapping; `footprint=quarter` MUST use the canonical `halfCellX=left, halfCellY=top` mapping. The operation MUST include the required outer-frame increment and the chamfered/locking/capture cut face on every newly exposed boundary. It MUST preserve the variant/profile Z behavior, the scaled selected profile, fixed hole dimensions, non-empty B-Rep, finite mesh, and at least one valid outer support that fits the selected host pitch. It MUST NOT silently fall back to a central-only body, a rectangular-only flat cut, an unvalidated placeholder, or a second scale performed after clipping.

#### Scenario: Canonical half-footprint derivation

- **WHEN** Full or Lite is generated with `footprint=half`
- **THEN** the complete non-hole assembly MUST be scaled to the required pre-clip span
- **AND** the fixed-dimension optional cutters MUST be applied before the canonical left-edge boundary operation
- **AND** the final result MUST fit one 14 mm host axis and one 28 mm host axis
- **AND** the newly exposed cut face MUST contain the required OpenGrid insertion/locking profile

#### Scenario: Canonical quarter-footprint derivation

- **WHEN** Full or Lite is generated with `footprint=quarter`
- **THEN** the complete non-hole assembly MUST be scaled to the required pre-clip spans on both affected axes
- **AND** the fixed-dimension optional cutters MUST be applied before the canonical left-top corner boundary operation
- **AND** both final axes MUST fit within their 14 mm host pitches
- **AND** the two newly exposed cut faces MUST use the same official edge-compatible profile

#### Scenario: Side Holder is clipped with the assembly

- **WHEN** a half or quarter boundary intersects a Side Holder or Snap support
- **THEN** that support MUST first be scaled and placed at its complete-assembly position
- **AND** the same boundary operation MUST determine its surviving geometry
- **AND** the resulting exposed face MUST include the required OpenGrid chamfer, capture, or locking profile

#### Scenario: Footprint quality failure

- **WHEN** a derived half or quarter result loses the scaled profile, has no valid outer support, exceeds the host envelope, has invalid B-Rep, exposes a flat incompatible cut face, or has invalid fixed-hole geometry
- **THEN** the quality gate MUST discard the candidate
- **AND** the previous committed preview MAY remain visible but MUST be marked stale
- **AND** STEP/STL export MUST remain disabled for the failed generation

### Requirement: Half-cell Snap file metadata

Deterministic Snap STEP and STL filenames MUST include the variant, profile, offset, footprint, and every optional feature state. Full, half, and quarter filenames MUST remain distinct and MUST NOT encode or imply an arbitrary X/Y direction that the Snap UI no longer exposes.

#### Scenario: Distinct footprint filenames

- **WHEN** two Snap snapshots differ only by `footprint=half` versus `footprint=quarter`
- **THEN** their generated filenames MUST be distinct
- **AND** neither export MAY overwrite the other through the filename helper

### Requirement: Optional body feature controls

The optional body feature controls apply to Full only. Half and Quarter fixed assets do not apply locating-hole or remover-hole changes.

The generated Body MUST start from the selected Bare Standard or Directional baseline before optional cuts. `fourCornerLocatingHoles=true` MUST add exactly four fixed-profile locating-hole cutters at the selected profile's documented centers, with the documented underside elastic slots connected to those holes. `centerRemoverHole=true` MUST add the selected profile's documented stepped center-remover cutter together with one centered, vertical nominal 4.9 mm diameter circular passage at `(0, 0)`. The circular passage MUST extend through the selected Snap's full Z envelope and MUST engage the nominal Ø5 mm zero-offset positioning pillar with a deliberate press fit of 0.1 mm diametral interference (0.05 mm per side), confined to the band above the documented remover step. The existing lower remover opening and stepped upper profile MUST remain present around that passage with unchanged dimensions. After any requested non-hole XY assembly scaling, the two cutters MUST be applied independently to the transformed Body. Their diameter, slot width, circular passage diameter, step/profile dimensions, and documented centers MUST remain unchanged for every valid offset and footprint. They MUST NOT duplicate an intrinsic Directional feature already present in the selected source profile.

#### Scenario: Solid body with all optional features disabled

- **WHEN** both optional feature fields are `false`
- **THEN** the output Body MUST match the selected Bare baseline at `offset=0`
- **AND** at a positive offset it MUST match the selected Bare baseline's expected non-hole XY transform
- **AND** the surrounding Side Holder and Snap assembly MUST receive the same transform

#### Scenario: Four locating holes only

- **WHEN** `fourCornerLocatingHoles=true` and `centerRemoverHole=false`
- **THEN** the Body MUST contain four locating holes with fixed diameter 5.0 mm at centers `(±7.0, ±7.0)` mm
- **AND** the Body MUST contain four 3.0 mm-wide underside elastic slots, opening from Z=0 through the profile's documented slot-step height
- **AND** the hole and slot dimensions MUST be identical at zero and positive valid offsets
- **AND** it MUST NOT contain the optional center-remover cut or the central circular passage

#### Scenario: Center remover only

- **WHEN** `fourCornerLocatingHoles=false` and `centerRemoverHole=true`
- **THEN** the Body MUST contain the configured stepped center-remover profile with its existing lower 8 × 8 mm opening and upper 4 × 8 mm opening
- **AND** the Body MUST contain exactly one centered nominal Ø4.9 mm circular passage extending through the full Snap Z envelope
- **AND** a coaxially aligned nominal Ø5 mm positioning pillar with `offset=0` MUST interfere with the circular passage only in the band above the documented remover step, with 0.05 mm radial interference per side, and MUST pass without interference below the step where the lower 8 × 8 mm opening fully contains it
- **AND** the stepped profile, circular passage diameter, and center MUST remain unchanged after any non-hole XY scale
- **AND** it MUST NOT contain optional locating holes

#### Scenario: Both optional features

- **WHEN** both optional feature fields are `true`
- **THEN** the Body MUST contain both the four locating holes and the stepped center-remover profile with its centered nominal Ø4.9 mm circular passage
- **AND** each feature MUST be independently probeable with unchanged dimensions and centers after scaling

### Requirement: Directional Snap profile selection

When `profile=Directional`, generation MUST use the repository-owned Directional Full or Directional Lite profile in its canonical orientation. Directional MUST be modeled or imported as its own profile and MUST NOT be produced by rotating, uniformly scaling, or otherwise substituting the Standard assembly. A valid positive offset MAY apply the canonical non-hole X/Y transform to the selected Directional profile after profile selection, but it MUST NOT transform the Standard profile into Directional geometry. The profile registry MUST document its asymmetric boundary, variant-specific details, Z bounds, and which features are intrinsic versus optional.

#### Scenario: Full Directional selection

- **WHEN** `variant=Full` and `profile=Directional`
- **THEN** generation MUST use the Directional Full profile
- **AND** its directional boundary and fixed features MUST match the Directional Full fixture within tolerance

#### Scenario: Lite Directional selection

- **WHEN** `variant=Lite` and `profile=Directional`
- **THEN** generation MUST use the Directional Lite profile
- **AND** its directional boundary and fixed features MUST match the Directional Lite fixture within tolerance

#### Scenario: Positive offset scales the selected Directional profile

- **WHEN** a valid Full or Lite Directional snapshot is generated with a positive `offset`
- **THEN** the selected Directional profile's non-hole X/Y geometry MUST match the expected axis-specific transform
- **AND** its canonical asymmetric envelope and Z bounds MUST remain valid
- **AND** all optional hole dimensions and centers MUST remain unchanged

#### Scenario: Standard geometry is not rotated into Directional

- **WHEN** a Directional snapshot is generated
- **THEN** the quality gate MUST compare against Directional-specific boundary and feature probes
- **AND** a rotated or scaled Standard candidate MUST fail unless it independently satisfies the Directional profile contract

### Requirement: OpenGrid Snap footprint control

The `/cad/opengrid-snap` workspace MUST expose one footprint control with exactly the user-facing choices Full、Half、Quarter. It MUST NOT expose separate Snap X-half or Y-half direction controls. Selecting Half MUST submit `footprint=half`; selecting Quarter MUST submit `footprint=quarter`; selecting Full MUST submit `footprint=full`.

#### Scenario: Full footprint control

- **WHEN** the user selects Full in the Snap footprint control
- **THEN** the accepted normalized snapshot MUST contain `footprint=full`
- **AND** no half-cell boundary operation MAY run

#### Scenario: Half and quarter footprint controls

- **WHEN** the user selects Half or Quarter
- **THEN** the accepted normalized snapshot MUST contain `footprint=half` or `footprint=quarter` respectively
- **AND** no separate X/Y direction input MAY be required or displayed

### Requirement: Official OpenGrid host fit

The project MUST keep a repository-owned copy of `opengrid-lite-2x2-xleft-ytop-official-default-none-corners-none.step` as a geometry fixture. The fixture MUST characterize approximately `70 × 70 × 4 mm` bounds and MUST be used to verify the canonical boundary profile. A canonical half Snap placed at `(-28, 7)` and a canonical quarter Snap placed at `(-28, 28)` MUST fit the corresponding 14/28 mm and 14/14 mm host regions without forbidden solid interference beyond the configured CAD tolerance. The runtime MUST NOT read the original Downloads path.

#### Scenario: Half footprint fits the official edge host

- **WHEN** a generated Lite or Full half Snap is placed at `(-28, 7)` against the official fixture using the documented mating Z reference
- **THEN** forbidden solid interference MUST remain within the configured tolerance
- **AND** the outer boundary clearance and newly exposed locking/capture probes MUST pass

#### Scenario: Quarter footprint fits the official corner host

- **WHEN** a generated Lite or Full quarter Snap is placed at `(-28, 28)` against the official fixture using the documented mating Z reference
- **THEN** forbidden solid interference MUST remain within the configured tolerance
- **AND** both exposed boundary faces MUST pass the official edge profile probes

#### Scenario: Fixture is not a developer-local runtime dependency

- **WHEN** Snap generation runs in the Worker or browser
- **THEN** it MUST resolve only repository-owned assets or programmatic boundary profiles
- **AND** it MUST NOT access `/Users/blesscat/Downloads` or another developer-local absolute path

### Requirement: Experimental footprint notice

The Snap panel MUST display the red warning `格型測試中 不保證可使用` below the footprint control whenever `footprint=quarter` is selected. The warning MUST NOT be displayed for `footprint=full` or `footprint=half`.

#### Scenario: Experimental footprint warning

- **WHEN** the user selects Quarter in the Snap footprint control
- **THEN** the panel MUST show `格型測試中 不保證可使用` in the warning color below that control

#### Scenario: Full and half footprints have no experimental warning

- **WHEN** the user selects Full or Half in the Snap footprint control
- **THEN** the experimental footprint warning MUST not be shown

### Requirement: Fixed half and quarter STEP downloads

When the user selects `footprint=half`, the Snap workspace MUST provide a fixed repository-owned STEP download named `Half.step`; when the user selects `footprint=quarter`, it MUST provide a fixed repository-owned STEP download named `Quarter.step`. These downloads MUST use `snap-half.step` and `snap-quarter.step` respectively, MUST NOT send an incremental `export.step` request to the Worker, and MUST NOT depend on the profile, variant, optional-hole fields, or offset values. The preview for Half and Quarter MUST also load and display the corresponding fixed STEP asset, without an incremental Worker build. The fixed assets MUST be validated as millimetre STEP B-Reps with non-empty solid geometry. The Snap panel MUST disable the shared X/Y offset control and both optional-hole controls for Half and Quarter, reset the offset and optional-hole parameters to their inactive values when either footprint is selected, and explain that 增量無效、定位孔無效、移除孔無效. Full MUST retain the adjustable offset and optional-hole controls. The fixed STEP download action MUST be presented only in local dev builds; a production build MUST NOT render it, while the fixed STEP preview assets and panel control behavior MUST remain unchanged.

#### Scenario: Half uses the fixed STEP asset

- **WHEN** the user selects Half and clicks `下載 STEP`
- **THEN** the browser MUST download `Half.step` from the repository-owned `snap-half.step` asset
- **AND** no incremental STEP export request MAY be sent

#### Scenario: Quarter uses the fixed STEP asset while retaining its warning

- **WHEN** the user selects Quarter and clicks `下載 STEP`
- **THEN** the browser MUST download `Quarter.step` from the repository-owned `snap-quarter.step` asset
- **AND** no incremental STEP export request MAY be sent
- **AND** the warning `格型測試中 不保證可使用` MUST remain visible

#### Scenario: Half and Quarter do not expose offset adjustment

- **WHEN** the user selects Half or Quarter
- **THEN** the shared X/Y offset control MUST be disabled and show zero
- **AND** the locating-hole and remover-hole controls MUST be disabled and show that they are invalid
- **AND** selecting Full MUST re-enable the offset control

#### Scenario: Production build hides the fixed STEP download action

- **WHEN** a production build renders the Snap workspace with `footprint=half` or `footprint=quarter`
- **THEN** the `下載 STEP` action MUST NOT be rendered
- **AND** the Half/Quarter preview MUST still load and display the corresponding fixed STEP asset
- **AND** the offset and optional-hole controls MUST still be disabled with their explanations visible

### Requirement: OpenGrid Snap workspace controls

The `/cad/opengrid-snap` workspace MUST expose the existing `Full`,
`Half`, and `Quarter` footprint choices together with the existing Full/Lite
variant and Standard/Directional profile controls. The normalized snapshot MUST
use `footprint=full|half|quarter` and MUST NOT expose `halfCellX`,
`halfCellY`, `allowHalfCell`, or direction-specific/diagonal controls. Full
MUST retain the shared X/Y offset and optional-hole controls. Half and Quarter
MUST disable those controls, reset them to inactive values, and use their
repository-owned fixed STEP assets.

#### Scenario: Configure a full Snap footprint

- **WHEN** a user selects Full, chooses a supported variant/profile, sets a valid offset, and settles the input
- **THEN** the pending typed snapshot MUST contain `footprint=full`
- **AND** the panel MUST keep the existing offset and optional-hole controls
- **AND** the workspace MUST use the normal generated Snap lifecycle

#### Scenario: Configure a fixed half or quarter footprint

- **WHEN** a user selects Half or Quarter
- **THEN** the pending typed snapshot MUST contain `footprint=half` or `footprint=quarter`
- **AND** the panel MUST disable the shared offset and optional-hole controls and show their inactive values
- **AND** the panel MUST explain that the fixed footprint asset is used

#### Scenario: Invalid Snap control

- **WHEN** a Snap snapshot contains an invalid footprint, forbidden half-cell direction field, non-finite offset, or unsupported optional-hole shape
- **THEN** the corresponding field MUST show a diagnosable validation error
- **AND** the workspace MUST send `model.invalidate` rather than `model.generate`
- **AND** STEP/STL export MUST remain disabled for the invalid or stale generation

### Requirement: OpenGrid Snap workspace lifecycle and preview

The Snap workspace MUST use the existing debounce, latest-wins, candidate
commit/discard, stale-preview, Worker recovery, fixed-asset, and route-locking
behavior. A committed Full preview MUST display the complete generated Snap
assembly and derived dimensions from the committed bounds. A committed Half or
Quarter preview MUST display the corresponding repository-owned fixed STEP asset
and MUST remain subject to the existing footprint warning and export rules.

#### Scenario: Initial Snap generation

- **WHEN** `/cad/opengrid-snap` receives `engine.ready`
- **THEN** the main thread MUST send generation 1 with the valid saved Snap snapshot or defaults
- **AND** a Full snapshot MUST return the generated `modelId=opengrid-snap` candidate
- **AND** a Half or Quarter snapshot MUST load its fixed repository-owned asset

#### Scenario: Latest Snap input wins

- **WHEN** a newer valid or invalid Snap snapshot supersedes a running generation
- **THEN** the older candidate MUST not commit or replace the newer revision
- **AND** the existing stale, invalid, and fixed-asset export rules MUST remain in effect

#### Scenario: Snap export uses the committed or fixed revision

- **WHEN** a Full Snap model is committed or a Half/Quarter fixed asset is selected and the user requests STEP or STL
- **THEN** the export request MUST use the committed generated revision or the selected fixed asset according to the existing footprint contract
- **AND** the downloaded model MUST not be reconstructed from an unrelated viewport mesh
