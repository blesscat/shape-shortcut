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
In the installed wall orientation, at zero degrees the bottom MUST be horizontal. Positive tilt MUST lift the outward front relative to the rear. The integrated locked OpenConnect female interface MUST remain upright on the wall plane and retain its existing mating geometry and 28 mm spacing in both mounting-plane axes. The mounting plane MUST use interface-local X for horizontal columns and Y for vertical rows (installed world Z), distinct from the box local XYZ dimensions. Column and row counts MUST be the full-grid counts fitting the mounting plate width and height, with at least one of each; X columns MUST be centered and row centers MUST start half a pitch above the plate bottom. The panel MUST show the computed X-column and Y-row counts. The support MUST connect the body and interface without covering the cavity, dispensing slot, or crossing the wall plane. The default preview and both STEP/STL exports MUST instead use print orientation: the slotted dispensing bottom MUST be horizontal at Z=0 with its outward normal downward, and no part of the model below Z=0. This rigid orientation change MUST preserve the installed relative upward angle and socket mating geometry. Generated bounds MUST describe the print-oriented output, and both installed and output extents MUST respect the 500 mm limit.

#### Scenario: Positive angle
- **WHEN** tiltAngle changes from zero to a positive value through 45 degrees
- **THEN** the front bottom MUST be higher than the rear bottom, and mounting sockets MUST remain upright in the installed wall orientation, independent of the tilt

#### Scenario: Two-dimensional mounting grid
- **WHEN** the upright plate fits multiple grid columns and rows
- **THEN** every column-row pair MUST contain a complete locked socket at the shared pitch
- **AND** varying outerRadius MUST NOT shrink the full-width mounting plate or its column count
- **AND** a plate shorter than two grid pitches MUST retain one complete row

#### Scenario: Dispensing bottom faces the print bed
- **WHEN** a valid box is previewed or exported at any supported upward angle
- **THEN** its dispensing bottom MUST lie on Z=0 with its exterior normal toward negative Z
- **AND** the entire body, support and mount MUST remain on or above the print plane
- **AND** rotating the output back to installed wall orientation MUST restore the requested upward slope and upright socket plane

### Requirement: Protected material-saving mode
Saving mode MUST cut shared-size hexagonal openings only through the front and two side straight wall regions. The back, bottom frame, slot surround, mounting support, rounded corners, and at least 5 mm wall edge frames MUST remain solid. Cells MUST stay within the protected regions. Small regions with no fitting cells MUST remain solid. The UI MUST show the shared Beta indicator, performance warning, and estimated cell count when enabled. Cutting MUST report cell progress and support stale-generation cancellation.

#### Scenario: Toggle saving
- **WHEN** saving is enabled on a box with room for cells
- **THEN** its volume MUST decrease while it remains a single valid connected solid with the same exterior bounds, cavity, and dispensing slot
- **AND** disabling saving MUST restore solid walls

### Requirement: Preview and export integration
The component MUST participate in the existing generation, latest-wins, commit, stale-preview and export lifecycle. STEP and binary STL MUST be nonempty and generated from the committed B-Rep, with deterministic filenames distinguishing every geometry parameter. The catalog MUST include a representative preview and localized English/Traditional Chinese controls and help.

#### Scenario: Preview and download
- **WHEN** a valid snapshot finishes generation and is committed
- **THEN** a nonempty mesh MUST display and both STEP and STL downloads MUST identify the committed parameters
