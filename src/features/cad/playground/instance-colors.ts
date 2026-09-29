/**
 * Pure per-instance display color decision for the playground viewport.
 * Precedence: active drag preview > persistent overlap conflict color >
 * selection/hover emphasis > the instance's normal color.
 */
export type InstanceDisplayColorInputs = {
  dragPreviewActive: boolean
  dragPreviewValid: boolean
  overlapping: boolean
  emphasized: boolean
  colorHex: string
  faceHighlight: string
  conflictColor: string
}

export function instanceDisplayColor(
  inputs: InstanceDisplayColorInputs,
): string {
  if (inputs.dragPreviewActive) {
    return inputs.dragPreviewValid ? inputs.faceHighlight : inputs.conflictColor
  }
  // The persistent conflict color outranks selection/hover emphasis so a
  // flagged instance stays findable while the overlap exists.
  if (inputs.overlapping) return inputs.conflictColor
  if (inputs.emphasized) return inputs.faceHighlight
  return inputs.colorHex
}
