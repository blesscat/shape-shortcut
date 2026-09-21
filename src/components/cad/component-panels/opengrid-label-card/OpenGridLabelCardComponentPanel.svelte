<script lang="ts">
  import {
    OPENGRID_LABEL_CARD_CONFIGURATION,
    OPENGRID_LABEL_CARD_ICON_IDS,
    OPENGRID_LABEL_CARD_STYLES,
    OPENGRID_LABEL_WIDTH_TIERS,
    normalizeOpenGridLabelCardText,
  } from '../../../../cad-contract/units'
  import { LABEL_TAG_ICON_PATHS } from '../../../../cad-kernel/components/opengrid-label-tag/icon-paths'
  import { translate } from '../../../../i18n'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  const config = OPENGRID_LABEL_CARD_CONFIGURATION

  let rawWidthTier = $derived(
    rawParameters.widthTier ?? String(config.defaultParameters.widthTier),
  )
  let rawStyle = $derived(rawParameters.style ?? config.defaultParameters.style)
  let rawIcon = $derived(rawParameters.icon ?? config.defaultParameters.icon)
  let rawText = $derived(rawParameters.text ?? config.defaultText)
  let normalizedText = $derived(normalizeOpenGridLabelCardText(rawText))
  let textLength = $derived(Array.from(normalizedText).length)

  function handleWidthTierInput(tier: number): void {
    onInputChange('widthTier', String(tier))
  }

  function handleStyleInput(style: string): void {
    onInputChange('style', style)
  }

  function handleIconInput(icon: string): void {
    onInputChange('icon', icon)
  }

  function handleTextInput(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return

    const limitedText = Array.from(event.currentTarget.value)
      .slice(0, config.maxTextLength)
      .join('')
    if (event.currentTarget.value !== limitedText) {
      event.currentTarget.value = limitedText
    }
    onInputChange('text', limitedText)
  }
</script>

<fieldset
  class="m-0 grid gap-3 border-0 p-0"
  data-testid="opengrid-label-card-panel"
>
  <p
    class="m-0 text-sm leading-6 text-muted-foreground"
    data-testid="opengrid-label-card-details"
  >
    {translate(locale, 'panel.labelCard.details')}
  </p>

  <div class="grid gap-1">
    <span class="text-sm text-ink">
      {translate(locale, 'parameter.widthTier')}
    </span>
    <div
      class="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label={translate(locale, 'parameter.widthTier')}
      data-testid="opengrid-label-card-width-tier"
    >
      {#each OPENGRID_LABEL_WIDTH_TIERS as tier (tier)}
        <button
          type="button"
          class="rounded-lg border px-3 py-1 text-sm"
          class:border-primary={rawWidthTier === String(tier)}
          aria-pressed={rawWidthTier === String(tier)}
          data-testid={`opengrid-label-card-width-${tier}`}
          onclick={() => handleWidthTierInput(tier)}
        >
          {tier}
        </button>
      {/each}
    </div>
    {#if fieldErrors.widthTier}
      <span class="text-sm text-error" role="alert"
        >{formatValidationIssue(locale, fieldErrors.widthTier)}</span
      >
    {/if}
  </div>

  <div class="grid gap-1">
    <span class="text-sm text-ink">
      {translate(locale, 'panel.labelCard.style')}
    </span>
    <div
      class="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label={translate(locale, 'panel.labelCard.style')}
      data-testid="opengrid-label-card-style"
    >
      {#each OPENGRID_LABEL_CARD_STYLES as style (style)}
        <button
          type="button"
          class="rounded-lg border px-3 py-1 text-sm"
          class:border-primary={rawStyle === style}
          aria-pressed={rawStyle === style}
          data-testid={`opengrid-label-card-style-${style}`}
          onclick={() => handleStyleInput(style)}
        >
          {translate(locale, `panel.labelCard.style.${style}`)}
        </button>
      {/each}
    </div>
    {#if fieldErrors.style}
      <span class="text-sm text-error" role="alert"
        >{formatValidationIssue(locale, fieldErrors.style)}</span
      >
    {/if}
  </div>

  <div class="grid gap-1">
    <span class="text-sm text-ink">
      {translate(locale, 'panel.labelCard.icon')}
    </span>
    <div
      class="grid grid-cols-4 gap-2 sm:grid-cols-5"
      role="radiogroup"
      aria-label={translate(locale, 'panel.labelCard.icon')}
      data-testid="opengrid-label-card-icon-gallery"
    >
      {#each OPENGRID_LABEL_CARD_ICON_IDS as iconId (iconId)}
        {@const iconPath = LABEL_TAG_ICON_PATHS[iconId]}
        <button
          type="button"
          class="flex flex-col items-center gap-1 rounded-lg border p-2"
          class:border-primary={rawIcon === iconId}
          aria-pressed={rawIcon === iconId}
          aria-label={translate(locale, `panel.labelCard.icon.${iconId}`)}
          data-testid={`opengrid-label-card-icon-${iconId}`}
          onclick={() => handleIconInput(iconId)}
        >
          <svg
            viewBox="0 0 16 16"
            width="24"
            height="24"
            fill="currentColor"
            aria-hidden="true"
          >
            {#each iconPath?.paths ?? [] as pathData (pathData)}
              <path
                d={pathData}
                fill-rule={iconPath?.evenOdd ? 'evenodd' : undefined}
              />
            {/each}
          </svg>
          <span class="text-xs">
            {translate(locale, `panel.labelCard.icon.${iconId}`)}
          </span>
        </button>
      {/each}
    </div>
    {#if fieldErrors.icon}
      <span class="text-sm text-error" role="alert"
        >{formatValidationIssue(locale, fieldErrors.icon)}</span
      >
    {/if}
  </div>

  <ParameterField
    {locale}
    label={translate(locale, 'parameter.text')}
    changed={rawText !== config.defaultText}
    error={fieldErrors.text}
    errorId="opengrid-label-card-text-error"
    restoreLabel={translate(locale, 'parameter.text')}
    onRestore={() => onInputChange('text', config.defaultText)}
  >
    <div class="grid gap-1">
      <input
        aria-describedby="opengrid-label-card-text-help"
        aria-invalid={fieldErrors.text ? 'true' : undefined}
        aria-label={translate(locale, 'panel.labelCard.inputAria')}
        autocomplete="off"
        class="min-w-0 rounded-lg border border-border-field bg-page px-3 py-2 text-base text-ink outline-none focus:border-primary"
        data-testid="opengrid-label-card-text"
        maxlength={config.maxTextLength}
        spellcheck="false"
        type="text"
        value={rawText}
        oninput={handleTextInput}
      />
      <span
        aria-live="polite"
        class="text-right text-sm text-muted-foreground"
        data-testid="opengrid-label-card-text-count"
      >
        {translate(locale, 'panel.labelCard.characterCount', {
          count: textLength,
          max: config.maxTextLength,
        })}
      </span>
    </div>
  </ParameterField>

  <p
    id="opengrid-label-card-text-help"
    class="m-0 text-sm leading-6 text-muted-foreground"
  >
    {translate(locale, 'panel.labelCard.font', {
      font: 'Noto Sans CJK TC Bold',
    })}
  </p>
</fieldset>
