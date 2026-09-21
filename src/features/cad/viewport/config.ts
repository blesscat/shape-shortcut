import type { ViewportVector } from './coordinates'

export const CAD_VIEWPORT_CONFIG = {
  modelColor: '#4e7cff',
  modelPartColors: {
    body: '#4e7cff',
    text: '#f59e0b',
    icon: '#f59e0b',
    accent: '#f59e0b',
  },
  modelEmissiveIntensity: 0.2,
  edgeThresholdAngle: 20,
  largePreviewTriangleThreshold: 5_000,
  edgeOpacity: 0.72,
} as const

export type CadViewportPartName =
  keyof typeof CAD_VIEWPORT_CONFIG.modelPartColors

export function colorForCadViewportPart(name: CadViewportPartName): string {
  return CAD_VIEWPORT_CONFIG.modelPartColors[name]
}

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
    color: '#eef2f8',
    opacity: 0.84,
  },
  x: {
    label: 'X',
    color: '#c0392b',
    labelColor: '#7f1d1d',
  },
  y: {
    label: 'Y',
    color: '#198754',
    labelColor: '#166534',
  },
  z: {
    label: 'Z',
    color: '#2563eb',
    labelColor: '#1e3a8a',
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
