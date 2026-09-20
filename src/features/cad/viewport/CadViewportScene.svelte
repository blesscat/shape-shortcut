<script lang="ts">
  import { T, useThrelte } from '@threlte/core'
  import {
    Bounds,
    Gizmo,
    OrbitControls,
    interactivity,
    type GizmoOptions,
  } from '@threlte/extras'
  import { Color } from 'three'
  import type { OrbitControls as OrbitControlsInstance } from 'three/examples/jsm/controls/OrbitControls.js'
  import type {
    MeshSnapshot,
    ModelPartMeshSnapshot,
  } from '../../../cad-contract/messages'
  import type { ModelParameterValues } from '../../../cad-contract/units'
  import ModelMesh from './ModelMesh.svelte'
  import DimensionAnnotations from './DimensionAnnotations.svelte'
  import {
    CAD_VIEWPORT_GIZMO,
    CAD_VIEWPORT_LIGHTING,
    colorForCadViewportPart,
    type CadViewportPartName,
  } from './config'
  import {
    CAD_VIEWPORT_CAMERA,
    CAD_VIEWPORT_GRID_ROTATION,
  } from './coordinates'
  import type { CadViewportTheme } from './theme'
  import type { CadViewportPresentation } from './presentation'
  import type { ViewportGeometryTiming } from './geometry-timing'
  import type { FaceHoverState } from './face-hover'
  import type { Locale } from '../../../i18n'

  type Props = {
    locale: Locale
    mesh: MeshSnapshot
    partMeshes?: ModelPartMeshSnapshot[]
    modelRevision: string
    parameters: ModelParameterValues | null
    theme: CadViewportTheme
    presentation: CadViewportPresentation
    onPreparationTiming?: (timing: ViewportGeometryTiming) => void
    onFaceHover?: (hover: FaceHoverState | null) => void
  }

  function boundsMarginFor(presentation: CadViewportPresentation): number {
    if (presentation === 'thumbnail') return 20
    return 1.25
  }

  type ViewportGizmoHandle = {
    set: (options?: GizmoOptions) => ViewportGizmoHandle
    update: (controls?: boolean) => ViewportGizmoHandle
  }

  let {
    locale,
    mesh,
    partMeshes,
    modelRevision,
    parameters,
    theme,
    presentation,
    onPreparationTiming,
    onFaceHover,
  }: Props = $props()

  let enableFaceHover = $derived(
    presentation === 'workspace' && onFaceHover !== undefined,
  )

  if (presentation === 'workspace') {
    interactivity()
  }

  function isPartName(name: string): name is CadViewportPartName {
    return name === 'body' || name === 'text'
  }
  let orbitControls = $state<OrbitControlsInstance | undefined>(undefined)
  let viewportGizmo = $state<ViewportGizmoHandle | undefined>(undefined)
  const { scene } = useThrelte()

  $effect(() => {
    scene.background = new Color(theme.background)
  })

  $effect(() => {
    const gizmo = viewportGizmo
    if (!gizmo) return

    gizmo.set({
      ...CAD_VIEWPORT_GIZMO,
      background: {
        ...CAD_VIEWPORT_GIZMO.background,
        color: theme.gizmoBackground,
      },
    })
    gizmo.update()
  })
</script>

<T.HemisphereLight
  args={[
    theme.hemisphereSky,
    theme.hemisphereGround,
    CAD_VIEWPORT_LIGHTING.hemisphere.intensity,
  ]}
  position={CAD_VIEWPORT_LIGHTING.hemisphere.position}
/>
<T.DirectionalLight
  color={theme.keyLight}
  position={CAD_VIEWPORT_LIGHTING.key.position}
  intensity={CAD_VIEWPORT_LIGHTING.key.intensity}
/>
<T.DirectionalLight
  color={theme.oppositeFill}
  position={CAD_VIEWPORT_LIGHTING.oppositeFill.position}
  intensity={CAD_VIEWPORT_LIGHTING.oppositeFill.intensity}
/>
{#if presentation === 'workspace'}
  <T.GridHelper
    args={[1000, 20, theme.gridMajor, theme.gridMinor]}
    rotation={CAD_VIEWPORT_GRID_ROTATION}
  />
{/if}
<T.PerspectiveCamera
  makeDefault
  position={CAD_VIEWPORT_CAMERA.position}
  up={CAD_VIEWPORT_CAMERA.up}
  fov={CAD_VIEWPORT_CAMERA.fov}
>
  {#if presentation === 'workspace'}
    <OrbitControls bind:ref={orbitControls} />
  {/if}
</T.PerspectiveCamera>
{#if presentation === 'workspace' && orbitControls}
  <Gizmo
    bind:ref={viewportGizmo}
    controls={orbitControls}
    {...CAD_VIEWPORT_GIZMO}
  />
{/if}
{#key modelRevision}
  <Bounds margin={boundsMarginFor(presentation)} animate={false}>
    {#if partMeshes && partMeshes.length > 0}
      {#each partMeshes as part (part.name)}
        {#if isPartName(part.name)}
          <ModelMesh
            mesh={part.mesh}
            {theme}
            materialColor={colorForCadViewportPart(part.name)}
            {onPreparationTiming}
            {enableFaceHover}
            {onFaceHover}
          />
        {/if}
      {/each}
    {:else}
      <ModelMesh
        {mesh}
        {theme}
        {onPreparationTiming}
        {enableFaceHover}
        {onFaceHover}
      />
    {/if}
    {#if presentation === 'workspace'}
      <DimensionAnnotations {locale} {mesh} {parameters} {theme} />
    {/if}
  </Bounds>
{/key}
