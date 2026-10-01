import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForHswCell,
  hswCellFileName,
  hswCellStlFileName,
  HSW_CELL_CONFIGURATION,
  isHswCellParameters,
  validateHswCellParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const HSW_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'rows',
    label: 'parameter.rows',
    axis: 'Y',
    unit: 'grid',
    labelFormat: 'axis',
    control: 'range',
    defaultValue: 1,
    min: 1,
    max: HSW_CELL_CONFIGURATION.maxGridCount,
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
    max: HSW_CELL_CONFIGURATION.maxGridCount,
    step: 1,
  },
]

function exportHswCellFileName(parameters: ModelParameterValues): string {
  if (!isHswCellParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:hsw-cell')
  }
  return hswCellFileName(parameters)
}

function validateHswCellDefinitionParameters(value: unknown) {
  const validation = validateHswCellParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'hsw-cell' as const,
      parameters: validation.value,
    },
  }
}

function boundsForHswCellDefinition(parameters: ModelParameterValues) {
  if (!isHswCellParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:hsw-cell')
  }
  return boundsForHswCell(parameters)
}

export const hswCellDefinition: ModelDefinition = {
  id: 'hsw-cell',
  buildKey: 'hsw-cell',
  family: 'other',
  partCategory: 'container',
  displayName: 'models.model.hsw-cell.name',
  selectionLabel: 'models.model.hsw-cell.selection',
  selectionDescription: 'models.model.hsw-cell.description',
  parameterSchema: HSW_PARAMETER_SCHEMA,
  defaultParameters: { rows: 1, columns: 1 },
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/hsw-cell.webp',
    alt: 'models.model.hsw-cell.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateHswCellDefinitionParameters,
  boundsForParameters: boundsForHswCellDefinition,
  exportFileName: exportHswCellFileName,
  stlFileName: (parameters) => {
    if (!isHswCellParameters(parameters)) {
      throw new Error('MODEL_PARAMETERS_MISMATCH:hsw-cell')
    }
    return hswCellStlFileName(parameters)
  },
}
