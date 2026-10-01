## MODIFIED Requirements

### Requirement: Site appearance follows the system or user color scheme

The site MUST use an explicit light or dark choice made through the shared
navigation when one exists; otherwise it MUST select its appearance from the
user's active system or browser color-scheme preference. The light appearance
MUST follow the **Human 親和系** warm design system (white `#FFFFFF` page with
warm `#FFF7F2`/`#F6F1ED` panel surfaces, coral `#CF4429` primary with
`#FFE9E2` soft tint, warm ink text ramp, Nunito + Noto Sans TC UI text with
JetBrains Mono technical labels). The dark appearance MUST follow the warm
dark variant of the same system (warm dark brown `#201A16` grounds with
`#2A231E`/`#332A24` panels, bright coral `#FF8A70` links and text accents,
coral `#CF4429` CTAs with white labels, depth conveyed by panel brightness
steps and warm-white low-alpha borders rather than glow effects). The
selected appearance MUST apply consistently to the shared navigation, static
Astro pages, CAD workspace panels, form controls, status messages, and
viewport container, and the page layout MUST follow the active design
system's layout vocabulary (section order and alignment), without changing
any existing interaction behavior, content, routes, or model catalog. An
explicit user choice MUST persist across localized route navigation and page
reloads until the user chooses the other mode.

#### Scenario: Light appearance applies the warm system

- **WHEN** a user opens the site with a light system preference or an explicit light choice
- **THEN** shared navigation, static pages, CAD panels, form controls, status messages, and the viewport container MUST render the warm light palette with coral primary actions
- **AND** no interaction behavior, content, route, or model catalog change is introduced

#### Scenario: Dark appearance applies the warm dark system

- **WHEN** a user opens the site with a dark system preference or an explicit dark choice
- **THEN** the same surfaces MUST render the warm dark palette with bright coral links and coral CTAs with white labels
- **AND** depth MUST come from panel brightness steps and warm-white borders rather than glow accents

#### Scenario: Explicit choice persists

- **WHEN** a user selects a mode from the shared navigation and navigates between localized routes or reloads
- **THEN** the selected mode MUST remain active until the user chooses the other mode

### Requirement: CAD viewport follows the selected appearance

The CAD viewport MUST adapt its rendered background, grid, orientation
gizmo, model edge overlay, dimension annotations, and lighting to the
selected system or user color scheme. In the dark appearance the viewport
scene MUST use the warm dark treatment: a dark warm non-distracting surface
with warm-white-tinted grid lines, a warm model edge overlay, and a gizmo
whose axes keep the site-wide hue semantics (X coral, Y success green, Z
info blue) in brighter variants, consistent with the Human 親和系 palette.
Theme adaptation MUST NOT change the committed model geometry, dimension
values, camera framing, orbit controls, model revision, stale state, or
export behavior.

#### Scenario: Viewport scene adapts per appearance

- **WHEN** the CAD viewport renders in the light or dark appearance
- **THEN** background, grids, gizmo, edge overlay, annotations, and lighting MUST resolve from the warm viewport tokens of that appearance

#### Scenario: Theme adaptation leaves the model untouched

- **WHEN** the appearance changes while a model is loaded
- **THEN** model geometry, dimension values, camera framing, orbit controls, model revision, stale state, and export behavior MUST remain unchanged

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
