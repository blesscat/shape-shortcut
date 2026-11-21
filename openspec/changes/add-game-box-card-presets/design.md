# Design

## Context

`card-box` 的目錄定義（`src/features/cad/model-catalog/components/card-box.ts`）以
`CARD_BOX_PRESETS` 宣告恰七組卡片尺寸 preset，每組只覆寫 `cardWidth` 與 `cardHeight`，
labelKey 為 `cad.presets.card-box.*`。`game-box` 的目錄定義目前沒有 `presets`，所以
game-box 面板只顯示「回復預設」一顆按鈕。

既有的 preset 機制是通用的，不需要為這個變更擴充：

- `ModelPreset`（`src/features/cad/model-catalog/types.ts`）只有 `id`、`labelKey` 與
  `overrides`（`Partial<ModelParameterValues>`）。
- `resolvePresetParameters`（`src/features/cad/model-catalog/presets.ts`）以
  `{ ...definition.defaultParameters, ...preset.overrides }` 合併，再交給該 component
  自己的 `validateParameters`；驗證不通過就不套用，驗證通過則套用 validator 回傳的
  正規化參數集。
- `createCadWorkspaceController.onApplyPreset` 走既有的 `applyParameters` 路徑，也就是把
  每一個參數鍵交給 `runtime.handleInputChange`，因此面板更新、持久化與重新生成都沿用
  既有機制。
- `CadWorkspace.svelte` / `CadWorkspacePanel.svelte` 以
  `getModelDefinition(id)?.presets ?? []` 決定是否顯示 preset 按鈕列，`PresetButtonRow`
  依 `preset.id` 產生 `data-testid="cad-preset-<id>"`。

`game-box` 的參數模型與 `card-box` 不同：卡片尺寸只有 `cardWidth`（40–100 mm）與
`cardHeight`（60–150 mm）兩個欄位，收納深度不是使用者輸入，而是由模組清單推算。預設
模組清單是模組 1 為厚度 60 mm 的 `cards` 模組、模組 2 至 6 為 `none`，推算出的收納深度
為 21 個槽距 × 3 mm = 63 mm。

## Goals / Non-Goals

**Goals:**

- 在 `game-box` 目錄定義上宣告七組卡片尺寸 preset，id、順序與尺寸與 `card-box` 既有
  七組完全一致。
- 用既有的 preset 機制套用，不擴充 `ModelPreset`、不修改 `resolvePresetParameters`、
  不修改面板或按鈕列的任何程式碼。
- 讓每一組 preset 的合併結果都通過 game-box 自己的驗證，並且在每一組 preset 下都能
  建構出有效幾何。
- 為 `en` 與 `zh-Hant` 兩種語系各自提供 `cad.presets.game-box.*` 翻譯。

**Non-Goals:**

- 不變更 `card-box` 的任何程式碼、規格、測試或翻譯；card-box 的下架是另一個 task。
- 不變更 game-box 的幾何、參數範圍、預設值或 contract 層。
- 不變更共用的 preset 機制（`ModelPreset`、`resolvePresetParameters`、
  `PresetButtonRow`、`createCadWorkspaceController`）。
- 不新增 runtime dependency、不改 `package.json` 或 lockfile。

## Decisions

### 1. preset 清單由 game-box 自己擁有，不抽共用常數

`GAME_BOX_PRESETS` 直接寫在 `src/features/cad/model-catalog/components/game-box.ts`，
不從 `card-box` import，也不另建一個共用的 `card-size-presets` 模組。理由：

- **card-box 即將下架。** 把 game-box 的 preset 清單掛在 card-box 的模組上，等於讓
  game-box 依賴一個即將被刪除的檔案；下架 task 完成時，那個共用常數還是得搬到
  game-box，搬完之後兩個 component 又各自有一份清單，等於做兩次搬運。
- **兩個 component 的生命週期不同。** 卡片尺寸對 `card-box` 只是一組建議值；對
  `game-box` 而言，卡片尺寸會決定盒體內寬與盒高，也會影響未來加入的骰子匣容量。
  共用一份清單會把兩個 component 的參數語意綁在一起：往後只要其中一邊要改其中一組
  尺寸，另一邊就被迫跟著改。
- **漂移已經由測試擋住。** 共用常數解決的是「同一份資料寫兩次」；這裡真正的風險是
  兩份清單的內容不同步，而這個風險由一條以字面值釘住七組 id、順序與尺寸的單元測試
  加上 game-box contract 驗證來擋，比共用常數更直接。
- **既有結構本來就是各 component 自有。** `card-box` 與 `opengrid-stackable-box` 各自
  在自己的目錄定義檔裡宣告 `presets`，共用的是型別與解析流程，不是資料。

替代方案是抽一個 `src/features/cad/model-catalog/card-size-presets.ts` 共用常數。它能
避免重複書寫，但換來的是 game-box 對 card-box 生命週期的依賴，與「card-box 即將下架」
這個前提相反，因此不採用。

### 2. 套用 preset 的實際行為：設定卡片尺寸，其餘回到 game-box 預設

`resolvePresetParameters` 合併的是 `definition.defaultParameters`，不是使用者目前的參數。
`game-box` 的 `defaultParameters`（即 `GAME_BOX_CONFIGURATION.defaultParameters`）擁有
全部 27 個參數鍵，因此套用任一 preset 的結果是：

| 參數 | 套用後的值 |
| --- | --- |
| `cardWidth` / `cardHeight` | preset 覆寫的值（例：63 / 88） |
| `part` | `assembly` |
| 模組 1 | `cards`，卡片區厚度 60 mm |
| 模組 2 至 6 | `none` |
| 骰子邊長 / 骰子顆數 | 16 mm / 9 |
| 推算收納深度 | 63 mm（21 個槽距 × 3 mm） |

這是既有機制的必然結果，不是這個 change 另外加的行為：`card-box` 的規格用同樣的語義
描述過「套用 preset 後 depth 回到預設」，只是 game-box 的 depth 是推算值而不是輸入值。
用戶若已在面板上排好模組清單，套用一組卡片尺寸 preset 會把清單清回單一 `cards` 模組；
這與 `card-box` 上「零件選擇與分隔板／封面選項一併回到預設」的既有語義一致，因此規格
如實描述這個結果，而不是假設只改卡片尺寸。

### 3. 翻譯 key 新增 `cad.presets.game-box.*`，不沿用 card-box 的 key

七組 labelKey 改為 `cad.presets.game-box.<preset-id>`，在 `en` 與 `zh-Hant` 兩份
message catalog 各新增七筆。不重用也不改名 `cad.presets.card-box.*`，因為那些 key 會由
下架 card-box 的另一個 task 移除；重用會讓兩個 component 共用同一批 key，移除時必須同時
動到 game-box，與 task 邊界相反。新 key 讓兩個 component 在下架前彼此獨立，下架 task
刪掉 card-box 的 key 時不必碰 game-box。

label 文字沿用同一組卡片標準的名稱（例：en `Standard TCG 63×88`、zh-Hant
`標準 TCG 63×88`），因為兩者描述的是同一組實體卡片尺寸。

### 4. 規格 delta 只涵蓋 `game-box` capability

`component-parameter-presets` capability 目前列舉了會宣告 presets 的 component
（`opengrid-stackable-box` 與 `card-box`）。那條列舉在下架 card-box 時必然要改，而那個
改動屬於下架 task；本 change 的 delta 只寫 `game-box`。

理由是 delta 的同步語義：`MODIFIED Requirements` 必須帶整條 requirement 的完整內容，
若這裡一併改寫那條列舉，同步時會把下架 task 對 card-box 的移除結果覆蓋回去。分開由兩
個 task 各自改各自的 capability，可以避免在同一條 requirement 上互相覆寫。副作用是
`component-parameter-presets` 的列舉在兩個 task 都落地後仍不會提到 `game-box`，這是
已知的後續項，已列入本次交付的報告給 owner 決定由哪個 task 補上。

### 5. 測試分三層

- **單元測試**：以字面值釘住七組 preset 的 id、順序與尺寸，並對每一組 preset 以
  `defaultParameters` 疊加 overrides 後跑 game-box contract 驗證，確認結果有效；同時
  驗證套用後的推算收納深度是 63 mm、零件選擇回到 `assembly`、模組清單回到單一
  `cards` 模組。
- **幾何測試**：在 worker 測試中，對每一組 preset 以預設參數疊加 overrides 建構
  game-box 的 `box`、`lid` 與 `assembly`，確認每次建構都完成且量體積大於零，寫法比照
  `tests/worker/card-box-parts.integration.test.ts` 的 preset 幾何測試。
- **瀏覽器測試**：在 `tests/e2e/game-box.spec.ts` 驗證面板顯示「回復預設」加七顆 preset
  按鈕、按下後卡片尺寸欄位變成該組尺寸且模型重新生成。

## Risks / Trade-offs

- [套用 preset 會清掉使用者排好的模組清單] → 這是既有 preset 語義（以
  `defaultParameters` 為底）的必然結果，與 `card-box` 既有規格一致；規格與 UI 不隱藏這個
  行為，使用者要保留清單就不套用 preset。
- [未來 card-box 下架後，兩份 preset 清單中的一份會消失] → 預期結果。`card-box` 的清單
  隨 component 一起移除，`game-box` 的清單不變。
- [七組尺寸在 game-box 的範圍外會讓 preset 套用失敗] → 七組尺寸的 cardWidth 都在
  40–100 mm、cardHeight 都在 60–150 mm 內，且合併結果不含 `dice` 模組，因此不會觸發
  骰子容量檢查；單元測試對每一組 preset 都跑一次驗證以確保這點。
- [preset 按鈕列變長可能擠壓 game-box 面板] → 按鈕列沿用既有的 `flex-wrap` 排版，與
  `card-box` 面板目前的呈現一致。

## Migration Plan

1. 先加上翻譯 key，再在 game-box 目錄定義宣告七組 preset，兩者可獨立還原。
2. 補上單元、幾何與瀏覽器測試，確認套用行為與幾何都正確。
3. 執行型別檢查、格式檢查、targeted tests 與 OpenSpec 驗證後，提交並開 PR。
4. 沒有資料 migration；`card-box` 的下架由另一個 task 負責，兩者互不阻擋。
