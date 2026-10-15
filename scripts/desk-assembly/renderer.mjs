import * as THREE from '/three/three.module.js'
import { assemblySceneAt } from './scenes.mjs'

const data = await fetch('/assembly.json').then((response) => response.json())
const width = 960
const height = 640
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
})
renderer.setSize(width, height)
renderer.setPixelRatio(1)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
document.body.style.margin = '0'
document.body.append(renderer.domElement)

const geometries = new Map()
for (const [id, mesh] of Object.entries(data.meshes)) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(mesh.positions, 3),
  )
  geometry.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(mesh.normals, 3),
  )
  geometry.setIndex(new THREE.Uint32BufferAttribute(mesh.indices, 1))
  geometry.computeBoundingSphere()
  geometries.set(id, geometry)
}

let currentKey
let scene
let camera
let objects

function setup(id, theme) {
  scene = new THREE.Scene()
  const dark = theme === 'dark'
  scene.background = new THREE.Color(dark ? '#182522' : '#f3f2eb')
  scene.add(new THREE.AmbientLight(0xffffff, 0.8))
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4)
  key.position.set(-60, -90, 120)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xe5faff, 1.2)
  fill.position.set(80, 20, 70)
  scene.add(fill)
  const underside = new THREE.DirectionalLight(0xffffff, 1.8)
  underside.position.set(-20, -50, -100)
  scene.add(underside)
  const locating = id === 'locating-seats'
  let verticalSize = 128
  if (locating) verticalSize = 112
  camera = new THREE.OrthographicCamera(
    -verticalSize * 0.75,
    verticalSize * 0.75,
    verticalSize / 2,
    -verticalSize / 2,
    0.1,
    1000,
  )
  camera.up.set(0, 0, 1)
  camera.position.set(100, -130, 115)
  camera.lookAt(0, 0, 32)
  if (locating) {
    camera.up.set(0, -1, 0)
    camera.position.set(0, 70, -180)
    camera.lookAt(0, 0, 0)
  }
  const palette = {
    board: dark ? '#758b85' : '#b5c5be',
    snap: dark ? '#edb75b' : '#e4a447',
    seat: dark ? '#edb75b' : '#e4a447',
    box: dark ? '#5ab69e' : '#328d79',
  }
  objects = new Map()
  for (const part of assemblySceneAt(id, 0, data.datums)) {
    let color = palette.box
    if (part.mesh === 'board') color = palette.board
    if (part.mesh === 'snap') color = palette.snap
    if (part.mesh === 'seat') color = palette.seat
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.04,
    })
    const mesh = new THREE.Mesh(geometries.get(part.mesh), material)
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry, 32),
      new THREE.LineBasicMaterial({
        color: dark ? '#173b31' : '#204f43',
        transparent: true,
        opacity: 0.18,
      }),
    )
    mesh.add(edges)
    objects.set(part.id, mesh)
    scene.add(mesh)
  }
}

window.renderAssembly = (id, theme, time) => {
  const key = `${id}:${theme}`
  if (currentKey !== key) {
    if (scene) {
      for (const object of objects.values()) {
        object.material.dispose()
        object.children[0].geometry.dispose()
        object.children[0].material.dispose()
      }
    }
    setup(id, theme)
    currentKey = key
  }
  for (const part of assemblySceneAt(id, time, data.datums)) {
    const mesh = objects.get(part.id)
    mesh.position.set(...part.position)
    mesh.rotation.z = part.rotationZ
  }
  if (id === 'locating-seats') {
    const ease = (start, end) => {
      const t = Math.max(0, Math.min(1, (time - start) / (end - start)))
      return t * t * (3 - 2 * t)
    }
    const closeup = ease(3.5, 4.4) * (1 - ease(7.7, 8.8))
    const target = new THREE.Vector3(-57 * closeup, 21 * closeup, 0)
    camera.position.copy(target).add(new THREE.Vector3(0, 70, -180))
    camera.lookAt(target)
    camera.zoom = 1 + 2.3 * closeup
    camera.updateProjectionMatrix()
  }
  renderer.render(scene, camera)
}
