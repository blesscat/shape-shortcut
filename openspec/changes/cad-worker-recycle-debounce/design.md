## Context

目前 `model-generation.ts` 已經對有效輸入排程 `model.generate`，但每次輸入仍會立即送出 `model.invalidate`。`createCadWorkerRuntime.ts` 的 `startWorker` 會終止現有 Worker、重設 generation 與操作狀態；reducer 收到 `worker-restarted` 時則會清掉已 committed 的 preview。另一方面，`runtime/events.ts` 在每個 `engine.ready` 都會自動送出一次初始模型，因此替換 Worker 若直接沿用現有流程，可能先生成預設 snapshot，再生成使用者真正要的 snapshot。

本 change 保留既有 message protocol、modelId、參數驗證與幾何/export contract，只改變 generation 的排程、Worker session 邊界，以及替換期間的 UI 狀態。初始化量測結果作為 UX 與測試基準：直接載入 WASM 約 113–137 ms；瀏覽器首次冷啟約 1.56 s；WASM asset 已快取時，新 Worker 約 0.23–0.46 s。

## Goals / Non-Goals

**Goals:**

- 對所有已註冊 CAD model 統一採用同一套 Worker replacement 流程，不依賴「高記憶體模型」分類。
- 讓輸入驗證與 UI feedback 保持即時，但讓 Worker-bound 的 valid/invalid synchronization 共用 500 ms settling debounce。
- 每個 debounce 後的最新有效 snapshot 都在前一個 Worker 終止後，由全新的 Worker 初始化並建模一次。
- 在新 Worker 初始化與建模期間保留上一個 committed mesh 作為 stale preview，並停用 export。
- 以 Worker session/epoch 保護所有事件、timeout、error、candidate 與 export 結果，避免舊 Worker 回寫目前狀態。
- 讓 replacement Worker 在 `engine.ready` 後只收到目前 pending snapshot，不再額外生成預設 snapshot。

**Non-Goals:**

- 不改變任何模型的參數範圍、validation、geometry、modelId、buildKey 或 export format。
- 不在主執行緒移動 OpenCascade、replicad、B-Rep、mesh 或 STEP writer。
- 不保證單一 Worker 內的同步 OCCT 呼叫可以被中途取消；新的輸入會在 debounce 到期後以 Worker termination 結束舊 session。
- 不新增 runtime dependency、後端服務、記憶體分類規則或資料 migration。

## Decisions

### 0. Separate model generation from short control/export deadlines

The measured 7x7 h100 honeycomb request was terminated at the existing absolute
120-second operation deadline. Use `modelGenerationTimeoutMs = 600_000` for
every model's build/mesh phase, starting when `model.generate` is sent. Keep
engine initialization at 60 seconds and candidate commit/export at the existing
120-second operation budget. On candidate-ready, replace the generation timer
with the existing commit timer. Success, invalidation, supersession, replacement
and disposal clear the relevant timer; timeout retains the existing bounded
recovery policy and retries the same latest valid snapshot in a new Worker.

Do not use progress as a heartbeat: synchronous native operations can remain
silent while doing useful work, and repeated progress must not allow an infinite
deadline. A fixed ten-minute budget accommodates the observed multi-minute
workload while retaining a bound. This trades slower detection of a truly hung
build for fewer false timeouts. Parameter edits still terminate the old Worker
after 500 ms settling, independently of the build budget. No model classification
is introduced. The user explicitly authorized this timeout-policy extension.

### 1. 以一個 settled-generation scheduler 統一有效與無效輸入

在 `model-generation.ts` 保留現有的即時 parse/validate、field diagnostic、persist 與 generation 遞增；但輸入 handler 不再直接呼叫 `sendInvalidate`。每次輸入都取消前一個 settling timer，並記錄最新的 generation、modelId、參數與 validation 結果。500 ms timer 到期後重新確認 generation 仍是最新值，再依結果執行唯一的 Worker-bound action：

- valid snapshot：dispatch generation start，交給 Worker replacement coordinator。
- invalid snapshot：保留即時 diagnostic，dispatch invalid state，向目前 active Worker 送一次 `model.invalidate`；不建立 replacement Worker，也不送 `model.generate`。

這樣可以保留輸入框的即時回饋，同時讓連續輸入只會同步最後 settled snapshot。若 valid snapshot 在舊 Worker 建模期間到期，replacement coordinator 會終止舊 session；若 invalid snapshot 到期，則只使目前 generation 失效。

替代方案是只 debounce `model.generate`、繼續立即 invalidate。這仍會產生每次輸入的跨執行緒訊息與排程競爭，無法達成「Worker-bound change 只處理 settled snapshot」的目標，因此不採用。

### 2. 用 Worker session coordinator 取代單純的重啟旗標

在 `createCadWorkerRuntime.ts` 以目前 client identity 加上本地 session token 管理一次 Worker lifecycle。每次 valid settled generation 的順序固定為：

1. 清除舊 session 的 operation timers、progress 與 export source。
2. 先呼叫舊 `CadWorkerClient.terminate()`，再建立新的 `CadWorkerClient`；不得讓兩個 CAD Worker 同時成為 active session。
3. 將 pending generation/參數掛在新 session 上，建立 `engine.init` operation。
4. 只有目前 session 的 `engine.ready` 才能進入下一步。
5. `engine.ready` 後送出 pending snapshot 的單一 `model.generate`，並由既有 candidate/commit pipeline 完成 latest-wins 判定。

`latestGenerationRef` 不應在 replacement 時重設為 0；generation 必須跨 Worker session 單調遞增，才能使 late result 的判定仍然有效。Worker epoch 在新 Worker ready 後更新，並且必須與被終止 session 不同。所有 callback、timeout 與 `onError` 都需攜帶來源 client/session token；來源不是目前 active session 時直接忽略，不能觸發目前 Worker 的 recovery。

替代方案是建立新 Worker 後才終止舊 Worker。這可以縮短切換空窗，但會讓兩個 WASM/native heap 在初始化期間重疊，正好放大目前的記憶體峰值與失敗風險，因此不採用。

### 3. 明確區分 bootstrap Worker 與 replacement Worker 的 ready 行為

Worker session 需要保存 `bootstrap` 或 `replacement` mode，以及 optional pending generation：

- bootstrap session 在沒有使用者 pending generation 時，沿用現有首次初始化後生成初始 snapshot 的行為。
- 若使用者在 bootstrap Worker 尚未 ready 前已產生 settled valid snapshot，`engine.ready` 直接送該 pending snapshot，不得先送 default snapshot。
- replacement session 永遠只處理 coordinator 指派的 pending snapshot；沒有 pending valid snapshot 時不得從目前 UI state 猜測並自動生成。

`initialModelSentRef` 不能單獨表示這個狀態，因為它無法分辨「首次 bootstrap」與「替換 Worker 等待中的 generation」。應改為由 session mode/pending request 控制；同一 `engine.ready` 重複事件仍須 idempotent。

### 4. 替換時保留 committed mesh，但使其不可匯出

新增或調整 reducer action，使 `worker-replacing`/`worker-restarted` 在已有 committed model 時保留該 model、dimensions 與 mesh reference，只將 status 設為 loading/generating、`stale` 設為 true、`exportStatus` 設為 disabled。沒有 committed model 時則維持既有 loading 初始狀態。

替換開始時清除 runtime export source 是必要的：舊 mesh 可以繼續顯示，但舊 Worker 已被終止，不能再被當作 STEP/STL 的有效 B-Rep source。新 Worker 的 `model.ready` commit 成功後，才以新 revision/epoch 更新 committed model、清除 stale 並重新啟用 export。舊 committed dimensions 在 replacement 期間保持不變，避免 UI 把新輸入誤當成已建模尺寸。

替代方案是替換時清空 viewport。這會讓每次輸入都產生長達數百毫秒至數秒的閃爍，且不能改善 native memory，因此不採用。

### 5. 將 recovery 納入同一個 session 邊界

Worker error、engine timeout 與 model timeout 都必須只處理仍屬於 active session 的來源。可恢復錯誤重試時沿用 pending generation 與「不生成 default」規則；在 retry 期間保持 stale preview/export disabled。達到 retry 上限後保留舊 preview（若有），顯示 recoverable/fatal error，且不重新啟用 export。

這避免舊 Worker 在替換後才回報 timeout/error，錯誤地終止或重建目前 Worker。手動 retry 也應使用相同的 replacement coordinator，只在沒有現有 committed preview 的 bootstrap failure 情況下呈現空白 loading state。

### 6. 以行為測試與真實 Worker 測試驗證 memory-sensitive 路徑

測試分成三層：

- model-generation unit tests：驗證 500 ms 內多次 valid/invalid 輸入只產生最後一個 Worker-bound action，validation feedback 仍即時，invalid 不啟動 replacement。
- runtime/reducer tests：使用 fake Worker 驗證 termination-before-create、generation/epoch 單調、ready 不重複生成、late event/error 被忽略，以及 stale preview/export 狀態轉換。
- browser/real Worker coverage：驗證首次初始化、asset-cache warm initialization、連續 7x7 h100 或等效高峰值模型生成、變更後 preview/export 行為與新 Worker 的 model-ready commit。測試記錄初始化時間，但不把單一機器的絕對毫秒數寫成脆弱 assertion。

既有 targeted unit tests、typecheck/lint 與 `openspec validate` 作為完成門檻；若環境允許，再以重複 generation 的 RSS/heap instrumentation 觀察新 session 是否回到可接受的 baseline。這是診斷與回歸訊號，不把 GC 時機誤判成精確的 leak proof。

## Risks / Trade-offs

- [初始化延遲增加] → 每次 settled valid generation 都要支付新 Worker init；保留舊 preview、提前顯示 stale 狀態，並以現有 asset cache 降低 warm-start 成本。
- [termination 後瀏覽器回收非同步] → 嚴格執行 terminate-before-create，記錄 Worker session 與 memory telemetry，並在真實瀏覽器測試觀察連續高峰值生成。
- [輸入期間失去舊 B-Rep export] → UI 明確停用 STEP/STL，直到新 Worker commit；mesh 仍可作為 stale viewport preview。
- [舊事件污染新 session] → 所有事件與錯誤以來源 client/session token 和 worker epoch 做雙重檢查，timeout cleanup 也隨 session 一起撤銷。
- [valid 與 invalid 變更共用 debounce 後可能延後 invalidate] → validation diagnostic 仍立即更新；只有 Worker-bound invalidate 延後至 settled snapshot，避免對每一個鍵擊送訊息。
- [現有 bootstrap 行為與 replacement 行為分支增加] → 將 session mode/pending generation 集中在 lifecycle coordinator，並用 fake Worker 覆蓋兩條 ready path，避免散落在 event handler 中。

## Migration Plan

1. 先更新 generation scheduler、Worker session coordinator、event guards 與 reducer，維持既有 model message schema。
2. 加入 unit/runtime tests，再加入瀏覽器真實 Worker 的初始化、連續生成與 stale/export coverage。
3. 執行 targeted tests、完整可行的 typecheck/lint，以及 OpenSpec validation；以冷啟與 warm-cache init 量測作為 PR 記錄。
4. 佈署後觀察高峰值模型的 Worker failure、generation latency 與 memory telemetry。若需要 rollback，可還原本 change 的程式與規格提交；不涉及資料 migration 或永久格式變更。
