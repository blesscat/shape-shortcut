## 1. 搬移前基準

- [x] 1.1 建立 registry 與 error mapping 的 golden baseline：記錄 `kernelModelDefinitions` 目前每一筆的 `id` 與 `build` 對應、`getKernelModelDefinition` 對每個 `ModelId` 的查找結果，以及 `cadErrorCodeFor` / `cadErrorStageFor` 對每一條既有 rule 的 code 與 stage；輸出成可在搬移後直接比對的測試 fixture
- [x] 1.2 建立順序敏感 rule 的專屬 baseline 測試，涵蓋 `OPENGRID_SNAP_HOLD_REFERENCE_MISSING`、`OPENGRID_SNAP_HOLD_REFERENCE_INVALID`、`OPENGRID_SNAP_HOLD_REFERENCE_LOAD_FAILED`、`OPENGRID_ORGANIZER_BOX_PARAMETERS_INVALID`、`OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT` 與其對應的 `OPENGRID_SNAP_HOLD_`、`OPENGRID_ORGANIZER_BOX_`、`OPENGRID_STACKABLE_BOX_` 規則，鎖定 code 與 stage 的結果
- [x] 1.3 以最小 spike 驗證 `import.meta.glob` 的 eager 形式在 worker bundle（`src/features/cad/worker-client/index.ts:38` 的 module worker）與 Vitest 下都可運作且不產生額外 chunk；驗證失敗則改採 design.md 決策 2 的方案 A，並在 design.md 記錄降級理由
- [ ] 1.4 錄製 geometry baseline（搬移前）：對每一個 `ModelId` 以預設參數經由公開的 build 路徑建構幾何，記錄可辨識該幾何的值（體積、bounding box、solid 數），寫成 fixture 與測試；此測試必須在尚未搬移的 source 上就通過，搬移後以同一份 fixture 驗證 geometry 不變

## 2. Worker error rules 拆分

- [ ] 2.1 建立 `src/workers/error-rules/` 目錄，把 `src/workers/error-mapping.ts` 中每一個 component 的 rule 轉成**等價的 rule 資料結構**搬進 `src/workers/error-rules/<component>.ts`：依 design 決策 3，每條 rule 帶上唯一的 `order` key 對應目前的原始順序（order 唯一、組間可比）；依 design 決策 5，把原本的 if-chain 轉成等價的 rule 資料結構屬於允許的新程式碼，因此不要求逐字保留 if 敘述本身，但每條 rule 的 pattern 與結果碼必須逐字不變；共用規則留在 shared module
- [ ] 2.2 把 `src/workers/error-mapping.ts` 改為自動收集各 rule module、依 `order` 排序後進行 first-match 比對；保留 `cadErrorCodeFor` 與 `cadErrorStageFor` 的名稱、參數與回傳型別，command kind fallback 順序不變
- [ ] 2.3 確認 `opengrid-snap`、`opengrid-organizer-box`、`opengrid-stackable-box` 這三個 component 的 rule 在拆分前後的相對順序完全一致，並讓 1.2 的順序敏感測試通過
- [ ] 2.4 執行 error mapping 相關的 targeted tests（`tests/unit/error-mapping.test.ts`、`tests/unit/opengrid-bottom-hole-error-mapping.test.ts`、`tests/unit/opengrid-divider-admission.test.ts`、`tests/unit/opengrid-open-shelf-admission.test.ts`）並確認 1.1 的 golden baseline 完全一致
- [ ] 2.5 讓 error rule 集合具備可窮舉性保護：新增一條 error rule 而沒有同步記錄到 golden fixture 時，必須有測試失敗（不得靜默通過）。做法是把 fixture 的 error rule 集合改成可檢查總數／一一對應的形式，取代目前只有單向保護的陣列形式

## 3. CAD-kernel model definitions 拆分

- [ ] 3.1 為每個 component 建立 `src/cad-kernel/components/<component>/definition.ts`，把 `src/cad-kernel/model/index.ts` 中該 component 的 `build*Model` 函式與 definition 常數逐字搬入，並保留需要時的 `buildWithParts` 路徑
- [ ] 3.2 把 `src/cad-kernel/model/index.ts` 改為自動收集各 component 的 definition module，並保留 `KernelBuildContext`、`KernelBuildPhase`、`KernelModelDefinition`、`KernelModelBuildResult`、`kernelModelDefinitions`、`getKernelModelDefinition`、`buildModelBRep`、`buildModelBRepWithParts` 的名稱、型別與簽章
- [ ] 3.3 加入 runtime 驗證：每個被收集到的 definition 必須有合法且唯一的 `ModelId`，缺漏、重複或格式錯誤必須讓測試失敗而不是靜默忽略
- [ ] 3.4 確認新增一個 component 時不需要修改 `src/cad-kernel/model/index.ts` 與 `src/workers/error-mapping.ts`，並以一個 fixture component 驗證這個前提
- [ ] 3.5 移除 `src/cad-kernel/model/index.ts` 中 21 個沒有任何 consumer 的 per-component `*KernelDefinition` export（`boxKernelDefinition` … `opengridLabelLedgeTestKernelDefinition`），使共用檔案的 public surface 收斂為 delta spec 明列的 8 個符號；保留它們會讓每新增一個 component 都必須修改這個共用檔案，與本變更的硬性約束衝突

## 4. 測試更新與新增

- [ ] 4.1 驗證沒有任何 import 壞掉：glob 方案不改變任何 import 路徑，因此既有測試（`tests/unit/hsw-cell-kernel.test.ts`、`tests/unit/opengrid-openconnect-organizer-kernel.test.ts`、`tests/unit/opengrid-regression.test.ts`、`tests/worker/opengrid-organizer-box.integration.test.ts`、`tests/worker/opengrid-stackable-box.integration.test.ts`、`tests/worker/runtime-lifecycle.test.ts` 等）的 import 敘述必須原封不動仍可運作；唯一允許的既有測試變更是 4.6
- [ ] 4.2 新增 `tests/unit/affected-test-selection.test.ts` 的 case：component 的 per-component definition 與 error rule 檔案走 `related` 模式，`src/cad-kernel/model/index.ts` 與 `src/workers/error-mapping.ts` 仍然走 `all-cad`
- [ ] 4.3 新增**行為式**測試證明「改一個 component 只碰該 component 的檔案」：對純收集函式（`collectKernelModelDefinitions` / `collectErrorRules`）注入一個 synthetic component module map，證明新增 component module 就會被收集、且不需要修改共用 registry 的收集邏輯；配合 4.2 的 `createExecutionPlan` case 即可證明隔離契約。**不得**斷言 `git diff` 或任何 repository／工作樹狀態（會耦合 VCS，且 merge 之後會空跑通過）
- [ ] 4.4 新增測試證明 geometry 不變：以 1.4 錄製的 geometry baseline fixture，在拆分後對同一 component 與參數驗證產生的 shape 與搬移前一致
- [ ] 4.5 新增測試證明 `import.meta.glob` 收集到每個 component 恰好一次，且沒有遺漏任何 model component；`src/cad-kernel/components/` 底下的 `opengrid-benchmark`、`opengrid-label-ledge`、`opengrid-locating-assembly`、`shared` 四個目錄不是 model component（不含也不匯出 `ModelId`），不列入收集對應清單
- [ ] 4.6 把 `tests/unit/hsw-cell-kernel.test.ts` 中釘住 `kernelModelDefinitions` 手寫順序的斷言改成**與順序無關**的集合比對；`kernelModelDefinitions` 的順序沒有任何程式碼依賴（runtime 以 `find` 依唯一 `id` 查找），且**不得**在 `KernelModelDefinition` 新增 `order` key（order key 只有 error rule 需要）

## 5. 驗證與交付

- [ ] 5.1 執行 `pnpm check` 與 `pnpm exec prettier --check`（觸及的檔案），修正所有型別與格式問題
- [ ] 5.2 執行 `pnpm exec openspec validate split-component-registry --strict` 並修正所有規格問題
- [ ] 5.3 最後完整執行一次 `pnpm test:branch` 作為整體門檻，並記錄實際選到的 test 檔案與 test case 數量，確認 component 改動已不再觸發完整 CAD group（本 task 在 review gate 通過之後由 lead 執行）
