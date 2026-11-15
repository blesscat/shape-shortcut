## Why

`card-box` 只能收納卡片，但桌遊通常還有骰子、指示物與其他尺寸的卡。使用者希望用「放進盒內的模組」收納這些東西，並由模組的排列決定盒子尺寸，而不是先定盒子再想辦法塞進去。

## What Changes

- 新增獨立 component `game-box`（桌遊盒）：盒體、前推滑蓋、封面槽與側牆分隔板槽沿用 `card-box` 已驗證的設計，收納深度改由模組排列推算。
- 新增「模組清單」輸入：使用者輸入卡片寬高，並以加號新增、排序、刪除最多 6 個模組；每個模組是 `cards`（卡片區）或 `dice`（骰子匣）。
- 新增骰子匣零件：輸入骰子邊長與顆數即推算排列與厚度，以兩側彈片的摩擦力固定於盒內，不依賴側牆槽鎖定。
- 零件選擇器的內容隨模組清單變動：組裝、盒體、滑蓋、分隔板，以及每個骰子模組各一個骰子匣。
- `card-box` 的 modelId、route、參數、幾何與匯出檔名全部維持不變；`game-box` 不屬於 OpenGrid，不使用 `opengrid-` 前綴。

第一版不包含：卡片尺寸預設組、含文字或 SVG 圖稿的封面片與分隔板文字（封面槽可放一張實體卡片，或使用 `card-box` 以相同卡片尺寸輸出的封面片）、不同尺寸卡片共存用的托架模組、可提起的卡片托架、六面骰以外的骰子。

## Capabilities

### New Capabilities

- `game-box`: 由模組清單決定尺寸的桌遊收納盒 component，涵蓋元件註冊、模組參數合約、盒子尺寸推算、零件選擇、骰子匣幾何、組裝預覽、匯出與驗證。

### Modified Capabilities

無。既有 capability 的 requirement 不變；`game-box` 第一版不宣告 presets，因此 `component-parameter-presets` 不需修改。

## Impact

- 合約層：`src/cad-contract/units` 新增 `game-box` 參數型別、驗證器、尺寸推算、bounds 與檔名；`model.ts`、`index.ts`、`messages`、`errors` 納入新 model。
- Kernel：新增 `src/cad-kernel/components/game-box/`；`card-box` 的盒體、滑蓋、分隔板建模需抽出可共用的進入點（以幾何尺寸與槽位為輸入），`card-box` 的輸出幾何不得改變。
- Worker：`cad-worker-generation`、`cad-worker-export`、`cad-worker-runtime`、`error-mapping` 分派新 model。
- UI：新增 `GameBoxComponentPanel`（模組清單）、raw parser、參數鍵清單、目錄定義、漸進式預覽形狀、模型選擇器預覽圖、`zh-Hant` 與 `en` 文案。
- 測試：合約、排列與尺寸推算的單元測試；kernel 的 Worker 整合測試（含 `card-box` 幾何不變的回歸）；面板 e2e。
- 無新增外部相依套件。
