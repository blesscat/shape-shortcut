import * as THREE from 'three'

/**
 * Board substrate models (viewport fix ①, design-tokens.css Part D v2 /
 * design-spec-4.2.1): the plates every other part mounts onto render as
 * scene infrastructure — their resting face reads the shared
 * --cad-viewport-board-face token instead of the instance color, so light
 * mode can never swallow them. Listed explicitly: the snap shares the 基礎
 * zone but is a clip and keeps its color, and modular-grid-base carries no
 * ratified partCategory yet its name and role are board.
 */
const BOARD_SUBSTRATE_MODEL_IDS: ReadonlySet<string> = new Set([
  'opengrid',
  'modular-grid-base',
])

export function isBoardSubstrateModel(modelId: string): boolean {
  return BOARD_SUBSTRATE_MODEL_IDS.has(modelId)
}

const SHADOW_TEXTURE_SIZE = 256

let contactShadowTexture: THREE.CanvasTexture | null = null

/**
 * Radial RING gradient shared by every contact shadow quad; the quad's
 * material supplies the theme color (--cad-viewport-contact-shadow). The
 * ring keeps the area under the plate's cutouts transparent (a lit ring
 * seen through a perforated board reads as a stain), and peaks just past
 * the footprint so the shadow wraps the board's outer edge like the spec's
 * ground ellipse.
 */
function getContactShadowTexture(): THREE.CanvasTexture {
  if (contactShadowTexture) return contactShadowTexture
  const canvas = document.createElement('canvas')
  canvas.width = SHADOW_TEXTURE_SIZE
  canvas.height = SHADOW_TEXTURE_SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('CONTACT_SHADOW_CANVAS_UNAVAILABLE')
  const gradient = context.createRadialGradient(
    SHADOW_TEXTURE_SIZE / 2,
    SHADOW_TEXTURE_SIZE / 2,
    0,
    SHADOW_TEXTURE_SIZE / 2,
    SHADOW_TEXTURE_SIZE / 2,
    SHADOW_TEXTURE_SIZE / 2,
  )
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
  gradient.addColorStop(0.68, 'rgba(255, 255, 255, 0)')
  gradient.addColorStop(0.76, 'rgba(255, 255, 255, 0.9)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, SHADOW_TEXTURE_SIZE, SHADOW_TEXTURE_SIZE)
  contactShadowTexture = new THREE.CanvasTexture(canvas)
  return contactShadowTexture
}

/**
 * The rgba token's alpha (THREE.Color drops it) becomes the quad's opacity,
 * so --vp-contact-shadow's .20 really is the shadow's peak strength; the
 * ring texture supplies the falloff shape on top of that.
 */
function tokenAlpha(color: string): number {
  const match = /rgba\([^)]+,\s*(0[\d.]*|1)\)\s*$/.exec(color.trim())
  return match ? Number(match[1]) : 1
}

export function createContactShadowMaterial(
  color: string,
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    map: getContactShadowTexture(),
    transparent: true,
    opacity: tokenAlpha(color),
    depthWrite: false,
  })
}

/**
 * A ground quad under the board's base plane (print frame: base at Z=0,
 * footprint centered on XY). Sized well past the footprint so the ring
 * gradient peaks just outside the board's edge (see the texture note), it
 * renders the spec's ground-ellipse shadow: dark around the rim, nothing
 * under the cutouts. The caller mounts it with the board's matrix, so the
 * local -Z offset tracks desk and wall orientations alike.
 */
export function createBoardContactShadowGeometry(
  geometry: THREE.BufferGeometry,
): THREE.PlaneGeometry {
  geometry.computeBoundingBox()
  const bounds = geometry.boundingBox
  // 1.4x puts the board edge at ~0.71 of the quad half-width, right where
  // the ring ramp (0.68→0.76) peaks, so the halo hugs the board's outer
  // edge. The z offset floats the quad a hair above the planning surface
  // (editor surface z=-0.2, playground face -0.06) instead of half a unit
  // under it, where an opaque surface would swallow it.
  const sizeX = Math.max((bounds?.max.x ?? 0) - (bounds?.min.x ?? 0), 1) * 1.4
  const sizeY = Math.max((bounds?.max.y ?? 0) - (bounds?.min.y ?? 0), 1) * 1.4
  const plane = new THREE.PlaneGeometry(sizeX, sizeY)
  const centerX = bounds ? (bounds.min.x + bounds.max.x) / 2 : 0
  const centerY = bounds ? (bounds.min.y + bounds.max.y) / 2 : 0
  plane.translate(centerX, centerY, -0.04)
  return plane
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

export type BoardSurfaceTokens = {
  boardFace: string
  boardEdge: string
  contactShadow: string
}

/** The grid lines are authored in the local XZ plane (y = 0), so the
    surface children use the same plane with small y offsets: the face sits
    below the lines, the outline floats just above them, and the shadow ring
    sits between face and lines. Callers mount the group with the same
    rotation as the grid. The -π/2 turn points the face normal along local
    +Y — world +Z (up) once the desktop grid rotation applies, and out of
    the wall toward the camera in wall mode — so the face is lit, not dark. */
function planeInGridXZ(sizeX: number, sizeY: number): THREE.PlaneGeometry {
  const plane = new THREE.PlaneGeometry(sizeX, sizeY)
  plane.rotateX(-Math.PI / 2)
  return plane
}

/**
 * The planning surface under the grid lines (viewport fix ①): a plate one
 * step from the scene ground (--vp-board-face) with an outline
 * (--vp-board-edge) and a contact-shadow ring (--vp-contact-shadow). The
 * 1.4x shadow quad puts its ring peak just past the plate rim.
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

  const shadow = new THREE.Mesh(
    planeInGridXZ(sizeX * 1.4, sizeY * 1.4),
    createContactShadowMaterial(tokens.contactShadow),
  )
  shadow.position.y = -0.04
  shadow.renderOrder = -3
  group.add(shadow)

  return group
}
