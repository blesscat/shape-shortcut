<script lang="ts">
  type Props = {
    locale: import('../../../i18n').Locale
    label: string
    onRestore: () => void
    visible?: boolean
  }

  let { locale, label, onRestore, visible = true }: Props = $props()
  import { translate } from '../../../i18n'
</script>

{#if visible}
  <button
    class="absolute top-1/2 right-0 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-md border border-border-field bg-panel p-0 text-ink shadow-sm hover:bg-page focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
    type="button"
    aria-label={translate(locale, 'common.restore', { label })}
    title={translate(locale, 'common.restoreTitle')}
    onclick={onRestore}
  >
    <svg
      class="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 6 6v1" />
    </svg>
  </button>
{/if}
