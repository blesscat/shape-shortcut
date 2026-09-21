import { expect, it } from 'vitest'
import { getModelDefinition } from '../../src/features/cad/model-catalog'
import { TISSUE_BOX_DEFAULTS } from '../../src/cad-contract/units/opengrid-openconnect-tissue-box'
import {
  parseRawParameters,
  rawFromParameters,
} from '../../src/components/cad/workspace/validation'
import { systemContextForModel } from '../../src/features/cad/system-entry-context'

it('registers a wall-only tissue holder with independently parsed parameters', () => {
  const id = 'opengrid-openconnect-tissue-box'
  const definition = getModelDefinition(id)
  expect(definition?.supportedSystemContexts).toEqual(['wall'])
  expect(definition?.defaultParameters).toEqual(TISSUE_BOX_DEFAULTS)
  expect(systemContextForModel(id, 'desk')).toBeUndefined()
  expect(systemContextForModel(id, 'wall')).toBe('wall')
  const raw = Object.fromEntries(
    Object.entries(TISSUE_BOX_DEFAULTS).map(([key, value]) => [
      key,
      String(value),
    ]),
  )
  expect(
    parseRawParameters(
      { ...raw, wallThickness: '2.5', honeycombMode: 'true' },
      id,
    ),
  ).toMatchObject({
    valid: true,
    value: { wallThickness: 2.5, honeycombMode: true },
  })
  expect(
    parseRawParameters({ ...raw, honeycombMode: 'yes' }, id),
  ).toMatchObject({ valid: false, field: 'honeycombMode' })
})

it('round-trips the initial panel snapshot', () => {
  expect(
    parseRawParameters(
      rawFromParameters(TISSUE_BOX_DEFAULTS),
      'opengrid-openconnect-tissue-box',
    ),
  ).toEqual({ valid: true, value: TISSUE_BOX_DEFAULTS })
})
