# human-warm-visual-system Specification

## Purpose

Defines the Human 親和系 visual design system for Shape Shortcut: the warm
light and dark token palettes, typography, shape and motion vocabulary,
accessibility thresholds, and the warm CAD viewport theme. Every surface —
shared chrome, static pages, and the CAD workspace — renders from this single
warm token source in both appearances.

## Requirements

### Requirement: Warm light token palette

The site MUST use the paper/indigo/graphite light palette: paper `#F8F7F4` page, white `#FFFFFF` cards, neutral secondary surfaces, graphite `#252833` primary text, `#626775` secondary text, indigo `#4659CF` primary actions with white labels, `#3748B5` hover, and `#ECEFFC` selected soft fill. Brand emphasis MUST be reserved for actions, links, focus and current selection; category grouping MUST NOT depend on large success-colored surfaces. Error, warning and success states MUST retain distinct semantics with text or symbols. Body and muted text MUST meet at least 4.5:1 contrast against their rendered surfaces.

#### Scenario: Light pages render from the paper palette

- **WHEN** any supported page renders with the light appearance active
- **THEN** page surfaces, text, primary actions, success states, and borders MUST resolve from the paper/indigo/graphite light tokens
- **AND** body and muted text MUST meet ≥4.5:1 contrast against their rendered surface

#### Scenario: Primary action uses the indigo ramp

- **WHEN** a primary action renders in the light appearance
- **THEN** its resting face MUST use indigo `#4659CF` with a white label and its hover state MUST use `#3748B5`

### Requirement: Warm dark token palette

The site MUST use graphite `#181A20` page, `#22252D` panels, `#2C303A` raised surfaces, `#F1F2F6` primary text, `#ADB3C2` secondary text and `#A8B5FF` links/focus. Primary actions MUST use a light-indigo `#A8B5FF` face with graphite `#181A20` labels, including readable hover and pressed variants. Selected soft fills MUST use `#2B3352`. Depth MUST come from surface brightness and borders rather than glow. Body, muted and action text MUST meet at least 4.5:1 contrast on their actual surfaces in resting and hover states.

#### Scenario: Dark pages render from the graphite palette

- **WHEN** any supported page renders with the dark appearance active, whether from system preference or the stored header choice
- **THEN** grounds, text, borders, and soft fills MUST resolve from the graphite/indigo dark tokens

#### Scenario: Links and CTAs stay distinct in the dark appearance

- **WHEN** a link or indigo text accent renders next to a primary CTA in the dark appearance
- **THEN** the link or accent MUST use the light indigo `#A8B5FF`
- **AND** the CTA MUST keep the light-indigo `#A8B5FF` face with graphite `#181A20` label

### Requirement: Warm typography system

UI text and navigation MUST use Nunito with Noto Sans TC and established CJK fallbacks, loaded from self-hosted assets, in both appearances. Technical/specification values MUST use JetBrains Mono and tabular numerals without rounding exact values for tone. Normal reading text MUST use a 16px baseline and secondary explanatory text a 14px baseline; compact technical labels MUST remain readable. Long localized labels MUST wrap without losing distinguishing content or shrinking to fit. Hierarchy MUST use size, spacing and weight rather than widespread extra-bold small text.

#### Scenario: Typography follows the shared system in both appearances

- **WHEN** a supported page renders in either appearance
- **THEN** UI text MUST use Nunito + Noto Sans TC and technical values MUST use JetBrains Mono
- **AND** specification numbers MUST render with tabular numerals in their exact values

### Requirement: Shape and motion vocabulary

The shared shape vocabulary MUST use 10px control radii, 16px card radii and 20px large-container/dialog radii. Small tags and segmented selectors MUST retain pill treatments where appropriate. Static reading cards MUST remain flat and MUST NOT lift on hover or imply clickability. Actionable surfaces MUST provide visible hover and focus through border or surface changes; prominent shadows MUST be reserved for elevated overlays. Decorative movement MUST use transform/opacity only and MUST be disabled under prefers-reduced-motion. Surface-color feedback MUST not fade labels or reduce their required contrast.

#### Scenario: Shape and hover vocabulary apply across surfaces

- **WHEN** cards, buttons, tags, images, and popovers render on a supported page
- **THEN** each surface MUST use its role-appropriate radius and elevation
- **AND** static cards MUST stay stationary, while actionable surfaces MUST expose a distinguishable hover state without fading labels

#### Scenario: Reduced motion disables lift and entrance animations

- **WHEN** the user agent signals `prefers-reduced-motion`
- **THEN** hover lift and entrance animations MUST NOT animate

### Requirement: Interaction accessibility thresholds

Shared chrome and non-CAD interactive targets MUST offer at least 44px hit areas in both appearances. Keyboard focus MUST use a visible 3px theme-appropriate indigo indicator with sufficient contrast against adjacent surfaces. Dense CAD controls MUST remain operable at their established compact sizes. Selection, errors, stale previews and disabled actions MUST be understandable using text, symbols or structure in addition to color. Focus MUST NOT be obscured by sticky navigation, dialogs or fixed controls.

#### Scenario: Targets and focus meet thresholds

- **WHEN** a user interacts with links, buttons, tags, or theme and language controls on the shared chrome or a non-CAD page in either appearance
- **THEN** each target MUST offer at least a 44px clickable area
- **AND** keyboard focus MUST render a visible 3px theme-appropriate indigo outline

#### Scenario: CAD workspace keeps visible focus

- **WHEN** a user interacts with CAD workspace controls via keyboard
- **THEN** focus MUST render with the 3px theme-appropriate indigo outline token

### Requirement: Warm CAD viewport theme

CAD scene colors MUST resolve from semantic slots for background, major/minor grid, gizmo, model edges, measurements, hover, selection and face highlights. The scene MUST use a neutral light background in light appearance and graphite background in dark appearance. Grid lines MUST remain legible while subordinate to model contours, with major/minor hierarchy. XYZ axes MUST retain distinct X red/coral, Y green and Z blue semantics with appropriate dark variants; brand indigo MUST NOT replace all axes. Hover MUST use amber and selection MUST use a distinct blue/cyan highlight with an outline or other non-color cue. User-selected model colors MUST remain independent of brand tokens. Theme changes MUST update live without altering geometry, dimensions, camera framing, model revision, stale state or exports.

#### Scenario: Viewport follows the neutral theme per appearance

- **WHEN** the CAD viewport renders with the light or dark appearance active
- **THEN** the scene background, grids, edges, annotations, highlights, and gizmo MUST resolve from the neutral viewport tokens of that appearance

#### Scenario: Gizmo axis hue semantics persist across appearances

- **WHEN** the viewport gizmo renders in either appearance
- **THEN** the X axis MUST be coral-family, the Y axis success-green-family, and the Z axis info-blue-family, with brighter variants in the dark appearance

#### Scenario: Appearance switch re-themes without side effects

- **WHEN** the user switches appearance while a model is loaded
- **THEN** the viewport MUST re-resolve its neutral theme live
- **AND** the model geometry, parameters, camera framing, and export behavior MUST remain unchanged
