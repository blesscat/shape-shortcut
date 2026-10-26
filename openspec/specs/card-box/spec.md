# card-box Specification

## Purpose
定義參數化卡片收藏盒 component `card-box`：以 replicad 重建 FreeCAD 原始設計的盒體、滑蓋、分隔板與封面片，提供卡片尺寸預設、零件層級下載、選配文字與 SVG 圖稿（Beta），並為每個零件選擇提供漸進式簡化預覽。

## Requirements
### Requirement: Card Box 元件註冊

系統 MUST 以獨立 component 註冊 `card-box`：`modelId`、`buildKey` 與 route slug 皆為 `card-box`，目錄 family 為 `other`，顯示名稱 MUST NOT 使用 `OpenGrid ` 前綴。`card-box` MUST 擁有自己的目錄定義、參數驗證器、kernel builder、Worker 分派、Svelte 面板與 route `/[locale]/cad/card-box`。既有全部 component 的 modelId、route、參數、幾何行為與匯出檔名 MUST 保持不變。

#### Scenario: Route 解析到 card-box

- **WHEN** 使用者開啟 `/[locale]/cad/card-box`
- **THEN** 該 route MUST 解析到 card-box 的目錄定義與專屬面板
- **AND** modelId、buildKey 與 route slug MUST 一致為 `card-box`（無 `opengrid-` 前綴）

#### Scenario: 既有 component 不受影響

- **WHEN** 目錄載入 card-box 之後
- **THEN** 其他 component 的 modelId、參數、幾何行為與匯出檔名 MUST 全部維持原狀

#### Scenario: Model chooser 列出 card-box

- **WHEN** 使用者開啟模型 chooser
- **THEN** card-box MUST 以 `other` family 列出且 MUST NOT 被隱藏
- **AND** 其項目 MUST 帶預覽圖

### Requirement: 卡片尺寸參數合約

面板 MUST 只暴露三個尺寸參數（公厘）：卡片寬 `cardWidth`（預設 70，範圍 40–100）、卡片高 `cardHeight`（預設 120，範圍 60–150）、收納深度 `storageDepth`（預設 72，範圍 20–150）。使用者輸入的寬度是卡片尺寸；系統 MUST 在內部以 `W = cardWidth + 0.5` 作為內部寬度，且此 0.5 mm 調整 MUST NOT 作為參數暴露。牆厚 `t = 3` 與間隙 `c = 0.2` MUST 是元件組態中的固定常數，MUST NOT 暴露為參數。非有限值或超出範圍的參數 MUST 在 CAD 生成前以欄位級錯誤拒絕。

#### Scenario: 預設參數

- **WHEN** 請求未提供 cardWidth、cardHeight 或 storageDepth
- **THEN** 元件 MUST 使用 70、120、72
- **AND** 內部寬度 MUST 為 70.5 mm

#### Scenario: 內部寬度調整不暴露

- **WHEN** 使用者將卡片寬設為任意範圍內值
- **THEN** 面板 MUST 只顯示使用者輸入的卡片尺寸
- **AND** 生成端 MUST 以 cardWidth + 0.5 作為內部寬度

#### Scenario: 超出範圍被拒絕

- **WHEN** 任一尺寸參數非有限或超出其範圍
- **THEN** 驗證 MUST 在 CAD 生成前回報該欄位的錯誤並阻止生成與匯出

### Requirement: 零件選擇器

面板 MUST 提供零件選擇器 `part`：`assembly`（預設）、`box`、`lid`、`divider`、`cover`。`part` MUST 是模型參數：一次修訂仍只建構一個模型，選擇的零件決定建構與下載標的。切換零件 MUST 觸發重新生成；未知零件值 MUST 被驗證拒絕。

#### Scenario: 預設為 Assembly

- **WHEN** card-box workspace 以預設參數初始化
- **THEN** 零件選擇器 MUST 為 `assembly` 且模型 MUST 呈現組裝狀態

#### Scenario: 切換零件重建

- **WHEN** 使用者將零件選擇器切到 `lid`
- **THEN** 新修訂 MUST 只建構並呈現上蓋零件

#### Scenario: 未知零件被拒絕

- **WHEN** 參數快照的 part 不是五個允許值之一
- **THEN** 驗證 MUST 回報欄位錯誤並阻止生成與匯出

### Requirement: 列印方位與組裝座標框架

單一零件的建構輸出與匯出 MUST 以列印方位放置於列印床（z ≥ 0）：盒體開口朝上；上蓋翻轉使其平整頂面貼床；分隔板平放；封面片平放且圖稿朝上。`assembly` MUST 於組裝座標框架放置全部零件（盒體、上蓋、一片位於中央分隔板槽的分隔板、封面片）。參考幾何比對（盒體、上蓋）MUST 於組裝座標框架進行；builder MUST 提供測試可用的組裝框架零件形狀。

#### Scenario: 單一零件以列印方位輸出

- **WHEN** 分別建構 `box`、`lid`、`divider`、`cover` 單一零件
- **THEN** 每個零件的幾何 MUST 位於 z ≥ 0 的列印床方位（上蓋為翻轉後的貼床方位）

#### Scenario: Assembly 維持組裝框架

- **WHEN** `part=assembly` 建構
- **THEN** 全部零件 MUST 呈現組裝座標框架中的相對位置（盒體在下、上蓋於滑入軌道上、分隔板與封面片就位）

### Requirement: Assembly 下載限制

`part=assembly` 時，模型 MUST 呈現全部四個零件的組裝狀態（含一片置於中央分隔板槽的分隔板），且 STEP/STL/3MF 下載 MUST 全部停用，並 MUST 顯示「請選擇零件以下載」提示。`part` 為單一零件時，該零件的下載 MUST 依其可用格式啟用。

#### Scenario: Assembly 停用下載並顯示提示

- **WHEN** `part=assembly` 的修訂完成
- **THEN** 下載按鈕 MUST 全部停用
- **AND** 面板 MUST 顯示本地化的「請選擇零件以下載」提示

#### Scenario: 選擇零件後下載啟用

- **WHEN** 使用者選擇 `box`
- **THEN** 該零件修訂完成後 STEP 與 STL 下載 MUST 依可用格式啟用
- **AND** 提示 MUST 消失

### Requirement: 盒體幾何

盒體 MUST 保留原始 FreeCAD 特徵鏈的外部行為：外部寬 `W+2t`、外殼厚 `t`、常數 2 mm 地板、前緣標籤信道（預設在 y −38.95..−38.1 留 0.85 mm 間隙讓封面片滑入；信道寬度 MUST 等於內部寬度 `W`，兩側牆 MUST 在信道處保持實心，MUST NOT 被切穿）、前緣卡唇與 `W−10` 開窗、背牆延伸至 `H+7` 加 0.4 mm 唇、`z = H−8` 外部階差（其上側牆厚 1 mm）、兩側滑蓋 V 軌（預設右側截面 x 36.25..37.25、base z 115..119、flat z 116..118、45 度側斜、沿 Y 開放至背面）、每側 4 顆 0.9 mm 卡扣凸點（z 119.4..121.5、僅外側面前端（−Y）邊緣有 0.4 倒角、於 `D−5` 範圍內等距鏡像）、1.85 mm 前緣凸緣，以及外部底邊（四邊）與四條外部垂直角邊的 1 mm 圓角（內腔底部 MUST NOT 有圓角）。分隔板槽 MUST 為 1 mm 寬、每 3 mm 一槽、槽中心位於 y = ±k·3（k = 0..`floor(D/2/3)−1`，y = 0 共用一條），MUST 涵蓋盒體前後兩半且兩側牆皆有（D=72 時共 23 個不重複位置）、恰 0.25 mm 深的側牆刻槽。修正項：分隔板槽 MUST 從地板頂面（z = 2）開始，MUST NOT 切穿 2 mm 地板。

#### Scenario: 預設尺寸符合參考幾何

- **WHEN** 以預設參數於組裝座標框架建構盒體（未套用列印方位轉換）
- **THEN** 其 bbox MUST 為 76.5 × 78.05 × 127.4 mm（各軸容差 0.05 mm）
- **AND** 與參考幾何的對稱差（各方向）MUST 不超過 1 mm³（參考體積 101967.4 mm³）
- **AND** 輸出 MUST 恰為一個 solid

#### Scenario: 分隔板槽涵蓋整個盒體

- **WHEN** 以預設參數建構 `box` 零件
- **THEN** 兩側牆在 y = −33、−3、0、3、33 MUST 皆有分隔板槽（z ≥ 2 的 0.25 mm 槽帶內無材料）
- **AND** 最後一個槽位之外（如 y = ±34.5）與槽間（如 y = ±1.5）MUST 保持實體

#### Scenario: 分隔板槽不切穿地板

- **WHEN** 盒體以任何有效參數建構
- **THEN** 側牆分隔板槽 MUST 只存在於 z ≥ 2（地板頂面）以上
- **AND** z ∈ [0, 2] 的地板 MUST 保持完整無槽

#### Scenario: 前緣信道間隙

- **WHEN** 以預設參數建構盒體
- **THEN** 前緣標籤信道在 y −38.95..−38.1 的間隙 MUST 允許 0.6 mm 封面片通過
- **AND** 信道旁的側牆 MUST 為實心（例如 x = 37、y = −38.5、z = 50 有材料）

#### Scenario: 組裝後零件不與盒體重疊

- **WHEN** 蓋體、封面片與分隔板置入組裝座標框架
- **THEN** 三者與盒體的交集體積 MUST 皆為零
- **AND** 封面片（本體與 flat 樣式的 accent）與上蓋的交集體積 MUST 為零（預設、最小、最大與 Mini American 41×63 尺寸，raised 與 flat 樣式皆然）

### Requirement: 滑蓋幾何

上蓋 MUST 是無背裙的 U 形滑蓋，從背面往前方滑入。蓋體溝槽 MUST 與盒體兩側 V 軌以間隙 `c` 嚙合，並 MUST 含每側 4 個鏡像的卡扣凹槽（預設寬 2.2、深 1、z 範圍 2.31）。蓋體內形 MUST 以明確間隙 `c` 繪製，MUST NOT 使用盒體外形的 OCCT offset 推導。蓋體溝槽 MUST 為盒體 V 軌截面以間隙 `c` 垂直偏移後的梯形（斜面位於軌道斜面下方 `c·√2`），且 MUST 在前端封閉（自前緣起 1.65 mm 內無溝槽）。蓋板頂面 MUST 於前緣與兩側緣有 1 mm 圓角，背緣 MUST 保持直角。前緣凸緣在封面片寬度（x ±`W/2`）內 MUST 薄化為 1 mm（凸緣後表面與盒體卡唇內表面 y −38.95 齊平，自凸緣底至深部下緣 `H+2.2`），使 0.85 mm 信道間隙持續延伸到深部下緣，0.6 mm 封面片得以放入；深部（`z ≥ H+2.2`）與 `|x| > W/2` 的側條 MUST 維持不變。此為相對原始 FreeCAD 上蓋的刻意差異：原始 1.6 mm 凸緣會佔用信道前 0.6 mm，使封面片與上蓋重疊（預設 240.3 mm³），而上蓋位置因卡扣限制無法移動。除此薄化外，預設蓋體 MUST 符合參考幾何。

#### Scenario: 預設尺寸符合參考幾何

- **WHEN** 以預設參數於組裝座標框架建構上蓋（未套用列印方位翻轉）
- **THEN** 其 bbox MUST 為 76.5 × 78 × 16.8 mm 且 z 範圍 112.2..129（各軸容差 0.05 mm）
- **AND** 與「參考幾何減去薄化修剪盒（x ±`W/2`、y −38.95..−38.35、z 112.2..122.2；預設）」的對稱差（各方向）MUST 不超過 1 mm³，且被修剪的體積 MUST 約為 `0.6 × [(W−10) × 5.2 + 2 × 5 × 10]`（預設 248.8 mm³），證明只有凸緣被薄化（參考體積 16303.3 mm³；另一刻意差異為背側口袋：參考口袋比卡扣凸條窄，會使參考蓋體與盒體重疊 0.13 mm³，本實作保持口袋寬 `W` 而不重疊）
- **AND** 卡扣凹槽截面 MUST 與盒體卡扣凸點對應（預設寬 2.2、深 1、z 範圍 2.31）

#### Scenario: 薄化凸緣讓出封面片信道

- **WHEN** 以預設參數於組裝座標框架建構上蓋
- **THEN** 在 x = 0 與 x = `W/2 − 2`、z = `H−2` 與 `H+1` 處，y −38.95..−38.35 MUST 無材料
- **AND** 同位置 y −39.95..−38.95 MUST 有材料

#### Scenario: 軌道槽與 V 軌嚙合

- **WHEN** 以相同參數建構盒體與上蓋
- **THEN** 蓋體軌道槽截面 MUST 與盒體 V 軌截面保持間隙 `c`（預設右側槽 x 36.45..37.45、z 114.92..119.08）
- **AND** 卡扣凹槽 MUST 與盒體卡扣凸點位置對應

### Requirement: 分隔板幾何

分隔板 MUST 是單一板件：板厚 0.85 mm 以放入 1 mm 分隔板槽，板寬 MUST 為 `W + 0.5 − 0.15`（預設 70.85 mm，置中，兩側各留 0.075 mm 槽底間隙），使板緣進入兩側牆的 0.25 mm 分隔板槽。板身高度 MUST 為卡片高度 `H`；只有頂部的拉 Tab 高出板身 5 mm（整體高度 `H+5`）。Tab 底寬 MUST 為 30.5 mm（自板緣量至側緣與板身頂線相交處），側緣 MUST 自垂直向 Tab 內傾 20°（草斜在板面內，Tab 往上變窄），側緣與板身頂線（凹）及與 Tab 頂（凸）交接處 MUST 以 R3 圓角相接；板的四個外角（兩個底角、Tab 外側頂角、另一端的板身頂角）MUST 為 R2.5 圓角。Tab 位置 MUST 提供 `left`／`center`／`right` 選項（預設 `left`，與原始 FreeCAD 分隔板一致）：`right` 為 `left` 的鏡像；`center` 的 Tab 置於板中央，兩側緣皆內傾 20° 並以 R3 圓角相接，兩個板身頂角與兩個底角為 R2.5。分隔板 MUST 支援選配文字（空字串 = 素板），使用內建 Noto Sans CJK TC Bold，文字高約 5 mm；文字外框頂端 MUST 低於 Tab 頂 0.8 mm（`H+4.2`），`left` Tab 的文字 MUST 自左板緣起 2.25 mm 開始、`right` Tab 的文字 MUST 於右板緣前 2.25 mm 結束、`center` Tab 的文字 MUST 置中於 Tab。文字 MUST 與 Tab 頂處的側緣保持至少 1 mm 距離；放不進 Tab 時 MUST 回報錯誤，MUST NOT 縮小文字。分隔板 MUST 提供與封面片相同的兩種樣式：raised 單色（凸 0.4）或 flat 雙色（0.4 凹槽）。

#### Scenario: 板件與槽相容

- **WHEN** 以預設參數建構 `divider` 零件
- **THEN** 板厚 MUST 約 0.85 mm 且可進入 1 mm 分隔板槽
- **AND** 板身高度 MUST 為 `H`（預設 120 mm），含 Tab 的整體高度 MUST 為 `H+5`（預設 125 mm）

#### Scenario: 預設素板與原始分隔板一致

- **WHEN** 以預設參數建構無文字的 `divider` 零件
- **THEN** 外框 MUST 為 70.85 × 125 × 0.85 mm（誤差 0.05 mm 內）
- **AND** 體積 MUST 為 7347.9 mm³（誤差 0.5% 內），且 MUST 為單一實體

#### Scenario: 板緣進入兩側分隔板槽

- **WHEN** 分隔板置入組裝件
- **THEN** 板的 X 範圍 MUST 超出內壁（±`W/2`）進入槽內，且 MUST 不超過槽底（±(`W/2 + 0.25`)）
- **AND** 分隔板與盒體的交集體積 MUST 為零

#### Scenario: Tab 以外的區域高度為 H

- **WHEN** 以 `left` 建構分隔板
- **THEN** Tab 內的板頂 MUST 為 `H+5`，Tab 以外的板頂 MUST 為 `H`

#### Scenario: Tab 位置選項

- **WHEN** 分別以 `left`、`center`、`right` 建構分隔板
- **THEN** Tab MUST 分別位於板的左端、中央、右端，且板件其餘行為不變

#### Scenario: 文字過寬回報錯誤

- **WHEN** 分隔板文字無法放入 Tab 寬度
- **THEN** 生成 MUST 失敗並回報本地化錯誤
- **AND** 系統 MUST NOT 縮小文字或靜默省略文字

#### Scenario: 空文字為素板

- **WHEN** 分隔板文字為空字串
- **THEN** 分隔板 MUST 建構為無文字的素板

### Requirement: 封面片幾何與版面

封面片 MUST 是 `W × H × 0.6` 的平板（預設 70.5 × 120 × 0.6），從前緣標籤信道滑入。封面片頂面（z = `H+2`）MUST 低於上蓋深部下緣（`H+2.2`）0.2 mm。可見區 MUST 為 `（W−10）×（H−10）`：左、右、下各 5 mm 被盒體卡唇遮蔽，頂部 5 mm（`H−3` 以上）被上蓋薄化凸緣遮蔽；安全區 MUST 是可見區再內縮 `coverSafeAreaMargin`（預設 70.5 × 120 時 x 7..63.5、y 7..113）。圖稿超出安全區 MUST 回報錯誤，MUST NOT 縮小或裁切。版面 MUST 是置中堆疊（由上至下：選配 SVG、標題、選配副標題），水平置中；標題與副標題 MUST 各自有文字高度參數，SVG MUST 有寬度參數。垂直位置 MUST 是 0–100% 的滑桿（預設 30%）：0% = 群組頂貼齊安全區頂、50% = 置中、100% = 群組底貼齊安全區底；只有群組高度超過安全區時才 MUST 回報錯誤。預設標題 MUST 是中性文字「CARDS」。樣式 MUST 提供 raised 單色（圖稿凸 0.4）與 flat 雙色（圖稿齊平於 0.4 凹槽）。

#### Scenario: 預設封面

- **WHEN** 以預設參數建構 `cover` 零件
- **THEN** 板件 MUST 為 70.5 × 120 × 0.6 mm
- **AND** 版面 MUST 顯示預設標題「CARDS」，無 SVG 與副標題
- **AND** 垂直位置 MUST 為 30%

#### Scenario: 圖稿超出安全區回報錯誤

- **WHEN** 任一版面元素（SVG 或文字行）超出安全區
- **THEN** 生成 MUST 失敗並回報本地化錯誤
- **AND** 系統 MUST NOT 縮小、裁切或靜默省略該元素

#### Scenario: 垂直位置滑桿

- **WHEN** 垂直位置設為 0%、50% 或 100%
- **THEN** 版面群組 MUST 分別貼齊安全區頂、置中、貼齊安全區底
- **AND** 群組高度未超過安全區時 MUST NOT 產生錯誤

### Requirement: 雙色 3MF 輸出

`part=divider` 或 `part=cover` 且零件具有 accent 圖稿時（分隔板：非空文字；封面：標題、副標題或 SVG 任一存在），3MF 輸出 MUST 恰含 `body` 與 `accent` 兩個 parts，分別對應擠出機 1 與擠出機 2；`raised` 與 `flat` 樣式皆 MUST 提供此輸出，行為與標籤卡一致。無 accent 圖稿的素板（分隔板空文字、封面無標題／副標題／SVG）MUST 僅提供 STEP/STL 且 MUST NOT 提供 3MF。`box`、`lid` 與 `assembly` MUST NOT 提供 3MF。

#### Scenario: Flat 封面輸出雙色 3MF

- **WHEN** `part=cover`、樣式 `flat` 且有標題的修訂匯出 3MF
- **THEN** 套件 MUST 恰含 body 與 accent 兩個 parts
- **AND** body MUST 對應擠出機 1、accent MUST 對應擠出機 2

#### Scenario: Raised 分隔板含文字輸出雙色 3MF

- **WHEN** `part=divider`、樣式 `raised` 且文字非空的修訂匯出 3MF
- **THEN** 套件 MUST 恰含 body 與 accent 兩個 parts
- **AND** body MUST 對應擠出機 1、accent MUST 對應擠出機 2

#### Scenario: 素板無 3MF

- **WHEN** 分隔板文字為空，或封面無標題、副標題與 SVG
- **THEN** 3MF 下載 MUST 停用
- **AND** STEP 與 STL 下載 MUST 保持可用

### Requirement: 匯出檔名

匯出檔名 MUST 具決定性且不同組態間 MUST NOT 碰撞。`box` 與 `lid` 檔名 MUST 含卡片尺寸（寬、高、深）tokens。`divider` 檔名 MUST 含卡片尺寸、Tab 位置、樣式，以及文字的短穩定 token（空文字使用 `blank`）。`cover` 檔名 MUST 含卡片尺寸、樣式，以及圖稿的短穩定 token（由標題、副標題與 SVG 指紋推導）。

#### Scenario: 僅文字不同的分隔板檔名不同

- **WHEN** 兩個分隔板修訂僅分隔板文字不同，其餘參數相同
- **THEN** 兩者的匯出檔名 MUST 不同

#### Scenario: Box 與 Lid 檔名含卡片尺寸

- **WHEN** 使用者分別以相同卡片尺寸匯出 box 與 lid
- **THEN** 兩個檔名 MUST 各含其零件識別與相同的卡片尺寸 tokens
- **AND** 同一零件在不同卡片尺寸下的檔名 MUST 不同

### Requirement: SVG 匯入（Beta）

封面 MUST 支援使用者 SVG 匯入，控制項 MUST 帶「Beta」徽章。系統 MUST 在主執行緒以 DOMParser 僅作 XML 解析，MUST NOT 將使用者 SVG 插入頁面 DOM。系統 MUST 保留填色形狀（path/rect/circle/ellipse/polygon/polyline）、套用 transform 與 viewBox、攤平曲線；MUST 以清楚訊息拒絕僅描邊路徑、`<text>`、`<image>` 與超過點數上限的輸入。清理後的輪廓資料（非原始 SVG）MUST 存在專屬的 localStorage key，與共用參數紀錄分離；上限 256 KB；僅保存一組 SVG，新匯入 MUST 取代舊資料。參數紀錄 MUST 只保存「使用 SVG」旗標與資料指紋。資料遺失或損毀時 MUST 回退純文字版面並顯示提示；超過大小上限時資料 MUST 僅在當前工作階段有效並告知使用者。Worker 建構請求 MUST 收到輪廓資料。

#### Scenario: Beta 徽章顯示

- **WHEN** 使用者開啟 card-box 面板的 SVG 匯入控制項
- **THEN** 控制項 MUST 帶「Beta」徽章（en 與 zh-Hant 皆有對應翻譯 key）

#### Scenario: 有效 SVG 轉為輪廓

- **WHEN** 使用者匯入只含填色形狀的有效 SVG
- **THEN** 系統 MUST 產生清理後的輪廓資料並存入專屬 key
- **AND** 參數紀錄 MUST 只更新使用旗標與指紋

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

### Requirement: 參數持久化

card-box 參數 MUST 透過既有 `component-parameter-persistence` 機制以 `card-box` 的 modelId 保存與還原。SVG 輪廓資料 MUST NOT 進入該參數紀錄，MUST 保存在 SVG 匯入的專屬 key。

#### Scenario: 重新載入後參數還原

- **WHEN** 使用者調整參數後重新載入 card-box workspace
- **THEN** 面板 MUST 還原最後的有效參數並據此生成

#### Scenario: SVG 資料與參數紀錄分離

- **WHEN** 系統寫入或讀取 card-box 的持久化資料
- **THEN** 參數紀錄 MUST 不含 SVG 輪廓資料本身
- **AND** 輪廓資料 MUST 只存在於專屬 key

### Requirement: 卡片尺寸預設

card-box MUST 透過 presets 機制宣告恰七組卡片尺寸預設：Tarot 70×120、Standard TCG 63×88、Standard TCG sleeved 66×91、Japanese small 59×86、Japanese small sleeved 62×89、Mini American 41×63、Mini Euro 44×68。每組 preset 的 overrides MUST 只描述 cardWidth 與 cardHeight；套用任一 preset 後 storageDepth MUST 回到預設 72。preset 標籤 MUST 使用翻譯 key（en 與 zh-Hant）。套用 preset MUST 依既有 presets 語義以 `defaultParameters` 疊合 overrides 重建完整參數集：零件選擇與分隔板／封面選項 MUST 一併回到預設，但專屬 key 中的 SVG 輪廓資料 MUST NOT 被刪除。

#### Scenario: 預設清單與套用

- **WHEN** 使用者開啟 card-box 面板
- **THEN** preset 按鈕列 MUST 依序顯示回復預設與七組卡片尺寸 preset

#### Scenario: 套用 preset 後深度回到預設

- **WHEN** 使用者套用「Standard TCG 63×88」preset
- **THEN** cardWidth MUST 為 63、cardHeight MUST 為 88
- **AND** storageDepth MUST 為預設 72

#### Scenario: 套用 preset 重置選項但保留 SVG 資料

- **WHEN** 使用者在調整過零件選擇、樣式與封面文字後套用任一卡片尺寸 preset
- **THEN** 零件選擇 MUST 回到 `assembly`，分隔板與封面選項 MUST 回到各自預設
- **AND** 專屬 key 中的 SVG 輪廓資料 MUST 保持存在
- **AND** 僅 `usesCoverSvg` 旗標與指紋隨參數集回到預設值

### Requirement: 漸進式預覽

card-box MUST 為每一個零件選擇提供同步簡化預覽：assembly（中空盒體、上蓋、分隔板片與封面片組合）、box（中空盒體）、lid、divider（板片）、cover（板片），以 `cad-progressive-preview` 的 description 原語建構，且 MUST 在精確 CAD 生成完成前顯示。

#### Scenario: 每個零件選擇都有預覽

- **WHEN** 任一 `part` 值在引擎載入期間或精確生成完成前有效
- **THEN** 簡化預覽 MUST 呈現該選擇的可辨識比例
- **AND** 預覽 MUST 隨參數變更即時更新

### Requirement: 參數邊界建構

四個零件 MUST 在參數範圍邊界都能成功建構：最小（40 × 60 × 20）與最大（100 × 150 × 150）皆 MUST 以預設參數（含預設標題「CARDS」，預設標題文字高度 6 mm）無錯誤完成生成。預設標題 MUST 能放入最小卡寬的封面安全區。

#### Scenario: 最小尺寸建構成功

- **WHEN** cardWidth=40、cardHeight=60、storageDepth=20 時依序建構 box、lid、divider、cover（皆使用預設參數）
- **THEN** 每個零件 MUST 成功產生有效幾何

#### Scenario: 所有卡片尺寸預設皆可建構

- **WHEN** 對七組卡片尺寸 preset 各自以預設參數疊合 overrides 建構 `assembly` 與 `cover`
- **THEN** 每次建構 MUST 無錯誤完成

#### Scenario: 最大尺寸建構成功

- **WHEN** cardWidth=100、cardHeight=150、storageDepth=150 時依序建構 box、lid、divider、cover
- **THEN** 每個零件 MUST 成功產生有效幾何

### Requirement: 驗證與本地化錯誤

card-box 的所有驗證錯誤與幾何錯誤（文字過寬、圖稿超出安全區、SVG 拒絕等）MUST 以欄位級或代碼化的本地化訊息回報（en 與 zh-Hant），MUST 阻止生成與匯出，且 MUST NOT 以靜默縮小、省略或替代的方式處理。全部面板字串、模型名稱與描述、preset 標籤與錯誤訊息 MUST 同時提供 `en` 與 `zh-Hant` 翻譯。

#### Scenario: 錯誤在地化呈現

- **WHEN** 任一 card-box 驗證或幾何錯誤發生
- **THEN** 使用者 MUST 以當前 locale 看到對應的錯誤訊息
- **AND** 匯出 MUST 保持停用直到輸入有效

#### Scenario: 翻譯完整性

- **WHEN** 網站以 `en` 或 `zh-Hant` 載入 card-box route
- **THEN** 面板、預設與錯誤訊息 MUST 無缺少翻譯 key
