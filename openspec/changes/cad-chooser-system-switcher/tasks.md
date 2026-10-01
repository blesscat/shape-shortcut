## 1. Spec

- [x] 1.1 `specs/home-model-selection/spec.md` delta：MODIFIED 子分組需求
  （分段切換單面板＋無 JS 堆疊）與分區呈現需求（v2 palette 版型）
- [x] 1.2 `openspec validate cad-chooser-system-switcher --type change --strict`

## 2. 實作

- [x] 2.1 `models.astro`：seg 切換器＋三系統面板＋v2 palette 分區版型
- [x] 2.2 `ModelCard.astro`：hero／container／row 三版型（testid、dialog、
  徽章、連結保留）
- [x] 2.3 `messages/models.ts`：面板頭／容器標籤／工具提示／預覽文案（雙語）

## 3. 測試

- [x] 3.1 `home.spec.ts`：切換器、面板、分區版型、窄屏單欄
- [x] 3.2 `localization.spec.ts`：雙語切換器與徽章
- [x] 3.3 `model-card-previews.spec.ts`：跨面板走訪（依系統切換）

## 4. 驗證

- [x] 4.1 `pnpm check`＋prettier＋scoped tests
- [x] 4.2 雙 reviewer 審查與修復紀錄（verification.md）
- [ ] 4.3 PR 摘要更新
