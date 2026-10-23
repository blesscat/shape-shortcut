# site-navigation Specification

## Purpose

Defines the observable behavior of the shared floating navigation capsule:
it stays pinned while scrolling, collapses to a compact form that folds
its secondary links once the page leaves the top, and keeps every
remaining control fully usable in both states for all themes and locales.

## Requirements

### Requirement: Navigation stays pinned while scrolling

The shared navigation SHALL remain pinned at the top while scrolling. Brand, models, docs, About, theme, language and configured support destinations MUST remain reachable in both expanded and compact states. Models/docs MUST have direct desktop links; narrow layouts MUST provide an accessible menu when links do not fit. The support action MUST have secondary visual emphasis relative to the page's main task.

#### Scenario: Scrolled to the bottom of a long page

- **WHEN** the user scrolls a long page far from the top
- **THEN** the navigation bar MUST still be pinned at the top of the
  viewport
- **AND** every control the current form presents (brand link, theme
  toggle, locale switch, support trigger) MUST remain visible and
  clickable

### Requirement: Navigation collapses to a compact form when scrolled past the top

The navigation SHALL present an expanded form near the page top and a compact form beyond a small threshold. The compact chrome MUST occupy less visible vertical space without changing the reserved page-content offset. Returning near the top MUST restore the expanded form. A jump to a deep anchor MUST resolve the correct compact state without additional scrolling.

#### Scenario: Page at the top shows the expanded navigation bar

- **WHEN** the page is at or near the top (scroll position within the
  threshold)
- **THEN** the navigation bar MUST be in its expanded form

#### Scenario: Scrolling past the threshold collapses the navigation bar

- **WHEN** the user scrolls the page beyond the threshold
- **THEN** the navigation bar MUST switch to the compact form
- **AND** the navigation bar's bottom edge MUST sit measurably higher in the
  viewport than the expanded form's bottom edge

#### Scenario: Scrolling back to the top expands the navigation bar

- **WHEN** the user scrolls back near the top of the page
- **THEN** the navigation bar MUST return to the expanded form

#### Scenario: Landing on an in-page anchor keeps the navigation bar compact

- **WHEN** the page is loaded or jumped to an anchor far from the top
- **THEN** the navigation bar MUST present the compact form without
  requiring further scrolling

### Requirement: Compact form folds secondary navigation links

The compact form SHALL retain direct models/docs/About links whenever width allows. When these destinations are folded on narrow screens they MUST remain reachable through a labeled menu trigger, without scrolling to the top. The brand, theme, language and configured support action MUST remain reachable. The closed menu's links MUST not be focusable; opening the menu MUST expose them to keyboard and assistive technology. Escape and explicit close MUST close the menu and restore focus to its trigger.

#### Scenario: Navigation links fold while scrolled

- **WHEN** the navigation bar is in its compact form
- **THEN** the docs, models, and about destinations MUST remain reachable directly or through the labeled menu
- **AND** the brand link, theme toggle, locale switch, and configured support action MUST remain reachable and operable

#### Scenario: Folded links return near the top

- **WHEN** the page scrolls back near the top and the navigation bar expands
- **THEN** the docs, models, and about destinations MUST remain reachable, with direct links restored when width allows

#### Scenario: Folded destinations work without scrolling back

- **WHEN** a narrow-screen user opens the navigation menu while far down a page
- **THEN** models, docs and About MUST be available as keyboard-operable localized links
- **AND** closing with Escape MUST return focus to the menu trigger

#### Scenario: Navigation works without client scripting

- **WHEN** JavaScript is unavailable on a static page
- **THEN** all primary destinations MUST remain reachable through visible links or a native disclosure

### Requirement: Navigation state switches never move page content

Expanded/compact switching SHALL change only navigation chrome within a reserved header area. It MUST NOT shift document content, anchor destinations or CAD framing. Switching themes MUST preserve the navigation size, state and pinned offset.

#### Scenario: Theme switches never shift layout

- **WHEN** the user switches between light and dark themes at any scroll
  position
- **THEN** the navigation bar's form (expanded or compact) and size MUST NOT
  change
- **AND** its pinned offset and reserved content offset MUST remain identical across themes

### Requirement: Compact form preserves interactive target sizes

Compact navigation SHALL reduce chrome rather than shrinking interactive targets. Brand, theme, language, menu, support and visible destination links MUST retain at least 44px hit areas and unchanged text size across expanded/compact states.

#### Scenario: Theme toggle size is unchanged between states

- **WHEN** the navigation bar switches between expanded and compact forms
- **THEN** the theme toggle's rendered size MUST be identical in both
  states
- **AND** every navigation link, whenever rendered, MUST keep the same
  text size

### Requirement: Collapse behavior is identical across themes and locales

Scroll-collapse behavior SHALL use the same thresholds and pinned offset in both appearances and all supported locales. Responsive folding MUST account for complete localized labels without truncating destinations or producing horizontal overflow.

#### Scenario: Dark mode collapses at the same scroll threshold

- **WHEN** the user scrolls past the threshold in dark mode
- **THEN** the navigation bar MUST switch to the compact form exactly as in light
  mode
- **AND** switching themes while scrolled MUST NOT change which form
  (expanded or compact) is presented

### Requirement: Reduced-motion users switch states without animation

For users with reduced motion enabled, the navigation bar SHALL switch between
expanded and compact forms without an animated transition. The state
switching itself MUST still happen.

#### Scenario: Collapse under reduced motion

- **WHEN** reduced motion is enabled and the user scrolls past the
  threshold
- **THEN** the navigation bar MUST switch to the compact form
- **AND** the switch MUST NOT be animated
