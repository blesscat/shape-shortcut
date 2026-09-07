## Purpose

本文件定義瀏覽器端 CAD 雛形的可觀察行為、驗收情境與執行邊界，讓使用者能以明確規格驗證多模型建模、3D 預覽及 STEP/STL 匯出流程。

## 目的與範圍

本文件定義瀏覽器端 CAD 雛形的可觀察行為與驗收情境。

Prototype 目前包含由 model catalog 管理的多個獨立 CAD component、各 component
自己的有效參數與 browser-local 參數保存、瀏覽器內的 B-Rep 建模與 3D 預覽，
以及從目前成功模型下載 STL（STEP 下載僅於本地 dev build 提供）；catalog、route 與 component-specific
參數契約由各自 capability 規格負責。

未註冊的模型、3MF、G-code、任意 CAD 匯入、生成檔案/模型的專案儲存、auth、collaboration 與後端 CAD 服務不屬於本 Prototype；目前可用模型以 model catalog 與其 capability specs 為準，各 component 的 STL、參數保存與模型選擇行為由其 capability 規格定義。

本文中的「必須」為規範性要求；「可以」表示允許但非必要。

## 名詞

- **方塊模型**：`box` 的內建單一 solid 模型。
- **參數**：方塊的 width、depth、height，皆以 mm 解讀。
- **generation**：一次參數 snapshot 的單調遞增識別；合法與非法 snapshot 都會取得 generation，只有合法 snapshot 才能送出 model.generate。
- **candidate**：Worker 建立但尚未 commit 的候選 B-Rep。
- **model revision**：已 commit 且可預覽/匯出的 B-Rep 識別。
- **mesh**：由 B-Rep 三角化而得、供 viewport 顯示的離散資料。
- **worker epoch**：一次 Worker runtime 的不透明識別；Worker 重建後必須改變。
- **operationId**：貫穿同一個建模或匯出 operation 的穩定識別。
- **requestId**：單次 Worker command 或 response 的識別；同一 operation 可以包含多個 requestId。

## Prototype Configuration

以下是雛形的暫定驗收設定；之後可以調整，但實作 gate 必須使用同一組已記錄的值：

| 項目 | 暫定值 |
| --- | --- |
| 預設尺寸 | 20 × 30 × 40 mm |
| 每軸合法範圍 | 1–500 mm |
| 輸入 step | 1 mm；拒絕小數，不自動四捨五入 |
| 輸入 debounce | 150 ms |
| B-Rep/mesh bounds tolerance | ±0.01 mm |
| CAD dependency policy | 實作開始時使用 npm latest stable 的 replicad 與相容的 replicad-opencascadejs；安裝後以 lockfile 固定解析版本 |
| engine initialization timeout | 60 s |
| model/export operation timeout | 120 s |
| Worker 自動 recovery retry | 1 次；初次失敗後自動重建一次，再次失敗停止自動循環 |
| 同時保留的 pending candidate 上限 | 2 |
| candidate TTL | 30 s |
| pending candidate 超限處理 | discard 最舊且已被較新 input 取代的 candidate，回傳 operation.superseded 並釋放資源 |
| STEP 副檔名 | .step |
| STEP MIME | model/step |
| 預設檔名 | box-{width}x{depth}x{height}.step |
| 方塊位置 | X/Y 置中於世界原點，底面位於 Z=0 |
| Prototype 瀏覽器 | 桌面版 Chrome、桌面版 Firefox；版本於驗收時記錄 |
## Requirements
### Requirement: 瀏覽器端執行邊界
The system MUST satisfy the following behavior:

Prototype 的 CAD 頁面、Worker、WASM、建模、預覽與 STEP 匯出必須在瀏覽器完成，不得依賴 backend、API server、database、auth 或伺服器端模型運算。本變更以本機 Astro dev server 或 local build preview 驗證；正式 hosting、CDN、base path、cache header 與 production deployment 不屬於本 Prototype。

#### Scenario: 本機 CAD 路由

- **Given** 本機 Astro dev server 或 local build preview 已提供 CAD route 與應用 asset
- **When** 使用者從本機網站開啟 CAD route
- **Then** 頁面必須載入 workspace、Worker 與 WASM
- **And** 初始化與匯出不呼叫專案 backend API

#### Scenario: 非 CAD 頁面

- **Given** 使用者只瀏覽本機網站的首頁或文件頁
- **When** 頁面完成載入
- **Then** 頁面必須提供可閱讀的靜態內容
- **And** 不得啟動 CAD Worker 或載入 OpenCascade WASM

### Requirement: Astro 與 Svelte workspace
The system MUST satisfy the following behavior:

CAD workspace 必須是 Svelte 5 + Threlte/Three.js 的瀏覽器端 island，預設使用 client:only="svelte"。Astro build/SSR 不得執行 Svelte workspace、WebGL、Worker 或 OpenCascade 初始化。

#### Scenario: 載入 fallback

- **Given** CAD route 的頁面 shell 已顯示，但 Svelte workspace 尚未 ready
- **When** 使用者查看 CAD 區域
- **Then** 必須看到載入 fallback、JavaScript/WASM/WebGL 必要條件或狀態提示
- **And** 不得只有空白畫面或沒有說明的永久 spinner

### Requirement: 參數驗證與 generation

The workspace MUST ask the selected component definition to validate every
parameter snapshot before sending a model request to the Worker. Every snapshot,
including an invalid snapshot, MUST receive a new generation. A valid snapshot
MUST send `model.generate` only after all fields stop changing for 150 ms; an
invalid snapshot MUST send `model.invalidate`, show the component-defined
diagnostic, and keep export disabled. Component-specific ranges, bounds, and
normalization rules MUST be owned by the corresponding catalog or component
capability specification.

#### Scenario: Valid component snapshot generates after debounce

- **WHEN** a selected component snapshot passes its owning validator and all fields stop changing for 150 ms
- **THEN** the workspace MUST send a `model.generate` request with a generation greater than the previous snapshot
- **AND** the Worker request MUST retain the selected stable `modelId`
- **AND** the component-specific capability MUST define the accepted parameters and bounds

#### Scenario: Invalid component snapshot is invalidated

- **WHEN** a snapshot is empty, non-finite, out of range, mismatched, or otherwise rejected by its owning validator
- **THEN** the workspace MUST show the component-defined diagnostic
- **AND** it MUST send `model.invalidate` rather than `model.generate`
- **AND** the previous committed preview MAY remain visible but MUST be marked stale
- **AND** STEP/STL export MUST remain disabled for the invalid or stale generation

#### Scenario: Debounce keeps only the latest valid snapshot

- **WHEN** the user changes a parameter repeatedly within the 150 ms settling window
- **THEN** the workspace MUST assign generations to the snapshots
- **AND** it MUST send at most one `model.generate` for the latest valid settled snapshot
- **AND** intermediate snapshots MUST NOT each start CAD generation


### Requirement: Separate slider and manual-input limits

For a numeric field that exposes both a slider and a text input, the workspace
MUST treat the slider as a navigation aid rather than as the component's
validation contract. The owning catalog or component capability MUST define the
manual-input domain; a valid manual value above the slider's navigation maximum
MUST remain acceptable when that capability permits it. Fields with a smaller
existing domain MUST retain that domain, and text-only fields MUST use their
owner's manual-input rules.

#### Scenario: Slider and text input expose distinct limits

- **WHEN** a user views a numeric field whose component spec allows manual values beyond the slider range
- **THEN** the range input MUST expose the component-defined navigation maximum
- **AND** the text input MUST accept every valid value in the component-defined manual domain
- **AND** entering a valid value above the slider maximum MUST remain possible

#### Scenario: Smaller domains remain bounded

- **WHEN** a numeric control has an existing smaller domain
- **THEN** its slider and manual input MUST retain the component's declared limits
- **AND** the workspace MUST NOT create values outside that domain

#### Scenario: Planar workspace limits remain independent

- **WHEN** a component has separate planar and height/length limits
- **THEN** the component MUST validate each domain independently
- **AND** a valid height or length MUST NOT bypass an invalid planar footprint

### Requirement: Worker 初始化與 CAD 所有權
The system MUST satisfy the following behavior:

OpenCascade WASM、replicad、B-Rep 建模、mesh 產生與 STEP writer 必須位於同一個專用 CAD Worker。主執行緒不得持有或操作 OpenCascade instance。

#### Scenario: 首次初始化

- **Given** 靜態 Worker 與 WASM asset 可取得
- **When** workspace 啟動 Worker
- **Then** UI 必須呈現 loading-engine 狀態
- **And** Worker 必須在同一 runtime 內初始化 OpenCascade 並注入 replicad
- **And** 初始化成功後才可回傳 engine.ready

#### Scenario: 重複初始化

- **Given** Worker 已成功初始化
- **When** 主執行緒重複送出 engine.init
- **Then** Worker 必須重用同一個 initialization result
- **And** 不得建立第二個並行 OpenCascade runtime

### Requirement: 版本化 Worker contract

The main thread and Worker MUST use a runtime-validated discriminated component-generation message contract. All messages MUST contain `version=1`, `kind` and `requestId`; model generation and export operations MUST carry `operationId`; model-generation, candidate, and committed-model messages MUST carry `modelId` and generation where applicable; `model.invalidate` is the explicit exception because it is a generic control message and carries generation, operationId, worker epoch, and reason but no modelId or parameters. Candidate, committed model and export messages MUST carry `workerEpoch` or `modelRevision` as appropriate. The contract MUST validate component-specific parameters against the selected model definition and MUST reject unknown model IDs or mismatched parameter shapes. `model.invalidate` creates no B-Rep but records the generation as the latest input generation.

#### Scenario: 不相容訊息

- **Given** 任一端收到不支援的訊息 version、未知 kind、未知 modelId 或缺少必要欄位
- **When** 訊息被驗證
- **Then** 接收端必須拒絕處理
- **And** UI 必須收到 protocol error
- **And** 不得更新 viewport、model revision 或觸發下載

#### Scenario: Component-specific contract

- **Given** Worker 收到 `model.generate`
- **When** `modelId=modular-grid-base` 且 parameters 是合法 rows/columns
- **Then** Worker 必須將 request route 到 modular-grid-base builder
- **And** Worker 不得把 rows/columns 當成 box 的 width/depth/height
- **And** 若 parameters 與 modelId 不匹配，Worker 必須拒絕 request 並回傳可診斷 validation error

#### Scenario: 大型資料傳輸

- **Given** Worker 已產生 mesh typed arrays 或 STEP bytes
- **When** 資料跨越 Worker 邊界
- **Then** 大型 ArrayBuffer 必須使用 transferable，或使用已驗證不造成不可接受阻塞的 Blob
- **And** 不得傳送 OpenCascade/replicad B-Rep wrapper 或可變 WASM heap view

#### Scenario: Operation 關聯與重送

- **Given** 一個 model.generate operation 產生 candidate-ready
- **When** 主執行緒送出 model.commit 或 model.discard
- **Then** 後續訊息必須沿用原 operationId
- **And** 每個 command 可以有新的 requestId
- **And** 重複 commit 不得產生第二個 model revision
- **And** 重複 discard 不得再次釋放同一個 candidate

### Requirement: Latest-wins 與 candidate commit
The system MUST satisfy the following behavior:

Worker 建模成功只代表 candidate 建立成功，不代表 current model 已更新。只有主執行緒確認 generation 仍為最新後，candidate 才可以 commit。

#### Scenario: 最新 candidate commit

- **Given** 最新 generation 為 G2
- **When** Worker 回傳 G2 的 candidate-ready
- **Then** 主執行緒驗證 mesh 後必須送出 model.commit
- **And** Worker 必須驗證 candidate 的 workerEpoch 等於目前 epoch、candidate 尚未終結，且 generation 等於 Worker 記錄的最新 input generation
- **And** Worker 必須將該 candidate 設為 current model
- **And** Worker 必須回傳新的 model revision 與 model.ready

#### Scenario: 過期 candidate discard

- **Given** 使用者先產生 G2，之後產生 G3
- **When** G2 candidate 在 G3 已成為最新要求後抵達
- **Then** 主執行緒不得 commit G2
- **And** 必須送出 model.discard
- **And** Worker 必須以 operation.superseded 結束 G2 原本的建模 operation
- **And** G2 不得更新 viewport、current model 或匯出來源

#### Scenario: Worker 拒絕過期 commit

- **Given** Worker 已接受 G3，且 G2 candidate 尚未終結
- **When** 主執行緒因重送或訊息順序錯誤送出 G2 的 model.commit
- **Then** Worker 必須拒絕 G2 commit
- **And** 必須回傳帶有原 operationId 的 operation.superseded 或 stale-generation error
- **And** current model、model revision 與 viewport 不得改變

#### Scenario: 非法輸入使舊 generation 失效

- **Given** G2 的 candidate 或建模 operation 尚未終結
- **When** 使用者輸入非法的 G3 snapshot
- **Then** UI 必須送出帶有 G3 的 model.invalidate，而不是 model.generate
- **And** Worker 必須記錄 G3 為最新 input generation，並使 G2 candidate 與建模 operation 失效
- **And** G2 不得再 commit，current model 可以保留但必須標示 stale，匯出保持停用
- **And** Worker 必須回傳 model.invalidated 及受影響 operation 的 terminal response

#### Scenario: Worker 拒絕過期 generate

- **Given** Worker 已記錄最新 input generation 為 G3
- **When** Worker 收到 generation 為 G2 或重複 G3 的 model.generate
- **Then** Worker 不得建立新的 candidate
- **And** 必須回傳帶有原 operationId 的 operation.superseded
- **And** current model 與 pending candidate 不得改變

#### Scenario: 最新 generation 建模失敗

- **Given** G3 是最新 generation，但 Worker 無法建立有效 B-Rep
- **When** Worker 回傳建模錯誤
- **Then** G2 等過期 candidate 不得自動提升為 current model
- **And** 最後一個成功 model 可以保留為 stale 預覽
- **And** 新 STEP 匯出必須停用，直到新的 generation 成功 commit

#### Scenario: Candidate cleanup

- **Given** Worker 已回傳 candidate-ready
- **When** mesh validation 失敗、commit/discard 失敗、主執行緒沒有回覆或 candidate 超過 TTL
- **Then** Worker 必須釋放 candidate 的 B-Rep/native resources
- **And** pending candidate 數量不得超過 Prototype Configuration 上限
- **And** TTL 或主執行緒未回覆時，Worker 必須以原始 generate 的 operationId、terminalForRequestId 與 CANDIDATE_EXPIRED/CANDIDATE_ORPHANED code 回傳一次 terminal response
- **And** cleanup 失敗必須進入可診斷的 Worker error 或 recovery 流程

#### Scenario: Pending candidate 超過上限

- **Given** Worker 已有兩個 pending candidate，且較舊 candidate 已被更新的 generation 取代
- **When** 新 generation 的 candidate 完成
- **Then** Worker 必須 discard generation 最小的舊 candidate
- **And** 必須以原始 operationId 回傳 reason=CANDIDATE_CAPACITY 的 operation.superseded
- **And** 必須釋放舊 candidate 資源後保留新 candidate
- **And** 不得丟棄 current model 或已被 export pin 的 revision；若沒有可丟棄 candidate，新的 generate 必須以 CANDIDATE_CAPACITY error 結束

#### Scenario: Request terminal state

- **Given** UI 已送出可接受的建模 request
- **When** 該 request 被處理完成、取代或發生錯誤
- **Then** 必須收到 model.ready、operation.error 或 operation.superseded 其中一種 terminal response
- **And** UI 不得永久停留在 generating

### Requirement: Mesh viewport

The viewport MUST use Threlte with Three.js to display the latest committed model mesh, regardless of whether the selected catalog entry is a box or a component. It MUST NOT execute B-Rep modelling or STEP export. Dimension annotations MUST describe the selected committed model's actual X, Y and Z bounds and MUST remain associated with the same committed model revision. While the committed model revision is unchanged, parameter input and stale-state changes MUST NOT change the viewport camera pose or framing; camera fitting MAY occur when the viewport size changes or when a new committed model revision replaces the current one. Viewport lighting MUST keep exposed model surfaces, including raised features, thin walls and recessed cavities, visually legible across all viewing angles supported by the existing OrbitControls configuration. Lighting MUST provide enough orientation-independent fill to prevent exposed surfaces from becoming near-black solely because they face away from the primary light, while preserving directional contrast so adjacent faces and geometric relief remain distinguishable. The viewport MUST also display a fixed-position orientation indicator with visible X, Y and Z axis labels. The indicator MUST represent the same world coordinate system as the model and grid, including the CAD Z-up convention, and MUST update its orientation whenever the viewport camera or orbit pose changes without moving from its viewport corner.

#### Scenario: 有效 component mesh

- **Given** Worker 回傳 positions、normals、indices、bounds 與 triangle count for a selected component
- **When** worker client 驗證成功
- **Then** viewport 必須顯示可辨識的 component
- **And** 相機 framing 必須使模型可見
- **And** 替換模型後必須釋放舊 geometry、material 與 GPU resource
- **And** viewport 必須顯示對應 committed model 的 X、Y、Z 尺寸標註
- **And** 每組尺寸標註必須顯示以 mm 為單位的實際 bounds 數值
- **And** 初始視角中的可見表面與幾何凹凸必須保持可辨識，不得因主光源方向而整片變黑
- **And** viewport 必須同時顯示固定位置且包含 X、Y、Z 文字的座標方向指示器

#### Scenario: 尺寸標註對應 modular-grid-base

- **Given** workspace 已成功 committed 一個 rows × columns 的 modular-grid-base model
- **When** 使用者查看 3D viewport
- **Then** X 標註必須等於 `columns × 20 mm`
- **And** Y 標註必須等於 `rows × 20 mm`
- **And** Z 標註必須等於 5 mm
- **And** 標註必須包含連接模型邊緣的延伸線、尺寸線與可讀的數值標籤
- **And** 座標方向指示器的 X、Y、Z 軸向必須與模型及網格的世界座標一致

#### Scenario: Orbit angles preserve relief readability

- **Given** viewport 已顯示包含凸起、凹槽、薄壁或中空區域的 committed model
- **When** 使用者透過既有 OrbitControls 從正面、側面、背面及高低傾角查看模型
- **Then** 每個視角中朝向使用者且未被幾何遮擋的模型表面都必須保持可辨識
- **And** 凹槽或中空區域的內側表面不得僅因背向主光源而變成無法辨識的近黑區域
- **And** 相鄰表面之間必須保留足以辨識凸凹、邊界與深度的明暗差異
- **And** 光照改善不得以移除幾何明暗或將模型渲染成無材質明暗的平面色取代

#### Scenario: Lighting remains readable across representative model types

- **Given** viewport 依序顯示實心 box、薄壁或開口盒，以及 OpenGrid 或蜂巢類中空模型
- **When** 使用者在相同的代表性 orbit 視角查看每個模型
- **Then** 各模型的可見表面都必須維持一致且可預期的最低可讀亮度
- **And** 中空模型的孔洞、內壁與薄壁邊緣必須可由明暗差異辨識
- **And** 光源配置不得改變模型 bounds、尺寸標註、相機控制或模型生成結果

#### Scenario: OpenGrid underside groove readability

- **Given** viewport 已顯示包含內側凹槽與中空開口的 OpenGrid 底板
- **When** 使用者透過既有 OrbitControls 從 underside 傾角查看模型
- **Then** 面向使用者且未被幾何遮擋的四側內壁必須仍可辨識
- **And** 內側凹槽邊界不得因背向主光或朝向模型下方而變成近黑區域
- **And** 凹槽深度與相鄰底面之間必須保留明暗差異

#### Scenario: XYZ orientation indicator follows orbit

- **Given** viewport 已顯示 committed model 與 XYZ 座標方向指示器
- **When** 使用者透過既有 OrbitControls 旋轉、傾斜或翻轉視角
- **Then** 座標方向指示器必須留在同一個 viewport corner
- **And** 指示器中的 X、Y、Z 軸向朝向必須反映目前相機方向
- **And** orbit 操作不得改變模型 mesh、bounds 或尺寸標註的資料內容

#### Scenario: 建模期間保留舊 preview

- **Given** 使用者已修改 component 參數，新的 generation 尚未 committed，且上一個 committed model 仍保留在 viewport
- **When** 使用者查看 viewport
- **Then** 尺寸標註必須仍對應畫面上保留的上一個 committed model
- **And** 尺寸標註不得提前顯示尚未 committed 的新輸入
- **And** viewport 必須維持既有 stale 狀態提示
- **And** viewport camera pose、model framing 與尺寸標註的畫面位置必須維持不變
- **And** XYZ 座標方向指示器必須仍顯示目前 camera pose 的方向

#### Scenario: 參數輸入不觸發 viewport camera 旋轉

- **Given** viewport 已顯示 committed model，且使用者未在 3D viewport 內進行 orbit 操作
- **When** 使用者拖曳 slider、使用鍵盤調整 slider，或修改其他參數，而新 model revision 尚未 committed
- **Then** viewport 必須繼續顯示原本的 committed mesh
- **And** camera 的方向、target、zoom/framing 不得因輸入事件而改變
- **And** 輸入事件不得使既有模型被重新 fit 而產生旋轉或跳動
- **And** XYZ 座標方向指示器不得因輸入事件自行改變方向

#### Scenario: 新 committed revision 更新 framing

- **Given** 使用者已修改參數，且新的 model revision 已成功 committed
- **When** viewport 替換成新的 committed mesh
- **Then** viewport 必須顯示新 revision 對應的模型與尺寸標註
- **And** camera framing 必須使新模型可見
- **And** 既有 Orbit 操作必須仍可使用
- **And** XYZ 座標方向指示器必須繼續顯示新 viewport camera pose 的方向

#### Scenario: 窄版 viewport 保持可讀

- **Given** CAD viewport 顯示於窄版桌面或較小的可視區域
- **When** 使用者查看模型並操作 OrbitControls
- **Then** XYZ 座標方向指示器必須完整留在 viewport 內
- **And** X、Y、Z 軸向文字必須保持可辨識
- **And** 指示器不得遮住 stale 狀態提示或造成 viewport 橫向溢出

#### Scenario: 沒有可用模型

- **Given** workspace 尚未有 committed model，或目前沒有可供預覽的 mesh
- **When** 使用者查看 viewport
- **Then** viewport 不得顯示尺寸線或尺寸標籤
- **And** viewport 必須顯示既有的無模型或 WebGL fallback 訊息
- **And** viewport 不得顯示沒有可對應模型的 XYZ 座標方向指示器

#### Scenario: 損壞 mesh

- **Given** response 缺少 buffer、index 越界、座標非有限或沒有三角形
- **When** mesh boundary validation 執行
- **Then** 不得把該 mesh 設為成功預覽
- **And** UI 必須顯示 mesh validation error
- **And** 主執行緒必須送出對應 candidate 的 model.discard
- **And** viewport 不得 crash
- **And** viewport 不得為該損壞 mesh 顯示尺寸標註或 XYZ 座標方向指示器

### Requirement: Viewport edge-line overlay

The viewport MUST render a restrained edge-line overlay together with every valid committed model mesh. The overlay MUST include geometric boundaries and visually meaningful feature edges while suppressing ordinary triangulation edges that would make smooth or tessellated surfaces appear as a dense wireframe. The overlay MUST preserve the existing model shading and viewport lighting rather than replacing lighting with flat-color rendering.

#### Scenario: Valid committed mesh shows model edges

- **WHEN** a valid committed mesh for any registered model is displayed in the CAD viewport
- **THEN** the visible outer contour and meaningful hard or recessed feature edges MUST have a clear line treatment
- **AND** the line treatment MUST use a consistent style across model types and orbit views
- **AND** the existing model shading, dimensions, grid and XYZ orientation indicator MUST remain visible

#### Scenario: Tessellation edges remain suppressed

- **WHEN** a model contains triangulated planar or smoothly curved faces
- **THEN** ordinary internal triangle boundaries MUST NOT produce a dense wireframe-like overlay
- **AND** actual model boundaries and sufficiently pronounced changes in face direction MUST remain represented

#### Scenario: Hidden edges remain occluded

- **WHEN** an edge is behind a visible model surface from the current camera pose
- **THEN** that edge MUST NOT appear to pass through the surface
- **AND** rotating the camera to expose the edge MUST make the edge eligible for display without changing the model data

#### Scenario: Edge overlay follows committed revisions

- **WHEN** a new model revision replaces the current committed mesh
- **THEN** the viewport MUST remove the previous revision's edge overlay
- **AND** the new revision's overlay MUST correspond only to the new committed mesh
- **AND** no previous edge lines or line resources MAY remain visible after replacement

#### Scenario: Pending or invalid input preserves the committed overlay

- **WHEN** the user changes parameters while a new generation is pending, stale, invalid, or failed
- **THEN** the viewport MUST keep the edge overlay associated with the last committed mesh
- **AND** it MUST NOT derive edge lines from uncommitted input
- **AND** camera pose, framing, dimensions, stale state and XYZ orientation behavior MUST remain governed by the existing viewport contract

#### Scenario: No committed mesh has no edge overlay

- **WHEN** the workspace has no valid committed mesh or mesh validation fails
- **THEN** the viewport MUST NOT render edge lines, dimensions or an orientation indicator for that unavailable model
- **AND** the existing no-model or validation-error behavior MUST remain intact

### Requirement: STEP 匯出

The system MUST generate STEP from the selected component's pinned committed model
revision in the Worker and MUST never reconstruct STEP from the viewport mesh.
The selected catalog or component capability MUST supply the export metadata and
deterministic filename; the generic workspace MUST not hardcode a
component-specific filename. The workspace MUST present the STEP download action
only in local dev builds; a production build MUST NOT render a STEP download
action for any model. The STEP export contract itself is unchanged and remains
fully exercised in local dev builds, including fixed STEP downloads.

#### Scenario: Component STEP 匯出成功

- **Given** workspace 為 ready，且指定 component model revision 仍存在
- **When** 使用者按下 STEP 下載
- **Then** UI 必須建立綁定該 component model revision 的 export request
- **And** Worker 必須由該 revision 的 B-Rep 產生非空 STEP bytes
- **And** 下載檔名 MUST come from the selected component capability

#### Scenario: STEP 匯出失敗

- **Given** Worker 無法由指定 component revision 產生 STEP
- **When** export operation 結束
- **Then** UI 必須顯示可理解錯誤
- **And** 不得產生空檔或宣稱下載成功

#### Scenario: 匯出期間 component 更新

- **Given** 使用者對 component revision R1 開始 STEP 匯出
- **When** 新的參數 snapshot 產生 revision R2
- **Then** R1 export MUST continue using R1's pinned revision
- **And** R2 MUST NOT 竄改進行中的 R1 export

#### Scenario: Prototype 瀏覽器範圍

- **When** 測試完整的初始化、component 建模、預覽與 STEP 匯出流程
- **Then** 測試 MUST use the selected component's documented export metadata
- **And** Worker MUST remain the only owner of B-Rep and STEP generation

#### Scenario: Export 尚未被接受

- **Given** 使用者對 component revision 發出 STEP export request，但 Worker 尚未接受該 request
- **When** request 尚未進入 accepted state
- **Then** UI MUST NOT report a successful download
- **And** export gate MUST remain tied to the accepted committed revision

#### Scenario: 生產 build 不呈現 STEP 下載

- **When** 使用者以 production build 開啟任一 generator 頁面並進入 ready 狀態
- **THEN** 工作區 MUST NOT 渲染「下載 STEP」按鈕
- **And** STEP 以外的下載動作（STL；`opengrid-wall-cover` 的 3MF）MUST 仍可用
- **And** 匯出失敗或逾時的錯誤處理行為 MUST 不受隱藏按鈕影響

#### Scenario: 本機 dev build 保留 STEP 下載

- **When** 使用者以本地 dev build 開啟任一 generator 頁面並進入 ready 狀態
- **THEN** 工作區 MUST 呈現「下載 STEP」按鈕
- **And** 其行為 MUST 符合本需求其餘情境所述的 STEP 匯出契約

### Requirement: 狀態與錯誤
The system MUST satisfy the following behavior:

UI 必須呈現 booting、loading-engine、generating、ready、invalid-input、recoverable-error 與 fatal-worker-error。錯誤至少包含 stage、穩定 code、user message、recoverable 與 request/revision 關聯。當模型建模、mesh、Worker 或相關 operation 進入 recoverable-error 或 fatal-worker-error 時，UI MUST 以可關閉的 toast 顯示該錯誤的 user message 與對應失敗類型；toast 不得取代既有 stale 預覽、匯出停用或重試控制。

#### Scenario: WASM 載入失敗

- **Given** WASM asset 404、MIME 錯誤或初始化例外
- **When** Worker 初始化失敗
- **Then** UI 必須離開 loading 狀態
- **And** 顯示 CAD engine 載入失敗
- **And** 以 toast 顯示該初始化錯誤的 user message
- **And** 提供重試或重新載入指引
- **And** STEP 下載必須停用

#### Scenario: Worker 終止

- **Given** Worker 未捕捉例外、message error 或意外終止
- **When** 主執行緒偵測到 failure
- **Then** UI 必須進入 fatal-worker-error
- **And** 不得把舊預覽標示為目前參數同步
- **And** 以 toast 顯示 Worker failure 的 user message
- **And** 使用者必須能重建 Worker
- **And** 重建後 workerEpoch 改變，舊 revision 與 pending export 全部失效

#### Scenario: 可復原建模錯誤

- **Given** 參數通過表面驗證但 CAD kernel 建模失敗
- **When** Worker 回傳建模錯誤
- **Then** UI 必須指出模型建立失敗
- **And** 以 toast 顯示 Worker 回傳的建模失敗原因
- **And** 可以保留上一個成功預覽並標示 stale
- **And** 使用者可以修改參數後重試
- **And** 新 STEP 匯出保持停用

#### Scenario: Worker timeout

- **Given** engine initialization、model operation 或 STEP export 超過 Prototype Configuration 的 timeout
- **When** watchdog 判定 Worker 不再可信
- **Then** UI 必須離開 loading、generating 或 exporting 狀態
- **And** 目前 operation 必須收到 WORKER_TIMEOUT error
- **And** 以 toast 顯示 timeout 的 user message
- **And** 所有 pending operation 都必須收到 WORKER_TIMEOUT 或 WORKER_RESTARTED 的 terminal error
- **And** 舊 Worker 必須被 terminate，pending candidate、revision 與 export pin 必須清理
- **And** 重建後 Worker 必須使用新的 workerEpoch
- **And** 新 Worker 必須重新執行 engine.init；若目前輸入 snapshot 合法，engine.ready 後必須重新執行 generation 1 的 model.generate、candidate commit 與 model.ready
- **And** generation 必須以 workerEpoch 為範圍並在重建後重置為 1；若目前輸入非法，重建後維持 invalid-input，不得自動建模或開放匯出
- **And** 每個 failure recovery cycle 最多只能自動重建 Worker 1 次；再次失敗必須進入 recoverable-error，停止自動重試並提供手動重試

#### Scenario: 錯誤 toast 的生命週期

- **Given** UI 已顯示目前 operation 的錯誤 toast
- **When** 使用者輸入新的參數、模型成功完成新的 generation，或 Worker recovery 清除目前錯誤
- **Then** 舊錯誤 toast 必須消失
- **And** 若新的 operation 立即失敗，toast 必須改為顯示新的 user message
- **And** 使用者關閉 toast 後，相同錯誤在狀態未改變期間不得立即再次出現

### Requirement: 主執行緒不被 CAD 阻塞
The system MUST satisfy the following behavior:

replicad、OpenCascade、B-Rep 操作、mesh 產生與 STEP writer 不得在主執行緒執行。代表性 Prototype 模型運算期間，UI 必須仍能更新狀態與操作相機。

#### Scenario: Worker 建模期間 UI 可互動

- **Given** Worker 正在執行方塊重建
- **When** 使用者操作相機或非建模控制項
- **Then** 主執行緒不得執行 CAD kernel function
- **And** UI 不得永久卡在 generating
- **And** Worker progress 或 busy stage 必須可呈現

### Requirement: 明確非目標

The system MUST expose the runtime-validated component catalog and the
component capabilities documented by this project, including their STEP, STL,
and the documented Snap 3MF download flow. It MAY preserve validated component
parameter preferences in browser-local persistence as defined by the
component-parameter-persistence capability, but MUST NOT add arbitrary CAD
file import, G-code workflows, saving generated CAD files or models,
authentication, collaboration, automatic Bambu Studio launching, or native
desktop-app integration. The 3MF flow MUST remain limited to the documented
Worker-generated Snap POC and MUST NOT be interpreted as arbitrary 3MF editing
or slicer project generation.

#### Scenario: Prototype 功能清單

- **Given** 使用者查看 Prototype UI 與文件
- **When** 檢查模型與輸出功能
- **Then** 每個 catalog entry MUST expose only its own documented parameters, preview, and export actions
- **And** component parameter persistence MAY exist under the persistence capability
- **And** arbitrary import、G-code、generated CAD file/model saving、auth、
  collaboration、自動啟動 Bambu Studio 或 native desktop bridge 入口不得
  出現
- **And** only the documented Snap POC may expose a 3MF download action

### Requirement: Fine-grained Worker progress

The versioned Worker contract MUST allow `operation.progress` to carry optional
`completed`, `total`, and `unit` fields in addition to its existing stage
and operation-correlation fields. A component with logical assembly work MUST
report valid completed/total counts at cell or batch boundaries; stages without a
natural count MAY report only their stage. The UI MUST show the current stage
and, when counts are available, a determinate progress value without presenting
stale or unrelated operation progress.

#### Scenario: Component assembly reports completed work

- **GIVEN** the Worker is generating a component with measurable assembly work
- **WHEN** a logical cell or batch completes
- **THEN** it MUST emit `operation.progress` with the current operationId and generation
- **AND** completed MUST be a non-negative integer no greater than total
- **AND** total MUST be a positive integer representing the current assembly work
- **AND** the UI MUST update the visible progress indicator with the current stage and count

#### Scenario: Progress from an older generation is ignored

- **GIVEN** generation G2 is the latest input and G1 progress arrives after G2 starts
- **WHEN** the main thread handles the G1 progress event
- **THEN** it MUST ignore the event
- **AND** it MUST keep displaying G2 progress or its current status

### Requirement: Progress terminal lifecycle

The UI MUST clear the active progress indicator when the associated operation reaches model.ready, operation.error, operation.superseded, timeout, recovery, or invalidation. A terminal event for an older operation MUST NOT clear progress belonging to a newer current operation.

#### Scenario: Successful generation clears progress

- **GIVEN** the UI displays progress for the latest model generation
- **WHEN** the Worker returns model.ready and the mesh is committed
- **THEN** the progress indicator MUST be removed or marked complete
- **AND** the status MUST transition to the existing ready message

#### Scenario: Failed or cancelled generation clears progress

- **GIVEN** the UI displays progress for a generation
- **WHEN** that generation returns an error or superseded terminal response
- **THEN** the UI MUST leave the active progress state
- **AND** it MUST show the existing recoverable/error or stale status without an indefinitely running progress indicator

### Requirement: 穩定且響應式的參數復原控制

CAD workspace MUST 提供可辨識且可用的 component-level「全部恢復預設」操作，將目前模型的所有參數恢復為定義的預設值。非 boolean 的模型參數 MAY 另外提供個別復原操作；boolean 控制與尺寸計算器的暫存輸入不提供個別復原按鈕。復原操作出現或消失時，不得重新分配相關 slider、select、文字輸入框或 checkbox 的主要控制區域；在窄版面板中，控制項 MUST 維持可讀、可操作，且不得因復原操作造成水平溢出。

#### Scenario: 非 boolean 參數修改後顯示個別復原操作

- **GIVEN** 使用者位於任一提供可復原參數的 model-specific CAD workspace，且該參數目前為預設值
- **WHEN** 使用者將該參數修改為不同的合法值
- **THEN** 該參數 MUST 顯示具備可理解 accessible name 的復原操作
- **AND** 原本的 slider、select、文字輸入框或 checkbox MUST 維持可操作
- **AND** 參數控制的主要位置與可用寬度 MUST 不因復原操作動態出現而改變

#### Scenario: boolean 與尺寸計算器使用 component-level 復原

- **GIVEN** 使用者修改 model component 的 boolean 參數，或在尺寸計算器輸入目標尺寸
- **THEN** 該控制 MUST NOT 顯示個別復原按鈕
- **AND** component MUST 顯示具備可理解 accessible name 的「全部恢復預設」操作
- **AND** 原本的 checkbox 或文字輸入框 MUST 維持可操作

#### Scenario: 窄版面板不被復原操作壓縮

- **GIVEN** 使用者在窄視窗查看模型參數面板
- **WHEN** 使用者修改會顯示復原操作的 select、slider 或數字輸入參數
- **THEN** 參數控制 MUST 保留足以顯示及操作其值的寬度
- **AND** 復原操作 MUST 保持可見且可點擊
- **AND** 頁面 MUST 不因該復原操作產生水平溢出

#### Scenario: 全部恢復預設後維持穩定版面

- **GIVEN** component 內一個以上參數已修改
- **WHEN** 使用者啟動「全部恢復預設」操作
- **THEN** 所有模型參數 MUST 回到定義的預設值
- **AND** 尺寸計算器的暫存輸入 MUST 清空
- **AND** 相關控制項與相鄰欄位 MUST 不發生額外的水平或垂直位移

### Requirement: Mobile CAD viewport touch interaction

At or below the existing `760px` responsive breakpoint, a CAD viewport with a committed model MUST support continuous touch interaction without requiring the user to lift their finger during a gesture. Touch handling MUST be scoped to the preview surface so normal page scrolling remains available outside the viewport.

#### Scenario: Continuous one-finger orbit on a mobile viewport

- **WHEN** a user touches a committed CAD preview at or below the `760px` breakpoint and drags with one finger without lifting it
- **THEN** the model orientation MUST continue updating for the full drag until the finger is released
- **AND** the gesture MUST NOT stop after a short movement or require a second touch to continue

#### Scenario: Preview touch handling is scoped to the preview surface

- **WHEN** a user starts a vertical scroll on mobile outside the CAD preview surface
- **THEN** the document MUST continue scrolling normally
- **AND** the preview interaction behavior MUST NOT lock or disable scrolling for the rest of the page

#### Scenario: Existing multi-touch viewport controls remain available

- **WHEN** a user performs the existing supported two-finger viewport gesture on a mobile preview
- **THEN** the viewport MUST continue to provide its existing zoom or pan behavior
- **AND** the mobile touch support MUST NOT replace or disable the existing viewport control mapping

#### Scenario: Desktop viewport interaction remains compatible

- **WHEN** a user operates the CAD preview above the `760px` breakpoint with the existing mouse orbit interaction
- **THEN** the model MUST remain rotatable through the existing desktop interaction
- **AND** the mobile touch support MUST NOT change model generation, camera framing, dimension annotations, or committed revision behavior

### Requirement: Component-specific behavior has a single normative owner

The generic CAD workspace specification MUST own only lifecycle behavior that is
shared by every runtime-validated catalog component. Route-specific controls,
component parameter ranges, component builder dispatch, component-specific preview
invariants, and component-specific export metadata MUST be normatively defined in
the corresponding component capability specification.

#### Scenario: A component contract changes

- **WHEN** a future change modifies a component route, control, validator, builder,
  preview, or export rule
- **THEN** the corresponding component capability spec MUST be updated
- **AND** `cad-workspace` MUST remain unchanged unless the shared lifecycle changes

#### Scenario: Shared lifecycle applies to every component

- **WHEN** any registered catalog component is initialized, generated, committed,
  invalidated, previewed, or exported
- **THEN** the generic lifecycle in `cad-workspace` MUST apply
- **AND** the component capability spec MUST provide the component-specific inputs
  and acceptance criteria

#### Scenario: Existing identities remain compatible

- **WHEN** the ownership refactor is applied
- **THEN** existing model IDs, OpenGrid build keys, route slugs, persistence keys,
  and export filename formats MUST remain unchanged

## 可追溯性

- 變更動機、Prototype 範圍與後續演進：../../proposal.md
- 架構、contract、lifetime 與測試策略：../../design.md
- 實作順序與 quality gates：../../tasks.md
