import { describe, expect, it } from 'vitest'
import * as THREE from 'three'

import { createBoardSurfaceGroup } from '../../src/features/cad/viewport/board-parts'

describe('planning surface (Part D v2 board tokens)', () => {
  it('builds a face plate and a rim outline, nothing else', () => {
    const group = createBoardSurfaceGroup(40, 20, {
      boardFace: '#efe6dc',
      boardEdge: '#3b2b24',
    })

    expect(group.children).toHaveLength(2)
    const [face, outline] = group.children

    expect(face).toBeInstanceOf(THREE.Mesh)
    const faceMaterial = (face as THREE.Mesh)
      .material as THREE.MeshStandardMaterial
    expect(faceMaterial.color.getHexString()).toBe('efe6dc')
    // The face sits under the grid lines, which ride at local y = 0.
    expect(face.position.y).toBeLessThan(0)

    expect(outline).toBeInstanceOf(THREE.LineLoop)
    const outlineMaterial = (outline as THREE.LineLoop)
      .material as THREE.LineBasicMaterial
    expect(outlineMaterial.color.getHexString()).toBe('3b2b24')
    // The outline floats just above the lines so it never z-fights; its
    // offset is baked into the ring vertices.
    const outlinePoints = (outline as THREE.LineLoop).geometry.getAttribute(
      'position',
    )
    expect(outlinePoints.getY(0)).toBeGreaterThan(0)
  })

  it('points the face normal up once the desktop grid rotation applies', () => {
    const group = createBoardSurfaceGroup(40, 20, {
      boardFace: '#efe6dc',
      boardEdge: '#3b2b24',
    })
    group.rotation.set(Math.PI / 2, 0, 0)
    group.updateMatrixWorld()

    const face = group.children[0] as THREE.Mesh
    const normals = face.geometry.getAttribute('normal')
    const normal = new THREE.Vector3()
      .fromBufferAttribute(normals, 0)
      .applyMatrix3(new THREE.Matrix3().getNormalMatrix(face.matrixWorld))

    expect(normal.z).toBeCloseTo(1)
  })

  it('renders no halo ring', () => {
    const group = createBoardSurfaceGroup(40, 20, {
      boardFace: '#efe6dc',
      boardEdge: '#3b2b24',
    })

    const transparentChildren = group.children.filter((child) => {
      const material = (child as THREE.Mesh).material as
        THREE.Material | THREE.Material[]
      const first = Array.isArray(material) ? material[0] : material
      return first instanceof THREE.Material && first.transparent
    })
    expect(transparentChildren).toHaveLength(0)
  })
})
