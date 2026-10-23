import * as THREE from '/three/three.module.js'

const data = await fetch('/assembly.json').then((response) => response.json())
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
})
renderer.setSize(1200, 800)
renderer.setPixelRatio(1)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.style.margin = '0'
document.body.append(renderer.domElement)

window.renderHome = (kind, theme) => {
  const dark = theme === 'dark'
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(dark ? '#2a231e' : '#f6f1ed')
  scene.add(new THREE.AmbientLight(0xffffff, 1.6))
  const light = new THREE.DirectionalLight(0xfff3e4, 3)
  light.position.set(-100, -160, 250)
  light.castShadow = true
  light.shadow.mapSize.set(2048, 2048)
  Object.assign(light.shadow.camera, {
    left: -250,
    right: 250,
    top: 250,
    bottom: -250,
    far: 700,
  })
  light.shadow.bias = -0.0002
  light.shadow.normalBias = 0.2
  scene.add(light)
  const fill = new THREE.DirectionalLight(0xffffff, 1.1)
  fill.position.set(150, 60, 120)
  scene.add(fill)

  function part(id, color, position) {
    const source = data.meshes[id]
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(source.positions, 3),
    )
    geometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(source.normals, 3),
    )
    geometry.setIndex(new THREE.Uint32BufferAttribute(source.indices, 1))
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color, roughness: 0.72 }),
    )
    mesh.position.set(...position)
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    return mesh
  }
  if (kind === 'desk') {
    part('board', '#d4c5b4', [0, 0, 0])
    // Seat-free containers rest at the native intersection-derived height.
    part('box', '#7eaa99', [-56, 28, data.placements.boxZ])
    part('tray', '#dc927b', [-56, -28, data.placements.trayZ])
    part('cylinder', '#e9bd74', [14, 20, data.placements.cylinderZ])
    part('tray', '#a8b9c3', [56, -28, data.placements.trayZ])
  } else {
    // A product arrangement, not a mounting diagram: both complete Wall
    // accessories are shown separately with their real connector interfaces.
    part('organizer', '#7eaa99', [-60, 14, 0])
    part('shelf', '#dc927b', [58, 0, 0])
  }
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.ShadowMaterial({ opacity: dark ? 0.22 : 0.12 }),
  )
  floor.position.z = -0.3
  floor.receiveShadow = true
  scene.add(floor)
  const camera = new THREE.OrthographicCamera(
    -155,
    155,
    103.33,
    -103.33,
    0.1,
    1000,
  )
  camera.up.set(0, 0, 1)
  camera.position.set(210, -300, 250)
  camera.lookAt(0, 0, 18)
  if (kind === 'wall') {
    camera.position.set(170, -330, 200)
    camera.lookAt(0, -25, 15)
  }
  renderer.render(scene, camera)
  scene.traverse((object) => {
    object.geometry?.dispose()
    object.material?.dispose()
  })
}
