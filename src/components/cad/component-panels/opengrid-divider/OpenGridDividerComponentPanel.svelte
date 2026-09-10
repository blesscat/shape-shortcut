<script lang="ts">
  import {
    displayParameterLabel,
    opengridDividerDefinition,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import {
    OPENGRID_DIVIDER_CONFIGURATION,
    openGridDividerAlignmentInfoFor,
    type OpenGridDividerParameters,
  } from '../../../../cad-contract/units'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import { translate } from '../../../../i18n'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  const schema = opengridDividerDefinition.parameterSchema
  const BASE_FIELD_KEYS = [
    'left',
    'right',
    'up',
    'down',
    'height',
    'wallThickness',
  ] as const
  const BASE_FIELDS = BASE_FIELD_KEYS.map((key) =>
    schema.find((field) => field.key === key)!,
  )
  const BOX_FIT_FIELD_KEYS = [
    'targetBoxGridsX',
    'targetBoxGridsY',
    'endClearance',
  ] as const
  const PEG_FIELD_KEYS = ['pegDiameterIncrement'] as const

  const ALIGNMENT_OPTIONS = [
    {
      value: 'free',
      labelKey: 'panel.divider.free',
      descriptionKey: 'panel.divider.freeDescription',
    },
    {
      value: 'box-fit',
      labelKey: 'panel.divider.boxFit',
      descriptionKey: 'panel.divider.boxFitDescription',
    },
  ] as const

  const PEG_LENGTH_OPTIONS = [
    {
      value: 'snap',
      labelKey: 'panel.divider.pegSnap',
    },
    {
      value: 'thin-shell',
      labelKey: 'panel.divider.pegThinShell',
    },
    {
      value: 'stackable',
      labelKey: 'panel.divider.pegStackable',
    },
  ] as const

  function rawNumber(key: keyof OpenGridDividerParameters): number {
    const raw = rawParameters[key]
    const parsed = typeof raw === 'string' ? Number(raw) : NaN
    const fallback = Number(
      OPENGRID_DIVIDER_CONFIGURATION.defaultParameters[key],
    )
    return Number.isFinite(parsed) ? parsed : fallback
  }

  let alignmentMode = $derived(
    rawParameters.alignmentMode === 'box-fit' ? 'box-fit' : 'free',
  )
  let alignmentInfo = $derived(
    openGridDividerAlignmentInfoFor({
      ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
      left: rawNumber('left'),
      right: rawNumber('right'),
      up: rawNumber('up'),
      down: rawNumber('down'),
      alignmentMode: alignmentMode,
      targetBoxGridsX: rawNumber('targetBoxGridsX'),
      targetBoxGridsY: rawNumber('targetBoxGridsY'),
      endClearance: rawNumber('endClearance'),
    }),
  )

  function fieldFor(key: (typeof schema)[number]['key']) {
    return schema.find((field) => field.key === key)!
  }

  function handleEnumChange(
    key: 'alignmentMode' | 'pegLengthMode',
  ): (event: Event) => void {
    return (event: Event) => {
      if (!(event.currentTarget instanceof HTMLInputElement)) return
      onInputChange(key, event.currentTarget.value)
    }
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  {#each BASE_FIELDS as field (field.key)}
    {@const value = rawParameters[field.key] ?? String(field.defaultValue)}
    <ParameterField
      {locale}
      label={displayParameterLabel(field, locale)}
      unit={unitLabelFor(locale, field.unit)}
      changed={value !== String(field.defaultValue)}
      error={fieldErrors[field.key]}
      errorId={`${field.key}-error`}
      onRestore={() => onInputChange(field.key, String(field.defaultValue))}
    >
      <ParameterControl
        {locale}
        {field}
        {value}
        error={fieldErrors[field.key]}
        onChange={(nextValue) => onInputChange(field.key, nextValue)}
      />
    </ParameterField>
  {/each}

  <div
    aria-label={translate(locale, 'panel.divider.alignmentAria')}
    class="grid gap-2 rounded-lg border border-border-field p-3"
    role="radiogroup"
  >
    {#each ALIGNMENT_OPTIONS as option (option.value)}
      <label class="flex min-w-0 grow items-start gap-2">
        <input
          aria-describedby={fieldErrors.alignmentMode
            ? 'divider-alignment-error'
            : undefined}
          aria-label={translate(locale, option.labelKey)}
          class="mt-1 accent-primary"
          data-testid={`opengrid-divider-alignment-${option.value}`}
          name="opengrid-divider-alignment"
          type="radio"
          value={option.value}
          checked={alignmentMode === option.value}
          onchange={handleEnumChange('alignmentMode')}
        />
        <span class="grid gap-1">
          <span class="font-[650]">{translate(locale, option.labelKey)}</span>
          <span class="text-sm text-muted-foreground">
            {translate(locale, option.descriptionKey)}
          </span>
        </span>
      </label>
    {/each}
    {#if fieldErrors.alignmentMode}
      <span
        class="text-sm text-error"
        id="divider-alignment-error"
        role="alert"
      >
        {formatValidationIssue(locale, fieldErrors.alignmentMode)}
      </span>
    {/if}
  </div>

  {#if alignmentMode === 'box-fit'}
    {#each BOX_FIT_FIELD_KEYS as key (key)}
      {@const field = fieldFor(key)}
      {@const value = rawParameters[key] ?? String(field.defaultValue)}
      <ParameterField
        {locale}
        label={displayParameterLabel(field, locale)}
        unit={unitLabelFor(locale, field.unit)}
        changed={value !== String(field.defaultValue)}
        error={fieldErrors[key]}
        errorId={`${key}-error`}
        onRestore={() => onInputChange(key, String(field.defaultValue))}
      >
        <ParameterControl
          {locale}
          {field}
          {value}
          error={fieldErrors[key]}
          onChange={(nextValue) => onInputChange(key, nextValue)}
        />
      </ParameterField>
    {/each}
    <div
      aria-label={translate(locale, 'panel.divider.badgeTitle')}
      class="grid gap-1 rounded-lg border border-border-field bg-panel p-3 text-sm"
      data-testid="opengrid-divider-alignment-badge"
    >
      <span class="font-[650]"
        >{translate(locale, 'panel.divider.badgeTitle')}</span
      >
      <span>
        {translate(
          locale,
          alignmentInfo.anchorX === 'center'
            ? 'panel.divider.badgeAnchorCenter'
            : 'panel.divider.badgeAnchorPlusMinus7',
        )}
      </span>
      <span>
        {translate(
          locale,
          alignmentInfo.anchorY === 'center'
            ? 'panel.divider.badgeAnchorCenter'
            : 'panel.divider.badgeAnchorPlusMinus7',
        )}
      </span>
      <span>
        {translate(
          locale,
          alignmentInfo.centerPeg
            ? 'panel.divider.badgeCenterPegPresent'
            : 'panel.divider.badgeCenterPegAbsent',
        )}
      </span>
      {#each alignmentInfo.transverseIntegerAxes as axis (axis)}
        <span class="text-muted-foreground">
          {translate(locale, 'panel.divider.badgeTransverse', { axis })}
        </span>
      {/each}
    </div>
  {/if}

  <div
    aria-label={translate(locale, 'panel.divider.pegLengthAria')}
    class="grid gap-2 rounded-lg border border-border-field p-3"
    role="radiogroup"
  >
    <span class="font-[650]">
      {translate(locale, 'panel.divider.pegLength')}
    </span>
    {#each PEG_LENGTH_OPTIONS as option (option.value)}
      <label class="flex min-w-0 grow items-start gap-2">
        <input
          aria-describedby={fieldErrors.pegLengthMode
            ? 'divider-peg-length-error'
            : undefined}
          aria-label={translate(locale, option.labelKey)}
          class="mt-1 accent-primary"
          data-testid={`opengrid-divider-peg-length-${option.value}`}
          name="opengrid-divider-peg-length"
          type="radio"
          value={option.value}
          checked={(rawParameters.pegLengthMode ??
            String(
              OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.pegLengthMode,
            )) === option.value}
          onchange={handleEnumChange('pegLengthMode')}
        />
        <span class="font-[650]">{translate(locale, option.labelKey)}</span>
      </label>
    {/each}
    {#if fieldErrors.pegLengthMode}
      <span
        class="text-sm text-error"
        id="divider-peg-length-error"
        role="alert"
      >
        {formatValidationIssue(locale, fieldErrors.pegLengthMode)}
      </span>
    {/if}
  </div>

  {#each PEG_FIELD_KEYS as key (key)}
    {@const field = fieldFor(key)}
    {@const value = rawParameters[key] ?? String(field.defaultValue)}
    <ParameterField
      {locale}
      label={displayParameterLabel(field, locale)}
      unit={unitLabelFor(locale, field.unit)}
      changed={value !== String(field.defaultValue)}
      error={fieldErrors[key]}
      errorId={`${key}-error`}
      onRestore={() => onInputChange(key, String(field.defaultValue))}
    >
      <ParameterControl
        {locale}
        {field}
        {value}
        error={fieldErrors[key]}
        onChange={(nextValue) => onInputChange(key, nextValue)}
      />
    </ParameterField>
  {/each}
</fieldset>
