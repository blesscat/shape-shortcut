# Spec Delta

## ADDED Requirements

### Requirement: 分隔卡欄位組

系統 MUST 提供 5 個分隔卡欄位組，對應「兩個 `cards` 模組相鄰」的邊界，由前到後編號 1 至 5：第 N 個這類邊界即 `dividerN`。每組包含：標籤文字 `dividerNText`（預設空字串，上限 20 字元）、Tab 位置 `dividerNTabPosition`（`left`／`center`／`right`，預設 `left`）、樣式 `dividerNStyle`（`raised`／`flat`，預設 `raised`）。樣式 MUST 是每片分隔卡各自的設定。全部參數 MUST 為扁平的單一值，並 MUST 通過與其他 component 相同的驗證、持久化與 Worker 傳遞機制。只有存在的邊界（第 1 個至「兩個 `cards` 模組相鄰的邊界數」）的分隔卡欄位參與幾何；其餘欄位仍 MUST 通過範圍驗證但 MUST NOT 影響幾何。`dividerN` 與模組邊界序號（含骰子邊界）無關：骰子模組旁 MUST NOT 有分隔卡。

#### Scenario: 預設分隔卡欄位

- **WHEN** 請求未提供任何分隔卡欄位
- **THEN** 全部分隔卡 MUST 為空白文字、`left` Tab 與 `raised` 樣式

#### Scenario: 分隔卡欄位超出範圍

- **WHEN** 參數快照中 `divider1Text` 超過 20 字元
- **THEN** 驗證 MUST 回報歸屬於 `divider1Text` 的欄位錯誤並阻止生成與匯出

#### Scenario: 卡片與骰子相鄰時沒有分隔卡欄位參與幾何

- **WHEN** 清單為 `cards`、`dice`、`cards`，且 `divider1Text` 為任意文字
- **THEN** 驗證 MUST 通過（欄位仍在範圍內）
- **AND** 組裝與零件 MUST NOT 產生任何分隔卡

#### Scenario: 新增模組帶入預設分隔卡

- **WHEN** 使用者新增模組使「兩個 `cards` 模組相鄰」的邊界數增加
- **THEN** 新邊界的分隔卡 MUST 以預設欄位出現
- **AND** 既有邊界的分隔卡欄位 MUST 全部保留

#### Scenario: 刪除模組依邊界保留分隔卡

- **WHEN** 使用者刪除中間的模組
- **THEN** 其餘邊界的分隔卡欄位 MUST 依編號保留
- **AND** 消失邊界的分隔卡欄位 MUST 回到預設值

#### Scenario: 調整順序不改變分隔卡

- **WHEN** 使用者將任一模組前移或後移
- **THEN** 每個存在的分隔卡欄位 MUST 保持不變

### Requirement: 封面片參數

面板 MUST 暴露封面片欄位：標題 `coverTitle`（預設 `GAME`，上限 30 字元）、標題文字高 `coverTitleTextHeight`（4–20 mm，預設 6）、副標題 `coverSubtitle`（預設空字串，上限 30 字元）、副標題文字高 `coverSubtitleTextHeight`（3–12 mm，預設 5）、SVG 寬 `coverSvgWidth`（10–58 mm，預設 40）、垂直位置 `coverVerticalPosition`（0–100%，預設 30）、樣式 `coverStyle`（`raised`／`flat`，預設 `raised`）、使用 SVG 旗標 `usesCoverSvg`（預設 false）與資料指紋 `coverSvgFingerprint`（使用 SVG 時 MUST 非空）。全部欄位 MUST 為扁平的單一值，並 MUST 通過與其他 component 相同的驗證、持久化與 Worker 傳遞機制。

#### Scenario: 預設封面參數

- **WHEN** 請求未提供任何封面欄位
- **THEN** 元件 MUST 使用標題 `GAME`、文字高 6／5、SVG 寬 40、垂直位置 30 與樣式 `raised`

#### Scenario: 封面欄位超出範圍

- **WHEN** 參數快照的 `coverTitleTextHeight` 為 25
- **THEN** 驗證 MUST 回報歸屬於 `coverTitleTextHeight` 的欄位錯誤並阻止生成與匯出

#### Scenario: 使用 SVG 但缺指紋被拒絕

- **WHEN** 參數快照的 `usesCoverSvg` 為 true 而 `coverSvgFingerprint` 為空字串
- **THEN** 驗證 MUST 回報欄位錯誤並阻止生成與匯出

### Requirement: 封面片幾何

選擇 `cover` 時，系統 MUST 建構封面片：寬為內部寬度（`cardWidth + 0.5`）、高為 `cardHeight`、厚 0.6 mm 的單一平板，自前緣封面槽滑入；其與封面槽、盒體卡唇與上蓋薄化凸緣的相對尺寸 MUST 與 `card-box` 封面片相同。封面片 MUST 隨 game-box 的卡片尺寸推算；推算收納深度 MUST NOT 影響封面片幾何。封面片 MUST 以平放、圖稿朝上的列印方位輸出於 z ≥ 0。

#### Scenario: 預設封面尺寸

- **WHEN** 以預設卡片尺寸建構 `cover`
- **THEN** 板件 MUST 為 70.5 × 120 × 0.6 mm（各軸容差 0.05 mm）

#### Scenario: 封面片為單一 solid

- **WHEN** 以無圖稿的有效參數建構 `cover`
- **THEN** 輸出 MUST 恰為一個 solid 且位於 z ≥ 0

#### Scenario: 深度不影響封面片

- **WHEN** 兩份參數快照只差推算收納深度
- **THEN** 兩者建構的封面片幾何 MUST 相同

### Requirement: 封面版面與安全區

封面版面 MUST 與 `card-box` 相同：可見區為（內部寬 − 10）×（`cardHeight` − 10）mm，安全區為可見區再內縮固定邊距（預設卡片尺寸下 x 7..63.5、y 7..113）。任一版面元素超出安全區 MUST 回報本地化錯誤並阻止生成與匯出，MUST NOT 縮小、裁切或靜默省略。版面 MUST 是置中堆疊（由上至下：選配 SVG、標題、選配副標題），水平置中；垂直位置 0% = 群組頂貼齊安全區頂、50% = 置中、100% = 群組底貼齊安全區底；只有群組高度超過安全區時才 MUST 回報錯誤。

#### Scenario: 預設封面版面

- **WHEN** 以預設封面參數建構 `cover`
- **THEN** 版面 MUST 顯示預設標題「GAME」，無 SVG 與副標題
- **AND** 垂直位置 MUST 為 30%

#### Scenario: 圖稿超出安全區回報錯誤

- **WHEN** 任一版面元素（SVG 或文字行）超出安全區
- **THEN** 生成 MUST 失敗並回報本地化錯誤
- **AND** 系統 MUST NOT 縮小、裁切或靜默省略該元素

#### Scenario: 垂直位置滑桿

- **WHEN** 垂直位置設為 0%、50% 或 100%
- **THEN** 版面群組 MUST 分別貼齊安全區頂、置中、貼齊安全區底
- **AND** 群組高度未超過安全區時 MUST NOT 產生錯誤

### Requirement: 封面樣式

封面片 MUST 提供 `raised` 單色（圖稿凸出 0.4 mm）與 `flat` 雙色（圖稿齊平於 0.4 mm 凹槽）兩種樣式，預設 `raised`；凹槽與圖稿輪廓 MUST 對齊，行為與 `card-box` 相同。

#### Scenario: Flat 封面凹槽對齊圖稿

- **WHEN** 以樣式 `flat` 建構含標題的 `cover`
- **THEN** 圖稿 MUST 齊平於板面的 0.4 mm 凹槽
- **AND** 凹槽輪廓 MUST 與圖稿輪廓一致

### Requirement: 雙色 3MF 輸出

`part=cover` 且封面具有 accent 圖稿（標題、副標題或 SVG 任一存在）時，或 `part` 為某片分隔卡且其文字非空時，3MF 輸出 MUST 恰含 `body` 與 `accent` 兩個 parts，分別對應擠出機 1 與擠出機 2；`raised` 與 `flat` 樣式皆 MUST 提供此輸出。無 accent 圖稿的素板（空白分隔卡、無標題／副標題／SVG 的封面）MUST 僅提供 STEP/STL 且 MUST NOT 提供 3MF。`box`、`lid`、骰子匣與 `assembly` MUST NOT 提供 3MF。

#### Scenario: Flat 封面輸出雙色 3MF

- **WHEN** `part=cover`、樣式 `flat` 且有標題的修訂匯出 3MF
- **THEN** 套件 MUST 恰含 body 與 accent 兩個 parts
- **AND** body MUST 對應擠出機 1、accent MUST 對應擠出機 2

#### Scenario: Raised 分隔卡含文字輸出雙色 3MF

- **WHEN** 選擇某片文字非空的分隔卡、樣式 `raised` 的修訂匯出 3MF
- **THEN** 套件 MUST 恰含 body 與 accent 兩個 parts
- **AND** body MUST 對應擠出機 1、accent MUST 對應擠出機 2

#### Scenario: 素板無 3MF

- **WHEN** 所選分隔卡文字為空，或封面無標題、副標題與 SVG
- **THEN** 3MF 下載 MUST 停用
- **AND** STEP 與 STL 下載 MUST 保持可用

### Requirement: 封面 SVG 匯入（Beta）

封面 MUST 支援使用者 SVG 匯入，控制項 MUST 帶「Beta」徽章。系統 MUST 在主執行緒以 DOMParser 僅作 XML 解析，MUST NOT 將使用者 SVG 插入頁面 DOM；MUST 保留填色形狀、套用 transform 與 viewBox、攤平曲線；MUST 以清楚訊息拒絕僅描邊路徑、`<text>`、`<image>` 與超過點數上限的輸入。清理後的輪廓資料（非原始 SVG）MUST 存在 game-box 專屬的 localStorage key（`shape-shortcut:game-box-cover-svg:v1`），上限 256 KB，僅保存一組，新匯入 MUST 取代舊資料。參數紀錄 MUST 只保存 `usesCoverSvg` 旗標與資料指紋。資料遺失或損毀時 MUST 回退純文字版面並顯示提示；超過大小上限時資料 MUST 僅當前工作階段有效並告知使用者。Worker 建構請求 MUST 收到輪廓資料。game-box MUST NOT 讀取 card-box 的 SVG key。

#### Scenario: Beta 徽章顯示

- **WHEN** 使用者開啟 game-box 面板的 SVG 匯入控制項
- **THEN** 控制項 MUST 帶「Beta」徽章（en 與 zh-Hant 皆有對應翻譯 key）

#### Scenario: 有效 SVG 轉為輪廓

- **WHEN** 使用者匯入只含填色形狀的有效 SVG
- **THEN** 系統 MUST 產生清理後的輪廓資料並存入 game-box 專屬 key
- **AND** 參數紀錄 MUST 只更新 `usesCoverSvg` 旗標與指紋

#### Scenario: 不支援內容被拒絕

- **WHEN** SVG 含僅描邊路徑、`<text>`、`<image>` 或超過點數上限
- **THEN** 匯入 MUST 失敗並顯示對應的清楚錯誤訊息
- **AND** 先前已保存的 SVG 資料 MUST 保持不變

#### Scenario: 超過大小上限僅當前工作階段有效

- **WHEN** 清理後的輪廓資料超過 256 KB
- **THEN** 系統 MUST 告知使用者資料僅本次工作階段有效
- **AND** MUST NOT 寫入 localStorage

#### Scenario: 資料遺失或損毀回退純文字

- **WHEN** 參數紀錄標記使用 SVG 但專屬 key 資料遺失或損毀
- **THEN** 封面 MUST 回退純文字版面並顯示提示
- **AND** 其他 component 的資料與行為 MUST 不受影響

#### Scenario: 不遷移 card-box 的 SVG 資料

- **WHEN** game-box workspace 初始化
- **THEN** game-box MUST NOT 讀取 `shape-shortcut:card-box-cover-svg:v1`
- **AND** 該 key 的已存資料 MUST 保持原狀


## MODIFIED Requirements

### Requirement: 套用卡片尺寸預設只改變卡片尺寸

套用任一卡片尺寸 preset MUST 以使用者目前的參數為底疊合 overrides，因此只改變 cardWidth 與 cardHeight：模組清單、每個模組的欄位（類型、卡片區厚度、骰子邊長、骰子顆數）、全部分隔卡欄位（每片的文字、Tab 位置與樣式）、全部封面欄位（標題、文字高、副標題、SVG 寬、垂直位置、樣式與 SVG 旗標）、推算出的收納深度與零件選擇 MUST 保持不變。game-box 的可用零件只取決於模組清單，卡片尺寸不會讓任何零件消失。

#### Scenario: 套用 preset 只改變卡片尺寸

- **GIVEN** 使用者已建立一個骰子匣模組與一個卡片區模組
- **WHEN** 使用者套用任一卡片尺寸 preset
- **THEN** 卡片寬高 MUST 變成該組 preset 的尺寸
- **AND** 模組清單與每個模組的欄位值 MUST 保持不變
- **AND** 推算出的收納深度 MUST 保持不變

#### Scenario: 零件選擇保持不變

- **GIVEN** 使用者已選擇某個骰子匣零件
- **WHEN** 使用者套用任一卡片尺寸 preset
- **THEN** 零件選擇 MUST 保持為該骰子匣

#### Scenario: 封面與分隔卡欄位保持不變

- **GIVEN** 使用者已設定某片分隔卡的文字與封面標題且參數有效
- **WHEN** 使用者套用任一卡片尺寸 preset
- **THEN** 該分隔卡的文字、Tab 位置與樣式 MUST 保持不變
- **AND** 封面標題與封面欄位值 MUST 保持不變

### Requirement: 不適用目前模組的預設不套用

若套用 preset 後的參數集無效，MUST NOT 套用該 preset，MUST 保留使用者目前的參數，MUST NOT 改用預設參數取而代之，並 MUST 以本地化訊息（en 與 zh-Hant）告知使用者該預設不適用於目前的模組。套用後封面圖樣確定無法放入安全區（例如 SVG 寬超過較小卡片的安全區寬）時，該參數集 MUST 視為無效並依相同規則不套用。

#### Scenario: 骰子放不下時不套用

- **GIVEN** 使用者的骰子匣模組有 9 顆 16 mm 的骰子
- **WHEN** 使用者套用「Mini American 41×63」preset
- **THEN** 該 preset MUST NOT 被套用
- **AND** 卡片尺寸與模組清單 MUST 保持不變
- **AND** 面板 MUST 顯示該預設不適用於目前模組的本地化訊息

#### Scenario: 封面圖樣放不下時不套用

- **GIVEN** 使用者已匯入封面 SVG 且 SVG 寬為 40 mm，卡片尺寸 70 × 120
- **WHEN** 使用者套用「Mini American 41×63」preset（該卡片尺寸的安全區寬約 27.5 mm）
- **THEN** 該 preset MUST NOT 被套用
- **AND** 卡片尺寸與全部封面欄位 MUST 保持不變
- **AND** 面板 MUST 顯示該預設不適用的本地化訊息

### Requirement: 零件選擇器

面板 MUST 提供零件選擇器 `part`，預設為 `assembly`。可選項目 MUST 為：`assembly`、`box`、`lid`、`cover`、每個「兩個 `cards` 模組相鄰」邊界各一個分隔卡項目 `divider1`…`dividerN`（N 為這類邊界的數量，以邊界的先後序號識別），以及每個類型為 `dice` 的啟用模組各一個骰子匣項目（以模組編號識別）。`cards` 模組與 `none` 模組 MUST NOT 產生零件項目。沒有任何分隔板時（沒有任何兩個 `cards` 模組相鄰）面板 MUST NOT 列出任何 `dividerN` 項目。`part` MUST 是模型參數：一次修訂只建構一個模型。`part` 指向不存在的零件（例如指向非 `dice` 的模組）時 MUST 被驗證拒絕；面板在清單操作使目前選擇失效時 MUST 將選擇回到 `assembly`。

每個分隔卡項目 MUST 以序號識別；欄位完全相同的多片分隔卡 MUST 仍以各自序號分開列出。`cover` MUST 列為可選項目。

#### Scenario: 骰子模組產生零件項目

- **WHEN** 清單為 `cards`、`dice`、`cards`
- **THEN** 零件選擇器 MUST 列出 `assembly`、`box`、`lid`、`divider` 與模組 2 的骰子匣
- **AND** `divider` 項目 MUST 標示 0 片

#### Scenario: 沒有分隔板時分隔板不可選

- **WHEN** 清單為 `cards`、`dice`
- **THEN** 零件選擇器 MUST NOT 列出 `divider`

#### Scenario: 指向無效零件被拒絕

- **WHEN** 參數快照的 `part` 指向模組 1 的骰子匣而模組 1 為 `cards`
- **THEN** 驗證 MUST 回報欄位錯誤並阻止生成與匯出

#### Scenario: 刪除模組後選擇回到 assembly

- **WHEN** 使用者選擇了模組 2 的骰子匣後刪除模組 2
- **THEN** 零件選擇 MUST 變為 `assembly`

#### Scenario: 每個卡片對邊界一個分隔卡項目

- **WHEN** 清單為 `cards`、`cards`、`cards`
- **THEN** 分隔卡項目 MUST 恰為 `divider1`、`divider2`
- **AND** 選擇不存在的 `divider3` MUST 被驗證拒絕

#### Scenario: 相同設定的分隔卡分開列出

- **WHEN** 兩片分隔卡的欄位完全相同（皆為空白文字）
- **THEN** 零件選擇器 MUST 仍以各自序號分開列出兩個項目

#### Scenario: 封面零件始終可選

- **WHEN** 以任何有效參數快照開啟零件選擇器
- **THEN** `cover` MUST 列為可選項目

### Requirement: 盒體、滑蓋與分隔板幾何

`game-box` 的盒體、滑蓋與分隔板 MUST 採用與 `card-box` 相同的設計：牆厚、地板、前緣封面槽與開窗、V 軌、卡扣、圓角、分隔板槽的寬度與深度、分隔板外形皆 MUST 相同，僅收納深度改用推算值與分隔板槽的位置改用槽架。盒體的兩側牆 MUST 每 3 mm 開一道分隔板槽，槽位自前內牆面起算；槽的數量 MUST 等於收納深度除以 3 再減一。封面槽 MUST 能容納厚度不超過 0.6 mm 的封面片或一張實體卡片。每片分隔板 MUST 依其分隔卡欄位建構（Tab 位置、選配文字、樣式）；文字為空且 Tab 為預設 `left` 時，該分隔板 MUST 與無文字版本幾何相同。分隔卡文字放不進 Tab 時 MUST 回報本地化錯誤並阻止生成與匯出，MUST NOT 縮小文字或靜默省略。單一零件 MUST 以列印方位輸出於列印床（z ≥ 0）。

以相同的 `cardWidth`、`cardHeight` 與收納深度建構時，`game-box` 的 `lid` MUST 與 `card-box` 的 `lid` 幾何相同；`game-box` 的 `box` 除分隔板槽的位置外 MUST 與 `card-box` 的 `box` 幾何相同。

#### Scenario: 滑蓋與 card-box 相同

- **WHEN** `game-box` 以推算收納深度 72 mm 建構 `lid`，且 `card-box` 以 storageDepth 72 與相同卡片尺寸建構 `lid`
- **THEN** 兩者的對稱差體積 MUST 不超過 1 mm³

#### Scenario: 盒體輸出為單一 solid

- **WHEN** 以任何有效參數建構 `box`
- **THEN** 輸出 MUST 恰為一個 solid 且位於 z ≥ 0

#### Scenario: 分隔板與 card-box 相容

- **WHEN** 以相同卡片尺寸建構 `game-box` 的 `divider` 與 `card-box` 的無文字 `divider`
- **THEN** 兩者的外形 MUST 相同

#### Scenario: 盒體每 3 mm 一道槽

- **WHEN** 以推算收納深度 63 mm 建構 `box`
- **THEN** 兩側牆 MUST 各有 20 道分隔板槽（63 ÷ 3 − 1）
- **AND** 相鄰兩道槽的間距 MUST 為 3 mm
- **AND** 第一道槽 MUST 距離前內牆面 3 mm，最後一道 MUST 距離後內牆面 3 mm

#### Scenario: 分隔卡文字過寬回報錯誤

- **WHEN** 某片分隔卡的文字無法放入其 Tab 寬度
- **THEN** 生成 MUST 失敗並回報本地化錯誤
- **AND** 系統 MUST NOT 縮小文字或靜默省略文字

#### Scenario: 分隔卡與 card-box 相容

- **WHEN** 以相同卡片尺寸、空白文字與 Tab `left` 建構 `game-box` 的分隔卡與 `card-box` 的無文字 `divider`
- **THEN** 兩者的外形 MUST 相同
- **AND** 分別以 `left`、`center`、`right` 建構時，外形 MUST 與 `card-box` 對應 Tab 的無文字分隔板相同

### Requirement: 組裝預覽與下載限制

`part=assembly` 時，模型 MUST 於組裝座標框架呈現盒體、滑蓋、兩個 `cards` 模組之間的分隔卡（含各自的文字圖稿），以及每個 `dice` 模組位置上的骰子匣，以及置入前緣封面槽的封面片（含其圖稿）。`dice` 模組旁 MUST NOT 有分隔卡。分隔卡文字圖稿朝向的空腔由相鄰 `cards` 模組的卡片堆間隙（1.0 mm）容納凸出 0.4 mm 的圖稿。組裝中任兩個零件的交集體積 MUST 為零。`part=assembly` 時 STEP、STL 下載 MUST 全部停用並 MUST 顯示本地化的「請選擇零件以下載」提示；`part` 為單一零件時 MUST 啟用該零件的 STEP 與 STL 下載。3MF 下載 MUST 僅依「雙色 3MF 輸出」的規則提供；其餘零件 MUST NOT 提供 3MF。

#### Scenario: 組裝呈現全部零件

- **WHEN** 清單為 `cards`、`dice`、`cards` 且 `part=assembly`
- **THEN** 模型 MUST 包含盒體、滑蓋、1 個骰子匣與 1 片封面片
- **AND** MUST NOT 包含分隔卡

#### Scenario: 組裝呈現帶文字的分隔卡

- **WHEN** 清單為 `cards`、`cards` 且 `divider1Text` 非空、`part=assembly`
- **THEN** 模型 MUST 包含盒體、滑蓋、1 片帶文字圖稿的分隔卡與 1 片封面片

#### Scenario: 組裝零件不重疊

- **WHEN** 以預設、最小與最大卡片尺寸搭配含 `dice` 模組的清單建構組裝，且 `dice` 模組分別位於第一、中間與最後
- **THEN** 任兩個零件的交集體積 MUST 為零

#### Scenario: Assembly 停用下載

- **WHEN** `part=assembly` 的修訂完成
- **THEN** 下載按鈕 MUST 全部停用且面板 MUST 顯示本地化提示

#### Scenario: 單一零件可下載

- **WHEN** 使用者選擇某個骰子匣零件且修訂完成
- **THEN** STEP 與 STL 下載 MUST 啟用且提示 MUST 消失

### Requirement: 匯出檔名

匯出檔名 MUST 以 `game-box-` 開頭並包含零件名稱與足以區分幾何的尺寸：`box` MUST 包含卡片寬、卡片高、推算收納深度與依序的模組清單；`lid` MUST 包含卡片寬、卡片高與推算收納深度；每片分隔卡 MUST 包含邊界序號、卡片寬、卡片高、推算收納深度、Tab 位置、樣式與文字的短穩定 token（空文字使用 `blank`），使設定相同的不同分隔卡檔名不同；封面片 MUST 包含卡片寬、卡片高、推算收納深度、樣式與圖稿的短穩定 token（由標題、副標題與 SVG 指紋推導）；骰子匣 MUST 包含卡片寬、卡片高、骰子邊長與顆數。模組清單 MUST 以每個模組的代號依序串接：`cards` 模組為 `c` 加卡片深度，`dice` 模組為 `d` 加骰子邊長。不同幾何 MUST NOT 產生相同檔名；`part=assembly` MUST NOT 產生檔名。

#### Scenario: 盒體檔名

- **WHEN** 卡片尺寸 70 × 120、清單為厚度 30 的 `cards` 模組與邊長 16 的 `dice` 模組，且 `part=box`
- **THEN** STEP 檔名 MUST 為 `game-box-box-70x120x54-c30-d16.step`

#### Scenario: 不同模組清單不得共用檔名

- **WHEN** 卡片尺寸 70 × 120，清單分別為厚度 30 的 `cards` 與邊長 16 的 `dice`、厚度 33 的 `cards` 與邊長 13 的 `dice`
- **THEN** 兩種清單的收納深度 MUST 都是 54 mm
- **AND** 兩者的盒體檔名 MUST 不同

#### Scenario: 骰子匣檔名

- **WHEN** 卡片尺寸 70 × 120、某 `dice` 模組邊長 16 顆數 9 且選擇該骰子匣
- **THEN** STEP 檔名 MUST 為 `game-box-dice-holder-70x120-d16x9.step`

#### Scenario: 分隔卡檔名以序號區分

- **WHEN** 兩片分隔卡欄位完全相同，分別選擇 `divider1` 與 `divider2` 匯出
- **THEN** 兩者的匯出檔名 MUST 不同
- **AND** 每個檔名 MUST 各自包含邊界序號

#### Scenario: 僅文字不同的分隔卡檔名不同

- **WHEN** 兩個分隔卡修訂僅 `dividerNText` 不同，其餘參數相同
- **THEN** 兩者的匯出檔名 MUST 不同

#### Scenario: 封面檔名

- **WHEN** 卡片尺寸 70 × 120、樣式 `flat` 且有標題，選擇 `cover` 匯出
- **THEN** STEP 檔名 MUST 以 `game-box-cover-` 開頭且含卡片尺寸與樣式 tokens
- **AND** 圖稿不同時檔名 token MUST 不同

#### Scenario: 3MF 檔名與 STEP 同名

- **WHEN** 具 accent 圖稿的封面片匯出 3MF
- **THEN** 3MF 檔名 MUST 為對應 STEP 檔名的 `.3mf` 版本


### Requirement: 參數持久化與漸進式預覽

`game-box` 的有效參數（含封面片與分隔卡欄位）MUST 依既有的 per-component 參數持久化機制保存與還原；無法通過目前驗證的已存資料 MUST 回到預設參數。封面 SVG 輪廓資料 MUST 依「封面 SVG 匯入（Beta）」存在 game-box 專屬 key，MUST NOT 進入參數紀錄。`game-box` 的每個零件選擇 MUST 提供漸進式簡化預覽，其外框尺寸 MUST 與完整幾何一致。

#### Scenario: 重新開啟後還原模組清單

- **GIVEN** 使用者已設定三個模組且參數有效
- **WHEN** 重新開啟 `/[locale]/cad/game-box`
- **THEN** 面板 MUST 顯示相同的三個模組與欄位值

#### Scenario: 無效的已存資料回到預設

- **GIVEN** 已存的參數違反模組連續規則
- **WHEN** workspace 初始化
- **THEN** 元件 MUST 使用預設參數且 MUST NOT 將無效資料送往 Worker

#### Scenario: 簡化預覽外框一致

- **WHEN** 任一零件的簡化預覽與完整幾何皆建構完成
- **THEN** 兩者的 bounding box 在各軸的差異 MUST 不超過 0.5 mm

#### Scenario: 還原封面與分隔卡欄位

- **GIVEN** 使用者已設定某片分隔卡的文字與封面標題且參數有效
- **WHEN** 重新開啟 `/[locale]/cad/game-box`
- **THEN** 面板 MUST 還原相同分隔卡與封面欄位值

#### Scenario: 指向已不存在的分隔卡回到預設

- **GIVEN** 已存的參數指向已不存在的分隔卡（例如模組清單已無相鄰的 `cards` 模組）
- **WHEN** workspace 初始化
- **THEN** 元件 MUST 使用預設參數且 MUST NOT 將無效資料送往 Worker

### Requirement: 驗證與本地化

`game-box` 的全部面板文字、零件名稱、提示與驗證錯誤 MUST 提供 `zh-Hant` 與 `en` 翻譯，MUST NOT 直接渲染未翻譯的訊息鍵。模組相關的驗證錯誤 MUST 顯示在對應的模組項目上；分隔卡欄位的驗證錯誤 MUST 顯示在對應的分隔卡項目上。分隔卡文字過寬與封面圖稿超出安全區 MUST 以本地化錯誤回報、阻止生成與匯出，且 MUST NOT 以靜默縮小、省略或替代的方式處理。

#### Scenario: 錯誤顯示在對應模組

- **WHEN** 模組 2 的骰子邊長超出範圍
- **THEN** 錯誤訊息 MUST 顯示在模組 2 的項目內
- **AND** 其他模組項目 MUST NOT 顯示該錯誤

#### Scenario: 兩種語系皆有文案

- **WHEN** 分別以 `zh-Hant` 與 `en` 開啟 game-box 面板
- **THEN** 全部標籤、提示與錯誤 MUST 以該語系顯示

#### Scenario: 分隔卡錯誤顯示在對應分隔卡

- **WHEN** `divider1Text` 超過長度上限
- **THEN** 錯誤訊息 MUST 顯示在 `divider1` 的項目內
- **AND** 其他分隔卡項目 MUST NOT 顯示該錯誤

