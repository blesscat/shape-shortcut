import { getOC, makeBox, measureVolume, Solid, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForOpenGridLabelSlotTest,
  openGridLabelSlotTestLayoutFor,
  type OpenGridLabelSlotTestParameters,
} from '../../../cad-contract/units/opengrid-label-slot-test'
import {
  buildOrganizerLabelSlot,
  inspectOrganizerLabelSlot,
} from '../opengrid-openconnect-organizer/label-slot'

export function assertOpenGridLabelSlotTestQuality(
  shape: Shape3D,
  parameters: OpenGridLabelSlotTestParameters,
): void {
  const slot = openGridLabelSlotTestLayoutFor(parameters)
  const failures = inspectOrganizerLabelSlot(shape, slot)
  const expected = boundsForOpenGridLabelSlotTest(parameters)
  const box = shape.boundingBox
  try {
    for (let axis = 0; axis < 3; axis++) {
      if (
        Math.abs(box.bounds[0][axis]! - expected.min[axis]!) > 0.05 ||
        Math.abs(box.bounds[1][axis]! - expected.max[axis]!) > 0.05
      )
        failures.push('bounds')
    }
  } finally {
    box.delete()
  }
  const oc = getOC()
  const analyzer = new oc.BRepCheck_Analyzer(shape.wrapped, true, true)
  try {
    if (!analyzer.IsValid_2()) failures.push('invalid-brep')
  } finally {
    analyzer.delete()
  }
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  let solidCount = 0
  try {
    while (explorer.More()) {
      new Solid(oc.TopoDS.Solid_1(explorer.Current())).delete()
      solidCount++
      explorer.Next()
    }
  } finally {
    explorer.delete()
  }
  if (solidCount !== 1 || !(measureVolume(shape) > 0))
    failures.push('not-single-solid')
  if (failures.length)
    throw new Error(
      `OPENGRID_LABEL_SLOT_TEST_QUALITY_INVALID:${failures.join(';')}`,
    )
}

export async function buildOpenGridLabelSlotTest(
  parameters: OpenGridLabelSlotTestParameters,
  context: { isGenerationCurrent?: () => boolean } = {},
): Promise<Shape3D> {
  if (context.isGenerationCurrent && !context.isGenerationCurrent())
    throw new Error('STALE_GENERATION')
  const slot = openGridLabelSlotTestLayoutFor(parameters)
  const bounds = boundsForOpenGridLabelSlotTest(parameters)
  const back = makeBox([bounds.min[0], 0, 0], bounds.max)
  let rails: Shape3D | undefined
  try {
    rails = buildOrganizerLabelSlot(slot)
    return back.fuse(rails)
  } finally {
    rails?.delete()
    back.delete()
  }
}
