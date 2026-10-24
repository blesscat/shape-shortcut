<script lang="ts">
  import {
    CARD_BOX_CONFIGURATION,
    type CardBoxPart,
    type CardBoxStyle,
    type CardBoxTabPosition,
    type ModelParameterKey,
  } from '../../../../cad-contract/units'
  import type { CardBoxSvgOutlineData } from '../../../../cad-contract/units'
  import {
    cardBoxDefinition,
    displayParameterLabel,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import {
    createCardBoxSvgStorage,
    type CardBoxSvgStored,
  } from '../../../../features/cad/card-box-svg/store'
  import { parseCardBoxSvg } from '../../../../features/cad/card-box-svg/parse-svg'
  import { fingerprintCardBoxSvg } from '../../../../features/cad/card-box-svg/fingerprint'
  import ParameterField from '../ParameterField.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import type { ComponentPanelProps } from '../types'
  import { translate, type Locale } from '../../../../i18n'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  const t = (key: string, values?: Record<string, string | number | boolean>) =>
    translate(locale, key, values)

  const storage = createCardBoxSvgStorage()

  let svgStatusKey: string | null = $state(null)
  let svgErrorKey: string | null = $state(null)

  function text(key: ModelParameterKey, fallback: string): string {
    const value = rawParameters[key]
    return value === undefined ? fallback : value
  }

  function boolean(key: ModelParameterKey): boolean {
    return rawParameters[key] === 'true'
  }

  const part = $derived(text('part', 'assembly') as CardBoxPart)
  const usesCoverSvg = $derived(boolean('usesCoverSvg'))
  const coverFingerprint = $derived(text('coverSvgFingerprint', ''))

  function handlePartChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    onInputChange('part', event.currentTarget.value)
  }

  function handleTabPositionChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    onInputChange('dividerTabPosition', event.currentTarget.value)
  }

  function handleDividerStyleChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    onInputChange('dividerStyle', event.currentTarget.value)
  }

  function handleCoverStyleChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    onInputChange('coverStyle', event.currentTarget.value)
  }

  function handleDividerTextInput(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    onInputChange('dividerText', event.currentTarget.value)
  }

  function handleCoverTitleInput(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    onInputChange('coverTitle', event.currentTarget.value)
  }

  function handleCoverSubtitleInput(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    onInputChange('coverSubtitle', event.currentTarget.value)
  }

  function svgErrorKeyFor(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('CARD_BOX_SVG_STROKE_ONLY')) {
      return 'panel.cardBox.svgError.strokeOnly'
    }
    if (message.includes('CARD_BOX_SVG_TEXT_UNSUPPORTED')) {
      return 'panel.cardBox.svgError.textUnsupported'
    }
    if (message.includes('CARD_BOX_SVG_IMAGE_UNSUPPORTED')) {
      return 'panel.cardBox.svgError.imageUnsupported'
    }
    if (message.includes('CARD_BOX_SVG_TOO_COMPLEX')) {
      return 'panel.cardBox.svgError.tooComplex'
    }
    if (message.includes('CARD_BOX_SVG_UNSUPPORTED_ELEMENT')) {
      return 'panel.cardBox.svgError.unsupportedElement'
    }
    return 'panel.cardBox.svgError.parseFailed'
  }

  function applyStoredSvg(
    record: CardBoxSvgStored,
    sessionOnly: boolean,
  ): void {
    onInputChange('usesCoverSvg', 'true')
    onInputChange('coverSvgFingerprint', record.fingerprint)
    svgErrorKey = null
    svgStatusKey = sessionOnly
      ? 'panel.cardBox.svgSessionOnly'
      : 'panel.cardBox.svgLoaded'
  }

  async function handleSvgFileChange(event: Event): Promise<void> {
    const input = event.currentTarget
    if (!(input instanceof HTMLInputElement)) return
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    try {
      const source = await file.text()
      const outlines: CardBoxSvgOutlineData = parseCardBoxSvg(source)
      const fingerprint = fingerprintCardBoxSvg(source)
      const outcome = storage.save({ fingerprint, outlines })
      applyStoredSvg({ fingerprint, outlines }, outcome === 'session-only')
    } catch (error) {
      svgErrorKey = svgErrorKeyFor(error)
      svgStatusKey = null
    }
  }

  function clearSvg(): void {
    storage.clear()
    onInputChange('usesCoverSvg', 'false')
    onInputChange('coverSvgFingerprint', '')
    svgStatusKey = null
    svgErrorKey = null
  }

  // Missing or corrupt SVG data falls back to the text-only layout with a
  // notice; the flag resets so export gating matches what the worker can
  // build. The stored outlines themselves are never deleted.
  $effect(() => {
    if (!usesCoverSvg || coverFingerprint === '') return
    const record = storage.load()
    if (!record || record.fingerprint !== coverFingerprint) {
      svgStatusKey = 'panel.cardBox.svgMissingFallback'
      onInputChange('usesCoverSvg', 'false')
      onInputChange('coverSvgFingerprint', '')
    }
  })

  const partOptions: Array<{ value: CardBoxPart; key: string }> = [
    { value: 'assembly', key: 'panel.cardBox.part.assembly' },
    { value: 'box', key: 'panel.cardBox.part.box' },
    { value: 'lid', key: 'panel.cardBox.part.lid' },
    { value: 'divider', key: 'panel.cardBox.part.divider' },
    { value: 'cover', key: 'panel.cardBox.part.cover' },
  ]

  const tabPositionOptions: Array<{
    value: CardBoxTabPosition
    key: string
  }> = [
    { value: 'left', key: 'panel.cardBox.tab.left' },
    { value: 'center', key: 'panel.cardBox.tab.center' },
    { value: 'right', key: 'panel.cardBox.tab.right' },
  ]

  const styleOptions: Array<{ value: CardBoxStyle; key: string }> = [
    { value: 'raised', key: 'panel.cardBox.style.raised' },
    { value: 'flat', key: 'panel.cardBox.style.flat' },
  ]

  function numericField(
    key: ModelParameterKey,
    labelKey: string,
    min: number,
    max: number,
    step: number,
    defaultValue: number,
  ) {
    return {
      key,
      label: labelKey,
      axis: '',
      unit: 'mm' as const,
      control: 'range-text' as const,
      defaultValue,
      min,
      max,
      step,
      sliderMin: min,
      sliderMax: max,
    }
  }

  const titleTextHeightField = numericField(
    'coverTitleTextHeight',
    'panel.cardBox.coverTitleTextHeight',
    CARD_BOX_CONFIGURATION.coverTitleTextHeight.min,
    CARD_BOX_CONFIGURATION.coverTitleTextHeight.max,
    CARD_BOX_CONFIGURATION.coverTitleTextHeight.step,
    CARD_BOX_CONFIGURATION.coverTitleTextHeight.default,
  )
  const subtitleTextHeightField = numericField(
    'coverSubtitleTextHeight',
    'panel.cardBox.coverSubtitleTextHeight',
    CARD_BOX_CONFIGURATION.coverSubtitleTextHeight.min,
    CARD_BOX_CONFIGURATION.coverSubtitleTextHeight.max,
    CARD_BOX_CONFIGURATION.coverSubtitleTextHeight.step,
    CARD_BOX_CONFIGURATION.coverSubtitleTextHeight.default,
  )
  const svgWidthField = numericField(
    'coverSvgWidth',
    'panel.cardBox.coverSvgWidth',
    CARD_BOX_CONFIGURATION.coverSvgWidth.min,
    CARD_BOX_CONFIGURATION.coverSvgWidth.max,
    CARD_BOX_CONFIGURATION.coverSvgWidth.step,
    CARD_BOX_CONFIGURATION.coverSvgWidth.default,
  )
  const verticalPositionField = {
    ...numericField(
      'coverVerticalPosition',
      'panel.cardBox.coverVerticalPosition',
      CARD_BOX_CONFIGURATION.coverVerticalPosition.min,
      CARD_BOX_CONFIGURATION.coverVerticalPosition.max,
      1,
      CARD_BOX_CONFIGURATION.coverVerticalPosition.default,
    ),
    unit: 'count' as const,
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <legend class="mb-3 text-sm font-semibold text-muted-foreground"
    >{t('cad.presentation.dimensions')}</legend
  >
  <p class="m-0 text-sm text-muted-foreground">
    {t('panel.cardBox.description')}
  </p>

  <ParameterField
    {locale}
    label={t('panel.cardBox.part')}
    unit="part"
    changed={part !== 'assembly'}
    error={fieldErrors.part}
    errorId="part-error"
    onRestore={() => onInputChange('part', 'assembly')}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label={t('panel.cardBox.part')}
      data-testid="card-box-part"
      value={part}
      onchange={handlePartChange}
    >
      {#each partOptions as option (option.value)}
        <option value={option.value}>{t(option.key)}</option>
      {/each}
    </select>
  </ParameterField>

  {#each cardBoxDefinition.parameterSchema as field (field.key)}
    {@const value = text(field.key, String(field.defaultValue))}
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
</fieldset>

{#if part === 'divider'}
  <fieldset class="m-0 grid gap-3 border-0 p-0">
    <legend class="mb-3 text-sm font-semibold text-muted-foreground"
      >{t('panel.cardBox.dividerSection')}</legend
    >
    <ParameterField
      {locale}
      label={t('panel.cardBox.tabPosition')}
      unit="tab"
      changed={text('dividerTabPosition', 'left') !== 'left'}
      error={fieldErrors.dividerTabPosition}
      errorId="dividerTabPosition-error"
      onRestore={() => onInputChange('dividerTabPosition', 'left')}
    >
      <select
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label={t('panel.cardBox.tabPosition')}
        value={text('dividerTabPosition', 'left')}
        onchange={handleTabPositionChange}
      >
        {#each tabPositionOptions as option (option.value)}
          <option value={option.value}>{t(option.key)}</option>
        {/each}
      </select>
    </ParameterField>
    <ParameterField
      {locale}
      label={t('panel.cardBox.dividerText')}
      unit="text"
      changed={text('dividerText', '') !== ''}
      error={fieldErrors.dividerText}
      errorId="dividerText-error"
      onRestore={() => onInputChange('dividerText', '')}
    >
      <input
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label={t('panel.cardBox.dividerText')}
        maxlength={CARD_BOX_CONFIGURATION.dividerTextMaxLength}
        value={text('dividerText', '')}
        oninput={handleDividerTextInput}
      />
    </ParameterField>
    <ParameterField
      {locale}
      label={t('panel.cardBox.dividerStyle')}
      unit="style"
      changed={text('dividerStyle', 'raised') !== 'raised'}
      error={fieldErrors.dividerStyle}
      errorId="dividerStyle-error"
      onRestore={() => onInputChange('dividerStyle', 'raised')}
    >
      <select
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label={t('panel.cardBox.dividerStyle')}
        value={text('dividerStyle', 'raised')}
        onchange={handleDividerStyleChange}
      >
        {#each styleOptions as option (option.value)}
          <option value={option.value}>{t(option.key)}</option>
        {/each}
      </select>
    </ParameterField>
  </fieldset>
{/if}

{#if part === 'cover'}
  <fieldset class="m-0 grid gap-3 border-0 p-0">
    <legend class="mb-3 text-sm font-semibold text-muted-foreground"
      >{t('panel.cardBox.coverSection')}</legend
    >
    <ParameterField
      {locale}
      label={t('panel.cardBox.coverStyle')}
      unit="style"
      changed={text('coverStyle', 'raised') !== 'raised'}
      error={fieldErrors.coverStyle}
      errorId="coverStyle-error"
      onRestore={() => onInputChange('coverStyle', 'raised')}
    >
      <select
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label={t('panel.cardBox.coverStyle')}
        value={text('coverStyle', 'raised')}
        onchange={handleCoverStyleChange}
      >
        {#each styleOptions as option (option.value)}
          <option value={option.value}>{t(option.key)}</option>
        {/each}
      </select>
    </ParameterField>
    <ParameterField
      {locale}
      label={t('panel.cardBox.coverTitle')}
      unit="text"
      changed={text('coverTitle', CARD_BOX_CONFIGURATION.defaultCoverTitle) !==
        CARD_BOX_CONFIGURATION.defaultCoverTitle}
      error={fieldErrors.coverTitle}
      errorId="coverTitle-error"
      onRestore={() =>
        onInputChange('coverTitle', CARD_BOX_CONFIGURATION.defaultCoverTitle)}
    >
      <input
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label={t('panel.cardBox.coverTitle')}
        maxlength={CARD_BOX_CONFIGURATION.coverTextMaxLength}
        value={text('coverTitle', CARD_BOX_CONFIGURATION.defaultCoverTitle)}
        oninput={handleCoverTitleInput}
      />
    </ParameterField>
    <ParameterControl
      {locale}
      field={titleTextHeightField}
      value={text(
        'coverTitleTextHeight',
        String(CARD_BOX_CONFIGURATION.coverTitleTextHeight.default),
      )}
      error={fieldErrors.coverTitleTextHeight}
      onChange={(nextValue) => onInputChange('coverTitleTextHeight', nextValue)}
    />
    <ParameterField
      {locale}
      label={t('panel.cardBox.coverSubtitle')}
      unit="text"
      changed={text('coverSubtitle', '') !== ''}
      error={fieldErrors.coverSubtitle}
      errorId="coverSubtitle-error"
      onRestore={() => onInputChange('coverSubtitle', '')}
    >
      <input
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label={t('panel.cardBox.coverSubtitle')}
        maxlength={CARD_BOX_CONFIGURATION.coverTextMaxLength}
        value={text('coverSubtitle', '')}
        oninput={handleCoverSubtitleInput}
      />
    </ParameterField>
    <ParameterControl
      {locale}
      field={subtitleTextHeightField}
      value={text(
        'coverSubtitleTextHeight',
        String(CARD_BOX_CONFIGURATION.coverSubtitleTextHeight.default),
      )}
      error={fieldErrors.coverSubtitleTextHeight}
      onChange={(nextValue) =>
        onInputChange('coverSubtitleTextHeight', nextValue)}
    />
    <ParameterControl
      {locale}
      field={svgWidthField}
      value={text(
        'coverSvgWidth',
        String(CARD_BOX_CONFIGURATION.coverSvgWidth.default),
      )}
      error={fieldErrors.coverSvgWidth}
      onChange={(nextValue) => onInputChange('coverSvgWidth', nextValue)}
    />
    <ParameterControl
      {locale}
      field={verticalPositionField}
      value={text(
        'coverVerticalPosition',
        String(CARD_BOX_CONFIGURATION.coverVerticalPosition.default),
      )}
      error={fieldErrors.coverVerticalPosition}
      onChange={(nextValue) =>
        onInputChange('coverVerticalPosition', nextValue)}
    />

    <div class="grid gap-1" data-testid="card-box-svg-import">
      <label
        class="flex items-center gap-2 text-sm font-semibold text-muted-foreground"
        for="card-box-svg-file"
      >
        <span>{t('panel.cardBox.svgImport')}</span>
        <span
          class="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"
        >
          {t('panel.cardBox.svgBeta')}
        </span>
      </label>
      <div class="flex flex-wrap items-center gap-2">
        <input
          id="card-box-svg-file"
          class="w-full min-w-0 text-sm text-muted-foreground file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-primary-foreground"
          type="file"
          accept=".svg,image/svg+xml"
          onchange={handleSvgFileChange}
        />
        {#if usesCoverSvg}
          <button
            class="cursor-pointer rounded-lg border border-border-field bg-panel px-3 py-1.5 text-sm text-ink"
            type="button"
            onclick={clearSvg}
          >
            {t('panel.cardBox.svgClear')}
          </button>
        {/if}
      </div>
      {#if svgErrorKey}
        <p class="m-0 text-sm text-error" role="alert">{t(svgErrorKey)}</p>
      {/if}
      {#if svgStatusKey}
        <p class="m-0 text-sm text-muted-foreground" role="status">
          {t(svgStatusKey)}
        </p>
      {/if}
    </div>
  </fieldset>
{/if}
