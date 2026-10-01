# Design: human-warm-restyle

## Context

See proposal.md for motivation. Current state facts that shape the approach:

- `src/styles/global.css` owns the only `@theme static` token set (semantic
  shadcn-style names) with three dark blocks: media-query, `:root.dark`, and
  the `.light` override path; `starwind.css` maps Starwind variables onto
  these tokens and must not redeclare `--color-*` names (custom-property
  cycles).
- The CAD viewport reads 12 scene colors at runtime from CSS custom
  properties (`src/features/cad/viewport/theme.ts`), already observing both
  the `prefers-color-scheme` media query and `.dark` class mutations; gizmo
  axis colors and per-axis label colors are hard-coded constants in
  `src/features/cad/viewport/config.ts` (`CAD_VIEWPORT_GIZMO`), and
  `CadViewportScene.svelte` already overrides the gizmo background from the
  live theme (pattern to extend).
- All copy flows through `src/i18n/catalog.ts` (2,165 lines;
  `zhHantMessages` source of truth, `enMessages` type-constrained to the
  same key set). Consumers import only from `src/i18n/index.ts`.
- Handoff assets are byte-identical to repo assets (favicon, light/dark
  model previews, avatar, and the light diagram color ramp) — the package is
  a specification, not an asset shipment.
- Fonts are self-hosted via `@n/*` packages imported in
  `src/layouts/SiteLayout.astro`.

## Goals / Non-Goals

**Goals:**

- One warm token source for shared chrome, static pages, and CAD surfaces,
  preserving the existing appearance-selection mechanics (media query +
  `.dark`/`.light` classes, persistence, 760px breakpoint).
- Minimal-diff token swap: existing semantic names keep their meaning so
  component class churn stays near zero.
- Copy rewrite routed entirely through the i18n catalog with zh/en key
  parity enforced by the type system.

**Non-Goals:**

- CAD workspace copy tone (`panel.*`, `parameter.*`, `cad.*`) — future
  change.
- Adopting the handoff's `--ss-*` / `--vp-*` token names verbatim; values
  are the design truth, repo keeps its own naming.
- Font CDN loading, new sections beyond the prototype composition,
  Starwind replacement, or any interaction/route/catalog change.

## Decisions

### D1. Token swap inside the existing semantic architecture

Replace values in `global.css` `@theme static` + dark blocks, keeping all
existing `--color-*` names. Key mapping (light → dark):

| Slot | Light (warm) | Dark (warm) |
| --- | --- | --- |
| `background`/`page` | `#FFFFFF` | `#201A16` |
| `panel`/`card` | `#FFFFFF` on `#FFF7F2`/`#F6F1ED` panels | `#2A231E`, raised `#332A24` |
| `foreground`/`ink` | `#362A24` ramp (`#6E5F57`, `#8A7B72`) | `#F4EDE7` ramp (`#B8A99F`, `#94867C`) |
| `primary` | `#CF4429` (+`primary-strong` same; hover `#B93A23`) | `#CF4429` CTA; links use `accent-bright` `#FF8A70` |
| borders | warm hairline `rgba(54,42,36,.12)` | `rgba(244,237,231,.14)` |

New tokens kept minimal: `--color-primary-soft` (`#FFE9E2` light /
`rgba(214,69,43,.16)` dark), `--color-success` + `--color-success-soft`
(`#1F7A3A`/`#EAF6EE`; dark `#5CD68A`/`#23392B`), `--color-accent-bright`
(dark links `#FF8A70`), plus radius/shadow custom properties
(`--radius-card: 20px`, `--shadow-soft`, `--shadow-lift` equivalents mapped
onto existing shadow slots). The per-mode font-family switch is removed
(one family pair in both modes). Cyber-CAD-only tokens (`--color-neon`,
cyber accents, glow shadows) are removed after auditing usage.
Alternative considered: pasting Part B `@theme` verbatim — rejected because
it would fork the naming and break the existing dark-override chain.

### D2. Fonts stay self-hosted

Add `@n/nunito` (600/700/800/900) and `@n/noto-sans-tc` (500/700/900 with
CJK subsets), drop `@n/hanken-grotesk`/`@n/inter` imports, keep
`@n/jetbrains-mono`. Swap happens in `SiteLayout.astro`; `--font-sans`
updates in both appearance blocks. Rejected the handoff's Google Fonts
`<link>` approach: the repo convention is self-hosted, offline-capable
fonts.

### D3. Viewport theme: extend, don't rewrite

Map Part D values onto the existing token/theme fields and extend the theme
with the slots Part D adds:

| Repo token | Light | Dark | Source |
| --- | --- | --- | --- |
| `--color-viewport` (bg) | `#F7F3EF` | `#201A16` | Part D |
| `--cad-viewport-grid-major/minor` | `rgba(54,42,36,.18/.07)` | `rgba(244,237,231,.16/.06)` | Part D |
| `--cad-viewport-edge` | `#3A2E27` | `#CBBFB4` | Part D |
| `--cad-viewport-annotation(-label)` | `#0284C7` (label `#6E5F57`) | `#6FC7F2` (label `#B8A99F`) | Part D measure + ink-2 derivation |
| `--cad-viewport-hover` (new) | `#FFB454` | `#FFC57E` | Part D |
| `--cad-viewport-selection` (new) | `#D6452B` | `#FF8A70` | Part D |
| `--cad-viewport-face-highlight` | `rgba(255,180,84,.35)` | `rgba(255,197,126,.30)` | Part D |
| `--cad-viewport-gizmo-x/y/z` (new) | `#C8401F`/`#1F7A3A`/`#0284C7` | `#FF8A70`/`#5CD68A`/`#6FC7F2` | Part D |
| `--cad-viewport-gizmo-label` (new) | `#362A24` | `#F4EDE7` | Part D (single label token replaces per-axis label constants) |
| gizmo background | `#FFF7F2` | `#2A231E` | derived (panel token, keeps 0.84 opacity) |
| lights sky/ground/key/fill | `#FFFFFF`/`#C9BCB2`/`#FFFFFF`/`#F3EAE2` | `#E8DDD3`/`#4A3E36`/`#FFF6EF`/`#EAD9CD` | derived (Part D does not cover lighting; warm-neutral derivation, not spec-pinned) |

`theme.ts` gains `hover`, `selection`, `gizmoX/Y/Z`, `gizmoLabel` fields
with token readers; `CAD_VIEWPORT_THEME_FALLBACK` is updated to the warm
light values (light-mode thumbnails render from it);
`CadViewportScene.svelte` extends the existing gizmo override pattern to
axis/label colors; `config.ts` constants become fallbacks only. Existing
tests are token-driven (no pinned neon hex found), so impact is expected to
be constant updates, not rewrites.

### D4. Catalog split (Task 0) with an equivalence gate

Split `catalog.ts` into per-namespace modules under `src/i18n/messages/`
(home, models, chrome for navigation/support/footer, docs, about, seo,
cad-panels, parameters, cad-workspace), each exporting `zh` and a
type-constrained `en: { [K in keyof typeof zh]: string }`. `catalog.ts`
becomes a merge shell re-exporting `zhHantMessages`/`enMessages`; public
API in `i18n/index.ts` unchanged. Gate: before splitting, dump
`JSON.stringify` of both catalogs to temp files; after splitting, the
merged output must be identical (values and key parity, zero copy edits).
The stale `test.greeting` key is removed in a separate commit from the
copy rewrite.

### D5. Copy routing and constraints

Prototype zh copy and `COPY-en.md` land as value replacements for existing
keys (plus new keys only where the composition adds sections). Binding
constraints: three home claims stay server-rendered; no STEP claims; no
HSW in title/meta or as a featured system; prototype disclosure stays in
the maker block/about; grid pitch (28 mm) and model counts stay out of
prominent positions; specification numbers keep exact values. Homepage
titles are the exact strings in the site-branding delta. Nav/support
footer copy follows COPY-en.md's shared-chrome section.

### D6. Previews and diagrams

- Model previews: update the capture suite's expected background constants
  to the new viewport colors, then run `pnpm capture:model-previews` to
  refresh both variants for every visible entry (light bg change is subtle
  but real: `#eef2f8` → `#F7F3EF`).
- Docs diagrams: warm only the dark neutral slots in
  `scripts/desk-diagrams/palette.mjs` (background/heading/body/muted/arrow
  toward `#201A16`-family tokens); accent hue slots keep their color coding;
  regenerate dark variants only so light SVGs stay byte-identical per the
  docs-diagram-pipeline requirement.

### D7. Test scoping per operations guidance

Affected-first during work (`pnpm test:changed`), then because this change
is cross-cutting: full vitest suite, targeted e2e (home, models,
system-dark-mode, cad-viewport-*, model-card-previews), the capture
workflow, and a final full dev-server e2e pass as the pre-publish gate.
Copy-pinned selectors in e2e tests are updated alongside the catalog edits
in the same task.

## Risks / Trade-offs

- [Warm ramp contrast on tinted surfaces misses 4.5:1] → acceptance task
  runs contrast assertions on body/muted text in both appearances before
  publish.
- [Noto Sans TC self-hosted subset weight/coverage gaps] → verify the `@n`
  package exposes the needed weights and CJK coverage during the font task;
  system CJK fallbacks stay in the stack.
- [Preview recapture flakiness in the worktree] → capture workflow is
  deterministic by spec; if it fails, fix the workflow, never hand-edit
  assets.
- [Token swap misses a hard-coded color] → grep sweep for retired hex
  values (`#0b1326`, `#38bdf8`, `#3b82f6`, `#eef2f8`, `#171f33`…) across
  `src/`, `scripts/`, and tests as part of the acceptance task.
- [Copy rewrite silently drops a required claim] → home-messaging e2e
  assertions stay the source of truth; run them immediately after the copy
  task.

## Migration Plan

Task order: catalog split (gated) → tokens + fonts → viewport → copy +
titles → page composition/component styling → diagrams → previews →
acceptance sweep. Rollback: single branch revert; no data, route, or
storage migrations involved.

## Open Questions

- Final warm lighting values for the dark viewport scene (D3 table) may be
  fine-tuned during implementation against `dark-preview.html` parity
  without spec impact — the spec pins structure and Part D-defined colors
  only.
