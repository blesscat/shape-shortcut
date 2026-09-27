import { describe, expect, it } from 'vitest'
import * as THREE from 'three'

import { PLAYGROUND_GRID_PITCH } from '../../src/cad-contract/scene'
import {
  defaultPlaygroundCameraPose,
  playgroundCameraFarPlane,
  PLAYGROUND_CAMERA_MIN_FAR,
} from '../../src/features/cad/playground/camera-pose'
import { CAD_VIEWPORT_CAMERA } from '../../src/features/cad/viewport/coordinates'

type GridSize = { x: number; y: number }

function projectedGridCorners(
  gridSize: GridSize,
  aspect: number,
): THREE.Vector3[] {
  const pose = defaultPlaygroundCameraPose({
    mode: 'wall',
    gridSize,
    aspect,
  })
  const camera = new THREE.PerspectiveCamera(
    CAD_VIEWPORT_CAMERA.fov,
    aspect,
    0.1,
    playgroundCameraFarPlane({ mode: 'wall', gridSize, pose }),
  )
  camera.position.set(...pose.position)
  camera.up.set(...CAD_VIEWPORT_CAMERA.up)
  camera.lookAt(...pose.target)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()

  const halfWidth = (gridSize.x * PLAYGROUND_GRID_PITCH) / 2
  const halfHeight = (gridSize.y * PLAYGROUND_GRID_PITCH) / 2
  return [
    new THREE.Vector3(-halfWidth, 0, -halfHeight),
    new THREE.Vector3(-halfWidth, 0, halfHeight),
    new THREE.Vector3(halfWidth, 0, -halfHeight),
    new THREE.Vector3(halfWidth, 0, halfHeight),
  ].map((corner) => corner.project(camera))
}

describe('playground default camera pose', () => {
  it('keeps the established desktop direction independent of viewport aspect', () => {
    const landscape = defaultPlaygroundCameraPose({
      mode: 'desktop',
      gridSize: { x: 50, y: 50 },
      aspect: 16 / 9,
    })
    const portrait = defaultPlaygroundCameraPose({
      mode: 'desktop',
      gridSize: { x: 50, y: 50 },
      aspect: 9 / 16,
    })

    expect(portrait).toEqual(landscape)
    expect(landscape.target).toEqual([0, 0, 0])
    expect(landscape.position[0]).toBeCloseTo(-landscape.position[1])
    expect(landscape.position[0]).toBeCloseTo(landscape.position[2])
  })

  it('centers the wall grid with slight side and elevation angles', () => {
    const pose = defaultPlaygroundCameraPose({
      mode: 'wall',
      gridSize: { x: 50, y: 50 },
      aspect: 16 / 9,
    })

    expect(pose.target).toEqual([0, 0, 0])
    expect(pose.position[0]).toBeGreaterThan(0)
    expect(pose.position[1]).toBeGreaterThan(0)
    expect(pose.position[2]).toBeGreaterThan(0)
    expect(pose.position[0] / pose.position[1]).toBeCloseTo(0.18)
    expect(pose.position[2] / pose.position[1]).toBeCloseTo(0.2)
  })

  it.each([
    ['square landscape', { x: 50, y: 50 }, 16 / 9],
    ['wide landscape', { x: 200, y: 1 }, 16 / 9],
    ['tall landscape', { x: 1, y: 200 }, 16 / 9],
    ['square portrait', { x: 50, y: 50 }, 9 / 16],
    ['wide portrait', { x: 200, y: 1 }, 9 / 16],
    ['tall portrait', { x: 1, y: 200 }, 9 / 16],
    ['wide narrow viewport', { x: 200, y: 1 }, 0.35],
  ] as const)(
    'fits every wall-grid corner for %s',
    (_name, gridSize, aspect) => {
      const corners = projectedGridCorners(gridSize, aspect)

      for (const corner of corners) {
        expect(Math.abs(corner.x)).toBeLessThanOrEqual(0.92)
        expect(Math.abs(corner.y)).toBeLessThanOrEqual(0.92)
        expect(corner.z).toBeGreaterThanOrEqual(-1)
        expect(corner.z).toBeLessThanOrEqual(1)
      }
    },
  )

  it('extends the far plane when narrow framing exceeds the baseline', () => {
    const gridSize = { x: 200, y: 1 }
    const pose = defaultPlaygroundCameraPose({
      mode: 'wall',
      gridSize,
      aspect: 0.35,
    })

    expect(
      playgroundCameraFarPlane({ mode: 'wall', gridSize, pose }),
    ).toBeGreaterThan(PLAYGROUND_CAMERA_MIN_FAR)
  })
})
