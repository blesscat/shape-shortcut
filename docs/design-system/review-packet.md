# Independent review packet (review-time snapshot)

Change: `refresh-site-design-system`, schema `spec-driven`.
Implementation root: `/home/blesscat/.codex/worktrees/ae0b/menhaden`.
Base: `ec0635564a5937e0a2f3c60d84a67587c2c17e2e` (`main` at isolation).
Branch: `codex/refresh-site-design-system`.

Review the complete current diff and untracked in-scope files, including assets,
new helpers, tests and evidence. The original planning checkout is untouched.
Temporary `.visual-*.config.ts` files are excluded and removed before publication.
No unrelated pre-existing implementation edits exist in this isolated checkout.

Apply state at round 3: `all_done`, 37/37 tasks. Strict change validation passed.
Final snapshot verification: 10/10 with 24 individually reviewed images.

## Required context

Read proposal, design, tasks and all eleven delta specs returned by
`openspec instructions apply --change refresh-site-design-system --json`.
Read project `.codex/skills/code-readability-guardrails/SKILL.md` and
`.codex/skills/testing-guardrails/SKILL.md`. Tests must assert behavior and
observable contracts, not source strings. Use explicit readable control flow.

Acceptance includes semantic light/dark state pairs, accessible stable navigation,
shared favicon, complete localized model identities/actions, container-first
selection without changing catalog/routes, docs anchors/native-scroll/no-JS,
CAD field/reset/error/export lifecycle preservation, desktop height/scroll
boundaries, and a single joint mobile fallback decision. Initial workspace fit
padding was corrected as part of the 520px layout adaptation; no fit/reset feature
or camera reset on parameter/theme changes is introduced. Thumbnail capture keeps
its independent framing.

## Mobile gate and user direction

The candidate split failed its layout experiment and lacks full state, camera and
physical-device evidence. Both products ship the legacy transparent overlay.
Tasks 5.1–5.3 explicitly record eligibility failure and gaps rather than claiming
candidate implementation or real-device success. Review this against design D4
and both mobile specs. The user explicitly requested the draft PR first and will
then test Android. Promotion criteria remain unchanged. See mobile-comparison.md
and android-checklist.md.

## Evidence and known limitations

See refresh-verification.md, contract.md, screenshots/, and evidence/cad/.
The failed initial runs and exact-base comparisons are retained where useful.
HMR-interrupted cases were rerun in isolation; do not describe these as one clean
combined run. Old snapshot/validation/route expectations were aligned with
current documented behavior while preserving useful functional assertions.

The repository-wide format check reports seven unchanged base files; changed
source/test/script files must pass formatting. No unrelated formatting edits are
included. Physical testing, deployment and CI are not claimed as completed.

## Review protocol

Exactly two fresh, independent read-only reviewers per round:

- A: requirements, scenarios, design, task compliance.
- B: behavior, integration, regressions and tests.

Both inspect code and tests against the guardrails. Do not edit, stage, commit,
install, sync, archive or publish. Return verdict, P0–P3 findings with file:line
and affected requirement, minimal remediation, verification gaps and residual
risk. A passing verdict must identify concrete inspected evidence. All accepted
fixes require affected checks and another fresh pair, maximum five rounds.

## Round 2 delta

Both first reviewers found no P0/P1 and four unique P2 issues. All were accepted and fixed: menu focus exit, footer target/focus, cylinder hint contrast and 320px development-action reservation. Read independent-review.md and the new focused tests. All affected checks passed; no source changes remain pending.

## Round 3 delta

Round 2 independently confirmed prior fixes and found one common P2: incomplete focus migration on native docs/model disclosures, assembly controls and CAD exports. A shared 3px solid semantic focus rule now covers keyboard-focus-visible elements. Tools disclosure also has44px target. Focus/navigation tests38/38 passed in both browsers, including restored pinning/reload/return-to-top coverage. This is the only product change since round2.

## Workflow handoff

Round 3 passed with both reviewers reporting no actionable P0–P3 findings. The context paths above describe the review-time active change; after the separate successful spec sync, it was archived locally under openspec/changes/archive/2026-10-23-refresh-site-design-system. That archive is ignored by repository policy. Published main specs and design-system evidence/roadmap retain the handoff; the apply command above is historical after archival.
