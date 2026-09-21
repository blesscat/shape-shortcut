import {
  TISSUE_BOX_DEFAULTS,
  isTissueBoxParameters,
  tissueBoxBounds,
  tissueBoxFileName,
  validateTissueBoxParameters,
  type TissueBoxParameters,
} from '../../../../cad-contract/units/opengrid-openconnect-tissue-box'
import type { ModelParameterValues } from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

function field(
  key: Exclude<keyof TissueBoxParameters, 'honeycombMode'>,
  min: number,
  max: number,
  axis: string,
  step = 0.5,
): ParameterField {
  return {
    key,
    label: `parameter.tissueBox.${key}`,
    axis,
    unit: key === 'tiltAngle' ? 'degree' : 'mm',
    control: 'range-text',
    defaultValue: TISSUE_BOX_DEFAULTS[key],
    min,
    max,
    step,
  }
}
function requireParameters(
  parameters: ModelParameterValues,
): TissueBoxParameters {
  if (!isTissueBoxParameters(parameters))
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-openconnect-tissue-box')
  return parameters
}
export const tissueBoxDefinition: ModelDefinition = {
  id: 'opengrid-openconnect-tissue-box',
  buildKey: 'opengrid-openconnect-tissue-box',
  family: 'opengrid',
  supportedSystemContexts: ['wall'],
  displayName: 'models.model.opengrid-openconnect-tissue-box.name',
  selectionLabel: 'models.model.opengrid-openconnect-tissue-box.selection',
  selectionDescription:
    'models.model.opengrid-openconnect-tissue-box.description',
  parameterSchema: [
    field('x', 40, 400, 'X'),
    field('y', 40, 400, 'Y'),
    field('z', 20, 300, 'Z'),
    field('tiltAngle', 0, 45, 'Y/Z', 1),
    field('outerRadius', 0, 100, 'R'),
    field('wallThickness', 1, 5, 'X/Y', 0.1),
    field('bottomThickness', 1, 5, 'Z', 0.1),
    field('slotLength', 7, 390, 'X'),
    field('slotWidth', 5, 390, 'Y'),
  ],
  defaultParameters: { ...TISSUE_BOX_DEFAULTS },
  previewMetadata: { centeredOnXY: false, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-openconnect-tissue-box-wall.webp',
    alt: 'models.model.opengrid-openconnect-tissue-box.alt',
    width: 640,
    height: 400,
  },
  validateParameters: (value) => {
    const validation = validateTissueBoxParameters(value)
    if (!validation.valid) return validation
    return {
      valid: true,
      value: {
        modelId: 'opengrid-openconnect-tissue-box',
        parameters: validation.value,
      },
    }
  },
  boundsForParameters: (parameters) =>
    tissueBoxBounds(requireParameters(parameters)),
  exportFileName: (parameters) =>
    tissueBoxFileName(requireParameters(parameters), 'step'),
  stlFileName: (parameters) =>
    tissueBoxFileName(requireParameters(parameters), 'stl'),
}
