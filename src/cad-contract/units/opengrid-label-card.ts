import type { DiagnosticParams } from '../diagnostics'
import {
  OPENGRID_LABEL_ACCENT_DEPTH,
  OPENGRID_LABEL_CARD_HEIGHT,
  OPENGRID_LABEL_CARD_INSERTION_THICKNESS,
  OPENGRID_LABEL_CARD_RAISED_HEIGHT,
  OPENGRID_LABEL_WIDTH_TIERS,
  isOpenGridLabelWidthTier,
  type OpenGridLabelWidthTier,
} from './opengrid-label-shared'
import {
  OPENGRID_LABEL_TAG_ICON_IDS,
  normalizeOpenGridLabelTagText,
  isOpenGridLabelTagIconId,
  type OpenGridLabelTagIconId,
} from './opengrid-label-tag'

export type OpenGridLabelCardParameterKey =
  'widthTier' | 'style' | 'icon' | 'text'

export const OPENGRID_LABEL_CARD_STYLES = ['flat', 'raised'] as const

export type OpenGridLabelCardStyle = (typeof OPENGRID_LABEL_CARD_STYLES)[number]

export type OpenGridLabelCardIconId = OpenGridLabelTagIconId

export { OPENGRID_LABEL_TAG_ICON_IDS as OPENGRID_LABEL_CARD_ICON_IDS }

export type OpenGridLabelCardParameters = {
  widthTier: OpenGridLabelWidthTier
  style: OpenGridLabelCardStyle
  icon: OpenGridLabelCardIconId
  text?: string
}

export const OPENGRID_LABEL_CARD_CONFIGURATION = {
  plateThickness: OPENGRID_LABEL_CARD_INSERTION_THICKNESS,
  cardHeight: OPENGRID_LABEL_CARD_HEIGHT,
  accentDepth: OPENGRID_LABEL_ACCENT_DEPTH,
  raisedHeight: OPENGRID_LABEL_CARD_RAISED_HEIGHT,
  maxTextLength: 6,
  defaultWidthTier: 40,
  defaultStyle: 'raised',
  defaultIcon: 'gear-fill',
  defaultText: '' as string,
  defaultParameters: {
    widthTier: 40,
    style: 'raised',
    icon: 'gear-fill',
    text: '',
  } as OpenGridLabelCardParameters,
  fileNames: {
    step: 'opengrid-label-card.step',
    stl: 'opengrid-label-card.stl',
    threeMf: 'opengrid-label-card.3mf',
  },
} as const

export function isOpenGridLabelCardStyle(
  value: unknown,
): value is OpenGridLabelCardStyle {
  return (
    typeof value === 'string' &&
    OPENGRID_LABEL_CARD_STYLES.includes(value as OpenGridLabelCardStyle)
  )
}

export function normalizeOpenGridLabelCardText(value: string): string {
  return normalizeOpenGridLabelTagText(value)
}

export type OpenGridLabelCardValidation =
  | {
      valid: true
      value: OpenGridLabelCardParameters
    }
  | {
      valid: false
      issues: Array<{
        field: OpenGridLabelCardParameterKey | 'parameters'
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
  field: OpenGridLabelCardParameterKey | 'parameters',
  messageId = 'validation.invalid',
  params?: DiagnosticParams,
) {
  return {
    valid: false as const,
    issues: [{ field, messageId, ...(params ? { params } : {}) }],
  }
}

export function validateOpenGridLabelCardParameters(
  value: unknown,
): OpenGridLabelCardValidation {
  if (!isRecord(value)) return invalid('parameters')

  const keys = Object.keys(value)
  const knownKeys: OpenGridLabelCardParameterKey[] = [
    'widthTier',
    'style',
    'icon',
    'text',
  ]
  if (keys.some((key) => !knownKeys.includes(key as never))) {
    return invalid('parameters')
  }

  const rawWidthTier =
    value.widthTier ??
    OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters.widthTier
  if (!isOpenGridLabelWidthTier(rawWidthTier)) {
    return invalid('widthTier', 'validation.labelCardWidthTierInvalid', {
      values: OPENGRID_LABEL_WIDTH_TIERS.join('/'),
    })
  }

  const rawStyle =
    value.style ?? OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters.style
  if (!isOpenGridLabelCardStyle(rawStyle)) {
    return invalid('style', 'validation.labelCardStyleInvalid')
  }

  const rawIcon =
    value.icon ?? OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters.icon
  if (!isOpenGridLabelTagIconId(rawIcon)) {
    return invalid('icon', 'validation.labelCardIconUnknown')
  }

  let text = OPENGRID_LABEL_CARD_CONFIGURATION.defaultText
  if (value.text !== undefined) {
    if (typeof value.text !== 'string') return invalid('text')
    text = normalizeOpenGridLabelCardText(value.text)
  }
  const textLength = Array.from(text).length
  if (textLength > OPENGRID_LABEL_CARD_CONFIGURATION.maxTextLength) {
    return invalid('text', 'validation.labelCardTextTooLong', {
      max: OPENGRID_LABEL_CARD_CONFIGURATION.maxTextLength,
    })
  }

  return {
    valid: true,
    value: {
      widthTier: rawWidthTier,
      style: rawStyle,
      icon: rawIcon,
      ...(textLength > 0 ? { text } : {}),
    },
  }
}

export function isOpenGridLabelCardParameters(
  value: unknown,
): value is OpenGridLabelCardParameters {
  return validateOpenGridLabelCardParameters(value).valid
}

/** Nominal total Z thickness including the style's accent treatment. */
export function openGridLabelCardThicknessFor(
  style: OpenGridLabelCardStyle,
): number {
  return (
    OPENGRID_LABEL_CARD_CONFIGURATION.plateThickness +
    (style === 'raised' ? OPENGRID_LABEL_CARD_CONFIGURATION.raisedHeight : 0)
  )
}

export function boundsForOpenGridLabelCard(
  parameters: OpenGridLabelCardParameters,
) {
  const validation = validateOpenGridLabelCardParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-card')
  }

  const width = validation.value.widthTier
  const height = OPENGRID_LABEL_CARD_CONFIGURATION.cardHeight
  const thickness = openGridLabelCardThicknessFor(validation.value.style)
  const halfWidth = Number((width / 2).toFixed(6))
  const halfHeight = Number((height / 2).toFixed(6))
  return {
    min: [-halfWidth, -halfHeight, 0] as [number, number, number],
    max: [halfWidth, halfHeight, Number(thickness.toFixed(6))] as [
      number,
      number,
      number,
    ],
  }
}

function parameterSuffixFor(parameters: OpenGridLabelCardParameters): string {
  return `w${parameters.widthTier}-${parameters.style}-${parameters.icon}`
}

function fileNameFor(
  parameters: OpenGridLabelCardParameters,
  format: keyof typeof OPENGRID_LABEL_CARD_CONFIGURATION.fileNames,
): string {
  if (!isOpenGridLabelCardParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-card')
  }
  const base = OPENGRID_LABEL_CARD_CONFIGURATION.fileNames[format]
  const suffix = parameterSuffixFor(parameters)
  return base.replace('opengrid-label-card', `opengrid-label-card-${suffix}`)
}

export function openGridLabelCardFileName(
  parameters: OpenGridLabelCardParameters,
): string {
  return fileNameFor(parameters, 'step')
}

export function openGridLabelCardStlFileName(
  parameters: OpenGridLabelCardParameters,
): string {
  return fileNameFor(parameters, 'stl')
}

export function openGridLabelCardThreeMfFileName(
  parameters: OpenGridLabelCardParameters,
): string {
  return fileNameFor(parameters, 'threeMf')
}
