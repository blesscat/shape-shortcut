# component-parameter-presets Specification

## Purpose

讓每個已註冊 CAD component 可以宣告多組命名參數預設（presets），在 workspace 參數面板以按鈕列一鍵套用：點擊即以該組預設覆蓋使用者目前參數並走既有驗證與持久化機制。第一個採用的 component 是 `opengrid-stackable-box`（方盒）。

## Requirements

### Requirement: Component 定義可宣告命名參數預設

Component 定義 MUST 支援選擇性的命名參數預設清單。每個 preset MUST 具備穩定的 `id`、穩定的翻譯 key（不得直接渲染原始字串），以及只描述與 `defaultParameters` 差異的 `overrides` 部分參數集。未宣告 presets 的 component MUST 維持現有行為。本變更僅為 `opengrid-stackable-box` 提供 presets；其他 component 的 modelId、route 與定義內容 MUST 保持不變。

#### Scenario: 未宣告 presets 的 component 不受影響

- **WHEN** 使用者開啟任何未宣告 presets 的 component workspace（例如 `/cad/box`）
- **THEN** 參數面板 MUST 只顯示既有的回復預設按鈕，行為與外觀不變

#### Scenario: 方盒宣告一個測試 preset

- **WHEN** 系統載入 `opengrid-stackable-box` 的 component 定義
- **THEN** 該定義 MUST 含恰一個測試 preset（`3x3-desk-style`）
- **AND** 其 overrides MUST 只描述網格與 desk 預設體質的差異欄位（x、y、height、頂緣模式、底部模式）

### Requirement: Preset 參數解析與驗證

套用任一 preset 時，系統 MUST 以該 component 的 `defaultParameters` 為底疊合 preset `overrides` 形成完整參數集，並 MUST 先通過該 component 現行的參數驗證才套用。驗證不通過的 preset MUST NOT 套用，且 MUST NOT 更新任何已保存參數。preset 疊合 MUST NOT 修改 `defaultParameters` 本身，也不得影響其他 component 的參數。

#### Scenario: 驗證通過才套用

- **WHEN** 某個 preset 疊合後的參數集通過 `opengrid-stackable-box` 驗證
- **THEN** 該參數集 MUST 原樣成為套用目標，不得再被其他來源改寫

#### Scenario: 驗證不通過時不套用

- **WHEN** 某個 preset 疊合後的參數集未通過該 component 驗證
- **THEN** 系統 MUST 保留使用者目前參數與已保存值不變
- **AND** MUST NOT 以錯誤或 worker 失敗的形式回報

### Requirement: Preset 按鈕列

宣告 presets 的 component MUST 在參數面板頂部顯示 preset 按鈕列：第一顆為「回復預設」，行為 MUST 與現有 restore-defaults 完全一致（在支援的 system context 下套用該 context 的系統預設並持久化；無 context 時套用定義預設）；其後按定義順序列出該 component 的每個 preset，按鈕文字 MUST 使用翻譯 key。preset 按鈕 MUST 是純動作按鈕：系統 MUST NOT 維護或顯示「目前套用中」的選取狀態。

#### Scenario: 方盒面板顯示按鈕列

- **WHEN** 使用者開啟 `/cad/opengrid-stackable-box`（含或不含 `?system=desk`）
- **THEN** 參數面板頂部 MUST 顯示「回復預設」與「3×3 測試樣式」兩顆按鈕，順序固定

#### Scenario: 回復預設按鈕保留系統感知行為

- **WHEN** 使用者在 `?system=desk` 下點擊「回復預設」
- **THEN** 套用結果 MUST 與現有 system-aware restore-defaults 行為一致（4×2、height 30、flat-top、thin-shell）並持久化在 desk scope

### Requirement: 套用 preset 即覆蓋並持久化

點擊 preset 按鈕後，系統 MUST 以解析後的完整參數集重用現有參數快照路徑：更新面板所有控制項、對通過驗證的快照執行既有持久化寫入（含作用中 system scope）。下一次進入同一 component 與 scope 的 workspace 時 MUST 還原為最後套用／調整的參數值。任一 preset 套用 MUST NOT 影響其他 component 的已保存參數。

#### Scenario: 套用 3×3 測試樣式並跨工作階段保留

- **WHEN** 使用者在 `/cad/opengrid-stackable-box?system=desk` 點擊「3×3 測試樣式」
- **THEN** 面板 MUST 顯示 x=3、y=3、height=30、flat-top 頂緣與 thin-shell 底部
- **AND** 該組值 MUST 以驗證後的型別值寫入 desk scope 持久化紀錄
- **AND** 重新載入頁面後 workspace MUST 以該組值初始化並產生對應模型

#### Scenario: 套用 preset 不影響其他 component

- **WHEN** 使用者依序在方盒套用 preset、再開啟其他任一 component 的 workspace
- **THEN** 其他 component 的參數與已保存值 MUST 保持套用前的狀態
