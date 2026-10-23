# Homepage storage visuals

Run `node scripts/home-visuals/capture.mjs` from the repository root with the
project Node dependencies, Playwright Chromium and FFmpeg installed. This is an
explicit offline operation; `pnpm build` never initializes the CAD kernel.

The native process uses the canonical Board, Grid Box, Round Box, OpenConnect
Organizer and OpenConnect Shelf builders. Desk box/board heights are resolved by
native solid intersection. The Wall composition displays two separate complete
accessories, not an installation or a claim that no mounting parts are needed.
Colors are illustrative print colors, not additional geometry or export options.

The capture writes four 1200×800 WebP files and a settings/source/checksum manifest
to `public/home/`. The browser renderer only runs in this capture process, never
on the homepage. Both appearances use the warm site background family.

Run `node scripts/home-visuals/verify.mjs` to check source freshness, output hashes,
and decodable dimensions. Inspect the rendered images after regenerating.
