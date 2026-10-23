## Purpose

Give users an interactive, clearly provisional view of current model proportions while expensive exact CAD generation runs, without weakening commit or export correctness.

## Requirements

### Requirement: Parameter-derived simplified geometry

The component workspaces for `opengrid-stackable-box`, `opengrid-stackable-cylinder`, and `opengrid-organizer-box` MUST display a simplified model from valid current parameters before exact generation completes, including during engine initialization. The display MUST represent the body footprint, height, open interior and floor presence; organizer cavities MUST reflect count, placement, and selected basic shape. Honeycomb holes, fillets, side cutouts, sockets and precision mating details MAY be omitted. The display MUST remain lightweight and independent of exact CAD generation. Other models and playground MUST retain their existing behavior.

#### Scenario: First load
- **WHEN** a supported component initializes with valid parameters while the CAD engine is still loading
- **THEN** a recognizable simplified shape MUST be visible and rotatable/zoomable without waiting for B-Rep construction
- **AND** it MUST have a visible localized simplified-preview label

#### Scenario: Parameter edit
- **WHEN** valid dimensions, floor mode, or organizer cavity layout change
- **THEN** the simplified display MUST reflect the new values while exact generation remains pending
- **AND** the previous committed model MUST NOT be mistaken for the new parameter shape

### Requirement: Provisional display lifecycle

The simplified display MUST be separate from committed model state and export eligibility. Only the latest validated committed result MUST replace it. Failure MUST retain the simplified shape with an explicit error indication. Invalid input MUST NOT generate new geometry and MUST label any retained simplified shape as belonging to the last valid input. Retry MUST preserve the view. Replaced display resources MUST be released.

#### Scenario: Successful replacement
- **WHEN** the latest generation commits successfully
- **THEN** its exact geometry MUST replace the simplified display without resetting camera position, target or zoom
- **AND** committed dimensions and export eligibility MUST resume through the existing lifecycle

#### Scenario: Invalid input and recovery
- **WHEN** an invalid input follows a valid simplified display
- **THEN** the last valid display MUST remain explicitly provisional and invalid, with export disabled
- **AND** a subsequent valid input MUST replace it with the new simplified shape

#### Scenario: Failure and stale responses
- **WHEN** generation fails or an obsolete Worker sends a late result
- **THEN** failure MUST show a persistent error indication beside the retained simplified display
- **AND** obsolete results MUST NOT replace the current display or enable export

### Requirement: Bounded display cost and verification

Simplified previews MUST NOT invoke an additional exact CAD build or alter existing B-Rep, quality validation or export precision. Verification MUST record simplified-display latency separately from full generation time for representative supported models, including a honeycomb fixture, and report any observed end-to-end overhead. Tests MUST prove visibility before CAD completion, latest-input replacement, and export gating.

#### Scenario: Independent preview cost
- **WHEN** a representative supported model is generated with simplified display enabled
- **THEN** only the existing exact generation request MUST be issued
- **AND** recorded preview and completion timings MUST distinguish early visual feedback from final readiness
