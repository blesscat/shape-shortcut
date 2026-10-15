<script lang="ts">
  import {
    OPENGRID_LABEL_CARD_CONFIGURATION,
    normalizeOpenGridLabelCardText,
  } from '../../../../cad-contract/units'
  import { translate } from '../../../../i18n'
  import { alignments } from './alignments'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  const config = OPENGRID_LABEL_CARD_CONFIGURATION

  let rawLayout = $derived(
    rawParameters.layout ?? config.defaultParameters.layout,
  )
  let stacked = $derived(rawLayout === 'stacked')
  const rowFields = [
    {
      key: 'text',
      alignment: 'textAlignment',
      label: 'panel.labelCard.topText',
      aria: 'panel.labelCard.inputAria',
    },
    {
      key: 'textLine2',
      alignment: 'textLine2Alignment',
      label: 'panel.labelCard.bottomText',
      aria: 'panel.labelCard.bottomText',
    },
  ] as const

  function handleTextInput(field: 'text' | 'textLine2', event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    const value = event.currentTarget.value
    const otherField = field === 'text' ? 'textLine2' : 'text'
    const twoRows =
      normalizeOpenGridLabelCardText(value) &&
      normalizeOpenGridLabelCardText(rawParameters[otherField] ?? '')
    const height = Number(rawParameters.textHeight ?? config.textHeight.default)
    if (twoRows && height > config.textHeight.twoRowMax) {
      onInputChange('textHeight', String(config.textHeight.twoRowMax))
    }
    onInputChange(field, value)
  }
</script>

{#each rowFields as row (row.key)}
  {#if !(stacked && row.key === 'textLine2')}
    {@const rawText = rawParameters[row.key] ?? ''}
    {@const textLength = Array.from(
      normalizeOpenGridLabelCardText(rawText),
    ).length}
    <ParameterField
      {locale}
      label={translate(locale, row.label)}
      changed={rawText !== ''}
      error={fieldErrors[row.key]}
      errorId={`opengrid-label-card-${row.key}-error`}
      restoreLabel={translate(locale, row.label)}
      onRestore={() => onInputChange(row.key, '')}
    >
      <div class="grid gap-1">
        <input
          aria-describedby="opengrid-label-card-text-help"
          aria-invalid={fieldErrors[row.key] ? 'true' : undefined}
          aria-label={translate(locale, row.aria)}
          autocomplete="off"
          class="min-w-0 rounded-lg border border-border-field bg-page px-3 py-2 text-base text-ink outline-none focus:border-primary"
          data-testid={`opengrid-label-card-${row.key}`}
          spellcheck="false"
          type="text"
          value={rawText}
          oninput={(event) => handleTextInput(row.key, event)}
        />
        <span
          aria-live="polite"
          class="text-right text-sm text-muted-foreground"
          data-testid={`opengrid-label-card-${row.key}-count`}
        >
          {translate(locale, 'panel.labelCard.characterCount', {
            count: textLength,
            max: config.maxTextLength,
          })}
        </span>
        {#if !stacked}
          <label for={`label-card-${row.key}-alignment`}
            >{translate(locale, 'panel.labelCard.alignment')}</label
          >
          <select
            id={`label-card-${row.key}-alignment`}
            value={rawParameters[row.alignment] ?? 'center'}
            class="rounded-lg border border-border-field bg-panel px-3 py-2"
            onchange={(event) =>
              onInputChange(row.alignment, event.currentTarget.value)}
          >
            {#each alignments as alignment}<option value={alignment}
                >{translate(
                  locale,
                  `panel.labelCard.align.${alignment}`,
                )}</option
              >{/each}
          </select>
        {/if}
      </div>
    </ParameterField>
  {/if}
{/each}
