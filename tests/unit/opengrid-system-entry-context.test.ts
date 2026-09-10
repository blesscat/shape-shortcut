import { describe, expect, it } from 'vitest'
import {
  cadPathForModel,
  groupModelDefinitions,
} from '../../src/features/cad/model-catalog'
import {
  getSystemPreset,
  parseSystemContext,
  systemContextForModel,
} from '../../src/features/cad/system-entry-context'
import {
  OPENGRID_CONFIGURATION,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'

describe('OpenGrid system entry context', () => {
  it('accepts only the supported system query values', () => {
    expect(parseSystemContext('?system=desk')).toBe('desk')
    expect(parseSystemContext('?system=wall')).toBe('wall')
    expect(parseSystemContext('?system=desktop')).toBeUndefined()
    expect(parseSystemContext('?system=unknown')).toBeUndefined()
    expect(parseSystemContext('')).toBeUndefined()
    expect(systemContextForModel('hsw-cell', 'desk')).toBeUndefined()
    expect(systemContextForModel('opengrid-pillar', 'wall')).toBeUndefined()
    expect(systemContextForModel('opengrid-pillar', 'desk')).toBe('desk')
  })

  it('resolves the documented Desk and Wall Snap presets', () => {
    expect(getSystemPreset('opengrid-snap', 'desk')).toEqual({
      variant: 'Lite',
      profile: 'Standard',
      offset: 0.25,
      footprint: 'full',
      fourCornerLocatingHoles: true,
      centerRemoverHole: true,
      openConnect: false,
      topText: 'none',
      magnetHoleShape: 'none',
      magnetHoleLength: 0,
      magnetHoleWidth: 0,
      magnetHoleDiameter: 0,
      magnetHoleThickness: 0,
    })
    expect(getSystemPreset('opengrid-snap', 'wall')).toEqual({
      variant: 'Full',
      profile: 'Standard',
      offset: 0,
      footprint: 'full',
      fourCornerLocatingHoles: false,
      centerRemoverHole: false,
      openConnect: false,
      topText: 'none',
      magnetHoleShape: 'none',
      magnetHoleLength: 0,
      magnetHoleWidth: 0,
      magnetHoleDiameter: 0,
      magnetHoleThickness: 0,
    })
    expect(getSystemPreset('opengrid-pillar', 'desk')).toEqual({
      mode: 'detachable-corner-seat',
      length: 3.8,
      offset: 0,
    })
  })

  it('uses a no-feature 4 × 4 Desk board preset and Full 4 × 4 Wall board preset', () => {
    expect(getSystemPreset('opengrid', 'desk')).toEqual({
      ...OPENGRID_CONFIGURATION.defaultParameters,
      rows: 4,
      columns: 4,
      chamfers: 'none',
      screwMode: 'none',
    })
    expect(getSystemPreset('opengrid', 'wall')).toEqual({
      ...OPENGRID_CONFIGURATION.defaultParameters,
      variant: 'Full',
      rows: 4,
      columns: 4,
    })
  })

  it('resolves isolated Desk container presets without changing model defaults', () => {
    const deskBox = getSystemPreset('opengrid-stackable-box', 'desk')
    const deskCylinder = getSystemPreset('opengrid-stackable-cylinder', 'desk')
    const deskOrganizer = getSystemPreset('opengrid-organizer-box', 'desk')

    expect(deskBox).toEqual({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 4,
      y: 2,
      height: 30,
      topRimMode: 'flat-top',
      bottomMode: 'thin-shell',
    })
    expect(deskCylinder).toEqual({
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      innerDiameter: 57,
      height: 30,
      bottomPlateMode: false,
    })
    expect(deskOrganizer).toEqual({
      ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
      holeCountX: 2,
      holeCountY: 2,
      holeDepth: 30,
    })

    expect(getSystemPreset('opengrid-stackable-box', 'wall')).toBeUndefined()
    expect(
      getSystemPreset('opengrid-stackable-cylinder', 'wall'),
    ).toBeUndefined()
    expect(getSystemPreset('opengrid-organizer-box', 'wall')).toBeUndefined()

    expect(getSystemPreset('opengrid-stackable-box', 'desk')).not.toBe(
      getSystemPreset('opengrid-stackable-box', 'desk'),
    )
    expect(getSystemPreset('opengrid-stackable-cylinder', 'desk')).not.toBe(
      getSystemPreset('opengrid-stackable-cylinder', 'desk'),
    )
    expect(OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS).toMatchObject({
      x: 2,
      y: 2,
      height: 20,
      topRimMode: 'stacking-rail',
      bottomMode: 'stacking',
    })
    expect(OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS).toMatchObject({
      innerDiameter: 56,
      height: 20,
      bottomPlateMode: false,
    })
  })

  it('groups context entries and gives them separate preview identities', () => {
    const openGrid = groupModelDefinitions().find(
      (group) => group.key === 'opengrid',
    )
    expect(openGrid?.subgroups?.map((group) => group.key)).toEqual([
      'desk',
      'wall',
    ])
    expect(
      openGrid?.subgroups
        ?.find((group) => group.key === 'desk')
        ?.definitions.map((entry) => entry.id),
    ).toEqual([
      'opengrid',
      'opengrid-snap',
      'opengrid-pillar',
      'opengrid-divider',
      'opengrid-organizer-box',
      'opengrid-stackable-box',
      'opengrid-stackable-cylinder',
      'opengrid-snap-remover',
      'opengrid-open-shelf',
    ])
    expect(
      openGrid?.subgroups
        ?.find((group) => group.key === 'wall')
        ?.definitions.map((entry) => entry.id),
    ).toEqual([
      'opengrid',
      'opengrid-snap',
      'opengrid-wall-cover',
      'opengrid-openconnect-shelf',
      'opengrid-openconnect-organizer',
    ])

    const deskSnap = openGrid?.subgroups?.[0]?.definitions[1]
    const wallSnap = openGrid?.subgroups?.[1]?.definitions[1]
    expect(deskSnap?.systemContext).toBe('desk')
    expect(wallSnap?.systemContext).toBe('wall')
    expect(deskSnap?.previewImage?.src).toBe(
      '/model-previews/opengrid-snap-desk.webp',
    )
    expect(deskSnap?.previewImage?.darkSrc).toBe(
      '/model-previews/opengrid-snap-desk-dark.webp',
    )
    expect(wallSnap?.previewImage?.src).toBe(
      '/model-previews/opengrid-snap-wall.webp',
    )
    expect(wallSnap?.previewImage?.darkSrc).toBe(
      '/model-previews/opengrid-snap-wall-dark.webp',
    )
    expect(cadPathForModel('opengrid-snap', 'wall')).toBe(
      '/cad/opengrid-snap?system=wall',
    )
  })
})
