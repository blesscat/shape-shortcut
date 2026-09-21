import type { DiagnosticParams } from '../diagnostics'
import {
  OPENGRID_LABEL_ACCENT_DEPTH,
  OPENGRID_LABEL_CARD_HEIGHT,
  OPENGRID_LABEL_CARD_INSERTION_THICKNESS,
  OPENGRID_LABEL_WIDTH_TIERS,
} from './opengrid-label-shared'

export type OpenGridLabelTagParameterKey =
  'widthTier' | 'gripThickness' | 'icon' | 'text'

/** Shared label-system width tiers; identical to the card/holder tiers. */
export const OPENGRID_LABEL_TAG_WIDTH_TIERS = OPENGRID_LABEL_WIDTH_TIERS

export type OpenGridLabelTagWidthTier =
  (typeof OPENGRID_LABEL_TAG_WIDTH_TIERS)[number]

export type OpenGridLabelTagIconId =
  | 'wrench'
  | 'screwdriver'
  | 'tools'
  | 'hammer'
  | 'box-seam'
  | 'archive'
  | 'battery-full'
  | 'cpu'
  | 'lightbulb'
  | 'paperclip'
  | 'scissors'
  | 'brush'
  | 'palette'
  | 'usb-drive'
  | 'sd-card'
  | 'keyboard'
  | 'mouse'
  | 'headset'
  | 'camera'
  | 'gear-fill'

export const OPENGRID_LABEL_TAG_ICON_IDS: readonly OpenGridLabelTagIconId[] = [
  'wrench',
  'screwdriver',
  'tools',
  'hammer',
  'box-seam',
  'archive',
  'battery-full',
  'cpu',
  'lightbulb',
  'paperclip',
  'scissors',
  'brush',
  'palette',
  'usb-drive',
  'sd-card',
  'keyboard',
  'mouse',
  'headset',
  'camera',
  'gear-fill',
]

export type OpenGridLabelTagParameters = {
  widthTier: OpenGridLabelTagWidthTier
  gripThickness: number
  icon: OpenGridLabelTagIconId
  text?: string
}

export const OPENGRID_LABEL_TAG_CONFIGURATION = {
  plateThickness: OPENGRID_LABEL_CARD_INSERTION_THICKNESS,
  plateHangLength: OPENGRID_LABEL_CARD_HEIGHT,
  maxTextLength: 6,
  gripThicknessMin: 0.8,
  gripThicknessMax: 5,
  gripThicknessStep: 0.1,
  gripClearance: 0.2,
  clipArmThickness: 0.8,
  clipEdgeEngagement: 6,
  clipBackWallThickness: 1.2,
  defaultWidthTier: 40,
  defaultGripThickness: 1.2,
  defaultIcon: 'gear-fill',
  defaultText: '' as string,
  accentDepth: OPENGRID_LABEL_ACCENT_DEPTH,
  /** Curated Bootstrap Icons subset (MIT, (c) Bootstrap Authors). */
  iconSource: 'Bootstrap Icons v1 (MIT)',
  defaultParameters: {
    widthTier: 40,
    gripThickness: 1.2,
    icon: 'gear-fill',
    text: '',
  } as OpenGridLabelTagParameters,
  fileNames: {
    step: 'opengrid-label-tag.step',
    stl: 'opengrid-label-tag.stl',
    threeMf: 'opengrid-label-tag.3mf',
  },
} as const

export function isOpenGridLabelTagWidthTier(
  value: unknown,
): value is OpenGridLabelTagWidthTier {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    OPENGRID_LABEL_TAG_WIDTH_TIERS.includes(value as OpenGridLabelTagWidthTier)
  )
}

export function isOpenGridLabelTagIconId(
  value: unknown,
): value is OpenGridLabelTagIconId {
  return (
    typeof value === 'string' &&
    OPENGRID_LABEL_TAG_ICON_IDS.includes(value as OpenGridLabelTagIconId)
  )
}

export function normalizeOpenGridLabelTagText(value: string): string {
  return value.normalize('NFC').replace(/\s/gu, '')
}

export type OpenGridLabelTagValidation =
  | {
      valid: true
      value: OpenGridLabelTagParameters
    }
  | {
      valid: false
      issues: Array<{
        field: OpenGridLabelTagParameterKey | 'parameters'
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
  field: OpenGridLabelTagParameterKey | 'parameters',
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

export function validateOpenGridLabelTagParameters(
  value: unknown,
): OpenGridLabelTagValidation {
  if (!isRecord(value)) return invalid('parameters')

  const keys = Object.keys(value)
  const knownKeys: OpenGridLabelTagParameterKey[] = [
    'widthTier',
    'gripThickness',
    'icon',
    'text',
  ]
  if (keys.some((key) => !knownKeys.includes(key as never))) {
    return invalid('parameters')
  }

  const rawWidthTier =
    value.widthTier ??
    OPENGRID_LABEL_TAG_CONFIGURATION.defaultParameters.widthTier
  if (!isOpenGridLabelTagWidthTier(rawWidthTier)) {
    return invalid('widthTier', 'validation.labelTagWidthTierInvalid', {
      values: OPENGRID_LABEL_TAG_WIDTH_TIERS.join('/'),
    })
  }

  const rawGripThickness =
    value.gripThickness ??
    OPENGRID_LABEL_TAG_CONFIGURATION.defaultParameters.gripThickness
  if (
    !validNumber(rawGripThickness) ||
    rawGripThickness < OPENGRID_LABEL_TAG_CONFIGURATION.gripThicknessMin ||
    rawGripThickness > OPENGRID_LABEL_TAG_CONFIGURATION.gripThicknessMax
  ) {
    return invalid(
      'gripThickness',
      'validation.labelTagGripThicknessOutOfRange',
      {
        min: OPENGRID_LABEL_TAG_CONFIGURATION.gripThicknessMin,
        max: OPENGRID_LABEL_TAG_CONFIGURATION.gripThicknessMax,
      },
    )
  }

  const rawIcon =
    value.icon ?? OPENGRID_LABEL_TAG_CONFIGURATION.defaultParameters.icon
  if (!isOpenGridLabelTagIconId(rawIcon)) {
    return invalid('icon', 'validation.labelTagIconUnknown')
  }

  let text = OPENGRID_LABEL_TAG_CONFIGURATION.defaultText
  if (value.text !== undefined) {
    if (typeof value.text !== 'string') return invalid('text')
    text = normalizeOpenGridLabelTagText(value.text)
  }
  const textLength = Array.from(text).length
  if (textLength > OPENGRID_LABEL_TAG_CONFIGURATION.maxTextLength) {
    return invalid('text', 'validation.labelTagTextTooLong', {
      max: OPENGRID_LABEL_TAG_CONFIGURATION.maxTextLength,
    })
  }

  return {
    valid: true,
    value: {
      widthTier: rawWidthTier,
      gripThickness: rawGripThickness,
      icon: rawIcon,
      ...(textLength > 0 ? { text } : {}),
    },
  }
}

export function isOpenGridLabelTagParameters(
  value: unknown,
): value is OpenGridLabelTagParameters {
  return validateOpenGridLabelTagParameters(value).valid
}

/** Nominal total Y extent: plate hang length plus clip envelope. */
export function openGridLabelTagDepthFor(): number {
  return (
    OPENGRID_LABEL_TAG_CONFIGURATION.plateHangLength +
    OPENGRID_LABEL_TAG_CONFIGURATION.clipEdgeEngagement
  )
}

/** Nominal total Z stack: plate plus grip channel and arm stack-up. */
export function openGridLabelTagHeightFor(gripThickness: number): number {
  return (
    OPENGRID_LABEL_TAG_CONFIGURATION.plateThickness +
    OPENGRID_LABEL_TAG_CONFIGURATION.clipArmThickness * 2 +
    OPENGRID_LABEL_TAG_CONFIGURATION.gripClearance +
    gripThickness
  )
}

export function boundsForOpenGridLabelTag(
  parameters: OpenGridLabelTagParameters,
) {
  const validation = validateOpenGridLabelTagParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-tag')
  }

  const width = validation.value.widthTier
  const depth = openGridLabelTagDepthFor()
  const height = openGridLabelTagHeightFor(validation.value.gripThickness)
  const halfWidth = Number((width / 2).toFixed(6))
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

function parameterSuffixFor(parameters: OpenGridLabelTagParameters): string {
  const grip = parameters.gripThickness.toFixed(1).replace(/\.0$/, '')
  return `w${parameters.widthTier}-g${grip}-${parameters.icon}`
}

function fileNameFor(
  parameters: OpenGridLabelTagParameters,
  format: keyof typeof OPENGRID_LABEL_TAG_CONFIGURATION.fileNames,
): string {
  if (!isOpenGridLabelTagParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-tag')
  }
  const base = OPENGRID_LABEL_TAG_CONFIGURATION.fileNames[format]
  const suffix = parameterSuffixFor(parameters)
  return base.replace('opengrid-label-tag', `opengrid-label-tag-${suffix}`)
}

export function openGridLabelTagFileName(
  parameters: OpenGridLabelTagParameters,
): string {
  return fileNameFor(parameters, 'step')
}

export function openGridLabelTagStlFileName(
  parameters: OpenGridLabelTagParameters,
): string {
  return fileNameFor(parameters, 'stl')
}

export function openGridLabelTagThreeMfFileName(
  parameters: OpenGridLabelTagParameters,
): string {
  return fileNameFor(parameters, 'threeMf')
}
