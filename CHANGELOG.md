# 更新日志

本文件记录 dsh-leafy-skin 所有值得注意的变更，格式参考
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.0] - 2026-10-11

首个可用版本。皮肤 = token 层（112 个 `--dsw-*` 覆盖，浅色翡翠 / 深色薄荷）
+ 可关的样式层 + Host 首帧引导 CSS。

### 新增

- **调色板（3A 色彩分层）**——雾绿画布 / 抬升面板 / 深一档侧栏三档拉开层次；强调色族从官方
  deepseek 蓝换成浅色翡翠、深色薄荷，链接、主按钮、气泡、状态点与引导页渐变一并跟着变绿。
- **空间与质感（3B）**——圆角从官方 4/8/12/16/20/28 收到 6/8/10/14/18/18；阴影换成绿墨弥散
  （`#122C1A` / `#040A05`）并加大扩散、降低单层不透明度；四档描边压到浅色 4–14% / 深色 5–16%。
- **排版与细节（3C）**——字体栈加入 Inter / Noto Sans SC，代码字体把 Cascadia Code 提到
  Consolas 之前；代码块底色、滚动条几何（5px → 8px，2px 透明边做视觉内缩）、hover 强度调优；
  语法高亮从冷色换成与绿底和谐的暖绿系。
- **样式层（3D，`ENABLE_CSS_LAYER` 可关）**——文本选中高亮（官方全包只有 PDF 文本层与 xterm
  定义过 `::selection`）、`:where(*)` 零特异性过渡兜底、菜单/浮层入场动效、输入框聚焦反馈
  （强调色光标 + `::after` 柔光环，抬升感用阴影表达），并在 `prefers-reduced-motion` 下关掉兜底动效。
- **Host 首帧**——`webserver/index-inject` 追加引导 CSS，覆盖浅色 / 深色 / 跟随系统六种组合，
  第一帧就是叶绿，不再是官方写死的 `#fff` / `#151517`。
- **开发工具**——`tools/check-palette.mjs`：校验 token 形状、20 组文字/底色与 18 组语法高亮对比度，
  以及样式层三条约束（括号配平 / 无 `!important` / 无类选择器）。

### 修复

- 过渡手感：弃用 `cubic-bezier(.2,0,0,1)`（起步速度为零，观感"先不动再猛走"），统一 easeOutQuad
  `cubic-bezier(.25,.46,.45,.94)` + 约 200ms；回退被误改的官方动效变量（`--ds-ease-in-out`、
  `--ds-transition-duration*` 是侧栏收放这类尺寸动画专用的）；兜底范围从"点名表单控件"扩大为
  `:where(*)` 全局兜底。
- 菜单入场改为纯 `translate`/`scale`，去掉透明度淡入：半透明玻璃表面按透明度淡入会看到
  "先透一层糊、再变实"。
- 输入框聚焦光环调轻（3px / 16% → 2px / 12%，下阴影同步收）。

### 文档

- `README.md` / `README.zh.md` 拆成英文、中文两版，补 MIT `LICENSE`（版权归 badai147）。
- 换行统一 LF（`.gitattributes`），新增 `AGENTS.md` 记录仓库须知与踩坑记录。
- 新增本文件。
