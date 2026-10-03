## 1. Drawer 元件與文案

- [x] 1.1 新增 `src/components/cad/BottomParameterDrawer.svelte`：controlled `open`/`onClose`、65dvh 固定高度、內部捲動、`bg-panel/75` 半透明、圓角頂邊、`env(safe-area-inset-bottom)`、無 backdrop；提供關閉鈕、`role="region"` 與 aria label、Escape 關閉、開啟聚焦關閉鈕並於關閉時由呼叫端歸還焦點
- [x] 1.2 在 zh-Hant 與 en 的 catalog 新增 `cad.drawer.title`、`cad.drawer.open`、`cad.drawer.close`、`cad.drawer.status.stale`、`cad.drawer.status.invalid`、`playground.drawer.title`、`playground.drawer.open`，確認 `messages/*/index.ts` 的 key parity 檢查通過

## 2. CAD workspace 窄版接入

- [x] 2.1 在 `CadWorkspace.svelte` 以 `matchMedia('(max-width: 760px)')` 切換版面：窄版渲染底部 pill（`data-testid="cad-params-pill"`、`aria-expanded`/`aria-controls`、狀態點：stale amber、欄位錯誤 red）與 drawer（ComponentParameterPanel + 全部恢復預設 + 3MF 備註）；桌面版維持 sticky `CadWorkspacePanel`，兩個分支不同時渲染
- [x] 2.2 窄版將匯出/重試/下載設定按鈕渲染為 viewport 頂端角落的浮動按鈕群（`data-testid="cad-actions-cluster"`），沿用 `canExport`、stale 與 recoverable-error 的禁用規則
- [x] 2.3 調整 progress indicator 與 error toast 的 z-index，確保 drawer 開啟時仍可見且可互動；確認開合 drawer 不改變 viewport 尺寸

## 3. Playground 窄版接入

- [x] 3.1 在 `Playground.svelte` 以同一 breakpoint 狀態切換：窄版將 sidebar 全部內容（新增元件、instance 清單、選中 instance 編輯器含複製/刪除/重試/per-instance 匯出）放進 drawer，pill `data-testid="playground-sidebar-pill"`；header 的 view mode、grid size、場景匯入/匯出留在原位
- [x] 3.2 驗證窄版 drawer 開啟時場景 viewport 仍可 orbit、拖曳擺放與點選選取，且桌面版（≥761px）sidebar 版面不變

## 4. 測試與驗證

- [x] 4.1 新增 e2e：窄版 workspace（pill 可見且 `aria-expanded` 正確、開啟後 drawer 高度與半透明底色、內部捲動、viewport 仍可 orbit、Escape 關閉並歸還焦點、浮動匯出群在 drawer 外且 invalid/stale 禁用）
- [x] 4.2 更新 `workspace-layout.spec.ts` stacked 案例（文件捲動斷言改為 drawer 行為）與 `playground-mobile.spec.ts` 補 drawer 開合斷言；確認 `system-dark-mode`、`opengrid-snap-remover` 等使用 `cad-workspace-panel` 的案例在桌面 viewport 不受影響
- [x] 4.3 執行 `pnpm test:changed`、`pnpm check`（tsc）、`pnpm format:check`，以及 workspace 與 playground 相關的 targeted Playwright specs

## 5. 收尾

- [x] 5.1 執行 `openspec validate mobile-param-bottom-drawer --type change --strict`，修正所有規格格式問題
- [ ] 5.2 spec sync（將 delta 併入 `openspec/specs/cad-workspace` 與 `openspec/specs/cad-playground`）後執行 `openspec archive`，確認無殘留 delta

備註：本次不新增 OpenGrid catalog component，config.yaml 的 naming/catalog 任務規則不適用。
