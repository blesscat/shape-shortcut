## Why

`/models` currently renders every chooser-visible model as an equal card inside
the Desk/Wall subgroups, so assembly tools（Snap Remover、Locating Post、
divider、Label Card）look exactly like the containers people actually install
things with（Grid Box、Round Box、Organizer Box、Open Shelf、OpenConnect
pieces）. The owner ratified a fixed part taxonomy and adopted the V2 chooser
layout（containers as hero cards, tools collapsed）from the internal spec
package (`.orca/drops/handoff-package-2.zip`, cad-redesign pages; V2 已拍板、
V1/V3 僅參考).

## What Changes

- Add an optional five-value part category to the model catalog:
  `base | container | accessory | tool | test`（基礎／容器／配件／工具／測試件）.
  Annotate the 15 chooser-visible OpenGrid entries plus `hsw-cell`; the
  chooser-hidden legacy models（`box`、`modular-grid-base`、
  `hexagonal-column`）stay unclassified and untouched.
- Rearrange each Desk/Wall subgroup on `/models` into three zones in a fixed
  order: pinned 基礎 row（Board + Snap）→ 容器 hero-card grid → a collapsed
  工具與配件 section（工具 → 配件 → 測試件）. Family headings, subgroup
  headings, selection labels, routes, and the details dialog stay unchanged.
- Show a text + color category badge on every chooser card（container = coral
  soft, base = mint soft, accessory/tool/test = neutral）. Cards keep their
  existing light/dark previews and 8:5 aspect.
- Add one localized category-summary line to the homepage Desk/Wall starting
  cards（friendly tone, no model counts, no new cards）.
- Update unit and e2e coverage for zone structure, collapsed-by-default tools,
  badge labels, and per-locale copy; the existing "first two cards are Board
  and Snap, adjacent on wide viewports" rule is preserved by the pinned 基礎
  zone.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `home-model-selection`: replace the flat OpenGrid entry-order requirement
  with per-subgroup zone ordering, restate Desk/Wall subgroup membership to
  match the current catalog, and add part-category taxonomy, zone
  presentation, badge, and homepage category-summary requirements.

## Impact

- `src/features/cad/model-catalog/`（types, per-definition annotations, and a
  zone-partitioning helper）, `src/pages/[locale]/models.astro`,
  `src/pages/[locale]/index.astro`, `src/i18n/messages/models.ts`,
  `src/i18n/messages/home.ts`.
- No changes to model IDs, routes, parameter contracts, geometry, exports, CAD
  workspace, playground, or viewport theme. Existing model IDs are
  intentionally preserved; no new OpenGrid component is added. Chooser-hidden
  legacy models（`box`、`modular-grid-base`、`hexagonal-column`）are not
  modified.
- Tests: extend `tests/unit/model-catalog.test.ts`; update
  `tests/e2e/home.spec.ts`, `tests/e2e/localization.spec.ts`, and
  `tests/e2e/system-dark-mode.spec.ts` where they assert chooser structure.
