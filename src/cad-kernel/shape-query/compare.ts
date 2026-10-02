export function closeEnough(
  first: number,
  second: number,
  tolerance = 0.15,
): boolean {
  return Math.abs(first - second) <= tolerance
}
