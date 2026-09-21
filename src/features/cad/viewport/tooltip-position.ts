export type TooltipLayoutInput = {
  pointerX: number
  pointerY: number
  tooltipWidth: number
  tooltipHeight: number
  containerWidth: number
  containerHeight: number
  offset?: number
  margin?: number
}

export type TooltipLayout = {
  left: number
  top: number
}

const DEFAULT_OFFSET = 14
const DEFAULT_MARGIN = 8

/**
 * Places a cursor-following tooltip inside a container. Prefers the lower-right
 * of the pointer, flips to the left or above when the tooltip would overflow,
 * and always clamps inside the container margins.
 */
export function computeTooltipLayout(input: TooltipLayoutInput): TooltipLayout {
  const offset = input.offset ?? DEFAULT_OFFSET
  const margin = input.margin ?? DEFAULT_MARGIN

  const preferLeft =
    input.pointerX + offset + input.tooltipWidth > input.containerWidth - margin
  const preferAbove =
    input.pointerY + offset + input.tooltipHeight >
    input.containerHeight - margin

  let left = preferLeft
    ? input.pointerX - offset - input.tooltipWidth
    : input.pointerX + offset
  let top = preferAbove
    ? input.pointerY - offset - input.tooltipHeight
    : input.pointerY + offset

  const maxLeft = input.containerWidth - input.tooltipWidth - margin
  const maxTop = input.containerHeight - input.tooltipHeight - margin
  if (left < margin) left = margin
  if (top < margin) top = margin
  if (left > maxLeft) left = maxLeft
  if (top > maxTop) top = maxTop
  if (left < margin) left = margin
  if (top < margin) top = margin

  return { left, top }
}
