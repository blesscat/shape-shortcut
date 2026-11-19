import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { measureVolume, type Shape3D } from 'replicad'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import { createBooleanOperationReporter } from '../../src/cad-kernel/boolean-progress'
import {
  buildModelBRep,
  buildModelBRepWithParts,
  type KernelBuildContext,
  type KernelModelBuildResult,
} from '../../src/cad-kernel/model'
import { deleteShape } from '../../src/cad-kernel/lifetime/dispose'
import { countSolids } from '../../src/cad-kernel/shape-query/solids'
import { CadWorkerAssetCache } from '../../src/workers/cad-worker-assets'
import {
  DEFAULT_MODEL_PARAMETERS,
  GEOMETRY_BASELINE,
  GEOMETRY_BASELINE_MODEL_IDS,
  type GeometrySignature,
} from './cad-geometry-baseline.fixture'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

/** Volume tolerance, relative to the recorded volume: one part per million. */
const VOLUME_RELATIVE_TOLERANCE = 1e-6
/** Bounds tolerance in millimetres. */
const BOUNDS_ABSOLUTE_TOLERANCE = 1e-4

const originalFetch = globalThis.fetch

/**
 * The URL a `fetch` input refers to. Node's fetch accepts a URL, a string, or
 * a request-like object.
 */
function urlOf(input: unknown): URL {
  if (input instanceof URL) return input
  if (typeof input === 'string') return new URL(input)
  return new URL(String((input as { url?: string }).url))
}

/**
 * The kernel asset loaders fetch `file:` URLs, which Node's fetch rejects.
 * Serving them from disk keeps the real loader path in play.
 */
function installFileUrlFetch(): void {
  globalThis.fetch = (async (input: unknown) => {
    const url = urlOf(input)
    if (url.protocol === 'file:') {
      return new Response(readFileSync(url), { status: 200 })
    }
    return originalFetch(input as never)
  }) as typeof fetch
}

function createBuildContext(): {
  context: KernelBuildContext
  assets: CadWorkerAssetCache
} {
  const assets = new CadWorkerAssetCache(() => false, {})
  const booleanOperations = createBooleanOperationReporter()
  const context: KernelBuildContext = {
    getModularGridBaseTemplate: () => assets.getModularGridBaseTemplate(),
    getHswCellTemplate: () => assets.getHswCellTemplate(),
    getHexagonalColumnReference: () => assets.getHexagonalColumnReference(),
    getOpenGridPrototype: (variant) => assets.getOpenGridPrototype(variant),
    getOpenGridCanonicalTile: (
      variant,
      thickness,
      canonicalBooleanOperations,
    ) =>
      assets.getOpenGridCanonicalTile(
        variant,
        thickness,
        () => true,
        canonicalBooleanOperations,
      ),
    getOpenGridHalfCellPrototype: (key, factory) =>
      assets.getOpenGridHalfCellPrototype(key, factory),
    getOpenGridSnapReference: (variant, profile) =>
      assets.getOpenGridSnapReference(variant, profile),
    getOpenGridWallCoverReference: () => assets.getOpenGridWallCoverReference(),
    getOpenGridSnapFixedFootprint: (footprint) =>
      assets.getOpenGridSnapFixedFootprint(footprint),
    getOpenGridSnapOpenConnectHead: () =>
      assets.getOpenGridSnapOpenConnectHead(),
    getOpenGridSnapRemoverAsset: () => assets.getOpenGridSnapRemoverAsset(),
    getOpenGridOpenConnectShelfLockedSlot: () =>
      assets.getOpenGridOpenConnectShelfLockedSlot(),
    getOpenGridDetachableCornerSeatReference: () =>
      assets.getOpenGridDetachableCornerSeatReference(),
    getOpenGridDetachableCornerSeatHolderReference: () =>
      assets.getOpenGridDetachableCornerSeatHolderReference(),
    yieldToEventLoop: () => new Promise((resolve) => setTimeout(resolve, 0)),
    isGenerationCurrent: () => true,
    booleanOperations,
  }
  return { context, assets }
}

function signatureOf(shape: Shape3D): GeometrySignature {
  const bounds = shape.boundingBox
  try {
    const corners = bounds.bounds as number[][]
    const [minimum, maximum] = corners
    return {
      volume: measureVolume(shape),
      bounds: [
        minimum[0],
        minimum[1],
        minimum[2],
        maximum[0],
        maximum[1],
        maximum[2],
      ],
      solids: countSolids(shape),
    }
  } finally {
    bounds.delete()
  }
}

/**
 * Releases every native shape the multipart build path returned. The same
 * shape can appear more than once, so each one is deleted only once.
 */
function releaseBuildShapes(result: KernelModelBuildResult): void {
  const released = new Set<Shape3D>()
  const candidates = [
    result.shape,
    result.qualityShape,
    ...(result.parts ?? []).map((part) => part.shape),
  ].filter((candidate): candidate is Shape3D => Boolean(candidate))

  for (const candidate of candidates) {
    if (released.has(candidate)) continue
    released.add(candidate)
    deleteShape(candidate)
  }
}

function expectSameGeometry(
  actual: GeometrySignature,
  expected: GeometrySignature,
): void {
  const volumeTolerance = Math.max(
    Math.abs(expected.volume) * VOLUME_RELATIVE_TOLERANCE,
    Number.EPSILON,
  )
  expect(Math.abs(actual.volume - expected.volume)).toBeLessThanOrEqual(
    volumeTolerance,
  )
  for (let index = 0; index < expected.bounds.length; index += 1) {
    expect(
      Math.abs(actual.bounds[index] - expected.bounds[index]),
    ).toBeLessThanOrEqual(BOUNDS_ABSOLUTE_TOLERANCE)
  }
  expect(actual.solids).toBe(expected.solids)
}

describe('CAD geometry baseline', () => {
  let assets: CadWorkerAssetCache | undefined
  let context: KernelBuildContext | undefined

  beforeAll(async () => {
    installFileUrlFetch()
    await initialiseCadKernel(WASM_PATH)
    const built = createBuildContext()
    assets = built.assets
    context = built.context
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
    assets?.dispose()
  })

  it.each(GEOMETRY_BASELINE_MODEL_IDS)(
    'builds %s with the recorded geometry',
    async (modelId) => {
      const buildContext = context
      if (!buildContext) throw new Error('BUILD_CONTEXT_MISSING')
      const parameters = DEFAULT_MODEL_PARAMETERS[modelId]
      const expected = GEOMETRY_BASELINE[modelId]

      const shape = await buildModelBRep(modelId, parameters, buildContext)
      try {
        expectSameGeometry(signatureOf(shape), expected.build)
      } finally {
        shape.delete()
      }

      const result = await buildModelBRepWithParts(
        modelId,
        parameters,
        buildContext,
      )
      try {
        expectSameGeometry(signatureOf(result.shape), expected.buildWithParts)
      } finally {
        releaseBuildShapes(result)
      }
    },
    120_000,
  )
})
