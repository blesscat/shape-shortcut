<script lang="ts">
  import {
    OPENGRID_LABEL_CARD_CONFIGURATION,
    OPENGRID_LABEL_CARD_ICON_IDS,
    OPENGRID_LABEL_CARD_STYLES,
    normalizeOpenGridLabelCardText,
  } from '../../../../cad-contract/units'
  import {
    OPENGRID_LABEL_GRID,
    openGridLabelWidthFor,
  } from '../../../../cad-contract/units/opengrid-label-shared'
  import { LABEL_CARD_ICON_PATHS } from '../../../../cad-kernel/components/opengrid-label-card/icon-paths'
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

  let rawGridUnits = $derived(
    rawParameters.gridUnits ?? String(config.defaultParameters.gridUnits),
  )
  let rawStyle = $derived(rawParameters.style ?? config.defaultParameters.style)
  let rawIcon = $derived(rawParameters.icon ?? config.defaultParameters.icon)
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
  const alignments = ['left', 'center', 'right'] as const
  let hasTwoRows = $derived(
    Boolean(
      normalizeOpenGridLabelCardText(rawParameters.text ?? '') &&
      normalizeOpenGridLabelCardText(rawParameters.textLine2 ?? ''),
    ),
  )
  let maxTextHeight = $derived(
    hasTwoRows ? config.textHeight.twoRowMax : config.textHeight.max,
  )

  function handleStyleInput(style: string): void {
    onInputChange('style', style)
  }

  function handleIconInput(icon: string): void {
    onInputChange('icon', icon)
  }

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
    <label for="label-card-units" class="text-sm text-ink"
      >{translate(locale, 'parameter.gridUnits')} · {rawGridUnits}</label
    >
    <input
      id="label-card-units"
      type="range"
      min={OPENGRID_LABEL_GRID.minUnits}
      max={OPENGRID_LABEL_GRID.maxUnits}
      step="1"
      value={rawGridUnits}
      data-testid="opengrid-label-card-grid-units"
      aria-invalid={Boolean(fieldErrors.gridUnits)}
      aria-describedby={fieldErrors.gridUnits
        ? 'label-card-units-error'
        : undefined}
      class="min-w-0 w-full accent-primary"
      oninput={(event) => onInputChange('gridUnits', event.currentTarget.value)}
    />
    <p
      class="m-0 text-sm text-muted-foreground"
      data-testid="label-card-width-summary"
    >
      {translate(locale, 'panel.labelCard.unitWidth', {
        width:
          Number.isFinite(Number(rawGridUnits)) && rawGridUnits.trim()
            ? openGridLabelWidthFor(Number(rawGridUnits))
            : '—',
        max: OPENGRID_LABEL_GRID.maxUnits,
      })}
    </p>
    {#if fieldErrors.gridUnits}
      <span id="label-card-units-error" class="text-sm text-error" role="alert"
        >{formatValidationIssue(locale, fieldErrors.gridUnits)}</span
      >
    {/if}
  </div>

  <div class="grid gap-1">
    <label for="label-card-icon-position"
      >{translate(locale, 'panel.labelCard.iconPosition')}</label
    >
    <select
      id="label-card-icon-position"
      disabled={rawIcon === 'none'}
      class="rounded-lg border border-border-field bg-panel px-3 py-2"
      value={rawParameters.iconPosition ?? 'left'}
      onchange={(event) =>
        onInputChange('iconPosition', event.currentTarget.value)}
    >
      <option value="left"
        >{translate(locale, 'panel.labelCard.iconPosition.left')}</option
      >
      <option value="right"
        >{translate(locale, 'panel.labelCard.iconPosition.right')}</option
      >
    </select>
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
        {@const iconPath = LABEL_CARD_ICON_PATHS[iconId]}
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

  <div class="grid gap-1">
    <label for="label-card-text-height" class="text-sm text-ink"
      >{translate(locale, 'panel.labelCard.textHeight')} · {rawParameters.textHeight ??
        config.textHeight.default} mm</label
    >
    <input
      id="label-card-text-height"
      type="range"
      min={config.textHeight.min}
      max={maxTextHeight}
      step={config.textHeight.step}
      value={rawParameters.textHeight ?? config.textHeight.default}
      class="min-w-0 w-full accent-primary"
      oninput={(event) =>
        onInputChange('textHeight', event.currentTarget.value)}
    />
    {#if hasTwoRows}<p class="m-0 text-sm text-muted-foreground">
        {translate(locale, 'panel.labelCard.twoRowHeight')}
      </p>{/if}
    {#if fieldErrors.textHeight}<span class="text-sm text-error" role="alert"
        >{formatValidationIssue(locale, fieldErrors.textHeight)}</span
      >{/if}
  </div>

  {#each rowFields as row (row.key)}
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
              >{translate(locale, `panel.labelCard.align.${alignment}`)}</option
            >{/each}
        </select>
      </div>
    </ParameterField>
  {/each}

  <p
    id="opengrid-label-card-text-help"
    class="m-0 text-sm leading-6 text-muted-foreground"
  >
    {translate(locale, 'panel.labelCard.font', {
      font: 'Noto Sans CJK TC Bold',
    })}
  </p>
</fieldset>
