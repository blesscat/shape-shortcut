import { getOC, measureVolume, type Shape3D } from 'replicad'
import { exportStlBytes, exportStepBytes } from '../../cad-kernel/export'
import {
  buildOpenGridBenchmarkShape,
  expectedOpenGridBounds,
  normalizeOpenGridBenchmarkRequest,
  OPENGRID_BENCHMARK_CONFIGURATION,
  type OpenGridBenchmarkBuildContext,
  type OpenGridBenchmarkRequest,
  type OpenGridGeometryStrategy,
  type OpenGridPreviewConfig,
} from '../../cad-kernel/components/opengrid-benchmark/builder'
import { buildOpenGridPrototype } from '../../cad-kernel/components/opengrid/builder'
import { inspectOpenGridShapeQuality } from '../../cad-kernel/components/opengrid/quality'
import { OPENGRID_CONFIGURATION } from '../../cad-kernel/components/opengrid/profile'
import { meshBRep, type MeshData } from '../../cad-kernel/mesh'
import type {
  BoxBounds,
  OpenGridParameters,
  OpenGridVariant,
} from '../../cad-contract/units'
import { deleteShape } from '../../cad-kernel/lifetime/dispose'
import { countSolids } from '../../cad-kernel/shape-query/solids'

export const OPENGRID_BENCHMARK_RUNS = 5
export const OPENGRID_BENCHMARK_WARMUP_RUNS = 1
export const OPENGRID_BENCHMARK_SAMPLE_TIMEOUT_MS = 120_000
export const OPENGRID_BENCHMARK_STRATEGIES: readonly OpenGridGeometryStrategy[] =
  ['whole-profile', 'row-block', 'cell-balanced', 'prototype-template']
export const OPENGRID_BENCHMARK_PREVIEW_CONFIG: OpenGridPreviewConfig = {
  tolerance: 0.05,
  angularTolerance: 0.1,
}

const SOURCE_COMMIT = '61231295ea08c302eff32051769113c48cbda255'
const SOURCE_URL = `https://github.com/AndyLevesque/QuackWorks/blob/${SOURCE_COMMIT}/openGrid/openGrid.scad`

type FixtureScale = {
  id: string
  rows: number
  columns: number
  screwMode: OpenGridParameters['screwMode']
  connectorHoles: OpenGridParameters['connectorHoles']
}

const FIXTURE_SCALES: readonly FixtureScale[] = [
  {
    id: '1x1',
    rows: 1,
    columns: 1,
    screwMode: 'none',
    connectorHoles: 'enabled',
  },
  {
    id: '2x2',
    rows: 2,
    columns: 2,
    screwMode: 'corners',
    connectorHoles: 'none',
  },
  {
    id: '5x5',
    rows: 5,
    columns: 5,
    screwMode: 'by-row-column',
    connectorHoles: 'enabled',
  },
  {
    id: '10x10',
    rows: 10,
    columns: 10,
    screwMode: 'everywhere',
    connectorHoles: 'enabled',
  },
  {
    id: 'max-grid-row-column',
    rows: OPENGRID_BENCHMARK_CONFIGURATION.maxGridCount,
    columns: OPENGRID_BENCHMARK_CONFIGURATION.maxGridCount,
    screwMode: 'by-row-column',
    connectorHoles: 'enabled',
  },
]

const OPENGRID_BENCHMARK_VARIANTS = ['Full', 'Lite', 'Heavy', 'Hybrid'] as const

export type OpenGridBenchmarkFixture = {
  id: string
  variant: OpenGridVariant
  scaleId: string
  request: OpenGridBenchmarkRequest
}

function createFixture(
  variant: OpenGridVariant,
  scale: FixtureScale,
): OpenGridBenchmarkFixture {
  const request = normalizeOpenGridBenchmarkRequest({
    ...OPENGRID_CONFIGURATION.defaultParameters,
    variant,
    rows: scale.rows,
    columns: scale.columns,
    chamfers: scale.id === '1x1' ? 'corners' : 'everywhere',
    connectorHoles: scale.connectorHoles,
    connectorSides: {
      top: true,
      right: scale.id !== '2x2',
      bottom: true,
      left: scale.id === 'max-grid-row-column',
    },
    screwKind: scale.id === '5x5' ? 'custom' : 'official-default',
    screwMode: scale.screwMode,
    screwDiameter: scale.id === '5x5' ? 4.2 : 4.1,
    screwHeadDiameter: scale.id === '5x5' ? 7.4 : 7.2,
    screwHeadInset: scale.id === '5x5' ? 1.2 : 1,
    screwHeadIsCountersunk: scale.id !== '5x5',
    screwHeadCountersunkDegree: 90,
    previewConfig: { ...OPENGRID_BENCHMARK_PREVIEW_CONFIG },
  })
  return {
    id: `${variant.toLowerCase()}-${scale.id}`,
    variant,
    scaleId: scale.id,
    request,
  }
}

export function createOpenGridBenchmarkFixtures(): OpenGridBenchmarkFixture[] {
  const fixtures: OpenGridBenchmarkFixture[] = []
  for (const variant of OPENGRID_BENCHMARK_VARIANTS) {
    for (const scale of FIXTURE_SCALES)
      fixtures.push(createFixture(variant, scale))
  }
  return fixtures
}

export const OPENGRID_BENCHMARK_FIXTURES: readonly OpenGridBenchmarkFixture[] =
  createOpenGridBenchmarkFixtures()

export type OpenGridBenchmarkPhase =
  | 'profileMs'
  | 'extrudeMs'
  | 'prototypeBuildMs'
  | 'assemblyFuseMs'
  | 'booleanCutMs'
  | 'meshMs'
  | 'exportMs'
  | 'totalMs'

export type OpenGridBenchmarkTiming = Record<
  OpenGridBenchmarkPhase,
  number | null
>
export type OpenGridBenchmarkRunKind = 'cold' | 'warmup' | 'measured'

export type OpenGridBenchmarkQuality = {
  passed: boolean
  failures: string[]
  bounds: BoxBounds | null
  expectedBounds: BoxBounds
  volume: number | null
  solidCount: number | null
  singleSolid: boolean
  brepValid: boolean
  centeredXY: boolean
  baseZAtZero: boolean
  meshTriangleCount: number
  stepByteLength: number
  stlByteLength: number
  stlTriangleCount: number | null
}

export type OpenGridBenchmarkRun = {
  fixtureId: string
  variant: OpenGridVariant
  strategy: OpenGridGeometryStrategy
  kind: OpenGridBenchmarkRunKind
  sample: number
  timing: OpenGridBenchmarkTiming
  quality: OpenGridBenchmarkQuality
}

export type OpenGridBenchmarkFailure = {
  fixtureId: string
  variant: OpenGridVariant
  strategy: OpenGridGeometryStrategy
  kind: OpenGridBenchmarkRunKind
  sample: number
  phase: string
  message: string
}

export type OpenGridBenchmarkPhaseSummary = {
  applicable: boolean
  medianMs: number | null
  p95Ms: number | null
}

export type OpenGridBenchmarkSummary = {
  fixtureId: string
  variant: OpenGridVariant
  strategy: OpenGridGeometryStrategy
  samples: number
  medianMs: number
  p95Ms: number
  phases: Record<OpenGridBenchmarkPhase, OpenGridBenchmarkPhaseSummary>
}

export type OpenGridStrategyRecommendation = {
  strategy: OpenGridGeometryStrategy | null
  consideredStrategies: OpenGridGeometryStrategy[]
  fallbackStrategies: OpenGridGeometryStrategy[]
  blockedFixtureIds: string[]
  fallbackConditions: string[]
  evidence: string
}

export type OpenGridBenchmarkEnvironment = {
  browserBuildMode: string
  dependencyLockfileVersion: string
  referenceEnvironment: string
  nativeExecutionEpoch: string
}

export type OpenGridBenchmarkReport = {
  environment: OpenGridBenchmarkEnvironment
  fixtures: OpenGridBenchmarkFixture[]
  measuredRuns: number
  warmupRuns: number
  sampleTimeoutMs: number
  coldRuns: OpenGridBenchmarkRun[]
  warmups: OpenGridBenchmarkRun[]
  runs: OpenGridBenchmarkRun[]
  failures: OpenGridBenchmarkFailure[]
  summaries: OpenGridBenchmarkSummary[]
  recommendations: Record<OpenGridVariant, OpenGridStrategyRecommendation>
  selectedStrategies: Record<OpenGridVariant, OpenGridGeometryStrategy | null>
}

export type OpenGridBenchmarkAdapter = {
  build: (
    fixture: OpenGridBenchmarkFixture,
    strategy: OpenGridGeometryStrategy,
    context: OpenGridBenchmarkBuildContext,
  ) => Shape3D | Promise<Shape3D>
  mesh: (shape: Shape3D, previewConfig: OpenGridPreviewConfig) => MeshData
  exportStep: (shape: Shape3D) => Promise<ArrayBuffer>
  exportStl: (shape: Shape3D) => Promise<ArrayBuffer>
  inspect?: (
    shape: Shape3D,
    fixture: OpenGridBenchmarkFixture,
    mesh: MeshData,
    stepBytes: ArrayBuffer,
    stlBytes: ArrayBuffer,
  ) => OpenGridBenchmarkQuality
}

export type RunOpenGridBenchmarkOptions = {
  adapter: OpenGridBenchmarkAdapter
  environment: OpenGridBenchmarkEnvironment
  fixtures?: readonly OpenGridBenchmarkFixture[]
  measuredRuns?: number
  warmupRuns?: number
  previewConfig?: OpenGridPreviewConfig
  strategies?: readonly OpenGridGeometryStrategy[]
  sampleTimeoutMs?: number
}

function emptyTiming(): OpenGridBenchmarkTiming {
  return {
    profileMs: null,
    extrudeMs: null,
    prototypeBuildMs: null,
    assemblyFuseMs: null,
    booleanCutMs: null,
    meshMs: null,
    exportMs: null,
    totalMs: null,
  }
}

function readBounds(shape: Shape3D): BoxBounds {
  const boundingBox = shape.boundingBox
  try {
    const [min, max] = boundingBox.bounds as [
      [number, number, number],
      [number, number, number],
    ]
    return { min, max }
  } finally {
    boundingBox.delete()
  }
}

function checkBrepValidity(shape: Shape3D): boolean {
  const oc = getOC()
  const analyzer = new oc.BRepCheck_Analyzer(shape.wrapped, true, true)
  try {
    return analyzer.IsValid_2()
  } finally {
    analyzer.delete()
  }
}

export function parseBinaryStlTriangleCount(bytes: ArrayBuffer): number {
  if (bytes.byteLength < 84) throw new Error('OPENGRID_STL_INVALID_HEADER')
  const view = new DataView(bytes)
  const triangleCount = view.getUint32(80, true)
  if (triangleCount === 0 || 84 + triangleCount * 50 !== bytes.byteLength) {
    throw new Error('OPENGRID_STL_INVALID_STRUCTURE')
  }
  return triangleCount
}

function emptyQuality(expectedBounds: BoxBounds): OpenGridBenchmarkQuality {
  return {
    passed: false,
    failures: [],
    bounds: null,
    expectedBounds,
    volume: null,
    solidCount: null,
    singleSolid: false,
    brepValid: false,
    centeredXY: false,
    baseZAtZero: false,
    meshTriangleCount: 0,
    stepByteLength: 0,
    stlByteLength: 0,
    stlTriangleCount: null,
  }
}

export function inspectOpenGridShape(
  shape: Shape3D,
  fixture: OpenGridBenchmarkFixture,
  mesh: MeshData,
  stepBytes: ArrayBuffer,
  stlBytes: ArrayBuffer,
): OpenGridBenchmarkQuality {
  const expectedBounds = expectedOpenGridBounds(fixture.request)
  const quality = emptyQuality(expectedBounds)
  const failures = quality.failures
  try {
    quality.bounds = readBounds(shape)
    quality.centeredXY =
      Math.abs(quality.bounds.min[0] - expectedBounds.min[0]) <= 0.01 &&
      Math.abs(quality.bounds.max[0] - expectedBounds.max[0]) <= 0.01 &&
      Math.abs(quality.bounds.min[1] - expectedBounds.min[1]) <= 0.01 &&
      Math.abs(quality.bounds.max[1] - expectedBounds.max[1]) <= 0.01
    quality.baseZAtZero = Math.abs(quality.bounds.min[2]) <= 0.01
    if (!quality.centeredXY) failures.push('bounds:centered-xy-or-envelope')
    if (!quality.baseZAtZero) failures.push('bounds:base-z')
  } catch (error) {
    failures.push(
      `bounds:${error instanceof Error ? error.message : String(error)}`,
    )
  }
  try {
    quality.volume = measureVolume(shape)
    if (!(quality.volume > 0)) failures.push('volume:non-positive')
  } catch (error) {
    failures.push(
      `volume:${error instanceof Error ? error.message : String(error)}`,
    )
  }
  try {
    quality.solidCount = countSolids(shape)
    quality.singleSolid = quality.solidCount === 1
    if (!quality.singleSolid) failures.push('topology:not-single-solid')
    quality.brepValid = checkBrepValidity(shape)
    if (!quality.brepValid) failures.push('topology:brep-invalid')
  } catch (error) {
    failures.push(
      `topology:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const profile = inspectOpenGridShapeQuality(shape, fixture.request, mesh)
  failures.push(...profile.failures)
  quality.meshTriangleCount = mesh.triangleCount
  if (mesh.triangleCount <= 0) failures.push('mesh:empty')
  quality.stepByteLength = stepBytes.byteLength
  quality.stlByteLength = stlBytes.byteLength
  if (quality.stepByteLength <= 0) failures.push('export:step-empty')
  if (quality.stlByteLength <= 0) failures.push('export:stl-empty')
  try {
    quality.stlTriangleCount = parseBinaryStlTriangleCount(stlBytes)
  } catch (error) {
    failures.push(
      `export:stl:${error instanceof Error ? error.message : String(error)}`,
    )
  }
  quality.passed = failures.length === 0
  return quality
}

class BenchmarkSampleFailure extends Error {
  constructor(
    readonly fixture: OpenGridBenchmarkFixture,
    readonly strategy: OpenGridGeometryStrategy,
    readonly kind: OpenGridBenchmarkRunKind,
    readonly sample: number,
    readonly phase: string,
    message: string,
  ) {
    super(
      `OPENGRID_BENCHMARK_FAILED:${fixture.id}:${strategy}:${kind}:${sample}:${phase}:${message}`,
    )
  }
}

function recordFailure(
  fixture: OpenGridBenchmarkFixture,
  strategy: OpenGridGeometryStrategy,
  kind: OpenGridBenchmarkRunKind,
  sample: number,
  phase: string,
  error: unknown,
): BenchmarkSampleFailure {
  return new BenchmarkSampleFailure(
    fixture,
    strategy,
    kind,
    sample,
    phase,
    error instanceof Error ? error.message : String(error),
  )
}

function failureRecord(
  fixture: OpenGridBenchmarkFixture,
  strategy: OpenGridGeometryStrategy,
  kind: OpenGridBenchmarkRunKind,
  sample: number,
  error: unknown,
): OpenGridBenchmarkFailure {
  if (error instanceof BenchmarkSampleFailure) {
    return {
      fixtureId: error.fixture.id,
      variant: error.fixture.variant,
      strategy: error.strategy,
      kind: error.kind,
      sample: error.sample,
      phase: error.phase,
      message: error.message,
    }
  }
  return {
    fixtureId: fixture.id,
    variant: fixture.variant,
    strategy,
    kind,
    sample,
    phase: 'unknown',
    message: error instanceof Error ? error.message : String(error),
  }
}

function timeoutError(timeoutMs: number): Error {
  return new Error(`OPENGRID_BENCHMARK_TIMEOUT_${timeoutMs}MS`)
}

async function runSample(
  adapter: OpenGridBenchmarkAdapter,
  fixture: OpenGridBenchmarkFixture,
  strategy: OpenGridGeometryStrategy,
  kind: OpenGridBenchmarkRunKind,
  sample: number,
  previewConfig: OpenGridPreviewConfig,
  sampleTimeoutMs: number,
): Promise<OpenGridBenchmarkRun> {
  const timing = emptyTiming()
  const startedAt = performance.now()
  let shape: Shape3D | null = null
  let phase = 'build'
  let timedOut = false
  const timeoutHandle = setTimeout(() => {
    timedOut = true
  }, sampleTimeoutMs)
  const assertDeadline = () => {
    if (timedOut || performance.now() - startedAt >= sampleTimeoutMs) {
      throw timeoutError(sampleTimeoutMs)
    }
  }
  const assertPhaseDeadline = () => {
    try {
      assertDeadline()
    } catch (error) {
      throw recordFailure(fixture, strategy, kind, sample, phase, error)
    }
  }

  try {
    const phaseTimings: Partial<
      Record<
        | 'profile'
        | 'extrude'
        | 'prototype-build'
        | 'assembly-fuse'
        | 'boolean-cut',
        number
      >
    > = {}
    try {
      const built = adapter.build(fixture, strategy, {
        isGenerationCurrent: () => !timedOut,
        reportPhaseStart: (nextPhase) => {
          phase = nextPhase
        },
        reportPhase: (nextPhase, durationMs) => {
          phase = nextPhase
          phaseTimings[nextPhase] = (phaseTimings[nextPhase] ?? 0) + durationMs
        },
      })
      shape = await Promise.race([
        Promise.resolve(built),
        new Promise<Shape3D>((_, reject) =>
          setTimeout(
            () => reject(timeoutError(sampleTimeoutMs)),
            sampleTimeoutMs,
          ),
        ),
      ])
    } catch (error) {
      throw recordFailure(fixture, strategy, kind, sample, phase, error)
    }
    assertPhaseDeadline()
    timing.profileMs = phaseTimings.profile ?? null
    timing.extrudeMs = phaseTimings.extrude ?? null
    timing.prototypeBuildMs = phaseTimings['prototype-build'] ?? null
    timing.assemblyFuseMs = phaseTimings['assembly-fuse'] ?? null
    timing.booleanCutMs = phaseTimings['boolean-cut'] ?? null

    phase = 'mesh'
    const meshStartedAt = performance.now()
    let mesh: MeshData
    try {
      mesh = adapter.mesh(shape, previewConfig)
    } catch (error) {
      throw recordFailure(fixture, strategy, kind, sample, phase, error)
    }
    timing.meshMs = performance.now() - meshStartedAt
    assertPhaseDeadline()

    phase = 'export'
    const exportStartedAt = performance.now()
    let stepBytes: ArrayBuffer
    let stlBytes: ArrayBuffer
    try {
      ;[stepBytes, stlBytes] = await Promise.all([
        adapter.exportStep(shape),
        adapter.exportStl(shape),
      ])
    } catch (error) {
      throw recordFailure(fixture, strategy, kind, sample, phase, error)
    }
    timing.exportMs = performance.now() - exportStartedAt
    assertPhaseDeadline()

    phase = 'quality'
    const quality = adapter.inspect
      ? adapter.inspect(shape, fixture, mesh, stepBytes, stlBytes)
      : inspectOpenGridShape(shape, fixture, mesh, stepBytes, stlBytes)
    if (!quality.passed) {
      throw recordFailure(
        fixture,
        strategy,
        kind,
        sample,
        phase,
        quality.failures.join('; '),
      )
    }
    timing.totalMs = performance.now() - startedAt
    return {
      fixtureId: fixture.id,
      variant: fixture.variant,
      strategy,
      kind,
      sample,
      timing,
      quality,
    }
  } finally {
    clearTimeout(timeoutHandle)
    deleteShape(shape)
  }
}

export function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error('OPENGRID_BENCHMARK_SAMPLES_EMPTY')
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

export function percentile95(values: readonly number[]): number {
  if (values.length === 0) throw new Error('OPENGRID_BENCHMARK_SAMPLES_EMPTY')
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[
    Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  ]
}

function summarizePhase(
  runs: readonly OpenGridBenchmarkRun[],
  phase: OpenGridBenchmarkPhase,
): OpenGridBenchmarkPhaseSummary {
  const values = runs
    .map((run) => run.timing[phase])
    .filter((value): value is number => value !== null)
  return values.length === 0
    ? { applicable: false, medianMs: null, p95Ms: null }
    : {
        applicable: true,
        medianMs: median(values),
        p95Ms: percentile95(values),
      }
}

function summarizeRuns(
  fixture: OpenGridBenchmarkFixture,
  strategy: OpenGridGeometryStrategy,
  runs: readonly OpenGridBenchmarkRun[],
): OpenGridBenchmarkSummary {
  const phases = {} as Record<
    OpenGridBenchmarkPhase,
    OpenGridBenchmarkPhaseSummary
  >
  for (const phase of [
    'profileMs',
    'extrudeMs',
    'prototypeBuildMs',
    'assemblyFuseMs',
    'booleanCutMs',
    'meshMs',
    'exportMs',
    'totalMs',
  ] as const) {
    phases[phase] = summarizePhase(runs, phase)
  }
  const totals = runs
    .map((run) => run.timing.totalMs)
    .filter((value): value is number => value !== null)
  if (totals.length === 0) throw new Error('OPENGRID_TOTAL_TIMING_MISSING')
  return {
    fixtureId: fixture.id,
    variant: fixture.variant,
    strategy,
    samples: runs.length,
    medianMs: median(totals),
    p95Ms: percentile95(totals),
    phases,
  }
}

function recommendationsFor(
  variant: OpenGridVariant,
  fixtures: readonly OpenGridBenchmarkFixture[],
  summaries: readonly OpenGridBenchmarkSummary[],
  strategies: readonly OpenGridGeometryStrategy[],
): OpenGridStrategyRecommendation {
  const variantFixtures = fixtures.filter(
    (fixture) => fixture.variant === variant,
  )
  if (variantFixtures.length === 0) {
    return {
      strategy: null,
      consideredStrategies: [],
      fallbackStrategies: [],
      blockedFixtureIds: [],
      fallbackConditions: [],
      evidence: `${variant} 沒有可評估的官方 profile fixture。`,
    }
  }
  const candidates = strategies
    .map((strategy) => {
      const matching = summaries.filter(
        (summary) =>
          summary.variant === variant && summary.strategy === strategy,
      )
      if (matching.length !== variantFixtures.length) return null
      return {
        strategy,
        median:
          matching.reduce((sum, item) => sum + item.medianMs, 0) /
          matching.length,
        p95:
          matching.reduce((sum, item) => sum + item.p95Ms, 0) / matching.length,
      }
    })
    .filter(
      (
        candidate,
      ): candidate is {
        strategy: OpenGridGeometryStrategy
        median: number
        p95: number
      } => candidate !== null,
    )
    .sort(
      (first, second) => first.median - second.median || first.p95 - second.p95,
    )
  const selected = candidates[0]
  const blockedFixtureIds = variantFixtures
    .filter(
      (fixture) =>
        !summaries.some(
          (summary) =>
            summary.fixtureId === fixture.id && summary.variant === variant,
        ),
    )
    .map((fixture) => fixture.id)
  return {
    strategy: selected?.strategy ?? null,
    consideredStrategies: candidates.map((candidate) => candidate.strategy),
    fallbackStrategies: candidates
      .slice(1)
      .map((candidate) => candidate.strategy),
    blockedFixtureIds,
    fallbackConditions:
      blockedFixtureIds.length === 0
        ? []
        : ['所有官方 profile fixture 必須通過品質與匯出 gate。'],
    evidence: selected
      ? `以 ${variant} 全部 ${variantFixtures.length} 個官方 fixture 的平均 median/P95 選出。`
      : `${variant} 尚無完整的官方 profile measured 結果。`,
  }
}

function deriveRecommendations(
  fixtures: readonly OpenGridBenchmarkFixture[],
  summaries: readonly OpenGridBenchmarkSummary[],
  strategies: readonly OpenGridGeometryStrategy[],
): Record<OpenGridVariant, OpenGridStrategyRecommendation> {
  return {
    Full: recommendationsFor('Full', fixtures, summaries, strategies),
    Lite: recommendationsFor('Lite', fixtures, summaries, strategies),
    Heavy: recommendationsFor('Heavy', fixtures, summaries, strategies),
    Hybrid: recommendationsFor('Hybrid', fixtures, summaries, strategies),
  }
}

export async function runOpenGridBenchmark(
  options: RunOpenGridBenchmarkOptions,
): Promise<OpenGridBenchmarkReport> {
  const measuredRuns = options.measuredRuns ?? OPENGRID_BENCHMARK_RUNS
  const warmupRuns = options.warmupRuns ?? OPENGRID_BENCHMARK_WARMUP_RUNS
  if (measuredRuns < OPENGRID_BENCHMARK_RUNS) {
    throw new Error('OPENGRID_BENCHMARK_REQUIRES_FIVE_MEASURED_RUNS')
  }
  if (warmupRuns < 1) throw new Error('OPENGRID_BENCHMARK_REQUIRES_WARMUP')
  const sampleTimeoutMs =
    options.sampleTimeoutMs ?? OPENGRID_BENCHMARK_SAMPLE_TIMEOUT_MS
  if (!Number.isFinite(sampleTimeoutMs) || sampleTimeoutMs <= 0) {
    throw new Error('OPENGRID_BENCHMARK_INVALID_SAMPLE_TIMEOUT')
  }
  const strategies = options.strategies ?? OPENGRID_BENCHMARK_STRATEGIES
  const previewConfig =
    options.previewConfig ?? OPENGRID_BENCHMARK_PREVIEW_CONFIG
  const fixtures = (options.fixtures ?? OPENGRID_BENCHMARK_FIXTURES).map(
    (fixture) => ({
      ...fixture,
      request: normalizeOpenGridBenchmarkRequest({
        ...fixture.request,
        previewConfig: { ...previewConfig },
      }),
    }),
  )
  const coldRuns: OpenGridBenchmarkRun[] = []
  const warmups: OpenGridBenchmarkRun[] = []
  const runs: OpenGridBenchmarkRun[] = []
  const failures: OpenGridBenchmarkFailure[] = []

  async function attempt(
    fixture: OpenGridBenchmarkFixture,
    strategy: OpenGridGeometryStrategy,
    kind: OpenGridBenchmarkRunKind,
    sample: number,
    target: OpenGridBenchmarkRun[],
  ): Promise<void> {
    try {
      target.push(
        await runSample(
          options.adapter,
          fixture,
          strategy,
          kind,
          sample,
          previewConfig,
          sampleTimeoutMs,
        ),
      )
    } catch (error) {
      failures.push(failureRecord(fixture, strategy, kind, sample, error))
    }
  }

  for (const fixture of fixtures) {
    for (const strategy of strategies) {
      await attempt(fixture, strategy, 'cold', 0, coldRuns)
      for (let sample = 1; sample <= warmupRuns; sample += 1) {
        await attempt(fixture, strategy, 'warmup', sample, warmups)
      }
      for (let sample = 1; sample <= measuredRuns; sample += 1) {
        await attempt(fixture, strategy, 'measured', sample, runs)
      }
    }
  }

  const summaries: OpenGridBenchmarkSummary[] = []
  for (const fixture of fixtures) {
    for (const strategy of strategies) {
      const matching = runs.filter(
        (run) => run.fixtureId === fixture.id && run.strategy === strategy,
      )
      if (matching.length > 0)
        summaries.push(summarizeRuns(fixture, strategy, matching))
    }
  }
  const recommendations = deriveRecommendations(fixtures, summaries, strategies)
  return {
    environment: options.environment,
    fixtures,
    measuredRuns,
    warmupRuns,
    sampleTimeoutMs,
    coldRuns,
    warmups,
    runs,
    failures,
    summaries,
    recommendations,
    selectedStrategies: {
      Full: recommendations.Full.strategy,
      Lite: recommendations.Lite.strategy,
      Heavy: recommendations.Heavy.strategy,
      Hybrid: recommendations.Hybrid.strategy,
    },
  }
}

export function mergeOpenGridBenchmarkReports(
  reports: readonly OpenGridBenchmarkReport[],
  strategies?: readonly OpenGridGeometryStrategy[],
): OpenGridBenchmarkReport {
  const first = reports[0]
  if (!first) throw new Error('OPENGRID_BENCHMARK_REPORTS_EMPTY')
  const fixtures = reports.flatMap((report) => report.fixtures)
  const summaries = reports.flatMap((report) => report.summaries)
  const strategySet = strategies ?? OPENGRID_BENCHMARK_STRATEGIES
  const recommendations = deriveRecommendations(
    fixtures,
    summaries,
    strategySet,
  )
  return {
    environment: {
      ...first.environment,
      nativeExecutionEpoch: reports
        .map((report) => report.environment.nativeExecutionEpoch)
        .join(' + '),
    },
    fixtures,
    measuredRuns: first.measuredRuns,
    warmupRuns: first.warmupRuns,
    sampleTimeoutMs: first.sampleTimeoutMs,
    coldRuns: reports.flatMap((report) => report.coldRuns),
    warmups: reports.flatMap((report) => report.warmups),
    runs: reports.flatMap((report) => report.runs),
    failures: reports.flatMap((report) => report.failures),
    summaries,
    recommendations,
    selectedStrategies: {
      Full: recommendations.Full.strategy,
      Lite: recommendations.Lite.strategy,
      Heavy: recommendations.Heavy.strategy,
      Hybrid: recommendations.Hybrid.strategy,
    },
  }
}

export function createDefaultOpenGridBenchmarkAdapter(): OpenGridBenchmarkAdapter {
  const prototypeCache = new Map<OpenGridVariant, Promise<Shape3D>>()

  function getPrototype(
    variant: OpenGridVariant,
    context: OpenGridBenchmarkBuildContext,
  ): Promise<Shape3D> {
    const cached = prototypeCache.get(variant)
    if (cached) return cached

    const prototype = buildOpenGridPrototype(variant, {
      yieldToEventLoop: context.yieldToEventLoop,
      reportPhase: context.reportPhase,
    }).catch((error) => {
      prototypeCache.delete(variant)
      throw error
    })
    prototypeCache.set(variant, prototype)
    return prototype
  }

  return {
    build: (fixture, strategy, context) =>
      buildOpenGridBenchmarkShape(fixture.request, strategy, {
        ...context,
        getOpenGridPrototype: (variant) => getPrototype(variant, context),
      }),
    mesh: (shape, previewConfig) => meshBRep(shape, previewConfig),
    exportStep: exportStepBytes,
    exportStl: (shape) => exportStlBytes(shape),
    inspect: inspectOpenGridShape,
  }
}

function renderPhaseSummary(summary: OpenGridBenchmarkPhaseSummary): string {
  return summary.applicable
    ? `${summary.medianMs?.toFixed(2)} / ${summary.p95Ms?.toFixed(2)} ms`
    : 'n/a'
}

function renderFixtureLine(fixture: OpenGridBenchmarkFixture): string {
  const { request } = fixture
  const interval =
    request.screwMode === 'by-row-column'
      ? `${request.screwEveryRows}×${request.screwEveryColumns}`
      : 'n/a'
  return `| ${fixture.id} | ${fixture.variant} | ${request.rows}×${request.columns} | ${request.screwMode} | ${request.connectorHoles} | ${interval} |`
}

export function renderOpenGridBenchmarkMarkdown(
  report: OpenGridBenchmarkReport,
): string {
  const lines = [
    '# OpenGrid Official-Profile Benchmark Handoff',
    '',
    `- Source: ${SOURCE_URL}`,
    `- Source commit: ${SOURCE_COMMIT}`,
    '- Profile boundary: the old 16 mm opening, four-slot cell, and cylindrical connector benchmark is obsolete.',
    `- Measured runs: ${report.measuredRuns}; warm-up runs: ${report.warmupRuns}; timeout: ${report.sampleTimeoutMs} ms.`,
    '',
    '## Fixtures',
    '',
    '| Fixture | Variant | Grid | Screw mode | Connector | Row × column interval |',
    '| --- | --- | ---: | --- | --- | ---: |',
    ...report.fixtures.map(renderFixtureLine),
    '',
    '## Results',
    '',
    '| Fixture | Strategy | Samples | Total median/P95 | Profile | Prototype | Assembly/fuse | Mesh | Export |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...report.summaries.map(
      (summary) =>
        `| ${summary.fixtureId} | ${summary.strategy} | ${summary.samples} | ${summary.medianMs.toFixed(2)} / ${summary.p95Ms.toFixed(2)} | ${renderPhaseSummary(summary.phases.profileMs)} | ${renderPhaseSummary(summary.phases.prototypeBuildMs)} | ${renderPhaseSummary(summary.phases.assemblyFuseMs)} | ${renderPhaseSummary(summary.phases.meshMs)} | ${renderPhaseSummary(summary.phases.exportMs)} |`,
    ),
    '',
    '## Selected strategy',
    '',
    '| Variant | Selected | Fallbacks | Evidence |',
    '| --- | --- | --- | --- |',
  ]
  for (const variant of OPENGRID_BENCHMARK_VARIANTS) {
    const recommendation = report.recommendations[variant]
    lines.push(
      `| ${variant} | ${report.selectedStrategies[variant] ?? 'pending'} | ${recommendation.fallbackStrategies.join(' → ') || 'none'} | ${recommendation.evidence} |`,
    )
  }
  lines.push(
    '',
    '## Generator handoff',
    '',
    'The selected official-profile strategy is ready to wire into add-opengrid-generator only after the quality-approved fixture set is complete.',
    'The Worker integration must preserve Worker cancellation, latest-wins semantics, and stale-generation cleanup.',
    'The export gate covers STEP/STL export from the same quality-approved B-Rep.',
    '',
    '## Failures',
    '',
  )
  if (report.failures.length === 0) {
    lines.push('No failed samples were recorded.')
  } else {
    lines.push('| Fixture | Strategy | Run | Sample | Phase | Error |')
    lines.push('| --- | --- | --- | ---: | --- | --- |')
    for (const failure of report.failures) {
      lines.push(
        `| ${failure.fixtureId} | ${failure.strategy} | ${failure.kind} | ${failure.sample} | ${failure.phase} | ${failure.message.replaceAll('|', '\\|')} |`,
      )
    }
  }
  return `${lines.join('\n')}\n`
}
