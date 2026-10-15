import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { loadAssemblyAssets } from './assets'
import { progressAtReadingPosition } from './timeline'
import { createAssemblyViewer } from './viewer'
import type { AssemblyScene } from './types'

gsap.registerPlugin(ScrollTrigger)

export async function enhanceAssembly(root: HTMLElement): Promise<() => void> {
  const canvas = root.querySelector<HTMLElement>('[data-assembly-canvas]')!
  const stage = root.querySelector<HTMLElement>('.assembly-stage')!
  const instructions = Array.from(
    root.querySelectorAll<HTMLElement>('[data-assembly-instruction]'),
  )
  const links = Array.from(
    root.querySelectorAll<HTMLAnchorElement>('[data-assembly-step]'),
  )
  const progress = root.querySelector<HTMLProgressElement>(
    '[data-assembly-progress]',
  )!
  const current = root.querySelector<HTMLElement>('[data-assembly-current]')!
  const tools = root.querySelector<HTMLElement>('[data-assembly-tools]')!
  const failure = root.querySelector<HTMLElement>('[data-assembly-failure]')!
  const scrollControlled = root.dataset.assemblyMode === 'scroll'
  const reading = { progress: 0 }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const systemTheme = matchMedia('(prefers-color-scheme: dark)')
  const listeners = new AbortController()
  let disposed = false
  let viewer: ReturnType<typeof createAssemblyViewer> | undefined
  let trigger: ScrollTrigger | undefined
  let layout: ResizeObserver | undefined
  let appearance: MutationObserver | undefined
  let refreshFrame: number | undefined
  let stops: number[] = []
  let activeStep = -1
  let fragmentPending = scrollControlled

  function release() {
    if (disposed) return
    disposed = true
    listeners.abort()
    if (refreshFrame !== undefined) cancelAnimationFrame(refreshFrame)
    gsap.killTweensOf(reading)
    trigger?.kill()
    layout?.disconnect()
    appearance?.disconnect()
    viewer?.destroy()
  }

  function fail() {
    root.dataset.assemblyState = 'error'
    delete root.dataset.enhanced
    tools.hidden = true
    failure.hidden = false
    release()
  }

  function draw() {
    if (!viewer || disposed) return
    const step = viewer.setProgress(reading.progress, reducedMotion.matches)
    progress.value = reading.progress
    if (step === activeStep) return
    activeStep = step
    current.textContent = `${step + 1} / ${instructions.length}`
    for (const [index, link] of links.entries()) {
      if (index === step) link.setAttribute('aria-current', 'step')
      else link.removeAttribute('aria-current')
    }
    for (const [index, instruction] of instructions.entries()) {
      if (index === step) instruction.dataset.current = ''
      else delete instruction.dataset.current
    }
  }

  function readingLine() {
    const style = getComputedStyle(stage)
    const top = Number.parseFloat(style.top) || 92
    const sideBySide =
      stage.getBoundingClientRect().right <=
      instructions[0].getBoundingClientRect().left
    if (!sideBySide && style.position === 'sticky') {
      return Math.min(
        innerHeight - 100,
        top + stage.getBoundingClientRect().height + 24,
      )
    }
    return Math.max(116, Math.min(innerHeight * 0.4, top + 180))
  }

  function measure() {
    const line = readingLine()
    stops = instructions.map(
      (instruction) => instruction.getBoundingClientRect().top + scrollY - line,
    )
  }

  function readPosition() {
    reading.progress = progressAtReadingPosition(scrollY, stops)
    draw()
  }

  function scrollToStep(index: number) {
    measure()
    window.scrollTo({ top: stops[index], behavior: 'instant' })
    // A jump can land on a trigger boundary without another progress event.
    readPosition()
  }

  function refresh() {
    if (disposed || refreshFrame !== undefined) return
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = undefined
      if (disposed) return
      measure()
      trigger?.refresh()
      if (fragmentPending) {
        fragmentPending = false
        const index = links.findIndex((link) => link.hash === location.hash)
        if (index >= 0) scrollToStep(index)
      }
      readPosition()
    })
  }

  function theme() {
    const html = document.documentElement
    const dark =
      html.classList.contains('dark') ||
      (!html.classList.contains('light') && systemTheme.matches)
    viewer?.setTheme(dark)
    root.dataset.appearance = dark ? 'dark' : 'light'
  }

  try {
    const assets = await loadAssemblyAssets()
    if (!root.isConnected) return release
    viewer = createAssemblyViewer(
      canvas,
      assets,
      root.dataset.assemblyGuide as AssemblyScene,
      fail,
    )
    root.dataset.assemblyState = 'ready'
    tools.hidden = false
    if (scrollControlled) root.dataset.enhanced = ''
    theme()
    draw()

    for (const [index, link] of links.entries()) {
      link.addEventListener(
        'click',
        (event) => {
          event.preventDefault()
          if (scrollControlled) {
            history.replaceState(history.state, '', link.hash)
            scrollToStep(index)
            instructions[index].focus({ preventScroll: true })
            return
          }
          gsap.killTweensOf(reading)
          const target = index / (instructions.length - 1)
          if (reducedMotion.matches) {
            reading.progress = target
            draw()
            return
          }
          gsap.to(reading, {
            progress: target,
            duration: 0.65,
            ease: 'power1.inOut',
            onUpdate: draw,
          })
        },
        { signal: listeners.signal },
      )
    }

    tools.addEventListener(
      'click',
      (event) => {
        const button = (event.target as Element).closest<HTMLButtonElement>(
          '[data-view-action]',
        )
        if (!button) return
        const action = button.dataset.viewAction
        if (action === 'left') viewer?.rotate(Math.PI / 8)
        if (action === 'right') viewer?.rotate(-Math.PI / 8)
        if (action === 'in') viewer?.zoom(1.2)
        if (action === 'out') viewer?.zoom(1 / 1.2)
        if (action === 'reset') viewer?.resetView()
      },
      { signal: listeners.signal },
    )

    reducedMotion.addEventListener(
      'change',
      () => {
        gsap.killTweensOf(reading)
        draw()
      },
      { signal: listeners.signal },
    )
    systemTheme.addEventListener('change', theme, { signal: listeners.signal })
    appearance = new MutationObserver(theme)
    appearance.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    if (scrollControlled) {
      measure()
      trigger = ScrollTrigger.create({
        trigger: root,
        start: () => stops[0],
        end: () => stops[stops.length - 1],
        onUpdate: readPosition,
        onRefreshInit: measure,
        onRefresh: readPosition,
      })
      layout = new ResizeObserver(refresh)
      layout.observe(document.body)
      layout.observe(stage)
      window.addEventListener('resize', refresh, { signal: listeners.signal })
      window.addEventListener(
        'hashchange',
        () => {
          fragmentPending = true
          refresh()
        },
        { signal: listeners.signal },
      )
      void document.fonts.ready.then(refresh)
      refresh()
    }
    return release
  } catch {
    fail()
    return release
  }
}
