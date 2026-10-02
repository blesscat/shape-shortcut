// Merged zh-Hant catalog (reference locale). Add new keys in the domain file, then mirror them in ../en.
import { messages as about } from './about'
import { messages as cadPanels } from './cad-panels'
import { messages as cadWorkspace } from './cad-workspace'
import { messages as chrome } from './chrome'
import { messages as docs } from './docs'
import { messages as home } from './home'
import { messages as models } from './models'
import { messages as parameters } from './parameters'

export const messages = {
  ...about,
  ...cadPanels,
  ...cadWorkspace,
  ...chrome,
  ...docs,
  ...home,
  ...models,
  ...parameters,
}
