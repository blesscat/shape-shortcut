import { makeBox, measureVolume, type Shape3D } from 'replicad'
import type { NativeModelPart } from '../../lifetime'

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the original geometry error.
  }
}

function cloneShape(shape: Shape3D): Shape3D {
  return shape.clone()
}

export type TopRimPartition = {
  bodyPart: Shape3D
  rimPart: Shape3D
}

export function partitionShapeForTopRim(
  fullShape: Shape3D,
  splitZ: number,
  failureErrorCode: string,
): TopRimPartition {
  const bounds = fullShape.boundingBox
  let cutterForBody: Shape3D | null = null
  let cutterForRim: Shape3D | null = null
  let fullShapeForBody: Shape3D | null = null
  let fullShapeForRim: Shape3D | null = null
  let bodyPart: Shape3D | null = null
  let rimPart: Shape3D | null = null

  try {
    const [min, max] = bounds.bounds as [
      [number, number, number],
      [number, number, number],
    ]
    // Both cutters occupy the band above the split plane: the body is what
    // remains after cutting that band away, and the rim is its intersection.
    cutterForBody = makeBox(
      [min[0] - 10, min[1] - 10, splitZ],
      [max[0] + 10, max[1] + 10, max[2] + 20],
    )
    cutterForRim = makeBox(
      [min[0] - 10, min[1] - 10, splitZ],
      [max[0] + 10, max[1] + 10, max[2] + 20],
    )
    fullShapeForBody = cloneShape(fullShape)
    fullShapeForRim = cloneShape(fullShape)

    bodyPart = fullShapeForBody.cut(cutterForBody)
    rimPart = fullShapeForRim.intersect(cutterForRim)

    if (measureVolume(bodyPart) <= 0.001 || measureVolume(rimPart) <= 0.001) {
      throw new Error(failureErrorCode)
    }

    const completedBodyPart = bodyPart
    const completedRimPart = rimPart
    bodyPart = null
    rimPart = null

    return { bodyPart: completedBodyPart, rimPart: completedRimPart }
  } finally {
    // The boolean results are independent shapes; the two host clones are no
    // longer needed on either path and must be freed with the cutters.
    deleteShape(bodyPart)
    deleteShape(rimPart)
    deleteShape(cutterForBody)
    deleteShape(cutterForRim)
    deleteShape(fullShapeForBody)
    deleteShape(fullShapeForRim)
    deleteShape(bounds)
  }
}

export function topRimPartsFor(
  fullShape: Shape3D,
  splitZ: number,
  failureErrorCode: string,
): NativeModelPart[] {
  const { bodyPart, rimPart } = partitionShapeForTopRim(
    fullShape,
    splitZ,
    failureErrorCode,
  )
  return [
    { name: 'body', shape: bodyPart },
    { name: 'rim', shape: rimPart },
  ]
}
