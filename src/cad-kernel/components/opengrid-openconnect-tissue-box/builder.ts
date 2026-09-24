import {
  getOC,
  makeBox,
  makeCompound,
  Sketcher,
  sketchRectangle,
  sketchRoundedRectangle,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  tissueBoxCells,
  tissueBoxLayout,
  tissueBoxSlotOrigins,
  tissueBoxSlotLipRadius,
  validateTissueBoxParameters,
  type TissueBoxCell,
  type TissueBoxParameters,
} from '../../../cad-contract/units/opengrid-openconnect-tissue-box'
import { OPENGRID_HONEYCOMB_CONFIGURATION } from '../../../cad-contract/units/opengrid-honeycomb'
import {
  measureBooleanInScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'
import {
  loadOpenGridOpenConnectShelfLockedSlot,
  placeOpenGridOpenConnectShelfLockedSlot,
} from '../opengrid-openconnect-shelf/slot'

export type TissueBoxBuildContext = {
  getLockedSlot?: () => Promise<Shape3D>
  isGenerationCurrent?: () => boolean
  yieldToEventLoop?: () => Promise<void>
  reportProgress?: (progress: {
    stage: 'building'
    completed: number
    total: number
    unit: 'cells'
  }) => void
  booleanOperations?: BooleanOperationReporter
}
function dispose(shape: { delete(): void } | null | undefined) {
  try {
    shape?.delete()
  } catch {
    /* Preserve the original failure. */
  }
}
function checkCurrent(context: TissueBoxBuildContext) {
  if (context.isGenerationCurrent && !context.isGenerationCurrent())
    throw new Error('STALE_GENERATION')
}
async function boundary(context: TissueBoxBuildContext) {
  checkCurrent(context)
  await context.yieldToEventLoop?.()
  checkCurrent(context)
}
function prism(
  width: number,
  depth: number,
  radius: number,
  z: number,
  height: number,
  centerY: number,
): Shape3D {
  const options = {
    plane: 'XY' as const,
    origin: [0, centerY, z] as [number, number, number],
  }
  const sketch =
    radius > 0
      ? sketchRoundedRectangle(width, depth, radius, options)
      : sketchRectangle(width, depth, options)
  try {
    return sketch.extrude(height)
  } finally {
    dispose(sketch)
  }
}
function frontRoundedPrism(
  width: number,
  depth: number,
  radius: number,
  z: number,
  height: number,
  centerY: number,
): Shape3D {
  const frontY = centerY + depth / 2
  const body = makeBox(
    [-width / 2, centerY - depth / 2, z],
    [width / 2, frontY, z + height],
  )
  if (radius === 0) return body
  try {
    return body.fillet((edge) => {
      const box = edge.boundingBox
      try {
        const [min, max] = box.bounds
        const atFront =
          Math.abs(min[1]! - frontY) < 1e-6 && Math.abs(max[1]! - frontY) < 1e-6
        const vertical = Math.abs(max[2]! - min[2]! - height) < 1e-6
        return atFront && vertical ? radius : null
      } finally {
        box.delete()
      }
    })
  } finally {
    dispose(body)
  }
}

function support(p: TissueBoxParameters): Shape3D {
  const l = tissueBoxLayout(p)
  const overlap = 0.1
  const sketcher = new Sketcher('YZ', [-l.supportWidth / 2, 0, 0])
  const sketch = sketcher
    .movePointerTo([0, l.plateBottom])
    .lineTo([l.offsetY + overlap, (overlap * l.sine) / l.cosine])
    .lineTo([
      l.plateThickness + overlap,
      l.height * l.cosine + (overlap * l.sine) / l.cosine,
    ])
    .lineTo([0, l.plateTop])
    .close()
  try {
    return sketch.extrude(l.supportWidth)
  } finally {
    dispose(sketch)
    dispose(sketcher)
  }
}
function hexCutter(p: TissueBoxParameters, cell: TissueBoxCell): Shape3D {
  const l = tissueBoxLayout(p)
  // The contract clips each hexagon to its protected panel (half cells
  // included), so the cutter just extrudes that polygon on the wall plane.
  let origin: [number, number, number]
  let plane: 'XZ' | 'YZ' | 'XY'
  let direction: [number, number, number]
  let points: [number, number][]
  if (cell.wall === 'bottom') {
    // Bottom cells carry plan coordinates: u is centered X, v runs 0..depth.
    origin = [0, 0, -0.1]
    plane = 'XY'
    direction = [0, 0, 1]
    points = cell.polygon.map(([u, v]) => [u, v] as [number, number])
  } else if (cell.wall === 'front') {
    origin = [0, l.depth - p.wallThickness - 0.1, 0]
    plane = 'XZ'
    direction = [0, 1, 0]
    points = cell.polygon.map(
      ([u, v]) => [u - l.width / 2, v] as [number, number],
    )
  } else {
    const x =
      cell.wall === 'left'
        ? -l.width / 2 - 0.1
        : l.width / 2 - p.wallThickness - 0.1
    origin = [x, 0, 0]
    plane = 'YZ'
    direction = [1, 0, 0]
    points = cell.polygon.map(([u, v]) => [u, v] as [number, number])
  }
  const sketcher = new Sketcher(plane, origin)
  for (let index = 0; index < points.length; index += 1) {
    if (index === 0) sketcher.movePointerTo(points[index]!)
    else sketcher.lineTo(points[index]!)
  }
  const sketch = sketcher.close()
  try {
    return sketch.extrude(
      (cell.wall === 'bottom' ? p.bottomThickness : p.wallThickness) + 0.2,
      { extrusionDirection: direction },
    )
  } finally {
    dispose(sketch)
    dispose(sketcher)
  }
}
function slotSafetyEnvelope(p: TissueBoxParameters): Shape3D {
  const l = tissueBoxLayout(p)
  const clearance = OPENGRID_HONEYCOMB_CONFIGURATION.bottomHoleSafetyRing
  return prism(
    p.slotLength + clearance * 2,
    p.slotWidth + clearance * 2,
    p.slotWidth / 2 + clearance,
    -0.1,
    p.bottomThickness + 0.2,
    l.depth / 2,
  )
}
export function tissueBoxQuality(shape: Shape3D): {
  valid: boolean
  solids: number
} {
  const oc = getOC()
  const analyzer = new oc.BRepCheck_Analyzer(shape.wrapped, true, true)
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  try {
    let solids = 0
    while (explorer.More()) {
      solids++
      explorer.Next()
    }
    return { valid: analyzer.IsValid_2(), solids }
  } finally {
    analyzer.delete()
    explorer.delete()
  }
}

export async function buildTissueBox(
  p: TissueBoxParameters,
  context: TissueBoxBuildContext = {},
): Promise<Shape3D> {
  if (!validateTissueBoxParameters(p).valid) throw new Error('INVALID_INPUT')
  checkCurrent(context)
  const l = tissueBoxLayout(p)
  let current: Shape3D | null = null
  const replace = (next: Shape3D) => {
    if (next !== current) dispose(current)
    current = next
  }
  const boolean = (tool: Shape3D, operation: 'cut' | 'fuse', count = 1) => {
    try {
      replace(
        measureBooleanInScope(
          context.booleanOperations?.createScope(count),
          operation,
          () => current![operation](tool),
        ),
      )
    } finally {
      dispose(tool)
    }
  }
  try {
    current = frontRoundedPrism(
      l.width,
      l.depth,
      p.outerRadius,
      0,
      l.height,
      l.depth / 2,
    )
    boolean(
      frontRoundedPrism(
        p.x,
        p.y,
        l.innerRadius,
        p.bottomThickness,
        p.z + 0.1,
        l.depth / 2,
      ),
      'cut',
    )
    boolean(
      prism(
        p.slotLength,
        p.slotWidth,
        p.slotWidth / 2,
        -0.1,
        p.bottomThickness + 0.2,
        l.depth / 2,
      ),
      'cut',
    )
    const lipRadius = tissueBoxSlotLipRadius(p)
    replace(
      current!.fillet((edge) => {
        const box = edge.boundingBox
        try {
          const [min, max] = box.bounds
          const atLip =
            (Math.abs(min[2]!) < 1e-5 && Math.abs(max[2]!) < 1e-5) ||
            (Math.abs(min[2]! - p.bottomThickness) < 1e-5 &&
              Math.abs(max[2]! - p.bottomThickness) < 1e-5)
          const atSlot =
            min[0]! >= -p.slotLength / 2 - 1e-5 &&
            max[0]! <= p.slotLength / 2 + 1e-5 &&
            min[1]! >= l.depth / 2 - p.slotWidth / 2 - 1e-5 &&
            max[1]! <= l.depth / 2 + p.slotWidth / 2 + 1e-5
          return atLip && atSlot ? lipRadius : null
        } finally {
          box.delete()
        }
      }),
    )
    await boundary(context)
    if (p.honeycombMode) {
      const cells = tissueBoxCells(p)
      for (let start = 0; start < cells.length; start += 24) {
        checkCurrent(context)
        const batchCells = cells.slice(start, start + 24)
        const cutters: Shape3D[] = []
        let batchTool: Shape3D | null = null
        try {
          for (const cell of batchCells) cutters.push(hexCutter(p, cell))
          batchTool = makeCompound(cutters).asShape3D()
          if (batchCells.some((cell) => cell.clipToSlotSafetyRing)) {
            const envelope = slotSafetyEnvelope(p)
            try {
              const clippedTool = batchTool.cut(envelope)
              if (clippedTool !== batchTool) dispose(batchTool)
              batchTool = clippedTool
            } finally {
              dispose(envelope)
            }
          }
          const activeTool = batchTool
          batchTool = null
          boolean(activeTool, 'cut', cutters.length)
        } finally {
          dispose(batchTool)
          cutters.forEach(dispose)
        }
        context.reportProgress?.({
          stage: 'building',
          completed: Math.min(start + 24, cells.length),
          total: cells.length,
          unit: 'cells',
        })
        await boundary(context)
      }
    }
    replace(current!.rotate(p.tiltAngle, [0, 0, 0], [1, 0, 0]))
    replace(current!.translate(0, l.offsetY, 0))
    boolean(support(p), 'fuse')
    await boundary(context)
    const source = context.getLockedSlot
      ? await context.getLockedSlot()
      : await loadOpenGridOpenConnectShelfLockedSlot()
    try {
      for (const [x, y, z] of tissueBoxSlotOrigins(p)) {
        checkCurrent(context)
        let cutter = placeOpenGridOpenConnectShelfLockedSlot(source, [
          -x,
          -y,
          z,
        ])
        try {
          const turned = cutter.rotate(180, [0, 0, 0], [0, 0, 1])
          if (turned !== cutter) dispose(cutter)
          cutter = turned
        } catch (error) {
          dispose(cutter)
          throw error
        }
        boolean(cutter, 'cut')
        await boundary(context)
      }
    } finally {
      if (!context.getLockedSlot) dispose(source)
    }
    // Keep the slotted bottom on the print plane for preview and both exports.
    replace(current!.translate(0, -l.offsetY, 0))
    replace(current!.rotate(-p.tiltAngle, [0, 0, 0], [1, 0, 0]))
    const quality = tissueBoxQuality(current!)
    if (!quality.valid || quality.solids !== 1)
      throw new Error('TISSUE_BOX_INVALID_SOLID')
    const result = current!
    current = null
    return result
  } finally {
    dispose(current)
  }
}
