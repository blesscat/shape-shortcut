import { expect, it } from 'vitest'
import { modelDefinitions } from '../../src/features/cad/model-catalog'
import { createSimplifiedMesh } from '../../src/features/cad/progressive-preview/geometry'

it.each(modelDefinitions)(
  '$id preview stays finite and inside its envelope for defaults, presets and valid field extrema',
  (definition) => {
    const candidates = [
      definition.defaultParameters,
      ...(definition.presets ?? []).map((preset) => ({
        ...definition.defaultParameters,
        ...preset.overrides,
      })),
      ...definition.parameterSchema.flatMap((field) =>
        [field.min, field.max].map((value) => ({
          ...definition.defaultParameters,
          [field.key]: value,
        })),
      ),
    ]
    let checked = 0
    for (const candidate of candidates) {
      const validation = definition.validateParameters(candidate)
      // Individual field extrema can violate dependent-field constraints.
      if (!validation.valid) continue
      const bounds = definition.boundsForParameters(validation.value.parameters)
      const mesh = createSimplifiedMesh(
        definition.id,
        validation.value.parameters,
      )!
      expect(mesh).not.toBeNull()
      expect(mesh.triangleCount).toBeGreaterThan(0)
      expect([...new Float32Array(mesh.positions)].every(Number.isFinite)).toBe(
        true,
      )
      expect([...new Float32Array(mesh.normals)].every(Number.isFinite)).toBe(
        true,
      )
      for (let axis = 0; axis < 3; axis++) {
        const context = `${definition.id} axis ${axis}: ${JSON.stringify(validation.value.parameters)}`
        expect(mesh.bounds.min[axis], context).toBeGreaterThanOrEqual(
          bounds.min[axis] - 0.02,
        )
        expect(mesh.bounds.max[axis], context).toBeLessThanOrEqual(
          bounds.max[axis] + 0.02,
        )
      }
      checked++
    }
    expect(checked).toBeGreaterThan(0)
  },
)
