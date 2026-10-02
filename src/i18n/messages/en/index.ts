// Merged en catalog. The mapped type fails `pnpm check` when a zh-Hant key is missing here.
import { messages as zhHant } from '../zh-Hant'
import { messages as about } from './about'
import { messages as cadPanels } from './cad-panels'
import { messages as cadWorkspace } from './cad-workspace'
import { messages as chrome } from './chrome'
import { messages as docs } from './docs'
import { messages as home } from './home'
import { messages as models } from './models'
import { messages as parameters } from './parameters'

export const messages: { [Key in keyof typeof zhHant]: string } = {
  ...about,
  ...cadPanels,
  ...cadWorkspace,
  ...chrome,
  ...docs,
  ...home,
  ...models,
  ...parameters,
}
