import type {
  ModelBounds,
  BoxParameters,
  ModularGridBaseParameters,
  HswCellParameters,
  HexagonalColumnParameters,
} from '../../../cad-contract/units'
import { PROTOTYPE_CONFIGURATION } from '../../../cad-contract/units/prototype-configuration'
import {
  hswCellOffsetsForGrid,
  HSW_CELL_CONFIGURATION,
} from '../../../cad-contract/units/hsw-cell'
import { HEXAGONAL_COLUMN_CONFIGURATION } from '../../../cad-contract/units/hexagonal-column'
import {
  boundsForOpenGrid,
  cellCenterForOpenGrid,
  OPENGRID_CONFIGURATION,
  type OpenGridParameters,
} from '../../../cad-contract/units/opengrid'
import {
  boundsForOpenGridSnap,
  type OpenGridSnapParameters,
} from '../../../cad-contract/units/opengrid-snap'
import {
  boundsForOpenGridWallCover,
  OPENGRID_WALL_COVER_CONFIGURATION,
  type OpenGridWallCoverParameters,
} from '../../../cad-contract/units/opengrid-wall-cover'
import {
  boundsForOpenGridSnapRemover,
  type OpenGridSnapRemoverParameters,
} from '../../../cad-contract/units/opengrid-snap-remover'
import {
  boundsForOpenGridLabelCard,
  type OpenGridLabelCardParameters,
} from '../../../cad-contract/units/opengrid-label-card'
import {
  boundsForOpenGridLabelSlotTest,
  type OpenGridLabelSlotTestParameters,
} from '../../../cad-contract/units/opengrid-label-slot-test'
import {
  pillarBodyDiameterForParameters,
  pillarLengthForParameters,
  boundsForPillar,
  type PillarParameters,
} from '../../../cad-contract/units/opengrid-pillar'
import {
  openGridDividerArmStationsFor,
  openGridDividerPlanBoundsFor,
  openGridDividerBaseWidthFor,
  OPENGRID_DIVIDER_CONFIGURATION,
  openGridDividerPegLengthFor,
  type OpenGridDividerParameters,
} from '../../../cad-contract/units/opengrid-divider'
import {
  rectangle,
  ellipse,
  extrude,
  slab,
  transform,
  type PreviewDescription,
  type PreviewSolid,
} from './description'

export function solidBounds(bounds: ModelBounds): PreviewSolid {
  const size = bounds.max.map((v, i) => v - bounds.min[i])
  return slab(
    size[0],
    size[1],
    size[2],
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    bounds.min[2],
  )
}

export function simpleBoxPreview(p: BoxParameters): PreviewDescription {
  return [slab(p.width, p.depth, p.height)]
}

export function modularGridPreview(
  p: ModularGridBaseParameters,
): PreviewDescription {
  const c = PROTOTYPE_CONFIGURATION.modularGridBase
  const pieces: PreviewSolid[] = []
  for (let x = 0; x < p.columns; x++)
    for (let y = 0; y < p.rows; y++) {
      const piece = extrude(
        rectangle(c.cellWidth, c.cellDepth),
        rectangle(c.cutoutWidth, c.cutoutDepth),
        c.height,
      )
      piece.origin = [
        (x - (p.columns - 1) / 2) * c.cellWidth,
        (y - (p.rows - 1) / 2) * c.cellDepth,
        0,
      ]
      pieces.push(piece)
    }
  return pieces
}

export function hswPreview(p: HswCellParameters): PreviewDescription {
  const c = HSW_CELL_CONFIGURATION
  // Pointed X hexagons; the inner opening deliberately omits the mating ledge.
  return hswCellOffsetsForGrid(p).map(([x, y]) => {
    const outer = ellipse(c.outerWidth, c.outerDepth / Math.sin(Math.PI / 3), 6)
    const inner = outer.map(([u, v]) => [u * 0.8, v * 0.8] as [number, number])
    const piece = extrude(outer, inner, c.outerHeight)
    piece.origin = [x, y, 0]
    return piece
  })
}

export function hexagonalPreview(
  p: HexagonalColumnParameters,
): PreviewDescription {
  const c = HEXAGONAL_COLUMN_CONFIGURATION
  const outline = ellipse(
    c.crossSectionExtentX / Math.cos(Math.PI / 6),
    c.crossSectionExtentY,
    6,
  ).map(
    ([x, y]) =>
      [
        x * Math.cos(Math.PI / 6) - y * Math.sin(Math.PI / 6),
        x * Math.sin(Math.PI / 6) + y * Math.cos(Math.PI / 6),
      ] as [number, number],
  )
  // Normalize the six-sided profile to the contract envelope.
  const spanX = Math.max(...outline.map((p) => p[0])) * 2
  const spanY = Math.max(...outline.map((p) => p[1])) * 2
  const profile = outline.map(
    ([x, y]) =>
      [
        (x * c.crossSectionExtentX) / spanX,
        (y * c.crossSectionExtentY) / spanY,
      ] as [number, number],
  )
  return Array.from({ length: p.count }, (_, i) => {
    const offset = (i - (p.count - 1) / 2) * (c.crossSectionExtentY + p.gap)
    const solid = extrude(profile, null, p.height)
    if (p.orientation === 'lying')
      return transform(solid, ([x, y, z]) => [
        z - p.height / 2,
        y + offset,
        -x + c.crossSectionExtentX / 2,
      ])
    solid.origin = [0, offset, 0]
    return solid
  })
}

export function boardPreview(p: OpenGridParameters): PreviewDescription {
  const b = boundsForOpenGrid(p)
  const pitch = OPENGRID_CONFIGURATION.gridPitch
  const pieces: PreviewSolid[] = []
  // Partition the physical envelope around full-cell openings. Edge strips also
  // carry half cells and target-size extensions without an expensive boolean.
  const centers = Array.from({ length: p.rows }, (_, y) =>
    Array.from({ length: p.columns }, (_, x) => cellCenterForOpenGrid(p, y, x)),
  ).flat()
  const xs = [...new Set(centers.map((c) => c[0]))].sort((a, b) => a - b)
  const ys = [...new Set(centers.map((c) => c[1]))].sort((a, b) => a - b)
  for (let i = 0; i < xs.length; i++)
    for (let j = 0; j < ys.length; j++) {
      const x = xs[i],
        y = ys[j]
      const left = i === 0 ? b.min[0] : x - pitch / 2
      const right = i === xs.length - 1 ? b.max[0] : x + pitch / 2
      const bottom = j === 0 ? b.min[1] : y - pitch / 2
      const top = j === ys.length - 1 ? b.max[1] : y + pitch / 2
      const opening = Math.min(
        pitch * 0.6,
        2 * Math.min(x - left, right - x, y - bottom, top - y) - 1,
      )
      const outline: [number, number][] = [
        [left, bottom],
        [right, bottom],
        [right, top],
        [left, top],
      ]
      let hole: [number, number][] | null = null
      if (opening > 0)
        hole = rectangle(opening, opening).map(([u, v]) => [u + x, v + y])
      pieces.push(extrude(outline, hole, b.max[2]))
    }
  return pieces
}

export function snapPreview(p: OpenGridSnapParameters): PreviewDescription {
  const b = boundsForOpenGridSnap(p)
  const w = b.max[0] - b.min[0],
    d = b.max[1] - b.min[1]
  const centerY = (b.min[1] + b.max[1]) / 2
  const z = b.max[2] - b.min[2]
  // Two stepped plates preserve the snap's low-profile cap and stem.
  return [
    slab(w, d, z * 0.35, 0, centerY, b.min[2]),
    slab(w * 0.8, d * 0.8, z * 0.65, 0, centerY, b.min[2] + z * 0.35),
  ]
}

export function wallCoverPreview(
  p: OpenGridWallCoverParameters,
): PreviewDescription {
  const b = boundsForOpenGridWallCover(p)
  const c = OPENGRID_WALL_COVER_CONFIGURATION
  return Array.from(p.text).map((_, i) =>
    slab(
      c.coverWidth,
      b.max[1] - b.min[1],
      b.max[2] - b.min[2],
      b.min[0] + c.coverWidth / 2 + i * (c.coverWidth + c.coverGap),
      0,
      b.min[2],
    ),
  )
}

export function removerPreview(
  p: OpenGridSnapRemoverParameters,
): PreviewDescription {
  const b = boundsForOpenGridSnapRemover(p)
  const height = b.max[2] - b.min[2]
  // Fixed STEP asset: T handle, projecting shaft and small tip, in asset frame.
  return [
    slab(10, b.max[1] - b.min[1], height, b.max[0] - 5, 0, b.min[2]),
    slab(
      b.max[0] - b.min[0] - 10,
      9,
      height * 0.8,
      (b.min[0] + b.max[0] - 10) / 2,
      0,
      b.min[2] * 0.8,
    ),
  ]
}

export function labelCardPreview(
  p: OpenGridLabelCardParameters,
): PreviewDescription {
  return [solidBounds(boundsForOpenGridLabelCard(p))]
}

export function labelSlotPreview(
  p: OpenGridLabelSlotTestParameters,
): PreviewDescription {
  const b = boundsForOpenGridLabelSlotTest(p)
  const width = b.max[0] - b.min[0],
    height = b.max[2]
  const depth = b.max[1] - b.min[1]
  return [
    slab(width, 1, height, 0, b.max[1] - 0.5),
    slab(width, depth, 1, 0, (b.min[1] + b.max[1]) / 2),
    slab(1, depth, height, b.min[0] + 0.5, (b.min[1] + b.max[1]) / 2),
    slab(1, depth, height, b.max[0] - 0.5, (b.min[1] + b.max[1]) / 2),
  ]
}

export function pillarPreview(p: PillarParameters): PreviewDescription {
  const diameter = pillarBodyDiameterForParameters(p),
    length = pillarLengthForParameters(p)
  const pieces = [extrude(ellipse(diameter, diameter), null, length)]
  if (p.mode === 'detachable-corner-seat') {
    const b = boundsForPillar(p)
    pieces.push(
      slab(
        b.max[0] - b.min[0],
        diameter * 0.4,
        Math.min(2, length),
        0,
        0,
        length - Math.min(2, length),
      ),
    )
  }
  return pieces
}

export function dividerPreview(
  p: OpenGridDividerParameters,
): PreviewDescription {
  const width = openGridDividerBaseWidthFor(p)
  const pieces: PreviewSolid[] = []
  const x = openGridDividerArmStationsFor(p, 'x'),
    y = openGridDividerArmStationsFor(p, 'y')
  const baseHeight = Math.min(
    OPENGRID_DIVIDER_CONFIGURATION.bottomSupportHeight,
    p.height / 2,
  )
  if (p.left || p.right) {
    pieces.push(slab(x.end - x.start, width, baseHeight, (x.start + x.end) / 2))
    pieces.push(
      slab(
        x.end - x.start,
        p.wallThickness,
        p.height - baseHeight,
        (x.start + x.end) / 2,
        0,
        baseHeight,
      ),
    )
  }
  if (p.up || p.down) {
    pieces.push(
      slab(width, y.end - y.start, baseHeight, 0, (y.start + y.end) / 2),
    )
    pieces.push(
      slab(
        p.wallThickness,
        y.end - y.start,
        p.height - baseHeight,
        0,
        (y.start + y.end) / 2,
        baseHeight,
      ),
    )
  }
  if (!pieces.length) pieces.push(slab(width, width, p.height))
  // Major locating foot, without precision peg mating detail.
  pieces.push(
    extrude(
      ellipse(width, width),
      null,
      openGridDividerPegLengthFor(p),
      -openGridDividerPegLengthFor(p),
    ),
  )
  const plan = openGridDividerPlanBoundsFor(p)
  const centerX = (plan.minX + plan.maxX) / 2
  const centerY = (plan.minY + plan.maxY) / 2
  return pieces.map((solid) =>
    transform(solid, ([x, y, z]) => [x - centerX, y - centerY, z]),
  )
}
