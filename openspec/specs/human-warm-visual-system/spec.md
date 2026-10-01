# human-warm-visual-system Specification

## Purpose

Defines the Human 親和系 visual design system for Shape Shortcut: the warm
light and dark token palettes, typography, shape and motion vocabulary,
accessibility thresholds, and the warm CAD viewport theme. Every surface —
shared chrome, static pages, and the CAD workspace — renders from this single
warm token source in both appearances.

## Requirements

### Requirement: Warm light token palette

The site MUST define its light appearance from the warm token palette: white
`#FFFFFF` page background, warm panel surfaces (`#FFF7F2` and `#F6F1ED`),
a warm ink text ramp (`#362A24` primary, `#6E5F57` secondary, `#8A7B72`
auxiliary), coral primary `#CF4429` with `#B93A23` hover and `#FFE9E2` soft
tint, success green `#1F7A3A` with `#EAF6EE` soft tint, and warm hairline
borders derived from the ink ramp. Body and muted text rendered from this
palette MUST meet ≥4.5:1 contrast against their surface.

#### Scenario: Light pages render from the warm palette

- **WHEN** any supported page renders with the light appearance active
- **THEN** page surfaces, text, primary actions, success states, and borders MUST resolve from the warm light tokens
- **AND** body and muted text MUST meet ≥4.5:1 contrast against their rendered surface

#### Scenario: Primary action uses the coral ramp

- **WHEN** a primary action renders in the light appearance
- **THEN** its resting face MUST use coral `#CF4429` with a white label and its hover state MUST use `#B93A23`

### Requirement: Warm dark token palette

The site MUST define its dark appearance from the warm dark palette: warm
dark brown grounds (`#201A16` page, `#2A231E` panels, `#332A24` raised
panels), a warm light ink ramp (`#F4EDE7` primary, `#B8A99F` secondary,
`#94867C` auxiliary), bright coral `#FF8A70` for links and coral text
accents, translucent coral tint for soft fills, and warm-white low-alpha
borders. Primary CTAs MUST keep the coral `#CF4429` face with white labels
in the dark appearance. Depth MUST be conveyed primarily by panel
brightness steps and borders rather than glow effects.

#### Scenario: Dark pages render from the warm dark palette

- **WHEN** any supported page renders with the dark appearance active, whether from system preference or the stored header choice
- **THEN** grounds, text, borders, and soft fills MUST resolve from the warm dark tokens

#### Scenario: Links and CTAs stay distinct in the dark appearance

- **WHEN** a link or coral text accent renders next to a primary CTA in the dark appearance
- **THEN** the link or accent MUST use the bright coral `#FF8A70`
- **AND** the CTA MUST keep the coral `#CF4429` face with a white label

### Requirement: Warm typography system

UI text MUST render in Nunito with Noto Sans TC (and their established
CJK fallbacks), loaded from self-hosted font assets, with the same font
families in both appearances. Technical and specification values MUST
render in JetBrains Mono with tabular numerals, preserving exact numeric
values without rounding for tone.

#### Scenario: Typography follows the warm system in both appearances

- **WHEN** a supported page renders in either appearance
- **THEN** UI text MUST use Nunito + Noto Sans TC and technical values MUST use JetBrains Mono
- **AND** specification numbers MUST render with tabular numerals in their exact values

### Requirement: Shape and motion vocabulary

Interactive and container surfaces MUST follow the warm shape vocabulary:
12px image radius, 20px card radius, 24px large-container and popover
radius, and full pill radius for buttons, tags, and navigation. Cards and
primary actions MUST use the soft shadow at rest and lift on hover (rise
with a deeper soft shadow, never a gray or faded hover). Motion MUST use
only `transform` and `opacity` over 180–260ms with the warm ease-out
curve. When the user requests reduced motion via `prefers-reduced-motion`,
hover lifts and entrance animations MUST be disabled.

#### Scenario: Shape and hover vocabulary apply across surfaces

- **WHEN** cards, buttons, tags, images, and popovers render on a supported page
- **THEN** each surface MUST use its vocabulary radius with the soft shadow at rest
- **AND** hover MUST lift the surface with a deeper soft shadow rather than fading or graying it

#### Scenario: Reduced motion disables lift and entrance animations

- **WHEN** the user agent signals `prefers-reduced-motion`
- **THEN** hover lift and entrance animations MUST NOT animate

### Requirement: Interaction accessibility thresholds

Interactive targets on the shared chrome and the non-CAD pages — including
links, buttons, tags, and the theme and language controls — MUST present a
clickable area of at least 44px in both appearances, and keyboard focus MUST
be visible as a 3px coral outline on the warm token system. Inside the CAD
workspace the warm shell treatment applies (rounded panels, pill controls,
and the same 3px coral focus), while dense parameter controls keep their
established compact sizing.

#### Scenario: Targets and focus meet thresholds

- **WHEN** a user interacts with links, buttons, tags, or theme and language controls on the shared chrome or a non-CAD page in either appearance
- **THEN** each target MUST offer at least a 44px clickable area
- **AND** keyboard focus MUST render a visible 3px coral outline

#### Scenario: CAD workspace keeps warm focus

- **WHEN** a user interacts with CAD workspace controls via keyboard
- **THEN** focus MUST render with the 3px coral outline token

### Requirement: Warm CAD viewport theme

The CAD viewport MUST resolve its scene colors from token-driven semantic
slots: viewport background, major and minor grid, gizmo background and
axis colors, model edges, measurement annotations, hover highlight,
selection highlight, and face highlight. The light scene MUST use the warm
paper background `#F7F3EF` with ink-alpha grids; the dark scene MUST use
the warm dark `#201A16`-family background with warm-white-alpha grids.
Gizmo axes MUST keep the site-wide hue semantics — X coral, Y success
green, Z info blue — with bright variants in the dark appearance. Hover
MUST highlight in amber, selection in coral, and face highlight in
translucent amber. Theme changes MUST re-resolve live when the appearance
changes and MUST NOT alter committed model geometry, dimension values,
camera framing, model revision, stale state, or export behavior.

#### Scenario: Viewport follows the warm theme per appearance

- **WHEN** the CAD viewport renders with the light or dark appearance active
- **THEN** the scene background, grids, edges, annotations, highlights, and gizmo MUST resolve from the warm viewport tokens of that appearance

#### Scenario: Gizmo axis hue semantics persist across appearances

- **WHEN** the viewport gizmo renders in either appearance
- **THEN** the X axis MUST be coral-family, the Y axis success-green-family, and the Z axis info-blue-family, with brighter variants in the dark appearance

#### Scenario: Appearance switch re-themes without side effects

- **WHEN** the user switches appearance while a model is loaded
- **THEN** the viewport MUST re-resolve its warm theme live
- **AND** the model geometry, parameters, camera framing, and export behavior MUST remain unchanged
