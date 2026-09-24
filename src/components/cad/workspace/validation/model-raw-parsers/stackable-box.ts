import type { RawParameters } from '../../types'

export function withStackableBoxLegacyModeRawParameters(
  raw: RawParameters,
): RawParameters {
  const legacy = raw as Record<string, string | undefined>
  if (raw.topRimMode !== undefined && raw.bottomMode !== undefined) {
    return raw
  }
  const {
    basePlateMode: _basePlate,
    thinShellMode: _thinShell,
    ...rest
  } = raw as Record<string, string | undefined>
  const thinShell = legacy.thinShellMode === 'true'
  const basePlate = legacy.basePlateMode === 'true'
  return {
    ...rest,
    topRimMode: raw.topRimMode ?? (thinShell ? 'flat-top' : 'stacking-rail'),
    bottomMode:
      raw.bottomMode ??
      (thinShell ? 'thin-shell' : basePlate ? 'none' : 'stacking'),
  }
}
