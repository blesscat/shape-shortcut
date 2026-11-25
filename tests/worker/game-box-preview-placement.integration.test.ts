import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { cast, getOC, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import { buildGameBox } from '../../src/cad-kernel/components/game-box/builder'
import {
  GAME_BOX_CONFIGURATION,
  type GameBoxModuleIndex,
  type GameBoxParameters,
} from '../../src/cad-contract/units'
import { gameBoxPreview } from '../../src/features/cad/progressive-preview/components'
import type { PreviewSolid } from '../../src/features/cad/progressive-preview/description'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require

beforeAll(async () => {
  await initialiseCadKernel(
    require.resolve('replicad-opencascadejs/src/replicad_single.wasm'),
  )
})

/** The two positions may differ by at most this much (mm). */
const TOLERANCE = 0.5

type Interval = { min: number; max: number }

type Bounds = {
  min: [number, number, number]
  max: [number, number, number]
}

function parameters(modules: readonly ('cards' | 'dice')[]): GameBoxParameters {
  const values: Record<string, unknown> = {}
  modules.forEach((type, position) => {
    const index = (position + 1) as GameBoxModuleIndex
    values[`module${index}Type`] = type
  })
  return {
    ...GAME_BOX_CONFIGURATION.defaultParameters,
    ...values,
    part: 'assembly',
  } as GameBoxParameters
}

/** The solids of a compound; they belong to the compound and are not freed. */
function solidsOf(shape: Shape3D): Shape3D[] {
  const oc = getOC()
  const solidType = oc.TopAbs_ShapeEnum
    .TopAbs_SOLID as unknown as TopAbs_ShapeEnum
  const shapeType = oc.TopAbs_ShapeEnum
    .TopAbs_SHAPE as unknown as TopAbs_ShapeEnum
  const explorer = new oc.TopExp_Explorer_2(shape.wrapped, solidType, shapeType)
  const solids: Shape3D[] = []
  try {
    while (explorer.More()) {
      solids.push(cast(explorer.Current()) as Shape3D)
      explorer.Next()
    }
  } finally {
    explorer.delete()
  }
  return solids
}

function boundsOf(shape: Shape3D): Bounds {
  const bounds = shape.boundingBox
  try {
    const [min, max] = bounds.bounds as [number[], number[]]
    return {
      min: [min[0]!, min[1]!, min[2]!],
      max: [max[0]!, max[1]!, max[2]!],
    }
  } finally {
    bounds.delete()
  }
}

/** The interval a preview solid covers along one axis. */
function axisInterval(solid: PreviewSolid, axis: number): Interval {
  const values: number[] = []
  for (const [x, y] of solid.outline) {
    values.push(solid.origin[axis] + solid.u[axis] * x + solid.v[axis] * y)
  }
  values.push(solid.origin[axis] + solid.w[axis] * solid.depth)
  return { min: Math.min(...values), max: Math.max(...values) }
}

/**
 * The dice holder of the built assembly: the only solid that stands on the
 * floor and is as tall as a card. Its tenons reach into the wall slots, so
 * it is no longer narrower than the cavity of the box.
 */
function builtHolderOf(solids: readonly Shape3D[], cardHeight: number) {
  const holders = solids.filter((solid) => {
    const bounds = boundsOf(solid)
    return Math.abs(bounds.max[2]! - bounds.min[2]! - cardHeight) < 1e-3
  })
  expect(holders).toHaveLength(1)
  const bounds = boundsOf(holders[0]!)
  return { min: bounds.min[1]!, max: bounds.max[1]! }
}

/**
 * The dice holder of the simplified preview: the only solid that stands on
 * the floor and is as tall as a card.
 */
function previewHolderOf(solids: readonly PreviewSolid[], cardHeight: number) {
  const holders = solids.filter((solid) => {
    const interval = axisInterval(solid, 2)
    return Math.abs(interval.max - interval.min - cardHeight) < 1e-6
  })
  expect(holders).toHaveLength(1)
  return axisInterval(holders[0]!, 1)
}

const MODULE_LISTS = [
  { name: 'the dice module first', modules: ['dice', 'cards'] as const },
  {
    name: 'the dice module in the middle',
    modules: ['cards', 'dice', 'cards'] as const,
  },
  { name: 'the dice module last', modules: ['cards', 'dice'] as const },
]

describe('game-box preview placement', () => {
  for (const { name, modules } of MODULE_LISTS) {
    it(`places the holder like the built one with ${name}`, () => {
      const snapshot = parameters(modules)
      const build = buildGameBox(snapshot)
      try {
        const built = builtHolderOf(solidsOf(build.shape), snapshot.cardHeight)
        const preview = previewHolderOf(
          gameBoxPreview(snapshot),
          snapshot.cardHeight,
        )
        expect(Math.abs(preview.min - built.min)).toBeLessThanOrEqual(TOLERANCE)
        expect(Math.abs(preview.max - built.max)).toBeLessThanOrEqual(TOLERANCE)
      } finally {
        build.shape.delete()
      }
    })
  }
})
