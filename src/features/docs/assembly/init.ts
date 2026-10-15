let observing = false
const releases = new Map<HTMLElement, () => void>()

function mount() {
  for (const root of document.querySelectorAll<HTMLElement>(
    '[data-assembly-guide]',
  )) {
    if (releases.has(root)) continue
    let disposed = false
    let release = () => {}
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        void import('./enhance')
          .then(async ({ enhanceAssembly }) => {
            if (disposed) return
            release = await enhanceAssembly(root)
            if (disposed) release()
          })
          .catch(() => {
            if (disposed) return
            root.dataset.assemblyState = 'error'
            const fallback = root.querySelector<HTMLElement>(
              '[data-assembly-failure]',
            )
            if (fallback) fallback.hidden = false
          })
      },
      { rootMargin: '300px 0px' },
    )
    releases.set(root, () => {
      disposed = true
      observer.disconnect()
      release()
    })
    observer.observe(root)
  }
}

export function observeAssemblyGuides() {
  mount()
  if (observing) return
  observing = true
  document.addEventListener('astro:page-load', mount)
  document.addEventListener('astro:before-swap', () => {
    for (const release of releases.values()) release()
    releases.clear()
  })
}
