# Proposal

## Why

`game-box` is now the card storage box of the catalog, but the seven card
size presets (Tarot, Standard TCG, Japanese small, Mini) still live on
`card-box`, which is being retired from the catalog. Every game-box user has
to type the card width and height by hand, and the same list of standard card
sizes has to survive the move to the new component.

## What Changes

- `game-box` declares exactly seven card size presets with the same ids, the
  same order and the same card sizes as the `card-box` set: Tarot 70×120,
  Standard TCG 63×88, Standard TCG sleeved 66×91, Japanese small 59×86,
  Japanese small sleeved 62×89, Mini American 41×63, Mini Euro 44×68.
- Every preset overrides only `cardWidth` and `cardHeight`.
- The preset labels use new translation keys `cad.presets.game-box.*`; the
  existing `cad.presets.card-box.*` keys are left untouched for the separate
  task that retires `card-box`.
- Applying a preset follows the existing preset mechanism, with one opt-in:
  the game-box definition asks for its presets to be merged onto the
  **current** parameters instead of the definition defaults, so applying a
  preset changes only the card width and height. The module list, every
  module field (type, card depth, die size, die count), the derived storage
  depth and the selected part stay as they are; the available parts depend on
  the module types, and a card size never changes them.
- If the new card size does not fit the current modules (a die tray that no
  longer holds its dice), the preset is not applied: the current parameters
  are kept, the defaults are never substituted for them, and a localized
  message (en and zh-Hant) tells the user that the preset does not fit.
- The shared preset mechanism gains one opt-in field on the model
  definition; every other component keeps merging its presets onto the
  definition defaults, exactly as before.
- The shared `component-parameter-presets` capability gains the resolution
  rule for that opt-in: a component may merge its presets onto the current
  parameters, a selected part that no longer exists is retried as the
  assembly, and a preset that does not fit is reported instead of applied.
- No change to `card-box` (code, spec, tests, translations), no change to the
  game-box geometry, ranges or defaults, and no new dependency.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-box`: add a card size preset requirement that declares the seven
  presets and the parameters a preset changes.
- `component-parameter-presets`: modify the preset resolution and validation
  requirement so a component definition can opt in to merging its presets
  onto the current parameters, with the part retry and the not-applicable
  notice. The component enumeration of that capability is left untouched.

## Impact

- Affects the game-box catalog definition
  (`src/features/cad/model-catalog/components/game-box.ts`) and the
  `cad.presets.game-box.*` translation keys in the `en` and `zh-Hant`
  message catalogs.
- Adds unit coverage that pins the seven presets (ids, order, sizes) and
  validates every preset against the game-box contract, a geometry test that
  builds the game-box parts at every preset, and a browser test for the
  preset buttons.
- The shared preset mechanism, the workspace controller, the parameter panel
  and the preset button row are reused unchanged; the panel renders the
  preset row for game-box through the existing `presets` lookup.
- `card-box` keeps its own presets, its own translation keys and its own
  tests until the separate retirement task removes them.
- No new runtime dependency, backend service, database migration or public
  API change.
