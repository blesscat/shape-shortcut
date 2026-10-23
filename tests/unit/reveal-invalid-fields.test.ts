// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { revealInvalidFields } from '../../src/components/cad/component-panels/reveal-invalid-fields'

afterEach(() => document.body.replaceChildren())

describe('collapsed parameter validation', () => {
  it('reveals every enclosing disclosure without changing the value or focus', async () => {
    const container = document.createElement('div')
    container.innerHTML =
      '<details><summary>Advanced</summary><details><summary>Opening</summary><input value="invalid"></details></details><button>Outside</button>'
    document.body.append(container)
    const control = container.querySelector('input')!
    const outside = container.querySelector('button')!
    outside.focus()
    const action = revealInvalidFields(container)
    control.setAttribute('aria-invalid', 'true')
    await Promise.resolve()
    expect(
      [...container.querySelectorAll('details')].every((item) => item.open),
    ).toBe(true)
    container.querySelector('details')!.open = false
    await Promise.resolve()
    expect(container.querySelector('details')!.open).toBe(true)
    expect(control.value).toBe('invalid')
    expect(document.activeElement).toBe(outside)
    action.destroy()
  })

  it('does not open valid groups and stops observing when detached', async () => {
    const container = document.createElement('div')
    container.innerHTML =
      '<details><summary>Advanced</summary><input aria-invalid="false"></details>'
    document.body.append(container)
    const action = revealInvalidFields(container)
    expect(container.querySelector('details')!.open).toBe(false)
    action.destroy()
    container.querySelector('input')!.setAttribute('aria-invalid', 'true')
    await Promise.resolve()
    expect(container.querySelector('details')!.open).toBe(false)
  })
})
