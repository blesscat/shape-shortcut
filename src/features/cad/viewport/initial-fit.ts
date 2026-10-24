import type { ModelBounds } from '../../../cad-contract/units'

/** Bounds uses world-unit padding, not a scale factor. Give its fitted box
 * enough room for the bounding sphere after the initial orbit is restored.
 * Call only at scene mount: changing input or theme must not refit the camera.
 */
export function initialWorkspacePadding(bounds: ModelBounds): number {
  const extents = bounds.max.map((value, axis) => value - bounds.min[axis])
  const diameter = Math.hypot(...extents)
  const shortestExtent = Math.min(...extents)
  return Math.max(1.25, (diameter * 1.1 - shortestExtent) / 2)
}
