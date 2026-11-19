## Context

`src/cad-kernel/model/index.ts`（909 行）與 `src/workers/error-mapping.ts`（221 行）是目前僅有的兩個「每個 component 都會碰到」的共用 registry。兩者都被列在 `scripts/affected-tests.mjs` 的 `sharedCadPrefixes`（`scripts/affected-tests.mjs:17-30`），其中 `src/cad-kernel/model/` 在 `scripts/affected-tests.mjs:23`、`src/workers/error-mapping` 在 `scripts/affected-tests.mjs:27`。

`createExecutionPlan` 的判斷順序是（`scripts/affected-tests.mjs:264-315`）：

1. `fullSuitePaths` 命中 → `all-tests`（`scripts/affected-tests.mjs:270-278`）。
2. 有 CAD 刪除／改名 → `all-cad`（`scripts/affected-tests.mjs:284-292`）。
3. `isSharedCadPath` 命中 → `all-cad`（`scripts/affected-tests.mjs:294-298`），也就是整個 CAD group（841 tests / 約 57 分鐘）。
4. 未 mapping 的 CAD asset → `all-cad`（`scripts/affected-tests.mjs:300-312`）。
5. 其餘 → `related`（`scripts/affected-tests.mjs:314`）。

`isSharedCadPath` 是純前綴比對（`scripts/affected-tests.mjs:247-250`），所以只要 component 改動落在 `src/cad-kernel/model/` 或 `src/workers/error-mapping*` 底下，就必然升級成 `all-cad`。這正是 #210（game-box）在這個分支上每次跑都要付 841 tests 的原因：`test:branch` 是拿整條 branch 對 base diff（`scripts/affected-tests.mjs:211-225`），只要 branch 內任何一個 commit 動過 `src/cad-kernel/model/index.ts` 與 `src/workers/error-mapping.ts`，後續每一次 `pnpm test:branch` 都會重複看到那兩個路徑。

### import fan-out 的實測

`src/cad-kernel/model/index.ts:39-84` 靜態 import 每一個 component builder；`src/cad-kernel/model/index.ts:670-705` 是所有 definition 的清單；`src/cad-kernel/model/index.ts:707-724` 與 `src/cad-kernel/model/index.ts:726-909` 是 dispatch。`src/workers/cad-worker-generation.ts:48-53` 與 `src/workers/cad-worker-scene.ts:3` import 這個 barrel，所以 worker bundle 一定會牽到全部 component。

vitest 的 `related` 選擇是**遞迴**的，而且同時走靜態 `deps` 與 `dynamicDeps`（`node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:11509-11525`）。用 vitest 自己的 `getRelevantTestSpecifications` 量測（不執行任何測試）：

| changed path | 選到的 test 檔 |
| --- | --- |
| `src/cad-kernel/components/game-box/builder.ts` | 24 / 246 |
| `src/cad-kernel/components/card-box/builder.ts` | 26 / 246 |
| `src/cad-kernel/model/index.ts` | 21 / 246 |
| `src/workers/error-mapping.ts` | 18 / 246 |

24 個檔案約 248 個 test case，與 brief 中「related 模式跑 248 tests / 160 秒」一致。**結論：只要 component 改動仍然讓 `vitest related` 看到 shared registry，selection 就不會變窄；真正要變的是 plan kind 從 `all-cad` 降成 `related`。**

### error rule 的順序敏感性

`cadErrorCodeFor`（`src/workers/error-mapping.ts:6-146`）與 `cadErrorStageFor`（`src/workers/error-mapping.ts:148-221`）都是 first-match 的 substring 比對。窮舉所有 rule pair（只要一個 pattern 是另一個的子字串，且結果不同，順序就會改變結果）得到：

code 端 5 對：

1. `OPENGRID_ORGANIZER_BOX_PARAMETERS_INVALID`（`src/workers/error-mapping.ts:32`）先於 `OPENGRID_ORGANIZER_BOX_`（`src/workers/error-mapping.ts:112`）。
2. `OPENGRID_SNAP_HOLD_REFERENCE_MISSING`（`src/workers/error-mapping.ts:85`）先於 `OPENGRID_SNAP_HOLD_`（`src/workers/error-mapping.ts:91`）。
3. `OPENGRID_SNAP_HOLD_REFERENCE_INVALID`（`src/workers/error-mapping.ts:86`）先於 `OPENGRID_SNAP_HOLD_`。
4. `OPENGRID_SNAP_HOLD_REFERENCE_LOAD_FAILED`（`src/workers/error-mapping.ts:87`）先於 `OPENGRID_SNAP_HOLD_`。
5. `OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT`（`src/workers/error-mapping.ts:97`）先於 `OPENGRID_STACKABLE_BOX_`（`src/workers/error-mapping.ts:111`）。

stage 端 2 對：

1. `OPENGRID_SNAP_HOLD_REFERENCE_`（`src/workers/error-mapping.ts:179`）先於 `OPENGRID_SNAP_HOLD_`（`src/workers/error-mapping.ts:185`）。
2. `OPENGRID_STACKABLE_BOX_HONEYCOMB_MEMORY_LIMIT`（`src/workers/error-mapping.ts:186`）先於 `OPENGRID_STACKABLE_BOX_`（`src/workers/error-mapping.ts:199`）。

**7 對全部落在同一個 component 內**（organizer-box、opengrid-snap、opengrid-stackable-box）。這代表「依 component 分組、組內保持原順序」的切法可以保留這些相對順序；但跨 component 的相對順序在原始檔案裡是交錯的（`OPENGRID_ORGANIZER_BOX_PARAMETERS_INVALID` 在第 32 行，`OPENGRID_ORGANIZER_BOX_` 在第 112 行），所以不能單靠「依 component 排序後串接」來保證行為完全相同。

## Goals / Non-Goals

**Goals:**

- 新增或修改一個 component 時，改動只落在該 component 自己的檔案，兩個共用 registry 檔案不需要被修改。
  範圍說明：新增一個 component 仍需要在 `src/cad-contract/units/model.ts` 註冊 `ModelId` 與參數驗證，並在 `src/features/cad/model-catalog/index.ts` 的 UI model catalog 註冊該 component。兩者都不在 `scripts/affected-tests.mjs` 的 `sharedCadPrefixes` 內，因此 plan kind 仍是 `related`，本變更的硬性約束不受影響。
- `pnpm test:branch` 對這種改動走 `related` 模式，而不是整個 CAD group。
- 真正共用程式碼（兩個 registry、kernel context、worker runtime）的改動仍然跑完整 CAD suite。
- error mapping 的結果（code 與 stage）對每一條既有 rule 都必須一模一樣，包含上面 7 對順序敏感 rule。
- 產生的 geometry 完全不變；model ID、參數 contract、export format 完全不變。
- 兩個共用模組的 public import surface 維持在實際被使用的 10 個符號（`model/index.ts` 8 個 + `error-mapping.ts` 2 個），名稱、型別與簽章不變；21 個零引用的 per-component `*KernelDefinition` export 移除（owner 決策 2）。

**Non-Goals:**

- 不減少 worker-level 測試的 fan-out。`vitest related` 對 component builder 的 fan-out 本來就會經由 registry 觸及 worker 的測試，這是 static worker bundle 的必然結果（決策 2）。
- 不改變 CAD Worker 的架構、啟動流程或訊息協定。
- 不新增 component，不新增 dependency，不做資料 migration。
- 不改 `scripts/affected-tests.mjs` 的既有規則（決策 4）。

## Decisions

### 1. 每個 component 擁有一個 definition module 與一個 rule module

檔案佈局：

- `src/cad-kernel/components/<component>/definition.ts`：匯出該 component 的 `KernelModelDefinition`（以及需要時的 `buildWithParts`）。
- `src/workers/error-rules/<component>.ts`：匯出該 component 的 code rules 與 stage rules。
- `src/cad-kernel/model/index.ts`：保留 public surface（`KernelBuildContext`、`KernelBuildPhase`、`KernelModelDefinition`、`KernelModelBuildResult`、`kernelModelDefinitions`、`getKernelModelDefinition`、`buildModelBRep`、`buildModelBRepWithParts`），加上自動收集。
- `src/workers/error-mapping.ts`：保留 `cadErrorCodeFor`、`cadErrorStageFor` 的簽名與行為，加上自動收集。

好處是 component 的 code、definition、error rule 全部聚在 component 自己的目錄與一個 worker 規則目錄下，「改一個 component 只碰這個 component 的檔案」在路徑上真的成立。

### 2. 方案比較：explicit registry list vs `import.meta.glob` 自動收集

**方案 A — explicit list（共用檔案列出每個 component）**

`src/cad-kernel/model/index.ts` 改成 `import { gameBoxDefinition } from '../components/game-box/definition'` 逐一列出，`src/workers/error-mapping.ts` 逐一列出每個 rule module。

- Vite build / worker bundle：與今天完全相同，靜態 import，不會產生額外 chunk。風險最低。
- 型別安全：最高。`kernelModelDefinitions` 的元素型別是 `KernelModelDefinition`，編譯期就能抓錯。
- Test selection：**不達標**。新增 component 一定要改 `src/cad-kernel/model/index.ts`，而這個路徑在 `sharedCadPrefixes` 內，於是新增 component 的 PR 仍然每次 `test:branch` 都跑滿 841 tests。也就是 #210 的痛點沒有被解決。
- error rule 順序：共用檔案用「有序 matcher 清單」表達順序，可完全保留；但每個 component 的 rule 會散落在清單的多個位置，維護成本高。
- 遷移風險：低，可分步進行。

**方案 B — `import.meta.glob` 自動收集（建議採用）**

`src/cad-kernel/model/index.ts` 用

```ts
const modules = import.meta.glob<ComponentDefinitionModule>(
  '../components/*/definition.ts',
  { eager: true },
)
```

`src/workers/error-mapping.ts` 用

```ts
const modules = import.meta.glob<ComponentErrorRuleModule>('./error-rules/*.ts', {
  eager: true,
})
```

- Vite build / worker bundle：worker 是 Vite module worker（`src/features/cad/worker-client/index.ts:38`），`import.meta.glob` 是 Vite 原生功能，`eager: true` 會產生**靜態** import，因此 bundle 特性與今天相同，不會多出 chunk，也不會有 runtime dynamic import 的載入風險。`eager: false` 則會產生 chunk 與非同步載入，故排除。
- 型別安全：`import.meta.glob<T>()` 提供泛型，module 形狀有型別；代價是 key 是字串，所以補上 runtime 驗證（每個 module 必須有合法 `definition.id`、id 不重複、`id` 必須是已知 `ModelId`）與一條測試保證「每個 component 目錄都剛好被收進來一次」。
- Test selection：**達標**。新增 component 只需要新增 `src/cad-kernel/components/<c>/definition.ts` 與 `src/workers/error-rules/<c>.ts`，兩個共用 registry 檔案完全不動，而這兩個新路徑都不在 `sharedCadPrefixes` 內，所以 plan kind 是 `related`。
- error rule 順序：自動收集回來的 key 是依路徑排序，不是原本的語意順序，因此**每條 rule 必須帶一個明確的 order key**，共用模組依 order key 排序後才進行 first-match 比對。這讓順序變成宣告式的、可測的，同時新增 component 不需要動共用檔案。
- 遷移風險：中。可分步進行，且每一步都有可驗證的落點。

**建議：採方案 B，並保留方案 A 作為 fallback。** 理由是 brief 的目標是「改一個 component 只碰該 component 的檔案」，方案 A 只解決「改」，不解決「新增」；而 #210 的痛點正是新增 component 的 PR。方案 B 在 build 行為上與今天等價（eager glob = 靜態 import），型別風險由 runtime 驗證與測試補足，是整體風險與收益最平衡的選項。

若實作階段發現 worker bundle 或 Vitest 對 `import.meta.glob` 有非預期行為，降級成方案 A：改成 explicit list，並把「新增 component 需要改共用 registry」明確記錄為已知限制。

### 3. error rule 順序用宣告式 order key 保留

每個 rule module 匯出兩組有序 rule：

```ts
export const gameBoxCodeRules: readonly CadErrorCodeRule[] = [
  { order: 170, pattern: 'GAME_BOX_GEOMETRY_INVALID', code: 'GAME_BOX_GEOMETRY_INVALID' },
  { order: 180, pattern: 'MODEL_PARAMETERS_MISMATCH:game-box', code: 'INVALID_INPUT' },
]
```

共用模組把收集到的 rule 依 `order` 排序後 first-match 比對。原始順序用固定的數字 key 對應（今天的順序 1..64 / 1..24），新增 component 使用中間的數字 key（例如 175）以插入正確位置。

`order` 必須唯一；同一個 module 內多條 rule 可以各自帶 order，讓同一個 component 的 rule 保留原本分散在多個位置的相對順序（例如 opengrid-snap 的 `OPENGRID_SNAP_HOLD_REFERENCE_*` 必須排在 `OPENGRID_SNAP_HOLD_` 之前，opengrid-organizer-box 的 `OPENGRID_ORGANIZER_BOX_PARAMETERS_INVALID` 必須排在 `OPENGRID_ORGANIZER_BOX_` 之前）。

除了保真搬移的 characterization test 之外，還要有一條測試直接鎖住這 7 對順序敏感 rule 的結果，避免未來新增 rule 時破壞順序語意。

### 4. `scripts/affected-tests.mjs` 不需要修改

新的 per-component 檔案放在

- `src/cad-kernel/components/<component>/definition.ts` — 不在 `src/cad-kernel/model/` 底下，因此不會命中 `scripts/affected-tests.mjs:23`。
- `src/workers/error-rules/<component>.ts` — 不匹配 `src/workers/error-mapping` 這個前綴。

而 `src/cad-kernel/model/index.ts` 與 `src/workers/error-mapping.ts` 兩個檔案本身的路徑不變，仍然被 `sharedCadPrefixes` 命中，所以「改真正共用程式碼仍然跑完整 CAD suite」這個規則自動成立。

這樣一來 `affected-tests.mjs` 完全不需要動，既有 `tests/unit/affected-test-selection.test.ts` 的行為契約也不需要修改，只需要補一條新 case 證明 component 的 per-component 檔案會走 `related`。

### 5. 搬移必須是逐字搬移

拆分本身不得改動任何邏輯、識別字、錯誤碼、幾何輸出、progress/phase 回報或資源釋放行為。新的程式碼只限於 import/ export 串接、collection 邏輯、order key，以及把原本的 if-chain 轉成等價的 rule 資料結構。每個 component 搬移前後都必須有等價性測試（definition 存在性、id 唯一性、error mapping 結果、stage 結果）。

## Risks / Trade-offs

- [`import.meta.glob` 只在 Vite 下有效] → repo 的測試與 build 都走 Vite（Vitest / Astro），worker 是 Vite module worker；實作時先用一個最小 spike 驗證 eager glob 在 worker bundle 內的行為，並保留方案 A 作為 fallback。
- [由字串 key 組出的 registry 失去編譯期完整性] → 以 runtime 驗證（id 存在、是合法 `ModelId`、不重複）加上「每個 component 目錄剛好被收一次」的測試補回；缺漏或重複會直接讓測試失敗。
- [order key 維護失誤會改變 error mapping 結果] → 以兩條測試把關：完整 rule 表的 characterization test（搬移前 golden、搬移後比對）與 7 對順序敏感 rule 的專屬斷言。
- [per-component module 變多，導覽成本上升] → 檔名與目錄沿用既有的 component slug，並在 `src/workers/error-rules/` 與 `src/cad-kernel/components/` 維持一致命名。
- [fan-out 不會更小] → 這是 static worker bundle 的必然結果；本次收益是 plan kind 從 `all-cad`（841 tests / 57 分鐘）降為 `related`（約 24 個 test 檔 / 248 tests / 160 秒），而不是把 fan-out 降到單一 component。若要再收斂，需要改成 runtime 解析 definition，會牴觸 worker bundle 的可分析性，屬於另外的議題。
- [搬移期間可能有中間狀態] → 遷移分成可獨立驗證的步驟，每一步都保持 repository 可建置、可測試。

## Migration Plan

1. 先加 characterization 測試：把目前 `kernelModelDefinitions` 的內容、`cadErrorCodeFor` / `cadErrorStageFor` 對每一條既有 rule 的結果、以及 7 對順序敏感 rule 的結果固定下來，作為搬移前的 golden baseline。
2. 確認 `import.meta.glob` 的 eager 形式在 worker bundle（`src/features/cad/worker-client/index.ts:38`）與 Vitest 下都可運作；不可行則改用方案 A。
3. 搬移 error rules：建立 `src/workers/error-rules/<component>.ts`，把 `src/workers/error-mapping.ts` 每個 component 的 rule 轉成帶唯一 `order` key 的等價 rule 資料結構（決策 3 允許把原本的 if-chain 轉成等價的 rule 資料結構，決策 5 限定只有 pattern 與結果碼必須逐字不變），`src/workers/error-mapping.ts` 改成收集 + 排序 + first-match。跑 error mapping 相關測試確認結果一致。
4. 搬移 model definitions：建立 `src/cad-kernel/components/<component>/definition.ts`，把 `src/cad-kernel/model/index.ts` 的 `build*Model` 函式與 definition 常數逐字搬過去，`src/cad-kernel/model/index.ts` 改成 glob 收集 + 保留 public surface。跑 kernel / worker 相關測試確認一致。
5. 驗證沒有任何 import 路徑壞掉：glob 方案不改變任何 import 路徑，既有測試的 import 敘述必須原封不動仍可運作；唯一允許的既有測試變更是把 `tests/unit/hsw-cell-kernel.test.ts` 中釘住 `kernelModelDefinitions` 手寫順序的斷言改成與順序無關的集合比對。
6. 補 `affected-tests.mjs` 的 plan 測試：component 的 per-component 檔案走 `related`，兩個共用 registry 檔案仍走 `all-cad`。
7. 收尾：跑 `pnpm check`、Prettier 檢查、targeted tests，最後跑一次完整 `pnpm test:branch` 作為整體門檻。
8. 不涉及資料 migration；若需回滾，只需還原本 change 的程式與規格提交。

## Open Questions

1. **已定案（2026-11-19，owner 決定「好 照建議做」）— 硬性約束**：確認「新增 component 時也不得修改兩個共用 registry 檔案」為硬性需求，採用方案 B（`import.meta.glob` eager 自動收集）。
2. **已定案（2026-11-19，owner 決定「好 照建議做」）— fan-out 範圍**：接受經由靜態 worker bundle 產生的約 24 個 test 檔（約 248 個 test case）`related` fan-out，本次不進一步將 definition 解析改為 runtime 動態載入。
3. **實作細節 — error rule 順序**：維持採用每條 rule 攜帶明確 `order` key、由 `src/workers/error-mapping.ts` 排序後 first-match 比對的設計。
4. **Stage 1 spike 結果（已驗證）**：task 1.3 已以 `box`、`game-box` 的 `definition.ts` 與 `error-rules/game-box.ts` 實測 eager `import.meta.glob`，在 `pnpm check`、Vitest `fast` / `cad` 兩個 project、`pnpm build` worker bundle（無新增 chunk 且內含收集到的 builder 與 error rules）以及 `vitest related` 均運作正常，可進入 stage 2 實作。
5. **已定案（2026-11-19，owner 決定「好 照建議做」）— `kernelModelDefinitions` 的順序**：`kernelModelDefinitions` 的順序沒有任何程式碼依賴（runtime 以 `find` 依唯一 `id` 查找，`src/` 內沒有 consumer），因此把 `tests/unit/hsw-cell-kernel.test.ts` 中釘住手寫順序的斷言改成與順序無關的集合比對。`KernelModelDefinition` 不新增 `order` key —— 只有 error rule 需要 `order`。
6. **已定案（2026-11-19，owner 決定「好 照建議做」）— 移除 21 個未使用的 export**：`src/cad-kernel/model/index.ts` 目前的 21 個 per-component `*KernelDefinition` export（`boxKernelDefinition` … `opengridLabelLedgeTestKernelDefinition`）在 `src/`、`tests/`、`e2e/`、`scripts/` 都沒有 consumer，已確認為零引用，予以移除。保留它們會讓每新增一個 component 都得修改這個共用檔案，與本變更的硬性約束衝突。delta spec 的 public surface 情境同步改為明確列出 8 + 2 = 10 個符號。
7. **已定案（2026-11-19，owner 決定「好 照建議做」）— task 4.3 / 4.4 / 4.5 的修正**：
   - 4.3 改為行為式檢查（純收集函式 + `createExecutionPlan` 的 case），不再斷言 `git diff`。斷言 `git diff` 會把測試耦合到 VCS 與工作樹狀態，違反 `testing-guardrails`。
   - 4.5 排除 `src/cad-kernel/components/` 底下四個非 model 目錄：`opengrid-benchmark`、`opengrid-label-ledge`、`opengrid-locating-assembly`、`shared`（皆不含也不匯出 `ModelId`）。
   - 4.4 在搬移前先錄製 geometry baseline（每個 `ModelId` 在預設參數下的體積、bbox、solid 數），搬移後以同一份 fixture 驗證。
8. **已定案（2026-11-19，owner 決定「好 照建議做」）— review A 五項 finding 與 review B 有效 finding 全數修正**：P2-1（spec public surface 明確化）、P2-2（決策寫入 design/tasks）、P3-1（task 2.1 措辭矛盾）、P3-2（import 路徑不變）、P3-3（Goals 範圍），以及 review B P3-1（error rule 集合的可窮舉性 guard：新增 rule 未寫入 golden fixture 必須讓測試失敗）。
