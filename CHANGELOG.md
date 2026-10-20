# Changelog

All notable changes to dsh-leafy-skin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-10-20

The theme of this release is "closing the gaps": turn "which corners still show the official
blue/grey" from folklore into a measurable matrix, then fill what the matrix proves.

### Added

- **Token coverage matrix** — `tools/audit-tokens.mjs` reads the installed DSH: every `--dsw-*`
  token the official stylesheets declare, its light/dark value, whether this skin covers it
  directly or through a `var()` chain, and how many times the official bundles actually consume
  it. `--strict` fails on a token that is used but neither covered nor exempted with a reason.
- **Stable-hook check** — `tools/check-hooks.mjs` extracts the `data-*` hooks the style layer
  relies on from `lib/client.js` and looks them up in the installed bundles, including the
  composed `dsh-web-frontend` build. An upstream JSX rename now fails loudly instead of
  silently disabling rules.
- **Manifest check and CI** — `tools/check-manifest.mjs` and `.github/workflows/check.yml` guard
  the version numbers (both changelogs and both README compatibility tables), the `files` list,
  entry points, icon size, and heading parity between the English and Chinese docs.

### Changed

- **Grey scale goes green (option A)** — `--dsw-static-neutral-50` through `-1000` now map onto
  the leafy grey ladder. These statics are absolute by contract (one value for both modes), so
  each maps to a single green-grey value rather than a light/dark pair, preserving "which step
  is darker". Consumers: the deliverables / plan / schedule cards (light 50/100, dark 850/800),
  their 40px icon tiles, and the right-sidebar empty-state icon.
- **Hard-coded leftovers** — `--dsw-alias-brand-primary-new-colorprimary-new-color` (light mode
  hard-codes `#4176e6`; used by the desktop-update badge in Settings, the account page and the
  trajectory rail) now follows the brand green; `--dsw-alias-label-shimmer` drops pure black and
  white for green ink and mint white; the drag-and-drop overlay `--dsw-alias-bg-mask-drop` loses
  its blue-grey dark value; `--dsw-alias-bg-skeleton` loses its pure black/white alpha.
- **`--dsw-static-blue-500`** follows the accent family: its remaining consumer is the
  trajectory turn highlight (document selection is overridden separately). The other blue steps
  stay cold because they are categorical chart colours.

### Fixed

- **First-frame colour** — the host boot CSS used `#F1F6ED` / `#131A12` while the token layer
  paints `#EDF3E6` / `#121810`, so the first frame shifted a notch. A self-check now enforces
  that the two are equal.
- **Two more contrast tiers** — translucent glass surfaces (menus at 58% / 50%) are composited
  onto the canvas before text contrast is measured, and the focus ring is verified against the
  AA 1.4.11 non-text threshold of 3:1.

### Documentation

- `AGENTS.md` gains the coverage policy (four categories plus the exemption rule), the three new
  tool commands, and pitfalls: statics are absolute colours, only cover tokens that have
  consumers, and hooks may only exist in the composed build.

## [0.1.2] - 2026-10-17

### Added

- **Plugin icon** — `icon.svg`, a white leaf on the leafy gradient, replaces the default DSH plugin
  artwork on the Plugins page; declared through `package.json`'s `icon` field and shipped in the
  npm package.
- **Localized description** — `locale/en.json` / `locale/zh.json` give the plugin card a description
  that follows the UI language, instead of the single-language `package.json` description.
- **README badge** — both READMEs now end with the "powered by dsh" badge.

## [0.1.1] - 2026-10-12

### Added

- **Anchored popovers** — the session / turn stats and the context-usage panel used to appear in a
  single frame (these official `role=dialog` panels have no animation at all). They now float up
  4px from their trigger and scale from .985 to 1 over 160ms. The panel is a translucent glass
  surface, so opacity stays at 1 throughout — no "blurry first, then solid".
- **Session-switch content entrance** — switching sessions fades the message area in and lifts it
  4px (200ms easeOutQuint). It replays naturally through the `settling→active` migration of
  `[data-phase]` / `[data-content-phase]` and through the view area unmounting and remounting,
  with zero JS.
- **Sidebar collapse easing** — the official `grid-template-columns .3s cubic-bezier(.4,0,.2,1)`
  (which starts at zero velocity) becomes `.36s cubic-bezier(.22,1,.36,1)` (easeOutQuint: full
  speed out of the gate, long soft landing). The override only rewrites the variables while the
  animation runs (`[data-animating]`), so tooltips, modals and primary buttons are unaffected.
- **Sidebar panel tab strip** — dockkit's tabs only style the selected and hover states, and the
  selected background (`--dsw-alias-markdown-tag`, officially neutral-bluish-75/850) sits almost
  on top of the sidebar fill, so a strip of tabs read as two lines of grey text. That token —
  consumed by nothing but dockkit's selected tab across the whole bundle — now sits clearly apart
  from the sidebar fill (light `#C9DEC7` / dark `#2C3B2C`, still ≥ 8:1 against `label-primary`),
  backed by three properties the official CSS never sets: a hairline under the tab strip, a resting
  tint and 500 weight for tabs, and an emerald inset ring on the selected one. The hooks are
  `[data-dockkit-strip]` / `[data-dockkit-tab]` / `aria-selected`: zero specificity, and none of
  them contesting an official declaration.

### Documentation

- `AGENTS.md` pitfalls gain three entries: official anchored popovers have no animation, official
  motion variables are overridden only while animating, and how session-switch entrances replay
  (plus the known gap).

## [0.1.0] - 2026-10-11

First usable release. The skin is a token layer (112 `--dsw-*` overrides, light emerald / dark
mint) plus a switchable style layer plus host-injected first-frame boot CSS.

### Added

- **Palette (3A colour layering)** — a mist-green canvas, raised panels and a deeper sidebar pull
  three levels apart; the accent family moves from the official deepseek blue to emerald in light
  mode and mint in dark, and links, primary buttons, bubbles, state dots and onboarding gradients
  all turn green with it.
- **Space and texture (3B)** — radii tighten from the official 4/8/12/16/20/28 to 6/8/10/14/18/18;
  shadows become green-ink diffuse (`#122C1A` / `#040A05`) with a wider spread and lower per-layer
  opacity; the four hairline steps drop to 4–14% in light and 5–16% in dark.
- **Typography and details (3C)** — Inter / Noto Sans SC join the font stack and Cascadia Code
  moves ahead of Consolas in the code stack; code block fills, scrollbar geometry (5px → 8px with
  a 2px transparent edge for a visual inset) and hover strength are tuned; syntax highlighting
  moves from cold colours to a warm green family that sits well on a green ground.
- **Style layer (3D, switchable via `ENABLE_CSS_LAYER`)** — text selection highlighting (the
  official bundle only defines `::selection` for the PDF text layer and xterm), a zero-specificity
  `:where(*)` transition fallback, menu / popover entrance motion, composer focus feedback (accent
  caret plus an `::after` soft ring, with elevation expressed as shadow), and all fallback motion
  disabled under `prefers-reduced-motion`.
- **Host first frame** — `webserver/index-inject` appends boot CSS covering all six light / dark /
  follow-system combinations, so the first frame is already leafy instead of the official
  hard-coded `#fff` / `#151517`.
- **Tooling** — `tools/check-palette.mjs` validates token shape, 20 text/background and 18 syntax
  contrast pairs, and the style layer's three constraints (balanced brackets / no `!important` /
  no class selectors).

### Fixed

- Transition feel: dropped `cubic-bezier(.2,0,0,1)` (zero starting velocity, perceived as "nothing,
  then a jerk") in favour of easeOutQuad `cubic-bezier(.25,.46,.45,.94)` at around 200ms; reverted
  the mistakenly overridden official motion variables (`--ds-ease-in-out` and
  `--ds-transition-duration*` exist for size animations such as the sidebar collapse); widened the
  fallback from named form controls to a global `:where(*)` fallback.
- Menu entrance now uses pure `translate`/`scale` instead of an opacity fade: a translucent glass
  surface fading by opacity shows "blurry through a half-transparent composite, then solid".
- Composer focus ring lightened (3px / 16% → 2px / 12%, lower shadow tightened to match).

### Documentation

- `README.md` / `README.zh.md` split into English and Chinese versions, MIT `LICENSE` added
  (copyright badai147).
- Line endings unified to LF (`.gitattributes`), and a new `AGENTS.md` records repository notes
  and pitfalls.
- This file added.
