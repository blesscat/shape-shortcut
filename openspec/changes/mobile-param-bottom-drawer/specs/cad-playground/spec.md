## ADDED Requirements

### Requirement: 窄版場景 sidebar bottom drawer

在 cad breakpoint（`max-cad`，≤760px）以下，Playground MUST 將 sidebar 內容
（新增元件、instance 清單、選中 instance 編輯器，含複製、刪除、重試與
per-instance 匯出）放進與 workspace 同款的非強制互動 bottom drawer：預設
收合、由常駐 pill 開啟、65dvh 高度、內容內部捲動、半透明面板底色（純 alpha、
無 backdrop 或 blur）、底部安全區內距；開啟時場景 viewport 仍 MUST 可拖曳、
旋轉與點選 instance。頁面 header 的 view mode、grid cells 與場景匯入/匯出
MUST 留在原位。Breakpoint 以上（≥761px）MUST 維持既有 sidebar 版面。

#### Scenario: 收合 pill 開啟 sidebar drawer

- **WHEN** 使用者在窄版 Playground 點擊 sidebar pill
- **THEN** drawer MUST 以半透明底部面板展開，pill 的 `aria-expanded` MUST 轉為 `true`
- **AND** sidebar 全部內容 MUST 在 drawer 內可用，且不造成頁面水平溢出

#### Scenario: Drawer 內的 instance 編輯保持完整

- **WHEN** 使用者在 drawer 內選取另一個 instance
- **THEN** 選中 instance 的編輯器（參數、擺放、顏色、複製/刪除/重試與 per-instance 匯出）MUST 對應新選取的 instance
- **AND** 場景 viewport 的既有互動契約（拖曳擺放、空手勢 orbit、點選選取）MUST 不變

#### Scenario: 桌面版面維持 sidebar

- **WHEN** viewport 寬度大於 760px
- **THEN** Playground MUST 維持既有 sidebar 版面
- **AND** MUST NOT 渲染 drawer 或 sidebar pill
