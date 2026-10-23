# CAD progressive preview measurements

2026-10-23, local Astro dev, Chromium 151.0.7922.34, Node 26.10.0, baseline `92636cac`, same dependencies and machine. Three alternating baseline/feature runs per fixture with independent browser contexts; server dependencies warm after first request. Times start at CAD Worker creation, excluding navigation/module loading. First geometry is measured two animation frames after viewport base-geometry preparation; it is not pixel-timed scanout. Browser tests separately verify visible canvas and interactive geometry while WASM is held.

| Fixture | Baseline first geometry | Simplified first geometry | Baseline full ready | Feature full ready | Change |
| --- | ---: | ---: | ---: | ---: | ---: |
| opengrid-stackable-box | 13.078 s | 0.211 s | 12.815 s | 12.834 s | +0.1% |
| opengrid-stackable-cylinder | 6.343 s | 0.211 s | 6.117 s | 6.277 s | +2.6% |
| opengrid-organizer-box | 3.568 s | 0.213 s | 3.351 s | 3.570 s | +6.5% |

The box fixture is 2×2, height 20, honeycomb enabled; cylinder and organizer use defaults. Every run issued exactly one `model.generate`. This small local sample shows early feedback with modest full-ready overhead, not faster exact CAD generation or a production performance guarantee. The worker generation phase itself remains comparable; initial rendering competes with engine initialization for browser resources.

Run the opt-in comparison with a separately served baseline checkout:

```sh
CAD_PREVIEW_BENCHMARK=1 CAD_PREVIEW_BASELINE_URL=http://127.0.0.1:3458 PLAYWRIGHT_PORT=3491 pnpm exec playwright test tests/e2e/cad-preview-timing.spec.ts --project=chromium --workers=1
```

Raw fixtures and per-run timestamps are in `cad-progressive-preview.json`.
