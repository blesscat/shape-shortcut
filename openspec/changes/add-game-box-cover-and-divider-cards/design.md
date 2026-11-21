# Design

## Context

game-box reuses card-box kernel code directly: `builder.ts` imports
`buildCardBoxBoxFromGeometry`, `flipLidForPrint`, `buildCardBoxDividerFromGeometry`
and `buildCardBoxLidFromGeometry`; `geometry.ts` imports `cardBoxInnerFrontY` and
`CardBoxGeometry`; the contract imports `CARD_BOX_CONFIGURATION` and five size
functions. The card-box cover/divider-art code (`cover.ts`, `layout.ts`,
`svg-outline.ts`, the SVG import feature under `src/features/cad/card-box-svg/`)
is card-box-only today. game-box has no cover part, builds only the plain
divider, and its catalog definition has no `threeMfFileName`, so 3MF is
unreachable.

The `retire-card-box` proposal (read-only for this change) deletes card-box
after this change merges and moves the shared shell (box, lid, divider plate,
text shapes, contract constants) verbatim into a `card-storage-shell` module.
Its open question 7 already decides the cover geometry is *not* part of that
shell. `add-game-box-card-presets` (merged before this change applies) gives
game-box the seven card-size presets and pins that preset application rebuilds
the parameter set from `defaultParameters`.

See proposal.md — Why for motivation.

## Goals / Non-Goals

**Goals:**

- The card-box cover card and labelled divider cards work in game-box with the
  same user-visible behaviour, geometry, tolerances and error handling.
- Nothing game-box uses after this change lives under a card-box-only path, so
  `retire-card-box` can delete card-box without editing game-box code.
- Box, lid, dice-holder and plain-divider geometry are provably unchanged (stop
  condition).
- All new parameters are flat single values flowing through the existing
  validation, persistence, Worker and preview mechanisms.

**Non-Goals:**

- No change to card-box code, spec, tests or translations.
- No change to the game-box box/lid/divider-slot/dice-holder geometry, ranges,
  defaults, route or modelId.
- No localStorage migration (see Open Questions).
- No change to the shared preset mechanism, the shell module split, or any
  other component.

## Decisions

### 1. Cover card: verbatim port of the card-box cover behaviour, sized by game-box card fields

The cover plate is `interiorWidth (cardWidth + 0.5) × cardHeight × 0.6` —
exactly the card-box plate at the same card size, because game-box derives the
same interior width from the same fields. The ported pieces keep card-box
semantics 1:1: safe area `(W−10)×(H−10)` shrunk by the 2 mm margin (defaults
70.5×120 → x 7..63.5, y 7..113), centred stack (SVG → title → subtitle),
`coverVerticalPosition` 0–100 % slider (default 30 %), `raised`/`flat` styles
(0.4 mm proud / flush in a 0.4 mm recess), default title `CARDS`, text height
ranges (4–20 / 3–12 mm, defaults 6 / 5), SVG width 10–58 mm (default 40),
text length caps (30 for cover lines, 20 for divider labels), overflow errors
(`COVER_ART_OUTSIDE_SAFE_AREA`, `DIVIDER_TEXT_TOO_WIDE` semantics) that never
shrink or crop.

- *Alternatives*: redesign the layout for game-box (rejected — the owner asked
  for the card-box cover in game-box, and parity keeps the ported tests
  meaningful); make storage depth influence the plate (rejected — the plate
  never touches the depth; keeping it independent preserves the card-box
  behaviour).

In the assembly the cover sits in the front channel via the card-box placement
(rot +90° around X, pressed against the channel's outer face at the derived
depth), always present, art included — matching the card-box assembly, where
the cover is a physical part of the product rather than an option.

### 2. Divider cards: one settings group per module boundary

Dividers stay boundary-indexed: boundary *n* sits between module *n* and
module *n+1* (front-to-back), n = 1 … activeModules − 1 (max 5). Each group
owns three flat fields:

| Field | Range / values | Default |
| --- | --- | --- |
| `dividerNText` | string, ≤ 20 chars | `''` (blank plate) |
| `dividerNTabPosition` | `left` / `center` / `right` | `left` |
| `dividerNStyle` | `raised` / `flat` | `raised` |

Nine cover fields join the contract with card-box names, ranges and defaults:
`coverTitle` (≤ 30, default `CARDS`), `coverTitleTextHeight` (4–20, default 6),
`coverSubtitle` (≤ 30, default `''`), `coverSubtitleTextHeight` (3–12,
default 5), `coverSvgWidth` (10–58, default 40), `coverVerticalPosition`
(0–100, default 30), `coverStyle` (`raised`/`flat`, default `raised`),
`usesCoverSvg` (default false), `coverSvgFingerprint` (required non-empty when
`usesCoverSvg`). Everything stays a flat scalar so the existing validation,
persistence, Worker transport and raw-parameter machinery work unchanged;
`defaultParameters` gains all 18 keys, which also makes card-size presets reset
them (preset parity with card-box: option flags reset, SVG data survives in the
dedicated key).

**Style is per divider** (recommended): the owner set "每片各自設定" for labels
and tabs; style is the same kind of per-plate decision, it drives per-plate 3MF
availability, and a shared style mixed with per-piece text would make two
physically different plates indescribable. *Alternative* — one shared
`dividerStyle` field (rejected; cheaper by four keys but semantically wrong).

List-operation semantics mirror the module groups (positional attachment):

- **Add module**: boundary count grows by one; the new boundary's divider
  appears with default fields; existing boundaries keep their settings.
- **Delete module**: boundary count shrinks by one; surviving boundaries keep
  their settings by index; the vanished boundary's fields reset to defaults
  (same re-pack rule as deleted modules).
- **Move module**: boundaries do not move — only module contents swap — so
  divider fields never change on reorder.

Panel presentation: a dedicated "分隔卡" fieldset listing one card per boundary
(label text input, tab select, style select), errors shown on the owning item.
*Alternative* — interleaving divider cards inside the module list (rejected:
modules and boundaries are different objects and the counts differ by one;
interleaving also has no slot for boundary N at the list's end).

### 3. Part selector: `cover` plus one item per divider

`part` values become `assembly | box | lid | cover | divider1…divider5 |
module1…module6 (dice modules only)`. `dividerN` is offered only while
N ≤ activeModules − 1; pointing elsewhere is a validation error, and list
operations that invalidate the current selection fall back to `assembly` (the
existing rule). Identical plain dividers stay **separately listed items**:
they are distinct physical plates, the count per plate is gone (no more
"×2"), and the number in the item label is what tells them apart.

File names carry that identity: `game-box-divider3-70x120x75-left-raised-<token>.step`
(token = FNV-1a 8-hex of the NFC text, `blank` when empty — same algorithm as
card-box). Two dividers with identical settings therefore never collide, and
two revisions differing only in text never collide either. Cover names follow
card-box: `game-box-cover-70x120x75-<style>-<art-token>.step`, art token
derived from `title\0subtitle\0svgFingerprint`. 3MF reuses the STEP name with
`.3mf`. Box/lid/dice-holder names stay exactly as pinned by the current spec
scenarios.

### 4. Two-colour 3MF: exactly the card-box rule, applied per part

`cover` with title, subtitle or SVG, and a single labelled divider with
non-empty text, export STEP/STL *and* a 3MF containing exactly `body` +
`accent` (extruder 1 / 2), in both styles. Blank plates and every other part
(`box`, `lid`, dice holders, `assembly`) stay STEP/STL-only. The catalog
definition gains `threeMfFileName` returning `null` for non-art parts (this
replaces game-box's blanket "no 3MF" rule), and the game-box kernel definition
gains `buildWithParts` reusing the card-box multipart pattern (combined shape
for STEP/STL, separated body/accent for 3MF). Assembly keeps all downloads
disabled.

### 5. Persistence, SVG storage, and the Worker path

Parameters persist under the existing per-component record for `game-box`; the
only new storage is the dedicated SVG key
`shape-shortcut:game-box-cover-svg:v1` with card-box's rules (256 KB cap,
single record, new import replaces old, oversized payloads session-only,
loss/corruption falls back to text layout with a hint). The parameter record
keeps only `usesCoverSvg` + `coverSvgFingerprint`. The Worker command's
existing `coverSvg` field carries the outlines for game-box too:
`model-generation.ts` loads from the game-box store when the game-box
fingerprint is set, `cad-worker-generation.ts` passes it for `game-box`, and
`KernelBuildContext.cardBoxCoverSvg` is renamed to a neutral `coverSvg` that
both definitions read. Snapshots persisted before this change with
`part: 'divider'` fail validation and fall back to defaults through the
existing invalid-snapshot rule — no migration code.

### 6. Code ownership: game-box-owned art code, shell-owned geometry

Rule: after this change, nothing game-box imports lives in a card-box-only
file.

- **Ported into game-box ownership** (verbatim, behaviour-preserving): kernel
  `cover.ts` + `layout.ts` + `svg-outline.ts` →
  `src/cad-kernel/components/game-box/`; the SVG import feature
  (`parse-svg.ts`, `fingerprint.ts`, store) →
  `src/features/cad/game-box-cover-svg/`. Rationale: `retire-card-box` deletes
  exactly these files as card-box-only; duplication during the overlap window
  is the price of never touching card-box, and retirement removes the
  duplicates. Ported unit tests come along with only import-path edits.
- **Reused from the shell path** (not copied): the labelled divider build
  (`buildCardBoxDivider` + `CardBoxArtPartBuild`), the text shapes
  (`makeCardBoxTextShape`, `measureCardBoxText`), the plain plate, the FNV
  token, the contract constants/size functions and the SVG outline data types.
  These live in files `retire-card-box` already moves verbatim into
  `card-storage-shell`; game-box keeps importing them across the rename and
  the coordination note below tells retirement they are part of the move
  surface. Copying them instead would fork the normative divider geometry.
- **Component boundary**: the game-box builder wraps errors from the reused
  builders and re-raises them with `GAME_BOX_`-prefixed message strings
  (`GAME_BOX_DIVIDER_TEXT_TOO_WIDE`, `GAME_BOX_COVER_ART_OUTSIDE_SAFE_AREA`,
  `GAME_BOX_SVG_*`). game-box-owned Worker error rules then map them to the
  existing `GAME_BOX_GEOMETRY_INVALID` code (building stage) with orders ahead
  of card-box's art rules, and the shared Worker runtime matcher gains the
  corresponding localized descriptors (`en`/`zh-Hant`). Card-box builds keep
  resolving through card-box's own rules, so neither component's messages
  change, and retirement deletes card-box's rules without touching game-box's.
- **Panel/UI**: the game-box panel implements its own cover controls (with the
  Beta badge), divider cards and part selector on top of the ported store; no
  import from the card-box panel.

Coordination with `retire-card-box` (described, not edited): its verbatim
`card-storage-shell` move must include, besides its current list, the exports
game-box consumes — `buildCardBoxDivider`/`CardBoxArtPartBuild`
(`divider.ts`), the text builders (`text.ts`), `cardBoxToken`, and the SVG
outline data types + `CARD_BOX_CONFIGURATION` size functions (contract unit).
All are in files retirement already moves or deletes; the note only widens the
repoint list for game-box imports. Its deletion of `cover.ts`, `layout.ts`,
`svg-outline.ts` and `card-box-svg/` stays valid because game-box no longer
imports them.

### 7. Stop-condition check: no existing geometry changes

- Box/lid/dice-holder builders are untouched; the cover slides the existing
  0.6 mm channel, and the spec's channel/lid-flange relationships already
  guarantee clearance (card-box assembly proves cover-vs-box/lid zero
  intersection on the same shell).
- The plain divider remains exactly `buildCardBoxDividerFromGeometry`
  (tab `left`, no text): blank text + default tab reproduces it bit-for-bit,
  which the ported reference-geometry test pins (70.85 × 125 × 0.85 mm,
  7347.9 mm³).
- Labelled-divider art stays clear of the side walls: text starts ≥ 2.25 mm
  from the plate edge while the plate enters the wall slots by only ~0.175 mm,
  so raised art never reaches a slot wall; the new assembly intersection test
  covers labelled dividers explicitly.

## Risks / Trade-offs

- [Temporary duplication of cover/SVG code (card-box + game-box copies) until
  retirement] → ports are verbatim and their unit tests are ported 1:1, so
  drift is detectable; retirement deletes the duplicates.
- [Assembly grows a fifth part type; intersection regressions] → the ported
  placement helpers are unchanged; the worker test builds assemblies with
  labelled dividers and cover art at default/min/max card sizes and asserts
  zero intersection volume for every pair.
- [18 new parameter keys widen the validation surface] → all fields reuse the
  existing `numberInRange`/enum helpers with field-level attribution; unit
  tests pin every range, default and error field; inactive divider groups
  cannot affect geometry (mirrors the module-group rule and is tested).
- [Error-prefix wrap could hide a reused builder's error] → the wrap rethrows
  after mapping known strings and rethrows unknown errors unchanged; the
  worker integration tests assert the localized game-box messages.
- [Strict delta validation is title-sensitive] → every MODIFIED requirement
  keeps all existing scenario titles; `openspec validate --strict` gates this.

## Migration Plan

No data migration. Precondition: `add-game-box-card-presets` merged and this
branch rebased on it (the presets change owns the game-box preset requirement
this change builds on). Rollback is reverting the change; persisted snapshots
with the new keys are ignored by the old validator (unknown-key rule) and fall
back to defaults. `retire-card-box` follows this change and consumes the
coordination note in Decision 6.

## Test Plan

Ported from card-box (behaviour identical, import paths updated):

- Unit `card-box-contract` / `card-box-layout` cover-field validation, safe
  area and stack layout → game-box contract/layout tests (cover fields,
  divider fields: ranges, defaults, caps, fingerprint rule, inactive groups).
- Unit `card-box-svg-parse` / `card-box-svg-store` → game-box SVG import
  parser and the new store (own key, 256 KB rule, session fallback, no
  `card-box` key reads).
- Worker `card-box-art` (raised/flat divider text, too-wide rejection, cover
  title/SVG/subtitle, safe-area rejection, vertical position) and the 3MF
  parts cases from `card-box.integration` (body/accent pairs, extruder
  mapping, blank plates without 3MF) → game-box equivalents per part.
- Worker `card-box-divider` reference geometry (70.85 × 125 × 0.85,
  7347.9 mm³) → pins the game-box blank divider at every boundary.

New game-box coverage:

- Contract: `dividerN` availability per module list, invalid-part rejection,
  file names (divider index token, cover token, 3MF name), bounds for
  `cover`/`dividerN`.
- Worker: assembly with labelled dividers + cover art at default/min/max card
  sizes — every pair of parts has zero intersection; multipart export returns
  body/accent only for art parts; progressive-preview bboxes for the new parts
  stay within 0.5 mm.
- E2E: editing `divider2Text` (including the over-cap error rendered inside
  that divider's item only), choosing `divider3` / `cover` in the part
  selector and regenerating, list add/delete/move keeping divider settings,
  3MF button enabled exactly for art parts, SVG import Beta badge and
  fallback hint, both locales.

## Open Questions

1. **Migrate the old card-box SVG key?** Recommended: **no migration**. The
   old record stays unread (≤ 256 KB, harmless); the spec pins that game-box
   never reads it. Migration would add one-time read/write code that
   retirement immediately orphans. (Lead's leaning agrees.)
2. **Default cover title.** Recommended: **keep `CARDS`** for behaviour parity
   with card-box (ports the pinned default-geometry tests unchanged); the
   first module is a card compartment by default. Owner may prefer `GAME` —
   one string change if so.
3. **Where divider settings appear in the panel.** Recommended: a dedicated
   分隔卡 fieldset ordered by boundary (Decision 2). No spec text depends on
   the placement; changeable at apply time without re-planning.
