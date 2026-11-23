## Why

#215 的握持薄片在實際列印中不成立：薄片只有 0.4 mm 厚、沿高度延伸，使用者一拿就斷（owner 2026-11-23：「側邊太薄根本印不出來」），因此整個握持元件連同它凹槽、填角與彈性模型都必須拿掉。取而代之的固定方式是**把骰子匣鎖進盒子既有的 3 mm 分隔板槽**：盒子本來就每 3 mm 開一道卡榫，不需要另外開槽；骰子匣自帶兩支榫，榫距是 3 mm 的整數倍，所以不論盒子多深、槽架多長，骰子匣都落得進既有槽位。同時 owner 把骰子匣的前後牆加厚（正面 0.8 → 1.6 mm、背面 0.8 → 1.2 mm），並決定骰子匣**自己就是分隔板**（旁邊不再放分隔板，卡片直接靠著骰子匣的牆）。

## What Changes

- **移除整個握持元件**：刪除 `game-box` 的 grip 模組（`src/cad-kernel/components/game-box/grip.ts`）與全部使用點——凹槽、握持薄片、填角、彈性應變模型、組裝時的「壓入」版本。骰子匣不再以摩擦力固定，改以榫鎖進側牆槽。
- **骰子匣的前後牆加厚**：正面牆 1.6 mm、背面牆 1.2 mm；兩側牆與底板維持 1.2 mm。骰子匣厚度因此由 `diceSize + 0.6 + 2 × 0.8` 變成 `diceSize + 0.6 + 1.6 + 1.2`（16 mm 骰子 18.2 → 19.4 mm；18 mm 骰子 20.2 → 21.4 mm）。
- **骰子匣自帶榫**：每一側兩支榫，厚 0.85 mm（分隔板厚度）、沿骰子匣全高、入槽深度與分隔板完全相同（外表面在 `cardBoxDividerWidth / 2`），榫根埋入本體 0.5 mm。
- **榫距是 3 mm 的整數倍**：榫中心距 = `floor((厚度 − 0.85) / 3) × 3`（16 mm 與 18 mm 骰子都是 18 mm），並在骰子匣上置中。因此只要第一支榫落在槽上，第二支必然也落在槽上，骰子匣在任何 3 mm 步進都能插入既有槽。
- **盒體保留每 3 mm 一道的完整槽架**（兩側牆），不再只開在模組邊界；收納深度因此 MUST 是 3 mm 的整數倍，讓槽架末端固定留 3 mm 餘裕。
- **模組邊界改排在槽架上**：由前到後依序排，每個邊界取「讓該模組至少拿到所需長度」的第一個可行位置。卡片模組需要 `cardDepth` + 1.0 mm 餘隙；骰子模組需要自己的厚度且兩支榫 MUST 落在槽上。
- **骰子匣就是分隔板**：只有**兩個卡片模組之間**才放分隔板；卡片模組與骰子模組相鄰時不放，卡片直接靠在骰子匣的牆上。
- **BREAKING**：收納深度改為 3 mm 的整數倍，**每一個已儲存的 game-box 設計的盒體深度都會改變**，匯出檔名也跟著改（盒體檔名仍帶模組清單）。預設的單一 60 mm 卡片模組由 61.85 mm 變成 63 mm；單一 16 mm 骰子模組由 19.65 mm 變成 24 mm（槽架與榫距的必然結果，見 design.md）。
- **BREAKING**：卡片模組的實際可用深度會比 `cardDepth` 多 1.0 mm 以上（最多再多 3 mm），因為邊界只能落在 3 mm 的槽網格上。owner 需要知道這件事。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `game-box`：「盒子尺寸推算」「零件選擇器」「盒體、滑蓋與分隔板幾何」「骰子匣幾何」「組裝預覽與下載限制」「匯出檔名」六個 requirement 的行為改變。「骰子匣固定方式」整個 requirement 移除（它整段都在講握持薄片與摩擦力，owner 已否決），改以新增的「骰子匣榫鎖」requirement 描述以榫鎖入槽位的方式。`game-box` 不屬於 OpenGrid，本次不新增任何元件、不新增或修改任何 modelId、route slug、buildKey 與目錄 id；既有元件 id 全部保持不變。

## Impact

- **合約層**（`src/cad-contract/units/game-box.ts`）：移除 `diceHolderGripAllowance`、`diceHolderGap` 與 `diceHolderFrontBackWall`；新增 `diceHolderFrontWall: 1.6`、`diceHolderBackWall: 1.2` 與槽架、榫距、榫偏移的推算函式；`gameBoxLayout` 由「模組長度加總」改為「在槽架上排邊界」，`gameBoxStorageDepth` 改為回傳進位到 3 mm 的深度；分隔板中心改為只含兩張卡片模組之間的邊界，另新增完整槽架的位置清單；匯出檔名沿用模組清單但深度值改變。
- **Kernel**（`src/cad-kernel/components/game-box/`）：刪除 `grip.ts`；`dice-holder.ts` 改為前後牆 1.6 / 1.2 mm 並在兩側各加兩支全高榫；`geometry.ts` 改為輸出完整槽架、卡片分隔板中心與骰子匣的實際位置；`builder.ts` 的組裝不再建壓入版骰子匣，改用槽架上的實際位置。
- **場景與預覽**（`src/cad-kernel/scene/proxy.ts`、`src/features/cad/progressive-preview/components.ts`）：移除握持薄片的壓入寬度，改用含榫的實際外寬。
- **面板**（`src/components/cad/component-panels/game-box/`）：模組長度與收納深度的唯讀顯示改為新的槽架排版結果。
- **測試**：`tests/unit/game-box-layout.test.ts`、`tests/unit/game-box-grip.test.ts`（刪除）、`tests/unit/game-box-contract.test.ts`、`tests/unit/game-box-preview.test.ts`、`tests/worker/game-box.integration.test.ts`、`tests/worker/game-box-preview-placement.integration.test.ts`、`tests/worker/cad-geometry-baseline.fixture.ts`、`tests/e2e/game-box.spec.ts` 需一併更新；新增以實體量測榫厚、入槽深度、榫距 3 mm 整數倍、榫與盒體零交集、槽帶與榫帶重疊的幾何測試。
- **無新增外部相依套件**；`card-box` 與其他元件的幾何與行為不受影響（game-box 的盒體仍由 card-box 的盒體建構器產生，只有槽位清單不同）。
