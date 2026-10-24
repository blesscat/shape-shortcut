# site-branding Specification

## Purpose

Establishes a consistent browser-facing identity for the multilingual Shape
Shortcut site through a recognizable favicon and clear localized document titles.

## Requirements

### Requirement: Shared Shape Shortcut favicon

Every localized public page MUST expose the same static, model-independent Shape Shortcut identity through its document head. The favicon MUST use a flat white geometric joining-S mark on an indigo rounded-square ground, without glow or gradients. Its silhouette and internal gap MUST remain recognizable at 16px and 32px; small-size variants MUST preserve the same identity. The site MUST provide an SVG icon, ICO fallback and touch icon with correct declared asset types/sizes. The navigation MUST use the same geometric mark beside the Shape Shortcut name. Identity MUST NOT depend on a CAD rendering or reading small lettering.

#### Scenario: Localized pages expose the shared favicon

- **WHEN** a user or crawler requests a supported localized page under
  `/zh-Hant/` or `/en/`
- **THEN** the rendered document head MUST contain a `rel="icon"` link to the
  shared static favicon asset
- **AND** the favicon link MUST use the same asset path for both locales
- **AND** the referenced asset MUST be available from the public site

#### Scenario: Favicon identity is independent of the selected model

- **WHEN** a user opens the localized homepage, model chooser, documentation
  page, or any supported CAD route
- **THEN** the page MUST expose the same Shape Shortcut favicon
- **AND** the favicon MUST NOT change to a model-specific preview or model-only
  icon

#### Scenario: Small icons remain recognizable

- **WHEN** the favicon is inspected at actual 16px and 32px tab sizes against light and dark browser chrome
- **THEN** the S silhouette and internal negative space MUST remain distinguishable without glow or fine-detail dependence
- **AND** SVG, fallback and touch assets MUST retain the same brand identity

#### Scenario: Navigation and browser identity agree

- **WHEN** a user opens any localized public route
- **THEN** the header mark and favicon MUST use the same geometric S identity
- **AND** the brand link MUST retain the accessible name Shape Shortcut

### Requirement: Localized Shape Shortcut document titles

Every localized public page MUST render a non-empty document title in the
selected locale and MUST identify the `Shape Shortcut` brand. The localized
homepage titles MUST be exactly `Shape Shortcut｜OpenGrid 模型客製化，調一調就能印`
for Traditional Chinese and `Shape Shortcut | OpenGrid customizer — tweak it, print it`
for English. Other pages MUST preserve their page-specific title content
while retaining the Shape Shortcut brand identity.

#### Scenario: Traditional Chinese homepage title

- **WHEN** a user or crawler requests `/zh-Hant/`
- **THEN** the document title MUST be `Shape Shortcut｜OpenGrid 模型客製化，調一調就能印`

#### Scenario: English homepage title

- **WHEN** a user or crawler requests `/en/`
- **THEN** the document title MUST be `Shape Shortcut | OpenGrid customizer — tweak it, print it`

#### Scenario: Non-home localized page keeps page context

- **WHEN** a user or crawler requests a localized model, documentation, or CAD page
- **THEN** the document title MUST be non-empty and localized
- **AND** it MUST contain `Shape Shortcut`
- **AND** it MUST retain enough page-specific context to distinguish the page from the homepage and other routes
