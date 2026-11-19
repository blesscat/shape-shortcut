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
 * The same per-component modules the Worker error mapping collects. Reading
 * them here makes the rule set exhaustiveness-checkable: a rule that is
 * added without being recorded in the golden fixture fails these cases.
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

  it('gives every rule a unique order key', () => {
    const { codeRules, stageRules } = collectErrorRules(ruleModules)
    const codeOrders = codeRules.map((rule) => rule.order)
    const stageOrders = stageRules.map((rule) => rule.order)

    expect(new Set(codeOrders).size).toBe(codeOrders.length)
    expect(new Set(stageOrders).size).toBe(stageOrders.length)
  })
})
