# Model Color Preferences Specification

## Purpose

Provide a browser-wide primary and secondary palette so users can customize model previews and carry the same palette into supported 3MF exports.

## Requirements

### Requirement: Shared palette controls

The interactive CAD viewport MUST expose a compact Model colors control in its upper-left corner, with two color swatches, labeled primary and secondary color pickers and six-digit hex inputs, swap, and restore-default actions. It MUST state that all components share the palette and it is saved in this browser. Controls MUST support keyboard use, both site themes, supported locales, and mobile widths without interfering with orbit or orientation controls. Defaults MUST be primary `#4e7cff` and secondary `#f59e0b`. Equal primary and secondary colors MUST be allowed.

#### Scenario: Edit and swap colors
- **WHEN** a user chooses a valid color or enters a complete six-digit hex color
- **THEN** the corresponding color MUST update immediately
- **AND** swap MUST exchange the two colors without changing model parameters

#### Scenario: Invalid hex input
- **WHEN** a user enters an incomplete or malformed color
- **THEN** the active palette MUST remain valid and unchanged until the input becomes valid

### Requirement: Browser-wide preference persistence

One palette MUST be shared across component and locale navigation and page reloads in the current browser. Missing, corrupt, or inaccessible storage MUST fall back safely; storage write failures MUST NOT prevent live color editing. Palette reset MUST restore both default colors without changing model parameters. Parameter reset MUST NOT change the palette.

#### Scenario: Navigate and reload
- **WHEN** a user edits the palette and visits another component or locale, then reloads
- **THEN** the saved palette MUST remain selected

#### Scenario: Independent resets
- **WHEN** the user resets model parameters
- **THEN** the palette MUST remain selected
- **AND** resetting the palette MUST preserve model parameters

#### Scenario: Unavailable storage
- **WHEN** browser storage cannot be read or written
- **THEN** the workspace MUST remain usable with defaults initially and live in-memory edits thereafter

### Requirement: Live palette rendering

Interactive previews MUST use primary for single-part models and body parts, and secondary for text and rim parts. Changing colors MUST update the displayed materials without generating geometry, changing revision, camera, dimensions, stale state, or export availability. Catalog capture presentation MUST retain default colors and omit palette controls.

#### Scenario: Recolor a committed model
- **WHEN** the user changes primary or secondary on a ready model
- **THEN** the corresponding displayed parts MUST change color while the committed revision and camera remain unchanged

#### Scenario: Capture with stored preferences
- **WHEN** catalog capture presentation runs with a custom palette stored
- **THEN** it MUST render default colors without palette controls

### Requirement: Palette-aware 3MF export

Supported 3MF exports MUST snapshot the current palette at export initiation and write primary and secondary consistently into the model material colors and project filament colors. Changing preferences during an export MUST NOT change that export's captured palette. Existing geometry, part order and extruder assignments MUST be preserved. Invalid supplied palette values MUST be rejected. Package validation MUST accept valid arbitrary six-digit hex colors, including equal colors, and reject malformed or inconsistent color metadata while preserving existing structural checks. Requests without a palette MUST remain compatible using the shared defaults.

#### Scenario: Export chosen palette
- **WHEN** a user exports a supported two-part model with a custom palette
- **THEN** its 3MF MUST contain the chosen colors in both material and project metadata and pass validation

#### Scenario: Corrupt or inconsistent metadata
- **WHEN** color metadata is malformed or material and filament colors disagree
- **THEN** the package MUST fail validation

#### Scenario: Color changes during export
- **WHEN** the user starts an export and then edits the palette
- **THEN** the export MUST retain the palette selected when it started
