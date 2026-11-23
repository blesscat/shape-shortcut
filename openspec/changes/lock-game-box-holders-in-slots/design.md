# Design: lock the game-box holders in the box's 3 mm slots with tenons

Owner decisions: 2026-11-22 (front/back walls) and 2026-11-23 (no grip flap, tenons on the existing slots, the holder is its own divider, the depth is rounded up to a multiple of 3 mm).

## 1. Vocabulary and frames

| Name | Meaning |
| --- | --- |
| `W` | the box interior width, `cardBoxInteriorWidth(cardWidth)` = `cardWidth + 0.5` |
| `u` | the cavity coordinate: 0 at the front inner wall face, `depth` at the back inner wall face |
| `T` | the dice holder thickness, `diceSize + 0.6 + 1.6 + 1.2` |
| `first` | the first tenon's centre, measured from the holder's front face |
| `span` | the tenon centre-to-centre distance |
| rack | the row of divider slots in the side walls, every 3 mm |

The cavity length equals the storage depth exactly (`cavityBackY − cavityFrontY = storageDepth` in the card-box frame), so `u` is a valid coordinate for every slot, module boundary and holder position.

## 2. The slot rack

The box keeps a divider slot every 3 mm along **both** side walls, as on `main` today ("盒子本來就有3mm一個卡榫了 沒有要另外開"). The rack is anchored at the cavity front wall face:

```
slot centres: u = 3k,  k = 1 … depth/3 − 1
```

The first slot is 3 mm behind the front wall face and the last one is 3 mm in front of the back wall face, so every slot's 1 mm band lies wholly inside the cavity (`u ± 0.5 ∈ [0, depth]`) and a divider plate or a tenon standing in it never touches the front or the back wall.

The slots keep the card-box geometry: 1 mm wide, 0.25 mm deep into the wall, cut from the floor's top surface upward.

### Why the depth must be a multiple of 3

The rack has `depth/3 − 1` slots only when the depth is a multiple of 3. With any other depth the last slot would sit closer than 1.5 mm to the back wall, and a tenon or plate standing in it would cross the back wall. Rounding the depth up to a multiple of 3 keeps the rack regular and guarantees the last slot's whole band is inside the cavity.

This is the reason the owner approved rounding the depth up ("so the slot rack stays regular").

## 3. The tenons

Each side of the holder carries **two** tenons. A tenon is the holder's version of a divider plate's edge:

| Property | Value | Where it comes from |
| --- | --- | --- |
| thickness (along the box depth) | 0.85 mm | the divider plate thickness |
| height | the full holder height | the tenon runs from the floor to the top of the holder |
| outer face | `cardBoxDividerWidth(cardWidth) / 2` = `W/2 + 0.175` | exactly the divider plate's half width, so it enters the slot as far as a plate does |
| inner face | `W/2 − 0.8` | 0.5 mm buried in the holder body (the root), 0.3 mm spanning the gap to the wall |
| tenon centres | `first` and `first + span` from the holder's front face | see below |

`span` is the largest whole multiple of 3 mm that fits inside the holder:

```
span  = floor((T − 0.85) / 3) × 3
first = (T − span) / 2
```

| dice | T | span | first | tenon centres from the front face |
| --- | --- | --- | --- | --- |
| 8 | 11.4 | 9 | 1.2 | 1.2, 10.2 |
| 16 | 19.4 | 18 | 0.7 | 0.7, 18.7 |
| 18 | 21.4 | 18 | 1.7 | 1.7, 19.7 |
| 30 | 33.4 | 30 | 1.7 | 1.7, 31.7 |

Because `span` is a multiple of 3, the two tenons of a holder are on the same slot grid: **if the first tenon lands in a slot, the second one does too**. The holder therefore drops into the rack at any 3 mm step.

### Tolerances

| Fit | Clearance |
| --- | --- |
| tenon (0.85) in slot (1.0) | 0.075 mm per side |
| tenon reach into the 0.25 mm slot (0.175) | 0.075 mm of play at the slot bottom |
| holder body to the wall face | 0.3 mm per side, bridged by the tenon |
| tenon root inside the body | 0.5 mm of full-height overlap, so the tenon and the body are one solid |
| wall between the tenon root and the dice well | ≥ 0.7 mm (the tenon's inner face is at `W/2 − 0.8`, the well's edge at most `W/2 − 1.5`) |

The tenon's outer face never reaches the slot bottom and never touches the wall face, so the holder has zero intersection with the box while it stands in the slots.

## 4. The layout on the rack

The modules are laid out front to back. Every module owns a **region** `[start, end]` in `u`; the regions tile the cavity, so the region lengths add up to the storage depth.

Rules:

1. A **card** module needs `cardDepth + 1.0 mm` of free space for the stack and the finger clearance. A divider plate standing at a boundary eats 0.425 mm of each of its two neighbours, so a card module's *allocated* length is `cardDepth + 1.0 + 0.85` between two plates, `cardDepth + 1.0 + 0.425` next to one plate, and `cardDepth + 1.0` at a box end.
2. A **dice** module needs `T`; the holder stands flush at the front of its region so that a neighbouring card module leans on the holder's wall.
3. A **divider plate** stands at a boundary only when **both** neighbours are card modules. Its centre is a slot centre, so a card–card boundary is always a multiple of 3.
4. A **holder** needs both of its tenons on slots. Its first tenon is at `start + first`, so `start ≡ −first (mod 3)`.

The algorithm walks the modules front to back and takes, for every boundary, **the first feasible position** that gives the module at least its required length:

```
cursor = 0
for each module:
  cards: required = cardDepth + 1.0 + plate halves at this module's two boundaries
         end = first position ≥ cursor + required that is feasible for the next module
  dice:  start = first position ≥ cursor with start ≡ −first (mod 3)
         end   = start + T
  cursor = end
depth = ceil(minimum length / 3) × 3
```

"Feasible for the next module" is:

| next module | constraint on the boundary |
| --- | --- |
| dice | `boundary ≡ −first(next) (mod 3)` (the holder's first tenon on a slot) |
| cards, current module is cards | `boundary ≡ 0 (mod 3)` (a slot for the divider plate) |
| cards, current module is dice | none — the cards lean on the holder's wall |

### Worked examples

`cards(30) + dice(16)`:

| step | value |
| --- | --- |
| card module's allocated length | `30 + 1.0 = 31` (no plate at either end: the next module is a holder) |
| the boundary | the first `≡ −0.7 ≡ 2.3 (mod 3)` position ≥ 31 → **32.3** |
| the card module's free space | 32.3 mm → the cards get 2.3 mm of clearance (1.3 mm more than required) |
| the holder | 32.3 → 51.7, its tenons at **33** and **51** (both slots) |
| the depth | `ceil(51.7 / 3) × 3 = 54` |
| the rack | slots at 3, 6, … 51 |

`dice(16) + cards(30)`:

| step | value |
| --- | --- |
| the holder's front face | `3 − 0.7 = 2.3`, so the first tenon sits in the first slot at 3 |
| the holder | 2.3 → 21.7, its tenons at **3** and **21** |
| the card module's free space | 21.7 → 54 (the depth `ceil(52.7 / 3) × 3`), so 2.3 mm of clearance |
| the depth | **54** |

## 5. How much extra room a card module gets — the owner must know this

Because every boundary lands on the 3 mm grid, the placement never gives a card module *less* than it needs, but it often gives it more: the boundary is the first feasible position, and the feasible positions are 3 mm apart.

**A card module's clearance is therefore 1.0 mm plus 0 to just under 3 mm — the compartment can be up to just under 4 mm deeper than the cards it holds.** The last module also collects the depth rounding, so a lone card module can reach 3 mm of clearance (example: the default single 60 mm card module → a 63 mm box → 3 mm of clearance instead of 1 mm).

This is a direct consequence of the owner's decision to keep the 3 mm slot pitch and to round the depth up; it cannot be avoided without abandoning the rack. The owner should know that the card compartment is deeper than `cardDepth` by 1–4 mm, and that a deeper box means a slightly bigger print.

The panel shows the length of the region every module owns, so the lengths add up to the storage depth. For a card module the region also holds the half divider plate on each of its boundaries.

## 6. The first and the last module next to the box ends

**The first module.** A card module starts flush against the front wall face (`start = 0`) — as before. A holder cannot: its first tenon must be in a slot, and the first slot is 3 mm behind the front wall face, so a leading holder leaves `3 − first` mm of empty cavity in front of it. The die size moves in 0.5 mm steps, so `first` is one of 0.45, 0.70, 0.95, 1.20, 1.45, 1.70 mm and the gap in front of a leading holder is one of 2.55, 2.30, 2.05, 1.80, 1.55, 1.30 mm — 2.30 mm for a 16 mm die. The gap is unavoidable: the tenon spacing is a multiple of 3 mm, so the holder's front face is always `first` away from a slot, and `first` is never 0.

**The last module.** The last module ends at the back wall face. If it is a card module it collects the rounding slack (0 to just under 3 mm) as extra clearance. If it is a holder, its second tenon lands in the last slot — the one 3 mm in front of the back wall — and the cavity behind the holder is the rounding slack.

## 7. The depth rounding and the saved designs

`depth = ceil(minimum length / 3) × 3`. The minimum length is what the modules need; the rounding adds 0 to just under 3 mm.

Every saved game-box design changes: the depth is different, and the depth is in the export file name. The box file name still carries the module list, so two module lists that now share a depth still get different names.

| design | old depth | new depth |
| --- | --- | --- |
| default (one 60 mm card module) | 61.85 | **63** |
| one 16 mm dice module | 19.65 | **24** |
| one 14 mm dice module | 17.65 | **21** |
| `cards(30) + dice(16)` | 51.5 | **54** |
| `cards(30) + cards(30)` | 63.7 | **66** |
| `cards(30) + dice(16) + cards(20)` | 73.35 | **75** |

The minimum depth stays 15 mm. The smallest design that still builds is a lone 8 mm dice module: it needs 13.2 mm and rounds up to 15 mm, so it is valid again — the old layout rejected it (11.65 mm) and the saved design falls back to the defaults. A design whose minimum length exceeds 150 mm is still rejected, now with the rounded depth in the message (five 30 mm dice modules need 178.7 mm and are refused with `180`).

The rounding carries a tolerance of 1e-9 mm, so a length that is a whole number of slots by a fraction of a nanometre does not round up to the next slot.

## 8. Alternatives considered

1. **Keep the grip flap and print it thinner.** Rejected by the owner ("側邊太薄根本印不出來"). A 0.4 mm flap spanning the full height cannot survive being pulled.
2. **A friction fit without any flap** (a plain 0.3 mm gap per side). Rejected: the owner chose the holder to be its own divider, so it must stand in the slots, and a plain gap gives nothing to hold it.
3. **Cut new, wider slots for the holders.** Rejected ("沒有要另外開"): the box already has a 3 mm slot pitch; new slots would need a second, coarser pitch and would break the "one rack" rule.
4. **Round the holder's own thickness to 3 mm** so it fits between slots. Rejected by the owner: the holder's thickness is exactly what its contents need (16 + 0.6 + 1.6 + 1.2 = 19.4 mm); only the *tenon spacing* is quantised.
5. **One tenon per side.** Rejected: the owner chose two, so that the holder is held over its whole thickness and cannot rock.
6. **Anchor the rack at the box centre** (as the card box does, phase 0.9 in cavity coordinates). Rejected: the cavity's front-to-back length then depends on the depth in a way that makes "the depth is a multiple of 3" pointless, and the rack's ends stop being 3 mm clear of the walls. The rack is anchored at the front wall face instead.
7. **Give the last card module the rounding slack explicitly** (e.g. spread it over all modules). Rejected: the owner asked for the boundaries to be at the first feasible position; the slack naturally falls to the last module.

## 9. Implementation map

| File | Change |
| --- | --- |
| `src/cad-contract/units/game-box.ts` | the configuration constants, the tenon/rack derivations, the new `gameBoxLayout` |
| `src/cad-kernel/components/game-box/grip.ts` | **deleted** |
| `src/cad-kernel/components/game-box/dice-holder.ts` | the 1.6 / 1.2 mm walls and the tenons |
| `src/cad-kernel/components/game-box/geometry.ts` | the rack, the divider centres and the holder positions |
| `src/cad-kernel/components/game-box/builder.ts` | the assembly uses the rack positions; no pressed holder |
| `src/cad-kernel/scene/proxy.ts`, `src/features/cad/progressive-preview/components.ts` | the holder's outer width without the flaps |
| `src/components/cad/component-panels/game-box/` | the module length and storage depth read-outs |

`shape-ops.ts` (the shared `cutShape` / `fuseShape`) stays: the tenons are fused onto the holder body with it.
