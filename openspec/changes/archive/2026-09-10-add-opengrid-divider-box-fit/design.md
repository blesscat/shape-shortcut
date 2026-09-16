## Context

分隔牆現有幾何（`src/cad-kernel/components/opengrid-divider/builder.ts`）由合約層純函式驅動：臂端站點、柱位、bounds 都從 `src/cad-contract/units/opengrid-divider.ts` 推導。既有規則：自由錨點 = 中心接點、柱距 28 mm、臂端固定內縮 2.275 mm、單臂反側 2.5 mm 牆尾、定位柱為固定 Ø5 × 3.8 mm（`makeOpenGridIntegratedSeat`）。盒子底孔格（`opengrid-stackable-box.ts`）為 14 mm 間距、距名目邊緣 7 mm（`bottomHoleGridEdgeOffset: 7`、`bottomHoleGridPitch: halfPitch`），半整數格盒含中心孔列、整數格盒不含。corner-seat pillar（#137）已確立 Ø4.9 本體直徑與 ±1 mm／0.1 步階 offset 的 UI 慣例。

## Goals / Non-Goals

- Goals：盒內對位模式（柱位落孔、貼牆端隙可調）、定位柱長度三選一、柱徑預設 4.9、XY 偏移微調；全部向後相容（自由模式幾何規則不變）。
- Non-Goals：不修改 `opengrid`／`opengrid-stackable-box` 任何行為或底孔格佈局；不做盒內自動組裝/擺放（僅保證置中放置即可對位）；不做 14 mm 柱距密排。

## Decisions

1. **推導全部放在合約層純函式**。新增：`openGridDividerLatticeStationsFor(targetGrids)`（半整數→0 錨、整數→7 錨，站點 = 錨 + 28k）、`openGridDividerBoxFitPegCentersFor(parameters)`（各軸站點 ∩ 牆跨距、接點柱規則、去重）、`openGridDividerAlignmentInfoFor(parameters)`（徽章資料：各軸錨點、中心柱有無、橫向整數格時的中心線指引）。理由：與既有 `openGridDividerPegCentersFor` 等函式同層，UI 徽章與幾何共用單一來源，測試可在無 OpenCascade 下執行。替代方案（在 builder 內推導）會讓 UI 與幾何各自實作而漂移。

2. **盒內對位的牆站點以盒子中心為基準**。各軸跨距 = 方向和 ×28 − 2×(1.275 + endClearance)，以包圍盒中心對稱；接點偏移 (L−R)×14 / (U−D)×14。單臂不生成 2.5 mm 牆尾，跨距公式與直線相同（接點落在尾端站點，不發接點柱）。builder 的 `makeHorizontalWall`／`makeVerticalWall`／`armSpanFor` 改為接受合約層算出的站點對，自由模式餵入現行值（行為不變）。

3. **定位柱改為參數化圓柱 + 既有倒角流程**。`makeOpenGridIntegratedSeat(center, overlap)` 增加顯式 `diameter` 與 `length` 參數（預設值取自 `OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatHeight` 以保持其他呼叫端不變），分隔牆傳入固定 Ø4.9 + `pegDiameterIncrement` 的有效直徑與 `pegLengthMode` 對應長度。柱長綁定：`snap` → `integratedSeatHeight`（3.8）、`thin-shell` → `OPENGRID_STACKABLE_BOX_CONFIGURATION.thinShellFloorThickness`（2）、`stackable` → `OPENGRID_ORGANIZER_BOX_CONFIGURATION.interfaceFloorDatum`（5）；三個值來自設定常數而非寫死字面量，避免未來盒子地板變更時漂移。依賴方向：divider → organizer-box 設定，無循環（organizer-box 不依賴 divider）。

4. **參數以附加欄位擴充，舊快照由預設值合併升級**。`OpenGridDividerParameters` 增加 8 個欄位；`validateOpenGridDividerParameters` 的鍵集檢查同步放寬為「接受缺新欄位的舊 6 鍵快照並以預設值補齊」，與 `wallThickness` 舊例同一機制。新診斷欄位：`alignmentMode`、`targetBoxGridsX`、`targetBoxGridsY`、`endClearance`、`pegLengthMode`、`pegDiameterIncrement`，接入既有 `error-mapping` 與 i18n。

5. **盒內對位的軸向目標拆成 X/Y 兩欄**。長方形盒子兩軸孔列獨立；且橫向軸（垂直於牆）的孔列決定牆中心線能否落孔——橫向為整數格時中心線必須放在 ±7 孔列而非盒子正中央，徽章必須明示。替代方案（單一 `targetBoxGrids` 假設方形盒）會在長方形盒給出錯誤保證。
5a. **盒內對位僅支援單臂與一字型**。L/T/cross 在盒內對位下，兩片牆的柱位格點需求可能互相衝突（例如整數格軸上，橫牆柱位需要 ±7 列、縱牆柱位落在中心線 0），無法以單一剛體擺放同時滿足；在合約層驗證直接拒絕並給诊断，自由模式不受影響。對位欄位（目標格數／端部間隙）在兩種模式下都做範圍驗證，只在盒內對位影響幾何。

6. **檔名延伸既有格式**：`opengrid-divider-l…-r…-u…-d…-t…-h…` 後追加 `-a{alignmentMode}-g{gx}x{gy}-c{endClearance}-p{pegLengthMode}-i{pegDiameterIncrement}`，STEP/STL 同構，保證不同幾何必得不同檔名。

7. **UI**：catalog 元件新增 alignmentMode／pegLengthMode 兩個 enum 控制項與 5 個數值輸入；徽章為唯讀呈現 `openGridDividerAlignmentInfoFor` 結果；軸向方向和 > 目標格數時走既有 `model.invalidate` 路徑並顯示欄位級錯誤。i18n 補 zh/en 對照文案（徽章、整數格警告、三個柱長選項標籤含 mm 深度）。

## Risks / Trade-offs

- [XY 偏移可能讓柱體超出 5 mm 底座 footprint] → 接受：偏移是使用者自行負責的印刷微調（spec 明示不參與對位），柱仍與牆熔接為單一 solid，worker 測試驗證熔接成立。
- [柱徑固定 4.9（增量 0）改變自由模式既有輸出體積] → 既有的體積回歸基線需有意識更新；spec 已將 4.9 訂為固定標稱並以增量微調。
- [盒內對位徽章文案若只講錨點不講橫向中心線限制，使用者會在整數格深度盒中對位失敗] → 徽章資料含橫向指引，i18n 文案審查納入驗收情境。
- [整數格盒中心無孔與使用者「左+右要中心柱」的期望衝突] → 幾何上不可解；徽章在整數格時明示「無中心柱」，spec 記錄此限制。

## Migration Plan

純附加變更：新欄位有預設值，舊持久化快照載入時合併補齊；自由模式幾何規則不變（僅柱徑預設改 4.9 屬有意識行為變更）。回滾 = 還原 commit，無資料遷移。

## Open Questions

（無——柱長三值、柱徑 4.9、偏移範圍均已由使用者確認。）
