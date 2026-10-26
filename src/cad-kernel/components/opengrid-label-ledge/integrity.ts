import { getOC, measureVolume, Solid, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'

/** Failure ids for an invalid B-Rep or a result that is not one solid. */
export function inspectSolidIntegrity(shape: Shape3D): string[] {
  const failures: string[] = []
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
  return failures
}
