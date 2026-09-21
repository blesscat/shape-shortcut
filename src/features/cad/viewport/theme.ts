import type {
  CadViewportAppearance,
  CadViewportPresentation,
} from './presentation'

export type CadViewportTheme = {
  background: string
  gridMajor: string
  gridMinor: string
  gizmoBackground: string
  edge: string
  annotation: string
  annotationLabel: string
  faceHighlight: string
  hemisphereSky: string
  hemisphereGround: string
  keyLight: string
  oppositeFill: string
}

export const CAD_VIEWPORT_THEME_FALLBACK = {
  background: '#eef2f8',
  gridMajor: '#b9c4d7',
  gridMinor: '#d8deea',
  gizmoBackground: '#eef2f8',
  edge: '#1f3b74',
  annotation: '#8d98a3',
  annotationLabel: '#7f8a95',
  faceHighlight: '#f59e0b',
  hemisphereSky: '#ffffff',
  hemisphereGround: '#c5cfdf',
  keyLight: '#ffffff',
  oppositeFill: '#dbe7ff',
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
