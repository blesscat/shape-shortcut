# Spec Delta

## MODIFIED Requirements

### Requirement: 盒子尺寸推算

盒子的內部寬度與高度 MUST 由 `cardWidth` 與 `cardHeight` 決定，規則與 `card-box` 相同。收納深度 MUST 由模組清單推算：每個啟用模組的長度直接計算，收納深度為全部模組長度的總和，MUST NOT 進位到分隔板槽距。

- `cards` 模組的長度 MUST 為 `cardDepth`、卡片堆間隙與一片分隔板厚度之和。
- `dice` 模組的長度 MUST 為骰子匣厚度（`diceSize` + 骰子間隙 + 2 × 0.8 mm 前後牆）、與相鄰分隔板兩側各 0.3 mm 的間隙，以及一片分隔板厚度之和。

相鄰模組之間 MUST 各有一片分隔板，且盒體 MUST 在每個模組邊界處有對應的分隔板槽；分隔板槽 MUST 只開在模組邊界，其位置 MUST 由模組長度決定。推算出的收納深度 MUST 落在 20–150 mm；超出時 MUST 在 CAD 生成前以欄位級錯誤拒絕，錯誤 MUST 歸屬於最後一個啟用模組。面板 MUST 以唯讀方式顯示推算出的內部與外部尺寸，以及每個模組佔用的長度。

#### Scenario: 卡片區進位到槽距

- **WHEN** 清單只有一個厚度 30 的 `cards` 模組
- **THEN** 該模組的長度 MUST 為 31.85 mm（30 mm 卡片深度 + 1 mm 卡片堆間隙 + 0.85 mm 分隔板份額）
- **AND** 該模組 MUST NOT 再進位到 11 個槽距的 33 mm
- **AND** 收納深度 MUST 為 31.85 mm

#### Scenario: 骰子模組的長度不進位

- **WHEN** 清單只有一個邊長 16 顆數 9 的 `dice` 模組
- **THEN** 該模組的長度 MUST 為 19.65 mm（18.2 mm 骰子匣厚度 + 2 × 0.3 mm 間隙 + 0.85 mm 分隔板份額）
- **AND** 收納深度 MUST 為 19.65 mm，MUST NOT 為 21 mm

#### Scenario: 多個模組加總

- **WHEN** 清單為厚度 30 的 `cards`、邊長 16 顆數 9 的 `dice`、厚度 20 的 `cards`
- **THEN** 收納深度 MUST 等於三個模組長度的總和，即 31.85 + 19.65 + 21.85 = 73.35 mm
- **AND** 收納深度 MUST NOT 為 3 mm 的整數倍
- **AND** 組裝中 MUST 恰有 2 片分隔板，分別位於兩個模組邊界

#### Scenario: 每個邊界都有槽

- **WHEN** 以任何有效的模組清單建構 `box` 零件
- **THEN** 兩側牆在每個模組邊界處 MUST 有分隔板槽
- **AND** 分隔板槽的數量 MUST 等於啟用模組數減一，MUST NOT 在其他位置開槽

#### Scenario: 分隔板槽不落在固定間距上

- **WHEN** 清單為邊長 16 顆數 9 的 `dice` 模組、厚度 30 的 `cards` 模組
- **THEN** 兩者的分界處 MUST 有分隔板槽
- **AND** 該槽與前內牆的距離 MUST 由前一模組的長度決定，MUST NOT 為 3 mm 的整數倍

#### Scenario: 總深度超出上限

- **WHEN** 模組清單推算出的收納深度超過 150 mm
- **THEN** 驗證 MUST 回報歸屬於最後一個啟用模組的欄位錯誤並阻止生成與匯出

#### Scenario: 面板顯示推算尺寸

- **WHEN** 使用者變更任一模組欄位且參數有效
- **THEN** 面板 MUST 更新唯讀的內部尺寸、外部尺寸與各模組佔用的長度

### Requirement: 骰子匣幾何

每個 `dice` 模組 MUST 產生一個骰子匣零件：直立放入盒內的單一 solid，高度與卡片同高，上段為頂面開口的骰槽，下段墊高使骰槽靠近盒口。骰子匣 MUST 以直立、開口朝上的列印方位輸出於 z ≥ 0。

骰槽 MUST 能容納 `diceCount` 顆邊長 `diceSize` 的骰子。正面每一排位置 MUST 有一道寬度小於骰子邊長的直向開口，使骰子可見且可被手指推動但不會掉出。

骰子匣的正面與背面牆厚 MUST 為 0.8 mm；兩側牆與底板厚度 MUST NOT 小於 1.2 mm。

#### Scenario: 骰子匣為單一 solid 且可列印

- **WHEN** 以任何有效參數建構骰子匣零件
- **THEN** 輸出 MUST 恰為一個 solid 且位於 z ≥ 0
- **AND** 其高度 MUST 等於 `cardHeight`
- **AND** 骰子匣在骰槽下方 MUST 為實心，且其底面 MUST 為本體完整截面

#### Scenario: 前後牆厚度

- **WHEN** 以邊長 16 顆數 9 建構骰子匣零件
- **THEN** 骰子匣的正面與背面牆厚 MUST 為 0.8 mm
- **AND** 骰子匣厚度 MUST 為 18.2 mm（16 mm 骰子 + 0.6 mm 間隙 + 2 × 0.8 mm 前後牆）
- **AND** 兩側牆與底板厚度 MUST NOT 小於 1.2 mm

### Requirement: 骰子匣固定方式

骰子匣 MUST 以摩擦力固定而非鎖入側牆槽：本體寬度 MUST 小於盒子內部寬度，兩側各 MUST 有彈性元件，其自然狀態下的最外寬度 MUST 大於盒子內部寬度，且 MUST 能被壓縮至不超過本體寬度。彈性元件 MUST 沿其長度方向與本體連續連接，MUST NOT 只在兩端與本體相連。骰子匣厚度 MUST 使其能放入相鄰分隔板之間，且與每一側的分隔板或盒壁之間 MUST 至少留 0.3 mm 的間隙。

#### Scenario: 彈性元件提供摩擦

- **WHEN** 以預設參數建構骰子匣
- **THEN** 本體寬度 MUST 小於盒子內部寬度 70.5 mm
- **AND** 兩側彈性元件自然狀態下的最外寬度 MUST 大於 70.5 mm

#### Scenario: 握持元件不可只靠兩端連接

- **WHEN** 以任何有效參數建構骰子匣，並在握持區的任意高度切出薄片
- **THEN** 該薄片 MUST 恰為一個連通區域，MUST NOT 出現與本體分離的握持元件
- **AND** 握持元件 MUST 沿其長度方向與本體連續連接

### Requirement: 匯出檔名

匯出檔名 MUST 以 `game-box-` 開頭並包含零件名稱與足以區分幾何的尺寸：`box` MUST 包含卡片寬、卡片高、推算收納深度與依序的模組清單；`lid` 與 `divider` MUST 包含卡片寬、卡片高與推算收納深度；骰子匣 MUST 包含卡片寬、卡片高、骰子邊長與顆數。模組清單 MUST 以每個模組的代號依序串接：`cards` 模組為 `c` 加卡片深度，`dice` 模組為 `d` 加骰子邊長。不同幾何 MUST NOT 產生相同檔名；`part=assembly` MUST NOT 產生檔名。

#### Scenario: 盒體檔名

- **WHEN** 卡片尺寸 70 × 120、清單為厚度 30 的 `cards` 模組與邊長 16 的 `dice` 模組，且 `part=box`
- **THEN** STEP 檔名 MUST 為 `game-box-box-70x120x51.5-c30-d16.step`

#### Scenario: 不同模組清單不得共用檔名

- **WHEN** 卡片尺寸 70 × 120，清單分別為厚度 30 的 `cards` 與邊長 16 的 `dice`、厚度 33 的 `cards` 與邊長 13 的 `dice`
- **THEN** 兩種清單的收納深度 MUST 都是 51.5 mm
- **AND** 兩者的盒體檔名 MUST 不同

#### Scenario: 骰子匣檔名

- **WHEN** 卡片尺寸 70 × 120、某 `dice` 模組邊長 16 顆數 9 且選擇該骰子匣
- **THEN** STEP 檔名 MUST 為 `game-box-dice-holder-70x120-d16x9.step`
