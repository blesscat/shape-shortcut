import { describe, expect, it } from 'vitest'
import {
  OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'
import {
  cadPathForModel,
  getModelDefinition,
  groupModelDefinitions,
  modelIdForCadPath,
  opengridOpenConnectOrganizerDefinition,
} from '../../src/features/cad/model-catalog'
import { systemContextForModel } from '../../src/features/cad/system-entry-context'
import { translate } from '../../src/i18n'

describe('OpenGrid OpenConnect organizer catalog identity', () => {
  it('uses one matching OpenGrid identity for its module, model, build, and route', () => {
    const definition = getModelDefinition('opengrid-openconnect-organizer')

    expect(definition).toBe(opengridOpenConnectOrganizerDefinition)
    expect(definition).toMatchObject({
      id: 'opengrid-openconnect-organizer',
      buildKey: 'opengrid-openconnect-organizer',
      family: 'opengrid',
      supportedSystemContexts: ['wall'],
      defaultParameters: OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
      previewImage: {
        src: '/model-previews/opengrid-openconnect-organizer-wall.webp',
        darkSrc:
          '/model-previews/opengrid-openconnect-organizer-wall-dark.webp',
      },
    })
    expect(cadPathForModel('opengrid-openconnect-organizer', 'wall')).toBe(
      '/cad/opengrid-openconnect-organizer?system=wall',
    )
    expect(modelIdForCadPath('/cad/opengrid-openconnect-organizer/')).toBe(
      'opengrid-openconnect-organizer',
    )
  })

  it('publishes the edge, open-bottom, and whole-degree controls', () => {
    const definition = getModelDefinition('opengrid-openconnect-organizer')

    expect(definition?.parameterSchema.map(({ key }) => key)).toEqual([
      'holeCountX',
      'holeCountY',
      'holeSpacingX',
      'holeSpacingY',
      'holeDiameter',
      'holeWidth',
      'holeHeight',
      'holeCornerRadius',
      'holeDepth',
      'bottomThickness',
      'edgeThickness',
      'tiltAngle',
    ])
    expect(
      definition?.parameterSchema.find(({ key }) => key === 'holeWidth'),
    ).toMatchObject({
      min: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.minHoleWidth,
      max: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.maxHoleWidth,
      defaultValue:
        OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultHoleWidth,
    })
    expect(
      definition?.parameterSchema.find(({ key }) => key === 'holeCornerRadius'),
    ).toMatchObject({
      min: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.minHoleCornerRadius,
      defaultValue:
        OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.defaultHoleCornerRadius,
    })
    expect(
      definition?.parameterSchema.find(({ key }) => key === 'bottomThickness'),
    ).toMatchObject({
      min: 0,
    })
    expect(
      definition?.parameterSchema.find(({ key }) => key === 'edgeThickness'),
    ).toMatchObject({
      unit: 'mm',
      min: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.minEdgeThickness,
      max: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.maxEdgeThickness,
    })
    expect(
      definition?.parameterSchema.find(({ key }) => key === 'tiltAngle'),
    ).toMatchObject({
      unit: 'degree',
      min: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.minTiltAngle,
      max: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.maxTiltAngle,
      step: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.tiltAngleStep,
    })
  })

  it('appears exactly once in Wall and never in Desk', () => {
    const openGrid = groupModelDefinitions().find(
      (group) => group.key === 'opengrid',
    )
    const deskIds =
      openGrid?.subgroups
        ?.find(({ key }) => key === 'desk')
        ?.definitions.map(({ id }) => id) ?? []
    const wallIds =
      openGrid?.subgroups
        ?.find(({ key }) => key === 'wall')
        ?.definitions.map(({ id }) => id) ?? []

    expect(deskIds).not.toContain('opengrid-openconnect-organizer')
    expect(
      wallIds.filter((id) => id === 'opengrid-openconnect-organizer'),
    ).toHaveLength(1)
    expect(
      systemContextForModel('opengrid-openconnect-organizer', 'desk'),
    ).toBe(undefined)
    expect(
      systemContextForModel('opengrid-openconnect-organizer', 'wall'),
    ).toBe('wall')
  })

  it('uses localized OpenGrid naming and explains the tilt direction', () => {
    const definition = getModelDefinition('opengrid-openconnect-organizer')
    expect(definition).toBeDefined()

    for (const locale of ['zh-Hant', 'en'] as const) {
      expect(translate(locale, definition!.displayName)).toMatch(/^OpenGrid /)
      expect(translate(locale, definition!.selectionDescription)).not.toContain(
        '⟦',
      )
      expect(translate(locale, definition!.previewImage!.alt)).not.toContain(
        '⟦',
      )
      expect(
        translate(locale, 'parameter.organizerForwardTiltHelp'),
      ).not.toContain('⟦')
    }

    expect(
      translate('zh-Hant', 'parameter.organizerForwardTiltHelp'),
    ).toContain('開口')
    expect(translate('en', 'parameter.organizerForwardTiltHelp')).toMatch(
      /openings.+user/i,
    )
  })
})
