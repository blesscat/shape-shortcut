## Purpose

This capability defines the independently validated OpenGrid stackable-cylinder component, including its typed parameters, printable circular stacking geometry, safe hole layout, lifecycle quality gates, and deterministic exports.

## Requirements

### Requirement: OpenGrid stackable-cylinder identity and parameters

The system MUST expose the independently validated
`opengrid-stackable-cylinder` component with
`modelId=opengrid-stackable-cylinder`, `buildKey=opengrid-stackable-cylinder`,
and route `/cad/opengrid-stackable-cylinder`. Its display name MUST remain
`Round Box (圓盒)`. The normalized snapshot MUST contain integer
`innerDiameter` and `height`, boolean `thinBottomMode` and `bottomPlateMode`,
enum `bottomSeatMode`, and the existing twelve typed opening fields.
`innerDiameter` MUST be an integer between 20 and 300 and MUST carry
inner-cavity semantics: the derived outer diameter MUST equal
`innerDiameter + 2 × wallThickness` for the selected profile, where the
profile wall thickness is 2.0 mm in default and bottom-plate modes and
1.6 mm in thin-bottom mode. `bottomSeatMode` MUST be exactly `none`,
`detachable-corner-seat`, or `integrated`, with visible labels `無角座`,
`鎖定角座`, and `內建角座` respectively. The height and opening numeric
ranges, opening semantics, profile flags, 1 mm controls, and the mutual
exclusion of `thinBottomMode` and `bottomPlateMode` MUST remain unchanged.

The default snapshot MUST be `innerDiameter=56`, `height=20`,
`thinBottomMode=false`, `bottomPlateMode=false`, and
`bottomSeatMode='detachable-corner-seat'`, so the shipped default box keeps
its previous 60 mm outer diameter, with zero-depth openings, bottom length 1,
and angle 90. A legacy `bottomHolesEnabled=false/true` value MUST migrate to
`bottomSeatMode='none'/'detachable-corner-seat'`; a missing legacy value MUST
migrate to `'detachable-corner-seat'`. A legacy outer-semantics `diameter`
value without `innerDiameter` MUST migrate to
`innerDiameter = round(diameter − 2 × wallThicknessOf(selected profile))`,
where the subtracted thickness is 4.0 mm in default and bottom-plate modes
and 3.2 mm in thin-bottom mode. A canonical `innerDiameter` MUST take
precedence over a stale legacy `diameter`, and a canonical enum value MUST
take precedence over a stale boolean. Unsupported enum values MUST be
rejected. Existing model identity, route, profile, opening, and height
contracts MUST remain unchanged.

#### Scenario: Valid cylinder defaults

- **WHEN** the cylinder route initializes without valid persisted parameters
- **THEN** the panel MUST select `鎖定角座`
- **AND** the normalized snapshot MUST use
  `bottomSeatMode='detachable-corner-seat'`
- **AND** the existing default shell and opening geometry MUST remain
  unchanged with `innerDiameter=56`

#### Scenario: Cylinder seat radio group

- **WHEN** a user selects a locating-seat option
- **THEN** exactly one of `無角座`, `鎖定角座`, or `內建角座` MUST be selected
- **AND** the Worker snapshot MUST contain the corresponding enum value
- **AND** no `bottomHolesEnabled` field MUST be sent in the canonical snapshot

#### Scenario: Legacy cylinder migration

- **WHEN** persistence contains `bottomHolesEnabled=false` or `true`
- **THEN** hydration MUST produce `bottomSeatMode='none'` or
  `'detachable-corner-seat'`
- **AND** the old no-hole or stepped-hole geometry MUST be preserved through
  the corresponding compatibility mode
- **AND** a successful update MUST rewrite only the canonical enum field

#### Scenario: Legacy hole mode migration

- **WHEN** persistence contains the former canonical value
  `bottomSeatMode='hole'`
- **THEN** hydration MUST normalize it to
  `bottomSeatMode='detachable-corner-seat'`
- **AND** a generated cylinder MUST use the locking socket geometry rather
  than the retired stepped-hole geometry

#### Scenario: Legacy outer-diameter migration

- **WHEN** persistence contains an old outer-semantics `diameter` value and
  no `innerDiameter`
- **THEN** hydration MUST produce `innerDiameter = diameter − 4` in default
  and bottom-plate modes and `innerDiameter = round(diameter − 3.2)` in
  thin-bottom mode
- **AND** default and bottom-plate geometry MUST be preserved exactly through
  the migration
- **AND** thin-bottom geometry MUST shift the derived outer envelope by
  exactly +0.2 mm relative to the persisted outer value
- **AND** a migrated value outside the 20–300 range MUST be rejected with a
  field-specific validation error instead of being clamped
- **AND** a snapshot that also contains a canonical `innerDiameter` MUST use
  the canonical value and ignore the stale legacy field

#### Scenario: Invalid cylinder seat mode

- **WHEN** `bottomSeatMode` is missing from a canonical current snapshot or
  has an unsupported value
- **THEN** validation MUST return a field-specific error
- **AND** the invalid snapshot MUST NOT be generated, exported, or committed

### Requirement: Cylindrical shell and floor

The generated `opengrid-stackable-cylinder` MUST remain an open-top circular
container whose straight inner wall radius equals the requested inner radius
`r = innerDiameter / 2`, with the requested overall height and a
mode-specific straight-wall thickness: 2 mm in default and bottom-plate
modes, and 1.6 mm in thin-bottom mode. The derived nominal outer radius MUST
be `R = r + wallThickness` for the selected mode. When both mode flags are
false, its original-style central floor MUST be 5 mm above the outside bottom
surface and the inner floor-to-wall transition MUST use the original 0.6 mm
fillet. When `thinBottomMode=true`, its central flat floor MUST be 2 mm above
the outside bottom surface and MUST connect to the original sharp internal
45-degree conical ramp; the ramp MUST preserve a 1.6 mm normal wall offset.
When `bottomPlateMode=true`, it MUST retain a 3 mm central floor and the
default-style vertical inner wall with the original 0.6 mm floor fillet,
without an internal 45-degree ramp; it MUST retain the 2+1 mm hole-bearing
floor while replacing the lower foot with a flat bottom at the
clearance-reduced protrusion radius. Its outer profile MUST run directly from
that flat bottom into a 45-degree transition to the nominal outer radius `R`.
In default and bottom-plate modes the straight inner wall MUST remain at
radius `R − 2`; in thin-bottom mode it MUST remain at radius `R − 1.6`; in
every mode this straight inner wall radius MUST equal the requested inner
radius `r`. No mode may add a lower filler layer or a thickened stacking
ring.

The default and thin modes MUST retain the common printable lower foot bevel
and vertical landing through Z=2.6, followed by a direct 45-degree external
transition whose radial and vertical span is derived from the selected mode's
mating radius and nominal outer radius. The bottom-plate mode MUST remove the
geometry below the former Z=2.6 cut line and begin at Z=0 with a flat
clearance-reduced mating face, followed directly by its 45-degree external
transition. The preview MUST remain centered on X/Y and based at Z=0.

#### Scenario: Default original-style shell

- **WHEN** a valid cylinder is generated with `thinBottomMode=false` and
  `bottomPlateMode=false`
- **THEN** the result MUST retain the 2 mm straight wall and 5 mm central
  floor contract
- **AND** the inner wall radius MUST equal `innerDiameter / 2`
- **AND** the inner floor corner MUST expose the original 0.6 mm fillet
- **AND** the open cavity MUST begin above the 5 mm floor without
  penetrating the floor outside the requested mounting holes

#### Scenario: Thin-bottom shell

- **WHEN** a valid cylinder is generated with `thinBottomMode=true` and
  `bottomPlateMode=false`
- **THEN** the result MUST retain a 1.6 mm straight wall and 2 mm central
  flat floor contract
- **AND** the sharp 45-degree inner ramp MUST connect the flat floor to the
  straight inner wall
- **AND** the inner ramp MUST remain a 1.6 mm normal offset from the external
  45-degree transition
- **AND** no internal fillet or bottom filler may be present

#### Scenario: Minimum valid shell in all three profiles

- **WHEN** a cylinder with inner diameter 20 mm and a valid height is
  generated in any of the three profiles
- **THEN** the selected floor, wall, and lower-profile contract MUST remain
  valid
- **AND** the open cavity MUST be present without unintended penetration
  outside the requested mounting holes

#### Scenario: Maximum valid shell in all three profiles

- **WHEN** a cylinder with inner diameter 300 mm and a valid height is
  generated in any of the three profiles
- **THEN** the result MUST retain the derived outer envelope of 304 mm in
  default and bottom-plate modes and 303.2 mm in thin-bottom mode, together
  with the requested height
- **AND** the builder MUST NOT silently scale, clamp, or change the inner
  diameter

### Requirement: Stepped center mounting hole

When `bottomSeatMode='detachable-corner-seat'`, every valid cylinder MUST
contain the shared female detachable corner-seat socket at `(0, 0)` with its
tested retaining geometry. The socket MUST respect the profile-specific floor
thickness and remain compatible with the separately printed `opengrid-pillar`
male reference. When `bottomSeatMode='none'`, the center and all outer
bottom-seat candidates MUST remain solid. When `bottomSeatMode='integrated'`,
the center MUST instead carry one fused solid Ø5 mm cylinder with a total
outward span of exactly 3.8 mm from Z=-3.8 mm through Z=0 and a 0.2 mm bottom
perimeter chamfer; there MUST be no detachable socket or stepped center hole at
that position.

#### Scenario: Cylinder locking center seat

- **WHEN** a valid cylinder uses `bottomSeatMode='detachable-corner-seat'`
- **THEN** the center MUST contain one female locking socket at X=0 and Y=0
- **AND** the socket MUST include its retaining cavity without penetrating the
  protected shell or floor geometry
- **AND** the socket MUST pass the shared male/female fit probe

#### Scenario: Cylinder hole mode preserves the center socket

- **WHEN** a persisted cylinder uses the former `bottomSeatMode='hole'` alias
- **THEN** validation MUST normalize it to
  `bottomSeatMode='detachable-corner-seat'`
- **AND** the center MUST contain the shared female locking socket rather than
  the retired stepped-hole sections

#### Scenario: Cylinder no-seat mode is solid

- **WHEN** a valid cylinder uses `bottomSeatMode='none'`
- **THEN** the bottom MUST remain solid at the center and all outer-seat
  candidates
- **AND** no stepped-hole cylindrical faces, detachable sockets, or integrated
  seats may be present

#### Scenario: Cylinder integrated center seat

- **WHEN** a valid cylinder uses `bottomSeatMode='integrated'`
- **THEN** the center MUST contain a fused Ø5 mm round seat spanning Z=-3.8 mm
  to Z=0
- **AND** the lowest 0.2 mm of the seat MUST be its bottom perimeter chamfer
- **AND** the center MUST not contain the hole-mode stepped cut
- **AND** the result MUST remain one valid solid
### Requirement: Four outer cardinal holes from the 14 mm grid

When `bottomSeatMode='detachable-corner-seat'`, the builder MUST retain the
existing safe outer cardinal calculation and emit only the outermost four
positions `(±14n,0)` and `(0,±14n)` when the calculated index `n` is at least
one. Each selected position MUST receive one shared female detachable socket
and its lock indicator. The profile-specific outer clearance and
thin-floor/ramp rules MUST remain unchanged. When `bottomSeatMode='none'`, no
outer seat may be emitted. When `bottomSeatMode='integrated'`, the same
calculated safe positions MUST receive fused Ø5 mm × 3.8 mm seats from Z=-3.8 mm
to Z=0 instead of locking sockets, with a 0.2 mm bottom perimeter chamfer. No
diagonal, intermediate, or additional positions are permitted in any mode.

#### Scenario: Locking mode uses the safe cardinal group

- **WHEN** a valid cylinder uses `bottomSeatMode='detachable-corner-seat'`
  and its diameter fits the first safe outer layer
- **THEN** it MUST contain exactly the center socket and the four existing
  cardinal sockets at the calculated 14 mm layer
- **AND** every socket MUST have one corresponding lock indicator
- **AND** no diagonal or intermediate socket may be present

#### Scenario: Hole mode uses the safe cardinal group

- **WHEN** a persisted cylinder uses the former `bottomSeatMode='hole'` alias
  and its diameter fits the first safe outer layer
- **THEN** the alias MUST normalize to
  `bottomSeatMode='detachable-corner-seat'`
- **AND** the center and four safe cardinal positions MUST receive the shared
  female sockets and corresponding indicators

#### Scenario: No-seat mode omits all cardinal seats

- **WHEN** a valid cylinder uses `bottomSeatMode='none'`
- **THEN** it MUST contain no center or outer bottom seats
- **AND** no hole-layout failure may be raised solely because seats are absent

#### Scenario: No-seat mode omits all cardinal holes

- **WHEN** a valid cylinder uses `bottomSeatMode='none'`
- **THEN** it MUST contain no center or outer bottom seat, hole, socket, or
  indicator
- **AND** no hole-layout failure may be raised solely because seats are absent

#### Scenario: Integrated mode mirrors the safe positions

- **WHEN** a valid cylinder uses `bottomSeatMode='integrated'`
- **THEN** every position that would be a safe outer seat in locking mode MUST
  contain one Ø5 mm × 3.8 mm outward seat spanning Z=-3.8 mm to Z=0
- **AND** every seat MUST have a 0.2 mm bottom perimeter chamfer
- **AND** the safe outer index and radial positions MUST be identical to
  locking mode for the same diameter and profile

### Requirement: Outer-edge hole clearance

The existing outer-edge and thin-bottom ramp clearance calculation MUST apply
to the position set selected by `bottomSeatMode`. Locking mode MUST validate the
full female socket and lock-indicator envelope at each selected position.
Integrated mode MUST validate the Ø5 mm seat radius and its fused footprint
against the same safe radial positions; its 3.8 mm downward extension and 0.2 mm
bottom chamfer MUST NOT alter the selected outer index. None mode MUST perform no
seat-clearance
calculation and MUST not create a false failure for the solid bottom.

#### Scenario: Safe locking socket placement

- **WHEN** a locking outer position is selected
- **THEN** the female socket and its indicator MUST remain within the existing
  safe outer and, for thin-bottom mode, flat-floor/ramp clearances
- **AND** the socket MUST be cut without changing the cylinder diameter

#### Scenario: Safe integrated seat placement

- **WHEN** an integrated outer position is selected
- **THEN** its Ø5 mm footprint MUST remain within the existing safe outer and,
  for thin-bottom mode, flat-floor/ramp clearances
- **AND** the seat MUST be fused without changing the cylinder diameter

#### Scenario: Unsafe layer is skipped in both active modes

- **WHEN** the next 14 mm layer would violate the applicable radial clearance
- **THEN** neither a locking socket nor an integrated seat may be generated at
  that layer
- **AND** the preceding safe layer or center-only/center-seat layout MUST
  remain unchanged

### Requirement: Same-diameter stacking interface

Every valid `opengrid-stackable-cylinder` MUST include a central bottom
mating feature that enters the matching open cavity of a cylinder with the
same inner diameter and the same bottom mode, in all three modes. The top
cavity radius MUST equal the requested inner radius `r` in every mode. The
default and bottom-plate bottom protrusion or mating-face radii MUST remain
`r − 0.2 mm`, and the thin-bottom bottom protrusion radius MUST remain
`r − 0.2 mm`; every selected mode MUST therefore provide a fixed 0.2 mm
radial printing clearance while preserving its nominal wall thickness. Two
cylinders with the same inner diameter, the same bottom mode, and compatible
height placement MUST seat through this interface and remain laterally
guided without permanent posts or a thickened stacking ring. Compatibility
between different inner diameters, or between cylinders using different
bottom modes, is explicitly outside this requirement.

The top outer rim MUST remain square at the derived nominal outer radius `R`
with no added stacking ring. The top inner rim MUST expose a 2 mm, 45-degree
guide chamfer in default and bottom-plate modes, and a 1.6 mm, 45-degree
guide chamfer in thin-bottom mode, to guide the corresponding mating
feature. Default and thin modes MUST retain the 0.8 mm lower foot bevel and
vertical landing through Z=2.6, followed by their selected-mode direct lower
45-degree transition. Bottom-plate mode MUST retain the same 0.2 mm radial
mating clearance while omitting the lower foot bevel and vertical landing.
The selected floor profile MUST NOT reduce the common protrusion/cavity fit.

#### Scenario: Same-diameter cylinders stack in all three profiles

- **WHEN** one generated cylinder is placed above another cylinder with the
  same inner diameter and the same bottom mode
- **THEN** the upper bottom protrusion MUST enter the lower matching cavity
  with a nominal 0.2 mm radial clearance
- **AND** the pair MUST remain guided by the circular protrusion/cavity
  interface
- **AND** the validated solids MUST not have permanent interference at the
  mating position

#### Scenario: Top remains a normal wall in all three profiles

- **WHEN** a valid cylinder completes generation in any of the three profiles
- **THEN** the top outer rim MUST remain square at 90 degrees
- **AND** the top inner rim MUST expose a 2 mm, 45-degree guide chamfer in
  default and bottom-plate modes, or a 1.6 mm, 45-degree guide chamfer in
  thin-bottom mode
- **AND** no thickened stacking ring may be added

#### Scenario: Different diameters are not promised

- **WHEN** two cylinders have different inner diameters or use different
  bottom modes
- **THEN** the system MUST NOT claim that their stacking interface is
  compatible
- **AND** generation of either individual cylinder in any of the three
  profiles MUST remain valid

### Requirement: Cylinder geometry quality and exports

The builder MUST reject any result that is empty, not a single valid solid,
outside its bounds, or invalid for its selected profile, opening, floor, wall,
stacking, and clearance contract. In locking mode it MUST validate the
expected female socket records, lock-indicator records, and male/female fit
probes at the center and every safe cardinal position. In none mode it MUST
require zero bottom-seat, socket, and indicator records. In integrated mode it
MUST require the expected center-plus-safe-cardinal seat records, validate
their Ø5 mm diameter, total 3.8 mm Z span from -3.8 to 0, and 0.2 mm bottom
chamfer, and retain the existing shell/opening/stacking checks. The contract
bounds MUST use min Z=-3.8 mm only in integrated mode; max Z and XY bounds MUST
remain unchanged. Valid results MUST remain eligible for preview, STEP export,
and binary STL export.

#### Scenario: All three seat modes are exportable

- **WHEN** a valid cylinder snapshot in any seat mode completes quality
  validation
- **THEN** the workspace MUST commit a non-empty preview revision
- **AND** the reported bounds MUST match the selected mode
- **AND** STEP and STL export MUST be enabled for that revision

#### Scenario: Locking geometry failure does not replace the model

- **WHEN** a socket cut, indicator cut, male/female fit probe, seat dimension,
  bounds, shell, opening, or stacking quality probe fails
- **THEN** the candidate MUST be rejected with a diagnosable error
- **AND** the last valid committed revision MUST remain visible
- **AND** export MUST remain disabled for the failed snapshot

#### Scenario: Invalid integrated geometry does not replace the model

- **WHEN** an integrated seat fuse, seat dimension, bounds, shell, opening, or
  stacking quality probe fails
- **THEN** the candidate MUST be rejected with a diagnosable error
- **AND** the last valid committed revision MUST remain visible
- **AND** export MUST remain disabled for the failed snapshot

### Requirement: Deterministic cylinder export metadata

The catalog MUST provide deterministic STEP and STL filenames generated from
typed normalized parameters. Every filename MUST include exactly one seat
suffix: `-seats-none`, `-seats-detachable-corner-seat`, or
`-seats-integrated`, in addition to the existing inner diameter, height,
profile, and opening fingerprint identity. The size token MUST be the inner
diameter (`d<innerDiameter>`) and MUST NOT embed the derived outer diameter.
The suffix MUST be present even for the default mode. Filenames MUST NOT
depend on raw input formatting and MUST distinguish all three bottom
geometries and all opening settings.

#### Scenario: Cylinder filenames distinguish seat modes

- **WHEN** three cylinders have identical inner diameter, height, profile,
  and opening values but use the three different seat modes
- **THEN** their STEP and STL filenames MUST be distinct
- **AND** each filename MUST contain its corresponding deterministic seat
  suffix

#### Scenario: Locking cylinder export metadata

- **WHEN** a locking-seat cylinder is exported
- **THEN** both filenames MUST contain `-seats-detachable-corner-seat`
- **AND** the exported geometry MUST contain the selected female sockets and
  lock indicators

#### Scenario: Integrated cylinder export metadata

- **WHEN** an integrated-seat cylinder is exported
- **THEN** both filenames MUST contain `-seats-integrated`
- **AND** the exported geometry MUST contain the selected Ø5 mm × 3.8 mm
  seats

### Requirement: Bottom-plate profile

When `bottomPlateMode=true`, the builder MUST use a 3 mm floor with the default-style vertical inner wall and original 0.6 mm floor fillet, without an internal ramp; it MUST retain the selected bottom-seat layout, default-style safe outer-seat positions, top guide, and same-diameter mating clearance. The bottom-plate profile MUST remove the lower foot geometry below the former Z=2.6 cut line: its outside bottom MUST be a flat circular mating face at radius `R-2.2` on Z=0, and its outer boundary MUST transition directly at 45 degrees to radius `R` before continuing as the straight wall. The bottom-plate mode MUST NOT generate the thin-mode foot bevel or vertical landing, MUST remain one valid B-Rep solid, and MUST remain stackable with another bottom-plate cylinder of the same outer diameter. `thinBottomMode` and `bottomPlateMode` MUST remain mutually exclusive.

#### Scenario: Bottom-plate removes the lower foot

- **WHEN** a valid cylinder is generated with `bottomPlateMode=true`
- **THEN** its bottom bounds MUST begin at Z=0 on a flat face at the clearance-reduced mating radius
- **AND** the lower outer boundary MUST expose a direct 45-degree transition from that flat face to the nominal outer radius
- **AND** no 0.8 mm lower foot bevel or Z=2.6 vertical landing may be present
- **AND** the 3 mm floor, 2+1 mm hole profile, top guide, and same-diameter mating clearance MUST remain valid

#### Scenario: Bottom-plate retains the default-style internal floor

- **WHEN** a valid cylinder is generated with `bottomPlateMode=true`
- **THEN** its internal central floor MUST be exactly 3 mm above the outside bottom surface
- **AND** its internal wall MUST remain vertical with the original 0.6 mm floor fillet and no internal 45-degree ramp
- **AND** its selected bottom-seat geometry and safe outer-seat count MUST
  match the default mode at the same diameter
- **AND** selecting bottom-plate mode MUST NOT change the existing thin-bottom profile when `thinBottomMode=true` is selected separately

### Requirement: Four independently configurable top-open side openings

The `opengrid-stackable-cylinder` MUST support one top-open access opening at each cardinal direction `+X`, `-X`, `+Y`, and `-Y`. Each direction MUST use its own depth, flat-bottom length, and transition-angle values; changing one direction MUST NOT copy, rotate, or otherwise change the values of another direction. An opening with depth zero MUST be omitted while the other directions remain independently generatable. The side-wall angle sliders MUST render in reverse visual direction while preserving their numeric values and geometry semantics.

#### Scenario: Four directions retain separate settings

- **WHEN** the user assigns distinct valid triples to `+X`, `-X`, `+Y`, and `-Y`
- **THEN** the generated shape MUST contain four openings with the corresponding distinct profiles at those directions
- **AND** changing only the `+X` triple MUST leave the other three normalized triples and generated opening profiles unchanged

#### Scenario: One direction can remain closed

- **WHEN** exactly one direction has zero opening depth and the other directions have valid positive depths
- **THEN** the zero-depth direction MUST retain an uncut cylindrical wall
- **AND** the other directions MUST still contain their requested openings

#### Scenario: Side-opening controls remain collapsed until requested

- **WHEN** the cylinder parameter panel is first displayed
- **THEN** the four side-opening groups MUST be contained in one collapsed disclosure labelled `四個方向開口設定`
- **AND** the groups MUST be labelled `前方`, `後方`, `左方`, and `右方`, mapped to internal `-Y`, `+Y`, `-X`, and `+X` respectively
- **AND** the `前方` group MUST be expanded by default while the other three groups MUST be collapsed by default
- **AND** the four groups' controls MUST become visible after the user expands the outer disclosure
- **AND** expanding or collapsing the disclosure MUST NOT change any normalized opening values

### Requirement: Flat-bottom U/V-shaped opening profile

Each enabled opening MUST be generated from a symmetric local U/V-shaped notch profile with a horizontal flat bottom of the requested length, fixed 2.5 mm rounded transitions at both lower corners and both upper entrances, and straight side walls between them. It MUST be an open-top U/V-shaped notch, not a circular hole. The requested depth MUST be the vertical distance from the top edge to the lowest flat-bottom plane. The side-wall angle MUST be measured from the flat bottom; 90° MUST produce vertical ㄩ-like sides and 45° MUST produce outward-sloping V-like sides. The builder MUST derive both transition endpoints and the upper opening width from the requested depth, bottom length, fixed radius, and side angle without accepting a separate radius field. The upper profile turn, when measured along the closed cutter path, MUST be `180° - θ` rather than a reflex `360° - θ`; its physical side slope MUST remain `θ`. The profile MUST be mirrored about its direction centerline and MUST open through the top wall without removing material below the active floor.

#### Scenario: Flat bottom and side arcs match the controls

- **WHEN** an enabled opening is generated with a valid depth, bottom length, and side-wall angle
- **THEN** its lowest boundary MUST be a flat segment with the requested length
- **AND** its lowest boundary MUST be at the requested depth below the top edge within the project tolerance
- **AND** its two lower and two upper side transitions MUST be matching circular arcs with a 2.5 mm radius
- **AND** its straight side boundaries MUST have the requested angle relative to the flat bottom
- **AND** the upper transitions MUST meet the horizontal top entrance without a sharp corner
- **AND** the opening MUST be open at the top edge

#### Scenario: Side angle changes the derived slope

- **WHEN** two otherwise identical openings use different valid side-wall angles
- **THEN** their flat-bottom depth and length MUST remain unchanged
- **AND** their fixed 2.5 mm transition radii MUST remain unchanged
- **AND** their upper opening widths and straight-side slopes MUST differ according to the angle
- **AND** neither profile may use a user-visible radius control

### Requirement: Side-opening safety and existing cylinder preservation

Every enabled opening MUST remain compatible with the active default, thin, or bottom-plate floor profile. Its lowest boundary MUST NOT remove the center floor, bottom-seat bearing floor, bottom protrusion, or lower printable transition. The derived opening width MUST leave valid material between neighboring cardinal openings and MUST preserve the nominal 2 mm wall outside the cut boundaries. The opening feature MUST NOT change the existing 14 mm safe-seat calculation, canonical seat mode, or same-diameter-only stacking promise.

#### Scenario: Opening depth respects the active floor mode

- **WHEN** a valid opening is generated in default, thin, or bottom-plate mode
- **THEN** the opening bottom MUST remain at or above the active floor boundary required by that mode
- **AND** the active floor thickness and internal floor fillet or bottom-plate corner MUST remain valid
- **AND** the opening MUST NOT cut into the bottom protrusion or lower external bevel

#### Scenario: Neighboring openings do not merge

- **WHEN** four independent opening profiles are generated around the same cylinder
- **THEN** the builder MUST reject any parameter set whose derived openings overlap or leave an invalid zero-width structural bridge
- **AND** a valid parameter set MUST preserve a continuous solid between adjacent opening directions

#### Scenario: Existing holes and stacking remain unchanged

- **WHEN** valid side openings are added to a cylinder with bottom holes enabled or disabled
- **THEN** the center and permitted outer hole locations and stepped profiles MUST remain unchanged
- **AND** same-diameter cylinders MUST retain the existing protrusion/cavity mating behavior
- **AND** different diameters MUST remain outside the compatibility promise

### Requirement: Honeycomb material-saving cylinder mode

The existing `opengrid-stackable-cylinder` model MUST expose a
`honeycombMode` boolean profile flag. `honeycombMode` MUST default to
`false`, MUST be accepted in legacy hydration as `false` when absent, and
MUST preserve the existing model ID `opengrid-stackable-cylinder`, route,
inner-diameter and height semantics, thin-bottom/bottom-plate profile
semantics, bottom-hole switch, four-direction opening fields, preview
lifecycle, and STEP/STL export workflow. The parameter panel MUST expose the
flag as `省料模式（六角鏤空）` without replacing the existing mutually
exclusive bottom-profile choices. When enabled, the profile MUST be the Hex
Mesh style: complete staggered, point-up regular hexagonal openings MUST be
separated by a continuous printable rib network. Every eligible curved wall
and circular-floor opening MUST use the same `3.0 mm` hexagon cell size,
where the regular-hexagon edge length and circumradius are both `3.0 mm`,
and neighboring openings MUST use a `2.5 mm` nominal rib thickness. The
derived nominal horizontal center pitch MUST be `sqrt(3) * 3.0 + 2.5` mm
(approximately `7.696 mm`) and the nominal staggered row pitch MUST be
`sqrt(3) * 7.696` / 2 mm (approximately `6.665 mm`). On a curved wall, the
unwrapped circumferential center pitch MAY be adjusted only to fit an
integer number of cells around the existing circumference; the cell size and
nominal rib contract MUST remain unchanged. The profile MUST NOT use a
separate smaller floor-cell lattice or claim to implement the separate
vertical-groove Ribbed style.

#### Scenario: Legacy and default cylinder snapshots keep the solid profile

- **WHEN** a persisted or imported stackable-cylinder snapshot does not contain `honeycombMode`
- **THEN** hydration and validation MUST normalize `honeycombMode=false`
- **AND** the generated geometry and existing export identity MUST remain the same as the corresponding default, thin-bottom, or bottom-plate profile

#### Scenario: The user enables cylinder Hex Mesh mode

- **WHEN** a valid stackable-cylinder snapshot has `honeycombMode=true`
- **THEN** the panel MUST retain the existing inner-diameter, height, bottom-hole, bottom-profile, and four-direction opening controls
- **AND** the normalized Worker snapshot MUST contain the typed boolean `honeycombMode=true`
- **AND** the model MUST retain its existing `opengrid-stackable-cylinder` identity and route
- **AND** the generated eligible panels MUST use a staggered, point-up Hex Mesh rather than isolated, widely separated hex cutouts

#### Scenario: Cylinder side faces use a continuous curved Hex Mesh

- **WHEN** a valid cylinder has `honeycombMode=true` and an eligible circumferential wall band is large enough for a complete cell
- **THEN** the curved side-wall material MUST be replaced by connected hexagonal openings separated by continuous ribs using the cylinder's existing outer envelope
- **AND** each side-wall cell MUST use the shared `3.0 mm` regular-hexagon size and neighboring cells MUST retain a `2.5 mm` nominal printable rib
- **AND** neighboring openings MUST use the configured printable rib thickness rather than the legacy 14 mm cell-center spacing
- **AND** the default 20 mm-height profile MUST show at least two staggered rows around the eligible wall band
- **AND** an unobstructed wall row MUST wrap continuously around the circumference without an artificial solid seam at the tangent-layout boundary
- **AND** the top rim, inner guide chamfer, lower foot or bottom-plate transition, outer edge frame, and all active side-opening boundary bridges MUST remain solid
- **AND** the wall lattice MUST extend to each protected vertical-band and side-opening boundary, with intersecting cells clipped at those boundaries instead of discarded wholesale
- **AND** the usable curved wall outside those protected regions MUST NOT contain avoidable broad solid bands caused only by whole-cell rejection
- **AND** every complete or clipped side opening MUST cut cleanly through the curved inner and outer wall faces across its full tangent width without leaving an uncut crescent
- **AND** the lattice MUST NOT change the requested inner diameter (or its derived outer envelope), height, circular bounds, or active floor datum

#### Scenario: Cylinder bottom faces use protected Hex Mesh openings

- **WHEN** a valid cylinder has `honeycombMode=true` and an eligible circular-floor region is large enough for a complete cell
- **THEN** the eligible bottom-floor material MUST contain connected hexagonal openings and ribs
- **AND** each bottom-floor cell MUST use the same shared `3.0 mm` regular-hexagon size as the side-wall cells
- **AND** bottom-floor neighboring openings MUST retain the same `2.5 mm` nominal printable rib thickness as side-wall openings
- **AND** eligible default, bottom-plate, and thin-bottom floor openings MUST pass through the floor so the Hex Mesh is visible from both floor faces
- **AND** the floor lattice MUST extend to the protected circular frame, with intersecting boundary cells clipped at the frame instead of discarded wholesale
- **AND** the outer circular frame, central mating feature, floor/ramp or fillet transition, and peripheral lower stacking boundary MUST remain solid
- **AND** the center hole and every permitted cardinal outer hole MUST retain its existing center, diameter, stepped section depths, and enabled/disabled state
- **AND** every existing bottom hole MUST retain a continuous circular safety ring extending 2 mm beyond its maximum opening radius
- **AND** hexagonal cells intersecting a hole safety ring MUST be clipped to the ring instead of being discarded wholesale, and no opening may cut the ring
- **AND** the usable circular floor outside protected frames, transitions, and hole rings MUST NOT contain avoidable broad solid bands caused only by whole-cell rejection

#### Scenario: Existing cylinder interfaces remain unchanged in honeycomb mode

- **WHEN** a valid honeycomb cylinder is generated with bottom holes enabled or disabled and zero or more valid side openings
- **THEN** same-inner-diameter, same-mode cylinders MUST retain the existing protrusion/cavity mating clearance and lateral guide behavior
- **AND** the selected default, thin-bottom, or bottom-plate floor and lower printable profile MUST remain valid
- **AND** every enabled side opening MUST retain its requested direction, bottom, depth, angle, and neighboring structural separation
- **AND** the result MUST remain one valid non-empty solid suitable for preview, STEP export, and STL export

#### Scenario: Small cylinder panels fall back without destructive cuts

- **WHEN** `honeycombMode=true` but a curved wall or circular-floor region cannot contain a complete hexagonal cell after its edge and protected-region clearances are applied
- **THEN** that region MUST remain solid or use only complete safe cells
- **AND** generation MUST remain valid
- **AND** the builder MUST NOT enlarge, move, merge, or remove any existing hole, opening, or stacking feature merely to fit a lattice cell
- **AND** thin-bottom mode alone MUST NOT force a no-cell fallback when complete protected floor cells fit
- **AND** a circular-floor boundary or hole safety ring MAY use a clipped partial cell when every retained frame, transition, hole, and stacking-interface constraint remains satisfied
- **AND** a curved side-wall or side-opening boundary MAY use a clipped partial cell when every retained rim, transition, and structural-bridge constraint remains satisfied

#### Scenario: Honeycomb cylinder output is distinguishable and materially lighter

- **WHEN** a valid honeycomb cylinder with at least one eligible lattice panel is exported
- **THEN** its STEP and STL filenames MUST identify the honeycomb profile with a deterministic `honeycomb` suffix
- **AND** its B-Rep volume MUST be lower than the otherwise identical non-honeycomb profile within geometry tolerance
- **AND** the existing filename identity MUST remain unchanged when `honeycombMode=false`

### Requirement: Honeycomb cylinder quality protection

The stackable-cylinder quality gate MUST inspect honeycomb-mode candidates separately from solid profiles. It MUST reject a candidate that changes any protected center or outer hole profile, cuts a protected interface or opening boundary, creates an invalid or multi-solid result, exceeds the existing bounds, or fails preview/export eligibility. The quality report MUST identify whether honeycomb mode was enabled and MUST distinguish a valid no-cell fallback from a failed lattice construction.

#### Scenario: Honeycomb quality rejects protected-feature damage

- **WHEN** a honeycomb candidate changes a bottom-hole center, stepped diameter, stepped depth, floor-support probe, same-diameter mating probe, or enabled side-opening boundary
- **THEN** the candidate MUST be rejected with a diagnosable honeycomb or protected-feature error
- **AND** the last valid committed model MUST remain available

#### Scenario: Honeycomb quality accepts a protected valid result

- **WHEN** a honeycomb candidate contains only safe complete cells and passes all existing cylinder geometry, hole, opening, interface, and export checks
- **THEN** the candidate MUST be eligible for commit, preview, STEP export, and STL export

### Requirement: OpenGrid stackable-cylinder workspace integration

The CAD workspace MUST bind `/cad/opengrid-stackable-cylinder` exclusively to
`modelId=opengrid-stackable-cylinder`. The catalog entry MUST expose the
existing typed inner-diameter, height, profile, and opening controls plus
exactly one visible locating-seat radio group with `無角座`, `鎖定角座`, and
`內建角座`. The inner-diameter control MUST display the derived outer
diameter directly beneath the input, formatted in millimetres with trailing
zeros trimmed. The visible panel MUST NOT expose `bottomPlateMode` as a
selectable profile, and MUST NOT expose individual center or outer-seat
toggles. The Worker MUST validate the canonical enum and route this model ID
to the independent cylinder builder without falling through to another
model. Locking mode MUST provide the detachable male and holder references
required by the builder and MUST reject generation when those references are
unavailable.

#### Scenario: Cylinder route initializes

- **WHEN** a user opens `/cad/opengrid-stackable-cylinder`
- **THEN** the workspace MUST initialize with
  `modelId=opengrid-stackable-cylinder`
- **AND** the first valid generation MUST use valid saved parameters or the
  defaults, including `bottomSeatMode='detachable-corner-seat'` when no seat
  value exists

#### Scenario: Cylinder seat controls

- **WHEN** a user views the cylinder parameter panel
- **THEN** it MUST show exactly `無角座`, `鎖定角座`, and `內建角座` as
  mutually exclusive radio choices
- **AND** the thin-shell and stacking profile descriptions MUST NOT state or
  imply different locating-post sizes between the two profiles
- **AND** it MUST not show rectangular X/Y, box full-grid, or
  individual-seat controls

#### Scenario: Derived outer diameter is displayed under the inner diameter

- **WHEN** the user edits the inner-diameter field or switches between the
  thin-shell and stacking modes
- **THEN** the panel MUST show the derived outer diameter
  (`innerDiameter + 2 × wallThickness`) beneath the inner-diameter input
- **AND** the displayed value MUST use the active mode's wall thickness
  (2.0 mm stacking, 1.6 mm thin-shell) with trailing zeros trimmed

#### Scenario: Cylinder Worker dispatch is component-specific

- **WHEN** the Worker receives a cylinder generation request with a seat mode
- **THEN** it MUST validate the cylinder parameter shape and invoke the
  cylinder builder
- **AND** a mismatched or unsupported seat value MUST be rejected with a
  diagnosable validation error
- **AND** a locking request MUST receive both detachable reference loaders

### Requirement: Cylinder workspace lifecycle and export gates

The cylinder route MUST use the existing debounce, latest-wins,
candidate-ready, commit/discard, invalid-input, stale-preview, Worker
recovery, preview mesh, STEP export, and STL export lifecycle. A failed or
stale cylinder generation MUST NOT replace the latest committed revision or
enable export.

#### Scenario: Valid cylinder update commits

- **WHEN** a valid inner-diameter or height update settles after the
  existing input debounce
- **THEN** the workspace MUST request a newer cylinder generation
- **AND** only the latest valid candidate MUST be eligible for commit
- **AND** the committed bounds MUST match the typed parameters within
  tolerance

#### Scenario: Invalid or stale cylinder update

- **WHEN** a cylinder input is invalid or its candidate becomes stale because
  a newer generation exists
- **THEN** the workspace MUST invalidate or discard that snapshot according
  to the existing lifecycle
- **AND** the previous committed preview MAY remain visible as stale
- **AND** STEP/STL export MUST remain disabled for the invalid or stale
  snapshot
