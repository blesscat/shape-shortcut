## 1. Settled generation scheduler

- [x] 1.1 將 `model-generation.ts` 的 valid/invalid Worker-bound action 統一收斂到 500 ms settling debounce，保留每次輸入的 generation 遞增、即時 validation、diagnostic 與 persistence；以 fake timers 驗證連續輸入只留下最新 snapshot
- [x] 1.2 讓 debounce 到期時重新檢查 latest generation，valid snapshot 才進入 Worker replacement，invalid snapshot 只送一次 `model.invalidate` 且不建立新 Worker；以 valid→invalid、invalid→valid 與快速連續變更測試驗證沒有錯誤的 `model.generate`
- [x] 1.3 確認所有 CAD model 共用同一個 scheduler 與 500 ms configuration，並更新受影響的單元測試；執行 generation 相關 targeted test 並確認既有 validation contract 不變

## 2. Worker session replacement

- [x] 2.1 在 Worker runtime 建立可識別 bootstrap/replacement 的 session coordinator，保存 pending modelId、參數與 generation，並確保 generation 跨 session 單調遞增；以 fake Worker 測試每次 valid settled generation 都建立新 session
- [x] 2.2 實作 terminate-before-create 的 replacement 順序，清理舊 session timers、operations、progress 與 export source 後才建立新 `CadWorkerClient`；以 lifecycle test 驗證不存在新 Worker 先於舊 Worker terminate 的情況
- [x] 2.3 讓 replacement session 在 `engine.ready` 後只送 pending snapshot 一次，取消目前會額外生成 default snapshot 的路徑；以 event-handler test 驗證 ready→generate 只有一個目前 generation request
- [x] 2.4 將初始化 timeout、model timeout、Worker error 與 retry 綁定來源 session/client token，並保留 pending generation 的 recovery 語意；以 fake Worker 發送舊 session error/timeout 驗證不會重建或終止目前 session
- [x] 2.5 在新 Worker ready 後更新 worker epoch，並以 client identity、session token 與 epoch 過濾 late event；以 candidate、ready、export、error 四類舊事件測試驗證都不會回寫目前 state

## 3. Preview and export state

- [x] 3.1 調整 `worker-restarted` 或新增 replacement reducer action，使已有 committed preview 在 replacement 期間保留、標記 stale、維持舊 dimensions 並停用 export；以 reducer behavior test 驗證有/無 committed preview 兩條狀態路徑
- [x] 3.2 讓 invalid snapshot、replacement 開始、recovery failure 都清除不可用的 export source，只有新 Worker 的 model-ready commit 才恢復 export；以 export state test 驗證 stale 期間 STEP/STL 都被拒絕、commit 後重新可用
- [x] 3.3 確認新 model-ready 只提交目前 generation 與 worker epoch，且不會被舊 committed revision 或舊 dimensions 覆蓋；執行 latest-wins 與 stale-preview 測試確認 viewport 和 export 狀態一致

## 4. Runtime and browser coverage

- [x] 4.1 補齊 runtime unit coverage：首次 bootstrap、bootstrap ready 前已有 pending snapshot、replacement、invalid settled snapshot、初始化失敗與 retry；執行對應 Vitest targeted test 並確認每條路徑的 request 數量
- [x] 4.2 補齊瀏覽器真實 Worker coverage：首次初始化、WASM cache warm initialization、快速連續輸入、replacement 中保留 stale preview、model-ready 後 export 恢復；以瀏覽器測試驗證可觀察的 status/preview/export 行為
- [x] 4.3 以 7x7 h100 或等效高峰值 CAD case 執行連續 generation smoke test，記錄 Worker init、generation result、RSS/heap 與 failure；確認舊 Worker 終止後 late result 不會造成錯誤 commit

## 5. Verification and handoff

- [x] 5.0 Separate the all-model 600-second generation deadline from initialization/commit/export deadlines; verify slow success beyond 120 seconds, bounded timeout despite progress, commit/export deadline preservation and supersession cleanup with fake timers, then rerun the high-memory browser smoke test

- [x] 5.1 執行 generation/runtime/reducer 的 targeted tests、完整可行的 typecheck 與 lint，並確認沒有新增 modelId、參數或 export contract 變更
- [x] 5.2 執行 `openspec validate cad-worker-recycle-debounce --type change --strict`，修正所有規格格式或覆蓋率問題後再回報結果
- [x] 5.3 在目前 `codex/opengrid-honeycomb-memory` 分支整理變更摘要與初始化量測，確認只更新既有 PR #134 的 scope，不建立新分支或 PR
