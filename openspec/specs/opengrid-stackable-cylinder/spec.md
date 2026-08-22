## Purpose

This capability defines the independently validated OpenGrid stackable-cylinder component, including its typed parameters, printable circular stacking geometry, safe hole layout, lifecycle quality gates, and deterministic exports.

## Requirements

### Requirement: OpenGrid stackable-cylinder identity and parameters

The system MUST expose the independently validated
`opengrid-stackable-cylinder` component with
`modelId=opengrid-stackable-cylinder`, `buildKey=opengrid-stackable-cylinder`,
and route `/cad/opengrid-stackable-cylinder`. Its display name MUST remain
`Round Box (圓盒)`. The normalized snapshot MUST contain integer `diameter` and
`height`, boolean `thinBottomMode` and `bottomPlateMode`, enum
`bottomSeatMode`, and the existing twelve typed opening fields.
For the cylinder only, `bottomSeatMode` MUST be exactly `none`, `hole`,
`integrated`, or `center-hook`, with visible labels `無角座`, `角座孔`,
`內建角座`, and `中心卡勾` respectively. The shared Box seat contract MUST
remain limited to its existing three values. The numeric ranges, opening
semantics, profile flags, 1 mm controls, and the mutual exclusion of
`thinBottomMode` and `bottomPlateMode` MUST remain unchanged.

The default snapshot MUST remain `diameter=60`, `height=20`,
`thinBottomMode=false`, `bottomPlateMode=false`, and `bottomSeatMode='hole'`,
with zero-depth openings, bottom length 1, and angle 90. A legacy
`bottomHolesEnabled=false/true` value MUST migrate to
`bottomSeatMode='none'/'hole'`; a missing legacy value MUST migrate to
`'hole'`. A canonical enum value MUST take precedence over a stale boolean,
and unsupported enum values MUST be rejected. Existing model identity, route,
profile, opening, and height contracts MUST remain unchanged.

#### Scenario: Valid cylinder defaults

- **WHEN** the cylinder route initializes without valid persisted parameters
- **THEN** the panel MUST select `角座孔`
- **AND** the normalized snapshot MUST use `bottomSeatMode='hole'`
- **AND** the existing default shell and opening geometry MUST remain unchanged

#### Scenario: Cylinder seat radio group

- **WHEN** a user selects a locating-seat option
- **THEN** exactly one of `無角座`, `角座孔`, `內建角座`, or `中心卡勾` MUST be selected
- **AND** the Worker snapshot MUST contain the corresponding cylinder enum value
- **AND** no `bottomHolesEnabled` field MUST be sent in the canonical snapshot

#### Scenario: Legacy cylinder migration

- **WHEN** persistence contains `bottomHolesEnabled=false` or `true`
- **THEN** hydration MUST produce `bottomSeatMode='none'` or `'hole'`
- **AND** the old no-hole or stepped-hole geometry MUST be preserved
- **AND** a successful update MUST rewrite only the canonical enum field

#### Scenario: Invalid cylinder seat mode

- **WHEN** `bottomSeatMode` is missing from a canonical current snapshot or has
  an unsupported value
- **THEN** validation MUST return a field-specific error
- **AND** the invalid snapshot MUST NOT be generated, exported, or committed

### Requirement: Cylindrical shell and floor

The generated `opengrid-stackable-cylinder` MUST remain an open-top circular container with the requested outer diameter, overall requested height, and a mode-specific straight-wall thickness: 2 mm in default and bottom-plate modes, and 1.6 mm in thin-bottom mode. When both mode flags are false, its original-style central floor MUST be 5 mm above the outside bottom surface and the inner floor-to-wall transition MUST use the original 0.6 mm fillet. When `thinBottomMode=true`, its central flat floor MUST be 2 mm above the outside bottom surface and MUST connect to the original sharp internal 45-degree conical ramp; the ramp MUST preserve a 1.6 mm normal wall offset. When `bottomPlateMode=true`, it MUST retain a 3 mm central floor and the default-style vertical inner wall with the original 0.6 mm floor fillet, without an internal 45-degree ramp; it MUST retain the 2+1 mm hole-bearing floor while replacing the lower foot with a flat bottom at the clearance-reduced protrusion radius. Its outer profile MUST run directly from that flat bottom into a 45-degree transition to the nominal outer radius. In default and bottom-plate modes the straight inner wall MUST remain at radius `R - 2`; in thin-bottom mode it MUST remain at radius `R - 1.6`, where `R` is the requested outer radius. No mode may add a lower filler layer or a thickened stacking ring.

The default and thin modes MUST retain the common printable lower foot bevel and vertical landing through Z=2.6, followed by a direct 45-degree external transition whose radial and vertical span is derived from the selected mode's mating radius and nominal outer radius. The bottom-plate mode MUST remove the geometry below the former Z=2.6 cut line and begin at Z=0 with a flat clearance-reduced mating face, followed directly by its 45-degree external transition. The preview MUST remain centered on X/Y and based at Z=0.

#### Scenario: Default original-style shell

- **WHEN** a valid cylinder is generated with `thinBottomMode=false` and `bottomPlateMode=false`
- **THEN** the result MUST retain the 2 mm straight wall and 5 mm central floor contract
- **AND** the inner floor corner MUST expose the original 0.6 mm fillet
- **AND** the open cavity MUST begin above the 5 mm floor without penetrating the floor outside the requested mounting holes

#### Scenario: Thin-bottom shell

- **WHEN** a valid cylinder is generated with `thinBottomMode=true` and `bottomPlateMode=false`
- **THEN** the result MUST retain a 1.6 mm straight wall and 2 mm central flat floor contract
- **AND** the sharp 45-degree inner ramp MUST connect the flat floor to the straight inner wall
- **AND** the inner ramp MUST remain a 1.6 mm normal offset from the external 45-degree transition
- **AND** no internal fillet or bottom filler may be present

#### Scenario: Minimum valid shell in all three profiles

- **WHEN** a cylinder with diameter 20 mm and a valid height is generated in any of the three profiles
- **THEN** the selected floor, wall, and lower-profile contract MUST remain valid
- **AND** the open cavity MUST be present without unintended penetration outside the requested mounting holes

#### Scenario: Maximum valid shell in all three profiles

- **WHEN** a cylinder with diameter 300 mm and a valid height is generated in any of the three profiles
- **THEN** the result MUST retain the requested outer envelope and height
- **AND** the builder MUST NOT silently scale, clamp, or change the diameter

### Requirement: Stepped center mounting hole

When `bottomSeatMode='hole'`, every valid cylinder MUST contain the existing
center floor hole at `(0, 0)` with the profile-specific Ø5/Ø7.05 planar stepped
sections: 4+1 mm in default mode, 1+1 mm in thin-bottom mode, and 2+1 mm in
bottom-plate mode. The transition MUST remain a planar shoulder. When
`bottomSeatMode='none'`, the center and all outer bottom-hole candidates MUST
remain solid. When `bottomSeatMode='integrated'`, the center MUST instead carry
one fused solid Ø5 mm cylinder exactly 3 mm high from Z=-3 mm through Z=0;
there MUST be no stepped center hole at that position. When
`bottomSeatMode='center-hook'`, the center MUST instead carry the centered
two-stage quarter-turn hook defined by the center-hook compatibility
requirement, and MUST NOT contain a stepped hole or round integrated seat.

#### Scenario: Cylinder hole mode preserves the center socket

- **WHEN** a valid cylinder uses `bottomSeatMode='hole'`
- **THEN** the center hole MUST retain the selected profile's existing Ø5 mm
  lower and Ø7.05 mm upper sections
- **AND** its center MUST remain at X=0 and Y=0

#### Scenario: Cylinder no-seat mode is solid

- **WHEN** a valid cylinder uses `bottomSeatMode='none'`
- **THEN** the bottom MUST remain solid at the center and all outer-hole
  candidates
- **AND** no stepped-hole cylindrical faces or integrated seats may be present

#### Scenario: Cylinder integrated center seat

- **WHEN** a valid cylinder uses `bottomSeatMode='integrated'`
- **THEN** the center MUST contain a fused Ø5 mm round seat spanning Z=-3 mm to
  Z=0
- **AND** the center MUST not contain the hole-mode stepped cut
- **AND** the result MUST remain one valid solid

#### Scenario: Cylinder center hook replaces the center seat

- **WHEN** a valid cylinder uses `bottomSeatMode='center-hook'`
- **THEN** the center MUST contain exactly one fused two-stage hook with a
  3.6 × 7.6 mm rectangular head from Z=-2.9 mm through Z=-2.1 mm and a
  centered Ø3.6 mm round rotation stem from Z=-2.1 mm through Z=0
- **AND** the center MUST not contain a stepped hole or a round seat
- **AND** the result MUST remain one valid solid

### Requirement: Four outer cardinal holes from the 14 mm grid

When `bottomSeatMode='hole'`, the builder MUST retain the existing safe outer
cardinal calculation and emit only the outermost four positions
`(±14n,0)` and `(0,±14n)` when the calculated index `n` is at least one. The
profile-specific outer clearance and thin-floor/ramp rules MUST remain
unchanged. When `bottomSeatMode='none'`, no outer hole may be emitted. When
`bottomSeatMode='integrated'`, the same calculated safe positions MUST receive
fused Ø5 mm × 3 mm seats from Z=-3 mm to Z=0 instead of holes. When
`bottomSeatMode='center-hook'`, no outer hole or outer integrated seat may be
emitted. No diagonal, intermediate, or additional positions are permitted in
any mode.

#### Scenario: Hole mode uses the safe cardinal group

- **WHEN** a valid cylinder uses `bottomSeatMode='hole'` and its diameter fits
  the first safe outer layer
- **THEN** it MUST contain exactly the center hole and the four existing
  cardinal holes at the calculated 14 mm layer
- **AND** no diagonal or intermediate hole may be present

#### Scenario: No-seat mode omits all cardinal holes

- **WHEN** a valid cylinder uses `bottomSeatMode='none'`
- **THEN** it MUST contain no center or outer bottom holes
- **AND** no hole-layout failure may be raised solely because holes are absent

#### Scenario: Integrated mode mirrors the safe positions

- **WHEN** a valid cylinder uses `bottomSeatMode='integrated'`
- **THEN** every position that would be a safe outer hole in `hole` mode MUST
  contain one Ø5 mm × 3 mm outward seat
- **AND** the safe outer index and radial positions MUST be identical to hole
  mode for the same diameter and profile

#### Scenario: Center-hook mode has no outer locating group

- **WHEN** a valid cylinder uses `bottomSeatMode='center-hook'`
- **THEN** no 14 mm cardinal position may contain a bottom hole or integrated
  seat
- **AND** the only special locating geometry MUST be the centered rectangular
  hook

### Requirement: Outer-edge hole clearance

The existing outer-edge and thin-bottom ramp clearance calculation MUST apply
to the position set selected by `bottomSeatMode` for hole and integrated modes.
Hole mode MUST validate the Ø7.05 mm hole profile as before. Integrated mode
MUST validate the Ø5 mm seat radius and its fused footprint against the same
safe radial positions; its 3 mm downward extension MUST NOT alter the selected
outer index. None and center-hook modes MUST perform no outer-hole clearance
calculation and MUST not create a false failure for the solid bottom or the
center hook.

#### Scenario: Safe integrated seat placement

- **WHEN** an integrated outer position is selected
- **THEN** its Ø5 mm footprint MUST remain within the existing safe outer and,
  for thin-bottom mode, flat-floor/ramp clearances
- **AND** the seat MUST be fused without changing the cylinder diameter

#### Scenario: Unsafe layer is skipped in both active modes

- **WHEN** the next 14 mm layer would violate the applicable radial clearance
- **THEN** neither a hole nor an integrated seat may be generated at that layer
- **AND** the preceding safe layer or center-only/center-seat layout MUST remain
  unchanged

### Requirement: Same-diameter stacking interface

Every valid `opengrid-stackable-cylinder` MUST include a central bottom mating feature that enters the matching open cavity of a same-diameter cylinder in all three modes. The default and bottom-plate top cavity radii MUST remain `R - 2`, while the thin-bottom top cavity radius MUST be `R - 1.6`. The default and bottom-plate bottom protrusion or mating-face radii MUST remain `R - 2.2`, while the thin-bottom bottom protrusion radius MUST be `R - 1.8`; each selected mode MUST therefore provide a fixed 0.2 mm radial printing clearance while preserving its nominal wall thickness. Two cylinders with the same outer diameter and compatible height placement MUST seat through this interface and remain laterally guided without permanent posts or a thickened stacking ring. Compatibility between different diameters is explicitly outside this requirement.

The top outer rim MUST remain square at the nominal outer radius with no added stacking ring. The top inner rim MUST expose a 2 mm, 45-degree guide chamfer in default and bottom-plate modes, and a 1.6 mm, 45-degree guide chamfer in thin-bottom mode, to guide the corresponding mating feature. Default and thin modes MUST retain the 0.8 mm lower foot bevel and vertical landing through Z=2.6, followed by their selected-mode direct lower 45-degree transition. Bottom-plate mode MUST retain the same 0.2 mm radial mating clearance while omitting the lower foot bevel and vertical landing. The selected floor profile MUST NOT reduce the common protrusion/cavity fit.

#### Scenario: Same-diameter cylinders stack in all three profiles

- **WHEN** one generated cylinder is placed above another cylinder with the same outer diameter and both use the same bottom mode
- **THEN** the upper bottom protrusion MUST enter the lower matching cavity with a nominal 0.2 mm radial clearance
- **AND** the pair MUST remain guided by the circular protrusion/cavity interface
- **AND** the validated solids MUST not have permanent interference at the mating position

#### Scenario: Top remains a normal wall in all three profiles

- **WHEN** a valid cylinder completes generation in any of the three profiles
- **THEN** the top outer rim MUST remain square at 90 degrees
- **AND** the top inner rim MUST expose a 2 mm, 45-degree guide chamfer in default and bottom-plate modes, or a 1.6 mm, 45-degree guide chamfer in thin-bottom mode
- **AND** no thickened stacking ring may be added

#### Scenario: Different diameters are not promised

- **WHEN** two cylinders have different outer diameters
- **THEN** the system MUST NOT claim that their stacking interface is compatible
- **AND** generation of either individual cylinder in any of the three profiles MUST remain valid

### Requirement: Cylinder geometry quality and exports

The builder MUST reject any result that is empty, not a single valid solid,
outside its bounds, or invalid for its selected profile, opening, floor, wall,
stacking, clearance, or center-hook contract. In `hole` mode it MUST validate
the existing stepped hole records and compatibility fixture. In `none` mode it
MUST require zero bottom-hole records and zero integrated-seat records. In
`integrated` mode it MUST require the expected center-plus-safe-cardinal seat
records, validate their Ø5 mm diameter and 3 mm Z span from -3 to 0, and retain
the existing shell/opening/stacking checks. In `center-hook` mode it MUST
validate one centered two-stage hook, the 3.6 × 7.6 mm head, the Ø3.6 mm
round rotation stem, the short engagement envelope, positive rotation
clearance, and fusion into the cylinder. The contract bounds MUST use
min Z=-3 mm in `integrated` mode and min Z=-2.9 mm in `center-hook` mode;
max Z and XY bounds MUST remain unchanged.
Valid results MUST remain eligible for preview, STEP export, and binary STL
export.

#### Scenario: All three seat modes are exportable

- **WHEN** a valid cylinder snapshot in any of the existing three seat modes
  completes quality validation
- **THEN** the workspace MUST commit a non-empty preview revision
- **AND** the reported bounds MUST match the selected mode
- **AND** STEP and STL export MUST be enabled for that revision

#### Scenario: Invalid integrated geometry does not replace the model

- **WHEN** an integrated-seat fuse, seat dimension, bounds, shell, opening, or
  stacking quality probe fails
- **THEN** the candidate MUST be rejected with a diagnosable error
- **AND** the last valid committed revision MUST remain visible
- **AND** export MUST remain disabled for the failed snapshot

#### Scenario: All four seat modes are exportable

- **WHEN** a valid cylinder snapshot in any seat mode completes quality
  validation
- **THEN** the workspace MUST commit a non-empty preview revision
- **AND** the reported bounds MUST match the selected mode
- **AND** STEP and STL export MUST be enabled for that revision

#### Scenario: Invalid center hook does not replace the model

- **WHEN** a center-hook dimension, engagement probe, fuse, bounds, shell,
  opening, or stacking quality probe fails
- **THEN** the candidate MUST be rejected with a diagnosable error
- **AND** the last valid committed revision MUST remain visible
- **AND** export MUST remain disabled for the failed snapshot

### Requirement: Deterministic cylinder export metadata

The catalog MUST provide deterministic STEP and STL filenames generated from
typed normalized parameters. Every filename MUST include exactly one seat
suffix: `-seats-none`, `-seats-hole`, `-seats-integrated`, or
`-seats-center-hook`, in addition to the existing diameter, height, profile,
and opening fingerprint identity. The suffix MUST be present even for the
default mode. Filenames MUST NOT depend on raw input formatting and MUST
distinguish all four bottom geometries and all opening settings.

#### Scenario: Cylinder filenames distinguish seat modes

- **WHEN** four cylinders have identical diameter, height, profile, and
  opening values but use the four different seat modes
- **THEN** their STEP and STL filenames MUST be distinct
- **AND** each filename MUST contain its corresponding deterministic seat suffix

#### Scenario: Integrated cylinder export metadata

- **WHEN** an integrated-seat cylinder is exported
- **THEN** both filenames MUST contain `-seats-integrated`
- **AND** the exported geometry MUST contain the selected Ø5 mm × 3 mm seats

#### Scenario: Center-hook cylinder export metadata

- **WHEN** a center-hook cylinder is exported
- **THEN** both filenames MUST contain `-seats-center-hook`
- **AND** the exported geometry MUST include the centered two-stage hook

### Requirement: Centered quarter-turn hook compatibility

The `center-hook` cylinder mode MUST use the existing OpenGrid Snap
center-remover profile as its mating interface. The Snap lower passage is a
nominal 8 × 8 mm square and its upper passage is nominally 4 × 8 mm, with the
profile-specific step at Z=4.8 mm for Full and Z=1.9 mm for Lite. The cylinder
MUST generate one centered male hook with a nominal 8 × 4 mm rectangular head,
reduced to 3.6 × 7.6 mm by the fixed 0.2 mm per-side print clearance. The head
MUST be 0.8 mm high, from Z=-2.9 mm through Z=-2.1 mm, and MUST be joined to a
centered round Ø3.6 mm rotation stem from Z=-2.1 mm through Z=0. The stem
MUST extend 0.1 mm beyond the Full 2 mm narrow passage depth, making the total
downward span 2.9 mm rather than a long remover-style shaft. The hook MUST
enter the narrow passage in its insertion orientation, allow continuous
rotation through the passage via the round stem, place the head in the lower
square chamber for both Snap variants before rotation, and remain captured
when rotated 90 degrees around Z until returned to its insertion orientation.

#### Scenario: Center hook fits the Full Snap profile

- **WHEN** a center-hook cylinder is inserted into a Full Snap center-remover
  opening in the insertion orientation
- **THEN** the Ø3.6 mm rotation stem MUST pass through the 4 × 8 mm upper
  passage with 0.2 mm radial clearance on the narrow axis
- **AND** the rectangular head MUST clear the 2 mm narrow passage and enter
  the 8 × 8 mm lower chamber before rotation
- **AND** after a 90-degree Z rotation its 7.6 mm long side MUST be retained
  by the upper passage shoulder

#### Scenario: Center hook fits the Lite Snap profile

- **WHEN** a center-hook cylinder is inserted into a Lite Snap center-remover
  opening in the insertion orientation
- **THEN** the Ø3.6 mm rotation stem MUST pass through the 4 × 8 mm upper
  passage and the rectangular head MUST reach the 8 × 8 mm lower square
  chamber
- **AND** after a 90-degree Z rotation the head MUST remain captured by the
  same quarter-turn principle

#### Scenario: Center hook is printable and fused

- **WHEN** a valid cylinder uses `bottomSeatMode='center-hook'`
- **THEN** the hook MUST be fused to the cylinder at the Z=0 bottom face
- **AND** its 0.2 mm per-side head clearance and Ø3.6 mm stem MUST leave a
  positive printable gap against the mating passage
- **AND** the total hook span MUST remain the configured short 2.9 mm
- **AND** the complete result MUST remain one valid solid

### Requirement: Bottom-plate profile

When `bottomPlateMode=true`, the builder MUST use a 3 mm floor with the default-style vertical inner wall and original 0.6 mm floor fillet, without an internal ramp; it MUST retain the 2+1 mm stepped hole sections, default-style outer-hole layout, top guide, and same-diameter mating clearance. The bottom-plate profile MUST remove the lower foot geometry below the former Z=2.6 cut line: its outside bottom MUST be a flat circular mating face at radius `R-2.2` on Z=0, and its outer boundary MUST transition directly at 45 degrees to radius `R` before continuing as the straight wall. The bottom-plate mode MUST NOT generate the thin-mode foot bevel or vertical landing, MUST remain one valid B-Rep solid, and MUST remain stackable with another bottom-plate cylinder of the same outer diameter. `thinBottomMode` and `bottomPlateMode` MUST remain mutually exclusive.

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
- **AND** its stepped hole sections MUST remain 2+1 mm, while its outer-hole count MUST match default mode at the same diameter
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

Every enabled opening MUST remain compatible with the active default, thin, or bottom-plate floor profile. Its lowest boundary MUST NOT remove the center floor, stepped-hole bearing floor, bottom protrusion, or lower printable transition. The derived opening width MUST leave valid material between neighboring cardinal openings and MUST preserve the nominal 2 mm wall outside the cut boundaries. The opening feature MUST NOT change the existing 14 mm hole calculation, hole enable switch, or same-diameter-only stacking promise.

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

The existing `opengrid-stackable-cylinder` model MUST expose a `honeycombMode` boolean profile flag. `honeycombMode` MUST default to `false`, MUST be accepted in legacy hydration as `false` when absent, and MUST preserve the existing model ID `opengrid-stackable-cylinder`, route, diameter and height semantics, thin-bottom/bottom-plate profile semantics, bottom-hole switch, four-direction opening fields, preview lifecycle, and STEP/STL export workflow. The parameter panel MUST expose the flag as `省料模式（六角鏤空）` without replacing the existing mutually exclusive bottom-profile choices. When enabled, the profile MUST be the Hex Mesh style: complete staggered hexagonal openings MUST be separated by a continuous printable rib network; the profile MUST NOT claim to implement the separate vertical-groove Ribbed style.

#### Scenario: Legacy and default cylinder snapshots keep the solid profile

- **WHEN** a persisted or imported stackable-cylinder snapshot does not contain `honeycombMode`
- **THEN** hydration and validation MUST normalize `honeycombMode=false`
- **AND** the generated geometry and existing export identity MUST remain the same as the corresponding default, thin-bottom, or bottom-plate profile

#### Scenario: The user enables cylinder Hex Mesh mode

- **WHEN** a valid stackable-cylinder snapshot has `honeycombMode=true`
- **THEN** the panel MUST retain the existing diameter, height, bottom-hole, bottom-profile, and four-direction opening controls
- **AND** the normalized Worker snapshot MUST contain the typed boolean `honeycombMode=true`
- **AND** the model MUST retain its existing `opengrid-stackable-cylinder` identity and route
- **AND** the generated eligible panels MUST use a staggered, point-up Hex Mesh rather than isolated, widely separated hex cutouts

#### Scenario: Cylinder side faces use a continuous curved Hex Mesh

- **WHEN** a valid cylinder has `honeycombMode=true` and an eligible circumferential wall band is large enough for a complete cell
- **THEN** the curved side-wall material MUST be replaced by connected hexagonal openings separated by continuous ribs using the cylinder's existing outer envelope
- **AND** neighboring openings MUST use the configured printable rib thickness rather than the legacy 14 mm cell-center spacing
- **AND** the default 20 mm-height profile MUST show at least two staggered rows around the eligible wall band
- **AND** an unobstructed wall row MUST wrap continuously around the circumference without an artificial solid seam at the tangent-layout boundary
- **AND** the top rim, inner guide chamfer, lower foot or bottom-plate transition, outer edge frame, and all active side-opening boundary bridges MUST remain solid
- **AND** the wall lattice MUST extend to each protected vertical-band and side-opening boundary, with intersecting cells clipped at those boundaries instead of discarded wholesale
- **AND** the usable curved wall outside those protected regions MUST NOT contain avoidable broad solid bands caused only by whole-cell rejection
- **AND** every complete or clipped side opening MUST cut cleanly through the curved inner and outer wall faces across its full tangent width without leaving an uncut crescent
- **AND** the lattice MUST not change the requested diameter, height, circular bounds, or active floor datum

#### Scenario: Cylinder bottom faces use protected Hex Mesh openings

- **WHEN** a valid cylinder has `honeycombMode=true` and an eligible circular-floor region is large enough for a complete cell
- **THEN** the eligible bottom-floor material MUST contain connected hexagonal openings and ribs
- **AND** bottom-floor hexagonal openings MUST use a smaller cell size than the side-wall openings
- **AND** eligible default, bottom-plate, and thin-bottom floor openings MUST pass through the floor so the Hex Mesh is visible from both floor faces
- **AND** the floor lattice MUST extend to the protected circular frame, with intersecting boundary cells clipped at the frame instead of discarded wholesale
- **AND** the outer circular frame, central mating feature, floor/ramp or fillet transition, and peripheral lower stacking boundary MUST remain solid
- **AND** the center hole and every permitted cardinal outer hole MUST retain its existing center, diameter, stepped section depths, and enabled/disabled state
- **AND** every existing bottom hole MUST retain a continuous circular safety ring extending 2 mm beyond its maximum opening radius
- **AND** hexagonal cells intersecting a hole safety ring MUST be clipped to the ring instead of being discarded wholesale, and no opening may cut the ring
- **AND** the usable circular floor outside protected frames, transitions, and hole rings MUST NOT contain avoidable broad solid bands caused only by whole-cell rejection

#### Scenario: Existing cylinder interfaces remain unchanged in honeycomb mode

- **WHEN** a valid honeycomb cylinder is generated with bottom holes enabled or disabled and zero or more valid side openings
- **THEN** same-diameter cylinders MUST retain the existing protrusion/cavity mating clearance and lateral guide behavior
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
existing typed diameter, height, profile, and opening controls plus exactly one
visible locating-seat radio group with `無角座`, `角座孔`, `內建角座`, and
`中心卡勾`. The visible panel MUST NOT expose `bottomPlateMode` as a selectable
profile, and MUST NOT expose individual center or outer-hole toggles. The
Worker MUST validate the canonical cylinder enum and route this model ID to the
independent cylinder builder without falling through to another model.

#### Scenario: Cylinder route initializes

- **WHEN** a user opens `/cad/opengrid-stackable-cylinder`
- **THEN** the workspace MUST initialize with
  `modelId=opengrid-stackable-cylinder`
- **AND** the first valid generation MUST use valid saved parameters or the
  defaults, including `bottomSeatMode='hole'` when no seat value exists

#### Scenario: Cylinder seat controls

- **WHEN** a user views the cylinder parameter panel
- **THEN** it MUST show exactly `無角座`, `角座孔`, `內建角座`, and `中心卡勾`
  as mutually exclusive radio choices
- **AND** the existing selected profile descriptions MUST remain unchanged
- **AND** it MUST not show rectangular X/Y, box full-grid, or individual-hole
  controls

#### Scenario: Cylinder Worker dispatch is component-specific

- **WHEN** the Worker receives a cylinder generation request with a seat mode
- **THEN** it MUST validate the cylinder parameter shape and invoke the cylinder
  builder
- **AND** a mismatched or unsupported seat value MUST be rejected with a
  diagnosable validation error

### Requirement: Cylinder workspace lifecycle and export gates

The new cylinder route MUST use the existing debounce, latest-wins, candidate-ready, commit/discard, invalid-input, stale-preview, Worker recovery, preview mesh, STEP export, and STL export lifecycle. A failed or stale cylinder generation MUST NOT replace the latest committed revision or enable export.

#### Scenario: Valid cylinder update commits

- **WHEN** a valid diameter or height update settles after the existing input debounce
- **THEN** the workspace MUST request a newer cylinder generation
- **AND** only the latest valid candidate MUST be eligible for commit
- **AND** the committed bounds MUST match the typed parameters within tolerance

#### Scenario: Invalid or stale cylinder update

- **WHEN** a cylinder input is invalid or its candidate becomes stale because a newer generation exists
- **THEN** the workspace MUST invalidate or discard that snapshot according to the existing lifecycle
- **AND** the previous committed preview MAY remain visible as stale
- **AND** STEP/STL export MUST remain disabled for the invalid or stale snapshot
