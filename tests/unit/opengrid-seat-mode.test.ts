import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridStackableBox,
  boundsForOpenGridStackableCylinder,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  openGridStackableBoxSocketCentersFor,
  openGridStackableBoxStlFileName,
  openGridStackableCylinderHoleCentersFor,
  openGridStackableCylinderStlFileName,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  validateOpenGridStackableBoxParameters,
  validateOpenGridStackableCylinderParameters,
} from '../../src/cad-contract/units'

const boxOpeningDefaults = {
  openingPlusXDepth: 0,
  openingPlusXBottomLength: 1,
  openingPlusXAngle: 90,
  openingMinusXDepth: 0,
  openingMinusXBottomLength: 1,
  openingMinusXAngle: 90,
  openingPlusYDepth: 0,
  openingPlusYBottomLength: 1,
  openingPlusYAngle: 90,
  openingMinusYDepth: 0,
  openingMinusYBottomLength: 1,
  openingMinusYAngle: 90,
}

function boxParameters(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    x: 2,
    y: 2,
    height: 20,
    cornerSeatMode: 'detachable-corner-seat',
    fullBottomHoleGrid: false,
    basePlateMode: false,
    thinShellMode: false,
    ...boxOpeningDefaults,
    ...overrides,
  }
}

function cylinderParameters(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    innerDiameter: 56,
    height: 20,
    bottomPlateMode: false,
    bottomSeatMode: 'detachable-corner-seat',
    openingPlusXDepth: 0,
    openingPlusXBottomLength: 1,
    openingPlusXAngle: 90,
    openingMinusXDepth: 0,
    openingMinusXBottomLength: 1,
    openingMinusXAngle: 90,
    openingPlusYDepth: 0,
    openingPlusYBottomLength: 1,
    openingPlusYAngle: 90,
    openingMinusYDepth: 0,
    openingMinusYBottomLength: 1,
    openingMinusYAngle: 90,
    ...overrides,
  }
}

describe('OpenGrid locating seat modes', () => {
  it('accepts the three Grid Box seat modes and gives integrated mode a lower bound', () => {
    for (const mode of ['none', 'detachable-corner-seat', 'integrated']) {
      const validation = validateOpenGridStackableBoxParameters(
        boxParameters({ cornerSeatMode: mode }),
      )
      expect(validation.valid).toBe(true)
    }

    expect(
      boundsForOpenGridStackableBox(
        boxParameters({ cornerSeatMode: 'integrated' }) as never,
      ).min[2],
    ).toBe(OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ)
  })

  it('keeps Grid Box ordinary holes independent from integrated seats', () => {
    const integrated = boxParameters({
      cornerSeatMode: 'integrated',
      fullBottomHoleGrid: true,
    }) as never
    const none = boxParameters({
      cornerSeatMode: 'none',
      fullBottomHoleGrid: true,
    }) as never

    expect(openGridStackableBoxSocketCentersFor(integrated)).toHaveLength(4)
    const ordinaryIntegrated =
      openGridStackableBoxOrdinaryBottomHoleCentersFor(integrated)
    expect(ordinaryIntegrated).toHaveLength(12)
    expect(
      ordinaryIntegrated.some(([x, y]) =>
        openGridStackableBoxSocketCentersFor(integrated).some(
          ([specialX, specialY]) => x === specialX && y === specialY,
        ),
      ),
    ).toBe(false)
    expect(openGridStackableBoxOrdinaryBottomHoleCentersFor(none)).toHaveLength(
      16,
    )
  })

  it('accepts the Round Box seat modes and mirrors safe hole positions', () => {
    for (const mode of ['none', 'detachable-corner-seat', 'integrated']) {
      const validation = validateOpenGridStackableCylinderParameters(
        cylinderParameters({ bottomSeatMode: mode }),
      )
      expect(validation.valid).toBe(true)
    }

    const integrated = cylinderParameters({
      bottomSeatMode: 'integrated',
    }) as never
    expect(openGridStackableCylinderHoleCentersFor(integrated)).toEqual([
      [0, 0],
      [14, 0],
      [-14, 0],
      [0, 14],
      [0, -14],
    ])
    expect(boundsForOpenGridStackableCylinder(integrated).min[2]).toBe(
      OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ,
    )
  })

  it('migrates legacy booleans and prefers an explicit current mode', () => {
    const { cornerSeatMode: _boxMode, ...boxLegacyBase } = boxParameters()
    const legacyBox = validateOpenGridStackableBoxParameters({
      ...boxLegacyBase,
      cornerBottomHoles: false,
    })
    expect(legacyBox).toMatchObject({
      valid: true,
      value: { cornerSeatMode: 'none' },
    })

    const { bottomSeatMode: _cylinderMode, ...cylinderLegacyBase } =
      cylinderParameters()
    const legacyCylinder = validateOpenGridStackableCylinderParameters({
      ...cylinderLegacyBase,
      bottomHolesEnabled: false,
    })
    expect(legacyCylinder).toMatchObject({
      valid: true,
      value: { bottomSeatMode: 'none' },
    })

    const conflictingBox = validateOpenGridStackableBoxParameters({
      ...boxLegacyBase,
      cornerBottomHoles: false,
      cornerSeatMode: 'integrated',
    })
    expect(conflictingBox).toMatchObject({
      valid: true,
      value: { cornerSeatMode: 'integrated' },
    })

    const conflictingCylinder = validateOpenGridStackableCylinderParameters({
      ...cylinderLegacyBase,
      bottomHolesEnabled: false,
      bottomSeatMode: 'integrated',
    })
    expect(conflictingCylinder).toMatchObject({
      valid: true,
      value: { bottomSeatMode: 'integrated' },
    })

    expect(
      validateOpenGridStackableBoxParameters({
        ...boxLegacyBase,
        cornerSeatMode: 'hole',
      }),
    ).toMatchObject({
      valid: true,
      value: { cornerSeatMode: 'detachable-corner-seat' },
    })
    expect(
      validateOpenGridStackableCylinderParameters({
        ...cylinderLegacyBase,
        bottomSeatMode: 'hole',
      }),
    ).toMatchObject({
      valid: true,
      value: { bottomSeatMode: 'detachable-corner-seat' },
    })
  })

  it('makes STL names distinguish all seat geometries', () => {
    expect(
      openGridStackableBoxStlFileName(
        boxParameters({ cornerSeatMode: 'none' }) as never,
      ),
    ).toContain('-seats-none')
    expect(
      openGridStackableBoxStlFileName(
        boxParameters({ cornerSeatMode: 'integrated' }) as never,
      ),
    ).toContain('-seats-integrated')
    expect(
      openGridStackableCylinderStlFileName(
        cylinderParameters({ bottomSeatMode: 'integrated' }) as never,
      ),
    ).toContain('-seats-integrated')
  })
})
