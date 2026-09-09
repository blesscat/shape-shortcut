## Purpose

提供一個以 OpenGrid 28 mm 格線為尺寸基準、可固定到底座並能與相同盒體互相堆疊的開口盒模型，讓盒子不需要區分上盒與下盒也能重複使用。

## Requirements

### Requirement: Thin-shell profile

The existing `opengrid-stackable-box` model MUST expose a `thinShellMode` boolean profile flag. `thinShellMode` MUST default to `false`, MUST be mutually exclusive with `basePlateMode`, and MUST preserve the existing model ID, route, X/Y footprint contract, clear-height semantics, four-direction opening fields, corner-hole switch, full bottom-hole grid switch, preview lifecycle, and export workflow. When `thinShellMode=true`, the profile MUST be explicitly non-stackable and MUST NOT claim compatibility with the normal box-to-box sliding interface.

The thin-shell cross-section MUST use a continuous flat outside bottom at Z=0, a fixed 1.5 mm 45° chamfer around the outside bottom perimeter, a 1.6 mm straight side shell away from transitions, an R2 mm inner floor-to-wall fillet, and a 2 mm nominal flat interior floor. Its top opening MUST replace the stepped top rail with one continuous fixed 1.6 mm 45° chamfer whose outer edge is higher than its inner edge, without a horizontal rim plane. The lower inner-rim datum MUST be the inner edge of this top chamfer, and the outer high rim MUST be 1.6 mm above that datum.

#### Scenario: Generate a thin-shell box

- **WHEN** a valid snapshot has `thinShellMode=true`, `basePlateMode=false`, and zero or more valid side openings and bottom-hole settings
- **THEN** the generated result MUST be a non-empty single valid solid centered on the existing OpenGrid footprint
- **AND** its outside bottom MUST be flat at Z=0 except for the specified 1.5 mm perimeter chamfer
- **AND** its clear interior floor MUST be 2 mm above the outside bottom away from the R2 fillet and hole transitions
- **AND** its main side shell MUST measure 1.6 mm away from the intentional top and bottom transitions
- **AND** its inner floor-to-wall transition MUST be an R2 mm fillet
- **AND** its top opening MUST have the continuous outer-high/inner-low 1.6 mm chamfer, MUST NOT contain a horizontal rim plane, and MUST NOT contain the stepped top rail
- **AND** its lower stacking guide, internal grid-seam reliefs, and bottom stacking interface MUST be absent
- **AND** the result MUST remain previewable and exportable through the existing STEP and STL workflows

#### Scenario: Thin-shell height and bounds

- **WHEN** a valid thin-shell snapshot has clear internal `height=H`
- **THEN** the upper surface of the flat floor MUST be at Z=2 mm
- **AND** the lower inner-rim datum MUST be at Z=`2 mm + H`
- **AND** the outer high rim MUST be at Z=`3.6 mm + H` within geometry tolerance
- **AND** the requested clear internal height MUST remain H rather than being interpreted as the external Z bound

#### Scenario: Thin-shell profile selection and migration

- **WHEN** a legacy persisted or imported stackable-box snapshot does not contain `thinShellMode`
- **THEN** hydration and validation MUST normalize `thinShellMode=false`
- **AND** the snapshot MUST retain its existing normal or base-plate geometry and export identity
- **WHEN** both `thinShellMode` and `basePlateMode` are `true`
- **THEN** validation MUST reject the snapshot with a field-specific mode error

### Requirement: OpenGrid stackable box parameters

The system MUST expose an independently validated OpenGrid stackable-box model
with stable `modelId=opengrid-stackable-box`. Its normalized parameters MUST
include `x`, `y`, `height`, the enum `cornerSeatMode`, the boolean
`fullBottomHoleGrid`, the boolean `basePlateMode`, the boolean `thinShellMode`,
and the existing three typed opening fields for each of `+X`, `-X`, `+Y`, and
`-Y`. `cornerSeatMode` MUST be exactly one of `none`,
`detachable-corner-seat`, or `integrated`. The user-facing labels MUST be
`無角座`, `鎖定角座`, and `內建角座` respectively. `x` and `y` MUST be
multiples of 0.5 in the inclusive range 0.5–10 grids, the derived footprint
MUST remain within the current 500 mm workspace limit, the OpenGrid pitch MUST
remain 28 mm, and the generated footprint MUST retain the total 0.15 mm
per-axis clearance.

The `height` control MUST remain a safe integer in the inclusive range 10–500
mm and MUST represent clear internal box height. Existing normal, base-plate,
and thin-shell height semantics MUST remain unchanged. The default snapshot
MUST be `x=2`, `y=2`, `height=20`,
`cornerSeatMode='detachable-corner-seat'`, `fullBottomHoleGrid=false`,
`basePlateMode=false`, and `thinShellMode=false`. `basePlateMode` and
`thinShellMode` MUST NOT both be true.

The four opening triples MUST retain their current names, ranges, defaults, and
geometry semantics. The stackable-box panel MUST expose the existing
thin-shell and stackable profile choices and MUST additionally expose exactly
one visible radio group for the locating seat with the three labels above. The
normalized `basePlateMode` field MUST remain available for legacy or
programmatic snapshots, but MUST NOT become a visible profile choice.

When a legacy snapshot contains `cornerBottomHoles`, hydration MUST map
`false` to `cornerSeatMode='none'` and `true` to
`cornerSeatMode='detachable-corner-seat'`; missing legacy values MUST map to
`'detachable-corner-seat'`. A persisted `cornerSeatMode='hole'` MUST be
accepted only as a legacy alias and normalized to
`'detachable-corner-seat'`. A canonical current enum value MUST take
precedence over a stale legacy boolean, and canonical validation MUST reject
unsupported values after legacy alias migration.

#### Scenario: Valid seat mode defaults

- **WHEN** the stackable-box route initializes without valid saved parameters
- **THEN** the model MUST use
  `cornerSeatMode='detachable-corner-seat'`
- **AND** the panel MUST select `鎖定角座`
- **AND** the existing OpenGrid footprint, height, profile, and opening defaults
  MUST remain unchanged

#### Scenario: Seat mode selection is mutually exclusive

- **WHEN** a user selects one locating-seat radio option
- **THEN** exactly one of `無角座`, `鎖定角座`, or `內建角座` MUST be selected
- **AND** the normalized snapshot MUST contain the corresponding enum value
- **AND** no `cornerBottomHoles` field MUST be sent in the canonical Worker
  snapshot

#### Scenario: Legacy corner-hole migration

- **WHEN** a persisted snapshot contains `cornerBottomHoles=false` or `true`,
  or contains the old canonical value `cornerSeatMode='hole'`
- **THEN** hydration MUST produce `cornerSeatMode='none'` for `false` and
  `cornerSeatMode='detachable-corner-seat'` for `true` or the old enum value
- **AND** the resulting geometry MUST use the new locking-seat interface for
  the migrated active mode
- **AND** persistence MUST converge to the canonical enum field after a valid
  update

#### Scenario: Invalid seat mode is rejected

- **WHEN** `cornerSeatMode` is missing from a canonical current snapshot or has
  any value other than `none`, `detachable-corner-seat`, or `integrated` after
  legacy migration
- **THEN** validation MUST return a field-specific error
- **AND** the invalid snapshot MUST NOT replace the last valid revision

#### Scenario: Existing box geometry parameters remain valid

- **WHEN** a valid snapshot changes X/Y, height, profile, full-grid, or any
  opening value without changing the model identity
- **THEN** the existing footprint, clear-height, profile, opening, preview, and
  export contracts MUST continue to apply

### Requirement: Identical box-to-box stacking interface

Normal-mode generated boxes MUST have the same box-to-box interface and MUST be usable as either the lower or upper box without an upper/lower variant or mode switch. The normal stacking guide MUST use the reference-style independent stepped top rail fused into the nominal 1.2 mm side wall and continuous box rim, with the reference 3.75 mm external corner radius and compact 0.8 mm inner rail corner radius. The top rail MUST remain within the derived external envelope and MUST use the fixed reference sequence of a 1.75 mm 45° inner lead-in, 1.2 mm vertical sliding-block segment, 0.8 mm 45° transition, 1.8 mm vertical segment, and 2.0 mm 45° return to the side wall. It MUST mate with the fixed complementary bottom guide profile based on a 0.8 mm bed-facing foot chamfer, a 1.8 mm vertical support segment, and a 1.2 mm 45° guide transition. Each internal cell-seam relief MUST continue the fixed 45° transition to a single central apex and MUST NOT leave a horizontal closure land at the 3.8 mm floor datum. The bottom guide MUST follow the reference cell-boundary and internal-seam relief pattern rather than a separate suspended perimeter plate or an isolated hole-only interface. The top rail and bottom guide MUST provide complementary guide faces, a positive bearing land, and a dedicated sliding clearance of 0.25 mm. The bottom stacking surface MUST NOT rely on permanently protruding positioning posts, a thin unsupported perimeter lip, or a continuous recessed groove around the outer perimeter. Every internal relief MUST end at the lower surface of the supported floor and MUST leave the normal box interior floor continuous. A valid enabled side opening in normal mode MAY interrupt only the selected straight wall span from its sill to the external top-edge datum, including the corresponding selected top-rail span; it MUST NOT remove a corner guide land, bottom guide, supported floor, or any unselected rail/interface span.

Base-plate and thin-shell modes MUST be treated as non-stackable profiles. They MUST NOT claim the normal same-model sliding interface. Base-plate mode retains its existing upper stepped rail as already specified, while thin-shell mode removes the stepped rail and uses its separate continuous 1.6 mm chamfered rim without a horizontal rim plane.

#### Scenario: Same model stacks with itself in normal mode

- **WHEN** one normal-mode generated box is placed above another normal-mode generated box with compatible footprints
- **THEN** the upper box's internal-seam relief MUST remain aligned with the lower box's integrated guide geometry
- **AND** the two boxes MUST remain laterally guided without requiring different model types
- **AND** the upper box MUST mate with the lower box's fused stepped top rail through the fixed bottom guide profile without stacking posts
- **AND** any enabled side opening MUST leave the corner and bottom guide interfaces valid for the same-model mating contract

#### Scenario: Printable integrated guide interface

- **WHEN** a normal-mode stackable-box guide interface is generated
- **THEN** the stepped top rail MUST remain continuously fused to the 1.2 mm side wall and rim, with its 1.75 / 1.2 / 0.8 / 1.8 / 2.0 mm reference sequence preserved and the outer stacking datum preserved
- **AND** the fixed bottom assembly MUST measure 5.0 mm from the bed-facing plane to the upper interior floor
- **AND** the bottom guide MUST use a 0.8 mm bed-facing 45° foot, a 1.8 mm vertical segment, and a 1.2 mm 45° transition that continues to a pointed internal-seam closure without a horizontal land at the 3.8 mm datum
- **AND** the guide and internal-seam relief MUST stop at the lower surface of the supported floor without cutting into the box interior or leaving an unconnected overhanging lip
- **AND** the lower floor surface above each relief MUST remain supported and continuous through the fixed 1.2 mm interior floor
- **AND** the mating clearance MUST be independent of the 0.15 mm OpenGrid footprint clearance
- **AND** an enabled side opening MUST preserve the same guide sequence and all required corner bridges outside its selected wall span

#### Scenario: Smaller box slides on a longer box

- **WHEN** a single normal-mode 1×1 box is placed on a normal-mode 1×4 box
- **THEN** the 1×1 box MUST be able to slide continuously along the 1×4 long axis while remaining captured by the guide geometry
- **AND** the interface MUST NOT force the 1×1 box to stop only at isolated 28 mm holes

#### Scenario: Larger box bridges adjacent boxes

- **WHEN** two normal-mode 1×2 boxes are placed side by side to form a 2×2 footprint and a normal-mode 2×2 box is placed above them
- **THEN** the upper 2×2 box MUST be supported by the combined outer guide geometry
- **AND** the seam between the two lower boxes MUST NOT prevent the upper box from seating
- **AND** the upper 2×2 box MUST remain a valid member of the same stackable-box model

#### Scenario: Thin-shell mode does not claim stacking

- **WHEN** a thin-shell box is placed above or below another generated box
- **THEN** the system MUST NOT claim that the pair has a valid box-to-box sliding interface
- **AND** thin-shell generation MUST remain valid as an individual non-stackable shell

### Requirement: OpenGrid Snap base mounting sockets

The box MUST retain its existing fixed bottom profiles: the 5 mm normal bottom
assembly, the clipped 3 mm base-plate body, and the 2 mm thin-shell floor. For
`cornerSeatMode='none'`, it MUST generate no special corner locating geometry.
For `cornerSeatMode='detachable-corner-seat'`, it MUST form the shared female
retaining socket at every existing de-duplicated corner position. The socket
MUST use the shared 11 mm outer envelope and 1.5 mm depth, and MUST be
compatible with the separately printable shared detachable male seat. For
`cornerSeatMode='integrated'`, it MUST fuse one solid round seat at each of
those same positions; every seat MUST be Ø5 mm in diameter, exactly 3.8 mm
high, and span Z=-3.8 mm through Z=0 so that it grows outward from the
existing box bottom, with a 0.2 mm chamfer on its bottom perimeter. An
integrated seat MUST NOT be a stepped hole or a captive-flange opening.

The normal, base-plate, and thin-shell profiles MUST preserve their existing
floor and stacking geometry while the detachable socket is cut from the bottom
interface. The four nominal corner positions MUST continue to be
geometrically de-duplicated when a half-cell footprint would overlap them. The
runtime MUST derive positions from the declared OpenGrid contract and MUST
load the shared detachable references only when the locking-seat mode needs
them.

When `fullBottomHoleGrid=true`, ordinary holes MUST remain independent from the
seat mode. Ordinary-hole cutters MUST exclude every active special position in
both `detachable-corner-seat` and `integrated` modes; at a coincident position
the special socket or integrated seat MUST win. In `none` mode, the ordinary
grid MAY use every nominal grid position.

#### Scenario: No locating seat

- **WHEN** a valid box uses `cornerSeatMode='none'`
- **THEN** no special corner socket, hole, or external round seat MUST be
  generated
- **AND** the ordinary full-bottom-hole grid MUST remain available when enabled

#### Scenario: Locking corner seats

- **WHEN** a valid normal, base-plate, or thin-shell box uses
  `cornerSeatMode='detachable-corner-seat'`
- **THEN** every existing de-duplicated special corner position MUST contain
  one shared female retaining socket
- **AND** the socket MUST accept the shared detachable male seat in the
  insertion and locked poses without positive-volume collision
- **AND** the locking socket MUST not add a male seat to the container solid

#### Scenario: Existing locating holes

- **WHEN** a persisted snapshot uses the former `cornerSeatMode='hole'`
- **THEN** validation MUST normalize it to
  `cornerSeatMode='detachable-corner-seat'`
- **AND** every active special position MUST contain the shared female locking
  socket rather than the retired stepped-hole geometry

#### Scenario: Integrated locating seats

- **WHEN** a valid normal, base-plate, or thin-shell box uses
  `cornerSeatMode='integrated'`
- **THEN** each existing special corner position MUST contain one fused Ø5 mm
  seat with a total axial span from Z=-3.8 mm to Z=0
- **AND** the lowest 0.2 mm of that span MUST be the seat's bottom perimeter
  chamfer
- **AND** the generated shape MUST remain one valid solid
- **AND** the seat MUST extend below the box bottom without changing the upper
  shell, opening, or stacking interface

#### Scenario: Full grid preserves an active special position

- **WHEN** `fullBottomHoleGrid=true` and a nominal ordinary grid point matches a
  special corner position
- **THEN** the generated result MUST contain exactly one special interface at
  that point
- **AND** the ordinary-hole operation MUST NOT cut through a locking socket or
  integrated seat or replace either with a plain hole

#### Scenario: Half-cell positions remain valid

- **WHEN** a half-cell footprint would place two nominal special positions too
  close to coexist
- **THEN** the positions MUST be emitted as one valid special socket or seat
- **AND** the footprint MUST remain unchanged
### Requirement: Optional nominal OpenGrid bottom hole grid

The stackable-box model MUST expose `fullBottomHoleGrid` independently from
`cornerSeatMode`. When enabled, it MUST generate one ordinary straight
Ø5.05 mm through-hole at every centered 14 mm OpenGrid grid intersection based
on the un-cleared nominal footprint. Ordinary holes MUST pass through the
active bottom thickness and MUST NOT contain the detachable socket,
Ø7.05 mm retaining seat, flange capture, or integrated-seat geometry. Active
special positions MUST be removed from the ordinary-hole set when
`cornerSeatMode` is `detachable-corner-seat` or `integrated`; when the seat mode
is `none`, all nominal positions remain ordinary holes.

#### Scenario: Full grid with no special seat

- **WHEN** `fullBottomHoleGrid=true` and `cornerSeatMode='none'`
- **THEN** every nominal centered 14 mm position MUST contain one ordinary
  Ø5.05 mm through-hole
- **AND** no special retaining socket or integrated seat MUST be generated

#### Scenario: Full grid with locking seats

- **WHEN** `fullBottomHoleGrid=true` and
  `cornerSeatMode='detachable-corner-seat'`
- **THEN** ordinary holes MUST be present at all non-special grid positions
- **AND** special positions MUST retain their complete female locking sockets
- **AND** adjacent ordinary grid centers MUST remain 14 mm apart

#### Scenario: Full grid with locating holes

- **WHEN** `fullBottomHoleGrid=true` and the former `cornerSeatMode='hole'`
  alias is supplied
- **THEN** the alias MUST normalize to
  `cornerSeatMode='detachable-corner-seat'`
- **AND** ordinary holes MUST remain at all non-special grid positions while
  special positions retain their female locking sockets

#### Scenario: Full grid with integrated seats

- **WHEN** `fullBottomHoleGrid=true` and `cornerSeatMode='integrated'`
- **THEN** ordinary holes MUST be present at all non-special grid positions
- **AND** each special position MUST retain a solid Ø5 mm seat spanning
  Z=-3.8 mm to Z=0 with a 0.2 mm bottom chamfer
- **AND** no ordinary cutter may remove material from that seat

#### Scenario: Exterior clearance does not move the grid

- **WHEN** a full-grid box applies the existing 0.15 mm exterior clearance
- **THEN** grid centers MUST remain based on the nominal un-cleared footprint
- **AND** the 14 mm spacing and half-cell layout MUST remain unchanged
### Requirement: Full-hole geometry quality and exports

The stackable-box builder MUST validate the selected `cornerSeatMode` and
`fullBottomHoleGrid` as part of the accepted snapshot. A valid result MUST be
watertight, a single solid, previewable, and exportable in every supported
profile. In `detachable-corner-seat` mode it MUST validate every female socket
and male/female fit probe. In `none` mode it MUST contain no special locating
geometry. In `integrated` mode it MUST validate every special seat as fused
Ø5 mm geometry with a total 3.8 mm Z span from -3.8 to 0 and a 0.2 mm bottom
perimeter chamfer, while ordinary full-grid holes and all existing
shell/interface checks remain valid.

#### Scenario: Valid locking full-grid result

- **WHEN** a locking-seat full-grid snapshot completes generation
- **THEN** the candidate MUST contain the requested ordinary holes and every
  active female locking socket
- **AND** the shared detachable male seat MUST fit every socket in its
  insertion and locked poses without positive-volume collision
- **AND** it MUST be a valid single solid eligible for preview, STEP export,
  and STL export

#### Scenario: Valid integrated full-grid result

- **WHEN** an integrated-seat full-grid snapshot completes generation
- **THEN** the candidate MUST contain the requested ordinary holes and every
  active Ø5 mm seat spanning Z=-3.8 mm to Z=0
- **AND** every seat MUST retain its 0.2 mm bottom chamfer
- **AND** it MUST be a valid single solid eligible for preview, STEP export,
  and STL export

#### Scenario: Invalid seat geometry does not commit

- **WHEN** socket cutting, male/female fit, seat fusion, bounds, hole
  separation, shell integrity, or ordinary grid validation fails
- **THEN** the candidate MUST be rejected with a diagnosable model error
- **AND** the failed candidate MUST NOT replace the last valid revision
- **AND** export MUST remain disabled for that revision
### Requirement: Stackable-box geometry quality and exports

The stackable-box builder MUST continue to validate the existing normal,
base-plate, and thin-shell shell, opening, and box-to-box interface contracts.
The selected seat mode MUST be included in that validation: `none` has no
special locating geometry, `detachable-corner-seat` has shared female locking
sockets and indicators, and `integrated` has fused outward seats. For
`integrated`, the contract bounds MUST report a minimum Z of -3 mm while
preserving the existing maximum Z and XY bounds; `none` and
`detachable-corner-seat` MUST retain the existing minimum Z of 0. All
successful results MUST remain previewable and exportable.

#### Scenario: Successful box generation in each seat mode

- **WHEN** a valid normal, base-plate, or thin-shell snapshot uses any of the
  three seat modes
- **THEN** the workspace MUST commit a non-empty single solid with the
  selected shell, opening, and locating-seat geometry
- **AND** the reported bounds MUST match the selected seat mode within the
  existing tolerance
- **AND** STEP and STL export MUST be available for the committed revision

#### Scenario: Integrated seats do not change stacking semantics

- **WHEN** a normal-mode box uses `cornerSeatMode='integrated'`
- **THEN** its existing normal box-to-box guide contract MUST remain unchanged
- **AND** the new seats MUST be treated as outward mounting geometry rather
  than a replacement for the top rail or bottom guide

### Requirement: Four independently configurable box side openings

The `opengrid-stackable-box` MUST support one top-open access opening at each cardinal direction `+X`, `-X`, `+Y`, and `-Y` in normal, base-plate, and thin-shell modes. Each direction MUST use its own depth, flat-bottom length, and transition-angle values; changing one direction MUST NOT copy, rotate, or otherwise change another direction's values. An opening with depth zero MUST be omitted while the other directions remain independently generatable. The side-opening angle sliders MUST render in reverse visual direction while preserving their numeric values and geometry semantics.

The panel MUST expose one disclosure labelled `四個方向開口設定`, followed by the same four direction groups and control order as the stackable-cylinder interface: `前方`=`-Y`, `後方`=`+Y`, `左方`=`-X`, and `右方`=`+X`; each group MUST expose depth, bottom length, and angle in that order. On first display or after persisted parameters are loaded, the outer disclosure MUST be collapsed when all opening values are defaults and MUST be expanded when any opening value is non-default. Each direction group MUST be expanded when any of its three values is non-default and MUST otherwise be collapsed, including `前方`. Users MUST still be able to manually expand or collapse either disclosure without changing normalized opening values. Existing bottom-hole controls and the two visible mode controls MUST remain available, while the legacy `basePlateMode` field remains non-selectable in the panel.

#### Scenario: Four directions retain separate settings

- **WHEN** the user assigns distinct valid triples to `+X`, `-X`, `+Y`, and `-Y` in any mode
- **THEN** the generated box MUST contain four openings with the corresponding distinct profiles at those directions
- **AND** changing only the `+X` triple MUST leave the other three normalized triples and generated opening profiles unchanged

#### Scenario: One direction can remain closed

- **WHEN** exactly one direction has zero opening depth and the other directions have valid positive depths
- **THEN** the zero-depth direction MUST retain an uncut rectangular side wall
- **AND** the other directions MUST still contain their requested openings

#### Scenario: Opening controls match the cylinder interface

- **WHEN** a user opens the side-opening disclosure on the stackable-box panel
- **THEN** the visible group labels, direction mapping, field order, degree unit, and angle slider direction MUST match the stackable-cylinder opening interface
- **AND** the box panel MUST NOT expose circular-radius, radial-angle, or cylinder-specific cut controls

#### Scenario: Opening disclosures follow non-default values

- **WHEN** all four opening groups contain their default depth, bottom length, and angle values
- **THEN** the outer disclosure and all four direction groups MUST be collapsed on first display
- **WHEN** one direction contains at least one non-default opening value
- **THEN** the outer disclosure MUST be expanded and only that direction group MUST be expanded on first display
- **AND** `前方` MUST follow the same rule as `後方`, `左方`, and `右方`
- **AND** restoring the direction's values to defaults MUST collapse that direction group and the outer disclosure when no other direction is non-default

### Requirement: Rounded box-native opening profile

Each enabled opening MUST be generated as a box-native prismatic notch through the selected rectangular side wall, with a horizontal flat bottom of the requested length, fixed 2.5 mm tangent/Z transition arcs at the two sill corners and the two top transitions, and two planar straight side faces derived from the requested angle. In normal and base-plate modes, the opening MUST be open through the selected wall and stepped rail at the external top-edge datum. In thin-shell mode, the opening MUST be open through the selected wall and the continuous outer-high/inner-low 1.6 mm top chamfer at the external top-edge datum without leaving a horizontal rim plane. The profile MUST NOT use radial sectors, revolved profiles, circular-coordinate construction, or a cylinder cutter; its fixed local transition arcs are the only curved profile elements. The requested depth MUST be the vertical distance from the selected side's upper inner-rim datum to the lowest flat-bottom plane. The side-wall angle MUST be measured from the flat bottom; 90 degrees MUST produce vertical straight side segments and 45 degrees MUST produce outward-sloping straight side segments. The cutter MUST be oriented by the box's Cartesian side normal and tangent direction, not by a circular or radial coordinate system. For `+X` and `-X`, the flat-bottom length MUST run along Y; for `+Y` and `-Y`, the flat-bottom length MUST run along X. The opening MUST stop at or above the active interior-floor boundary and MUST leave solid material at both adjacent corners.

Every enabled opening MUST cut completely through the selected wall thickness from the interior face to beyond the exterior face, independently of whether the selected direction is positive or negative, without leaving a thin continuous skin.

#### Scenario: Flat bottom and side faces match the controls

- **WHEN** an enabled opening is generated with a valid depth, bottom length, and side-wall angle
- **THEN** its lowest boundary MUST be a straight flat segment with the requested length
- **AND** its lowest boundary MUST be at the requested depth below the selected upper-rim datum within project tolerance
- **AND** its two straight side boundaries MUST be planar faces with the requested angle relative to the flat bottom
- **AND** the profile MUST contain the fixed rounded transitions at the sill and external top edge
- **AND** the opening MUST be open through the selected mode's wall and top-rim profile at the external top-edge datum
- **AND** the profile MUST contain no radial or revolved transition geometry

#### Scenario: Side angle changes the derived slope

- **WHEN** two otherwise identical openings use different valid side-wall angles
- **THEN** their flat-bottom depth and length MUST remain unchanged
- **AND** their straight-side slopes and derived upper widths MUST differ according to the angle
- **AND** neither profile may use a user-visible radius control

#### Scenario: Direction maps to a rectangular wall

- **WHEN** an opening is enabled for one of `+X`, `-X`, `+Y`, or `-Y`
- **THEN** the cut MUST occur only on the corresponding box wall
- **AND** its flat-bottom span MUST follow that wall's tangent axis
- **AND** the opposite wall MUST remain uncut unless its own depth is positive

#### Scenario: Enabled openings fully penetrate every wall direction

- **WHEN** a valid opening with positive depth is generated in normal, base-plate, or thin-shell mode for any of `+X`, `-X`, `+Y`, or `-Y`
- **THEN** the opening MUST be clear from the selected wall's interior face through its exterior face and the associated top-rim profile
- **AND** no continuous membrane or thin layer of selected-wall material MAY remain inside the requested opening span
- **AND** the opposite wall, floor, corner bridges, and unselected rim spans MUST retain their existing material

### Requirement: Side-opening safety and existing box preservation

Every enabled opening MUST remain compatible with the normal, base-plate, and thin-shell floor and rim profiles. Its lowest boundary MUST NOT remove the active interior floor, fixed corner sockets, or ordinary bottom-hole bearing material. In normal mode it MUST also preserve the bottom guide and stacking interface; in thin-shell mode it MUST preserve the flat 2 mm floor, R2 inner transition, and non-stackable outer bottom. The derived opening span MUST leave valid corner bridges and MUST reject any parameter set whose neighboring opening spans overlap, merge, or reduce a required structural bridge below the geometry-safety minimum. The opening feature MUST NOT change the existing 28 mm footprint calculation, 14 mm bottom-hole grid, bottom-hole switches, or unselected top-rim spans. A zero-opening snapshot MUST remain geometrically identical to the existing accepted snapshot for its selected mode.

#### Scenario: Opening depth respects every floor mode

- **WHEN** a valid opening is generated in normal, base-plate, or thin-shell mode
- **THEN** the opening bottom MUST remain at or above the active floor boundary required by that mode
- **AND** the active floor thickness and top-rim profile MUST remain valid
- **AND** the opening MUST NOT cut into the normal bottom guide, ordinary holes, corner sockets, thin-shell R2 transition, or any unselected lower feature

#### Scenario: Neighboring openings do not merge

- **WHEN** independent opening profiles are generated on adjacent or opposite box sides
- **THEN** the builder MUST reject any parameter set whose derived spans overlap or leave an invalid corner or side bridge
- **AND** a valid parameter set MUST preserve a continuous solid between adjacent opening directions

#### Scenario: Existing holes and mode-specific interfaces remain unchanged

- **WHEN** valid side openings are added to a box with corner sockets, ordinary bottom holes, or any selected bottom mode
- **THEN** all existing bottom-hole locations and selected mode profiles MUST remain unchanged
- **AND** the normal upper rail/lower guide outside the selected opening span MUST retain its existing dimensions and mating clearance
- **AND** the thin-shell rim and flat bottom outside the selected opening span MUST retain their declared dimensions

#### Scenario: Legacy parameters normalize to no openings

- **WHEN** browser persistence or an imported parameter record contains a valid legacy box snapshot without the twelve opening fields
- **THEN** hydration MUST add depth `0`, bottom length `1`, and angle `90` for every direction
- **AND** the restored snapshot MUST generate the existing no-opening geometry for its selected mode and remain eligible for the existing export identity

### Requirement: Deterministic stackable-box export metadata

The catalog MUST provide deterministic STEP and STL filenames generated from
typed normalized parameters. In addition to the existing X/Y, height, profile,
and opening identities, every stackable-box filename MUST include exactly one
seat suffix: `-seats-none`, `-seats-detachable-corner-seat`, or
`-seats-integrated`. The suffix MUST be emitted even for the default mode so
exports with different geometry cannot overwrite one another. Filenames MUST
NOT depend on raw input formatting, and opening fingerprints MUST retain their
existing behavior.

#### Scenario: Box filenames distinguish seat geometry

- **WHEN** two valid boxes have identical dimensions, profile, and opening
  values but different seat modes
- **THEN** their STEP and STL filenames MUST differ by the deterministic seat
  suffix
- **AND** each filename MUST identify the typed normalized mode

#### Scenario: Locking box export metadata

- **WHEN** a detachable-locking-seat box is exported
- **THEN** both STEP and STL filenames MUST contain
  `-seats-detachable-corner-seat`
- **AND** the downloaded geometry MUST include the female locking sockets and
  bottom lock indicators

#### Scenario: Integrated box export metadata

- **WHEN** an integrated-seat box is exported
- **THEN** both STEP and STL filenames MUST contain `-seats-integrated`
- **AND** the downloaded geometry MUST include the outward Ø5 mm × 3.8 mm seats

### Requirement: Honeycomb material-saving box mode

The existing `opengrid-stackable-box` model MUST expose a `honeycombMode` boolean profile flag. `honeycombMode` MUST default to `false`, MUST be accepted in legacy hydration as `false` when absent, and MUST preserve the existing model ID `opengrid-stackable-box`, route, footprint, height semantics, normal/base-plate/thin-shell mode semantics, opening fields, bottom-hole fields, preview lifecycle, and STEP/STL export workflow. The parameter panel MUST expose the flag as `省料模式（六角鏤空）` without replacing the existing mutually exclusive box-mode choices. When enabled, the profile MUST be the Hex Mesh style: complete staggered hexagonal openings MUST be separated by a continuous printable rib network; the profile MUST NOT claim to implement the separate vertical-groove Ribbed style. For a valid honeycomb candidate within the supported geometry-engine budget, generation MUST complete without requiring unbounded in-flight geometry state; if the requested candidate cannot fit that budget, generation MUST fail diagnostically before committing a partial candidate.

#### Scenario: Legacy and default snapshots keep the solid profile

- **WHEN** a persisted or imported stackable-box snapshot does not contain `honeycombMode`
- **THEN** hydration and validation MUST normalize `honeycombMode=false`
- **AND** the generated geometry and existing export identity MUST remain the same as the corresponding normal, base-plate, or thin-shell profile

#### Scenario: The user enables Hex Mesh mode

- **WHEN** a valid stackable-box snapshot has `honeycombMode=true`
- **THEN** the panel MUST retain the existing X/Y, height, bottom-hole, mode, and four-direction opening controls
- **AND** the normalized Worker snapshot MUST contain the typed boolean `honeycombMode=true`
- **AND** the model MUST retain its existing `opengrid-stackable-box` identity and route
- **AND** the generated eligible panels MUST use a staggered, point-up Hex Mesh rather than isolated, widely separated hex cutouts

#### Scenario: Box side faces use a continuous printable Hex Mesh

- **WHEN** a valid box has `honeycombMode=true` and an eligible side panel is large enough for a complete cell
- **THEN** the continuous side-wall material in that panel MUST be replaced by connected hexagonal openings separated by continuous ribs
- **AND** neighboring openings MUST use the configured printable rib thickness rather than the legacy 14 mm cell-center spacing
- **AND** the default 20 mm-height profile MUST show at least two staggered rows on each eligible side panel
- **AND** the outer perimeter frame, rounded corners, top rim or rail, lower structural transition, and all active side-opening boundary bridges MUST remain solid
- **AND** the lattice MUST extend to each protected side-panel boundary, with intersecting cells clipped at the perimeter frame and active side-opening bridge instead of discarded wholesale
- **AND** the usable side-wall area outside those protected regions MUST NOT contain avoidable broad solid bands caused only by whole-cell rejection
- **AND** the lattice MUST remain within the existing X/Y/Z envelope and MUST NOT change the requested clear internal height

#### Scenario: Box bottom faces use protected Hex Mesh openings

- **WHEN** a valid box has `honeycombMode=true` and an eligible bottom-floor region is large enough for a complete cell
- **THEN** the eligible bottom-floor material MUST contain connected hexagonal openings and ribs
- **AND** bottom-floor hexagonal openings MUST use a smaller cell size than the side-wall openings
- **AND** eligible openings in normal, base-plate, and thin-shell profiles MUST pass through the active floor so the Hex Mesh is visible from both floor faces
- **AND** the floor lattice MUST extend to the protected outer frame, with intersecting boundary cells clipped at the frame instead of discarded wholesale
- **AND** the outer bottom frame, corner structural regions, bottom guide or base-plate support, grid-seam reliefs, and active floor transitions MUST remain solid
- **AND** every existing corner socket and ordinary bottom-grid hole MUST retain its normalized center, diameter, section depth, and through/open state
- **AND** every existing bottom hole MUST retain a continuous circular safety ring extending 2 mm beyond its maximum opening radius
- **AND** hexagonal cells intersecting a hole safety ring MUST be clipped to the ring instead of being discarded wholesale, and no opening may cut the ring
- **AND** the usable floor outside protected frames, seams, transitions, and hole rings MUST NOT contain avoidable broad solid bands caused only by whole-cell rejection

#### Scenario: Existing box interfaces remain unchanged in honeycomb mode

- **WHEN** a valid honeycomb box is generated with any supported bottom-hole selection, floor mode, and zero or more valid side openings
- **THEN** all selected OpenGrid Snap mounting sockets and ordinary bottom holes MUST remain at their existing positions and profiles
- **AND** the normal-mode box-to-box sliding guide, base-plate printable base, or thin-shell non-stackable profile MUST retain its existing contract
- **AND** every enabled side opening MUST retain its requested direction, bottom, depth, angle, and neighboring structural separation
- **AND** the result MUST remain one valid non-empty solid suitable for preview, STEP export, and STL export

#### Scenario: Small box panels fall back without destructive cuts

- **WHEN** `honeycombMode=true` but a side or bottom region cannot contain a complete hexagonal cell after its edge and protected-region clearances are applied
- **THEN** that region MUST remain solid or use only complete safe cells
- **AND** generation MUST remain valid
- **AND** the builder MUST NOT enlarge, move, merge, or remove any existing hole, opening, or interface feature merely to fit a lattice cell
- **AND** thin-shell mode alone MUST NOT force a no-cell fallback when complete protected floor cells fit
- **AND** a box-floor boundary MAY use a clipped partial cell when the retained frame and safety-ring constraints remain satisfied
- **AND** a box side-panel or side-opening boundary MAY use a clipped partial cell when every retained frame and structural-bridge constraint remains satisfied

#### Scenario: Supported tall boxes complete within the geometry budget

- **WHEN** a normal stackable box has `x=7`, `y=7`, `height=60` or `height=100`, `honeycombMode=true`, and no invalid protected-feature inputs
- **THEN** generation MUST complete with a valid candidate within the fixed geometry-engine memory ceiling
- **AND** the candidate MUST remain eligible for preview and STEP/STL export
- **AND** all existing corner-seat modes MUST preserve their supported geometry and protected interfaces

#### Scenario: Honeycomb box output is distinguishable and materially lighter

- **WHEN** a valid honeycomb box with at least one eligible lattice panel is exported
- **THEN** its STEP and STL filenames MUST identify the honeycomb profile with a deterministic `honeycomb` suffix
- **AND** its B-Rep volume MUST be lower than the otherwise identical non-honeycomb profile within geometry tolerance
- **AND** the existing filename identity MUST remain unchanged when `honeycombMode=false`

### Requirement: Honeycomb box quality protection

The stackable-box quality gate MUST inspect honeycomb-mode candidates separately from solid profiles. It MUST reject a candidate that changes any protected hole profile, cuts a protected interface or opening boundary, creates an invalid or multi-solid result, exceeds the existing bounds, or fails preview/export eligibility. The quality report MUST identify whether honeycomb mode was enabled and MUST distinguish a valid no-cell fallback from a failed lattice construction. Memory-bounded construction and inspection MUST NOT weaken any protected-feature, validity, or export decision.

#### Scenario: Honeycomb quality rejects protected-feature damage

- **WHEN** a honeycomb candidate changes a socket center, ordinary bottom-hole center, hole diameter, stepped section, floor-support probe, stacking probe, or enabled side-opening boundary
- **THEN** the candidate MUST be rejected with a diagnosable honeycomb or protected-feature error
- **AND** the last valid committed model MUST remain available

#### Scenario: Honeycomb quality accepts a protected valid result

- **WHEN** a honeycomb candidate contains only safe complete cells and passes all existing box geometry, hole, opening, interface, and export checks
- **THEN** the candidate MUST be eligible for commit, preview, STEP export, and STL export

#### Scenario: Quality checks remain valid for supported tall boxes

- **WHEN** a generated 7x7 honeycomb box at height 60 or 100 is inspected in each supported corner-seat mode
- **THEN** the quality gate MUST apply the same protected-feature decisions as the corresponding existing honeycomb checks
- **AND** successful inspection MUST leave a single valid exportable solid

### Requirement: OpenGrid stackable-box workspace integration

The CAD workspace MUST bind `/cad/opengrid-stackable-box` exclusively to
`modelId=opengrid-stackable-box`. The catalog entry MUST expose the existing
OpenGrid X/Y, height, profile, opening, and full-grid controls plus exactly one
visible locating-seat radio group with `無角座`, `鎖定角座`, and `內建角座`. The
panel MUST keep the existing thin-shell/stackable profile choices, MUST NOT
expose `basePlateMode` as a selectable profile, and MUST preserve the existing
latest-wins, preview, commit, STEP, and STL lifecycle. The Worker MUST validate
the canonical enum parameter, load the shared detachable references only for
the locking mode, and route this model ID to the independent stackable-box
builder.

#### Scenario: Stackable-box route initializes

- **WHEN** a user opens `/cad/opengrid-stackable-box`
- **THEN** the workspace MUST initialize with the stable stackable-box model ID
- **AND** the first valid generation MUST use valid saved parameters or the
  model defaults, including `cornerSeatMode='detachable-corner-seat'` when no
  seat value exists

#### Scenario: Stackable-box seat controls

- **WHEN** a user views the stackable-box parameter panel
- **THEN** it MUST show exactly the three mutually exclusive seat labels
  `無角座`, `鎖定角座`, and `內建角座`
- **AND** the selected value MUST be reflected in the typed snapshot
- **AND** the existing full-bottom-hole grid control MUST remain independent

#### Scenario: Stackable-box route isolation

- **WHEN** a `model.generate` request carries
  `modelId=opengrid-stackable-box`
- **THEN** the Worker MUST validate the stackable-box parameter shape
- **AND** it MUST use the stackable-box builder boundary
- **AND** mismatched parameters or missing locking references MUST be rejected
  rather than resolved through another model

#### Scenario: Stackable-box exports retain lifecycle gates

- **WHEN** a seat-mode candidate is valid and committed
- **THEN** STEP and STL export MUST use the selected seat-mode metadata
- **AND** exports MUST remain disabled while the current snapshot is invalid,
  stale, generating, or failed geometry validation

### Requirement: Memory-bounded box inspection preserves measurement decisions

Inspection of `opengrid-stackable-box` honeycomb candidates MUST avoid a number of full-candidate intersection operations that grows with individual measurement probes. Where regional measurement is used, it MUST cover each protected probe envelope and produce equivalent quality reports and detachable-seat records to full-shape measurement within existing numeric tolerances. The established large-candidate structural path and all existing geometry protections MUST remain intact.

#### Scenario: Regional and full measurements agree
- **WHEN** an inspectable small solid or honeycomb box is measured with full-shape and regional measurements
- **THEN** corresponding quality reports MUST agree within existing numeric tolerances
- **AND** detachable-seat residual, collision and roof measurements MUST agree for the honeycomb seat fixture

#### Scenario: Probe containment and bounded inspection
- **WHEN** regional quality inspection runs on a honeycomb box
- **THEN** the measurement regions MUST contain their protected probe windows
- **AND** full-candidate intersection count MUST remain bounded independently of the number of per-feature measurement probes
- **AND** larger candidates MUST retain their established structural validation path
