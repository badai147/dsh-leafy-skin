# 更新日志

本文件记录 dsh-leafy-skin 所有值得注意的变更，格式参考
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.1] - 2026-10-12

### 新增

- **锚定弹窗入场**——会话 / 回合统计与"上下文占用"面板点开是一帧蹦出来的（官方这套 `role=dialog`
  面板零动画）。现在从触发器方向上浮 4px + 缩放 .985→1（160ms）；面板是半透明玻璃面，全程
  opacity 保持 1，不出现"先透一层糊、再变实"。
- **会话切换内容入场**——切换会话时消息区淡入 + 上浮 4px（200ms easeOutQuint）。靠
  `[data-phase]` / `[data-content-phase]` 的 `settling→active` 迁移与视图区卸载重挂自然重放，
  零 JS。
- **侧栏收放曲线**——官方 `grid-template-columns .3s cubic-bezier(.4,0,.2,1)`（起步速度为零）
  换成 `.36s cubic-bezier(.22,1,.36,1)`（easeOutQuint，起步即全速、落地绵长）。只在动画期间
  （`[data-animating]`）改写官方读取的变量取值，tooltip、模态、主按钮等不受影响。
- **侧栏面板 tab 条**——dockkit 的 tab 只写了"选中底 + hover 底"，而选中底
  （`--dsw-alias-markdown-tag`，官方默认 neutral-bluish-75/850）与侧栏底几乎同色，一条 tab
  看起来就是两行灰字。改为把这个"全包只有 dockkit 选中 tab 消费"的 token 拉到与侧栏底明显
  不同的一档（浅色 `#C9DEC7` / 深色 `#2C3B2C`，配 `label-primary` 仍 ≥ 8:1），并补三条官方
  没写过的属性：tab 条底部发丝线、未选中 tab 的常驻淡底与 500 字重、选中 tab 的品牌绿内描边；
  钩子用 `[data-dockkit-strip]` / `[data-dockkit-tab]` / `aria-selected`，零特异性、不抢属性。

### 文档

- `AGENTS.md` 踩坑记录补三条：官方锚定弹窗零动画、官方动效变量只在动画期覆盖、会话切换的
  重放机制与已知缺口。

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
