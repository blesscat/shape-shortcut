import { makeBox, measureVolume, Sketcher, type Shape3D } from 'replicad'
import {
  OPENGRID_LABEL_CARD_HEIGHT,
  OPENGRID_LABEL_CARD_INSERTION_THICKNESS,
  OPENGRID_LABEL_SLOT,
  type OpenGridLabelSlotLayout,
} from '../../../cad-contract/units/opengrid-label-shared'

const FUSION_OVERLAP = 0.05

function deleteConsumedShape(shape: { delete: () => void }): void {
  try {
    shape.delete()
  } catch {
    // Extrusion can consume the sketch's wire; cleanup must preserve the result.
  }
}

export function buildOrganizerLabelSlot(
  slot: OpenGridLabelSlotLayout,
): Shape3D {
  const sketcher = new Sketcher('YZ', [-slot.outerHalfWidth, 0, 0])
  let sketch: ReturnType<Sketcher['close']> | null = null
  let body: Shape3D
  try {
    sketch = sketcher
      .movePointerTo([slot.frontY + FUSION_OVERLAP, slot.bottomZ])
      .lineTo([slot.frontY, slot.bottomZ])
      .lineTo([slot.frontY - slot.projection, slot.cardBottom])
      .lineTo([slot.frontY + FUSION_OVERLAP, slot.cardBottom])
      .close()
    body = sketch.extrude(2 * slot.outerHalfWidth, {
      extrusionDirection: [1, 0, 0],
    })
  } finally {
    if (sketch) deleteConsumedShape(sketch)
    sketcher.delete()
  }
  try {
    for (const direction of [-1, 1]) {
      const outer = direction * slot.outerHalfWidth
      const inner = direction * slot.pocketHalfWidth
      const lipInner =
        direction * (slot.pocketHalfWidth - OPENGRID_LABEL_SLOT.lipOverlap)
      const pieces = [
        {
          left: Math.min(inner, outer),
          right: Math.max(inner, outer),
          front: slot.frontY - slot.channelDepth,
          back: slot.frontY + FUSION_OVERLAP,
        },
        {
          left: Math.min(lipInner, outer),
          right: Math.max(lipInner, outer),
          front: slot.frontY - slot.projection,
          back: slot.frontY - slot.channelDepth + FUSION_OVERLAP,
        },
      ]
      for (const piece of pieces) {
        const rail = makeBox(
          [piece.left, piece.front, slot.cardBottom - FUSION_OVERLAP],
          [piece.right, piece.back, slot.railTop],
        )
        try {
          const fused = body.fuse(rail)
          body.delete()
          body = fused
        } finally {
          rail.delete()
        }
      }
    }
    return body
  } catch (error) {
    body.delete()
    throw error
  }
}

function intersectionVolume(shape: Shape3D, probe: Shape3D): number {
  const intersection = shape.intersect(probe)
  try {
    return Math.abs(measureVolume(intersection))
  } finally {
    intersection.delete()
  }
}

export function inspectOrganizerLabelSlot(
  shape: Shape3D,
  slot: OpenGridLabelSlotLayout,
): string[] {
  const failures: string[] = []
  const middleZ = (slot.cardBottom + slot.railTop) / 2
  const probeBounds: Array<
    [[number, number, number], [number, number, number]]
  > = []
  for (const direction of [-1, 1]) {
    const sideX =
      direction * (slot.pocketHalfWidth + OPENGRID_LABEL_SLOT.sideWall / 2)
    const lipX =
      direction * (slot.pocketHalfWidth - OPENGRID_LABEL_SLOT.lipOverlap / 2)
    probeBounds.push(
      [
        [sideX - 0.1, slot.frontY - slot.channelDepth + 0.1, middleZ - 0.1],
        [sideX + 0.1, slot.frontY - 0.1, middleZ + 0.1],
      ],
      [
        [lipX - 0.1, slot.frontY - slot.projection + 0.1, middleZ - 0.1],
        [lipX + 0.1, slot.frontY - slot.channelDepth - 0.1, middleZ + 0.1],
      ],
    )
  }
  probeBounds.push([
    [-0.1, slot.frontY - 0.5, slot.cardBottom - 0.3],
    [0.1, slot.frontY - 0.3, slot.cardBottom - 0.1],
  ])
  for (const [min, max] of probeBounds) {
    const probe = makeBox(min, max)
    try {
      if (
        Math.abs(intersectionVolume(shape, probe) - measureVolume(probe)) > 1e-5
      ) {
        failures.push('label-slot-material')
        break
      }
    } finally {
      probe.delete()
    }
  }
  const rearClearance = OPENGRID_LABEL_SLOT.depthClearance / 2
  const seat = makeBox(
    [
      -slot.cardWidth / 2,
      slot.frontY - rearClearance - OPENGRID_LABEL_CARD_INSERTION_THICKNESS,
      slot.cardBottom + 0.01,
    ],
    [
      slot.cardWidth / 2,
      slot.frontY - rearClearance,
      slot.cardTop + OPENGRID_LABEL_CARD_HEIGHT,
    ],
  )
  try {
    if (intersectionVolume(shape, seat) > 1e-5) failures.push('label-slot-seat')
  } finally {
    seat.delete()
  }
  return failures
}
