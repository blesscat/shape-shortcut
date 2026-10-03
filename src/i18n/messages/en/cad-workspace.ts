// English messages. Keys must mirror zh-Hant; parity is enforced in ./index.ts via the mapped type.
// Domain: cad-workspace

export const messages = {
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
  'cad.drawer.title': 'Parameters',
  'cad.drawer.open': 'Open parameter drawer',
  'cad.drawer.close': 'Close parameter drawer',
  'cad.drawer.status.stale': 'Preview is out of sync with the current input',
  'cad.drawer.status.invalid': 'Parameters need attention',
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
  'playground.drawer.title': 'Scene panel',
  'playground.drawer.open': 'Open scene panel',
  'playground.drawer.close': 'Close scene panel',
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
