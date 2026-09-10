import {
  openGridStackableBoxBottomDatumZFor,
  openGridStackableBoxUpperInnerRimZFor,
  nominalOpenGridStackableBoxFootprintFor,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  openGridStackableBoxSocketCentersFor,
  OPENGRID_HONEYCOMB_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'
import {
  edgeBandExpectedVolumes,
  edgeBandVolumes,
  volumeInBox,
} from './quality-metrics'
import { countOrdinaryBottomHoleFaces } from './quality-holes'
import { readBounds } from './shared'
import { openGridStackableBoxBottomHoneycombCellCountFor } from '../../lattice/opengrid-honeycomb'
import type { Shape3D } from 'replicad'

export type OpenGridStackableBoxBottomStructureQualityReport = {
  bottomMode: 'stacking' | 'thin-shell' | 'none'
  floorProbeVolume: number
  floorProbeThickness: number
  floorProbeCoveredByPad: boolean
  padProbeVolumes: number[]
  sideWallProbeThicknesses: number[]
  ordinaryBottomHoleCount: number
  expectedOrdinaryBottomHoleCount: number
  measuredExternalHeight: number
}

function openBottomCornerPadProbeRadiusFor(
  width: number,
  depth: number,
): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  return Math.min(
    configuration.openBottomCornerPadRadius,
    (width - 2 * configuration.wallThickness) / 2,
    (depth - 2 * configuration.wallThickness) / 2,
  )
}

function interiorFloorProbeCenterFor(
  width: number,
  depth: number,
  halfExtent: number,
  parameters: OpenGridStackableBoxParameters,
  hasFloorHoneycomb: boolean,
): { center: [number, number]; coveredByPad: boolean } {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const holes = [
    ...openGridStackableBoxSocketCentersFor(parameters),
    ...openGridStackableBoxOrdinaryBottomHoleCentersFor(parameters),
  ]
  const holeRadius =
    configuration.baseHoleTopOpeningDiameter / 2
  const xLimit = width / 2 - configuration.wallThickness - halfExtent
  const yLimit = depth / 2 - configuration.wallThickness - halfExtent
  const padHalf =
    parameters.bottomMode === 'none'
      ? openBottomCornerPadProbeRadiusFor(width, depth)
      : 0
  const isSafeCandidate = ([x, y]: [number, number]): boolean => {
    if (Math.abs(x) > xLimit || Math.abs(y) > yLimit) return false
    if (
      !holes.every(
        ([holeX, holeY]) =>
          Math.hypot(x - holeX, y - holeY) > holeRadius + halfExtent + 0.1,
      )
    ) {
      return false
    }
    return holes.every(
      ([holeX, holeY]) =>
        Math.abs(x - holeX) > padHalf + halfExtent ||
        Math.abs(y - holeY) > padHalf + halfExtent,
    )
  }

  const frameCandidates: Array<[number, number]> = []
  if (hasFloorHoneycomb) {
    const frameInset =
      OPENGRID_HONEYCOMB_CONFIGURATION.bottomFrame - halfExtent - 0.2
    const leftX = -width / 2 + frameInset
    const rightX = width / 2 - frameInset
    const frontY = -depth / 2 + frameInset
    const rearY = depth / 2 - frameInset
    const fractions = [0, -0.25, 0.25, -0.4, 0.4]
    for (const fraction of fractions) {
      frameCandidates.push(
        [leftX, depth * fraction],
        [rightX, depth * fraction],
        [width * fraction, frontY],
        [width * fraction, rearY],
      )
    }
    const frameCandidate = frameCandidates.find(isSafeCandidate)
    if (frameCandidate) return { center: frameCandidate, coveredByPad: false }
  }

  const candidates: Array<[number, number]> = [
    [0, 0],
    [-width / 4, 0],
    [width / 4, 0],
    [0, -depth / 4],
    [0, depth / 4],
    [-width / 4, -depth / 4],
    [width / 4, -depth / 4],
    [-width / 4, depth / 4],
    [width / 4, depth / 4],
  ]
  const candidate = candidates.find(isSafeCandidate)
  if (!candidate) return { center: [0, 0], coveredByPad: padHalf > 0 }
  return { center: candidate, coveredByPad: false }
}

function thicknessesFromVolumes(
  volumes: number[],
  expectedVolumes: number[],
  nominalThickness: number,
): number[] {
  return volumes.map((volume, index) => {
    const expected = expectedVolumes[index] ?? 0
    if (expected <= 0) return 0
    return (volume / expected) * nominalThickness
  })
}

export function inspectOpenGridStackableBoxBottomStructure(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxBottomStructureQualityReport {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const bottomDatumZ = openGridStackableBoxBottomDatumZFor(parameters)
  const isOpenBottom = parameters.bottomMode === 'none'
  const hasFloorHoneycomb =
    !isOpenBottom &&
    parameters.honeycombMode &&
    openGridStackableBoxBottomHoneycombCellCountFor(parameters) > 0
  const halfExtent = hasFloorHoneycomb
    ? Math.min(0.2, width / 8, depth / 8)
    : Math.min(1, width / 8, depth / 8)
  const { center, coveredByPad } = interiorFloorProbeCenterFor(
    width,
    depth,
    halfExtent,
    parameters,
    hasFloorHoneycomb,
  )
  const [centerX, centerY] = center
  const floorProbeVolume = volumeInBox(
    shape,
    [centerX - halfExtent, centerY - halfExtent, -0.01],
    [centerX + halfExtent, centerY + halfExtent, bottomDatumZ + 0.01],
  )
  const floorProbeArea = (2 * halfExtent) ** 2

  const padProbeVolumes = isOpenBottom
    ? openGridStackableBoxSocketCentersFor(parameters).map(([x, y]) => {
        const padHalf = openBottomCornerPadProbeRadiusFor(width, depth)
        const inset = Math.min(1.5, Math.max(0.5, padHalf / 4))
        const probeMin = -Math.min(padHalf - inset, padHalf / 2)
        return volumeInBox(
          shape,
          [x + probeMin, y + probeMin, -0.01],
          [
            x + probeMin + Math.min(1, padHalf / 2),
            y + probeMin + Math.min(1, padHalf / 2),
            bottomDatumZ + 0.01,
          ],
        )
      })
    : []

  const sideWallProbeBottom = bottomDatumZ + 0.2
  const sideWallProbeTop = Math.min(
    openGridStackableBoxUpperInnerRimZFor(parameters) - 0.2,
    sideWallProbeBottom + 1,
  )
  const sideWallProbeVolumes = edgeBandVolumes(
    shape,
    width,
    depth,
    configuration.wallThickness + 0.05,
    0.05,
    sideWallProbeBottom,
    sideWallProbeTop,
  )
  const sideWallProbeExpectedVolumes = edgeBandExpectedVolumes(
    width,
    depth,
    configuration.wallThickness + 0.05,
    0.05,
    sideWallProbeBottom,
    sideWallProbeTop,
  )
  const ordinaryCenters =
    openGridStackableBoxOrdinaryBottomHoleCentersFor(parameters)

  return {
    bottomMode: parameters.bottomMode,
    floorProbeVolume,
    floorProbeThickness: floorProbeVolume / floorProbeArea,
    floorProbeCoveredByPad: coveredByPad,
    padProbeVolumes,
    sideWallProbeThicknesses: thicknessesFromVolumes(
      sideWallProbeVolumes,
      sideWallProbeExpectedVolumes,
      configuration.wallThickness,
    ),
    ordinaryBottomHoleCount: countOrdinaryBottomHoleFaces(
      shape,
      ordinaryCenters,
      parameters,
    ),
    expectedOrdinaryBottomHoleCount: ordinaryCenters.length,
    measuredExternalHeight: readBounds(shape)[1][2],
  }
}
