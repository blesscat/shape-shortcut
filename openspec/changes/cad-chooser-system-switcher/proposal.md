# CAD 選擇器系統切換面板（v2 palette 外觀）

## Why

站長比對已採用的 v2-zones 設計稿（handoff-package-2 `cad-redesign/v2-zones.html`）後
指出：`cad-part-categories-v2` 只搬了分區結構，卡片外觀仍是舊選擇頁樣式，不像設計
稿。本 change 把 /models 的選擇器改成設計稿的視覺語言——薄荷 hero 橫條（Board／
Snap 置頂）、容器大圖卡（圖在上、珊瑚徽章、中文大字＋英文小字）、工具與配件收合
面板（面板頭＋提示語＋展開前的預覽文案）——並把上下堆疊的 Desk/Wall 子分組改為
設計稿的 Desk/Wall/HSW 分段切換單面板。

## What Changes

- `src/pages/[locale]/models.astro`：新增膠囊分段切換（Desk／Wall／HSW，
  `aria-pressed`），三個系統面板改為單一面板呈現；無 JS 時退回三面板堆疊
  （漸進增強，SEO／靜態渲染不變）。
- `src/components/cad/ModelCard.astro`：卡片依 `partCategory` 呈現三種版型
  （hero 橫條／容器大圖卡／工具橫列），既有 testid、預覽圖、詳情 dialog、
  編輯連結、分類徽章全數保留。
- `src/i18n/messages/models.ts`：新增面板頭、容器區標籤、工具區提示與展開
  前預覽文案（zh-Hant＋en）。
- `tests/e2e/home.spec.ts`、`tests/e2e/localization.spec.ts`、
  `tests/e2e/model-card-previews.spec.ts`：切換器互動與新 DOM 的對應更新。

## Capabilities

### Modified
- `home-model-selection`：選擇器改為系統分段切換單面板，並以 v2 palette
  版型呈現三區。

## Impact

- `src/pages/[locale]/models.astro`、`src/components/cad/ModelCard.astro`、
  `src/i18n/messages/models.ts`
- Tests: `tests/e2e/home.spec.ts`、`tests/e2e/localization.spec.ts`、
  `tests/e2e/model-card-previews.spec.ts`（選擇器結構相關斷言）
- 不變：模型 ID／路由／selection label／詳情 dialog 內容／首頁摘要；
  v1、v3 設計稿與 favicon 重設計皆不在本 change 範圍（站長已拍板）。
