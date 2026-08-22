/**
 * Official OpenGrid profile boundary.
 *
 * Source: AndyLevesque/QuackWorks/openGrid/openGrid.scad
 * Commit: 61231295ea08c302eff32051769113c48cbda255
 * URL: https://github.com/AndyLevesque/QuackWorks/blob/61231295ea08c302eff32051769113c48cbda255/openGrid/openGrid.scad
 * The source header credits DavidD's design and BlackjackDuck's OpenSCAD;
 * source code is CC-BY-NC-SA and derived/generated parts are CC-BY.
 */
export {
  OPENGRID_CONFIGURATION,
  OPENGRID_CONNECTOR_SIDES,
  boundsForOpenGrid,
  cellCenterForOpenGrid,
  openGridBoardConfiguration,
  openGridNominalBoardConfiguration,
  openGridConnectorLocationsFor,
  openGridScrewCentersFor,
  openGridScrewLatticeDimensions,
  openGridScrewPositionsFor,
  screwCenterForOpenGrid,
} from '../../../cad-contract/units'
export type {
  OpenGridBoardConfiguration,
  OpenGridChamferMode,
  OpenGridConnectorLocation,
  OpenGridConnectorSide,
  OpenGridDirection3D,
  OpenGridParameters,
  OpenGridPoint2D,
  OpenGridScrewPosition,
} from '../../../cad-contract/units'

import {
  OPENGRID_CONFIGURATION,
  isOpenGridLayeredVariant,
  type OpenGridParameters,
  type OpenGridVariant,
} from '../../../cad-contract/units'

export type OpenGridProfilePoint = [number, number]

export type OpenGridProfileConstants = {
  insideExtrusion: number
  middleDistance: number
  cornerChamfer: number
  cornerOffset: number
  cornerWidth: number
}

export function openGridProfileConstants(
  tileSize = OPENGRID_CONFIGURATION.gridPitch,
  tileThickness = OPENGRID_CONFIGURATION.variants.Full.thickness,
): OpenGridProfileConstants {
  const insideExtrusion =
    (tileSize - OPENGRID_CONFIGURATION.tileInnerSize) / 2 -
    OPENGRID_CONFIGURATION.outsideExtrusion
  const middleDistance =
    tileThickness - 2 * OPENGRID_CONFIGURATION.topCaptureInitialInset
  const cornerChamfer =
    OPENGRID_CONFIGURATION.topCaptureInitialInset -
    OPENGRID_CONFIGURATION.insideGridMiddleChamfer
  const calculatedCornerChamfer = Math.sqrt(
    OPENGRID_CONFIGURATION.intersectionDistance ** 2 / 2,
  )
  const cornerOffset =
    calculatedCornerChamfer + OPENGRID_CONFIGURATION.cornerSquareThickness
  const cornerWidth =
    Math.sqrt(OPENGRID_CONFIGURATION.cornerSquareThickness ** 2 * 2) +
    OPENGRID_CONFIGURATION.intersectionDistance

  return {
    insideExtrusion,
    middleDistance,
    cornerChamfer,
    cornerOffset,
    cornerWidth,
  }
}

export function openGridTileProfile(
  variant: OpenGridVariant,
  tileThickness: number,
): OpenGridProfilePoint[] {
  const constants = openGridProfileConstants(
    OPENGRID_CONFIGURATION.gridPitch,
    tileThickness,
  )
  const outsideExtrusion = OPENGRID_CONFIGURATION.outsideExtrusion
  const topChamfer = OPENGRID_CONFIGURATION.insideGridTopChamfer
  const middleChamfer = OPENGRID_CONFIGURATION.insideGridMiddleChamfer
  const topInset = OPENGRID_CONFIGURATION.topCaptureInitialInset
  const insideExtrusion = constants.insideExtrusion

  if (variant === 'Heavy' || variant === 'Hybrid') {
    return [
      [0, 0],
      [outsideExtrusion, 0],
      [outsideExtrusion, tileThickness - topInset],
      [
        outsideExtrusion + insideExtrusion,
        tileThickness - topInset + middleChamfer,
      ],
      [outsideExtrusion + insideExtrusion, tileThickness - topChamfer],
      [outsideExtrusion + insideExtrusion - topChamfer, tileThickness],
      [0, tileThickness],
    ]
  }

  return [
    [0, 0],
    [outsideExtrusion + insideExtrusion - topChamfer, 0],
    [outsideExtrusion + insideExtrusion, topChamfer],
    [outsideExtrusion + insideExtrusion, topInset - middleChamfer],
    [outsideExtrusion, topInset],
    [outsideExtrusion, tileThickness - topInset],
    [
      outsideExtrusion + insideExtrusion,
      tileThickness - topInset + middleChamfer,
    ],
    [outsideExtrusion + insideExtrusion, tileThickness - topChamfer],
    [outsideExtrusion + insideExtrusion - topChamfer, tileThickness],
    [0, tileThickness],
  ]
}

export function openGridLiteTileProfile(): OpenGridProfilePoint[] {
  const fullThickness = OPENGRID_CONFIGURATION.variants.Full.thickness
  const liteThickness = OPENGRID_CONFIGURATION.variants.Lite.thickness
  const lowerCut = fullThickness - liteThickness
  const source = openGridTileProfile('Full', fullThickness)
  return clipProfileFromBottom(source, lowerCut)
}

function clipProfileFromBottom(
  source: OpenGridProfilePoint[],
  lowerCut: number,
): OpenGridProfilePoint[] {
  const clipped: OpenGridProfilePoint[] = []

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index]
    const next = source[(index + 1) % source.length]
    if (!current || !next) continue
    const currentInside = current[1] >= lowerCut
    const nextInside = next[1] >= lowerCut

    if (currentInside) clipped.push([current[0], current[1] - lowerCut])
    if (currentInside !== nextInside) {
      const ratio = (lowerCut - current[1]) / (next[1] - current[1])
      const x = current[0] + (next[0] - current[0]) * ratio
      clipped.push([x, 0])
    }
  }

  return clipped
}

export function openGridCornerProfile(
  tileThickness: number,
): OpenGridProfilePoint[] {
  const { cornerOffset, cornerChamfer } = openGridProfileConstants(
    OPENGRID_CONFIGURATION.gridPitch,
    tileThickness,
  )
  return [
    [0, 0],
    [cornerOffset - cornerChamfer, 0],
    [cornerOffset, cornerChamfer],
    [cornerOffset, tileThickness - cornerChamfer],
    [cornerOffset - cornerChamfer, tileThickness],
    [0, tileThickness],
  ]
}

export function openGridLiteCornerProfile(): OpenGridProfilePoint[] {
  const fullThickness = OPENGRID_CONFIGURATION.variants.Full.thickness
  return clipProfileFromBottom(
    openGridCornerProfile(fullThickness),
    fullThickness - OPENGRID_CONFIGURATION.variants.Lite.thickness,
  )
}

export function openGridSurfaceThickness(variant: OpenGridVariant): number {
  return isOpenGridLayeredVariant(variant)
    ? OPENGRID_CONFIGURATION.variants.Full.thickness
    : OPENGRID_CONFIGURATION.variants[variant].thickness
}

export function openGridParametersForSurface(
  parameters: OpenGridParameters,
): OpenGridParameters {
  if (!isOpenGridLayeredVariant(parameters.variant)) return parameters
  return {
    ...parameters,
    variant: 'Heavy',
  }
}
