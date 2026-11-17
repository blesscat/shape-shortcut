## Purpose

定義參數化桌遊收納盒 component `game-box`：盒體、前推滑蓋、封面槽與分隔板沿用 `card-box` 的設計，但收納深度由使用者排列的模組清單推算；第一版提供卡片區與骰子匣兩種模組，並支援零件層級下載。

## ADDED Requirements

### Requirement: Game Box 元件註冊

系統 MUST 以獨立 component 註冊 `game-box`：`modelId`、`buildKey` 與 route slug 皆為 `game-box`，目錄 family 為 `other`，顯示名稱 MUST NOT 使用 `OpenGrid ` 前綴。`game-box` MUST 擁有自己的目錄定義、參數驗證器、kernel builder、Worker 分派、Svelte 面板與 route `/[locale]/cad/game-box`。既有全部 component（含 `card-box`）的 modelId、route、參數、幾何行為與匯出檔名 MUST 保持不變。

#### Scenario: Route 解析到 game-box

- **WHEN** 使用者開啟 `/[locale]/cad/game-box`
- **THEN** 該 route MUST 解析到 game-box 的目錄定義與專屬面板
- **AND** modelId、buildKey 與 route slug MUST 一致為 `game-box`

#### Scenario: Model chooser 列出 game-box

- **WHEN** 使用者開啟模型 chooser
- **THEN** game-box MUST 以 `other` family 列出且 MUST NOT 被隱藏
- **AND** 其項目 MUST 帶預覽圖

#### Scenario: card-box 不受影響

- **WHEN** 目錄載入 game-box 之後以預設參數建構 `card-box` 的 `box` 與 `lid`
- **THEN** 其幾何 MUST 仍符合 `card-box` 規格的參考幾何比對
- **AND** `card-box` 的參數鍵、route 與匯出檔名 MUST 維持原狀

### Requirement: 卡片尺寸參數

面板 MUST 暴露卡片寬 `cardWidth`（預設 70，範圍 40–100 mm）與卡片高 `cardHeight`（預設 120，範圍 60–150 mm），其意義與 `card-box` 相同（內部寬度為 `cardWidth + 0.5`，此調整 MUST NOT 暴露）。面板 MUST NOT 暴露收納深度參數。卡片尺寸 MUST 為扁平的單一值，並 MUST 通過與其他 component 相同的驗證、持久化與 Worker 傳遞機制；非有限值或超出範圍的值 MUST 在 CAD 生成前以欄位級錯誤拒絕。

#### Scenario: 預設卡片尺寸

- **WHEN** 請求未提供任何參數
- **THEN** 元件 MUST 使用 cardWidth 70 與 cardHeight 120

#### Scenario: 卡片尺寸超出範圍

- **WHEN** 參數快照中的 cardWidth 為 120
- **THEN** 驗證 MUST 回報歸屬於 cardWidth 的欄位錯誤並阻止生成與匯出

### Requirement: 模組欄位組

系統 MUST 提供 6 個模組欄位組，編號 1 至 6。每組包含：類型 `type`（`none`、`cards`、`dice`）、卡片區厚度 `cardDepth`（預設 30，範圍 3–150 mm）、骰子邊長 `diceSize`（預設 16，範圍 8–30 mm，步進 0.5）、骰子顆數 `diceCount`（預設 9，範圍 1–60 的整數）。全部參數 MUST 為扁平的單一值，並 MUST 通過與其他 component 相同的驗證、持久化與 Worker 傳遞機制。

#### Scenario: 預設模組欄位值

- **WHEN** 請求未提供任何參數
- **THEN** 模組 1 MUST 為厚度 60 的 `cards`，模組 2 至 6 MUST 為 `none`

#### Scenario: 模組欄位超出範圍

- **WHEN** 參數快照中某模組的 `cardDepth` 為 200
- **THEN** 驗證 MUST 回報歸屬於該模組 `cardDepth` 的欄位錯誤並阻止生成與匯出

### Requirement: 模組連續規則

模組 1 的類型 MUST NOT 為 `none`。類型為 `none` 的模組之後 MUST NOT 出現非 `none` 的模組。預設參數 MUST 為單一 `cards` 模組（厚度 60），其餘模組為 `none`。非有限值、超出範圍、未知類型或違反上述排列規則的參數 MUST 在 CAD 生成前以欄位級錯誤拒絕。

#### Scenario: 模組必須連續

- **WHEN** 參數快照中模組 2 為 `none` 而模組 3 為 `dice`
- **THEN** 驗證 MUST 回報欄位錯誤並阻止生成與匯出

#### Scenario: 至少一個模組

- **WHEN** 參數快照中模組 1 為 `none`
- **THEN** 驗證 MUST 回報欄位錯誤並阻止生成與匯出

#### Scenario: 非啟用模組的欄位不影響結果

- **WHEN** 兩份參數快照只在某個 `cards` 模組的 `diceSize` 或 `diceCount` 上不同
- **THEN** 兩者推算出的盒子尺寸與全部零件幾何 MUST 相同

### Requirement: 模組清單操作

面板 MUST 以由前到後排列的清單呈現啟用中的模組，並提供新增（選擇 `cards` 或 `dice`）、刪除、前移與後移操作。每個模組項目 MUST 只顯示該類型需要的欄位。啟用模組達 6 個時新增操作 MUST 停用並顯示本地化提示；只剩 1 個啟用模組時刪除操作 MUST 停用。任何清單操作的結果 MUST 仍滿足「模組連續」的參數合約，並 MUST 觸發重新生成。

#### Scenario: 新增模組

- **WHEN** 清單有 2 個模組且使用者新增一個 `dice` 模組
- **THEN** 清單 MUST 顯示 3 個模組，第 3 個為 `dice` 並帶預設邊長與顆數
- **AND** 模型 MUST 重新生成

#### Scenario: 刪除中間的模組

- **WHEN** 清單為 `cards`、`dice`、`cards` 且使用者刪除第 2 個
- **THEN** 清單 MUST 變為兩個 `cards` 模組且原第 3 個模組的厚度 MUST 保留在第 2 個位置
- **AND** 參數快照 MUST 仍通過驗證

#### Scenario: 調整順序

- **WHEN** 使用者將第 2 個模組前移
- **THEN** 第 1 與第 2 個模組的類型與欄位值 MUST 互換

#### Scenario: 達到上限

- **WHEN** 清單已有 6 個模組
- **THEN** 新增操作 MUST 停用
- **AND** 面板 MUST 顯示本地化的上限提示

#### Scenario: 最後一個模組不可刪除

- **WHEN** 清單只剩 1 個模組
- **THEN** 該模組的刪除操作 MUST 停用

### Requirement: 盒子尺寸推算

盒子的內部寬度與高度 MUST 由 `cardWidth` 與 `cardHeight` 決定，規則與 `card-box` 相同。收納深度 MUST 由模組清單推算：每個啟用模組佔用整數個分隔板槽距（槽距 3 mm），收納深度為全部模組佔用長度的總和。

- `cards` 模組佔用的槽數 MUST 為使「佔用長度減去一片分隔板厚度」不小於 `cardDepth` 的最小整數。
- `dice` 模組佔用的槽數 MUST 為能容納該骰子匣厚度（含與相鄰分隔板的間隙）的最小整數。

相鄰模組之間 MUST 各有一片分隔板，且盒體 MUST 在每個模組邊界處有對應的分隔板槽。推算出的收納深度 MUST 落在 20–150 mm；超出時 MUST 在 CAD 生成前以欄位級錯誤拒絕，錯誤 MUST 歸屬於最後一個啟用模組。面板 MUST 以唯讀方式顯示推算出的內部與外部尺寸，以及每個模組佔用的長度。

#### Scenario: 卡片區進位到槽距

- **WHEN** 清單只有一個厚度 30 的 `cards` 模組
- **THEN** 該模組 MUST 佔用 33 mm（11 個槽距）
- **AND** 收納深度 MUST 為 33 mm

#### Scenario: 多個模組加總

- **WHEN** 清單為厚度 30 的 `cards`、邊長 16 顆數 9 的 `dice`、厚度 20 的 `cards`
- **THEN** 收納深度 MUST 等於三個模組佔用長度的總和，且為 3 mm 的整數倍
- **AND** 組裝中 MUST 恰有 2 片分隔板，分別位於兩個模組邊界

#### Scenario: 每個邊界都有槽

- **WHEN** 以任何有效的模組清單建構 `box` 零件
- **THEN** 兩側牆在每個模組邊界處 MUST 有分隔板槽

#### Scenario: 總深度超出上限

- **WHEN** 模組清單推算出的收納深度超過 150 mm
- **THEN** 驗證 MUST 回報歸屬於最後一個啟用模組的欄位錯誤並阻止生成與匯出

#### Scenario: 面板顯示推算尺寸

- **WHEN** 使用者變更任一模組欄位且參數有效
- **THEN** 面板 MUST 更新唯讀的內部尺寸、外部尺寸與各模組佔用長度

### Requirement: 零件選擇器

面板 MUST 提供零件選擇器 `part`，預設為 `assembly`。可選項目 MUST 為：`assembly`、`box`、`lid`、`divider`，以及每個類型為 `dice` 的啟用模組各一個骰子匣項目（以模組編號識別）。`cards` 模組與 `none` 模組 MUST NOT 產生零件項目。只有 1 個啟用模組時 `divider` MUST NOT 可選。`part` MUST 是模型參數：一次修訂只建構一個模型。`part` 指向不存在的零件（例如指向非 `dice` 的模組）時 MUST 被驗證拒絕；面板在清單操作使目前選擇失效時 MUST 將選擇回到 `assembly`。

`divider` 項目 MUST 顯示需要列印的片數（啟用模組數減一）。

#### Scenario: 骰子模組產生零件項目

- **WHEN** 清單為 `cards`、`dice`、`cards`
- **THEN** 零件選擇器 MUST 列出 `assembly`、`box`、`lid`、`divider` 與模組 2 的骰子匣
- **AND** `divider` 項目 MUST 標示 2 片

#### Scenario: 指向無效零件被拒絕

- **WHEN** 參數快照的 `part` 指向模組 1 的骰子匣而模組 1 為 `cards`
- **THEN** 驗證 MUST 回報欄位錯誤並阻止生成與匯出

#### Scenario: 刪除模組後選擇回到 assembly

- **WHEN** 使用者選擇了模組 2 的骰子匣後刪除模組 2
- **THEN** 零件選擇 MUST 變為 `assembly`

### Requirement: 盒體、滑蓋與分隔板幾何

`game-box` 的盒體、滑蓋與分隔板 MUST 採用與 `card-box` 相同的設計：牆厚、地板、前緣封面槽與開窗、V 軌、卡扣、圓角、分隔板槽的寬度與深度、分隔板外形皆 MUST 相同，僅收納深度改用推算值。封面槽 MUST 能容納厚度不超過 0.6 mm 的封面片或一張實體卡片。分隔板 MUST 為無文字的版本。單一零件 MUST 以列印方位輸出於列印床（z ≥ 0）。

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

### Requirement: 骰子匣幾何

每個 `dice` 模組 MUST 產生一個骰子匣零件：直立放入盒內的單一 solid，高度與卡片同高，上段為頂面開口的骰槽，下段墊高使骰槽靠近盒口。骰子匣 MUST 以直立、開口朝上的列印方位輸出於 z ≥ 0。

骰槽 MUST 能容納 `diceCount` 顆邊長 `diceSize` 的骰子。正面每一排位置 MUST 有一道寬度小於骰子邊長的直向開口，使骰子可見且可被手指推動但不會掉出。

#### Scenario: 骰子匣為單一 solid 且可列印

- **WHEN** 以任何有效參數建構骰子匣零件
- **THEN** 輸出 MUST 恰為一個 solid 且位於 z ≥ 0
- **AND** 其高度 MUST 等於 `cardHeight`
- **AND** 骰子匣在骰槽下方 MUST 為實心，且其底面 MUST 為本體完整截面

### Requirement: 骰子排列

排列 MUST 依下列規則推算（`p` 為骰子邊長加 0.6 mm 間隙）：

- 每排上限為骰子匣本體寬度扣除兩側最小牆厚後可容納的 `p` 的個數。
- 層數上限為骰子匣高度扣除骰槽底板與頂部餘裕後可容納的 `p` 的個數。
- 層數為顆數除以每排上限後無條件進位；每排顆數為顆數除以層數後無條件進位，使各層盡量排滿。

`diceCount` 超過每排上限乘以層數上限時 MUST 以歸屬於 `diceCount` 的欄位錯誤拒絕，且錯誤 MUST 帶出可容納的最大顆數。

#### Scenario: 預設骰子排列

- **WHEN** 卡片尺寸為 70 × 120，骰子邊長 16、顆數 9
- **THEN** 排列 MUST 為每排 3 顆、共 3 層

#### Scenario: 少量骰子

- **WHEN** 卡片尺寸為 70 × 120，骰子邊長 16、顆數 3
- **THEN** 排列 MUST 為每排 3 顆、共 1 層

#### Scenario: 顆數超過容量

- **WHEN** 卡片尺寸為 40 × 60，某 `dice` 模組的骰子邊長為 30、顆數為 9
- **THEN** 驗證 MUST 回報歸屬於該模組 `diceCount` 的欄位錯誤
- **AND** 錯誤訊息參數 MUST 包含可容納的最大顆數 1

### Requirement: 骰子匣固定方式

骰子匣 MUST 以摩擦力固定而非鎖入側牆槽：本體寬度 MUST 小於盒子內部寬度，兩側各 MUST 有彈性元件，其自然狀態下的最外寬度 MUST 大於盒子內部寬度，且 MUST 能被壓縮至不超過本體寬度。骰子匣厚度 MUST 使其能放入所佔用槽距的相鄰分隔板之間。

#### Scenario: 彈性元件提供摩擦

- **WHEN** 以預設參數建構骰子匣
- **THEN** 本體寬度 MUST 小於盒子內部寬度 70.5 mm
- **AND** 兩側彈性元件自然狀態下的最外寬度 MUST 大於 70.5 mm

### Requirement: 組裝預覽與下載限制

`part=assembly` 時，模型 MUST 於組裝座標框架呈現盒體、滑蓋、每個模組邊界上的分隔板，以及每個 `dice` 模組位置上的骰子匣。組裝中任兩個零件的交集體積 MUST 為零。`part=assembly` 時 STEP、STL 下載 MUST 全部停用並 MUST 顯示本地化的「請選擇零件以下載」提示；`part` 為單一零件時 MUST 啟用該零件的 STEP 與 STL 下載。`game-box` MUST NOT 提供 3MF 下載。

#### Scenario: 組裝呈現全部零件

- **WHEN** 清單為 `cards`、`dice`、`cards` 且 `part=assembly`
- **THEN** 模型 MUST 包含盒體、滑蓋、2 片分隔板與 1 個骰子匣
- **AND** 骰子匣 MUST 位於第 1 與第 2 片分隔板之間

#### Scenario: 組裝零件不重疊

- **WHEN** 以預設、最小與最大卡片尺寸搭配含 `dice` 模組的清單建構組裝
- **THEN** 任兩個零件的交集體積 MUST 為零

#### Scenario: Assembly 停用下載

- **WHEN** `part=assembly` 的修訂完成
- **THEN** 下載按鈕 MUST 全部停用且面板 MUST 顯示本地化提示

#### Scenario: 單一零件可下載

- **WHEN** 使用者選擇某個骰子匣零件且修訂完成
- **THEN** STEP 與 STL 下載 MUST 啟用且提示 MUST 消失

### Requirement: 匯出檔名

匯出檔名 MUST 以 `game-box-` 開頭並包含零件名稱與足以區分幾何的尺寸：`box`、`lid` 與 `divider` MUST 包含卡片寬、卡片高與推算收納深度；骰子匣 MUST 包含卡片寬、卡片高、骰子邊長與顆數。不同幾何 MUST NOT 產生相同檔名；`part=assembly` MUST NOT 產生檔名。

#### Scenario: 盒體檔名

- **WHEN** 卡片尺寸 70 × 120、推算收納深度 75 且 `part=box`
- **THEN** STEP 檔名 MUST 為 `game-box-box-70x120x75.step`

#### Scenario: 骰子匣檔名

- **WHEN** 卡片尺寸 70 × 120、某 `dice` 模組邊長 16 顆數 9 且選擇該骰子匣
- **THEN** STEP 檔名 MUST 為 `game-box-dice-holder-70x120-d16x9.step`

### Requirement: 參數持久化與漸進式預覽

`game-box` 的有效參數 MUST 依既有的 per-component 參數持久化機制保存與還原；無法通過目前驗證的已存資料 MUST 回到預設參數。`game-box` 的每個零件選擇 MUST 提供漸進式簡化預覽，其外框尺寸 MUST 與完整幾何一致。

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

### Requirement: 驗證與本地化

`game-box` 的全部面板文字、零件名稱、提示與驗證錯誤 MUST 提供 `zh-Hant` 與 `en` 翻譯，MUST NOT 直接渲染未翻譯的訊息鍵。模組相關的驗證錯誤 MUST 顯示在對應的模組項目上。

#### Scenario: 錯誤顯示在對應模組

- **WHEN** 模組 2 的骰子邊長超出範圍
- **THEN** 錯誤訊息 MUST 顯示在模組 2 的項目內
- **AND** 其他模組項目 MUST NOT 顯示該錯誤

#### Scenario: 兩種語系皆有文案

- **WHEN** 分別以 `zh-Hant` 與 `en` 開啟 game-box 面板
- **THEN** 全部標籤、提示與錯誤 MUST 以該語系顯示
