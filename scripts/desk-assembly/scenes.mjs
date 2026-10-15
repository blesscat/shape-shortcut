export const assemblyScenes = [
  { id: 'direct-placement', duration: 8, posterTime: 1.6 },
  { id: 'snap-fixing', duration: 9, posterTime: 4.1 },
  { id: 'locating-seats', duration: 10, posterTime: 2 },
]

function progress(time, start, end) {
  const t = Math.max(0, Math.min(1, (time - start) / (end - start)))
  return t * t * (3 - 2 * t)
}

function part(id, mesh, position = [0, 0, 0], rotationZ = 0) {
  return { id, mesh, position, rotationZ }
}

// Millimetres in the builders' Z-up coordinates; no display-only rescaling.
export function assemblySceneAt(id, seconds, datums) {
  const scene = assemblyScenes.find((candidate) => candidate.id === id)
  if (!scene) throw new Error(`Unknown assembly scene: ${id}`)
  const time = Math.max(0, Math.min(scene.duration, seconds))
  if (id === 'direct-placement') {
    const height =
      36 * (1 - progress(time, 0.8, 3)) +
      28 * progress(time, 4.2, 5.4) * (1 - progress(time, 5.8, 7.2))
    return [
      part('board', 'board'),
      part('box', 'box-none', [0, 0, datums.directBoxZ + height]),
    ]
  }
  if (id === 'snap-fixing') {
    const parts = [part('board', 'board')]
    const centers = [
      [-14, -14],
      [14, -14],
      [-14, 14],
      [14, 14],
    ]
    centers.forEach(([x, y], index) => {
      const height =
        16 * (1 - progress(time, 0.4 + index * 0.6, 1.5 + index * 0.6))
      parts.push(part(`snap-${index}`, 'snap', [x, y, datums.snapZ + height]))
    })
    parts.push(
      part('box', 'box-integrated', [
        0,
        0,
        datums.fixedBoxZ + 38 * (1 - progress(time, 4.2, 7.3)),
      ]),
    )
    return parts
  }
  const parts = [
    part('detachable-box', 'box-detachable', [-36, 0, 0]),
    part('integrated-box', 'box-integrated', [36, 0, 0]),
  ]
  const sockets = [
    [-21, 21, 0],
    [21, 21, 90],
    [21, -21, 180],
    [-21, -21, 270],
  ]
  for (const [index, [x, y, finalDegrees]] of sockets.entries()) {
    const height = -3.8 - 17 * (1 - progress(time, 1, 3.5))
    const degrees = finalDegrees + 90 * progress(time, 4.5, 7)
    parts.push(
      part(
        `seat-${index}`,
        'seat',
        [x - 36, y, height],
        (degrees * Math.PI) / 180,
      ),
    )
  }
  return parts
}
