import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeBox, measureVolume, setOC, type Shape3D } from 'replicad'
import {
  TISSUE_BOX_DEFAULTS,
  tissueBoxLayout,
  type TissueBoxParameters,
} from '../../src/cad-contract/units/opengrid-openconnect-tissue-box'
import { buildTissueBox } from '../../src/cad-kernel/components/opengrid-openconnect-tissue-box/builder'
import {
  importOpenGridOpenConnectShelfLockedSlot,
  openGridOpenConnectShelfLockedSlotAssetUrl,
} from '../../src/cad-kernel/components/opengrid-openconnect-shelf/slot'

export const tissueBoxTestSmall: TissueBoxParameters = {
  ...TISSUE_BOX_DEFAULTS,
  x: 70,
  y: 50,
  z: 35,
  slotLength: 45,
  slotWidth: 15,
}

export async function initialiseTissueBoxWasm(): Promise<void> {
  ;(globalThis as typeof globalThis & { __dirname?: string }).__dirname =
    dirname(fileURLToPath(import.meta.url))
  const require = createRequire(import.meta.url)
  ;(globalThis as typeof globalThis & { require?: typeof require }).require =
    require
  const oc = await require('replicad-opencascadejs').default({
    locateFile: () =>
      require.resolve('replicad-opencascadejs/src/replicad_single.wasm'),
  })
  setOC(oc)
}

export async function buildTissueBoxForTest(
  p: TissueBoxParameters,
  extra: Parameters<typeof buildTissueBox>[1] = {},
): Promise<Shape3D> {
  const source = await importOpenGridOpenConnectShelfLockedSlot(
    new Blob([
      readFileSync(fileURLToPath(openGridOpenConnectShelfLockedSlotAssetUrl)),
    ]),
  )
  try {
    return await buildTissueBox(p, {
      getLockedSlot: async () => source,
      ...extra,
    })
  } finally {
    source.delete()
  }
}

export function tissueBoxInPrintFrame(
  shape: Shape3D,
  p: TissueBoxParameters,
): Shape3D {
  return shape
    .translate(0, -tissueBoxLayout(p).offsetY, 0)
    .rotate(-p.tiltAngle, [0, 0, 0], [1, 0, 0])
}

export function tissueBoxVolumeAt(
  shape: Shape3D,
  p: TissueBoxParameters,
  point: [number, number, number],
) {
  const center = point
  const probe = makeBox(
    center.map((v) => v - 0.1) as [number, number, number],
    center.map((v) => v + 0.1) as [number, number, number],
  )
  const common = shape.intersect(probe)
  try {
    return Math.abs(measureVolume(common))
  } finally {
    common.delete()
    probe.delete()
  }
}
