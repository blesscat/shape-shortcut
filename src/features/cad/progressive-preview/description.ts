/** Display-only polygons in the model's authored frame; no CAD or export data. */
export type Point2 = [number, number]
export type Point3 = [number, number, number]
export type PreviewSolid = {
  outline: Point2[]
  hole: Point2[] | null
  depth: number
  /** Local XY/depth coordinates mapped to the authored coordinate frame. */
  origin: Point3
  u: Point3
  v: Point3
  w: Point3
}
export type PreviewDescription = readonly PreviewSolid[]

export function rectangle(width: number, depth: number): Point2[] {
  return [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [width / 2, depth / 2],
    [-width / 2, depth / 2],
  ]
}

export function ellipse(width: number, depth: number, segments = 24): Point2[] {
  return Array.from({ length: segments }, (_, i) => {
    const angle = (i * Math.PI * 2) / segments
    return [(Math.cos(angle) * width) / 2, (Math.sin(angle) * depth) / 2]
  })
}

export function extrude(
  outline: Point2[],
  hole: Point2[] | null,
  depth: number,
  z = 0,
): PreviewSolid {
  return {
    outline,
    hole,
    depth,
    origin: [0, 0, z],
    u: [1, 0, 0],
    v: [0, 1, 0],
    w: [0, 0, 1],
  }
}

export function slab(
  width: number,
  depth: number,
  height: number,
  x = 0,
  y = 0,
  z = 0,
): PreviewSolid {
  const solid = extrude(rectangle(width, depth), null, height, z)
  solid.origin = [x, y, z]
  return solid
}

export function transform(
  solid: PreviewSolid,
  point: (p: Point3) => Point3,
): PreviewSolid {
  const origin = point(solid.origin)
  const vector = (axis: Point3): Point3 => {
    const end = point(solid.origin.map((v, i) => v + axis[i]) as Point3)
    return end.map((v, i) => v - origin[i]) as Point3
  }
  return {
    ...solid,
    origin,
    u: vector(solid.u),
    v: vector(solid.v),
    w: vector(solid.w),
  }
}

/** Extrude a Y/Z side profile along X. */
export function sideProfile(
  points: Point2[],
  x: number,
  thickness: number,
): PreviewSolid {
  return {
    ...extrude(points, null, thickness),
    origin: [x, 0, 0],
    u: [0, 1, 0],
    v: [0, 0, 1],
    w: [1, 0, 0],
  }
}
