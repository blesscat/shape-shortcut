import { describe, expect, it } from 'vitest'
import type { Shape3D } from 'replicad'
import { collectKernelModelDefinitions } from '../../src/cad-kernel/model/collect'
import { collectErrorRules } from '../../src/workers/error-mapping-rules'

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
