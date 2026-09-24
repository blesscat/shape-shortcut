import {
  DEFAULT_MODEL_COLORS,
  type ModelColors,
} from '../../../cad-contract/model-colors'
import {
  parseSceneFile,
  parseSceneInstanceCommon,
  SCENE_FILE_KIND,
  SCENE_FILE_SCHEMA_VERSION,
  type SceneFile,
  type SceneGridSystem,
  type SceneParseResult,
  type ScenePlacement,
  type SceneInstanceDiagnostic,
} from '../../../cad-contract/scene'
import type { DiagnosticDescriptor } from '../../../cad-contract/diagnostics'
import { getModelDefinition } from '../model-catalog'
import {
  validateModelParameters,
  type ModelId,
  type ModelParameterValues,
} from '../../../cad-contract/units'

export type PlaygroundSceneInstanceData = {
  id: string
  label: string | null
  modelId: ModelId
  parameters: ModelParameterValues
  placement: ScenePlacement | null
  colors: ModelColors
}

export type PlaygroundSceneData = {
  grid: SceneGridSystem
  colors: ModelColors
  instances: PlaygroundSceneInstanceData[]
}

type InstanceParseError = { __sceneInstanceError: DiagnosticDescriptor }

function parsePlaygroundInstance(
  entry: unknown,
  sceneColors: ModelColors,
  assignedId: string,
): PlaygroundSceneInstanceData | InstanceParseError {
  const common = parseSceneInstanceCommon(entry, sceneColors)
  if (common.error) {
    return { __sceneInstanceError: common.error }
  }
  const definition = getModelDefinition(common.modelId as ModelId)
  if (!definition) {
    return {
      __sceneInstanceError: {
        messageId:
          'diagnostic.sceneUnknownModel' satisfies SceneInstanceDiagnostic,
        params: { modelId: common.modelId },
      },
    }
  }
  const validation = validateModelParameters(common.modelId, common.parameters)
  if (!validation.valid) {
    return {
      __sceneInstanceError: {
        messageId:
          'diagnostic.sceneInstanceInvalidParameters' satisfies SceneInstanceDiagnostic,
        params: { modelId: common.modelId },
      },
    }
  }
  return {
    id: assignedId,
    label: common.label,
    modelId: validation.value.modelId,
    parameters: validation.value.parameters,
    placement: common.placement ?? null,
    colors: common.colors,
  }
}

/**
 * Parses a scene or single-instance settings file into validated playground
 * instances. Instance ids are reassigned in file order (`inst-1`, `inst-2`,
 * ...); file-provided ids are ignored. A file with any invalid instance is
 * rejected as a whole.
 */
export function parsePlaygroundSceneFile(
  value: unknown,
  fallbackColors: ModelColors = DEFAULT_MODEL_COLORS,
): SceneParseResult<PlaygroundSceneInstanceData> {
  let nextId = 0
  return parseSceneFile<PlaygroundSceneInstanceData>(
    value,
    fallbackColors,
    (entry, sceneColors) =>
      parsePlaygroundInstance(entry, sceneColors, `inst-${(nextId += 1)}`),
  )
}

/**
 * Serializes playground instances into the shared scene JSON format. A
 * single-instance scene without placements is the settings-file shape
 * produced by component workspaces.
 */
export function serializePlaygroundScene(
  colors: ModelColors,
  instances: ReadonlyArray<{
    label: string | null
    modelId: ModelId
    parameters: ModelParameterValues
    placement: ScenePlacement | null
    colors: ModelColors
  }>,
): SceneFile {
  return {
    schemaVersion: SCENE_FILE_SCHEMA_VERSION,
    kind: SCENE_FILE_KIND,
    grid: { system: 'opengrid' },
    colors: {
      primary: colors.primary.toLowerCase(),
      secondary: colors.secondary.toLowerCase(),
    },
    instances: instances.map((instance) => ({
      ...(instance.label ? { label: instance.label } : {}),
      modelId: instance.modelId,
      parameters: cloneJsonableParameters(instance.parameters),
      placement: instance.placement
        ? {
            cellX: instance.placement.cellX,
            cellY: instance.placement.cellY,
            rotation: instance.placement.rotation,
            supportedBy: null,
          }
        : undefined,
      colors: {
        primary: instance.colors.primary.toLowerCase(),
        secondary: instance.colors.secondary.toLowerCase(),
      },
    })),
  }
}

function cloneJsonableParameters(
  parameters: ModelParameterValues,
): ModelParameterValues {
  return JSON.parse(JSON.stringify(parameters)) as ModelParameterValues
}
