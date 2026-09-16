## 1. Contract: OpenConnect Organizer (opengrid-openconnect-organizer)

- [x] 1.1 Extend the shape union and `OPENGRID_OPENCONNECT_ORGANIZER_SHAPES` with `rectangle` and `ellipse`; add `holeWidth`, `holeHeight`, `holeCornerRadius` to the parameter type, `PARAMETER_KEYS`, `*_CONFIGURATION` bounds/defaults, and `*_DEFAULT_PARAMETERS` (width/height reuse the diameter bounds 1-300 mm, defaults 20/20, radius default 0)
- [x] 1.2 Extend validation: new numeric ranges plus the cross-field rule `0 <= holeCornerRadius <= min(holeWidth, holeHeight) / 2` enforced for every selected shape; keep `hasExactKeys` strict
- [x] 1.3 Extend the envelope helper so `rectangle` and `ellipse` return exactly `{x: holeWidth, y: holeHeight}`; confirm pitch, body derivation, connector occupancy, and the 500 mm workspace check flow through unchanged for the new shapes
- [x] 1.4 Update `fileStem` to emit `rectangle-w<holeWidth>-h<holeHeight>-r<holeCornerRadius>` / `ellipse-w<holeWidth>-h<holeHeight>` in place of the `d` token, leaving existing shape tokens unchanged
- [x] 1.5 Contract unit tests: envelope/pitch/body math for the new shapes, radius bounds and cross-field rejection (including radius invalid while shape is `circle`), workspace-limit rejection, filename patterns, exact default snapshot

## 2. Contract: Organizer Box (opengrid-organizer-box)

- [x] 2.1 Mirror tasks 1.1-1.4 in `opengrid-organizer-box.ts` (shape union, parameter keys, configuration bounds/defaults, envelope helper, validation, file stem)
- [x] 2.2 Contract unit tests mirroring 1.5, plus box-specific interactions (new shapes compose with `boxMode`/`cornerSeatMode`, stackable wall minimum, stacking clearance unchanged by shape)

## 3. Hydration and Worker plumbing

- [x] 3.1 Add the three new fields to both raw-to-typed hydrators in `src/components/cad/workspace/validation.ts` (required-field lists, parsing, typed output) and extend the shared parameter key unions they rely on
- [x] 3.2 Verify the worker dispatch needs no separate parameter-key lists (it validates via the contract type guards, which now include the new fields; the shared per-model raw-key lists live in `src/components/cad/workspace/validation.ts` and were extended in 3.1)
- [x] 3.3 Unit tests: a persisted snapshot missing any new field falls back to that component's defaults through the malformed-entry path; accepted snapshots round-trip raw -> typed -> raw losslessly

## 4. CAD kernel: builders and quality

- [x] 4.1 Spike: in a scratch kernel unit test, extrude one true ellipse (replicad ellipse sketch) and one rounded rectangle; record the reported per-face geometry types and face counts (rounded rectangle with r>0: 4 planes + 4 corner cylinders; ellipse: observe actual type). Record findings in this change's design notes if they differ from the design assumptions
- [x] 4.2 OpenConnect Organizer builder: branch the cavity cutter for `rectangle` (`sketchRoundedRectangle`, plain rectangle when radius is 0) and `ellipse` (analytic ellipse sketch), extruded to `holeDepth` like existing cutters
- [x] 4.3 Organizer Box builder: same cutter branches, respecting the box's body-interface datum and depth handling
- [x] 4.4 Both `quality.ts` files: expected face counts / geometry types for the new shapes from the 4.1 spike (rounded rectangle at r=0 vs r>0), leaving circle and polygon branches untouched
- [x] 4.5 Kernel unit tests: new-shape results are single watertight solids with the expected envelope; `bottomThickness=0` through-cut for the OpenConnect organizer; ellipse produces an analytic (non-faceted) section; bounds tests at the w/h extremes (e.g. 300 x 1)

## 5. Catalog, panels, and i18n

- [x] 5.1 Add i18n entries: shape options 長方形 (`rectangle`) and 橢圓形 (`ellipse`) plus parameter labels for hole width, hole height, and corner radius, in every supported locale following the existing `panel.organizerBox.shape.*` and `parameter.*` keys
- [x] 5.2 Extend both catalog `parameterSchema`s with the three numeric fields (with min/max/step/axis) and verify the locale route pages that summarize parameters still render correctly
- [x] 5.3 OpenConnect Organizer panel: new shape options and conditional field visibility (diameter for existing shapes; width/height for `rectangle`/`ellipse`; radius only for `rectangle`), sharing existing controls and linked-spacing behavior
- [x] 5.4 Organizer Box panel: same conditional shape-driven fields
- [x] 5.5 E2E specs for both routes: selecting each new shape swaps the visible size fields, a valid generation commits, and the export filename matches the new token pattern

## 6. Verification

- [x] 6.1 Run scoped unit/worker coverage via `pnpm test:changed` (or `pnpm test:branch`) and fix findings
- [x] 6.2 Run only the e2e specs covering the two organizer routes
- [x] 6.3 Run lint and typecheck
- [x] 6.4 Naming/catalog check: no new component added - confirm every existing model ID, build key, route slug, catalog and kernel directory is unchanged, and both catalog entries still resolve through `getModelDefinition`
