# docs-assembly-media Specification

## Purpose

Explain the Desk starter and optional position-fixing assemblies through actual-model demonstrations from the project's printable CAD geometry, with reading or step control in Docs, a static homepage entry to the guide, reproducible offline generation and accessible static alternatives.

## Requirements

### Requirement: Assembly clips use printable CAD parts and accurate poses

The documentation MUST provide three actual-model assembly demonstrations built through existing CAD builders: direct placement and lifting of the seat-free stacking Grid Box on a 2×2 Lite Board; four Desk Lite Snaps followed by the integrated-seat stacking Grid Box; and an underside comparison of detachable locking seats with integrated seats. The detachable seats MUST show insertion and a clockwise quarter turn viewed from below. Final assembly poses MUST follow measured model interfaces. The demonstrations MUST preserve the starter settings and MUST NOT suggest Snap alone adds locating seats to a seat-free box.

#### Scenario: A beginner watches direct placement

- **WHEN** a visitor advances the direct-placement demonstration
- **THEN** one Board and one seat-free stacking Grid Box MUST be the only printed parts
- **AND** the box MUST rest on the Board without interference and lift away without an unlocking step

#### Scenario: A beginner watches position fixing

- **WHEN** a visitor advances the fixing demonstration
- **THEN** four real Snaps MUST enter the Board before the integrated-seat box is installed
- **AND** the caption and surrounding text MUST explain that Snap fixes position

#### Scenario: A beginner compares locating seats

- **WHEN** the locating comparison is played
- **THEN** a box printed for detachable locking seats MUST receive separate seats and their clockwise locking motion
- **AND** the integrated-seat box MUST show seats printed as part of the box
- **AND** the comparison MUST NOT depict a seat-free box acquiring a socket without reprinting

### Requirement: Playback is optional and accessible

Docs MUST provide scroll-controlled or explicitly step-controlled actual-model views with localized names, captions and equivalent HTML instructions. The page MUST show theme-aware actual-model posters before enhancement and when enhancement fails. The homepage MUST instead link to the localized assembly guide without embedding movies or assembly playback. Light and dark posters MUST follow the effective theme without JavaScript; enhanced models MUST follow theme changes. Hidden variants MUST remain absent from the accessibility tree.

#### Scenario: A visitor opens the guide

- **WHEN** the page loads, including with reduced motion enabled
- **THEN** Docs MUST show theme-aware posters before enhancement without downloading movie data
- **AND** Docs assembly state MUST follow reading position or explicit step selection, with discrete poses for reduced motion

#### Scenario: JavaScript or movie requests are unavailable

- **WHEN** JavaScript is disabled or movie delivery fails
- **THEN** Docs posters and localized HTML assembly instructions MUST remain available, and the homepage guide link MUST remain usable
- **AND** visitors MUST still understand the two-piece trial and optional position-fixing path

### Requirement: CAD media is generated offline and verified

Explicit offline commands MUST export prebuilt meshes and render all visible printed parts from existing CAD builders, capture deterministic animation frames and encode static movies and posters. The normal site build and public Docs runtime MUST NOT generate CAD, initialize CAD Workers or load OCCT. Docs MAY render the prebuilt meshes in a lightweight viewer. Generated media MUST include both poster themes, recorded source/settings provenance, output checksums and verification of decodable media, poster dimensions and assembly poses. Existing SVG generation and assets MUST remain supported.

#### Scenario: A maintainer regenerates the clips

- **WHEN** the offline generation command is run with the documented tools available
- **THEN** the movie command MUST generate the three clips and their posters for both themes from the same deterministic scene definitions
- **AND** the mesh command MUST export the same printable geometry and measured datums for Docs
- **AND** a verification command MUST detect missing, stale or invalid output

#### Scenario: A visitor loads the Docs guide

- **WHEN** Docs displays assembly media
- **THEN** it MUST reference offline-generated static assets without initializing a CAD Worker or loading OCCT
- **AND** retained offline fixing media and the Docs viewer MUST depict the same verified printable fixing assembly
