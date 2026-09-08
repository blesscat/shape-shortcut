import { makeBox, type Shape3D } from 'replicad'
import type { BooleanOperationReporter } from '../../boolean-progress'
import { bottomGridSeamApexTopZ } from './geometry'
import {
  externalOpenGridStackableBoxHeightFor,
  nominalOpenGridStackableBoxFootprintFor,
  openGridStackableBoxUpperInnerRimZFor,
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'

export type Bounds = [[number, number, number], [number, number, number]]

export type OpenGridStackableBoxBuildContext = {
  detachableCornerSeatReference?: Shape3D
  detachableCornerSeatHolderReference?: Shape3D
  isGenerationCurrent?: () => boolean
  booleanOperations?: BooleanOperationReporter
}

export function deleteShape(
  shape: { delete?: () => void } | null | undefined,
): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the original geometry error.
  }
}

export function assertGenerationCurrent(
  context: OpenGridStackableBoxBuildContext,
): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

export function closeEnough(
  first: number,
  second: number,
  tolerance = 0.02,
): boolean {
  return Math.abs(first - second) <= tolerance
}

export function readBounds(shape: Shape3D): Bounds {
  const boundingBox = shape.boundingBox
  try {
    return boundingBox.bounds as Bounds
  } finally {
    boundingBox.delete()
  }
}

/**
 * Quality-inspection z windows never leave these two bands: every bottom
 * probe (floor, seams, sockets, corner seats) stays below the lower frame and
 * every top probe (rail bearing bands) stays inside the rail band. Building
 * both sub-shapes once lets each measurement run a boolean against a small
 * region instead of the full honeycomb candidate, which keeps the inspection
 * inside the geometry engine's fixed memory ceiling.
 */
const BOTTOM_REGION_MARGIN = 1
const TOP_REGION_MARGIN = 1
const LOWEST_TOP_PROBE_CLEARANCE = 0.55
const REGION_PROBE_MARGIN = 0.5

export type OpenGridStackableBoxQualityRegionZBounds = {
  bottomMinZ: number
  bottomMaxZ: number
  topMinZ: number
  topMaxZ: number
}

export function openGridStackableBoxQualityRegionZBounds(
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxQualityRegionZBounds {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const externalHeight = externalOpenGridStackableBoxHeightFor(parameters)
  const upperInnerRimZ = openGridStackableBoxUpperInnerRimZFor(parameters)
  const lowestTopProbeZ =
    upperInnerRimZ +
    configuration.topRailHeight -
    configuration.topRailOuterChamfer -
    LOWEST_TOP_PROBE_CLEARANCE
  // Every bottom probe must fit inside the bottom region: seam reliefs end
  // at the seam apex, the shell-thickness side-wall band ends slightly above
  // the bottom assembly, the detachable-seat reference is its total height,
  // and the flanged socket-insert probe tops out at floor + flange.
  const bottomMaxZ =
    Math.max(
      bottomGridSeamApexTopZ(),
      configuration.bottomAssemblyHeight + 0.1,
      OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.male.totalHeight,
    ) + REGION_PROBE_MARGIN
  return {
    bottomMinZ: -BOTTOM_REGION_MARGIN,
    bottomMaxZ,
    topMinZ: lowestTopProbeZ - REGION_PROBE_MARGIN,
    topMaxZ: externalHeight + TOP_REGION_MARGIN,
  }
}

const CHIP_PAD = 0.5

/**
 * A boolean against any shape with thousands of lattice faces allocates
 * engine memory proportional to that shape, and the wasm32 heap never gives
 * memory back. The inspection therefore runs in two levels: two full-candidate
 * cuts split off the bottom and top measurement bands once, and each group of
 * probes then cuts a small local chip out of its band (cached per zone) so
 * every individual probe boolean only touches a handful of faces.
 */
export type OpenGridStackableBoxQualityRegions = {
  bottom: Shape3D
  top: Shape3D
  bottomZone: (bounds: Bounds) => Shape3D
  dispose: () => void
}

export function createOpenGridStackableBoxQualityRegions(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxQualityRegions {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const { bottomMinZ, bottomMaxZ, topMinZ, topMaxZ } =
    openGridStackableBoxQualityRegionZBounds(parameters)
  const top: Shape3D = cutRegion(shape, [
    [
      -width / 2 - BOTTOM_REGION_MARGIN,
      -depth / 2 - BOTTOM_REGION_MARGIN,
      topMinZ,
    ],
    [
      width / 2 + BOTTOM_REGION_MARGIN,
      depth / 2 + BOTTOM_REGION_MARGIN,
      topMaxZ,
    ],
  ])
  const bottom: Shape3D = cutRegion(shape, [
    [
      -width / 2 - BOTTOM_REGION_MARGIN,
      -depth / 2 - BOTTOM_REGION_MARGIN,
      bottomMinZ,
    ],
    [
      width / 2 + BOTTOM_REGION_MARGIN,
      depth / 2 + BOTTOM_REGION_MARGIN,
      bottomMaxZ,
    ],
  ])
  const chips = new Map<string, Shape3D>()
  return {
    bottom,
    top,
    bottomZone(bounds: Bounds): Shape3D {
      const key = bounds
        .flat()
        .map((value) => Math.round(value * 32) / 32)
        .join(',')
      const cached = chips.get(key)
      if (cached) return cached
      const chip = cutRegion(bottom, bounds)
      chips.set(key, chip)
      return chip
    },
    dispose(): void {
      for (const chip of chips.values()) deleteShape(chip)
      chips.clear()
      deleteShape(bottom)
      deleteShape(top)
    },
  }
}

function cutRegion(shape: Shape3D, [min, max]: Bounds): Shape3D {
  const probe = makeBox(min, max)
  try {
    return shape.intersect(probe)
  } finally {
    deleteShape(probe)
  }
}
