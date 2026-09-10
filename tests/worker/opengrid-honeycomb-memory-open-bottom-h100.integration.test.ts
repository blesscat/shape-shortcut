import { beforeAll, describe } from 'vitest'
import {
  initialiseProfileHarness,
  runHoneycombProfileStressCase,
} from './opengrid-honeycomb-memory-profile.utils'

describe('7x7 100 mm open-bottom honeycomb boxes', () => {
  beforeAll(initialiseProfileHarness, 240_000)
  runHoneycombProfileStressCase('open-bottom')
})
