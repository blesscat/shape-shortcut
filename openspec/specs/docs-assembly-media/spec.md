# docs-assembly-media Specification

## Purpose

Explain the Desk starter and optional position-fixing assemblies through short, manually played videos rendered from the project's printable CAD geometry, with reproducible offline generation and accessible static alternatives.

## Requirements

### Requirement: Assembly clips use printable CAD parts and accurate poses

The documentation MUST provide three pre-rendered assembly clips built through existing CAD builders: direct placement and lifting of the seat-free stacking Grid Box on a 2×2 Lite Board; four Desk Lite Snaps followed by the integrated-seat stacking Grid Box; and an underside comparison of detachable locking seats with integrated seats. The detachable seats MUST show insertion and a clockwise quarter turn viewed from below. Final assembly poses MUST follow measured model interfaces. The clips MUST preserve the starter settings and MUST NOT suggest Snap alone adds locating seats to a seat-free box.

#### Scenario: A beginner watches direct placement

- **WHEN** the direct-placement clip is played
- **THEN** one Board and one seat-free stacking Grid Box MUST be the only printed parts
- **AND** the box MUST rest on the Board without interference and lift away without an unlocking step

#### Scenario: A beginner watches position fixing

- **WHEN** the fixing clip is played
- **THEN** four real Snaps MUST enter the Board before the integrated-seat box is installed
- **AND** the caption and surrounding text MUST explain that Snap fixes position

#### Scenario: A beginner compares locating seats

- **WHEN** the locating comparison is played
- **THEN** a box printed for detachable locking seats MUST receive separate seats and their clockwise locking motion
- **AND** the integrated-seat box MUST show seats printed as part of the box
- **AND** the comparison MUST NOT depict a seat-free box acquiring a socket without reprinting

### Requirement: Playback is optional and accessible

Assembly clips MUST be silent static media with native play, pause, seeking and replay controls. They MUST NOT autoplay or loop. The page MUST show an actual-model poster before playback, expose localized names, captions and equivalent HTML instructions, and provide a direct static-frame link. Light and dark media MUST follow the site's effective theme without requiring JavaScript. The hidden media variant MUST be absent from the accessibility tree.

#### Scenario: A visitor opens the guide

- **WHEN** the page loads, including with reduced motion enabled
- **THEN** clips MUST remain paused and show a poster without downloading movie data on initial load
- **AND** playback MUST begin only after an explicit user action

#### Scenario: JavaScript or movie requests are unavailable

- **WHEN** JavaScript is disabled or movie delivery fails
- **THEN** native playback controls, a static-frame link and localized HTML assembly instructions MUST remain available
- **AND** visitors MUST still understand the two-piece trial and optional position-fixing path

### Requirement: CAD media is generated offline and verified

An explicit offline command MUST render all visible printed parts from existing CAD builders, capture deterministic animation frames and encode static movies and posters. The normal site build and public Docs runtime MUST NOT generate CAD or load a 3D viewer for these clips. Generated media MUST include both themes, recorded source/settings provenance and verification of decodable media, poster dimensions and assembly poses. Existing SVG generation and assets MUST remain supported.

#### Scenario: A maintainer regenerates the clips

- **WHEN** the offline generation command is run with the documented tools available
- **THEN** it MUST generate the three clips and their posters for both themes from the same deterministic scene definitions
- **AND** a verification command MUST detect missing, stale or invalid output

#### Scenario: A visitor loads the Docs or landing tutorial

- **WHEN** either page displays assembly media
- **THEN** it MUST reference static assets without initializing a CAD Worker, loading OCCT or creating a live WebGL scene
- **AND** the landing fixing tutorial MUST reuse the same fixing media as Docs
