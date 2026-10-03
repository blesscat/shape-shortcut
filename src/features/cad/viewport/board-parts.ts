import * as THREE from 'three'

export type BoardSurfaceTokens = {
  boardFace: string
  boardEdge: string
}

/** The grid lines are authored in the local XZ plane (y = 0), so the
    surface children use the same plane with small y offsets: the face sits
    below the lines and the outline floats just above them. Callers mount
    the group with the same rotation as the grid. The -π/2 turn points the
    face normal along local +Y — world +Z (up) once the desktop grid
    rotation applies, and out of the wall toward the camera in wall mode —
    so the face is lit, not dark. */
function planeInGridXZ(sizeX: number, sizeY: number): THREE.PlaneGeometry {
  const plane = new THREE.PlaneGeometry(sizeX, sizeY)
  plane.rotateX(-Math.PI / 2)
  return plane
}

/**
 * The planning surface under the grid lines (viewport fix ①): a plate one
 * step from the scene ground (--vp-board-face) with an outline
 * (--vp-board-edge) marking its rim. Models keep their own colors on top
 * of it; the --vp-contact-shadow token stays defined for the spec package
 * (design-spec-4.2.1) but rendering no longer paints halo rings.
 */
export function createBoardSurfaceGroup(
  sizeX: number,
  sizeY: number,
  tokens: BoardSurfaceTokens,
): THREE.Group {
  const group = new THREE.Group()

  const face = new THREE.Mesh(
    planeInGridXZ(sizeX * 1.02, sizeY * 1.02),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(tokens.boardFace),
      roughness: 0.95,
      metalness: 0,
    }),
  )
  face.position.y = -0.06
  face.renderOrder = -2
  group.add(face)

  const halfX = (sizeX * 1.02) / 2
  const halfY = (sizeY * 1.02) / 2
  const outline = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfX, 0.02, -halfY),
      new THREE.Vector3(halfX, 0.02, -halfY),
      new THREE.Vector3(halfX, 0.02, halfY),
      new THREE.Vector3(-halfX, 0.02, halfY),
    ]),
    new THREE.LineBasicMaterial({ color: new THREE.Color(tokens.boardEdge) }),
  )
  outline.renderOrder = 1
  group.add(outline)

  return group
}

const HATCH_TEXTURE_SIZE = 64
const HATCH_LINE_WIDTH = 10
const HATCH_SPACING = 24

let errorHatchTexture: THREE.CanvasTexture | null = null

/**
 * 45° stripe alpha texture for the overlap/conflict overlay (Part D v2).
 * The gaps stay at a faint alpha so one quad composites the error fill and
 * the hatch strokes when tinted with the error color.
 */
function getErrorHatchTexture(): THREE.CanvasTexture {
  if (errorHatchTexture) return errorHatchTexture
  const canvas = document.createElement('canvas')
  canvas.width = HATCH_TEXTURE_SIZE
  canvas.height = HATCH_TEXTURE_SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('ERROR_HATCH_CANVAS_UNAVAILABLE')
  context.fillStyle = 'rgba(255, 255, 255, 0.18)'
  context.fillRect(0, 0, HATCH_TEXTURE_SIZE, HATCH_TEXTURE_SIZE)
  context.strokeStyle = 'rgba(255, 255, 255, 1)'
  context.lineWidth = HATCH_LINE_WIDTH
  for (
    let offset = -HATCH_TEXTURE_SIZE;
    offset <= HATCH_TEXTURE_SIZE * 2;
    offset += HATCH_SPACING
  ) {
    context.beginPath()
    context.moveTo(offset, HATCH_TEXTURE_SIZE + 8)
    context.lineTo(offset + HATCH_TEXTURE_SIZE + 8, -8)
    context.stroke()
  }
  errorHatchTexture = new THREE.CanvasTexture(canvas)
  errorHatchTexture.wrapS = THREE.RepeatWrapping
  errorHatchTexture.wrapT = THREE.RepeatWrapping
  return errorHatchTexture
}

/**
 * Overlay material for overlapping instances: error color (+45° hatch) so a
 * conflict reads even next to the blue selection or in grayscale.
 */
export function createErrorHatchMaterial(
  color: string,
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    map: getErrorHatchTexture(),
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
}
