import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { assemblyReadingState } from './timeline'
import type {
  AssemblyAssets,
  AssemblyReadingState,
  AssemblyScene,
} from './types'

export function createAssemblyViewer(
  target: HTMLElement,
  assets: AssemblyAssets,
  sceneId: AssemblyScene,
  onFailure: () => void,
) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.domElement.setAttribute('aria-hidden', 'true')
  target.append(renderer.domElement)

  const scene = new THREE.Scene()
  scene.add(new THREE.AmbientLight(0xffffff, 0.8))
  for (const [color, intensity, position] of [
    [0xfff1dc, 2.4, [-60, -90, 120]],
    [0xe5faff, 1.2, [80, 20, 70]],
    [0xffffff, 1.8, [-20, -50, -100]],
  ] as const) {
    const light = new THREE.DirectionalLight(color, intensity)
    light.position.set(position[0], position[1], position[2])
    scene.add(light)
  }
  const locating = sceneId === 'locating-seats'
  const verticalSize = locating ? 112 : 128
  const camera = new THREE.OrthographicCamera(-96, 96, 64, -64, 0.1, 1000)
  camera.up.set(0, 0, 1)
  if (locating) camera.up.set(0, -1, 0)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = false
  controls.enablePan = false
  controls.enableZoom = false
  renderer.domElement.style.touchAction = 'pan-y pinch-zoom'

  const geometries = new Map<string, THREE.BufferGeometry>()
  const objects = new Map<
    string,
    THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
  >()
  const edgeMaterials: THREE.LineBasicMaterial[] = []
  const edgeGeometries: THREE.EdgesGeometry[] = []
  let state = assemblyReadingState(sceneId, 0, assets.manifest.datums)
  let userCamera = false
  let interacting = false
  let updatingCamera = false
  let touchCamera:
    | {
        userCamera: boolean
        position: THREE.Vector3
        target: THREE.Vector3
        zoom: number
      }
    | undefined
  let disposed = false
  let frame: number | undefined

  function render() {
    if (disposed || frame !== undefined) return
    frame = requestAnimationFrame(() => {
      frame = undefined
      if (!disposed) renderer.render(scene, camera)
    })
  }

  for (const part of state.parts) {
    let geometry = geometries.get(part.mesh)
    if (!geometry) {
      const mesh = assets.manifest.meshes[part.mesh]
      if (!mesh) throw new Error('Missing printable assembly part')
      geometry = new THREE.BufferGeometry()
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(
          new Float32Array(
            assets.bytes,
            mesh.positions.offset,
            mesh.positions.count,
          ),
          3,
        ),
      )
      geometry.setAttribute(
        'normal',
        new THREE.BufferAttribute(
          new Float32Array(
            assets.bytes,
            mesh.normals.offset,
            mesh.normals.count,
          ),
          3,
        ),
      )
      geometry.setIndex(
        new THREE.BufferAttribute(
          new Uint32Array(
            assets.bytes,
            mesh.indices.offset,
            mesh.indices.count,
          ),
          1,
        ),
      )
      geometry.computeBoundingSphere()
      geometries.set(part.mesh, geometry)
    }
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.5,
      metalness: 0.04,
    })
    const object = new THREE.Mesh(geometry, material)
    const edges = new THREE.EdgesGeometry(geometry, 32)
    const edgeMaterial = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.18,
    })
    object.add(new THREE.LineSegments(edges, edgeMaterial))
    edgeGeometries.push(edges)
    edgeMaterials.push(edgeMaterial)
    objects.set(part.id, object)
    scene.add(object)
  }

  function synchronizeControls() {
    updatingCamera = true
    try {
      controls.update()
    } finally {
      updatingCamera = false
    }
  }

  function guidedCamera(current: AssemblyReadingState) {
    if (userCamera) return
    camera.zoom = 1
    controls.target.set(0, 0, 30)
    camera.position.set(100, -130, 115)
    if (locating) {
      controls.target.set(0, 0, 0)
      camera.position.set(0, 70, -180)
    } else if (sceneId === 'snap-fixing') {
      const focus = current.seatFocus
      controls.target.set(0, 0, 30 + 12 * focus)
      camera.position.set(100 - 10 * focus, -130, 115 - 132 * focus)
      camera.zoom = 1 + 0.45 * focus
    }
    camera.lookAt(controls.target)
    camera.updateProjectionMatrix()
    synchronizeControls()
  }

  function setProgress(progress: number, reducedMotion: boolean) {
    state = assemblyReadingState(
      sceneId,
      progress,
      assets.manifest.datums,
      reducedMotion,
    )
    for (const part of state.parts) {
      const object = objects.get(part.id)!
      object.position.set(part.position[0], part.position[1], part.position[2])
      object.rotation.z = part.rotationZ
      const dim =
        sceneId === 'snap-fixing' &&
        (part.mesh === 'board' || part.mesh === 'snap')
      object.material.opacity = dim ? 1 - 0.9 * state.seatFocus : 1
      const transparent = dim && state.seatFocus > 0
      if (object.material.transparent !== transparent) {
        object.material.transparent = transparent
        object.material.needsUpdate = true
      }
      object.material.depthWrite = !object.material.transparent
    }
    guidedCamera(state)
    render()
    return state.step
  }

  function setTheme(dark: boolean) {
    scene.background = new THREE.Color(dark ? '#182522' : '#f3f2eb')
    for (const part of state.parts) {
      let color = dark ? '#5ab69e' : '#328d79'
      if (part.mesh === 'board') color = dark ? '#758b85' : '#b5c5be'
      if (part.mesh === 'snap' || part.mesh === 'seat')
        color = dark ? '#edb75b' : '#e4a447'
      objects.get(part.id)!.material.color.set(color)
    }
    for (const material of edgeMaterials)
      material.color.set(dark ? '#173b31' : '#204f43')
    render()
  }

  const onStart = () => {
    interacting = true
  }
  const onEnd = () => {
    interacting = false
  }
  const onChange = () => {
    if (interacting && !updatingCamera) userCamera = true
    render()
  }
  const rememberTouch = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || touchCamera) return
    touchCamera = {
      userCamera,
      position: camera.position.clone(),
      target: controls.target.clone(),
      zoom: camera.zoom,
    }
  }
  const finishTouch = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return
    const snapshot = touchCamera
    touchCamera = undefined
    if (event.type !== 'pointercancel' || !snapshot) return
    // The browser consumed this gesture for native scrolling or pinch zoom.
    userCamera = snapshot.userCamera
    if (userCamera) {
      camera.position.copy(snapshot.position)
      controls.target.copy(snapshot.target)
      camera.zoom = snapshot.zoom
      camera.updateProjectionMatrix()
      synchronizeControls()
    } else {
      guidedCamera(state)
    }
    render()
  }
  controls.addEventListener('start', onStart)
  controls.addEventListener('end', onEnd)
  controls.addEventListener('change', onChange)
  renderer.domElement.addEventListener('pointerdown', rememberTouch, true)
  renderer.domElement.addEventListener('pointerup', finishTouch, true)
  renderer.domElement.addEventListener('pointercancel', finishTouch, true)
  const resize = new ResizeObserver(() => {
    const width = target.clientWidth
    const height = target.clientHeight
    if (width <= 0 || height <= 0) return
    const horizontalSize = (verticalSize * width) / height
    camera.left = -horizontalSize / 2
    camera.right = horizontalSize / 2
    camera.top = verticalSize / 2
    camera.bottom = -verticalSize / 2
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    render()
  })
  resize.observe(target)
  const lost = (event: Event) => {
    event.preventDefault()
    onFailure()
  }
  renderer.domElement.addEventListener('webglcontextlost', lost)
  setProgress(0, false)
  setTheme(false)

  return {
    setProgress,
    setTheme,
    rotate(angle: number) {
      userCamera = true
      camera.position
        .sub(controls.target)
        .applyAxisAngle(camera.up, angle)
        .add(controls.target)
      camera.lookAt(controls.target)
      controls.update()
      render()
    },
    zoom(factor: number) {
      userCamera = true
      camera.zoom = Math.max(0.65, Math.min(3, camera.zoom * factor))
      camera.updateProjectionMatrix()
      render()
    },
    resetView() {
      userCamera = false
      guidedCamera(state)
      render()
    },
    destroy() {
      if (disposed) return
      disposed = true
      if (frame !== undefined) cancelAnimationFrame(frame)
      resize.disconnect()
      controls.dispose()
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end', onEnd)
      controls.removeEventListener('change', onChange)
      renderer.domElement.removeEventListener(
        'pointerdown',
        rememberTouch,
        true,
      )
      renderer.domElement.removeEventListener('pointerup', finishTouch, true)
      renderer.domElement.removeEventListener(
        'pointercancel',
        finishTouch,
        true,
      )
      renderer.domElement.removeEventListener('webglcontextlost', lost)
      for (const object of objects.values()) object.material.dispose()
      for (const geometry of geometries.values()) geometry.dispose()
      for (const geometry of edgeGeometries) geometry.dispose()
      for (const material of edgeMaterials) material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}
