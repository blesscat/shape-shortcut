import { importSTEP, type Shape3D } from 'replicad'
import { deleteShape } from '../../lifetime/dispose'

export const openGridSnapRemoverAssetUrl = new URL(
  './snap remover.step',
  import.meta.url,
)

export type OpenGridSnapRemoverBuildContext = {
  isGenerationCurrent?: () => boolean
}

function assertNonEmptyShape(shape: Shape3D): void {
  if (shape.isNull) throw new Error('OPENGRID_SNAP_REMOVER_ASSET_INVALID')

  const bounds = shape.boundingBox
  try {
    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = bounds.bounds
    const hasVolume = maxX > minX && maxY > minY && maxZ > minZ
    if (!hasVolume) throw new Error('OPENGRID_SNAP_REMOVER_ASSET_INVALID')
  } finally {
    bounds.delete()
  }
}

export async function importOpenGridSnapRemoverAsset(
  blob: Blob,
): Promise<Shape3D> {
  let imported: Shape3D | null = null
  try {
    imported = (await importSTEP(blob)).asShape3D()
    assertNonEmptyShape(imported)
    return imported
  } catch (error) {
    deleteShape(imported)
    if (
      error instanceof Error &&
      error.message === 'OPENGRID_SNAP_REMOVER_ASSET_INVALID'
    ) {
      throw error
    }
    throw new Error('OPENGRID_SNAP_REMOVER_ASSET_INVALID')
  }
}

export async function loadOpenGridSnapRemoverAsset(
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(openGridSnapRemoverAssetUrl)
  if (!response.ok) throw new Error('OPENGRID_SNAP_REMOVER_ASSET_LOAD_FAILED')
  return importOpenGridSnapRemoverAsset(await response.blob())
}

export function buildOpenGridSnapRemover(
  source: Shape3D,
  context: OpenGridSnapRemoverBuildContext = {},
): Shape3D {
  const clone = source.clone()
  try {
    if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
      throw new Error('STALE_GENERATION')
    }
    return clone
  } catch (error) {
    deleteShape(clone)
    throw error
  }
}
