import { makeBox, measureVolume, type Shape3D } from 'replicad'
import {
  nominalOpenGridStackableBoxBottomGridAxisPositionsFor,
  nominalOpenGridStackableBoxFootprintFor,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'
import type { OpenGridStackableBoxBottomGridSeam } from './geometry'
import { closeEnough, deleteShape, readBounds } from './shared'

function makeBottomGridSeamBandProbe(
  seam: OpenGridStackableBoxBottomGridSeam,
  parameters: OpenGridStackableBoxParameters,
  zMin: number,
  zMax: number,
  halfWidth: number,
  offset = 0,
): Shape3D {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const crossHalfExtent = seam.axis === 'x' ? depth / 2 : width / 2
  const segmentHalfLength = Math.min(8, crossHalfExtent / 2)

  if (seam.axis === 'x') {
    return makeBox(
      [seam.position + offset - halfWidth, -segmentHalfLength, zMin],
      [seam.position + offset + halfWidth, segmentHalfLength, zMax],
    )
  }

  return makeBox(
    [-segmentHalfLength, seam.position + offset - halfWidth, zMin],
    [segmentHalfLength, seam.position + offset + halfWidth, zMax],
  )
}

export function measureBottomGridSeamBand(
  shape: Shape3D,
  seam: OpenGridStackableBoxBottomGridSeam,
  parameters: OpenGridStackableBoxParameters,
  zMin: number,
  zMax: number,
  halfWidth: number,
  offset = 0,
  target: Shape3D = shape,
): number {
  const probe = makeBottomGridSeamBandProbe(
    seam,
    parameters,
    zMin,
    zMax,
    halfWidth,
    offset,
  )
  let intersection: Shape3D | null = null
  try {
    intersection = target.intersect(probe)
    return measureVolume(intersection)
  } finally {
    if (intersection && intersection !== target) deleteShape(intersection)
    deleteShape(probe)
  }
}

export function measureBottomGridSeamSupportThickness(
  shape: Shape3D,
  seam: OpenGridStackableBoxBottomGridSeam,
  parameters: OpenGridStackableBoxParameters,
  target: Shape3D = shape,
): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const probe = makeBottomGridSeamBandProbe(
    seam,
    parameters,
    configuration.bottomFootChamferHeight - 0.03,
    configuration.bottomAssemblyHeight + 0.03,
    0.01,
    configuration.bottomGridSeamSupportOpeningWidth / 2 + 0.25,
  )
  let intersection: Shape3D | null = null
  try {
    intersection = target.intersect(probe)
    if (measureVolume(intersection) <= 0.001) return 0
    const [min, max] = readBounds(intersection)
    return max[2] - min[2]
  } finally {
    if (intersection && intersection !== target) deleteShape(intersection)
    deleteShape(probe)
  }
}

export function assertBottomGridSpacing(
  parameters: OpenGridStackableBoxParameters,
): void {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  for (const axis of [parameters.x, parameters.y]) {
    const positions =
      nominalOpenGridStackableBoxBottomGridAxisPositionsFor(axis)
    for (let index = 1; index < positions.length; index += 1) {
      const previous = positions[index - 1]
      const current = positions[index]
      if (
        previous === undefined ||
        current === undefined ||
        !closeEnough(current - previous, configuration.bottomHoleGridPitch)
      ) {
        throw new Error('OPENGRID_STACKABLE_BOX_BOTTOM_GRID_SPACING_INVALID')
      }
    }
  }
}
