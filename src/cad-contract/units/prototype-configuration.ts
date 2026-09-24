import { OPENGRID_CONFIGURATION } from './opengrid'
import { OPENGRID_STACKABLE_BOX_CONFIGURATION } from './opengrid-stackable-box'
import { OPENGRID_ORGANIZER_BOX_CONFIGURATION } from './opengrid-organizer-box'
import { OPENGRID_STACKABLE_CYLINDER_CONFIGURATION } from './opengrid-stackable-cylinder'
import { OPENGRID_DIVIDER_CONFIGURATION } from './opengrid-divider'
import { OPENGRID_OPEN_SHELF_CONFIGURATION } from './opengrid-open-shelf'
import { OPENGRID_OPENCONNECT_SHELF_CONFIGURATION } from './opengrid-openconnect-shelf'
import { OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION } from './opengrid-openconnect-organizer'
import { HSW_CELL_CONFIGURATION } from './hsw-cell-configuration'

export const PROTOTYPE_CONFIGURATION = {
  defaultDimensions: { width: 20, depth: 30, height: 40 },
  minDimension: 1,
  maxDimension: 500,
  inputStep: 1,
  inputDebounceMs: 500,
  boundsTolerance: 0.01,
  engineInitializationTimeoutMs: 60_000,
  modelGenerationTimeoutMs: 600_000,
  operationTimeoutMs: 120_000,
  recoveryRetries: 1,
  pendingCandidateLimit: 2,
  candidateTtlMs: 30_000,
  stepExtension: '.step',
  stepMime: 'model/step',
  stlExtension: '.stl',
  stlMime: 'model/stl',
  threeMfExtension: '.3mf',
  threeMfMime: 'model/3mf',
  stlTolerance: 0.001,
  stlAngularTolerance: 0.1,
  modularGridBase: {
    maxGridCount: 20,
    cellWidth: 20,
    cellDepth: 20,
    height: 5,
    cutoutWidth: 17.5,
    cutoutDepth: 17.5,
    outerCornerRadius: 2.5,
  },
  hswCell: HSW_CELL_CONFIGURATION,
  opengrid: OPENGRID_CONFIGURATION,
  opengridStackableBox: OPENGRID_STACKABLE_BOX_CONFIGURATION,
  opengridOrganizerBox: OPENGRID_ORGANIZER_BOX_CONFIGURATION,
  opengridStackableCylinder: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  opengridDivider: OPENGRID_DIVIDER_CONFIGURATION,
  opengridOpenShelf: OPENGRID_OPEN_SHELF_CONFIGURATION,
  opengridOpenConnectShelf: OPENGRID_OPENCONNECT_SHELF_CONFIGURATION,
  opengridOpenConnectOrganizer: OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION,
} as const
