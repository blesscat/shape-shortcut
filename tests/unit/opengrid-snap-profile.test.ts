import { describe, expect, it } from 'vitest'
import {
  openGridSnapLocatingHoleCentersFor,
  openGridSnapProfileFor,
  OPENGRID_SNAP_PROFILE_DEFINITIONS,
} from '../../src/cad-kernel/components/opengrid-snap/profile'
import {
  halfCellHostPitch,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_GRID_CONFIGURATION,
} from '../../src/cad-contract/units'

describe('OpenGrid Snap profile registry', () => {
  it('registers every independent profile and variant with its source geometry', () => {
    for (const profile of ['Standard', 'Directional'] as const) {
      for (const variant of ['Full', 'Lite'] as const) {
        const definition = openGridSnapProfileFor(profile, variant)

        expect(definition.profile).toBe(profile)
        expect(definition.variant).toBe(variant)
        expect(definition.assetUrl.pathname).toContain(
          '/src/cad-kernel/components/opengrid-snap/assets/',
        )
        expect(definition.assetUrl.pathname).not.toContain('/Downloads/')
        expect('hostPitch' in definition).toBe(false)
        expect(definition.canonicalOrientation).toBe('source')
        expect(definition.expectedSolidCount).toBe(
          profile === 'Standard' ? 9 : 1,
        )
        let expectedTop = 3.401
        if (variant === 'Full') expectedTop = 6.801
        if (profile === 'Standard') expectedTop -= 0.001
        expect(definition.expectedBounds.max[2]).toBe(expectedTop)
      }
    }

    expect(Object.keys(OPENGRID_SNAP_PROFILE_DEFINITIONS)).toEqual([
      'Standard',
      'Directional',
    ])
  })

  it('uses the shared official pitch for full and half host footprints', () => {
    expect(halfCellHostPitch('none')).toBe(
      OPENGRID_GRID_CONFIGURATION.fullPitch,
    )
    expect(halfCellHostPitch('left')).toBe(
      OPENGRID_GRID_CONFIGURATION.halfPitch,
    )
  })

  it('keeps locating-hole and center-remover dimensions fixed per profile', () => {
    for (const profile of ['Standard', 'Directional'] as const) {
      for (const variant of ['Full', 'Lite'] as const) {
        const definition = openGridSnapProfileFor(profile, variant)
        const distance = 7

        expect(definition.locatingHoleRadius).toBe(
          OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.nominalDiameter / 2,
        )
        expect(definition.centerPassageRadius).toBe(2.45)
        expect(definition.locatingHoleCenter).toBe(distance)
        expect(definition.locatingHoleSlotHalfWidth).toBe(1.5)
        expect(definition.locatingHoleSlotInnerHalfSpan).toBe(5)
        expect(definition.locatingHoleSlotStepZ).toBe(
          variant === 'Full' ? 4.8 : 1.9,
        )
        expect(openGridSnapLocatingHoleCentersFor(definition)).toEqual([
          [-distance, -distance],
          [-distance, distance],
          [distance, -distance],
          [distance, distance],
        ])
        expect(definition.centerRemoverLowerHalfWidth).toBe(4)
        expect(definition.centerRemoverUpperHalfWidth).toBe(2)
        expect(definition.centerRemoverHalfDepth).toBe(4)
        expect(definition.centerRemoverStepZ).toBe(
          variant === 'Full' ? 4.8 : 1.9,
        )
        expect(definition.optionalFeatures).toEqual([
          'fourCornerLocatingHoles',
          'centerRemoverHole',
        ])
        expect(definition.intrinsicFeatures.length).toBeGreaterThan(0)
        expect(definition.intrinsicFeatures).not.toContain(
          'fourCornerLocatingHoles',
        )
        expect(definition.intrinsicFeatures).not.toContain('centerRemoverHole')
      }
    }
  })
})
