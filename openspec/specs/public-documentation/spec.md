## Purpose

Provide a localized, visual first-use guide that lets a new user understand and
assemble the project's primary OpenGrid Desk System before using advanced CAD
parameters or print-setting references.
## Requirements
### Requirement: Desk System Quick Start is the primary documentation entry

The localized public Docs page MUST present a `Desk System Quick Start` as its
first and primary instructional section. The quick start MUST be available in
every supported Docs locale, MUST render as meaningful static page content, and
MUST remain usable without starting an interactive CAD workspace.

#### Scenario: Traditional Chinese Docs opens on the Desk quick start

- **WHEN** a user opens `/zh-Hant/docs/`
- **THEN** the first instructional heading MUST introduce the Desk System Quick
  Start
- **AND** the page MUST expose the workflow text before advanced reference
  sections

#### Scenario: English Docs opens on the Desk quick start

- **WHEN** a user opens `/en/docs/`
- **THEN** the first instructional heading MUST introduce the localized Desk
  System Quick Start
- **AND** the page MUST expose the same workflow and component relationships in
  English

#### Scenario: Docs remains independent of the CAD workspace

- **WHEN** a user or crawler loads a localized Docs page without JavaScript or
  without a CAD Worker
- **THEN** the quick-start headings, instructions, checklist, and navigation
  links MUST remain available

### Requirement: The quick start explains the Desk component dependency order

The Desk quick start MUST separate direct placement from position fixing. The direct-placement path MUST describe Board → seat-free stacking container, with no Snap or separately printed seats. It MUST identify stacking Grid Box and stacking Organizer Box as the documented direct-placement models. The fixing path MUST describe Board → Snap → one locating method → container and explicitly explain that Snap is used to fix the container's position. Board screw-hole fastening MUST remain optional.

#### Scenario: A new user can follow the numbered assembly flow
- **WHEN** a user reads the Snap fixing path
- **THEN** the page MUST show an ordered Board, Snap, locating-method, and container sequence
- **AND** Snap MUST be explained as part of the fixing path rather than a requirement for every directly placed box

#### Scenario: Board placement does not require screws
- **WHEN** a user reads the Board step
- **THEN** the instructions MUST say the Board can be placed directly on the desk
- **AND** screw-hole fastening MUST be optional

#### Scenario: Direct placement is a complete path
- **WHEN** a user follows the direct-placement instructions
- **THEN** the text MUST identify a Board and a compatible seat-free stacking container as the required parts
- **AND** the text MUST state that neither Snap nor separately printed seats are required for this path
- **AND** the page MUST not extend this claim to Round Box or other unverified model families

### Requirement: The quick start presents mutually exclusive locating strategies

Within the Snap fixing path, the page MUST present exactly two alternative locating strategies: separately printed 鎖定角座, or the container's 內建角座 option. It MUST state that built-in seats are printed as part of the container and require no separate locking seats. Direct placement with 無角座 MUST remain a distinct path, not another name for built-in seats. Terminology MUST match the CAD controls.

#### Scenario: Separate Locating Post is selected
- **WHEN** a user chooses 鎖定角座 fixing
- **THEN** the checklist MUST identify separately printed locking seats and the container's 鎖定角座 setting
- **AND** it MUST link to the Desk-context OpenGrid pillar route

#### Scenario: Built-in seat is selected
- **WHEN** a user chooses 內建角座 fixing
- **THEN** the instructions MUST identify the seats as part of the container
- **AND** they MUST state that no separate 鎖定角座 is printed
- **AND** Snap MUST remain part of the fixing assembly

#### Scenario: A printed seat-free box does not gain seats automatically
- **WHEN** a user reads how to change from direct placement to fixing
- **THEN** the page MUST explain that a compatible seat-mode box must be printed for the chosen fixing strategy
- **AND** it MUST not imply that adding Snap alone gives an already printed seat-free box a corner-seat interface

### Requirement: The quick start provides a minimum Desk print checklist and CAD links

The page MUST provide separate print checklists for direct placement and Snap fixing, with explicit quantities for the documented example. The starter checklist MUST contain only one Board and one Grid Box. Fixing checklists MUST include Board, Snap, one locating strategy, and a compatible container; a locking-seat checklist MUST identify the separately printed seats. Grid Box MUST remain the first example, Organizer Box MUST expose its stacking/no-seat settings, and Round Box MUST remain an optional container in the fixing/reference path. CAD links MUST preserve Desk context and existing model IDs and route slugs.

#### Scenario: Checklist links use Desk context
- **WHEN** a user opens a localized Desk checklist
- **THEN** component actions MUST link to the existing localized /cad/opengrid?system=desk, /cad/opengrid-snap?system=desk, /cad/opengrid-pillar?system=desk, /cad/opengrid-stackable-box?system=desk, /cad/opengrid-organizer-box?system=desk, and /cad/opengrid-stackable-cylinder?system=desk entries where applicable
- **AND** existing model IDs and route slugs MUST be preserved

#### Scenario: Grid Box is the canonical first example
- **WHEN** a new user follows the first example
- **THEN** the page MUST introduce a seat-free stacking Grid Box before alternate containers
- **AND** the example MUST be understandable without slicer settings

#### Scenario: Quantities follow the selected route
- **WHEN** a user compares the starter and fixing checklists
- **THEN** the starter MUST require exactly one Board and one Grid Box
- **AND** fixing quantities MUST match the depicted 2×2 example and its locating points
- **AND** alternate containers MUST not appear as additional required starter prints

### Requirement: Visual quick-start assets have equivalent accessible text

The quick start MUST include static visual documentation for the numbered
assembly flow, Board/Snap placement, and the two locating strategies. Each
visual MUST have localized alternative text or a caption, and the surrounding
page MUST provide equivalent text so the instructions remain understandable
when an image cannot be displayed. Each visual MUST exist as a light and a dark
static variant, and the displayed variant MUST follow the site's effective
appearance — including the manual theme toggle, not only the system
preference — while the hidden variant MUST NOT degrade accessibility of the
page.

#### Scenario: Visuals load as static documentation assets

- **WHEN** a user loads the localized Docs page
- **THEN** the flow, placement, and locating-comparison visuals MUST be
  addressable static assets in both light and dark variants
- **AND** the page MUST not require a CAD Worker or client-only geometry render
  to explain the relationships

#### Scenario: Dark appearance renders dark diagram variants

- **WHEN** the site's effective appearance is dark — via system preference or
  the header theme toggle
- **THEN** every quick-start visual MUST display its dark variant
- **AND** switching the effective appearance MUST switch the displayed diagram
  variant accordingly

#### Scenario: The hidden variant stays accessibility-neutral

- **WHEN** a diagram renders one appearance variant
- **THEN** the other variant MUST NOT be exposed to the accessibility tree
- **AND** the displayed diagram MUST have a localized accessible name via the
  visible variant's alt text or its figure caption

#### Scenario: Images are unavailable

- **WHEN** an image request fails or images are disabled
- **THEN** the localized captions, alt text, numbered workflow, and checklist
  MUST still communicate the same assembly order and locating choice

### Requirement: Quick-start scope separates first-use guidance from advanced references

The Desk guide MUST focus on assembly and component relationships. It MUST keep slicer instructions and detailed print-setting recommendations out of the primary quick-start path, and MUST keep Wall System and hidden or non-primary catalog entries out of that path. Existing model IDs, build keys, route slugs, persistence keys, CAD behavior, and export contracts MUST remain unchanged.

#### Scenario: Advanced settings do not obscure the first-use path
- **WHEN** a new user opens the Docs page
- **THEN** advanced Snap, container, and slicer topics MUST appear only after the primary two-piece Desk trial or in a separate reference section
- **AND** the first-use checklist MUST remain focused on one Board and one compatible container
- **AND** the optional fixing checklist and workflow MUST separately explain the four Board, Snap, locating-method, and container stages

#### Scenario: Existing CAD contracts remain compatible
- **WHEN** the documentation change is built and the existing model routes are used
- **THEN** the documented links MUST continue to resolve to the current model identities and CAD/export behavior

### Requirement: Documentation hub reflects current systems

The localized public Docs page MUST remain a static documentation hub. It MUST
keep the Desk System Quick Start as the first instructional path while also
exposing a Wall System guide and a current model/common reference section after
the primary first-use flow. The added sections MUST describe the current Wall
components and common browser, unit, and export constraints without requiring a
CAD Worker.

#### Scenario: Desk remains the first-use entry

- **WHEN** a user opens a localized Docs page
- **THEN** the first instructional section MUST still introduce the Desk System
  Quick Start
- **AND** the page MUST expose navigable entries for Wall System guidance and
  current model/common reference after that first-use section

#### Scenario: Documentation covers the Wall workflow

- **WHEN** a user reads the localized Wall System documentation
- **THEN** the page MUST explain the relationship between Wall Board, Wall
  Snap, Wall Cover, and OpenConnect Shelf
- **AND** it MUST link to the existing Wall-context CAD routes where applicable
- **AND** the instructions MUST remain readable when images or JavaScript are
  unavailable

### Requirement: Documentation stays aligned with the model catalog

The Docs page MUST describe the current user-facing model families and their
purpose without presenting retired or hidden model IDs as current chooser
entries. Model and common-reference content MUST include links to the model
selection page or the applicable CAD route for further action. The reference
MUST present the OpenGrid `Desk System` and `Wall System` contexts as the
system groups and MUST present standalone models（例如 `hsw-cell`）as
individual model entries rather than a separate system.

#### Scenario: Current model families are discoverable

- **WHEN** a user reads the localized Docs reference section
- **THEN** the page MUST identify the OpenGrid `Desk System` and `Wall System`
  contexts in user-facing terms
- **AND** it MUST present standalone models such as `hsw-cell` as individual
  model entries instead of a dedicated system card
- **AND** it MUST provide a navigable path to the current model chooser
- **AND** the page MUST not initialize the CAD runtime merely to render the
  reference

### Requirement: A two-piece 2×2 trial leads the Desk guide

The localized Desk guide MUST present its starter example before the fixing tutorial and component extensions. It MUST specify one 2×2 Board and one 2×2 Grid Box, with the box's 上緣 set to 堆疊, 盒底 set to 堆疊, and 角座模式 set to 無角座. Board settings MUST specify the demonstrated Lite board and no optional grid-point chamfer or screws. The instructions MUST explain which settings users should confirm in the generator without silently changing existing presets or persisted parameters.

#### Scenario: The beginner sees a small first print
- **WHEN** a user opens the Desk quick start
- **THEN** the first example MUST visibly identify two printed parts and their quantities
- **AND** it MUST show the Board and box settings alongside their generator actions
- **AND** it MUST not require a 4×4 mixed-size arrangement, a 6×6 print, Snap, or separate seats

#### Scenario: Working settings are visible rather than assumed
- **WHEN** a user follows a starter CAD link
- **THEN** the guide MUST have shown the required settings to select
- **AND** existing CAD defaults, saved-state precedence, and model identities MUST remain unchanged

### Requirement: Diagrams and questions support the placement decision

The page MUST show assembly illustrations comparing direct placement and Snap fixing, with the added fixing parts identified. It MUST provide equivalent localized HTML instructions and captions, use visible step numbers, and remain readable on a narrow phone without relying on paragraphs baked into a scaled SVG. Common questions MUST distinguish whether Snap is needed, built-in versus absent seats, and 無角座 versus an open 盒底. The overview MUST describe component purpose briefly and keep detailed parameter help at the relevant model rather than embedding long workspace help in a beginner card.

#### Scenario: A reader understands why Snap is added
- **WHEN** a reader compares the two assembly paths
- **THEN** visible copy and the fixing illustration MUST identify Snap as serving position fixing
- **AND** the direct-placement illustration and checklist MUST remain understandable without Snap

#### Scenario: Phone and no-JavaScript readers can follow the guide
- **WHEN** Docs is read on a 390px-wide phone or without JavaScript
- **THEN** the starter, settings, checklists, step numbers, and questions MUST be available as readable HTML
- **AND** both supported locales and effective light/dark diagram variants MUST remain supported

#### Scenario: None means two different settings
- **WHEN** a user reads the settings clarification
- **THEN** the page MUST explain that 無角座 removes locating-seat geometry whereas 盒底 set to 無 removes the floor
- **AND** the starter MUST explicitly use the stacking bottom
