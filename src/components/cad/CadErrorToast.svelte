<script lang="ts">
  import type { CadError } from '../../cad-contract/errors'
  import { formatDiagnostic } from '../../i18n/diagnostics'
  import { translate, type Locale } from '../../i18n'

  type Props = {
    locale: Locale
    error: CadError
    onDismiss: () => void
  }

  let { locale, error, onDismiss }: Props = $props()

  function titleKeyForError(error: CadError): string {
    if (error.stage === 'initializing') return 'cad.error.title.initializing'
    if (error.stage === 'exporting') return 'cad.error.title.exporting'
    if (error.stage === 'worker') return 'cad.error.title.worker'
    return 'cad.error.title.default'
  }
</script>

<section
  class="fixed right-4 top-4 z-50 grid w-[min(28rem,calc(100vw-2rem))] gap-2 rounded-2xl border border-error-border bg-panel p-4 text-ink shadow-card"
  role="alert"
  aria-atomic="true"
  aria-live="assertive"
  data-error-code={error.code}
  data-testid="cad-error-toast"
>
  <div class="flex items-start justify-between gap-4">
    <strong class="text-error"
      >{translate(locale, titleKeyForError(error))}</strong
    >
    <button
      class="rounded-md px-2 py-1 text-lg leading-none text-muted-foreground hover:bg-page focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
      type="button"
      aria-label={translate(locale, 'cad.error.close')}
      onclick={onDismiss}
    >
      ×
    </button>
  </div>
  <p class="m-0 break-words text-sm" data-testid="cad-error-toast-message">
    {translate(locale, 'cad.error.reason', {
      message: formatDiagnostic(locale, error.message),
    })}
  </p>
</section>
