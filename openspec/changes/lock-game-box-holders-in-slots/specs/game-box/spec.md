# Spec Delta

## REMOVED Requirements

### Requirement: 骰子匣固定方式

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: 盒子尺寸推算

盒子的內部寬度與高度 MUST 由 `cardWidth` 與 `cardHeight` 決定，規則與 `card-box` 相同。收納深度 MUST 由模組清單推算：模組由前到後排列在盒子的分隔板槽架上，每個模組邊界 MUST 取讓該模組至少取得所需長度的**第一個可行位置**。

- `cards` 模組的所需長度 MUST 為 `cardDepth` 與 1.0 mm 卡片堆間隙之和；邊界上有分隔板時，該分隔板 MUST 由邊界兩側的模組各分得 0.425 mm。
- `dice` 模組的所需長度 MUST 為骰子匣厚度（`diceSize` + 0.6 mm 骰子間隙 + 1.6 mm 正面牆 + 1.2 mm 背面牆），且骰子匣 MUST 立在其區域的前端，使相鄰的卡片模組靠著骰子匣的牆。
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
- **THEN** 該模組的長度 MUST 為 19.4 mm（16 mm 骰子 + 0.6 mm 間隙 + 1.6 mm 正面牆 + 1.2 mm 背面牆），MUST NOT 進位到 21 mm
- **AND** 收納深度 MUST 為 24 mm
- **AND** 骰子匣的前端 MUST 距離前內牆面 2.3 mm，MUST NOT 貼著前內牆

#### Scenario: 多個模組加總

- **WHEN** 清單為厚度 30 的 `cards`、邊長 16 顆數 9 的 `dice`、厚度 20 的 `cards`
- **THEN** 收納深度 MUST 等於三個模組所需長度之和再向上進位到 3 mm 的整數倍，即 75 mm
- **AND** 收納深度 MUST 為 3 mm 的整數倍
- **AND** 組裝中 MUST 沒有分隔板（沒有任何兩個 `cards` 模組相鄰）

#### Scenario: 每個邊界都有槽

- **WHEN** 以任何有效的模組清單建構 `box` 零件
- **THEN** 兩側牆在每個模組邊界處 MUST 有分隔板槽
- **AND** 分隔板槽 MUST 每 3 mm 一道，數量 MUST 等於收納深度除以 3 再減一，MUST NOT 只開在模組邊界

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

面板 MUST 提供零件選擇器 `part`，預設為 `assembly`。可選項目 MUST 為：`assembly`、`box`、`lid`、`divider`，以及每個類型為 `dice` 的啟用模組各一個骰子匣項目（以模組編號識別）。`cards` 模組與 `none` 模組 MUST NOT 產生零件項目。沒有任何分隔板時（沒有任何兩個 `cards` 模組相鄰）`divider` MUST NOT 可選。`part` MUST 是模型參數：一次修訂只建構一個模型。`part` 指向不存在的零件（例如指向非 `dice` 的模組）時 MUST 被驗證拒絕；面板在清單操作使目前選擇失效時 MUST 將選擇回到 `assembly`。

`divider` 項目 MUST 顯示需要列印的片數，也就是**兩個 `cards` 模組相鄰的邊界數**。

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

### Requirement: 盒體、滑蓋與分隔板幾何

`game-box` 的盒體、滑蓋與分隔板 MUST 採用與 `card-box` 相同的設計：牆厚、地板、前緣封面槽與開窗、V 軌、卡扣、圓角、分隔板槽的寬度與深度、分隔板外形皆 MUST 相同，僅收納深度改用推算值與分隔板槽的位置改用槽架。盒體的兩側牆 MUST 每 3 mm 開一道分隔板槽，槽位自前內牆面起算；槽的數量 MUST 等於收納深度除以 3 再減一。封面槽 MUST 能容納厚度不超過 0.6 mm 的封面片或一張實體卡片。分隔板 MUST 為無文字的版本。單一零件 MUST 以列印方位輸出於列印床（z ≥ 0）。

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

### Requirement: 組裝預覽與下載限制

`part=assembly` 時，模型 MUST 於組裝座標框架呈現盒體、滑蓋、兩個 `cards` 模組之間的分隔板，以及每個 `dice` 模組位置上的骰子匣。`dice` 模組旁 MUST NOT 有分隔板。組裝中任兩個零件的交集體積 MUST 為零。`part=assembly` 時 STEP、STL 下載 MUST 全部停用並 MUST 顯示本地化的「請選擇零件以下載」提示；`part` 為單一零件時 MUST 啟用該零件的 STEP 與 STL 下載。`game-box` MUST NOT 提供 3MF 下載。

#### Scenario: 組裝呈現全部零件

- **WHEN** 清單為 `cards`、`dice`、`cards` 且 `part=assembly`
- **THEN** 模型 MUST 包含盒體、滑蓋與 1 個骰子匣
- **AND** MUST NOT 包含分隔板

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

匯出檔名 MUST 以 `game-box-` 開頭並包含零件名稱與足以區分幾何的尺寸：`box` MUST 包含卡片寬、卡片高、推算收納深度與依序的模組清單；`lid` 與 `divider` MUST 包含卡片寬、卡片高與推算收納深度；骰子匣 MUST 包含卡片寬、卡片高、骰子邊長與顆數。模組清單 MUST 以每個模組的代號依序串接：`cards` 模組為 `c` 加卡片深度，`dice` 模組為 `d` 加骰子邊長。不同幾何 MUST NOT 產生相同檔名；`part=assembly` MUST NOT 產生檔名。

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
