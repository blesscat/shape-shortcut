import { makeBox, measureVolume, Sketcher, type Shape3D } from 'replicad'
import {
  OPENGRID_LABEL_LEDGE,
  type OpenGridLabelLedgeLayout,
} from '../../../cad-contract/units/opengrid-label-ledge'

const FUSION_OVERLAP = 0.05
const PROBE_INSET = 0.1
const VOLUME_TOLERANCE = 1e-5

type Point2 = [number, number]

function deleteShape(shape: { delete: () => void } | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Extrusion can consume its sketch; cleanup must preserve the result.
  }
}

function replaceShape(
  shape: Shape3D,
  apply: (current: Shape3D) => Shape3D,
): Shape3D {
  const next = apply(shape)
  if (next !== shape) deleteShape(shape)
  return next
}

function fuseInto(body: Shape3D, part: Shape3D): Shape3D {
  try {
    return replaceShape(body, (current) => current.fuse(part))
  } finally {
    deleteShape(part)
  }
}

/** Extrudes a polygon given as (Y, Z) points along +X starting at `startX`. */
function extrudePolygonAlongX(
  points: readonly Point2[],
  startX: number,
  length: number,
): Shape3D {
  const [first, ...rest] = points
  const sketcher = new Sketcher('YZ', [startX, 0, 0])
  let sketch: ReturnType<Sketcher['close']> | null = null
  try {
    sketcher.movePointerTo(first!)
    for (const point of rest) sketcher.lineTo(point)
    sketch = sketcher.close()
    return sketch.extrude(length, { extrusionDirection: [1, 0, 0] })
  } finally {
    deleteShape(sketch)
    deleteShape(sketcher)
  }
}

/** Moves a slope-frame solid (X, s, n) into the wall frame (X, v, z). */
export function placeOnLedgeSlope(
  shape: Shape3D,
  layout: Pick<OpenGridLabelLedgeLayout, 'wallTopZ'>,
): Shape3D {
  const rotated = replaceShape(shape, (current) =>
    current.rotate(-45, [0, 0, 0], [1, 0, 0]),
  )
  return replaceShape(rotated, (current) =>
    current.translate(0, 0, layout.wallTopZ),
  )
}

function makeWedge(
  layout: OpenGridLabelLedgeLayout,
  floorZ: number | undefined,
): Shape3D {
  const embed = OPENGRID_LABEL_LEDGE.wallEmbed
  const reach = OPENGRID_LABEL_LEDGE.reach
  const points: Point2[] = [
    [-embed, layout.wallTopZ + embed],
    [reach, layout.tipTopZ],
    [reach, layout.tipBottomZ],
  ]
  const clipZ = floorZ === undefined ? undefined : floorZ - FUSION_OVERLAP
  if (clipZ !== undefined && clipZ > layout.wallBottomZ) {
    points.push([clipZ - layout.wallBottomZ, clipZ], [-embed, clipZ])
  } else {
    points.push([-embed, layout.wallBottomZ - embed])
  }
  return extrudePolygonAlongX(
    points,
    -layout.outerHalfWidth,
    2 * layout.outerHalfWidth,
  )
}

function makeRails(layout: OpenGridLabelLedgeLayout): Shape3D {
  const railStart = -FUSION_OVERLAP
  const length = layout.slopeLength - railStart
  let rails: Shape3D | null = null
  for (const direction of [-1, 1]) {
    const outer = direction * layout.outerHalfWidth
    const pieces = [
      {
        edge: direction * layout.pocketHalfWidth,
        normalMin: -FUSION_OVERLAP,
        normalMax: layout.channelDepth,
      },
      {
        edge: direction * layout.lipInnerHalfWidth,
        normalMin: layout.channelDepth - FUSION_OVERLAP,
        normalMax: layout.projection,
      },
    ]
    for (const piece of pieces) {
      const rail = makeBox(
        [Math.min(piece.edge, outer), railStart, piece.normalMin],
        [Math.max(piece.edge, outer), railStart + length, piece.normalMax],
      )
      rails = rails ? fuseInto(rails, rail) : rail
    }
  }
  return rails!
}

function makeBump(layout: OpenGridLabelLedgeLayout, direction: -1 | 1) {
  const centre = direction * layout.bumpCenterOffset
  return extrudePolygonAlongX(
    [
      [layout.catchS, -FUSION_OVERLAP],
      [layout.catchS, layout.bumpHeight],
      [layout.crestEndS, layout.bumpHeight],
      [layout.leadInEndS, 0],
      [layout.leadInEndS, -FUSION_OVERLAP],
    ],
    centre - layout.bumpHalfWidth,
    2 * layout.bumpHalfWidth,
  )
}

function makeNotchCutter(layout: OpenGridLabelLedgeLayout): Shape3D {
  return makeBox(
    [
      -layout.notchHalfWidth,
      layout.notchStartS,
      -OPENGRID_LABEL_LEDGE.notchDepth,
    ],
    [layout.notchHalfWidth, layout.slopeLength + 1, 0.5],
  )
}

/**
 * Builds the label ledge in the wall frame: X along the wall, Y inward from
 * the interior wall face and Z measured from the inner rim datum. `floorZ`
 * (also relative to the datum) merges the wedge into a floor it would reach.
 */
export function buildOpenGridLabelLedge(
  layout: OpenGridLabelLedgeLayout,
  floorZ?: number,
): Shape3D {
  let body = makeWedge(layout, floorZ)
  try {
    const cutter = placeOnLedgeSlope(makeNotchCutter(layout), layout)
    try {
      body = replaceShape(body, (current) => current.cut(cutter))
    } finally {
      deleteShape(cutter)
    }
    let slopeParts = makeRails(layout)
    for (const direction of [-1, 1] as const) {
      slopeParts = fuseInto(slopeParts, makeBump(layout, direction))
    }
    return fuseInto(body, placeOnLedgeSlope(slopeParts, layout))
  } catch (error) {
    deleteShape(body)
    throw error
  }
}

function intersectionVolume(shape: Shape3D, probe: Shape3D): number {
  const intersection = shape.intersect(probe)
  try {
    return Math.abs(measureVolume(intersection))
  } finally {
    intersection.delete()
  }
}

type SlopeProbe = {
  min: [number, number, number]
  max: [number, number, number]
}

/**
 * Inspects a placed ledge. `place` maps a wall-frame probe into the frame of
 * `shape`; omit it when `shape` is the ledge itself.
 */
export function inspectOpenGridLabelLedge(
  shape: Shape3D,
  layout: OpenGridLabelLedgeLayout,
  place: (probe: Shape3D) => Shape3D = (probe) => probe,
): string[] {
  const failures = new Set<string>()
  const probeVolume = (probe: SlopeProbe, mode: 'filled' | 'empty') => {
    const sloped = placeOnLedgeSlope(makeBox(probe.min, probe.max), layout)
    const placed = place(sloped)
    try {
      const volume = measureVolume(placed)
      const overlap = intersectionVolume(shape, placed)
      return mode === 'filled'
        ? Math.abs(overlap - Math.abs(volume)) <= VOLUME_TOLERANCE
        : overlap <= VOLUME_TOLERANCE
    } finally {
      deleteShape(placed)
    }
  }
  const middleS = layout.slopeLength / 2
  for (const direction of [-1, 1]) {
    const sideX =
      direction *
      (layout.pocketHalfWidth +
        (layout.outerHalfWidth - layout.pocketHalfWidth) / 2)
    const lipX =
      direction * ((layout.pocketHalfWidth + layout.lipInnerHalfWidth) / 2)
    const bumpX = direction * layout.bumpCenterOffset
    const railProbes: SlopeProbe[] = [
      {
        min: [sideX - PROBE_INSET, middleS - PROBE_INSET, PROBE_INSET],
        max: [
          sideX + PROBE_INSET,
          middleS + PROBE_INSET,
          layout.channelDepth - PROBE_INSET,
        ],
      },
      {
        min: [
          lipX - PROBE_INSET,
          middleS - PROBE_INSET,
          layout.channelDepth + PROBE_INSET,
        ],
        max: [
          lipX + PROBE_INSET,
          middleS + PROBE_INSET,
          layout.projection - PROBE_INSET,
        ],
      },
    ]
    for (const probe of railProbes) {
      if (!probeVolume(probe, 'filled')) failures.add('label-ledge-material')
    }
    const bump: SlopeProbe = {
      min: [bumpX - PROBE_INSET, layout.catchS + PROBE_INSET, PROBE_INSET],
      max: [
        bumpX + PROBE_INSET,
        layout.crestEndS - PROBE_INSET,
        layout.bumpHeight - PROBE_INSET,
      ],
    }
    if (!probeVolume(bump, 'filled')) failures.add('label-ledge-bump')
  }
  const emptyProbes: SlopeProbe[] = [
    {
      min: [
        -layout.cardWidth / 2 + PROBE_INSET,
        layout.cardTopS,
        layout.cardNormalMin + 0.01,
      ],
      max: [
        layout.cardWidth / 2 - PROBE_INSET,
        layout.cardBottomS,
        layout.cardNormalMax - 0.01,
      ],
    },
    {
      min: [-layout.lipInnerHalfWidth, layout.cardTopS, layout.cardNormalMax],
      max: [
        layout.lipInnerHalfWidth,
        layout.cardBottomS,
        layout.raisedNormalMax - 0.01,
      ],
    },
    {
      min: [-layout.lipInnerHalfWidth, layout.catchS, layout.bumpHeight + 0.01],
      max: [
        layout.lipInnerHalfWidth,
        layout.slopeLength,
        layout.raisedNormalMax,
      ],
    },
  ]
  for (const probe of emptyProbes) {
    if (!probeVolume(probe, 'empty')) failures.add('label-ledge-seat')
  }
  const notch: SlopeProbe = {
    min: [
      -layout.notchHalfWidth + PROBE_INSET,
      layout.notchStartS + PROBE_INSET,
      -OPENGRID_LABEL_LEDGE.notchDepth + PROBE_INSET,
    ],
    max: [layout.notchHalfWidth - PROBE_INSET, layout.slopeLength - 0.3, -0.05],
  }
  if (!probeVolume(notch, 'empty')) failures.add('label-ledge-notch')
  return [...failures]
}
