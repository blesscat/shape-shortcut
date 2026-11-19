import { describe, expect, it } from 'vitest'
import {
  cadErrorCodeFor,
  cadErrorStageFor,
} from '../../src/workers/error-mapping'
import {
  COMMAND_KIND_FALLBACK_GOLDEN_CASES,
  ERROR_RULE_GOLDEN_CASES,
  ERROR_STAGE_PREFIX_GOLDEN_CASES,
  type WorkerCommandKind,
} from './cad-registry-baseline.fixture'

const ALL_RULE_CASES = [
  ...ERROR_RULE_GOLDEN_CASES,
  ...ERROR_STAGE_PREFIX_GOLDEN_CASES,
]

const COMMAND_KIND_ENTRIES = Object.entries(
  COMMAND_KIND_FALLBACK_GOLDEN_CASES,
) as Array<
  [
    WorkerCommandKind,
    (typeof COMMAND_KIND_FALLBACK_GOLDEN_CASES)[WorkerCommandKind],
  ]
>

describe('CAD error mapping golden baseline', () => {
  it.each(ALL_RULE_CASES)(
    'maps $rule to code $code and stage $stageOnGenerate',
    ({ message, exactMatchOnly, code, stageOnGenerate }) => {
      expect(cadErrorCodeFor(message, 'model.generate')).toBe(code)
      expect(cadErrorStageFor('model.generate', message)).toBe(stageOnGenerate)

      if (!exactMatchOnly) {
        const decorated = `PREFIX:${message}:SUFFIX`
        expect(cadErrorCodeFor(decorated, 'model.generate')).toBe(code)
        expect(cadErrorStageFor('model.generate', decorated)).toBe(
          stageOnGenerate,
        )
      }
    },
  )

  it('requires exact equality for INVALID_INPUT rather than substring matching', () => {
    expect(cadErrorCodeFor('INVALID_INPUT', 'model.generate')).toBe(
      'INVALID_INPUT',
    )
    expect(
      cadErrorCodeFor('PREFIX:INVALID_INPUT:SUFFIX', 'model.generate'),
    ).toBe('MODEL_BUILD_FAILED')
    expect(cadErrorCodeFor('PREFIX:INVALID_INPUT:SUFFIX', 'export.step')).toBe(
      'STEP_EXPORT_FAILED',
    )
  })

  it.each(COMMAND_KIND_ENTRIES)(
    'falls back to code $1.code and stage $1.stage for unmatched $0 errors',
    (commandKind, expected) => {
      expect(cadErrorCodeFor('UNMATCHED_ERROR_MESSAGE', commandKind)).toBe(
        expected.code,
      )
      expect(cadErrorStageFor(commandKind, 'UNMATCHED_ERROR_MESSAGE')).toBe(
        expected.stage,
      )
    },
  )

  it('evaluates message rules before command-kind fallbacks', () => {
    expect(cadErrorCodeFor('MESH_INVALID: empty', 'export.step')).toBe(
      'MESH_INVALID',
    )
    expect(cadErrorStageFor('export.step', 'MESH_INVALID: empty')).toBe(
      'meshing',
    )
  })
})
