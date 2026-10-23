import { OPENGRID_CONFIGURATION } from '../../../cad-contract/units/opengrid'
import { boardPreview } from './components'
import {
  OPENGRID_OPEN_SHELF_CONFIGURATION as SHELF,
  openGridOpenShelfFootprintFor,
  openGridOpenShelfTopOuterRearZFor,
  openGridOpenShelfShelfLowerSurfaceZFor,
  openGridOpenShelfShelfCountFor,
  openGridOpenShelfDividerCentersFor,
  type OpenGridOpenShelfParameters,
} from '../../../cad-contract/units/opengrid-open-shelf'
import {
  OPENGRID_OPENCONNECT_SHELF_CONFIGURATION as CONNECT,
  openGridOpenConnectShelfWidthFor,
  openGridOpenConnectShelfDepthFor,
  openGridOpenConnectShelfRearHeightFor,
  type OpenGridOpenConnectShelfParameters,
} from '../../../cad-contract/units/opengrid-openconnect-shelf'
import {
  openGridOpenConnectOrganizerLayoutFor,
  OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION as ORGANIZER,
  type OpenGridOpenConnectOrganizerParameters,
} from '../../../cad-contract/units/opengrid-openconnect-organizer'
import {
  tissueBoxLayout,
  tissueBoxPrintPoint,
  type TissueBoxParameters,
} from '../../../cad-contract/units/opengrid-openconnect-tissue-box'
import { cavityOutline } from './containers'
import {
  rectangle,
  extrude,
  slab,
  sideProfile,
  transform,
  type Point2,
  type PreviewDescription,
  type PreviewSolid,
} from './description'

export function shelfPreview(
  p: OpenGridOpenShelfParameters,
): PreviewDescription {
  const [width, depth] = openGridOpenShelfFootprintFor(p)
  const rear = openGridOpenShelfTopOuterRearZFor(p)
  const side: Point2[] = [
    [-depth / 2, 0],
    [depth / 2, 0],
    [depth / 2, rear],
    [-depth / 2, p.height],
  ]
  const pieces: PreviewSolid[] = [
    slab(width, depth, SHELF.bottomThickness),
    sideProfile(side, -width / 2, SHELF.outerWallThickness),
    sideProfile(
      side,
      width / 2 - SHELF.outerWallThickness,
      SHELF.outerWallThickness,
    ),
    slab(
      width,
      SHELF.backboardThickness,
      rear,
      0,
      depth / 2 - SHELF.backboardThickness / 2,
    ),
  ]
  const plate = (front: number, back: number, thickness: number) =>
    sideProfile(
      [
        [-depth / 2, front - thickness],
        [depth / 2, back - thickness],
        [depth / 2, back],
        [-depth / 2, front],
      ],
      -width / 2,
      width,
    )
  pieces.push(plate(p.height, rear, SHELF.outerWallThickness))
  for (let i = 1; i <= openGridOpenShelfShelfCountFor(p); i++) {
    const [front, back] = openGridOpenShelfShelfLowerSurfaceZFor(p, i)
    pieces.push(
      plate(
        front + SHELF.innerPlateThickness,
        back + SHELF.innerPlateThickness,
        SHELF.innerPlateThickness,
      ),
    )
  }
  for (const x of openGridOpenShelfDividerCentersFor(p))
    pieces.push(
      sideProfile(
        side,
        x - SHELF.innerPlateThickness / 2,
        SHELF.innerPlateThickness,
      ),
    )
  return pieces
}

export function connectShelfPreview(
  p: OpenGridOpenConnectShelfParameters,
): PreviewDescription {
  const width = openGridOpenConnectShelfWidthFor(p),
    depth = openGridOpenConnectShelfDepthFor(p),
    height = openGridOpenConnectShelfRearHeightFor(p)
  const radians = (p.angle * Math.PI) / 180,
    sine = Math.sin(radians),
    cosine = Math.cos(radians)
  const board = boardPreview({
    ...OPENGRID_CONFIGURATION.defaultParameters,
    variant: 'Full',
    rows: p.rows,
    columns: p.columns,
  })
  const pieces: PreviewSolid[] = board.map((solid) =>
    transform(solid, ([x, y, z]) => [
      x,
      y - depth / 2,
      z + height - CONNECT.fullThickness,
    ]),
  )
  pieces.push(
    slab(width, CONNECT.rearThickness, height, 0, CONNECT.rearThickness / 2),
  )
  const profile: Point2[] = [
    [-depth, depth * Math.tan(radians)],
    [0, 0],
    [0, height - CONNECT.fullThickness],
    [-depth, height - CONNECT.fullThickness],
  ]
  for (let i = 0; i <= p.columns; i++) {
    const x = Math.min(
      width / 2 - CONNECT.supportThickness,
      -width / 2 + i * CONNECT.gridPitch,
    )
    pieces.push(sideProfile(profile, x, CONNECT.supportThickness))
  }
  for (let row = 1; row <= p.rows; row++) {
    const center = -row * CONNECT.gridPitch + CONNECT.supportThickness / 2
    const front = center - CONNECT.supportThickness / 2
    const back = center + CONNECT.supportThickness / 2
    pieces.push(
      sideProfile(
        [
          [front, -front * Math.tan(radians)],
          [back, -back * Math.tan(radians)],
          [back, height - CONNECT.fullThickness],
          [front, height - CONNECT.fullThickness],
        ],
        -width / 2,
        width,
      ),
    )
  }
  return pieces.map((solid) =>
    transform(solid, ([x, y, z]) => [
      x,
      y * cosine - z * sine,
      y * sine + z * cosine,
    ]),
  )
}

export function connectOrganizerPreview(
  p: OpenGridOpenConnectOrganizerParameters,
): PreviewDescription {
  const l = openGridOpenConnectOrganizerLayoutFor(p)
  const pieces: PreviewSolid[] = [
    slab(l.bodyWidth, l.bodyDepth, p.bottomThickness, 0, -l.bodyDepth / 2),
  ]
  const hole = cavityOutline(p)
  for (const [x, centeredY] of l.cavityCenters) {
    const y = centeredY - l.bodyDepth / 2
    const left =
      x - l.cavityPitch[0] / 2 <= -l.requiredSpan.x / 2
        ? -l.bodyWidth / 2
        : x - l.cavityPitch[0] / 2
    const right =
      x + l.cavityPitch[0] / 2 >= l.requiredSpan.x / 2
        ? l.bodyWidth / 2
        : x + l.cavityPitch[0] / 2
    const bottom =
      centeredY - l.cavityPitch[1] / 2 <= -l.requiredSpan.y / 2
        ? -l.bodyDepth
        : y - l.cavityPitch[1] / 2
    const top =
      centeredY + l.cavityPitch[1] / 2 >= l.requiredSpan.y / 2
        ? 0
        : y + l.cavityPitch[1] / 2
    pieces.push(
      extrude(
        [
          [left, bottom],
          [right, bottom],
          [right, top],
          [left, top],
        ],
        hole.map(([u, v]) => [u + x, v + y]),
        p.holeDepth,
        p.bottomThickness,
      ),
    )
  }
  const radians = (-p.tiltAngle * Math.PI) / 180,
    sine = Math.sin(radians),
    cosine = Math.cos(radians)
  const rear = slab(
    l.rearInterfaceWidth,
    ORGANIZER.rearThickness,
    l.rearInterfaceHeight,
    0,
    ORGANIZER.rearThickness / 2,
  )
  pieces.push(
    transform(rear, ([x, y, z]) => [
      x,
      y * cosine - (z - l.installedBodyPivotZ) * sine,
      y * sine + (z - l.installedBodyPivotZ) * cosine,
    ]),
  )
  return pieces
}

export function tissuePreview(p: TissueBoxParameters): PreviewDescription {
  const l = tissueBoxLayout(p)
  const wall = extrude(
    rectangle(l.width, l.depth),
    rectangle(p.x, p.y),
    l.height,
  )
  wall.origin = [0, l.depth / 2, 0]
  const bottom = extrude(
    rectangle(l.width, l.depth),
    rectangle(p.slotLength, p.slotWidth),
    p.bottomThickness,
  )
  bottom.origin = [0, l.depth / 2, 0]
  // Rear mounting plate follows the same slanted print-frame end planes.
  const rear = sideProfile(
    [
      [0, l.plateBottom],
      [l.plateThickness, ((-l.offsetY + l.plateThickness) * l.sine) / l.cosine],
      [
        l.plateThickness,
        (l.height - (l.offsetY - l.plateThickness) * l.sine) / l.cosine,
      ],
      [0, l.plateTop],
    ],
    -l.plateWidth / 2,
    l.plateWidth,
  )
  return [
    wall,
    bottom,
    transform(rear, (point) => tissueBoxPrintPoint(p, point)),
  ]
}
