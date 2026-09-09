import { beforeAll, describe } from 'vitest'
import {
  initialiseProfileHarness,
  runHoneycombProfileStressCase,
} from './opengrid-honeycomb-memory-profile.utils'

describe('7x7 100 mm base-plate honeycomb boxes', () => {
  beforeAll(initialiseProfileHarness, 240_000)
  runHoneycombProfileStressCase('base-plate')
})
