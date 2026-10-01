<script lang="ts">
  type Props = {
    locale: import('../../../i18n').Locale
    onRestore: () => void
  }

  let { locale, onRestore }: Props = $props()
  import { translate } from '../../../i18n'
</script>

<button
  class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border-field bg-panel px-3 py-2 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
  type="button"
  aria-label={translate(locale, 'common.restoreAll')}
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
  {translate(locale, 'common.restoreAll')}
</button>
