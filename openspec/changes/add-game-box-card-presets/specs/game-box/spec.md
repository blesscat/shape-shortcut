# Spec Delta

## ADDED Requirements

### Requirement: 卡片尺寸預設

game-box MUST 透過 presets 機制宣告恰七組卡片尺寸預設：Tarot 70×120、Standard TCG 63×88、Standard TCG sleeved 66×91、Japanese small 59×86、Japanese small sleeved 62×89、Mini American 41×63、Mini Euro 44×68。每組 preset 的 overrides MUST 只描述 cardWidth 與 cardHeight；preset 標籤 MUST 使用 `cad.presets.game-box.*` 翻譯 key，並提供 en 與 zh-Hant 兩種語系。

#### Scenario: 預設清單與套用

- **WHEN** 使用者開啟 game-box 面板
- **THEN** preset 按鈕列 MUST 依序顯示回復預設與七組卡片尺寸 preset

#### Scenario: 全部七組預設皆可套用

- **WHEN** 使用者依序套用七組卡片尺寸 preset
- **THEN** 每次套用 MUST 套用該組卡片尺寸
- **AND** 模型 MUST 以該組卡片尺寸重新生成

#### Scenario: 預設尺寸皆在允許範圍內

- **WHEN** 系統以 game-box 的 `defaultParameters` 疊合任一 preset 的 overrides
- **THEN** cardWidth MUST 落在 40–100 mm 且 cardHeight MUST 落在 60–150 mm
- **AND** 合併後的參數集 MUST 通過 game-box 驗證

### Requirement: 套用卡片尺寸預設重置其他參數

套用任一卡片尺寸 preset MUST 依既有 presets 語義以 `defaultParameters` 疊合 overrides 重建完整參數集：零件選擇 MUST 回到 `assembly`，模組清單 MUST 回到預設的單一 `cards` 模組（模組 1、卡片區厚度 60 mm），模組 2 至 6 MUST 回到 `none`，骰子邊長 MUST 回到 16 mm、骰子顆數 MUST 回到 9，推算出的收納深度 MUST 回到 63 mm。

#### Scenario: 套用 preset 設定卡片尺寸

- **WHEN** 使用者套用「Standard TCG 63×88」preset
- **THEN** cardWidth MUST 為 63、cardHeight MUST 為 88
- **AND** 推算出的收納深度 MUST 為 63 mm

#### Scenario: 套用 preset 重置模組清單與零件選擇

- **GIVEN** 使用者已選擇 `box` 零件並加入一個 `dice` 模組
- **WHEN** 使用者套用任一卡片尺寸 preset
- **THEN** 零件選擇 MUST 回到 `assembly`
- **AND** 模組清單 MUST 回到只有模組 1 的 `cards` 模組（卡片區厚度 60 mm），模組 2 至 6 MUST 為 `none`
- **AND** 骰子邊長 MUST 為 16 mm、骰子顆數 MUST 為 9
