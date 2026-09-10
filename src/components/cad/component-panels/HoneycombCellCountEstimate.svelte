<script lang="ts">
  import { translate, type Locale } from '../../../i18n'

  let { count, locale }: { count: number; locale: Locale } = $props()
</script>

<span
  class="block text-sm text-muted-foreground"
  data-testid="honeycomb-cell-count-estimate"
  role="status"
  aria-live="polite"
>
  {translate(locale, 'panel.honeycombCellCount', { count })}
</span>
