<script lang="ts">
  import {
    OPENGRID_LABEL_TAG_CONFIGURATION,
    OPENGRID_LABEL_TAG_ICON_IDS,
    OPENGRID_LABEL_TAG_WIDTH_TIERS,
    normalizeOpenGridLabelTagText,
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

  const config = OPENGRID_LABEL_TAG_CONFIGURATION

  let rawWidthTier = $derived(
    rawParameters.widthTier ?? String(config.defaultParameters.widthTier),
  )
  let rawGripThickness = $derived(
    rawParameters.gripThickness ??
      String(config.defaultParameters.gripThickness),
  )
  let rawIcon = $derived(rawParameters.icon ?? config.defaultParameters.icon)
  let rawText = $derived(rawParameters.text ?? config.defaultText)
  let normalizedText = $derived(normalizeOpenGridLabelTagText(rawText))
  let textLength = $derived(Array.from(normalizedText).length)

  function handleWidthTierInput(tier: number): void {
    onInputChange('widthTier', String(tier))
  }

  function handleGripThicknessInput(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    onInputChange('gripThickness', event.currentTarget.value)
  }

  function handleGripPreset(value: number): void {
    onInputChange('gripThickness', String(value))
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
  data-testid="opengrid-label-tag-panel"
>
  <p
    class="m-0 text-sm leading-6 text-muted-foreground"
    data-testid="opengrid-label-tag-details"
  >
    {translate(locale, 'panel.labelTag.details')}
  </p>

  <div class="grid gap-1">
    <span class="text-sm text-ink">
      {translate(locale, 'parameter.widthTier')}
    </span>
    <div
      class="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label={translate(locale, 'parameter.widthTier')}
      data-testid="opengrid-label-tag-width-tier"
    >
      {#each OPENGRID_LABEL_TAG_WIDTH_TIERS as tier (tier)}
        <button
          type="button"
          class="rounded-lg border px-3 py-1 text-sm"
          class:border-primary={rawWidthTier === String(tier)}
          aria-pressed={rawWidthTier === String(tier)}
          data-testid={`opengrid-label-tag-width-${tier}`}
          onclick={() => handleWidthTierInput(tier)}
        >
          {tier}
        </button>
      {/each}
    </div>
    {#if fieldErrors.widthTier}
      <span
        class="text-sm text-error"
        role="alert"
        data-testid="opengrid-label-tag-width-error"
        >{formatValidationIssue(locale, fieldErrors.widthTier)}</span
      >
    {/if}
  </div>

  <ParameterField
    {locale}
    label={translate(locale, 'parameter.gripThickness')}
    changed={rawGripThickness !==
      String(config.defaultParameters.gripThickness)}
    error={fieldErrors.gripThickness}
    errorId="opengrid-label-tag-grip-error"
    restoreLabel={translate(locale, 'parameter.gripThickness')}
    onRestore={() =>
      onInputChange(
        'gripThickness',
        String(config.defaultParameters.gripThickness),
      )}
  >
    <div class="grid gap-1">
      <input
        aria-describedby="opengrid-label-tag-grip-help"
        aria-invalid={fieldErrors.gripThickness ? 'true' : undefined}
        autocomplete="off"
        class="min-w-0 rounded-lg border border-border-field bg-page px-3 py-2 text-base text-ink outline-none focus:border-primary"
        data-testid="opengrid-label-tag-grip"
        max={config.gripThicknessMax}
        min={config.gripThicknessMin}
        step={config.gripThicknessStep}
        type="number"
        value={rawGripThickness}
        oninput={handleGripThicknessInput}
      />
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg border border-border-field px-2 py-1 text-sm"
          data-testid="opengrid-label-tag-grip-preset-box"
          onclick={() => handleGripPreset(1.2)}
        >
          {translate(locale, 'panel.labelTag.gripPresetBox')}
        </button>
        <button
          type="button"
          class="rounded-lg border border-border-field px-2 py-1 text-sm"
          data-testid="opengrid-label-tag-grip-preset-divider"
          onclick={() => handleGripPreset(2)}
        >
          {translate(locale, 'panel.labelTag.gripPresetDivider')}
        </button>
      </div>
    </div>
  </ParameterField>
  <p
    id="opengrid-label-tag-grip-help"
    class="m-0 text-sm leading-6 text-muted-foreground"
  >
    {translate(locale, 'panel.labelTag.gripRange', {
      min: config.gripThicknessMin,
      max: config.gripThicknessMax,
    })}
  </p>

  <div class="grid gap-1">
    <span class="text-sm text-ink">
      {translate(locale, 'panel.labelTag.icon')}
    </span>
    <div
      class="grid grid-cols-4 gap-2 sm:grid-cols-5"
      role="radiogroup"
      aria-label={translate(locale, 'panel.labelTag.icon')}
      data-testid="opengrid-label-tag-icon-gallery"
    >
      {#each OPENGRID_LABEL_TAG_ICON_IDS as iconId (iconId)}
        {@const iconPath = LABEL_TAG_ICON_PATHS[iconId]}
        <button
          type="button"
          class="flex flex-col items-center gap-1 rounded-lg border p-2"
          class:border-primary={rawIcon === iconId}
          aria-pressed={rawIcon === iconId}
          aria-label={translate(locale, `panel.labelTag.icon.${iconId}`)}
          data-testid={`opengrid-label-tag-icon-${iconId}`}
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
            {translate(locale, `panel.labelTag.icon.${iconId}`)}
          </span>
        </button>
      {/each}
    </div>
    {#if fieldErrors.icon}
      <span
        class="text-sm text-error"
        role="alert"
        data-testid="opengrid-label-tag-icon-error"
        >{formatValidationIssue(locale, fieldErrors.icon)}</span
      >
    {/if}
  </div>

  <ParameterField
    {locale}
    label={translate(locale, 'parameter.text')}
    changed={rawText !== config.defaultText}
    error={fieldErrors.text}
    errorId="opengrid-label-tag-text-error"
    restoreLabel={translate(locale, 'parameter.text')}
    onRestore={() => onInputChange('text', config.defaultText)}
  >
    <div class="grid gap-1">
      <input
        aria-describedby="opengrid-label-tag-text-help"
        aria-invalid={fieldErrors.text ? 'true' : undefined}
        aria-label={translate(locale, 'panel.labelTag.inputAria')}
        autocomplete="off"
        class="min-w-0 rounded-lg border border-border-field bg-page px-3 py-2 text-base text-ink outline-none focus:border-primary"
        data-testid="opengrid-label-tag-text"
        maxlength={config.maxTextLength}
        spellcheck="false"
        type="text"
        value={rawText}
        oninput={handleTextInput}
      />
      <span
        aria-live="polite"
        class="text-right text-sm text-muted-foreground"
        data-testid="opengrid-label-tag-text-count"
      >
        {translate(locale, 'panel.labelTag.characterCount', {
          count: textLength,
          max: config.maxTextLength,
        })}
      </span>
    </div>
  </ParameterField>

  <p
    id="opengrid-label-tag-text-help"
    class="m-0 text-sm leading-6 text-muted-foreground"
  >
    {translate(locale, 'panel.labelTag.font', {
      font: 'Noto Sans CJK TC Bold',
    })}
  </p>
</fieldset>
