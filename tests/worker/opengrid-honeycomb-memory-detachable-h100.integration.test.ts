import { afterAll, beforeAll, describe } from 'vitest'
import {
  disposeHoneycombSeatHarness,
  initialiseHoneycombSeatHarness,
  runHoneycombSeatStressCase,
} from './opengrid-honeycomb-memory-seat.utils'

describe('7x7 100 mm honeycomb boxes with detachable corner seats', () => {
  beforeAll(initialiseHoneycombSeatHarness, 240_000)
  afterAll(disposeHoneycombSeatHarness)
  runHoneycombSeatStressCase('detachable-corner-seat', 100)
})
