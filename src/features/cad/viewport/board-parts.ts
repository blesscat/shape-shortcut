import * as THREE from 'three'
import type { ModelId } from '../../../cad-contract/units'
import { getModelDefinition } from '../model-catalog'

/**
 * Board substrate parts (viewport fix ①, design-tokens.css Part D v2 /
 * design-spec-4.2.1): the OpenGrid board is scene infrastructure, so its
 * resting face reads the shared --cad-viewport-board-face token — one step
 * away from the scene ground — instead of the instance color. The snap
 * shares the 基礎 zone but is a clip, not a plate, and keeps its color.
 */
export function isBoardSubstrateModel(modelId: string): boolean {
  if (modelId === 'opengrid-snap') return false
  // Runtime-safe: the lookup is an id equality scan; unknown ids fall
  // through to undefined either way.
  return getModelDefinition(modelId as ModelId)?.partCategory === 'base'
}

const SHADOW_TEXTURE_SIZE = 256

let contactShadowTexture: THREE.CanvasTexture | null = null

/**
 * Radial alpha gradient shared by every contact shadow quad; the quad's
 * material supplies the theme color (--cad-viewport-contact-shadow).
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
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.55)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, SHADOW_TEXTURE_SIZE, SHADOW_TEXTURE_SIZE)
  contactShadowTexture = new THREE.CanvasTexture(canvas)
  return contactShadowTexture
}

export function createContactShadowMaterial(
  color: string,
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    map: getContactShadowTexture(),
    transparent: true,
    depthWrite: false,
  })
}

/**
 * A quad just under the board's base plane (print frame: base at Z=0,
 * footprint centered on XY), slightly larger than the footprint so the
 * shadow peeks out on all sides. The caller mounts it with the board's
 * matrix, so the local -Z offset tracks desk and wall orientations alike.
 */
export function createBoardContactShadowGeometry(
  geometry: THREE.BufferGeometry,
): THREE.PlaneGeometry {
  geometry.computeBoundingBox()
  const bounds = geometry.boundingBox
  const sizeX = Math.max((bounds?.max.x ?? 0) - (bounds?.min.x ?? 0), 1) * 1.12
  const sizeY = Math.max((bounds?.max.y ?? 0) - (bounds?.min.y ?? 0), 1) * 1.12
  const plane = new THREE.PlaneGeometry(sizeX, sizeY)
  const centerX = bounds ? (bounds.min.x + bounds.max.x) / 2 : 0
  const centerY = bounds ? (bounds.min.y + bounds.max.y) / 2 : 0
  plane.translate(centerX, centerY, -0.4)
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
