import type { ModelId } from '../../../cad-contract/units'

export const OPENGRID_SOURCE_CODE_LICENSE_URL =
  'https://creativecommons.org/licenses/by-nc-sa/4.0/'
export const OPENGRID_DERIVED_PARTS_LICENSE_URL =
  'https://creativecommons.org/licenses/by/4.0/'
export const OPENGRID_DESIGNER_PROFILE_URL =
  'https://www.printables.com/@DavidD'
export const OPENGRID_OPENSCAD_AUTHOR_PROFILE_URL =
  'https://makerworld.com/en/@BlackjackDuck'
export const OPENCONNECT_AUTHOR_PROFILE_URL = 'https://github.com/mitufy'
export const OPENCONNECT_PROJECT_URL =
  'https://www.printables.com/model/1559478-openconnect-opengrids-own-connector-system'
export const OPENCONNECT_LICENSE_URL =
  'https://creativecommons.org/licenses/by/4.0/'

export type OpenGridAttributionAuthor = {
  label: string
  roleKey: string
  url?: string
}

export type OpenGridAttributionLicense = {
  labelKey: string
  url: string
}

export type OpenGridAttribution = {
  summaryKey: string
  creditsKey: string
  authors: readonly OpenGridAttributionAuthor[]
  licenses: readonly OpenGridAttributionLicense[]
  modificationKey?: string
}

const STANDARD_OPENGRID_LICENSES = [
  {
    labelKey: 'cad.attribution.sourceCodeLicense',
    url: OPENGRID_SOURCE_CODE_LICENSE_URL,
  },
  {
    labelKey: 'cad.attribution.derivedPartsLicense',
    url: OPENGRID_DERIVED_PARTS_LICENSE_URL,
  },
] as const

const DAVID_D_AUTHOR = {
  label: 'David D',
  roleKey: 'cad.attribution.author.designRole',
  url: OPENGRID_DESIGNER_PROFILE_URL,
} satisfies OpenGridAttributionAuthor

const OPENGRID_ATTRIBUTION_BY_MODEL_ID = {
  opengrid: {
    summaryKey: 'cad.attribution.opengrid.summary',
    creditsKey: 'cad.attribution.opengrid.credits',
    authors: [
      DAVID_D_AUTHOR,
      {
        label: 'BlackjackDuck (Andy)',
        roleKey: 'cad.attribution.author.openScadRole',
        url: OPENGRID_OPENSCAD_AUTHOR_PROFILE_URL,
      },
    ],
    licenses: STANDARD_OPENGRID_LICENSES,
  },
  'opengrid-snap': {
    summaryKey: 'cad.attribution.snap.summary',
    creditsKey: 'cad.attribution.snap.credits',
    authors: [
      DAVID_D_AUTHOR,
      {
        label: 'metasyntactic',
        roleKey: 'cad.attribution.author.openScadRole',
      },
      {
        label: 'mitufy',
        roleKey: 'cad.attribution.author.openConnectRole',
        url: OPENCONNECT_AUTHOR_PROFILE_URL,
      },
      {
        label: 'OpenConnect project',
        roleKey: 'cad.attribution.author.openConnectProjectRole',
        url: OPENCONNECT_PROJECT_URL,
      },
    ],
    licenses: [
      ...STANDARD_OPENGRID_LICENSES,
      {
        labelKey: 'cad.attribution.openConnectLicense',
        url: OPENCONNECT_LICENSE_URL,
      },
    ],
    modificationKey: 'cad.attribution.snap.modified',
  },
  'opengrid-openconnect-shelf': {
    summaryKey: 'cad.attribution.openConnectShelf.summary',
    creditsKey: 'cad.attribution.openConnectShelf.credits',
    authors: [
      DAVID_D_AUTHOR,
      {
        label: 'mitufy',
        roleKey: 'cad.attribution.author.openConnectRole',
        url: OPENCONNECT_AUTHOR_PROFILE_URL,
      },
    ],
    licenses: [
      ...STANDARD_OPENGRID_LICENSES,
      {
        labelKey: 'cad.attribution.openConnectSocketLicense',
        url: OPENCONNECT_LICENSE_URL,
      },
    ],
    modificationKey: 'cad.attribution.openConnectShelf.modified',
  },
  'opengrid-openconnect-organizer': {
    summaryKey: 'cad.attribution.openConnectShelf.summary',
    creditsKey: 'cad.attribution.openConnectShelf.credits',
    authors: [
      DAVID_D_AUTHOR,
      {
        label: 'mitufy',
        roleKey: 'cad.attribution.author.openConnectRole',
        url: OPENCONNECT_AUTHOR_PROFILE_URL,
      },
      {
        label: 'OpenConnect project',
        roleKey: 'cad.attribution.author.openConnectProjectRole',
        url: OPENCONNECT_PROJECT_URL,
      },
    ],
    licenses: [
      ...STANDARD_OPENGRID_LICENSES,
      {
        labelKey: 'cad.attribution.openConnectSocketLicense',
        url: OPENCONNECT_LICENSE_URL,
      },
    ],
    modificationKey: 'cad.attribution.openConnectOrganizer.modified',
  },
  'opengrid-openconnect-tissue-box': {
    summaryKey: 'cad.attribution.openConnectShelf.summary',
    creditsKey: 'cad.attribution.openConnectShelf.credits',
    authors: [
      DAVID_D_AUTHOR,
      {
        label: 'mitufy',
        roleKey: 'cad.attribution.author.openConnectRole',
        url: OPENCONNECT_AUTHOR_PROFILE_URL,
      },
      {
        label: 'OpenConnect project',
        roleKey: 'cad.attribution.author.openConnectProjectRole',
        url: OPENCONNECT_PROJECT_URL,
      },
    ],
    licenses: [
      ...STANDARD_OPENGRID_LICENSES,
      {
        labelKey: 'cad.attribution.openConnectSocketLicense',
        url: OPENCONNECT_LICENSE_URL,
      },
    ],
    modificationKey: 'cad.attribution.tissueBox.modified',
  },
} satisfies Readonly<
  Record<
    | 'opengrid'
    | 'opengrid-snap'
    | 'opengrid-openconnect-shelf'
    | 'opengrid-openconnect-organizer'
    | 'opengrid-openconnect-tissue-box',
    OpenGridAttribution
  >
>

export function getOpenGridAttribution(
  modelId: ModelId,
): OpenGridAttribution | null {
  if (
    modelId !== 'opengrid' &&
    modelId !== 'opengrid-snap' &&
    modelId !== 'opengrid-openconnect-shelf' &&
    modelId !== 'opengrid-openconnect-tissue-box' &&
    modelId !== 'opengrid-openconnect-organizer'
  ) {
    return null
  }
  return OPENGRID_ATTRIBUTION_BY_MODEL_ID[modelId]
}
