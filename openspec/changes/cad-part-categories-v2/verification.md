# Apply verification — 2026-10-01

Change: `cad-part-categories-v2`, schema `spec-driven`.
Branch: `blesscat/cad-part-categories-v2`.

## Checks

- `pnpm check`（tsc --noEmit）：passed。
- `pnpm test:changed`：33 檔 379 tests 全數通過，含更新後的
  `tests/unit/model-catalog.test.ts`（分類齊全性＋`partitionByPartZone` 分區
  排序）與 `tests/unit/opengrid-system-entry-context.test.ts`（新分區順序）。
- `pnpm exec playwright test tests/e2e/home.spec.ts
  tests/e2e/localization.spec.ts tests/e2e/system-dark-mode.spec.ts
  --project=chromium`：30 passed、2 skipped（skip 為支援管道設定的既有
  gate）、0 failed。覆蓋：三區結構、工具區預設收合與鍵盤展開、分類徽章
  （zh-Hant/en）、首頁分類摘要（兩語系）、深色模式表面對比、窄屏單欄堆疊。
- `pnpm exec prettier --check`（所有變更 .ts/.astro）：passed。
- `openspec validate cad-part-categories-v2 --type change --strict`：passed。

## Implemented behavior

- `PartCategory = 'base' | 'container' | 'accessory' | 'tool' | 'test'`，
  `ModelDefinition.partCategory?`；16 個 chooser 可見 definition 全數標注，
  chooser 隱藏模型（box、modular-grid-base、hexagonal-column）不標。
- `partitionByPartZone()`：base／containers／tools 三桶，桶內保持 catalog 相
  對順序（註冊序已重排為 基礎→容器→工具/配件/測試件），未分類落 tools 尾端。
- `/models` Desk/Wall 子分組內三區：`model-zone-base`（Board＋Snap 置頂）→
  `model-zone-containers`（20rem min column 主視覺）→ `model-zone-tools`
  （原生 `<details>` 預設收合，summary 僅「工具與配件」文字）。既有
  family/subgroup heading、selection label、route、詳情 dialog、testid 不變。
- 每張可見卡片掛 `model-category-badge`＋`data-part-category`，文字＋顏色雙
  編碼：容器＝`bg-primary-soft`珊瑚、基礎＝`bg-success-soft`薄荷、其餘中性。
- `messages/models.ts` 新增 `models.category.*` 五鍵與 `models.zone.*` 三鍵
  （zh-Hant＋en）；`messages/home.ts` 新增 `home.explore.desk|wall
  .categorySummary`，首頁兩張系統起始卡各加一行分類摘要（無模型數量、無
  28 mm 格距）。

## Test-stability adjustments（測試隨版型調整）

- `home.spec.ts`／`localization.spec.ts`：收合區內的角色查詢與可見度斷言需
  先展開工具區；展開點擊後將指標移開（卡片 hover 上浮 -translate-y-0.5 會混
  進幾何斷言）；窄屏 same-x 容差放寬至 2px（工具面板 1px 邊框）；容器區首行
  卡數斷言取代原本的平面首行規則。
- `tests/unit/opengrid-system-entry-context.test.ts`：desk/wall 子分組順序
  斷言更新為分區後順序。

## Independent review gate

- Reviewer A（OpenSpec compliance）：見下方紀錄。
- Reviewer B（implementation／regression）：見下方紀錄。
