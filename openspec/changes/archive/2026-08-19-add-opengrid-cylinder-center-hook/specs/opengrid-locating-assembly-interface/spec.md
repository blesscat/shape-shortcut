## MODIFIED Requirements

### Requirement: OpenGrid locating model descriptions

The system MUST ensure that the OpenGrid stackable-box panel and the shared
seat choices of the OpenGrid stackable-cylinder panel describe the exact labels
`無角座`, `角座孔`, and `內建角座`. The cylinder panel MUST additionally expose
the cylinder-only `中心卡勾` choice and describe it as a centered rectangular
quarter-turn hook for the Snap center-remover opening. The integrated
description MUST communicate that the selected positions receive a solid Ø5
mm round seat extending 3 mm outward from the bottom. Existing model display
names, OpenGrid identities, and Box seat behavior MUST remain unchanged.

#### Scenario: Integrated seat description is visible

- **WHEN** the user selects `內建角座` in either OpenGrid stackable model
- **THEN** the panel MUST identify the result as a Ø5 mm, 3 mm-high outward
  round seat
- **AND** the panel MUST continue to show the other two shared mutually
  exclusive choices

#### Scenario: Cylinder center-hook description is visible

- **WHEN** the user selects `中心卡勾` in the OpenGrid stackable-cylinder panel
- **THEN** the panel MUST identify the result as a centered rectangular hook
  intended for the Snap center-remover opening and 90-degree capture
- **AND** the Box panel MUST NOT show the cylinder-only choice
