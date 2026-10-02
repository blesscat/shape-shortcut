// Locale-first layout: each supported locale owns a directory under ./messages.
// zh-Hant is the reference locale; ./messages/en/index.ts type-checks en against it.
import { messages as enMessages } from './messages/en'
import { messages as zhHantMessages } from './messages/zh-Hant'

export type MessageCatalog = Readonly<Record<string, string>>

export { enMessages, zhHantMessages }
