import { describe, expect, it } from 'vitest'
import type { Shape3D } from 'replicad'
import { DEFAULT_MODEL_COLORS } from '../../src/cad-contract/model-colors'
import {
  exportThreeMfBytes,
  isThreeMfPackage,
} from '../../src/cad-kernel/export/three-mf'

const shape = {
  mesh: () => ({
    vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
    triangles: [0, 1, 2],
  }),
} as unknown as Shape3D

describe('3MF palette serialization', () => {
  it.each(['text', 'rim'] as const)(
    'writes custom colors and preserves %s assignments',
    async (accent) => {
      const bytes = await exportThreeMfBytes(
        [
          { name: 'body', shape },
          { name: accent, shape },
        ],
        { baseColor: '#ABCDEF', accentColor: '#123456' },
      )
      const text = new TextDecoder().decode(bytes)
      expect(isThreeMfPackage(bytes)).toBe(true)
      expect(text).toContain('displaycolor="#ABCDEF"')
      expect(text).toContain('displaycolor="#123456"')
      expect(text).toContain('"filament_colour": ["#ABCDEF", "#123456"]')
      expect(text).toContain(`name="${accent}"`)
      expect(text).toContain('key="extruder" value="1"')
      expect(text).toContain('key="extruder" value="2"')
    },
  )
  it('uses shared defaults when omitted', async () => {
    const bytes = await exportThreeMfBytes([
      { name: 'body', shape },
      { name: 'text', shape },
    ])
    expect(isThreeMfPackage(bytes)).toBe(true)
    expect(new TextDecoder().decode(bytes)).toContain(
      `"filament_colour": ["${DEFAULT_MODEL_COLORS.primary}", "${DEFAULT_MODEL_COLORS.secondary}"]`,
    )
  })
  it('rejects malformed serializer inputs', async () => {
    await expect(
      exportThreeMfBytes(
        [
          { name: 'body', shape },
          { name: 'text', shape },
        ],
        { baseColor: '"><bad>' },
      ),
    ).rejects.toThrow('THREEMF_METADATA_INVALID')
  })
})
