import { describe, expect, it } from 'vitest'

import {
  collectErrorRules,
  type ErrorRuleModule,
} from '../../src/workers/error-mapping-rules'
import {
  ERROR_RULE_GOLDEN_CASES,
  ERROR_STAGE_RULE_NAMES,
} from './cad-registry-baseline.fixture'

/**
 * The per-component rule modules the Worker error mapping collects. This
 * glob mirrors the production one in `src/workers/error-mapping.ts`, which
 * collects `./error-rules/*.ts`. There is no public way to list the rules, so
 * the test reads the same modules: a rule that is added without being
 * recorded in the golden fixture fails these cases.
 */
const ruleModules = import.meta.glob<ErrorRuleModule>(
  '../../src/workers/error-rules/*.ts',
  { eager: true },
)

describe('error rule coverage', () => {
  it('records every collected code rule in the golden fixture', () => {
    const { codeRules } = collectErrorRules(ruleModules)

    expect(codeRules.map((rule) => rule.pattern).sort()).toEqual(
      ERROR_RULE_GOLDEN_CASES.map((goldenCase) => goldenCase.rule).sort(),
    )
  })

  it('records every collected stage rule in the golden fixture', () => {
    const { stageRules } = collectErrorRules(ruleModules)

    expect(stageRules.map((rule) => rule.pattern).sort()).toEqual(
      [...ERROR_STAGE_RULE_NAMES].sort(),
    )
  })
})
