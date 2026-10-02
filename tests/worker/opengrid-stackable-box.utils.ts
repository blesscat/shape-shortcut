import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setOC, type Shape3D } from 'replicad'
import {
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type OpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'
import {
  importOpenGridDetachableCornerSeatHolderReference,
  importOpenGridDetachableCornerSeatReference,
} from '../../src/cad-kernel/components/opengrid-locating-assembly/reference'
import { buildOpenGridStackableBox as buildOpenGridStackableBoxKernel } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'

export const SNAP_REFERENCE_PATH = new URL(
  '../../src/cad-kernel/components/opengrid-snap/assets/opengrid-bare-lite-snap.step',
  import.meta.url,
)
export const DETACHABLE_MALE_REFERENCE_PATH = new URL(
  '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-v13.step',
  import.meta.url,
)
export const DETACHABLE_HOLDER_REFERENCE_PATH = new URL(
  '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-holder-11.step',
  import.meta.url,
)

export type StackableBoxTestFixtures = {
  detachableCornerSeatReference: Shape3D
  detachableCornerSeatHolderReference: Shape3D
}

export async function initialiseStackableBoxWasm(): Promise<void> {
  ;(globalThis as typeof globalThis & { __dirname?: string }).__dirname =
    dirname(fileURLToPath(import.meta.url))
  const require = createRequire(import.meta.url)
  ;(globalThis as typeof globalThis & { require?: typeof require }).require =
    require
  const initialiseOpenCascade = require('replicad-opencascadejs')
    .default as (options: { locateFile: () => string }) => Promise<unknown>
  const openCascade = await initialiseOpenCascade({
    locateFile: () =>
      require.resolve('replicad-opencascadejs/src/replicad_single.wasm'),
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
}

export async function loadDetachableCornerSeatFixtures(): Promise<StackableBoxTestFixtures> {
  const [detachableCornerSeatReference, detachableCornerSeatHolderReference] =
    await Promise.all([
      importOpenGridDetachableCornerSeatReference(
        new Blob([readFileSync(fileURLToPath(DETACHABLE_MALE_REFERENCE_PATH))]),
      ),
      importOpenGridDetachableCornerSeatHolderReference(
        new Blob([
          readFileSync(fileURLToPath(DETACHABLE_HOLDER_REFERENCE_PATH)),
        ]),
      ),
    ])
  return { detachableCornerSeatReference, detachableCornerSeatHolderReference }
}

export function stackableBoxParameters(
  overrides: Partial<OpenGridStackableBoxParameters> = {},
): OpenGridStackableBoxParameters {
  return {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    x: overrides.x ?? 2,
    y: overrides.y ?? 2,
    height: overrides.height ?? 10,
    cornerSeatMode: overrides.cornerSeatMode ?? 'none',
    fullBottomHoleGrid: overrides.fullBottomHoleGrid ?? false,
    ...overrides,
  }
}

export function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Keep cleanup failures from hiding the geometry assertion.
  }
}

export function boundsOf(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

export function cylindricalFaceCount(shape: Shape3D): number {
  let count = 0
  for (const face of shape.faces) {
    try {
      if (face.surface.surfaceType === 'CYLINDRE') count += 1
    } finally {
      face.delete()
    }
  }
  return count
}
