# opengrid-label-ledge-test Specification

## Purpose

Provide a small independently printable coupon of the stackable box's inside label ledge so users can tune label card width and snap tightness before printing a whole box.

## Requirements

### Requirement: Independent printable ledge coupon

The system MUST expose `opengrid-label-ledge-test` in the Desk catalog only (`supportedSystemContexts: ['desk']`) and at its own localized CAD route, with a display name beginning with `OpenGrid `. Its parameters MUST be exactly integer `gridUnits` from 2 through 10, defaulting to 3, adjusted through a slider, and enum `labelSnapFit` of `loose`, `normal` or `tight`, defaulting to `normal`. Each unit MUST represent 10 mm of matching card width. Parameters MUST persist independently of the stackable box and every other label model. Invalid values and unknown keys MUST be rejected.

#### Scenario: Change and reload the coupon width

- **WHEN** the user changes the coupon from three to five units and reloads
- **THEN** the slider MUST retain five units and display 50 mm card width
- **AND** the stackable box's and other label models' saved parameters MUST remain unchanged

#### Scenario: Coupon is absent from other catalogs

- **WHEN** the Wall catalog and the Desk catalog are listed
- **THEN** `opengrid-label-ledge-test` MUST appear in the Desk catalog and not in the Wall catalog

### Requirement: Snap fit options show their bump height

The tightness control MUST present three options whose visible labels contain both the word and the bump height: zh-Hant `鬆 0.5 mm`, `標準 0.6 mm`, `緊 0.7 mm`, and English `Loose 0.5 mm`, `Normal 0.6 mm`, `Tight 0.7 mm`. The labels MUST map to bump heights 0.5, 0.6 and 0.7 mm in the generated geometry.

#### Scenario: Fit labels are localized with heights

- **WHEN** the coupon panel is rendered in `zh-Hant` and in `en`
- **THEN** each option label MUST show its word and bump height as listed above

### Requirement: Coupon uses the shared ledge builder

The coupon MUST be built by the same ledge builder as the stackable box, fused to a short back-wall stub and base, printed upright with the base at Z=0 like the box. It MUST be a single valid solid. Its ledge slot and card height MUST derive from the shared 12 mm label card height. Flat and raised cards of the matching width MUST insert, seat behind the snap bumps and have a clear removal path. Quality validation MUST reject invalid B-Rep, incorrect bounds, multiple solids, missing rail, lip or bump material, or an obstructed seat.

#### Scenario: Test matching cards

- **WHEN** a two-, three- or ten-unit coupon is generated at each fit
- **THEN** both card styles with matching units MUST insert up the slope and seat behind the bumps without colliding with the rails
- **AND** the coupon MUST be a single valid solid suitable for STEP and STL export

### Requirement: Download a ledge test print

The latest ready coupon MUST export STEP and STL whose filenames contain the model ID, unit count and fit, for example `opengrid-label-ledge-test-3u-fit-normal.step`. Localized instructions MUST explain matching card units, the supplied upright print direction, and that the user should set the same tightness on the box after testing.

#### Scenario: Download the default coupon

- **WHEN** the default coupon is ready
- **THEN** the user MUST be able to download `opengrid-label-ledge-test-3u-fit-normal.step` and `opengrid-label-ledge-test-3u-fit-normal.stl`
