# All-catalog progressive preview timing

Measured 2026-10-23 on local Astro dev, Chromium 151.0.7922.34, Node 26.10.0, pnpm 11.20.0. Three fresh pages per fixture; normal unblocked WASM requests. Times below are medians in milliseconds after Worker creation.

| Fixture | First rendered geometry (ms) | Exact model ready (ms) |
| --- | ---: | ---: |
| hsw-cell | 227 | 603 |
| opengrid-open-shelf | 227 | 1870 |
| opengrid-openconnect-tissue-box | 202 | 5969 |
| opengrid-stackable-box | 207 | 12593 |

The stackable box uses honeycomb mode. Every sample issued exactly one model.generate request and displayed geometry before model.ready. Raw parameters and timestamps are retained in the adjacent JSON. This is a small local sample under concurrent verification load; it is not an SLA. No paired baseline was run for this extension, so these observations do not establish a change in end-to-end build cost. The earlier three-model paired benchmark remains historical evidence, not a new measurement.

Reproduce with `CATALOG_PREVIEW_BENCHMARK=1 PLAYWRIGHT_PORT=<port> pnpm exec playwright test tests/e2e/catalog-preview-timing.spec.ts --project=chromium --workers=1 --reporter=json`. Keep sources unchanged while measuring: dev-server HMR can generate a second request.
