import type { DiagnosticDescriptor } from '../../../../cad-contract/diagnostics'

export function supportsCadBrowser():
  { supported: true } | { supported: false; diagnostic: DiagnosticDescriptor } {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      diagnostic: { messageId: 'diagnostic.browserEnvironmentRequired' },
    }
  }
  if (typeof WebAssembly === 'undefined') {
    return {
      supported: false,
      diagnostic: { messageId: 'diagnostic.webAssemblyUnsupported' },
    }
  }
  if (typeof Worker === 'undefined') {
    return {
      supported: false,
      diagnostic: { messageId: 'diagnostic.workerUnsupported' },
    }
  }
  const canvas = document.createElement('canvas')
  const webgl =
    canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
  if (!webgl) {
    return {
      supported: false,
      diagnostic: { messageId: 'diagnostic.webglUnsupported' },
    }
  }
  return { supported: true }
}
