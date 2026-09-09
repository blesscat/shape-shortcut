# Apply verification — 2026-09-09

Change: `cad-worker-recycle-debounce`, schema `spec-driven`.
Branch: `codex/opengrid-honeycomb-memory`, existing PR #134.
Apply is complete (`all_done`, 18/18 tasks), including the user-authorized model generation timeout extension. Independent review gate passed in round 1 with exactly two read-only reports.

## Independent review gate

- Reviewer A (OpenSpec compliance), agent `01a08443-d801-7301-94d0-33ee5cc76936`: pass, no major findings; read all context artifacts, tracked diff, and both new tests.
- Reviewer B (implementation/verification/scope), agent `01a08443-d872-7353-aafa-f30424be5fd5`: pass, no major findings; same scope, independently confirmed the saved Playwright report's two successful tests and diff whitespace check.
- Primary triage: two distinct P3 test-strengthening suggestions remain nonblocking. Both reviewers identified that heavy smoke records but does not itself assert exact parameters, per-Worker generate count and termination order (ordinary browser/runtime tests assert these, and the heavy run's recorded history verifies them). Reviewer B also suggested a combined near-deadline candidate/commit test; current tests cover slow success and short commit timeout separately, with real-browser candidate/commit integration succeeding beyond 120 seconds. The duplicate heavy-smoke finding is consolidated here, not counted as a second defect.
- No major findings were dismissed or left unresolved; no implementation changes followed the passing pair. No additional review round was needed. Scope is the 13 production/test paths and this change's context artifacts, excluding unrelated existing PR changes and metadata.
- Ready for the separate `openspec-sync-specs` workflow. This apply/review invocation does not sync, archive, commit, push, or publish. Residual risks: larger/low-memory workloads may still exhaust resources, and a truly hung generation now waits up to ten minutes per attempt before bounded recovery.

## Final timeout extension validation

All models now use a dedicated 600-second absolute generation deadline; engine initialization stays at 60 seconds and candidate commit/export stay at 120 seconds. Progress cannot extend the deadline. Existing session cleanup and bounded recovery remain active.

- The same six-file Vitest command below now passes 94 tests, including slow success past the old deadline, absolute timeout despite progress, short commit/export deadlines, and obsolete timer cleanup.
- Typecheck, formatting of all 13 production/test paths, diff whitespace checks, and strict OpenSpec validation passed.
- `CAD_MEMORY_SMOKE=1 PLAYWRIGHT_PORT=3457 PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/cad-worker-recycle-timeout-results.json node_modules/.bin/playwright test tests/e2e/cad-worker-recycle.spec.ts --project=chromium --workers=1 --reporter=list,json`: both tests passed (4.5 minutes total). Sources were unchanged throughout this run.
- Consecutive 7x7 h100 honeycomb generations committed in 129,650.9 ms and 127,669.8 ms. They used different Workers and epochs, exactly one generation request each, and termination preceded replacement construction. Initialization took 283.8 ms and 476.0 ms respectively. Exports were enabled after the final commit.
- The ordinary box test passed in 6.0 seconds. Unheld warm replacement initialization was 184.6 ms and 195.8 ms; its deliberately held request is excluded from initialization benchmarking.
- 54 memory samples were collected; largest sampled process RSS was 1,197,680 KiB (about 1.14 GiB). This is observed process memory, not an upper bound or leak proof. Successful continuous generation here does not guarantee that larger models or lower-memory devices fit.
- Additional production scope: `src/cad-contract/units/index.ts` (generation timeout configuration only). The previous blocker evidence below is retained as historical diagnosis and is superseded by this successful fixed-source run.

## Implemented behavior

All valid settled inputs replace the Worker after the shared 500 ms debounce. Replacement terminates the previous client before construction, carries the latest snapshot through initialization/recovery, and sends one generation. Invalid inputs show diagnostics immediately and debounce invalidation without replacement. Committed meshes/dimensions remain stale with export disabled until a current result commits. Source client/session and epoch checks reject obsolete events; obsolete operation timers are cleared. Invalid snapshots settling before initialization are invalidated once ready.

## Checks

- `node_modules/.bin/vitest run tests/unit/workspace-runtime.test.ts tests/unit/model-generation.test.ts tests/unit/workspace-events.test.ts tests/unit/export-runtime.test.ts tests/unit/state.test.ts tests/unit/worker-client.test.ts`: 90 tests passed across six files.
- `node_modules/.bin/tsc --noEmit`: passed.
- `node_modules/.bin/prettier --check` on the six changed production files and six changed/added test files listed below: passed.
- `git diff --check`: passed.
- `openspec validate cad-worker-recycle-debounce --type change --strict`: passed.
- `CAD_MEMORY_SMOKE=1 PLAYWRIGHT_PORT=3457 PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/cad-worker-recycle-results.json node_modules/.bin/playwright test tests/e2e/cad-worker-recycle.spec.ts --project=chromium --workers=1 --reporter=list,json`: 1 passed, 1 failed. The standard lifecycle test passed in 5.3 seconds, including debounce, terminate-before-create, one generation per Worker, preserved dimensions, disabled export, invalid input, and successful STEP download after recovery.

The environment's Corepack pnpm launcher throws `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`; installed project executables were used directly. The repository's Astro server ran on port 3457. An earlier heavy run was contaminated by development hot reload while implementation was being edited; only the subsequent fixed-source run above is used as evidence.

## Previous high-memory blocker (resolved by timeout extension)

Scenario: stackable box, x=7, y=7, height=100, honeycomb enabled, default detachable corner seats, stackable mode, no full-bottom grid or openings.

The initial small model committed successfully. Its Worker was terminated before a fresh Worker was constructed. The fresh Worker initialized in 230.5 ms and received exactly one requested 7x7 h100 generation. At 120,003.7 ms after sending that generation, the main-thread timeout terminated it, consistent with the existing `PROTOTYPE_CONFIGURATION.operationTimeoutMs = 120_000`. Automatic recovery constructed another Worker, initialized it in 327.8 ms, and sent the same generation once. Neither attempt returned a candidate or ready event before the test's 240-second wait expired. The test never reached the second user-triggered h100 generation.

This demonstrated the old absolute timeout was a blocker in this environment; it did not establish that memory exhaustion was absent. The user subsequently authorized the timeout-policy extension verified above. Geometry contracts remain unchanged.

Fifty memory samples were collected. Largest sampled process RSS was 794,316 KiB (about 776 MiB). Samples include the browser's process IDs plus page JS heap metrics; page heap is not Worker/WASM heap, RSS is not a leak proof, and five-second sampling does not capture every peak. The full report with metadata-only Worker events and samples is `/tmp/cad-worker-recycle-results.json` (temporary local artifact). Ordinary box replacement initialization measured 268.7 ms and 183.1 ms; the deliberately held WASM request measured 511.3 ms and must not be treated as an unmodified initialization benchmark.

## Implementation scope and baseline

Production:

- `src/components/cad/workspace/createCadWorkerRuntime.ts`
- `src/components/cad/workspace/runtime/events.ts`
- `src/components/cad/workspace/runtime/export.ts`
- `src/components/cad/workspace/runtime/model-generation.ts`
- `src/components/cad/workspace/runtime/types.ts`
- `src/features/cad/state/index.ts`

Tests:

- `tests/unit/export-runtime.test.ts`
- `tests/unit/model-generation.test.ts`
- `tests/unit/state.test.ts`
- `tests/unit/workspace-events.test.ts`
- `tests/unit/workspace-runtime.test.ts` (new)
- `tests/e2e/cad-worker-recycle.spec.ts` (new)

Pre-apply baseline contained only the five untracked planning files under this change: `.openspec.yaml`, `proposal.md`, `design.md`, `specs/cad-workspace/spec.md`, and `tasks.md`. Proposal, design, delta spec and metadata are preserved. The agent-owned checklist was updated for completed work and corrected to the installed CLI's validation syntax. This verification record is new. No commit, push, spec sync, archive, new branch or new PR was performed.
