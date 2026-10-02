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

The quick start MUST describe the physical Desk workflow in this order:
`Board → Snap → one locating method → container`. It MUST explain that a Snap
is needed at every box position, that the Board may simply rest on the desk,
and that screw-hole fastening is optional rather than a prerequisite.

#### Scenario: A new user can follow the numbered assembly flow

- **WHEN** a user reads the Desk quick start
- **THEN** the page MUST show a numbered or equivalently ordered sequence for
  Board, Snap, locating method, and Grid Box/Round Box
- **AND** the text MUST state that each intended box position needs its matching
  Snap before the container is installed

#### Scenario: Board placement does not require screws

- **WHEN** a user reads the Board step
- **THEN** the instructions MUST say that the Board can be placed directly on the
  desk
- **AND** any screw-hole fastening MUST be described as optional

### Requirement: The quick start presents mutually exclusive locating strategies

The quick start MUST present exactly two alternative locating strategies for a
container position: a separate `鎖定角座`, or a box with the exact `內建角座`
option. It MUST explicitly state that choosing `內建角座` means no separate
`鎖定角座` is added, and MUST NOT imply that both strategies are required at
the same position. The separate locking corner-seat link and copy MUST use
the same terminology as the OpenGrid pillar panel.

#### Scenario: Separate Locating Post is selected

- **WHEN** a user chooses a container using a regular locking corner-seat
  socket
- **THEN** the checklist MUST identify a separate `鎖定角座` as the
  additional locating part
- **AND** the page MUST link to the Desk-context OpenGrid pillar CAD route

#### Scenario: Built-in seat is selected

- **WHEN** a user chooses the exact `內建角座` container option
- **THEN** the instructions MUST identify the locating seat as part of the box
- **AND** the instructions MUST state that no separate `鎖定角座` is needed

### Requirement: The quick start provides a minimum Desk print checklist and CAD links

The page MUST provide a minimum checklist containing a Board, a Snap for each
box position, exactly one locating strategy, and a container. Grid Box MUST be
the first container example; Round Box MUST be presented as a secondary option
using the same workflow. Each component link in the checklist MUST preserve the
Desk context through the existing route query.

#### Scenario: Checklist links use Desk context

- **WHEN** a user opens the localized Desk checklist
- **THEN** it MUST provide links to `/cad/opengrid?system=desk`,
  `/cad/opengrid-snap?system=desk`, `/cad/opengrid-pillar?system=desk`,
  `/cad/opengrid-stackable-box?system=desk`, and
  `/cad/opengrid-stackable-cylinder?system=desk` as the applicable component
  entries
- **AND** the links MUST retain the existing model IDs and route slugs

#### Scenario: Grid Box is the canonical first example

- **WHEN** a new user follows the first container example
- **THEN** the page MUST introduce `Grid Box` before `Round Box`
- **AND** the example MUST explain the same Board, Snap, and one-locator
  dependency without requiring slicer settings

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

The first version MUST focus on Desk System assembly and component relationships.
It MUST keep slicer instructions and detailed print-setting recommendations out
of the primary quick-start path, and MUST keep Wall System and hidden or
non-primary catalog entries out of that path. Existing model IDs, build keys,
route slugs, persistence keys, CAD behavior, and export contracts MUST remain
unchanged.

#### Scenario: Advanced settings do not obscure the first-use path

- **WHEN** a new user opens the Docs page
- **THEN** advanced Snap, container, and slicer topics MUST appear only after the
  primary Desk workflow or in a separate reference section
- **AND** the first-use checklist MUST remain focused on the four workflow
  stages

#### Scenario: Existing CAD contracts remain compatible

- **WHEN** the documentation change is built and the existing model routes are
  used
- **THEN** the documented links MUST continue to resolve to the current model
  identities and CAD/export behavior

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

