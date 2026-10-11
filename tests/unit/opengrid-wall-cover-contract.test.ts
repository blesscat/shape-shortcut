import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridSnap,
  boundsForOpenGridWallCover,
  isOpenGridWallCoverParameters,
  openGridWallCoverFileName,
  openGridWallCoverStlFileName,
  openGridWallCoverThreeMfFileName,
  OPENGRID_WALL_COVER_CONFIGURATION,
  OPENGRID_SNAP_CONFIGURATION,
  normalizeOpenGridSnapParameters,
  validateOpenGridWallCoverParameters,
} from '../../src/cad-contract/units'
import {
  cadPathForModel,
  getModelDefinition,
  groupModelDefinitions,
} from '../../src/features/cad/model-catalog'
import { systemContextForModel } from '../../src/features/cad/system-entry-context'
import { PLAYGROUND_GRID_PITCH } from '../../src/cad-contract/scene'

describe('OpenGrid Wall Cover contract', () => {
  it('accepts a canonical text value and migrates legacy empty parameters', () => {
    expect(OPENGRID_WALL_COVER_CONFIGURATION.defaultParameters).toEqual({
      text: 'A',
      openConnect: true,
    })
    expect(validateOpenGridWallCoverParameters({})).toEqual({
      valid: true,
      value: { text: 'A', openConnect: true },
    })
    expect(validateOpenGridWallCoverParameters({ text: 'IAN' })).toEqual({
      valid: true,
      value: { text: 'IAN', openConnect: true },
    })
    expect(validateOpenGridWallCoverParameters({ text: ' I A N ' })).toEqual({
      valid: true,
      value: { text: 'IAN', openConnect: true },
    })
    expect(isOpenGridWallCoverParameters({ text: 'A' })).toBe(true)
    expect(validateOpenGridWallCoverParameters({ text: '' })).toMatchObject({
      valid: false,
      issues: [{ messageId: 'validation.wallCoverTextRequired' }],
    })
    expect(
      validateOpenGridWallCoverParameters({ text: '123456789' }),
    ).toMatchObject({
      valid: false,
      issues: [
        {
          messageId: 'validation.wallCoverTextTooLong',
          params: { max: 8 },
        },
      ],
    })
    expect(
      validateOpenGridWallCoverParameters({ text: 'A', extra: true }),
    ).toMatchObject({
      valid: false,
    })
  })

  it('accepts the optional OpenConnect underside opening toggle', () => {
    expect(
      validateOpenGridWallCoverParameters({
        text: 'A',
        openConnect: false,
      }),
    ).toEqual({
      valid: true,
      value: { text: 'A', openConnect: false },
    })
    expect(
      validateOpenGridWallCoverParameters({
        text: 'A',
        openConnect: 'false',
      }),
    ).toMatchObject({
      valid: false,
      issues: [{ field: 'openConnect', messageId: 'validation.invalid' }],
    })
  })

  it('uses one fixed cover envelope per input character', () => {
    expect(boundsForOpenGridWallCover({ text: 'A' })).toEqual(
      boundsForOpenGridSnap({
        ...OPENGRID_SNAP_CONFIGURATION.defaultParameters,
        variant: 'Lite',
        profile: 'Standard',
        offset: 0,
        footprint: 'full',
      }),
    )
    for (const text of ['IAN', '收納', 'ABCDEFGH', ' I A N ']) {
      const validation = validateOpenGridWallCoverParameters({ text })
      if (!validation.valid) throw new Error('invalid-test-label')
      const coverCount = Array.from(validation.value.text).length
      const singleBounds = boundsForOpenGridWallCover({ text: 'A' })
      const width =
        (coverCount - 1) * PLAYGROUND_GRID_PITCH +
        OPENGRID_WALL_COVER_CONFIGURATION.coverWidth
      expect(boundsForOpenGridWallCover({ text })).toEqual({
        min: [-width / 2, singleBounds.min[1], singleBounds.min[2]],
        max: [width / 2, singleBounds.max[1], singleBounds.max[2]],
      })
    }
  })

  it('exposes stable names and a 3MF filename for the text model', () => {
    const definition = getModelDefinition('opengrid-wall-cover')

    expect(definition).toMatchObject({
      id: 'opengrid-wall-cover',
      buildKey: 'opengrid-wall-cover',
      displayName: 'models.model.opengrid-wall-cover.name',
      parameterPresentation: { kind: 'adjustable' },
      parameterSchema: [],
      defaultParameters: { text: 'A', openConnect: true },
    })
    expect(definition?.exportFileName({ text: 'IAN' })).toBe(
      'opengrid-wall-cover.step',
    )
    expect(definition?.stlFileName({ text: 'IAN' })).toBe(
      'opengrid-wall-cover.stl',
    )
    expect(definition?.threeMfFileName?.({ text: 'IAN' })).toBe(
      'opengrid-wall-cover.3mf',
    )
    expect(openGridWallCoverFileName({ text: 'IAN' })).toBe(
      'opengrid-wall-cover.step',
    )
    expect(openGridWallCoverStlFileName({ text: 'IAN' })).toBe(
      'opengrid-wall-cover.stl',
    )
    expect(openGridWallCoverThreeMfFileName({ text: 'IAN' })).toBe(
      'opengrid-wall-cover.3mf',
    )
    expect(getModelDefinition('opengrid-snap')?.threeMfFileName).toBeUndefined()
  })

  it('normalizes legacy Snap text to single color', () => {
    expect(
      normalizeOpenGridSnapParameters({
        ...OPENGRID_SNAP_CONFIGURATION.defaultParameters,
        topText: 'SNAP',
      }),
    ).toMatchObject({ topText: 'none' })
  })

  it('exposes the model only in the Wall subgroup', () => {
    const openGridGroup = groupModelDefinitions().find(
      (group) => group.key === 'opengrid',
    )
    const desk = openGridGroup?.subgroups?.find(
      (subgroup) => subgroup.key === 'desk',
    )
    const wall = openGridGroup?.subgroups?.find(
      (subgroup) => subgroup.key === 'wall',
    )

    expect(
      desk?.definitions.some((item) => item.id === 'opengrid-wall-cover'),
    ).toBe(false)
    expect(wall?.definitions.map((item) => item.id)).toContain(
      'opengrid-wall-cover',
    )
    expect(systemContextForModel('opengrid-wall-cover', 'wall')).toBe('wall')
    expect(systemContextForModel('opengrid-wall-cover', 'desk')).toBeUndefined()
    expect(cadPathForModel('opengrid-wall-cover', 'wall')).toBe(
      '/cad/opengrid-wall-cover?system=wall',
    )
  })
})
