## 1. Kernel 共用層

- [x] 1.1 新增 `toGeometryError` helper（非 `Error` 值 → `Error('OCCT_EXCEPTION:<value>')`），含單元測試覆蓋 number/string/undefined 輸入；執行 vitest 對應檔案確認通過
- [x] 1.2 在 `quality-gate.ts`（含 `assertValidShape` 與 detachable-seat 分支）與方盒／Open Shelf 的 honeycomb 包裝層、`cutOpenGridDetachableCornerSeatConsumers` 套用 `toGeometryError`，確認拋出訊息保留 `OCCT_EXCEPTION:` 前綴且 `OPENGRID_` 前綴判斷行為不變

## 2. 方盒品質檢查分區化

- [x] 2.1 在 `assertOpenGridStackableBoxGeometry` 建立底部與頂部量測帶（z 邊界由 `openGridStackableBoxQualityRegionZBounds` 依組態常數推導）與 per-群組 chip（`bottomZone` 快取），生命週期（dispose）完整；以 `OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION` 推導的探針包絡（void 外徑/2 + tolerance、male 總高）斷言 chip zone 與 bottom band 覆蓋所有角座探針
- [x] 2.2 將 `edgeBandVolumes`、`inspectShellThickness`、`inspectBottomSupport`、`inspectGridSeams`、`measureMountingHole*`、`inspectCaptiveSocketInterface` 與 `inspectOpenGridDetachableCornerSeatConsumers` 的布林量測改為接收區域／chip target（optional 參數或回呼，未提供時退回原 shape），並在 `quality-gate.ts` 正確傳遞；確認既有單元測試（直接呼叫 helper）不需修改即通過
- [x] 2.3 新增裁決一致性測試：2x2 honeycomb 與 2x2 solid 的 quality report 欄位在分區（regions/chips）與全形狀兩種路徑一致；box integration 新增 detachable-seat 紀錄 parity；執行 honeycomb 單元測試群確認通過
- [x] 2.4 新增 BooleanOperationReporter 行為測試：品質檢查對全形狀候選的布林操作次數有小常數上限（與格數無關）；測試通過

## 3. Open Shelf 記憶體上限

- [x] 3.1 在 cad-contract 新增 `OPENGRID_OPEN_SHELF_HONEYCOMB_MAX_CELLS = 3000` 常數與註解（記錄 1,465 通過／4,689 失敗的資料點與保守取捨）
- [x] 3.2 `opengrid-open-shelf/builder.ts` 在參數驗證後、任何幾何工作前檢查 `openGridOpenShelfHoneycombCellCountFor`，超限擲出 `OPENGRID_HONEYCOMB_MEMORY_LIMIT`；`honeycombMode=false` 不執行檢查；新增 worker 測試驗證超限 fail-fast、solid 不受限與限內格數低於上限
- [x] 3.3 Worker `cad-worker-runtime.ts`／`error-mapping.ts` 將 `OPENGRID_HONEYCOMB_MEMORY_LIMIT` 映射到新 diagnostic `diagnostic.honeycombMemoryLimit`（stage: building），並在 `src/i18n/catalog.ts` 補繁中／英文訊息（含縮小尺寸或關閉省料模式建議）；以 i18n 完整性測試與 `tsc` 驗證

## 4. 回歸測試與驗證

- [x] 4.1 新增 worker 測試：5x8、`height=20`、`honeycombMode=true` 的方盒在三種 `cornerSeatMode` 下成功生成並通過品質檢查與 STEP 匯出；三種模式各放在獨立測試檔（每檔獨立 process 隔離引擎堆積），各自執行通過
- [x] 4.2 實機驗證：原必失敗案例 5x8 detachable-corner-seat honeycomb 於 worktree 內重建成功（~240–290 秒含 STEP 匯出）；記錄耗時
- [x] 4.3 依 openspec config 的 operations guidance 執行範圍內測試（box/shelf integration + honeycomb 單元群 + 新測試）；確認無不相關退化
- [x] 4.4 執行 `tsc --noEmit` 與 prettier 檢查（觸及檔案），修正所有發現
