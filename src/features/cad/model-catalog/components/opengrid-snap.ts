import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridSnap,
  isOpenGridSnapParameters,
  openGridSnapFileName,
  openGridSnapStlFileName,
  OPENGRID_SNAP_CONFIGURATION,
  normalizeOpenGridSnapParameters,
  validateOpenGridSnapParameters,
} from '../../../../cad-contract/units'
import { openGridSnapOpenConnectCompositeBounds } from '../../../../cad-kernel/components/opengrid-snap/openconnect'
import type {
  FixedStepDownload,
  ModelDefinition,
  ParameterField,
} from '../types'

const FIXED_STEP_DOWNLOADS: Readonly<
  Record<'half' | 'quarter', FixedStepDownload>
> = {
  half: {
    url: '/downloads/snap-half.step',
    fileName: 'Half.step',
  },
  quarter: {
    url: '/downloads/snap-quarter.step',
    fileName: 'Quarter.step',
  },
}

const OPENGRID_SNAP_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'offset',
    label: 'parameter.frameIncrement',
    axis: 'X/Y',
    unit: 'mm',
    control: 'range',
    defaultValue: 0,
    min: OPENGRID_SNAP_CONFIGURATION.minOffset,
    max: OPENGRID_SNAP_CONFIGURATION.maxOffset,
    step: OPENGRID_SNAP_CONFIGURATION.offsetStep,
  },
  {
    key: 'magnetHoleLength',
    label: 'parameter.magnetHoleLength',
    axis: 'X',
    unit: 'mm',
    control: 'range',
    defaultValue: OPENGRID_SNAP_CONFIGURATION.magnetHole.defaultPlanDimension,
    min: OPENGRID_SNAP_CONFIGURATION.magnetHole.minPlanDimension,
    max: OPENGRID_SNAP_CONFIGURATION.magnetHole.maxPlanDimension,
    step: OPENGRID_SNAP_CONFIGURATION.magnetHole.dimensionStep,
  },
  {
    key: 'magnetHoleWidth',
    label: 'parameter.magnetHoleWidth',
    axis: 'Y',
    unit: 'mm',
    control: 'range',
    defaultValue: OPENGRID_SNAP_CONFIGURATION.magnetHole.defaultPlanDimension,
    min: OPENGRID_SNAP_CONFIGURATION.magnetHole.minPlanDimension,
    max: OPENGRID_SNAP_CONFIGURATION.magnetHole.maxPlanDimension,
    step: OPENGRID_SNAP_CONFIGURATION.magnetHole.dimensionStep,
  },
  {
    key: 'magnetHoleDiameter',
    label: 'parameter.magnetHoleDiameter',
    axis: 'XY',
    unit: 'mm',
    control: 'range',
    defaultValue: OPENGRID_SNAP_CONFIGURATION.magnetHole.defaultPlanDimension,
    min: OPENGRID_SNAP_CONFIGURATION.magnetHole.minPlanDimension,
    max: OPENGRID_SNAP_CONFIGURATION.magnetHole.maxPlanDimension,
    step: OPENGRID_SNAP_CONFIGURATION.magnetHole.dimensionStep,
  },
  {
    key: 'magnetHoleThickness',
    label: 'parameter.magnetHoleThickness',
    axis: 'Z',
    unit: 'mm',
    control: 'range',
    defaultValue: OPENGRID_SNAP_CONFIGURATION.magnetHole.defaultThickness,
    min: OPENGRID_SNAP_CONFIGURATION.magnetHole.minThickness,
    max: OPENGRID_SNAP_CONFIGURATION.magnetHole.maxThickness.Full,
    step: OPENGRID_SNAP_CONFIGURATION.magnetHole.dimensionStep,
  },
]

function validateOpenGridSnapDefinitionParameters(value: unknown) {
  const validation = validateOpenGridSnapParameters(
    normalizeOpenGridSnapParameters(value),
  )
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-snap' as const,
      parameters: validation.value,
    },
  }
}

function openGridSnapFileNameFor(parameters: ModelParameterValues): string {
  if (!isOpenGridSnapParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
  }
  return openGridSnapFileName(parameters)
}

function openGridSnapStlFileNameFor(parameters: ModelParameterValues): string {
  if (!isOpenGridSnapParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
  }
  return openGridSnapStlFileName(parameters)
}

function fixedStepDownloadFor(
  parameters: ModelParameterValues,
): FixedStepDownload | null {
  if (!isOpenGridSnapParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
  }
  if (parameters.footprint === 'full') return null
  return FIXED_STEP_DOWNLOADS[parameters.footprint]
}

function boundsForOpenGridSnapDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridSnapParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
  }
  const snapBounds = boundsForOpenGridSnap(parameters)
  return parameters.footprint === 'full' && parameters.openConnect
    ? openGridSnapOpenConnectCompositeBounds(snapBounds, parameters.variant)
    : snapBounds
}

export const opengridSnapDefinition: ModelDefinition = {
  id: 'opengrid-snap',
  buildKey: 'opengrid-snap',
  family: 'opengrid',
  partCategory: 'base',
  supportedSystemContexts: ['desk', 'wall'],
  displayName: 'models.model.opengrid-snap.name',
  selectionLabel: 'models.model.opengrid-snap.selection',
  selectionDescription: 'models.model.opengrid-snap.description',
  parameterSchema: OPENGRID_SNAP_PARAMETER_SCHEMA,
  defaultParameters: OPENGRID_SNAP_CONFIGURATION.defaultParameters,
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-snap.webp',
    alt: 'models.model.opengrid-snap.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateOpenGridSnapDefinitionParameters,
  boundsForParameters: boundsForOpenGridSnapDefinition,
  exportFileName: openGridSnapFileNameFor,
  stlFileName: openGridSnapStlFileNameFor,
  fixedStepDownload: fixedStepDownloadFor,
}
