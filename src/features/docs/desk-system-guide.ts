import type { ModelId } from '../../cad-contract/units'
import {
  contextPreviewImageFor,
  getModelDefinition,
} from '../cad/model-catalog'
import type { ModelPreviewImage } from '../cad/model-catalog'
import { localizedCadPathFor } from '../../i18n/routes'
import type { Locale } from '../../i18n'

export type DeskQuickStartRole =
  | 'board'
  | 'snap'
  | 'locating-post'
  | 'grid-box'
  | 'organizer-box'
  | 'round-box'

export type DeskQuickStartComponent = {
  readonly role: DeskQuickStartRole
  readonly modelId: ModelId
}

/**
 * Catalog references for both Desk placement routes stay separate from CAD
 * parameter schemas. The print plans below describe which parts each route uses.
 */
export const deskQuickStartComponents = [
  { role: 'board', modelId: 'opengrid' },
  { role: 'snap', modelId: 'opengrid-snap' },
  { role: 'locating-post', modelId: 'opengrid-pillar' },
  { role: 'grid-box', modelId: 'opengrid-stackable-box' },
  { role: 'organizer-box', modelId: 'opengrid-organizer-box' },
  { role: 'round-box', modelId: 'opengrid-stackable-cylinder' },
] as const satisfies ReadonlyArray<DeskQuickStartComponent>

export type DeskQuickStartEntry = DeskQuickStartComponent & {
  readonly labelKey: string
  readonly descriptionKey: string
  readonly previewAltKey: string
  readonly previewImage: ModelPreviewImage
  readonly href: string
}

export function deskQuickStartEntries(
  locale: Locale,
): ReadonlyArray<DeskQuickStartEntry> {
  return deskQuickStartComponents.map((component) => {
    const definition = getModelDefinition(component.modelId)
    if (!definition) {
      throw new Error(`DESK_QUICK_START_MODEL_MISSING:${component.modelId}`)
    }
    const previewImage = contextPreviewImageFor(definition, 'desk')
    if (!previewImage) {
      throw new Error(`DESK_QUICK_START_PREVIEW_MISSING:${component.modelId}`)
    }

    let labelKey = definition.selectionLabel ?? definition.displayName
    if (component.role === 'locating-post') {
      labelKey = 'panel.pillar.detachableCornerSeat'
    }

    return {
      ...component,
      labelKey,
      descriptionKey: definition.selectionDescription,
      previewAltKey: definition.previewImage?.alt ?? definition.displayName,
      previewImage,
      href: localizedCadPathFor(locale, component.modelId, 'desk'),
    }
  })
}

export function deskQuickStartEntryFor(
  locale: Locale,
  role: DeskQuickStartRole,
): DeskQuickStartEntry {
  const entry = deskQuickStartEntries(locale).find(
    (candidate) => candidate.role === role,
  )
  if (!entry) throw new Error(`DESK_QUICK_START_ROLE_MISSING:${role}`)
  return entry
}

export type DeskPrintPlanEntry = {
  readonly entry: DeskQuickStartEntry
  readonly quantity: number
  readonly settingsKey: string
}

export function deskStarterPrintPlan(
  locale: Locale,
): ReadonlyArray<DeskPrintPlanEntry> {
  return [
    {
      entry: deskQuickStartEntryFor(locale, 'board'),
      quantity: 1,
      settingsKey: 'docs.starter.boardSettings',
    },
    {
      entry: deskQuickStartEntryFor(locale, 'grid-box'),
      quantity: 1,
      settingsKey: 'docs.starter.boxSettings',
    },
  ]
}

export function deskFixingPrintPlan(
  locale: Locale,
  seatMode: 'integrated' | 'detachable-corner-seat',
): ReadonlyArray<DeskPrintPlanEntry> {
  const plan: DeskPrintPlanEntry[] = [
    {
      entry: deskQuickStartEntryFor(locale, 'board'),
      quantity: 1,
      settingsKey: 'docs.starter.boardSettings',
    },
    {
      entry: deskQuickStartEntryFor(locale, 'snap'),
      quantity: 4,
      settingsKey: 'docs.fixing.snapSettings',
    },
  ]
  if (seatMode === 'detachable-corner-seat') {
    plan.push({
      entry: deskQuickStartEntryFor(locale, 'locating-post'),
      quantity: 4,
      settingsKey: 'docs.fixing.seatSettings',
    })
    plan.push({
      entry: deskQuickStartEntryFor(locale, 'grid-box'),
      quantity: 1,
      settingsKey: 'docs.fixing.separateBoxSettings',
    })
    return plan
  }
  plan.push({
    entry: deskQuickStartEntryFor(locale, 'grid-box'),
    quantity: 1,
    settingsKey: 'docs.fixing.integratedBoxSettings',
  })
  return plan
}
