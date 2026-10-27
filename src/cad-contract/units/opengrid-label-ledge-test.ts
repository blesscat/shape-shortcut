import {
  isOpenGridLabelLedgeUnits,
  isOpenGridLabelSnapFit,
  OPENGRID_LABEL_DEFAULT_SNAP_FIT,
  OPENGRID_LABEL_LEDGE,
  openGridLabelLedgeLayoutFor,
  openGridLabelLedgeSlopePoint,
  type OpenGridLabelSnapFit,
} from './opengrid-label-ledge'

export type OpenGridLabelLedgeTestParameters = {
  gridUnits: number
  labelSnapFit: OpenGridLabelSnapFit
}

export const OPENGRID_LABEL_LEDGE_TEST_CONFIGURATION = {
  defaultParameters: {
    gridUnits: 3,
    labelSnapFit: OPENGRID_LABEL_DEFAULT_SNAP_FIT,
  } as OpenGridLabelLedgeTestParameters,
  backThickness: 1,
  baseThickness: 1.2,
  sideMargin: 1,
} as const

const PARAMETER_KEYS = ['gridUnits', 'labelSnapFit'] as const

export function validateOpenGridLabelLedgeTestParameters(value: unknown) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some(
      (key) => !(PARAMETER_KEYS as readonly string[]).includes(key),
    )
  ) {
    return {
      valid: false as const,
      issues: [
        { field: 'parameters' as const, messageId: 'validation.invalid' },
      ],
    }
  }
  const { gridUnits, labelSnapFit } = value as Record<string, unknown>
  if (!isOpenGridLabelLedgeUnits(gridUnits)) {
    return {
      valid: false as const,
      issues: [
        { field: 'gridUnits' as const, messageId: 'validation.invalid' },
      ],
    }
  }
  if (!isOpenGridLabelSnapFit(labelSnapFit)) {
    return {
      valid: false as const,
      issues: [
        { field: 'labelSnapFit' as const, messageId: 'validation.invalid' },
      ],
    }
  }
  return { valid: true as const, value: { gridUnits, labelSnapFit } }
}

export function isOpenGridLabelLedgeTestParameters(
  value: unknown,
): value is OpenGridLabelLedgeTestParameters {
  return validateOpenGridLabelLedgeTestParameters(value).valid
}

function assertParameters(parameters: OpenGridLabelLedgeTestParameters): void {
  if (!isOpenGridLabelLedgeTestParameters(parameters))
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-ledge-test')
}

/**
 * Wall-frame ledge layout plus the coupon's Z placement: the wedge underside
 * meets the base top at the back wall, so the rim datum sits one free-hanging
 * wedge height above the base.
 */
export function openGridLabelLedgeTestLayoutFor(
  parameters: OpenGridLabelLedgeTestParameters,
) {
  assertParameters(parameters)
  const config = OPENGRID_LABEL_LEDGE_TEST_CONFIGURATION
  const ledge = openGridLabelLedgeLayoutFor(
    parameters.gridUnits,
    parameters.labelSnapFit,
  )
  return {
    ledge,
    rimZ: config.baseThickness + ledge.freeHangingHeight,
    halfWidth: ledge.outerHalfWidth + config.sideMargin,
  }
}

export function boundsForOpenGridLabelLedgeTest(
  parameters: OpenGridLabelLedgeTestParameters,
) {
  const config = OPENGRID_LABEL_LEDGE_TEST_CONFIGURATION
  const { ledge, rimZ, halfWidth } = openGridLabelLedgeTestLayoutFor(parameters)
  const [railEndV] = openGridLabelLedgeSlopePoint(
    ledge,
    ledge.slopeLength,
    ledge.projection,
  )
  return {
    min: [-halfWidth, -config.backThickness, 0] as [number, number, number],
    max: [halfWidth, railEndV, rimZ] as [number, number, number],
  }
}

function fileStem(parameters: OpenGridLabelLedgeTestParameters): string {
  assertParameters(parameters)
  return `opengrid-label-ledge-test-${parameters.gridUnits}u-fit-${parameters.labelSnapFit}`
}

export function openGridLabelLedgeTestFileName(
  parameters: OpenGridLabelLedgeTestParameters,
) {
  return `${fileStem(parameters)}.step`
}

export function openGridLabelLedgeTestStlFileName(
  parameters: OpenGridLabelLedgeTestParameters,
) {
  return `${fileStem(parameters)}.stl`
}
