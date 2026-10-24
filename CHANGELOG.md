# Changelog

All notable changes to dsh-leafy-skin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [0.2.1] - 2026-10-24

### Fixed

- Fix inline code being nearly invisible on the green canvas by deepening its fill and adding a thin inset ring.

## [0.2.0] - 2026-10-20

This release turns "which corners still show the official blue or grey" into a measurable
coverage matrix, then closes the gaps it proves.

### Added

- Add a token coverage matrix that reads the installed DSH stylesheets and reports whether each token is covered directly, covered by derivation or missing, along with its real usage in official bundles.
- Add a stable-hook check that fails when a `data-*` hook the style layer relies on disappears upstream, instead of letting rules fail silently.
- Add a release-manifest check and CI that guard version numbers, published files, entry points and the parity of the English and Chinese docs.

### Changed

- Turn the raw grey scale that components read directly into leafy grey, so deliverable, plan and schedule cards and the right-sidebar empty state stop reading grey.
- Replace several hard-coded blue, black and white values with the leafy family on the settings badge, account page, trajectory panel, drag overlay and skeleton placeholders.
- Move the trajectory turn highlight from blue to green, leaving the blue steps used by categorical charts untouched.

### Fixed

- Fix the first frame painting a different canvas colour than the mounted skin.
- Extend the contrast checks to translucent menus composited onto the canvas and to the focus ring.

### Documentation

- Document the coverage policy, the new tools and several pitfalls.

## [0.1.2] - 2026-10-17

### Added

- Add a plugin icon that replaces the default DSH artwork on the Plugins page.
- Add localized plugin descriptions so the plugin card follows the UI language.
- Add the powered-by-dsh badge to the end of both READMEs.

## [0.1.1] - 2026-10-12

### Added

- Animate the session-stats and context-usage popovers with a short lift and scale from their trigger.
- Fade and lift the message area when switching sessions.
- Swap the sidebar collapse easing for a curve that starts immediately and lands softly.
- Give the sidebar panel tab strip a distinct selected fill plus a hairline, a resting tint and a selected inset ring.

### Documentation

- Record pitfalls about anchored popovers having no animation and motion variables being overridden only while animating.

## [0.1.0] - 2026-10-11

First usable release: palette, texture, typography, a style layer and first-frame boot CSS.

### Added

- Add a layered green palette that separates canvas, panels and sidebar, replacing the official blue accent with emerald and mint.
- Tighten the corner radii, switch to green-ink diffuse shadows and lower the contrast of the hairlines.
- Tune the font stacks, code-block fills, scrollbar geometry and syntax colours so code sits well on a green ground.
- Add a switchable style layer covering text selection, transition fallbacks, menu and popover entrances, and composer focus feedback.
- Add host boot CSS so the first frame is already leafy instead of the official white or black.
- Add a palette self-check that validates token shape, contrast and the style-layer constraints.

### Fixed

- Fix stiff transitions by using a faster-starting ease and reverting the official motion variables that had been overridden.
- Fix translucent menus fading in through a blurry half-transparent frame by animating translation and scale only.
- Lighten the composer focus ring and express elevation through shadow instead.

### Documentation

- Split the README into English and Chinese versions and add the MIT license.
- Unify line endings and add repository notes with pitfalls.
- Add this file.
