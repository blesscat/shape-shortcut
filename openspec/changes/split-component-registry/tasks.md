## 1. 搬移前基準

- [ ] 1.1 建立 registry 與 error mapping 的 golden baseline：記錄 `kernelModelDefinitions` 目前每一筆的 `id` 與 `build` 對應、`getKernelModelDefinition` 對每個 `ModelId` 的查找結果，以及 `cadErrorCodeFor` / `cadErrorStageFor` 對每一條既有 rule 的 code 與 stage；輸出成可在搬移後直接比對的測試 fixture
- [ ] 1.2 建立順序敏感 rule 的專屬 baseline 測試，涵蓋 `OPENGRID_SNAP_HOLD_REFERENCE_MISSING`、`OPENGRID_SNAP_HOLD_REFERENCE_INVALID`、`OPENGRID_SNAP_HOLD_REFERENCE_LOAD_FAILED`、`OPENGRID_ORGANIZER_BOX_PARAMETERS_INVALID`、`OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT` 與其對應的 `OPENGRID_SNAP_HOLD_`、`OPENGRID_ORGANIZER_BOX_`、`OPENGRID_STACKABLE_BOX_` 規則，鎖定 code 與 stage 的結果
- [ ] 1.3 以最小 spike 驗證 `import.meta.glob` 的 eager 形式在 worker bundle（`src/features/cad/worker-client/index.ts:38` 的 module worker）與 Vitest 下都可運作且不產生額外 chunk；驗證失敗則改採 design.md 決策 2 的方案 A，並在 design.md 記錄降級理由

## 2. Worker error rules 拆分

- [ ] 2.1 建立 `src/workers/error-rules/` 目錄，把 `src/workers/error-mapping.ts` 中每一個 component 的 rule 以 if-chain 逐字搬進 `src/workers/error-rules/<component>.ts`，共用規則留在 shared module；每條 rule 帶上唯一的 `order` key，對應目前的原始順序
- [ ] 2.2 把 `src/workers/error-mapping.ts` 改為自動收集各 rule module、依 `order` 排序後進行 first-match 比對；保留 `cadErrorCodeFor` 與 `cadErrorStageFor` 的名稱、參數與回傳型別，command kind fallback 順序不變
- [ ] 2.3 確認 `opengrid-snap`、`opengrid-organizer-box`、`opengrid-stackable-box` 這三個 component 的 rule 在拆分前後的相對順序完全一致，並讓 1.2 的順序敏感測試通過
- [ ] 2.4 執行 error mapping 相關的 targeted tests（`tests/unit/error-mapping.test.ts`、`tests/unit/opengrid-bottom-hole-error-mapping.test.ts`、`tests/unit/opengrid-divider-admission.test.ts`、`tests/unit/opengrid-open-shelf-admission.test.ts`）並確認 1.1 的 golden baseline 完全一致

## 3. CAD-kernel model definitions 拆分

- [ ] 3.1 為每個 component 建立 `src/cad-kernel/components/<component>/definition.ts`，把 `src/cad-kernel/model/index.ts` 中該 component 的 `build*Model` 函式與 definition 常數逐字搬入，並保留需要時的 `buildWithParts` 路徑
- [ ] 3.2 把 `src/cad-kernel/model/index.ts` 改為自動收集各 component 的 definition module，並保留 `KernelBuildContext`、`KernelBuildPhase`、`KernelModelDefinition`、`KernelModelBuildResult`、`kernelModelDefinitions`、`getKernelModelDefinition`、`buildModelBRep`、`buildModelBRepWithParts` 的名稱、型別與簽章
- [ ] 3.3 加入 runtime 驗證：每個被收集到的 definition 必須有合法且唯一的 `ModelId`，缺漏、重複或格式錯誤必須讓測試失敗而不是靜默忽略
- [ ] 3.4 確認新增一個 component 時不需要修改 `src/cad-kernel/model/index.ts` 與 `src/workers/error-mapping.ts`，並以一個 fixture component 驗證這個前提

## 4. 測試更新與新增

- [ ] 4.1 更新 import 路徑受影響的既有測試（`tests/unit/hsw-cell-kernel.test.ts`、`tests/unit/opengrid-openconnect-organizer-kernel.test.ts`、`tests/unit/opengrid-regression.test.ts`、`tests/worker/opengrid-organizer-box.integration.test.ts`、`tests/worker/opengrid-stackable-box.integration.test.ts`、`tests/worker/runtime-lifecycle.test.ts` 等），不得改動測試意圖
- [ ] 4.2 新增 `tests/unit/affected-test-selection.test.ts` 的 case：component 的 per-component definition 與 error rule 檔案走 `related` 模式，`src/cad-kernel/model/index.ts` 與 `src/workers/error-mapping.ts` 仍然走 `all-cad`
- [ ] 4.3 新增測試證明「改一個 component 只碰該 component 的檔案」：以 git diff 斷言 component 改動不會出現在兩個共用 registry 檔案
- [ ] 4.4 新增測試證明 geometry 不變：同一 component 與參數在拆分前後產生的 shape 必須一致
- [ ] 4.5 新增測試證明 `import.meta.glob` 收集到每個 component 恰好一次，且沒有遺漏任何 `src/cad-kernel/components/*/` 下的 component

## 5. 驗證與交付

- [ ] 5.1 執行 `pnpm check` 與 `pnpm exec prettier --check`（觸及的檔案），修正所有型別與格式問題
- [ ] 5.2 執行 `pnpm exec openspec validate split-component-registry --strict` 並修正所有規格問題
- [ ] 5.3 最後完整執行一次 `pnpm test:branch` 作為整體門檻，並記錄實際選到的 test 檔案與 test case 數量，確認 component 改動已不再觸發完整 CAD group
