## MODIFIED Requirements

### Requirement: OpenGrid system entry subgroups

The static `/models` chooser MUST present the visible OpenGrid catalog entries
in a single system panel selected by a segmented control with three options:
`Desk`（Desk System）, `Wall`（Wall Related）, and `HSW`. The Desk panel MUST
contain `opengrid`, `opengrid-snap`, `opengrid-pillar`, `opengrid-divider`,
`opengrid-stackable-box`, `opengrid-stackable-cylinder`, `opengrid-organizer-box`,
`opengrid-snap-remover`, `opengrid-open-shelf`, and `opengrid-label-card`. The
Wall panel MUST contain `opengrid`, `opengrid-snap`, `opengrid-wall-cover`,
`opengrid-label-card`, `opengrid-openconnect-shelf`,
`opengrid-openconnect-organizer`, `opengrid-openconnect-tissue-box`, and
`opengrid-label-slot-test`. The HSW panel MUST contain `hsw-cell`. When
scripting is available, exactly one panel MUST be visible at a time with Desk
preselected, and the active option MUST be exposed via `aria-pressed`. Without
scripting, all three panels MUST render stacked and fully accessible. Panel
switching MUST NOT change any entry's selection label, part-category badge, or
model-specific route.

#### Scenario: Desk and Wall groups are visible

- **WHEN** 使用者在可用腳本的瀏覽器開啟 `/models`
- **THEN** 分段切換 MUST 提供 `Desk`、`Wall`、`HSW` 三個選項且預設選 `Desk`
- **AND** Desk 面板 MUST 顯示上列十個 Desk 入口
- **AND** 切換到 Wall 後 MUST 顯示上列八個 Wall 入口
- **AND** 切換到 HSW 後 MUST 顯示 `hsw-cell`

#### Scenario: No-script fallback keeps every entry reachable

- **WHEN** 瀏覽器停用 JavaScript 時開啟 `/models`
- **THEN** 三個系統面板 MUST 全部堆疊可見
- **AND** 每個入口的連結 MUST 維持既有 model ID 與 `/cad/<modelId>` 路由

### Requirement: HSW model selection entry

The `/models` chooser MUST include `hsw-cell` as a currently available CAD
component with an understandable display name and a link to `/cad/hsw-cell`,
rendered inside the HSW system panel. The `/models` page MUST remain static
and MUST NOT initialize the CAD Worker merely to display the HSW entry.

#### Scenario: Model page lists HSW cell

- **WHEN** 使用者開啟 `/models` 並切換到 `HSW`（或停用 JavaScript 直接檢視
  堆疊面板）
- **THEN** 選擇器 MUST 於 HSW 面板顯示 HSW 元件（`HSW 六角蜂巢`）
- **AND** 選擇器 MUST 提供通往 `/cad/hsw-cell` 的連結

### Requirement: 模型系列分類

The model-selection page MUST render the registered catalog entries through
the user-facing series `OpenGrid 系列`（its Desk and Wall system panels）
followed by the `HSW` system panel. Each registered model definition MUST
declare exactly one series key, and the page MUST derive membership, labels,
ordering within a panel, and model links from catalog metadata rather than a
second hardcoded model-id list. Models excluded from chooser visibility MUST
remain routable but MUST NOT be rendered by the chooser. The panel presentation
MUST NOT require a visible localized capability summary on each model card.
Detailed capability and parameter content MUST remain available through the
server-rendered details presentation.

#### Scenario: Catalog entries appear in one series

- **WHEN** 使用者開啟 `/models` 並逐一檢視三個系統面板
- **THEN** 每個 chooser 可見模型 MUST 恰好出現在其中一個面板
- **AND** `opengrid` MUST 出現在 OpenGrid 系列的 Desk 面板
- **AND** `opengrid-pillar` MUST 出現在 OpenGrid 系列的 Desk 面板
- **AND** `opengrid-divider` MUST 出現在 OpenGrid 系列的 Desk 面板
- **AND** `opengrid-stackable-box` MUST 出現在 OpenGrid 系列的 Desk 面板
- **AND** `opengrid-stackable-cylinder` MUST 出現在 OpenGrid 系列的 Desk 面板
- **AND** `opengrid-snap` MUST 出現在 OpenGrid 系列
- **AND** `opengrid-snap-remover` MUST 出現在 OpenGrid 系列
- **AND** `opengrid-open-shelf` MUST 出現在 OpenGrid 系列
- **AND** `hsw-cell` MUST 出現在 HSW 面板
- **AND** `box`、`box-normal`、`modular-grid-base` 與 `hexagonal-column` MUST
  NOT 出現在選擇器

#### Scenario: Series page remains a static chooser

- **WHEN** 使用者檢視 `/models` 的任一面板
- **THEN** 每個模型入口 MUST 提供顯示名稱與 model 專屬路由連結
- **AND** 每張模型卡 MUST 不顯示 localized capability summary
- **AND** 詳細能力與參數內容 MUST 以 server-rendered HTML 提供，且不需要
  CAD Worker 或 CAD workspace
- **AND** 面板版型 MUST NOT 實例化 CAD Worker 或 CAD workspace

### Requirement: 零件分類與分區呈現

Every chooser-visible model definition MUST declare exactly one part category
from `base | container | accessory | tool | test`（基礎／容器／配件／工具／
測試件）. Zone membership, zone ordering, and badge labels MUST derive from
catalog metadata rather than a second hardcoded model-id list. Each system
panel MUST render a pinned 基礎 zone, a visually dominant 容器 card grid, and
a 工具與配件 section collapsed by default that expands in place; the collapsed
section MUST NOT display model counts and MUST use native disclosure semantics
so it stays keyboard operable. Every visible card MUST show a localized
category badge that pairs text with color（容器＝珊瑚弱底、基礎＝薄荷弱底、
配件／工具／測試件＝中性）and MUST NOT rely on color alone. The zone structure
MUST NOT remove chooser entries, change model routes, or change selection
labels. Chooser-hidden legacy models without a part category（`box`、
`modular-grid-base`、`hexagonal-column`）MUST NOT appear in the chooser.

The zones MUST follow the ratified v2 palette presentation: the 基礎 zone
renders mint-tinted hero rows（thumbnail, heading, one-line friendly
description, 基礎 stamp）; the 容器 zone renders image-top cards with the
badge overlaid on the image and a localized primary name paired with its
secondary original name; the collapsed 工具與配件 section renders a panel head
with a friendly hint, a visible teaser line while collapsed, and an
展開／收合 affordance.

#### Scenario: 分區呈現與預設收合

- **WHEN** 使用者檢視 `/models` 任一系統面板
- **THEN** 基礎區 MUST 排在面板最前、容器區 MUST 以較大的卡片網格作為主
  視覺、工具與配件區 MUST 預設收合
- **AND** 使用者 MUST 能以鍵盤展開工具與配件區，展開後該區所有卡片與既有
  路由 MUST 原地可見
- **AND** 收合狀態下這些入口 MUST 留在 DOM 中，且收合標題 MUST NOT 顯示模型
  數量

#### Scenario: 分類徽章雙重提示

- **WHEN** 使用者檢視任一 chooser 卡片
- **THEN** 卡片 MUST 顯示在地化分類文字徽章（zh-Hant：基礎／容器／配件／
  工具／測試件；en：Base／Container／Accessory／Tool／Test piece）
- **AND** 徽章 MUST 以文字搭配顏色呈現，MUST NOT 僅靠顏色區分

#### Scenario: 未分類模型不得出現在 chooser

- **WHEN** chooser 渲染模型
- **THEN** `box`、`modular-grid-base`、`hexagonal-column` MUST NOT 出現
- **AND** 每個出現的模型 MUST 帶有分類徽章

#### Scenario: v2 palette 版型

- **WHEN** 使用者檢視任一系統面板
- **THEN** 基礎區 MUST 以薄荷弱底橫條呈現（縮圖、selection label 標題、
  一句話描述、基礎章）
- **AND** 容器區 MUST 以圖在上方的卡片網格呈現主視覺，徽章疊於圖上，名稱以
  在地化主名搭配次要原文呈現
- **AND** 工具與配件區收合時 MUST 顯示提示語與預覽文案，MUST NOT 顯示模型
  數量
