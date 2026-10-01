/**
 * Semantic color slots for the Desk System documentation diagrams.
 *
 * Every slot maps to a light and a dark hex value. Light values are the exact
 * colors of the original hand-authored SVGs (byte-stability depends on this).
 * Dark values keep each step's hue identity with deep tints; the neutral slots
 * (background, text ramp) match the site's warm dark tokens
 * (#201a16 page, #f4ede7 ink, #b8a99f muted — see src/styles/global.css).
 * `white` stays a literal in the diagram templates — it is only
 * used for text/rings on saturated accent circles.
 */
export const PALETTE = {
  background: { light: '#f8fafc', dark: '#201a16' },
  heading: { light: '#0f172a', dark: '#f4ede7' },
  body: { light: '#1e293b', dark: '#d9cec5' },
  muted: { light: '#475569', dark: '#b8a99f' },
  arrow: { light: '#64748b', dark: '#b8a99f' },
  shadow: { light: '#0f172a', dark: '#000000' },
  cardBlueFill: { light: '#eaf2ff', dark: '#172554' },
  accentBlue: { light: '#2563eb', dark: '#3b82f6' },
  headingBlue: { light: '#1e3a8a', dark: '#93c5fd' },
  gridLine: { light: '#93c5fd', dark: '#1e40af' },
  cardTealFill: { light: '#e7fbf7', dark: '#042f2e' },
  accentTeal: { light: '#0d9488', dark: '#2dd4bf' },
  headingTeal: { light: '#115e59', dark: '#5eead4' },
  cardAmberFill: { light: '#fff7ed', dark: '#451a03' },
  accentAmber: { light: '#f59e0b', dark: '#fbbf24' },
  headingAmber: { light: '#92400e', dark: '#fcd34d' },
  cardVioletFill: { light: '#f3eefe', dark: '#2e1065' },
  accentViolet: { light: '#7c3aed', dark: '#8b5cf6' },
  headingViolet: { light: '#5b21b6', dark: '#c4b5fd' },
  pillFill: { light: '#eef2ff', dark: '#1e1b4b' },
  pillStroke: { light: '#c7d2fe', dark: '#4338ca' },
  pillText: { light: '#3730a3', dark: '#a5b4fc' },
}

/** Locales the generator must emit for every diagram. */
export const LOCALES = ['en', 'zh-Hant']

/** Locale-resolved UI font stack (badge-only texts keep a literal Inter). */
export const FONTS = {
  en: 'Inter, sans-serif',
  'zh-Hant': 'Noto Sans TC, Inter, sans-serif',
}
