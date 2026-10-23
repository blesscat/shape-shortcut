import { describe, expect, it } from 'vitest'
import { Mesh, MeshBasicMaterial, Raycaster, Vector3, DoubleSide } from 'three'
import { createSimplifiedMesh } from '../../src/features/cad/progressive-preview/geometry'
import { createPreviewDisplaySelector } from '../../src/features/cad/progressive-preview/display'
import { createViewportBaseGeometry } from '../../src/features/cad/viewport/base-geometry'
import { initialCadState, cadReducer } from '../../src/features/cad/state'
import {
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS as box,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS as cylinder,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS as organizer,
  type ModelId,
} from '../../src/cad-contract/units'
import {
  nominalOpenGridStackableBoxFootprintFor,
  externalOpenGridStackableBoxHeightFor,
} from '../../src/cad-contract/units/opengrid-stackable-box'
import {
  openGridOrganizerBoxLayoutFor,
  OPENGRID_ORGANIZER_BOX_SHAPES,
} from '../../src/cad-contract/units/opengrid-organizer-box'
import type { MeshSnapshot } from '../../src/cad-contract/messages'

function verticalHits(snapshot: MeshSnapshot, x = 0, y = 0): number[] {
  const geometry = createViewportBaseGeometry(snapshot)
  const material = new MeshBasicMaterial({ side: DoubleSide })
  try {
    const object = new Mesh(geometry, material)
    object.updateMatrixWorld()
    return new Raycaster(
      new Vector3(x, y, snapshot.bounds.max[2] + 10),
      new Vector3(0, 0, -1),
    )
      .intersectObject(object)
      .map((hit) => hit.point.z)
  } finally {
    geometry.dispose()
    material.dispose()
  }
}

describe('simplified display geometry', () => {
  it('represents box footprint and height with an open top and optional floor', () => {
    const p = { ...box, x: 3, y: 2, height: 60 }
    const mesh = createSimplifiedMesh('opengrid-stackable-box', p)!
    const [width, depth] = nominalOpenGridStackableBoxFootprintFor(p)
    expect(mesh.bounds.max[0] - mesh.bounds.min[0]).toBeCloseTo(width, 4)
    expect(mesh.bounds.max[1] - mesh.bounds.min[1]).toBeCloseTo(depth, 4)
    expect(mesh.bounds.max[2]).toBeCloseTo(
      externalOpenGridStackableBoxHeightFor(p),
      4,
    )
    const hits = verticalHits(mesh)
    expect(hits.length).toBeGreaterThan(0)
    expect(Math.max(...hits)).toBeLessThan(p.height)
    const open = createSimplifiedMesh('opengrid-stackable-box', {
      ...p,
      bottomMode: 'none',
    })!
    expect(verticalHits(open)).toEqual([])
    expect(verticalHits(open, width / 2 - 0.5)).not.toEqual([])
  })

  it('keeps a cylinder hollow and preserves the requested inner diameter and height', () => {
    const p = { ...cylinder, innerDiameter: 80, height: 60 }
    const mesh = createSimplifiedMesh('opengrid-stackable-cylinder', p)!
    expect(mesh.bounds.max[2]).toBeCloseTo(p.height)
    expect(Math.max(...verticalHits(mesh))).toBeLessThan(p.height)
    expect(
      Math.max(...verticalHits(mesh, p.innerDiameter / 2 - 1)),
    ).toBeLessThan(p.height)
    expect(
      Math.max(...verticalHits(mesh, p.innerDiameter / 2 + 0.5)),
    ).toBeCloseTo(p.height)
  })

  it.each(OPENGRID_ORGANIZER_BOX_SHAPES)(
    'shows every %s organizer cavity at its contract center',
    (holeShape) => {
      const p = { ...organizer, holeShape, holeCountX: 3, holeCountY: 2 }
      const layout = openGridOrganizerBoxLayoutFor(p)
      const mesh = createSimplifiedMesh('opengrid-organizer-box', p)!
      expect(mesh.bounds.max[0] * 2).toBeCloseTo(layout.footprint[0], 4)
      expect(mesh.bounds.max[2]).toBeCloseTo(layout.bodyHeight, 4)
      for (const [x, y] of layout.cavityCenters) {
        const highestHit = Math.max(...verticalHits(mesh, x, y))
        expect(highestHit).toBeCloseTo(
          layout.interfaceFloorDatum + p.bottomThickness,
          4,
        )
      }
      expect(
        Math.max(...verticalHits(mesh, layout.footprint[0] / 2 - 0.5)),
      ).toBeCloseTo(layout.bodyHeight, 4)
    },
  )

  it('bounds display detail independently of honeycomb complexity', () => {
    const plain = createSimplifiedMesh('opengrid-stackable-box', {
      ...box,
      x: 7,
      y: 7,
      height: 100,
    })!
    const honeycomb = createSimplifiedMesh('opengrid-stackable-box', {
      ...box,
      x: 7,
      y: 7,
      height: 100,
      honeycombMode: true,
    })!
    expect(honeycomb.triangleCount).toBe(plain.triangleCount)
    expect(honeycomb.positions).toEqual(plain.positions)
    const large = createSimplifiedMesh('opengrid-organizer-box', {
      ...organizer,
      holeCountX: 10,
      holeCountY: 10,
    })!
    expect(large.triangleCount).toBeGreaterThan(plain.triangleCount)
    expect([...new Float32Array(large.positions)].every(Number.isFinite)).toBe(
      true,
    )
    expect(new Uint32Array(large.indices).length).toBe(large.triangleCount * 3)
  })

  it('rejects invalid inputs and leaves unsupported models alone', () => {
    expect(
      createSimplifiedMesh('opengrid-stackable-box', { ...box, height: NaN }),
    ).toBeNull()
    expect(
      createSimplifiedMesh('opengrid-stackable-cylinder', {
        ...cylinder,
        innerDiameter: -1,
      }),
    ).toBeNull()
    expect(
      createSimplifiedMesh('opengrid-organizer-box', {
        ...organizer,
        holeCountX: 100000,
      }),
    ).toBeNull()
    expect(
      createSimplifiedMesh('box', { width: 20, depth: 30, height: 40 }),
    ).toBeNull()
  })
})

describe('provisional lifecycle', () => {
  it.each([
    'opengrid-stackable-box',
    'opengrid-stackable-cylinder',
    'opengrid-organizer-box',
  ] as ModelId[])(
    'shows %s before engine readiness and caches progress updates',
    (modelId) => {
      const state = initialCadState(modelId)
      const select = createPreviewDisplaySelector()
      const first = select(state)!
      expect(first.simplified).toBe('pending')
      expect(first.parameters).toBeNull()
      expect(select({ ...state, status: 'loading-engine' })!.mesh).toBe(
        first.mesh,
      )
      expect(state.committed).toBeNull()
      expect(state.exportStatus).toBe('disabled')
    },
  )

  it('updates valid inputs, retains invalid/failed previews and resumes exact display only on commit', () => {
    const select = createPreviewDisplaySelector()
    let state = initialCadState('opengrid-stackable-box')
    const first = select(state)!
    state = cadReducer(state, {
      type: 'input-valid',
      modelId: state.modelId,
      input: { ...box, height: 80 },
      generation: 1,
    })
    const edited = select(state)!
    expect(edited.mesh.bounds.max[2]).toBeGreaterThan(first.mesh.bounds.max[2])
    expect(select({ ...state, status: 'invalid-input' })!.mesh).toBe(
      edited.mesh,
    )
    expect(select(state, true)!.simplified).toBe('invalid')
    expect(select({ ...state, status: 'recoverable-error' })!.simplified).toBe(
      'failed',
    )
    expect(select({ ...state, status: 'loading-engine' })!.mesh).toBe(
      edited.mesh,
    )
    const committed = {
      revision: 'exact',
      workerEpoch: 'epoch',
      generation: state.generation,
      modelId: state.modelId,
      parameters: state.input,
      mesh: edited.mesh,
    }
    state = cadReducer(state, { type: 'model-ready', model: committed })
    expect(select(state)).toMatchObject({
      revision: 'exact',
      simplified: null,
      parameters: state.input,
    })
    state = cadReducer(state, {
      type: 'input-valid',
      modelId: state.modelId,
      input: { ...box, height: 100 },
      generation: 2,
    })
    expect(select(state)!.simplified).toBe('pending')
    expect(state.committed).toBe(committed)
    expect(state.exportStatus).toBe('disabled')
  })

  it('does not reuse one model preview for another or create geometry from invalid first input', () => {
    const select = createPreviewDisplaySelector()
    select(initialCadState('opengrid-stackable-box'))
    expect(
      select({
        ...initialCadState('opengrid-stackable-cylinder'),
        status: 'invalid-input',
      }),
    ).toBeNull()
    expect(select(initialCadState('box'))).toBeNull()
  })
})
