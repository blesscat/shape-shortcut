import { afterAll, beforeAll, describe } from 'vitest'
import {
  disposeLargeBoxHarness,
  initialiseLargeBoxHarness,
  runLargeHoneycombBoxCase,
} from './opengrid-honeycomb-large-box.utils'

beforeAll(initialiseLargeBoxHarness, 240_000)

afterAll(disposeLargeBoxHarness)

describe('large honeycomb box generation (detachable-corner-seat seats)', () => {
  runLargeHoneycombBoxCase('detachable-corner-seat')
})
