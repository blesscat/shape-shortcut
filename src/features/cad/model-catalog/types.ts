import type {
  ModelBounds,
  ModelId,
  ModelParameterKey,
  ModelParameterValues,
  ModelValidation,
} from '../../../cad-contract/units'
import type { OpenGridSystemContext } from '../system-entry-context'

export type ModelFamily = 'opengrid' | 'other'

export type ModelFamilyMetadata = {
  key: ModelFamily
  /** Stable translation key; never render this value directly. */
  label: string
  /** Stable translation key; never render this value directly. */
  description: string
}

export type ModelFamilyGroup = ModelFamilyMetadata & {
  definitions: ReadonlyArray<ModelDefinition<ModelPreviewImage>>
  subgroups?: ReadonlyArray<ModelSelectionSubgroup>
}

export type ModelSelectionSubgroup = {
  key: OpenGridSystemContext
  label: string
  definitions: ReadonlyArray<ModelDefinition<ModelPreviewImage>>
}

export type ParameterField = {
  key: ModelParameterKey
  /** Stable translation key; never render this value directly. */
  label: string
  axis: string
  unit: 'mm' | 'degree' | 'grid' | 'count'
  labelFormat?: 'axis' | 'label-axis' | 'label'
  control: 'text' | 'range' | 'range-text'
  defaultValue: number
  min: number
  max: number
  step: number
  sliderMin?: number
  sliderMax?: number
  sliderDirection?: 'ltr' | 'rtl'
}

export type ModelPreviewImage = {
  src: string
  /** Dark-appearance variant of the preview, selected via prefers-color-scheme. */
  darkSrc: string
  /** Stable translation key; never render this value directly. */
  alt: string
  width: number
  height: number
}

/**
 * Preview metadata as authored per component definition; the dark variant
 * asset is derived centrally from `src`, so authors never repeat it.
 */
export type ModelPreviewImageSpec = Omit<ModelPreviewImage, 'darkSrc'>

export type ModelParameterPresentation =
  | {
      kind: 'adjustable'
      /** Stable translation key for custom or conditional setting categories. */
      summaryKey?: string
      /** Stable translation key for the custom setting ranges and constraints. */
      detailsKey?: string
    }
  | {
      kind: 'fixed'
    }

export type FixedStepDownload = {
  url: string
  fileName: string
}

export type ModelDefinition<
  PreviewImage extends ModelPreviewImageSpec = ModelPreviewImageSpec,
> = {
  id: ModelId
  buildKey: ModelId
  family: ModelFamily
  /** Excludes a registered model from the chooser; it stays routable at `/cad/<id>`. */
  chooserHidden?: boolean
  /** Stable translation key; never render this value directly. */
  displayName: string
  selectionLabel?: string
  /** Stable translation key; never render this value directly. */
  selectionDescription: string
  parameterSchema: ReadonlyArray<ParameterField>
  parameterPresentation?: ModelParameterPresentation
  defaultParameters: ModelParameterValues
  previewMetadata: { centeredOnXY: boolean; baseAtZ: number }
  previewImage?: PreviewImage
  validateParameters: (parameters: unknown) => ModelValidation
  boundsForParameters: (parameters: ModelParameterValues) => ModelBounds
  exportFileName: (parameters: ModelParameterValues) => string
  stlFileName: (parameters: ModelParameterValues) => string
  threeMfFileName?: (parameters: ModelParameterValues) => string | null
  fixedStepDownload?: (
    parameters: ModelParameterValues,
  ) => FixedStepDownload | null
  supportedSystemContexts?: ReadonlyArray<OpenGridSystemContext>
  systemContext?: OpenGridSystemContext
}
