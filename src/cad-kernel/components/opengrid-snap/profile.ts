import type {
  ModelBounds,
  OpenGridSnapProfile,
  OpenGridSnapVariant,
} from '../../../cad-contract/units'
import { OPENGRID_SNAP_CONFIGURATION } from '../../../cad-contract/units'
import { OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION } from '../../../cad-contract/units/opengrid-locating-assembly'

export type OpenGridSnapMagnetConnectorDirection =
  'positiveX' | 'negativeX' | 'positiveY' | 'negativeY'

export type OpenGridSnapProfileDefinition = {
  profile: OpenGridSnapProfile
  variant: OpenGridSnapVariant
  assetUrl: URL
  expectedBounds: ModelBounds
  expectedSolidCount: number
  canonicalOrientation: 'source'
  assemblyKind: 'body-side-holder-snap' | 'fused-directional'
  intrinsicFeatures: readonly string[]
  optionalFeatures: readonly ['fourCornerLocatingHoles', 'centerRemoverHole']
  sideHolderLayerMinZ: number
  snapLayerMinZ: number
  locatingHoleRadius: number
  centerPassageRadius: number
  locatingHoleCenter: number
  locatingHoleSlotHalfWidth: number
  locatingHoleSlotInnerHalfSpan: number
  locatingHoleSlotStepZ: number
  centerRemoverLowerHalfWidth: number
  centerRemoverUpperHalfWidth: number
  centerRemoverHalfDepth: number
  centerRemoverStepZ: number
  magnetHoleOpeningWidth: number
  magnetHoleConnectorReachByDirection: Readonly<
    Record<OpenGridSnapMagnetConnectorDirection, number>
  >
}

const standardAssetUrls = {
  Full: new URL(
    './assets/opengrid-bare-standard-full-snap.step',
    import.meta.url,
  ),
  Lite: new URL(
    './assets/opengrid-bare-standard-lite-snap.step',
    import.meta.url,
  ),
} satisfies Record<OpenGridSnapVariant, URL>

const directionalAssetUrls = {
  Full: new URL(
    './assets/opengrid-bare-directional-full-snap.step',
    import.meta.url,
  ),
  Lite: new URL(
    './assets/opengrid-bare-directional-lite-snap.step',
    import.meta.url,
  ),
} satisfies Record<OpenGridSnapVariant, URL>

function standardBounds(variant: OpenGridSnapVariant): ModelBounds {
  return {
    min: [-12.8, -12.8, 0],
    max: [12.8, 12.8, variant === 'Full' ? 6.8 : 3.4],
  }
}

function directionalBounds(variant: OpenGridSnapVariant): ModelBounds {
  return {
    min: [-12.801, -12.801, -0.001],
    max: [12.801, 13.201, variant === 'Full' ? 6.801 : 3.401],
  }
}

function makeDefinition(
  profile: OpenGridSnapProfile,
  variant: OpenGridSnapVariant,
): OpenGridSnapProfileDefinition {
  const isStandard = profile === 'Standard'
  const standardConnectorReach = 11.7
  const negativeYConnectorReach = isStandard ? standardConnectorReach : 10.9
  const centerRemoverStepZ = variant === 'Full' ? 4.8 : 1.9
  let assetUrl: URL
  let expectedBounds: ModelBounds
  if (isStandard) {
    assetUrl = standardAssetUrls[variant]
    expectedBounds = standardBounds(variant)
  } else {
    assetUrl = directionalAssetUrls[variant]
    expectedBounds = directionalBounds(variant)
  }

  const locatingHoleCenter = 7

  let expectedSolidCount = 1
  let assemblyKind: OpenGridSnapProfileDefinition['assemblyKind'] =
    'fused-directional'
  let sideHolderLayerMinZ = 0.2
  let snapLayerMinZ = 1.9
  if (isStandard) {
    expectedSolidCount = 9
    assemblyKind = 'body-side-holder-snap'
  }
  if (variant === 'Full') {
    sideHolderLayerMinZ = 3.4
    snapLayerMinZ = 5.3
  }

  let intrinsicFeatures: string[]
  if (isStandard) {
    intrinsicFeatures = ['solid-body-fixed-curves', 'assembly-locking-details']
  } else {
    intrinsicFeatures = [
      'directional-asymmetric-envelope',
      'fused-source-surface-details',
    ]
  }

  return {
    profile,
    variant,
    assetUrl,
    expectedBounds,
    expectedSolidCount,
    canonicalOrientation: 'source',
    assemblyKind,
    intrinsicFeatures,
    optionalFeatures: ['fourCornerLocatingHoles', 'centerRemoverHole'],
    sideHolderLayerMinZ,
    snapLayerMinZ,
    locatingHoleRadius:
      OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.nominalDiameter / 2,
    // Press-fit experiment: the Ø4.9 center remover passage engages the
    // nominal Ø5 positioning pillar with 0.1 mm diametral interference.
    centerPassageRadius: 2.45,
    locatingHoleCenter,
    locatingHoleSlotHalfWidth: 1.5,
    locatingHoleSlotInnerHalfSpan: 5,
    locatingHoleSlotStepZ: centerRemoverStepZ,
    centerRemoverLowerHalfWidth: 4,
    centerRemoverUpperHalfWidth: 2,
    centerRemoverHalfDepth: 4,
    centerRemoverStepZ,
    magnetHoleOpeningWidth: OPENGRID_SNAP_CONFIGURATION.magnetHole.openingWidth,
    // The Standard side gaps run from approximately 11.1 mm to 11.7 mm.
    // Directional's negative-Y side has its corresponding gap at 10.8–10.9
    // mm, so each radial opening stops at its own gap's outer edge instead of
    // cutting through the surrounding outer frame.
    magnetHoleConnectorReachByDirection: {
      positiveX: standardConnectorReach,
      negativeX: standardConnectorReach,
      positiveY: standardConnectorReach,
      negativeY: negativeYConnectorReach,
    },
  }
}

export const OPENGRID_SNAP_PROFILE_DEFINITIONS: Readonly<
  Record<
    OpenGridSnapProfile,
    Record<OpenGridSnapVariant, OpenGridSnapProfileDefinition>
  >
> = {
  Standard: {
    Full: makeDefinition('Standard', 'Full'),
    Lite: makeDefinition('Standard', 'Lite'),
  },
  Directional: {
    Full: makeDefinition('Directional', 'Full'),
    Lite: makeDefinition('Directional', 'Lite'),
  },
}

export function openGridSnapProfileFor(
  profile: OpenGridSnapProfile,
  variant: OpenGridSnapVariant,
): OpenGridSnapProfileDefinition {
  return OPENGRID_SNAP_PROFILE_DEFINITIONS[profile][variant]
}

export function openGridSnapLocatingHoleCentersFor(
  definition: OpenGridSnapProfileDefinition,
): Array<[number, number]> {
  const distance = definition.locatingHoleCenter
  return [
    [-distance, -distance],
    [-distance, distance],
    [distance, -distance],
    [distance, distance],
  ]
}
