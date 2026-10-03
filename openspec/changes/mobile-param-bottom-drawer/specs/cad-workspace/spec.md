## ADDED Requirements

### Requirement: 窄版參數 bottom drawer

在 cad breakpoint（`max-cad`，≤760px）以下，CAD workspace MUST 以底部 drawer
呈現參數調整介面，MUST NOT 再將參數面板整體堆疊在 viewport 上方。Drawer MUST
預設收合，並以常駐的「參數」pill 開啟；pill MUST 以 `aria-expanded` 與
`aria-controls` 反映開合狀態，並以狀態點呈現目前預覽的 stale 或欄位驗證錯誤
狀態。開啟時 drawer MUST 是覆蓋在 viewport 下緣的非強制互動（non-modal）底部
面板：高度為 65dvh、內容內部捲動、圓角頂邊、半透明面板底色（純 alpha，不使用
backdrop 或 blur），並保留底部安全區內距。Drawer MUST NOT 阻擋 viewport 的
orbit 操作，開合 drawer MUST NOT 改變 viewport 尺寸或 camera pose。進度
指示與錯誤 toast MUST 保持在 drawer 之上顯示。匯出、重試與下載設定操作在窄版
MUST 提供在 drawer 之外（viewport 錨定的浮動按鈕群），其禁用規則沿用既有
invalid/stale 契約。Breakpoint 以上（≥761px）版面 MUST 維持既有 sticky 側欄。
「全部恢復預設」與 component 參數控制 MUST 保留在 drawer 內容中，並符合
「穩定且響應式的參數復原控制」的既有要求。

#### Scenario: 收合 pill 呈現參數入口與狀態

- **WHEN** 使用者在窄版 workspace 尚未開啟 drawer
- **THEN** viewport 上 MUST 顯示常駐的「參數」pill，且 pill 的 `aria-expanded` 為 `false`
- **AND** 存在欄位驗證錯誤時狀態點 MUST 呈現 red；無欄位驗證錯誤且 committed preview 為 stale 時 MUST 呈現 amber；其餘情況不顯示狀態點

#### Scenario: 開啟半透明 drawer

- **WHEN** 使用者點擊參數 pill
- **THEN** drawer MUST 以 65dvh 高度自底部展開，pill 的 `aria-expanded` MUST 轉為 `true`
- **AND** drawer MUST 使用半透明面板底色且不使用 backdrop，讓後面的模型維持可見
- **AND** drawer 內容 MUST 內部捲動，且不造成頁面水平溢出

#### Scenario: Drawer 開啟時 viewport 保持可互動

- **WHEN** drawer 開啟且使用者對 viewport 執行 orbit 手勢
- **THEN** viewport MUST 依既有觸控契約回應 orbit
- **AND** drawer 開合 MUST NOT 觸發 camera refit，MUST NOT 改變 committed preview 的尺寸標註或 orientation indicator 行為

#### Scenario: Escape 關閉並歸還焦點

- **WHEN** drawer 開啟且使用者按下 Escape
- **THEN** drawer MUST 收合，焦點 MUST 回到參數 pill
- **AND** pill 的 `aria-expanded` MUST 回復為 `false`

#### Scenario: 匯出操作留在 drawer 外

- **WHEN** 使用者在窄版開啟或收合 drawer
- **THEN** 匯出、重試與下載設定操作 MUST 顯示在 viewport 錨定的浮動按鈕群中
- **AND** invalid 或 stale generation 的匯出禁用行為 MUST 與既有契約一致

#### Scenario: 桌面版面維持 sticky 側欄

- **WHEN** viewport 寬度大於 760px
- **THEN** workspace MUST 維持既有雙欄 sticky 面板版面
- **AND** MUST NOT 渲染 drawer、參數 pill 或浮動匯出按鈕群
