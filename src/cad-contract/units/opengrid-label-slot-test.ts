import {
  isOpenGridLabelGridUnits,
  openGridLabelSlotLayoutFor,
  openGridLabelWidthFor,
  OPENGRID_LABEL_CARD_HEIGHT,
  OPENGRID_LABEL_CARD_INSERTION_THICKNESS,
  OPENGRID_LABEL_SLOT,
} from './opengrid-label-shared'

export type OpenGridLabelSlotTestParameters = { gridUnits: number }
export const OPENGRID_LABEL_SLOT_TEST_CONFIGURATION = {
  defaultParameters: { gridUnits: 3 } as OpenGridLabelSlotTestParameters,
  backThickness: 1,
  sideMargin: 1,
  bottomMargin: 1,
} as const

export function validateOpenGridLabelSlotTestParameters(value: unknown) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => key !== 'gridUnits')
  ) {
    return {
      valid: false as const,
      issues: [
        { field: 'parameters' as const, messageId: 'validation.invalid' },
      ],
    }
  }
  const gridUnits = (value as Record<string, unknown>).gridUnits
  if (!isOpenGridLabelGridUnits(gridUnits)) {
    return {
      valid: false as const,
      issues: [
        { field: 'gridUnits' as const, messageId: 'validation.invalid' },
      ],
    }
  }
  return { valid: true as const, value: { gridUnits } }
}

export function isOpenGridLabelSlotTestParameters(
  value: unknown,
): value is OpenGridLabelSlotTestParameters {
  return validateOpenGridLabelSlotTestParameters(value).valid
}

export function openGridLabelSlotTestLayoutFor(
  parameters: OpenGridLabelSlotTestParameters,
) {
  if (!isOpenGridLabelSlotTestParameters(parameters))
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-slot-test')
  const config = OPENGRID_LABEL_SLOT_TEST_CONFIGURATION
  const projection =
    OPENGRID_LABEL_CARD_INSERTION_THICKNESS +
    OPENGRID_LABEL_SLOT.depthClearance +
    OPENGRID_LABEL_SLOT.lipThickness
  const bodyWidth =
    openGridLabelWidthFor(parameters.gridUnits) +
    2 *
      (OPENGRID_LABEL_SLOT.sideClearance +
        OPENGRID_LABEL_SLOT.sideWall +
        config.sideMargin)
  const bodyThickness =
    config.bottomMargin +
    projection +
    OPENGRID_LABEL_CARD_HEIGHT +
    OPENGRID_LABEL_SLOT.topMargin
  return openGridLabelSlotLayoutFor(
    { bodyWidth, bodyThickness, bodyDepth: 0, frontCornerRadius: 0 },
    parameters.gridUnits,
  )
}

export function boundsForOpenGridLabelSlotTest(
  parameters: OpenGridLabelSlotTestParameters,
) {
  const slot = openGridLabelSlotTestLayoutFor(parameters)
  const config = OPENGRID_LABEL_SLOT_TEST_CONFIGURATION
  const halfWidth = slot.outerHalfWidth + config.sideMargin
  return {
    min: [-halfWidth, -slot.projection, 0] as [number, number, number],
    max: [
      halfWidth,
      config.backThickness,
      slot.cardTop + OPENGRID_LABEL_SLOT.topMargin,
    ] as [number, number, number],
  }
}

export function openGridLabelSlotTestFileName(
  parameters: OpenGridLabelSlotTestParameters,
) {
  if (!isOpenGridLabelSlotTestParameters(parameters))
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-slot-test')
  return `opengrid-label-slot-test-${parameters.gridUnits}u.step`
}
export function openGridLabelSlotTestStlFileName(
  parameters: OpenGridLabelSlotTestParameters,
) {
  return openGridLabelSlotTestFileName(parameters).replace(/\.step$/, '.stl')
}
