## Why

分隔牆的定位柱目前以自身中心接點為錨點（28 mm 格點），但 OpenGrid 盒子底部孔格是「14 mm 間距、距名目邊緣 7 mm 起算」的另一套格點：整數格盒（如 5 格）孔位在 ±7, ±21…、半整數格盒（如 4.5 格）孔位在 0, ±14, ±28…。兩套格點除了半整數格盒的中心列外沒有交集，使用者把分隔牆放進盒子後定位柱插不進孔位。此外定位柱長度固定 3.8 mm（無法對應薄殼 2 mm／堆疊 5 mm 盒底）、直徑固定 5 mm（無列印配合餘裕），也沒有微調手段。

## What Changes

- 新增「盒內對位」對位模式（現有自由模式行為完全不變，且僅支援單臂與一字型）：使用者指定目標盒子格數 G（0.5 步階），柱位自動以「最靠近盒子中心的那排孔」為錨點、每 28 mm 一支：
  - 半整數格 G → 錨點為中心孔列（柱位 0, ±28, ±56…）；盒中心有孔列，當接點落在格點上時中心柱即落在盒中心孔
  - 整數格 G → 錨點為 ±7 孔列（柱位 ±7, ±35, ±63…），中心無孔、無中心柱，UI 明示此限制
- 盒內對位模式下臂端內縮由固定 2.275 mm 改為 1.275 mm + 可調端部間隙（預設 0.15 mm，貼牆），並新增單臂貼牆行為：移除接點反側 2.5 mm 牆尾，尾端與臂端同樣內縮
- 定位柱向下長度改為三選一：直接插入 Snap 3.8 mm（現狀）／薄殼盒底 2 mm／堆疊盒底 5 mm（不穿到底部 Snap，只需對應盒底厚度）
- 定位柱直徑固定為 4.9 mm（對齊 corner-seat pillar 的 4.9 慣例），對 Ø5.05 孔保留 0.15 mm 列印餘隙
- 新增定位柱 XY 直徑增量微調（±1 mm、0.1 步階、預設 0，對齊 pillar 的 xyDiameterIncrement 慣例；調整柱體尺寸而非位置，非對位工具）
- UI：對位模式 radio、目標盒格數輸入、唯讀對位徽章（錨點與中心柱有無）、整數格與格數加總不一致的警告

## Capabilities

### New Capabilities

（無——本變更全部落在既有 capability 內）

### Modified Capabilities

- `opengrid-divider-generator`：參數契約新增對位模式／目標盒格數／柱長模式／柱徑／XY 偏移；定位柱配置規則新增盒內對位格點推導；單臂牆尾與臂端內縮在盒內對位下改變；bounds 與匯出反映可變柱長；相容性條款新增盒內對位對盒底孔格的明確組裝合約；workspace 新增對應控制項與警告
- `component-parameter-persistence`：`opengrid-divider` 持久化快照新增上述欄位，舊快照缺欄位時以新參數預設值解讀（沿用 `wallThickness` 舊例）

## Impact

- `src/cad-contract/units/opengrid-divider.ts`：參數型別、驗證、柱位/內縮/bounds 推導函式
- `src/cad-kernel/components/opengrid-divider/builder.ts`：斷面輪廓、柱體生成與熔接
- `src/cad-kernel/components/opengrid-divider/quality.ts`：品質檢查改用參數化柱計畫
- `src/cad-kernel/components/opengrid-locating-assembly/integrated.ts`：定位柱加入顯式直徑／長度參數（既有呼叫端走設定預設值，行為不變）
- `src/cad-contract/units/index.ts`：分隔牆新函式與型別的重新匯出
- `src/features/cad/model-catalog/components/opengrid-divider.ts`：控制項定義（mode radio、徽章、警告）
- `src/components/cad/workspace/` 與 `src/i18n/catalog.ts`：面板行為與雙語文案
- `tests/unit/opengrid-divider*.test.ts`、`tests/worker/opengrid-divider*.test.ts`：新參數與盒內對位幾何
- 命名規則：無新增 component；現有 `modelId=opengrid-divider` 及 `opengrid`、`opengrid-stackable-box` 行為與 ID 全部保留不變
