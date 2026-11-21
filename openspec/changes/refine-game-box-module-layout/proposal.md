## Why

骰子匣兩側的握持薄片只在自己的兩端嵌進側牆，中段是一整片懸空的葉子；直立列印時薄片沿高度延伸、受力橫跨層紋，使用者一拿就斷（2026-11-21：「骰子收納的側邊是不是沒有跟合體連在一起 這樣太容易斷了 幫我讓他連在一起」）。同一輪決定也把骰子匣的前後牆降到 0.8 mm，並要求模組長度不再被 3 mm 分隔板槽進位，讓盒子緊貼內容物、不留多餘空隙。

## What Changes

- **握持元件改為與本體沿全長連接的鰭**：側牆上開一條退讓槽，槽上立一片 0.5 mm 高的鰭；鰭與槽底殘餘的牆壁沿全長融合成一體。握持區任一高度的橫截面都是單一連通區域，不再存在只靠兩端連接的懸空元件。
- **握持元件抽成可重用的模組**（game-box 的 grip 模組），讓並行的 `add-game-box-mini-card-adapter` 直接沿用同一套握持幾何與常數。
- **骰子匣的前後牆最小值由 1.2 mm 降為 0.8 mm**；側牆與底板維持 1.2 mm，不動共用的 `diceHolderWall`。
- **模組長度改為直接計算**，不再進位到 3 mm 的整數槽：卡片模組 = 卡片深度 + 卡片間隙 + 分隔板份額；骰子模組 = 骰子匣厚度 + 兩側間隙 + 分隔板份額。
- **3 mm 分隔板槽間距從 game-box 的規則中移除**：分隔板槽只開在計算出的模組邊界上，邊界不再落在 3 mm 網格上；卡片模組也一樣不再進位。
- **收納深度 = 各模組長度之和**，20–150 mm 的範圍不變；深度不再一定是 3 mm 的整數倍。
- **盒體零件的匯出檔名帶上模組清單**（例如 `game-box-box-70x120x51.5-c30-d16.step`），因為深度已不足以分辨不同的盒體幾何；滑蓋與分隔板維持只帶深度。
- **BREAKING**：每一個已儲存的 game-box 設計的盒體深度都會改變。預設的單一 60 mm 卡片模組由 63 mm 變成 61.85 mm（卡片間隙取 1.0 mm 時）；骰子模組的深度也會變短 0.85–3.35 mm，取決於骰子邊長。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `game-box`: 「盒子尺寸推算」「骰子匣幾何」「骰子匣固定方式」「匯出檔名」四個 requirement 的行為改變。`game-box` 不屬於 OpenGrid，本次不新增任何元件、不新增或修改任何 modelId、route slug、buildKey 與目錄 id；既有元件 id 全部保持不變。

## Impact

- **合約層**（`src/cad-contract/units/game-box.ts`）：移除 `slotPitch` 與 `gameBoxCardsSlots` / `gameBoxDiceSlots` / `gameBoxDiceHolderMinimumThickness`，改為直接計算模組長度與骰子匣厚度；`gameBoxLayout` 由「槽數」改為「長度」；新增前後牆最小值與卡片模組間隙常數；匯出檔名改帶模組清單。
- **Kernel**（`src/cad-kernel/components/game-box/`）：`dice-holder.ts` 的握持幾何改為全長連接的鰭，前後牆改為 0.8 mm；抽出可重用的 grip 模組供骰子匣與（後續的）小卡轉接共用；`geometry.ts` 的分隔板槽改為只開在模組邊界。
- **場景與預覽**（`src/cad-kernel/scene/proxy.ts`、`src/features/cad/progressive-preview/`）：骰子匣的深度改用新的厚度常數。
- **面板**（`src/components/cad/component-panels/game-box/`）：模組長度與收納深度的顯示改為新的推算值（顯示到小數點後兩位）。
- **測試**：`tests/unit/game-box-layout.test.ts`（槽數推算）、`tests/worker/game-box.integration.test.ts`（握持薄片、厚度）、`tests/worker/game-box-bounds.integration.test.ts`、`tests/e2e/game-box.spec.ts`（收納深度）需一併更新；新增「握持區任一高度的橫截面為單一連通區域」的幾何測試。
- **無新增外部相依套件**；`card-box` 與其他元件的幾何與行為不受影響。
