import * as THREE from 'three'

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
 * conflict reads even next to the blue selection or in grayscale. 4.2.2
 * removed the planning plate and halo rings; the grid tokens alone carry
 * the light theme, so this hatch is the file's only renderer.
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
