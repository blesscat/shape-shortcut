import { renderDirectPlacement } from '../assembly.mjs'

export const flowDiagram = {
  name: 'desk-system-flow',
  width: 600,
  height: 430,
  strings: {
    title: {
      en: 'Direct placement',
      'zh-Hant': '直接放置',
    },
    description: {
      en: 'A seat-free stacking 2 by 2 Grid Box rests directly on a 2 by 2 Board. No Snap or separate seats.',
      'zh-Hant':
        '2×2 無角座堆疊方盒直接放在 2×2 底板上，不使用 Snap 或獨立角座。',
    },
    box: {
      en: 'Grid Box · 2×2',
      'zh-Hant': '方盒 · 2×2',
    },
    board: {
      en: 'Board · 2×2',
      'zh-Hant': '底板 · 2×2',
    },
  },
  template: renderDirectPlacement,
}
