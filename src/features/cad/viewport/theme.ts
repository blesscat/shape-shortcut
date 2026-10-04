import type {
  CadViewportAppearance,
  CadViewportPresentation,
} from './presentation'

export type CadViewportTheme = {
  background: string
  gridMajor: string
  gridMinor: string
  gizmoBackground: string
  gizmoX: string
  gizmoY: string
  gizmoZ: string
  gizmoLabel: string
  edge: string
  annotation: string
  annotationLabel: string
  hover: string
  selection: string
  selectionFill: string
  error: string
  errorFill: string
  faceHighlight: string
  hemisphereSky: string
  hemisphereGround: string
  keyLight: string
  oppositeFill: string
  boardFace: string
  boardEdge: string
  contactShadow: string
}

/* Warm light viewport theme (design-tokens.css Part D-A, v2 / 4.2.3). Dark
   values arrive via the CSS tokens; this constant only backstops token-less
   contexts such as light-mode thumbnails. */
export const CAD_VIEWPORT_THEME_FALLBACK = {
  background: '#f7f3ef',
  gridMajor: '#52525b',
  gridMinor: 'rgba(82, 82, 91, 0.85)',
  gizmoBackground: '#fff7f2',
  gizmoX: '#c8401f',
  gizmoY: '#1f7a3a',
  gizmoZ: '#0284c7',
  gizmoLabel: '#362a24',
  edge: '#3a2e27',
  annotation: '#0284c7',
  annotationLabel: '#6e5f57',
  hover: '#ffb454',
  selection: '#0284c7',
  selectionFill: 'rgba(2, 132, 199, 0.14)',
  error: '#d6452b',
  errorFill: 'rgba(214, 69, 43, 0.16)',
  faceHighlight: 'rgba(255, 180, 84, 0.35)',
  hemisphereSky: '#ffffff',
  hemisphereGround: '#c9bcb2',
  keyLight: '#ffffff',
  oppositeFill: '#f3eae2',
  boardFace: '#efe6dc',
  boardEdge: '#3a2e27',
  contactShadow: 'rgba(59, 43, 36, 0.2)',
} as const satisfies CadViewportTheme

type ThemeTokenReader = (name: string) => string

type ThemeMediaQuery = {
  addEventListener?: (type: 'change', listener: () => void) => void
  removeEventListener?: (type: 'change', listener: () => void) => void
  addListener?: (listener: () => void) => void
  removeListener?: (listener: () => void) => void
}

function readThemeToken(
  readToken: ThemeTokenReader,
  name: string,
  fallback: string,
): string {
  return readToken(name).trim() || fallback
}

export function resolveCadViewportTheme(
  readToken: ThemeTokenReader,
): CadViewportTheme {
  return {
    background: readThemeToken(
      readToken,
      '--color-viewport',
      CAD_VIEWPORT_THEME_FALLBACK.background,
    ),
    gridMajor: readThemeToken(
      readToken,
      '--cad-viewport-grid-major',
      CAD_VIEWPORT_THEME_FALLBACK.gridMajor,
    ),
    gridMinor: readThemeToken(
      readToken,
      '--cad-viewport-grid-minor',
      CAD_VIEWPORT_THEME_FALLBACK.gridMinor,
    ),
    gizmoBackground: readThemeToken(
      readToken,
      '--cad-viewport-gizmo-background',
      CAD_VIEWPORT_THEME_FALLBACK.gizmoBackground,
    ),
    gizmoX: readThemeToken(
      readToken,
      '--cad-viewport-gizmo-x',
      CAD_VIEWPORT_THEME_FALLBACK.gizmoX,
    ),
    gizmoY: readThemeToken(
      readToken,
      '--cad-viewport-gizmo-y',
      CAD_VIEWPORT_THEME_FALLBACK.gizmoY,
    ),
    gizmoZ: readThemeToken(
      readToken,
      '--cad-viewport-gizmo-z',
      CAD_VIEWPORT_THEME_FALLBACK.gizmoZ,
    ),
    gizmoLabel: readThemeToken(
      readToken,
      '--cad-viewport-gizmo-label',
      CAD_VIEWPORT_THEME_FALLBACK.gizmoLabel,
    ),
    edge: readThemeToken(
      readToken,
      '--cad-viewport-edge',
      CAD_VIEWPORT_THEME_FALLBACK.edge,
    ),
    annotation: readThemeToken(
      readToken,
      '--cad-viewport-annotation',
      CAD_VIEWPORT_THEME_FALLBACK.annotation,
    ),
    annotationLabel: readThemeToken(
      readToken,
      '--cad-viewport-annotation-label',
      CAD_VIEWPORT_THEME_FALLBACK.annotationLabel,
    ),
    hover: readThemeToken(
      readToken,
      '--cad-viewport-hover',
      CAD_VIEWPORT_THEME_FALLBACK.hover,
    ),
    selection: readThemeToken(
      readToken,
      '--cad-viewport-selection',
      CAD_VIEWPORT_THEME_FALLBACK.selection,
    ),
    selectionFill: readThemeToken(
      readToken,
      '--cad-viewport-selection-fill',
      CAD_VIEWPORT_THEME_FALLBACK.selectionFill,
    ),
    error: readThemeToken(
      readToken,
      '--cad-viewport-error',
      CAD_VIEWPORT_THEME_FALLBACK.error,
    ),
    errorFill: readThemeToken(
      readToken,
      '--cad-viewport-error-fill',
      CAD_VIEWPORT_THEME_FALLBACK.errorFill,
    ),
    faceHighlight: readThemeToken(
      readToken,
      '--cad-viewport-face-highlight',
      CAD_VIEWPORT_THEME_FALLBACK.faceHighlight,
    ),
    hemisphereSky: readThemeToken(
      readToken,
      '--cad-viewport-light-sky',
      CAD_VIEWPORT_THEME_FALLBACK.hemisphereSky,
    ),
    hemisphereGround: readThemeToken(
      readToken,
      '--cad-viewport-light-ground',
      CAD_VIEWPORT_THEME_FALLBACK.hemisphereGround,
    ),
    keyLight: readThemeToken(
      readToken,
      '--cad-viewport-light-key',
      CAD_VIEWPORT_THEME_FALLBACK.keyLight,
    ),
    oppositeFill: readThemeToken(
      readToken,
      '--cad-viewport-light-fill',
      CAD_VIEWPORT_THEME_FALLBACK.oppositeFill,
    ),
    boardFace: readThemeToken(
      readToken,
      '--cad-viewport-board-face',
      CAD_VIEWPORT_THEME_FALLBACK.boardFace,
    ),
    boardEdge: readThemeToken(
      readToken,
      '--cad-viewport-board-edge',
      CAD_VIEWPORT_THEME_FALLBACK.boardEdge,
    ),
    contactShadow: readThemeToken(
      readToken,
      '--cad-viewport-contact-shadow',
      CAD_VIEWPORT_THEME_FALLBACK.contactShadow,
    ),
  }
}

export function readCadViewportTheme(): CadViewportTheme {
  if (typeof document === 'undefined') return CAD_VIEWPORT_THEME_FALLBACK

  const styles = getComputedStyle(document.documentElement)
  return resolveCadViewportTheme((name) => styles.getPropertyValue(name))
}

export function viewportThemeForPresentation(
  presentation: CadViewportPresentation,
  observedTheme: CadViewportTheme,
  appearance: CadViewportAppearance = 'light',
): CadViewportTheme {
  if (presentation === 'thumbnail' && appearance !== 'dark') {
    return CAD_VIEWPORT_THEME_FALLBACK
  }
  return observedTheme
}

export function subscribeToCadViewportTheme(
  mediaQuery: ThemeMediaQuery,
  readTheme: () => CadViewportTheme,
  onChange: (theme: CadViewportTheme) => void,
): () => void {
  const handleChange = () => onChange(readTheme())

  if (
    typeof mediaQuery.addEventListener === 'function' &&
    typeof mediaQuery.removeEventListener === 'function'
  ) {
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener?.('change', handleChange)
  }

  if (
    typeof mediaQuery.addListener === 'function' &&
    typeof mediaQuery.removeListener === 'function'
  ) {
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener?.(handleChange)
  }

  return () => {}
}

export function observeCadViewportTheme(
  onChange: (theme: CadViewportTheme) => void,
): () => void {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return () => {}
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const disposeMediaQuery = subscribeToCadViewportTheme(
    mediaQuery,
    readCadViewportTheme,
    onChange,
  )

  if (typeof MutationObserver === 'undefined') return disposeMediaQuery

  const observer = new MutationObserver(() => {
    onChange(readCadViewportTheme())
  })
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })

  return () => {
    disposeMediaQuery()
    observer.disconnect()
  }
}
