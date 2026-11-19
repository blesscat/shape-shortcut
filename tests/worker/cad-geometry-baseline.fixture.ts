import {
  CARD_BOX_CONFIGURATION,
  GAME_BOX_CONFIGURATION,
  HEXAGONAL_COLUMN_CONFIGURATION,
  OPENGRID_CONFIGURATION,
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_LABEL_CARD_CONFIGURATION,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
  OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  OPENGRID_SNAP_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  OPENGRID_WALL_COVER_CONFIGURATION,
  PILLAR_CONFIGURATION,
  PROTOTYPE_CONFIGURATION,
  type ModelId,
  type ModelParameterValues,
} from '../../src/cad-contract/units'
import { OPENGRID_LABEL_LEDGE_TEST_CONFIGURATION } from '../../src/cad-contract/units/opengrid-label-ledge-test'
import { OPENGRID_LABEL_SLOT_TEST_CONFIGURATION } from '../../src/cad-contract/units/opengrid-label-slot-test'
import { TISSUE_BOX_DEFAULTS } from '../../src/cad-contract/units/opengrid-openconnect-tissue-box'

/**
 * Values that identify the built geometry of one model.
 *
 * `volume` is the solid volume in mm³, `bounds` is
 * `[minX, minY, minZ, maxX, maxY, maxZ]` in mm, and `solids` is the number of
 * solids in the built shape. Together they identify the shape well enough to
 * catch any geometry change without pinning every face.
 */
export type GeometrySignature = {
  volume: number
  bounds: readonly [number, number, number, number, number, number]
  solids: number
}

/**
 * One recorded entry per model: the geometry of the plain build path and of
 * the multipart build path, which the Worker uses for multi-part models.
 */
export type GeometryBaselineEntry = {
  build: GeometrySignature
  buildWithParts: GeometrySignature
}

/** Every model id the geometry baseline covers. */
export const GEOMETRY_BASELINE_MODEL_IDS: readonly ModelId[] = [
  'box',
  'modular-grid-base',
  'hsw-cell',
  'hexagonal-column',
  'card-box',
  'game-box',
  'opengrid',
  'opengrid-stackable-box',
  'opengrid-organizer-box',
  'opengrid-stackable-cylinder',
  'opengrid-snap',
  'opengrid-wall-cover',
  'opengrid-snap-remover',
  'opengrid-divider',
  'opengrid-pillar',
  'opengrid-open-shelf',
  'opengrid-openconnect-shelf',
  'opengrid-openconnect-tissue-box',
  'opengrid-openconnect-organizer',
  'opengrid-label-card',
  'opengrid-label-slot-test',
  'opengrid-label-ledge-test',
]

/** The default parameters every model is generated with. */
export const DEFAULT_MODEL_PARAMETERS: Record<ModelId, ModelParameterValues> = {
  box: { ...PROTOTYPE_CONFIGURATION.defaultDimensions },
  'modular-grid-base': { rows: 1, columns: 1 },
  'hsw-cell': { rows: 1, columns: 1 },
  'hexagonal-column': {
    height: HEXAGONAL_COLUMN_CONFIGURATION.defaultHeight,
    count: HEXAGONAL_COLUMN_CONFIGURATION.defaultCount,
    gap: HEXAGONAL_COLUMN_CONFIGURATION.defaultGap,
    orientation: HEXAGONAL_COLUMN_CONFIGURATION.defaultOrientation,
  },
  'card-box': { ...CARD_BOX_CONFIGURATION.defaultParameters },
  'game-box': { ...GAME_BOX_CONFIGURATION.defaultParameters },
  opengrid: { ...OPENGRID_CONFIGURATION.defaultParameters },
  'opengrid-stackable-box': { ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS },
  'opengrid-organizer-box': { ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS },
  'opengrid-stackable-cylinder': {
    ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  },
  'opengrid-snap': { ...OPENGRID_SNAP_CONFIGURATION.defaultParameters },
  'opengrid-wall-cover': {
    ...OPENGRID_WALL_COVER_CONFIGURATION.defaultParameters,
  },
  'opengrid-snap-remover': {},
  'opengrid-divider': { ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters },
  'opengrid-pillar': { ...PILLAR_CONFIGURATION.defaultParameters },
  'opengrid-open-shelf': { ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS },
  'opengrid-openconnect-shelf': {
    ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
  },
  'opengrid-openconnect-tissue-box': { ...TISSUE_BOX_DEFAULTS },
  'opengrid-openconnect-organizer': {
    ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  },
  'opengrid-label-card': {
    ...OPENGRID_LABEL_CARD_CONFIGURATION.defaultParameters,
  },
  'opengrid-label-slot-test': {
    ...OPENGRID_LABEL_SLOT_TEST_CONFIGURATION.defaultParameters,
  },
  'opengrid-label-ledge-test': {
    ...OPENGRID_LABEL_LEDGE_TEST_CONFIGURATION.defaultParameters,
  },
}

/**
 * The recorded geometry of every model, captured before the registry split.
 * A split that moved code verbatim keeps these values; any change to the
 * generated shape changes them.
 */
export const GEOMETRY_BASELINE: Record<ModelId, GeometryBaselineEntry> = {
  box: {
    build: {
      volume: 24000,
      bounds: [-10, -15, 0, 10, 15, 40],
      solids: 1,
    },
    buildWithParts: {
      volume: 24000,
      bounds: [-10, -15, 0, 10, 15, 40],
      solids: 1,
    },
  },
  'modular-grid-base': {
    build: {
      volume: 479.750301,
      bounds: [-10, -10, 0, 10, 10, 5],
      solids: 1,
    },
    buildWithParts: {
      volume: 479.750301,
      bounds: [-10, -10, 0, 10, 10, 5],
      solids: 1,
    },
  },
  'hsw-cell': {
    build: {
      volume: 897.358215,
      bounds: [-13.625467, -11.8, 0, 13.625467, 11.8, 8],
      solids: 1,
    },
    buildWithParts: {
      volume: 897.358215,
      bounds: [-13.625467, -11.8, 0, 13.625467, 11.8, 8],
      solids: 1,
    },
  },
  'hexagonal-column': {
    build: {
      volume: 123.38641,
      bounds: [-4, -2.35, 0, 4, 2.35, 4.243524],
      solids: 1,
    },
    buildWithParts: {
      volume: 123.38641,
      bounds: [-4, -2.35, 0, 4, 2.35, 4.243524],
      solids: 1,
    },
  },
  'card-box': {
    build: {
      volume: 130473.2312,
      bounds: [-38.25, -39.95, 0, 38.25, 38.1, 129],
      solids: 9,
    },
    buildWithParts: {
      volume: 130473.2312,
      bounds: [-38.25, -39.95, 0, 38.25, 38.1, 129],
      solids: 9,
    },
  },
  'game-box': {
    build: {
      volume: 108989.878666,
      bounds: [-38.25, -35.45, 0, 38.25, 33.6, 129],
      solids: 2,
    },
    buildWithParts: {
      volume: 108989.878666,
      bounds: [-38.25, -35.45, 0, 38.25, 33.6, 129],
      solids: 2,
    },
  },
  opengrid: {
    build: {
      volume: 2380.807905,
      bounds: [-28, -28, 0, 28, 28, 4],
      solids: 1,
    },
    buildWithParts: {
      volume: 2380.807905,
      bounds: [-28, -28, 0, 28, 28, 4],
      solids: 1,
    },
  },
  'opengrid-stackable-box': {
    build: {
      volume: 19356.957266,
      bounds: [-27.925, -27.925, 0, 27.925, 27.925, 31.45],
      solids: 1,
    },
    buildWithParts: {
      volume: 19356.957266,
      bounds: [-27.925, -27.925, 0, 27.925, 27.925, 31.45],
      solids: 1,
    },
  },
  'opengrid-organizer-box': {
    build: {
      volume: 46187.350225,
      bounds: [-27.925, -27.925, 0, 27.925, 27.925, 23],
      solids: 1,
    },
    buildWithParts: {
      volume: 46187.350225,
      bounds: [-27.925, -27.925, 0, 27.925, 27.925, 23],
      solids: 1,
    },
  },
  'opengrid-stackable-cylinder': {
    build: {
      volume: 9906.309811,
      bounds: [-29.6, -29.6, 0, 29.6, 29.6, 20],
      solids: 1,
    },
    buildWithParts: {
      volume: 9906.309811,
      bounds: [-29.6, -29.6, 0, 29.6, 29.6, 20],
      solids: 1,
    },
  },
  'opengrid-snap': {
    build: {
      volume: 1879.975706,
      bounds: [-12.80002, -12.80002, -0.00002, 12.80002, 12.80002, 3.40002],
      solids: 9,
    },
    buildWithParts: {
      volume: 1879.975706,
      bounds: [-12.80002, -12.80002, -0.00002, 12.80002, 12.80002, 3.40002],
      solids: 9,
    },
  },
  'opengrid-wall-cover': {
    build: {
      volume: 531.749989,
      bounds: [
        -12.800246, -12.800246, -0.000246, 12.800246, 12.800246, 3.400246,
      ],
      solids: 10,
    },
    buildWithParts: {
      volume: 531.749989,
      bounds: [
        -12.800246, -12.800246, -0.000246, 12.800246, 12.800246, 3.400246,
      ],
      solids: 10,
    },
  },
  'opengrid-snap-remover': {
    build: {
      volume: 5296.239689,
      bounds: [
        -17.202743, -20.005516, -5.005506, 21.27657, 20.005516, 5.005506,
      ],
      solids: 1,
    },
    buildWithParts: {
      volume: 5296.239689,
      bounds: [
        -17.202743, -20.005516, -5.005506, 21.27657, 20.005516, 5.005506,
      ],
      solids: 1,
    },
  },
  'opengrid-divider': {
    build: {
      volume: 3667.892396,
      bounds: [
        -39.725011, -2.653148, -3.800011, 39.725011, 2.653148, 20.000011,
      ],
      solids: 1,
    },
    buildWithParts: {
      volume: 3667.892396,
      bounds: [
        -39.725011, -2.653148, -3.800011, 39.725011, 2.653148, 20.000011,
      ],
      solids: 1,
    },
  },
  'opengrid-pillar': {
    build: {
      volume: 85.071271,
      bounds: [-3.321716, -2.45, 0, 3.321716, 2.45, 5.2],
      solids: 1,
    },
    buildWithParts: {
      volume: 85.071271,
      bounds: [-3.321716, -2.45, 0, 3.321716, 2.45, 5.2],
      solids: 1,
    },
  },
  'opengrid-open-shelf': {
    build: {
      volume: 68951.759424,
      bounds: [-55.925, -41.925, -3.8, 55.925, 41.925, 50],
      solids: 1,
    },
    buildWithParts: {
      volume: 68951.759424,
      bounds: [-55.925, -41.925, -3.8, 55.925, 41.925, 50],
      solids: 1,
    },
  },
  'opengrid-openconnect-shelf': {
    build: {
      volume: 26138.8671,
      bounds: [-42, -88.278654, 0, 42, 3.104946, 27.942431],
      solids: 1,
    },
    buildWithParts: {
      volume: 26138.8671,
      bounds: [-42, -88.278654, 0, 42, 3.104946, 27.942431],
      solids: 1,
    },
  },
  'opengrid-openconnect-tissue-box': {
    build: {
      volume: 483144.317167,
      bounds: [-112, -28.792431, 0, 112, 124, 92],
      solids: 1,
    },
    buildWithParts: {
      volume: 483144.317167,
      bounds: [-112, -28.792431, 0, 112, 124, 92],
      solids: 1,
    },
  },
  'opengrid-openconnect-organizer': {
    build: {
      volume: 26216.282122,
      bounds: [-21.5, -43, 0, 21.5, 10.818636, 29.012941],
      solids: 1,
    },
    buildWithParts: {
      volume: 26216.282122,
      bounds: [-21.5, -43, 0, 21.5, 10.818636, 29.012941],
      solids: 1,
    },
  },
  'opengrid-label-card': {
    build: {
      volume: 295.446321,
      bounds: [-20, -6, 0, 20, 6, 1],
      solids: 2,
    },
    buildWithParts: {
      volume: 295.446321,
      bounds: [-20, -6, 0, 20, 6, 1],
      solids: 2,
    },
  },
  'opengrid-label-slot-test': {
    build: {
      volume: 700.179,
      bounds: [-17.35, -1.8, 0, 17.35, 1, 16.8],
      solids: 1,
    },
    buildWithParts: {
      volume: 700.179,
      bounds: [-17.35, -1.8, 0, 17.35, 1, 16.8],
      solids: 1,
    },
  },
  'opengrid-label-ledge-test': {
    build: {
      volume: 4928.688421,
      bounds: [-17.35, -1, 0, 17.35, 11.272792, 24.2],
      solids: 1,
    },
    buildWithParts: {
      volume: 4928.688421,
      bounds: [-17.35, -1, 0, 17.35, 11.272792, 24.2],
      solids: 1,
    },
  },
}
