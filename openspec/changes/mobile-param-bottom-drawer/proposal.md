## Why

On viewports at or below the 760 px cad breakpoint, the CAD workspace stacks
the whole parameter panel above the 3D viewport, and the playground stacks its
sidebar above the scene viewport. Adjusting a parameter and watching the model
update require separate scroll round trips on a phone, which makes both
workspaces unfriendly to mobile use.

## What Changes

- Add a shared `BottomParameterDrawer` Svelte component used only at or below
  the 760 px breakpoint by both the CAD workspace and the playground.
- Collapse parameter adjustment behind a persistent bottom pill; opening the
  drawer shows the panel content in a 65dvh bottom sheet with a semi-transparent
  panel background (plain alpha, no backdrop or blur) so the model stays
  visible behind it.
- Keep the drawer non-modal: no backdrop element, and the viewport remains
  interactive for orbit while the drawer is open.
- Move workspace export, retry, and download-settings actions out of the panel
  into a floating cluster anchored to the viewport so they stay reachable while
  the drawer is open or collapsed; invalid/stale generations remain disabled
  per the existing contract.
- Move the playground sidebar content (add component, instance list, selected
  instance editor including per-instance export) into the drawer; the page
  header keeps view mode, grid size, and scene import/export.
- Preserve the desktop layout unchanged: the sticky side panel remains for
  viewports above the breakpoint.
- Keep the existing stable-restore contract: drawer content keeps the
  component-level restore-defaults control and the narrow-panel
  no-horizontal-overflow behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cad-workspace`: change the narrow-viewport workspace layout to a bottom
  parameter drawer with a translucent sheet, persistent pill, and
  viewport-anchored export actions.
- `cad-playground`: change the narrow-viewport sidebar to the same bottom
  drawer pattern.

## Impact

- Affects `CadWorkspace.svelte` markup and `Playground.svelte` markup; adds
  `BottomParameterDrawer.svelte` and i18n keys for the pill and drawer in the
  zh-Hant and en catalogs.
- Updates the stacked-layout e2e expectations and adds mobile drawer coverage
  for the workspace and playground.
- No model IDs, parameter contracts, export formats, generation scheduling, or
  Worker behavior change. Viewport height, camera fitting, and dimension
  behavior stay unchanged; opening the drawer overlays the viewport without
  resizing it, so no camera refit is triggered.
- No new runtime dependency, backend service, branch, or pull request beyond
  the current working branch; no new OpenGrid catalog component, so the
  OpenGrid naming convention is not triggered.
