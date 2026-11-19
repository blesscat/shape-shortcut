#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const fullSuitePaths = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'scripts/test-groups.mjs',
  'vitest.config.ts',
])

const sharedCadPrefixes = [
  'src/cad-kernel/initialise/',
  'src/cad-kernel/mesh/',
  'src/cad-kernel/export/',
  'src/cad-kernel/lifetime/',
  'src/cad-kernel/transform/',
  'src/cad-kernel/model/',
  'src/cad-kernel/bottom-edge-fillet',
  'src/cad-kernel/boolean-progress',
  'src/workers/cad.worker.ts',
  'src/workers/error-mapping',
  'src/workers/error-rules/shared',
  'src/workers/mesh-progress',
  'vendor/replicad-opencascadejs/',
]

const componentAssetMappings = [
  {
    prefixes: ['src/cad-kernel/components/modular-grid-base/'],
    tests: [
      'tests/unit/modular-grid-base-asset.test.ts',
      'tests/unit/modular-grid-base-builder.test.ts',
      'tests/worker/modular-grid-base.integration.test.ts',
      'tests/worker/modular-grid-base-runtime.test.ts',
      'tests/worker/modular-grid-base-benchmark.test.ts',
    ],
  },
  {
    prefixes: ['src/cad-kernel/components/hsw-cell/'],
    tests: [
      'tests/unit/hsw-cell-asset.test.ts',
      'tests/unit/hsw-cell-builder.test.ts',
      'tests/worker/hsw-cell.integration.test.ts',
      'tests/worker/hsw-cell-runtime.test.ts',
      'tests/worker/hsw-cell-benchmark.test.ts',
    ],
  },
  {
    prefixes: ['src/cad-kernel/components/hexagonal-column/'],
    tests: [
      'tests/unit/hexagonal-column-asset.test.ts',
      'tests/worker/hexagonal-column.integration.test.ts',
      'tests/worker/hexagonal-column-runtime.test.ts',
      'tests/worker/hexagonal-column-benchmark.test.ts',
    ],
  },
  {
    prefixes: ['src/cad-kernel/components/opengrid/opengrid-'],
    tests: [
      'tests/worker/opengrid-builder.integration.test.ts',
      'tests/worker/opengrid-official-reference.test.ts',
      'tests/worker/opengrid-release-matrix.test.ts',
      'tests/worker/opengrid-release-benchmark.test.ts',
      'tests/worker/opengrid-hybrid.integration.test.ts',
      'tests/worker/opengrid-hybrid-region.integration.test.ts',
      'tests/worker/opengrid-everywhere.integration.test.ts',
      'tests/worker/opengrid-geometry-benchmark.test.ts',
      'tests/worker/opengrid-preview-benchmark.test.ts',
    ],
  },
  {
    prefixes: [
      'src/cad-kernel/components/opengrid-snap/assets/',
      'tests/fixtures/opengrid-snap/',
      'public/downloads/snap-',
    ],
    tests: [
      'tests/unit/opengrid-snap-profile.test.ts',
      'tests/unit/opengrid-snap-footprint.test.ts',
      'tests/unit/opengrid-snap-contract.test.ts',
      'tests/worker/cad-general-transform.integration.test.ts',
      'tests/worker/opengrid-snap-builder.integration.test.ts',
      'tests/worker/opengrid-snap-footprint-matrix.test.ts',
      'tests/worker/opengrid-boundary-characterization.test.ts',
      'tests/worker/opengrid-stackable-box.integration.test.ts',
    ],
  },
  {
    prefixes: ['src/cad-kernel/components/opengrid-snap-remover/'],
    tests: [
      'tests/unit/opengrid-snap-remover-asset.test.ts',
      'tests/unit/opengrid-snap-remover-builder.test.ts',
      'tests/unit/opengrid-snap-remover-contract.test.ts',
      'tests/worker/opengrid-snap-remover.integration.test.ts',
      'tests/worker/opengrid-snap-remover-runtime.test.ts',
    ],
  },
  {
    prefixes: ['src/cad-kernel/components/opengrid-locating-assembly/assets/'],
    tests: [
      'tests/unit/opengrid-locating-assembly.test.ts',
      'tests/unit/opengrid-pillar.test.ts',
      'tests/unit/opengrid-organizer-box.test.ts',
      'tests/worker/opengrid-pillar.integration.test.ts',
      'tests/worker/opengrid-organizer-box.integration.test.ts',
      'tests/worker/opengrid-detachable-corner-seat.integration.test.ts',
    ],
  },
]

function normalizePath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//, '')
}

export function parseNameStatus(output) {
  const fields = output.split('\0')
  const changes = []
  let index = 0

  while (index < fields.length) {
    const rawStatus = fields[index]
    index += 1
    if (!rawStatus) continue

    const status = rawStatus[0]
    if (status === 'R' || status === 'C') {
      const oldPath = fields[index]
      const path = fields[index + 1]
      index += 2
      if (!oldPath || !path) continue
      changes.push({
        status,
        path: normalizePath(path),
        oldPath: normalizePath(oldPath),
      })
      continue
    }

    const path = fields[index]
    index += 1
    if (!path) continue
    changes.push({ status, path: normalizePath(path) })
  }

  return changes
}

function parseUntrackedPaths(output) {
  return output
    .split('\0')
    .filter(Boolean)
    .map((path) => ({ status: 'A', path: normalizePath(path) }))
}

function changePriority(change) {
  if (change.status === 'R' || change.status === 'C') return 3
  if (change.status === 'D') return 2
  if (change.status === 'A') return 1
  return 0
}

export function mergeChanges(...changeGroups) {
  const changesByPath = new Map()

  for (const change of changeGroups.flat()) {
    const normalizedChange = {
      ...change,
      path: normalizePath(change.path),
    }
    if (change.oldPath) {
      normalizedChange.oldPath = normalizePath(change.oldPath)
    }

    const previous = changesByPath.get(normalizedChange.path)
    if (
      !previous ||
      changePriority(normalizedChange) > changePriority(previous)
    ) {
      changesByPath.set(normalizedChange.path, normalizedChange)
    }
  }

  return [...changesByPath.values()]
}

function runRepositoryGit(args) {
  return execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })
}

export function collectWorkingTreeChanges(runGit = runRepositoryGit) {
  const unstaged = parseNameStatus(runGit(['diff', '--name-status', '-z']))
  const staged = parseNameStatus(
    runGit(['diff', '--cached', '--name-status', '-z']),
  )
  const untracked = parseUntrackedPaths(
    runGit(['ls-files', '--others', '--exclude-standard', '-z']),
  )

  return mergeChanges(unstaged, staged, untracked)
}

export function collectBranchChanges(runGit = runRepositoryGit, base = 'main') {
  const mergeBase = runGit(['merge-base', base, 'HEAD']).trim()
  if (!mergeBase) {
    throw new Error(`Git did not return a merge base for ${base}`)
  }

  const branchChanges = parseNameStatus(
    runGit(['diff', '--name-status', '-z', mergeBase]),
  )
  const untracked = parseUntrackedPaths(
    runGit(['ls-files', '--others', '--exclude-standard', '-z']),
  )

  return mergeChanges(branchChanges, untracked)
}

function changedPathsFor(changes) {
  const paths = []
  for (const change of changes) {
    if (change.oldPath) paths.push(normalizePath(change.oldPath))
    paths.push(normalizePath(change.path))
  }
  return [...new Set(paths)]
}

function isCadPath(path) {
  return (
    path.startsWith('src/cad-kernel/') ||
    path.startsWith('src/workers/') ||
    path.startsWith('tests/worker/') ||
    path.startsWith('tests/fixtures/') ||
    path.startsWith('vendor/replicad-opencascadejs/') ||
    /\.(?:brep|step|stp|wasm)$/i.test(path)
  )
}

function isSharedCadPath(path) {
  if (path.endsWith('.wasm')) return true
  return sharedCadPrefixes.some((prefix) => path.startsWith(prefix))
}

function mappedTestsFor(path) {
  const mapping = componentAssetMappings.find(({ prefixes }) =>
    prefixes.some((prefix) => path.startsWith(prefix)),
  )
  if (!mapping) return []
  return mapping.tests
}

function createPlan(kind, changedPaths, relatedPaths, mappedTests, reasons) {
  return { kind, changedPaths, relatedPaths, mappedTests, reasons }
}

export function createExecutionPlan(changes) {
  const changedPaths = changedPathsFor(changes)
  if (changedPaths.length === 0) {
    return createPlan('none', [], [], [], [])
  }

  if (changedPaths.some((path) => fullSuitePaths.has(path))) {
    return createPlan(
      'all-tests',
      changedPaths,
      changedPaths,
      [],
      ['test infrastructure changed'],
    )
  }

  const mappedTests = [
    ...new Set(changedPaths.flatMap((path) => mappedTestsFor(path))),
  ]

  const hasAmbiguousCadChange = changes.some((change) => {
    if (change.status !== 'D' && change.status !== 'R') return false
    return changedPathsFor([change]).some(isCadPath)
  })
  if (hasAmbiguousCadChange) {
    return createPlan('all-cad', changedPaths, changedPaths, mappedTests, [
      'ambiguous CAD path changed',
    ])
  }

  if (changedPaths.some(isSharedCadPath)) {
    return createPlan('all-cad', changedPaths, changedPaths, mappedTests, [
      'shared CAD infrastructure changed',
    ])
  }

  const hasUnknownCadAsset = changedPaths.some(
    (path) =>
      /\.(?:brep|step|stp)$/i.test(path) && mappedTestsFor(path).length === 0,
  )
  if (hasUnknownCadAsset) {
    return createPlan(
      'all-cad',
      changedPaths,
      changedPaths,
      [],
      ['unmapped CAD asset changed'],
    )
  }

  return createPlan('related', changedPaths, changedPaths, mappedTests, [])
}

function parseArguments(argv) {
  const mode = argv[0] ?? 'changed'
  if (mode !== 'changed' && mode !== 'branch') {
    throw new Error(`Unknown affected-test mode: ${mode}`)
  }

  let base = 'main'
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--base') {
      const value = argv[index + 1]
      if (!value) throw new Error('--base requires a Git ref')
      base = value
      index += 1
      continue
    }
    if (argument.startsWith('--base=')) {
      base = argument.slice('--base='.length)
      if (!base) throw new Error('--base requires a Git ref')
      continue
    }
    throw new Error(`Unknown affected-test argument: ${argument}`)
  }

  return { mode, base }
}

function printPlan(plan) {
  console.log('[affected-tests] changed paths:')
  for (const path of plan.changedPaths) console.log(`  - ${path}`)
  if (plan.changedPaths.length === 0) console.log('  (none)')
  console.log(`[affected-tests] mode: ${plan.kind}`)
  for (const reason of plan.reasons) {
    console.log(`[affected-tests] reason: ${reason}`)
  }
  if (plan.mappedTests.length > 0) {
    console.log('[affected-tests] mapped tests:')
    for (const path of plan.mappedTests) console.log(`  - ${path}`)
  }
}

function existingRelatedPaths(plan) {
  const candidates = [...plan.relatedPaths, ...plan.mappedTests]
  return [...new Set(candidates)].filter((path) =>
    existsSync(resolve(repositoryRoot, path)),
  )
}

function runVitest(args) {
  const result = spawnSync('pnpm', ['exec', 'vitest', ...args], {
    cwd: repositoryRoot,
    env: process.env,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function executePlan(plan) {
  if (plan.kind === 'none') {
    console.log('[affected-tests] no tests selected')
    return
  }
  if (plan.kind === 'all-tests') {
    runVitest(['run'])
    return
  }

  const relatedPaths = existingRelatedPaths(plan)
  if (plan.kind === 'all-cad') {
    if (relatedPaths.length > 0) {
      runVitest([
        'related',
        '--run',
        '--passWithNoTests',
        '--project',
        'fast',
        ...relatedPaths,
      ])
    }
    runVitest(['run', '--project', 'cad'])
    return
  }

  if (relatedPaths.length === 0) {
    console.log('[affected-tests] no existing paths can select a test')
    return
  }
  runVitest(['related', '--run', '--passWithNoTests', ...relatedPaths])
}

function main() {
  const { mode, base } = parseArguments(process.argv.slice(2))
  let changes
  if (mode === 'branch') {
    changes = collectBranchChanges(runRepositoryGit, base)
  } else {
    changes = collectWorkingTreeChanges(runRepositoryGit)
  }
  const plan = createExecutionPlan(changes)
  printPlan(plan)
  executePlan(plan)
}

const isDirectExecution =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (isDirectExecution) main()
