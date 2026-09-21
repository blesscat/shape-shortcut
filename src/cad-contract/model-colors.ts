export type ModelColors = { primary: string; secondary: string }

export const DEFAULT_MODEL_COLORS: Readonly<ModelColors> = Object.freeze({
  primary: '#4e7cff',
  secondary: '#f59e0b',
})

export function isModelColor(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length === 7 &&
    /^#[0-9a-f]{6}$/i.test(value)
  )
}

export function isModelColors(value: unknown): value is ModelColors {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const colors = value as Record<string, unknown>
  return isModelColor(colors.primary) && isModelColor(colors.secondary)
}
