import type { ComponentPanelProps } from '../types'

export const magnetDimensionKeys = [
  'magnetHoleLength',
  'magnetHoleWidth',
  'magnetHoleDiameter',
  'magnetHoleThickness',
] as const

export function clearMagnetHole(
  onInputChange: ComponentPanelProps['onInputChange'],
): void {
  onInputChange('magnetHoleShape', 'none')
  for (const key of magnetDimensionKeys) onInputChange(key, '0')
}
