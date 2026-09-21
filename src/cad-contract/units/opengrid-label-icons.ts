export type OpenGridLabelCardIconId =
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
