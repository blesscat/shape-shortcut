## 1. Bound the inputs and define the panel profile contract

- [x] 1.1 Add a pure box-honeycomb budget estimator built from the existing cell-count calculation, with documented target coverage for 7x7 boxes at heights 60 and 100 and a deterministic over-budget result; verify it with behavior-focused unit tests
- [x] 1.2 Add the planar panel profile types and builders for an expanded outer boundary plus clipped inner opening polygons, including validation for empty, touching, or overlapping wires; verify boundary, stagger, and side-opening keep-out fixtures with unit tests
- [x] 1.3 Add the stable honeycomb memory-limit diagnostic and route it through the existing Worker error/last-valid-model path; verify an over-budget request reports the specific recoverable failure and does not replace the previously committed candidate

## 2. Replace side-wall per-cell cuts with bounded panel operations

- [x] 2.1 Add a single-extrusion side panel cutter from the planar profile and verify its volume, bounds, and connected-rib behavior against representative eligible panels
- [x] 2.2 Replace the stackable-box side honeycomb path with sequential `+X`, `-X`, `+Y`, and `-Y` panel operations, explicitly releasing each slot, profile, fragment, and replacement before advancing; verify cancellation and Boolean-failure cleanup with ownership tests
- [x] 2.3 Preserve the exact host geometry for rounded frames, rails, lower transitions, and active side-opening bridges while replacing a panel; verify opening direction/depth/bottom/angle, one-solid validity, and protected-boundary measurements against the non-honeycomb reference
- [x] 2.4 Retain the existing side cell derivation and characterize clipped boundary and small-panel fallback behavior without retaining a production array of native per-cell solids; verify affected unit and worker regression tests

## 3. Replace bottom-floor per-cell cuts with a protected panel operation

- [x] 3.1 Build the bottom-floor planar lattice profile and bounded extrusion from the existing smaller-cell polygon derivation; verify complete and clipped floor openings, continuous ribs, and both-face visibility in unit geometry tests
- [x] 3.2 Preserve sockets, ordinary holes, circular safety rings, seams, guides, base-plate supports, thin-shell transitions, and corner-seat structures by retaining exact host protected fragments or reapplying the authoritative feature operations; verify centers, diameters, depths, through/open state, and safety clearances against solid-mode references
- [x] 3.3 Integrate bottom construction before the side panels so the host has the fewest faces for the floor cut, with bounded temporary ownership and exceptional-cell handling for invalid or protected profiles; verify normal, base-plate, thin-shell, and supported corner-seat worker cases remain one exportable solid

## 4. Make honeycomb quality inspection memory-bounded

- [x] 4.1 Refactor repeated full-candidate volume probes to use cached measurement regions and localized chips when the probe is fully contained, while retaining full-candidate validity, bounds, face, hole, opening, and interface checks; verify quality decisions and diagnostics with behavior-focused tests
- [x] 4.2 Add isolated-process stress coverage for 7x7 honeycomb boxes at heights 60 and 100 across every supported corner-seat mode, recording successful generation and export eligibility without reusing a polluted native process
- [x] 4.3 Add regression coverage for an over-budget tall input and confirm it fails before expensive lattice construction, preserves the last valid model, and uses the normalized honeycomb diagnostic

## 5. Complete regression and release gates

- [x] 5.1 Run the affected unit and Worker test mappings and fix any protected-feature, volume, interface, export, cancellation, or ownership regressions
- [x] 5.2 Run type-checking and formatting checks, then run the branch-scoped test command required by repository guidance; verify all required checks are green
- [x] 5.3 Re-read the proposal, delta spec, design, and completed task list, and verify the final diff changes only the scoped stackable-box implementation, tests, and OpenSpec artifacts
