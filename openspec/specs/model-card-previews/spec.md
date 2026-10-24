## Purpose

本文件定義模型選擇頁預覽圖片的來源、產生流程與靜態資產限制，確保使用者在進入 CAD workspace 前能辨識模型，同時維持模型 generator 與 export contract 的單一來源。

## Requirements

### Requirement: Canonical generator preview asset set

The project MUST provide one static light preview image and one static dark preview image for every visible catalog entry rendered by `/models`. A context-free entry MUST use the corresponding model definition's default parameters with a `<modelId>.webp` light asset identity and a `<modelId>-dark.webp` dark asset identity. A Desk or Wall OpenGrid entry MUST use its validated system preset with deterministic `<modelId>-<system>.webp` and `<modelId>-<system>-dark.webp` asset identities. Every preview MUST be generated from the corresponding model generator using a stable canonical viewport — the light variant under the light viewport theme and the dark variant under the dark viewport theme of the selected appearance — served from the same origin, and referenced through the metadata of the exact visible entry. Existing model ids, build keys, and CAD route slugs MUST remain unchanged.

#### Scenario: Every visible entry has a serviceable preview asset

- **WHEN** the static site is built and `/models` is rendered
- **THEN** every visible entry MUST resolve to a non-empty light preview asset and a non-empty dark preview asset
- **AND** both assets MUST be served from the same origin as `/models`
- **AND** a duplicated model id MUST resolve to the assets for its own system context

#### Scenario: Context preview uses the effective preset

- **WHEN** a context preview asset is captured
- **THEN** the generator MUST use the context preset when no valid scoped value is present
- **AND** the normal capture workflow MUST use a fresh or cleared browser storage context so developer state cannot alter the result
- **AND** the capture MUST use a stable initial camera and thumbnail presentation

#### Scenario: Dark variant uses the dark viewport theme

- **WHEN** a dark preview variant is captured
- **THEN** the generator MUST render with the dark appearance viewport theme
- **AND** the captured canvas background MUST match the dark viewport color of the selected appearance

#### Scenario: Preview presentation is consistent across the catalog

- **WHEN** a visitor compares visible model previews in one appearance
- **THEN** previews MUST use consistent neutral background, lighting and framing conventions that keep each model recognizable
- **AND** model-specific canonical angles MUST reveal distinguishing features without clipping the model
- **AND** framing MUST NOT imply a shared physical scale between different models or change actual dimensions, default model colors, saved user colors or exports

#### Scenario: Refreshed images match their surrounding plate

- **WHEN** the effective appearance changes on a static model page
- **THEN** the selected preview background and surrounding image plate MUST follow the same neutral appearance treatment without a leftover warm-brown rectangle
- **AND** the existing single accessible alternative text, reserved image dimensions and active-image failure fallback MUST remain intact

### Requirement: Repeatable preview capture and verification workflow

The project MUST provide a repeatable Chromium/Playwright workflow that derives its targets from the complete visible catalog entry set, including duplicated context entries. For each target it MUST visit the model route with its system query when present, clear or isolate browser storage, wait for the corresponding generator to reach a ready state, write the entry's production light and dark static assets in WebP format, and fail verification when an expected asset is missing, empty, or invalid. Verification MUST validate each asset as a decodable WebP image with the canonical 640×400 dimensions, and MUST assert each rendered canvas background against the expected color of its appearance.

#### Scenario: Capture regenerates context preview assets

- **WHEN** a developer runs the preview capture workflow
- **THEN** it MUST visit every visible context-free and context-aware entry
- **AND** it MUST write one light preview asset and one dark preview asset per visible entry
- **AND** Desk and Wall entries for the same model id MUST produce separate asset sets

#### Scenario: Single-entry capture regenerates both variants

- **WHEN** the capture workflow is restricted to a single visible entry
- **THEN** it MUST still write and verify that entry's light and dark preview assets

#### Scenario: Verification rejects an incomplete context asset set

- **GIVEN** a visible light or dark preview asset is missing, empty, or cannot be decoded as a WebP image
- **WHEN** the preview verification workflow runs
- **THEN** verification MUST fail
- **AND** the failure MUST identify the model id, context, appearance, or asset path

### Requirement: Preview assets remain presentation-only

Preview assets MUST represent the generator's visual output without introducing a second model-building or export implementation. The preview workflow MUST reuse the existing model-specific CAD generation and viewport rendering path, and preview assets MUST NOT become inputs to the Worker protocol, STEP export, STL export, or model validation logic.

#### Scenario: Context asset changes do not change CAD identity

- **WHEN** a system-specific preview is recaptured
- **THEN** only the presentation asset and entry metadata MAY change
- **AND** the model id, CAD route slug, Worker contract, and export contract MUST remain unchanged

### Requirement: Open Shelf has a canonical Desk preview asset

The visible Desk catalog entry for `opengrid-open-shelf` MUST reference `/model-previews/opengrid-open-shelf-desk.webp` and `/model-previews/opengrid-open-shelf-desk-dark.webp` with non-empty dimensions and alternative text identifying the Open Shelf. The assets MUST be generated by the existing preview capture workflow from the Open Shelf generator using the Desk preset and a clean storage context. The assets MUST remain presentation-only and MUST NOT be used by Worker validation, generation, or export.

#### Scenario: Preview capture includes Open Shelf

- **WHEN** the model preview capture workflow derives its targets from the visible catalog
- **THEN** it MUST visit `/cad/opengrid-open-shelf?system=desk&preview=thumbnail`
- **AND** it MUST write and verify `opengrid-open-shelf-desk.webp` and `opengrid-open-shelf-desk-dark.webp`

#### Scenario: Missing Open Shelf preview fails verification

- **GIVEN** an Open Shelf light or dark preview asset is missing, empty, or undecodable
- **WHEN** preview verification runs
- **THEN** verification MUST fail and identify the Open Shelf entry or asset path

#### Scenario: Preview remains separate from CAD identity

- **WHEN** an Open Shelf preview is regenerated
- **THEN** only the static presentation assets and metadata MAY change
- **AND** the model id, route, Worker builder, parameter contract, STEP export, and STL export MUST remain unchanged

### Requirement: Preview display follows the system color scheme

Static pages that render model preview images MUST present the light and dark preview variants through the site's shared class-based appearance mechanism, so each preview always matches the effective appearance — the system color-scheme preference when no manual choice is stored, or the header theme toggle's stored choice otherwise — without JavaScript beyond the existing theme toggle script. Both variants MUST reuse a single accessible alternative text per entry. When the visible preview asset fails to load, the page MUST keep the existing preview-unavailable text fallback behavior, and a failed load of the hidden variant MUST NOT trigger the fallback.

#### Scenario: Dark preference shows dark previews

- **WHEN** a static page with model preview images is viewed while the effective appearance is dark, whether from the system color scheme or a stored manual choice
- **THEN** each preview MUST present that entry's dark preview asset

#### Scenario: Light preference keeps light previews

- **WHEN** a static page with model preview images is viewed while the effective appearance is light, whether from the system color scheme or a stored manual choice
- **THEN** each preview MUST present that entry's light preview asset

#### Scenario: Header toggle switches previews without a reload

- **WHEN** the header theme toggle changes the effective appearance while a static page with model previews is open
- **THEN** each preview MUST switch to the other variant without a page reload or image layout shift

#### Scenario: Failed preview asset falls back to text

- **WHEN** the preview asset selected for the active appearance fails to load
- **THEN** the entry MUST show the existing preview-unavailable text fallback in place of the image
- **AND** the fallback MUST remain accessible to assistive technology
- **AND** a load failure of the hidden variant MUST NOT reveal the fallback while the visible variant renders
