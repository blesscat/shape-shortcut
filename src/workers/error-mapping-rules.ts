import type { CadErrorCode, CadErrorStage } from '../cad-contract/errors'

/**
 * One Worker error-code rule.
 *
 * `order` is the position of the rule in the first-match order. It is unique
 * across every rule module and stays comparable, so a new rule can be
 * inserted between two existing ones without renumbering them.
 */
export type CadErrorCodeRule = {
  order: number
  pattern: string
  code: CadErrorCode
  /** Match the whole message instead of a substring of it. */
  exact?: boolean
}

/** One Worker error-stage rule. */
export type CadErrorStageRule = {
  order: number
  pattern: string
  stage: CadErrorStage
}

/** The shape every per-component error rule module exports. */
export type ErrorRuleModule = {
  codeRules: readonly CadErrorCodeRule[]
  stageRules: readonly CadErrorStageRule[]
}

/** The collected rules, sorted by their order key. */
export type CollectedErrorRules = {
  codeRules: readonly CadErrorCodeRule[]
  stageRules: readonly CadErrorStageRule[]
}

function assertRuleShape(
  path: string,
  rule: { order?: number; pattern?: string } | undefined,
): void {
  if (typeof rule?.order !== 'number' || !Number.isFinite(rule.order)) {
    throw new Error(`ERROR_RULE_ORDER_INVALID:${path}`)
  }
  if (typeof rule.pattern !== 'string' || rule.pattern.length === 0) {
    throw new Error(`ERROR_RULE_PATTERN_INVALID:${path}`)
  }
}

function assertUniqueOrders(orders: readonly number[], kind: string): void {
  const seen = new Set<number>()
  for (const order of orders) {
    if (seen.has(order)) {
      throw new Error(`ERROR_RULE_ORDER_DUPLICATED:${kind}:${order}`)
    }
    seen.add(order)
  }
}

/**
 * Collects the per-component rule modules into one ordered rule list.
 *
 * The modules are supplied by the caller so the collection can be exercised
 * with a synthetic module map. A malformed module or a duplicated order fails
 * loudly instead of being silently ignored.
 */
export function collectErrorRules(
  modules: Readonly<Record<string, ErrorRuleModule>>,
): CollectedErrorRules {
  const codeRules: CadErrorCodeRule[] = []
  const stageRules: CadErrorStageRule[] = []

  for (const [path, module] of Object.entries(modules)) {
    if (
      !Array.isArray(module?.codeRules) ||
      !Array.isArray(module?.stageRules)
    ) {
      throw new Error(`ERROR_RULE_MODULE_INVALID:${path}`)
    }
    for (const rule of module.codeRules) {
      assertRuleShape(path, rule)
      codeRules.push(rule)
    }
    for (const rule of module.stageRules) {
      assertRuleShape(path, rule)
      stageRules.push(rule)
    }
  }

  assertUniqueOrders(
    codeRules.map((rule) => rule.order),
    'code',
  )
  assertUniqueOrders(
    stageRules.map((rule) => rule.order),
    'stage',
  )

  codeRules.sort((left, right) => left.order - right.order)
  stageRules.sort((left, right) => left.order - right.order)

  return { codeRules, stageRules }
}
