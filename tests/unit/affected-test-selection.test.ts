import { describe, expect, it, vi } from 'vitest'

import {
  collectBranchChanges,
  collectWorkingTreeChanges,
  createExecutionPlan,
  mergeChanges,
  parseNameStatus,
} from '../../scripts/affected-tests.mjs'

describe('affected-test Git change collection', () => {
  it('parses modifications, deletions, and both sides of a rename', () => {
    const changes = parseNameStatus(
      'M\0src/plain.ts\0D\0src/deleted.ts\0R097\0src/old.step\0src/new.step\0',
    )

    expect(changes).toEqual([
      { status: 'M', path: 'src/plain.ts' },
      { status: 'D', path: 'src/deleted.ts' },
      {
        status: 'R',
        path: 'src/new.step',
        oldPath: 'src/old.step',
      },
    ])
  })

  it('merges staged, unstaged, and untracked records without duplicate paths', () => {
    const changes = mergeChanges(
      parseNameStatus('M\0src/shared.ts\0'),
      parseNameStatus('M\0src/shared.ts\0A\0src/staged.ts\0'),
      [
        { status: 'A', path: 'src/untracked.ts' },
        { status: 'A', path: 'src/untracked.ts' },
      ],
    )

    expect(changes).toEqual([
      { status: 'M', path: 'src/shared.ts' },
      { status: 'A', path: 'src/staged.ts' },
      { status: 'A', path: 'src/untracked.ts' },
    ])
  })

  it('collects unstaged, staged, and untracked working-tree files', () => {
    const runGit = vi.fn((args: string[]) => {
      const command = args.join(' ')
      if (command === 'diff --name-status -z') return 'M\0src/unstaged.ts\0'
      if (command === 'diff --cached --name-status -z')
        return 'A\0src/staged.ts\0'
      if (command === 'ls-files --others --exclude-standard -z') {
        return 'src/untracked.ts\0'
      }
      throw new Error(`Unexpected Git command: ${command}`)
    })

    expect(collectWorkingTreeChanges(runGit)).toEqual([
      { status: 'M', path: 'src/unstaged.ts' },
      { status: 'A', path: 'src/staged.ts' },
      { status: 'A', path: 'src/untracked.ts' },
    ])
  })

  it('collects committed and local branch changes from the requested merge base', () => {
    const runGit = vi.fn((args: string[]) => {
      const command = args.join(' ')
      if (command === 'merge-base release HEAD') return 'abc123\n'
      if (command === 'diff --name-status -z abc123') {
        return 'M\0src/committed.ts\0A\0src/local.ts\0'
      }
      if (command === 'ls-files --others --exclude-standard -z') {
        return 'tests/unit/new.test.ts\0'
      }
      throw new Error(`Unexpected Git command: ${command}`)
    })

    expect(collectBranchChanges(runGit, 'release')).toEqual([
      { status: 'M', path: 'src/committed.ts' },
      { status: 'A', path: 'src/local.ts' },
      { status: 'A', path: 'tests/unit/new.test.ts' },
    ])
  })
})

describe('affected-test execution planning', () => {
  it('returns no commands when there are no changes', () => {
    expect(createExecutionPlan([])).toEqual({
      kind: 'none',
      changedPaths: [],
      relatedPaths: [],
      mappedTests: [],
      reasons: [],
    })
  })

  it('uses static dependency selection for an ordinary source change', () => {
    expect(
      createExecutionPlan([{ status: 'M', path: 'src/lib/units.ts' }]),
    ).toMatchObject({
      kind: 'related',
      relatedPaths: ['src/lib/units.ts'],
      mappedTests: [],
    })
  })

  it('maps a component STEP asset to focused component tests', () => {
    const plan = createExecutionPlan([
      {
        status: 'M',
        path: 'src/cad-kernel/components/hsw-cell/hsw-cell.step',
      },
    ])

    expect(plan.kind).toBe('related')
    expect(plan.mappedTests).toContain('tests/unit/hsw-cell-asset.test.ts')
    expect(plan.mappedTests).toContain(
      'tests/worker/hsw-cell.integration.test.ts',
    )
    expect(plan.mappedTests).not.toContain(
      'tests/worker/hexagonal-column.integration.test.ts',
    )
  })

  it.each([
    {
      asset:
        'src/cad-kernel/components/opengrid-snap/assets/opengrid-bare-standard-lite-snap.step',
      dependentTest: 'tests/worker/cad-general-transform.integration.test.ts',
    },
    {
      asset: 'src/cad-kernel/components/opengrid/opengrid-heavy-cell.step',
      dependentTest: 'tests/worker/opengrid-hybrid-region.integration.test.ts',
    },
  ])(
    'includes the path-loaded dependency $dependentTest for $asset',
    ({ asset, dependentTest }) => {
      const plan = createExecutionPlan([{ status: 'M', path: asset }])

      expect(plan.kind).toBe('related')
      expect(plan.mappedTests).toContain(dependentTest)
    },
  )

  it('runs every CAD test for shared CAD infrastructure', () => {
    for (const path of [
      'src/cad-kernel/mesh/index.ts',
      'src/cad-kernel/model/index.ts',
      'src/workers/cad.worker.ts',
    ]) {
      const plan = createExecutionPlan([{ status: 'M', path }])

      expect(plan.kind).toBe('all-cad')
      expect(plan.reasons).toContain('shared CAD infrastructure changed')
    }
  })

  it('runs every CAD test for the shared Worker error mapping module', () => {
    const plan = createExecutionPlan([
      { status: 'M', path: 'src/workers/error-mapping.ts' },
    ])

    expect(plan.kind).toBe('all-cad')
    expect(plan.reasons).toContain('shared CAD infrastructure changed')
  })

  it('runs every CAD test for the shared Worker error rule module', () => {
    const plan = createExecutionPlan([
      { status: 'M', path: 'src/workers/error-rules/shared.ts' },
    ])

    expect(plan.kind).toBe('all-cad')
    expect(plan.reasons).toContain('shared CAD infrastructure changed')
  })

  it('keeps per-component definition and error rule files on related-test selection', () => {
    for (const path of [
      'src/cad-kernel/components/box/definition.ts',
      'src/cad-kernel/components/opengrid-snap/definition.ts',
      'src/workers/error-rules/box.ts',
      'src/workers/error-rules/opengrid-snap.ts',
    ]) {
      const plan = createExecutionPlan([{ status: 'M', path }])

      expect(plan.kind).toBe('related')
      expect(plan.reasons).toEqual([])
    }
  })

  it('keeps extracted Worker modules on related-test selection', () => {
    for (const path of [
      'src/workers/cad-worker-assets.ts',
      'src/workers/cad-worker-generation.ts',
      'src/workers/cad-worker-lifecycle.ts',
      'src/workers/cad-worker-export.ts',
    ]) {
      const plan = createExecutionPlan([{ status: 'M', path }])

      expect(plan.kind).toBe('related')
      expect(plan.reasons).toEqual([])
    }
  })

  it('keeps focused asset mappings when another change selects all CAD tests', () => {
    const plan = createExecutionPlan([
      { status: 'M', path: 'src/cad-kernel/mesh/index.ts' },
      {
        status: 'M',
        path: 'src/cad-kernel/components/hsw-cell/hsw-cell.step',
      },
    ])

    expect(plan.kind).toBe('all-cad')
    expect(plan.mappedTests).toContain('tests/unit/hsw-cell-builder.test.ts')
  })

  it('runs every CAD test for an ambiguous CAD deletion or rename', () => {
    const deleted = createExecutionPlan([
      {
        status: 'D',
        path: 'src/cad-kernel/components/unknown/shape.step',
      },
    ])
    const renamed = createExecutionPlan([
      {
        status: 'R',
        oldPath: 'src/cad-kernel/components/old/model.step',
        path: 'src/cad-kernel/components/new/model.step',
      },
    ])

    expect(deleted.kind).toBe('all-cad')
    expect(renamed.kind).toBe('all-cad')
    expect(deleted.reasons).toContain('ambiguous CAD path changed')
    expect(renamed.reasons).toContain('ambiguous CAD path changed')
  })

  it.each([
    'package.json',
    'pnpm-lock.yaml',
    'vitest.config.ts',
    'scripts/test-groups.mjs',
  ])('runs the full suite when %s changes', (path) => {
    expect(createExecutionPlan([{ status: 'M', path }]).kind).toBe('all-tests')
  })
})
