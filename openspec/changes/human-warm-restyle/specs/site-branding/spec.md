## MODIFIED Requirements

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
