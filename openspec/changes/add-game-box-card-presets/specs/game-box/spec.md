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

### Requirement: 套用卡片尺寸預設只改變卡片尺寸

套用任一卡片尺寸 preset MUST 以使用者目前的參數為底疊合 overrides，因此只改變 cardWidth 與 cardHeight：模組清單、每個模組的欄位（類型、卡片區厚度、骰子邊長、骰子顆數）與推算出的收納深度 MUST 保持不變。零件選擇 MUST 保持不變，除非該零件已不存在，此時 MUST 回到 `assembly`。

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

### Requirement: 不適用目前模組的預設不套用

若套用 preset 後的參數集無效，MUST NOT 套用該 preset，MUST 保留使用者目前的參數，MUST NOT 改用預設參數取而代之，並 MUST 以本地化訊息（en 與 zh-Hant）告知使用者該預設不適用於目前的模組。若無效的原因只有零件選擇，MUST 改以 `assembly` 重試一次；仍無效時才視為不適用。

#### Scenario: 骰子放不下時不套用

- **GIVEN** 使用者的骰子匣模組有 9 顆 16 mm 的骰子
- **WHEN** 使用者套用「Mini American 41×63」preset
- **THEN** 該 preset MUST NOT 被套用
- **AND** 卡片尺寸與模組清單 MUST 保持不變
- **AND** 面板 MUST 顯示該預設不適用於目前模組的本地化訊息

#### Scenario: 零件失效時改用組裝

- **GIVEN** 使用者選中的零件在套用 preset 後已不存在
- **WHEN** 使用者套用該 preset
- **THEN** 該 preset MUST 以 `assembly` 套用
- **AND** 面板 MUST NOT 顯示不適用的訊息
