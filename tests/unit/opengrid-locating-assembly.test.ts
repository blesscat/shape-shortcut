import { describe, expect, it, vi } from 'vitest'
import type { Shape3D } from 'replicad'
import {
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  PILLAR_CONFIGURATION,
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_LOCATING_SEAT_MODES,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  openGridOrganizerBoxDetachableSocketPosesFor,
  openGridStackableCylinderHoleCentersFor,
} from '../../src/cad-contract/units'
import { openGridSnapProfileFor } from '../../src/cad-kernel/components/opengrid-snap/profile'
import { openGridDetachableCornerSeatConsumerPlacementsFor } from '../../src/cad-kernel/components/opengrid-locating-assembly/consumer'
import { placeOpenGridDetachableCornerSeatSocketShape } from '../../src/cad-kernel/components/opengrid-locating-assembly/reference'

describe('OpenGrid locating and assembly interface contract', () => {
  it('publishes the canonical locating seat modes', () => {
    expect(OPENGRID_LOCATING_SEAT_MODES).toEqual([
      'none',
      'detachable-corner-seat',
      'integrated',
    ])
  })

  it('publishes the confirmed dimensions and derived openings', () => {
    const configuration = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION

    expect(configuration.nominalDiameter).toBe(5)
    expect(configuration.assemblyIncrement).toBe(0.05)
    expect(configuration.assemblyOpeningDiameter).toBe(
      configuration.nominalDiameter + configuration.assemblyIncrement,
    )
    expect(configuration.testShaftDiameter).toBe(5)
    expect(configuration.shaftOpeningDiameter).toBe(5)
    expect(configuration.testFlangeDiameter).toBe(7)
    expect(configuration.retainingOpeningDiameter).toBe(7.05)
    expect(configuration.assemblyOpeningDiameter).toBe(5.05)
    expect(configuration.testFlangeHeight).toBe(0.8)
    expect(configuration.integratedSeatDiameter).toBe(
      configuration.nominalDiameter,
    )
    expect(configuration.integratedSeatHeight).toBe(3.8)
    expect(configuration.integratedSeatMinZ).toBe(-3.8)
    expect(configuration.integratedSeatBottomChamfer).toBe(0.2)
  })

  it('keeps shared nominal consumers separate from the pillar diameter', () => {
    const configuration = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION

    expect(openGridSnapProfileFor('Standard', 'Lite').locatingHoleRadius).toBe(
      configuration.nominalDiameter / 2,
    )
    expect(OPENGRID_DIVIDER_CONFIGURATION.pegDiameter).toBe(
      configuration.nominalDiameter,
    )
    expect(OPENGRID_DIVIDER_CONFIGURATION.pegLength).toBe(
      configuration.integratedSeatHeight,
    )
    expect(OPENGRID_DIVIDER_CONFIGURATION.pegBottomChamfer).toBe(
      configuration.integratedSeatBottomChamfer,
    )
    expect(PILLAR_CONFIGURATION.bodyDiameter).toBe(4.9)
    expect(PILLAR_CONFIGURATION.positioningBodyDiameter).toBe(4.9)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleDiameter).toBe(
      configuration.nominalDiameter,
    )
    expect(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.socketDeduplicationDistance,
    ).toBe(OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.outerDiameter)
  })

  it('routes assembly consumers through the shared openings', () => {
    const configuration = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION

    expect(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleBottomOpeningDiameter,
    ).toBe(configuration.shaftOpeningDiameter)
    expect(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleTopOpeningDiameter,
    ).toBe(configuration.retainingOpeningDiameter)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomGridHoleDiameter).toBe(
      configuration.assemblyOpeningDiameter,
    )
    expect(OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.bottomHoleDiameter).toBe(
      configuration.shaftOpeningDiameter,
    )
    expect(OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.innerHoleDiameter).toBe(
      configuration.retainingOpeningDiameter,
    )
  })

  it('publishes the floor-relative compatibility fixture dimensions', () => {
    const configuration = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION

    expect(configuration.testShaftExposure).toBe(1)
    expect(configuration.testShaftLengthForFloor(3)).toBe(4)
    expect(configuration.testShaftLengthForFloor(5)).toBe(6)
  })

  it('publishes the fixed detachable corner-seat fit once', () => {
    const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION

    expect(configuration.male).toMatchObject({
      bodyDiameter: 5,
      bodyHeight: 3.8,
      leadInHeight: 0.2,
      leadInTipDiameter: 4.6,
      keyWidth: 1.96,
      headStartLength: 4.24,
      headMaxLength: 6.64,
      taperTopZ: 5.15,
      wearHeight: 0.15,
      totalHeight: 5.3,
      nominalVolume: 89.3026235581,
      bounds: {
        min: [-3.321716, -2.5, 0],
        max: [3.321716, 2.5, 5.3],
      },
    })
    expect(configuration.male.totalHeight).toBeCloseTo(
      configuration.male.bodyHeight + configuration.femaleReference.depth,
      8,
    )
    expect(configuration.male.taperTopZ).toBeCloseTo(
      configuration.male.totalHeight - configuration.male.wearHeight,
      8,
    )
    expect(configuration.female).toMatchObject({
      outerDiameter: 11,
      depth: 1.5,
      pocketSideClearance: 0.02,
      sourceMinZ: 3.8,
      sourceMaxZ: 5.3,
      nominalVolume: 106.453536642,
      bounds: {
        min: [-5.5, -5.5, 3.8],
        max: [5.5, 5.5, 5.3],
      },
    })
    expect(configuration.female.depth).toBeCloseTo(
      configuration.femaleReference.depth,
      8,
    )
    expect(configuration.minimumSocketRoof).toBe(0.5)
  })

  it('publishes the male-only lock-indicator profile', () => {
    const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION

    expect(configuration.male.indicator).toMatchObject({
      width: 0.5,
      radialLength: 3,
      depth: 0.4,
    })
    expect(configuration.male.markedNominalVolume).toBeCloseTo(
      configuration.male.nominalVolume,
      8,
    )
  })

  it('matches Organizer Box corner socket directions', () => {
    const organizerParameters = {
      ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
      holeCountX: 1,
      holeCountY: 1,
      cornerSeatMode: 'detachable-corner-seat' as const,
    }
    const organizerPoses =
      openGridOrganizerBoxDetachableSocketPosesFor(organizerParameters)
    const consumerPlacements =
      openGridDetachableCornerSeatConsumerPlacementsFor(
        organizerPoses.map(({ center }) => center),
      )

    expect(consumerPlacements).toEqual(
      organizerPoses.map(({ center, rotationDegrees }) => ({
        center,
        rotationDegrees,
      })),
    )
  })

  it('matches Organizer Box orientation for circular cardinal seats', () => {
    const cylinderParameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      innerDiameter: 56,
      bottomSeatMode: 'detachable-corner-seat' as const,
    }
    const centers = openGridStackableCylinderHoleCentersFor(cylinderParameters)
    const placements =
      openGridDetachableCornerSeatConsumerPlacementsFor(centers)

    expect(placements.map(({ rotationDegrees }) => rotationDegrees)).toEqual([
      0, 90, 270, 0, 180,
    ])
  })

  it.each(['translateZ', 'rotate', 'translate'] as const)(
    'deletes the owned clone when %s placement fails',
    (failedTransform) => {
      const ownedClone = {
        delete: vi.fn(),
        translateZ: vi.fn(() => {
          if (failedTransform === 'translateZ')
            throw new Error('TRANSFORM_FAILED')
          return ownedClone
        }),
        rotate: vi.fn(() => {
          if (failedTransform === 'rotate') throw new Error('TRANSFORM_FAILED')
          return ownedClone
        }),
        translate: vi.fn(() => {
          if (failedTransform === 'translate')
            throw new Error('TRANSFORM_FAILED')
          return ownedClone
        }),
      }
      const source = {
        clone: vi.fn(() => ownedClone),
      } as unknown as Shape3D

      expect(() =>
        placeOpenGridDetachableCornerSeatSocketShape(source, {
          center: [10, 20],
          rotationDegrees: 90,
        }),
      ).toThrow('TRANSFORM_FAILED')
      expect(ownedClone.delete).toHaveBeenCalledOnce()
    },
  )

  it('deletes both the replaced clone and current transform on a later failure', () => {
    const translatedClone = {
      delete: vi.fn(),
      rotate: vi.fn(() => {
        throw new Error('ROTATE_FAILED')
      }),
    }
    const initialClone = {
      delete: vi.fn(),
      translateZ: vi.fn(() => translatedClone),
    }
    const source = {
      clone: vi.fn(() => initialClone),
    } as unknown as Shape3D

    expect(() =>
      placeOpenGridDetachableCornerSeatSocketShape(source, {
        center: [0, 0],
        rotationDegrees: 90,
      }),
    ).toThrow('ROTATE_FAILED')
    expect(initialClone.delete).toHaveBeenCalledOnce()
    expect(translatedClone.delete).toHaveBeenCalledOnce()
  })
})
