import { defineConfig } from 'vitest/config'

import {
  cadTestIncludes,
  fastTestExcludes,
  fastTestIncludes,
} from './scripts/test-groups.mjs'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'fast',
          environment: 'node',
          include: fastTestIncludes,
          exclude: fastTestExcludes,
          maxWorkers: 4,
          sequence: { groupOrder: 0 },
        },
      },
      {
        test: {
          name: 'cad',
          environment: 'node',
          include: cadTestIncludes,
          maxWorkers: 1,
          sequence: { groupOrder: 1 },
          // CAD test cases sit close to vitest's 5 s test default, and one
          // failed under full-run load (5039 ms in the full local CAD run for
          // PR #211). PR #212 gave that file explicit timeouts; this covers the
          // rest of the group. An explicit per-test timeout still overrides
          // this value.
          testTimeout: 120_000,
        },
      },
    ],
  },
})
