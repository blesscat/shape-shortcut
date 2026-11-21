## MODIFIED Requirements

### Requirement: Preset 參數解析與驗證

套用任一 preset 時，系統 MUST 疊合 preset `overrides` 形成完整參數集，並 MUST 先通過該 component 現行的參數驗證才套用。預設的疊合底是該 component 的 `defaultParameters`；component 定義 MAY 宣告 `presetBase: 'current'`，改以呼叫端交來的目前參數為底，此時疊合結果 MUST 只改變 preset `overrides` 涵蓋的欄位，其餘欄位 MUST 保持使用者目前的值。驗證不通過的 preset MUST NOT 套用，MUST NOT 更新任何已保存參數，也 MUST NOT 改以 `defaultParameters` 取而代之；以目前參數為底的 component 若無效的原因只有零件選擇，MUST 改以 `assembly` 重試一次，仍無效時 MUST NOT 套用，並 MUST 以本地化訊息告知使用者。preset 疊合 MUST NOT 修改 `defaultParameters` 本身，也不得影響其他 component 的參數。

#### Scenario: 驗證通過才套用

- **WHEN** 某個 preset 疊合後的參數集通過 `opengrid-stackable-box` 驗證
- **THEN** 該參數集 MUST 原樣成為套用目標，不得再被其他來源改寫

#### Scenario: 驗證不通過時不套用

- **WHEN** 某個 preset 疊合後的參數集未通過該 component 驗證
- **THEN** 系統 MUST 保留使用者目前參數與已保存值不變
- **AND** MUST NOT 以錯誤或 worker 失敗的形式回報

#### Scenario: 宣告以目前參數為底時只改變 preset 涵蓋的欄位

- **GIVEN** component 定義宣告 `presetBase: 'current'`
- **WHEN** 使用者套用任一 preset
- **THEN** 疊合 MUST 以使用者目前的參數為底
- **AND** 結果 MUST 只改變 preset `overrides` 涵蓋的欄位，其餘欄位 MUST 保持使用者目前的值

#### Scenario: 零件失效時改用組裝

- **GIVEN** component 定義宣告 `presetBase: 'current'`，且使用者選中的零件在套用 preset 後已不存在
- **WHEN** 使用者套用該 preset
- **THEN** 系統 MUST 改以 `assembly` 重試一次並套用該結果
- **AND** MUST NOT 顯示不適用的訊息

#### Scenario: 不適用時保留參數並顯示訊息

- **GIVEN** component 定義宣告 `presetBase: 'current'`
- **WHEN** 套用 preset 後的參數集仍然無效
- **THEN** 系統 MUST 保留使用者目前的參數與已保存值
- **AND** MUST NOT 改以 `defaultParameters` 取而代之
- **AND** MUST 以本地化訊息告知使用者該 preset 不適用
