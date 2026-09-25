<script lang="ts">
  import { onMount } from 'svelte'
  import * as THREE from 'three'
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
  import type { MeshSnapshot } from '../../../cad-contract/messages'
  import type {
    ModelBounds,
    ModelParameterValues,
  } from '../../../cad-contract/units'
  import { PLAYGROUND_GRID_PITCH } from '../../../cad-contract/scene'
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
  import { CAD_VIEWPORT_LIGHTING } from '../viewport/config'
  import { sceneProxyCacheKey } from './filenames'
  import type { PlaygroundViewMode } from './store'

  type PlaygroundViewportInstance = {
    id: string
    name: string
    modelId: string
    parameters: ModelParameterValues
    mesh: MeshSnapshot | null
    bounds: ModelBounds | null
    placement: {
      cellX: number
      cellY: number
      rotation: number
      supportedBy: string | null
    } | null
    colorPrimary: string
    meshState: 'pending' | 'ready' | 'failed'
  }

  type Props = {
    instances: ReadonlyArray<PlaygroundViewportInstance>
    selectedInstanceId: string | null
    viewMode: PlaygroundViewMode
    onSelect: (instanceId: string | null) => void
  }

  let { instances, selectedInstanceId, viewMode, onSelect }: Props = $props()

  let container: HTMLDivElement | undefined = $state()
  let observedTheme = $state<CadViewportTheme>(readCadViewportTheme())
  let hoveredInstanceId: string | null = $state(null)
  let pointerX = $state(0)
  let pointerY = $state(0)

  type InstancedEntry = {
    instanceId: string
    colorHex: string
    matrix: THREE.Matrix4
  }

  type InstancedGroup = {
    cacheKey: string
    mesh: THREE.InstancedMesh
    material: THREE.MeshStandardMaterial
    entries: InstancedEntry[]
  }

  let renderer: THREE.WebGLRenderer | null = null
  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let controls: OrbitControls | null = null
  let contentGroup: THREE.Group | null = null
  let grid: THREE.GridHelper | null = null
  let frameHandle = 0
  let resizeObserver: ResizeObserver | null = null
  let unobserveTheme: (() => void) | null = null
  const geometryCache = new Map<string, THREE.BufferGeometry>()
  let instancedGroups: InstancedGroup[] = []
  let placeholderMeshes: THREE.Mesh[] = []
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  const WALL_CAMERA_POSITION: [number, number, number] = [0, -620, 260]
  const WALL_CAMERA_TARGET = new THREE.Vector3(0, 0, 180)
  const DESKTOP_CAMERA_TARGET = new THREE.Vector3(0, 0, 20)

  let appliedViewMode: PlaygroundViewMode | null = null

  const THEME_FIELDS: ReadonlyArray<keyof CadViewportTheme> = [
    'background',
    'gridMajor',
    'gridMinor',
    'gizmoBackground',
    'edge',
    'annotation',
    'annotationLabel',
    'faceHighlight',
    'hemisphereSky',
    'hemisphereGround',
    'keyLight',
    'oppositeFill',
  ]

  function sameTheme(a: CadViewportTheme, b: CadViewportTheme): boolean {
    return THEME_FIELDS.every((field) => a[field] === b[field])
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

  function applyColors(theme: CadViewportTheme): void {
    for (const group of instancedGroups) {
      group.entries.forEach((entry, index) => {
        const emphasized =
          entry.instanceId === selectedInstanceId ||
          entry.instanceId === hoveredInstanceId
        group.mesh.setColorAt(
          index,
          new THREE.Color(emphasized ? theme.faceHighlight : entry.colorHex),
        )
      })
      if (group.mesh.instanceColor) group.mesh.instanceColor.needsUpdate = true
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
        colorHex: instance.colorPrimary,
        matrix: matrixFor(instance, viewMode),
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
    }
    applyColors(theme)

    for (const instance of instances) {
      if (instance.meshState !== 'pending' || !instance.bounds) continue
      const bounds = instance.bounds
      const geometry = new THREE.BoxGeometry(
        Math.max(bounds.max[0] - bounds.min[0], 1),
        Math.max(bounds.max[1] - bounds.min[1], 1),
        Math.max(bounds.max[2] - bounds.min[2], 1),
      )
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(instance.colorPrimary),
        transparent: true,
        opacity: 0.25,
      })
      const placeholder = new THREE.Mesh(geometry, material)
      placeholder.applyMatrix4(matrixFor(instance, viewMode))
      placeholder.userData.playgroundInstanceId = instance.id
      contentGroup.add(placeholder)
      placeholderMeshes.push(placeholder)
    }
  }

  function applyViewMode(theme: CadViewportTheme): void {
    if (grid) {
      grid.rotation.set(
        ...(viewMode === 'desktop' ? CAD_VIEWPORT_GRID_ROTATION : [0, 0, 0]),
      )
    }
    if (camera && controls) {
      if (viewMode === 'wall') {
        camera.position.set(...WALL_CAMERA_POSITION)
        controls.target.copy(WALL_CAMERA_TARGET)
      } else {
        camera.position.set(...CAD_VIEWPORT_CAMERA.position)
        controls.target.copy(DESKTOP_CAMERA_TARGET)
      }
      controls.update()
    }
    rebuildScene(theme)
  }

  function pickInstance(clientX: number, clientY: number): string | null {
    if (!container || !camera) return null
    const rect = container.getBoundingClientRect()
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
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

  /**
   * Selection only happens on a true click: drags are view manipulation
   * (orbit) and must leave the current selection untouched.
   */
  const CLICK_DRAG_THRESHOLD_PX = 5
  let pointerDownX = 0
  let pointerDownY = 0
  let pointerDownValid = false

  function handlePointerDown(event: MouseEvent): void {
    if (event.button !== 0) {
      pointerDownValid = false
      return
    }
    pointerDownX = event.clientX
    pointerDownY = event.clientY
    pointerDownValid = true
  }

  function handleClick(event: MouseEvent): void {
    const isClick =
      pointerDownValid &&
      Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY) <=
        CLICK_DRAG_THRESHOLD_PX
    pointerDownValid = false
    if (!isClick) return
    onSelect(pickInstance(event.clientX, event.clientY))
  }

  function handlePointerMove(event: MouseEvent): void {
    pointerX = event.clientX
    pointerY = event.clientY
    const next = pickInstance(event.clientX, event.clientY)
    if (next !== hoveredInstanceId) {
      hoveredInstanceId = next
      applyColors(observedTheme)
    }
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

  onMount(() => {
    if (!container) return
    const theme = observedTheme
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    scene = new THREE.Scene()
    scene.background = new THREE.Color(theme.background)

    camera = new THREE.PerspectiveCamera(
      CAD_VIEWPORT_CAMERA.fov,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      20000,
    )
    camera.position.set(...CAD_VIEWPORT_CAMERA.position)
    camera.up.set(...CAD_VIEWPORT_CAMERA.up)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.copy(DESKTOP_CAMERA_TARGET)

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

    const gridCells = 40
    grid = new THREE.GridHelper(
      gridCells * PLAYGROUND_GRID_PITCH,
      gridCells,
      new THREE.Color(theme.gridMajor),
      new THREE.Color(theme.gridMinor),
    )
    grid.rotation.set(...CAD_VIEWPORT_GRID_ROTATION)
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
    })
    resizeObserver.observe(container)

    const animate = () => {
      frameHandle = requestAnimationFrame(animate)
      controls?.update()
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
      cancelAnimationFrame(frameHandle)
      resizeObserver?.disconnect()
      resizeObserver = null
      controls?.dispose()
      controls = null
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
      for (const geometry of geometryCache.values()) geometry.dispose()
      geometryCache.clear()
      renderer.dispose()
      renderer.domElement.remove()
      renderer = null
      scene = null
      camera = null
      contentGroup = null
      grid = null
    }
  })

  $effect(() => {
    instances
    selectedInstanceId
    rebuildScene(observedTheme)
  })

  $effect(() => {
    // Only a real view-mode change may reset the camera pose; theme-object
    // churn (the theme observer can emit on focus/blur) must not.
    if (appliedViewMode === viewMode) return
    appliedViewMode = viewMode
    applyViewMode(observedTheme)
  })

  $effect(() => {
    const theme = observedTheme
    if (!scene) return
    scene.background = new THREE.Color(theme.background)
    // Recreate the grid so its line colors follow real theme changes; the
    // grid orientation stays bound to the current view mode.
    if (grid) {
      scene.remove(grid)
      grid.dispose()
    }
    const gridCells = 40
    grid = new THREE.GridHelper(
      gridCells * PLAYGROUND_GRID_PITCH,
      gridCells,
      new THREE.Color(theme.gridMajor),
      new THREE.Color(theme.gridMinor),
    )
    grid.rotation.set(
      ...(viewMode === 'desktop' ? CAD_VIEWPORT_GRID_ROTATION : [0, 0, 0]),
    )
    scene.add(grid)
  })
</script>

<div
  bind:this={container}
  class="relative h-[calc(100dvh-16rem)] w-full overflow-hidden rounded-2xl border border-border-card bg-viewport"
  data-testid="playground-viewport"
  data-view-mode={viewMode}
  data-selected-instance={selectedInstanceId ?? ''}
  data-hover-instance={hoveredInstanceId ?? ''}
  onclick={handleClick}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerleave={handlePointerLeave}
  role="img"
>
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
