## Context

See `proposal.md` for the user-visible motivation and `specs/opengrid-stackable-box/spec.md` for the preserved geometry contract. The current stackable-box builder first creates a full shell with stacking, socket, and opening geometry, then creates a native 3D cutter for every honeycomb cell. It retains all side cutters before cutting and retains all protected bottom batches before applying them to the box. The quality gate then performs several measurements against the already face-heavy candidate.

The geometry engine is OpenCascade compiled to a fixed wasm32 heap. Deleting a native shape releases ownership for reuse but does not lower the process high-water mark, so the design must reduce simultaneous native topology and avoid repeated Boolean operations whose large argument is the complete honeycomb candidate.

## Goals / Non-Goals

**Goals:**

- Keep the existing `opengrid-stackable-box` model identity, parameter semantics, modes, protected features, and export behavior.
- Make the box honeycomb path derive one panel family at a time and keep native intermediate ownership explicit.
- Represent eligible side and bottom lattice openings as planar profiles with one outer panel boundary and inner opening wires, then extrude each panel once.
- Preserve exact protected host geometry where a panel overlaps sockets, ordinary holes, seams, side openings, rails, or transitions instead of approximating those features in 2D.
- Keep quality checks behavior-focused and memory-bounded, with separate-process stress coverage for tall boxes.
- Keep STL export memory-bounded for high-face B-Reps by encoding the already face-wise tessellated triangles instead of invoking a second global native tessellation.
- Provide a deterministic preflight failure for inputs that exceed the measured practical geometry budget.

**Non-Goals:**

- Do not raise the wasm heap limit, rebuild OpenCascade, or change the vendored CAD engine.
- Do not change stackable-cylinder or Open Shelf honeycomb construction in this change.
- Do not change cell radius, rib thickness, footprint, height meaning, protected clearances, or user-facing model identity.
- Do not promise that the existing maximum height of 500 mm fits the fixed engine budget; over-budget inputs must fail before a partial candidate is committed.

## Decisions

### 1. Build hole-only panel cutters instead of retaining per-cell cutters

For each eligible side panel, derive the same clipped cell polygons currently used by the honeycomb contract. Build a planar profile whose outer loop is slightly expanded into the protected frame and whose inner loops are those clipped polygons. Extrude that face through the wall thickness with a small overlap, then subtract the profile from a matching rectangular slot. Enabled side openings are removed from that slot by one exact rectangular keep-out mask that spans the opening bridge and transition clearance; cells crossing the mask remain single hexagonal wires instead of being split into touching fragments. The resulting hole-only panel cutter contains the requested openings without replacing the rounded host wall or its boundary features.

The bottom uses the same pattern with the smaller floor lattice. Its rectangular slot is cut by the exact existing socket, ordinary-hole, and seam protectors before the panel profile is subtracted. This preserves circular safety rings, stepped holes, seam reliefs, guides, and mode-specific floor structure without approximating circles as polygons.

The bounded panel cutters are combined per panel family and applied to the host immediately: the bottom family is cut first while the host has the fewest faces, followed by `+X`, `-X`, `+Y`, and `-Y`. Each family is released before the next one is built. This keeps the native peak lower across repeated generations without creating one native solid per cell. It is also preferred over rebuilding the entire rounded shell because the existing shell, rail, and feature builders remain the source of truth for non-lattice geometry.

### 2. Process panel batches with explicit ownership

The box builder requests the bottom first and then each side in (`+X`, `-X`, `+Y`, `-Y`) order, all in bounded batches. A batch owns its slot, planar profile, protectors, and hole-only cutter until that cutter has been added to its family compound; every temporary is deleted on success, cancellation, and failure. The production path retains only a small number of panel cutters, never an array of native per-cell solids, and releases each family before starting the next host cut.

The existing per-cell cutter helpers remain available for geometry characterization tests and for unaffected cylinder/shelf builders. Their production use for the stackable box is replaced by panel construction, so the shared lattice derivation continues to be tested independently from the new assembly path.

### 3. Use the public planar profile model for many openings

The panel profile will use Replicad's compound-sketch semantics: one outer sketch plus one wire for each opening polygon, followed by a single extrusion. Polygon groups created by side opening keep-outs become multiple inner wires. Boundary cells are clipped using the existing 2D derivation and the expanded outer panel boundary, so the profile remains a valid face while retaining the specified partial openings.

If a protected region would make an inner wire invalid or overlapping, the exact protected slot mask is retained while the affected clipped cell remains one validated inner wire. A conservative fallback that silently discards a required clipped cell is not allowed.

### 4. Keep the existing feature geometry as the protection authority

Before removing a host panel slot, collect the portions of the current host that occupy protected masks. Side masks cover enabled opening bridges and nearby structural boundaries. Bottom masks cover sockets, ordinary-hole safety rings, grid seams, guide/support transitions, and any mode-specific floor protection. The replacement panel is cut from a slot that excludes these exact protectors, so the new lattice path cannot change protected centers, diameters, stepped sections, or support profiles.

### 5. Bound quality inspection separately from construction

Honeycomb quality checks keep all existing validity, face, bounds, hole, opening, and interface decisions for the low-cell path. Volume probes that would repeatedly Boolean against the full candidate use cached bottom/top measurement regions and small local chips where the probe is fully contained. For high-cell candidates, the builder first runs the complete existing interface gate on the solid host, before lattice faces are added; exact panel masks then preserve those checked host regions. It also captures a face-only baseline for the host's top rail, bottom guide, active floor, and thin-shell transitions, then compares those markers on the final lattice candidate. The final gate keeps full-candidate validity, bounds, solid-count, opening-face, hole-face, integrated-seat, and lattice-face checks and avoids repeated full-shape volume probes that exceed the fixed wasm32 heap. Face-iteration checks continue to inspect the candidate itself. If a region or chip cannot be built inside the same budget, the operation reports a normalized geometry failure instead of retrying the full candidate repeatedly.

### 6. Keep high-face STL export independent from native global remeshing

The generated candidate already has a face-wise mesh path for large B-Reps. STL export uses that path for native shapes and writes the binary STL records directly from its triangles, so export does not invoke `Shape.blobSTL()`, which remeshes the whole candidate globally. Lightweight test doubles and non-native export adapters retain the existing Blob path.

### 7. Add a conservative, pure preflight budget

The existing pure honeycomb cell counter becomes the input to a box-specific practical budget check. The budget is calibrated from isolated-process measurements so that 7x7 boxes at heights 60 and 100 are required targets; inputs above the measured safe range fail before native lattice construction with a stable honeycomb memory-limit code. The check is not used for solid mode and does not alter the normal parameter range or persisted snapshot shape.

### 8. Validate memory behavior in isolated processes

Native OpenCascade memory is process-wide and high-water based. Stress tests therefore run tall honeycomb cases in separate worker/test processes, record explicit success or failure and elapsed time, and never infer a pass from a later case in a polluted process. Unit tests continue to validate polygon, profile, protected-feature, and ownership behavior without requiring the full stress matrix.

## Risks / Trade-offs

- [A planar panel face rejects a clipped boundary or split opening polygon] → Expand the panel boundary, validate every wire before extrusion, and retain a bounded legacy cutter path for exceptional cells; add boundary and opening-keepout fixtures.
- [Replacing a slot changes the existing rounded shell or creates a multi-solid result] → Keep slots inside the protected frame, overlap the replacement into the host, use the existing shell as the source of truth, and require one-solid/B-Rep/bounds checks after every panel family.
- [A protected island fills or alters an existing stepped hole] → Preserve the exact host intersection or rerun the existing feature operation, then compare hole center, diameter, depth, and through/open state against the non-honeycomb reference.
- [The bottom floor remains the memory bottleneck] → Build it as one panel family with no retained per-cell 3D array; keep exceptional protected-cell operations bounded and measure construction and quality peaks independently.
- [A conservative budget rejects a size that could fit] → Keep the threshold centralized and observable, document the accepted 7x7 height targets, and adjust only from isolated-process benchmark evidence.
- [Panel topology changes face counts used by quality checks] → Preserve the decisions rather than the implementation topology, add report parity and interface probes, and treat any protected-feature difference as a failure.

## Migration Plan

No persisted-data migration is required. The existing `honeycombMode` snapshot field and `opengrid-stackable-box` identity remain unchanged. Deploy the new builder and its tests together; over-budget honeycomb candidates return the existing recoverable Worker failure path and do not replace the last valid preview. Rollback is a source revert of the change branch.
