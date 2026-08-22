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

The system MUST ensure that the OpenGrid stackable-box panel and the shared
seat choices of the OpenGrid stackable-cylinder panel describe the exact labels
`無角座`, `角座孔`, and `內建角座`. The cylinder panel MUST additionally expose
the cylinder-only `中心卡勾` choice and describe it as a centered rectangular
quarter-turn hook for the Snap center-remover opening. The integrated
description MUST communicate that the selected positions receive a solid Ø5
mm round seat extending 3 mm outward from the bottom. Existing model display
names, OpenGrid identities, and Box seat behavior MUST remain unchanged.

#### Scenario: Integrated seat description is visible

- **WHEN** the user selects `內建角座` in either OpenGrid stackable model
- **THEN** the panel MUST identify the result as a Ø5 mm, 3 mm-high outward
  round seat
- **AND** the panel MUST continue to show the other two shared mutually
  exclusive choices

#### Scenario: Cylinder center-hook description is visible

- **WHEN** the user selects `中心卡勾` in the OpenGrid stackable-cylinder panel
- **THEN** the panel MUST identify the result as a centered rectangular hook
  intended for the Snap center-remover opening and 90-degree capture
- **AND** the Box panel MUST NOT show the cylinder-only choice
