## 1. 重構 card-box builder 以供重用

- [x] 1.1 讓滑蓋與分隔板 builder 接受「卡片寬、卡片高、收納深度」的幾何輸入，`buildCardBox` 改為傳入該輸入；以既有 `tests/worker/card-box*.integration.test.ts` 全數通過且未修改期望值來驗證
- [x] 1.2 讓盒體 builder 的分隔板槽位置由呼叫端傳入的槽中心清單決定，`card-box` 傳入現有的對稱排列；以盒體參考幾何回歸測試（對稱差 ≤ 1 mm³）通過來驗證
- [x] 1.3 單獨提交此重構，並以 `pnpm test:changed` 通過來驗證 `card-box` 行為未變

## 2. 合約層

- [x] 2.1 新增 `src/cad-contract/units/game-box.ts`：參數型別、6 組模組鍵的產生、預設參數與範圍常數；以型別檢查通過來驗證
- [x] 2.2 實作純計算：`cards` 與 `dice` 模組的佔用槽數、收納深度、槽中心清單、骰子排列與容量；以新增的 `tests/unit/game-box-layout.test.ts` 覆蓋規格中的數值情境（30 → 33、30/16×9/20 → 75、16×9 → 3×3、16×3 → 3×1、40×60 骰子 30 的容量為 1）來驗證
- [x] 2.3 實作驗證器（型別與範圍、模組連續、至少一個模組、骰子容量、收納深度 20–150、`part` 有效性）與錯誤歸屬；以新增的 `tests/unit/game-box-contract.test.ts` 覆蓋每一種拒絕情境及其歸屬欄位來驗證
- [x] 2.4 實作 bounds 與 STEP/STL 檔名（assembly 不產生檔名、無 3MF）；以單元測試檢查 `game-box-box-70x120x75.step` 與 `game-box-dice-holder-70x120-d16x9.step` 來驗證
- [x] 2.5 將 `game-box` 納入 `units/index.ts`、`units/model.ts`、`messages`、`errors`；以 `tests/unit/model-catalog.test.ts` 與型別檢查通過來驗證

## 3. Kernel

- [x] 3.1 新增 `src/cad-kernel/components/game-box/builder.ts`：由參數推算幾何輸入並呼叫重構後的盒體、滑蓋、分隔板 builder，單一零件以列印方位輸出；以 Worker 整合測試檢查 `box` 為單一 solid、z ≥ 0、每個模組邊界有槽來驗證
- [x] 3.2 以整合測試比對相同卡片尺寸與收納深度 72 時 `game-box` 與 `card-box` 的 `lid` 對稱差 ≤ 1 mm³，以及兩者無文字 `divider` 外形相同
- [x] 3.3 新增 `dice-holder.ts`：本體、骰槽、正面開口、墊高中空殼與兩側彈性元件；以整合測試檢查單一 solid、z ≥ 0、高度等於 `cardHeight`、本體寬小於內寬、彈性元件自然最外寬大於內寬來驗證
- [x] 3.4 以整合測試驗證骰槽容量：在骰槽內放入 `diceCount` 個邊長 `diceSize` 的方塊，與骰子匣的交集體積為零
- [x] 3.5 實作 `assembly`：盒體、滑蓋、各邊界的分隔板、各 `dice` 模組位置的骰子匣；以整合測試在預設、最小、最大卡片尺寸下檢查任兩零件交集體積為零，以及骰子匣位於正確的兩片分隔板之間來驗證
- [x] 3.6 在 `src/cad-kernel/model/index.ts` 與 `scene/proxy.ts` 註冊 `game-box`；以 `tests/worker/scene-proxy.integration.test.ts` 通過來驗證

## 4. Worker 分派

- [x] 4.1 在 `cad-worker-generation.ts`、`cad-worker-runtime.ts`、`cad-worker-export.ts` 分派 `game-box` 的生成與 STEP/STL 匯出；以 Worker 整合測試完成一次骰子匣的生成與匯出來驗證
- [x] 4.2 在 `error-mapping.ts` 對應 `game-box` 的錯誤碼；以 `tests/unit/error-mapping.test.ts` 新增案例通過來驗證

## 5. 目錄、預覽與文案

- [x] 5.1 新增 `src/features/cad/model-catalog/components/game-box.ts`（family `other`、無 presets）並在目錄索引註冊；以 `tests/unit/model-catalog.test.ts` 檢查 modelId、buildKey、route slug 一致為 `game-box` 來驗證
- [x] 5.2 新增各零件的漸進式簡化預覽形狀；以單元測試檢查簡化預覽與完整幾何 bounds 各軸差異 ≤ 0.5 mm 來驗證
- [x] 5.3 新增模型選擇器的淺色與深色預覽圖；以 `tests/e2e/model-card-previews.spec.ts` 涵蓋 `game-box` 並通過來驗證
- [x] 5.4 新增 `zh-Hant` 與 `en` 的模型名稱、參數標籤、面板文字、零件名稱、提示與錯誤訊息；以兩種語系開啟面板皆無未翻譯訊息鍵的 e2e 檢查來驗證

## 6. 面板

- [x] 6.1 新增 raw parser 與參數鍵清單（以迴圈產生 6 組），並在 `raw-from-parameters.ts` 與 `model-raw-parsers/index.ts` 註冊；以單元測試檢查 raw 值往返轉換正確來驗證
- [x] 6.2 新增 `GameBoxComponentPanel.svelte`：卡片尺寸欄位、模組清單（依類型顯示欄位）、新增選單、刪除、前移、後移；清單操作一次寫回完整且連續的快照；以 e2e 覆蓋新增、刪除中間模組、調整順序三個規格情境來驗證
- [x] 6.3 實作上限與下限行為：6 個時停用新增並顯示提示、1 個時停用刪除；以 e2e 檢查兩種狀態來驗證
- [x] 6.4 顯示唯讀的內部尺寸、外部尺寸與各模組佔用長度，數值取自合約層的計算；以 e2e 檢查變更厚度後數值更新來驗證
- [x] 6.5 實作零件選擇器：依模組清單產生選項、`divider` 標示片數、選擇失效時回到 `assembly`、assembly 停用下載並顯示提示；以 e2e 覆蓋規格中零件選擇器與下載限制的情境來驗證
- [x] 6.6 模組的驗證錯誤顯示在對應的模組項目內；以 e2e 檢查模組 2 的錯誤只出現在模組 2 來驗證
- [x] 6.7 在 `component-panels/index.svelte` 註冊面板並確認參數持久化；以 e2e 檢查重新開啟後還原三個模組、無效的已存資料回到預設來驗證

## 7. 實物與整體驗證

- [ ] 7.1 匯出預設參數的骰子匣 STL 並試印，確認彈性元件的鬆緊與骰子進出骰槽的順暢度；依結果調整薄片尺寸與間隙常數，並在 design.md 的 Open Questions 記錄定案值
- [ ] 7.2 量測實際骰子邊長並更新 `diceSize` 與 `diceCount` 的預設值；以單元測試的預設參數案例同步更新並通過來驗證
- [ ] 7.3 執行 `pnpm test:branch` 與 `game-box`、`card-box` 相關的 e2e spec，全數通過
- [x] 7.4 執行 `openspec validate add-game-box-component --strict` 通過
