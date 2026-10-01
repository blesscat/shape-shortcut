## 1. 分類資料層

- [x] 1.1 在 `model-catalog/types.ts` 新增 `PartCategory` 五值型別與 `ModelDefinition.partCategory?`，附 JSDoc 說明語意（基礎＝Board＋Snap；chooser 隱藏模型可不標）
- [x] 1.2 為 16 個 chooser 可見 definition 標注 `partCategory`：opengrid／opengrid-snap＝base；stackable-box／stackable-cylinder／organizer-box／open-shelf／openconnect-shelf／openconnect-organizer／openconnect-tissue-box／hsw-cell＝container；pillar／divider／label-card／wall-cover＝accessory；snap-remover＝tool；label-slot-test＝test；`box`／`modular-grid-base`／`hexagonal-column` 不標
- [x] 1.3 新增 exported `partitionByPartZone()`（base/containers/tools 三陣列，rank stable sort，未分類落 tools 尾端）並擴充 `tests/unit/model-catalog.test.ts`：16 個可見模型全有分類、hsw-cell 進容器、分區排序與未分類行為

## 2. 選擇模型頁 V2 版型

- [x] 2.1 `models.astro` 在每個 subgroup 內輸出三區（`model-zone-base`／`model-zone-containers`／`model-zone-tools`），基礎區置頂、容器區 min column 加大、family/subgroup 既有 heading 與 testid 不變
- [x] 2.2 工具與配件區用原生 `<details>`/`<summary>` 預設收合，summary 僅文字「工具與配件」不含數量，展開原地顯示 compact 卡片；基礎／容器區以 `aria-label` 標記
- [x] 2.3 每張可見卡片加分類徽章（`model-category-badge`＋`data-part-category`，文字＋顏色雙編碼，token 對應 design.md 對照表）；預覽圖、詳情 dialog、selection label 維持現狀
- [x] 2.4 確認深色模式徽章配色與 `-dark` 預覽正常、無新增 animation

## 3. i18n 與首頁

- [x] 3.1 `messages/models.ts` 新增 `models.category.*` 五鍵與 `models.zone.base`／`models.zone.containers`／`models.zone.tools`（zh-Hant＋en）
- [x] 3.2 `messages/home.ts` 新增 `home.system.deskCategorySummary`／`home.system.wallCategorySummary`（zh-Hant＋en，親和腔、無模型數量與 28 mm），首頁 Desk/Wall 起始卡各加一行摘要
- [x] 3.3 `localization.spec.ts` 補分類徽章與首頁摘要的兩語系斷言

## 4. e2e 與驗證

- [x] 4.1 更新 `home.spec.ts`：三區結構、Desk 基礎區前兩張 Board/Snap 相鄰保留、容器區可見順序、工具區預設收合＋鍵盤展開
- [x] 4.2 跑 scoped tests：`pnpm test:changed`、指定 e2e（home／localization／system-dark-mode），修正所有失敗
- [x] 4.3 `pnpm check`＋`pnpm format:check`，並執行 `openspec validate cad-part-categories-v2 --type change --strict`
- [ ] 4.4 整理 `verification.md`（測試結果與 scenario 覆蓋）與 PR 摘要
