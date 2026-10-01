# Proposal: human-warm-restyle

## Why

The site's current visual identity — Kinetic Utility (light) and Minimalist
Futurism / Cyber-CAD Industrial (dark) — is being replaced by the **Human
親和系** warm design delivered as a handoff package (`design-spec-4.0.0` →
`4.2.0-viewport`): `MIGRATION.md`, `design-tokens.css` (Parts A–D), five
prototype pages, `dark-preview.html` acceptance baseline, and `COPY-en.md`.
The same change adopts the designer's friendly conversational copy
(親和腔) for the five public pages in Traditional Chinese and English.

## What Changes

- **Global tokens**: light appearance becomes warm white surfaces with coral
  primary `#CF4429`; dark appearance becomes warm dark brown grounds
  (`#201A16` family) with bright coral `#FF8A70` text links and unchanged
  coral CTA. Radius (12/20/24/pill), soft shadows, and 180–260ms
  transform/opacity motion vocabulary apply site-wide.
- **Typography**: Nunito + Noto Sans TC for UI text, JetBrains Mono retained
  for technical values; fonts stay self-hosted via the existing `@n/*`
  pattern. The light/dark font-family switch (Hanken/Inter) is removed.
- **CAD viewport**: the 12-color viewport theme is re-derived from the warm
  palette (`design-tokens.css` Part D values, adopted as values not key
  names); gizmo axis colors move from hard-coded constants to CSS tokens
  (X coral / Y success green / Z info blue, bright variants in dark);
  hover/selection highlight become separate tokens; `theme.ts` fallback
  constants are synced. Geometry, parameters, and export behavior unchanged.
- **Copy (five pages + shared chrome)**: 親和腔 Traditional Chinese from the
  prototype pages and friendly English from `COPY-en.md`, routed through the
  existing i18n catalog. Homepage titles refresh (retaining the `OpenGrid` +
  `Shape Shortcut` keywords). CAD workspace strings (`panel.*`,
  `parameter.*`, `cad.*`) are intentionally untouched — a future change may
  rewrite them.
- **catalog split (Task 0)**: `src/i18n/catalog.ts` (2,165 lines) is
  mechanically split into per-namespace modules under `src/i18n/messages/`
  with an equivalence gate (merged output identical before/after, zero value
  changes) before any copy edits.
- **Assets**: handoff images/favicon are byte-identical to repo assets, so no
  binary migration from the package. Model previews are recaptured under the
  new viewport themes (automated capture workflow) with capture
  expected-color constants updated. Dark docs diagrams regenerate with warmed
  neutral palette slots; light diagrams stay byte-identical.
- **Not migrated** (per `MIGRATION.md` §3): `cad.html` simulated flow (only
  its visual shell informs the CAD page), `styles.html` comparison board, and
  the prototype footer disclaimer.

## Capabilities

### New Capabilities

- `human-warm-visual-system`: the warm design token system — light/dark
  palettes, typography, radius/shadow/motion vocabulary, contrast and target
  accessibility thresholds, and the warm CAD viewport theme semantics.

### Modified Capabilities

- `system-dark-mode`: requirements 1, 3, and 5 reference the retired
  Kinetic/Cyber-CAD systems and neon viewport treatment; they are rewritten
  for the warm system and warm viewport while preserving selection,
  persistence, contrast, and responsive behavior.
- `non-cad-starwind-ui`: requirement 1 pins the retired systems' signature
  treatments and homepage composition; it is rewritten for the warm
  vocabulary (pill navigation, coral CTA with hover lift, 20px cards, system
  tag tints, new homepage section composition).
- `site-branding`: the homepage exact-title requirement is refreshed to the
  new friendly titles (still containing `Shape Shortcut`; the new strings
  also restore the `OpenGrid` keyword, resolving a pre-existing drift between
  this spec and the live catalog).

## Impact

- **Code**: `src/styles/global.css` (+ `starwind.css` mapping audit),
  `src/layouts/SiteLayout.astro` (font imports), `src/features/cad/viewport/`
  (`theme.ts`, `config.ts`, `CadViewportScene.svelte`), `src/i18n/catalog.ts`
  → `src/i18n/messages/*`, five `[locale]` pages and shared components,
  `scripts/desk-diagrams/palette.mjs`.
- **Assets**: `public/model-previews/*` (recaptured), `public/docs/desk-system/*-dark.svg`
  (regenerated). No handoff binaries copied.
- **Dependencies**: add `@n/nunito`, `@n/noto-sans-tc` (self-hosted font
  packages).
- **Tests**: e2e suites pinning current copy strings (`home.spec.ts` 等),
  dark-mode and viewport suites, preview capture/verification constants;
  unit locale tests unchanged in behavior.
- **Spec sync**: deltas for the four capabilities above; all other existing
  specs (home-messaging, multilingual-site, model-card-previews,
  docs-diagram-pipeline, site-navigation) remain satisfied by construction.
