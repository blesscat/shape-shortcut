## MODIFIED Requirements

### Requirement: Non-CAD pages share a consistent UI foundation

The localized homepage, model-selection page, documentation page, and About
page MUST use the appearance defined by the Human 親和系 warm design system
of the active color scheme: white/warm surfaces with coral primary actions
in light appearance, and warm dark grounds with bright coral links in dark
appearance. The shared treatment MUST cover page surfaces, interactive
actions, status labels, and content groupings, including the system's
signature treatments: a capsule pill navigation whose active page
(`aria-current`) renders on the coral soft tint with deep coral text,
fully-pill primary buttons that lift on hover (rise with a deeper soft
shadow, never gray or faded), cards with 20px radius and soft shadow that
lift on hover, system tags tinted by system (Desk on coral soft tint, Wall
on mint soft tint, HSW on neutral), spec tables on rounded soft surfaces
with hairline separators, and popovers/dialogs at 24px radius. The homepage
MUST follow the warm system's layout composition: a friendly hero with
headline, lede, dual actions, and a starting note; a where-it-runs summary
card; an icon-led four-card feature band; a four-step desk-system workflow
band; a desk-or-wall routes band; an about teaser; and a support banner.
The model-selection and About pages MUST apply the same centered
page-header vocabulary; the documentation page MUST keep its left-aligned
reading layout while sharing the same container and card vocabulary.
Typography MUST follow the warm system (Nunito + Noto Sans TC UI text with
JetBrains Mono technical labels in both appearances). The shared treatment
MUST expose readable hover, disabled, and keyboard-focus states without
requiring a client-side CAD runtime.

#### Scenario: Localized non-CAD page renders its shared UI treatment

- **WHEN** a user opens a supported localized homepage, model-selection page, documentation page, or About page
- **THEN** the page MUST render its page-local buttons, cards, labels, dialogs, and separators with the warm design-system treatment of the active color scheme
- **AND** the navigation MUST render as a capsule with the active page on the coral soft tint in both appearances
- **AND** the page MUST remain renderable without initializing a CAD Worker, WebAssembly CAD kernel, WebGL renderer, or Svelte CAD workspace

#### Scenario: Non-CAD controls expose usable interaction states

- **WHEN** a user hovers, focuses, disables, or activates a page-local control on a supported non-CAD page
- **THEN** the control MUST expose a visually distinguishable state, with hover lifting rather than fading or graying
- **AND** its accessible name, destination, and existing action semantics MUST remain understandable
