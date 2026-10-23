import { modularGridPreview } from '../../progressive-preview/components'
import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForModularGridBase,
  isModularGridBaseParameters,
  modularGridBaseFileName,
  modularGridBaseStlFileName,
  PROTOTYPE_CONFIGURATION,
  validateModularGridBaseParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const GRID_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'rows',
    label: 'parameter.rows',
    axis: 'Y',
    unit: 'grid',
    labelFormat: 'axis',
    control: 'range',
    defaultValue: 1,
    min: 1,
    max: PROTOTYPE_CONFIGURATION.modularGridBase.maxGridCount,
    step: 1,
  },
  {
    key: 'columns',
    label: 'parameter.columns',
    axis: 'X',
    unit: 'grid',
    labelFormat: 'axis',
    control: 'range',
    defaultValue: 1,
    min: 1,
    max: PROTOTYPE_CONFIGURATION.modularGridBase.maxGridCount,
    step: 1,
  },
]

function exportGridFileName(parameters: ModelParameterValues): string {
  if (!isModularGridBaseParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:modular-grid-base')
  }
  return modularGridBaseFileName(parameters)
}

function validateGridDefinitionParameters(value: unknown) {
  const validation = validateModularGridBaseParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'modular-grid-base' as const,
      parameters: validation.value,
    },
  }
}

function boundsForGridDefinition(parameters: ModelParameterValues) {
  if (!isModularGridBaseParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:modular-grid-base')
  }
  return boundsForModularGridBase(parameters)
}

export const modularGridBaseDefinition: ModelDefinition = {
  id: 'modular-grid-base',
  buildKey: 'modular-grid-base',
  family: 'other',
  chooserHidden: true,
  displayName: 'models.model.modular-grid-base.name',
  selectionDescription: 'models.model.modular-grid-base.description',
  parameterSchema: GRID_PARAMETER_SCHEMA,
  defaultParameters: { rows: 1, columns: 1 },
  simplifiedPreview: (parameters) =>
    modularGridPreview(parameters as Parameters<typeof modularGridPreview>[0]),
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  validateParameters: validateGridDefinitionParameters,
  boundsForParameters: boundsForGridDefinition,
  exportFileName: exportGridFileName,
  stlFileName: (parameters) => {
    if (!isModularGridBaseParameters(parameters)) {
      throw new Error('MODEL_PARAMETERS_MISMATCH:modular-grid-base')
    }
    return modularGridBaseStlFileName(parameters)
  },
}
