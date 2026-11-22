import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { measureVolume } from 'replicad'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import {
  loadOpenGridWallCoverFont,
  OPEN_GRID_WALL_COVER_FONT_URL,
} from '../../src/cad-kernel/components/opengrid-wall-cover/flat-text'
import { buildGameBox } from '../../src/cad-kernel/components/game-box/builder'
import { countSolids } from '../../src/cad-kernel/shape-query/solids'
import { gameBoxDefinition } from '../../src/features/cad/model-catalog/components/game-box'
import {
  GAME_BOX_CONFIGURATION,
  type GameBoxParameters,
} from '../../src/cad-contract/units'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require

beforeAll(async () => {
  await initialiseCadKernel(
    require.resolve('replicad-opencascadejs/src/replicad_single.wasm'),
  )
  // The assembly cover art goes through the shared text builders.
  await loadOpenGridWallCoverFont(
    readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_FONT_URL)),
  )
})

/**
 * The default parameters with the card size of a preset applied. A preset
 * overrides the card size only, so the module list stays the default one.
 */
function presetParameters(
  presetIndex: number,
  part: GameBoxParameters['part'],
): GameBoxParameters {
  const preset = gameBoxDefinition.presets?.[presetIndex]
  if (!preset) throw new Error('The preset does not exist')
  return {
    ...GAME_BOX_CONFIGURATION.defaultParameters,
    ...preset.overrides,
    part,
  } as GameBoxParameters
}

const PRESET_IDS = (gameBoxDefinition.presets ?? []).map((preset) => preset.id)

describe('game-box card size presets build with default parameters', () => {
  for (const [index, presetId] of PRESET_IDS.entries()) {
    for (const part of ['box', 'lid', 'assembly'] as const) {
      it(`builds ${part} for preset ${presetId}`, async () => {
        const build = await buildGameBox(presetParameters(index, part))
        try {
          expect(measureVolume(build.shape)).toBeGreaterThan(0)
          expect(countSolids(build.shape)).toBeGreaterThanOrEqual(1)
          if (part === 'assembly') {
            // The box body and the lid, with no divider because the default
            // module list holds a single module, plus the cover plate and
            // the four raised GAME glyphs (one solid each).
            expect(countSolids(build.shape)).toBe(7)
            return
          }
          // A single part is printed on the bed.
          const bounds = build.shape.boundingBox
          try {
            const [min] = bounds.bounds as [number[], number[]]
            expect(min[2]!).toBeGreaterThanOrEqual(-0.01)
          } finally {
            bounds.delete()
          }
        } finally {
          build.shape.delete()
        }
      })
    }
  }
})
