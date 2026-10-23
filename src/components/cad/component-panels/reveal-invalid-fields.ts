/** Keep validation discoverable without moving focus or changing raw input. */
export function revealInvalidFields(container: HTMLElement) {
  function reveal() {
    for (const control of container.querySelectorAll('[aria-invalid="true"]')) {
      let ancestor = control.parentElement
      while (ancestor && ancestor !== container) {
        if (ancestor instanceof HTMLDetailsElement) {
          if (!ancestor.open) ancestor.open = true
        }
        ancestor = ancestor.parentElement
      }
    }
  }
  reveal()
  const observer = new MutationObserver(reveal)
  observer.observe(container, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['aria-invalid', 'open'],
  })
  return { destroy: () => observer.disconnect() }
}
