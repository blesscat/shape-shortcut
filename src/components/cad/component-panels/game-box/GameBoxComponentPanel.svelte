<script lang="ts">
  import {
    boundsForGameBox,
    cardBoxInteriorWidth,
    cardBoxOuterDepth,
    cardBoxOuterWidth,
    GAME_BOX_CONFIGURATION,
    gameBoxAvailableParts,
    gameBoxLayout,
    gameBoxModuleCardDepthKey,
    gameBoxModuleDiceCountKey,
    gameBoxModuleDiceSizeKey,
    gameBoxModuleTypeKey,
    type GameBoxModuleIndex,
    type GameBoxModuleType,
    type GameBoxPart,
    type ModelParameterKey,
  } from '../../../../cad-contract/units'
  import {
    displayParameterLabel,
    gameBoxDefinition,
    unitLabelFor,
    type ParameterField as ParameterFieldSpec,
  } from '../../../../features/cad/model-catalog'
  import { translate } from '../../../../i18n'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import ParameterField from '../ParameterField.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import type { ComponentPanelProps } from '../types'
  import {
    activeModuleCount,
    addModuleGroup,
    deleteModuleGroup,
    moduleNumber,
    moduleSnapshot,
    moveModuleGroup,
    readModuleGroups,
    snapshotRawValues,
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
  const snapshot = $derived(moduleSnapshot(groups, part, cardWidth, cardHeight))
  const layout = $derived(gameBoxLayout(snapshot))
  const availableParts = $derived(gameBoxAvailableParts(snapshot))
  const atModuleLimit = $derived(
    enabledGroups.length >= GAME_BOX_CONFIGURATION.moduleCount,
  )
  const canDelete = $derived(enabledGroups.length > 1)

  // The outer size describes the whole product: the box body with the
  // sliding lid on top.
  const productBounds = $derived(
    boundsForGameBox({ ...snapshot, part: 'assembly' }),
  )

  const partOptions = $derived(
    availableParts.map((option) => ({
      value: option,
      label: partLabel(option),
    })),
  )

  /** Part names carry the print count of the dividers and the module number. */
  function partLabel(option: GameBoxPart): string {
    if (option === 'divider') {
      return t('panel.gameBox.part.dividerCount', {
        count: layout.dividerCount,
      })
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

  function moduleField(
    key: ModelParameterKey,
    label: string,
    range: { min: number; max: number; step: number },
    defaultValue: number,
  ): ParameterFieldSpec {
    return {
      key,
      label,
      labelFormat: 'label',
      axis: 'Y',
      unit: 'mm',
      control: 'range-text',
      defaultValue,
      min: range.min,
      max: range.max,
      step: range.step,
      sliderMin: range.min,
      sliderMax: range.max,
    }
  }

  function cardDepthField(index: GameBoxModuleIndex): ParameterFieldSpec {
    const range = GAME_BOX_CONFIGURATION.ranges.cardDepth
    return moduleField(
      gameBoxModuleCardDepthKey(index),
      'parameters.gameBoxCardDepth',
      { min: range.min, max: range.max, step: 1 },
      GAME_BOX_CONFIGURATION.defaults.cardDepth,
    )
  }

  function diceSizeField(index: GameBoxModuleIndex): ParameterFieldSpec {
    const range = GAME_BOX_CONFIGURATION.ranges.diceSize
    return moduleField(
      gameBoxModuleDiceSizeKey(index),
      'parameters.gameBoxDiceSize',
      { min: range.min, max: range.max, step: range.step },
      GAME_BOX_CONFIGURATION.defaults.diceSize,
    )
  }

  function diceCountField(index: GameBoxModuleIndex): ParameterFieldSpec {
    const range = GAME_BOX_CONFIGURATION.ranges.diceCount
    return moduleField(
      gameBoxModuleDiceCountKey(index),
      'parameters.gameBoxDiceCount',
      { min: range.min, max: range.max, step: 1 },
      GAME_BOX_CONFIGURATION.defaults.diceCount,
    )
  }

  function moduleTypeLabel(type: GameBoxModuleType): string {
    return t(`panel.gameBox.module.${type}`)
  }

  function handlePartChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    onInputChange('part', event.currentTarget.value)
  }

  /**
   * Writes the complete module list back as one snapshot: the groups are
   * re-packed, the inactive ones are reset and a selection that no longer
   * exists falls back to the assembly.
   */
  function applyGroups(nextGroups: GameBoxModuleGroup[]): void {
    const nextSnapshot = moduleSnapshot(nextGroups, part, cardWidth, cardHeight)
    const nextParts = gameBoxAvailableParts(nextSnapshot)
    const nextPart = nextParts.includes(part) ? part : 'assembly'
    const values = snapshotRawValues(
      nextGroups,
      nextPart,
      cardWidth,
      cardHeight,
    )
    onInputsChange(values)
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
            class="ms-auto text-sm text-muted-foreground"
            data-testid={`game-box-module-${index}-length`}
          >
            {moduleLayout?.length ?? 0} mm
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
            changed={moduleNumber(group.cardDepth, field.defaultValue) !==
              field.defaultValue}
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
            changed={moduleNumber(group.diceSize, sizeField.defaultValue) !==
              sizeField.defaultValue}
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
            changed={moduleNumber(group.diceCount, countField.defaultValue) !==
              countField.defaultValue}
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
  <legend class="mb-3 text-sm font-semibold text-muted-foreground"
    >{t('panel.gameBox.derivedSizes')}</legend
  >
  <dl class="m-0 grid gap-1 text-sm">
    <div class="flex gap-2">
      <dt class="text-muted-foreground">{t('panel.gameBox.interiorSize')}</dt>
      <dd class="m-0 ms-auto" data-testid="game-box-interior-size">
        {cardBoxInteriorWidth(cardWidth)} × {layout.storageDepth} × {cardHeight}
        mm
      </dd>
    </div>
    <div class="flex gap-2">
      <dt class="text-muted-foreground">{t('panel.gameBox.outerSize')}</dt>
      <dd class="m-0 ms-auto" data-testid="game-box-outer-size">
        {cardBoxOuterWidth(cardWidth)} × {cardBoxOuterDepth(
          layout.storageDepth,
        )}
        × {productBounds.max[2] - productBounds.min[2]} mm
      </dd>
    </div>
    <div class="flex gap-2">
      <dt class="text-muted-foreground">{t('panel.gameBox.storageDepth')}</dt>
      <dd class="m-0 ms-auto" data-testid="game-box-storage-depth">
        {layout.storageDepth} mm
      </dd>
    </div>
  </dl>
</fieldset>
