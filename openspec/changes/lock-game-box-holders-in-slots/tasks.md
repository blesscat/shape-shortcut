# Tasks

本清單依 design.md 的決策 1–9 實作。owner 決定（2026-11-22 / 2026-11-23）：**握持薄片全部移除**、正面牆 1.6 mm / 背面牆 1.2 mm、**骰子匣自帶兩支榫鎖進盒子既有的 3 mm 分隔板槽**、**骰子匣自己就是分隔板**、**收納深度向上進位到 3 mm 的整數倍**。

## 1. 合約層：槽架、榫距與模組排版

- [x] 1.1 `GAME_BOX_CONFIGURATION`：移除 `diceHolderGripAllowance`、`diceHolderGap` 與 `diceHolderFrontBackWall`；新增 `diceHolderFrontWall = 1.6`、`diceHolderBackWall = 1.2`（`diceHolderWall = 1.2` 維持不變，只供側牆與底板），並新增槽架與榫的常數（槽距 3 mm、榫根埋入 0.5 mm）。
- [x] 1.2 `gameBoxDiceHolderThickness(diceSize)` 改為 `diceSize + 0.6 + 1.6 + 1.2`；新增 `gameBoxDiceHolderTenonSpan(thickness)` = `floor((厚度 − 0.85) / 3) × 3` 與 `gameBoxDiceHolderTenonOffset(thickness)` = `(厚度 − span) / 2`；驗證 16 mm 與 18 mm 骰子的 span 皆為 18、厚度分別為 19.4 與 21.4（`tests/unit/game-box-layout.test.ts`）。
- [x] 1.3 新增槽架推算 `gameBoxSlotCentres(depth)`：自前內牆面起每 3 mm 一道，數量為 `depth / 3 − 1`；驗證深度 63 時有 20 道、相鄰間距 3 mm、首尾各留 3 mm（`tests/unit/game-box-layout.test.ts`）。
- [x] 1.4 改寫 `gameBoxLayout` 為槽架排版：由前到後排模組，每個邊界取讓該模組至少取得所需長度的第一個可行位置；卡片模組的所需長度為 `cardDepth + 1.0`（邊界上有分隔板時兩側各分得 0.425），骰子模組的所需長度為自己的厚度且前端必須讓兩支榫落在槽上；`storageDepth` 為所需長度向上進位到 3 mm 的整數倍；`dividerCenters` 只含**兩個卡片模組之間**的邊界，另輸出完整槽架。
- [x] 1.5 驗證排版結果：`cards(30)` 深度 33、`dice(16)` 深度 24 且骰子匣前端距前內牆 2.3 mm、`cards(30)+dice(16)` 深度 54 且卡片可用深度 32.3 mm、骰子匣立在 32.3 mm 且兩支榫在 33 與 51、`cards(30)+cards(30)` 深度 66 且分界落在 33 mm（`tests/unit/game-box-layout.test.ts`）。
- [x] 1.6 驗證卡片模組的額外空間恆在 `[cardDepth + 1.0, cardDepth + 4.0)` 之間，且所有模組區間長度之和等於收納深度（`tests/unit/game-box-layout.test.ts`）。
- [x] 1.7 深度驗證與錯誤訊息改用進位後的深度；下限維持 15 mm、上限 150 mm；訊息深度以兩位小數呈現（`tests/unit/game-box-layout.test.ts`）。
- [x] 1.8 `gameBoxAvailableParts` 的 `divider` 改為「至少有一對相鄰的 `cards` 模組」才可選，`dividerCount` 改為卡片–卡片邊界數（`tests/unit/game-box-contract.test.ts`、`tests/unit/game-box-panel.test.ts`）。
- [x] 1.9 `gameBoxFileName` 維持帶模組清單，深度改為進位後的值；驗證 `game-box-box-70x120x54-c30-d16.step`、兩種清單深度相同但檔名不同、`game-box-dice-holder-70x120-d16x9.step`（`tests/unit/game-box-contract.test.ts`）。
- [x] 1.10 確認本變更不新增任何元件：modelId、route slug、buildKey、目錄項目與匯出前綴維持原狀。
- [x] 1.11 規格 delta：握持元件整段作廢，所以 `骰子匣固定方式` 以 REMOVED 移除、以新的 `骰子匣榫鎖`（ADDED）描述榫鎖；其餘六個 requirement 以 MODIFIED 重複全文並保留原有的每一個 scenario；`pnpm exec openspec validate lock-game-box-holders-in-slots --strict` 通過。

## 2. 移除握持元件

- [x] 2.1 刪除 `src/cad-kernel/components/game-box/grip.ts`（握持薄片、凹槽、填角、彈性模型與全部常數）。
- [x] 2.2 移除 `dice-holder.ts`、`builder.ts`、`scene/proxy.ts` 與 `src/features/cad/progressive-preview/components.ts` 中對握持元件的引用；`dice-holder.ts` 不再有任何薄片或肋，骰子匣的外表面只有本體的兩側牆與兩支榫。
- [x] 2.3 刪除 `tests/unit/game-box-grip.test.ts` 與 `tests/worker/game-box.integration.test.ts` 中所有握持相關的測試（凹槽、填角、彈性應變、壓入寬度、握持區連通性）。
- [x] 2.4 確認 `card-box` 與其他元件的握持（`opengrid-label-*`）不受影響。

## 3. 骰子匣幾何：加厚的前後牆與榫

- [x] 3.1 `dice-holder.ts` 的正面牆改 1.6 mm、背面牆改 1.2 mm，骰槽、正面開口與實心墊高段的形狀不變；驗證邊長 16 的骰子匣厚度為 19.4 mm、正面牆 1.6 mm、背面牆 1.2 mm、側牆與底板 ≥ 1.2 mm（`tests/worker/game-box.integration.test.ts`）。
- [x] 3.2 每一側加兩支榫：厚 0.85 mm、沿全高、外表面在 `cardBoxDividerWidth(cardWidth) / 2`、內表面埋入本體 0.5 mm、中心在 `first` 與 `first + span`；榫以 `fuseShape` 與本體結合成同一個 solid（`tests/worker/game-box.integration.test.ts`）。
- [x] 3.3 驗證榫不切進骰槽：榫根與骰槽之間 MUST 至少留 0.7 mm 的牆，且榫不得穿出槽底（`tests/worker/game-box.integration.test.ts`）。
- [x] 3.4 驗證 `gameBoxDiceLayout` 的每排上限與層數上限在 diceSize 8–30 全範圍內不變（`tests/unit/game-box-layout.test.ts`）。

## 4. 盒體槽架與組裝

- [x] 4.1 `geometry.ts`：盒體的槽位改為完整槽架（`dividerCentres` → 槽架），分隔板中心只保留卡片–卡片邊界；兩者在盒體座標框架中的位置由前內牆面推算。
- [x] 4.2 `gameBoxModulePlacements` 回傳骰子匣的實際位置（前端貼齊區域前端），組裝中的骰子匣不再建「壓入版」，改以槽架上的實際位置建構。
- [x] 4.3 組裝只放入卡片–卡片邊界的分隔板；骰子匣旁 MUST NOT 有分隔板。
- [x] 4.4 驗證組裝零交集：盒體、滑蓋、分隔板與骰子匣任兩個零件的交集體積為零，且每個骰子匣的兩支榫都落在槽帶內（榫帶與槽帶重疊）（`tests/worker/game-box.integration.test.ts`）。
- [x] 4.5 驗證盒體的槽架：兩側牆每 3 mm 一道槽、首尾各留 3 mm、槽數為 `深度 / 3 − 1`（`tests/worker/game-box.integration.test.ts`）。
- [x] 4.6 更新 `src/cad-kernel/scene/proxy.ts` 與漸進式預覽的骰子匣外寬（改為含榫的 `cardBoxDividerWidth`），驗證預覽外框與完整幾何在各軸的差異不超過 0.5 mm（`tests/unit/game-box-preview.test.ts`）。

## 5. 面板與顯示

- [x] 5.1 面板的模組長度改顯示新的區間長度（各區間長度之和等於收納深度），收納深度顯示進位後的值；維持小數點後兩位、去除尾端 0（`tests/unit/game-box-panel.test.ts`）。
- [x] 5.2 面板的分隔板片數改顯示卡片–卡片邊界數；確認模組清單操作與零件選擇器行為不受影響。

## 6. 測試（以實體量測，不檢查原始碼文字）

- [x] 6.1 榫厚與入槽深度：在實體上量測榫在盒深度方向的厚度為 0.85 mm、榫的外表面距內壁 0.175 mm（`tests/worker/game-box.integration.test.ts`）。
- [x] 6.2 榫距是 3 mm 的整數倍：遍歷 diceSize 8–30、步進 0.5 的全部合法值，量測兩支榫的中心距為 3 的整數倍且不超過厚度（`tests/unit/game-box-layout.test.ts` 與 `tests/worker/game-box.integration.test.ts`）。
- [x] 6.3 兩支榫都落在槽上：對混合卡片與骰子的排版（骰子匣分別在第一、中間與最後），驗證每支榫的帶與槽的帶重疊，且骰子匣與盒體的交集體積為零（`tests/worker/game-box.integration.test.ts`）。
- [x] 6.4 牆厚 1.6 / 1.2 / 1.2 在規則生效處量測（`tests/worker/game-box.integration.test.ts`）。
- [x] 6.5 盒體輸出為單一 solid 且 z ≥ 0（`tests/worker/game-box.integration.test.ts`）。
- [x] 6.6 深度進位：驗證收納深度是 3 的整數倍，且不小於內容物所需長度（`tests/unit/game-box-layout.test.ts`）。
- [x] 6.7 `card-box` 的輸出不變：既有 card-box 測試與 `tests/worker/cad-geometry-baseline.test.ts` 的 card-box 條目不變（`tests/worker/card-box-*.test.ts`）。
- [x] 6.8 幾何基線：新的預設幾何與 `origin/main` 記錄的數值**完全相同**（深度回到槽進位的 63 mm、握持薄片移除），所以 `tests/worker/cad-geometry-baseline.fixture.ts` 的 `game-box` 條目直接還原成 `origin/main` 的版本，`git diff origin/main -- tests/worker/cad-geometry-baseline.fixture.ts` 只剩一行註解。數值：volume `108989.878666`、bounds `[-38.25, -35.45, 0, 38.25, 33.6, 129]`、solids `2`（實測：volume `108989.87866587836`、bounds `[-38.25000015, -35.45000015, -1.5e-7, 38.25000015, 33.60000015, 129.00000015]`，容差 `1e-4` 內）。依 brief 先停下向 lead 回報，lead 批准後才還原。
- [x] 6.9 突變驗證：以改動程式碼的方式製造突變，確認關鍵測試會失敗，再還原。四個突變與結果：

  | 突變 | 目標測試檔 | 結果 |
  |---|---|---|
  | 榫厚 0.85 → 0.4 mm | `tests/worker/game-box.integration.test.ts` | 2 failed / 30 passed：`carries two tenons on each side`、`has no grip flap or rib` |
  | 榫距不再取 3 mm 的整數倍 | `tests/unit/game-box-layout.test.ts` | 6 failed / 29 passed：`spreads the tenons a whole number of slots apart`、`keeps the tenon distance a whole multiple of the slot pitch` 等 |
  | 關閉深度進位 | `tests/unit/game-box-layout.test.ts` | 12 failed / 23 passed：`rounds the depth of a single card module up to the slot pitch` 等 |
  | 分隔板放回骰子匣旁 | `tests/worker/game-box.integration.test.ts` | 7 failed / 25 passed：`puts no divider next to a dice holder`、`keeps the parts apart at the ... card size` 等 |

  還原方式：工作樹尚未提交，`git checkout --` 會還原成 HEAD 而丟掉本次實作，因此改用 `/tmp` 的備份副本還原，`cmp` 確認兩個來源檔與備份完全相同。
- [x] 6.10 更新因新規則而失效的既有測試：
  - `tests/worker/game-box-bounds.integration.test.ts`：原本用「卡片 + 骰子 + 卡片」的清單驗證 `divider` 零件，但分隔板只存在於**兩個卡片模組之間**，該清單沒有分隔板；清單改為「卡片 + 骰子 + 卡片 + 卡片」，`divider` 零件仍可選、模組 2 仍是骰子匣。
  - `tests/worker/game-box-preview-placement.integration.test.ts`：原本用「比空腔窄」認出組裝裡的骰子匣，但榫讓骰子匣的外寬比空腔多 0.35 mm；改用「與卡片同高」認出，與預覽側的認法一致。
  - `tests/e2e/game-box.spec.ts`：分隔板選項（兩個卡片模組之間才有）與各模組的區間長度期望改依新排版推算。

## 7. 整合檢查

- [x] 7.1 `pnpm check`（`tsc --noEmit` + `svelte-check`）0 錯誤 0 警告。實測：`svelte-check found 0 errors and 0 warnings`。
- [x] 7.2 對每一個更動的檔案執行 `pnpm exec prettier --check`。實測：`All matched files use Prettier code style!`（20 個檔案）。
- [x] 7.3 `pnpm exec openspec validate lock-game-box-holders-in-slots --strict` 與 `pnpm exec openspec validate --specs`。實測：`Change 'lock-game-box-holders-in-slots' is valid`；`Totals: 65 passed, 0 failed (65 items)`（長文字警告是既有的其他 spec，與本次變更無關）。
- [x] 7.4 `pnpm vitest run --project fast`。實測：`Test Files 162 passed (162)`、`Tests 1760 passed (1760)`。
- [x] 7.5 game-box 與 card-box 的 `cad` 測試檔，以及 `tests/worker/cad-geometry-baseline.test.ts`。實測（12 個檔案）：`Test Files 12 passed (12)`、`Tests 175 passed (175)`。
- [x] 7.6 `PLAYWRIGHT_PORT=3487 pnpm exec playwright test tests/e2e/game-box.spec.ts tests/e2e/card-box.spec.ts --project=chromium`。實測：`18 passed (13.8s)`。第一次執行時 dev server 的 `astro dev` 會 fork 出 daemon 而讓 Playwright 誤判「exited early」；daemon 起來後重跑即通過。
- [x] 7.7 確認 `package.json` 與 lockfile 未變更，`card-box` 與其他元件的幾何與行為未受影響。實測：`git diff origin/main -- package.json pnpm-lock.yaml` 與 `git diff HEAD -- src/cad-kernel/components/card-box/ src/cad-contract/units/card-box.ts` 皆為空；card-box 的 `cad` 測試檔與基線條目全數通過。

## 8. 試印（owner）

- [ ] 8.1 owner 試印：一個含 `dice` 模組的盒子、一個只含 `cards` 模組的盒子，以及一個「卡片 + 骰子」混合的盒子。確認：骰子匣的榫能插進槽裡、抽出時有卡榫感但不鬆脫、盒子側牆每 3 mm 一道槽清晰可見、卡片區的實際深度比卡片厚（最多多 3 mm 的額外空間）、盒深是 3 mm 的整數倍；把照片與量測回報給 lead。
- [ ] 8.2 owner 確認 design.md 第 5 節的卡片模組額外空間（1–4 mm 的間隙）可接受；若要改為固定間隙，先更新 spec delta 與 design.md 再修改實作。
