## Purpose

集中管理 OpenGrid 定位、一般裝配孔、階梯孔與品質 fixture 的共用尺寸，讓各 CAD 元件維持一致的 Ø5 mm 定位介面與既有的 Ø5.05／Ø7.05 mm 裝配間隙。

## Requirements

### Requirement: Shared OpenGrid locating and assembly dimensions

The system MUST expose one shared OpenGrid locating and assembly interface
contract for runtime CAD contracts and Worker quality fixtures. The contract
MUST define a nominal locating diameter of exactly 5 mm, a shared assembly
increment of exactly 0.05 mm, an assembly opening of exactly 5.05 mm, a test
shaft diameter of exactly 5 mm, a lower connection opening of exactly 5 mm, a
retaining opening of exactly 7.05 mm, a test flange diameter of exactly 7 mm,
and a test flange height of exactly 0.8 mm. The assembly opening MUST equal
the nominal locating diameter plus the shared increment. The lower connection
opening and test shaft MUST remain the current exact 5 mm interface rather
than being expanded by the assembly increment. The retaining opening MUST
equal the test flange diameter plus the shared increment.

#### Scenario: Shared dimensions are published once

- **WHEN** an OpenGrid CAD contract or Worker quality fixture reads the
  locating and assembly interface
- **THEN** it MUST receive nominalDiameter=5, assemblyIncrement=0.05,
  assemblyOpeningDiameter=5.05, testShaftDiameter=5,
  shaftOpeningDiameter=5, retainingOpeningDiameter=7.05,
  testFlangeDiameter=7, and testFlangeHeight=0.8
- **AND** no consumer MUST define a conflicting copy of these shared
  interface dimensions

#### Scenario: Nominal locating consumers remain Ø5 mm

- **WHEN** the system builds Snap locating holes, Divider locating pegs, an
  OpenGrid Pillar, or a Stackable Box nominal base-hole compatibility record
- **THEN** Snap MUST use a 2.5 mm locating-hole radius
- **AND** Divider pegDiameter, Pillar bodyDiameter, Pillar
  positioningBodyDiameter, and Stackable Box baseHoleDiameter MUST remain
  5 mm
- **AND** standard and thin-shell Pillar lengths MUST remain 9 mm and 6 mm

#### Scenario: Assembly openings use the shared increment

- **WHEN** the system builds a Stackable Box ordinary bottom-grid hole
- **THEN** the resulting opening MUST be Ø5.05 mm
- **AND** the value MUST resolve from the shared Ø5 mm nominal and +0.05 mm
  increment

#### Scenario: Stepped holes use the lower and retaining interface

- **WHEN** the system builds a Stackable Box special socket or a Stackable
  Cylinder bottom hole
- **THEN** the lower connection opening MUST be Ø5 mm
- **AND** the upper/interior retaining opening MUST be Ø7.05 mm
- **AND** each value MUST resolve from the shared lower connection or flange
  dimensions

#### Scenario: Shaft and retaining openings use the shared fixture interface

- **WHEN** the system builds a Stackable Box special socket or a Stackable
  Cylinder bottom hole
- **THEN** the Ø5 mm test shaft MUST match the Ø5 mm lower connection opening
- **AND** the Ø7 mm test flange MUST be retained by the Ø7.05 mm shoulder-side
  opening
- **AND** the ordinary Stackable Box bottom-grid hole MUST remain a straight
  Ø5.05 mm hole without this retaining section

### Requirement: Floor-thickness-dependent compatibility fixture

The system MUST define the Box and Cylinder compatibility test insert as a
Ø7 mm × 0.8 mm flange fused to a Ø5 mm shaft. The shaft length MUST equal the
active floor or base-plate thickness plus 1 mm of exterior allowance. The
fixture MUST be used for quality and integration validation and MUST NOT
become a user-configurable model parameter or alter the existing Pillar mode
geometries.

#### Scenario: Thin-shell floor fixture

- **WHEN** a Box or Cylinder quality test selects a 2 mm thin-shell floor
- **THEN** the fixture shaft MUST be Ø5 mm × 3 mm
- **AND** the flange MUST be Ø7 mm × 0.8 mm
- **AND** the Ø7 mm flange MUST be retained by the Ø7.05 mm shoulder-side
  opening

#### Scenario: Base-plate floor fixture

- **WHEN** a Box or Cylinder quality test selects a 3 mm base-plate floor
- **THEN** the fixture shaft MUST be Ø5 mm × 4 mm
- **AND** the flange MUST be Ø7 mm × 0.8 mm
- **AND** the Ø7 mm flange MUST be retained by the Ø7.05 mm shoulder-side
  opening

#### Scenario: Normal floor fixture

- **WHEN** a Box or Cylinder quality test selects a 5 mm normal floor
- **THEN** the fixture shaft MUST be Ø5 mm × 6 mm
- **AND** the flange MUST be Ø7 mm × 0.8 mm
- **AND** the fixture MUST preserve the agreed 1 mm exterior allowance

#### Scenario: Fixture preserves Pillar mode dimensions

- **WHEN** the OpenGrid Pillar model is generated
- **THEN** standard and thin-shell Pillar lengths MUST remain 9 mm and 6 mm
- **AND** Pillar bodyDiameter and positioning body MUST remain nominally Ø5 mm
- **AND** the compatibility fixture MUST remain a separate Box/Cylinder
  quality artifact

### Requirement: Socket de-duplication derives from nominal interface size

The Stackable Box socket layout MUST use the shared nominal locating diameter
of 5 mm as its socket de-duplication distance. This threshold MUST remain a
positional merge rule for coincident or overlapping nominal socket locations
and MUST NOT be treated as the assembly increment, an opening diameter, or a
general quality tolerance.

#### Scenario: Half-cell socket locations are merged

- **WHEN** two nominal socket endpoint positions are closer than 5 mm
- **THEN** the layout MUST emit one midpoint socket position
- **AND** the requested half-cell footprint MUST remain unchanged

#### Scenario: Separated socket locations remain distinct

- **WHEN** two nominal socket endpoint positions are at least 5 mm apart
- **THEN** the layout MUST NOT merge them solely because of the
  de-duplication threshold
- **AND** other flange-envelope quality checks MUST remain independently
  applicable

### Requirement: OpenGrid locating model descriptions

The system MUST ensure that the OpenGrid stackable-box and stackable-cylinder
panels and model descriptions describe the three locating-seat choices with the
exact labels `無角座`,
`角座孔`, and `內建角座`. The integrated description MUST communicate that the
selected positions receive a solid Ø5 mm round seat extending 3 mm outward
from the bottom. Existing model display names and OpenGrid identities MUST
remain unchanged.

#### Scenario: Integrated seat description is visible

- **WHEN** the user selects `內建角座` in either OpenGrid stackable model
- **THEN** the panel MUST identify the result as a Ø5 mm, 3 mm-high outward
  round seat
- **AND** the panel MUST continue to show the other two mutually exclusive
  choices

### Requirement: Shared detachable corner-seat geometry

The shared OpenGrid locating-assembly contract MUST publish one fixed male
detachable corner-seat geometry and one matching female socket-material
geometry. The male MUST have a 5 mm maximum locating diameter, a 3.8 mm locating
height, a 0.2 mm-high lead-in from Ø4.6 mm to Ø5 mm, a 1.8 mm-wide keyed
retaining head whose 45-degree taper ends at Z=5.15 mm, a 0.15 mm-high flat wear
surface, and a total height of 5.3 mm. The female socket material MUST have a
Ø7 mm by 1.75 mm outer envelope, formed by extending the canonical holder
0.25 mm inward while preserving its bottom entrance, 2 mm-wide keyed passage,
and retaining tabs. The straight key-width clearance MUST be 0.1 mm per side.

The geometry MUST remain fixed during the Organizer Box prototype phase. No
consumer MUST redefine a conflicting copy, apply the Pillar XY offset, or expose
the male/female fit as a user parameter.

#### Scenario: Shared detachable dimensions are published once

- **WHEN** the Organizer Box socket builder or Pillar detachable-seat builder
  reads the shared locating-assembly contract
- **THEN** it MUST receive male body diameter 5 mm, body height 3.8 mm, lead-in
  height 0.2 mm, lead-in tip diameter 4.6 mm, key width 1.8 mm, taper top Z
  5.15 mm, wear height 0.15 mm, and total height 5.3 mm
- **AND** it MUST receive female outer diameter 7 mm, depth 1.75 mm, passage
  width 2 mm, and key side clearance 0.1 mm
- **AND** neither consumer MUST define a conflicting local copy

#### Scenario: Male lead-in remains printable and insertable

- **WHEN** the fixed male seat is generated
- **THEN** its bottom face MUST be Ø4.6 mm
- **AND** its diameter MUST reach Ø5 mm at Z=0.2 mm
- **AND** it MUST remain Ø5 mm through the locating section ending at Z=3.8 mm

#### Scenario: Raised wear surface preserves the seating datum

- **WHEN** the fixed male seat is seated in the matching female socket
- **THEN** its locating section MUST still extend exactly 3.8 mm below the box
  bottom datum
- **AND** the raised wear surface MUST occupy Z=5.15 mm through Z=5.3 mm in the
  shared assembly coordinate system
- **AND** the added wear height MUST NOT increase the box-to-support spacing

### Requirement: Detachable corner-seat reference compatibility

The derived canonical male reference MUST be a valid non-empty single solid
with bounds `[-2.5, -2.5, 0]` through `[2.5, 2.5, 5.3]` and nominal volume
82.4112179657 mm³. The supplied female source reference MUST remain a valid
non-empty single solid with bounds `[-3.5, -3.5, 3]` through
`[3.5, 3.5, 4.5]` and nominal volume 38.4253392 mm³. Its effective holder
material MUST extend to Z=4.75 with nominal volume 43.6604635736 mm³. Bounds
and volume comparisons MAY use the project's configured B-Rep tolerance.

In the canonical unrotated seated pose, the male and female solids MUST have
zero positive-volume intersection. The fixed fit MUST be treated as a
hand-press, retained, hand-removable interface for physical prototype
validation. Other OpenGrid models MUST NOT adopt this socket until the
Organizer Box prototype has been confirmed to insert fully, remain attached
when lifted, and remain intentionally removable by hand.

#### Scenario: Canonical references remain valid

- **WHEN** the shared male and female reference geometries are imported or
  constructed for quality validation
- **THEN** each reference MUST be one valid non-empty solid
- **AND** each reference MUST match its specified bounds and nominal volume
  within B-Rep tolerance

#### Scenario: Seated references do not collide

- **WHEN** the canonical male and female shapes are evaluated in their shared
  unrotated seated coordinates
- **THEN** their positive-volume intersection MUST be zero within B-Rep
  tolerance
- **AND** the male wear surface MUST finish at the female socket's top datum

#### Scenario: Physical prototype gates wider rollout

- **WHEN** the Organizer Box is considered for physical acceptance
- **THEN** all four seats MUST be insertable fully by hand
- **AND** the seats MUST remain attached when the box is lifted
- **AND** each seat MUST remain removable by an intentional hand pull
- **AND** failure of any criterion MUST keep other OpenGrid model integrations
  outside the accepted scope

### Requirement: Detachable corner-seat visual lock indicators

The shared detachable corner-seat interface MUST define one consistent visual
indicator contract for the mating male seat and female socket. Each indicator
MUST be an exposed-bottom, shallow recessed isosceles triangle with a nominal
2 mm width, a nominal 2 mm radial length, and a 0.15 mm recess depth. The
indicator depth MUST be shared by both mating parts and MUST remain within the
requested 0.1–0.2 mm printable range.

The shared triangle's local radial direction MUST run from its flat edge toward
its apex along the local positive X axis before any socket-pose transform is
applied. Both mating indicators MUST use this same local profile datum.

Viewed from the box underside, the indicator orientation MUST communicate the
clockwise 90-degree locking motion: after the male seat has been turned
clockwise 90 degrees from its insertion orientation, the male triangle's apex
MUST point along the corresponding female indicator centerline. The female
indicator MUST follow the canonical corner direction: the upper-left and
lower-right indicators point away from their sockets, while the upper-right and
lower-left indicators point back toward their sockets. These reference-aligned
directions MUST represent the locked state.

#### Scenario: Shared indicator dimensions are published once

- **WHEN** the male-seat or female-socket generator reads the detachable
  corner-seat indicator contract
- **THEN** it MUST receive the same 2 mm by 2 mm triangular profile and 0.15 mm
  recess depth
- **AND** neither consumer MUST define a conflicting local indicator depth or
  profile

#### Scenario: Clockwise locked pose follows the reference directions

- **WHEN** a compatible male seat is placed in the canonical female socket
  insertion orientation and then turned clockwise 90 degrees around the shared
  Z axis as viewed from below
- **THEN** the male triangle MUST point along the corresponding female
  indicator centerline
- **AND** the female triangle MUST use its canonical corner direction, with
  the upper-left and lower-right markers reversed from the other two corners
- **AND** the reference-aligned triangles MUST identify the locked state
- **AND** the insertion orientation MUST remain distinguishable from the locked
  orientation

#### Scenario: Visual indicators preserve the locating fit

- **WHEN** the indicator geometry is added to the detachable interface
- **THEN** the male and female locating geometry MUST retain the existing
  nominal diameters, keyed passage, retaining tabs, and seating datum
- **AND** the indicators MUST NOT create positive-volume interference in either
  the insertion or locked pose
