import type { CadErrorCode, CadErrorStage } from '../cad-contract/errors'
import type { WorkerCommand } from '../cad-contract/messages'
import { collectErrorRules, type ErrorRuleModule } from './error-mapping-rules'

type WorkerCommandKind = WorkerCommand['kind']

/**
 * The per-component error rule modules. Every module under
 * `src/workers/error-rules/` is collected automatically, so adding a
 * component's rules never requires editing this file.
 */
const ruleModules = import.meta.glob<ErrorRuleModule>('./error-rules/*.ts', {
  eager: true,
})

const { codeRules, stageRules } = collectErrorRules(ruleModules)

export function cadErrorCodeFor(
  message: string,
  commandKind: WorkerCommandKind,
): CadErrorCode {
  for (const rule of codeRules) {
    const matched = rule.exact
      ? message === rule.pattern
      : message.includes(rule.pattern)
    if (matched) return rule.code
  }

  if (commandKind === 'engine.init') return 'ENGINE_INIT_FAILED'
  if (commandKind === 'export.step') return 'STEP_EXPORT_FAILED'
  if (commandKind === 'export.stl') return 'STL_EXPORT_FAILED'
  if (commandKind === 'export.3mf') return 'THREEMF_EXPORT_FAILED'
  if (commandKind === 'scene.instance.export.step') return 'STEP_EXPORT_FAILED'
  if (commandKind === 'scene.instance.export.stl') return 'STL_EXPORT_FAILED'
  return 'MODEL_BUILD_FAILED'
}

export function cadErrorStageFor(
  commandKind: WorkerCommandKind,
  message = '',
): CadErrorStage {
  for (const rule of stageRules) {
    if (message.includes(rule.pattern)) return rule.stage
  }

  switch (commandKind) {
    case 'engine.init':
      return 'initializing'
    case 'export.step':
    case 'export.stl':
    case 'export.3mf':
    case 'scene.instance.export.step':
    case 'scene.instance.export.stl':
      return 'exporting'
    case 'model.generate':
    case 'scene.instance.generate':
      return 'building'
    default:
      return 'worker'
  }
}
