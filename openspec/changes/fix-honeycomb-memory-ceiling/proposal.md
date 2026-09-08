## Why

省料模式（`honeycombMode`）在大型格數的容器上會 100% 生成失敗：實測堆疊方盒 5x6、5x7、5x8、4x8、8x5（約 ≥1,100 格）全部失敗，Open Shelf 5x8（4,689 格）同樣失敗，使用者只看到通用的「Model generation failed」。根本原因是 OpenCascade WASM 引擎有 2 GB 堆積上限：方盒在 honeycomb 切割完成後 heap 已達約 615 MB，接著品質檢查對整個多面數 shape 執行約 40 次全形狀布林相交量測，把堆積推到 2,048 MB 上限後 OCCT 以裸數字例外中止；Open Shelf 則在切割階段直接耗盡堆積。實測也證明繞過品質檢查後 5x8 方盒可完成建模與 STEP 匯出（僅需約 615 MB），所以方盒的瓶頸可以在品質檢查層根治。

## What Changes

- 方盒 honeycomb 品質檢查分區化：`assertOpenGridStackableBoxGeometry` 及其量測 helper 改為對預先切出的底部／頂部區域子形狀（必要時再切出更小的局部 chip）執行布林量測（檢查項目、探針位置與容差全部不變），把全形狀布林相交從約 40 次降到 2 次，讓大型格數 honeycomb 方盒在 2 GB 限制內完成生成、檢查與匯出。
- CAD kernel 新增共用 helper，把非 `Error` 的原始 OCCT 例外（穿出 WASM 邊界的數字）正規化為帶 `OCCT_EXCEPTION:` 前綴的可診斷 `Error`，品質檢查與 honeycomb 包裝層不再把真實原因掩蓋成模糊的 `INTERFACE_GEOMETRY_INVALID`。
- Open Shelf 在進行任何幾何工作前，以既有純數學格數公式（`openGridOpenShelfHoneycombCellCountFor`，零 OCCT 成本）預估格數；超過引擎記憶體安全上限時立即以新的 typed error `OPENGRID_HONEYCOMB_MEMORY_LIMIT` 快速失敗，Worker 對應新的本地化診斷訊息（含縮小尺寸或關閉省料模式的建議），取代數分鐘運算後的模糊崩潰。
- 回歐測試：新增大型格數 honeycomb 方盒成功生成的 worker 測試（三種 `cornerSeatMode` 各自獨立檔案以隔離引擎堆積）、品質檢查布林操作次數上限行為測試、區域量測與全形狀量測的 parity 測試（含 detachable-seat 紀錄）、Open Shelf 記憶體上限 fail-fast 測試。
- 不新增元件、不變更任何 model ID、route、參數預設值與正常（非省料）模式幾何；現有 OpenGrid 命名全部保留。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `opengrid-stackable-box`: honeycomb 品質檢查需求新增「必須在記憶體受限的 WASM 引擎內對大型格數候選完成檢查」的量測策略要求，以及原始 OCCT 例外必須轉為可診斷錯誤的要求；既有保護特徵、介面與輸出需求全部不變。
- `opengrid-open-shelf`: honeycomb 模式需求新增「格數超過引擎記憶體上限時必須在切割前快速失敗並提供可操作診斷」的要求；既有幾何與輸出需求全部不變。

## Impact

- `src/cad-kernel/components/opengrid-stackable-box/`：`quality-gate.ts`、`quality-interface.ts`、`quality-holes.ts`、`quality-seams.ts`、`quality-metrics.ts`、`shared.ts`（區域子形狀與 chip 的建立與傳遞）。
- `src/cad-kernel/components/opengrid-locating-assembly/consumer.ts`：角座介面檢查改用底部區域 chip，並正規化原始例外。
- `src/cad-kernel/components/opengrid-open-shelf/builder.ts`：生成前的格數上限檢查。
- `src/cad-kernel/geometry-errors.ts`：新增 OCCT 例外正規化 helper。
- `src/workers/cad-worker-runtime.ts`、`src/workers/error-mapping.ts`：新 error code 對應新 diagnostic 與 stage。
- `src/cad-contract/`：`opengrid-open-shelf.ts` 新增上限常數、`errors/index.ts` 新增 code、`units/index.ts` 匯出。
- `src/i18n/catalog.ts`：新增 `diagnostic.honeycombMemoryLimit` 繁中／英文訊息。
- 測試：`tests/worker/opengrid-stackable-box.integration.test.ts`、`tests/worker/opengrid-open-shelf.integration.test.ts`、`tests/worker/opengrid-honeycomb-large-box-*.integration.test.ts`、`tests/unit/opengrid-*.test.ts`、`scripts/test-groups.mjs`。
- 效能：大型格數的總生成時間持平或略降（減少約 38 次全形狀布林）；小型尺寸行為與耗時不受影響。
