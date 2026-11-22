# Tasks

本清單採 design.md 決策 1（選項 A：沿全高連接、在層內彎折的彈性薄片 flap；2026-11-21 round-1 審查後重設計，見決策 8）、決策 3 的公式。**design.md 的四個開放問題已由 owner 於 2026-11-21 回答**（見 design.md 決策 7）：卡片堆間隙 1.0 mm、單一模組的前後間隙接受、槽底殘牆 0.6 mm（round-1 審查後隨重設計失效）、握持區端部邊距保留 4 mm。實作依這些答案進行。

## 1. 合約層：模組長度與收納深度

- [x] 1.1 移除 `GAME_BOX_CONFIGURATION.slotPitch` 與 `gameBoxCardsSlots`、`gameBoxDiceSlots`、`gameBoxDiceHolderMinimumThickness`，改為 `gameBoxCardsModuleLength(cardDepth)`、`gameBoxDiceModuleLength(diceSize)` 與 `gameBoxDiceHolderThickness(diceSize)` 三個直接計算的函式；驗證 `gameBoxDiceHolderThickness(16) === 18.2`、`gameBoxCardsModuleLength(30) === 31.85`、`gameBoxDiceModuleLength(16) === 19.65`（`tests/unit/game-box-layout.test.ts`）。
- [x] 1.2 新增常數 `diceHolderFrontBackWall = 0.8` 與 `cardsModuleClearance = 1.0`，`diceHolderWall = 1.2` 維持不變且只供側牆與底板使用；驗證 `diceHolderWall` 的使用處不再影響骰子匣厚度（`tests/unit/game-box-layout.test.ts`）。
- [x] 1.3 改寫 `gameBoxLayout`：以模組長度累積取代槽數，`slots` 與 `slotCenters` 移除，`storageDepth` 為各模組 `length` 的總和；驗證邊界位置即分隔板中心，且 `layout.storageDepth` 等於各模組 `length` 的總和（`tests/unit/game-box-layout.test.ts`）。
- [x] 1.4 更新 `GameBoxLayout` 型別與 `src/cad-contract/units/index.ts` 的匯出；驗證 `pnpm exec tsc --noEmit` 通過，且 `card-box` 的匯出與幾何未受影響（`tests/unit/game-box-contract.test.ts`、`tests/worker/card-box-*.test.ts`）。
- [x] 1.5 改寫 `gameBoxFileName`：`box` 檔名帶上依序的模組清單（`c<卡片深度>`、`d<骰子邊長>`），`lid` 與 `divider` 維持只帶深度，深度寫到小數點後兩位並去除尾端 0；驗證 `game-box-box-70x120x51.5-c30-d16.step` 與兩種深度相同但清單不同的組合產生不同檔名（`tests/unit/game-box-contract.test.ts`）。
- [x] 1.6 確認本變更不新增任何元件：modelId、route slug、buildKey、目錄項目與匯出前綴皆維持原狀，以 `openspec list --specs` 與元件目錄測試確認沒有新的 game-box 相關項目出現。

## 2. 握持元件模組（可重用）

- [x] 2.1 新增 `src/cad-kernel/components/game-box/grip.ts`，把握持常數（長度 60 mm、寬 1.2 mm、凸出 0.5 mm、退讓 0.6 mm、端部邊距 4 mm）、`gameBoxGripFrame()` 與鰭的建構函式從 `dice-holder.ts` 搬出；驗證函式的輸入只有匣身側牆的幾何與握持長度，因此可被其他匣形重用（`tests/unit/game-box-layout.test.ts`）。
- [x] 2.2 以彈性薄片（flap）取代現有的弓形薄片：根部埋入側牆 1 mm、沿整個握持區高度連續，自由段 5 mm、厚 0.4 mm、凸出牆面 0.5 mm；背後開 0.8 mm 深的凹槽（尾端留 0.4 mm 折入餘量），薄片沿自由長度不接觸牆面；尖端內角做 tangent 圓角、根部不挖根；驗證握持區任一高度切出的薄片沒有與本體分離的握持元件（含兩端 0.2 mm 內、多個匣形），且凹槽永不切入骰槽（`tests/worker/game-box.integration.test.ts`）。
- [x] 2.3 保留壓入狀態的建構路徑：組裝中的骰子匣以凸出 0.2 mm 的半壓狀態建構（最外寬 = 盒子內寬 − 0.2 mm），單零件匯出保持自然的 W + 0.4；驗證組裝與盒壁零交集，且全壓建構（`outerWidth` = 本體寬，CAD 參數狀態）的 bounding box 寬度等於本體寬度（`tests/worker/game-box.integration.test.ts`、組裝零交集測試）。
- [x] 2.4 刪除「薄片在退讓槽兩側壁之間保持自由」的測試，改為在實體上量測：凹槽與凹槽後的牆（≥ 0.4 mm）、薄片厚度 0.4 mm 與自由長度 5 mm、滿壓應變 ≤ 2 %、凸出量 0.5 mm；驗證每個新測試在對應突變下失敗（突變後還原）（`tests/worker/game-box.integration.test.ts`）。

## 3. 骰子匣前後牆

- [x] 3.1 骰子匣的正面與背面牆改為 0.8 mm，側牆與底板維持 1.2 mm，骰槽、正面開口與實心墊高段的形狀不變；驗證邊長 16 的骰子匣厚度為 18.2 mm、正面與背面牆厚為 0.8 mm（`tests/worker/game-box.integration.test.ts`）。
- [x] 3.2 更新 `gameBoxDiceLayout` 的可用寬度與可用高度計算（仍用 `diceHolderWall = 1.2`），確認骰子的每排上限與層數上限在 diceSize 8–30 全範圍內不變；驗證邊長 16 顆數 9 仍為每排 3 顆、共 3 層（`tests/unit/game-box-layout.test.ts`）。

## 4. 盒體分隔板槽與組裝

- [x] 4.1 `gameBoxGeometryOf` 的分隔板槽中心改為模組邊界（`dividerCenters`），不再開在 3 mm 網格上，其餘位置不開槽；驗證槽的數量等於啟用模組數減一，且每個槽都落在模組邊界（`tests/worker/game-box.integration.test.ts`）。
- [x] 4.2 確認 `gameBoxModulePlacements` 的自由空間規則不變（邊界扣半塊分隔板），並驗證組裝中的骰子匣置中於自由空間、與分隔板及盒壁零交集；驗證零交集體積檢查通過（`tests/worker/game-box.integration.test.ts`、`tests/worker/game-box-preview-placement.integration.test.ts`）。
- [x] 4.3 更新 `src/cad-kernel/scene/proxy.ts` 與漸進式預覽使用的骰子匣厚度，改用新的厚度函式；驗證預覽外框與完整幾何在，各軸差異不超過 0.5 mm（`tests/unit/game-box-preview.test.ts`）。

## 5. 面板與顯示

- [x] 5.1 面板的模組長度與收納深度改顯示新的推算值，維持小數點後兩位、去除尾端 0；驗證預設參數下顯示 61.85 mm 與 31.85 mm（`tests/unit/game-box-panel.test.ts` 或對應的面板測試）。
- [x] 5.2 確認面板的唯讀尺寸、模組清單操作與零件選擇器行為不受影響；驗證既有面板測試通過。

## 6. 整合檢查

- [x] 6.1 以預設、最小與最大卡片尺寸搭配含 `dice` 模組的清單建構組裝，驗證任兩個零件的交集體積為零，且深度在 15–150 mm 的驗證規則下正確拒絕超出範圍的組合（組裝與交集：`tests/worker/game-box.integration.test.ts`；深度範圍拒絕：`tests/unit/game-box-layout.test.ts`）。
- [x] 6.2 執行 `pnpm exec openspec validate refine-game-box-module-layout --strict` 與受影響的單元／Worker 測試，確認全數通過且 `card-box` 的參考幾何回歸測試未變更期望值。

## 7. 試印（owner）

- [ ] 7.1 owner 試印一個含 `dice` 模組的盒子與一個只含 `cards` 模組的盒子：確認新的彈性薄片不再斷裂、滿壓 0.5 mm 可以徒手壓入且回彈重複、抽出時不鬆脫、凹槽後 0.4 mm 的牆在最薄側牆的匣上沒有缺陷、確認收納深度符合新的推算值；把結果（照片與量測）回報給 lead。
- [x] 7.2 owner 確認 design.md 的四個開放問題（卡片堆間隙、單一模組的前後間隙、槽底殘牆厚度、握持區端部邊距），若要調整則先更新 spec delta 與 design.md 再修改實作。**已於 2026-11-21 確認，答案見 design.md 決策 7。**

## 8. Round-1 gate 修正（2026-11-21）

- [x] 8.1 握持元件重設計為 flap（審查 B P1-2）：design.md 決策 1 改寫並附應變計算（t = 0.4、L = 5、滿壓應變 1.2 % ≤ 2 %），規格 delta 的「骰子匣固定方式」改寫；實作見 `src/cad-kernel/components/game-box/grip.ts`（`tests/worker/game-box.integration.test.ts`）。
- [x] 8.2 最薄側牆（恰 1.2 mm）的三組輸入建構骰子匣與組裝不崩潰（審查 B P1-1）：63 × 88 配 5 顆 11.5 mm、48 × 120 配 10 顆 8.5 mm、68.9 × 120 配 4 顆 16 mm；寬度低於 0.01 mm 的切刀一律不建構（`tests/worker/game-box.integration.test.ts`）。
- [x] 8.3 連通性測試取樣握持區兩端 0.2 mm 內的高度、四個匣形（審查 B P2-1）；圓角只做在尖端內角，根部不挖根。
- [x] 8.4 設定常數斷言改為實體量測（審查 B P2-2）：凹槽後的牆、前後牆 0.8 mm、側牆與底板 ≥ 1.2 mm；每個新測試在突變下確認失敗後還原（`tests/worker/game-box.integration.test.ts`）。
- [x] 8.5 最小收納深度 20 → 15 mm（審查 B P2-3）：量測盒體與滑蓋建到 8 mm 仍通過幾何檢查，下限取 15 mm；單一 16 mm / 14 mm 骰子模組恢復有效（`tests/unit/game-box-layout.test.ts`、proposal.md、design.md 決策 8）。
- [x] 8.6 深度範圍比較加容差、訊息深度格式化（審查 B P3-1）；cardDepth / diceSize 以 0.01 mm 讀回、檔名不再撞名（審查 B P3-2）（`tests/unit/game-box-layout.test.ts`、`tests/unit/game-box-contract.test.ts`）。
- [x] 8.7 文件與測試名稱同步（審查 B P3-3、A）：任務 2.3 改為「內寬 − 0.2 mm」、任務 6.1 指向實際驗證檔案；測試與註解的「strips」改為 flaps；design.md 決策 7.3 標記失效。
- [x] 8.8 `cutShape` / `fuseShape` 共用到 `shape-ops.ts`（審查 B P3-4）。
