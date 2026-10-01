## MODIFIED Requirements

### Requirement: OpenGrid system entry subgroups

The static `/models` chooser MUST split the visible OpenGrid catalog entries
into `Desk System` and `Wall Related` subgroups. The Desk subgroup MUST contain
`opengrid`, `opengrid-snap`, `opengrid-pillar`, `opengrid-divider`,
`opengrid-stackable-box`, `opengrid-stackable-cylinder`, `opengrid-organizer-box`,
`opengrid-snap-remover`, `opengrid-open-shelf`, and `opengrid-label-card`. The
Wall subgroup MUST contain `opengrid`, `opengrid-snap`, `opengrid-wall-cover`,
`opengrid-label-card`, `opengrid-openconnect-shelf`,
`opengrid-openconnect-organizer`, `opengrid-openconnect-tissue-box`, and
`opengrid-label-slot-test`. Each entry MUST retain its understandable selection
label, its part-category badge (see 零件分類與分區呈現), and its
model-specific route, and the `其他模型` group MUST contain `hsw-cell` and
remain after the OpenGrid subgroups.

#### Scenario: Desk and Wall groups are visible

- **WHEN** a user opens `/models`
- **THEN** the page MUST show `Desk System` and `Wall Related` under the
  OpenGrid series
- **AND** the Desk subgroup MUST show the ten Desk entries listed above
- **AND** the Wall subgroup MUST show the eight Wall entries listed above
- **AND** the `其他模型` group MUST show `hsw-cell` as a separate group after
  the OpenGrid subgroups

### Requirement: OpenGrid Snap 選擇入口順序

The `/models` chooser MUST render each system subgroup's entries in three
part-category zones in this order: the 基礎 zone first, then the 容器 zone,
then the collapsed 工具與配件 zone. Within the 基礎 zone the order MUST be
`opengrid`（Board）then `opengrid-snap` in both subgroups. The Desk 容器 zone
MUST render `opengrid-stackable-box`, `opengrid-stackable-cylinder`,
`opengrid-organizer-box`, `opengrid-open-shelf` in this order. The Wall 容器
zone MUST render `opengrid-openconnect-shelf`,
`opengrid-openconnect-organizer`, `opengrid-openconnect-tissue-box` in this
order. The Desk 工具與配件 zone MUST render `opengrid-snap-remover`,
`opengrid-pillar`, `opengrid-divider`, `opengrid-label-card` in this order.
The Wall 工具與配件 zone MUST render `opengrid-wall-cover`,
`opengrid-label-card`, `opengrid-label-slot-test` in this order. The first two
cards of every subgroup MUST be Board（底版）and Snap（咔咔）, adjacent when
the viewport fits at least two card columns, and vertically stacked in the
same order on one-column viewports. Every entry MUST retain its existing
model-specific route.

#### Scenario: Desk 子分組分區順序

- **WHEN** 使用者開啟 `/models` 的 Desk System 子分組
- **THEN** 基礎區 MUST 依序顯示 `Board (底版)`、`Snap (咔咔)`
- **AND** 容器區 MUST 依序顯示 `Grid Box (方盒)`、`Round Box (圓盒)`、
  Organizer Box、`Open Shelf (斜開格櫃)`
- **AND** 工具與配件區展開後 MUST 依序顯示 Snap Remover、
  `Locating Post (定位柱)`、`divider (分隔牆)`、Label Card

#### Scenario: 基礎區前兩張相鄰

- **WHEN** 使用者以支援至少雙欄卡片排列的視窗開啟 `/models`
- **THEN** 每個系統子分組的第一張卡片 MUST 是 `Board (底版)`
- **AND** 第二張卡片 MUST 是 `Snap (咔咔)`
- **AND** 兩張卡在窄版單欄時 MUST 維持相同垂直順序

#### Scenario: Wall 子分組分區順序

- **WHEN** 使用者開啟 `/models` 的 Wall Related 子分組
- **THEN** 基礎區 MUST 依序顯示 `Board (底版)`、`Snap (咔咔)`
- **AND** 容器區 MUST 依序顯示 OpenConnect Shelf、OpenConnect Organizer、
  OpenConnect 面紙盒
- **AND** 工具與配件區展開後 MUST 依序顯示 Wall Cover、Label Card、
  Label Slot Test

## ADDED Requirements

### Requirement: 零件分類與分區呈現

Every chooser-visible model definition MUST declare exactly one part category
from `base | container | accessory | tool | test`（基礎／容器／配件／工具／
測試件）. Zone membership, zone ordering, and badge labels MUST derive from
catalog metadata rather than a second hardcoded model-id list. Each Desk/Wall
subgroup MUST render a pinned 基礎 zone, a visually dominant 容器 card grid,
and a 工具與配件 section collapsed by default that expands in place; the
collapsed section MUST NOT display model counts and MUST use native disclosure
semantics so it stays keyboard operable. Every visible card MUST show a
localized category badge that pairs text with color（容器＝珊瑚弱底、基礎＝
薄荷弱底、配件／工具／測試件＝中性）and MUST NOT rely on color alone. The
zone structure MUST NOT remove chooser entries, change model routes, or change
selection labels. Chooser-hidden legacy models without a part category
（`box`、`modular-grid-base`、`hexagonal-column`）MUST NOT appear in the
chooser.

#### Scenario: 分區呈現與預設收合

- **WHEN** 使用者開啟 `/models` 任一 Desk/Wall 子分組
- **THEN** 基礎區 MUST 排在子分組最前、容器區 MUST 以較大的卡片網格作為主
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

### Requirement: 首頁系統卡分類摘要

The localized homepage Desk System and Wall System starting cards MUST each
include one localized line that summarizes the part-category structure（基礎
→ 容器 → 工具與配件）in the site's friendly tone. The summary line MUST NOT
include model counts or the 28 mm grid pitch, MUST NOT remove or replace the
card's existing preview, title, description, or entry link, and MUST be
provided for both supported locales.

#### Scenario: 首頁摘要在地化

- **WHEN** 使用者以任一支援語系開啟首頁
- **THEN** Desk System 與 Wall System 起始卡 MUST 各顯示一行該語系的分類
  摘要
- **AND** 摘要 MUST NOT 出現模型數量或 28 mm 格距

#### Scenario: 摘要不改變既有入口

- **WHEN** 首頁渲染系統起始卡
- **THEN** 既有預覽、標題、說明與入口連結 MUST 維持不變
- **AND** 卡片連結 MUST 維持既有 route 與 `system=desk|wall` query
