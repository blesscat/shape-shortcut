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
- Applying a preset follows the existing preset mechanism: the overrides are
  merged onto the component's `defaultParameters` and the merged set must
  pass the game-box validator. Because the game-box defaults own every
  parameter, applying a preset therefore sets the card size and resets
  everything else to those defaults — the selected part returns to
  `assembly`, the module list returns to the single default `cards` module
  (module 1, card depth 60 mm), modules 2 to 6 return to `none`, the die
  size returns to 16 mm, the die count returns to 9, and the derived storage
  depth returns to 63 mm.
- No change to `card-box` (code, spec, tests, translations), no change to the
  game-box geometry, ranges or defaults, no change to the shared preset
  mechanism and no new dependency.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-box`: add a card size preset requirement that declares the seven
  presets, the parameters a preset sets, and the parameters a preset resets.

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
