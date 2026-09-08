## ADDED Requirements

### Requirement: Open Shelf honeycomb fails fast above the engine memory ceiling

Open Shelf honeycomb generation MUST estimate the deterministic lattice cell count from the validated parameters before performing any geometry work. When the estimated count exceeds a declared engine memory limit, generation MUST fail fast with the stable error code `OPENGRID_HONEYCOMB_MEMORY_LIMIT` mapped to a localized diagnostic that names the saving-mode limit and suggests reducing the footprint or disabling the saving mode. When the estimated count is within the limit, generation MUST proceed unchanged. The limit MUST NOT change any geometry: sizes within the limit MUST produce the same result as before, and the solid (non-honeycomb) profile MUST never be subject to the limit.

#### Scenario: An oversized honeycomb shelf fails fast with an actionable diagnostic

- **WHEN** a valid Open Shelf snapshot enables `honeycombMode=true` with an estimated lattice cell count above the declared engine memory limit
- **THEN** generation MUST reject the candidate before any geometry work starts
- **AND** the error MUST expose the stable `OPENGRID_HONEYCOMB_MEMORY_LIMIT` code
- **AND** the user-visible diagnostic MUST be localized and MUST suggest reducing the footprint or disabling the saving mode

#### Scenario: Sizes within the limit keep their existing behavior

- **WHEN** a valid Open Shelf enables `honeycombMode=true` with an estimated cell count within the limit
- **THEN** generation MUST run the existing lattice derivation, quality checks, and exports unchanged
- **AND** the declared limit MUST NOT depend on the UI locale

#### Scenario: The solid profile is never limited

- **WHEN** a valid Open Shelf of any supported size has `honeycombMode=false`
- **THEN** the memory-limit check MUST NOT run
- **AND** generation MUST follow the existing solid-profile contract
