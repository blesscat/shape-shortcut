## Context

`@custom-variant max-cad` is defined as `@media (max-width: 760px)` in
`src/styles/global.css`. `CadWorkspace.svelte` renders a two-column grid with
`CadWorkspacePanel` sticky on the left above the breakpoint and a single
stacked column below it. `Playground.svelte` follows the same pattern with its
sidebar. Both pages mount their Svelte islands with `client:only="svelte"`, so
browser-only APIs are safe during render.

## Goals / Non-Goals

- Goals: one shared drawer component; mobile-only behavior; a translucent
  sheet that keeps the model visible; the viewport stays interactive; desktop
  stays untouched.
- Non-Goals: drag/snap gestures (fixed 65dvh height with internal scroll in
  this change), backdrop blur, viewport height changes, and relocating the
  playground per-instance export (it stays inside the drawer for v1, explore
  option A).

## Decisions

### Decision: Shared controlled drawer component

Add `src/components/cad/BottomParameterDrawer.svelte`, a Svelte 5 component
taking `open`, `onClose`, `label`, and a snippet for content. The sheet renders
`fixed inset-x-0 bottom-0 z-30 h-[65dvh] rounded-t-2xl border-t border-border-card bg-panel/75`
with an internally scrolling region (`overflow-y-auto`) and bottom padding that
includes `env(safe-area-inset-bottom)`. There is no backdrop element; taps
outside the sheet reach the viewport.

### Decision: Breakpoint state via matchMedia

Each surface keeps `let isNarrow = $state(false)` synced with
`matchMedia('(max-width: 760px)')` in an `$effect` with a change listener, so
the markup branch and the CSS variant agree on the same 760 px boundary.
`client:only` mounting guarantees `matchMedia` availability.

### Decision: Collapsed pill with status dot

A fixed bottom pill opens the drawer: testid `cad-params-pill` (workspace) and
`playground-sidebar-pill` (playground), with `aria-expanded` and
`aria-controls`. The workspace pill carries a status dot: amber while the
committed preview is stale, red while field validation errors exist, hidden
otherwise. The playground pill has no status dot.

### Decision: Focus and dismissal

Opening moves focus to the drawer close button; Escape closes the drawer and
returns focus to the pill. The drawer is non-modal (`role="region"`, no focus
trap, no `aria-modal`), so orbit gestures on the viewport keep working while it
is open.

### Decision: Workspace export cluster stays outside the drawer

Below the breakpoint the workspace renders its export, retry, and
download-settings buttons as a floating cluster anchored to the top-end corner
of the viewport container, visible regardless of drawer state. Disabled states
follow the existing `canExport` / stale / recoverable-error rules. The content
inside the drawer keeps restore-defaults, the parameter controls, and the
3MF notes.

### Decision: z-order

Drawer at z-30; the floating export cluster and the pill sit above it; the
progress indicator and error toast keep or receive a stacking order above the
drawer so CAD progress and failures stay visible while the drawer is open.

### Decision: i18n keys

Add to both `zh-Hant` and `en` catalogs (key parity is enforced by the mapped
type in `messages/*/index.ts`): `cad.drawer.title`, `cad.drawer.open`,
`cad.drawer.close`, `cad.drawer.status.stale`, `cad.drawer.status.invalid`,
`playground.drawer.title`, and `playground.drawer.open`.

### Decision: No viewport resize

The viewport keeps its current height classes. Opening the drawer overlays it,
so the committed-preview contract (no camera pose change from parameter input;
refit only on size change or a new revision) is untouched.

## Risks / Trade-offs

- Pure alpha over the WebGL canvas keeps GPU cost flat (no backdrop filter)
  but reduces contrast behind the lower form rows; mitigated by 75% alpha and
  the solid top border edge.
- The matchMedia branch duplicates content between the desktop panel and the
  mobile drawer markup; acceptable because exactly one branch renders at a
  time (Svelte if/else).
- A fixed height without snap points may need a second pass if 65dvh proves
  too short on small phones; internal scroll keeps it usable meanwhile.

## Migration Plan

1. Add the drawer component and i18n keys (pure addition).
2. Switch `CadWorkspace.svelte` below the breakpoint to pill + drawer +
   floating export cluster; update the stacked-layout e2e expectations.
3. Switch `Playground.svelte` below the breakpoint to pill + drawer; extend
   mobile playground coverage.
4. Validate with `openspec validate --strict`, `pnpm test:changed`, typecheck,
   formatting, and targeted Playwright specs.

## Open Questions

None. Explore-mode decisions: fixed 65dvh height, pure alpha, workspace export
outside the drawer, playground keeps per-instance export inside the drawer
(option A).
