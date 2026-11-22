# Proposal

## Why

`card-box` is being retired (`retire-card-box`, applied last), and the owner has
decided that its cover card (封面片) and its labelled divider cards (分隔卡) must
first become game-box features ("封面卡跟分隔卡也要加入"). game-box today only
builds the plain, text-free divider and offers no cover piece, so retiring
card-box would remove the only surface that can print a labelled divider or a
decorated cover. The owner also ruled that in game-box each divider has its own
settings ("每片各自設定"): one divider per module boundary, up to five.

## What Changes

- Add a `cover` part to game-box with the card-box cover behaviour: the same
  `W × H × 0.6` plate (interior width × card height), the same centred stack
  layout (optional SVG, title, optional subtitle), the same safe-area rule, the
  same `raised`/`flat` styles, the same vertical-position slider, and the same
  SVG import (Beta). The plate size follows game-box's `cardWidth`/`cardHeight`;
  the storage depth stays derived from the module list.
- Turn the single plain `divider` item into one divider card per module
  boundary: parts `divider1` … `divider5` (boundaries 1 … active modules − 1),
  each with its own label text, tab position (`left`/`center`/`right`) and
  style (`raised`/`flat`) — the owner ruled every divider carries its own
  settings ("每片各自設定"). The boundaries are the computed module
  boundaries of the current layout (module lengths computed from their
  contents); no slot grid is assumed. A divider with blank text and the
  default tab stays geometrically identical to today's plain divider; box,
  lid and plain-divider geometry do not change (stop condition checked).
- Extend the assembly: it now also shows the cover piece seated in the front
  channel and every divider with its own label art. Zero-intersection still
  holds.
- Allow two-colour 3MF for exactly the art parts: a single `cover` with title,
  subtitle or SVG, and a single labelled divider with non-empty text, export
  `body` + `accent` 3MF like card-box. Box, lid, assembly, dice holders and
  blank plates still MUST NOT offer 3MF; game-box's blanket 3MF ban is replaced
  by this per-part rule.
- New flat parameters: nine cover fields (card-box names and ranges; the
  default cover title is `GAME`, an owner decision that deliberately diverges
  from card-box's `CARDS`) and three fields per divider group (`dividerNText`,
  `dividerNTabPosition`, `dividerNStyle`). Validation reports field-level
  errors. Text too wide for the tab and art outside the safe area remain
  localized build-time errors that block generation and export; a cover fit
  that validation can decide exactly without font metrics (the SVG width
  against the safe area) is rejected at validation time so a card size where
  the art can never fit is caught before generation.
- Export file names: `game-box-divider3-…` names carry the divider number so
  identical plain dividers never collide; the cover name follows the card-box
  pattern (card size, style, art token); 3MF reuses the STEP name with the
  `.3mf` extension.
- game-box gets its own SVG outline storage key
  (`shape-shortcut:game-box-cover-svg:v1`, same 256 KB and single-record rules).
  The old card-box key is not migrated (owner decision: no migration; the old
  record stays unread and untouched).
- Move (port) the cover art, cover layout, SVG outline and SVG import code into
  game-box-owned modules so `retire-card-box` can delete card-box afterwards
  without touching game-box imports; the shell geometry (box, lid, divider
  plate, text shapes) stays on the `card-storage-shell` move planned by
  `retire-card-box`. Existing component IDs are intentionally preserved: no new
  modelId, no route change, no OpenGrid naming impact.
- Card size presets (shipped by `add-game-box-card-presets`, merged in PR
  #215) keep every cover and divider field: game-box declares
  `presetBase: 'current'` and preset overrides describe only `cardWidth` and
  `cardHeight`, so the owner's "保留模組清單" rule extends to the new fields.
  A preset whose merged snapshot fails validation is not applied and the
  existing not-applicable notice is shown — including the case where the
  smaller card size makes the current cover art provably unable to fit
  (validation's exact cover-fit gate).

## Capabilities

### New Capabilities

None. The cover card and the labelled divider cards extend the existing
`game-box` capability, mirroring how card-box owns the same features.

### Modified Capabilities

- `game-box`: part selector gains `cover` and per-boundary divider items; box/
  lid/divider geometry requirement gains labelled dividers; assembly preview
  and download limits gain the cover piece and per-art 3MF; export file names;
  persistence gains the dedicated SVG key; validation and localization gain the
  cover/divider errors.

## Impact

- Affected code: `src/cad-contract/units/game-box.ts` (new fields, validation,
  file names, bounds), `src/cad-kernel/components/game-box/` (cover/divider-art
  builders, assembly, definition `buildWithParts`), ported game-box-owned
  copies of the card-box cover/layout/SVG modules and the SVG import feature,
  the game-box panel and its raw parser, game-box Worker error rules, the
  Worker command (cover outlines for game-box), scene proxy and progressive
  preview, and `en`/`zh-Hant` translations.
- Affected spec: `game-box` only. `card-box` stays untouched by this change; it
  is removed later by `retire-card-box`.
- Precondition: `add-game-box-card-presets` is merged and this branch is
  rebased on it. `retire-card-box` is applied after this change and must find
  everything game-box uses outside card-box-only paths.
- Persisted snapshots with `part: 'divider'` no longer validate and fall back
  to defaults through the existing invalid-snapshot rule; no storage migration.
- No new runtime dependency, backend service, or lockfile change.
