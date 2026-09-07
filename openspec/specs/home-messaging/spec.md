# home-messaging Specification

## Purpose

定義首頁行銷訊息的靜態可觀察要求：差異化主張（本機運算、模型下載永久免費、STL 與 Wall Cover 雙色 3MF 下載）必須出現在第一屏、搜尋 metadata 與 hero 文案分離、HSW 不在首頁被點名為主打系統，以及 prototype 聲明的披露位置。

## Requirements

### Requirement: 首頁差異化主張

每一個支援 locale 的首頁 MUST 在 server-rendered 的可見文案中同時呈現以下三個產品主張，且呈現不得依賴 CAD Worker 或任何 client-side script：

1. CAD 運算在使用者的瀏覽器完成（本機運算主張）。
2. 模型下載永久免費。
3. 可下載直接列印的 STL；`opengrid-wall-cover` 另提供雙色 3MF。公開首頁文案 MUST NOT 以 STEP 匯出作為產品主張。

#### Scenario: 繁中首頁呈現三項主張

- **WHEN** 使用者開啟 `/zh-Hant/`
- **THEN** 首頁可見文案 MUST 同時包含本機運算、模型下載永久免費與 STL（含 Wall Cover 雙色 3MF）下載三個主張
- **AND** 首頁可見文案與搜尋 metadata MUST NOT 宣稱提供 STEP 匯出
- **AND** 這些主張 MUST 存在於 server-rendered HTML，不需要執行 JavaScript 即可讀取

#### Scenario: 英文首頁呈現對應主張

- **WHEN** 使用者開啟 `/en/`
- **THEN** 首頁可見文案 MUST 以英文呈現相同的三個主張
- **AND** 首頁可見文案與搜尋 metadata MUST NOT 宣稱提供 STEP 匯出

### Requirement: 首頁搜尋 metadata 與 hero 文案分離

首頁的 document title 與 meta description MUST 來自搜尋用途專屬的 localized 資源，允許與 hero 可見段落使用不同的字串。title MUST 同時包含 `OpenGrid` 與 `Shape Shortcut`，且 title 與 meta description MUST NOT 出現 HSW 字樣。meta description MUST 與 hero 段落一樣使用頁面所屬 locale。

#### Scenario: metadata 與 hero 文案各自獨立

- **WHEN** 檢視任一 locale 首頁的 HTML head
- **THEN** title MUST 同時包含 `OpenGrid` 與 `Shape Shortcut`
- **AND** meta description MUST 來自與 hero 可見段落不同的字串，且為該頁面 locale

#### Scenario: 搜尋 metadata 不點名 HSW

- **WHEN** 檢視任一 locale 首頁的 title 與 meta description
- **THEN** 兩者 MUST NOT 包含 HSW 字樣

### Requirement: 首頁不主打 HSW

首頁的可見文案 MUST NOT 將 HSW 點名為主打系統，也 MUST NOT 提供 HSW 專屬的入口。`hsw-cell` MUST 仍可從首頁經由 localized 模型選擇頁入口間別抵達（可見性細節由 `home-model-selection` 規範）。

#### Scenario: 首頁文案不點名 HSW 但模型仍可達

- **WHEN** 使用者閱讀任一 locale 首頁的可見文案
- **THEN** 文案 MUST NOT 將 HSW 呈現為主打系統或提供 HSW 專屬入口
- **AND** 使用者 MUST 能從首頁前往模型選擇頁並找到 `hsw-cell`

### Requirement: Prototype 聲明位置

首頁 hero 區 MUST NOT 顯示 prototype 或施工中性質的免責聲明；prototype 狀態 MUST 保留在首頁的 maker 區塊與 about 頁披露。hero 區 MAY 陳述模型系列持續擴充的正向資訊。

#### Scenario: hero 區不含施工中聲明

- **WHEN** 使用者檢視任一 locale 首頁的 hero 區
- **THEN** hero 區 MUST NOT 出現 prototype 或施工中性質的免責聲明
- **AND** 主要 CTA MUST 保留且連往 localized 模型選擇頁

#### Scenario: prototype 狀態仍被披露

- **WHEN** 使用者檢視首頁 maker 區塊或 about 頁
- **THEN** 頁面 MUST 仍披露專案目前為 prototype 狀態
