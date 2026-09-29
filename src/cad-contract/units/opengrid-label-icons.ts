export type OpenGridLabelCardIconId =
  | 'drive-slot'
  | 'drive-phillips'
  | 'drive-hex'
  | 'drive-torx'
  | 'screw-pan'
  | 'screw-hex'
  | 'hole-through'
  | 'hole-threaded'
  | 'hole-countersink'
  | 'hole-counterbore'
  | 'none'
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

export const OPENGRID_LABEL_CARD_ICON_IDS: readonly OpenGridLabelCardIconId[] =
  [
    'none',
    'drive-slot',
    'drive-phillips',
    'drive-hex',
    'drive-torx',

    'screw-pan',
    'screw-hex',
    'hole-through',
    'hole-threaded',
    'hole-countersink',
    'hole-counterbore',

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

/**
 * Screw side-view icons with parametric shaft length. Selecting one of these
 * opts the card into text-linked geometry: the shaft length follows the first
 * text row's `M<dia>[x<len>]` designation. All other icons are static paths
 * and never reach the parametric pipeline.
 */
export const OPENGRID_LABEL_SCREW_ICON_IDS: readonly OpenGridLabelCardIconId[] =
  ['screw-pan', 'screw-hex']

export function isOpenGridLabelScrewIconId(
  value: unknown,
): value is (typeof OPENGRID_LABEL_SCREW_ICON_IDS)[number] {
  return (
    typeof value === 'string' &&
    OPENGRID_LABEL_SCREW_ICON_IDS.includes(
      value as (typeof OPENGRID_LABEL_SCREW_ICON_IDS)[number],
    )
  )
}

export function isOpenGridLabelCardIconId(
  value: unknown,
): value is OpenGridLabelCardIconId {
  return (
    typeof value === 'string' &&
    OPENGRID_LABEL_CARD_ICON_IDS.includes(value as OpenGridLabelCardIconId)
  )
}

export function normalizeOpenGridLabelCardText(value: string): string {
  return value.normalize('NFC').replace(/\s/gu, '')
}
