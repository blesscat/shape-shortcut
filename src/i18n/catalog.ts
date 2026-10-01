// Auto-split merge shell (human-warm-restyle Task 0). Public API unchanged;
// string values live in ./messages/* and are merged here with zero edits.
import { zh as modelsZh, en as modelsEn } from './messages/models'
import { zh as cadpanelsZh, en as cadpanelsEn } from './messages/cad-panels'
import {
  zh as cadworkspaceZh,
  en as cadworkspaceEn,
} from './messages/cad-workspace'
import { zh as parametersZh, en as parametersEn } from './messages/parameters'
import { zh as chromeZh, en as chromeEn } from './messages/chrome'
import { zh as homeZh, en as homeEn } from './messages/home'
import { zh as aboutZh, en as aboutEn } from './messages/about'
import { zh as docsZh, en as docsEn } from './messages/docs'

export type MessageCatalog = Readonly<Record<string, string>>

export const zhHantMessages = {
  ...modelsZh,
  ...cadpanelsZh,
  ...cadworkspaceZh,
  ...parametersZh,
  ...chromeZh,
  ...homeZh,
  ...aboutZh,
  ...docsZh,
}

export const enMessages: { [Key in keyof typeof zhHantMessages]: string } = {
  ...modelsEn,
  ...cadpanelsEn,
  ...cadworkspaceEn,
  ...parametersEn,
  ...chromeEn,
  ...homeEn,
  ...aboutEn,
  ...docsEn,
}
