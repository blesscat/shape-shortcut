import { renderSnapFixing } from '../assembly.mjs'

export const boardSnapDiagram = {
  name: 'desk-system-board-snap',
  width: 600,
  height: 430,
  strings: {
    title: {
      en: 'Fix the position with Snap',
      'zh-Hant': '使用 Snap 固定位置',
    },
    description: {
      en: 'Exploded schematic of a 2 by 2 Board, four Desk Snaps, and a Grid Box with compatible built-in seats.',
      'zh-Hant': '拆解示意：2×2 底板、四個 Desk Snap，以及帶有內建角座的方盒。',
    },
    box: {
      en: 'Box + seats',
      'zh-Hant': '盒子＋角座',
    },
    board: {
      en: 'Board',
      'zh-Hant': '底板',
    },
    snap: {
      en: 'Snap × 4',
      'zh-Hant': 'Snap × 4',
    },
  },
  template: renderSnapFixing,
}
