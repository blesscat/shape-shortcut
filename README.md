# shape-shortcut

瀏覽器端 CAD Prototype：使用者調整 CAD component 的參數，以即時 3D 預覽查看結果，並從精確的 B-Rep 下載 STEP、STL，或受限的 OpenGrid Wall Cover 雙色 3MF 檔案。

> 目前專案仍在 Prototype 的設計與實作階段。本 README 是人類與 AI 了解專案結構的入口；詳細設計以 OpenSpec 的 `design.md` 為準。

## 多語系與搜尋 metadata

公開頁面使用 `/zh-Hant/` 與 `/en/` 前綴；未帶 locale 的舊網址會導向繁體中文版本。production 預設 origin 設定在 `.env.production` 的 `PUBLIC_SITE_URL`（目前為 `https://shape-shortcut.blesscat.dev`），其他部署環境可用同名環境變數覆寫，讓 canonical、`hreflang` 與 `/sitemap.xml` 使用正確網址；本機開發與測試未設定時才會使用 `http://localhost:3456` fallback。Cloudflare Pages 會讀取 `public/_redirects`，以同 origin 的相對路徑發出保留 query string 的 308 redirect；其他 static hosting 需要用等效的 redirect 設定。靜態 fallback 仍會使用 `noindex`、canonical、meta refresh 與 JavaScript 導向，其中 JavaScript 會保留 query string，靜態 meta refresh 與無 JavaScript anchor 僅能導向穩定路徑。

## 贊助平台設定

網站導覽列的「支持這個專案」按鈕會開啟贊助選項，顯示所有已設定的外部平台；選項不依語系切換。production 目前使用：

```env
PUBLIC_PORTALY_SUPPORT_URL=https://portaly.cc/blesscat/support
PUBLIC_KOFI_SUPPORT_URL=https://ko-fi.com/blesscat
```

這些是公開的 build-time 設定，不是 API secret。若要在其他環境啟用或替換平台，請在 Astro build 前設定同名環境變數；修改後必須重新 build 與部署。每個外部平台都應設定為單筆 donation，避免啟用 membership 或 recurring payment；金額選項由平台頁面負責。Shape Shortcut 不在站內收集付款資料、發票資料或付款狀態。

部署後請從首頁、文件頁與任一 CAD 頁確認兩個贊助選項可見、會在新分頁開啟對應平台，且原本的 CAD workspace 不會被關閉。

## 主要架構

Astro 負責網站 shell 與路由，Svelte workspace 負責瀏覽器端 UI，專用 CAD Worker 負責所有 CAD kernel 工作：

```text
Astro site shell（layouts/ + pages/）
└─ Svelte workspace（components/cad/，主執行緒）
      ├─ 參數表單與 state machine
      ├─ component-local control panels
      ├─ Worker client / runtime validation
      ├─ Threlte + Three.js viewport
      └─ download adapter
             ⇅ versioned messages + transferable buffers
         CAD Worker（workers/ + cad-kernel/）
         ├─ OpenCascade WASM / replicad initialization
         ├─ component registry
         ├─ box B-Rep builder
         ├─ modular-grid-base builder + STEP template
         ├─ hsw-cell builder + STEP template
         ├─ hexagonal-column builder + STEP template
         ├─ OpenGrid stackable-box / stackable-cylinder / organizer-box builders
         ├─ OpenGrid Wall Cover supplied STEP builder + named body/text parts
         ├─ preview mesh generation
         └─ STEP / binary STL / Wall Cover 3MF export
```

主執行緒只持有參數、UI 狀態、已驗證的 mesh、model revision metadata 與下載 bytes。OpenCascade、replicad、B-Rep 建模、mesh 產生與 STEP/STL/3MF writer 全部屬於同一個 CAD Worker，不能在主執行緒執行。

## 建議來源目錄

```text
src/
├─ pages/
├─ layouts/
├─ styles/
├─ components/cad/
│  ├─ component-panels/
│  └─ workspace/runtime/
├─ features/cad/
│  ├─ model-catalog/
│  │  └─ components/（每個 component 的 definition）
│  ├─ parameters/
│  ├─ state/
│  ├─ viewport/
│  ├─ worker-client/
│  └─ download/
├─ cad-contract/
├─ cad-kernel/
└─ workers/
```

資料夾名稱可以隨實作調整，但責任邊界必須維持：

- `pages/` 只提供頁面內容、fallback 與 Svelte 掛載點；共用 Astro shell、導覽與 head metadata 由 `layouts/` 負責。
- `layouts/` 負責共用 Astro shell、導覽與 head metadata。
- `styles/` 是全域樣式入口，只放 Tailwind import、`@theme` tokens、reset 與必要的 base rules，不放頁面或功能元件 selector。
- 站台外觀跟隨兩套 Stitch 設計系統：深色 = Minimalist Futurism／Cyber-CAD Industrial（`#0b1326` 底、`#38bdf8` neon、青色網格與 glow），淺色 = Kinetic Utility v2（`#f8f9fa` 底、白卡 1px 邊框、`#3b82f6` primary）。所有站台色彩 token 以 `styles/global.css` 為唯一定義點；`styles/starwind.css` 只保留 Starwind 專屬語意並以 `var()` 引用 global token，不得重複定義同名 `--color-*`。
- 頁面與元件預設使用 Tailwind utility classes；utility class 必須以完整、可靜態掃描的字串呈現，不拼接部分 class token。
- `features/cad/viewport/` 與其他功能資料夾預設使用 Tailwind；只有 utility 不易表達的複雜 selector 或 descendant rule 才在實際擁有該樣式的資料夾放 scoped SCSS。
- `components/cad/` 組裝 Svelte workspace，負責 UI controller、輸入驗證、Worker lifecycle、控制面板與 viewport，不直接 import CAD kernel。
- `components/cad/component-panels/` 依 component 分開 Svelte 調整頁面；共用 workspace 只負責目前 component 的狀態與匯出。
- `components/cad/workspace/runtime/` 依生成排程、Worker event 與 STEP/STL export 拆分主執行緒 runtime。
- `features/cad/model-catalog/` 的 `index.ts` 只做 registry/lookup；每個 component 的 id、參數 schema、預設值與 export metadata 放在自己的 definition 檔案，不持有 UI 或 Worker lifecycle。
- `features/cad/parameters/`、`state/`、`viewport/`、`worker-client/` 與 `download/` 分別處理輸入、狀態、預覽、Worker 通訊與瀏覽器下載。
- `cad-contract/` 放跨主執行緒共用的 messages、errors 與 units；不得依賴 DOM、UI framework、Three.js、replicad 或 OpenCascade。
- `cad-kernel/` 放 WASM、B-Rep、mesh、STEP 與 resource lifetime 邏輯，只能由 `workers/` 使用。
- `cad-kernel/components/<component>/` 同時放 component-local builder 與其 canonical CAD asset；例如 `modular-grid-base/builder.ts` 與 `board-cell-template.step`，以及獨立的 `hsw-cell/builder.ts` 與 `hsw-cell.step`。
- `workers/` 是 CAD Worker 的執行入口，只能組合 `cad-contract/` 與 `cad-kernel/`。
- `features/cad/viewport/` 只接受已驗證的 mesh snapshot，不執行 B-Rep 建模或 STEP 匯出。
- `features/cad/download/` 只處理成功的 bytes 與 metadata，不重新建模。

依賴方向應維持為：

```text
pages/
  → components/cad/
    → features/cad/ + cad-contract/
      ⇅ versioned Worker messages
    → workers/
      → cad-kernel/
```

這樣分層是為了隔離 UI、跨執行緒 contract 與 CAD 原生資源，避免主執行緒被 WASM/CAD 運算阻塞，也讓未來增加模型時不必把 B-Rep 邏輯塞進 UI。

## Prototype 範圍

- 內建 component：X/Y 置中於世界原點、底面位於 Z=0 的 `box`、`modular-grid-base`、`hsw-cell`、`hexagonal-column`、OpenGrid stackable models 與 `opengrid-organizer-box`。
- `box` 參數：`width`、`depth`、`height`，單位為 mm。
- `modular-grid-base` 參數：`rows`、`columns` 格數 slider，範圍為 1–20 格；每格為 20 × 20 mm，高度固定 5 mm，最大寬/深為 400 mm。預切除 `cell-template.step` 會複製、平移、融合後，只對整體外側四角套用 R2.5 mm 圓角。
- `hsw-cell` 參數：`rows`、`columns` 格數 slider，範圍為 1–20 格；使用固定約 27.25 × 23.60 × 8 mm 的平頂六角 canonical `hsw-cell.step`，columns 沿 X 方向交錯排列成蜂巢，整體不套用額外圓角。路由為 `/cad/hsw-cell`，輸出檔名為 `hsw-cell-{columns}x{rows}.step` 與 `hsw-cell-{columns}x{rows}.stl`。
- `hexagonal-column` 參數：`height` 文字輸入=1–500 mm、slider=1–200 mm、`count`、`gap` 與 `orientation`，路由為 `/cad/hexagonal-column`；它保持獨立 component contract，列平面 footprint 安全上限維持 500 mm。
- OpenGrid stackable-box 與 stackable-cylinder 都以 `detachable-corner-seat`（`鎖定角座`）為預設，並提供 `none`（`無角座`）、`detachable-corner-seat`（`鎖定角座`）、`integrated`（`內建角座`）三種互斥座模式；舊的 `hole` 值會正規化為 `detachable-corner-seat`。`integrated` 會在既有定位位置融合 Ø5 mm × 3.8 mm、由 Z=-3.8 mm 延伸至 Z=0 的實體圓座，底部採 0.2 mm 導角；兩者的 STEP/STL 檔名都包含唯一的 `-seats-none`、`-seats-detachable-corner-seat` 或 `-seats-integrated` 後綴。
- OpenGrid Open Shelf 固定使用四個 OpenGrid 角落定位柱，沿用同一個 Ø5 mm × 3.8 mm 內建座契約與 0.2 mm 底部導角，柱體仍直接融合到底板且不提供座模式選擇。
- OpenGrid Divider 的底部定位柱也沿用同一個 Ø5 mm × 3.8 mm 內建座契約與 0.2 mm 底部導角；分隔牆本體的其他底部支撐圓角維持原設定。
- `opengrid-organizer-box` 沿用 OpenGrid 方盒外觀，頂部為實體盲孔，可選圓形或固定方向的 3–6 邊正多邊形；多邊形直徑定義為內切圓直徑。X/Y 孔數、孔外圍對外圍間距、孔深與底部加厚（預設 1 mm）會共同決定盒體尺寸；孔距可連動或分開設定。面板最上方把介面拆成兩組獨立 radio：`角座模式` 可選 `無角座`、`鎖定角座`、`內建角座`，`盒體模式` 可選 `普通模式` 或 `堆疊模式`，共六種可組合狀態。普通模式維持既有平頂盒體；堆疊模式同時建立方盒標準的底部堆疊結構與頂部階梯滑軌，並顯示 `堆疊淨空（Z）`。Z 直接代表孔洞開口平面到上一層盒底基準面的距離，採 0.5 mm 級距、最小與預設 3.5 mm；標準滑軌的幾何下限為 2.75 mm，因此 3.5 mm 是不改動堆疊剖面的第一個合法輸入。`內建角座` 會融合四個 Ø5 mm × 3.8 mm 實體腳座（Z=-3.8 mm 至 Z=0 mm），底部採 0.2 mm 導角；`鎖定角座` 則把 Ø7 × 1.75 mm、有擋片的 female socket 直接形成為盒體的一部分，不會輸出另一個 holder。由盒底觀看，左上、右上、右下、左下 socket 固定採 0°、90°、180°、270° 的 B 方向。
- `鎖定角座` 由 `opengrid-pillar` 的 `{ mode: 'detachable-corner-seat' }` 另行輸出，預設顯示在第一個模式。幾何固定為 5.3 mm 高：定位段高 3.8 mm，底面 Ø4.6 並以 0.2 mm 倒角恢復 Ø5，頂部保留 0.15 mm 耐磨平面；v8 角座柱本身已包含置中的 3 × 0.5 mm、深 0.4 mm 可讀凹線，角座的對應線槽則依同一規格由 Worker 繪製。此模式不接受長度或 XY 增量。這項介面目前只在 Organizer Box 試作；四角都必須能手壓到底、提起盒體時不脫落、刻意手拉時仍可拆下，三項實體列印驗收全部通過後才可導入其他模型。
- 預覽：由 Worker 產生的 B-Rep mesh。
- `opengrid-wall-cover` 是只隸屬於 Wall 的固定元件，使用 component-local 的 `opengrid-snap-cover.step` 產生 body 與同平面的 `SNAP` 文字 part；資產維持 Snap Lite／Standard／full 的名義外框。
- OpenGrid Snap 維持單色模型，不再提供雙色文字控制或 3MF capability；舊快照中的 `topText=SNAP` 會正規化成 `none`。
- 匯出：由 Worker 目前 committed B-Rep 產生 STEP 或 binary STL；`opengrid-wall-cover` 另提供固定檔名 `opengrid-wall-cover.3mf`，body 與 text 預設分別使用耗材槽 1、2。
- 不包含任意模型匯入、任意文字／字型 3MF、slicer profile、G-code、儲存、帳號、後端、多人協作或自動啟動 Bambu Studio。

## 使用 Prototype

先在首頁選擇模型，再進入對應的 CAD workspace。CAD workspace 只調整目前 route 的 component；要切換模型必須返回模型選擇頁。各目標高度／長度欄位的文字輸入上限為 500 mm、slider 上限為 200 mm；OpenGrid 堆疊盒的 X/Y footprint 與其他平面 workspace 安全上限維持 500 mm，外徑欄位維持 20–300 mm。OpenGrid 堆疊盒的 `x`、`y` 支援 `0.5` 格步進，外部 footprint 為 `x × 28 − 0.15 mm`、`y × 28 − 0.15 mm`；`height` 是盒內淨高，外部 Z 高度為 `height + 5 + 6.45 mm`。固定底部總高 5 mm（內層地板 1.2 mm）、主側壁 1.2 mm，盒頂階梯滑軌依序為 1.75／45°、垂直 1.2、0.8／45°、垂直 1.8、2／45°；底部依序為 0.8／45°、垂直 1.8、1.2／45° 導入支撐地板。每條內部 28 mm 格線交界採逐段收窄、斜面收進地板的可列印避讓，止於底板下表面並保留連續內部地板；0.20 mm 名義滑動間隙讓相同盒體可以堆疊並滑動。四角 Snap 固定孔為距名義邊 7 mm 的兩段階梯孔：外側 Ø5.05 mm 深 3 mm，內側 Ø7.05 mm 深 2 mm；座模式則由 `無角座`、`角座孔`、`內建角座` 三選一，Grid Box 的 full-bottom-hole-grid 仍獨立。輸入停止 500 ms 後才會送出建模；每個新 snapshot 會先使舊 generation 失效，連續 slider 變更只會對最後合法值送出建模；無效外部 snapshot 不會送出 `model.generate` 或匯出 request。

堆疊方盒選擇「盒底：堆疊」與「無角座」時，底腳每格四角會避讓 openGrid 格線交點，可直接放入 Lite／Full 底板並垂直拿起，不含卡扣。底腳名義插入深度為 3.725 mm，角部預留 0.2 mm 側向間隙，保留原本盒對盒的滑動與堆疊。帶半格的盒底需對齊底板的半格延伸；不能把半格尺寸當作任意平移皆可配合。裝上可拆角座或使用內建角座時，突出腳座所需的底板背面空間須另外確認。上述為 CAD 配合驗證，列印鬆緊度仍需實際試印確認。

輸入高度直接控制盒內淨高；5 mm 底部與 6.45 mm 上部堆疊介面固定加在外部高度，外部 footprint、參數快照與匯出檔名維持不變。

建模期間可以保留上一個成功 revision 的預覽，但它會標示為 stale，且 STEP/STL/3MF 下載會停用；只有新的 B-Rep candidate 完成 commit 並進入「模型已就緒」後，預覽與匯出才會重新同步。WASM 載入、建模、mesh 與匯出都有狀態提示；Worker 或操作失敗時可修改參數或按「重試」，Worker recovery 最多自動重建一次。

## STEP template 與格式選擇

目前 3D component 的 canonical asset 使用 STEP，而不是 STL 或 DXF：STEP 保留可供 clone、fuse、fillet 與 STEP export 使用的精確 B-Rep；STL 只有三角網格，DXF 則是 2D profile，兩者都不適合這個 3D boolean pipeline。

`board-cell-template.step` 是已完成中央貫穿切除的 `modular-grid-base` component-local 預處理檔案；`hsw-cell.step` 與 `hexagonal.step` 則分別是各自 component 的 canonical asset。鎖定角座的 supplied source、3.8 mm male target 與 retaining-tab holder STEP 放在共享的 `opengrid-locating-assembly/assets/`，Worker 每個 epoch 各載入一次並由 consumer clone；Organizer Box 會把 holder 頂部延伸 0.25 mm，再以 `Ø7 × 1.75 mm envelope − extended holder` 反推出 socket void，讓擋片材料留在盒體。所有 canonical asset 都不依賴 Downloads 路徑，也不會在每次生成重複 import。

## STEP 匯出

「下載 STEP」只會對目前成功 commit 的 `modelRevision` 發出 request。Worker 先 pin 該 revision，再依 replicad 官方的 B-Rep `blobSTEP()` export path 產生 bytes；STEP 不由 viewport screenshot 或離散 mesh 反推。主執行緒驗證 revision、format、MIME 與非空 bytes 後，以 `model/step` 觸發一次下載，檔名為：

```text
box-{width}x{depth}x{height}.step
modular-grid-base-{columns}x{rows}.step
hsw-cell-{columns}x{rows}.step
hexagonal-column-{height}x{count}-g{gap}-{standing|lying}.step
opengrid-stackable-box-{x}x{y}-h{height}-seats-{none|hole|integrated}.step
opengrid-stackable-cylinder-d{diameter}-h{height}-seats-{none|hole|integrated}.step
pillar-{length}-positioning[-xy{offset}].step
pillar-5.3-detachable-corner-seat.step
opengrid-organizer-box-{countX}x{countY}-{shape}-sm-{linked|independent}-d{diameter}-sx{spacingX}-sy{spacingY}-h{depth}-b{bottomThickness}-seats-{none|detachable-corner-seat|integrated}-body-{normal|stackable}[-z{stackingClearanceHeight}].step
```

這個 Prototype 不提供任意 STEP 的產品匯入或 round-trip parser；目前的 `board-cell-template.step` 是 repository 內受控的 canonical asset，並由 CAD kernel integration tests 驗證其 single-solid、尺寸與幾何條件。

## STL 匯出與 Bambu Studio

「下載 STL」會對目前成功 commit 的 `modelRevision` 發出 `export.stl` request。Worker pin 該 revision，使用 B-Rep 的 `Shape3D.blobSTL({ binary: true, tolerance, angularTolerance })` 產生 binary STL；它不會從 viewport mesh 反推，也不會在主執行緒執行 CAD writer。主執行緒會驗證 revision、Worker epoch、MIME、檔名、三角形數量與 binary STL 總長度後，以 `model/stl` 觸發一次下載。

STL 使用專案的 mm 座標 convention，檔名為：

```text
box-{width}x{depth}x{height}.stl
modular-grid-base-{columns}x{rows}.stl
hsw-cell-{columns}x{rows}.stl
hexagonal-column-{height}x{count}-g{gap}-{standing|lying}.stl
opengrid-stackable-box-{x}x{y}-h{height}-seats-{none|hole|integrated}.stl
opengrid-stackable-cylinder-d{diameter}-h{height}-seats-{none|hole|integrated}.stl
pillar-{length}-positioning[-xy{offset}].stl
pillar-5.3-detachable-corner-seat.stl
opengrid-organizer-box-{countX}x{countY}-{shape}-sm-{linked|independent}-d{diameter}-sx{spacingX}-sy{spacingY}-h{depth}-b{bottomThickness}-seats-{none|detachable-corner-seat|integrated}-body-{normal|stackable}[-z{stackingClearanceHeight}].stl
```

下載完成後，使用者可在 Bambu Studio 透過一般的本機檔案開啟/匯入流程載入 STL。瀏覽器不會直接啟動或控制 Bambu Studio，也不會產生 G-code 或印表機設定檔。初始 STL tessellation 設定為 `tolerance = 0.001 mm`、`angularTolerance = 0.1`；這些設定與 viewport preview mesh 分開管理。

## OpenGrid Wall Cover 雙色 3MF POC

`opengrid-wall-cover` 是 Wall-only、無可調參數的固定元件；目前使用 component-local 的 `opengrid-snap-cover.step`，資產為九個 solid 且維持 Snap Lite／Standard／full footprint、offset `0` 的名義外框。一般 `opengrid-snap` 不會啟用這項雙色功能。

這個 POC 不是浮雕，也不是把文字抬高：文字是獨立的第二個 3MF part，從 Z=`3.0 mm` 延伸到與 Lite 本體相同的頂面 Z=`3.4 mm`，因此列印後是同一平面的雙色嵌件。body 會先保留文字 cavity，3MF 再以兩個 material entry、同一個 parent object 下的兩個 component mesh，以及 Bambu Studio model settings 匯出 body 與 text，避免 slicer 把兩者折疊成單一 mesh，並預設 body 使用耗材槽 1、text 使用耗材槽 2。對單噴嘴加 AMS 的印表機，這代表不同耗材槽，不是兩個物理噴嘴。為了讓以原點置中的幾何落在 A1 平台內，3MF 的 parent build item 會以 `+128 mm, +128 mm` 平移到平台中心；body/text 彼此的相對座標不變。

3MF 檔案名固定為 `opengrid-wall-cover.3mf`。目前沒有任意文字輸入、font parser、任意顏色選擇、slicer profile、printer preset、G-code 或自動控制 Bambu Studio；這些都不屬於本次驗證範圍。

代表性量測（box、2×2 與 5×5 grid）都產生有效 binary STL：box 為 684 B/12 triangles，2×2 為 459,084 B/9,180 triangles，5×5 為 2,697,684 B/53,952 triangles；輸出長度皆符合 `84 + triangleCount × 50`。

## 本機啟動與驗收

前置條件是 Node.js、pnpm，以及支援 WebAssembly、Web Worker、WebGL 的桌面版 Chrome 或 Firefox。這個 Prototype 只驗證本機 Astro dev server 或 local build preview，不承諾正式 hosting、CDN、base path 或 production cache 設定。

```bash
pnpm install
pnpm dev
```

開啟 <http://localhost:3456/>，先選擇模型。建置與 preview：

```bash
pnpm build
pnpm preview
```

品質檢查：

```bash
pnpm check
pnpm test
pnpm test:e2e
```

贊助選項的 E2E fallback 測試依 build-time 環境變數執行：CI 應分別用「Portaly 與 Ko-fi 都設定」、「只設定其中一個」及「兩者皆未設定」三組環境執行 `tests/e2e/home.spec.ts`。測試會驗證雙平台選擇、單平台 fallback，以及沒有有效平台時不顯示贊助入口。

E2E 預設會在 Chromium 完成 WebGL CAD/STEP gate，並在 Firefox headless 執行 route/fallback smoke；要在本機以虛擬桌面補跑 Firefox 的完整 WebGL gate，可使用：

```bash
pnpm test:e2e:firefox
```

`test:e2e:firefox` 需要 Linux 的 Xvfb；沒有 Xvfb 時可用等價的 headed Firefox + 虛擬桌面指令執行。

B-Rep 效能 benchmark 是 opt-in，HSW benchmark 會使用 canonical STEP、production preview 設定與 1×1、2×2、5×5、10×10、20×20 fixture，先分開記錄 cold asset import，再 warm up 並量測至少五次，輸出 asset loading、assembly/fuse、mesh、total 的 median/P95 與環境資訊：

```bash
RUN_CAD_BENCHMARK=1 pnpm exec vitest run tests/worker/hsw-cell-benchmark.test.ts
```

可用 `RUN_CAD_BENCHMARK_FIXTURES=20x20` 與 `RUN_CAD_BENCHMARK_STRATEGIES=column,sequential` 限定範圍。optimized path 會先融合一條 canonical column，再 clone/translate 其餘 columns，並以 bounded balanced column fuse 組裝；這仍是 CPU/OpenCascade B-Rep，WebGL 只負責 viewport rendering。warm-up 會驗證 STEP/STL 的非空與 binary STL 結構，generation total 不把重複 export writer 成本算入。若 sequential 大型 baseline 在同一 native epoch 失敗，benchmark 會保留每個嘗試的 sample/phase/error，並以 operation-timeout safety gate 驗證 optimized 路徑，同時在報告中標示無法進行相對 20% 比較。

目前 model/mesh 與 STEP/STL operation timeout 為 120 秒；engine initialization timeout 維持 60 秒。timeout 只是讓大型模型有較長的完成窗口，不代表 B-Rep 效能 gate 可以略過。

WASM asset 位於 `public/replicad_single.wasm`，Worker 由目前 Astro 應用的 `/replicad_single.wasm` URL 載入。若頁面顯示 WASM 載入失敗，先確認 dev server 正在執行且該 asset 可由瀏覽器取得；若顯示不支援 WebGL，請改用支援 WebGL 的桌面瀏覽器或啟用圖形加速。輸入錯誤、Worker timeout 與 stale 預覽則依頁面狀態提示修正參數或重試。

Prototype 驗收使用的自動化瀏覽器 binary 為 Chromium `151.0.7922.34` 與 Firefox `153.0`；正式版本驗收時仍需記錄實際桌面版 Chrome/Firefox stable 版本。

## 未來模型 catalog 的擴充

目前 catalog 有 `box`、`modular-grid-base`、`hsw-cell`、`hexagonal-column`、`opengrid`、OpenGrid stackable models、`opengrid-organizer-box` 與 Wall-only `opengrid-wall-cover`。新增 component 時，在 `features/cad/model-catalog/components/` 建立獨立 `ModelDefinition`，在 `components/cad/component-panels/<component>/` 建立專屬調整頁面，再在 Worker-only 的 `cad-kernel/components/<component>/` 放 builder 與資產，最後由 catalog/kernel registry 掛入。UI 只消費 schema，不應把 B-Rep 邏輯放進 `CadWorkspace`。新模型必須另開 OpenSpec change，明確驗收參數單位、bounds、mesh、revision lifetime、STEP/STL filename 與錯誤流程，並維持既有 versioned Worker contract 與主執行緒/CAD Worker 邊界。

## OpenSpec 文件

- [變更提案](openspec/changes/archive/2026-08-02-shape-shortcut/proposal.md)：目標、範圍與非目標。
- [詳細設計](openspec/changes/archive/2026-08-02-shape-shortcut/design.md)：架構、Worker contract、revision lifetime 與測試策略。
- [能力規格](openspec/specs/cad-workspace/spec.md)：可觀察行為與驗收情境。
- [實作任務](openspec/changes/archive/2026-08-02-shape-shortcut/tasks.md)：實作順序與 quality gates。
