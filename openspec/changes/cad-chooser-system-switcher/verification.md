# Apply verification — 2026-10-01

Change: `cad-chooser-system-switcher`, schema `spec-driven`.
Branch: `blesscat/cad-part-categories-v2`（PR #174 續行 change）。
Base: 站長比對 v2-zones 設計稿後指示「所有設定稿都要做到網站上」，經確認範圍：
只做 v2、/models 改 Desk/Wall/HSW 分段切換單面板、favicon 緩做。

## Implemented behavior

- `/models` 改為膠囊分段切換（Desk／Wall／HSW，`aria-pressed`，Desk 預設）：
  三面板一律 server-rendered，JS 只對非現用面板加 `hidden`；無 JS 時三面板
  堆疊全部可達（新增無 JS e2e 鎖定）。
- v2 palette 版型：基礎區＝薄荷 hero 橫條（84px 縮圖、selection label 標題、
  一句話描述、「基礎」綠章）；容器區＝圖上大卡（8/5、徽章疊圖左上、在地化
  主名＋次要原文行）；工具與配件＝原生 `<details>` 收合（提示語＋預覽文案＋
  展開／收合切換），HSW 面板只渲染容器區、不顯示工具提示語。
- ModelCard 拆為 ModelCardPreview／ModelCardDialog；版型由 `partCategory`
  推導（hero/big/row），testid、詳情 dialog、分類徽章、`data-sw-card`（大卡）
  全數保留；編輯連結 accessible name 維持完整 selection label。
- i18n 新增 7 鍵（switcher／panel hint／容器與工具提示／teaser／展開收合），
  zh-Hant＋en 成對（型別強制）。

## Checks

- `pnpm exec tsc --noEmit`：passed。
- 單元：`tests/unit/model-catalog.test.ts`＋
  `tests/unit/opengrid-system-entry-context.test.ts` 19 passed（review 修復後
  重跑）；全套 `pnpm test:changed` 於前置提交已 379/379。
- e2e（chromium）：home／localization／model-card-previews:276／
  starwind-non-cad／system-dark-mode／opengrid-pillar／opengrid-divider／
  opengrid-snap-remover → 41 passed、2 skipped；唯一失敗
  `opengrid-divider.spec.ts:153`（500 mm alert 文案）為 main `8fbbe5f` 既有
  問題（前 change 已於 main 重現並記錄，本 change 未觸及該路徑）。
- e2e（firefox）：home／localization／starwind-non-cad → 28 passed、0 failed
  （含 localization:115 以 `--repeat-each=2` 驗證）。
- `openspec validate cad-chooser-system-switcher --type change --strict`：
  passed。
- `pnpm exec prettier --check`（所有變更檔）：passed。

## Independent review gate

兩位獨立 reviewer（背景 worker）於實作提交 `1941b7b` 上完成審查；修復提交
見 git log。

### Reviewer A — OpenSpec compliance（agent 21ec7c5b）：conditional fail → 已修復

- Major M1/M2：delta 漏改 `系列相對模型選擇名稱`（舊條文要求 `其他模型` 群組
  標題與容器卡完整標題 heading，實作已改面板制＋主名/原文行拆分）與
  `首頁模型選擇`（同上）→ 兩條已補進 delta MODIFIED（完整重寫＋保留全部既有
  scenario 名稱；容器卡拆名規則明文化：主名＋次要行 MUST 對應 selection
  label，編輯連結與 dialog 標題仍用完整 label）。
- m1：tasks.md 4.2 在 verification.md 存在前已勾 → 本檔案補上（勾選屬實）。
- m2：design.md 面板頭文案與實作漂移 → 已對齊（「工具在下面等你」，並註明
  草稿「先挑容器」標題未採用）。
- m3：proposal Impact 補列 ModelCardPreview／ModelCardDialog 與五支 e2e。
- p1：無 JS fallback 補 e2e（`javaScriptEnabled: false`，三面板可達＋連結
  斷言）。p3：HSW 面板不再顯示「工具在下面等你」。

### Reviewer B — implementation／regression（agent ed87abc0）：conditional fail → 已修復

- Major M1：`localization.spec.ts:115` 在 firefox 3/3 穩定失敗（dialog 開啟
  後卡片 document-y +1.4px）。探測確認 dialog 開啟本身不動版面（開啟後 docY
  全等），位移來自 opener click 的 focus auto-scroll＋nav 收合尾巴污染基準。
  修法：基準改在 dialog 已 visible 且捲動穩定後記錄，兩側量測前凍結
  hover（pointer-events none）並 pin 回同一 scrollY，容差 0.5px（hover-lift
  衰減尾 ≤0.15px；真版面位移為數 px）。firefox `--repeat-each=5` 全綠。
- P3：model-card-previews 死碼展開迴圈（舊 testid 恆 0）已刪；home.spec
  空斷言 `model-family-opengrid` 已刪；ModelCardDialog 未用的 Button import
  已刪（models.astro 的 Separator 由本輪一併清掉）。
- 觀察（非本 change 回歸）：system-dark-mode:263 於 firefox 整檔跑時偶發、
  單跑即過，屬 load-sensitive flake，留待獨立 triage。

## Test-stability adjustments

- hover lift（-translate-y-0.5）與指標停駐的干擾以 `mouse.move(0,0)`＋
  量測期 pointer-events 凍結處理；分段切換前以 rAF 幾何穩定輪詢（stableClick）
  取代裸點擊。
- localization:115 的「dialog 不推卡」守衛改為 dialog 開啟後基準制（原寫法
  在 main 的堆疊版型下恰好穩定，單面板制下被 firefox focus auto-scroll
  打破）。
