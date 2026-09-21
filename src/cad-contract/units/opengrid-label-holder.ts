import type { DiagnosticParams } from '../diagnostics'
import {
  OPENGRID_LABEL_CARD_HEIGHT,
  OPENGRID_LABEL_CARD_INSERTION_THICKNESS,
  OPENGRID_LABEL_CARD_POCKET_PROUD,
  OPENGRID_LABEL_WIDTH_TIERS,
  isOpenGridLabelWidthTier,
  type OpenGridLabelWidthTier,
} from './opengrid-label-shared'

export type OpenGridLabelHolderParameterKey = 'widthTier' | 'gripThickness'

export type OpenGridLabelHolderParameters = {
  widthTier: OpenGridLabelWidthTier
  gripThickness: number
}

export const OPENGRID_LABEL_HOLDER_CONFIGURATION = {
  gripThicknessMin: 0.8,
  gripThicknessMax: 5,
  gripClearance: 0.2,
  clipEdgeEngagement: 6,
  clipBackWallThickness: 1.2,
  clipArmThickness: 0.8,
  /** Holder base plate thickness (mm); the card pocket sits in its face. */
  baseThickness: 2,
  /** Card pocket depth (mm): a flat card sits 0.15 mm proud of the face. */
  pocketDepth:
    OPENGRID_LABEL_CARD_INSERTION_THICKNESS - OPENGRID_LABEL_CARD_POCKET_PROUD,
  /** Pocket side clearance per X wall (mm). */
  pocketWallClearance: 0.15,
  /** Pocket frame width around the card along X (mm). */
  pocketFrameWidth: 1.6,
  detentProtrusion: 0.25,
  detentLength: 1.2,
  defaultWidthTier: 40,
  defaultGripThickness: 1.2,
  defaultParameters: {
    widthTier: 40,
    gripThickness: 1.2,
  } as OpenGridLabelHolderParameters,
  fileNames: {
    step: 'opengrid-label-holder.step',
    stl: 'opengrid-label-holder.stl',
  },
} as const

export type OpenGridLabelHolderValidation =
  | {
      valid: true
      value: OpenGridLabelHolderParameters
    }
  | {
      valid: false
      issues: Array<{
        field: OpenGridLabelHolderParameterKey | 'parameters'
        messageId: string
        params?: DiagnosticParams
      }>
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function invalid(
  field: OpenGridLabelHolderParameterKey | 'parameters',
  messageId = 'validation.invalid',
  params?: DiagnosticParams,
) {
  return {
    valid: false as const,
    issues: [{ field, messageId, ...(params ? { params } : {}) }],
  }
}

function validNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function validateOpenGridLabelHolderParameters(
  value: unknown,
): OpenGridLabelHolderValidation {
  if (!isRecord(value)) return invalid('parameters')

  const keys = Object.keys(value)
  const knownKeys: OpenGridLabelHolderParameterKey[] = [
    'widthTier',
    'gripThickness',
  ]
  if (keys.some((key) => !knownKeys.includes(key as never))) {
    return invalid('parameters')
  }

  const rawWidthTier =
    value.widthTier ??
    OPENGRID_LABEL_HOLDER_CONFIGURATION.defaultParameters.widthTier
  if (!isOpenGridLabelWidthTier(rawWidthTier)) {
    return invalid('widthTier', 'validation.labelHolderWidthTierInvalid', {
      values: OPENGRID_LABEL_WIDTH_TIERS.join('/'),
    })
  }

  const rawGripThickness =
    value.gripThickness ??
    OPENGRID_LABEL_HOLDER_CONFIGURATION.defaultParameters.gripThickness
  if (
    !validNumber(rawGripThickness) ||
    rawGripThickness < OPENGRID_LABEL_HOLDER_CONFIGURATION.gripThicknessMin ||
    rawGripThickness > OPENGRID_LABEL_HOLDER_CONFIGURATION.gripThicknessMax
  ) {
    return invalid(
      'gripThickness',
      'validation.labelHolderGripThicknessOutOfRange',
      {
        min: OPENGRID_LABEL_HOLDER_CONFIGURATION.gripThicknessMin,
        max: OPENGRID_LABEL_HOLDER_CONFIGURATION.gripThicknessMax,
      },
    )
  }

  return {
    valid: true,
    value: {
      widthTier: rawWidthTier,
      gripThickness: rawGripThickness,
    },
  }
}

export function isOpenGridLabelHolderParameters(
  value: unknown,
): value is OpenGridLabelHolderParameters {
  return validateOpenGridLabelHolderParameters(value).valid
}

/**
 * Nominal total Y extent: the pocket frame spans the card height plus the
 * saddle clip engagement envelope.
 */
export function openGridLabelHolderDepthFor(): number {
  return (
    OPENGRID_LABEL_HOLDER_CONFIGURATION.clipEdgeEngagement +
    OPENGRID_LABEL_CARD_HEIGHT
  )
}

/** Nominal total Z stack: base plate plus the saddle clip stack-up. */
export function openGridLabelHolderHeightFor(gripThickness: number): number {
  return (
    OPENGRID_LABEL_HOLDER_CONFIGURATION.baseThickness +
    OPENGRID_LABEL_HOLDER_CONFIGURATION.clipArmThickness * 2 +
    OPENGRID_LABEL_HOLDER_CONFIGURATION.gripClearance +
    gripThickness
  )
}

/** Nominal X half extent: card width tier plus the pocket frame. */
export function openGridLabelHolderHalfWidthFor(widthTier: number): number {
  return widthTier / 2 + OPENGRID_LABEL_HOLDER_CONFIGURATION.pocketFrameWidth
}

export function boundsForOpenGridLabelHolder(
  parameters: OpenGridLabelHolderParameters,
) {
  const validation = validateOpenGridLabelHolderParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-holder')
  }

  const depth = openGridLabelHolderDepthFor()
  const height = openGridLabelHolderHeightFor(validation.value.gripThickness)
  const halfWidth = Number(
    openGridLabelHolderHalfWidthFor(validation.value.widthTier).toFixed(6),
  )
  const halfDepth = Number((depth / 2).toFixed(6))
  return {
    min: [-halfWidth, -halfDepth, 0] as [number, number, number],
    max: [halfWidth, halfDepth, Number(height.toFixed(6))] as [
      number,
      number,
      number,
    ],
  }
}

function parameterSuffixFor(parameters: OpenGridLabelHolderParameters): string {
  const grip = parameters.gripThickness.toFixed(1).replace(/\.0$/, '')
  return `w${parameters.widthTier}-g${grip}`
}

function fileNameFor(
  parameters: OpenGridLabelHolderParameters,
  format: keyof typeof OPENGRID_LABEL_HOLDER_CONFIGURATION.fileNames,
): string {
  if (!isOpenGridLabelHolderParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-holder')
  }
  const base = OPENGRID_LABEL_HOLDER_CONFIGURATION.fileNames[format]
  const suffix = parameterSuffixFor(parameters)
  return base.replace(
    'opengrid-label-holder',
    `opengrid-label-holder-${suffix}`,
  )
}

export function openGridLabelHolderFileName(
  parameters: OpenGridLabelHolderParameters,
): string {
  return fileNameFor(parameters, 'step')
}

export function openGridLabelHolderStlFileName(
  parameters: OpenGridLabelHolderParameters,
): string {
  return fileNameFor(parameters, 'stl')
}
