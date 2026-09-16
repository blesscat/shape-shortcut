## 1. 合約層：參數與推導

- [x] 1.1 擴充 `OpenGridDividerParameters`（alignmentMode、targetBoxGridsX/Y、endClearance、pegLengthMode、pegDiameterIncrement；柱徑固定 4.9 不開放調整）與 `OPENGRID_DIVIDER_CONFIGURATION` 預設值／範圍，更新 `validateOpenGridDividerParameters` 接受舊 6 鍵快照並以預設值補齊，發出新欄位診斷；驗證：`tests/unit/opengrid-divider.test.ts` 新增欄位範圍/步階/舊快照升級案例全綠
- [x] 1.2 實作 `openGridDividerLatticeStationsFor`、`openGridDividerBoxFitPegCentersFor`、`openGridDividerArmStationsFor`（盒內對位端站 1.275+endClearance、跨距置中、接點偏移、單臂無牆尾）與 `openGridDividerAlignmentInfoFor`（錨點/中心柱/橫向指引）；驗證：新單元測試覆蓋 4.5/4.5（0,±28,±56；接點偏離格點不發接點柱）、5/5（±7,±35,±63 無中心柱）、4.5×5 橫向指引、方向和超標拒絕、L/T/cross 僅自由模式
- [x] 1.3 更新 bounds 與檔名函式：bounds 反映 pegLengthMode 深度（Z=-3.8/-2/-5），檔名追加 `-a…-g…x…-c…-p…-d…-x…-y…`；驗證：單元測試斷言三種 pegLengthMode 的 bounds 與新舊快照檔名相異且具決定性
- [x] 1.4 柱長模式綁定設定常數（integratedSeatHeight / thinShellFloorThickness / interfaceFloorDatum）並確認無循環依賴；驗證：`pnpm vitest run tests/unit` 相關套件通過，變更檔案通過 `pnpm test:changed`

## 2. 核心幾何

- [x] 2.1 `makeOpenGridIntegratedSeat` 增加顯式 diameter/length 參數（預設取自設定常數），分隔牆 builder 傳入有效柱徑（4.9+增量）/柱長；驗證：定位組裝既有測試不變、新增柱徑增量/柱長的 builder 單元測試
- [x] 2.2 builder 站點改由合約層供應：自由模式維持 2.275/牆尾/接點柱現行輸出，盒內對位使用新站點對（貼牆端隙、單臂無牆尾、接點柱規則）；驗證：`tests/worker/opengrid-divider*.test.ts` 新增盒內對位情境（4.5 單臂貼牆 123.15 mm 跨距、單一 solid、柱數與站點）通過
- [x] 2.3 自由模式回歸保護：現行參數快照（含 pegDiameter=5）幾何與既有體積基線一致，僅新預設 4.9 有意識差異；驗證：`tests/unit/opengrid-regression.test.ts` 與 `tests/worker/opengrid-divider.integration.test.ts` 更新後全綠

## 3. UI 與訊息

- [x] 3.1 catalog 控制項：alignmentMode radio、盒內對位時顯示 targetBoxGridsX/Y 與 endClearance、pegLengthMode 三選一 radio（標籤含 3.8/2/5 mm）、pegDiameterIncrement（XY 直徑增量，同 pillar 慣例）；驗證：`tests/unit/model-catalog.test.ts` 與 e2e 面板快照更新後通過
- [x] 3.2 對位徽章（唯讀）接 `openGridDividerAlignmentInfoFor`：各軸錨點、中心柱有無、橫向整數格中心線指引；整數格警告與方向和超標的欄位級錯誤走 `model.invalidate`；驗證：`tests/e2e/opengrid-divider.spec.ts` 新增 4.5/5 兩種目標格數的徽章與警告斷言
- [x] 3.3 i18n 補 zh/en 文案（徽章、警告、三個柱長選項、新欄位驗證訊息）並接入 error-mapping；驗證：`tests/unit/messages.test.ts` 與 `error-mapping` 測試通過

## 4. 持久化

- [x] 4.1 divider 持久化快照寫入/還原含新欄位，舊快照缺欄位以預設值補齊後通過驗證；驗證：`tests/unit/component-parameter-store.test.ts` 與 `tests/e2e/workspace-persistence.spec.ts` 新增舊快照升級案例通過

## 5. 整體驗證

- [x] 5.1 `openspec validate --change add-opengrid-divider-box-fit --strict` 通過
- [x] 5.2 `pnpm test:branch`（unit+worker 範圍）與 `pnpm exec playwright test tests/e2e/opengrid-divider.spec.ts tests/e2e/workspace-persistence.spec.ts` 通過
- [x] 5.3 命名與相容性檢查：無新增 component、`opengrid-divider`／`opengrid`／`opengrid-stackable-box` 的 modelId 與行為不變；驗證：grep modelId 目錄無新增slug、相關回歸測試全綠
