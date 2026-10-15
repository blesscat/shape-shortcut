# docs-scroll-assembly Specification

## Purpose

Help beginners match each assembly instruction to the actual printable parts, with reading-controlled 3D progress and compact manual inspection while preserving ordinary document navigation and static explanations.

## Requirements

### Requirement: Reading position controls the fixing assembly

The localized Docs fixing tutorial MUST connect its four ordered Board, Snap, locating-method and box steps to a single actual-model assembly view. Progress MUST depend on the reader's position within this section, with stable completed poses between movements. Forward reading MUST advance the assembly, backward reading MUST reverse it, and stopping MUST hold the pose. Native page scrolling MUST remain available throughout and the viewer MUST stop sticking after this section.

#### Scenario: A reader follows the fixing steps
- **WHEN** the reader scrolls through the four fixing explanations
- **THEN** the view MUST show the Board, four installed Snaps, the integrated-seat interface, and the matching installed box in that order
- **AND** the current step MUST be visibly identified and Snap MUST be described as fixing position

#### Scenario: A reader revisits a connection
- **WHEN** the reader scrolls backward or stops between instructions
- **THEN** the model MUST return to the corresponding pose or hold its current pose without an independent playback clock

### Requirement: Manual inspection and step navigation remain predictable

The documentation MUST offer named step links that move to the corresponding explanation and synchronize the assembly. Model rotation, bounded zoom and a reset-view control MUST be available after successful enhancement. Rotation MUST NOT change assembly progress. Direct placement and the locating-seat comparison MUST follow reading position using the same interaction as the fixing tutorial, with stable poses when scrolling stops and reversible progress when reading backward. Each demonstration MUST keep its model visible with the current explanation inside its own section, without requiring a step click. The existing four-step fixing tutorial MUST retain its assembly order and interaction.

#### Scenario: A reader jumps to a step
- **WHEN** a reader activates an assembly step link using pointer or keyboard
- **THEN** its explanation MUST remain visible below the site header, beside the model on wide screens or below it on narrow screens, and the assembly MUST match that step
- **AND** subsequent scrolling MUST continue controlling progress from that position

#### Scenario: A reader inspects a model
- **WHEN** a reader rotates, zooms or resets the view
- **THEN** the assembly MUST retain its reading progress
- **AND** the canvas MUST preserve vertical page scrolling on touch devices and mouse-wheel scrolling

#### Scenario: A reader scrolls through direct placement
- **WHEN** a reader scrolls through alignment, placement and lifting of the seat-free stacking box
- **THEN** the actual model MUST follow that reading progress without clicking a step
- **AND** stopping or scrolling backward MUST hold or reverse the same assembly

#### Scenario: A reader scrolls through the locating-seat comparison
- **WHEN** a reader scrolls through alignment, insertion and clockwise locking
- **THEN** the actual detachable seats MUST follow that reading progress while integrated seats remain visible for comparison
- **AND** the model and current explanation MUST remain usable together on desktop and phone layouts

### Requirement: Enhanced assembly remains accessible and resilient

All instructions, captions, fallback posters and navigation MUST be localized in English and Traditional Chinese and follow the effective site theme. Narrow screens MUST preserve visible reading space and avoid horizontal overflow. Reduced-motion preference MUST produce discrete step poses and immediate navigation. Missing JavaScript, failed geometry, unavailable WebGL or a lost context MUST retain meaningful static illustrations and complete instructions. Public runtime MUST use prebuilt geometry without CAD Workers or OCCT, and MUST avoid continuous rendering while idle.

#### Scenario: A phone reader uses the guide
- **WHEN** the guide is enhanced on a narrow viewport
- **THEN** the bounded model area and current explanation MUST remain usable together
- **AND** leaving the guide MUST allow the next document section to appear normally

#### Scenario: Motion reduction or enhancement failure
- **WHEN** reduced motion is enabled or live rendering cannot operate
- **THEN** the guide MUST communicate the same ordered steps without continuous animated motion or inaccessible essential content
- **AND** static HTML instructions and theme-aware actual-model posters MUST remain available when enhancement fails
