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
  isOpenGridLabelScrewIconId,
  OPENGRID_LABEL_SCREW_ICON_IDS,
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
  | 'layout'
  | 'groupAlign'
  | 'iconSize'
  | 'screwMode'
  | 'screwHead'
  | 'screwDiameter'
  | 'screwLength'

export const OPENGRID_LABEL_CARD_STYLES = ['flat', 'raised'] as const

export type OpenGridLabelCardStyle = (typeof OPENGRID_LABEL_CARD_STYLES)[number]

export type OpenGridLabelCardIconId = LabelIconId

export {
  OPENGRID_LABEL_CARD_ICON_IDS,
  OPENGRID_LABEL_SCREW_ICON_IDS,
  isOpenGridLabelScrewIconId,
}

export type LabelCardTextAlignment = 'left' | 'center' | 'right'

export type OpenGridLabelCardLayout = 'inline' | 'stacked'

export type OpenGridLabelCardGroupAlign = 'left' | 'center' | 'right'

export const OPENGRID_LABEL_CARD_LAYOUTS: readonly OpenGridLabelCardLayout[] = [
  'inline',
  'stacked',
]

/** Vertical gap between the icon and the text row in stacked layout (mm). */
export const OPENGRID_LABEL_CARD_STACKED_GAP = 1

/** Safe height available to stacked content: card height minus rail insets. */
export const OPENGRID_LABEL_CARD_STACKED_SAFE_HEIGHT =
  OPENGRID_LABEL_CARD_HEIGHT - 2 * OPENGRID_LABEL_GRID.artworkSideInset

export type OpenGridLabelCardScrewHead = 'phillips' | 'torx' | 'hex'

export const OPENGRID_LABEL_CARD_SCREW_HEADS: readonly OpenGridLabelCardScrewHead[] =
  ['phillips', 'torx', 'hex']

/** Front-view head symbol per screw head selection. */
export const OPENGRID_LABEL_CARD_SCREW_FRONT_ICONS = {
  phillips: 'drive-phillips',
  torx: 'drive-torx',
  hex: 'drive-hex',
} as const

/** Side-view screw silhouette per screw head selection. */
export const OPENGRID_LABEL_CARD_SCREW_SIDE_ICONS = {
  phillips: 'screw-pan',
  torx: 'screw-pan',
  hex: 'screw-hex',
} as const

/** Selectable screw diameters in millimetres. */
export const OPENGRID_LABEL_CARD_SCREW_DIAMETERS: readonly number[] = [
  2, 2.5, 3, 3.5, 4, 5, 6, 8,
]

/** Selectable screw length range in millimetres. */
export const OPENGRID_LABEL_CARD_SCREW_LENGTH = {
  min: 4,
  max: 30,
  default: 16,
} as const

export function openGridLabelCardScrewDesignation(
  diameter: number,
  length: number,
): string {
  return `M${diameter}x${length}`
}

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
  layout?: OpenGridLabelCardLayout
  groupAlign?: OpenGridLabelCardGroupAlign
  iconSize?: number
  screwMode?: boolean
  screwHead?: OpenGridLabelCardScrewHead
  screwDiameter?: number
  screwLength?: number
}

export const OPENGRID_LABEL_CARD_CONFIGURATION = {
  plateThickness: OPENGRID_LABEL_CARD_INSERTION_THICKNESS,
  cardHeight: OPENGRID_LABEL_CARD_HEIGHT,
  accentDepth: OPENGRID_LABEL_ACCENT_DEPTH,
  raisedHeight: OPENGRID_LABEL_CARD_RAISED_HEIGHT,
  textHeight: { min: 2, max: 7, default: 7, step: 0.5, twoRowMax: 4 },
  textRowGap: 0.5,
  iconSize: { min: 3, max: 8, default: 6, step: 0.5 },
  maxTextLength: 6,
  screwMode: {
    defaultHead: 'phillips',
    defaultDiameter: 4,
    defaultLength: 16,
    textHeight: 3,
  },
  defaultGridUnits: 4,
  defaultStyle: 'raised',
  defaultIcon: 'gear-fill',
  defaultText: '' as string,
  defaultLayout: 'inline',
  defaultGroupAlign: 'center',
  defaultParameters: {
    gridUnits: 4,
    textHeight: 7,
    iconPosition: 'left',
    style: 'raised',
    icon: 'gear-fill',
    text: '',
    layout: 'inline',
    groupAlign: 'center',
    iconSize: 6,
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
    'layout',
    'groupAlign',
    'iconSize',
    'screwMode',
    'screwHead',
    'screwDiameter',
    'screwLength',
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

  const screwMode = value.screwMode ?? false
  if (typeof screwMode !== 'boolean') return invalid('screwMode')
  const rawScrewHead =
    value.screwHead ?? OPENGRID_LABEL_CARD_CONFIGURATION.screwMode.defaultHead
  if (
    typeof rawScrewHead !== 'string' ||
    !OPENGRID_LABEL_CARD_SCREW_HEADS.includes(
      rawScrewHead as OpenGridLabelCardScrewHead,
    )
  ) {
    return invalid('screwHead')
  }
  const screwHead = rawScrewHead as OpenGridLabelCardScrewHead
  const screwDiameter =
    value.screwDiameter ??
    OPENGRID_LABEL_CARD_CONFIGURATION.screwMode.defaultDiameter
  if (
    typeof screwDiameter !== 'number' ||
    !Number.isFinite(screwDiameter) ||
    !OPENGRID_LABEL_CARD_SCREW_DIAMETERS.includes(screwDiameter)
  ) {
    return invalid('screwDiameter')
  }
  const screwLength =
    value.screwLength ??
    OPENGRID_LABEL_CARD_CONFIGURATION.screwMode.defaultLength
  if (
    typeof screwLength !== 'number' ||
    !Number.isInteger(screwLength) ||
    screwLength < OPENGRID_LABEL_CARD_SCREW_LENGTH.min ||
    screwLength > OPENGRID_LABEL_CARD_SCREW_LENGTH.max
  ) {
    return invalid('screwLength')
  }

  const textHeight =
    value.textHeight ??
    (screwMode
      ? OPENGRID_LABEL_CARD_CONFIGURATION.screwMode.textHeight
      : OPENGRID_LABEL_CARD_CONFIGURATION.textHeight.default)
  if (
    typeof textHeight !== 'number' ||
    !Number.isFinite(textHeight) ||
    textHeight < OPENGRID_LABEL_CARD_CONFIGURATION.textHeight.min ||
    textHeight > OPENGRID_LABEL_CARD_CONFIGURATION.textHeight.max
  )
    return invalid('textHeight')

  const iconPosition: 'left' | 'right' = screwMode
    ? 'left'
    : ((value.iconPosition ?? 'left') as 'left' | 'right')
  if (!screwMode && iconPosition !== 'left' && iconPosition !== 'right')
    return invalid('iconPosition')

  const layout: OpenGridLabelCardLayout = screwMode
    ? OPENGRID_LABEL_CARD_CONFIGURATION.defaultLayout
    : ((value.layout ??
        OPENGRID_LABEL_CARD_CONFIGURATION.defaultLayout) as OpenGridLabelCardLayout)
  if (!screwMode && layout !== 'inline' && layout !== 'stacked')
    return invalid('layout')

  const groupAlign: OpenGridLabelCardGroupAlign = screwMode
    ? OPENGRID_LABEL_CARD_CONFIGURATION.defaultGroupAlign
    : ((value.groupAlign ??
        OPENGRID_LABEL_CARD_CONFIGURATION.defaultGroupAlign) as OpenGridLabelCardGroupAlign)
  if (
    !screwMode &&
    groupAlign !== 'left' &&
    groupAlign !== 'center' &&
    groupAlign !== 'right'
  )
    return invalid('groupAlign')

  const iconSize =
    value.iconSize ?? OPENGRID_LABEL_CARD_CONFIGURATION.iconSize.default
  if (
    typeof iconSize !== 'number' ||
    !Number.isFinite(iconSize) ||
    iconSize < OPENGRID_LABEL_CARD_CONFIGURATION.iconSize.min ||
    iconSize > OPENGRID_LABEL_CARD_CONFIGURATION.iconSize.max ||
    Math.round(iconSize / OPENGRID_LABEL_CARD_CONFIGURATION.iconSize.step) *
      OPENGRID_LABEL_CARD_CONFIGURATION.iconSize.step !==
      iconSize
  )
    return invalid('iconSize')

  const rawStyle =
    value.style ?? OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters.style
  if (!isOpenGridLabelCardStyle(rawStyle)) {
    return invalid('style', 'validation.labelCardStyleInvalid')
  }

  const rawIcon: OpenGridLabelCardIconId = screwMode
    ? OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters.icon
    : ((value.icon ??
        OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters
          .icon) as OpenGridLabelCardIconId)
  if (!screwMode && !isOpenGridLabelCardIconId(rawIcon)) {
    return invalid('icon', 'validation.labelCardIconUnknown')
  }

  const parameters: OpenGridLabelCardParameters = {
    gridUnits,
    textHeight,
    iconPosition,
    style: rawStyle,
    icon: rawIcon,
    layout,
    groupAlign,
    iconSize,
  }
  for (const field of ['textAlignment', 'textLine2Alignment'] as const) {
    const alignment: LabelCardTextAlignment = screwMode
      ? 'center'
      : ((value[field] ?? 'center') as LabelCardTextAlignment)
    if (
      !screwMode &&
      alignment !== 'left' &&
      alignment !== 'center' &&
      alignment !== 'right'
    )
      return invalid(field)
    parameters[field] = alignment
  }
  if (!screwMode) {
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
      if (rawIcon !== 'none') {
        if (layout === 'stacked') {
          if (field === 'textLine2' && textLength > 0)
            return invalid('textLine2', 'validation.labelCardStackedSingleRow')
          requiredWidth = Math.max(requiredWidth, iconSize)
        } else {
          requiredWidth += iconSize + OPENGRID_LABEL_GRID.iconTextGap
        }
      }
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
    if (layout === 'stacked' && parameters.icon === 'none')
      return invalid('layout', 'validation.labelCardStackedNeedsIcon')
    if (
      layout === 'stacked' &&
      (parameters.text || parameters.textLine2 || parameters.icon !== 'none') &&
      iconSize +
        OPENGRID_LABEL_CARD_STACKED_GAP +
        (parameters.text || parameters.textLine2 ? textHeight : 0) >
        OPENGRID_LABEL_CARD_STACKED_SAFE_HEIGHT
    )
      return invalid('iconSize', 'validation.labelCardStackedHeight')
  }
  parameters.screwMode = screwMode
  parameters.screwHead = screwHead
  parameters.screwDiameter = screwDiameter
  parameters.screwLength = screwLength
  if (screwMode) {
    // Screw mode derives the effective icon, text, and inert layout keys from
    // the picker values; stored manual values are ignored, not rejected.
    const designation = openGridLabelCardScrewDesignation(
      screwDiameter,
      screwLength,
    )
    const letters = Array.from(designation).length
    const designationWidth =
      (Math.max(0, letters - 1) * OPENGRID_LABEL_GRID.textSpacing +
        OPENGRID_LABEL_GRID.textFontSize) *
      (textHeight / OPENGRID_LABEL_GRID.textFontSize)
    const pairWidth = 2 * iconSize + OPENGRID_LABEL_GRID.iconTextGap
    if (
      Math.max(pairWidth, designationWidth) >
      openGridLabelWidthFor(gridUnits) -
        2 * OPENGRID_LABEL_GRID.artworkSideInset
    )
      return invalid('screwDiameter', 'validation.labelCardScrewTooWide')
    if (
      iconSize + OPENGRID_LABEL_CARD_STACKED_GAP + textHeight >
      OPENGRID_LABEL_CARD_STACKED_SAFE_HEIGHT
    )
      return invalid('iconSize', 'validation.labelCardStackedHeight')
    parameters.text = designation
    delete parameters.textLine2
    parameters.icon = OPENGRID_LABEL_CARD_SCREW_SIDE_ICONS[screwHead]
  }
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
  const base = `w${openGridLabelWidthFor(parameters.gridUnits)}-${parameters.style}-${parameters.icon}-${parameters.iconPosition ?? 'left'}-l${parameters.layout}-g${parameters.groupAlign}-i${parameters.iconSize}`
  if (!parameters.screwMode) return base
  return `${base}-sm-${parameters.screwHead}-d${parameters.screwDiameter}-l${parameters.screwLength}`
}

function fileNameFor(
  parameters: OpenGridLabelCardParameters,
  format: keyof typeof OPENGRID_LABEL_CARD_CONFIGURATION.fileNames,
): string {
  const validation = validateOpenGridLabelCardParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-label-card')
  }
  const base = OPENGRID_LABEL_CARD_CONFIGURATION.fileNames[format]
  const suffix = parameterSuffixFor(validation.value)
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
