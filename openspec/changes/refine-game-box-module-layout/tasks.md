# Tasks

本清單採 design.md 決策 1（選項 A：沿全長連接的鰭）、決策 3 的公式與 design.md 開放問題的建議值（卡片堆間隙 1.0 mm、退讓槽底殘牆 0.6 mm、握持區長度 60 mm 與端部邊距 4 mm）。**實作前必須先由 owner 確認 design.md 的開放問題**；若 owner 改選其他數值，先更新 spec delta 與 design.md 再實作。

## 1. 合約層：模組長度與收納深度

- [ ] 1.1 移除 `GAME_BOX_CONFIGURATION.slotPitch` 與 `gameBoxCardsSlots`、`gameBoxDiceSlots`、`gameBoxDiceHolderMinimumThickness`，改為 `gameBoxCardsModuleLength(cardDepth)`、`gameBoxDiceModuleLength(diceSize)` 與 `gameBoxDiceHolderThickness(diceSize)` 三個直接計算的函式；驗證 `gameBoxDiceHolderThickness(16) === 18.2`、`gameBoxCardsModuleLength(30) === 31.85`、`gameBoxDiceModuleLength(16) === 19.65`（`tests/unit/game-box-layout.test.ts`）。
- [ ] 1.2 新增常數 `diceHolderFrontBackWall = 0.8` 與 `cardsModuleClearance = 1.0`，`diceHolderWall = 1.2` 維持不變且只供側牆與底板使用；驗證 `diceHolderWall` 的使用處不再影響骰子匣厚度（`tests/unit/game-box-layout.test.ts`）。
- [ ] 1.3 改寫 `gameBoxLayout`：以模組長度累積取代槽數，`slots` 與 `slotCenters` 移除或改為模組邊界，`storageDepth` 為各模組長度之和；驗證邊界位置即分隔板中心，且 `layout.storageDepth` 等於各模組 `length` 的總和（`tests/unit/game-box-layout.test.ts`）。
- [ ] 1.4 更新 `GameBoxLayout` 型別與 `src/cad-contract/units/index.ts` 的匯出；驗證 `pnpm exec tsc --noEmit`（或專案既有的型別檢查指令）通過，且 `card-box` 的匯出與幾何未受影響（`tests/unit/game-box-contract.test.ts`、`tests/worker/card-box-*.test.ts`）。
- [ ] 1.5 改寫 `gameBoxFileName`：`box` 檔名帶上依序的模組清單（`c<卡片深度>`、`d<骰子邊長>`），`lid` 與 `divider` 維持只帶深度，深度寫到小數點後兩位並去除尾端 0；驗證 `game-box-box-70x120x51.5-c30-d16.step` 與兩種深度相同但清單不同的組合產生不同檔名（`tests/unit/game-box-contract.test.ts`）。
- [ ] 1.6 確認本變更不新增任何元件：modelId、route slug、buildKey、目錄項目與匯出前綴皆維持原狀，以 `openspec list --specs` 與元件目錄測試確認沒有新的 game-box 相關項目出現。

## 2. 握持元件模組（可重用）

- [ ] 2.1 新增 `src/cad-kernel/components/game-box/grip.ts`，把握持常數（長度 60 mm、寬 1.2 mm、凸出 0.5 mm、退讓 0.6 mm、端部邊距 4 mm）、`gameBoxGripFrame()` 與鰭的建構函式從 `dice-holder.ts` 搬出；驗證函式的輸入只有匣身側牆的幾何與握持長度，因此可被其他匣形重用（`tests/unit/game-box-layout.test.ts`）。
- [ ] 2.2 以鰭取代現有的弓形薄片：側牆開 0.6 mm 深、1.6 mm 寬、貫穿握持區的退讓槽，槽上立 0.5 mm 凸出、1.2 mm 寬的鰭，鰭與槽底殘牆沿全長融合，鰭的兩端與根部做圓角；驗證握持區任一高度切出的薄片恰為一個連通 solid，且握持區外的高度不受影響（`tests/worker/game-box.integration.test.ts` 新增的橫截面連通性測試）。
- [ ] 2.3 保留壓入狀態的建構路徑（鰭平躺在退讓槽內），使組裝中的骰子匣最外寬等於本體寬度；驗證壓入版本的 bounding box 寬度等於 `gameBoxDiceHolderWidth(cardWidth)`（`tests/worker/game-box.integration.test.ts`）。
- [ ] 2.4 刪除「薄片在退讓槽兩側壁之間保持自由」的測試，改為固定固定鰭的凸出量、寬度、長度、退讓深度與槽底殘牆厚度；驗證新測試涵蓋 design.md 決策 1 的全部數值（`tests/worker/game-box.integration.test.ts`）。

## 3. 骰子匣前後牆

- [ ] 3.1 骰子匣的正面與背面牆改為 0.8 mm，側牆與底板維持 1.2 mm，骰槽、正面開口與實心墊高段的形狀不變；驗證邊長 16 的骰子匣厚度為 18.2 mm、正面與背面牆厚為 0.8 mm（`tests/worker/game-box.integration.test.ts`）。
- [ ] 3.2 更新 `gameBoxDiceLayout` 的可用寬度與可用高度計算（仍用 `diceHolderWall = 1.2`），確認骰子的每排上限與層數上限在 diceSize 8–30 全範圍內不變；驗證邊長 16 顆數 9 仍為每排 3 顆、共 3 層（`tests/unit/game-box-layout.test.ts`）。

## 4. 盒體分隔板槽與組裝

- [ ] 4.1 `gameBoxGeometryOf` 的分隔板槽中心改為模組邊界（`dividerCenters`），不再開在 3 mm 網格上，其餘位置不開槽；驗證槽的數量等於啟用模組數減一，且每個槽都落在模組邊界（`tests/worker/game-box.integration.test.ts`）。
- [ ] 4.2 確認 `gameBoxModulePlacements` 的自由空間規則不變（邊界扣半塊分隔板），並驗證組裝中的骰子匣置中於自由空間、與分隔板及盒壁零交集；驗證零交集體積檢查通過（`tests/worker/game-box.integration.test.ts`、`tests/worker/game-box-preview-placement.integration.test.ts`）。
- [ ] 4.3 更新 `src/cad-kernel/scene/proxy.ts` 與漸進式預覽使用的骰子匣厚度，改用新的厚度函式；驗證預覽外框與完整幾何在，各軸差異不超過 0.5 mm（`tests/unit/game-box-preview.test.ts`）。

## 5. 面板與顯示

- [ ] 5.1 面板的模組長度與收納深度改顯示新的推算值，維持小數點後兩位、去除尾端 0；驗證預設參數下顯示 61.85 mm 與 31.85 mm（`tests/unit/game-box-panel.test.ts` 或對應的面板測試）。
- [ ] 5.2 確認面板的唯讀尺寸、模組清單操作與零件選擇器行為不受影響；驗證既有面板測試通過。

## 6. 整合檢查

- [ ] 6.1 以預設、最小與最大卡片尺寸搭配含 `dice` 模組的清單建構組裝，驗證任兩個零件的交集體積為零，且深度在 20–150 mm 的驗證規則下正確拒絕超出範圍的組合（`tests/worker/game-box.integration.test.ts`、`tests/e2e/game-box.spec.ts`）。
- [ ] 6.2 執行 `pnpm exec openspec validate refine-game-box-module-layout --strict` 與受影響的單元／Worker 測試，確認全數通過且 `card-box` 的參考幾何回歸測試未變更期望值。

## 7. 試印（owner）

- [ ] 7.1 owner 試印一個含 `dice` 模組的盒子與一個只含 `cards` 模組的盒子：確認握持鰭不再斷裂、0.2 mm 的干涉量可以徒手壓入、抽出時不鬆脫、確認收納深度符合新的推算值；把結果（照片與量測）回報給 lead。
- [ ] 7.2 owner 確認 design.md 的四個開放問題（卡片堆間隙、單一模組的前後間隙、槽底殘牆厚度、握持區端部邊距），若要調整則先更新 spec delta 與 design.md 再修改實作。
