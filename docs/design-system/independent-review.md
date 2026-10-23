# Independent review record

## Round 1

Two fresh read-only reviewers inspected the frozen implementation and OpenSpec
packet. Reviewer A covered requirements/scenarios/task compliance; reviewer B
covered behavior/integration/regressions/tests. Both reported no P0/P1 findings.
Both accepted the failed split gate and joint transparent-drawer fallback, with
Android testing explicitly deferred by the user until after the PR.

Four unique P2 findings were accepted (two appeared in both reports):

1. Cylinder derived outer-diameter text used a surface token and lacked contrast.
2. Footer links lacked 44×44 targets and the required 3px focus treatment.
3. Mobile navigation could remain open after Tab left it, obscuring focus.
4. Development-only STEP plus other English exports at 320px exceeded the fixed
   mobile action reservation; the production-equivalent controls fit.

All four were fixed without changing geometry, export formats or saved data.
Changed-field contrast, footer size/focus, forward/backward menu focus exit and
320px development-action geometry receive focused behavioral coverage. Affected checks passed: navigation/dialog/focus/footer suites 26/26 across
Chromium and Firefox; CAD contrast/narrow action/layout checks 5/5; type/Svelte
check zero errors/warnings; build 73 pages. One Firefox exact-float comparison
reported 44 versus 43.99999809265137; it now compares to 0.0001px precision and
the full navigation suite passed. No timeout or meaningful layout tolerance was
relaxed. Round 2 uses a new independent pair on this resulting diff.

Physical Android keyboard/touch/orientation and remote CI are not established by
these local reviews. Failed/interrupted initial test runs remain distinguishable
from isolated successful reruns in the verification evidence.

## Round 2

A new independent pair reported no P0/P1 and one shared P2 focus migration gap:
native documentation/model disclosures, assembly controls and CAD exports still
used browser-default outlines. Both confirmed the four round-1 fixes.

The shared stylesheet now gives every keyboard-focus-visible element a 3px solid
semantic focus outline, including native controls. The models tools disclosure
also has a 44px target. New rendered checks cover both appearances and browsers
for chapter/FAQ/tools disclosures, assembly links/controls and CAD exports.
Navigation pinning, reload at a mid-page position and return-to-top coverage was
restored in response to the compliance review's coverage observation.

The complete focused keyboard/navigation run passed 38/38 in Chromium and
Firefox. Round 3 uses another fresh pair after checks of this final focus change.

## Round 3 — final gate

Fresh reviewers `review_spec_r3` (requirements/scenarios/task compliance) and
`review_code_r3` (implementation/integration/regressions/tests) both returned
**PASS with no actionable P0–P3 findings**. They inspected the full current
packet and diff, checked the shared focus fix and recorded keyboard coverage,
confirmed mount-only framing and separate thumbnails, and accepted the explicit
failed mobile gate / legacy fallback. Both independently checked the diff; the
compliance reviewer also reran strict OpenSpec validation successfully.

Final round count: 3. Five unique P2 findings from rounds 1–2 were accepted and
fixed; none were dismissed. The navigation coverage observation was addressed.
The gate is complete. Existing toast/header overlap and translucent Playground
text interference remain disclosed legacy limitations. Android physical checks,
remote CI and deployment are still separate, unverified stages.
