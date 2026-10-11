# dsh-leafy-skin

An eye-friendly green skin for the DeepSeek Harness web GUI: a leafy palette layered over the
official theme tokens, in light and dark variants.

**English** | [中文](README.zh.md)

> 📷 **Screenshot — coming soon.**

<!-- 截图就绪后，把上面那行替换成图片（建议放到 docs/）：
![Leafy skin — light mode](docs/light.png)
![Leafy skin — dark mode](docs/dark.png)
-->

## Features

- **Layered greens** — a mist-green canvas, raised panels, a deeper sidebar, and emerald accents
  (light) / mint accents (dark) instead of one flat wash of green.
- **Comfortable by construction** — no pure white or pure black, a single green hue family, and
  all body text at WCAG AA (≥ 4.5:1).
- **Texture** — softer corner radii, green-tinted diffuse shadows, low-contrast hairlines, and
  glassy menus.
- **Details** — mint text selection, Inter / Noto Sans SC / Cascadia Code in the font stacks,
  slimmer scrollbars, and gentle hover and menu motion.
- **Tunable** — the palette is one commented table, a self-check script guards contrast, and the
  CSS layer has a single on/off switch.

## Install

Needs the DSH desktop app. From your checkout of this repo:

```powershell
& "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" `
  plugin --profile desktop add C:\path\to\dsh-leafy-skin
```

Restart DSH once so the profile recomposes. Afterwards, colour edits only need a page refresh
(client changes hot-reload within about a second).

## Uninstall

Any one of these, then restart DSH:

1. Comment out the `insert` entry in `cordis.patch.yml`;
2. Drop `dsh-leafy-skin` from `dsh.profile.bundles` in `~/.dsh/profiles/desktop/package.json`;
3. Run `dsh plugin --profile desktop remove dsh-leafy-skin`.

To keep the palette but drop the CSS layer, set `ENABLE_CSS_LAYER = false` in `lib/client.js`.

## Customize

- **Colours** — the `TOKENS` table in `lib/client.js`, grouped and commented by area.
- **Radii, shadows, fonts, motion** — the same file, plus the small CSS layer below it.
- **Check your work** — `node tools/check-palette.mjs` validates token shape, text and syntax
  contrast, and the CSS layer's constraints.

## How it works

DSH themes are plain CSS custom properties (`--dsw-*`) resolved on `<body>` — components never
hard-code colours — so a skin is a client plugin that:

- stacks 112 tokens over the active theme through `ctx.theme.overrideTokens(...)`. Values are
  `{ light, dark }` pairs, so switching colour schemes just works;
- adds a small CSS layer for what tokens cannot reach: text selection, transition defaults for
  elements that only declare `:hover`, and menu entrance;
- injects one `<style>` from the host side so the very first frame is already green.

No build step and no dependencies: `lib/client.js` is a hand-written `__ModuleLoader__` factory.

## Limitations

- The native window title bar belongs to the DSH shell, not to this plugin, so it stays DSH grey
  for the instant before the page paints.
- Real see-through glass is impossible on Windows — the sidebar depth and translucent menus are
  colour layering, not blur through the window.
- Components hard-code font sizes and layout in hashed CSS modules, so this skin deliberately
  leaves them alone.

## Contributing

Issues are welcome: bug reports, colour suggestions, and screenshots of anything that looks off.

**Pull requests are not accepted** — this is a personal skin, and reviewing patches would cost
more than it returns. Please open an issue instead.

<!-- TODO: 配好远端后补上 issue 链接，例如 https://github.com/<you>/dsh-leafy-skin/issues -->

## License

[MIT](LICENSE)
