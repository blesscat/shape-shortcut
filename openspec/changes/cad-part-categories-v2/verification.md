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

兩位獨立 reviewer（背景 worker，唯讀）於實作提交 `eed11f1` 上完成審查；
發現與處置如下。修復提交：`0f06630`。

### Reviewer A — OpenSpec compliance（agent 3573fe0a）：pass

- Spec delta 格式與 `cad-worker-recycle-debounce` 慣例一致；MODIFIED 兩條與
  main spec 逐字對上、ADDED 兩條無撞名；分區成員與 catalog 實況一致。
- tasks.md 勾選逐項屬實；`openspec validate --strict` 由 reviewer 本機重跑
  通過；design.md 五項 decision 與實作一致。
- 修復的 minor：proposal.md Impact 補列新建的 `ModelCard.astro` 與
  `tests/unit/opengrid-system-entry-context.test.ts`；design.md 補註最終
  i18n 鍵名（`home.explore.desk|wall.categorySummary`）；「鍵盤展開」原為
  無本覆蓋的宣稱 → `home.spec.ts` 補上 focus＋Enter 收合/重開斷言。
- 留待後續的 P3：main spec「首頁模型選擇」舊 8 入口清單的既有 drift
  （非本 change 引入）。

### Reviewer B — implementation／regression（agent c53a9af0）：conditional fail → 已修復

- Major（3 項，同一根因）：`opengrid-pillar`／`opengrid-divider`／
  `opengrid-snap-remover` 三支以 chooser 為入口的 per-model e2e 未展開
  收合工具區（`getByRole` 不含隱藏元素）→ 三支皆改為 pin `/zh-Hant/models`
  ＋展開 `model-zone-tools` 後斷言。
- 修復中發現的第四個同根因受害點：`model-card-previews.spec.ts`「model
  cards expose static previews…」走訪全部卡片，同樣需先展開兩個工具區 →
  已補展開步驟。
- 展開後暴露的既有問題（與本 change 無關，已一併修正並記錄）：
  - divider／snap-remover／pillar spec 期望裸路徑 href，但卡片連結自
    `localizedCadPathFor` 導入（main 8fbbe5f 的 models.astro 即如此）後
    一律帶 locale 前綴 → 期望值改為 `/zh-Hant/cad/...`，並 pin locale
    避免 `/models` 依瀏覽器語系漂移。
  - divider spec 的頁面級 `checkbox toHaveCount(1)` 寫於 #160（雙色飾圈）
    之前 → 改為 `opengrid-divider-top-rim-enabled` 精準斷言＋count(2)。
- Minor（2 項）：`localization.spec.ts` 固定 250ms 等待 → 改為卡片位置
  rAF 穩定輪詢；`home.spec.ts` 窄屏容差註解「collapsed」→「expanded」。
- P3（已順手修）：`partitionByPartZone` 未分類比較 `Infinity - Infinity =
  NaN` → 改用 `Number.MAX_SAFE_INTEGER` 哨兵值，行為不變（unit 19/19 重跑
  通過）。
- P3（記錄不處理）：重排 `modelDefinitions` 會改變 sitemap `<url>` 與
  parameters store JSON 的 key 順序，兩者皆 id-keyed 無行為依賴，相關
  unit tests 全綠。

### 既有失敗（非本 change 引入，已於 main 重現）

- `opengrid-divider.spec.ts`「rejects a planar footprint above 500 mm」：
  alert 顯示通用訊息「參數 輸入無效…」而非 500 mm 限制文案。在 main
  `8fbbe5f` 上重跑同測試同樣失敗（:138），屬 CAD 參數驗證路徑的既有問題
  （本 change 未觸及該路徑）。留待後續獨立修復。

### Review 後最終檢查

- `pnpm exec tsc --noEmit`：passed。
- `pnpm vitest run tests/unit/model-catalog.test.ts
  tests/unit/opengrid-system-entry-context.test.ts`：19 passed。
- `pnpm exec playwright test tests/e2e/opengrid-pillar.spec.ts
  tests/e2e/opengrid-divider.spec.ts tests/e2e/opengrid-snap-remover.spec.ts
  tests/e2e/model-card-previews.spec.ts:276 tests/e2e/localization.spec.ts
  tests/e2e/home.spec.ts --project=chromium`（提交 `0f06630` 後分割重跑）：
  38 passed、2 skipped；唯一失敗為上節既有問題（main 重現）。
- `pnpm exec prettier --check`（所有再動過的檔案）：passed。
