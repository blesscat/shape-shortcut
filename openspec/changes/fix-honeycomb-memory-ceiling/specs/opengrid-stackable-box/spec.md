## ADDED Requirements

### Requirement: Honeycomb quality inspection stays within the geometry engine memory ceiling

The stackable-box quality gate MUST bound the number of boolean operations it performs against the full honeycomb candidate: when inspecting a honeycomb-mode box, bottom-region and top-region measurements MUST be evaluated against pre-extracted regional sub-shapes of the candidate (small local sub-regions where a full band would still be too large) rather than each re-running a boolean operation against the full candidate. The set of quality checks, probe positions, and tolerances MUST remain unchanged, and a candidate that passes the existing checks MUST continue to pass unchanged. A stackable box whose honeycomb lattice fits the configured grid ranges (for example 5x8, about 1,500 cells) MUST complete generation, quality inspection, and STEP/STL export eligibility without exhausting the geometry engine memory ceiling.

#### Scenario: A large honeycomb box passes quality inspection

- **WHEN** a valid stackable box is generated with `honeycombMode=true` at a large grid size such as 5x8 with any `cornerSeatMode` selection
- **THEN** generation MUST complete with all existing quality checks passing
- **AND** the resulting geometry MUST satisfy every existing honeycomb protection, interface, bounds, and export requirement

#### Scenario: Regional measurement preserves verdicts

- **WHEN** any honeycomb or solid box candidate is inspected
- **THEN** each protected-feature, interface, hole, seam, stacking, and bounds check MUST produce the same accept or reject verdict as before the measurement strategy change
- **AND** the number of boolean operations executed against the full candidate during quality inspection MUST stay within a small bounded count independent of the lattice cell count

#### Scenario: Raw engine exceptions are diagnosable

- **WHEN** the geometry engine raises a non-Error exception (a raw value crossing the WASM boundary) during box generation or quality inspection
- **THEN** the surfaced error MUST carry the engine failure as a diagnosable typed message instead of being silently rewrapped as an unrelated geometry failure
- **AND** the user-visible diagnostic MUST remain recoverable with the last valid committed model preserved
