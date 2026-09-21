import { describe, expect, it, vi } from 'vitest'
import {
  CAD_VIEWPORT_THEME_FALLBACK,
  resolveCadViewportTheme,
  subscribeToCadViewportTheme,
  viewportThemeForPresentation,
} from '../../src/features/cad/viewport/theme'

function createTokenReader(
  overrides: Partial<Record<string, string>> = {},
): (name: string) => string {
  return (name) => overrides[name] ?? ''
}

describe('CAD viewport theme', () => {
  it('resolves renderer colors from the shared CSS token names', () => {
    const theme = resolveCadViewportTheme(
      createTokenReader({
        '--color-viewport': '#101827',
        '--cad-viewport-grid-major': '#485875',
        '--cad-viewport-grid-minor': '#2d3a52',
        '--cad-viewport-gizmo-background': '#202b3d',
        '--cad-viewport-edge': '#c0d0ff',
        '--cad-viewport-annotation': '#d9e1f0',
        '--cad-viewport-annotation-label': '#c8d3e7',
        '--cad-viewport-face-highlight': '#fbbf24',
        '--cad-viewport-light-sky': '#d8e2f2',
        '--cad-viewport-light-ground': '#56647b',
        '--cad-viewport-light-key': '#f2f6ff',
        '--cad-viewport-light-fill': '#a9c1f2',
      }),
    )

    expect(theme).toEqual({
      background: '#101827',
      gridMajor: '#485875',
      gridMinor: '#2d3a52',
      gizmoBackground: '#202b3d',
      edge: '#c0d0ff',
      annotation: '#d9e1f0',
      annotationLabel: '#c8d3e7',
      faceHighlight: '#fbbf24',
      hemisphereSky: '#d8e2f2',
      hemisphereGround: '#56647b',
      keyLight: '#f2f6ff',
      oppositeFill: '#a9c1f2',
    })
  })

  it('falls back to the light renderer palette when a CSS token is unavailable', () => {
    expect(resolveCadViewportTheme(createTokenReader())).toEqual(
      CAD_VIEWPORT_THEME_FALLBACK,
    )
  })

  it('keeps light thumbnail rendering on the shared light palette and honors the dark appearance', () => {
    const darkTheme = {
      ...CAD_VIEWPORT_THEME_FALLBACK,
      background: '#101827',
      edge: '#c0d0ff',
    }

    expect(viewportThemeForPresentation('thumbnail', darkTheme)).toEqual(
      CAD_VIEWPORT_THEME_FALLBACK,
    )
    expect(
      viewportThemeForPresentation('thumbnail', darkTheme, 'light'),
    ).toEqual(CAD_VIEWPORT_THEME_FALLBACK)
    expect(viewportThemeForPresentation('thumbnail', darkTheme, 'dark')).toBe(
      darkTheme,
    )
    expect(viewportThemeForPresentation('workspace', darkTheme)).toBe(darkTheme)
  })

  it('notifies subscribers with the current theme and removes the listener', () => {
    let listener: (() => void) | undefined
    const mediaQuery = {
      addEventListener: vi.fn((_type: 'change', nextListener: () => void) => {
        listener = nextListener
      }),
      removeEventListener: vi.fn(),
    }
    const nextTheme = {
      ...CAD_VIEWPORT_THEME_FALLBACK,
      background: '#101827',
    }
    const readTheme = vi.fn(() => nextTheme)
    const onChange = vi.fn()

    const dispose = subscribeToCadViewportTheme(mediaQuery, readTheme, onChange)

    listener?.()
    dispose()

    expect(readTheme).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith(nextTheme)
    expect(mediaQuery.addEventListener).toHaveBeenCalledOnce()
    expect(mediaQuery.removeEventListener).toHaveBeenCalledOnce()
  })
})
