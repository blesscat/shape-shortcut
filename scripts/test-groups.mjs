export const nativeCadUnitTests = [
  'tests/unit/hsw-cell-asset.test.ts',
  'tests/unit/opengrid-honeycomb-bottoms.test.ts',
  'tests/unit/opengrid-honeycomb-box-interface.test.ts',
  'tests/unit/opengrid-honeycomb-builder.test.ts',
  'tests/unit/opengrid-honeycomb-cylinder-interface.test.ts',
  'tests/unit/opengrid-honeycomb-modes.test.ts',
  'tests/unit/opengrid-honeycomb-inspection-booleans.test.ts',
  'tests/unit/opengrid-honeycomb-quality-regions.test.ts',
  'tests/unit/opengrid-honeycomb-sides.test.ts',
  'tests/unit/opengrid-honeycomb-volume.test.ts',
]

export const fastTestIncludes = ['tests/unit/**/*.test.ts']
export const fastTestExcludes = nativeCadUnitTests
export const cadTestIncludes = [
  'tests/worker/**/*.test.ts',
  ...nativeCadUnitTests,
]

export function classifyTestFile(path) {
  const normalizedPath = path.replaceAll('\\', '/').replace(/^\.\//, '')
  if (normalizedPath.startsWith('tests/worker/')) return 'cad'
  if (nativeCadUnitTests.includes(normalizedPath)) return 'cad'
  if (
    normalizedPath.startsWith('tests/unit/') &&
    normalizedPath.endsWith('.test.ts')
  ) {
    return 'fast'
  }
  return null
}
