# dsh-leafy-skin

DSH Web GUI 的护眼绿叶皮肤：在官方主题 token 之上叠一层叶绿调色板，含浅色与深色两套。

[English](README.md) | **中文**

> 📷 **截图待补。**

<!-- 截图就绪后，把上面那行替换成图片（建议放到 docs/）：
![Leafy 皮肤 — 浅色模式](docs/light.png)
![Leafy 皮肤 — 深色模式](docs/dark.png)
-->

## 特性

- **分层绿**——雾绿画布、抬起的面板、更深一档的侧栏，浅色用翡翠、深色用薄荷做强调色，
  不再是平铺的一整块绿。
- **护眼是结构性的**——不用纯白纯黑、色相统一在一个绿系、正文全部守住 WCAG AA（≥ 4.5:1）。
- **质感**——更柔和的圆角、带绿意的弥散阴影、低对比发丝描边、通透的菜单材质。
- **细节**——薄荷色文本选区、Inter / Noto Sans SC / Cascadia Code 字体栈、纤细滚动条，
  以及克制的悬停与菜单动效。
- **可调**——调色板就是一张带分组注释的表，自检脚本守住对比度，样式层有一个总开关。

## 安装

需要 DSH 桌面版。在你本地的仓库目录执行：

```powershell
& "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" `
  plugin --profile desktop add C:\path\to\dsh-leafy-skin
```

首次安装后重启一次 DSH，让 profile 重新组合。之后只改颜色的话，刷新页面即可
（客户端改动约 1 秒内热更新）。

## 卸载

任选其一，然后重启 DSH：

1. 注释掉 `cordis.patch.yml` 里的 `insert` 行；
2. 从 `~/.dsh/profiles/desktop/package.json` 的 `dsh.profile.bundles` 里删掉 `dsh-leafy-skin`；
3. 执行 `dsh plugin --profile desktop remove dsh-leafy-skin`。

只想保留调色板、去掉样式层的话，把 `lib/client.js` 里的 `ENABLE_CSS_LAYER` 改成 `false`。

## 定制

- **颜色**——`lib/client.js` 里的 `TOKENS` 表，按部位分组并带注释。
- **圆角、阴影、字体、动效**——同一个文件，以及它下面的那一小块样式层。
- **改完自检**——`node tools/check-palette.mjs` 会校验 token 形状、文字与语法高亮的对比度，
  以及样式层的三条约束。

## 工作原理

DSH 的主题就是一组解析在 `<body>` 上的 CSS 变量（`--dsw-*`），组件从不写死颜色。所以皮肤
是一个客户端插件，它：

- 通过 `ctx.theme.overrideTokens(...)` 把 112 个 token 叠在当前主题之上；值必须是
  `{ light, dark }` 成对，因此切换浅色/深色/跟随系统都能自动取对应那一档；
- 额外加一层很小的 CSS，补 token 够不到的细节：文本选区、只写了 `:hover` 的元素的过渡兜底、
  菜单入场，以及输入框的聚焦反馈——光标取强调色，聚焦时一圈柔光把输入卡片"托起来"
  （用阴影而不是位移）；
- 在 Host 侧注入一段 `<style>`，让第一帧就已经是绿的。

零构建、零依赖：`lib/client.js` 是手写的 `__ModuleLoader__` 工厂。

## 已知限制

- 原生窗口标题栏属于 DSH 桌面外壳、不归插件管，所以页面渲染出来之前那一瞬仍是 DSH 的灰白。
- Windows 上做不出真的透视毛玻璃——侧栏的层次与半透明菜单是颜色分层，不是透过窗口的模糊。
- 组件把字号与布局写死在哈希 CSS module 里，本皮肤刻意不去碰它们。

## 参与

欢迎提 issue：bug、配色建议、哪里看着别扭的截图都行。

**不接受 PR**——这是个人自用的皮肤，review 补丁的成本高于收益，请改用 issue。

<!-- TODO: 配好远端后补上 issue 链接，例如 https://github.com/<you>/dsh-leafy-skin/issues -->

## 许可证

[MIT](LICENSE)
