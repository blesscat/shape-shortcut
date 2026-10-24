# system-dark-mode Specification

## Purpose

讓 Shape Shortcut 在 desktop 與 mobile 都能一致地跟隨使用者的系統／瀏覽器色彩偏好，並允許使用者從共用導覽列選擇 light 或 dark mode；網站 UI 與 CAD 3D viewport 都必須維持可讀、可操作的對比。

## Requirements

### Requirement: Site appearance follows the system or user color scheme

The site MUST honor an explicit shared-navigation light/dark choice, otherwise following the system/browser preference. All shared navigation, static pages, CAD panels, controls, statuses and viewport containers MUST consistently use the paper/indigo/graphite visual system: paper/white light surfaces with indigo actions and graphite text; graphite dark surfaces with light-indigo actions and dark action labels. Both appearances MUST share the same content and interaction hierarchy. Theme changes themselves MUST NOT alter routes, catalog, content, user parameters or layout. An explicit choice MUST persist across localized navigation and reloads until changed.

#### Scenario: Light appearance applies the paper system

- **WHEN** a user opens the site with a light system preference or an explicit light choice
- **THEN** shared navigation, static pages, CAD panels, form controls, status messages, and the viewport container MUST render the paper light palette with indigo primary actions
- **AND** selecting or switching appearance itself MUST NOT alter interaction behavior, content, routes, or the model catalog

#### Scenario: Dark appearance applies the graphite system

- **WHEN** a user opens the site with a dark system preference or an explicit dark choice
- **THEN** the same surfaces MUST render the graphite dark palette with light-indigo links and light-indigo CTAs with graphite labels
- **AND** depth MUST come from panel brightness steps and neutral borders rather than glow accents

#### Scenario: Explicit choice persists

- **WHEN** a user selects a mode from the shared navigation and navigates between localized routes or reloads
- **THEN** the selected mode MUST remain active until the user chooses the other mode

### Requirement: Dark controls and states remain readable

The site MUST expose sufficient visual contrast for body text, muted text, borders, fields, buttons, links, focus indicators, validation errors, stale-preview indicators, disabled controls, and native form-control UI in both color schemes. Body, muted and action text MUST meet at least 4.5:1 contrast on their actual surfaces. Required control boundaries and focus indicators MUST meet at least 3:1 against adjacent surfaces. The dark appearance MUST use the same semantic control states as the light appearance rather than requiring a separate interaction model. Decorative glow, grid, and glass effects MUST NOT reduce the contrast of text or control boundaries below these thresholds.

#### Scenario: Theme control remains operable

- **WHEN** a user opens a supported localized route
- **THEN** the shared navigation MUST expose a light/dark theme control with a localized accessible name
- **AND** activating the control MUST update the selected appearance without requiring a full page navigation
- **AND** the native control color scheme MUST match the selected appearance

#### Scenario: Dark form controls remain operable

- **WHEN** a user opens a CAD workspace while the browser reports a dark color scheme
- **THEN** text inputs, range controls, select controls, buttons, restore controls, and links MUST have readable labels and visible boundaries
- **AND** keyboard focus MUST remain visibly distinguishable

#### Scenario: Dark status and validation states remain distinguishable

- **WHEN** a CAD workspace displays a validation error, disabled action, stale preview, or progress state in dark appearance
- **THEN** the state MUST remain visually distinguishable from the surrounding dark surface
- **AND** its text or indicator MUST remain readable without relying on color alone for the associated message

#### Scenario: Static homepage CTA remains readable in dark appearance

- **WHEN** a user views a localized homepage while the browser reports a dark color scheme
- **THEN** the final call-to-action label MUST have at least 4.5:1 contrast against its surface, including resting and pressed button fills
- **AND** the CTA's hover state MUST preserve at least 4.5:1 contrast between its label and surface
- **AND** the CTA MUST remain visible, keyboard-focusable, and linked to the localized model-selection page

### Requirement: CAD viewport follows the selected appearance

The CAD viewport MUST adapt background, grid, gizmo, edges, measurement annotations and lighting to the active appearance. The dark scene MUST use neutral graphite surfaces with restrained light grid lines and visible edges. Gizmo axes MUST keep X red/coral, Y green and Z blue semantics with brighter dark variants. Brand changes MUST NOT overwrite user model colors. Theme adaptation MUST NOT change committed geometry, dimensions, camera framing, orbit controls, model revision, stale state or export behavior.

#### Scenario: Viewport scene adapts per appearance

- **WHEN** the CAD viewport renders in the light or dark appearance
- **THEN** background, grids, gizmo, edge overlay, annotations, and lighting MUST resolve from the neutral viewport tokens of that appearance

#### Scenario: Theme adaptation leaves the model untouched

- **WHEN** the appearance changes while a model is loaded
- **THEN** model geometry, dimension values, camera framing, orbit controls, model revision, stale state, and export behavior MUST remain unchanged

### Requirement: Responsive layout remains independent of theme

The system MUST preserve the existing 760px responsive breakpoint and layout behavior in both color schemes. Dark appearance MUST be a palette change applied to both responsive branches, not a separate desktop or mobile implementation.

#### Scenario: Theme does not alter the breakpoint contract

- **WHEN** the same route is rendered once in light appearance and once in dark appearance at the same viewport width
- **THEN** the layout branch selected at that width MUST be the same in both renders
- **AND** the page MUST not gain horizontal overflow solely because dark appearance is active

### Requirement: Decorative theme effects respect reduced motion

The site MUST present animated decorative effects (status indicator pulses,
hover lift, and entrance motions) as static decoration when the user
requests reduced motion through `prefers-reduced-motion`. Decorative layers
MUST NOT intercept pointer input, obscure interactive content, or introduce
horizontal overflow in either color scheme.

#### Scenario: Reduced motion renders decoration statically

- **WHEN** the user agent signals `prefers-reduced-motion` in either color scheme
- **THEN** status pulses, hover lift, and entrance motions MUST render without animation

#### Scenario: Decoration never blocks interaction

- **WHEN** decorative layers render in either color scheme
- **THEN** they MUST NOT intercept pointer input, obscure interactive content, or introduce horizontal overflow
