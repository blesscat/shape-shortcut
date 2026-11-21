# Design

## Context

`card-box` 的目錄定義（`src/features/cad/model-catalog/components/card-box.ts`）以
`CARD_BOX_PRESETS` 宣告恰七組卡片尺寸 preset，每組只覆寫 `cardWidth` 與 `cardHeight`，
labelKey 為 `cad.presets.card-box.*`。`game-box` 的目錄定義原本沒有 `presets`。

既有的 preset 機制是通用的：`ModelPreset`（`src/features/cad/model-catalog/types.ts`）只有
`id`、`labelKey` 與 `overrides`；`resolvePresetParameters`
（`src/features/cad/model-catalog/presets.ts`）以
`{ ...definition.defaultParameters, ...preset.overrides }` 合併後交給該 component 自己的
`validateParameters`；`createCadWorkspaceController.onApplyPreset` 與
`features/cad/playground/store.ts` 的 `applyPreset` 各自呼叫它並把結果走既有的快照、
持久化與重新生成路徑。

`game-box` 的參數模型與 `card-box` 不同：卡片尺寸只有 `cardWidth`（40–100 mm）與
`cardHeight`（60–150 mm）兩個欄位，收納深度不是使用者輸入，而是由模組清單推算。使用者真正
花時間組裝的是模組清單（六個模組槽、卡片區與骰子匣、排序與刪除），卡片尺寸只是其中一個
輸入。

## Goals / Non-Goals

**Goals:**

- 在 `game-box` 目錄定義上宣告七組卡片尺寸 preset，id、順序與尺寸與 `card-box` 既有
  七組完全一致。
- 套用 preset 只改變卡片尺寸；使用者建立的模組清單、每個模組的欄位、推算出的收納深度與
  零件選擇都不受影響。
- 讓共用 preset 機制可以選擇「以目前的參數為底」，但預設行為完全不變：card-box 與其他
  component 仍然以自己的預設參數為底。
- 當新的卡片尺寸讓目前的模組放不下時，不套用 preset、不丟掉模組清單，並以本地化訊息
  告知使用者。
- 每一組 preset 都能建構出有效幾何。

**Non-Goals:**

- 不變更 `card-box` 的任何程式碼、規格、測試或翻譯；card-box 的下架是另一個 task。
- 不變更 game-box 的幾何、參數範圍、預設值或 contract 層。
- 不改變共用 preset 機制的既有行為；新的行為一律由 opt-in 開啟。
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

### 2. 共用機制以 `presetBase` opt-in，預設行為不變

owner 決定「保留模組清單」之後，preset 不再能一律以 `defaultParameters` 為底。共用機制
因此多一個選擇項 `ModelDefinition.presetBase`：

- `presetBase` 未宣告或為 `'defaults'`（預設）：合併底仍然是 `defaultParameters`，
  card-box 與 `opengrid-stackable-box` 的行為與既有測試完全不變。
- `presetBase: 'current'`：合併底是呼叫端交來的「目前參數」，因此只改變 preset 覆寫的
  欄位。`game-box` 宣告這個值。

選擇放在 `ModelDefinition` 而不是 `ModelPreset` 的理由：一個 component 的所有 preset 必須
有一致行為，讓同一個 component 的兩組 preset 用不同的底會令人意外；放在定義上只需要一個
欄位，也讓「這個 component 的 preset 保留使用者目前的設定」成為元件層級的宣告。

`resolvePresetParameters` 新增一個選用的第三個參數 `currentParameters`。沒有交來目前參數
時，仍以 `defaultParameters` 為底，也就是「單獨解析這個 preset 會得到什麼」。兩個呼叫端
（`createCadWorkspaceController` 與 playground 的 `applyPreset`）都會交出目前參數：
workspace 交的是 `state.input`（上一組通過驗證的參數），playground 交的是
`instance.parameters`。

替代方案是「所有 component 一律改成以目前參數為底」。那會改變 card-box 的既有行為
（套用 preset 就不再重設分隔板與封面選項），與 owner 的指示與既有 card-box 規格相衝突，
因此不採用。

### 3. 套用 preset 的實際行為：只改變卡片尺寸

以目前的參數為底之後，套用一組 preset 的結果是：

| 參數 | 套用後的值 |
| --- | --- |
| `cardWidth` / `cardHeight` | preset 覆寫的值（例：63 / 88） |
| `part` | 原值；若該零件已不存在則為 `assembly` |
| 模組 1 至 6 的類型、卡片區厚度、骰子邊長、骰子顆數 | 原值 |
| 推算收納深度 | 原值（由模組清單決定，卡片尺寸不影響它） |

收納深度不由卡片尺寸決定，所以「保留模組清單」也意味著收納深度不變。

### 4. 不適用時不套用，也不用預設參數取代

以目前的參數為底之後，新的卡片尺寸可能讓目前的模組放不下（最常見的是迷你卡尺寸放不下
既有的骰子）。規則固定為三步：

1. 先以「目前參數 + overrides」驗證。
2. 若無效的原因只有零件選擇，改以 `assembly` 重試一次。
3. 仍無效就不套用，保留使用者目前的參數，並顯示本地化訊息。

第三步刻意不做「退回預設參數」：那會在使用者沒有要求的情況下丟掉他建立起來的模組清單，
正是 owner 要避免的事。訊息由 `presetNotApplicableMessageKey` 依 component id 組成
（`cad.presets.<modelId>.notApplicable`），所以每個 component 可以用自己的措辭；目前只有
game-box 使用這個路徑。

零件重試是通用的規則：任何帶 `part` 參數的 component 都適用。game-box 的零件清單只取決於
模組清單而不取決於卡片尺寸，所以這條規則在 game-box 的 preset 路徑上不會被觸發；它保護
的是「preset 改變的欄位恰好讓某個零件消失」的情況，並且由共用機制的單元測試以一個零件
受限的 fixture 覆蓋。

### 5. 翻譯 key 新增 `cad.presets.game-box.*`，不沿用 card-box 的 key

七組 labelKey 改為 `cad.presets.game-box.<preset-id>`，在 `en` 與 `zh-Hant` 兩份
message catalog 各新增七筆。不重用也不改名 `cad.presets.card-box.*`，因為那些 key 會由
下架 card-box 的另一個 task 移除；重用會讓兩個 component 共用同一批 key，移除時必須同時
動到 game-box，與 task 邊界相反。新 key 讓兩個 component 在下架前彼此獨立，下架 task
刪掉 card-box 的 key 時不必碰 game-box。

label 文字沿用同一組卡片標準的名稱（例：en `Standard TCG 63×88`、zh-Hant
`標準 TCG 63×88`），因為兩者描述的是同一組實體卡片尺寸。

### 6. 規格 delta 只涵蓋 `game-box` capability

`component-parameter-presets` capability 目前列舉了會宣告 presets 的 component
（`opengrid-stackable-box` 與 `card-box`）。那條列舉在下架 card-box 時必然要改，而那個
改動屬於下架 task；本 change 的 delta 只寫 `game-box`。

理由是 delta 的同步語義：`MODIFIED Requirements` 必須帶整條 requirement 的完整內容，
若這裡一併改寫那條列舉，同步時會把下架 task 對 card-box 的移除結果覆蓋回去。分開由兩
個 task 各自改各自的 capability，可以避免在同一條 requirement 上互相覆寫。副作用是
`component-parameter-presets` 的列舉在兩個 task 都落地後仍不會提到 `game-box`，這是
已知的後續項，已列入本次交付的報告給 owner 決定由哪個 task 補上。

### 7. 測試分三層

- **單元測試**：以字面值釘住七組 preset 的 id、順序與尺寸；驗證每一組 preset 都通過
  game-box contract；驗證套用後只改變卡片尺寸、模組清單與收納深度不變；驗證零件失效時
  改用組裝；驗證放不下時不套用。共用機制另外驗證 `presetBase: 'current'` 的合併底、
  零件重試與 card-box 仍以預設參數為底。
- **幾何測試**：在 worker 測試中，對每一組 preset 以預設參數疊加 overrides 建構
  game-box 的 `box`、`lid` 與 `assembly`，確認每次建構都完成且量體積大於零。preset 不再
  重設模組清單並不改變這組測試建構的內容，所以幾何測試維持原樣。
- **瀏覽器測試**：驗證面板顯示「回復預設」加七顆 preset 按鈕；套用 preset 後卡片尺寸改變
  而模組清單仍在；放不下時顯示本地化訊息且參數不變。

## Risks / Trade-offs

- [共用機制多了一個選項] → 新行為一律由 `presetBase: 'current'` 開啟，預設路徑與既有測試
  完全不變；`model-preset-parameters.test.ts` 會同時覆蓋預設與 opt-in 兩條路徑。
- [preset 不再重設其他參數] → 這是 owner 的決定。使用者若想回到乾淨狀態，仍有面板上的
  「回復預設」按鈕。
- [卡片尺寸變小可能讓既有的骰子匣放不下] → preset 不套用、參數不變，並顯示本地化訊息；
  使用者可以先調整骰子數量再套用。
- [元件層級的 opt-in 可能被誤用] → `presetBase` 的值決定行為，`design.md` 與 delta spec
  都明載 game-box 的行為；其他 component 必須顯式宣告才會改變行為。
- [零件重試規則在 game-box 上不會被觸發] → 它是共用機制的防護規則，由共用機制的單元測試
  以 fixture 覆蓋，避免日後有 component 依賴它卻沒有測試。

## Migration Plan

1. 先加上翻譯 key，再在 game-box 目錄定義宣告七組 preset 與 `presetBase: 'current'`，兩者
   可獨立還原。
2. 共用機制新增 `presetBase` 與目前參數合併，加上零件重試；card-box 與 stackable-box 的
   行為不變。
3. 補上單元、幾何與瀏覽器測試，確認套用行為與幾何都正確。
4. 執行型別檢查、格式檢查、targeted tests 與 OpenSpec 驗證後，提交並開 PR。
5. 沒有資料 migration；`card-box` 的下架由另一個 task 負責，兩者互不阻擋。
