import type { Shape3D } from 'replicad'
import { deleteShape } from '../../lifetime/dispose'

/**
 * Guarded boolean helpers shared by the game-box part builders: every
 * helper frees the shape it consumed, whether the operation succeeds or
 * throws, so a failing build never leaks kernel objects.
 */
export function cutShape(source: Shape3D, cutter: Shape3D): Shape3D {
  try {
    const result = source.cut(cutter)
    if (result !== source) deleteShape(source)
    deleteShape(cutter)
    return result
  } catch (error) {
    deleteShape(cutter)
    throw error
  }
}

export function fuseShape(source: Shape3D, addition: Shape3D): Shape3D {
  try {
    const result = source.fuse(addition)
    if (result !== source) deleteShape(source)
    deleteShape(addition)
    return result
  } catch (error) {
    deleteShape(addition)
    throw error
  }
}
