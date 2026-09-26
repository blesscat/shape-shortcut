import type { DiagnosticParams } from '../diagnostics'
import {
  OPENGRID_LABEL_ACCENT_DEPTH,
  OPENGRID_LABEL_CARD_HEIGHT,
  OPENGRID_LABEL_CARD_INSERTION_THICKNESS,
  OPENGRID_LABEL_CARD_RAISED_HEIGHT,
  OPENGRID_LABEL_GRID,
  isOpenGridLabelGridUnits,
  openGridLabelWidthFor,
  isOpenGridLabelWidthTier,
} from './opengrid-label-shared'
import {
  OPENGRID_LABEL_CARD_ICON_IDS,
  isOpenGridLabelCardIconId,
  type OpenGridLabelCardIconId as LabelIconId,
} from './opengrid-label-icons'

export type OpenGridLabelCardParameterKey =
  | 'gridUnits'
  | 'style'
  | 'icon'
  | 'text'
  | 'iconPosition'
  | 'textHeight'
  | 'textLine2'
  | 'textAlignment'
  | 'textLine2Alignment'

export const OPENGRID_LABEL_CARD_STYLES = ['flat', 'raised'] as const

export type OpenGridLabelCardStyle = (typeof OPENGRID_LABEL_CARD_STYLES)[number]

export type OpenGridLabelCardIconId = LabelIconId

export { OPENGRID_LABEL_CARD_ICON_IDS }

export type LabelCardTextAlignment = 'left' | 'center' | 'right'

export type OpenGridLabelCardParameters = {
  gridUnits: number
  textHeight?: number
  iconPosition: 'left' | 'right'
  style: OpenGridLabelCardStyle
  icon: OpenGridLabelCardIconId
  text?: string
  textLine2?: string
  textAlignment?: LabelCardTextAlignment
  textLine2Alignment?: LabelCardTextAlignment
}

export const OPENGRID_LABEL_CARD_CONFIGURATION = {
  plateThickness: OPENGRID_LABEL_CARD_INSERTION_THICKNESS,
  cardHeight: OPENGRID_LABEL_CARD_HEIGHT,
  accentDepth: OPENGRID_LABEL_ACCENT_DEPTH,
  raisedHeight: OPENGRID_LABEL_CARD_RAISED_HEIGHT,
  textHeight: { min: 2, max: 7, default: 7, step: 0.5, twoRowMax: 4 },
  textRowGap: 0.5,
  maxTextLength: 6,
  defaultGridUnits: 4,
  defaultStyle: 'raised',
  defaultIcon: 'gear-fill',
  defaultText: '' as string,
  defaultParameters: {
    gridUnits: 4,
    textHeight: 7,
    iconPosition: 'left',
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
  return value.normalize('NFC').replace(/\s/gu, '')
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
  const knownKeys: (OpenGridLabelCardParameterKey | 'widthTier')[] = [
    'gridUnits',
    'iconPosition',
    'textHeight',
    'textLine2',
    'textAlignment',
    'textLine2Alignment',
    'widthTier',
    'style',
    'icon',
    'text',
  ]
  if (keys.some((key) => !knownKeys.includes(key as never))) {
    return invalid('parameters')
  }

  let gridUnits: unknown = OPENGRID_LABEL_CARD_CONFIGURATION.defaultGridUnits
  if (Object.hasOwn(value, 'gridUnits')) gridUnits = value.gridUnits
  if (Object.hasOwn(value, 'widthTier')) {
    if (
      Object.hasOwn(value, 'gridUnits') ||
      !isOpenGridLabelWidthTier(value.widthTier)
    ) {
      return invalid('gridUnits', 'validation.labelGridUnitsInvalid')
    }
    gridUnits = value.widthTier / OPENGRID_LABEL_GRID.pitch
  }
  if (!isOpenGridLabelGridUnits(gridUnits)) {
    return invalid('gridUnits', 'validation.labelGridUnitsInvalid')
  }

  const textHeight =
    value.textHeight ?? OPENGRID_LABEL_CARD_CONFIGURATION.textHeight.default
  if (
    typeof textHeight !== 'number' ||
    !Number.isFinite(textHeight) ||
    textHeight < OPENGRID_LABEL_CARD_CONFIGURATION.textHeight.min ||
    textHeight > OPENGRID_LABEL_CARD_CONFIGURATION.textHeight.max
  )
    return invalid('textHeight')

  const iconPosition = value.iconPosition ?? 'left'
  if (iconPosition !== 'left' && iconPosition !== 'right')
    return invalid('iconPosition')

  const rawStyle =
    value.style ?? OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters.style
  if (!isOpenGridLabelCardStyle(rawStyle)) {
    return invalid('style', 'validation.labelCardStyleInvalid')
  }

  const rawIcon =
    value.icon ?? OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters.icon
  if (!isOpenGridLabelCardIconId(rawIcon)) {
    return invalid('icon', 'validation.labelCardIconUnknown')
  }

  const parameters: OpenGridLabelCardParameters = {
    gridUnits,
    textHeight,
    iconPosition,
    style: rawStyle,
    icon: rawIcon,
  }
  for (const field of ['textAlignment', 'textLine2Alignment'] as const) {
    const alignment = value[field] ?? 'center'
    if (alignment !== 'left' && alignment !== 'center' && alignment !== 'right')
      return invalid(field)
    parameters[field] = alignment
  }
  for (const field of ['text', 'textLine2'] as const) {
    const rawText = value[field] === undefined ? '' : value[field]
    if (typeof rawText !== 'string') return invalid(field)
    const text = normalizeOpenGridLabelCardText(rawText)
    const textLength = Array.from(text).length
    if (textLength > OPENGRID_LABEL_CARD_CONFIGURATION.maxTextLength) {
      return invalid(field, 'validation.labelCardTextTooLong', {
        max: OPENGRID_LABEL_CARD_CONFIGURATION.maxTextLength,
      })
    }
    const textWidth =
      (Math.max(0, textLength - 1) * OPENGRID_LABEL_GRID.textSpacing +
        OPENGRID_LABEL_GRID.textFontSize) *
      (textHeight / OPENGRID_LABEL_GRID.textFontSize)
    let requiredWidth = textWidth
    if (rawIcon !== 'none')
      requiredWidth +=
        OPENGRID_LABEL_GRID.iconSize + OPENGRID_LABEL_GRID.iconTextGap
    if (
      textLength > 0 &&
      requiredWidth >
        openGridLabelWidthFor(gridUnits) -
          2 * OPENGRID_LABEL_GRID.artworkSideInset
    )
      return invalid(field, 'validation.labelCardTextTooWide')
    if (textLength > 0) parameters[field] = text
  }
  if (
    parameters.text &&
    parameters.textLine2 &&
    textHeight > OPENGRID_LABEL_CARD_CONFIGURATION.textHeight.twoRowMax
  )
    return invalid('textHeight', 'validation.labelCardTwoRowHeight')
  return { valid: true, value: parameters }
}

export function isOpenGridLabelCardParameters(
  value: unknown,
): value is OpenGridLabelCardParameters {
  return (
    isRecord(value) &&
    isOpenGridLabelGridUnits(value.gridUnits) &&
    validateOpenGridLabelCardParameters(value).valid
  )
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

  const width = openGridLabelWidthFor(validation.value.gridUnits)
  const height = OPENGRID_LABEL_CARD_CONFIGURATION.cardHeight
  const blank =
    validation.value.icon === 'none' &&
    !validation.value.text &&
    !validation.value.textLine2
  const thickness = blank
    ? OPENGRID_LABEL_CARD_CONFIGURATION.plateThickness
    : openGridLabelCardThicknessFor(validation.value.style)
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
  return `w${openGridLabelWidthFor(parameters.gridUnits)}-${parameters.style}-${parameters.icon}-${parameters.iconPosition ?? 'left'}`
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
