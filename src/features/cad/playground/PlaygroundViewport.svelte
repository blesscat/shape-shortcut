<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import * as THREE from 'three'
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
  import type { MeshSnapshot } from '../../../cad-contract/messages'
  import type {
    ModelBounds,
    ModelId,
    ModelParameterValues,
  } from '../../../cad-contract/units'
  import {
    PLAYGROUND_GRID_PITCH,
    type ScenePlacement,
  } from '../../../cad-contract/scene'
  import { createViewportBaseGeometry } from '../viewport/base-geometry'
  import {
    observeCadViewportTheme,
    readCadViewportTheme,
    type CadViewportTheme,
  } from '../viewport/theme'
  import {
    CAD_VIEWPORT_CAMERA,
    CAD_VIEWPORT_GRID_ROTATION,
  } from '../viewport/coordinates'
  import {
    CAD_VIEWPORT_CONFIG,
    CAD_VIEWPORT_LIGHTING,
  } from '../viewport/config'
  import {
    createBoardContactShadowGeometry,
    createBoardSurfaceGroup,
    createContactShadowMaterial,
    createErrorHatchMaterial,
    isBoardSubstrateModel,
  } from '../viewport/board-parts'
  import { getModelDefinition } from '../model-catalog'
  import { sceneProxyCacheKey } from './filenames'
  import { instanceDisplayColor } from './instance-colors'
  import type { PlaygroundViewMode } from './store'
  import {
    wallDisplayPlanFor,
    wallDisplayRotationMatrix,
    wallDisplayTranslationFor,
    wallMountPlacementFor,
    wallReadyBoundsFor,
    wallSocketAnchorFor,
    withWallDisplayRotation,
    type WallMountPlacement,
  } from './wall-display'
  import { translate, type Locale } from '../../../i18n'
  import {
    defaultPlaygroundCameraPose,
    loadPlaygroundCameraState,
    playgroundCameraFarPlane,
    PLAYGROUND_CAMERA_MIN_FAR,
    savePlaygroundCameraState,
    type PlaygroundCameraPose,
  } from './camera-pose'
  import {
    gridPointFromWorld,
    snappedPlacementForDrag,
    type PlaygroundGridPoint,
  } from './drag-placement'

  type PlaygroundViewportInstance = {
    id: string
    name: string
    modelId: ModelId
    parameters: ModelParameterValues
    mesh: MeshSnapshot | null
    bounds: ModelBounds | null
    placement: ScenePlacement | null
    colorPrimary: string
    meshState: 'pending' | 'ready' | 'failed'
    /** Derived footprint-overlap flag; renders with the conflict color. */
    overlapping: boolean
  }

  type Props = {
    instances: ReadonlyArray<PlaygroundViewportInstance>
    selectedInstanceId: string | null
    viewMode: PlaygroundViewMode
    gridSize: { x: number; y: number }
    locale: Locale
    onSelect: (instanceId: string | null) => void
    onValidatePlacement: (
      instanceId: string,
      placement: ScenePlacement,
    ) => boolean
    onCommitPlacement: (instanceId: string, placement: ScenePlacement) => void
  }

  let {
    instances,
    selectedInstanceId,
    viewMode,
    gridSize,
    locale,
    onSelect,
    onValidatePlacement,
    onCommitPlacement,
  }: Props = $props()

  let cameraState = loadPlaygroundCameraState()
  let cameraPoseIsCustom = $state(false)
  let cameraInteractionActive = $state(false)
  let pendingCameraMode: PlaygroundViewMode | null = $state(null)
  let renderedCameraPose: PlaygroundCameraPose | null = $state(null)

  let container: HTMLDivElement | undefined = $state()
  let observedTheme = $state<CadViewportTheme>(readCadViewportTheme())
  let hoveredInstanceId: string | null = $state(null)
  let pointerX = $state(0)
  let pointerY = $state(0)

  type PointerPress = {
    pointerId: number
    pointerType: string
    startClientX: number
    startClientY: number
    instanceId: string | null
    originalPlacement: ScenePlacement | null
    startGridPoint: PlaygroundGridPoint | null
  }

  type DragPreview = {
    instanceId: string
    placement: ScenePlacement
    valid: boolean
  }

  type SuspendedControlState = {
    enableRotate: boolean
    enablePan: boolean
    enableZoom: boolean
  }

  let pointerPress = $state<PointerPress | null>(null)
  let dragPreview = $state<DragPreview | null>(null)
  let suspendedControlState: SuspendedControlState | null = null

  type InstancedEntry = {
    instanceId: string
    modelId: string
    colorHex: string
    matrix: THREE.Matrix4
    overlapping: boolean
  }

  type InstancedGroup = {
    cacheKey: string
    mesh: THREE.InstancedMesh
    material: THREE.MeshStandardMaterial
    entries: InstancedEntry[]
  }

  /** Board-only extras shared by every instance of one model group. */
  type BoardSharedAssets = {
    edgesGeometry: THREE.EdgesGeometry
    shadowGeometry: THREE.PlaneGeometry
    edgesMaterial: THREE.LineBasicMaterial
    shadowMaterial: THREE.MeshBasicMaterial
  }

  let renderer: THREE.WebGLRenderer | null = null
  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let controls: OrbitControls | null = null
  let controlStartPose: PlaygroundCameraPose | null = null
  let contentGroup: THREE.Group | null = null
  let grid: THREE.Group | null = null

  /** Rectangular cell grid centered on the origin, in the plane of `mode`.
      The Part D v2 planning surface (board face + outline + contact shadow)
      rides along in the same group so it inherits the mode rotation. */
  function buildGridLines(
    theme: CadViewportTheme,
    cellsX: number,
    cellsY: number,
    mode: PlaygroundViewMode,
  ): THREE.Group {
    const pitch = PLAYGROUND_GRID_PITCH
    const sizeX = cellsX * pitch
    const sizeY = cellsY * pitch
    const minor: number[] = []
    const major: number[] = []
    for (let i = 0; i <= cellsX; i += 1) {
      const x = -sizeX / 2 + i * pitch
      const target = i === 0 || i === cellsX ? major : minor
      target.push(x, 0, -sizeY / 2, x, 0, sizeY / 2)
    }
    for (let j = 0; j <= cellsY; j += 1) {
      const z = -sizeY / 2 + j * pitch
      const target = j === 0 || j === cellsY ? major : minor
      target.push(-sizeX / 2, 0, z, sizeX / 2, 0, z)
    }
    const group = new THREE.Group()
    group.add(
      createBoardSurfaceGroup(sizeX, sizeY, {
        boardFace: theme.boardFace,
        boardEdge: theme.boardEdge,
        contactShadow: theme.contactShadow,
      }),
    )
    const addLines = (points: number[], color: string) => {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(points, 3),
      )
      group.add(
        new THREE.LineSegments(
          geometry,
          new THREE.LineBasicMaterial({ color: new THREE.Color(color) }),
        ),
      )
    }
    addLines(minor, theme.gridMinor)
    addLines(major, theme.gridMajor)
    if (mode === 'desktop') {
      group.rotation.set(...CAD_VIEWPORT_GRID_ROTATION)
    }
    return group
  }

  function disposeGrid(target: THREE.Group): void {
    target.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry.dispose()
        ;(child.material as THREE.Material).dispose()
      }
    })
  }

  /**
   * Remove and dispose the scene marking assets: board edge lines and
   * contact shadows (Part D v2 board trio) plus the overlap hatch overlays.
   * Overlay meshes reference cached group geometry, so only materials and
   * the board-only geometries are disposed here.
   */
  function disposeOverlayAssets(): void {
    if (contentGroup) {
      for (const edges of boardEdgeLines) contentGroup.remove(edges)
      for (const shadow of boardShadows) contentGroup.remove(shadow)
      for (const overlay of overlapOverlays) contentGroup.remove(overlay)
    }
    for (const shared of boardSharedAssets) {
      shared.edgesGeometry.dispose()
      shared.shadowGeometry.dispose()
      shared.edgesMaterial.dispose()
      shared.shadowMaterial.dispose()
    }
    for (const material of overlapHatchMaterials) material.dispose()
    boardEdgeLines = []
    boardShadows = []
    overlapOverlays = []
    boardSharedAssets = []
    overlapHatchMaterials = []
  }
  let frameHandle = 0
  let resizeObserver: ResizeObserver | null = null
  let unobserveTheme: (() => void) | null = null
  const geometryCache = new Map<string, THREE.BufferGeometry>()
  let instancedGroups: InstancedGroup[] = []
  let boardEdgeLines: THREE.LineSegments[] = []
  let boardShadows: THREE.Mesh[] = []
  let overlapOverlays: THREE.Mesh[] = []
  let boardSharedAssets: BoardSharedAssets[] = []
  let overlapHatchMaterials: THREE.MeshBasicMaterial[] = []
  let placeholderMeshes: THREE.Mesh[] = []
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const projectedWorldPoint = new THREE.Vector3()
  const desktopDragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const wallDragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

  let appliedViewMode: PlaygroundViewMode | null = null
  const CAMERA_POSE_CHANGE_EPSILON = 0.000001
  const CLICK_DRAG_THRESHOLD_PX = 5

  const THEME_FIELDS: ReadonlyArray<keyof CadViewportTheme> = [
    'background',
    'gridMajor',
    'gridMinor',
    'gizmoBackground',
    'gizmoX',
    'gizmoY',
    'gizmoZ',
    'gizmoLabel',
    'edge',
    'annotation',
    'annotationLabel',
    'hover',
    'selection',
    'selectionFill',
    'error',
    'errorFill',
    'faceHighlight',
    'hemisphereSky',
    'hemisphereGround',
    'keyLight',
    'oppositeFill',
    'boardFace',
    'boardEdge',
    'contactShadow',
  ]

  function sameTheme(a: CadViewportTheme, b: CadViewportTheme): boolean {
    return THEME_FIELDS.every((field) => a[field] === b[field])
  }

  function matrixFromWallPlacement(
    placement: WallMountPlacement,
  ): THREE.Matrix4 {
    const [tx, ty, tz] = placement.translation
    const orientation = placement.orientation
    return new THREE.Matrix4().set(
      orientation[0],
      orientation[1],
      orientation[2],
      tx,
      orientation[3],
      orientation[4],
      orientation[5],
      ty,
      orientation[6],
      orientation[7],
      orientation[8],
      tz,
      0,
      0,
      0,
      1,
    )
  }

  function matrixFor(
    instance: PlaygroundViewportInstance,
    mode: PlaygroundViewMode,
  ): THREE.Matrix4 {
    const rotation = instance.placement?.rotation ?? 0
    const anchorX = (instance.placement?.cellX ?? 0) * PLAYGROUND_GRID_PITCH
    const anchorY = (instance.placement?.cellY ?? 0) * PLAYGROUND_GRID_PITCH
    const bounds = instance.bounds
    const matrix = new THREE.Matrix4()
    if (mode === 'wall') {
      const plan = wallDisplayPlanFor(getModelDefinition(instance.modelId))
      if (plan) {
        // Print-frame-authored piece: rotate into the installed orientation
        // first (OpenConnect face toward the board, openings up), then mount
        // with the same protrusion-toward-+Y convention. Translation uses the
        // wall-ready footprint so render, occupancy, and placeholders agree;
        // the socket grid anchors the placement cell when declared.
        const wallBounds = wallReadyBoundsFor(plan, instance.parameters)
        const socketAnchor = wallSocketAnchorFor(plan, instance.parameters)
        const mount = withWallDisplayRotation(
          wallMountPlacementFor(
            wallBounds,
            {
              cellX: instance.placement?.cellX ?? 0,
              cellY: instance.placement?.cellY ?? 0,
              rotation,
            },
            socketAnchor,
          ),
          wallDisplayRotationMatrix(plan, instance.parameters),
          wallDisplayTranslationFor(plan, instance.parameters),
        )
        return matrixFromWallPlacement(mount)
      }
      // Mount the authored piece (base plane Z=0, protrusion +Z) onto the
      // vertical wall board: protrusion maps to world +Y, the footprint's
      // depth becomes the vertical span, and the placement rotation stays
      // in the wall plane.
      const swap = rotation === 90 || rotation === 270
      let width = 0
      let depth = 0
      if (bounds) {
        width = Math.abs(bounds.max[0] - bounds.min[0])
        depth = Math.abs(bounds.max[1] - bounds.min[1])
      }
      const wallWidth = swap ? depth : width
      const wallHeight = swap ? width : depth
      matrix.makeRotationX(-Math.PI / 2)
      matrix.multiply(
        new THREE.Matrix4().makeRotationZ((rotation * Math.PI) / 180),
      )
      matrix.setPosition(anchorX + wallWidth / 2, 0, anchorY + wallHeight / 2)
      return matrix
    }
    let offsetX = anchorX
    let offsetY = anchorY
    if (bounds) {
      const swap = rotation === 90 || rotation === 270
      const width = Math.abs(bounds.max[0] - bounds.min[0])
      const depth = Math.abs(bounds.max[1] - bounds.min[1])
      offsetX += (swap ? depth : width) / 2
      offsetY += (swap ? width : depth) / 2
    }
    matrix.makeRotationZ((rotation * Math.PI) / 180)
    matrix.setPosition(offsetX, offsetY, 0)
    return matrix
  }

  function displayColorFor(
    instanceId: string,
    colorHex: string,
    modelId: string,
    theme: CadViewportTheme,
  ): string {
    return instanceDisplayColor({
      dragPreviewActive: dragPreview?.instanceId === instanceId,
      dragPreviewValid: dragPreview?.valid ?? false,
      overlapping: instances.some(
        (instance) => instance.id === instanceId && instance.overlapping,
      ),
      emphasized:
        instanceId === selectedInstanceId || instanceId === hoveredInstanceId,
      // Board substrates rest on the Part D board-face token (4.2.1) so the
      // plate stays a visible step away from the scene ground; functional
      // states (drag preview, overlap conflict, selection) still outrank it.
      colorHex: isBoardSubstrateModel(modelId) ? theme.boardFace : colorHex,
      hoverColor: theme.hover,
      selectionColor: theme.selection,
      conflictColor: theme.error,
    })
  }

  function applyColors(theme: CadViewportTheme): void {
    for (const group of instancedGroups) {
      group.entries.forEach((entry, index) => {
        group.mesh.setColorAt(
          index,
          new THREE.Color(
            displayColorFor(
              entry.instanceId,
              entry.colorHex,
              entry.modelId,
              theme,
            ),
          ),
        )
      })
      if (group.mesh.instanceColor) group.mesh.instanceColor.needsUpdate = true
    }

    for (const placeholder of placeholderMeshes) {
      const instanceId = placeholder.userData.playgroundInstanceId
      const colorHex = placeholder.userData.playgroundColorHex
      const modelId = placeholder.userData.playgroundModelId
      if (
        typeof instanceId !== 'string' ||
        typeof colorHex !== 'string' ||
        typeof modelId !== 'string'
      ) {
        continue
      }
      const material = placeholder.material as THREE.MeshBasicMaterial
      material.color.set(displayColorFor(instanceId, colorHex, modelId, theme))
    }
  }

  function rebuildScene(theme: CadViewportTheme): void {
    if (!scene || !contentGroup) return
    for (const group of instancedGroups) {
      contentGroup.remove(group.mesh)
      group.mesh.dispose()
      group.material.dispose()
    }
    instancedGroups = []
    for (const placeholder of placeholderMeshes) {
      contentGroup.remove(placeholder)
      placeholder.geometry.dispose()
      ;(placeholder.material as THREE.Material).dispose()
    }
    placeholderMeshes = []
    disposeOverlayAssets()

    const ready = instances.filter(
      (instance) => instance.mesh && instance.meshState === 'ready',
    )
    const groups = new Map<
      string,
      { mesh: MeshSnapshot; entries: InstancedEntry[] }
    >()
    for (const instance of ready) {
      const cacheKey = sceneProxyCacheKey(instance.modelId, instance.parameters)
      const entry: InstancedEntry = {
        instanceId: instance.id,
        modelId: instance.modelId,
        colorHex: instance.colorPrimary,
        matrix: matrixFor(instance, viewMode),
        overlapping: instance.overlapping,
      }
      const existing = groups.get(cacheKey)
      if (existing) existing.entries.push(entry)
      else groups.set(cacheKey, { mesh: instance.mesh!, entries: [entry] })
    }
    for (const [cacheKey, group] of groups) {
      let geometry = geometryCache.get(cacheKey)
      if (!geometry) {
        geometry = createViewportBaseGeometry(group.mesh)
        geometryCache.set(cacheKey, geometry)
      }
      const material = new THREE.MeshStandardMaterial({
        metalness: 0.05,
        roughness: 0.6,
      })
      const instanced = new THREE.InstancedMesh(
        geometry,
        material,
        group.entries.length,
      )
      group.entries.forEach((entry, index) => {
        instanced.setMatrixAt(index, entry.matrix)
      })
      instanced.instanceMatrix.needsUpdate = true
      instanced.userData.cacheKey = cacheKey
      contentGroup.add(instanced)
      instancedGroups.push({
        cacheKey,
        mesh: instanced,
        material,
        entries: group.entries,
      })
      // Board substrates get the Part D v2 trio (design-spec-4.2.1): a
      // dedicated outline plus a contact shadow under the plate, so the
      // board reads even in a static light-mode scene.
      const boardModelId = group.entries[0]?.modelId
      if (boardModelId && isBoardSubstrateModel(boardModelId)) {
        const edgesGeometry = new THREE.EdgesGeometry(
          geometry,
          CAD_VIEWPORT_CONFIG.edgeThresholdAngle,
        )
        const shadowGeometry = createBoardContactShadowGeometry(geometry)
        const edgesMaterial = new THREE.LineBasicMaterial({
          color: new THREE.Color(theme.boardEdge),
        })
        const shadowMaterial = createContactShadowMaterial(theme.contactShadow)
        boardSharedAssets.push({
          edgesGeometry,
          shadowGeometry,
          edgesMaterial,
          shadowMaterial,
        })
        for (const entry of group.entries) {
          const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial)
          edges.matrixAutoUpdate = false
          edges.matrix.copy(entry.matrix)
          edges.renderOrder = 1
          contentGroup.add(edges)
          boardEdgeLines.push(edges)
          const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial)
          shadow.matrixAutoUpdate = false
          shadow.matrix.copy(entry.matrix)
          shadow.renderOrder = -1
          contentGroup.add(shadow)
          boardShadows.push(shadow)
        }
      }
    }
    // Overlap conflicts get the Part D v2 error hatch (+45°) on top of the
    // conflict-colored instance; the accompanying text warning lives in the
    // Playground panel, so the state never relies on color alone.
    if (
      instancedGroups.some((group) =>
        group.entries.some((entry) => entry.overlapping),
      )
    ) {
      const hatchMaterial = createErrorHatchMaterial(theme.error)
      overlapHatchMaterials.push(hatchMaterial)
      for (const group of instancedGroups) {
        for (const entry of group.entries) {
          if (!entry.overlapping) continue
          const overlay = new THREE.Mesh(group.mesh.geometry, hatchMaterial)
          overlay.matrixAutoUpdate = false
          overlay.matrix.copy(entry.matrix)
          overlay.renderOrder = 2
          overlay.userData.instanceId = entry.instanceId
          contentGroup.add(overlay)
          overlapOverlays.push(overlay)
        }
      }
    }
    for (const instance of instances) {
      if (instance.meshState !== 'pending' || !instance.bounds) continue
      const placement: ScenePlacement = {
        cellX: instance.placement?.cellX ?? 0,
        cellY: instance.placement?.cellY ?? 0,
        rotation: instance.placement?.rotation ?? 0,
        supportedBy: null,
      }
      const placeholderPlacement = wallPlaceholderPlacementFor(
        instance,
        placement,
      )
      const bounds = placeholderPlacement?.wallBounds ?? instance.bounds
      const geometry = new THREE.BoxGeometry(
        Math.max(bounds.max[0] - bounds.min[0], 1),
        Math.max(bounds.max[1] - bounds.min[1], 1),
        Math.max(bounds.max[2] - bounds.min[2], 1),
      )
      if (placeholderPlacement) {
        // Match the authored wall-ready frame so the mount-only matrix
        // places the box flush on the board and aligned with the cells.
        geometry.translate(
          (bounds.min[0] + bounds.max[0]) / 2,
          (bounds.min[1] + bounds.max[1]) / 2,
          (bounds.min[2] + bounds.max[2]) / 2,
        )
      }
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(instance.colorPrimary),
        transparent: true,
        opacity: 0.25,
      })
      const placeholder = new THREE.Mesh(geometry, material)
      placeholder.matrixAutoUpdate = false
      placeholder.matrix.copy(
        placeholderPlacement?.matrix ?? matrixFor(instance, viewMode),
      )
      placeholder.userData.playgroundInstanceId = instance.id
      placeholder.userData.playgroundColorHex = instance.colorPrimary
      placeholder.userData.playgroundModelId = instance.modelId
      contentGroup.add(placeholder)
      placeholderMeshes.push(placeholder)
    }
    applyColors(theme)
  }

  function defaultPoseFor(mode: PlaygroundViewMode): PlaygroundCameraPose {
    return defaultPlaygroundCameraPose({
      mode,
      gridSize,
      aspect: camera?.aspect ?? 1,
    })
  }

  function currentCameraPose(): PlaygroundCameraPose | null {
    if (!camera || !controls) return null
    return {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
    }
  }

  function cameraPoseChanged(
    before: PlaygroundCameraPose,
    after: PlaygroundCameraPose,
  ): boolean {
    const valuesBefore = [...before.position, ...before.target]
    const valuesAfter = [...after.position, ...after.target]
    return valuesBefore.some(
      (value, index) =>
        Math.abs(value - valuesAfter[index]) > CAMERA_POSE_CHANGE_EPSILON,
    )
  }

  function clearControlMomentum(): void {
    if (!controls) return
    // One non-damped update consumes and clears OrbitControls' remaining
    // rotation and pan deltas before a programmatic pose is applied.
    const dampingWasEnabled = controls.enableDamping
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = dampingWasEnabled
  }

  function freezeCameraMomentum(): void {
    if (!camera || !controls) return
    const pose = currentCameraPose()
    if (!pose) return

    const dampingWasEnabled = controls.enableDamping
    controls.enableDamping = false
    controls.update()
    camera.position.set(...pose.position)
    controls.target.set(...pose.target)
    controls.update()
    controls.enableDamping = dampingWasEnabled
    renderedCameraPose = pose

    const mode = pendingCameraMode
    if (!mode) return
    pendingCameraMode = null
    cameraState = {
      ...cameraState,
      [mode]: pose,
    }
    savePlaygroundCameraState(cameraState)
    cameraPoseIsCustom = true
  }

  function persistPendingCameraPose(): void {
    const mode = pendingCameraMode
    if (!mode) return

    clearControlMomentum()
    const pose = currentCameraPose()
    pendingCameraMode = null
    if (!pose) return

    cameraState = {
      ...cameraState,
      [mode]: pose,
    }
    savePlaygroundCameraState(cameraState)
    renderedCameraPose = pose
  }

  function applyCameraPose(mode: PlaygroundViewMode): void {
    if (!camera || !controls) return
    persistPendingCameraPose()
    clearControlMomentum()
    const pose = cameraState[mode] ?? defaultPoseFor(mode)
    camera.position.set(...pose.position)
    controls.target.set(...pose.target)
    camera.far = playgroundCameraFarPlane({ mode, gridSize, pose })
    camera.updateProjectionMatrix()
    controls.update()
    renderedCameraPose = currentCameraPose()
    // A restored pose counts as custom: it must survive further reloads.
    cameraPoseIsCustom = cameraState[mode] != null
  }

  function applyViewMode(theme: CadViewportTheme): void {
    if (grid) {
      const gridRotation: [number, number, number] =
        viewMode === 'desktop' ? CAD_VIEWPORT_GRID_ROTATION : [0, 0, 0]
      grid.rotation.set(...gridRotation)
    }
    applyCameraPose(viewMode)
    rebuildScene(theme)
  }

  function resetCameraPose(): void {
    persistPendingCameraPose()
    delete cameraState[viewMode]
    savePlaygroundCameraState(cameraState)
    cameraPoseIsCustom = false
    applyCameraPose(viewMode)
  }

  function refitDefaultWallCamera(): void {
    if (viewMode !== 'wall' || cameraPoseIsCustom) return
    applyCameraPose(viewMode)
  }

  function setPointerRay(clientX: number, clientY: number): boolean {
    if (!container || !camera) return false
    const rect = container.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return false
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    return true
  }

  function pickInstance(clientX: number, clientY: number): string | null {
    if (!setPointerRay(clientX, clientY)) return null
    const instancedHit = raycaster.intersectObjects(
      instancedGroups.map((group) => group.mesh),
      false,
    )[0]
    if (instancedHit && instancedHit.instanceId !== undefined) {
      const group = instancedGroups.find(
        (candidate) => candidate.mesh === instancedHit.object,
      )
      const entry = group?.entries[instancedHit.instanceId]
      if (entry) return entry.instanceId
    }
    const placeholderHit = raycaster.intersectObjects(
      placeholderMeshes,
      false,
    )[0]
    const placeholderId = placeholderHit?.object.userData.playgroundInstanceId
    if (typeof placeholderId === 'string') return placeholderId
    return null
  }

  function pointerGridPoint(
    clientX: number,
    clientY: number,
  ): PlaygroundGridPoint | null {
    if (!setPointerRay(clientX, clientY)) return null
    const plane = viewMode === 'wall' ? wallDragPlane : desktopDragPlane
    const intersection = raycaster.ray.intersectPlane(
      plane,
      projectedWorldPoint,
    )
    if (!intersection) return null
    return gridPointFromWorld(intersection, viewMode)
  }

  /**
   * Mount for a pending placeholder box of a wallDisplay component in wall
   * mode. The box is authored in the wall-ready frame, so it takes the mount
   * without the print-to-ready display rotation. Null outside wall mode or
   * for components without a wall display plan.
   */
  function wallPlaceholderPlacementFor(
    instance: PlaygroundViewportInstance,
    placement: ScenePlacement,
  ): { wallBounds: ModelBounds; matrix: THREE.Matrix4 } | null {
    if (viewMode !== 'wall') return null
    const plan = wallDisplayPlanFor(getModelDefinition(instance.modelId))
    if (!plan) return null
    const wallBounds = wallReadyBoundsFor(plan, instance.parameters)
    const socketAnchor = wallSocketAnchorFor(plan, instance.parameters)
    return {
      wallBounds,
      matrix: matrixFromWallPlacement(
        wallMountPlacementFor(
          wallBounds,
          {
            cellX: placement.cellX,
            cellY: placement.cellY,
            rotation: placement.rotation,
          },
          socketAnchor,
        ),
      ),
    }
  }

  function renderPlacement(
    instanceId: string,
    placement: ScenePlacement,
  ): void {
    const instance = instances.find((candidate) => candidate.id === instanceId)
    if (!instance) return
    const placedInstance = { ...instance, placement }
    // Ready meshes are authored in the print frame and mount with the
    // display rotation composed in; pending placeholder boxes are authored
    // in the wall-ready frame and mount without it.
    const matrix = matrixFor(placedInstance, viewMode)
    const placeholderPlacement = wallPlaceholderPlacementFor(
      placedInstance,
      placement,
    )

    for (const group of instancedGroups) {
      const index = group.entries.findIndex(
        (entry) => entry.instanceId === instanceId,
      )
      if (index < 0) continue
      group.mesh.setMatrixAt(index, matrix)
      group.mesh.instanceMatrix.needsUpdate = true
      const overlay = overlapOverlays.find(
        (candidate) => candidate.userData.instanceId === instanceId,
      )
      if (overlay) {
        overlay.matrix.copy(matrix)
        overlay.matrixWorldNeedsUpdate = true
      }
      return
    }

    const placeholder = placeholderMeshes.find(
      (candidate) => candidate.userData.playgroundInstanceId === instanceId,
    )
    if (!placeholder) return
    placeholder.matrix.copy(placeholderPlacement?.matrix ?? matrix)
    placeholder.matrixWorldNeedsUpdate = true
  }

  function suspendCameraControls(): void {
    if (!controls || suspendedControlState) return
    suspendedControlState = {
      enableRotate: controls.enableRotate,
      enablePan: controls.enablePan,
      enableZoom: controls.enableZoom,
    }
    controls.enableRotate = false
    controls.enablePan = false
    controls.enableZoom = false
  }

  function restoreCameraControls(): void {
    if (!controls || !suspendedControlState) return
    controls.enableRotate = suspendedControlState.enableRotate
    controls.enablePan = suspendedControlState.enablePan
    controls.enableZoom = suspendedControlState.enableZoom
    suspendedControlState = null
  }

  function restorePressedInstance(): void {
    if (!pointerPress?.instanceId || !pointerPress.originalPlacement) return
    renderPlacement(pointerPress.instanceId, pointerPress.originalPlacement)
  }

  function cancelPointerInteraction(): void {
    restorePressedInstance()
    pointerPress = null
    dragPreview = null
    restoreCameraControls()
    applyColors(observedTheme)
  }

  function pointerMovedPastThreshold(
    event: Pick<PointerEvent, 'clientX' | 'clientY'>,
    press: PointerPress,
  ): boolean {
    return (
      Math.hypot(
        event.clientX - press.startClientX,
        event.clientY - press.startClientY,
      ) > CLICK_DRAG_THRESHOLD_PX
    )
  }

  function handlePointerDownCapture(event: PointerEvent): void {
    const target = event.target
    if (target instanceof Element && target.closest('button')) return

    if (
      event.pointerType === 'touch' &&
      pointerPress?.instanceId &&
      event.pointerId !== pointerPress.pointerId
    ) {
      cancelPointerInteraction()
      return
    }

    if (!event.isPrimary) return
    if (event.pointerType !== 'touch' && event.button !== 0) return
    if (pointerPress) cancelPointerInteraction()

    const instanceId = pickInstance(event.clientX, event.clientY)
    const instance = instances.find((candidate) => candidate.id === instanceId)
    const originalPlacement = instance?.placement ?? null
    if (instanceId && originalPlacement) freezeCameraMomentum()
    const startGridPoint = pointerGridPoint(event.clientX, event.clientY)
    pointerPress = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startClientX: event.clientX,
      startClientY: event.clientY,
      instanceId,
      originalPlacement,
      startGridPoint,
    }

    if (instanceId && originalPlacement && startGridPoint) {
      suspendCameraControls()
      onSelect(instanceId)
    }
  }

  function handlePointerMove(event: PointerEvent): void {
    pointerX = event.clientX
    pointerY = event.clientY
    const next =
      event.pointerType === 'touch'
        ? null
        : pickInstance(event.clientX, event.clientY)
    if (next !== hoveredInstanceId) {
      hoveredInstanceId = next
      applyColors(observedTheme)
    }

    const press = pointerPress
    const currentPreview =
      dragPreview?.instanceId === press?.instanceId ? dragPreview : null
    if (
      !press?.instanceId ||
      event.pointerId !== press.pointerId ||
      !press.originalPlacement ||
      !press.startGridPoint ||
      (!currentPreview && !pointerMovedPastThreshold(event, press))
    ) {
      return
    }

    const currentGridPoint = pointerGridPoint(event.clientX, event.clientY)
    if (!currentGridPoint) return
    const placement = snappedPlacementForDrag({
      original: press.originalPlacement,
      start: press.startGridPoint,
      current: currentGridPoint,
    })
    if (
      currentPreview?.placement.cellX === placement.cellX &&
      currentPreview.placement.cellY === placement.cellY &&
      currentPreview.placement.rotation === placement.rotation
    ) {
      return
    }

    const valid = onValidatePlacement(press.instanceId, placement)
    dragPreview = { instanceId: press.instanceId, placement, valid }
    renderPlacement(press.instanceId, placement)
    applyColors(observedTheme)
  }

  function handlePointerUp(event: PointerEvent): void {
    const press = pointerPress
    if (!press || event.pointerId !== press.pointerId) return
    const preview = dragPreview
    const isClick = !pointerMovedPastThreshold(event, press)

    restorePressedInstance()
    pointerPress = null
    dragPreview = null
    restoreCameraControls()
    applyColors(observedTheme)

    if (press.instanceId) {
      if (preview) {
        onCommitPlacement(press.instanceId, preview.placement)
      } else if (isClick) {
        onSelect(press.instanceId)
      }
      return
    }

    if (isClick) onSelect(null)
  }

  function handlePointerCancel(event: PointerEvent): void {
    if (!pointerPress || event.pointerId !== pointerPress.pointerId) return
    cancelPointerInteraction()
  }

  function handlePointerLeave(): void {
    if (hoveredInstanceId !== null) {
      hoveredInstanceId = null
      applyColors(observedTheme)
    }
  }

  let hoveredName = $derived(
    hoveredInstanceId
      ? (instances.find((instance) => instance.id === hoveredInstanceId)
          ?.name ?? null)
      : null,
  )

  let viewportCursor = $derived.by(() => {
    // An overlapping preview still drops (with the conflict flag), so the
    // cursor stays a grab; the red preview marks the overlap instead.
    if (dragPreview) return 'grabbing'
    if (hoveredInstanceId) return 'grab'
    return 'auto'
  })

  let overlapInstanceIds = $derived(
    instances
      .filter((instance) => instance.overlapping)
      .map((instance) => instance.id)
      .join(','),
  )

  onMount(() => {
    if (!container) return
    const theme = observedTheme
    window.addEventListener('blur', cancelPointerInteraction)
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.domElement.addEventListener(
      'pointerdown',
      handlePointerDownCapture,
      true,
    )
    container.appendChild(renderer.domElement)

    scene = new THREE.Scene()
    scene.background = new THREE.Color(theme.background)

    camera = new THREE.PerspectiveCamera(
      CAD_VIEWPORT_CAMERA.fov,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      PLAYGROUND_CAMERA_MIN_FAR,
    )
    camera.position.set(...CAD_VIEWPORT_CAMERA.position)
    camera.up.set(...CAD_VIEWPORT_CAMERA.up)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.addEventListener('start', () => {
      cameraInteractionActive = true
      controlStartPose = currentCameraPose()
    })
    controls.addEventListener('change', () => {
      const pose = currentCameraPose()
      if (!pose) return
      renderedCameraPose = pose
      if (
        cameraInteractionActive &&
        controlStartPose &&
        cameraPoseChanged(controlStartPose, pose)
      ) {
        cameraPoseIsCustom = true
      }
    })
    controls.addEventListener('end', () => {
      cameraInteractionActive = false
      const pose = currentCameraPose()
      const startPose = controlStartPose
      controlStartPose = null
      if (!pose || !startPose) return
      if (!cameraPoseChanged(startPose, pose)) {
        cameraPoseIsCustom = cameraState[viewMode] != null
        return
      }
      renderedCameraPose = pose
      cameraPoseIsCustom = true
      pendingCameraMode = viewMode
    })

    const hemisphere = new THREE.HemisphereLight(
      new THREE.Color(theme.hemisphereSky),
      new THREE.Color(theme.hemisphereGround),
      CAD_VIEWPORT_LIGHTING.hemisphere.intensity,
    )
    hemisphere.position.set(...CAD_VIEWPORT_LIGHTING.hemisphere.position)
    scene.add(hemisphere)
    const key = new THREE.DirectionalLight(
      new THREE.Color(theme.keyLight),
      CAD_VIEWPORT_LIGHTING.key.intensity,
    )
    key.position.set(...CAD_VIEWPORT_LIGHTING.key.position)
    scene.add(key)
    const fill = new THREE.DirectionalLight(
      new THREE.Color(theme.oppositeFill),
      CAD_VIEWPORT_LIGHTING.oppositeFill.intensity,
    )
    fill.position.set(...CAD_VIEWPORT_LIGHTING.oppositeFill.position)
    scene.add(fill)

    grid = buildGridLines(
      theme,
      Math.max(Math.round(gridSize.x), 1),
      Math.max(Math.round(gridSize.y), 1),
      viewMode,
    )
    scene.add(grid)

    contentGroup = new THREE.Group()
    scene.add(contentGroup)

    resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return
      const width = container.clientWidth
      const height = Math.max(container.clientHeight, 1)
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      refitDefaultWallCamera()
    })
    resizeObserver.observe(container)

    const settleCameraBeforePageExit = () => persistPendingCameraPose()
    window.addEventListener('pagehide', settleCameraBeforePageExit)

    const animate = () => {
      frameHandle = requestAnimationFrame(animate)
      const cameraChanged = controls?.update() ?? false
      if (!cameraChanged && !cameraInteractionActive && pendingCameraMode) {
        persistPendingCameraPose()
      }
      if (renderer && scene && camera) renderer.render(scene, camera)
    }
    animate()

    unobserveTheme = observeCadViewportTheme((nextTheme) => {
      // The theme observer can emit on window focus/blur (the app re-applies
      // its theme class); only a real value change may re-run theme effects.
      if (sameTheme(nextTheme, observedTheme)) return
      observedTheme = nextTheme
    })

    return () => {
      cancelPointerInteraction()
      cancelAnimationFrame(frameHandle)
      window.removeEventListener('blur', cancelPointerInteraction)
      window.removeEventListener('pagehide', settleCameraBeforePageExit)
      persistPendingCameraPose()
      resizeObserver?.disconnect()
      resizeObserver = null
      controls?.dispose()
      controls = null
      controlStartPose = null
      unobserveTheme?.()
      unobserveTheme = null
      for (const group of instancedGroups) {
        group.mesh.dispose()
        group.material.dispose()
      }
      instancedGroups = []
      for (const placeholder of placeholderMeshes) {
        placeholder.geometry.dispose()
        ;(placeholder.material as THREE.Material).dispose()
      }
      placeholderMeshes = []
      disposeOverlayAssets()
      for (const geometry of geometryCache.values()) geometry.dispose()
      geometryCache.clear()
      const activeRenderer = renderer
      if (activeRenderer) {
        activeRenderer.domElement.removeEventListener(
          'pointerdown',
          handlePointerDownCapture,
          true,
        )
        activeRenderer.dispose()
        activeRenderer.domElement.remove()
        renderer = null
      }
      scene = null
      camera = null
      contentGroup = null
      grid = null
    }
  })

  $effect(() => {
    instances
    selectedInstanceId
    viewMode
    const theme = observedTheme
    untrack(() => {
      rebuildScene(theme)
      if (dragPreview) {
        renderPlacement(dragPreview.instanceId, dragPreview.placement)
      }
    })
  })

  $effect(() => {
    // Only a real view-mode change may reset the camera pose; theme-object
    // churn (the theme observer can emit on focus/blur) must not.
    const mode = viewMode
    const theme = observedTheme
    if (appliedViewMode === mode) return
    untrack(cancelPointerInteraction)
    appliedViewMode = mode
    untrack(() => applyViewMode(theme))
  })

  $effect(() => {
    const theme = observedTheme
    if (!scene) return
    scene.background = new THREE.Color(theme.background)
    // Recreate the grid so its line colors follow real theme changes; the
    // grid orientation stays bound to the current view mode.
    if (grid) {
      scene.remove(grid)
      disposeGrid(grid)
    }
    grid = buildGridLines(
      theme,
      Math.max(Math.round(gridSize.x), 1),
      Math.max(Math.round(gridSize.y), 1),
      viewMode,
    )
    scene.add(grid)
    refitDefaultWallCamera()
  })
</script>

<div
  bind:this={container}
  class="playground-viewport relative h-[calc(100dvh-16rem)] w-full overflow-hidden rounded-2xl border border-border-card bg-viewport"
  data-testid="playground-viewport"
  data-view-mode={viewMode}
  data-grid-size={String(gridSize.x) + 'x' + String(gridSize.y)}
  data-camera-pose={cameraPoseIsCustom ? 'custom' : 'default'}
  data-camera-settled={cameraInteractionActive || pendingCameraMode
    ? 'false'
    : 'true'}
  data-camera-position={renderedCameraPose?.position.join(',') ?? ''}
  data-camera-target={renderedCameraPose?.target.join(',') ?? ''}
  data-selected-instance={selectedInstanceId ?? ''}
  data-hover-instance={hoveredInstanceId ?? ''}
  data-overlap-instances={overlapInstanceIds}
  data-pointer-instance={pointerPress?.instanceId ?? ''}
  data-drag-instance={dragPreview?.instanceId ?? ''}
  data-drag-valid={dragPreview ? String(dragPreview.valid) : ''}
  data-drag-cell={dragPreview
    ? `${dragPreview.placement.cellX},${dragPreview.placement.cellY}`
    : ''}
  style:cursor={viewportCursor}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointercancel={handlePointerCancel}
  onlostpointercapture={handlePointerCancel}
  onpointerleave={handlePointerLeave}
  role="img"
>
  <button
    class="absolute right-3 top-3 z-10 rounded-lg border border-border-card bg-card px-3 py-1 text-sm font-medium text-card-foreground shadow-card hover:bg-page"
    data-testid="playground-camera-reset"
    onclick={resetCameraPose}
  >
    {translate(locale, 'playground.camera.reset')}
  </button>
  {#if hoveredName}
    <div
      class="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-border-card bg-card px-2 py-1 text-[0.75rem] font-medium text-card-foreground shadow-card"
      data-testid="playground-hover-name"
      style:left="{pointerX -
        (container?.getBoundingClientRect().left ?? 0) +
        14}px"
      style:top="{pointerY -
        (container?.getBoundingClientRect().top ?? 0) +
        14}px"
    >
      {hoveredName}
    </div>
  {/if}
</div>

<style>
  .playground-viewport :global(canvas) {
    display: block;
    border-radius: inherit;
  }
</style>
