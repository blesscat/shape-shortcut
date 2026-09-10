import type { ModelId } from '../../../cad-contract/units'
import {
  systemContextQuery,
  systemContextLabelKey,
  type OpenGridSystemContext,
} from '../system-entry-context'
import { boxDefinition as rawBoxDefinition } from './components/box'
import { hexagonalColumnDefinition as rawHexagonalColumnDefinition } from './components/hexagonal-column'
import { hswCellDefinition as rawHswCellDefinition } from './components/hsw-cell'
import { modularGridBaseDefinition as rawModularGridBaseDefinition } from './components/modular-grid-base'
import { opengridDefinition as rawOpengridDefinition } from './components/opengrid'
import { opengridDividerDefinition as rawOpengridDividerDefinition } from './components/opengrid-divider'
import { opengridOrganizerBoxDefinition as rawOpengridOrganizerBoxDefinition } from './components/opengrid-organizer-box'
import { opengridStackableBoxDefinition as rawOpengridStackableBoxDefinition } from './components/opengrid-stackable-box'
import { opengridStackableCylinderDefinition as rawOpengridStackableCylinderDefinition } from './components/opengrid-stackable-cylinder'
import { opengridSnapDefinition as rawOpengridSnapDefinition } from './components/opengrid-snap'
import { opengridWallCoverDefinition as rawOpengridWallCoverDefinition } from './components/opengrid-wall-cover'
import { openGridSnapRemoverDefinition as rawOpenGridSnapRemoverDefinition } from './components/opengrid-snap-remover'
import { opengridPillarDefinition as rawOpengridPillarDefinition } from './components/opengrid-pillar'
import { opengridOpenShelfDefinition as rawOpengridOpenShelfDefinition } from './components/opengrid-open-shelf'
import { opengridOpenConnectShelfDefinition as rawOpengridOpenConnectShelfDefinition } from './components/opengrid-openconnect-shelf'
import { opengridOpenConnectOrganizerDefinition as rawOpengridOpenConnectOrganizerDefinition } from './components/opengrid-openconnect-organizer'
import type {
  ModelDefinition,
  ModelFamily,
  ModelFamilyGroup,
  ModelFamilyMetadata,
  ModelPreviewImage,
  ModelSelectionSubgroup,
} from './types'

export { displayParameterLabel } from './labels'
export { unitLabelFor } from './labels'
export {
  parameterPresentationFor,
  parameterStaticSummaryKeysFor,
} from './presentation'
export type {
  ModelDefinition,
  ModelFamily,
  ModelFamilyGroup,
  ModelFamilyMetadata,
  ModelParameterPresentation,
  ModelPreviewImage,
  ModelSelectionSubgroup,
  ParameterField,
  FixedStepDownload,
} from './types'
export type { OpenGridSystemContext } from '../system-entry-context'

/**
 * Catalog definitions exposed with the derived dark preview asset so every
 * consumer shares one object identity per model (raw component definitions
 * stay preview-agnostic and name only the light asset).
 */
export const boxDefinition: ModelDefinition<ModelPreviewImage> =
  withDerivedDarkPreview(rawBoxDefinition)
export const hexagonalColumnDefinition: ModelDefinition<ModelPreviewImage> =
  withDerivedDarkPreview(rawHexagonalColumnDefinition)
export const hswCellDefinition: ModelDefinition<ModelPreviewImage> =
  withDerivedDarkPreview(rawHswCellDefinition)
export const modularGridBaseDefinition: ModelDefinition<ModelPreviewImage> =
  withDerivedDarkPreview(rawModularGridBaseDefinition)
export const opengridDefinition: ModelDefinition<ModelPreviewImage> =
  withDerivedDarkPreview(rawOpengridDefinition)
export const opengridDividerDefinition: ModelDefinition<ModelPreviewImage> =
  withDerivedDarkPreview(rawOpengridDividerDefinition)
export const opengridOrganizerBoxDefinition: ModelDefinition<ModelPreviewImage> =
  withDerivedDarkPreview(rawOpengridOrganizerBoxDefinition)
export const opengridStackableBoxDefinition: ModelDefinition<ModelPreviewImage> =
  withDerivedDarkPreview(rawOpengridStackableBoxDefinition)
export const opengridStackableCylinderDefinition: ModelDefinition<ModelPreviewImage> =
  withDerivedDarkPreview(rawOpengridStackableCylinderDefinition)
export const opengridSnapDefinition: ModelDefinition<ModelPreviewImage> =
  withDerivedDarkPreview(rawOpengridSnapDefinition)
export const opengridWallCoverDefinition: ModelDefinition<ModelPreviewImage> =
  withDerivedDarkPreview(rawOpengridWallCoverDefinition)
export const openGridSnapRemoverDefinition: ModelDefinition<ModelPreviewImage> =
  withDerivedDarkPreview(rawOpenGridSnapRemoverDefinition)
export const opengridPillarDefinition: ModelDefinition<ModelPreviewImage> =
  withDerivedDarkPreview(rawOpengridPillarDefinition)
export const opengridOpenShelfDefinition: ModelDefinition<ModelPreviewImage> =
  withDerivedDarkPreview(rawOpengridOpenShelfDefinition)
export const opengridOpenConnectShelfDefinition: ModelDefinition<ModelPreviewImage> =
  withDerivedDarkPreview(rawOpengridOpenConnectShelfDefinition)
export const opengridOpenConnectOrganizerDefinition: ModelDefinition<ModelPreviewImage> =
  withDerivedDarkPreview(rawOpengridOpenConnectOrganizerDefinition)

/** Dark variant asset name derived from the light asset name: x.webp → x-dark.webp */
export function darkPreviewSrcFor(src: string): string {
  return src.replace(/\.webp$/, '-dark.webp')
}

function withDerivedDarkPreview(
  definition: ModelDefinition,
): ModelDefinition<ModelPreviewImage> {
  const preview = definition.previewImage
  if (!preview) {
    return { ...definition, previewImage: undefined }
  }
  return {
    ...definition,
    previewImage: {
      ...preview,
      darkSrc: darkPreviewSrcFor(preview.src),
    },
  }
}

export const modelDefinitions: ReadonlyArray<
  ModelDefinition<ModelPreviewImage>
> = [
  boxDefinition,
  modularGridBaseDefinition,
  hswCellDefinition,
  hexagonalColumnDefinition,
  opengridDefinition,
  opengridSnapDefinition,
  opengridWallCoverDefinition,
  opengridPillarDefinition,
  opengridDividerDefinition,
  opengridOrganizerBoxDefinition,
  opengridStackableBoxDefinition,
  opengridStackableCylinderDefinition,
  openGridSnapRemoverDefinition,
  opengridOpenShelfDefinition,
  opengridOpenConnectShelfDefinition,
  opengridOpenConnectOrganizerDefinition,
]

export const modelFamilyOrder: ReadonlyArray<ModelFamily> = [
  'opengrid',
  'other',
]

export const modelFamilyMetadata: Readonly<
  Record<ModelFamily, ModelFamilyMetadata>
> = {
  opengrid: {
    key: 'opengrid',
    label: 'models.family.opengrid',
    description: 'models.family.opengridDescription',
  },
  other: {
    key: 'other',
    label: 'models.family.other',
    description: 'models.family.otherDescription',
  },
}

function contextPreviewFor(
  definition: ModelDefinition<ModelPreviewImage>,
  context: OpenGridSystemContext,
) {
  if (!definition.previewImage) return undefined
  const src = `/model-previews/${definition.id}-${context}.webp`
  return {
    ...definition.previewImage,
    src,
    darkSrc: darkPreviewSrcFor(src),
    alt: definition.previewImage.alt,
  }
}

export function contextPreviewImageFor(
  definition: ModelDefinition<ModelPreviewImage>,
  context: OpenGridSystemContext,
): ModelPreviewImage | undefined {
  return contextPreviewFor(definition, context)
}

function entryForContext(
  definition: ModelDefinition<ModelPreviewImage>,
  context: OpenGridSystemContext,
): ModelDefinition<ModelPreviewImage> {
  return {
    ...definition,
    systemContext: context,
    previewImage: contextPreviewFor(definition, context),
  }
}

function openGridSubgroups(
  definitions: ReadonlyArray<ModelDefinition<ModelPreviewImage>>,
): ReadonlyArray<ModelSelectionSubgroup> {
  const openGridDefinitions = definitions.filter(
    (definition) => definition.family === 'opengrid',
  )
  const supportsContext = (
    definition: ModelDefinition<ModelPreviewImage>,
    context: OpenGridSystemContext,
  ): boolean => {
    return definition.supportedSystemContexts?.includes(context) ?? false
  }
  const desk = openGridDefinitions
    .filter((definition) => supportsContext(definition, 'desk'))
    .map((definition) => entryForContext(definition, 'desk'))
  const wall = openGridDefinitions
    .filter((definition) => supportsContext(definition, 'wall'))
    .map((definition) => entryForContext(definition, 'wall'))
  return [
    {
      key: 'desk',
      label: 'models.context.desk',
      definitions: desk,
    },
    {
      key: 'wall',
      label: 'models.context.wall',
      definitions: wall,
    },
  ]
}

export function groupModelDefinitions(
  definitions: ReadonlyArray<
    ModelDefinition<ModelPreviewImage>
  > = modelDefinitions,
): ReadonlyArray<ModelFamilyGroup> {
  return modelFamilyOrder.map((family) => {
    if (family === 'opengrid') {
      const subgroups = openGridSubgroups(definitions)
      return {
        ...modelFamilyMetadata[family],
        definitions: subgroups.flatMap((subgroup) => subgroup.definitions),
        subgroups,
      }
    }
    return {
      ...modelFamilyMetadata[family],
      definitions: definitions.filter(
        (definition) =>
          definition.family === family && !definition.chooserHidden,
      ),
    }
  })
}

export function modelSelectionLabelFor(
  definition: ModelDefinition<ModelPreviewImage>,
): string {
  return definition.selectionLabel ?? definition.displayName
}

export function getModelDefinition(
  modelId: ModelId,
): ModelDefinition<ModelPreviewImage> | undefined {
  return modelDefinitions.find((definition) => definition.id === modelId)
}

export function cadPathForModel(
  modelId: ModelId,
  systemContext?: OpenGridSystemContext,
): string {
  const definition = getModelDefinition(modelId)
  if (!definition) throw new Error(`UNKNOWN_MODEL_ID:${modelId}`)
  return `/cad/${definition.id}${systemContextQuery(systemContext)}`
}

export function modelIdForCadPath(pathname: string): ModelId | undefined {
  const normalizedPath = pathname.replace(/\/+$/, '')
  const prefix = '/cad/'
  if (!normalizedPath.startsWith(prefix)) return undefined

  const slug = normalizedPath.slice(prefix.length)
  if (!slug || slug.includes('/')) return undefined

  return modelDefinitions.find((definition) => definition.id === slug)?.id
}
