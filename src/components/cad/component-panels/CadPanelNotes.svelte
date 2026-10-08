<script lang="ts">
  import type { ModelId } from '../../../cad-contract/units'
  import { translate, type Locale } from '../../../i18n'

  type Props = {
    locale: Locale
    modelId: ModelId
  }

  let { locale, modelId }: Props = $props()
</script>

{#if modelId === 'opengrid-wall-cover'}
  <p
    class="m-0 text-sm leading-6 text-muted-foreground"
    data-testid="opengrid-wall-cover-three-mf-note"
  >
    {translate(locale, 'cad.wallCover.threeMfNote')}
  </p>
{/if}
{#if modelId === 'opengrid-label-card'}
  <p
    class="m-0 text-sm leading-6 text-muted-foreground"
    data-testid="opengrid-label-card-three-mf-note"
  >
    {translate(locale, 'cad.labelCard.threeMfNote')}
  </p>
{/if}
