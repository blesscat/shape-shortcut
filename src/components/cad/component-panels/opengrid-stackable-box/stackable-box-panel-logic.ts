import {
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS,
  type OpenGridStackableBoxOpeningDirection,
  type OpenGridStackableBoxOpeningParameterKey,
  type OpenGridStackableBoxParameters,
} from '../../../../cad-contract/units'
import type { ComponentPanelProps } from '../types'

export type BoxTopRimMode = 'stacking-rail' | 'flat-top'
export type BoxBottomMode = 'stacking' | 'thin-shell' | 'none'
export type BoxSeatMode = 'none' | 'detachable-corner-seat' | 'integrated'

export const topRimModeOptions: ReadonlyArray<{
  value: BoxTopRimMode
  labelKey: string
  descriptionKey: string
}> = [
  {
    value: 'stacking-rail',
    labelKey: 'panel.box.topRimStacking',
    descriptionKey: 'panel.box.topRimStackingDescription',
  },
  {
    value: 'flat-top',
    labelKey: 'panel.box.topRimFlat',
    descriptionKey: 'panel.box.topRimFlatDescription',
  },
]

export const bottomModeOptions: ReadonlyArray<{
  value: BoxBottomMode
  labelKey: string
  descriptionKey: string
}> = [
  {
    value: 'stacking',
    labelKey: 'panel.box.bottomStacking',
    descriptionKey: 'panel.box.bottomStackingDescription',
  },
  {
    value: 'thin-shell',
    labelKey: 'panel.box.bottomThinShell',
    descriptionKey: 'panel.box.bottomThinShellDescription',
  },
  {
    value: 'none',
    labelKey: 'panel.box.bottomNone',
    descriptionKey: 'panel.box.bottomNoneDescription',
  },
]

export const seatModeOptions: ReadonlyArray<{
  value: BoxSeatMode
  labelKey: string
  descriptionKey: string
}> = [
  {
    value: 'none',
    labelKey: 'panel.seat.none',
    descriptionKey: 'panel.seat.noneDescription',
  },
  {
    value: 'detachable-corner-seat',
    labelKey: 'panel.seat.detachableCornerSeat',
    descriptionKey: 'panel.seat.detachableCornerSeatDescription',
  },
  {
    value: 'integrated',
    labelKey: 'panel.seat.integrated',
    descriptionKey: 'panel.seat.integratedDescription',
  },
]

export function seatModeForRawParameters(
  rawParameters: ComponentPanelProps['rawParameters'],
): BoxSeatMode {
  const value = rawParameters.cornerSeatMode
  if (value === 'none' || value === 'integrated') return value
  return 'detachable-corner-seat'
}

export function topRimModeForRawParameters(
  rawParameters: ComponentPanelProps['rawParameters'],
): BoxTopRimMode {
  if (rawParameters.topRimMode === 'flat-top') return 'flat-top'
  return 'stacking-rail'
}

export function bottomModeForRawParameters(
  rawParameters: ComponentPanelProps['rawParameters'],
): BoxBottomMode {
  const value = rawParameters.bottomMode
  if (value === 'thin-shell' || value === 'none') return value
  return 'stacking'
}

export const openingGroups = [
  {
    direction: '-Y',
    labelKey: 'panel.opening.direction.front',
    keys: [
      'openingMinusYDepth',
      'openingMinusYBottomLength',
      'openingMinusYAngle',
    ],
  },
  {
    direction: '+Y',
    labelKey: 'panel.opening.direction.back',
    keys: [
      'openingPlusYDepth',
      'openingPlusYBottomLength',
      'openingPlusYAngle',
    ],
  },
  {
    direction: '-X',
    labelKey: 'panel.opening.direction.left',
    keys: [
      'openingMinusXDepth',
      'openingMinusXBottomLength',
      'openingMinusXAngle',
    ],
  },
  {
    direction: '+X',
    labelKey: 'panel.opening.direction.right',
    keys: [
      'openingPlusXDepth',
      'openingPlusXBottomLength',
      'openingPlusXAngle',
    ],
  },
] as const

export function rawNumberFor(
  rawParameters: ComponentPanelProps['rawParameters'],
  key: string,
): number | null {
  const rawValue = rawParameters[key as keyof typeof rawParameters]
  if (rawValue === undefined || rawValue.trim() === '') return null
  const value = Number(rawValue)
  return Number.isFinite(value) ? value : null
}

export function openingGroupHasNonDefaultValue(
  rawParameters: ComponentPanelProps['rawParameters'],
  group: (typeof openingGroups)[number],
): boolean {
  return group.keys.some((key) => {
    const rawValue = rawParameters[key]
    if (rawValue === undefined || rawValue.trim() === '') return false
    const value = Number(rawValue)
    if (!Number.isFinite(value)) return true
    return value !== OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS[key]
  })
}

export function hasNonDefaultOpeningValues(
  rawParameters: ComponentPanelProps['rawParameters'],
): boolean {
  return openingGroups.some((group) =>
    openingGroupHasNonDefaultValue(rawParameters, group),
  )
}

export function openingValueSignatureForRawParameters(
  rawParameters: ComponentPanelProps['rawParameters'],
): string {
  return OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS.map(
    (key) => rawParameters[key] ?? '',
  ).join('|')
}

export function parametersForRange(
  rawParameters: ComponentPanelProps['rawParameters'],
): OpenGridStackableBoxParameters | null {
  const x = rawNumberFor(rawParameters, 'x')
  const y = rawNumberFor(rawParameters, 'y')
  const height = rawNumberFor(rawParameters, 'height')
  if (x === null || y === null || height === null) return null

  const openingValues = {} as Record<
    OpenGridStackableBoxOpeningParameterKey,
    number
  >
  for (const key of OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS) {
    openingValues[key] =
      rawNumberFor(rawParameters, key) ??
      OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS[key]
  }

  return {
    x,
    y,
    height,
    cornerSeatMode: seatModeForRawParameters(rawParameters),
    fullBottomHoleGrid: rawParameters.fullBottomHoleGrid === 'true',
    topRimMode: topRimModeForRawParameters(rawParameters),
    bottomMode: bottomModeForRawParameters(rawParameters),
    honeycombMode: rawParameters.honeycombMode === 'true',
    topRimEnabled: rawParameters.topRimEnabled === 'true',
    topRimHeight:
      rawNumberFor(rawParameters, 'topRimHeight') ??
      OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultTopRimHeight,
    ...openingValues,
  }
}
