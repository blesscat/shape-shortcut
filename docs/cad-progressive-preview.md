# Catalog progressive previews

Every `ModelDefinition` requires `simplifiedPreview(parameters)`. The shared
workspace validates and normalizes the input before calling it. There is no
model-ID allowlist or workspace opt-in. This includes chooser-hidden models and
fixed STEP assets. Playground's multi-instance assembly remains on its existing
committed-model pipeline.

A provider returns `PreviewSolid` polygon extrusion descriptions in the same
coordinate frame as the exact exported model. Keep the provider synchronous,
CAD-free and independent of asset loading. Use the pure primitives in
`src/features/cad/progressive-preview/description.ts` and existing parameter
layout helpers. Do not import Three.js, Worker builders, B-Rep objects or export
buffers into catalog definitions. `geometry.ts` materializes and disposes the
Three.js resources centrally.

When adding a model:

1. Implement a provider and register it in the required `simplifiedPreview`
   field. Preserve footprint, height, orientation, major openings, repeated
   pieces and recognizable silhouette. A universal bounds box is not a suitable
   substitute for a hollow container or grid.
2. Use fixed low tessellation and per-cell extrusions for repeated openings.
   Fine honeycomb, fillets, lettering and precision mating details can wait for
   the exact model. Avoid a second CAD build or asynchronous preview assets.
3. Add behavioral tests for distinctive shape, parameter edits and unusual
   orientations. The catalog-wide unit and held-WASM browser tests automatically
   include the new registration. Check preview bounds against the authored frame.
4. Verify an exact replacement without camera reset and disabled export before
   the successful latest generation commits.

The selector owns only provisional display state. Invalid input retains the last
valid preview with a localized label; build failure keeps the preview with an
error label. The exact model alone controls exports and measurements. Simplified
geometry has no B-Rep face identities or committed dimension annotations.

Current approximations: boards retain their grid openings; honeycomb panels are
solid; snaps use stepped caps; fixed snap remover retains its T silhouette;
labels omit artwork; pillars omit mating details; dividers retain their arm plan;
shelves retain tiers and compartments; containers retain floors and cavities.
