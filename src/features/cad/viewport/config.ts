import {
  DEFAULT_MODEL_COLORS,
  type ModelColors,
} from '../../../cad-contract/model-colors'
import type { ViewportVector } from './coordinates'

export const CAD_VIEWPORT_CONFIG = {
  modelColor: DEFAULT_MODEL_COLORS.primary,
  modelPartColors: {
    body: DEFAULT_MODEL_COLORS.primary,
    text: DEFAULT_MODEL_COLORS.secondary,
    rim: DEFAULT_MODEL_COLORS.secondary,
    icon: DEFAULT_MODEL_COLORS.secondary,
    accent: DEFAULT_MODEL_COLORS.secondary,
  },
  modelEmissiveIntensity: 0.2,
  edgeThresholdAngle: 20,
  largePreviewTriangleThreshold: 5_000,
  edgeOpacity: 0.72,
} as const

export type CadViewportPartName =
  keyof typeof CAD_VIEWPORT_CONFIG.modelPartColors

export function isCadViewportPartName(
  name: string,
): name is CadViewportPartName {
  return name in CAD_VIEWPORT_CONFIG.modelPartColors
}

export function colorForCadViewportPart(
  name: CadViewportPartName,
  colors: ModelColors = DEFAULT_MODEL_COLORS,
): string {
  return name === 'body' ? colors.primary : colors.secondary
}

/* Fallback gizmo geometry/copy config. Colors here only backstop contexts
   without CSS tokens; the live axis/label colors come from the viewport
   theme (src/features/cad/viewport/theme.ts) and match Part D of the warm
   design tokens. */
export const CAD_VIEWPORT_GIZMO = {
  id: 'cad-viewport-xyz-gizmo',
  className: 'cad-viewport-xyz-gizmo',
  container: '#cad-viewport-surface',
  type: 'sphere',
  placement: 'top-right',
  size: 76,
  offset: {
    top: 10,
    right: 10,
  },
  animated: false,
  background: {
    enabled: true,
    color: '#fff7f2',
    opacity: 0.84,
  },
  x: {
    label: 'X',
    color: '#c8401f',
    labelColor: '#362a24',
  },
  y: {
    label: 'Y',
    color: '#1f7a3a',
    labelColor: '#362a24',
  },
  z: {
    label: 'Z',
    color: '#0284c7',
    labelColor: '#362a24',
  },
} as const

export const CAD_VIEWPORT_LIGHTING = {
  hemisphere: {
    intensity: 1.2,
    position: [0, 0, 1] as ViewportVector,
  },
  key: {
    intensity: 2.2,
    position: [100, 120, 80] as ViewportVector,
  },
  oppositeFill: {
    intensity: 1.05,
    position: [-100, -120, -70] as ViewportVector,
  },
} as const
