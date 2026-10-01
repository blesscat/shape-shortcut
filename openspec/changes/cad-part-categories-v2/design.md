## Context

交接包 `.orca/drops/handoff-package-2.zip`（cad-redesign 規格頁＋MIGRATION.md）
完成設計：站長拍板分類＝基礎（Board＋Snap）／容器／配件／工具／測試件，版面採
V2「容器當主角」。本 change 不搬規格頁 HTML 與 design-tokens.css：站內已在
`src/styles/global.css` 落地同名暖系 token（`--color-*`，#173），19 組
`-dark` 預覽圖已在 `public/model-previews/`。視覺值一律取站內 token，不從規
格頁抄 hex。

現況：`ModelDefinition` 只有 `family`（opengrid/other）與 desk/wall 子分組；
chooser 由 `groupModelDefinitions()` 驅動，卡片在子分組內平權平鋪。
`box`、`modular-grid-base`、`hexagonal-column` 已 `chooserHidden: true`，站上
無入口，本 change 不動它們（用戶已確認；若日後要連路由與 e2e 基建一起移除，
另開獨立 change）。

## Goals / Non-Goals

**Goals:**

- 給 chooser 可見模型一個單一分類欄位，分類資料唯一來源在 catalog。
- Desk/Wall 子分組內改為三區：基礎置頂、容器為主視覺、工具與配件預設收合。
- 每張卡有文字＋顏色雙編碼的分類徽章，兩個語系都有。
- 首頁 Desk/Wall 起始卡各加一行分類摘要（親和腔、無模型數量）。
- 保留既有 family/subgroup heading、selection label、route、詳情 dialog 與
  相關 testid，e2e 結構斷言盡量延用。

**Non-Goals:**

- 不改任何 modelId、route、參數、幾何、匯出或 CAD workspace／playground 行為。
- 不新增或刪除模型；不處理 chooser 隱藏模型的分類或移除。
- 不搬規格頁 HTML／MIGRATION.md 入庫；不重做 viewport 主題（#173 已完成）。
- V3「配置＋工具箱」留給 playground，另案處理。

## Decisions

### 1. 分類放 definition，不做中央對照表

`model-catalog/types.ts` 新增：

```ts
export type PartCategory = 'base' | 'container' | 'accessory' | 'tool' | 'test'
```

`ModelDefinition` 增加 `partCategory?: PartCategory`（optional：chooser 隱藏
的 legacy 模型不需要值）。標注落在各 component definition 檔，與
`selectionLabel`、`previewImage`、`supportedSystemContexts` 等 presentation
metadata 同處，單檔 diff 清楚。分類對照（站長拍板）：

| 模型 | 分類 |
| --- | --- |
| opengrid（Board）、opengrid-snap | base |
| opengrid-stackable-box（Grid Box）、opengrid-stackable-cylinder（Round Box）、opengrid-organizer-box、opengrid-open-shelf、opengrid-openconnect-shelf、opengrid-openconnect-organizer、opengrid-openconnect-tissue-box、hsw-cell | container |
| opengrid-pillar、opengrid-divider、opengrid-label-card、opengrid-wall-cover | accessory |
| opengrid-snap-remover | tool |
| opengrid-label-slot-test | test |

替代方案（`index.ts` 中央 map）不採：同一份資料出現兩處入口，新增模型時容易
漏同步。

### 2. 分組結構不動，分區是子分組內的呈現分區

`groupModelDefinitions()` 與既有 testids（`model-family-*`、
`model-subgroups-*`、`model-subgroup-*`）保持不變。新增 exported helper
`partitionByPartZone(definitions)` 回傳 `{ base, containers, tools }` 三個陣
列：rank＝base 0、container 1、tool 2、accessory 3、test 4、未分類 5，同
rank 保持 catalog 原相對順序（stable）；未分類落 `tools` 尾端，漏標新模型時
卡片不會消失，code review 與 unit test 都看得到。tools 陣列內部順序即
工具 → 配件 → 測試件 → 未分類。

單元測試鎖兩件事：16 個 chooser 可見 definition 全部有 `partCategory`；
helper 的分區與排序行為（含 hsw-cell 進容器、未分類落底）。

### 3. 版型與樣式全用站內 token，不新增 CSS 檔

規格頁 `--ss-*` 對應站內 token（`global.css`）：

| 規格頁 | 站內 | 用途 |
| --- | --- | --- |
| `--ss-coral-tint` / `--ss-coral-deep` | `bg-primary-soft` / `text-primary-hover`（深色 `dark:text-primary`） | 容器徽章 |
| `--ss-mint` / `--ss-green` | `bg-success-soft` / `text-success` | 基礎徽章 |
| `--ss-panel-2` / `--ss-ink-2` | `bg-muted` / `text-muted-foreground` | 配件／工具／測試件徽章 |
| hover 上浮／`shadow-lift`、3px 珊瑚 focus | 既有 Card 與 `focus-visible:ring-3 ring-outline` 慣例 | 互動狀態 |

版型：每個子分組內輸出三區，`data-testid`＝`model-zone-base`、
`model-zone-containers`、`model-zone-tools`。容器區網格 min column 加大
（主視覺），基礎區與工具區較窄；預覽維持 8:5 與既有 light/dark 圖。
基礎區與容器區不加大標（subgroup 標題已存在，徽章已標分類），以
`aria-label` 標記區塊；工具區用原生 `<details>`/`<summary>` 預設收合，
summary 只有文字「工具與配件」（內容約定：模型數量不進標題徽章）。原生
disclosure 自帶鍵盤與語意，伺服器端渲染、無 JS 依賴。徽章 testid＝
`model-category-badge` 並附 `data-part-category`。動效僅既有 hover 樣式，
無新增 animation（`prefers-reduced-motion` 沿用現狀）。

`hsw-cell` 在 `其他模型` group 單獨一卡、掛容器徽章，不套三區。

### 4. i18n 與首頁摘要

`messages/models.ts` 新增 `models.category.base/container/accessory/tool/test`
（zh-Hant：基礎／容器／配件／工具／測試件；en：Base／Container／Accessory／
Tool／Test piece）與 `models.zone.base`、`models.zone.containers`、
`models.zone.tools`（工具與配件／Tools & accessories）。首頁摘要鍵放
`messages/home.ts`：`home.system.deskCategorySummary`、
`home.system.wallCategorySummary`，擬稿（實作時可微調腔調）：

- Desk zh-Hant：「底版跟 Snap 是基礎，先挑喜歡的容器，小工具都收在下面。」
- Wall zh-Hant：「底版和 Snap 是基礎，層架、方格、面紙盒都是容器，小工具收
  在下面。」
- Desk en: "Board and Snap are your base. Pick the containers you like first
  — tools are tucked away below."
- Wall en: "The wall board and Snap are your base. Shelves, organizers, and
  the tissue box are containers; tools stay tucked below."

摘要不含模型數量與 28 mm 格距，不改卡片既有預覽／標題／連結。

### 5. 測試策略

- unit（`tests/unit/model-catalog.test.ts` 擴充）：分類齊全性、helper 分區
  與排序。
- e2e：`home.spec.ts` 更新為三區結構斷言（基礎區前兩張 Board/Snap 相鄰的既
  有 scenario 保留）、工具區預設收合與展開、容器區順序；`localization.spec`
  補徽章與首頁摘要兩語系；`system-dark-mode.spec` 驗證深色下徽章與 `-dark`
  預覽照常；`starwind-non-cad.spec` 預期不受影響，僅回歸。
- 依 config operations guidance 跑 scoped：`pnpm test:changed`、指定 e2e
  specs；`pnpm check`＋`pnpm format:check` 為門檻。

## Risks / Trade-offs

- [既有 spec 釘死平面順序] → spec delta 一次改寫「OpenGrid system entry
  subgroups」與「OpenGrid Snap 選擇入口順序」兩條 requirement，並把子分組成
  員更新到目前 catalog 實況；`openspec validate --strict` 把關。
- [工具收合後 Ctrl+F 搜不到] → V2 拍板的取捨；DOM 恆在、summary 可見，展開
  後原地顯示。
- [新模型漏標分類] → optional 欄位＋unit test 鎖 chooser 可見模型全有分類；
  helper 把未分類落 tools 尾端，不會靜默消失。
- [首頁摘要文案腔調] → 以 MIGRATION.md 親和腔原則撰寫，實作時可微調，en 不
  直譯。

## Migration Plan

1. types＋annotations＋helper＋unit tests（純資料層，先綠）。
2. `models.astro` 三區版型＋徽章＋i18n keys。
3. 首頁摘要行。
4. e2e 更新與 scoped runs、`openspec validate --strict`。
5. Rollback：還原提交即可；無資料遷移、無路由相容問題。
