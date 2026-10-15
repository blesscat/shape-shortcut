import {
  OPENGRID_CONFIGURATION,
  isOpenGridParameters,
  normalizeOpenGridParameters,
  type OpenGridCornerFlags,
  type OpenGridFrameSideFlags,
  type OpenGridParameterKey,
  type OpenGridParameters,
  type OpenGridSideFlags,
  type OpenGridScrewDimensions,
  type OpenGridScrewPreset,
} from '../../../../cad-contract/units'
import {
  cloneModelParameters,
  getSystemPreset,
  type OpenGridSystemContext,
} from '../../../../features/cad/system-entry-context'

export type ScrewPresetOption =
  'official-default' | OpenGridScrewPreset | 'custom'

export type GridAxis = 'x' | 'y'

export function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => valuesEqual(value, right[index]))
    )
  }
  if (
    typeof left === 'object' &&
    left !== null &&
    typeof right === 'object' &&
    right !== null
  ) {
    const leftRecord = left as Record<string, unknown>
    const rightRecord = right as Record<string, unknown>
    const leftKeys = Object.keys(leftRecord)
    const rightKeys = Object.keys(rightRecord)
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) =>
          Object.prototype.hasOwnProperty.call(rightRecord, key) &&
          valuesEqual(leftRecord[key], rightRecord[key]),
      )
    )
  }
  return false
}

export function isParameterChanged(
  parameters: OpenGridParameters,
  defaults: OpenGridParameters,
  field: OpenGridParameterKey,
): boolean {
  return !valuesEqual(parameters[field], defaults[field])
}

export function screwConfigurationChanged(
  parameters: OpenGridParameters,
  defaults: OpenGridParameters,
): boolean {
  return (
    isParameterChanged(parameters, defaults, 'screwKind') ||
    isParameterChanged(parameters, defaults, 'screwDiameter') ||
    isParameterChanged(parameters, defaults, 'screwHeadDiameter') ||
    isParameterChanged(parameters, defaults, 'screwHeadInset') ||
    isParameterChanged(parameters, defaults, 'screwHeadIsCountersunk') ||
    isParameterChanged(parameters, defaults, 'screwHeadCountersunkDegree')
  )
}

export const screwPresetKeys: readonly OpenGridScrewPreset[] = [
  'm3',
  'm4',
  'm5',
  'm6',
  'm7',
]

export function screwDimensionsMatch(
  parameters: OpenGridParameters,
  dimensions: OpenGridScrewDimensions,
): boolean {
  return (
    parameters.screwDiameter === dimensions.diameter &&
    parameters.screwHeadDiameter === dimensions.headDiameter &&
    parameters.screwHeadInset === dimensions.headInset &&
    parameters.screwHeadIsCountersunk === dimensions.headIsCountersunk &&
    parameters.screwHeadCountersunkDegree === dimensions.headCountersunkDegree
  )
}

export function currentScrewPreset(
  parameters: OpenGridParameters,
): ScrewPresetOption {
  if (parameters.screwKind === 'official-default') {
    return 'official-default'
  }
  for (const preset of screwPresetKeys) {
    if (
      screwDimensionsMatch(
        parameters,
        OPENGRID_CONFIGURATION.screwPresets[preset],
      )
    ) {
      return preset
    }
  }
  return 'custom'
}

export function isScrewPreset(value: string): value is OpenGridScrewPreset {
  return screwPresetKeys.includes(value as OpenGridScrewPreset)
}

export function isScrewPresetOption(value: string): value is ScrewPresetOption {
  return (
    value === 'official-default' || value === 'custom' || isScrewPreset(value)
  )
}

export function screwPresetFitsCurrentBoard(
  variant: OpenGridParameters['variant'],
  dimensions: OpenGridScrewDimensions,
): boolean {
  const boardThickness = OPENGRID_CONFIGURATION.variants[variant].thickness
  return (
    dimensions.diameter > 0 &&
    dimensions.diameter <= dimensions.headDiameter &&
    dimensions.headDiameter <= OPENGRID_CONFIGURATION.tileInnerSize &&
    dimensions.headInset >= 0 &&
    dimensions.headInset <= boardThickness
  )
}

export function applyScrewDimensionsChanges(
  screwKind: OpenGridParameters['screwKind'],
  dimensions: OpenGridScrewDimensions,
): Partial<OpenGridParameters> {
  return {
    screwKind,
    screwDiameter: dimensions.diameter,
    screwHeadDiameter: dimensions.headDiameter,
    screwHeadInset: dimensions.headInset,
    screwHeadIsCountersunk: dimensions.headIsCountersunk,
    screwHeadCountersunkDegree: dimensions.headCountersunkDegree,
  }
}

export function applyScrewPresetChanges(
  preset: OpenGridScrewPreset,
): Partial<OpenGridParameters> {
  return applyScrewDimensionsChanges(
    'custom',
    OPENGRID_CONFIGURATION.screwPresets[preset],
  )
}

export function centerScrewAvailable(rows: number, columns: number): boolean {
  return rows >= 2 && columns >= 2
}

export function axisHasHalfCell(
  parameters: Pick<OpenGridParameters, 'halfCellX' | 'halfCellY'>,
  axis: GridAxis,
): boolean {
  return axis === 'x'
    ? parameters.halfCellX !== 'none'
    : parameters.halfCellY !== 'none'
}

export function displayedGridCount(
  parameters: Pick<
    OpenGridParameters,
    'columns' | 'halfCellX' | 'halfCellY' | 'rows'
  >,
  axis: GridAxis,
): number {
  const fullCount = axis === 'x' ? parameters.columns : parameters.rows
  return fullCount + (axisHasHalfCell(parameters, axis) ? 0.5 : 0)
}

export function formatGridCount(
  parameters: Pick<
    OpenGridParameters,
    'columns' | 'halfCellX' | 'halfCellY' | 'rows'
  >,
  axis: GridAxis,
): string {
  return displayedGridCount(parameters, axis).toFixed(1).replace(/\.0$/, '')
}

export function gridCountMinimum(): number {
  return 1
}

export function gridCountMaximum(
  parameters: Pick<OpenGridParameters, 'halfCellX' | 'halfCellY'>,
  axis: GridAxis,
): number {
  return (
    OPENGRID_CONFIGURATION.maxGridCount +
    (axisHasHalfCell(parameters, axis) ? 0.5 : 0)
  )
}

export function fullGridCountFromSlider(
  axis: GridAxis,
  value: number,
  options: { hasHalfCell: boolean; currentValue: number },
): number {
  if (!options.hasHalfCell) return Math.round(value)

  // Half-cell mode exposes only 1.5, 2.5, ... as committed total counts.
  // The range keeps a 0.5 step and briefly visits the integer between two
  // valid half counts while the thumb moves in either direction.
  const fullCount =
    value < options.currentValue
      ? Math.floor(value - 0.5)
      : Math.ceil(value - 0.5)
  return Math.max(1, fullCount)
}

export function gridCountStep(
  parameters: Pick<OpenGridParameters, 'halfCellX' | 'halfCellY'>,
  axis: GridAxis,
): number {
  return axisHasHalfCell(parameters, axis) ? 0.5 : 1
}

export type OpenGridParameterChanges = Partial<
  Omit<
    OpenGridParameters,
    'chamferCorners' | 'connectorSides' | 'targetFrameSides'
  >
> & {
  chamferCorners?: Partial<OpenGridCornerFlags>
  connectorSides?: Partial<OpenGridSideFlags>
  targetFrameSides?: Partial<OpenGridFrameSideFlags>
}

export function mergeOpenGridParameters(
  parameters: OpenGridParameters,
  changes: OpenGridParameterChanges,
): OpenGridParameters {
  return {
    ...parameters,
    ...changes,
    chamferCorners: {
      ...parameters.chamferCorners,
      ...(changes.chamferCorners ?? {}),
    },
    connectorSides: {
      ...parameters.connectorSides,
      ...(changes.connectorSides ?? {}),
    },
    targetFrameSides: {
      ...parameters.targetFrameSides,
      ...(changes.targetFrameSides ?? {}),
    },
  }
}

export function openGridDefinitionDefaults(): OpenGridParameters {
  return {
    ...OPENGRID_CONFIGURATION.defaultParameters,
    chamferCorners: {
      ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    },
    connectorSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    },
    targetFrameSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.targetFrameSides,
    },
  }
}

export function effectiveOpenGridDefaults(
  context: OpenGridSystemContext | undefined,
): OpenGridParameters {
  let defaults: unknown = openGridDefinitionDefaults()
  if (context) {
    const systemPreset = getSystemPreset('opengrid', context)
    if (systemPreset) defaults = systemPreset
  }
  if (!isOpenGridParameters(defaults)) {
    throw new Error('OPENGRID_SYSTEM_PRESET_INVALID')
  }
  return normalizeOpenGridParameters(cloneModelParameters(defaults))
}
