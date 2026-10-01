## MODIFIED Requirements

### Requirement: OpenGrid system entry subgroups

The static `/models` chooser MUST present the visible OpenGrid catalog entries
in a single system panel selected by a segmented control with three options:
`Desk`（Desk System）, `Wall`（Wall System）, and `HSW`. The Desk panel MUST
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

### Requirement: OpenGrid Snap 選擇入口順序

The `/models` chooser MUST render each system panel's entries in three
part-category zones in this order: the 基礎 zone first, then the 容器 zone,
then the collapsed 工具與配件 zone. Within the 基礎 zone the order MUST be
`opengrid`（Board）then `opengrid-snap` in both system panels. The Desk 容器
zone MUST render `opengrid-stackable-box`, `opengrid-stackable-cylinder`,
`opengrid-organizer-box`, `opengrid-open-shelf` in this order. The Wall 容器
zone MUST render `opengrid-openconnect-shelf`,
`opengrid-openconnect-organizer`, `opengrid-openconnect-tissue-box` in this
order. The Desk 工具與配件 zone MUST render `opengrid-snap-remover`,
`opengrid-pillar`, `opengrid-divider`, `opengrid-label-card` in this order.
The Wall 工具與配件 zone MUST render `opengrid-wall-cover`,
`opengrid-label-card`, `opengrid-label-slot-test` in this order. The 基礎
hero rows MUST render Board（底版）first and Snap（咔咔）second, stacked
vertically in this order at every viewport width. Every entry MUST retain its
existing model-specific route.

#### Scenario: Desk 子分組分區順序

- **WHEN** 使用者檢視 `/models` 的 Desk System 面板
- **THEN** 基礎區 MUST 依序顯示 `Board (底版)`、`Snap (咔咔)`
- **AND** 容器區 MUST 依序顯示 `Grid Box (方盒)`、`Round Box (圓盒)`、
  Organizer Box、`Open Shelf (斜開格櫃)`
- **AND** 工具與配件區展開後 MUST 依序顯示 Snap Remover、
  `Locating Post (定位柱)`、`divider (分隔牆)`、Label Card

#### Scenario: Snap 與底板在寬版相鄰

- **WHEN** 使用者以支援至少雙欄卡片排列的視窗開啟 `/models`
- **THEN** 基礎區的第一列 hero 橫條 MUST 是 `Board (底版)`
- **AND** 第二列 MUST 是 `Snap (咔咔)`，兩列以垂直堆疊呈現
- **AND** `Board (底版)` 的入口 MUST 導向 `/cad/opengrid`
- **AND** `Snap (咔咔)` 的入口 MUST 導向 `/cad/opengrid-snap`

#### Scenario: 其他 OpenGrid 入口仍保留

- **WHEN** 使用者開啟 `/models`
- **THEN** OpenGrid 系列 MUST 仍包含 `opengrid-pillar`、`opengrid-divider`、`opengrid-stackable-box`、`opengrid-stackable-cylinder`、`opengrid-snap-remover` 與 `opengrid-open-shelf`
- **AND** 這些入口的既有 model ID 與 `/cad/<modelId>` 路由 MUST 維持不變

#### Scenario: Wall 子分組分區順序

- **WHEN** 使用者檢視 `/models` 的 Wall System 面板
- **THEN** 基礎區 MUST 依序顯示 `Board (底版)`、`Snap (咔咔)`
- **AND** 容器區 MUST 依序顯示 OpenConnect Shelf、OpenConnect Organizer、
  OpenConnect 面紙盒
- **AND** 工具與配件區展開後 MUST 依序顯示 Wall Cover、Label Card、
  Label Slot Test

### Requirement: 系列相對模型選擇名稱

The `/models` chooser MUST use a selection-only label for each visible model
card so that a family prefix already represented by the series heading is not
repeated. The series heading MUST remain `OpenGrid 系列`; the former
`其他模型` group heading MUST be replaced by the `HSW` option of the system
switcher, and the current panels MUST remain distinguishable by their panel
headings（`Desk System`、`Wall System`、`HSW`）. The current visible card
labels MUST be:

- OpenGrid: `Board (底版)`、`Snap (咔咔)`、`Locating Post (定位柱)`、
  `divider (分隔牆)`、`Grid Box (方盒)`、`Round Box (圓盒)`、`Snap Remover`、
  `Open Shelf (斜開格櫃)`
- HSW 面板: `六角蜂巢`

Base and tool/accessory/test cards MUST keep the full selection label as
their heading. Container cards MAY present the v2 palette split—heading shows
the localized primary name with the secondary original-name line rendered
adjacent（例：`方盒`＋`Grid Box`）—provided the pair reproduces the selection
label, and the full selection label remains the accessible name of the edit
link and the details-dialog title. The corresponding edit links MUST use the
same catalog selection label in their accessible names. Outside the `/models`
chooser, the current catalog display names MUST remain `opengrid board
(底版)`, `Snap (咔咔)`, `Locating Post (定位柱)`, `divider (分隔牆)`,
`Grid Box (方盒)`, `Round Box (圓盒)`, `Snap Remover`, and `六角蜂巢`
respectively.

#### Scenario: 模型選擇頁使用系列相對名稱

- **WHEN** 使用者開啟 `/models` 並切換至任一系統面板
- **THEN** 基礎區與工具區的卡片標題 MUST 分別顯示完整 selection label
  （`Board (底版)`、`Snap (咔咔)`、`Locating Post (定位柱)`、
  `divider (分隔牆)`、`Snap Remover` 等）
- **AND** 容器卡 MUST 以在地化主名搭配次要原文行呈現（`方盒`＋`Grid Box`），
  且主名＋次要行 MUST 對應其 selection label
- **AND** 編輯入口的 accessible name MUST 分別使用 `編輯 Board (底版)`、
  `編輯 Snap (咔咔)`、`編輯 Locating Post (定位柱)`、`編輯 divider (分隔牆)`、
  `編輯 Grid Box (方盒)`、`編輯 Round Box (圓盒)`、`編輯 Snap Remover`、
  `編輯 Open Shelf (斜開格櫃)` 與 `編輯 六角蜂巢`
- **AND** `OpenGrid 系列` 標題 MUST 仍存在，面板 MUST 以 `Desk System`、
  `Wall System`、`HSW` 標題區分

#### Scenario: 其他頁面維持完整模型名稱

- **WHEN** 使用者離開 `/models` 並查看目前模型的 CAD workspace 或其他既有
  模型識別文案
- **THEN** 系統 MUST 維持目前 catalog display name，例如
  `opengrid board (底版)`、`Snap (咔咔)`、`Locating Post (定位柱)`、
  `divider (分隔牆)`、`Grid Box (方盒)`、`Round Box (圓盒)`、
  `OpenGrid Open Shelf (斜開格櫃)` 與 `六角蜂巢`

### Requirement: 首頁模型選擇

The system MUST provide a static model-selection page at `/models` driven by
the registered model catalog. Every model rendered in the chooser MUST have
an understandable display name, a catalog-provided static preview image, a
concise model description, and a link to its model-specific CAD route. The
chooser MUST NOT require a visible capability summary, adjustable-settings
label, or fixed-geometry label on each model card. Detailed parameter names,
ranges, constraints, units, and export formats MUST remain available in
server-rendered HTML through an accessible out-of-flow details presentation
initiated by a per-card details action. The chooser MUST NOT use a generic
schema field count as the sole source of truth for custom or conditional
parameter presentations, and MUST NOT invent a raw numeric count for such
presentations. The chooser MUST present the OpenGrid series first（its Desk
and Wall system panels），followed by the HSW system panel containing
`hsw-cell`, including the OpenGrid entries `opengrid`, `opengrid-pillar`,
`opengrid-divider`, `opengrid-stackable-box`, `opengrid-stackable-cylinder`,
`opengrid-snap`, `opengrid-snap-remover`, and `opengrid-open-shelf`.
Registered models excluded from chooser visibility (`box`, `modular-grid-base`,
and `hexagonal-column`) MAY remain available through direct CAD routes but
MUST NOT be rendered as chooser entries. The root path `/` MUST remain a
separate static product homepage and MUST link to `/models` without rendering
the model chooser. The `/models` page MUST expose a page-level selection
heading. The series and the system panels MUST remain distinguishable by the
`OpenGrid 系列` heading and the segmented switcher's panel headings
（`Desk System`、`Wall System`、`HSW`）with spacing or separators, without
requiring redundant family badges or an outer visual panel around the entire
chooser. Container cards MAY omit the on-card description line（v2 palette
cards present the name pair instead）provided the description remains
available in the card's details presentation. Model cards MUST use an adaptive
layout that uses more than two columns when a wide viewport has enough room
and collapses to one column on a narrow viewport.

#### Scenario: 真正首頁不顯示模型選擇器

- **WHEN** 使用者開啟 `/`
- **THEN** 首頁 MUST 顯示產品介紹與前往模型選擇頁的明確入口
- **AND** 首頁 MUST NOT 顯示模型選擇卡片或初始化 CAD Worker、Svelte CAD
  workspace
- **AND** 前往模型選擇的入口 MUST 導向 `/models`

#### Scenario: 模型選擇頁顯示目前模型與預覽

- **WHEN** 使用者開啟 `/models` 並切換至任一系統面板
- **THEN** 頁面 MUST 依 OpenGrid 系列（Desk、Wall 面板）與 HSW 面板的順序
  顯示可理解的模型名稱
- **AND** OpenGrid 面板 MUST 顯示 `opengrid`、`opengrid-pillar`、
  `opengrid-divider`、`opengrid-stackable-box`、`opengrid-stackable-cylinder`、
  `opengrid-snap`、`opengrid-snap-remover` 與 `opengrid-open-shelf`
- **AND** HSW 面板 MUST 顯示 `hsw-cell`
- **AND** 每個可見模型 MUST 顯示其 catalog-provided static preview image、
  可理解模型名稱與 `編輯 →` 入口
- **AND** 每個 preview image MUST expose alternative text that identifies the
  model it represents
- **AND** `box`、`box-normal`、`modular-grid-base` 與 `hexagonal-column` MUST
  NOT appear as chooser entries
- **AND** `/models` MUST NOT 初始化 CAD Worker、WebAssembly CAD kernel、
  WebGL renderer 或 Svelte CAD workspace
- **AND** 頁面 MUST 顯示選擇模型的頁面標題，而不以整個 chooser 的外框 panel
  包住內容
- **AND** OpenGrid 系列與三個系統面板 MUST 以 `OpenGrid 系列` 標題與
  `Desk System`、`Wall System`、`HSW` 面板標題（含間距或分隔線）區分
- **AND** 模型卡片 MUST 使用可依可用寬度調整欄數的排列；寬版視窗在有足夠
  模型時 MUST 能顯示三欄以上，窄版視窗 MUST 收合為單欄

#### Scenario: 模型卡片保留按需參數詳情

- **WHEN** 使用者開啟 `/models`
- **THEN** 每個模型卡片 MUST 顯示預覽、模型名稱與編輯入口；基礎與工具卡
  MUST 於卡面顯示一句話簡介，容器卡的簡介 MUST 於詳情呈現
- **AND** 卡片 MUST NOT 在詳情開啟前顯示可調整設定或固定幾何 capability
  summary
- **AND** 卡片的詳情入口 MUST 仍能提供完整參數名稱、範圍、限制、單位與匯出
  格式

#### Scenario: 預覽圖片無法載入時仍可選擇模型

- **GIVEN** 可見模型的 preview image 無法載入
- **WHEN** 使用者開啟 `/models`
- **THEN** 該卡片 MUST 顯示可理解的預覽 placeholder 或 fallback
- **AND** 該卡片 MUST 仍顯示模型名稱與 `編輯 →` 入口
- **AND** fallback MUST NOT prevent navigation to the model-specific CAD
  route

#### Scenario: 選擇 HSW 六角蜂巢

- **WHEN** 使用者在 `/models` 選擇 `hsw-cell`
- **THEN** 選擇入口 MUST 導向 `/cad/hsw-cell`
- **AND** CAD workspace MUST 以 `modelId=hsw-cell` 初始化

#### Scenario: 選擇 OpenGrid

- **WHEN** 使用者在 `/models` 選擇 `opengrid`
- **THEN** 選擇入口 MUST 導向 `/cad/opengrid`
- **AND** CAD workspace MUST 以 `modelId=opengrid` 初始化
