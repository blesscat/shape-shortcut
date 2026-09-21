<script lang="ts">
  import { T } from '@threlte/core'
  import type { IntersectionEvent } from '@threlte/extras'
  import * as THREE from 'three'
  import type { MeshSnapshot } from '../../../cad-contract/messages'
  import { createViewportBaseGeometry } from './base-geometry'
  import { CAD_VIEWPORT_CONFIG } from './config'
  import { createFaceHighlightGeometry } from './face-highlight'
  import {
    createFaceHoverController,
    type FaceHoverController,
    type FaceHoverState,
  } from './face-hover'
  import { measureFaceAt } from './face-measure'
  import { readFaceTriangleRanges } from '../worker-client'
  import type { CadViewportTheme } from './theme'
  import { createViewportEdgeMaterial } from './edge-lines'
  import { ViewportEdgePreparation } from './edge-preparation'
  import {
    measureViewportGeometry,
    type ViewportGeometryTiming,
  } from './geometry-timing'

  type Props = {
    mesh: MeshSnapshot
    theme: CadViewportTheme
    materialColor?: string
    onPreparationTiming?: (timing: ViewportGeometryTiming) => void
    enableFaceHover?: boolean
    onFaceHover?: (hover: FaceHoverState | null) => void
  }

  let {
    mesh,
    theme,
    materialColor,
    onPreparationTiming,
    enableFaceHover = false,
    onFaceHover,
  }: Props = $props()

  function createGeometry(snapshot: MeshSnapshot): THREE.BufferGeometry {
    return measureViewportGeometry(
      'base-geometry',
      () => createViewportBaseGeometry(snapshot),
      onPreparationTiming,
    )
  }

  function createMaterial(color: string): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: CAD_VIEWPORT_CONFIG.modelEmissiveIntensity,
      metalness: 0.18,
      roughness: 0.42,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })
  }

  function createHighlightMaterial(color: string): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  }

  let geometry = $derived(createGeometry(mesh))
  let material = $derived(
    createMaterial(materialColor ?? CAD_VIEWPORT_CONFIG.modelColor),
  )
  let edgeGeometry = $state<THREE.EdgesGeometry | null>(null)
  let edgeMaterial = $derived(createViewportEdgeMaterial(theme.edge))
  let edgePreparation = new ViewportEdgePreparation({
    onTiming: (timing) => onPreparationTiming?.(timing),
  })

  let faceRanges = $derived(
    enableFaceHover ? readFaceTriangleRanges(mesh) : null,
  )
  let hoveredTriangleIndex = $state<number | null>(null)
  let highlightGeometry = $state<THREE.BufferGeometry | null>(null)
  let highlightMaterial = $derived(createHighlightMaterial(theme.faceHighlight))
  let controller: FaceHoverController | null = null

  $effect(() => {
    if (!enableFaceHover || !onFaceHover) return
    const faceHoverController = createFaceHoverController({
      measure: (faceIndex) => {
        if (!faceRanges) return null
        const measurement = measureFaceAt(mesh, faceRanges, faceIndex)
        return measurement?.bounds ?? null
      },
      onHoverChange: (hover) => {
        hoveredTriangleIndex = hover?.faceIndex ?? null
        onFaceHover(hover)
      },
    })
    controller = faceHoverController
    return () => {
      controller = null
      faceHoverController.dispose()
    }
  })

  function handlePointerMove(event: IntersectionEvent<PointerEvent>): void {
    controller?.handlePointerMove({
      faceIndex: typeof event.faceIndex === 'number' ? event.faceIndex : null,
      clientX: event.nativeEvent.clientX,
      clientY: event.nativeEvent.clientY,
      pointerType: event.nativeEvent.pointerType,
    })
  }

  function handlePointerLeave(): void {
    controller?.handlePointerLeave()
  }

  let faceHoverEventProps = $derived(
    enableFaceHover && faceRanges
      ? {
          onpointermove: handlePointerMove,
          onpointerleave: handlePointerLeave,
        }
      : {},
  )

  $effect(() => {
    const currentGeometry = geometry
    return () => currentGeometry.dispose()
  })

  $effect(() => {
    const currentMaterial = material
    return () => currentMaterial.dispose()
  })

  $effect(() => {
    const currentHighlightMaterial = highlightMaterial
    return () => currentHighlightMaterial.dispose()
  })

  $effect(() => {
    const currentGeometry = geometry
    edgePreparation.prepare(currentGeometry, mesh.triangleCount, (prepared) => {
      edgeGeometry = prepared
    })

    return () => {
      edgePreparation.dispose()
      edgeGeometry = null
    }
  })

  $effect(() => {
    const currentEdgeMaterial = edgeMaterial
    return () => currentEdgeMaterial.dispose()
  })

  $effect(() => {
    const triangle = hoveredTriangleIndex
    const ranges = faceRanges
    if (triangle === null || !ranges) {
      highlightGeometry = null
      return
    }
    const overlay = createFaceHighlightGeometry(mesh, ranges, triangle)
    highlightGeometry = overlay
    return () => {
      overlay?.dispose()
    }
  })
</script>

<T.Mesh {geometry} {material} dispose={false} {...faceHoverEventProps} />
{#if edgeGeometry}
  <T.LineSegments
    geometry={edgeGeometry}
    material={edgeMaterial}
    renderOrder={1}
    dispose={false}
  />
{/if}
{#if highlightGeometry}
  <T.Mesh
    geometry={highlightGeometry}
    material={highlightMaterial}
    renderOrder={2}
    dispose={false}
  />
{/if}
