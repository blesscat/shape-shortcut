## Purpose

集中管理 OpenGrid 定位、一般裝配孔、階梯孔與品質 fixture 的共用尺寸，讓共用 CAD 元件維持一致的 Ø5 mm 定位介面與既有的 Ø5.05／Ø7.05 mm 裝配間隙；獨立的 OpenGrid 定位柱則遵循自己的 Ø4.9 mm 柱身契約。

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
opening and test shaft MUST remain the current exact 5 mm interface rather than
being expanded by the assembly increment. The retaining opening MUST equal the
test flange diameter plus the shared increment. Detachable locking sockets MUST
use the separate shared detachable-corner-seat contract rather than treating
their 7 mm female envelope as a 7.05 mm stepped-hole retaining opening. The
same shared contract MUST define the integrated corner-seat diameter as exactly
5 mm, its total outward length as exactly 3.8 mm from the bottom datum at Z=0
to Z=-3.8 mm, and a bottom perimeter chamfer of exactly 0.2 mm within that
length. The independent `opengrid-pillar` body diameter is governed by its
separate pillar contract and is nominally Ø4.9 mm before its user offset.

#### Scenario: Shared dimensions are published once

- **WHEN** an OpenGrid CAD contract or Worker quality fixture reads the
  locating and assembly interface
- **THEN** it MUST receive nominalDiameter=5, assemblyIncrement=0.05,
  assemblyOpeningDiameter=5.05, testShaftDiameter=5,
  shaftOpeningDiameter=5, retainingOpeningDiameter=7.05,
  testFlangeDiameter=7, and testFlangeHeight=0.8
- **AND** it MUST receive an integrated corner-seat diameter of 5 mm, a total
  outward length of 3.8 mm, a minimum Z of -3.8 mm, and a bottom chamfer of
  0.2 mm
- **AND** no consumer MUST define a conflicting copy of these shared
  interface dimensions

#### Scenario: Nominal locating consumers remain Ø5 mm

- **WHEN** the system builds Snap locating holes, Divider locating pegs, an
  OpenGrid Pillar, or a Stackable Box nominal base-hole compatibility record
- **THEN** Snap MUST use a 2.5 mm locating-hole radius
- **AND** Divider pegDiameter and Stackable Box baseHoleDiameter MUST remain
  5 mm through the shared interface
- **AND** both independent OpenGrid Pillar modes MUST use a nominal Ø4.9 mm
  locating body before their pillar-specific XY offset
- **AND** the fixed locking corner-seat reference body MUST continue to use the
  shared 5 mm locating interface

#### Scenario: Assembly openings use the shared increment

- **WHEN** the system builds a Stackable Box ordinary bottom-grid hole
- **THEN** the resulting opening MUST be Ø5.05 mm
- **AND** the value MUST resolve from the shared Ø5 mm nominal and +0.05 mm
  increment

#### Scenario: Stepped-hole compatibility uses the lower and retaining interface

- **WHEN** a compatibility fixture is evaluated against a retained stepped
  socket from the legacy interface contract
- **THEN** the lower connection opening MUST be Ø5 mm
- **AND** the upper/interior retaining opening MUST be Ø7.05 mm
- **AND** each value MUST resolve from the shared lower connection or flange
  dimensions

#### Scenario: Stepped holes use the lower and retaining interface

- **WHEN** a legacy compatibility fixture is evaluated against a retained
  stepped socket
- **THEN** the lower connection opening MUST be Ø5 mm
- **AND** the upper/interior retaining opening MUST be Ø7.05 mm
- **AND** detachable locking sockets MUST remain governed by their separate
  female reference contract rather than this stepped-hole fixture

#### Scenario: Detachable socket consumers use the detachable interface

- **WHEN** a Stackable Box or Stackable Cylinder uses
  `detachable-corner-seat`
- **THEN** each active position MUST use the shared female outer envelope,
  keyed passage, retaining tabs, and 1.75 mm socket depth
- **AND** the socket MUST use the shared detachable male/female fit contract
  rather than a legacy Ø5-to-Ø7.05 stepped hole
- **AND** the container MUST remain compatible with the separately generated
  `opengrid-pillar` detachable male seat, including its parameterized Ø4.9 mm
  locating section and unchanged shared retaining head

#### Scenario: Shaft and retaining openings use the shared fixture interface

- **WHEN** a Worker quality test evaluates a retained stepped-hole
  compatibility fixture
- **THEN** the Ø5 mm test shaft MUST match the Ø5 mm lower connection opening
- **AND** the Ø7 mm test flange MUST be retained by the Ø7.05 mm shoulder-side
  opening
- **AND** the ordinary Stackable Box bottom-grid hole MUST remain a straight
  Ø5.05 mm hole without this retaining section

### Requirement: Floor-thickness-dependent compatibility fixture

The system MUST define the Box and Cylinder compatibility test insert as a
Ø7 mm × 0.8 mm flange fused to a Ø5 mm shaft for any remaining stepped-hole
compatibility validation. The shaft length MUST equal the active floor or
base-plate thickness plus 1 mm of exterior allowance. The fixture MUST remain
a quality and integration artifact, MUST be used for quality and integration
validation, MUST NOT become a user-configurable model parameter, MUST NOT
alter the positioning pillar or fixed locking corner-seat geometry, and MUST
NOT be used as the acceptance fixture for a detachable locking socket.

#### Scenario: Thin-shell floor fixture

- **WHEN** a Box or Cylinder stepped-hole compatibility test selects a 2 mm
  thin-shell floor
- **THEN** the fixture shaft MUST be Ø5 mm × 3 mm
- **AND** the flange MUST be Ø7 mm × 0.8 mm
- **AND** the Ø7 mm flange MUST be retained by the Ø7.05 mm shoulder-side
  opening

#### Scenario: Base-plate floor fixture

- **WHEN** a Box or Cylinder stepped-hole compatibility test selects a 3 mm
  base-plate floor
- **THEN** the fixture shaft MUST be Ø5 mm × 4 mm
- **AND** the flange MUST be Ø7 mm × 0.8 mm
- **AND** the Ø7 mm flange MUST be retained by the Ø7.05 mm shoulder-side
  opening

#### Scenario: Normal floor fixture

- **WHEN** a Box or Cylinder stepped-hole compatibility test selects a 5 mm
  normal floor
- **THEN** the fixture shaft MUST be Ø5 mm × 6 mm
- **AND** the flange MUST be Ø7 mm × 0.8 mm
- **AND** the fixture MUST preserve the agreed 1 mm exterior allowance

#### Scenario: Fixture preserves Pillar mode dimensions

- **WHEN** the OpenGrid Pillar model is generated
- **THEN** the positioning body MUST remain nominally Ø4.9 mm before its
  pillar-specific XY increment
- **AND** the fixed locking corner seat MUST continue to use the shared male
  reference geometry
- **AND** the compatibility fixture MUST remain a separate Box/Cylinder
  quality artifact

### Requirement: Socket de-duplication derives from nominal interface size

The Stackable Box socket layout MUST use the shared nominal interface envelope
of 11 mm as its socket de-duplication distance. This threshold MUST remain a
positional merge rule for coincident or overlapping nominal socket locations
and MUST NOT be treated as the assembly increment, an opening diameter, or a
general quality tolerance.

#### Scenario: Half-cell socket locations are merged

- **WHEN** two nominal socket endpoint positions are closer than 11 mm
- **THEN** the layout MUST emit one midpoint socket position
- **AND** the requested half-cell footprint MUST remain unchanged

#### Scenario: Separated socket locations remain distinct

- **WHEN** two nominal socket endpoint positions are at least 11 mm apart
- **THEN** the layout MUST NOT merge them solely because of the
  de-duplication threshold
- **AND** other flange-envelope quality checks MUST remain independently
  applicable

### Requirement: OpenGrid locating model descriptions

The system MUST ensure that the OpenGrid stackable-box and stackable-cylinder
panels and model descriptions describe the three locating-seat choices with the
exact labels `無角座`, `鎖定角座`, and `內建角座`. The locking description MUST
state that the selected positions form retaining-tab sockets for separately
printed detachable corner seats and expose the visual lock indicators. The
integrated description MUST communicate that the selected positions receive a
solid Ø5 mm round seat extending 3.8 mm outward from the bottom, including a
0.2 mm bottom chamfer. Existing model
display names and OpenGrid identities MUST remain unchanged.

#### Scenario: Locking seat description is visible

- **WHEN** the user selects `鎖定角座` in either OpenGrid stackable model
- **THEN** the panel MUST identify the result as a retaining socket for the
  separately printed locking corner seat
- **AND** the panel MUST continue to show `無角座` and `內建角座` as the other
  mutually exclusive choices

#### Scenario: Integrated seat description is visible

- **WHEN** the user selects `內建角座` in either OpenGrid stackable model
- **THEN** the panel MUST identify the result as a Ø5 mm, 3.8 mm-high outward
  round seat with a 0.2 mm bottom chamfer
- **AND** the panel MUST continue to show the other two mutually exclusive
  choices

### Requirement: Shared detachable corner-seat geometry

The shared OpenGrid locating-assembly contract MUST publish one fixed male
detachable corner-seat geometry and one matching female socket-material
geometry. The male MUST have a 5 mm maximum locating diameter, a 3.8 mm
locating height, a 0.2 mm-high lead-in from Ø4.6 mm to Ø5 mm, and a total
height of 5.3 mm. Its retaining head MUST be a keyed leaf head of 1.96 mm
constant thickness that begins at Z=3.8 mm with a nominal 4.24 mm length,
flares continuously along its length to a maximum 6.64 mm at the taper top
Z=5.15 mm, and finishes with a 0.15 mm-high flat wear surface at Z=5.3 mm;
the complete head MUST remain inside the Ø7 mm circle. The female socket
material MUST be the Ø11 mm by 1.5 mm flat base solid spanning Z=3.8 mm
through Z=5.3 mm with its head-shaped twist-lock rotation pocket and 45-degree
funnel lead-in, used as-supplied without any build-time extension. The pocket
MUST keep at least 0.02 mm of side clearance around the seated head in both
the insertion and locked poses.

The fixed reference geometry MUST remain unchanged during the Organizer Box
prototype phase and MUST remain the source of the detachable pillar's keyed
retaining head. The independent pillar builder MAY apply its pillar-specific
XY offset only to its generated locating section; it MUST NOT redefine or
reshape the shared male/female head and socket fit or expose those fixed fit
dimensions as user parameters.

#### Scenario: Shared detachable dimensions are published once

- **WHEN** the Organizer Box socket builder or Pillar detachable-seat builder
  reads the shared locating-assembly contract
- **THEN** the fixed male reference MUST provide body diameter 5 mm, body
  height 3.8 mm, lead-in height 0.2 mm, lead-in tip diameter 4.6 mm, key width
  1.96 mm, leaf head maximum length 6.64 mm, taper top Z 5.15 mm, wear height
  0.15 mm, and total height 5.3 mm
- **AND** the independent pillar locating section MUST use its separate nominal
  Ø4.9 mm body contract plus the requested pillar offset
- **AND** it MUST receive female outer diameter 11 mm, depth 1.5 mm, source Z
  band 3.8 mm through 5.3 mm, and minimum pocket side clearance 0.02 mm
- **AND** neither consumer MUST define a conflicting copy of the fixed head or
  female socket geometry

#### Scenario: Male lead-in remains printable and insertable

- **WHEN** the fixed male seat is generated
- **THEN** its bottom face MUST be Ø4.6 mm
- **AND** its diameter MUST reach Ø5 mm at Z=0.2 mm
- **AND** it MUST remain Ø5 mm through the locating section ending at Z=3.8 mm

#### Scenario: Leaf head stays inside the legacy envelope

- **WHEN** the fixed male seat's retaining head is measured at any Z between
  3.8 mm and 5.3 mm
- **THEN** its cross-section MUST keep the 1.96 mm nominal key width
- **AND** its length MUST grow monotonically from nominally 4.24 mm at Z=3.8
  mm to the maximum 6.64 mm at the wear cap
- **AND** every point of the head MUST remain within 3.5 mm of the seat axis

#### Scenario: Raised wear surface preserves the seating datum

- **WHEN** the fixed male seat is seated in the matching female socket
- **THEN** its locating section MUST still extend exactly 3.8 mm below the box
  bottom datum
- **AND** the raised wear surface MUST occupy Z=5.15 mm through Z=5.3 mm in
  the shared assembly coordinate system
- **AND** the added wear height MUST NOT increase the box-to-support spacing

### Requirement: Detachable corner-seat reference compatibility

The supplied v13 canonical male reference MUST be a valid non-empty single
solid with bounds `[-3.321716, -2.5, 0]` through `[3.321716, 2.5, 5.3]` and nominal
volume 89.302624 mm³. It MUST include the centered bottom indicator recess with
a 3 mm radial length, 0.5 mm width, and 0.4 mm depth. The supplied female
source reference MUST be a valid non-empty single solid with bounds
`[-5.5, -5.5, 3.8]` through `[5.5, 5.5, 5.3]` and volume 106.453537 mm³, and
its effective holder material MUST be exactly that source solid without any
build-time extension. Bounds and volume comparisons MAY use the project's
configured B-Rep tolerance.

In the canonical unrotated seated pose, the male and female solids MUST have
zero positive-volume intersection. The fixed fit MUST be treated as a
hand-press, retained, hand-removable interface. The validated Organizer Box
prototype MUST have passed full insertion, lift retention, and intentional
hand removal before Stackable Box and Stackable Cylinder integrations are
accepted. Once those gates pass, each new consumer MUST independently verify
the same male/female fit at every generated locating position.

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
- **AND** the male wear surface MUST finish flush with the female base's top
  datum at Z=5.3 mm

#### Scenario: Physical prototype gates wider rollout

- **WHEN** the Organizer Box is considered for physical acceptance
- **THEN** all four seats MUST be insertable fully by hand
- **AND** the seats MUST remain attached when the box is lifted
- **AND** each seat MUST remain removable by an intentional hand pull
- **AND** after these criteria pass, the Stackable Box and Stackable Cylinder
  integrations MUST be eligible for their own geometry and fit validation

### Requirement: Detachable corner-seat visual lock indicators

The detachable corner-seat interface MUST carry its visual lock indicator on
the male seat only. The male indicator MUST be an exposed-bottom, recessed
straight slot with a nominal 0.5 mm width, a nominal 3 mm radial length, and a
0.4 mm recess depth, carried directly by the supplied v13 male solid and
centered on the seat's local rotational datum with its local radial centerline
along the local X axis before any socket-pose transform is applied.

Host models MUST NOT cut any host-side lock-indicator mark beside the socket.
Insertion orientation MUST remain communicated by the male slot together with
the female base's funnel lead-in, and the clockwise 90-degree locking motion
MUST remain the interface's only lock orientation.

#### Scenario: Shared indicator dimensions are published once

- **WHEN** the male-seat generator reads the detachable corner-seat indicator
  contract
- **THEN** it MUST receive the 0.5 mm by 3 mm straight-slot profile and 0.4 mm
  recess depth
- **AND** no consumer MUST define a conflicting local indicator depth or
  profile

#### Scenario: Clockwise locked pose follows the reference directions

- **WHEN** a compatible male seat is placed in the canonical female socket
  insertion orientation and then turned clockwise 90 degrees around the shared
  Z axis as viewed from below
- **THEN** the male slot MUST identify the locked state together with the
  female base's funnel lead-in as the orientation cue
- **AND** no host-side indicator mark MUST accompany the socket
- **AND** the insertion orientation MUST remain distinguishable from the locked
  orientation

#### Scenario: Visual indicators preserve the locating fit

- **WHEN** the marked male seat is seated in the unmarked female socket
- **THEN** the male and female locating geometry MUST retain the existing
  nominal diameters, keyed passage, and seating datum
- **AND** the indicator recess MUST NOT create positive-volume interference in
  either the insertion or locked pose
