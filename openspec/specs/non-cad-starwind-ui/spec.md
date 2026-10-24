# non-cad-starwind-ui Specification

## Purpose

Provide a consistent, accessible, and source-owned UI foundation for the
localized Astro pages outside the CAD workspace while preserving the existing
Svelte CAD experience, routes, content, and interaction contracts.

## Requirements

### Requirement: Non-CAD pages share a consistent UI foundation

Localized homepage, chooser, documentation and About pages MUST share the paper/indigo/graphite color system, typography roles, focus treatment and 10px control/16px card/20px large-container shape vocabulary. Current navigation and selected controls MUST use restrained indigo emphasis; categories MUST remain understandable through text and structure. Static reading surfaces MUST NOT lift on hover. Interactive controls MUST expose clear hover, disabled and focus states.

The homepage MUST keep a friendly headline, explanation, primary model entry, secondary guide entry, model imagery, Desk/Wall routes, workflow guidance and author/support context. The chooser MUST use a compact left-aligned heading and bounded content width consistent with the homepage. About MUST use a readable author introduction with side-by-side portrait/text when space allows and stacked content when narrow. Documentation MUST use a left-aligned reading measure with wider diagrams/tables and containers reserved for checklists, illustrations and notices rather than every paragraph. Nunito/Noto Sans TC MUST serve UI/navigation, with JetBrains Mono for technical values. Public pages MUST remain readable without starting a CAD generation runtime.

#### Scenario: Localized non-CAD page renders its shared UI treatment

- **WHEN** a user opens a supported localized homepage, model-selection page, documentation page, or About page
- **THEN** the page MUST render its page-local buttons, cards, labels, dialogs, and separators with the paper/indigo/graphite design-system treatment of the active color scheme
- **AND** the navigation MUST use the shared stable shell with theme-appropriate indigo current-page indication
- **AND** the page MUST remain renderable without initializing a CAD generation Worker, WebAssembly CAD kernel, or Svelte CAD workspace; optional prebuilt documentation-scene enhancement MUST preserve a static accessible fallback

#### Scenario: Non-CAD controls expose usable interaction states

- **WHEN** a user hovers, focuses, disables, or activates a page-local control on a supported non-CAD page
- **THEN** the control MUST expose a visually distinguishable state, without making non-interactive reading content appear clickable
- **AND** its accessible name, destination, and existing action semantics MUST remain understandable

### Requirement: Existing non-CAD content and routing remain compatible

The refresh MUST preserve content meaning, metadata, routes, model identities and destinations, static preview fallbacks, localized accessible names and external support-provider boundaries. Model-entry actions MUST use consistent localized wording (調整模型 / Customize model), with a secondary details action where applicable. Approved action-label and hierarchy changes MUST NOT remove model descriptions, parameter information, guide instructions or alternative text. The refresh MUST NOT require React or alter catalog visibility, public model IDs or locale routing.

#### Scenario: Localized model selection remains behaviorally equivalent

- **WHEN** a user opens either localized model-selection page and interacts with a model card, details action, fallback link, or edit link
- **THEN** the same model names, descriptions, previews, details, and model CAD destinations MUST remain available
- **AND** the page MUST continue to avoid CAD runtime initialization

#### Scenario: Localized static pages retain their public contract

- **WHEN** a user opens the localized homepage, documentation page, or About page after the UI adoption
- **THEN** existing information, guide instructions, links, metadata, image alternative text and support actions MUST remain available in the selected locale, with approved action-label and layout changes
- **AND** external support choices MUST continue to open on the configured provider pages without collecting payment data in Shape Shortcut

### Requirement: Non-CAD theme, user preference, and localization remain complete

The non-CAD UI MUST work with system or explicit appearance preferences and preserve responsive access to all content. New visible labels, accessible names, menu actions and state messages MUST be available in Traditional Chinese and English. Long names and descriptions MUST wrap without removing distinguishing information, shrinking text to fit, or producing horizontal page overflow. Theme switching MUST preserve current navigation and content state.

#### Scenario: Non-CAD pages remain readable in both color schemes

- **WHEN** a user views a supported non-CAD page with either a light or dark system color preference or an explicit header theme selection
- **THEN** page surfaces, text, muted text, borders, controls, links, dialogs, and focus indicators MUST remain readable and distinguishable
- **AND** the page MUST not gain horizontal overflow solely because the color scheme changed

#### Scenario: Non-CAD theme selection persists across localized pages

- **WHEN** a user selects light or dark mode from the shared header on a supported non-CAD page
- **THEN** the page MUST update its surfaces, text, controls, borders, and focus indicators to the selected mode
- **AND** the selected mode MUST remain active after navigating between `/en/` and `/zh-Hant/` routes or reloading the page
- **AND** the page MUST remain renderable without initializing a CAD generation Worker, WebAssembly CAD kernel, or Svelte CAD workspace; optional prebuilt documentation-scene enhancement MUST preserve a static accessible fallback

#### Scenario: English and Traditional Chinese render equivalent UI states

- **WHEN** a user opens the same non-CAD route under `/en/` and `/zh-Hant/`
- **THEN** the page structure, controls, accessible names, and interaction states MUST be equivalent
- **AND** user-visible copy and metadata MUST use the selected locale

### Requirement: CAD workspace remains isolated from the non-CAD adoption

The CAD route MUST retain its Svelte island boundary, parameter semantics, worker lifecycle, persistence, validation and export behavior. Shared visual tokens MUST apply consistently, while separately specified CAD workspace/Playground layout and presentation changes remain permitted. Non-CAD component adoption MUST NOT introduce React or require Starwind components inside the Svelte CAD tree.

#### Scenario: CAD route continues to load the existing workspace

- **WHEN** a user opens a valid localized CAD route
- **THEN** the route MUST continue to mount the existing Svelte CAD workspace
- **AND** parameter editing, model generation, viewport interaction, restore, validation, and export actions MUST remain available with their existing semantics

#### Scenario: CAD route is not a target of non-CAD component replacement

- **WHEN** the non-CAD UI change is built and tested
- **THEN** no Svelte CAD component, Threlte/Three.js viewport component, CAD worker module, CAD state module, or CAD parameter store MUST be required to use the non-CAD UI foundation
