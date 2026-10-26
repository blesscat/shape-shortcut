import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, type Shape3D } from 'replicad'
import {
  buildOpenGridStackableBox,
  buildOpenGridStackableBoxWithParts,
} from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import { placeOnLedgeSlope } from '../../src/cad-kernel/components/opengrid-label-ledge/builder'
import {
  boundsForOpenGridStackableBox,
  nominalOpenGridStackableBoxFootprintFor,
  OPENGRID_STACKABLE_BOX_LABEL_WALLS,
  openGridStackableBoxLabelPlacementFor,
  validateOpenGridStackableBoxParameters,
  type OpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'
import { openGridLabelLedgeLayoutFor } from '../../src/cad-contract/units/opengrid-label-ledge'
import { buildOpenGridLabelCardWithParts } from '../../src/cad-kernel/components/opengrid-label-card/builder'
import { OPENGRID_LABEL_CARD_CONFIGURATION } from '../../src/cad-contract/units/opengrid-label-card'
import {
  boundsOf,
  deleteShape,
  initialiseStackableBoxWasm,
  loadDetachableCornerSeatFixtures,
  stackableBoxParameters,
} from './opengrid-stackable-box.utils'

let detachableCornerSeatReference: Shape3D
let detachableCornerSeatHolderReference: Shape3D

beforeAll(async () => {
  await initialiseStackableBoxWasm()
  ;({ detachableCornerSeatReference, detachableCornerSeatHolderReference } =
    await loadDetachableCornerSeatFixtures())
})

afterAll(() => {
  deleteShape(detachableCornerSeatReference)
  deleteShape(detachableCornerSeatHolderReference)
})

function labelled(
  overrides: Partial<OpenGridStackableBoxParameters> = {},
): OpenGridStackableBoxParameters {
  const validation = validateOpenGridStackableBoxParameters(
    stackableBoxParameters({
      cornerSeatMode: 'detachable-corner-seat',
      labelSlotEnabled: true,
      ...overrides,
    }),
  )
  if (!validation.valid) throw new Error(JSON.stringify(validation.issues))
  return validation.value
}

function build(parameters: OpenGridStackableBoxParameters): Shape3D {
  return buildOpenGridStackableBox(parameters, {
    detachableCornerSeatReference,
    detachableCornerSeatHolderReference,
  })
}

function expectEnvelopeUnchanged(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
): void {
  const expected = boundsForOpenGridStackableBox(parameters)
  const [min, max] = boundsOf(shape)
  for (let axis = 0; axis < 3; axis++) {
    expect(min[axis]).toBeCloseTo(expected.min[axis]!, 1)
    expect(max[axis]).toBeCloseTo(expected.max[axis]!, 1)
  }
}

async function cardOverlap(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  style: 'flat' | 'raised',
  slideDown: number,
): Promise<number> {
  const layout = openGridLabelLedgeLayoutFor(
    parameters.labelGridUnits,
    parameters.labelSnapFit,
  )
  const placement = openGridStackableBoxLabelPlacementFor(parameters)
  const card = await buildOpenGridLabelCardWithParts(
    {
      ...OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters,
      gridUnits: parameters.labelGridUnits,
      style,
    },
    {},
  )
  try {
    const turned = card.shape.clone().rotate(180, [0, 0, 0], [0, 0, 1])
    const [min] = boundsOf(turned)
    const seated = turned.translate(
      0,
      layout.cardTopS - min[1] + slideDown,
      layout.cardNormalMin - min[2],
    )
    const placed = placeOnLedgeSlope(seated, layout)
      .rotate(placement.rotationDegrees, [0, 0, 0], [0, 0, 1])
      .translate(placement.origin[0], placement.origin[1], placement.rimZ)
    const overlap = shape.intersect(placed)
    try {
      return Math.abs(measureVolume(overlap))
    } finally {
      overlap.delete()
      placed.delete()
    }
  } finally {
    card.shape.delete()
    for (const part of card.parts) part.shape.delete()
  }
}

describe('stackable box label ledge', () => {
  it.each(OPENGRID_STACKABLE_BOX_LABEL_WALLS)(
    'builds on the %s wall and holds flat and raised cards',
    async (labelWall) => {
      const parameters = labelled({ x: 3, y: 2, height: 25, labelWall })
      const shape = build(parameters)
      try {
        expectEnvelopeUnchanged(shape, parameters)
        for (const style of ['flat', 'raised'] as const) {
          expect(await cardOverlap(shape, parameters, style, 0)).toBeLessThan(
            1e-5,
          )
          expect(
            await cardOverlap(shape, parameters, style, 0.6),
          ).toBeGreaterThan(1e-3)
        }
      } finally {
        shape.delete()
      }
    },
    180_000,
  )

  it.each([
    { name: 'flat top', topRimMode: 'flat-top' as const, height: 30 },
    { name: 'thin shell', bottomMode: 'thin-shell' as const, height: 16 },
    { name: 'minimum height merged block', height: 13 },
    { name: 'partly merged wedge', height: 18 },
    {
      name: 'open bottom hanging wedge',
      bottomMode: 'none' as const,
      height: 23,
    },
  ])(
    'builds a valid box for $name',
    ({ name: _name, ...overrides }) => {
      const parameters = labelled({
        x: 2,
        y: 2,
        labelGridUnits: 4,
        ...overrides,
      })
      const shape = build(parameters)
      try {
        expectEnvelopeUnchanged(shape, parameters)
      } finally {
        shape.delete()
      }
    },
    180_000,
  )

  it('stays clear of an upper box seating on the rail and of side openings', () => {
    const parameters = labelled({
      x: 3,
      y: 2,
      height: 25,
      labelWall: 'back',
      openingMinusXDepth: 8,
      openingMinusXBottomLength: 20,
      openingPlusXDepth: 8,
      openingPlusXBottomLength: 20,
    })
    const shape = build(parameters)
    try {
      expectEnvelopeUnchanged(shape, parameters)
      const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
      const rimZ = openGridStackableBoxLabelPlacementFor(parameters).rimZ
      const aboveRim = makeBox(
        [-width / 2 + 6, -depth / 2 + 6, rimZ + 0.01],
        [width / 2 - 6, depth / 2 - 6, rimZ + 6],
      )
      const overlap = shape.intersect(aboveRim)
      try {
        expect(measureVolume(overlap)).toBeLessThan(1e-5)
      } finally {
        overlap.delete()
        aboveRim.delete()
      }
    } finally {
      shape.delete()
    }
  }, 180_000)

  it('may split the ledge across the two-color rim parts', async () => {
    const parameters = labelled({
      x: 2,
      y: 2,
      height: 25,
      topRimEnabled: true,
      topRimHeight: 18,
    })
    const build = await buildOpenGridStackableBoxWithParts(parameters, {
      detachableCornerSeatReference,
      detachableCornerSeatHolderReference,
    })
    try {
      expect(build.parts).toHaveLength(2)
      const partVolume = build.parts!.reduce(
        (sum, part) => sum + measureVolume(part.shape),
        0,
      )
      expect(partVolume).toBeCloseTo(measureVolume(build.shape), 0)
    } finally {
      build.shape.delete()
      for (const part of build.parts ?? []) part.shape.delete()
    }
  }, 240_000)

  it('keeps the ledge and its wall band solid in honeycomb mode', () => {
    const parameters = labelled({ x: 2, y: 2, height: 30, honeycombMode: true })
    const shape = build(parameters)
    try {
      expectEnvelopeUnchanged(shape, parameters)
      const layout = openGridLabelLedgeLayoutFor(
        parameters.labelGridUnits,
        parameters.labelSnapFit,
      )
      const placement = openGridStackableBoxLabelPlacementFor(parameters)
      const band = makeBox(
        [-layout.cardWidth / 2, -1.1, layout.wallBottomZ + 2],
        [layout.cardWidth / 2, -0.1, layout.wallTopZ],
      )
      const placed = band
        .rotate(placement.rotationDegrees, [0, 0, 0], [0, 0, 1])
        .translate(placement.origin[0], placement.origin[1], placement.rimZ)
      const filled = shape.intersect(placed)
      try {
        expect(measureVolume(filled)).toBeCloseTo(measureVolume(placed), 3)
      } finally {
        filled.delete()
        placed.delete()
      }
    } finally {
      shape.delete()
    }
  }, 300_000)
})
