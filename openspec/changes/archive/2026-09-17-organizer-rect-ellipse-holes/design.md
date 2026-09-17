# Design: Rectangle and ellipse cavity shapes for Organizer Box and OpenConnect Organizer

## Context

Both organizer components already branch on a `holeShape` enum
(`circle` + regular 3-6 gons) that is sized by a single inscribed
`holeDiameter`. The layout math is envelope-driven:
`openGrid*CavityEnvelopeFor({shape, diameter}) -> {x, y}` feeds
pitch, required span, body dimensions, connector occupancy, and the workspace
limit, so any shape that can report an X/Y envelope slots in without touching
layout logic. In the CAD kernel the cavity cutter is a `makeCylinder` for
circles and an extruded polygon polyline otherwise; quality assertions branch
on expected face counts and per-face geometry types. Panels hand-render the
shape `<select>` outside the numeric `parameterSchema`. Raw persisted
parameters are hydrated strictly: any missing canonical field rejects the
entry, which falls back to component defaults (the precedent set when
`wallThickness` was added to Organizer Box).

## Goals / Non-Goals

**Goals:**

- One shared parameter model for both components: `rectangle`/`ellipse` sized
  by `holeWidth` × `holeHeight`, rectangle-only `holeCornerRadius`.
- True analytic ellipse geometry in exported STEP (no faceted approximation).
- Reuse the envelope-driven layout unchanged; new shapes are new envelope
  inputs, not new layout paths.
- Preserve existing filenames, defaults, and behavior for the five existing
  shapes bit-for-bit.

**Non-Goals:**

- No rotation/orientation parameter for the new shapes (width is always local
  X; users swap width/height values instead).
- No elongated (non-regular) polygons; existing polygons keep inscribed-circle
  sizing.
- No new component, model ID, route, or directory (OpenGrid naming rules apply
  to the existing IDs unchanged).
- No per-field migration of persisted snapshots (strict fallback stays).

## Decisions

### D1. Additive parameters, not a unified size model

`holeWidth` (local X), `holeHeight` (local Y), `holeCornerRadius` (r) join the
typed parameter objects; the existing five shapes continue to use
`holeDiameter`. Alternatives rejected: unifying every shape onto w/h changes
the meaning of shipped parameters and filenames (breaking); per-shape size
fields multiply parameters with every future shape.

- Bounds: `holeWidth`/`holeHeight` reuse the existing diameter bounds
  (`1..300` mm); `holeCornerRadius` is finite with
  `0 <= r <= min(holeWidth, holeHeight) / 2`.
- The radius constraint is validated for **every** selected shape so that
  switching shapes can never produce an invalid snapshot.
- Defaults: `holeWidth=20`, `holeHeight=20`, `holeCornerRadius=0`. A default
  rectangle then has the same 20×20 envelope as the default circle, so
  switching shape does not silently resize the body. Radius defaults to 0 for
  a literal rectangle.

### D2. Envelope semantics stay exact

`openGrid*CavityEnvelopeFor` gains rectangle/ellipse inputs returning exactly
`{x: holeWidth, y: holeHeight}`. A corner radius fillets inside the w×h
rectangle and MUST NOT shrink the envelope; ellipse axes are the full extents.
Everything downstream (pitch = envelope + spacing, body derivation, 500 mm
workspace check, connector occupancy) already consumes the envelope and is
untouched.

### D3. Kernel geometry: rounded-rectangle sketch + true ellipse

- Rectangle cavity cutter: replicad `sketchRoundedRectangle` with
  `holeCornerRadius` (already a dependency used by the box builders); when the
  radius is 0, cut with a plain rectangle sketch so the shape stays exactly
  rectangular (guard against a zero-radius degenerate fillet).
- Ellipse cavity cutter: replicad's ellipse drawing primitive to produce an
  analytic elliptical edge, extruded like the existing cutters. A polygon
  approximation is explicitly rejected: it would facet the exported STEP and
  break the "true ellipse" requirement.

### D4. Quality assertions need a geomType spike before wiring

Current quality branches expect `CYLINDRE` for circles and `PLANE` side faces
for polygons, with exact face counts. For the new shapes the spike (built via
`createOpenGridOpenConnectOrganizerOwnedCavityCutters` against real OCCT)
observed:

- Rectangle r>0: 8 side faces - 4 `PLANE` + 4 corner `CYLINDRE`.
- Rectangle r=0: 4 `PLANE` side faces.
- Ellipse: 2 `EXTRUSION_SURFACE` side faces (OCCT splits the extruded ellipse
  along the major axis); analytic curve, no facets.
- Boundary degeneracies (confirmed against real OCCT builds, superseding the
  first spike's assumption of a uniform 8-face profile):
  - `r == holeWidth / 2` (with `r < holeHeight / 2`): replicad's
    rounded-rectangle blueprint cannot construct the profile (the first
    tangent arc has no preceding straight), so the builder draws the stadium
    with swapped extents and rotates it 90 degrees; after the Boolean cut the
    adjacent semicylinders merge, giving 4 side faces (2 `PLANE` + 2
    `CYLINDRE`).
  - `r == holeHeight / 2` (with `r < holeWidth / 2`): the blueprint builds
    directly, but the adjacent semicylinders merge the same way: 4 side faces.
  - `r == holeWidth / 2 == holeHeight / 2`: the profile is a circle; the
    builder emits `makeCylinder` (1 `CYLINDRE` side face).
  The quality expectation therefore branches on
  `r </== width/2` and `r </== height/2` (8 / 4 / 1 faces).
- Spike bounds confirmed `drawEllipse(width/2, height/2)` maps the width
  extent to local X and the height extent to local Y with the exact w×h
  envelope (verified for wide 300x1 and tall 1x300 aspect ratios).

Quality now derives a per-shape side expectation
`{ surfaces, count }` instead of a single expected surface type. Spike also
surfaced a latent pre-existing bug: once a shape is meshed, OCCT's
triangulation inflates `shape.boundingBox` (proportional to feature size),
so `BRepTools.Clean(shape, true)` now runs at the top of both organizers'
quality entry points to keep every bounding-box check geometric.

If OCCT reports an unexpected type for the extruded ellipse, the
assertion asserts the observed stable type rather than loosening all checks.

### D5. Strict hydration keeps its precedent

New fields join both components' required raw-field lists. Persisted
snapshots without them are rejected through the existing malformed-entry path
and fall back to component defaults - the same one-time reset users accepted
when `wallThickness` shipped. A per-field migration (or defaults-on-missing
hydration) was rejected because it diverges from the strict `hasExactKeys` /
required-fields contract both specs already pin.

### D6. Panel fields switch with shape

The shape `<select>` gains 長方形 (rectangle) and 橢圓形 (ellipse) options. The
numeric area renders `holeDiameter` for the five existing shapes and
`holeWidth`/`holeHeight` (+ `holeCornerRadius` for rectangle) otherwise,
sharing the existing `ParameterField`/`ParameterControl` controls and the
existing linked-spacing behavior. New i18n keys under `parameter.*` and
`panel.organizerBox.shape.*` (and the OpenConnect organizer's panel key
namespace).

### D7. Filename tokens replace `d` per shape

`fileStem` branches: `rectangle-w30-h20-r2`, `ellipse-w30-h20`; existing
shapes keep `d<holeDiameter>`. Filenames stay pure functions of validated
parameters.

## Risks / Trade-offs

- [Extruded-ellipse geomType unknown until the spike runs] -> D4 puts the
  spike first; assertions encode observed values; if the type is unstable the
  fallback plan is asserting face count + watertight single solid only for
  ellipse, recorded in tasks.
- [One-time reset of saved panel settings for existing users] -> Accepted,
  consistent with the `wallThickness` precedent; called out in the specs'
  fallback scenarios.
- [Kernel ellipse edge cases at extreme aspect ratios (w=300, h=1)] -> Bounds
  keep extents within existing diameter limits; the 500 mm workspace check and
  single-solid validation gate pathological outputs; covered by a contract
  unit test at the bounds.
- [Quality checks could over-fit exact face counts if replicad changes] ->
  Same exposure as the existing polygon branches; assertions live in the same
  files and fail loudly in tests.
