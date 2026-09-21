<script lang="ts">
  import TissueBoxComponentPanel from './opengrid-openconnect-tissue-box/TissueBoxComponentPanel.svelte'
  import type {
    ModelId,
    ModelParameterValues,
    OpenGridParameters,
    OpenGridSnapParameters,
  } from '../../../cad-contract/units'
  import BoxComponentPanel from './box/BoxComponentPanel.svelte'
  import HexagonalColumnComponentPanel from './hexagonal-column/HexagonalColumnComponentPanel.svelte'
  import HswCellComponentPanel from './hsw-cell/HswCellComponentPanel.svelte'
  import ModularGridBaseComponentPanel from './modular-grid-base/ModularGridBaseComponentPanel.svelte'
  import OpenGridComponentPanel from './opengrid/OpenGridComponentPanel.svelte'
  import OpenGridDividerComponentPanel from './opengrid-divider/OpenGridDividerComponentPanel.svelte'
  import OpenGridOrganizerBoxComponentPanel from './opengrid-organizer-box/OpenGridOrganizerBoxComponentPanel.svelte'
  import OpenGridStackableBoxComponentPanel from './opengrid-stackable-box/OpenGridStackableBoxComponentPanel.svelte'
  import OpenGridStackableCylinderComponentPanel from './opengrid-stackable-cylinder/OpenGridStackableCylinderComponentPanel.svelte'
  import OpenGridSnapComponentPanel from './opengrid-snap/OpenGridSnapComponentPanel.svelte'
  import OpenGridPillarComponentPanel from './opengrid-pillar/OpenGridPillarComponentPanel.svelte'
  import type { OpenGridSystemContext } from '../../../features/cad/system-entry-context'
  import OpenGridOpenShelfComponentPanel from './opengrid-open-shelf/OpenGridOpenShelfComponentPanel.svelte'
  import OpenGridOpenConnectShelfComponentPanel from './opengrid-openconnect-shelf/OpenGridOpenConnectShelfComponentPanel.svelte'
  import OpenGridOpenConnectOrganizerComponentPanel from './opengrid-openconnect-organizer/OpenGridOpenConnectOrganizerComponentPanel.svelte'
  import OpenGridWallCoverComponentPanel from './opengrid-wall-cover/OpenGridWallCoverComponentPanel.svelte'
  import OpenGridLabelTagComponentPanel from './opengrid-label-tag/OpenGridLabelTagComponentPanel.svelte'
  import OpenGridLabelCardComponentPanel from './opengrid-label-card/OpenGridLabelCardComponentPanel.svelte'
  import OpenGridLabelHolderComponentPanel from './opengrid-label-holder/OpenGridLabelHolderComponentPanel.svelte'
  import type { ComponentPanelProps } from './types'

  type Props = ComponentPanelProps & {
    modelId: ModelId
    parameters: ModelParameterValues
    systemContext?: OpenGridSystemContext
    onOpenGridParametersChange: (parameters: OpenGridParameters) => void
    onSystemContextChange: (context: OpenGridSystemContext | undefined) => void
    onOpenGridDimensionCalculationInvalid: () => void
  }

  let {
    locale,
    modelId,
    parameters,
    systemContext,
    rawParameters,
    fieldErrors,
    onInputChange,
    onSystemContextChange,
    onOpenGridParametersChange,
    onOpenGridDimensionCalculationInvalid,
  }: Props = $props()
</script>

{#if modelId === 'box'}
  <BoxComponentPanel {locale} {rawParameters} {fieldErrors} {onInputChange} />
{:else if modelId === 'modular-grid-base'}
  <ModularGridBaseComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'hsw-cell'}
  <HswCellComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'hexagonal-column'}
  <HexagonalColumnComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-pillar'}
  <OpenGridPillarComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid'}
  <OpenGridComponentPanel
    {locale}
    parameters={parameters as OpenGridParameters}
    {systemContext}
    {fieldErrors}
    onParametersChange={onOpenGridParametersChange}
    onDimensionCalculationInvalid={onOpenGridDimensionCalculationInvalid}
  />
{:else if modelId === 'opengrid-divider'}
  <OpenGridDividerComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-organizer-box'}
  <OpenGridOrganizerBoxComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-stackable-box'}
  <OpenGridStackableBoxComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-stackable-cylinder'}
  <OpenGridStackableCylinderComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-snap'}
  <OpenGridSnapComponentPanel
    {locale}
    parameters={parameters as OpenGridSnapParameters}
    {systemContext}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
    {onSystemContextChange}
  />
{:else if modelId === 'opengrid-open-shelf'}
  <OpenGridOpenShelfComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-openconnect-shelf'}
  <OpenGridOpenConnectShelfComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-openconnect-tissue-box'}
  <TissueBoxComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-openconnect-organizer'}
  <OpenGridOpenConnectOrganizerComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-wall-cover'}
  <OpenGridWallCoverComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-label-tag'}
  <OpenGridLabelTagComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-label-card'}
  <OpenGridLabelCardComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-label-holder'}
  <OpenGridLabelHolderComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{/if}
