import type { DiagnosticParams } from '../diagnostics'
import { PROTOTYPE_CONFIGURATION } from './prototype-configuration'

export type CardBoxPart = 'assembly' | 'box' | 'lid' | 'divider' | 'cover'

export const CARD_BOX_PARTS: readonly CardBoxPart[] = [
  'assembly',
  'box',
  'lid',
  'divider',
  'cover',
]

export type CardBoxTabPosition = 'left' | 'center' | 'right'

export const CARD_BOX_TAB_POSITIONS: readonly CardBoxTabPosition[] = [
  'left',
  'center',
  'right',
]

export type CardBoxStyle = 'raised' | 'flat'

export const CARD_BOX_STYLES: readonly CardBoxStyle[] = ['raised', 'flat']

export type CardBoxParameterKey =
  | 'part'
  | 'cardWidth'
  | 'cardHeight'
  | 'storageDepth'
  | 'dividerTabPosition'
  | 'dividerText'
  | 'dividerStyle'
  | 'coverTitle'
  | 'coverTitleTextHeight'
  | 'coverSubtitle'
  | 'coverSubtitleTextHeight'
  | 'coverSvgWidth'
  | 'coverVerticalPosition'
  | 'coverStyle'
  | 'usesCoverSvg'
  | 'coverSvgFingerprint'

export type CardBoxParameters = {
  part: CardBoxPart
  cardWidth: number
  cardHeight: number
  storageDepth: number
  dividerTabPosition: CardBoxTabPosition
  dividerText: string
  dividerStyle: CardBoxStyle
  coverTitle: string
  coverTitleTextHeight: number
  coverSubtitle: string
  coverSubtitleTextHeight: number
  coverSvgWidth: number
  coverVerticalPosition: number
  coverStyle: CardBoxStyle
  usesCoverSvg: boolean
  coverSvgFingerprint: string
}

/**
 * Fixed constants of the original FreeCAD design. They are deliberately not
 * exposed as parameters: `t` is the wall/shell thickness, `c` the sliding
 * clearance between the box rails and the lid grooves. Users enter the card
 * size; the interior width adds the 0.5 mm sheet-size allowance internally.
 */
export const CARD_BOX_CONFIGURATION = {
  wallThickness: 3,
  clearance: 0.2,
  interiorWidthAllowance: 0.5,
  floorThickness: 2,
  coverPlateThickness: 0.6,
  /** Sliding-lid roof thickness (z 127.2..129 at defaults). */
  lidRoofThickness: 1.8,
  accentDepth: 0.4,
  dividerPlateThickness: 0.85,
  dividerSlotWidth: 1,
  dividerSlotPitch: 3,
  dividerSlotDepth: 0.25,
  dividerTabWidth: 30,
  dividerTextHeight: 5,
  dividerTextMaxLength: 20,
  coverTextMaxLength: 30,
  coverTitleTextHeight: { min: 4, max: 20, default: 8, step: 0.5 },
  coverSubtitleTextHeight: { min: 3, max: 12, default: 5, step: 0.5 },
  coverSvgWidth: { min: 10, max: 58, default: 40, step: 1 },
  coverVerticalPosition: { min: 0, max: 100, default: 30 },
  coverSafeAreaMargin: 2,
  hiddenLipWidth: 5,
  hiddenBottomHeight: 5,
  defaults: {
    cardWidth: 70,
    cardHeight: 120,
    storageDepth: 72,
  },
  ranges: {
    cardWidth: { min: 40, max: 100 },
    cardHeight: { min: 60, max: 150 },
    storageDepth: { min: 20, max: 150 },
  },
  defaultTabPosition: 'left' as CardBoxTabPosition,
  defaultStyle: 'raised' as CardBoxStyle,
  defaultCoverTitle: 'CARDS',
  defaultParameters: {
    part: 'assembly',
    cardWidth: 70,
    cardHeight: 120,
    storageDepth: 72,
    dividerTabPosition: 'left',
    dividerText: '',
    dividerStyle: 'raised',
    coverTitle: 'CARDS',
    coverTitleTextHeight: 8,
    coverSubtitle: '',
    coverSubtitleTextHeight: 5,
    coverSvgWidth: 40,
    coverVerticalPosition: 30,
    coverStyle: 'raised',
    usesCoverSvg: false,
    coverSvgFingerprint: '',
  } as CardBoxParameters,
} as const

/** Interior width: the card width plus the fixed 0.5 mm sheet allowance. */
export function cardBoxInteriorWidth(cardWidth: number): number {
  return cardWidth + CARD_BOX_CONFIGURATION.interiorWidthAllowance
}

/** Outer width of the box body: interior width plus two wall thicknesses. */
export function cardBoxOuterWidth(cardWidth: number): number {
  return (
    cardBoxInteriorWidth(cardWidth) + 2 * CARD_BOX_CONFIGURATION.wallThickness
  )
}

/** Outer depth of the box body: D + 2t minus the front channel allowance. */
export function cardBoxOuterDepth(storageDepth: number): number {
  return storageDepth + 2 * CARD_BOX_CONFIGURATION.wallThickness - 1.8
}

/**
 * Cleaned user-SVG outline data for the cover. Coordinates are SVG user
 * units (viewBox applied, transforms resolved, Y still pointing down);
 * the kernel scales them to `coverSvgWidth` and flips Y when extruding.
 */
export type CardBoxSvgPoint = readonly [number, number]

export type CardBoxSvgOutlineGroup = {
  outer: readonly CardBoxSvgPoint[]
  holes: readonly (readonly CardBoxSvgPoint[])[]
}

export type CardBoxSvgOutlineData = {
  fingerprint: string
  width: number
  height: number
  groups: readonly CardBoxSvgOutlineGroup[]
}

export type CardBoxValidation =
  | { valid: true; value: CardBoxParameters }
  | {
      valid: false
      issues: Array<{
        field: CardBoxParameterKey | 'parameters'
        messageId: string
        params?: DiagnosticParams
      }>
    }

const CARD_BOX_KEYS: CardBoxParameterKey[] = [
  'part',
  'cardWidth',
  'cardHeight',
  'storageDepth',
  'dividerTabPosition',
  'dividerText',
  'dividerStyle',
  'coverTitle',
  'coverTitleTextHeight',
  'coverSubtitle',
  'coverSubtitleTextHeight',
  'coverSvgWidth',
  'coverVerticalPosition',
  'coverStyle',
  'usesCoverSvg',
  'coverSvgFingerprint',
]

type Issue = {
  field: CardBoxParameterKey | 'parameters'
  messageId: string
  params?: DiagnosticParams
}

function invalid(
  field: CardBoxParameterKey | 'parameters',
  messageId = 'validation.invalid',
  params?: DiagnosticParams,
): CardBoxValidation {
  const issue: Issue = { field, messageId, ...(params ? { params } : {}) }
  return { valid: false, issues: [issue] }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function rangeIssue(
  field: CardBoxParameterKey,
  min: number,
  max: number,
): Issue {
  return {
    field,
    messageId: 'validation.invalid',
    params: { min, max, unit: 'mm' },
  }
}

function numberInRange(
  value: unknown,
  field: CardBoxParameterKey,
  min: number,
  max: number,
  fallback: number,
): { ok: true; value: number } | { ok: false; issue: Issue } {
  const resolved =
    value === undefined ? fallback : (value as number | undefined)
  if (typeof resolved !== 'number' || !Number.isFinite(resolved)) {
    return {
      ok: false,
      issue: { field, messageId: 'validation.invalidNumber' },
    }
  }
  if (resolved < min || resolved > max) {
    return { ok: false, issue: rangeIssue(field, min, max) }
  }
  return { ok: true, value: resolved }
}

function stringEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  if (value === undefined) return fallback
  if (typeof value === 'string' && allowed.includes(value as T)) {
    return value as T
  }
  return fallback
}

function validString(value: unknown, fallback: string): string {
  if (value === undefined) return fallback
  return typeof value === 'string' ? value : fallback
}

/**
 * Stable 8-character token for filename disambiguation (FNV-1a, hex).
 * Empty/blank art yields the literal `blank` so names stay readable.
 */
export function cardBoxToken(value: string): string {
  const normalized = value.normalize('NFC')
  if (normalized.trim() === '') return 'blank'
  let hash = 0x811c9dc5
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/** Divider/cover accent-art presence drives two-color 3MF availability. */
export function cardBoxHasAccentArt(parameters: CardBoxParameters): boolean {
  if (parameters.part === 'divider') return parameters.dividerText.trim() !== ''
  if (parameters.part === 'cover') {
    return (
      parameters.coverTitle.trim() !== '' ||
      parameters.coverSubtitle.trim() !== '' ||
      parameters.usesCoverSvg
    )
  }
  return false
}

export function validateCardBoxParameters(value: unknown): CardBoxValidation {
  if (!isRecord(value)) return invalid('parameters')

  const keys = Object.keys(value)
  if (keys.some((key) => !CARD_BOX_KEYS.includes(key as never))) {
    return invalid('parameters')
  }

  const part = stringEnum(value.part, CARD_BOX_PARTS, 'assembly')
  if (
    value.part !== undefined &&
    !CARD_BOX_PARTS.includes(value.part as CardBoxPart)
  ) {
    return invalid('part', 'validation.cardBoxPartInvalid')
  }

  const width = numberInRange(
    value.cardWidth,
    'cardWidth',
    CARD_BOX_CONFIGURATION.ranges.cardWidth.min,
    CARD_BOX_CONFIGURATION.ranges.cardWidth.max,
    CARD_BOX_CONFIGURATION.defaults.cardWidth,
  )
  if (!width.ok) return { valid: false, issues: [width.issue] }

  const height = numberInRange(
    value.cardHeight,
    'cardHeight',
    CARD_BOX_CONFIGURATION.ranges.cardHeight.min,
    CARD_BOX_CONFIGURATION.ranges.cardHeight.max,
    CARD_BOX_CONFIGURATION.defaults.cardHeight,
  )
  if (!height.ok) return { valid: false, issues: [height.issue] }

  const depth = numberInRange(
    value.storageDepth,
    'storageDepth',
    CARD_BOX_CONFIGURATION.ranges.storageDepth.min,
    CARD_BOX_CONFIGURATION.ranges.storageDepth.max,
    CARD_BOX_CONFIGURATION.defaults.storageDepth,
  )
  if (!depth.ok) return { valid: false, issues: [depth.issue] }

  const dividerTabPosition = stringEnum(
    value.dividerTabPosition,
    CARD_BOX_TAB_POSITIONS,
    CARD_BOX_CONFIGURATION.defaultTabPosition,
  )
  if (
    value.dividerTabPosition !== undefined &&
    !CARD_BOX_TAB_POSITIONS.includes(
      value.dividerTabPosition as CardBoxTabPosition,
    )
  ) {
    return invalid('dividerTabPosition', 'validation.cardBoxTabPositionInvalid')
  }

  const dividerText = validString(value.dividerText, '')
  if (dividerText.length > CARD_BOX_CONFIGURATION.dividerTextMaxLength) {
    return invalid('dividerText', 'validation.cardBoxTextTooLong', {
      max: CARD_BOX_CONFIGURATION.dividerTextMaxLength,
    })
  }

  const dividerStyle = stringEnum(
    value.dividerStyle,
    CARD_BOX_STYLES,
    CARD_BOX_CONFIGURATION.defaultStyle,
  )
  if (
    value.dividerStyle !== undefined &&
    !CARD_BOX_STYLES.includes(value.dividerStyle as CardBoxStyle)
  ) {
    return invalid('dividerStyle', 'validation.cardBoxStyleInvalid')
  }

  const coverTitle = validString(
    value.coverTitle,
    CARD_BOX_CONFIGURATION.defaultCoverTitle,
  )
  if (coverTitle.length > CARD_BOX_CONFIGURATION.coverTextMaxLength) {
    return invalid('coverTitle', 'validation.cardBoxTextTooLong', {
      max: CARD_BOX_CONFIGURATION.coverTextMaxLength,
    })
  }

  const titleHeight = numberInRange(
    value.coverTitleTextHeight,
    'coverTitleTextHeight',
    CARD_BOX_CONFIGURATION.coverTitleTextHeight.min,
    CARD_BOX_CONFIGURATION.coverTitleTextHeight.max,
    CARD_BOX_CONFIGURATION.coverTitleTextHeight.default,
  )
  if (!titleHeight.ok) return { valid: false, issues: [titleHeight.issue] }

  const coverSubtitle = validString(value.coverSubtitle, '')
  if (coverSubtitle.length > CARD_BOX_CONFIGURATION.coverTextMaxLength) {
    return invalid('coverSubtitle', 'validation.cardBoxTextTooLong', {
      max: CARD_BOX_CONFIGURATION.coverTextMaxLength,
    })
  }

  const subtitleHeight = numberInRange(
    value.coverSubtitleTextHeight,
    'coverSubtitleTextHeight',
    CARD_BOX_CONFIGURATION.coverSubtitleTextHeight.min,
    CARD_BOX_CONFIGURATION.coverSubtitleTextHeight.max,
    CARD_BOX_CONFIGURATION.coverSubtitleTextHeight.default,
  )
  if (!subtitleHeight.ok)
    return { valid: false, issues: [subtitleHeight.issue] }

  const svgWidth = numberInRange(
    value.coverSvgWidth,
    'coverSvgWidth',
    CARD_BOX_CONFIGURATION.coverSvgWidth.min,
    CARD_BOX_CONFIGURATION.coverSvgWidth.max,
    CARD_BOX_CONFIGURATION.coverSvgWidth.default,
  )
  if (!svgWidth.ok) return { valid: false, issues: [svgWidth.issue] }

  const verticalPosition = numberInRange(
    value.coverVerticalPosition,
    'coverVerticalPosition',
    CARD_BOX_CONFIGURATION.coverVerticalPosition.min,
    CARD_BOX_CONFIGURATION.coverVerticalPosition.max,
    CARD_BOX_CONFIGURATION.coverVerticalPosition.default,
  )
  if (!verticalPosition.ok) {
    return { valid: false, issues: [verticalPosition.issue] }
  }

  const coverStyle = stringEnum(
    value.coverStyle,
    CARD_BOX_STYLES,
    CARD_BOX_CONFIGURATION.defaultStyle,
  )
  if (
    value.coverStyle !== undefined &&
    !CARD_BOX_STYLES.includes(value.coverStyle as CardBoxStyle)
  ) {
    return invalid('coverStyle', 'validation.cardBoxStyleInvalid')
  }

  const usesCoverSvg =
    value.usesCoverSvg === undefined ? false : Boolean(value.usesCoverSvg)
  if (
    value.usesCoverSvg !== undefined &&
    typeof value.usesCoverSvg !== 'boolean'
  ) {
    return invalid('usesCoverSvg')
  }

  const coverSvgFingerprint = validString(value.coverSvgFingerprint, '')
  if (usesCoverSvg && coverSvgFingerprint === '') {
    return invalid(
      'coverSvgFingerprint',
      'validation.cardBoxSvgFingerprintMissing',
    )
  }

  return {
    valid: true,
    value: {
      part,
      cardWidth: width.value,
      cardHeight: height.value,
      storageDepth: depth.value,
      dividerTabPosition,
      dividerText,
      dividerStyle,
      coverTitle,
      coverTitleTextHeight: titleHeight.value,
      coverSubtitle,
      coverSubtitleTextHeight: subtitleHeight.value,
      coverSvgWidth: svgWidth.value,
      coverVerticalPosition: verticalPosition.value,
      coverStyle,
      usesCoverSvg,
      coverSvgFingerprint,
    },
  }
}

export function isCardBoxParameters(
  value: unknown,
): value is CardBoxParameters {
  return validateCardBoxParameters(value).valid
}

/**
 * Envelope for scene framing. `assembly` reports the assembled frame
 * (box on the bed, lid on its rails); single parts report their print
 * orientation with z ≥ 0.
 */
export function boundsForCardBox(parameters: CardBoxParameters): {
  min: [number, number, number]
  max: [number, number, number]
} {
  const { cardHeight, storageDepth } = parameters
  const halfWidth = cardBoxOuterWidth(parameters.cardWidth) / 2
  const halfDepth = (cardBoxOuterDepth(storageDepth) + 1.8) / 2

  switch (parameters.part) {
    case 'lid':
      // Flipped flat-top-down on the bed.
      return {
        min: [-halfWidth, -halfDepth, 0],
        max: [halfWidth, halfDepth, 16.8],
      }
    case 'divider':
      return {
        min: [-halfWidth, 0, 0],
        max: [halfWidth, cardHeight + 5, 2],
      }
    case 'cover':
      return {
        min: [-halfWidth, 0, 0],
        max: [
          halfWidth,
          cardHeight,
          CARD_BOX_CONFIGURATION.coverPlateThickness,
        ],
      }
    case 'box':
    case 'assembly':
    default:
      return {
        min: [-halfWidth, -halfDepth - 1, 0],
        max: [halfWidth, halfDepth + 0.1, cardHeight + 9],
      }
  }
}

export function cardBoxFileName(parameters: CardBoxParameters): string {
  if (parameters.part === 'assembly') {
    throw new Error('CARD_BOX_ASSEMBLY_EXPORT_FORBIDDEN')
  }
  const size = `${parameters.cardWidth}x${parameters.cardHeight}x${parameters.storageDepth}`
  if (parameters.part === 'divider') {
    const text = cardBoxToken(parameters.dividerText)
    return `card-box-divider-${size}-${parameters.dividerTabPosition}-${parameters.dividerStyle}-${text}${PROTOTYPE_CONFIGURATION.stepExtension}`
  }
  if (parameters.part === 'cover') {
    const art = cardBoxHasAccentArt(parameters)
      ? cardBoxToken(
          `${parameters.coverTitle}\u0000${parameters.coverSubtitle}\u0000${parameters.usesCoverSvg ? parameters.coverSvgFingerprint : ''}`,
        )
      : 'blank'
    return `card-box-cover-${size}-${parameters.coverStyle}-${art}${PROTOTYPE_CONFIGURATION.stepExtension}`
  }
  return `card-box-${parameters.part}-${size}${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function cardBoxStlFileName(parameters: CardBoxParameters): string {
  return cardBoxFileName({
    ...parameters,
  }).replace(
    PROTOTYPE_CONFIGURATION.stepExtension,
    PROTOTYPE_CONFIGURATION.stlExtension,
  )
}

export function cardBoxThreeMfFileName(
  parameters: CardBoxParameters,
): string | null {
  if (!cardBoxHasAccentArt(parameters)) return null
  return cardBoxFileName(parameters).replace(
    PROTOTYPE_CONFIGURATION.stepExtension,
    PROTOTYPE_CONFIGURATION.threeMfExtension,
  )
}
