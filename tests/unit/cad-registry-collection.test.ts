import { describe, expect, it } from 'vitest'
import type { Shape3D } from 'replicad'
import type { ModelId } from '../../src/cad-contract/units'
import {
  collectKernelModelDefinitions,
  type ComponentDefinitionModule,
} from '../../src/cad-kernel/model/collect'
import {
  collectErrorRules,
  type ErrorRuleModule,
} from '../../src/workers/error-mapping-rules'
import { KERNEL_MODEL_GOLDEN_ENTRIES } from './cad-registry-baseline.fixture'

const definitionModules = import.meta.glob<ComponentDefinitionModule>(
  '../../src/cad-kernel/components/*/definition.ts',
  { eager: true },
)

const syntheticBuild = () => ({}) as unknown as Shape3D

describe('component registry collection', () => {
  it('collects a component module that was added to the module map', () => {
    const collected = collectKernelModelDefinitions({
      '../components/box/definition.ts': {
        definition: { id: 'box', build: syntheticBuild },
      },
    })

    expect(collected.map((definition) => definition.id)).toEqual(['box'])
    expect(collected[0].build).toBe(syntheticBuild)
  })

  it('collects an error rule module that was added to the module map', () => {
    const collected = collectErrorRules({
      './error-rules/added-component.ts': {
        codeRules: [
          { order: 10, pattern: 'ADDED_COMPONENT_RULE', code: 'INVALID_INPUT' },
        ],
        stageRules: [],
      },
    })

    expect(collected.codeRules.map((rule) => rule.pattern)).toEqual([
      'ADDED_COMPONENT_RULE',
    ])
  })

  it('fails loudly on a malformed component module', () => {
    expect(() =>
      collectKernelModelDefinitions({
        '../components/broken/definition.ts': {
          definition: undefined as never,
        },
      }),
    ).toThrow('KERNEL_DEFINITION_MODULE_INVALID')
  })

  it('fails loudly on a duplicated component id', () => {
    expect(() =>
      collectKernelModelDefinitions({
        '../components/first/definition.ts': {
          definition: { id: 'box', build: syntheticBuild },
        },
        '../components/second/definition.ts': {
          definition: { id: 'box', build: syntheticBuild },
        },
      }),
    ).toThrow('KERNEL_DEFINITION_ID_DUPLICATED')
  })

  it('fails loudly on a duplicated error rule order', () => {
    expect(() =>
      collectErrorRules({
        './error-rules/first.ts': {
          codeRules: [
            { order: 10, pattern: 'FIRST_RULE', code: 'INVALID_INPUT' },
          ],
          stageRules: [],
        },
        './error-rules/second.ts': {
          codeRules: [
            { order: 10, pattern: 'SECOND_RULE', code: 'INVALID_INPUT' },
          ],
          stageRules: [],
        },
      }),
    ).toThrow('ERROR_RULE_ORDER_DUPLICATED')
  })
})

describe('component definition coverage', () => {
  it('collects exactly one definition per model component', () => {
    const collectedIds = Object.values(definitionModules).map(
      (module) => module.definition.id,
    )
    const knownModelIds = Object.keys(KERNEL_MODEL_GOLDEN_ENTRIES)

    expect(collectedIds).toHaveLength(knownModelIds.length)
    expect(new Set(collectedIds).size).toBe(collectedIds.length)
    expect([...collectedIds].sort()).toEqual([...knownModelIds].sort())
  })

  it('registers every model id exactly once', () => {
    const knownModelIds = Object.keys(KERNEL_MODEL_GOLDEN_ENTRIES) as ModelId[]

    for (const modelId of knownModelIds) {
      const matching = Object.values(definitionModules).filter(
        (module) => module.definition.id === modelId,
      )

      expect(matching).toHaveLength(1)
    }
  })
})
