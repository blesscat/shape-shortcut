# OpenGrid OpenConnect Tissue Box Specification

## Purpose

Provide an OpenConnect wall holder for inverted tissue packs with an open loading top, a closed bottom dispensing slot, and configurable internal dimensions and upward tilt.

## Requirements

### Requirement: Independent wall component and parameter lifecycle
The system MUST expose `opengrid-openconnect-tissue-box` at `/cad/opengrid-openconnect-tissue-box` in OpenGrid Wall only, with a display name beginning `OpenGrid `. It MUST provide numeric internal `x`, `y`, `z` in mm, `tiltAngle`, `outerRadius`, `wallThickness`, `bottomThickness`, `slotLength`, `slotWidth`, and boolean `honeycombMode`. X MUST mean along-wall left/right; Y MUST mean outward; Z MUST mean local box height. The dimensions MUST be measured in the box's local axes before tilt. Defaults MUST be x=220, y=120, z=90, tiltAngle=15, outerRadius=5, wallThickness=2, bottomThickness=2, slotLength=160, slotWidth=35, honeycombMode=false. These are editable example dimensions, not a guaranteed tissue-pack fit. Values MUST persist independently and invalid input MUST not generate, persist, commit, or export a replacement model.

#### Scenario: Configure and reload
- **WHEN** the user changes valid XYZ dimensions, thicknesses, angle, radius, slot dimensions, or saving mode and reloads
- **THEN** this component MUST restore those typed parameters independently of other components

#### Scenario: Invalid or oversized configuration
- **WHEN** values are missing, unknown, nonfinite, invalid in type, dimensions outside 40–400 mm for X/Y or 20–300 mm for Z, thicknesses outside 1–5 mm, angle outside whole degrees 0–45, radius outside 0 through min(x,y)/4, slotWidth below 5, slotLength below slotWidth+2, or slot extents leave less than 5 mm of internal bottom frame
- **THEN** the system MUST reject the snapshot with a field diagnostic
- **AND** any derived installed extent above 500 mm or saving configuration exceeding 3000 cells MUST also be rejected

### Requirement: Open top and bottom dispensing geometry
The holder MUST have four walls, a bottom, and no lid or top covering. Its cavity MUST have the selected local XYZ extents and an inner front-corner radius max(0, outerRadius-wallThickness) and square inner rear corners, with UI explanation that rounded corners consume corner space. The bottom MUST contain exactly one centered closed stadium slot along X with the selected total length and width, semicircular ends, and smoothed upper/lower extraction edges. It MUST retain a continuous bottom frame. The pack MUST be described as loaded inverted from the top and dispensed from below.

#### Scenario: Inspect loading and dispensing paths
- **WHEN** a normal-mode holder is generated
- **THEN** the cavity MUST open through the whole top and through the centered bottom slot, while bottom material outside the slot and the four walls remain present

#### Scenario: Adjust radius and slot
- **WHEN** outerRadius is zero or a positive valid value, and slot dimensions change
- **THEN** only the two outward front vertical corners MUST follow the selected radius; the two wall-facing rear corners MUST remain square and join a full-width rear support and mounting plate, slot extents MUST follow the dimensions, and the bottom frame MUST stay connected

### Requirement: Upward tilt with upright OpenConnect mounting
In the installed wall orientation, at zero degrees the bottom MUST be horizontal. Positive tilt MUST lift the outward front relative to the rear. The integrated locked OpenConnect female interface MUST remain upright on the wall plane and retain its existing mating geometry and 28 mm spacing in both mounting-plane axes. The mounting plane MUST use interface-local X for horizontal columns and Y for vertical rows (installed world Z), distinct from the box local XYZ dimensions. Column and row counts MUST be the full-grid counts fitting the mounting plate width and the common usable height through its full thickness, with at least one of each; The complete grid MUST follow horizontal left/center/right and vertical top/center/bottom choices in installed front-view coordinates. Each occupied cell MUST remain in the full-thickness usable interval with unchanged 28 mm pitch. The default MUST preserve centered columns and bottom-aligned rows, with row centers starting half a pitch above the lower edge of that common height. Configurations without room for one complete row MUST be rejected with a Z diagnostic and localized guidance to increase internal Z. The panel MUST show the computed X-column and Y-row counts. The support MUST connect the body and interface without covering the cavity, dispensing slot, or crossing the wall plane. The default preview and both STEP/STL exports MUST instead use print orientation: the slotted dispensing bottom MUST be horizontal at Z=0 with its outward normal downward, and no part of the model below Z=0. The full-width rear support and mounting plate MUST have planar lower and upper ends coplanar with the box bottom and top, with no protrusion above the box or raised lower bevel. This rigid orientation change MUST preserve the installed relative upward angle and socket mating geometry. Generated bounds MUST describe the print-oriented output, and both installed and output extents MUST respect the 500 mm limit.

#### Scenario: Positive angle
- **WHEN** tiltAngle changes from zero to a positive value through 45 degrees
- **THEN** the front bottom MUST be higher than the rear bottom, and mounting sockets MUST remain upright in the installed wall orientation, independent of the tilt

#### Scenario: Two-dimensional mounting grid
- **WHEN** the upright plate fits multiple grid columns and rows
- **THEN** every column-row pair MUST contain a complete locked socket at the shared pitch
- **AND** varying outerRadius MUST NOT shrink the full-width mounting plate or its column count
- **AND** a usable plate height between one and two grid pitches MUST retain one complete row

#### Scenario: Dispensing bottom faces the print bed
- **WHEN** a valid box is previewed or exported at any supported upward angle
- **THEN** its dispensing bottom MUST lie on Z=0 with its exterior normal toward negative Z
- **AND** the entire body, support and mount MUST remain on or above the print plane
- **AND** rotating the output back to installed wall orientation MUST restore the requested upward slope and upright socket plane

#### Scenario: Flush rear ends
- **WHEN** a valid holder is generated at any supported angle
- **THEN** the rear support and mounting plate MUST reach the same Z=0 and Z=internalZ+bottomThickness planes as the box
- **AND** complete socket cell envelopes MUST fit between these planes through the plate thickness

#### Scenario: Insufficient mounting height
- **WHEN** the selected height and angle cannot fit one full socket row while keeping both ends flush
- **THEN** validation MUST reject the configuration on Z before generation or export

### Requirement: Protected material-saving mode
Saving mode MUST cut shared-size hexagonal openings through the front and two side wall regions and, when enabled, through the bottom plate, using the same shared OpenGrid honeycomb lattice for walls and bottom. Lattice placement MUST follow the shared saving-mode discipline: rows centered in each protected panel, columns anchored on the shared absolute pitch, and boundary-overlapping centers admitted so hexagonal openings MAY be clipped by the protected frames into partial cells that end flush with the frame lines. A clipped cell with no remaining area MUST NOT cut. Cells whose opening would enter the 2 mm dispensing-slot safety ring or break the bottom rounded-corner-arc clearance MUST be dropped entirely. Wall openings MUST stay out of the at-least-3.5 mm wall frame bands, and bottom openings MUST stay out of the at-least-5 mm outer bottom frame. Bottom openings MUST pass completely through the bottom thickness so the lattice is visible from both bottom faces. The back wall, rear support, mounting plate, rounded corner regions outside the corner clearance rule, wall frame bands, bottom frame, and slot safety ring MUST remain solid. The UI MUST show the shared Beta indicator, performance warning, and an estimated cell count covering walls and bottom, including partial cells, when enabled, and the 3000-cell ceiling MUST bound that combined estimate. Cutting MUST report cell progress and support stale-generation cancellation.

#### Scenario: Toggle saving
- **WHEN** saving is enabled on a box with room for cells
- **THEN** its volume MUST decrease while it remains a single valid connected solid with the same exterior bounds, cavity, and dispensing slot
- **AND** disabling saving MUST restore solid walls and a fully solid bottom

#### Scenario: Partial cells are clipped at the frames
- **WHEN** saving mode is enabled on a box whose panels leave a frame remainder smaller than one full cell pitch
- **THEN** the lattice MAY cut partial hexagonal openings that end flush with the protected frame lines
- **AND** no clipped opening MAY enter the wall frame bands, the outer bottom frame, the slot safety ring, or the rounded corner clearances
- **AND** the estimated cell count MUST include the partial cells

#### Scenario: Bottom openings clear the dispensing slot
- **WHEN** saving mode cuts the bottom of a valid box
- **THEN** every bottom opening, including partial cells, MUST lie entirely outside the 2 mm ring surrounding the slot perimeter
- **AND** the slot surround MUST remain connected to the solid outer bottom frame
- **AND** no bottom opening MAY remove the slot lip smoothing or merge openings with the slot

#### Scenario: Bottom openings pass through the floor
- **WHEN** saving mode cuts the bottom of a valid box
- **THEN** each admitted bottom opening, including partial cells, MUST be open through the entire bottom thickness and visible from both the interior and exterior bottom faces

#### Scenario: Rounded front corners stay solid
- **WHEN** a box with a positive outerRadius is generated with saving mode
- **THEN** no hexagonal opening MAY break through the two rounded front corner surfaces
- **AND** wall cells adjacent to the rounded corners MUST respect the corner clearance while remaining wall cells use the shared side frame

#### Scenario: Rear mount stays solid
- **WHEN** saving mode is enabled on any valid box
- **THEN** the rear wall, rear support, and mounting plate MUST contain no saving openings
- **AND** the estimated cell count shown by the UI MUST include both wall and bottom cells and stay within the 3000-cell ceiling

### Requirement: Preview and export integration
The component MUST participate in the existing generation, latest-wins, commit, stale-preview and export lifecycle. STEP and binary STL MUST be nonempty and generated from the committed B-Rep, with deterministic filenames distinguishing every geometry parameter. The catalog MUST include a representative preview and localized English/Traditional Chinese controls and help.

#### Scenario: Preview and download
- **WHEN** a valid snapshot finishes generation and is committed
- **THEN** a nonempty mesh MUST display and both STEP and STL downloads MUST identify the committed parameters

### Requirement: Collapsed OpenConnect rear-grid settings

The `opengrid-openconnect-tissue-box` panel MUST use the shared OpenConnect section, initially collapsed and expandable by pointer or keyboard. It MUST group rear-grid controls and display horizontal alignment choices left/center/right (靠左／置中／靠右) and vertical top/center/bottom (靠上／置中／靠下), using installed front-view directions. The canonical field `openConnectHorizontalAlignment` MUST accept only `left`, `center`, `right`; `openConnectVerticalAlignment` MUST accept only `top`, `center`, `bottom`. Selections MUST persist, round-trip to generation, and restore to center/bottom on reset. Alignment MUST translate only the complete rear receptacle grid while preserving pitch, count, authored cutter geometry, cell-safe edge clearance and body geometry. Snap, Wall Cover and grid-board settings MUST remain unchanged.

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

### Requirement: Backward-compatible tissue-box alignment parameters

The normalized tissue-box snapshot MUST add `openConnectHorizontalAlignment` and `openConnectVerticalAlignment` to its existing fields. Missing alignment fields MUST normalize to center/bottom without losing existing customization. Explicit unsupported alignment values MUST produce field-specific errors. All existing required dimensions, identifiers and geometry constraints MUST remain unchanged. Export names MUST identify normalized alignment along with existing geometry parameters.

#### Scenario: Open a legacy tissue-box snapshot

- **WHEN** an otherwise valid saved snapshot has no alignment fields
- **THEN** it MUST load with horizontal center and vertical bottom placement, preserving its previous geometry and dimensions
- **AND** reset MUST restore those model-specific defaults

#### Scenario: Reject invalid alignment

- **WHEN** an alignment contains an unsupported enum, empty string or null
- **THEN** validation MUST reject the affected field without persisting or generating the invalid selection
