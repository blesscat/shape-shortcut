# Tasks: human-warm-restyle

## 1. Task 0 — catalog split (mechanical, equivalence-gated)

- [x] 1.1 Dump `JSON.stringify(zhHantMessages)` and `JSON.stringify(enMessages)` from the current catalog to temp files as the equivalence baseline
- [x] 1.2 Create `src/i18n/messages/` modules per namespace (home, models, chrome, docs, about, seo, cad-panels, parameters, cad-workspace), each exporting `zh` and `en` with `en: { [K in keyof typeof zh]: string }`
- [x] 1.3 Reduce `src/i18n/catalog.ts` to a merge shell re-exporting `zhHantMessages`/`enMessages`; keep the `src/i18n/index.ts` public API unchanged
- [x] 1.4 Verify equivalence: merged dumps match the baseline exactly (same keys, same values, zero copy edits); `pnpm typecheck` and unit locale tests pass
- [x] 1.5 Remove the stale `test.greeting` key in its own commit (both locales, plus any references)

## 2. Warm tokens and fonts

- [x] 2.1 Replace light token values in `src/styles/global.css` `@theme static` per design D1 (grounds, ink ramp, coral primary + hover + soft tint, success pair, borders, radius/shadow slots)
- [x] 2.2 Replace both dark blocks (media-query and `:root.dark`) with warm dark values; add `--color-accent-bright`, warm `primary-soft`/`success-soft`; remove the per-mode font-family switch
- [x] 2.3 Audit `src/styles/starwind.css` mappings for cycles or retired values; sweep `src/` and `scripts/` for retired hex constants (`#0b1326`, `#38bdf8`, `#3b82f6`, `#eef2f8`, `#171f33`, cyber/glow tokens) and migrate or remove them
- [x] 2.4 Add `@n/nunito` (600/700/800/900) and `@n/noto-sans-tc` (500/700/900, CJK subsets) via pnpm; drop `@n/hanken-grotesk`/`@n/inter`; swap imports in `src/layouts/SiteLayout.astro`; update `--font-sans`/`--font-mono`
- [x] 2.5 Verify the shared chrome renders warm in both appearances (header capsule, footer, support dialog, theme/language toggles) with no neon remnants; `pnpm build` succeeds

## 3. Warm CAD viewport

- [x] 3.1 Add the new viewport tokens to `global.css` (light + dark): hover, selection, gizmo-x/y/z, gizmo-label; update the 12 existing tokens per design D3
- [x] 3.2 Extend `CadViewportTheme` in `src/features/cad/viewport/theme.ts` with `hover`, `selection`, `gizmoX/Y/Z`, `gizmoLabel` fields + token readers; update `CAD_VIEWPORT_THEME_FALLBACK` to the warm light values
- [x] 3.3 Wire gizmo axis/label colors and hover/selection highlights through the theme in `CadViewportScene.svelte` (extend the existing background-override pattern); reduce `config.ts` gizmo constants to fallbacks
- [x] 3.4 Update/extend viewport e2e and unit expectations (gizmo, face hover, dark-mode suites) to the warm values; confirm no test pins retired hex

## 4. Copy rewrite (five pages + shared chrome)

- [x] 4.1 Replace zh-Hant values for home/docs/about/models-page copy and shared chrome keys from the prototype pages, keeping home-messaging constraints (three server-rendered claims, no STEP, no HSW, prototype disclosure in maker block/about, no 28 mm pitch or model-count emphasis in prominent spots)
- [x] 4.2 Fill `enMessages` values from `COPY-en.md` (friendly tone, not literal translation) for the same key set; type system enforces parity
- [x] 4.3 Set homepage `metaTitle`/`metaDescription` per the site-branding delta exact strings and home-messaging keyword rules; update any seo helper expectations
- [x] 4.4 Update copy-pinned e2e selectors (`home.spec.ts` nav/CTA strings and equivalents in models/docs/about suites) alongside the catalog edits; run the home-messaging e2e assertions

## 5. Page composition and component styling

- [x] 5.1 Restyle the shared navigation capsule (pill radius, `aria-current` coral soft tint + deep coral text) and header CTA per prototype
- [x] 5.2 Restyle buttons, cards, system tags (Desk coral-soft / Wall mint-soft / HSW neutral), spec tables, and popovers/dialogs to the warm shape vocabulary (20px cards, 24px containers, pill controls, soft→lift hover)
- [x] 5.3 Update the homepage composition to the prototype section order (hero + note, where-it-runs card, four-feature band, four-step desk band, desk-or-wall band, about teaser, support banner) across both locales
- [x] 5.4 Verify motion rules (transform/opacity only, 180–260ms, reduced-motion disables lift/entrance) and focus/target thresholds (3px coral outline, ≥44px) on restyled surfaces

## 6. Docs diagrams (dark-only warm)

- [x] 6.1 Warm the dark neutral slots in `scripts/desk-diagrams/palette.mjs` toward the warm dark tokens; keep accent hue coding untouched
- [x] 6.2 Regenerate dark diagram variants only; verify light SVGs remain byte-identical (`git status` shows no light SVG changes)

## 7. Model previews

- [x] 7.1 Update the capture suite's expected background constants to the warm viewport colors (light `#F7F3EF`, dark `#201A16`)
- [x] 7.2 Run `pnpm capture:model-previews`; verify both variants regenerate for every visible entry and verification passes

## 8. Acceptance sweep

- [x] 8.1 Contrast assertions: body/muted text ≥4.5:1 across key surfaces in both appearances; CTA white-on-coral ≈4.6:1 intact
- [x] 8.2 Dark acceptance: compare rendered dark pages against `dark-preview.html` baseline (grounds, bright coral links, panel layering)
- [x] 8.3 Final cross-cutting gate: full vitest suite, targeted e2e (home, models, system-dark-mode, cad-viewport-*, model-card-previews), and full dev-server e2e pass; `openspec validate human-warm-restyle`
