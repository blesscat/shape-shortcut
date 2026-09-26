# OpenGrid Label Slot Test Specification

## Purpose

Provide a small independently printable coupon of the organizer's integrated front label slot so users can verify card fit and print performance without printing an entire organizer.

## Requirements

### Requirement: Independent printable slot coupon

The system MUST expose `opengrid-label-slot-test` in the Wall catalog and at its own localized CAD route, with a display name beginning with `OpenGrid `. Its only parameter MUST be integer `gridUnits` from 1 through 10, defaulting to 3, adjusted through a slider. Each unit MUST represent 10 mm of matching card width. Parameters MUST persist independently of the organizer and other label models. Invalid units and unknown keys MUST be rejected.

#### Scenario: Change and reload the test width

- **WHEN** the user changes the test coupon from three to four units and reloads
- **THEN** the slider MUST retain four units and display 40 mm card width
- **AND** other label models' saved widths MUST remain unchanged

### Requirement: Match the integrated organizer slot

The coupon MUST contain the same side rails, front lips, bottom wedge, insertion clearances and upward extraction path as the organizer slot, fused to a 1 mm back wall with no clip or mounting interface. Its supplied print orientation MUST keep the back wall upright and base at Z=0, matching the organizer's slot orientation. Matching flat and raised cards MUST remain clear of the rails through insertion and extraction. Quality validation MUST reject invalid B-Rep, incorrect bounds, multiple solids, missing rail material or an obstructed seat.

#### Scenario: Test matching cards

- **WHEN** a one-, three- or five-unit coupon is generated
- **THEN** both card styles with matching units MUST fit and slide upward without colliding with the slot
- **AND** the coupon MUST be a single valid solid suitable for STEP and STL export

### Requirement: Download a test print

The latest ready coupon MUST export STEP and STL with its model ID and unit count in the filename. Localized instructions MUST explain matching card units and the supplied upright print direction. A separate 3MF color split is not required for this single-material part.

#### Scenario: Download the default coupon

- **WHEN** the default three-unit coupon is ready
- **THEN** the user MUST be able to download `opengrid-label-slot-test-3u.step` and `opengrid-label-slot-test-3u.stl`
