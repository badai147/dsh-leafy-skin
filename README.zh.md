# dsh-leafy-skin

护眼绿色皮肤：在 DSH Web GUI 的官方主题之上叠一层叶绿调色板，浅色翡翠 / 深色薄荷两套。

> 我想做一个类似于我的世界的材质包一样的效果。

[English](README.md) | **中文**

## 版本兼容

| 插件版本 | DSH 版本 |
| --- | --- |
| v0.2.1 | dsh-v0.2.1-rc.3 |
| v0.2.0 | dsh-v0.2.1-rc.2 |
| v0.1.2 | dsh-v0.2.1-rc.2 |
| v0.1.1 | dsh-v0.2.0-rc.2 |
| v0.1.0 | dsh-v0.2.0-rc.2 |

## 截图展示

![截图展示](show.png)

## 特性

- **分层绿**——雾绿画布、抬起的面板、深一档的侧栏，浅色用翡翠、深色用薄荷做强调色，
  不是平铺的一整块绿。
- **护眼是结构性的**——不用纯白纯黑、色相统一在一个绿系、正文全部守住 WCAG AA（≥ 4.5:1）。
- **质感**——更柔和的圆角、带绿意的弥散阴影、低对比发丝描边、通透的菜单材质。
- **细节**——薄荷色文本选区、Inter / Noto Sans SC / Cascadia Code 字体栈、纤细滚动条，
  以及克制的悬停与菜单动效。
- **可调**——调色板就是一张带分组注释的表，自检脚本守住对比度，样式层有一个总开关。

## 安装

```
dsh plugin --profile web add dsh-leafy-skin
```

装完重启一次 DSH，让 profile 重新组合。之后只改颜色的话刷新页面即可
（客户端改动约 1 秒内热更新）。

## 使用

安装插件后加载即可。皮肤叠在当前主题之上，切浅色 / 深色 / 跟随系统都会自动取对应那一档。

## 自定义

- **颜色**——`lib/client.js` 里的 `TOKENS` 表，按部位分组并带注释。
- **圆角、阴影、字体、动效**——同一个文件，以及它下面的那一小块样式层。
- **只想要调色板**——把 `lib/client.js` 里的 `ENABLE_CSS_LAYER` 改成 `false`，样式层整个关掉。
- **改完自检**——`node tools/check-palette.mjs` 校验 token 形状、首帧色一致、文字与语法高亮
  对比度（含半透明玻璃面合成与焦点环），以及样式层的三条约束。
- **覆盖矩阵**——`node tools/audit-tokens.mjs` 读已安装的 DSH，列出它声明的每个 `--dsw-*`
  token：本皮肤是直接覆盖还是经 `var()` 链派生，官方 bundle 实际消费了多少次。`--strict`
  会让「有消费、却既没覆盖也没写豁免理由」的 token 失败。
- **稳定钩子**——`node tools/check-hooks.mjs` 确认样式层依赖的 `data-*` 钩子在上游还在，
  这样 DSH 升级时坏的是自检，不是观感。

## 卸载

任选其一，然后重启 DSH：

1. 注释掉 `cordis.patch.yml` 里的 `insert` 行；
2. 从 `~/.dsh/profiles/<profile>/package.json` 的 `dsh.profile.bundles` 里删掉 `dsh-leafy-skin`；
3. 执行 `dsh plugin --profile web remove dsh-leafy-skin`。

## 已知限制

- 原生窗口标题栏属于 DSH 桌面外壳、不归插件管，所以页面画出来之前那一瞬仍是 DSH 的灰白。
- Windows 上做不出真的透视毛玻璃——侧栏的层次与半透明菜单是颜色分层，不是透过窗口的模糊。
- 组件把字号与布局写死在哈希 CSS module 里，本皮肤刻意不去碰它们。

## 更新日志

见 [CHANGELOG.zh.md](CHANGELOG.zh.md)

## 贡献

有问题或者建议欢迎提 issue。本仓库不接受 PR。

## 许可证

[MIT](LICENSE)

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
