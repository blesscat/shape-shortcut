// Auto-split from src/i18n/catalog.ts (human-warm-restyle Task 0). Values unchanged.

export const zh = {
  'cad.attribution.tissueBox.modified':
    '此參數化面紙盒整合經轉向配置的 OpenConnect 鎖定母座，新增向上傾斜支撐、底部抽取槽，以及省料側壁與底板。',
  'cad.currentlyEditing': '目前編輯：{name}',
  'cad.pageTitle': '{name} CAD 工作區 | Shape Shortcut',
  'cad.staticSummary': '模型摘要',
  'cad.parametersHeading': '可調參數與限制',
  'cad.fixedParameters': '這個模型使用固定幾何，沒有可調參數。',
  'cad.exportFormats': '可用匯出格式：STL。',
  'cad.attribution.heading': '來源與授權',
  'cad.attribution.opengrid.summary':
    '這個 OpenGrid Board 使用下列上游作者與授權資訊。',
  'cad.attribution.opengrid.credits': '上游作者：',
  'cad.attribution.snap.summary':
    '這個 OpenGrid Snap generator 使用下列 OpenGrid 與 OpenConnect 上游作者與授權資訊。',
  'cad.attribution.snap.credits': '上游作者：',
  'cad.attribution.openConnectShelf.summary':
    '這個產生器使用 OpenGrid 介面與 OpenConnect 鎖定孔幾何。',
  'cad.attribution.openConnectShelf.credits': '原始系統作者：',
  'cad.attribution.author.designRole': '設計',
  'cad.attribution.author.openScadRole': 'OpenSCAD',
  'cad.attribution.author.openConnectRole': 'OpenConnect 設計與 OpenSCAD',
  'cad.attribution.author.openConnectProjectRole': 'OpenConnect 專案',
  'cad.attribution.snap.modified':
    '`snap-half` 與 `snap-quarter` 是根據原始 Snap 修改的衍生版本；OpenConnect head 與底部介面缺口則根據 mitufy 的 OpenConnect 系統整合，來源授權為 CC BY 4.0。',
  'cad.attribution.openConnectShelf.modified':
    '產生器以附帶的鎖定孔 STEP 作為減法模板，並建立原生 OpenGrid Full 層板、支撐與列印朝向。',
  'cad.attribution.openConnectOrganizer.modified':
    '產生器以附帶的鎖定孔 STEP 作為減法模板，並建立單件收納本體、向使用者前傾的孔軸與平行牆面的整合式後方母座。',
  'cad.attribution.licenseLabel': '授權',
  'cad.attribution.sourceCodeLicense': '上游程式碼：CC BY-NC-SA 4.0',
  'cad.attribution.derivedPartsLicense': '衍生／產生零件：CC BY 4.0',
  'cad.attribution.openConnectLicense':
    'OpenConnect 原始碼與介面幾何：CC BY 4.0',
  'cad.attribution.openConnectSocketLicense':
    'OpenConnect 原始碼與鎖定孔幾何：CC BY 4.0',
  'cad.attribution.note':
    '以上資訊說明上游作者、程式碼與衍生零件的授權，不代表 Shape Shortcut 對上游程式碼或其他模型取得額外權利。',
  'cad.loading': '正在載入 {name} CAD workspace',
  'cad.requirements':
    '需要 JavaScript、WebAssembly、Web Worker 與 WebGL 才能顯示互動式預覽。',
  'cad.selectModel.title': '請先選擇 CAD 模型',
  'cad.selectModel.description': 'CAD workspace 需要指定模型後才能開啟。',
  'cad.selectModel.link': '返回模型選擇 →',
  'unit.mm': 'mm',
  'unit.degree': '°',
  'unit.grid': '格',
  'unit.count': '支',
  'cad.cylinder.topRimEnabled': '雙色飾圈',
  'cad.cylinder.topRimHeight': '飾圈高度',
  'cad.action.step': '下載 STEP',
  'cad.action.stl': '下載 STL',
  'cad.action.threeMf': '下載 3MF',
  'cad.wallCover.threeMfNote': '雙色效果僅適用於 3MF。',
  'cad.labelCard.threeMfNote': '雙色效果僅適用於 3MF。',
  'cad.action.retry': '重試',
  'cad.system.current': '目前系統：{name}',
  'cad.error.title.initializing': 'CAD engine 載入失敗',
  'cad.error.title.exporting': 'CAD 匯出失敗',
  'cad.error.title.worker': 'CAD Worker 發生錯誤',
  'cad.error.title.default': '模型建立失敗',
  'cad.error.close': '關閉錯誤通知',
  'cad.error.reason': '原因：{message}',
  'cad.error.unknown': 'CAD 工作階段發生未預期錯誤。',
  'diagnostic.unknown': 'CAD 輸入無效，請檢查參數後重試。',
  'diagnostic.unexpected': 'CAD 工作階段發生未預期錯誤。',
  'diagnostic.modelBuildFailed': '模型建立失敗，請調整參數後重試。',
  'diagnostic.protocolInvalid': 'CAD Worker 訊息無效，請重新整理後重試。',
  'diagnostic.workerTerminated': 'CAD Worker 已停止，請重試。',
  'diagnostic.sceneFileMalformed': '場景檔格式無效，無法匯入。',
  'diagnostic.sceneFileUnsupportedVersion':
    '場景檔版本不支援，請更新檔案後再匯入。',
  'diagnostic.sceneUnknownModel': '場景檔包含未知的模型：{modelId}。',
  'diagnostic.sceneInstanceInvalidParameters':
    '場景檔中 {modelId} 的參數無效，無法匯入。',
  'diagnostic.sceneInvalidPlacement': '擺放位置無效。',
  'diagnostic.sceneTooManyInstances': '場景最多 {max} 個元件，已超過上限。',
  'playground.title': 'OpenGrid Playground 規劃器',
  'playground.viewMode.title': '場景方向',
  'playground.camera.reset': '恢復視角',
  'playground.grid.title': '場景格數',
  'playground.grid.axisX': '場景格數 X',
  'playground.grid.axisY': '場景格數 Y',
  'playground.viewMode.desktop': '桌面',
  'playground.viewMode.wall': '牆面',
  'playground.entry': '開啟 Playground 規劃器',
  'playground.description':
    '將多個 component 放進同一個 3D 場景，依 OpenGrid 格子擺放、調整參數與顏色，並逐片匯出 STEP/STL。場景以 proxy 外觀呈現，細節檢視請回到各 component 工作區。',
  'playground.loading': 'Playground 載入中',
  'playground.addComponent': '新增元件到場景',
  'playground.chooseModel': '選擇模型',
  'playground.add': '加入',
  'playground.empty': '場景還沒有元件。選擇模型後按「加入」開始規劃。',
  'playground.scene.import': '匯入場景檔',
  'playground.scene.export': '下載場景檔',
  'playground.instance.label': '標籤（選填，用於匯出檔名）',
  'playground.instance.labelPlaceholder': '例如：底層左邊',
  'playground.instance.duplicate': '複製',
  'playground.instance.delete': '刪除',
  'playground.instance.retry': '重試',
  'playground.instance.failed': '此元件生成失敗。',
  'playground.instance.editorHint':
    '進階設定與細節預覽請使用「{name}」工作區。',
  'playground.placement.title': '擺放位置（格子座標）',
  'playground.placement.cellX': 'X',
  'playground.placement.cellY': 'Y',
  'playground.placement.rotation': '旋轉',
  'playground.placement.stepDown': '{axis} 減 1',
  'playground.placement.stepUp': '{axis} 加 1',
  'playground.overlapWarning': '有 {count} 個元件重疊，請調整擺放位置。',
  'playground.parameters.title': '參數',
  'playground.colors.title': '顏色',
  'playground.export.step': '下載 STEP',
  'playground.export.stl': '下載 STL',
  'playground.export.working': '匯出中……',
  'playground.worker.initializing': 'CAD Worker 初始化中……',
  'workspace.downloadSettings': '下載設定檔',
  'diagnostic.stlMetadataInvalid': 'STL 匯出資料不正確，請重試。',
  'diagnostic.stlExportFailed': 'STL 匯出失敗，請重試。',
  'diagnostic.threeMfMetadataInvalid': '3MF 匯出資料不正確，請重試。',
  'diagnostic.threeMfExportFailed': '3MF 匯出失敗，請重試。',
  'diagnostic.opengridUnsupported':
    'OpenGrid 參數與目前規格不相容，請檢查設定後重試。',
  'diagnostic.cylinderParametersInvalid':
    'OpenGrid 可堆疊圓柱參數無效，請檢查內徑與高度。',
  'diagnostic.opengridQualityInvalid':
    'OpenGrid 幾何未通過品質檢查，請調整參數後重試。',
  'diagnostic.opengridHoneycombMemoryLimit':
    '此尺寸的省料模式蜂巢數量超過瀏覽器幾何引擎記憶體上限，請降低尺寸或高度後重試。',
  'diagnostic.honeycombMemoryLimit':
    '此尺寸的 OpenGrid 開放層架省料模式超過預設保護門檻，請縮小尺寸或關閉省料模式。',
  'diagnostic.cylinderQualityInvalid':
    'OpenGrid 可堆疊圓柱幾何未通過品質檢查，請調整參數後重試。',
  'diagnostic.snapQualityInvalid':
    'OpenGrid Snap 幾何未通過品質檢查，請調整參數後重試。',
  'diagnostic.wallCoverQualityInvalid':
    'OpenGrid Wall Cover 幾何未通過品質檢查，請重試。',
  'diagnostic.wallCoverGlyphUnsupported':
    '輸入文字有字元無法由預設字體建立，請更換文字後重試。',
  'diagnostic.wallCoverFontLoadFailed':
    'OpenGrid Wall Cover 預設字體載入失敗，請重新整理後重試。',
  'diagnostic.labelCardGlyphUnsupported':
    '標籤文字有字元無法由預設字體建立，請更換文字後重試。',
  'diagnostic.labelCardFontLoadFailed':
    'OpenGrid 標籤卡扣預設字體載入失敗，請重新整理後重試。',
  'diagnostic.labelCardIconUnknown': 'Icon 選擇無效，請重新選擇。',
  'diagnostic.labelCardIconGeometryFailed':
    'Icon 幾何建立失敗，請更換 Icon 後重試。',
  'diagnostic.labelCardQualityInvalid':
    'OpenGrid 標籤卡幾何未通過品質檢查，請重試。',
  'diagnostic.dividerQualityInvalid':
    'OpenGrid 分隔器幾何未通過品質檢查，請調整參數後重試。',
  'diagnostic.dividerHoneycombMemoryLimit':
    '此尺寸的 OpenGrid 分隔牆省料模式蜂巢數量超過保護上限，請縮小尺寸或關閉省料模式。',
  'diagnostic.openConnectOrganizerQualityInvalid':
    'OpenGrid OpenConnect 壁掛收納件未通過單一實體與接孔品質檢查，請調整參數後重試。',
  'diagnostic.browserEnvironmentRequired':
    '需要瀏覽器環境才能使用 CAD workspace。',
  'diagnostic.webAssemblyUnsupported': '此瀏覽器不支援 WebAssembly。',
  'diagnostic.workerUnsupported': '此瀏覽器不支援 Web Worker。',
  'diagnostic.webglUnsupported': '此瀏覽器不支援 WebGL。',
  'diagnostic.exportInvalid': '匯出檔案驗證失敗，請重試。',
  'diagnostic.stlExportTimeout': 'STL 匯出超時，請重試。',
  'diagnostic.stepExportTimeout': 'STEP 匯出超時，請重試。',
  'diagnostic.threeMfExportTimeout': '3MF 匯出超時，請重試。',
  'diagnostic.engineTimeout': 'CAD engine 載入超時，請重試。',
  'diagnostic.workerTimeout': 'CAD Worker 處理超時，請重試。',
  'diagnostic.meshInvalid': '預覽模型資料無效，Worker 將重新啟動。',
  'diagnostic.staleGeneration': '這次建模已被較新的輸入取代。',
  'validation.invalid': '{field} 輸入無效，請檢查參數後重試。',
  'validation.wallCoverTextRequired': '{field} 至少需要 1 個字元。',
  'validation.wallCoverTextTooLong': '{field} 不可超過 {max} 個字元。',
  'validation.labelCardStackedSingleRow': 'icon 上／文字下版式只支援一排文字。',
  'validation.labelCardStackedNeedsIcon':
    'icon 上／文字下版式需要選擇一個 icon。',
  'validation.labelCardStackedHeight':
    'icon 尺寸加文字高度超出卡片可用高度，請縮小 icon 或文字。',
  'validation.labelGridUnitsInvalid': '標籤格數必須是 1 至 10 的整數。',
  'validation.labelCardTextTooWide':
    '文字超出卡片可用寬度，請縮短文字或增加格數。',
  'validation.labelCardScrewTooWide':
    '螺絲側視圖與規格文字超出卡片可用寬度，請增加卡片寬度或縮短螺絲長度。',
  'validation.labelSlotDoesNotFit':
    '卡槽超出正面可用寬度或高度，請減少標籤格數、增加本體尺寸或關閉卡槽。',
  'validation.labelCardWidthTierInvalid': '{field} 必須是 {values} 之一。',
  'validation.labelCardStyleInvalid': '{field} 必須是齊平或凸起。',
  'validation.labelCardIconUnknown': '{field} 不在內建 icon 集內。',
  'validation.labelCardTextTooLong': '{field} 不可超過 {max} 個字元。',
  'validation.parameter': '參數',
  'validation.invalidNumber': '{field} 必須是有效數字。',
  'validation.requiredDimension': '{axis} 尺寸不可空白。',
  'validation.positiveDimension': '{axis} 尺寸必須大於 0 mm。',
  'validation.minimumGridDimension':
    '{axis} 目標至少需要 {minimum} mm 才能放入一格。',
  'validation.maximumGridDimension': '{axis} 目標不可超過 {maximum} mm。',
  'validation.noPrintPlan': '無法建立可列印的 OpenGrid 分片方案。',
  'cad.progress.aria': 'CAD 載入進度',
  'cad.progress.title': '處理進度',
  'cad.progress.step': '{label}，第 {step} / {total} 階段',
  'cad.progress.count': '{label}，{count}',
  'cad.progress.boolean': '{value}，{detail}',
  'cad.progress.withDetail': '{value}，{detail}',
  'cad.progress.elapsed.building': '建模總計已耗時 {elapsed}',
  'cad.progress.elapsed.meshing': 'mesh 階段已耗時 {elapsed}',
  'cad.progress.stage.loading.label': '載入 CAD engine',
  'cad.progress.stage.loading.message': '正在載入 CAD engine…',
  'cad.progress.stage.building.label': '建立 B-Rep',
  'cad.progress.stage.building.message': '正在建立 B-Rep…',
  'cad.progress.stage.meshing.label': '產生預覽 mesh',
  'cad.progress.stage.meshing.message': '正在產生預覽 mesh…',
  'cad.progress.stage.exporting.label': '匯出中',
  'cad.progress.stage.exporting.message': '正在匯出模型…',
  'cad.progress.unit.cells': '格',
  'cad.progress.unit.batches': '批次',
  'cad.progress.unit.steps': '步驟',
  'cad.progress.unit.columns': '支',
  'cad.progress.unit.faces': '面',
  'cad.progress.boolean.fuse': '合併（Fuse）',
  'cad.progress.boolean.cut': '切除（Cut）',
  'cad.progress.boolean.intersect': '交集（Intersect）',
  'cad.progress.remaining': '剩餘 {remaining}',
  'cad.progress.running': '進行中',
  'viewport.colors.title': '模型配色',
  'viewport.colors.scope': '所有元件共用，自動儲存在此瀏覽器。',
  'viewport.colors.primary': '主色',
  'viewport.colors.secondary': '副色',
  'viewport.colors.secondaryHint':
    '副色用於文字、邊框等雙色部件。配色也會帶入 3MF。',
  'viewport.colors.swap': '交換主副色',
  'viewport.colors.reset': '恢復預設配色',
  'cad.viewport.aria': '3D CAD 預覽',
  'cad.viewport.webglUnsupported': '無法建立 3D 預覽，請確認瀏覽器支援 WebGL。',
  'cad.viewport.empty': '尚未有可預覽的模型。',
  'cad.viewport.stale': '預覽與目前輸入不同步',
  'viewport.dimension.width': '寬度',
  'viewport.dimension.depth': '深度',
  'viewport.dimension.height': '高度',
  'viewport.faceHover.aria': '游標所在面的 X、Y、Z 佔用範圍',
  'validation.labelCardTwoRowHeight': '兩排文字時，每排高度最多 4 mm。',
}

export const en: { [Key in keyof typeof zh]: string } = {
  'cad.attribution.tissueBox.modified':
    'This parametric tissue holder integrates the oriented OpenConnect locked socket with upward-tilted support, bottom dispensing slot and optional perforated side walls and bottom.',
  'cad.currentlyEditing': 'Editing: {name}',
  'cad.pageTitle': '{name} CAD workspace | Shape Shortcut',
  'cad.staticSummary': 'Model summary',
  'cad.parametersHeading': 'Adjustable parameters and constraints',
  'cad.fixedParameters':
    'This model uses fixed geometry and has no adjustable parameters.',
  'cad.exportFormats': 'Available export format: STL.',
  'cad.attribution.heading': 'Source and licensing',
  'cad.attribution.opengrid.summary':
    'This OpenGrid Board uses the following upstream attribution and licensing information.',
  'cad.attribution.opengrid.credits': 'Upstream authors:',
  'cad.attribution.snap.summary':
    'This OpenGrid Snap generator uses the following OpenGrid and OpenConnect upstream attribution and licensing information.',
  'cad.attribution.snap.credits': 'Upstream authors:',
  'cad.attribution.openConnectShelf.summary':
    'This generator uses the OpenGrid interface and locked OpenConnect socket geometry.',
  'cad.attribution.openConnectShelf.credits': 'Original system authors:',
  'cad.attribution.author.designRole': 'design',
  'cad.attribution.author.openScadRole': 'OpenSCAD',
  'cad.attribution.author.openConnectRole': 'OpenConnect design and OpenSCAD',
  'cad.attribution.author.openConnectProjectRole': 'OpenConnect project',
  'cad.attribution.snap.modified':
    "`snap-half` and `snap-quarter` are modified derivatives of the original Snap design. The OpenConnect head and underside interface notch are derived from mitufy's OpenConnect system under CC BY 4.0.",
  'cad.attribution.openConnectShelf.modified':
    'The generator uses the supplied locked-socket STEP as a subtractive template and builds the OpenGrid Full shelf, support structure, and print orientation natively.',
  'cad.attribution.openConnectOrganizer.modified':
    'The generator uses the supplied locked-socket STEP as a subtractive template and natively builds the one-piece organizer body, user-facing cavity tilt, and integrated rear female interface parallel to the wall.',
  'cad.attribution.licenseLabel': 'Licenses',
  'cad.attribution.sourceCodeLicense': 'Upstream source code: CC BY-NC-SA 4.0',
  'cad.attribution.derivedPartsLicense': 'Derived/generated parts: CC BY 4.0',
  'cad.attribution.openConnectLicense':
    'OpenConnect source and interface geometry: CC BY 4.0',
  'cad.attribution.openConnectSocketLicense':
    'OpenConnect source and locked-socket geometry: CC BY 4.0',
  'cad.attribution.note':
    'This information documents the upstream authors, code, and derived-part licenses; it does not grant Shape Shortcut additional rights to the upstream code or other models.',
  'cad.loading': 'Loading {name} CAD workspace',
  'cad.requirements':
    'JavaScript, WebAssembly, Web Worker, and WebGL are required for the interactive preview.',
  'cad.selectModel.title': 'Choose a CAD model first',
  'cad.selectModel.description':
    'The CAD workspace requires a model before it can open.',
  'cad.selectModel.link': 'Back to model selection →',
  'unit.mm': 'mm',
  'unit.degree': '°',
  'unit.grid': 'cells',
  'unit.count': 'columns',
  'cad.cylinder.topRimEnabled': 'Two-color accent rim',
  'cad.cylinder.topRimHeight': 'Accent rim height',
  'cad.action.step': 'Download STEP',
  'cad.action.stl': 'Download STL',
  'cad.action.threeMf': 'Download 3MF',
  'cad.wallCover.threeMfNote': 'The two-color effect is available only in 3MF.',
  'cad.labelCard.threeMfNote': 'The two-color effect is available only in 3MF.',
  'cad.action.retry': 'Retry',
  'cad.system.current': 'Current system: {name}',
  'cad.error.title.initializing': 'CAD engine failed to load',
  'cad.error.title.exporting': 'CAD export failed',
  'cad.error.title.worker': 'CAD Worker error',
  'cad.error.title.default': 'Model generation failed',
  'cad.error.close': 'Close error notification',
  'cad.error.reason': 'Reason: {message}',
  'cad.error.unknown': 'The CAD session encountered an unexpected error.',
  'diagnostic.unknown':
    'The CAD input is invalid. Check the parameters and try again.',
  'diagnostic.unexpected': 'The CAD session encountered an unexpected error.',
  'diagnostic.modelBuildFailed':
    'Model generation failed. Adjust the parameters and try again.',
  'diagnostic.protocolInvalid':
    'The CAD Worker message is invalid. Reload and try again.',
  'diagnostic.workerTerminated': 'The CAD Worker stopped. Try again.',
  'diagnostic.sceneFileMalformed':
    'The scene file is malformed and cannot be imported.',
  'diagnostic.sceneFileUnsupportedVersion':
    'The scene file version is not supported. Update the file and import again.',
  'diagnostic.sceneUnknownModel':
    'The scene file contains an unknown model: {modelId}.',
  'diagnostic.sceneInstanceInvalidParameters':
    'The parameters for {modelId} in the scene file are invalid. Import canceled.',
  'diagnostic.sceneInvalidPlacement': 'The placement is invalid.',
  'diagnostic.sceneTooManyInstances':
    'A scene holds at most {max} components; the limit was exceeded.',
  'playground.title': 'OpenGrid Playground Planner',
  'playground.viewMode.title': 'Scene orientation',
  'playground.camera.reset': 'Reset view',
  'playground.grid.title': 'Grid cells',
  'playground.grid.axisX': 'Grid cells X',
  'playground.grid.axisY': 'Grid cells Y',
  'playground.viewMode.desktop': 'Desktop',
  'playground.viewMode.wall': 'Wall',
  'playground.entry': 'Open the Playground planner',
  'playground.description':
    'Place multiple components in one 3D scene, arrange them on the OpenGrid grid, tune parameters and colors, and export STEP/STL per piece. Scenes render as planning-grade proxies; inspect details in each component workspace.',
  'playground.loading': 'Loading the playground',
  'playground.addComponent': 'Add a component to the scene',
  'playground.chooseModel': 'Choose a model',
  'playground.add': 'Add',
  'playground.empty':
    'The scene is empty. Pick a model and press "Add" to start planning.',
  'playground.scene.import': 'Import scene file',
  'playground.scene.export': 'Download scene file',
  'playground.instance.label': 'Label (optional, used in export names)',
  'playground.instance.labelPlaceholder': 'e.g. bottom left',
  'playground.instance.duplicate': 'Duplicate',
  'playground.instance.delete': 'Delete',
  'playground.instance.retry': 'Retry',
  'playground.instance.failed': 'This component failed to generate.',
  'playground.instance.editorHint':
    'Use the "{name}" workspace for advanced settings and detailed previews.',
  'playground.placement.title': 'Placement (grid cells)',
  'playground.placement.cellX': 'X',
  'playground.placement.cellY': 'Y',
  'playground.placement.rotation': 'Rotation',
  'playground.placement.stepDown': 'Decrease {axis} by 1',
  'playground.placement.stepUp': 'Increase {axis} by 1',
  'playground.overlapWarning':
    '{count} instance(s) overlap; adjust their placements.',
  'playground.parameters.title': 'Parameters',
  'playground.colors.title': 'Colors',
  'playground.export.step': 'Download STEP',
  'playground.export.stl': 'Download STL',
  'playground.export.working': 'Exporting…',
  'playground.worker.initializing': 'Initializing the CAD Worker…',
  'workspace.downloadSettings': 'Download settings file',
  'diagnostic.stlMetadataInvalid':
    'The STL export metadata is invalid. Try again.',
  'diagnostic.stlExportFailed': 'The STL export failed. Try again.',
  'diagnostic.threeMfMetadataInvalid':
    'The 3MF export metadata is invalid. Try again.',
  'diagnostic.threeMfExportFailed': 'The 3MF export failed. Try again.',
  'diagnostic.opengridUnsupported':
    'The OpenGrid parameters are incompatible with the current specification. Check the settings and try again.',
  'diagnostic.cylinderParametersInvalid':
    'The OpenGrid stackable-cylinder parameters are invalid. Check the inner diameter and height.',
  'diagnostic.opengridQualityInvalid':
    'The OpenGrid geometry did not pass quality checks. Adjust the parameters and try again.',
  'diagnostic.opengridHoneycombMemoryLimit':
    'This honeycomb saving-mode box exceeds the browser geometry engine memory budget. Reduce the footprint or height and try again.',
  'diagnostic.honeycombMemoryLimit':
    'This OpenGrid Open Shelf saving-mode model exceeds the configured safety limit. Reduce the footprint or turn off the saving mode.',
  'diagnostic.cylinderQualityInvalid':
    'The OpenGrid stackable-cylinder geometry did not pass quality checks. Adjust the parameters and try again.',
  'diagnostic.snapQualityInvalid':
    'The OpenGrid Snap geometry did not pass quality checks. Adjust the parameters and try again.',
  'diagnostic.wallCoverQualityInvalid':
    'The OpenGrid Wall Cover geometry did not pass quality checks. Try again.',
  'diagnostic.wallCoverGlyphUnsupported':
    'A character cannot be built with the default font. Choose different text and try again.',
  'diagnostic.wallCoverFontLoadFailed':
    'The OpenGrid Wall Cover default font could not be loaded. Reload and try again.',
  'diagnostic.labelCardGlyphUnsupported':
    'A label character cannot be built with the default font. Choose different text and try again.',
  'diagnostic.labelCardFontLoadFailed':
    'The OpenGrid Label Card default font could not be loaded. Reload and try again.',
  'diagnostic.labelCardIconUnknown':
    'The selected icon is invalid. Choose a different icon.',
  'diagnostic.labelCardIconGeometryFailed':
    'The icon geometry could not be built. Choose a different icon and try again.',
  'diagnostic.labelCardQualityInvalid':
    'The OpenGrid Label Card geometry did not pass quality checks. Try again.',
  'diagnostic.dividerQualityInvalid':
    'The OpenGrid divider geometry did not pass quality checks. Adjust the parameters and try again.',
  'diagnostic.dividerHoneycombMemoryLimit':
    'This OpenGrid Divider saving-mode model exceeds the configured cell limit. Reduce the size or turn off the saving mode.',
  'diagnostic.openConnectOrganizerQualityInvalid':
    'The OpenGrid OpenConnect wall organizer did not pass its single-solid and socket quality checks. Adjust the parameters and try again.',
  'diagnostic.browserEnvironmentRequired':
    'A browser environment is required for the CAD workspace.',
  'diagnostic.webAssemblyUnsupported':
    'This browser does not support WebAssembly.',
  'diagnostic.workerUnsupported': 'This browser does not support Web Workers.',
  'diagnostic.webglUnsupported': 'This browser does not support WebGL.',
  'diagnostic.exportInvalid': 'The export file failed validation. Try again.',
  'diagnostic.stlExportTimeout': 'The STL export timed out. Try again.',
  'diagnostic.stepExportTimeout': 'The STEP export timed out. Try again.',
  'diagnostic.threeMfExportTimeout': 'The 3MF export timed out. Try again.',
  'diagnostic.engineTimeout':
    'The CAD engine timed out while loading. Try again.',
  'diagnostic.workerTimeout': 'The CAD Worker timed out. Try again.',
  'diagnostic.meshInvalid':
    'The preview model data is invalid. The Worker will restart.',
  'diagnostic.staleGeneration': 'This build was superseded by newer input.',
  'validation.invalid':
    '{field} is invalid. Check the parameter and try again.',
  'validation.wallCoverTextRequired': '{field} requires at least 1 character.',
  'validation.wallCoverTextTooLong': '{field} cannot exceed {max} characters.',
  'validation.labelCardStackedSingleRow':
    'The icon-above-text layout supports a single text row.',
  'validation.labelCardStackedNeedsIcon':
    'The icon-above-text layout requires selecting an icon.',
  'validation.labelCardStackedHeight':
    'Icon size plus text height exceeds the usable card height. Shrink the icon or the text.',
  'validation.labelGridUnitsInvalid':
    'Label units must be a whole number from 1 to 10.',
  'validation.labelCardTextTooWide':
    'Text exceeds the usable card width. Shorten the text or increase label units.',
  'validation.labelCardScrewTooWide':
    'The real-scale screw side view and designation exceed the usable card width. Increase the card width or shorten the screw length.',
  'validation.labelSlotDoesNotFit':
    'The slot exceeds the flat front width or height. Reduce label units, enlarge the organizer, or disable the slot.',
  'validation.labelCardWidthTierInvalid': '{field} must be one of {values}.',
  'validation.labelCardStyleInvalid': '{field} must be flat or raised.',
  'validation.labelCardIconUnknown':
    '{field} is not part of the built-in icon set.',
  'validation.labelCardTextTooLong': '{field} cannot exceed {max} characters.',
  'validation.parameter': 'Parameter',
  'validation.invalidNumber': '{field} must be a valid number.',
  'validation.requiredDimension': '{axis} dimension is required.',
  'validation.positiveDimension': '{axis} dimension must be greater than 0 mm.',
  'validation.minimumGridDimension':
    '{axis} must be at least {minimum} mm to fit one grid cell.',
  'validation.maximumGridDimension': '{axis} cannot exceed {maximum} mm.',
  'validation.noPrintPlan':
    'A printable OpenGrid piece plan could not be created.',
  'cad.progress.aria': 'CAD loading progress',
  'cad.progress.title': 'Progress',
  'cad.progress.step': '{label}, stage {step} of {total}',
  'cad.progress.count': '{label}, {count}',
  'cad.progress.boolean': '{value}, {detail}',
  'cad.progress.withDetail': '{value}, {detail}',
  'cad.progress.elapsed.building': 'Total build time: {elapsed}',
  'cad.progress.elapsed.meshing': 'Mesh time: {elapsed}',
  'cad.progress.stage.loading.label': 'Load CAD engine',
  'cad.progress.stage.loading.message': 'Loading CAD engine…',
  'cad.progress.stage.building.label': 'Build B-Rep',
  'cad.progress.stage.building.message': 'Building B-Rep…',
  'cad.progress.stage.meshing.label': 'Generate preview mesh',
  'cad.progress.stage.meshing.message': 'Generating preview mesh…',
  'cad.progress.stage.exporting.label': 'Exporting',
  'cad.progress.stage.exporting.message': 'Exporting model…',
  'cad.progress.unit.cells': 'cells',
  'cad.progress.unit.batches': 'batches',
  'cad.progress.unit.steps': 'steps',
  'cad.progress.unit.columns': 'columns',
  'cad.progress.unit.faces': 'faces',
  'cad.progress.boolean.fuse': 'Fuse',
  'cad.progress.boolean.cut': 'Cut',
  'cad.progress.boolean.intersect': 'Intersect',
  'cad.progress.remaining': '{remaining} remaining',
  'cad.progress.running': ' in progress',
  'viewport.colors.title': 'Model colors',
  'viewport.colors.scope': 'Shared by all components. Saved in this browser.',
  'viewport.colors.primary': 'Primary',
  'viewport.colors.secondary': 'Secondary',
  'viewport.colors.secondaryHint':
    'Secondary colors text, rims, and other accent parts. Colors are included in 3MF exports.',
  'viewport.colors.swap': 'Swap colors',
  'viewport.colors.reset': 'Reset colors',
  'cad.viewport.aria': '3D CAD preview',
  'cad.viewport.webglUnsupported':
    'Unable to create a 3D preview. Check that the browser supports WebGL.',
  'cad.viewport.empty': 'No model preview is available yet.',
  'cad.viewport.stale': 'Preview is out of sync with the current input',
  'viewport.dimension.width': 'Width',
  'viewport.dimension.depth': 'Depth',
  'viewport.dimension.height': 'Height',
  'viewport.faceHover.aria': 'X, Y and Z extent of the face under the pointer',
  'validation.labelCardTwoRowHeight':
    'With two text rows, each row can be at most 4 mm high.',
}
