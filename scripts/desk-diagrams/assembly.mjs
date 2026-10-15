/** Shared schematic geometry. Detailed instructions live in accessible HTML. */
function project(x, y, z) {
  return [300 + (x - y) * 2.3, 170 + (x + y) * 0.85 - z * 1.3]
}

function polygon(points, fill, stroke) {
  const coordinates = points
    .map((point) => project(...point).join(','))
    .join(' ')
  return `<polygon points="${coordinates}" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>`
}

function plane(x, y, width, depth, z) {
  return [
    [x, y, z],
    [x + width, y, z],
    [x + width, y + depth, z],
    [x, y + depth, z],
  ]
}

function slab(c, x, y, width, depth, bottom, thickness, fillSlot, edgeSlot) {
  const top = bottom + thickness
  const fill = c.color(fillSlot)
  const edge = c.color(edgeSlot)
  return [
    polygon(
      [
        [x, y + depth, bottom],
        [x + width, y + depth, bottom],
        [x + width, y + depth, top],
        [x, y + depth, top],
      ],
      fill,
      edge,
    ),
    polygon(
      [
        [x + width, y, bottom],
        [x + width, y + depth, bottom],
        [x + width, y + depth, top],
        [x + width, y, top],
      ],
      fill,
      edge,
    ),
    polygon(plane(x, y, width, depth, top), fill, edge),
  ].join('\n')
}

function board(c) {
  const parts = [slab(c, 0, 0, 90, 90, 0, 4, 'cardBlueFill', 'accentBlue')]
  for (const [x, y] of [
    [0, 0],
    [45, 0],
    [0, 45],
    [45, 45],
  ]) {
    parts.push(
      polygon(
        plane(x + 5, y + 5, 35, 35, 4),
        c.color('background'),
        c.color('gridLine'),
      ),
    )
  }
  return parts.join('\n')
}

function openBox(c, bottom) {
  const top = bottom + 45
  const fill = c.color('cardVioletFill')
  const edge = c.color('accentViolet')
  const outer = plane(0.3, 0.3, 89.4, 89.4, top)
  const inner = plane(5, 5, 80, 80, top)
  const outline = (points) =>
    points
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'L'} ${project(...point).join(' ')}`,
      )
      .join(' ') + ' Z'
  return [
    polygon(
      [
        [5, 5, bottom + 5],
        [85, 5, bottom + 5],
        [85, 5, top],
        [5, 5, top],
      ],
      fill,
      edge,
    ),
    polygon(
      [
        [5, 5, bottom + 5],
        [5, 85, bottom + 5],
        [5, 85, top],
        [5, 5, top],
      ],
      fill,
      edge,
    ),
    polygon(plane(5, 5, 80, 80, bottom + 5), c.color('background'), edge),
    polygon(
      [
        [0.3, 89.7, bottom],
        [89.7, 89.7, bottom],
        [89.7, 89.7, top],
        [0.3, 89.7, top],
      ],
      fill,
      edge,
    ),
    polygon(
      [
        [89.7, 0.3, bottom],
        [89.7, 89.7, bottom],
        [89.7, 89.7, top],
        [89.7, 0.3, top],
      ],
      fill,
      edge,
    ),
    `<path d="${outline(outer)} ${outline([...inner].reverse())}" fill="${fill}" fill-rule="evenodd" stroke="${edge}" stroke-width="2" stroke-linejoin="round"/>`,
  ].join('\n')
}

function label(c, x, y, text, colorSlot) {
  return `<text x="${x}" y="${y}" font-family="${c.font}" font-size="24" font-weight="700" fill="${c.color(colorSlot)}">${text}</text>`
}

function frame(c, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="430" viewBox="0 0 600 430" role="img" aria-labelledby="title desc">
  <title id="title">${c.t('title')}</title>
  <desc id="desc">${c.t('description')}</desc>
  <rect width="600" height="430" rx="12" fill="${c.color('background')}"/>
  ${content}
</svg>
`
}

export function renderDirectPlacement(c) {
  return frame(
    c,
    [
      board(c),
      openBox(c, 1.675),
      label(c, 30, 45, c.t('box'), 'headingViolet'),
      label(c, 350, 385, c.t('board'), 'headingBlue'),
      `<path d="M 210 50 L 235 111 M 420 357 L 410 319" fill="none" stroke="${c.color('arrow')}" stroke-width="2"/>`,
    ].join('\n'),
  )
}

export function renderSnapFixing(c) {
  const parts = [board(c)]
  for (const [x, y] of [
    [0, 0],
    [45, 0],
    [0, 45],
    [45, 45],
  ]) {
    parts.push(
      slab(c, x + 4, y + 4, 37, 37, 15, 5, 'cardTealFill', 'accentTeal'),
    )
  }
  for (const [x, y] of [
    [12, 12],
    [78, 12],
    [12, 78],
    [78, 78],
  ]) {
    const [cx, cy] = project(x, y, 32)
    parts.push(
      `<path d="M ${cx} ${cy - 17} V ${cy}" stroke="${c.color('accentAmber')}" stroke-width="10" stroke-linecap="round"/>`,
    )
  }
  parts.push(openBox(c, 66))
  parts.push(label(c, 30, 30, c.t('box'), 'headingViolet'))
  parts.push(label(c, 30, 355, c.t('snap'), 'headingTeal'))
  parts.push(label(c, 355, 385, c.t('board'), 'headingBlue'))
  parts.push(
    `<path d="M 176 347 L 243 281 M 423 358 L 410 320" fill="none" stroke="${c.color('arrow')}" stroke-width="2"/>`,
  )
  return frame(c, parts.join('\n'))
}

function seatOption(c, x, builtIn) {
  const edge = c.color('accentViolet')
  const seat = c.color('accentAmber')
  const parts = [
    `<rect x="${x}" y="65" width="266" height="325" rx="20" fill="${c.color('cardVioletFill')}" stroke="${c.color('pillStroke')}"/>`,
    `<path d="M ${x + 60} 157 L ${x + 172} 157 L ${x + 202} 181 L ${x + 90} 181 Z M ${x + 90} 181 V 236 H ${x + 202} V 181" fill="${c.color('background')}" stroke="${edge}" stroke-width="3" stroke-linejoin="round"/>`,
  ]
  if (builtIn) {
    parts.push(
      `<path d="M ${x + 128} 236 V 272 M ${x + 175} 236 V 272" stroke="${seat}" stroke-width="13" stroke-linecap="round"/>`,
    )
    parts.push(label(c, x + 20, 108, c.t('integrated'), 'headingViolet'))
    parts.push(label(c, x + 20, 346, c.t('noExtra'), 'headingAmber'))
    return parts.join('\n')
  }
  parts.push(
    `<ellipse cx="${x + 150}" cy="235" rx="14" ry="7" fill="${c.color('background')}" stroke="${seat}" stroke-width="3"/>`,
  )
  parts.push(
    `<path d="M ${x + 150} 282 V 309" stroke="${seat}" stroke-width="12" stroke-linecap="round"/>`,
  )
  parts.push(
    `<ellipse cx="${x + 150}" cy="282" rx="17" ry="7" fill="${seat}"/>`,
  )
  parts.push(
    `<path d="M ${x + 150} 270 V 250" stroke="${c.color('arrow')}" stroke-width="2" stroke-dasharray="5 4"/>`,
  )
  parts.push(label(c, x + 20, 108, c.t('separate'), 'headingViolet'))
  parts.push(label(c, x + 20, 346, c.t('extra'), 'headingAmber'))
  return parts.join('\n')
}

export function renderSeatOptions(c) {
  return frame(
    c,
    [
      label(c, 24, 36, c.t('choice'), 'heading'),
      seatOption(c, 24, false),
      seatOption(c, 310, true),
    ].join('\n'),
  )
}
