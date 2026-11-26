# game-box Specification

## Purpose

定義參數化桌遊收納盒 component `game-box`：盒體、前推滑蓋、封面槽與分隔板沿用 `card-box` 的設計，但收納深度由使用者排列的模組清單推算；第一版提供卡片區與骰子匣兩種模組，並支援零件層級下載。

## Requirements

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

### Requirement: 卡片尺寸預設

game-box MUST 透過 presets 機制宣告恰七組卡片尺寸預設：Tarot 70×120、Standard TCG 63×88、Standard TCG sleeved 66×91、Japanese small 59×86、Japanese small sleeved 62×89、Mini American 41×63、Mini Euro 44×68。每組 preset 的 overrides MUST 只描述 cardWidth 與 cardHeight；preset 標籤 MUST 使用 `cad.presets.game-box.*` 翻譯 key，並提供 en 與 zh-Hant 兩種語系。

#### Scenario: 預設清單與套用

- **WHEN** 使用者開啟 game-box 面板
- **THEN** preset 按鈕列 MUST 依序顯示回復預設與七組卡片尺寸 preset

#### Scenario: 全部七組預設皆可套用

- **GIVEN** 使用者尚未加入模組，模組清單為預設值
- **WHEN** 使用者依序套用七組卡片尺寸 preset
- **THEN** 每次套用 MUST 套用該組卡片尺寸
- **AND** 模型 MUST 以該組卡片尺寸重新生成

#### Scenario: 預設尺寸皆在允許範圍內

- **WHEN** 系統以 game-box 的 `defaultParameters` 疊合任一 preset 的 overrides
- **THEN** cardWidth MUST 落在 40–100 mm 且 cardHeight MUST 落在 60–150 mm
- **AND** 合併後的參數集 MUST 通過 game-box 驗證

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

若套用 preset 後的參數集無效，MUST NOT 套用該 preset，MUST 保留使用者目前的參數，MUST NOT 改用預設參數取而代之，並 MUST 以本地化訊息（en 與 zh-Hant）告知使用者該預設不適用於目前的模組。套用後封面圖樣確定無法放入安全區時（SVG 寬超過安全區寬、或依 `coverSvgAspect` 推算的 SVG 高度加上標題與副標題文字高堆疊超過安全區高），該參數集 MUST 視為無效並依相同規則不套用。相對地，套用後封面標題或副標題的**算繪寬度**（需要字型度量）放不下較小卡片時，該 preset MUST 照常套用，生成 MUST 以本地化錯誤失敗且不遺失任何欄位值（owner 決策 2026-11-26，選項 A）。

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

#### Scenario: 封面圖樣堆疊過高時不套用

- **GIVEN** 使用者已匯入高寬比 2 的封面 SVG 且 SVG 寬為 25 mm，卡片尺寸 70 × 120
- **WHEN** 使用者套用「Mini American 41×63」preset（安全區高 49 mm；堆疊 50 mm 加標題超出）
- **THEN** 該 preset MUST NOT 被套用
- **AND** 卡片尺寸與全部封面欄位 MUST 保持不變

#### Scenario: 文字寬度放不下時照常套用

- **GIVEN** 使用者的封面標題在 70 × 120 下算繪後無法放入 41 × 63 的安全區寬
- **WHEN** 使用者套用「Mini American 41×63」preset
- **THEN** 該 preset MUST 照常套用（owner 決策，選項 A）
- **AND** 生成 MUST 以本地化錯誤失敗，MUST NOT 縮小或裁切文字
- **AND** 全部欄位值 MUST 保留

### Requirement: 模組欄位組

系統 MUST 提供 6 個模組欄位組，編號 1 至 6。每組包含：類型 `type`（`none`、`cards`、`dice`）、卡片區厚度 `cardDepth`（範圍 3–150 mm；模組 1 預設 60，其餘模組預設 30）、骰子邊長 `diceSize`（預設 16，範圍 8–30 mm，步進 0.5）、骰子顆數 `diceCount`（預設 9，範圍 1–60 的整數）。全部參數 MUST 為扁平的單一值，並 MUST 通過與其他 component 相同的驗證、持久化與 Worker 傳遞機制。

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

盒子的內部寬度與高度 MUST 由 `cardWidth` 與 `cardHeight` 決定，規則與 `card-box` 相同。收納深度 MUST 由模組清單推算：模組由前到後排列在盒子的分隔板槽架上，每個模組邊界 MUST 取讓該模組至少取得所需長度的**第一個可行位置**。

每個模組在空腔中佔一個**區域**；區域的長度是**區域長度**，各區域的長度之和 MUST 等於收納深度。模組的**所需長度**是它自己需要的長度。

- `cards` 模組的所需長度 MUST 為 `cardDepth` 與 1.0 mm 卡片堆間隙之和；邊界上有分隔板時，該分隔板 MUST 由邊界兩側的模組各分得 0.425 mm。
- `dice` 模組的所需長度 MUST 為骰子匣厚度（`diceSize` + 0.6 mm 骰子間隙 + 1.6 mm 正面牆 + 1.2 mm 背面牆）。骰子匣 MUST 立在其區域內**第一個能讓兩支榫落在槽架上的位置**：緊接在 `cards` 模組之後時，該位置即區域前端（相鄰的 `cards` 模組靠著骰子匣的牆）；緊接在另一個 `dice` 模組之後時，該位置可比區域前端晚不到 3 mm（兩個骰子模組之間留一段空腔）。
- 分隔板 MUST 只放在**兩個 `cards` 模組之間**，且該分隔板 MUST 立在槽架的分隔板槽上。`cards` 與 `dice` 相鄰時 MUST NOT 放分隔板：骰子匣自己就是分隔板。
- 盒體的兩側牆 MUST 每 3 mm 開一道分隔板槽，自前內牆面起算、間隔 3 mm；收納深度 MUST 為 3 mm 的整數倍，槽架因此在前後各留 3 mm 餘裕，最後一道槽的整個槽帶 MUST 落在空腔內。
- 收納深度 MUST 為內容物所需長度**向上進位到 3 mm 的整數倍**；進位多出的空間 MUST 歸最後一個模組。

卡片深度與骰子邊長沒有輸入級距，MUST 以 0.01 mm 的精度讀回，使推算深度與匯出檔名不因輸入雜訊而指向不同幾何。推算出的收納深度 MUST 落在 15–150 mm；超出時 MUST 在 CAD 生成前以欄位級錯誤拒絕，錯誤 MUST 歸屬於最後一個啟用模組，且訊息中的深度 MUST 以兩位小數呈現。面板 MUST 以唯讀方式顯示推算出的內部與外部尺寸、收納深度，以及每個模組佔用的長度。

#### Scenario: 卡片區進位到槽距

- **WHEN** 清單只有一個厚度 30 的 `cards` 模組
- **THEN** 該模組所需的長度 MUST 為 31 mm（30 mm 卡片深度 + 1 mm 卡片堆間隙）
- **AND** 收納深度 MUST 向上進位到 3 mm 的整數倍，即 33 mm（MUST NOT 為 31 mm）
- **AND** 該模組的可用深度 MUST 為 33 mm，卡片實際有 3 mm 的間隙

#### Scenario: 骰子模組的長度不進位

- **WHEN** 清單只有一個邊長 16 顆數 9 的 `dice` 模組
- **THEN** 該模組的所需長度 MUST 為 19.4 mm（16 mm 骰子 + 0.6 mm 間隙 + 1.6 mm 正面牆 + 1.2 mm 背面牆），MUST NOT 進位到 21 mm
- **AND** 該模組的區域長度 MUST 為 24 mm（最後一個模組收掉深度進位的餘數）
- **AND** 收納深度 MUST 為 24 mm
- **AND** 骰子匣的前端 MUST 距離前內牆面 2.3 mm，MUST NOT 貼著前內牆

#### Scenario: 多個模組加總

- **WHEN** 清單為厚度 30 的 `cards`、邊長 16 顆數 9 的 `dice`、厚度 20 的 `cards`
- **THEN** 收納深度 MUST 等於三個模組所需長度之和再向上進位到 3 mm 的整數倍，即 75 mm
- **AND** 收納深度 MUST 為 3 mm 的整數倍
- **AND** 組裝中 MUST 沒有分隔板（沒有任何兩個 `cards` 模組相鄰）

#### Scenario: 槽架覆蓋整個空腔

- **WHEN** 以任何有效的模組清單建構 `box` 零件
- **THEN** 槽架 MUST 覆蓋整個空腔：兩側牆自前內牆面起每 3 mm 開一道分隔板槽，數量 MUST 等於收納深度除以 3 再減一
- **AND** 每道槽與前內牆面的距離 MUST 是 3 mm 的整數倍，MUST NOT 只開在模組邊界
- **AND** 需要分隔板的邊界（兩個 `cards` 模組之間）MUST 落在槽架上
- **AND** 與骰子匣相鄰的邊界 MUST NOT 立分隔板；槽的位置 MUST 只由 3 mm 的槽距決定，該邊界落在槽架之外也無妨

#### Scenario: 分隔板槽不落在固定間距上

- **WHEN** 清單為邊長 16 顆數 9 的 `dice` 模組、厚度 30 的 `cards` 模組
- **THEN** 兩者的分界處 MUST NOT 有分隔板：骰子匣自己就是分隔板
- **AND** 該分界與前內牆面的距離 MUST NOT 為 3 mm 的整數倍

#### Scenario: 總深度超出上限

- **WHEN** 模組清單推算出的收納深度超過 150 mm
- **THEN** 驗證 MUST 回報歸屬於最後一個啟用模組的欄位錯誤並阻止生成與匯出

#### Scenario: 面板顯示推算尺寸

- **WHEN** 使用者變更任一模組欄位且參數有效
- **THEN** 面板 MUST 更新唯讀的內部尺寸、外部尺寸、收納深度與各模組佔用的長度

#### Scenario: 卡片模組與骰子模組相鄰

- **WHEN** 清單為厚度 30 的 `cards`、邊長 16 顆數 9 的 `dice`
- **THEN** 收納深度 MUST 為 54 mm
- **AND** 卡片模組的可用深度 MUST 為 32.3 mm（卡片有 2.3 mm 的間隙）
- **AND** 骰子匣 MUST 立於 32.3 mm 處，其兩支榫的中心 MUST 在 33 mm 與 51 mm，兩者 MUST 都是分隔板槽的位置
- **AND** 組裝中 MUST 沒有分隔板

#### Scenario: 卡片模組得到額外空間

- **WHEN** 清單為任意有效的模組組合
- **THEN** 每個 `cards` 模組的可用深度 MUST 至少為 `cardDepth` + 1.0 mm
- **AND** 每個 `cards` 模組的可用深度 MUST 小於 `cardDepth` + 4.0 mm
- **AND** 面板 MUST 以唯讀方式顯示每個模組佔用的長度

#### Scenario: 分隔板只放在兩個卡片模組之間

- **WHEN** 清單為厚度 30 的 `cards`、厚度 30 的 `cards`
- **THEN** 組裝中 MUST 恰有 1 片分隔板
- **AND** 該分隔板 MUST 立於兩個 `cards` 模組之間的分隔板槽上

#### Scenario: 兩個卡片模組之間的分隔板落在槽上

- **WHEN** 清單為厚度 30 的 `cards`、厚度 30 的 `cards`
- **THEN** 兩者的分界處 MUST 有分隔板槽
- **AND** 該槽與前內牆面的距離 MUST 為 3 mm 的整數倍，即 33 mm

### Requirement: 零件選擇器

面板 MUST 提供零件選擇器 `part`，預設為 `assembly`。可選項目 MUST 為：`assembly`、`box`、`lid`、`cover`、每個「兩個 `cards` 模組相鄰」邊界各一個分隔卡項目 `divider1`…`dividerN`（N 為這類邊界的數量，以邊界的先後序號識別），以及每個類型為 `dice` 的啟用模組各一個骰子匣項目（以模組編號識別）。`cards` 模組與 `none` 模組 MUST NOT 產生零件項目。沒有任何分隔板時（沒有任何兩個 `cards` 模組相鄰）面板 MUST NOT 列出任何 `dividerN` 項目。`part` MUST 是模型參數：一次修訂只建構一個模型。`part` 指向不存在的零件（例如指向非 `dice` 的模組）時 MUST 被驗證拒絕；面板在清單操作使目前選擇失效時 MUST 將選擇回到 `assembly`。

每個分隔卡項目 MUST 以序號識別；欄位完全相同的多片分隔卡 MUST 仍以各自序號分開列出。`cover` MUST 列為可選項目。

#### Scenario: 骰子模組產生零件項目

- **WHEN** 清單為 `cards`、`dice`、`cards`
- **THEN** 零件選擇器 MUST 列出 `assembly`、`box`、`lid`、`cover` 與模組 2 的骰子匣
- **AND** MUST NOT 列出任何 `dividerN` 項目（沒有任何兩個 `cards` 模組相鄰）

#### Scenario: 沒有分隔板時分隔板不可選

- **WHEN** 清單為 `cards`、`dice`
- **THEN** 零件選擇器 MUST NOT 列出任何 `dividerN` 項目

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
- **THEN** 生成 MUST 失敗並回報本地化錯誤，錯誤訊息 MUST 以該分隔卡的序號指出是哪一片（例如「分隔卡 2」）
- **AND** 系統 MUST NOT 縮小文字或靜默省略文字

#### Scenario: 分隔卡與 card-box 相容

- **WHEN** 以相同卡片尺寸、空白文字與 Tab `left` 建構 `game-box` 的分隔卡與 `card-box` 的無文字 `divider`
- **THEN** 兩者的外形 MUST 相同
- **AND** 分別以 `left`、`center`、`right` 建構時，外形 MUST 與 `card-box` 對應 Tab 的無文字分隔板相同

### Requirement: 骰子匣幾何

每個 `dice` 模組 MUST 產生一個骰子匣零件：直立放入盒內的單一 solid，高度與卡片同高，上段為頂面開口的骰槽，下段墊高使骰槽靠近盒口。骰子匣 MUST 以直立、開口朝上的列印方位輸出於 z ≥ 0。

骰槽 MUST 能容納 `diceCount` 顆邊長 `diceSize` 的骰子。正面每一排位置 MUST 有一道寬度小於骰子邊長的直向開口，使骰子可見且可被手指推動但不會掉出。

骰子匣的正面牆厚 MUST 為 1.6 mm、背面牆厚 MUST 為 1.2 mm；兩側牆與底板厚度 MUST NOT 小於 1.2 mm。

#### Scenario: 骰子匣為單一 solid 且可列印

- **WHEN** 以任何有效參數建構骰子匣零件
- **THEN** 輸出 MUST 恰為一個 solid 且位於 z ≥ 0
- **AND** 其高度 MUST 等於 `cardHeight`
- **AND** 骰子匣在骰槽下方 MUST 為實心，且其底面 MUST 為本體完整截面

#### Scenario: 前後牆厚度

- **WHEN** 以邊長 16 顆數 9 建構骰子匣零件
- **THEN** 骰子匣的正面牆厚 MUST 為 1.6 mm、背面牆厚 MUST 為 1.2 mm
- **AND** 骰子匣厚度 MUST 為 19.4 mm（16 mm 骰子 + 0.6 mm 間隙 + 1.6 mm 正面牆 + 1.2 mm 背面牆）
- **AND** 兩側牆與底板厚度 MUST NOT 小於 1.2 mm

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

### Requirement: 骰子匣榫鎖

骰子匣 MUST 以榫鎖入盒子的分隔板槽，MUST NOT 以摩擦力固定：MUST NOT 有任何薄片、肋或摩擦元件。

骰子匣本體寬度 MUST 小於盒子內部寬度，每側 MUST 留 0.3 mm。本體的每一側 MUST 有**兩支榫**：

- 榫厚 MUST 為 0.85 mm（分隔板厚度），MUST 沿骰子匣的全高。
- 榫的外表面 MUST 與分隔板的外表面相同，入槽深度 MUST 與分隔板完全相同（分隔板外表面距內壁 0.175 mm，槽深 0.25 mm）。
- 榫 MUST 埋入本體 0.5 mm，使本體與榫為同一個 solid。
- 兩支榫的中心距 MUST 為**能放進本體的最大 3 mm 整數倍**（`floor((厚度 − 0.85) / 3) × 3`），並以本體置中。16 mm 與 18 mm 骰子的榫距 MUST 皆為 18 mm。
- 榫的中心 MUST 落在分隔板槽上；因此兩支榫 MUST 同時落在槽上，骰子匣 MUST 能插入槽架上的任何 3 mm 步進。

#### Scenario: 榫的厚度與入槽深度

- **WHEN** 以邊長 16 顆數 9 建構骰子匣零件
- **THEN** 每支榫在盒深度方向的厚度 MUST 為 0.85 mm
- **AND** 榫的外表面 MUST 距盒子內壁 0.175 mm，MUST NOT 與槽底接觸
- **AND** 榫 MUST 埋入本體 0.5 mm

#### Scenario: 榫距是 3 mm 的整數倍

- **WHEN** 遍歷骰子邊長 8 至 30 mm、步進 0.5 mm 的全部合法值
- **THEN** 兩支榫的中心距 MUST 為 3 mm 的整數倍
- **AND** 中心距 MUST NOT 超過骰子匣的厚度
- **AND** 16 mm 與 18 mm 骰子的中心距 MUST 皆為 18 mm

#### Scenario: 兩支榫都落在槽上

- **WHEN** 以任意有效的模組清單建構組裝
- **THEN** 每個骰子匣的每一支榫 MUST 落在盒體的分隔板槽內（榫帶 MUST 與槽帶重疊）
- **AND** 骰子匣與盒體的交集體積 MUST 為零

#### Scenario: 沒有握持元件

- **WHEN** 以任何有效參數建構骰子匣零件
- **THEN** 骰子匣 MUST NOT 有薄片、肋或任何摩擦元件
- **AND** 骰子匣的外表面 MUST 只有本體的兩側牆與兩支榫

#### Scenario: 骰子匣可以插進既有槽

- **WHEN** 盒子兩側牆已開好 3 mm 間距的分隔板槽
- **THEN** 骰子匣 MUST 能以兩支榫落入相鄰的兩道槽
- **AND** 骰子匣 MUST 不需要盒子另外開槽

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

匯出檔名 MUST 以 `game-box-` 開頭並包含零件名稱與足以區分幾何的尺寸：`box` MUST 包含卡片寬、卡片高、推算收納深度與依序的模組清單；`lid` MUST 包含卡片寬、卡片高與推算收納深度；每片分隔卡 MUST 包含邊界序號、卡片寬、卡片高、推算收納深度、Tab 位置、樣式與文字的短穩定 token（空文字使用 `blank`），使設定相同的不同分隔卡檔名不同；封面片 MUST 包含卡片寬、卡片高、推算收納深度、樣式與圖稿的短穩定 token（由標題、副標題、兩個文字高、SVG 寬與高寬比、垂直位置與 SVG 指紋推導，使不同幾何的封面 MUST NOT 共用檔名）；骰子匣 MUST 包含卡片寬、卡片高、骰子邊長與顆數。模組清單 MUST 以每個模組的代號依序串接：`cards` 模組為 `c` 加卡片深度，`dice` 模組為 `d` 加骰子邊長。不同幾何 MUST NOT 產生相同檔名；`part=assembly` MUST NOT 產生檔名。

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

- **WHEN** 使用者將任一模組前移或後移，且該操作未改變「兩個 `cards` 模組相鄰」的邊界數
- **THEN** 每個存在的分隔卡欄位 MUST 保持不變

#### Scenario: 清單操作新建的邊界從預設開始

- **WHEN** 任一清單操作（新增、刪除、移動）使某個序號的分隔卡從不存在變為存在（例如刪除 `cards`、`dice`、`cards` 中間的骰子模組，或移動骰子模組使兩個 `cards` 模組相鄰）
- **THEN** 該序號的分隔卡 MUST 以預設欄位出現
- **AND** MUST NOT 帶有任何先前的欄位值

#### Scenario: 清單操作移除的邊界重置為預設

- **WHEN** 任一清單操作使某個序號的分隔卡從存在變為不存在（例如刪除或移動骰子模組拆開原本相鄰的兩個 `cards` 模組）
- **THEN** 該序號的分隔卡欄位 MUST 回到預設值
- **AND** 之後任何操作重建該序號時 MUST 以預設欄位出現

#### Scenario: 移動使序號換到不同的實體邊界

- **WHEN** 清單為 `cards`、`dice`、`cards`、`cards`（分隔卡 1 在模組 3|4 之間），使用者將骰子模組後移，清單變為 `cards`、`cards`、`dice`、`cards`（分隔卡 1 在模組 1|2 之間）
- **THEN** 邊界數 MUST 保持 1
- **AND** 分隔卡 1 MUST 保留其全部欄位值，即使它所在的實體邊界已不同

### Requirement: 封面片參數

面板 MUST 暴露封面片欄位：標題 `coverTitle`（預設 `GAME`，上限 30 字元）、標題文字高 `coverTitleTextHeight`（4–20 mm 的整數 mm，預設 6）、副標題 `coverSubtitle`（預設空字串，上限 30 字元）、副標題文字高 `coverSubtitleTextHeight`（3–12 mm 的整數 mm，預設 5）、SVG 寬 `coverSvgWidth`（10–58 mm，預設 40）、垂直位置 `coverVerticalPosition`（0–100%，預設 30）、樣式 `coverStyle`（`raised`／`flat`，預設 `raised`）、使用 SVG 旗標 `usesCoverSvg`（預設 false）、資料指紋 `coverSvgFingerprint`（使用 SVG 時 MUST 非空）與高寬比 `coverSvgAspect`（預設 0 代表未知，規則見下方 scenario）。全部欄位 MUST 為扁平的單一值，並 MUST 通過與其他 component 相同的驗證、持久化與 Worker 傳遞機制。

#### Scenario: 高寬比隨匯入寫入並隨移除重置

- **WHEN** 使用者匯入封面 SVG
- **THEN** 參數紀錄 MUST 以清理後輪廓的高度除以寬度寫入 `coverSvgAspect`
- **WHEN** 使用者移除 SVG，或專屬 key 資料遺失或損毀而回退純文字版面
- **THEN** `coverSvgAspect` MUST 重置為 0（未知）
- **WHEN** 參數快照的 `coverSvgAspect` 為正的有限數
- **THEN** 該值 MUST 用於「封面圖樣堆疊過高」判斷與檔名 token
- **WHEN** `coverSvgAspect` 為 0、負數、非有限數或非數值
- **THEN** 其值 MUST 以 0（未知）處理
- **AND** `coverSvgAspect` MUST NOT 成為任何驗證錯誤的歸屬欄位
- **AND** `usesCoverSvg` 為 false 時，`coverSvgAspect` MUST 不參與驗證與檔名 token

#### Scenario: 預設封面參數

- **WHEN** 請求未提供任何封面欄位
- **THEN** 元件 MUST 使用標題 `GAME`、文字高 6／5、SVG 寬 40、垂直位置 30 與樣式 `raised`

#### Scenario: 封面欄位超出範圍

- **WHEN** 參數快照的 `coverTitleTextHeight` 為 25
- **THEN** 驗證 MUST 回報歸屬於 `coverTitleTextHeight` 的欄位錯誤並阻止生成與匯出

#### Scenario: 使用 SVG 但缺指紋被拒絕

- **WHEN** 參數快照的 `usesCoverSvg` 為 true 而 `coverSvgFingerprint` 為空字串
- **THEN** 驗證 MUST 回報欄位錯誤並阻止生成與匯出

#### Scenario: SVG 高度無法放入安全區

- **WHEN** `usesCoverSvg` 為 true、`coverSvgAspect` 為 2、`coverSvgWidth` 為 25，而卡片高 63（安全區高 49 mm；圖稿堆疊 50 mm 加標題 6 mm 超出）
- **THEN** 驗證 MUST 回報歸屬於 `coverSvgWidth` 的欄位錯誤並阻止生成與匯出
- **AND** 堆疊恰好等於安全區高 MUST 視為可放

#### Scenario: 未知高寬比不進行高度判斷

- **WHEN** `usesCoverSvg` 為 true 而 `coverSvgAspect` 為 0（未知）
- **THEN** 驗證 MUST NOT 因 SVG 高度回報錯誤
- **AND** 該佈局若實際放不下，生成 MUST 以本地化錯誤失敗（MUST NOT 縮小或裁切）

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

封面 MUST 支援使用者 SVG 匯入，控制項 MUST 帶「Beta」徽章。系統 MUST 在主執行緒以 DOMParser 僅作 XML 解析，MUST NOT 將使用者 SVG 插入頁面 DOM；MUST 保留填色形狀、套用 transform 與 viewBox、攤平曲線；MUST 以清楚訊息拒絕僅描邊路徑、`<text>`、`<image>` 與超過點數上限的輸入。清理後的輪廓資料（非原始 SVG）MUST 存在 game-box 專屬的 localStorage key（`shape-shortcut:game-box-cover-svg:v1`），上限 256 KB，僅保存一組，新匯入 MUST 取代舊資料。參數紀錄 MUST 保存 `usesCoverSvg` 旗標、資料指紋與高寬比 `coverSvgAspect`。資料遺失或損毀時 MUST 回退純文字版面並顯示提示；超過大小上限時資料 MUST 僅當前工作階段有效並告知使用者。Worker 建構請求 MUST 收到輪廓資料。game-box MUST NOT 讀取 card-box 的 SVG key。

#### Scenario: Beta 徽章顯示

- **WHEN** 使用者開啟 game-box 面板的 SVG 匯入控制項
- **THEN** 控制項 MUST 帶「Beta」徽章（en 與 zh-Hant 皆有對應翻譯 key）

#### Scenario: 有效 SVG 轉為輪廓

- **WHEN** 使用者匯入只含填色形狀的有效 SVG
- **THEN** 系統 MUST 產生清理後的輪廓資料並存入 game-box 專屬 key
- **AND** 參數紀錄 MUST 只更新 `usesCoverSvg` 旗標、指紋與高寬比

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
