import {
  nominalOpenGridStackableBoxFootprintFor,
  externalOpenGridStackableBoxHeightFor,
  openGridStackableBoxActiveFloorTopZFor,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units/opengrid-stackable-box'
import {
  openGridStackableCylinderDerivedGeometryFor,
  type OpenGridStackableCylinderParameters,
} from '../../../cad-contract/units/opengrid-stackable-cylinder'
import {
  openGridOrganizerBoxLayoutFor,
  openGridOrganizerBoxPolygonPointsFor,
  type OpenGridOrganizerBoxParameters,
} from '../../../cad-contract/units/opengrid-organizer-box'

import {
  rectangle,
  ellipse,
  extrude,
  slab as floor,
  type Point2 as Point,
  type PreviewDescription,
  type PreviewSolid,
} from './description'

export function boxPreview(
  p: OpenGridStackableBoxParameters,
): PreviewDescription {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(p)
  const height = externalOpenGridStackableBoxHeightFor(p)
  const wall = OPENGRID_STACKABLE_BOX_CONFIGURATION.wallThickness
  const shapes = [
    extrude(
      rectangle(width, depth),
      rectangle(width - 2 * wall, depth - 2 * wall),
      height,
    ),
  ]
  if (p.bottomMode !== 'none')
    shapes.push(floor(width, depth, openGridStackableBoxActiveFloorTopZFor(p)))
  return shapes
}

export function cylinderPreview(
  p: OpenGridStackableCylinderParameters,
): PreviewDescription {
  const derived = openGridStackableCylinderDerivedGeometryFor(p)
  const outer = ellipse(derived.radius * 2, derived.radius * 2)
  const inner = ellipse(p.innerDiameter, p.innerDiameter)
  return [
    extrude(outer, inner, p.height),
    extrude(inner, null, derived.floorThickness),
  ]
}

export function cavityOutline(
  p: Pick<
    OpenGridOrganizerBoxParameters,
    'holeShape' | 'holeDiameter' | 'holeWidth' | 'holeHeight'
  >,
): Point[] {
  if (p.holeShape === 'circle') return ellipse(p.holeDiameter, p.holeDiameter)
  if (p.holeShape === 'ellipse') return ellipse(p.holeWidth, p.holeHeight)
  if (p.holeShape === 'rectangle') return rectangle(p.holeWidth, p.holeHeight)
  return openGridOrganizerBoxPolygonPointsFor(p.holeShape, p.holeDiameter)
}

export function organizerPreview(
  p: OpenGridOrganizerBoxParameters,
): PreviewDescription {
  const layout = openGridOrganizerBoxLayoutFor(p)
  const [width, depth] = layout.footprint
  const floorHeight = layout.interfaceFloorDatum + p.bottomThickness
  const hole = cavityOutline(p)
  const shapes: PreviewSolid[] = [floor(width, depth, floorHeight)]
  // One hole per cell keeps triangulation linear in cavity count instead of
  // triangulating a single large polygon with hundreds of holes.
  for (const [x, y] of layout.cavityCenters) {
    const halfX = layout.cavityPitch[0] / 2
    const halfY = layout.cavityPitch[1] / 2
    const left =
      x - halfX <= -layout.requiredSpan.x / 2 ? -width / 2 : x - halfX
    const right = x + halfX >= layout.requiredSpan.x / 2 ? width / 2 : x + halfX
    const bottom =
      y - halfY <= -layout.requiredSpan.y / 2 ? -depth / 2 : y - halfY
    const top = y + halfY >= layout.requiredSpan.y / 2 ? depth / 2 : y + halfY
    const outline: Point[] = [
      [left, bottom],
      [right, bottom],
      [right, top],
      [left, top],
    ]
    const translatedHole: Point[] = hole.map(([px, py]) => [px + x, py + y])
    shapes.push(extrude(outline, translatedHole, p.holeDepth, floorHeight))
  }
  if (layout.stacking) {
    shapes.push(
      extrude(
        rectangle(width, depth),
        rectangle(width - 2 * p.wallThickness, depth - 2 * p.wallThickness),
        layout.stacking.externalTopZ - layout.bodyHeight,
        layout.bodyHeight,
      ),
    )
  }
  return shapes
}
