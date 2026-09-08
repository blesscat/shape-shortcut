## Context

實測（OpenCascade WASM、單一 process）顯示方盒 5x8 honeycomb 在切割完成時 heap 約 615 MB，隨後 `inspectOpenGridStackableBoxInterface` 以約 40 次全形狀布林相交（`edgeBandVolumes` 各組、`inspectBottomSupport`、`inspectGridSeams` 每縫量測、`measureMountingHole*`、角座介面檢查）把堆積推到 2,048 MB 上限；OCCT 以非 `Error` 的裸數字（例外物件指標）穿出 embind，被 `quality-gate.ts` 一律包裝成 `OPENGRID_STACKABLE_BOX_INTERFACE_GEOMETRY_INVALID`。跳過品質檢查時，同一 shape 可完成建模與 STEP 匯出。Open Shelf 沒有重檢查，但 5x8 的 4,689 格在切割階段即耗盡堆積（`OPENGRID_OPEN_SHELF_HONEYCOMB_INVALID:<數字>`）。既有測試僅涵蓋 2x2 等小尺寸，因此未攔截。

引擎限制：`replicad_single.wasm` 為 wasm32、堆積上限 2 GB 且只增不還；量測探針本身都位於底部（z ≤ ~5.6 mm）或頂部軌條（`upperInnerRimZ` ~ `upperInnerRimZ + topRailHeight`）兩個窄帶。另兩個實測事實影響設計：(1) 單次布林的成本與「大引數」的總面數成正比（wasm 堆積高水位逐次上升，即使探針極小）；(2) 三個 5x8 生成在同一 process 連續執行也會累積超過上限，測試必須每案例獨立 process。

## Goals / Non-Goals

- Goals：大型格數 honeycomb 方盒（如 5x8）可在上限內完成生成 + 品質檢查 + 匯出資格；原始 OCCT 例外可診斷；超大 honeycomb Open Shelf 快速失敗並給可操作訊息；三種 `cornerSeatMode` 皆通過。
- Non-Goals：不改變檢查項目、探針位置、容差與裁決結果；不提升 WASM 堆積上限、不重建 vendored OCCT；不改 UI 警示（已由 #132 的 size-failure warning 涵蓋）；不改圓柱（其檢查以 face 迭代為主，無此瓶頸）。

## Decisions

1. **品質檢查兩層分區化（regions → chips）**：`assertOpenGridStackableBoxGeometry` 先以 2 次全形狀布林切出底部與頂部量測帶（z 邊界由 `openGridStackableBoxQualityRegionZBounds` 依組態常數推導，bottom 上限取 seam 頂、`bottomAssemblyHeight + 0.1`、detachable 座總高 5.3 的最大值 + 0.5 margin；top 下限取最低 rail 探針 - 0.5）。實測發現單靠 band 層仍會耗盡堆積——任何布林的成本與大引數面數成正比，而 bottom band 本身含整個 honeycomb 底板（數千面）。因此第二層：每組空間上相近的探針（每條 grid seam、每個 socket/角座、每側 support band、floor 探針）以 `regions.bottomZone(zone)` 從 band 切出小 chip（以區域 bounds 為 key 快取），個別探針布林只碰 chip 的少數面。face 迭代類檢查（shell 厚度面數、45° 面數等）維持全形狀；探針完全落在 chip 內 ⇒ 體積結果與全形狀版本一致（parity 測試驗證，含 detachable-seat 紀錄）。helper 以 optional 參數／回呼接收 target，未提供時退回原 shape。
   - 實測記錄：5x8 在「僅兩層 band」版本仍於堆積上限 abort；加入 chips 後同一案例於 ~240 秒完成檢查與 STEP 匯出，三種 seat 模式皆通過。
   - 替代案：`simplify()`（UnifySameDomain）減面——效果不確定、增加額外峰值；略過大候選檢查——違反既有品質保護規格；提高 wasm 上限至 4 GB——需重建 vendored 二進位且只是把懸崖後移。皆不採。
2. **OCCT 例外正規化**：kernel 共用層新增 `toGeometryError(thrown)`——非 `Error` 值轉為 `Error('OCCT_EXCEPTION:<value>')`；`quality-gate.ts` 全部包裝點（含 seat 分支與 `assertValidShape`）、兩個 honeycomb 包裝層、`cutOpenGridDetachableCornerSeatConsumers` 先正規化再判斷，真實原因進入錯誤訊息與測試可斷言的範圍。UI 仍走既有 generic diagnostic（不外洩內部文字，符合 localized-cad-diagnostics 的 fallback 要求）。
3. **Open Shelf 格數上限 fail-fast**：`buildOpenGridOpenShelf` 在參數驗證後、任何幾何工作前呼叫既有純數學 `openGridOpenShelfHoneycombCellCountFor`，超過新常數 `OPENGRID_OPEN_SHELF_HONEYCOMB_MAX_CELLS`（3,000）時擲出 `OPENGRID_HONEYCOMB_MEMORY_LIMIT`。已知資料點：4x3=1,465 格通過、5x8=4,689 格失敗；上限取保守值（寧可擋掉少數可能成功的尺寸，換取永不進入數分鐘後崩潰的路徑），訊息中給縮小尺寸／關閉省料模式的建議。Worker 將新 code 映射到新 diagnostic `diagnostic.honeycombMemoryLimit`（stage: building），i18n 補繁中／英文。
4. **測試策略**：(a) 以 prototype 計數器統計品質檢查對全形狀候選的布林次數並設小常數上限（小尺寸、快速、防退化）；(b) 5x8 honeycomb 方盒成功生成測試（慢，長 timeout），三種 seat 模式各放在獨立測試檔，靠 vitest 每檔獨立 process 隔離引擎堆積——同一 process 連續三個 5x8 生成會累積超過上限；(c) 區域 vs 全形狀 parity：2x2 honeycomb 與 solid 的 quality report 逐欄位一致，加上 box integration 內 detachable-seat 紀錄 parity，以及 seat 探針（void 包絡半徑、male 總高）必須落在 chip zone／bottom band 內的包含性斷言（探針值由 `OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION` 推導）；(d) shelf 上限 fail-fast 的 worker 測試（超限快速拒絕 + solid 不受限制 + 限內格數低於上限）；(e) i18n key 由既有 catalog 型別與完整性測試保證。

## Risks / Trade-offs

- [探針超出 chip 邊界 → 裁決改變] → 所有 chip zone 由探針集合的包絡 + margin 推導；seat zone 半徑以最寬的 void 包絡（holder 外徑/2 + tolerance）計算；包含性由單元斷言鎖定，並以 parity 測試比對改動前後一致。
- [3,000 格上限擋到原本會成功的尺寸] → 記錄為已知取捨；上限常數集中定義，後續有更多資料點可單獨調整。
- [OCCT_EXCEPTION 前綴進到使用者訊息] → worker 對應仍回 generic/localized diagnostic，前綴僅存在於 code/message 內部鏈路。
- [5x8 以上（如 8x8=2,170 格）行為未經完整驗證] → 建模+匯出記憶體隨格數線性成長，預期可過但不在本變更保證範圍；列為 residual risk。
- [thinShell + honeycomb 組合會建立未使用的頂部區域] → 僅多 2 次小成本布林，無裁決影響。

## Migration Plan

單一 PR、無資料遷移。部署後大型格數 honeycomb 從「必然失敗」變為「成功（方盒）」或「快速、可理解的失敗（超大 shelf）」；回滾即 revert。

## Open Questions

（無——slab/chip 邊界與上限常數已依組態常數與實測資料點確定。）
