import type { FieldDiagnostic } from '../diagnostics'
import {
  boundsForBox,
  boxFileName,
  boxStlFileName,
  validateBoxParameters,
  type BoxParameters,
  type DimensionKey,
} from './box'
import {
  boundsForHswCell,
  hswCellFileName,
  hswCellStlFileName,
  validateHswCellParameters,
  type HswCellParameters,
} from './hsw-cell'
import {
  boundsForHexagonalColumn,
  hexagonalColumnFileName,
  hexagonalColumnStlFileName,
  validateHexagonalColumnParameters,
  type HexagonalColumnParameterKey,
  type HexagonalColumnParameters,
} from './hexagonal-column'
import {
  boundsForModularGridBase,
  modularGridBaseFileName,
  modularGridBaseStlFileName,
  validateModularGridBaseParameters,
  type GridParameterKey,
  type ModularGridBaseParameters,
} from './modular-grid-base'
import {
  boundsForOpenGridSnapRemover,
  openGridSnapRemoverFileName,
  openGridSnapRemoverStlFileName,
  validateOpenGridSnapRemoverParameters,
  type OpenGridSnapRemoverParameters,
} from './opengrid-snap-remover'
import {
  boundsForOpenGrid,
  isOpenGridParameters,
  openGridFileName,
  openGridStlFileName,
  validateOpenGridParameters,
  type OpenGridParameterKey,
  type OpenGridParameters,
} from './opengrid'
import {
  boundsForOpenGridStackableBox,
  isOpenGridStackableBoxParameters,
  openGridStackableBoxFileName,
  openGridStackableBoxStlFileName,
  validateOpenGridStackableBoxParameters,
  type OpenGridStackableBoxParameterKey,
  type OpenGridStackableBoxParameters,
} from './opengrid-stackable-box'
import {
  boundsForOpenGridOrganizerBox,
  isOpenGridOrganizerBoxParameters,
  openGridOrganizerBoxFileName,
  openGridOrganizerBoxStlFileName,
  validateOpenGridOrganizerBoxParameters,
  type OpenGridOrganizerBoxParameterKey,
  type OpenGridOrganizerBoxParameters,
} from './opengrid-organizer-box'
import {
  boundsForOpenGridStackableCylinder,
  isOpenGridStackableCylinderParameters,
  openGridStackableCylinderFileName,
  openGridStackableCylinderStlFileName,
  validateOpenGridStackableCylinderParameters,
  type OpenGridStackableCylinderParameterKey,
  type OpenGridStackableCylinderParameters,
} from './opengrid-stackable-cylinder'
import {
  boundsForOpenGridSnap,
  isOpenGridSnapParameters,
  openGridSnapFileName,
  openGridSnapStlFileName,
  validateOpenGridSnapParameters,
  type OpenGridSnapParameterKey,
  type OpenGridSnapParameters,
  type OpenGridSnapValidation,
} from './opengrid-snap'
import {
  boundsForOpenGridWallCover,
  isOpenGridWallCoverParameters,
  openGridWallCoverFileName,
  openGridWallCoverStlFileName,
  validateOpenGridWallCoverParameters,
  type OpenGridWallCoverParameterKey,
  type OpenGridWallCoverParameters,
} from './opengrid-wall-cover'
import {
  boundsForOpenGridDivider,
  isOpenGridDividerParameters,
  openGridDividerFileName,
  openGridDividerStlFileName,
  validateOpenGridDividerParameters,
  type OpenGridDividerParameterKey,
  type OpenGridDividerParameters,
} from './opengrid-divider'
import {
  boundsForPillar,
  isPillarParameters,
  pillarFileName,
  pillarStlFileName,
  validatePillarParameters,
  type PillarParameterKey,
  type PillarParameters,
} from './opengrid-pillar'
import {
  boundsForOpenGridOpenShelf,
  isOpenGridOpenShelfParameters,
  openGridOpenShelfFileName,
  openGridOpenShelfStlFileName,
  validateOpenGridOpenShelfParameters,
  type OpenGridOpenShelfParameterKey,
  type OpenGridOpenShelfParameters,
} from './opengrid-open-shelf'
import {
  boundsForOpenGridOpenConnectShelf,
  isOpenGridOpenConnectShelfParameters,
  openGridOpenConnectShelfFileName,
  openGridOpenConnectShelfStlFileName,
  validateOpenGridOpenConnectShelfParameters,
  type OpenGridOpenConnectShelfParameterKey,
  type OpenGridOpenConnectShelfParameters,
} from './opengrid-openconnect-shelf'
import {
  tissueBoxBounds,
  tissueBoxFileName,
  validateTissueBoxParameters,
  type TissueBoxParameterKey,
  type TissueBoxParameters,
} from './opengrid-openconnect-tissue-box'
import {
  boundsForOpenGridOpenConnectOrganizer,
  isOpenGridOpenConnectOrganizerParameters,
  openGridOpenConnectOrganizerFileName,
  openGridOpenConnectOrganizerStlFileName,
  validateOpenGridOpenConnectOrganizerParameters,
  type OpenGridOpenConnectOrganizerParameterKey,
  type OpenGridOpenConnectOrganizerParameters,
} from './opengrid-openconnect-organizer'

export type ModelParameterKey =
  | DimensionKey
  | GridParameterKey
  | HexagonalColumnParameterKey
  | OpenGridParameterKey
  | OpenGridStackableBoxParameterKey
  | OpenGridOrganizerBoxParameterKey
  | OpenGridStackableCylinderParameterKey
  | OpenGridSnapParameterKey
  | OpenGridDividerParameterKey
  | PillarParameterKey
  | OpenGridOpenShelfParameterKey
  | OpenGridOpenConnectShelfParameterKey
  | TissueBoxParameterKey
  | OpenGridOpenConnectOrganizerParameterKey
  | OpenGridWallCoverParameterKey
export type ScalarModelParameterKey =
  | DimensionKey
  | GridParameterKey
  | HexagonalColumnParameterKey
  | OpenGridDividerParameterKey
  | 'offset'
export type ModelId =
  | 'box'
  | 'modular-grid-base'
  | 'hsw-cell'
  | 'hexagonal-column'
  | 'opengrid'
  | 'opengrid-stackable-box'
  | 'opengrid-organizer-box'
  | 'opengrid-stackable-cylinder'
  | 'opengrid-snap'
  | 'opengrid-wall-cover'
  | 'opengrid-snap-remover'
  | 'opengrid-divider'
  | 'opengrid-pillar'
  | 'opengrid-open-shelf'
  | 'opengrid-openconnect-shelf'
  | 'opengrid-openconnect-tissue-box'
  | 'opengrid-openconnect-organizer'

export type ModelParameters =
  | {
      modelId: 'opengrid-openconnect-tissue-box'
      parameters: TissueBoxParameters
    }
  | { modelId: 'box'; parameters: BoxParameters }
  | {
      modelId: 'modular-grid-base'
      parameters: ModularGridBaseParameters
    }
  | { modelId: 'hsw-cell'; parameters: HswCellParameters }
  | {
      modelId: 'hexagonal-column'
      parameters: HexagonalColumnParameters
    }
  | { modelId: 'opengrid'; parameters: OpenGridParameters }
  | {
      modelId: 'opengrid-stackable-box'
      parameters: OpenGridStackableBoxParameters
    }
  | {
      modelId: 'opengrid-organizer-box'
      parameters: OpenGridOrganizerBoxParameters
    }
  | {
      modelId: 'opengrid-stackable-cylinder'
      parameters: OpenGridStackableCylinderParameters
    }
  | { modelId: 'opengrid-snap'; parameters: OpenGridSnapParameters }
  | {
      modelId: 'opengrid-wall-cover'
      parameters: OpenGridWallCoverParameters
    }
  | {
      modelId: 'opengrid-snap-remover'
      parameters: OpenGridSnapRemoverParameters
    }
  | {
      modelId: 'opengrid-divider'
      parameters: OpenGridDividerParameters
    }
  | { modelId: 'opengrid-pillar'; parameters: PillarParameters }
  | {
      modelId: 'opengrid-open-shelf'
      parameters: OpenGridOpenShelfParameters
    }
  | {
      modelId: 'opengrid-openconnect-shelf'
      parameters: OpenGridOpenConnectShelfParameters
    }
  | {
      modelId: 'opengrid-openconnect-organizer'
      parameters: OpenGridOpenConnectOrganizerParameters
    }

export type ModelParameterValues = ModelParameters['parameters']

export type ModelBounds = {
  min: [number, number, number]
  max: [number, number, number]
}

export type ValidationIssue = FieldDiagnostic

export type OpenGridStackableBoxModelValidation =
  | {
      valid: true
      value: {
        modelId: 'opengrid-stackable-box'
        parameters: OpenGridStackableBoxParameters
      }
    }
  | { valid: false; issues: ValidationIssue[] }

export type OpenGridOrganizerBoxModelValidation =
  | {
      valid: true
      value: {
        modelId: 'opengrid-organizer-box'
        parameters: OpenGridOrganizerBoxParameters
      }
    }
  | { valid: false; issues: ValidationIssue[] }

export type OpenGridStackableCylinderModelValidation =
  | {
      valid: true
      value: {
        modelId: 'opengrid-stackable-cylinder'
        parameters: OpenGridStackableCylinderParameters
      }
    }
  | { valid: false; issues: ValidationIssue[] }

export type OpenGridSnapModelValidation = OpenGridSnapValidation
export type OpenGridDividerModelValidation =
  | {
      valid: true
      value: {
        modelId: 'opengrid-divider'
        parameters: OpenGridDividerParameters
      }
    }
  | { valid: false; issues: ValidationIssue[] }

export type OpenGridWallCoverModelValidation =
  | {
      valid: true
      value: {
        modelId: 'opengrid-wall-cover'
        parameters: OpenGridWallCoverParameters
      }
    }
  | { valid: false; issues: ValidationIssue[] }

export type PillarModelValidation =
  | {
      valid: true
      value: { modelId: 'opengrid-pillar'; parameters: PillarParameters }
    }
  | { valid: false; issues: ValidationIssue[] }

export type ModelValidation =
  | { valid: true; value: ModelParameters }
  | { valid: false; issues: ValidationIssue[] }

export function validateModelParameters(
  modelId: unknown,
  value: unknown,
): ModelValidation {
  if (modelId === 'box') {
    const validation = validateBoxParameters(value)
    if (!validation.valid) return validation
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'modular-grid-base') {
    const validation = validateModularGridBaseParameters(value)
    if (!validation.valid) return validation
    return {
      valid: true,
      value: { modelId, parameters: validation.value },
    }
  }

  if (modelId === 'hsw-cell') {
    const validation = validateHswCellParameters(value)
    if (!validation.valid) return validation
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'hexagonal-column') {
    const validation = validateHexagonalColumnParameters(value)
    if (!validation.valid) return validation
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid') {
    const validation = validateOpenGridParameters(value)
    if (!validation.valid) return validation
    return {
      valid: true,
      value: { modelId: 'opengrid', parameters: validation.value },
    }
  }

  if (modelId === 'opengrid-stackable-box') {
    const validation = validateOpenGridStackableBoxParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field,
          messageId: issue.messageId,
        })),
      }
    }
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-organizer-box') {
    const validation = validateOpenGridOrganizerBoxParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field,
          messageId: issue.messageId,
        })),
      }
    }
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-stackable-cylinder') {
    const validation = validateOpenGridStackableCylinderParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field,
          messageId: issue.messageId,
        })),
      }
    }
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-snap') {
    const validation = validateOpenGridSnapParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field as ValidationIssue['field'],
          messageId: issue.messageId,
        })),
      }
    }
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-wall-cover') {
    const validation = validateOpenGridWallCoverParameters(value)
    if (!validation.valid) return validation
    return {
      valid: true,
      value: { modelId, parameters: validation.value },
    }
  }

  if (modelId === 'opengrid-snap-remover') {
    const validation = validateOpenGridSnapRemoverParameters(value)
    if (!validation.valid) return validation
    return {
      valid: true,
      value: { modelId, parameters: validation.value },
    }
  }

  if (modelId === 'opengrid-divider') {
    const validation = validateOpenGridDividerParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field,
          messageId: issue.messageId,
        })),
      }
    }
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-pillar') {
    const validation = validatePillarParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field,
          messageId: issue.messageId,
        })),
      }
    }
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-open-shelf') {
    const validation = validateOpenGridOpenShelfParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field,
          messageId: issue.messageId,
        })),
      }
    }
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-openconnect-shelf') {
    const validation = validateOpenGridOpenConnectShelfParameters(value)
    if (!validation.valid) return validation
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-openconnect-tissue-box') {
    const validation = validateTissueBoxParameters(value)
    if (!validation.valid) return validation
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-openconnect-organizer') {
    const validation = validateOpenGridOpenConnectOrganizerParameters(value)
    if (!validation.valid) return validation
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  return {
    valid: false,
    issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
  }
}

export function isOpenGridModelParameters(
  value: unknown,
): value is OpenGridParameters {
  return isOpenGridParameters(value)
}

export function isOpenGridStackableBoxModelParameters(
  value: unknown,
): value is OpenGridStackableBoxParameters {
  return isOpenGridStackableBoxParameters(value)
}

export function isOpenGridOrganizerBoxModelParameters(
  value: unknown,
): value is OpenGridOrganizerBoxParameters {
  return isOpenGridOrganizerBoxParameters(value)
}

export function isOpenGridStackableCylinderModelParameters(
  value: unknown,
): value is OpenGridStackableCylinderParameters {
  return isOpenGridStackableCylinderParameters(value)
}

export function isOpenGridSnapModelParameters(
  value: unknown,
): value is OpenGridSnapParameters {
  return isOpenGridSnapParameters(value)
}

export function isOpenGridWallCoverModelParameters(
  value: unknown,
): value is OpenGridWallCoverParameters {
  return isOpenGridWallCoverParameters(value)
}

export function isOpenGridDividerModelParameters(
  value: unknown,
): value is OpenGridDividerParameters {
  return isOpenGridDividerParameters(value)
}

export function isPillarModelParameters(
  value: unknown,
): value is PillarParameters {
  return isPillarParameters(value)
}

export function isOpenGridOpenShelfModelParameters(
  value: unknown,
): value is OpenGridOpenShelfParameters {
  return isOpenGridOpenShelfParameters(value)
}

export function isOpenGridOpenConnectShelfModelParameters(
  value: unknown,
): value is OpenGridOpenConnectShelfParameters {
  return isOpenGridOpenConnectShelfParameters(value)
}

export function isOpenGridOpenConnectOrganizerModelParameters(
  value: unknown,
): value is OpenGridOpenConnectOrganizerParameters {
  return isOpenGridOpenConnectOrganizerParameters(value)
}

export function isModelParameters(value: unknown): value is ModelParameters {
  if (!value || typeof value !== 'object') return false
  const model = value as { modelId?: unknown; parameters?: unknown }
  return validateModelParameters(model.modelId, model.parameters).valid
}

export function boundsForModel(model: ModelParameters): ModelBounds {
  switch (model.modelId) {
    case 'box':
      return boundsForBox(model.parameters)
    case 'modular-grid-base':
      return boundsForModularGridBase(model.parameters)
    case 'hsw-cell':
      return boundsForHswCell(model.parameters)
    case 'hexagonal-column':
      return boundsForHexagonalColumn(model.parameters)
    case 'opengrid':
      return boundsForOpenGrid(model.parameters)
    case 'opengrid-stackable-box':
      return boundsForOpenGridStackableBox(model.parameters)
    case 'opengrid-organizer-box':
      return boundsForOpenGridOrganizerBox(model.parameters)
    case 'opengrid-stackable-cylinder':
      return boundsForOpenGridStackableCylinder(model.parameters)
    case 'opengrid-snap':
      return boundsForOpenGridSnap(model.parameters)
    case 'opengrid-wall-cover':
      return boundsForOpenGridWallCover(model.parameters)
    case 'opengrid-snap-remover':
      return boundsForOpenGridSnapRemover(model.parameters)
    case 'opengrid-divider':
      return boundsForOpenGridDivider(model.parameters)
    case 'opengrid-pillar':
      return boundsForPillar(model.parameters)
    case 'opengrid-open-shelf':
      return boundsForOpenGridOpenShelf(model.parameters)
    case 'opengrid-openconnect-shelf':
      return boundsForOpenGridOpenConnectShelf(model.parameters)
    case 'opengrid-openconnect-tissue-box':
      return tissueBoxBounds(model.parameters)
    case 'opengrid-openconnect-organizer':
      return boundsForOpenGridOpenConnectOrganizer(model.parameters)
  }
}

export function modelFileName(model: ModelParameters): string {
  switch (model.modelId) {
    case 'box':
      return boxFileName(model.parameters)
    case 'modular-grid-base':
      return modularGridBaseFileName(model.parameters)
    case 'hsw-cell':
      return hswCellFileName(model.parameters)
    case 'hexagonal-column':
      return hexagonalColumnFileName(model.parameters)
    case 'opengrid':
      return openGridFileName(model.parameters)
    case 'opengrid-stackable-box':
      return openGridStackableBoxFileName(model.parameters)
    case 'opengrid-organizer-box':
      return openGridOrganizerBoxFileName(model.parameters)
    case 'opengrid-stackable-cylinder':
      return openGridStackableCylinderFileName(model.parameters)
    case 'opengrid-snap':
      return openGridSnapFileName(model.parameters)
    case 'opengrid-wall-cover':
      return openGridWallCoverFileName(model.parameters)
    case 'opengrid-snap-remover':
      return openGridSnapRemoverFileName(model.parameters)
    case 'opengrid-divider':
      return openGridDividerFileName(model.parameters)
    case 'opengrid-pillar':
      return pillarFileName(model.parameters)
    case 'opengrid-open-shelf':
      return openGridOpenShelfFileName(model.parameters)
    case 'opengrid-openconnect-shelf':
      return openGridOpenConnectShelfFileName(model.parameters)
    case 'opengrid-openconnect-tissue-box':
      return tissueBoxFileName(model.parameters, 'step')
    case 'opengrid-openconnect-organizer':
      return openGridOpenConnectOrganizerFileName(model.parameters)
  }
}

export function modelStlFileName(model: ModelParameters): string {
  switch (model.modelId) {
    case 'box':
      return boxStlFileName(model.parameters)
    case 'modular-grid-base':
      return modularGridBaseStlFileName(model.parameters)
    case 'hsw-cell':
      return hswCellStlFileName(model.parameters)
    case 'hexagonal-column':
      return hexagonalColumnStlFileName(model.parameters)
    case 'opengrid':
      return openGridStlFileName(model.parameters)
    case 'opengrid-stackable-box':
      return openGridStackableBoxStlFileName(model.parameters)
    case 'opengrid-organizer-box':
      return openGridOrganizerBoxStlFileName(model.parameters)
    case 'opengrid-stackable-cylinder':
      return openGridStackableCylinderStlFileName(model.parameters)
    case 'opengrid-snap':
      return openGridSnapStlFileName(model.parameters)
    case 'opengrid-wall-cover':
      return openGridWallCoverStlFileName(model.parameters)
    case 'opengrid-snap-remover':
      return openGridSnapRemoverStlFileName(model.parameters)
    case 'opengrid-divider':
      return openGridDividerStlFileName(model.parameters)
    case 'opengrid-pillar':
      return pillarStlFileName(model.parameters)
    case 'opengrid-open-shelf':
      return openGridOpenShelfStlFileName(model.parameters)
    case 'opengrid-openconnect-shelf':
      return openGridOpenConnectShelfStlFileName(model.parameters)
    case 'opengrid-openconnect-tissue-box':
      return tissueBoxFileName(model.parameters, 'stl')
    case 'opengrid-openconnect-organizer':
      return openGridOpenConnectOrganizerStlFileName(model.parameters)
  }
}
