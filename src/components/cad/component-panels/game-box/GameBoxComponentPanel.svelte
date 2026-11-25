<script lang="ts">
  import {
    boundsForGameBox,
    GAME_BOX_CONFIGURATION,
    GAME_BOX_DIVIDER_INDICES,
    GAME_BOX_STYLES,
    GAME_BOX_TAB_POSITIONS,
    gameBoxAvailableParts,
    gameBoxLayout,
    gameBoxDividerStyleKey,
    gameBoxDividerTabPositionKey,
    gameBoxDividerTextKey,
    gameBoxModuleTypeKey,
    gameBoxPartDividerOrdinal,
    type GameBoxDividerIndex,
    type GameBoxModuleIndex,
    type GameBoxModuleType,
    type GameBoxPart,
    type GameBoxStyle,
    type GameBoxTabPosition,
    type ModelParameterKey,
  } from '../../../../cad-contract/units'
  import type { CardBoxSvgOutlineData } from '../../../../cad-contract/units'
  import {
    displayParameterLabel,
    gameBoxDefinition,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import {
    createGameBoxSvgStorage,
    type GameBoxSvgStored,
  } from '../../../../features/cad/game-box-cover-svg/store'
  import { parseGameBoxSvg } from '../../../../features/cad/game-box-cover-svg/parse-svg'
  import { fingerprintGameBoxSvg } from '../../../../features/cad/game-box-cover-svg/fingerprint'
  import { translate } from '../../../../i18n'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import ParameterField from '../ParameterField.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import type { ComponentPanelProps } from '../types'
  import { formatMillimetres, gameBoxDerivedSizes } from './derived-sizes'
  import {
    cardDepthField,
    diceCountField,
    diceSizeField,
    moduleFieldChanged,
  } from './fields'
  import {
    activeModuleCount,
    addModuleGroup,
    deleteModuleGroup,
    moduleSnapshot,
    moveModuleGroup,
    listOperationValues,
    readModuleGroups,
    type GameBoxModuleGroup,
  } from './module-list'

  type Props = ComponentPanelProps & {
    /** Applies several raw values as one snapshot. */
    onInputsChange: (values: Partial<Record<ModelParameterKey, string>>) => void
  }

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
    onInputsChange,
  }: Props = $props()

  const t = (key: string, values?: Record<string, string | number | boolean>) =>
    translate(locale, key, values)

  let addMenuOpen = $state(false)

  const svgStorage = createGameBoxSvgStorage()

  let svgStatusKey: string | null = $state(null)
  let svgErrorKey: string | null = $state(null)

  const groups = $derived(readModuleGroups(rawParameters))
  const enabledGroups = $derived(groups.slice(0, activeModuleCount(groups)))
  const cardWidth = $derived(
    numberFromRaw('cardWidth', GAME_BOX_CONFIGURATION.defaults.cardWidth),
  )
  const cardHeight = $derived(
    numberFromRaw('cardHeight', GAME_BOX_CONFIGURATION.defaults.cardHeight),
  )
  const part = $derived(
    (rawParameters.part ?? GAME_BOX_CONFIGURATION.defaults.part) as GameBoxPart,
  )
  const usesCoverSvg = $derived(rawParameters.usesCoverSvg === 'true')
  const coverFingerprint = $derived(text('coverSvgFingerprint', ''))
  const snapshot = $derived(moduleSnapshot(groups, part, cardWidth, cardHeight))
  const layout = $derived(gameBoxLayout(snapshot))
  const availableParts = $derived(gameBoxAvailableParts(snapshot))
  const atModuleLimit = $derived(
    enabledGroups.length >= GAME_BOX_CONFIGURATION.moduleCount,
  )
  const canDelete = $derived(enabledGroups.length > 1)

  // The outer size describes the whole product: the box body with the
  // sliding lid on top, measured in the assembled frame.
  const productBounds = $derived(
    boundsForGameBox({ ...snapshot, part: 'assembly' }),
  )

  const derivedSizes = $derived(
    gameBoxDerivedSizes({
      cardWidth,
      cardHeight,
      storageDepth: layout.storageDepth,
      productBounds,
    }),
  )

  const partOptions = $derived(
    availableParts.map((option) => ({
      value: option,
      label: partLabel(option),
    })),
  )

  /** Part names carry the divider ordinal and the module number. */
  function partLabel(option: GameBoxPart): string {
    const dividerIndex = gameBoxPartDividerOrdinal(option)
    if (dividerIndex !== null) {
      return t('panel.gameBox.part.divider', { divider: dividerIndex })
    }
    if (option.startsWith('module')) {
      return t('panel.gameBox.part.module', {
        module: Number(option.slice('module'.length)),
      })
    }
    return t(`panel.gameBox.part.${option}`)
  }

  function text(key: ModelParameterKey, fallback: string): string {
    const value = rawParameters[key]
    return value === undefined ? fallback : value
  }

  /** The card size the derived sizes are computed from. */
  function numberFromRaw(key: ModelParameterKey, fallback: number): number {
    const value = Number(rawParameters[key])
    return Number.isFinite(value) && value > 0 ? value : fallback
  }

  function moduleTypeLabel(type: GameBoxModuleType): string {
    return t(`panel.gameBox.module.${type}`)
  }

  function handlePartChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    onInputChange('part', event.currentTarget.value)
  }

  function handleDividerTextInput(index: GameBoxDividerIndex) {
    return (event: Event): void => {
      if (!(event.currentTarget instanceof HTMLInputElement)) return
      onInputChange(gameBoxDividerTextKey(index), event.currentTarget.value)
    }
  }

  function handleDividerTabChange(index: GameBoxDividerIndex) {
    return (event: Event): void => {
      if (!(event.currentTarget instanceof HTMLSelectElement)) return
      onInputChange(
        gameBoxDividerTabPositionKey(index),
        event.currentTarget.value,
      )
    }
  }

  function handleDividerStyleChange(index: GameBoxDividerIndex) {
    return (event: Event): void => {
      if (!(event.currentTarget instanceof HTMLSelectElement)) return
      onInputChange(gameBoxDividerStyleKey(index), event.currentTarget.value)
    }
  }

  function handleCoverStyleChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    onInputChange('coverStyle', event.currentTarget.value)
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
    if (message.includes('GAME_BOX_SVG_STROKE_ONLY')) {
      return 'panel.gameBox.svgError.strokeOnly'
    }
    if (message.includes('GAME_BOX_SVG_TEXT_UNSUPPORTED')) {
      return 'panel.gameBox.svgError.textUnsupported'
    }
    if (message.includes('GAME_BOX_SVG_IMAGE_UNSUPPORTED')) {
      return 'panel.gameBox.svgError.imageUnsupported'
    }
    if (message.includes('GAME_BOX_SVG_TOO_COMPLEX')) {
      return 'panel.gameBox.svgError.tooComplex'
    }
    if (message.includes('GAME_BOX_SVG_UNSUPPORTED_ELEMENT')) {
      return 'panel.gameBox.svgError.unsupportedElement'
    }
    return 'panel.gameBox.svgError.parseFailed'
  }

  function applyStoredSvg(
    record: GameBoxSvgStored,
    sessionOnly: boolean,
  ): void {
    onInputChange('usesCoverSvg', 'true')
    onInputChange('coverSvgFingerprint', record.fingerprint)
    // The height/width ratio of the cleaned outlines: validation judges the
    // scaled SVG height from it, font-free.
    onInputChange(
      'coverSvgAspect',
      String(record.outlines.height / record.outlines.width),
    )
    svgErrorKey = null
    svgStatusKey = sessionOnly
      ? 'panel.gameBox.svgSessionOnly'
      : 'panel.gameBox.svgLoaded'
  }

  async function handleSvgFileChange(event: Event): Promise<void> {
    const input = event.currentTarget
    if (!(input instanceof HTMLInputElement)) return
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    try {
      const source = await file.text()
      const outlines: CardBoxSvgOutlineData = parseGameBoxSvg(source)
      const fingerprint = fingerprintGameBoxSvg(source)
      const outcome = svgStorage.save({ fingerprint, outlines })
      applyStoredSvg({ fingerprint, outlines }, outcome === 'session-only')
    } catch (error) {
      svgErrorKey = svgErrorKeyFor(error)
      svgStatusKey = null
    }
  }

  function clearSvg(): void {
    svgStorage.clear()
    onInputChange('usesCoverSvg', 'false')
    onInputChange('coverSvgFingerprint', '')
    onInputChange('coverSvgAspect', '0')
    svgStatusKey = null
    svgErrorKey = null
  }

  // Missing or corrupt SVG data falls back to the text-only layout with a
  // notice; the flag resets so export gating matches what the worker can
  // build. The stored outlines themselves are never deleted.
  $effect(() => {
    if (!usesCoverSvg || coverFingerprint === '') return
    const record = svgStorage.load()
    if (!record || record.fingerprint !== coverFingerprint) {
      svgStatusKey = 'panel.gameBox.svgMissingFallback'
      onInputChange('usesCoverSvg', 'false')
      onInputChange('coverSvgFingerprint', '')
      onInputChange('coverSvgAspect', '0')
    }
  })

  const dividerFields = $derived(
    GAME_BOX_DIVIDER_INDICES.slice(0, Math.max(layout.dividerCount, 0)).map(
      (index) => index as GameBoxDividerIndex,
    ),
  )

  /**
   * Writes the complete module list back as one snapshot: the groups are
   * re-packed, every divider ordinal above min(old pair count, new pair
   * count) falls back to its defaults (created pairs start fresh, vanished
   * ones are wiped, relocated ones keep their fields), and a selection that
   * no longer exists falls back to the assembly. The counts come from the
   * layout in {@file ./module-list.ts} - the same definition the part
   * selector uses.
   */
  function applyGroups(nextGroups: GameBoxModuleGroup[]): void {
    const nextSnapshot = moduleSnapshot(nextGroups, part, cardWidth, cardHeight)
    const nextParts = gameBoxAvailableParts(nextSnapshot)
    const nextPart = nextParts.includes(part) ? part : 'assembly'
    onInputsChange(
      listOperationValues(
        nextGroups,
        nextPart,
        cardWidth,
        cardHeight,
        rawParameters,
      ),
    )
  }

  function addModule(type: GameBoxModuleType): void {
    addMenuOpen = false
    applyGroups(addModuleGroup(groups, type))
  }

  function removeModule(position: number): void {
    applyGroups(deleteModuleGroup(groups, position))
  }

  function moveModule(position: number, offset: -1 | 1): void {
    applyGroups(moveModuleGroup(groups, position, offset))
  }

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
      labelFormat: 'label' as const,
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

  const defaultTab = GAME_BOX_CONFIGURATION.defaultTabPosition
  const defaultStyle = GAME_BOX_CONFIGURATION.defaultStyle
  const cover = GAME_BOX_CONFIGURATION.rangesCover
  const titleTextHeightField = numericField(
    'coverTitleTextHeight',
    'panel.gameBox.coverTitleTextHeight',
    cover.coverTitleTextHeight.min,
    cover.coverTitleTextHeight.max,
    cover.coverTitleTextHeight.step,
    cover.coverTitleTextHeight.default,
  )
  const subtitleTextHeightField = numericField(
    'coverSubtitleTextHeight',
    'panel.gameBox.coverSubtitleTextHeight',
    cover.coverSubtitleTextHeight.min,
    cover.coverSubtitleTextHeight.max,
    cover.coverSubtitleTextHeight.step,
    cover.coverSubtitleTextHeight.default,
  )
  const svgWidthField = numericField(
    'coverSvgWidth',
    'panel.gameBox.coverSvgWidth',
    cover.coverSvgWidth.min,
    cover.coverSvgWidth.max,
    cover.coverSvgWidth.step,
    cover.coverSvgWidth.default,
  )
  const verticalPositionField = {
    ...numericField(
      'coverVerticalPosition',
      'panel.gameBox.coverVerticalPosition',
      cover.coverVerticalPosition.min,
      cover.coverVerticalPosition.max,
      1,
      cover.coverVerticalPosition.default,
    ),
    unit: 'count' as const,
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <legend class="mb-3 text-sm font-semibold text-muted-foreground"
    >{t('panel.gameBox.cardSize')}</legend
  >
  <p class="m-0 text-sm text-muted-foreground">
    {t('panel.gameBox.description')}
  </p>

  {#each gameBoxDefinition.parameterSchema as field (field.key)}
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

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <legend class="mb-3 text-sm font-semibold text-muted-foreground"
    >{t('panel.gameBox.part')}</legend
  >
  <ParameterField
    {locale}
    label={t('panel.gameBox.part')}
    unit="part"
    changed={part !== GAME_BOX_CONFIGURATION.defaults.part}
    error={fieldErrors.part}
    errorId="part-error"
    onRestore={() => onInputChange('part', 'assembly')}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label={t('panel.gameBox.part')}
      data-testid="game-box-part"
      value={part}
      onchange={handlePartChange}
    >
      {#each partOptions as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </ParameterField>
</fieldset>

<fieldset class="m-0 grid gap-3 border-0 p-0" data-testid="game-box-dividers">
  <legend class="mb-3 text-sm font-semibold text-muted-foreground"
    >{t('panel.gameBox.dividerSection')}</legend
  >
  {#each dividerFields as dividerIndex (dividerIndex)}
    <div
      class="grid min-w-0 gap-2 rounded-lg border border-border-field p-3"
      data-testid={`game-box-divider-${dividerIndex}`}
    >
      <span class="font-[650]">
        {t('panel.gameBox.dividerLabel', { divider: dividerIndex })}
      </span>
      <ParameterField
        {locale}
        label={t('panel.gameBox.dividerText')}
        unit="text"
        changed={text(gameBoxDividerTextKey(dividerIndex), '') !== ''}
        error={fieldErrors[gameBoxDividerTextKey(dividerIndex)]}
        errorId={`divider${dividerIndex}Text-error`}
        onRestore={() => onInputChange(gameBoxDividerTextKey(dividerIndex), '')}
      >
        <input
          class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
          aria-label={t('panel.gameBox.dividerText')}
          data-testid={`game-box-divider-${dividerIndex}-text`}
          maxlength={GAME_BOX_CONFIGURATION.dividerTextMaxLength}
          value={text(gameBoxDividerTextKey(dividerIndex), '')}
          oninput={handleDividerTextInput(dividerIndex)}
        />
      </ParameterField>
      <ParameterField
        {locale}
        label={t('panel.gameBox.tabPosition')}
        unit="tab"
        changed={text(
          gameBoxDividerTabPositionKey(dividerIndex),
          defaultTab,
        ) !== defaultTab}
        error={fieldErrors[gameBoxDividerTabPositionKey(dividerIndex)]}
        errorId={`divider${dividerIndex}TabPosition-error`}
        onRestore={() =>
          onInputChange(gameBoxDividerTabPositionKey(dividerIndex), defaultTab)}
      >
        <select
          class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
          aria-label={t('panel.gameBox.tabPosition')}
          data-testid={`game-box-divider-${dividerIndex}-tab`}
          value={text(gameBoxDividerTabPositionKey(dividerIndex), defaultTab)}
          onchange={handleDividerTabChange(dividerIndex)}
        >
          {#each GAME_BOX_TAB_POSITIONS as tab (tab)}
            <option value={tab}>{t(`panel.gameBox.tab.${tab}`)}</option>
          {/each}
        </select>
      </ParameterField>
      <ParameterField
        {locale}
        label={t('panel.gameBox.dividerStyle')}
        unit="style"
        changed={text(gameBoxDividerStyleKey(dividerIndex), defaultStyle) !==
          defaultStyle}
        error={fieldErrors[gameBoxDividerStyleKey(dividerIndex)]}
        errorId={`divider${dividerIndex}Style-error`}
        onRestore={() =>
          onInputChange(gameBoxDividerStyleKey(dividerIndex), defaultStyle)}
      >
        <select
          class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
          aria-label={t('panel.gameBox.dividerStyle')}
          data-testid={`game-box-divider-${dividerIndex}-style`}
          value={text(gameBoxDividerStyleKey(dividerIndex), defaultStyle)}
          onchange={handleDividerStyleChange(dividerIndex)}
        >
          {#each GAME_BOX_STYLES as style (style)}
            <option value={style}>{t(`panel.gameBox.style.${style}`)}</option>
          {/each}
        </select>
      </ParameterField>
    </div>
  {/each}
</fieldset>

{#if part === 'cover'}
  <fieldset class="m-0 grid gap-3 border-0 p-0">
    <legend class="mb-3 text-sm font-semibold text-muted-foreground"
      >{t('panel.gameBox.coverSection')}</legend
    >
    <ParameterField
      {locale}
      label={t('panel.gameBox.coverStyle')}
      unit="style"
      changed={text('coverStyle', defaultStyle) !== defaultStyle}
      error={fieldErrors.coverStyle}
      errorId="coverStyle-error"
      onRestore={() => onInputChange('coverStyle', defaultStyle)}
    >
      <select
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label={t('panel.gameBox.coverStyle')}
        data-testid="game-box-cover-style"
        value={text('coverStyle', defaultStyle)}
        onchange={handleCoverStyleChange}
      >
        {#each GAME_BOX_STYLES as style (style)}
          <option value={style}>{t(`panel.gameBox.style.${style}`)}</option>
        {/each}
      </select>
    </ParameterField>
    <ParameterField
      {locale}
      label={t('panel.gameBox.coverTitle')}
      unit="text"
      changed={text('coverTitle', GAME_BOX_CONFIGURATION.defaultCoverTitle) !==
        GAME_BOX_CONFIGURATION.defaultCoverTitle}
      error={fieldErrors.coverTitle}
      errorId="coverTitle-error"
      onRestore={() =>
        onInputChange('coverTitle', GAME_BOX_CONFIGURATION.defaultCoverTitle)}
    >
      <input
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label={t('panel.gameBox.coverTitle')}
        data-testid="game-box-cover-title"
        maxlength={GAME_BOX_CONFIGURATION.coverTextMaxLength}
        value={text('coverTitle', GAME_BOX_CONFIGURATION.defaultCoverTitle)}
        oninput={handleCoverTitleInput}
      />
    </ParameterField>
    <ParameterField
      {locale}
      label={t('panel.gameBox.coverTitleTextHeight')}
      unit={unitLabelFor(locale, 'mm')}
      changed={text('coverTitleTextHeight', '6') !== '6'}
      error={fieldErrors.coverTitleTextHeight}
      errorId="coverTitleTextHeight-error"
      onRestore={() =>
        onInputChange(
          'coverTitleTextHeight',
          String(
            GAME_BOX_CONFIGURATION.rangesCover.coverTitleTextHeight.default,
          ),
        )}
    >
      <ParameterControl
        {locale}
        field={titleTextHeightField}
        value={text(
          'coverTitleTextHeight',
          String(
            GAME_BOX_CONFIGURATION.rangesCover.coverTitleTextHeight.default,
          ),
        )}
        error={fieldErrors.coverTitleTextHeight}
        onChange={(nextValue) =>
          onInputChange('coverTitleTextHeight', nextValue)}
      />
    </ParameterField>
    <ParameterField
      {locale}
      label={t('panel.gameBox.coverSubtitle')}
      unit="text"
      changed={text('coverSubtitle', '') !== ''}
      error={fieldErrors.coverSubtitle}
      errorId="coverSubtitle-error"
      onRestore={() => onInputChange('coverSubtitle', '')}
    >
      <input
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label={t('panel.gameBox.coverSubtitle')}
        data-testid="game-box-cover-subtitle"
        maxlength={GAME_BOX_CONFIGURATION.coverTextMaxLength}
        value={text('coverSubtitle', '')}
        oninput={handleCoverSubtitleInput}
      />
    </ParameterField>
    <ParameterField
      {locale}
      label={t('panel.gameBox.coverSubtitleTextHeight')}
      unit={unitLabelFor(locale, 'mm')}
      changed={text('coverSubtitleTextHeight', '5') !== '5'}
      error={fieldErrors.coverSubtitleTextHeight}
      errorId="coverSubtitleTextHeight-error"
      onRestore={() =>
        onInputChange(
          'coverSubtitleTextHeight',
          String(
            GAME_BOX_CONFIGURATION.rangesCover.coverSubtitleTextHeight.default,
          ),
        )}
    >
      <ParameterControl
        {locale}
        field={subtitleTextHeightField}
        value={text(
          'coverSubtitleTextHeight',
          String(
            GAME_BOX_CONFIGURATION.rangesCover.coverSubtitleTextHeight.default,
          ),
        )}
        error={fieldErrors.coverSubtitleTextHeight}
        onChange={(nextValue) =>
          onInputChange('coverSubtitleTextHeight', nextValue)}
      />
    </ParameterField>
    <ParameterField
      {locale}
      label={t('panel.gameBox.coverSvgWidth')}
      unit={unitLabelFor(locale, 'mm')}
      changed={text('coverSvgWidth', '40') !== '40'}
      error={fieldErrors.coverSvgWidth}
      errorId="coverSvgWidth-error"
      onRestore={() =>
        onInputChange(
          'coverSvgWidth',
          String(GAME_BOX_CONFIGURATION.rangesCover.coverSvgWidth.default),
        )}
    >
      <ParameterControl
        {locale}
        field={svgWidthField}
        value={text(
          'coverSvgWidth',
          String(GAME_BOX_CONFIGURATION.rangesCover.coverSvgWidth.default),
        )}
        error={fieldErrors.coverSvgWidth}
        onChange={(nextValue) => onInputChange('coverSvgWidth', nextValue)}
      />
    </ParameterField>
    <ParameterControl
      {locale}
      field={verticalPositionField}
      value={text(
        'coverVerticalPosition',
        String(
          GAME_BOX_CONFIGURATION.rangesCover.coverVerticalPosition.default,
        ),
      )}
      error={fieldErrors.coverVerticalPosition}
      onChange={(nextValue) =>
        onInputChange('coverVerticalPosition', nextValue)}
    />

    <div class="grid gap-1" data-testid="game-box-svg-import">
      <label
        class="flex items-center gap-2 text-sm font-semibold text-muted-foreground"
        for="game-box-svg-file"
      >
        <span>{t('panel.gameBox.svgImport')}</span>
        <span
          class="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"
          data-testid="game-box-svg-beta"
        >
          {t('panel.gameBox.svgBeta')}
        </span>
      </label>
      <div class="flex flex-wrap items-center gap-2">
        <input
          id="game-box-svg-file"
          class="w-full min-w-0 text-sm text-muted-foreground file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-primary-foreground"
          type="file"
          accept=".svg,image/svg+xml"
          onchange={handleSvgFileChange}
        />
        {#if usesCoverSvg}
          <button
            class="cursor-pointer rounded-lg border border-border-field bg-panel px-3 py-1.5 text-sm text-ink"
            type="button"
            data-testid="game-box-svg-clear"
            onclick={clearSvg}
          >
            {t('panel.gameBox.svgClear')}
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

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <legend class="mb-3 text-sm font-semibold text-muted-foreground"
    >{t('panel.gameBox.modules')}</legend
  >
  <ol class="m-0 grid list-none gap-3 p-0" data-testid="game-box-modules">
    {#each enabledGroups as group, position (position)}
      {@const index = (position + 1) as GameBoxModuleIndex}
      {@const moduleLayout = layout.modules[position]}
      <li
        class="grid min-w-0 gap-2 rounded-lg border border-border-field p-3"
        data-testid={`game-box-module-${index}`}
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-[650]">
            {t('panel.gameBox.moduleLabel', { module: index })}
          </span>
          <span class="text-sm text-muted-foreground">
            {moduleTypeLabel(group.type)}
          </span>
          <span
            class="ms-auto flex items-center gap-1 text-sm text-muted-foreground"
          >
            <span>{t('panel.gameBox.moduleLength')}</span>
            <span data-testid={`game-box-module-${index}-length`}>
              {formatMillimetres(moduleLayout?.length ?? Number.NaN)}
            </span>
          </span>
        </div>

        {#if fieldErrors[gameBoxModuleTypeKey(index)]}
          <span class="text-sm text-error" role="alert">
            {formatValidationIssue(
              locale,
              fieldErrors[gameBoxModuleTypeKey(index)]!,
            )}
          </span>
        {/if}

        {#if group.type === 'cards'}
          {@const field = cardDepthField(index)}
          <ParameterField
            {locale}
            label={displayParameterLabel(field, locale)}
            unit={unitLabelFor(locale, field.unit)}
            changed={moduleFieldChanged(group.cardDepth, field)}
            error={fieldErrors[field.key]}
            errorId={`${field.key}-error`}
            onRestore={() =>
              onInputChange(field.key, String(field.defaultValue))}
          >
            <ParameterControl
              {locale}
              {field}
              value={group.cardDepth}
              error={fieldErrors[field.key]}
              onChange={(nextValue) => onInputChange(field.key, nextValue)}
            />
          </ParameterField>
        {:else if group.type === 'dice'}
          {@const sizeField = diceSizeField(index)}
          {@const countField = diceCountField(index)}
          <ParameterField
            {locale}
            label={displayParameterLabel(sizeField, locale)}
            unit={unitLabelFor(locale, sizeField.unit)}
            changed={moduleFieldChanged(group.diceSize, sizeField)}
            error={fieldErrors[sizeField.key]}
            errorId={`${sizeField.key}-error`}
            onRestore={() =>
              onInputChange(sizeField.key, String(sizeField.defaultValue))}
          >
            <ParameterControl
              {locale}
              field={sizeField}
              value={group.diceSize}
              error={fieldErrors[sizeField.key]}
              onChange={(nextValue) => onInputChange(sizeField.key, nextValue)}
            />
          </ParameterField>
          <ParameterField
            {locale}
            label={displayParameterLabel(countField, locale)}
            unit={unitLabelFor(locale, countField.unit)}
            changed={moduleFieldChanged(group.diceCount, countField)}
            error={fieldErrors[countField.key]}
            errorId={`${countField.key}-error`}
            onRestore={() =>
              onInputChange(countField.key, String(countField.defaultValue))}
          >
            <ParameterControl
              {locale}
              field={countField}
              value={group.diceCount}
              error={fieldErrors[countField.key]}
              onChange={(nextValue) => onInputChange(countField.key, nextValue)}
            />
          </ParameterField>
        {/if}

        <div class="flex flex-wrap gap-2">
          <button
            class="cursor-pointer rounded-lg border border-border-field bg-panel px-3 py-1.5 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            data-testid={`game-box-module-${index}-move-earlier`}
            disabled={position === 0}
            onclick={() => moveModule(position, -1)}
          >
            {t('panel.gameBox.moveEarlier')}
          </button>
          <button
            class="cursor-pointer rounded-lg border border-border-field bg-panel px-3 py-1.5 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            data-testid={`game-box-module-${index}-move-later`}
            disabled={position === enabledGroups.length - 1}
            onclick={() => moveModule(position, 1)}
          >
            {t('panel.gameBox.moveLater')}
          </button>
          <button
            class="ms-auto cursor-pointer rounded-lg border border-border-field bg-panel px-3 py-1.5 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            data-testid={`game-box-module-${index}-delete`}
            disabled={!canDelete}
            onclick={() => removeModule(position)}
          >
            {t('panel.gameBox.deleteModule')}
          </button>
        </div>
      </li>
    {/each}
  </ol>

  <div class="grid gap-2">
    <button
      class="w-fit cursor-pointer rounded-lg border border-border-field bg-panel px-3 py-1.5 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50"
      type="button"
      data-testid="game-box-add"
      aria-expanded={addMenuOpen}
      disabled={atModuleLimit}
      onclick={() => (addMenuOpen = !addMenuOpen)}
    >
      {t('panel.gameBox.addModule')}
    </button>
    {#if atModuleLimit}
      <p
        class="m-0 text-sm text-muted-foreground"
        data-testid="game-box-module-limit"
      >
        {t('panel.gameBox.moduleLimit', {
          max: GAME_BOX_CONFIGURATION.moduleCount,
        })}
      </p>
    {/if}
    {#if addMenuOpen}
      <div class="flex flex-wrap gap-2" data-testid="game-box-add-menu">
        <button
          class="cursor-pointer rounded-lg border border-border-field bg-panel px-3 py-1.5 text-sm text-ink"
          type="button"
          data-testid="game-box-add-cards"
          onclick={() => addModule('cards')}
        >
          {t('panel.gameBox.addCards')}
        </button>
        <button
          class="cursor-pointer rounded-lg border border-border-field bg-panel px-3 py-1.5 text-sm text-ink"
          type="button"
          data-testid="game-box-add-dice"
          onclick={() => addModule('dice')}
        >
          {t('panel.gameBox.addDice')}
        </button>
      </div>
    {/if}
  </div>
</fieldset>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <legend
    class="mb-3 flex w-full items-baseline justify-between gap-2 text-sm font-semibold text-muted-foreground"
  >
    <span>{t('panel.gameBox.derivedSizes')}</span>
    <span class="text-xs font-normal text-muted-foreground/80"
      >{t('panel.gameBox.axisOrder')}</span
    >
  </legend>
  <dl class="m-0 grid gap-1 text-sm">
    <div class="flex flex-wrap items-baseline justify-between gap-x-2">
      <dt class="whitespace-nowrap text-muted-foreground">
        {t('panel.gameBox.interiorSize')}
      </dt>
      <dd
        class="m-0 whitespace-nowrap tabular-nums text-right"
        data-testid="game-box-interior-size"
      >
        {derivedSizes.interior}
      </dd>
    </div>
    <div class="flex flex-wrap items-baseline justify-between gap-x-2">
      <dt class="whitespace-nowrap text-muted-foreground">
        {t('panel.gameBox.outerSize')}
      </dt>
      <dd
        class="m-0 whitespace-nowrap tabular-nums text-right"
        data-testid="game-box-outer-size"
      >
        {derivedSizes.outer}
      </dd>
    </div>
    <div class="flex flex-wrap items-baseline justify-between gap-x-2">
      <dt class="whitespace-nowrap text-muted-foreground">
        {t('panel.gameBox.storageDepth')}
      </dt>
      <dd
        class="m-0 whitespace-nowrap tabular-nums text-right"
        data-testid="game-box-storage-depth"
      >
        {derivedSizes.storageDepth}
      </dd>
    </div>
  </dl>
</fieldset>
