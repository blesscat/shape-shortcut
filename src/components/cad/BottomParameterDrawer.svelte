<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    open: boolean
    onClose: () => void
    label: string
    closeLabel: string
    testId?: string
    children: Snippet
  }

  let {
    open,
    onClose,
    label,
    closeLabel,
    testId = 'cad-bottom-drawer',
    children,
  }: Props = $props()

  let closeButton: HTMLButtonElement | null = $state(null)

  $effect(() => {
    // Land keyboard focus inside the sheet once it mounts; the caller moves
    // focus back to its opener when the drawer closes.
    if (open) closeButton?.focus()
  })

  function handleWindowKeydown(event: KeyboardEvent): void {
    if (!open || event.key !== 'Escape') return
    onClose()
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if open}
  <div
    id={testId}
    class="fixed inset-x-0 bottom-0 z-30 grid h-[65dvh] grid-rows-[auto_minmax(0,1fr)] rounded-t-2xl border-t border-border-card bg-panel/75 pb-[env(safe-area-inset-bottom)] shadow-card"
    role="region"
    aria-label={label}
    data-testid={testId}
  >
    <div class="flex items-start justify-between gap-2 px-4 pt-2">
      <span
        class="mx-auto mt-1 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/40"
        aria-hidden="true"
      ></span>
      <button
        bind:this={closeButton}
        class="-me-1 rounded-md px-2 py-1 text-lg leading-none text-muted-foreground hover:bg-page focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
        type="button"
        aria-label={closeLabel}
        onclick={onClose}
      >
        ×
      </button>
    </div>
    <div
      class="min-h-0 overflow-y-auto px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
    >
      {@render children()}
    </div>
  </div>
{/if}
