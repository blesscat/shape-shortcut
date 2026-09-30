import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridLabelCard,
  isOpenGridLabelCardParameters,
  openGridLabelCardFileName,
  openGridLabelCardStlFileName,
  openGridLabelCardThreeMfFileName,
  OPENGRID_LABEL_CARD_CONFIGURATION,
  validateOpenGridLabelCardParameters,
  validateModelParameters,
} from '../../src/cad-contract/units'
import { getModelDefinition } from '../../src/features/cad/model-catalog'
import { LABEL_CARD_ICON_PATHS } from '../../src/cad-kernel/components/opengrid-label-card/icon-paths'
import { screwOutlineContours16 } from '../../src/cad-kernel/components/opengrid-label-card/screw-outline'
import {
  OPENGRID_LABEL_SCREW_SHAFT,
  parseOpenGridLabelScrewShaftUnits,
  shaftUnitsForOpenGridLabelScrewLength,
} from '../../src/cad-kernel/components/opengrid-label-card/screw-shape'
import { OPENGRID_LABEL_CARD_ICON_IDS } from '../../src/cad-contract/units'
import { parseOpenGridLabelCardRawParameters } from '../../src/components/cad/workspace/validation/model-raw-parsers/label-card'
import { rawFromParameters } from '../../src/components/cad/workspace/validation/raw-from-parameters'
function segmentsCross(
  p1: readonly [number, number],
  p2: readonly [number, number],
  p3: readonly [number, number],
  p4: readonly [number, number],
): boolean {
  const d = (
    a: readonly number[],
    b: readonly number[],
    c: readonly number[],
  ) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  const d1 = d(p3, p4, p1)
  const d2 = d(p3, p4, p2)
  const d3 = d(p1, p2, p3)
  const d4 = d(p1, p2, p4)
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  )
}

function svgPathBounds(d: string): {
  min: [number, number]
  max: [number, number]
} {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    minX = Math.min(minX, numbers[i]!)
    maxX = Math.max(maxX, numbers[i]!)
    minY = Math.min(minY, numbers[i + 1]!)
    maxY = Math.max(maxY, numbers[i + 1]!)
  }
  return { min: [minX, minY], max: [maxX, maxY] }
}

describe('OpenGrid Label Card contract', () => {
  it('uses the confirmed v2 defaults', () => {
    expect(OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters).toEqual({
      gridUnits: 4,
      style: 'raised',
      iconPosition: 'left',
      icon: 'gear-fill',
      text: '',
      textHeight: OPENGRID_LABEL_CARD_CONFIGURATION.textHeight.default,
      layout: 'inline',
      groupAlign: 'center',
      iconSize: 6,
    })
  })

  it('validates style, tiers, icons, and optional text', () => {
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
        style: 'raised',
        iconPosition: 'left',
        icon: 'gear-fill',
      }),
    ).toEqual({
      valid: true,
      value: {
        textAlignment: 'center',
        textLine2Alignment: 'center',
        textHeight: OPENGRID_LABEL_CARD_CONFIGURATION.textHeight.default,
        gridUnits: 4,
        style: 'raised',
        iconPosition: 'left',
        icon: 'gear-fill',
        layout: 'inline',
        groupAlign: 'center',
        iconSize: 6,
        screwMode: false,
        screwHead: 'phillips',
        screwDiameter: 4,
        screwLength: 16,
      },
    })
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 6,
        style: 'flat',
        iconPosition: 'left',
        icon: 'wrench',
        text: ' M3x40 ',
      }),
    ).toEqual({
      valid: true,
      value: {
        textAlignment: 'center',
        textLine2Alignment: 'center',
        textHeight: OPENGRID_LABEL_CARD_CONFIGURATION.textHeight.default,
        gridUnits: 6,
        style: 'flat',
        iconPosition: 'left',
        icon: 'wrench',
        text: 'M3x40',
        layout: 'inline',
        groupAlign: 'center',
        iconSize: 6,
        screwMode: false,
        screwHead: 'phillips',
        screwDiameter: 4,
        screwLength: 16,
      },
    })
    expect(
      isOpenGridLabelCardParameters({
        gridUnits: 6,
        style: 'flat',
        iconPosition: 'left',
        icon: 'cpu',
      }),
    ).toBe(true)
  })

  it('rejects invalid parameters per field', () => {
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 50,
        style: 'flat',
        iconPosition: 'left',
        icon: 'gear-fill',
      }),
    ).toMatchObject({
      valid: false,
      issues: [{ field: 'gridUnits' }],
    })
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
        style: 'embossed',
        icon: 'gear-fill',
      }),
    ).toMatchObject({
      valid: false,
      issues: [
        { field: 'style', messageId: 'validation.labelCardStyleInvalid' },
      ],
    })
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
        style: 'flat',
        iconPosition: 'left',
        icon: 'rocket',
      }),
    ).toMatchObject({
      valid: false,
      issues: [{ field: 'icon', messageId: 'validation.labelCardIconUnknown' }],
    })
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
        style: 'flat',
        iconPosition: 'left',
        icon: 'gear-fill',
        text: '1234567',
      }),
    ).toMatchObject({
      valid: false,
      issues: [{ field: 'text', messageId: 'validation.labelCardTextTooLong' }],
    })
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
        style: 'flat',
        iconPosition: 'left',
        icon: 'gear-fill',
        gripThickness: 1.2,
      }),
    ).toMatchObject({ valid: false })
  })

  it('routes through the shared model parameter validation', () => {
    expect(
      validateModelParameters('opengrid-label-card', {
        gridUnits: 3,
        style: 'flat',
        iconPosition: 'left',
        icon: 'box-seam',
      }),
    ).toEqual({
      valid: true,
      value: {
        modelId: 'opengrid-label-card',
        parameters: {
          textAlignment: 'center',
          textLine2Alignment: 'center',
          textHeight: OPENGRID_LABEL_CARD_CONFIGURATION.textHeight.default,
          gridUnits: 3,
          style: 'flat',
          iconPosition: 'left',
          icon: 'box-seam',
          layout: 'inline',
          groupAlign: 'center',
          iconSize: 6,
          screwMode: false,
          screwHead: 'phillips',
          screwDiameter: 4,
          screwLength: 16,
        },
      },
    })
    expect(
      validateModelParameters('opengrid-label-card', { gridUnits: 1.2 }),
    ).toMatchObject({ valid: false })
  })

  it('derives style-dependent bounds', () => {
    expect(
      boundsForOpenGridLabelCard({
        gridUnits: 4,
        style: 'flat',
        iconPosition: 'left',
        icon: 'gear-fill',
      }),
    ).toEqual({ min: [-20, -6, 0], max: [20, 6, 0.6] })
    expect(
      boundsForOpenGridLabelCard({
        gridUnits: 4,
        style: 'raised',
        iconPosition: 'left',
        icon: 'gear-fill',
      }),
    ).toEqual({ min: [-20, -6, 0], max: [20, 6, 1] })
    expect(
      boundsForOpenGridLabelCard({
        gridUnits: 2,
        style: 'raised',
        iconPosition: 'left',
        icon: 'gear-fill',
      }),
    ).toEqual({ min: [-10, -6, 0], max: [10, 6, 1] })
  })

  it('encodes parameters into stable export file names', () => {
    const parameters = {
      gridUnits: 3,
      style: 'flat',
      iconPosition: 'left',
      icon: 'wrench',
    } as const
    expect(openGridLabelCardFileName(parameters)).toBe(
      'opengrid-label-card-w30-flat-wrench-left-linline-gcenter-i6.step',
    )
    expect(openGridLabelCardStlFileName(parameters)).toBe(
      'opengrid-label-card-w30-flat-wrench-left-linline-gcenter-i6.stl',
    )
    expect(openGridLabelCardThreeMfFileName(parameters)).toBe(
      'opengrid-label-card-w30-flat-wrench-left-linline-gcenter-i6.3mf',
    )
    expect(
      getModelDefinition('opengrid-label-card')?.threeMfFileName?.(parameters),
    ).toBe('opengrid-label-card-w30-flat-wrench-left-linline-gcenter-i6.3mf')
  })

  it('shares the icon set and width tiers with the label system', () => {
    expect(OPENGRID_LABEL_CARD_ICON_IDS.length).toBeGreaterThanOrEqual(16)
    for (const iconId of OPENGRID_LABEL_CARD_ICON_IDS.filter(
      (icon) => icon !== 'none',
    )) {
      expect(LABEL_CARD_ICON_PATHS[iconId], iconId).toBeDefined()
    }
  })

  it('draws the ring, shaft, and rectangular head block pictogram', () => {
    const onOutline = (
      point: readonly [number, number],
      polygon: readonly (readonly [number, number])[],
    ): boolean =>
      polygon.some((a, i) => {
        const b = polygon[(i + 1) % polygon.length]!
        const cross =
          (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0])
        if (Math.abs(cross) > 1e-6) return false
        const dot =
          (point[0] - a[0]) * (b[0] - a[0]) + (point[1] - a[1]) * (b[1] - a[1])
        return (
          dot >= -1e-6 && dot <= (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + 1e-6
        )
      })

    for (const shaftLength of [
      OPENGRID_LABEL_SCREW_SHAFT.stub,
      0.58,
      0.87,
      2.32,
      4.64,
      5.8,
      8.7,
    ]) {
      const contours = screwOutlineContours16(shaftLength)
      expect(contours.length, `${shaftLength} contour count`).toBe(3)
      const polygon = contours.flat()

      // y-symmetric about the icon origin
      const ys = polygon.map((point) => point[1])
      expect(
        Math.abs(Math.min(...ys) + Math.max(...ys)),
        `${shaftLength} y-symmetry`,
      ).toBeLessThan(1e-6)

      // every vertex and its y-mirror lie on the pictogram
      for (const [px, py] of polygon) {
        expect(
          contours.some((contour) => onOutline([px, py], contour)),
          `${shaftLength} vertex`,
        ).toBe(true)
        expect(
          contours.some((contour) => onOutline([px, -py], contour)),
          `${shaftLength} mirror of ${px},${py}`,
        ).toBe(true)
      }

      // no self-intersections within any contour
      for (const contour of contours) {
        let crossings = 0
        const n = contour.length
        for (let i = 0; i < n; i += 1) {
          for (let j = i + 2; j < n; j += 1) {
            if (j === n - 1 && i === 0) continue
            if (
              segmentsCross(
                contour[i]!,
                contour[(i + 1) % n]!,
                contour[j]!,
                contour[(j + 1) % n]!,
              )
            )
              crossings += 1
          }
        }
        expect(crossings, `${shaftLength} self-intersection`).toBe(0)
      }

      // the ring is a hole: two circular contours of radius 2.0 and 1.0 share
      // one center, giving a 1.0 stroke
      const circleCenters = contours
        .map((contour) => {
          const cx = contour.reduce((sum, [px]) => sum + px, 0) / contour.length
          const cy =
            contour.reduce((sum, [, py]) => sum + py, 0) / contour.length
          const distances = contour.map(([px, py]) =>
            Math.hypot(px - cx, py - cy),
          )
          const radius =
            distances.reduce((sum, d) => sum + d, 0) / distances.length
          const spread = Math.max(...distances.map((d) => Math.abs(d - radius)))
          return { cx, cy, radius, isCircle: spread < 1e-6 }
        })
        .filter(({ isCircle, radius }) => isCircle && radius > 0.5)
      expect(circleCenters.length, `${shaftLength} ring contours`).toBe(2)
      expect(
        Math.abs(circleCenters[0]!.cx - circleCenters[1]!.cx),
        `${shaftLength} ring coaxial x`,
      ).toBeLessThan(1e-6)
      expect(
        Math.abs(circleCenters[0]!.cy - circleCenters[1]!.cy),
        `${shaftLength} ring coaxial y`,
      ).toBeLessThan(1e-6)
      expect(
        Math.abs(circleCenters[0]!.radius - circleCenters[1]!.radius),
        `${shaftLength} ring stroke`,
      ).toBeCloseTo(1, 6)

      // the head block ends flat: exactly two vertices at max x, 3.4 apart
      const xs = polygon.map((point) => point[0])
      const maxX = Math.max(...xs)
      const tip = polygon.filter(([px]) => Math.abs(px - maxX) < 1e-6)
      expect(tip.length, `${shaftLength} flat head end`).toBe(2)
      expect(
        Math.abs(tip[0]![1] - tip[1]![1]),
        `${shaftLength} head block height`,
      ).toBeCloseTo(3.4, 6)

      // the shaft meets the block in a step: the step contour's inner
      // vertices sit at y = ±0.8, giving the 1.6 shaft thickness
      const stepContour = contours[2]!
      const shaftVertices = stepContour.filter(([, py]) => Math.abs(py) < 1)
      expect(shaftVertices.length, `${shaftLength} shaft vertices`).toBe(4)
      const shaftTop = Math.max(...shaftVertices.map(([, py]) => py))
      const shaftBottom = Math.min(...shaftVertices.map(([, py]) => py))
      expect(
        shaftTop - shaftBottom,
        `${shaftLength} shaft thickness`,
      ).toBeCloseTo(1.6, 6)

      // whole glyph stays inside the 16-unit icon grid
      expect(
        maxX - Math.min(...xs),
        `${shaftLength} width`,
      ).toBeLessThanOrEqual(16 + 1e-6)
      expect(
        Math.max(...ys) - Math.min(...ys),
        `${shaftLength} height`,
      ).toBeLessThanOrEqual(16 + 1e-6)
    }
  })

  it('scales the shaft proportionally with the screw length', () => {
    const width = (length: number): number => {
      const polygon = screwOutlineContours16(length).flat()
      const xs = polygon.map((point) => point[0])
      return Math.max(...xs) - Math.min(...xs)
    }
    const headSpan =
      width(OPENGRID_LABEL_SCREW_SHAFT.stub) - OPENGRID_LABEL_SCREW_SHAFT.stub
    const shaft = (length: number): number => width(length) - headSpan
    const units = (millimetres: number) =>
      shaftUnitsForOpenGridLabelScrewLength(millimetres)

    // linear in millimetres: 0.29 units per mm
    expect(shaft(units(8)) - shaft(units(4))).toBeCloseTo(1.16, 6)
    expect(shaft(units(30)) - shaft(units(20))).toBeCloseTo(2.9, 6)

    // 20 mm is at least twice as long as 8 mm
    expect(shaft(units(20))).toBeGreaterThanOrEqual(2 * shaft(units(8)))

    // short designations keep their true proportion: 6 mm is twice 3 mm
    expect(shaft(units(6))).toBeCloseTo(2 * shaft(units(3)), 6)

    // clamped to the documented 2-30 mm range
    expect(units(31)).toBe(30 * OPENGRID_LABEL_SCREW_SHAFT.perMillimetre)
    expect(units(1)).toBe(2 * OPENGRID_LABEL_SCREW_SHAFT.perMillimetre)
  })

  it('falls back to the stub shaft without a designation length', () => {
    const stub = OPENGRID_LABEL_SCREW_SHAFT.stub
    expect(parseOpenGridLabelScrewShaftUnits('M4')).toBe(stub)
    expect(parseOpenGridLabelScrewShaftUnits(undefined)).toBe(stub)
    expect(parseOpenGridLabelScrewShaftUnits('camera')).toBe(stub)
    expect(parseOpenGridLabelScrewShaftUnits('M4x16')).toBeCloseTo(4.64, 6)
    expect(parseOpenGridLabelScrewShaftUnits('M2x3')).toBeCloseTo(0.87, 6)
  })

  it('renders screw gallery paths inside the 16-unit viewBox', () => {
    // Arc commands make generic bounds parsing unreliable; the screw paths
    // are pure lines, so they are checked exactly.
    for (const iconId of ['screw-pan', 'screw-hex'] as const) {
      const icon = LABEL_CARD_ICON_PATHS[iconId]
      expect(icon, iconId).toBeDefined()
      expect(icon.evenOdd).toBe(true)
      for (const d of icon.paths) {
        const { min, max } = svgPathBounds(d)
        expect(min[0], `${iconId} min x`).toBeGreaterThanOrEqual(-0.05)
        expect(min[1], `${iconId} min y`).toBeGreaterThanOrEqual(-0.05)
        expect(max[0], `${iconId} max x`).toBeLessThanOrEqual(16.05)
        expect(max[1], `${iconId} max y`).toBeLessThanOrEqual(16.05)
      }
    }
  })

  it('applies the new layout parameters', () => {
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
        style: 'raised',
        icon: 'gear-fill',
        layout: 'stacked',
        groupAlign: 'left',
        iconSize: 4.5,
        textHeight: 4,
        text: 'M4x16',
      }),
    ).toMatchObject({
      valid: true,
      value: {
        layout: 'stacked',
        groupAlign: 'left',
        iconSize: 4.5,
      },
    })
  })

  it('rejects invalid layout, group alignment, and icon sizes per field', () => {
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
        style: 'raised',
        icon: 'gear-fill',
        layout: 'diagonal',
      }),
    ).toMatchObject({ valid: false, issues: [{ field: 'layout' }] })
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
        style: 'raised',
        icon: 'gear-fill',
        groupAlign: 'up',
      }),
    ).toMatchObject({ valid: false, issues: [{ field: 'groupAlign' }] })
    for (const iconSize of [2.9, 8.1, 4.25]) {
      expect(
        validateOpenGridLabelCardParameters({
          gridUnits: 4,
          style: 'raised',
          icon: 'gear-fill',
          iconSize,
        }),
      ).toMatchObject({ valid: false, issues: [{ field: 'iconSize' }] })
    }
  })

  it('rejects stacked layout without an icon', () => {
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
        style: 'raised',
        icon: 'none',
        layout: 'stacked',
        text: 'M4',
      }),
    ).toMatchObject({
      valid: false,
      issues: [
        { field: 'layout', messageId: 'validation.labelCardStackedNeedsIcon' },
      ],
    })
  })

  it('rejects a second text row and impossible stacks in stacked layout', () => {
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
        style: 'raised',
        icon: 'gear-fill',
        layout: 'stacked',
        iconSize: 4,
        textHeight: 4,
        text: 'M4',
        textLine2: 'extra',
      }),
    ).toMatchObject({
      valid: false,
      issues: [
        {
          field: 'textLine2',
          messageId: 'validation.labelCardStackedSingleRow',
        },
      ],
    })
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
        style: 'raised',
        icon: 'gear-fill',
        layout: 'stacked',
        iconSize: 6,
        textHeight: 4,
        text: 'M4',
      }),
    ).toMatchObject({
      valid: false,
      issues: [
        { field: 'iconSize', messageId: 'validation.labelCardStackedHeight' },
      ],
    })
  })
})

describe('OpenGrid Label Card screw mode', () => {
  it('hydrates legacy snapshots with screw mode off', () => {
    const validation = validateOpenGridLabelCardParameters({
      gridUnits: 4,
      style: 'raised',
      iconPosition: 'left',
      icon: 'gear-fill',
    })
    expect(validation).toMatchObject({
      valid: true,
      value: {
        screwMode: false,
        screwHead: 'phillips',
        screwDiameter: 4,
        screwLength: 16,
      },
    })
  })

  it('derives the composition and ignores stale manual values', () => {
    const validation = validateOpenGridLabelCardParameters({
      gridUnits: 4,
      style: 'raised',
      iconPosition: 'right',
      icon: 'gear-fill',
      text: 'manual',
      textLine2: 'stuff',
      layout: 'stacked',
      groupAlign: 'right',
      iconSize: 3.5,
      screwMode: true,
      screwHead: 'torx',
      screwDiameter: 5,
      screwLength: 20,
    })
    expect(validation).toMatchObject({
      valid: true,
      value: {
        icon: 'screw-pan',
        text: 'M5x20',
        layout: 'inline',
        groupAlign: 'center',
        iconPosition: 'left',
        iconSize: 3.5,
        screwMode: true,
        screwHead: 'torx',
        screwDiameter: 5,
        screwLength: 20,
        textHeight: 3,
      },
    })
    expect(validation.valid && validation.value.textLine2).toBeUndefined()
  })

  it('maps hex heads to the hex side view and phillips to the pan side view', () => {
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
        style: 'raised',
        iconPosition: 'left',
        screwMode: true,
        screwHead: 'hex',
      }),
    ).toMatchObject({ valid: true, value: { icon: 'screw-hex' } })
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 4,
        style: 'raised',
        iconPosition: 'left',
        screwMode: true,
        screwHead: 'phillips',
      }),
    ).toMatchObject({ valid: true, value: { icon: 'screw-pan' } })
  })

  it('accepts decimal designations beyond the manual six-character cap', () => {
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 5,
        style: 'raised',
        iconPosition: 'left',
        screwMode: true,
        screwDiameter: 2.5,
        screwLength: 30,
      }),
    ).toMatchObject({ valid: true, value: { text: 'M2.5x30' } })
  })

  it('rejects compositions that cannot fit the card width', () => {
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 1,
        style: 'raised',
        iconPosition: 'left',
        screwMode: true,
      }),
    ).toMatchObject({
      valid: false,
      issues: [
        {
          field: 'screwLength',
          messageId: 'validation.labelCardScrewTooWide',
        },
      ],
    })
  })

  it('rejects real-scale shafts that overflow the card and accepts wider cards', () => {
    const overflow = {
      gridUnits: 4,
      style: 'raised',
      iconPosition: 'left',
      screwMode: true,
      screwDiameter: 4,
      screwLength: 30,
    } as const
    expect(validateOpenGridLabelCardParameters(overflow)).toMatchObject({
      valid: false,
      issues: [
        {
          field: 'screwLength',
          messageId: 'validation.labelCardScrewTooWide',
        },
      ],
    })
    expect(
      validateOpenGridLabelCardParameters({ ...overflow, gridUnits: 6 }),
    ).toMatchObject({ valid: true, value: { text: 'M4x30' } })
  })

  it('rejects explicit heights that break the screw composition', () => {
    expect(
      validateOpenGridLabelCardParameters({
        gridUnits: 5,
        style: 'raised',
        iconPosition: 'left',
        screwMode: true,
        textHeight: 7,
      }),
    ).toMatchObject({
      valid: false,
      issues: [
        { field: 'textHeight', messageId: 'validation.labelCardStackedHeight' },
      ],
    })
  })

  it('rejects invalid screw picker values per field', () => {
    const base = {
      gridUnits: 4,
      style: 'raised',
      iconPosition: 'left',
      icon: 'gear-fill',
    }
    expect(
      validateOpenGridLabelCardParameters({
        ...base,
        screwMode: 'yes',
      }),
    ).toMatchObject({ valid: false, issues: [{ field: 'screwMode' }] })
    expect(
      validateOpenGridLabelCardParameters({
        ...base,
        screwHead: 'square',
      }),
    ).toMatchObject({ valid: false, issues: [{ field: 'screwHead' }] })
    expect(
      validateOpenGridLabelCardParameters({
        ...base,
        screwDiameter: 7,
      }),
    ).toMatchObject({ valid: false, issues: [{ field: 'screwDiameter' }] })
    expect(
      validateOpenGridLabelCardParameters({
        ...base,
        screwLength: 31,
      }),
    ).toMatchObject({ valid: false, issues: [{ field: 'screwLength' }] })
    expect(
      validateOpenGridLabelCardParameters({
        ...base,
        screwLength: 12.5,
      }),
    ).toMatchObject({ valid: false, issues: [{ field: 'screwLength' }] })
  })

  it('encodes screw tokens into export file names without collisions', () => {
    const screwCard = {
      gridUnits: 4,
      style: 'raised',
      iconPosition: 'left',
      icon: 'gear-fill',
      screwMode: true,
      screwHead: 'phillips',
      screwDiameter: 4,
      screwLength: 16,
    } as const
    const name = openGridLabelCardThreeMfFileName(screwCard)
    expect(name).toContain('-sm-phillips-d4-l16.3mf')
    const wider = openGridLabelCardThreeMfFileName({
      ...screwCard,
      screwDiameter: 5,
    })
    expect(wider).toContain('-sm-phillips-d5-l16.3mf')
    expect(wider).not.toBe(name)
    const manualCard = {
      gridUnits: 6,
      style: 'raised' as const,
      iconPosition: 'left' as const,
      icon: 'screw-pan' as const,
      text: 'M4x16',
    }
    expect(openGridLabelCardThreeMfFileName(manualCard)).not.toBe(name)
  })

  it('reports screw-mode bounds as a non-blank raised card', () => {
    expect(
      boundsForOpenGridLabelCard({
        gridUnits: 4,
        style: 'raised',
        iconPosition: 'left',
        icon: 'gear-fill',
        screwMode: true,
      }),
    ).toEqual({ min: [-20, -6, 0], max: [20, 6, 1] })
  })

  it('round-trips screw-mode parameters through the workspace raw layer', () => {
    const raw = {
      gridUnits: '5',
      style: 'raised',
      iconPosition: 'left',
      textHeight: '3',
      screwMode: 'true',
      screwHead: 'torx',
      screwDiameter: '2.5',
      screwLength: '12',
    }
    const parsed = parseOpenGridLabelCardRawParameters(raw)
    expect(parsed).toMatchObject({
      valid: true,
      value: {
        screwMode: true,
        screwHead: 'torx',
        screwDiameter: 2.5,
        screwLength: 12,
        text: 'M2.5x12',
      },
    })
    const serialized = rawFromParameters(parsed.valid ? parsed.value : {})
    expect(serialized.screwMode).toBe('true')
    expect(serialized.screwHead).toBe('torx')
    expect(serialized.screwDiameter).toBe('2.5')
    expect(serialized.screwLength).toBe('12')
    expect(parseOpenGridLabelCardRawParameters(serialized)).toMatchObject({
      valid: true,
    })
    expect(
      parseOpenGridLabelCardRawParameters({
        ...raw,
        bogus: 'x',
      } as Record<string, string>),
    ).toMatchObject({ valid: false })
    expect(
      parseOpenGridLabelCardRawParameters({ ...raw, screwMode: 'yes' }),
    ).toMatchObject({ valid: false })
    const absentHeight = parseOpenGridLabelCardRawParameters({
      gridUnits: '5',
      style: 'raised',
      iconPosition: 'left',
      screwMode: 'true',
      screwHead: 'hex',
      screwDiameter: '8',
      screwLength: '4',
      layout: 'diagonal',
      groupAlign: 'sideways',
    })
    expect(absentHeight).toMatchObject({
      valid: true,
      value: {
        textHeight: 3,
        icon: 'screw-hex',
        text: 'M8x4',
        layout: 'inline',
        groupAlign: 'center',
      },
    })
  })
})
