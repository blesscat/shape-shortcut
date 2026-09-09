import { describe, expect, it, vi } from 'vitest'

// The parameter panels import the lattice cell-count core from the client
// bundle. If this module ever starts importing 'replicad', the native CAD
// kernel would ship to the main thread, so the import itself must fail here.
vi.mock('replicad', () => {
  throw new Error('REPLICAD_MUST_NOT_BE_BUNDLED_WITH_CELL_COUNTS')
})

import {
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type OpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'
import {
  estimateOpenGridStackableBoxHoneycombMemory,
  openGridStackableBoxHoneycombPanelCellCountFor,
} from '../../src/cad-kernel/lattice/opengrid-honeycomb-cells'

describe('honeycomb cells module bundle boundary', () => {
  it('imports without pulling in the replicad kernel', async () => {
    const cells =
      await import('../../src/cad-kernel/lattice/opengrid-honeycomb-cells')
    expect(typeof cells.openGridStackableBoxHoneycombCellCountFor).toBe(
      'function',
    )
    expect(typeof cells.openGridStackableCylinderHoneycombCellCountFor).toBe(
      'function',
    )
    expect(typeof cells.openGridOpenShelfHoneycombCellCountFor).toBe('function')
  })
})

describe('honeycomb stackable-box cell count bases', () => {
  const parameterSets: ReadonlyArray<OpenGridStackableBoxParameters> = [
    { ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS, honeycombMode: true },
    {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 1,
      y: 1,
      height: 30,
      thinShellMode: true,
      honeycombMode: true,
    },
    {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 2,
      y: 2,
      height: 20,
      openingPlusXDepth: 5,
      honeycombMode: true,
    },
    {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 3,
      y: 2,
      height: 25,
      openingPlusXDepth: 5,
      openingPlusYDepth: 5,
      cornerSeatMode: 'none',
      honeycombMode: true,
    },
  ]

  it('keeps the panel cut basis equal to the admission estimate basis', () => {
    for (const parameters of parameterSets) {
      expect(openGridStackableBoxHoneycombPanelCellCountFor(parameters)).toBe(
        estimateOpenGridStackableBoxHoneycombMemory(parameters).estimatedCells,
      )
    }
  })
})
