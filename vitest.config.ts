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
          // The CAD group runs OpenCascade cases that sit close to vitest's
          // 5 s test and 10 s hook defaults, so they fail under full-run load
          // (PR #212, 5039 ms against the 5000 ms default). One project-wide
          // limit gives the whole group headroom; an explicit per-test or
          // per-hook timeout still overrides these values.
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
})
