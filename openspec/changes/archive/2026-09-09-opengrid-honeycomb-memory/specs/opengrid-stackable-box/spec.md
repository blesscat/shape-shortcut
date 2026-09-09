## MODIFIED Requirements

### Requirement: Honeycomb material-saving box mode

The existing `opengrid-stackable-box` model MUST expose a `honeycombMode` boolean profile flag. `honeycombMode` MUST default to `false`, MUST be accepted in legacy hydration as `false` when absent, and MUST preserve the existing model ID `opengrid-stackable-box`, route, footprint, height semantics, normal/base-plate/thin-shell mode semantics, opening fields, bottom-hole fields, preview lifecycle, and STEP/STL export workflow. The parameter panel MUST expose the flag as `省料模式（六角鏤空）` without replacing the existing mutually exclusive box-mode choices. When enabled, the profile MUST be the Hex Mesh style: complete staggered hexagonal openings MUST be separated by a continuous printable rib network; the profile MUST NOT claim to implement the separate vertical-groove Ribbed style. For a valid honeycomb candidate within the supported geometry-engine budget, generation MUST complete without requiring unbounded in-flight geometry state; if the requested candidate cannot fit that budget, generation MUST fail diagnostically before committing a partial candidate.

#### Scenario: Legacy and default snapshots keep the solid profile

- **WHEN** a persisted or imported stackable-box snapshot does not contain `honeycombMode`
- **THEN** hydration and validation MUST normalize `honeycombMode=false`
- **AND** the generated geometry and existing export identity MUST remain the same as the corresponding normal, base-plate, or thin-shell profile

#### Scenario: The user enables Hex Mesh mode

- **WHEN** a valid stackable-box snapshot has `honeycombMode=true`
- **THEN** the panel MUST retain the existing X/Y, height, bottom-hole, mode, and four-direction opening controls
- **AND** the normalized Worker snapshot MUST contain the typed boolean `honeycombMode=true`
- **AND** the model MUST retain its existing `opengrid-stackable-box` identity and route
- **AND** the generated eligible panels MUST use a staggered, point-up Hex Mesh rather than isolated, widely separated hex cutouts

#### Scenario: Box side faces use a continuous printable Hex Mesh

- **WHEN** a valid box has `honeycombMode=true` and an eligible side panel is large enough for a complete cell
- **THEN** the continuous side-wall material in that panel MUST be replaced by connected hexagonal openings separated by continuous ribs
- **AND** neighboring openings MUST use the configured printable rib thickness rather than the legacy 14 mm cell-center spacing
- **AND** the default 20 mm-height profile MUST show at least two staggered rows on each eligible side panel
- **AND** the outer perimeter frame, rounded corners, top rim or rail, lower structural transition, and all active side-opening boundary bridges MUST remain solid
- **AND** the lattice MUST extend to each protected side-panel boundary, with intersecting cells clipped at the perimeter frame and active side-opening bridge instead of discarded wholesale
- **AND** the usable side-wall area outside those protected regions MUST NOT contain avoidable broad solid bands caused only by whole-cell rejection
- **AND** the lattice MUST remain within the existing X/Y/Z envelope and MUST NOT change the requested clear internal height

#### Scenario: Box bottom faces use protected Hex Mesh openings

- **WHEN** a valid box has `honeycombMode=true` and an eligible bottom-floor region is large enough for a complete cell
- **THEN** the eligible bottom-floor material MUST contain connected hexagonal openings and ribs
- **AND** bottom-floor hexagonal openings MUST use a smaller cell size than the side-wall openings
- **AND** eligible openings in normal, base-plate, and thin-shell profiles MUST pass through the active floor so the Hex Mesh is visible from both floor faces
- **AND** the floor lattice MUST extend to the protected outer frame, with intersecting boundary cells clipped at the frame instead of discarded wholesale
- **AND** the outer bottom frame, corner structural regions, bottom guide or base-plate support, grid-seam reliefs, and active floor transitions MUST remain solid
- **AND** every existing corner socket and ordinary bottom-grid hole MUST retain its normalized center, diameter, section depth, and through/open state
- **AND** every existing bottom hole MUST retain a continuous circular safety ring extending 2 mm beyond its maximum opening radius
- **AND** hexagonal cells intersecting a hole safety ring MUST be clipped to the ring instead of being discarded wholesale, and no opening may cut the ring
- **AND** the usable floor outside protected frames, seams, transitions, and hole rings MUST NOT contain avoidable broad solid bands caused only by whole-cell rejection

#### Scenario: Existing box interfaces remain unchanged in honeycomb mode

- **WHEN** a valid honeycomb box is generated with any supported bottom-hole selection, floor mode, and zero or more valid side openings
- **THEN** all selected OpenGrid Snap mounting sockets and ordinary bottom holes MUST remain at their existing positions and profiles
- **AND** the normal-mode box-to-box sliding guide, base-plate printable base, or thin-shell non-stackable profile MUST retain its existing contract
- **AND** every enabled side opening MUST retain its requested direction, bottom, depth, angle, and neighboring structural separation
- **AND** the result MUST remain one valid non-empty solid suitable for preview, STEP export, and STL export

#### Scenario: Small box panels fall back without destructive cuts

- **WHEN** `honeycombMode=true` but a side or bottom region cannot contain a complete hexagonal cell after its edge and protected-region clearances are applied
- **THEN** that region MUST remain solid or use only complete safe cells
- **AND** generation MUST remain valid
- **AND** the builder MUST NOT enlarge, move, merge, or remove any existing hole, opening, or interface feature merely to fit a lattice cell
- **AND** thin-shell mode alone MUST NOT force a no-cell fallback when complete protected floor cells fit
- **AND** a box-floor boundary MAY use a clipped partial cell when the retained frame and safety-ring constraints remain satisfied
- **AND** a box side-panel or side-opening boundary MAY use a clipped partial cell when every retained frame and structural-bridge constraint remains satisfied

#### Scenario: Supported tall boxes complete within the geometry budget

- **WHEN** a normal stackable box has `x=7`, `y=7`, `height=60` or `height=100`, `honeycombMode=true`, and no invalid protected-feature inputs
- **THEN** generation MUST complete with a valid candidate within the fixed geometry-engine memory ceiling
- **AND** the candidate MUST remain eligible for preview and STEP/STL export
- **AND** all existing corner-seat modes MUST preserve their supported geometry and protected interfaces

#### Scenario: A candidate over the geometry budget fails before partial commit

- **WHEN** a valid honeycomb box is estimated to exceed the fixed geometry-engine memory budget
- **THEN** the Worker MUST report a diagnosable honeycomb generation failure before committing a partial candidate
- **AND** the last valid committed model MUST remain available
- **AND** the failure path MUST not require completing the full expensive lattice construction before reporting the limit

#### Scenario: Honeycomb box output is distinguishable and materially lighter

- **WHEN** a valid honeycomb box with at least one eligible lattice panel is exported
- **THEN** its STEP and STL filenames MUST identify the honeycomb profile with a deterministic `honeycomb` suffix
- **AND** its B-Rep volume MUST be lower than the otherwise identical non-honeycomb profile within geometry tolerance
- **AND** the existing filename identity MUST remain unchanged when `honeycombMode=false`

### Requirement: Honeycomb box quality protection

The stackable-box quality gate MUST inspect honeycomb-mode candidates separately from solid profiles. It MUST reject a candidate that changes any protected hole profile, cuts a protected interface or opening boundary, creates an invalid or multi-solid result, exceeds the existing bounds, or fails preview/export eligibility. The quality report MUST identify whether honeycomb mode was enabled and MUST distinguish a valid no-cell fallback from a failed lattice construction. Memory-bounded construction and inspection MUST NOT weaken any protected-feature, validity, or export decision.

#### Scenario: Honeycomb quality rejects protected-feature damage

- **WHEN** a honeycomb candidate changes a socket center, ordinary bottom-hole center, hole diameter, stepped section, floor-support probe, stacking probe, or enabled side-opening boundary
- **THEN** the candidate MUST be rejected with a diagnosable honeycomb or protected-feature error
- **AND** the last valid committed model MUST remain available

#### Scenario: Honeycomb quality accepts a protected valid result

- **WHEN** a honeycomb candidate contains only safe complete cells and passes all existing box geometry, hole, opening, interface, and export checks
- **THEN** the candidate MUST be eligible for commit, preview, STEP export, and STL export

#### Scenario: Quality checks remain valid for supported tall boxes

- **WHEN** a generated 7x7 honeycomb box at height 60 or 100 is inspected in each supported corner-seat mode
- **THEN** the quality gate MUST apply the same protected-feature decisions as the corresponding existing honeycomb checks
- **AND** successful inspection MUST leave a single valid exportable solid
