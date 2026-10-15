# Desk assembly videos

The three silent clips use the same native CAD builders as the generators. No
geometry or viewer is loaded by the public Docs page. Existing SVG generation
remains available through `generate:desk-diagrams`.

Prerequisites: the repository's trusted installed dependencies, Node 22.22.2+
with native TypeScript stripping, Playwright Chromium, and `ffmpeg`/`ffprobe`
with `libx264`, `libvpx-vp9` and `libwebp` encoders. There are no new packages.

```sh
pnpm generate:desk-assembly
pnpm verify:desk-assembly
pnpm verify:desk-assembly --geometry
```

Generation runs OCCT in a separate Node process, imports the checked-in STEP
references, builds six real printable part meshes and verifies 38 assembly
contacts. A temporary loopback-only server supplies the capture harness and
installed Three modules. Playwright renders explicit 24 fps timestamps at
960×640; FFmpeg produces H.264 MP4, VP9 WebM and WebP posters in both themes.
The movies have no audio, embedded language, autoplay or loop. Both locales and
the landing fixing tutorial reuse these assets.

`scenes.mjs` defines millimetre poses and timing. The Lite Snap bottom is 0.6 mm
above the Board origin (its top is flush at 4 mm); the integrated-seat box
rests at Z=4. The seat-free box's contact height is measured by native BRep
intersection search rather than the obsolete deep-insertion datum. Detachable
seats enter at the socket orientation, then turn +90° about world Z, which is
clockwise viewed from below. The native check verifies a clear insertion and
turn, and interference when pulling a locked seat straight out. Snap insertion
depicts a flexible press fit; intermediate rigid-body intersections during that
press are expected.

`manifest.json` records exact settings, mesh bounds/triangle counts, measured
datums/contact checks, source hashes (kernel, contracts, STEP, native WASM,
offline scripts and dependency lock) and output hashes. Verification checks
the complete media inventory, freshness, dimensions, duration/frame rate,
codecs, deployment size and full decoding. `--geometry` rebuilds and rechecks
the measured contacts. Run generation after editing hashed sources. Normal
`build` does not run CAD capture or FFmpeg.

For a quick visual check, `node scripts/desk-assembly/capture.mjs --preview`
generates only six posters in a temporary directory and prints its path. Full
generation cleans its own temporary mesh/frame data on success or failure.
Inspect the six posters, the start/rest/lift poses, and the underside close-up
before publishing. Keep the existing HTML settings, captions and assembly steps
equivalent when changing a clip; a static-frame link is always available.

Workers delivery also needs the scoped `Accept-Ranges: bytes` movie rules in
`public/_headers`. Without this advertisement Chromium can fully buffer a movie
while exposing a zero-length seekable timeline. Keep the hosting check alongside
the regular dev-server playback checks:

```sh
pnpm exec playwright test -c playwright.workers.config.ts tests/e2e-workers/desk-assembly.spec.ts
```

Set `WORKERS_TEST_BASE_URL` to run that same regression against a deployed preview.
It verifies the movie responses and actual no-JavaScript mobile seeking. The
header mechanism follows [Cloudflare's static asset headers documentation](https://developers.cloudflare.com/workers/static-assets/headers/).
