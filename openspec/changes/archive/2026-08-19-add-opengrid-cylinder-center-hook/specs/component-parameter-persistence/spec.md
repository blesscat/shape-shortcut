## MODIFIED Requirements

### Requirement: Stackable-cylinder parameters are persisted independently

The versioned browser persistence MUST store valid
`opengrid-stackable-cylinder` parameters under that stable model ID. The entry
MUST contain typed integer `diameter` and `height`, typed cylinder enum
`bottomSeatMode` including the cylinder-only `center-hook` value, the existing
profile flags, and all opening values accepted by the current validator. It
MUST remain independent from the board, box, and all other component entries.
Legacy `bottomHolesEnabled=false/true` values MUST migrate to
`bottomSeatMode='none'/'hole'`; missing legacy values MUST migrate to
`'hole'`. Invalid or incomplete input MUST NOT overwrite the last accepted
entry. The shared Box seat enum MUST remain limited to `none`, `hole`, and
`integrated`.

#### Scenario: Restore valid cylinder seat mode

- **WHEN** persistence contains a valid cylinder entry with any supported seat
  mode, including `center-hook`
- **THEN** the controls MUST display the saved typed seat selection
- **AND** the first generation MUST use that selection

#### Scenario: Restore legacy cylinder hole state

- **WHEN** persistence contains a valid legacy cylinder entry with
  `bottomHolesEnabled=false` or `true`
- **THEN** hydration MUST use `bottomSeatMode='none'` or `'hole'`
- **AND** a missing legacy flag MUST use `bottomSeatMode='hole'`
- **AND** opening defaults MUST continue to be restored as before

#### Scenario: Persist a valid cylinder update

- **WHEN** a cylinder snapshot passes validation
- **THEN** persistence MUST update only the cylinder entry
- **AND** `bottomSeatMode` MUST be stored as its typed cylinder enum value
- **AND** the old `bottomHolesEnabled` field MUST NOT be written

#### Scenario: Invalid cylinder input does not overwrite persistence

- **WHEN** an invalid seat mode, incomplete snapshot, or invalid cylinder field
  is supplied
- **THEN** the previous accepted cylinder entry MUST remain unchanged
- **AND** the invalid snapshot MUST NOT be used for initialization or sent to
  the Worker
