import { renderSeatOptions } from '../assembly.mjs'

export const locatingOptionsDiagram = {
  name: 'desk-system-locating-options',
  width: 600,
  height: 430,
  strings: {
    title: {
      en: 'Choose one fixing-seat style',
      'zh-Hant': '固定用的角座，二選一',
    },
    description: {
      en: 'Separate locking seats are printed separately and inserted into the box sockets. Built-in seats are printed as part of the box. Both fixing styles use Snap.',
      'zh-Hant':
        '獨立鎖定角座另行列印並裝入盒底插槽；內建角座與盒子一起列印。兩種固定方式都搭配 Snap。',
    },
    choice: {
      en: 'Choose one seat style',
      'zh-Hant': '固定用的角座，選一種',
    },
    separate: {
      en: 'Separate seats',
      'zh-Hant': '獨立鎖定角座',
    },
    integrated: {
      en: 'Built-in seats',
      'zh-Hant': '內建角座',
    },
    extra: {
      en: 'Print extra seats',
      'zh-Hant': '另外列印角座',
    },
    noExtra: {
      en: 'Printed with box',
      'zh-Hant': '與盒子一起列印',
    },
  },
  template: renderSeatOptions,
}
