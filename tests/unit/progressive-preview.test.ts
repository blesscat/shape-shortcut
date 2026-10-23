import {
  openGridOpenConnectOrganizerLayoutFor,
  type OpenGridOpenConnectOrganizerParameters,
} from '../../src/cad-contract/units/opengrid-openconnect-organizer'
import {
  openGridDividerPlanBoundsFor,
  type OpenGridDividerParameters,
} from '../../src/cad-contract/units/opengrid-divider'
import { modelDefinitions } from '../../src/features/cad/model-catalog'
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
    expect(new Float32Array(honeycomb.positions)).toEqual(
      new Float32Array(plain.positions),
    )
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

  it('rejects invalid inputs', () => {
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
    ).not.toBeNull()
  })
})

describe('provisional lifecycle', () => {
  it.each(modelDefinitions.map((definition) => definition.id))(
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
    expect(select(initialCadState('box'))!.simplified).toBe('pending')
  })
})

describe('catalog preview contract', () => {
  it.each(modelDefinitions)(
    '$id produces finite nonempty geometry from validated defaults and presets',
    (definition) => {
      const inputs = [
        definition.defaultParameters,
        ...(definition.presets ?? []).map((preset) => ({
          ...definition.defaultParameters,
          ...preset.overrides,
        })),
      ]
      for (const input of inputs) {
        const mesh = createSimplifiedMesh(definition.id, input)!
        expect(mesh).not.toBeNull()
        expect(mesh.triangleCount).toBeGreaterThan(0)
        expect(mesh.triangleCount).toBeLessThan(100_000)
        expect(
          [...new Float32Array(mesh.positions)].every(Number.isFinite),
        ).toBe(true)
        expect([...new Float32Array(mesh.normals)].every(Number.isFinite)).toBe(
          true,
        )
        expect(new Uint32Array(mesh.indices).length).toBe(
          mesh.triangleCount * 3,
        )
        for (let axis = 0; axis < 3; axis++)
          expect(mesh.bounds.max[axis]).toBeGreaterThan(mesh.bounds.min[axis])
      }
      expect(createSimplifiedMesh(definition.id, null as never)).toBeNull()
    },
  )

  it('keeps modular and honeycomb cell openings and repeats each cell', () => {
    for (const id of ['modular-grid-base', 'hsw-cell'] as const) {
      const one = createSimplifiedMesh(id, { rows: 1, columns: 1 })!
      const many = createSimplifiedMesh(id, { rows: 2, columns: 3 })!
      expect(verticalHits(one)).toEqual([])
      expect(many.triangleCount).toBe(one.triangleCount * 6)
      expect(many.bounds.max[0]).toBeGreaterThan(one.bounds.max[0])
    }
  })

  it('orients and separates repeated hexagonal columns', () => {
    const p = { height: 40, count: 3, gap: 5, orientation: 'standing' as const }
    const standing = createSimplifiedMesh('hexagonal-column', p)!
    const lying = createSimplifiedMesh('hexagonal-column', {
      ...p,
      orientation: 'lying',
    })!
    expect(standing.bounds.max[2]).toBeCloseTo(p.height)
    expect(lying.bounds.max[0] - lying.bounds.min[0]).toBeCloseTo(p.height)
    expect(lying.bounds.max[2]).toBeLessThan(standing.bounds.max[2])
    expect(lying.triangleCount).toBe(standing.triangleCount)
    expect(verticalHits(standing, 0, 4)).toEqual([])
  })

  it('shows wall-cover pieces with gaps while omitting text geometry', () => {
    const definition = modelDefinitions.find(
      (d) => d.id === 'opengrid-wall-cover',
    )!
    const a = createSimplifiedMesh(definition.id, {
      ...definition.defaultParameters,
      text: 'A',
    })!
    const ab = createSimplifiedMesh(definition.id, {
      ...definition.defaultParameters,
      text: 'AB',
    })!
    expect(ab.triangleCount).toBe(2 * a.triangleCount)
    expect(verticalHits(ab)).toEqual([])
  })

  it('keeps the tissue dispensing slot open and the container hollow', () => {
    const definition = modelDefinitions.find(
      (d) => d.id === 'opengrid-openconnect-tissue-box',
    )!
    const mesh = createSimplifiedMesh(
      definition.id,
      definition.defaultParameters,
    )!
    const p = definition.defaultParameters as {
      y: number
      wallThickness: number
      bottomThickness: number
      slotWidth: number
    }
    const center = (p.y + 2 * p.wallThickness) / 2
    expect(verticalHits(mesh, 0, center)).toEqual([])
    expect(
      Math.max(...verticalHits(mesh, 0, center + p.slotWidth)),
    ).toBeCloseTo(p.bottomThickness)
  })
})

describe('additional component shapes', () => {
  it('keeps OpenConnect organizer cavities at their print-frame positions', () => {
    const d = modelDefinitions.find(
      (d) => d.id === 'opengrid-openconnect-organizer',
    )!
    for (const holeShape of OPENGRID_ORGANIZER_BOX_SHAPES) {
      const p = {
        ...d.defaultParameters,
        holeShape,
        holeCountX: 3,
        holeCountY: 2,
      } as OpenGridOpenConnectOrganizerParameters
      const l = openGridOpenConnectOrganizerLayoutFor(p)
      const mesh = createSimplifiedMesh(d.id, p)!
      for (const [x, y] of l.cavityCenters)
        expect(
          Math.max(...verticalHits(mesh, x, y - l.bodyDepth / 2)),
        ).toBeCloseTo(p.bottomThickness)
      expect(
        Math.max(
          ...verticalHits(mesh, l.bodyWidth / 2 - 0.5, -l.bodyDepth / 2),
        ),
      ).toBeCloseTo(l.bodyThickness)
    }
  })

  it('centers asymmetric divider arms and retains empty quadrants', () => {
    const d = modelDefinitions.find((d) => d.id === 'opengrid-divider')!
    const p = {
      ...d.defaultParameters,
      left: 0,
      right: 3,
      up: 2,
      down: 0,
    } as OpenGridDividerParameters
    const plan = openGridDividerPlanBoundsFor(p)
    const mesh = createSimplifiedMesh(d.id, p)!
    expect(mesh.bounds.min[0] + mesh.bounds.max[0]).toBeCloseTo(0)
    expect(mesh.bounds.min[1] + mesh.bounds.max[1]).toBeCloseTo(0)
    expect(mesh.bounds.max[0] - mesh.bounds.min[0]).toBeCloseTo(
      plan.maxX - plan.minX,
    )
    expect(
      verticalHits(mesh, mesh.bounds.max[0] - 2, mesh.bounds.max[1] - 2),
    ).toEqual([])
  })

  it('adds shelf compartments and reacts to its slope', () => {
    const d = modelDefinitions.find((d) => d.id === 'opengrid-open-shelf')!
    const simple = createSimplifiedMesh(d.id, {
      ...d.defaultParameters,
      cellX: 1,
      cellZ: 1,
      angle: 0,
    })!
    const divided = createSimplifiedMesh(d.id, {
      ...d.defaultParameters,
      cellX: 3,
      cellZ: 3,
      angle: 0,
    })!
    const sloped = createSimplifiedMesh(d.id, {
      ...d.defaultParameters,
      cellX: 3,
      cellZ: 3,
      angle: 15,
    })!
    expect(divided.triangleCount).toBeGreaterThan(simple.triangleCount)
    expect(new Float32Array(sloped.positions)).not.toEqual(
      new Float32Array(divided.positions),
    )
    const front = Math.max(...verticalHits(sloped, 0, sloped.bounds.min[1] + 1))
    const rear = Math.max(...verticalHits(sloped, 0, sloped.bounds.max[1] - 1))
    expect(front).toBeGreaterThan(rear)
  })
})

it('reflects divider wall thickness above the wider locating base', () => {
  const definition = modelDefinitions.find((d) => d.id === 'opengrid-divider')!
  const parameters = {
    ...definition.defaultParameters,
    left: 2,
    right: 2,
    up: 0,
    down: 0,
    height: 40,
    wallThickness: 1,
  }
  const thin = createSimplifiedMesh(definition.id, parameters)!
  const thick = createSimplifiedMesh(definition.id, {
    ...parameters,
    wallThickness: 3,
  })!
  // Offset from the central peg; this ray hits the base of the thin wall,
  // but the top of the thicker wall at the same planar location.
  expect(Math.max(...verticalHits(thin, 10, 1))).toBeLessThan(parameters.height)
  expect(Math.max(...verticalHits(thick, 10, 1))).toBeCloseTo(parameters.height)
  expect(thin.bounds).toEqual(thick.bounds)
})
