# AGENTS.md — dsh-leafy-skin 仓库工作须知

给在本仓库里干活的 AI/人看的。全局规则见 `~/.dsh/AGENTS.md`（先读它），这里只写本仓库特有的东西。

## 这是什么

DSH Web GUI 的**护眼绿叶皮肤插件**：在**当前主题之上**叠一层调色板覆盖（浅色翡翠 / 深色薄荷），
外加一层可关的样式层补 token 够不到的细节。形态照 `dsh-global-rules` 那套：`dsh.bundle.patch`
+ `dsh.client` + 手写 `__ModuleLoader__` 工厂，**零依赖、零构建**。

## 三层结构与生效方式

| 层 | 位置 | 机制 | 生效方式 |
|---|---|---|---|
| token 层 | `lib/client.js` 的 `TOKENS` | `ctx.theme.overrideTokens(PLUGIN_ID, tokens)`，ui-layout 写进 `<body>` 的 inline style | 客户端 HMR，约 1s |
| 样式层（可关） | `lib/client.js` 的 `CSS_LAYER` | 注入 `<style data-plugin="dsh-leafy-skin">` | 同上；开关 `ENABLE_CSS_LAYER` |
| Host 首帧 | `lib/index.js` | `webserver/index-inject` 追加引导 CSS（画布底色 / `--dsh-boot-bg`） | **Host 不热重载，必须重启 DSH** |

## 硬约束（违反会被自检拦下或被 DSH 升级打脸）

1. **token 值必须是 `{ light, dark }` 成对字符串**：裸字符串会被 `overrideTokens` 直接抛错，
   深/浅色缺一档也不可读。
2. **样式层不许出现类选择器**（`.BynINW_frame` 这类哈希类名升级即失效）。可用钩子只有元素、
   `::selection`、`prefers-reduced-motion`，以及官方 JSX 里刻意加的稳定钩子：
   `[data-composer-card]`（输入卡片）、`[data-composer-input]`（Lexical 编辑区）、
   `[data-input-scroll]`、`[data-composer-placeholder]`、`[data-menu-material]`（菜单/浮层）、
   `[data-menu-backing]`、`[role=...]`，以及 dockkit 面板 tab 条的 `[data-dockkit-strip]` /
   `[data-dockkit-tab]`（常配合 `aria-selected`）。
3. **样式层一律套 `:where()` 归零特异性**，不加 `!important`：组件自己写的
   `transition`/`animation` 永远优先，我们只补它没写的空白。唯一例外是侧栏收放那两个
   `--ds-*` 变量的覆盖——它不是抢属性，而是在动画期间改写官方规则读取的变量取值，
   作用域锁死在本次动画（见踩坑记录）。
4. **语义色不动**：错误红、警告黄、成功绿保持官方值，全绿会丢掉状态可读性。
5. **对比度底线 ≥ 4.5:1（AA）**：正文 / 次要 / 三级文字与语法高亮；caption 与代码注释是刻意的
   弱化档，改动时必须在注释里写明"刻意"。
6. **不动 `~/.dsh` 下的官方文件**，也不为"更好看"去 patch 官方包。
7. **保持零构建**：不加依赖、构建步骤或外置资源。样式内联成字符串是刻意的（官方 ui-theme 也这么干），
   外置 `.css` 需要打包/取资源，违反此约束。

## 覆盖策略（v0.2.0 起）

皮肤是叠加层，问题从来不是"颜色不好看"，而是**某处组件读了写死的灰/蓝，我们以为它会跟着
色阶变**。所以每个 token 必须落进四类之一，由 `tools/audit-tokens.mjs` 机械核对：

1. **色阶派生**——改官方色阶，别名自动跟着变（占大多数，工具里显示 `derived`）。
2. **别名显式覆盖**——一个色阶被两种角色共用、或官方在别名上写死值时拆开覆盖。
3. **语义色保留**——错误 / 警告 / 成功 / diff 的色相；进 `EXEMPT` 并写明理由。
4. **结构不覆盖**——字号、圆角几何、动效曲线、遮罩的纯黑 alpha；同样进 `EXEMPT`。

两条纪律：**只补有消费者的 token**（用量 0 的先不补，如 `button-tool-bar-*`）；**新增豁免
必须写清"为什么这是对的"**，不许为了过 CI 随手加。

静态灰阶（`--dsw-static-neutral-*`）按方案 A 绿化：它是官方定义的"绝对色"（浅深同值，组件
自己按主题挑号），所以覆盖时浅深两档写**同一个绿灰值**，只换色相、不改深浅排序。

## 命令

```powershell
# 必跑的自检（改完就跑，别靠肉眼）：token 形状、首帧色一致、文字/语法高亮对比度
# （含玻璃面合成与焦点环 3:1）、样式层三条约束（括号配平 / 无 !important / 无类选择器）
node tools/check-palette.mjs

# 覆盖矩阵：读已安装的 DSH，列出官方声明的每个 token 与真实用量；--strict 用于 CI
node tools/audit-tokens.mjs
node tools/audit-tokens.mjs --strict

# 稳定钩子：样式层用到的 data-* 是否还在官方 bundle（含 dsh-web-frontend 的 dist）
node tools/check-hooks.mjs

# 发布清单：版本号（两份 CHANGELOG + 两份 README 兼容表）、files、入口、图标体积、文档结构
node tools/check-manifest.mjs

# 安装到 desktop profile（写入 dependencies 与 dsh.profile.bundles）
& "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" `
  plugin --profile desktop add C:\Users\badai\projects2\dsh-leafy-skin
```

后两个「读已安装 DSH」的脚本用 `tools/asar.mjs` 直接解析 `app.asar`（Windows 默认安装位，
可用 `DSH_ASAR` 或 `--asar` 覆盖）；没装 DSH 的环境（比如 CI）会打印跳过并以 0 退出。

停用见 README 的卸载章节（注释 `cordis.patch.yml` 的 `insert` 行 / 从 profile 的
`dsh.profile.bundles` 删掉 / `dsh plugin --profile <profile> remove`），三条都需重启。

## 踩坑记录（别再走一遍）

- **缓动别用 `cubic-bezier(.2,0,0,1)`**：起步速度为零，短时长下观感是"先不动再猛走"，实测被
  评价为"生硬"。过渡类统一 easeOutQuad `cubic-bezier(.25,.46,.45,.94)` + 约 200ms。
- **半透明玻璃表面绝不用透明度淡入**：菜单底色是 `.material` 子层上的 `--dsw-menu-surface-fill`
  （浅色仅 58% 不透明）+ `backdrop-filter`，淡入的中间帧是"模糊按全强度算、却按半透明合成"，
  肉眼能看到"先透一层糊、再变实"。入场只动 `translate`/`scale`（用独立属性，别用 `transform`
  简写），opacity 保持 1。
- **官方动效变量别在全局改**（`--ds-ease-in-out`、`--ds-transition-duration*`）：它们定义在 `:root`
  上，全局改会连带 tooltip、模态、侧栏内容动画一起变，而且实测"改快"会让侧栏开合发顿。正确姿势是
  **只在动画期间改**：`:where([data-animating]){--ds-transition-duration-slow:…;--ds-ease-in-out:…}`。
  这不是抢属性，而是改写官方规则读取的变量取值，所以 `:where()` 的零特异性照样生效——变量由框架
  元素自己解析，而**继承永远打不过元素上的任何声明**。作用域天然锁死在本次收放（tooltip 与模态
  portal 到 body，在框架之外拿不到）。现在用的是 `.36s cubic-bezier(.22,1,.36,1)`（easeOutQuint，
  起步即全速、尾段长而软）。**时长别超 ~400ms**：框架除 `transitionend` 还有 600ms 兜底定时器，
  超了会在半路摘掉 `data-animating`，变量回退让过渡跳一下。
- **锚定弹窗（统计 / 上下文占用）官方零动画**：它们是 `createPortal` 到 body 的 `div[role=dialog]`，
  按 inline `left/top` 定位（`useAnchoredPosition` 只返回 left/top，不是 transform），所以位移安全；
  面板是 58% 不透明 + `backdrop-filter` 的玻璃面，只能 `translate`/`scale`，别 opacity 淡入。
  用 `:not([aria-modal])` 排除带遮罩的全屏模态（它们自己有 `_modalEnter`，类选择器特异性更高，
  我们本来也覆盖不了）。关闭方向没动画可做：React 直接卸载，做出场得 JS 延迟卸载，不值当。
- **会话切换的"重放"要么靠状态迁移，要么靠卸载重挂**：phase 挂在 `[data-phase]` /
  `[data-content-phase]` 上（`active`/`hero`/`settling`）。切到未加载的会话会走 `settling→active`，
  且视图区在 `session.blank && phase==="blank"` 时直接 `return null`（整个卸载重挂），所以规则会
  重新匹配、动画自然重放。**已知缺口**：两个 summary 都已就绪的会话互切时两者可能都不发生（不
  触发）——要全覆盖就得给 `[data-chat-flow-key]` 挂逐条入场（排除 `[data-chat-flow-kind=turn-process]`），
  代价是新消息、工具行也会各自动一下。消息区是实心文字、没有玻璃面，这里动 opacity 是安全的。
- **兜底范围要够大**：DSH 里大量可点区域是 `div`（列表行、卡片、菜单项），只兜表单控件不够，
  所以用 `:where(*)` 的零特异性全局兜底。
- **菜单定位走 inline `top/left`（`.portal`），不用 transform**——这是"可以安全动 translate/scale"
  的前提，改前先复核。
- **输入框不是 `<textarea>`**：composer 是 Lexical 的 `contenteditable`（`[data-composer-input]`、
  `role="textbox"`、`aria-multiline`），拿到卡片的是 `[data-composer-card]`。所有输入框相关的玩法
  都从这两个属性入手（`caret-color` 对 contenteditable 同样有效）。
- **别给 `[data-composer-card]` 加 translate/transform/scale**：卡片里可能挂 `position: fixed` 的
  浮层（提示条、下拉），卡片一旦有 transform，这些浮层会改用卡片当参照系、坐标整块飞掉。"抬升感"
  一律用阴影表达（现状：`::after` 上叠一圈柔光 + 一小片彩色下阴影）。同理，任何"想动 transform"
  的容器，先确认里面没有 fixed 浮层。
- **插件列表的图标和描述来自包清单，不是客户端代码**：DSH 在 Host 侧读 `package.json` 的
  `icon`（相对路径、≤256 KiB、SVG/PNG/JPEG/WebP）和 `<包>/locale/en.json` 加同目录其它语言
  文件（`{ meta: { title, description } }`）。locale 文件必须从 `exports` 导出
  （`./locale/*.json`），否则读取会失败；还得写进 `files`，否则 npm 包里没有。标题缺省回退包名，
  描述回退 `package.json` 的 `description`。改图标/文案只需动清单与 locale，别去客户端注入。
- **静态色阶是"绝对色"，覆盖时浅深写同值**：`--dsw-static-neutral-*` 官方只有一份值，组件
  自己按主题挑号用（浅色卡片用 50/100，深色同一处换 850/800；`neutral-00` 在深色里当 5% 白
  提亮）。所以覆盖时**两档写同一个绿灰**；写成 light/dark 两档会让深色里的"提亮"变成"压暗"。
- **只改 `--dsw-static-blue-500`，别动整族蓝**：其余蓝阶是上下文占用表的分类型配色
  （blue-450 是 messages 段），改了分段就分不清；blue-500 剩下的消费只有轨迹面板的回合强调
  （文档选区我们已单独覆盖）。
- **稳定钩子可能只存在于组合构建里**：`data-dockkit-strip` 只出现在
  `dsh-web-frontend/dist/assets/*.js`，源码 `lib/client.js` 里没有。`tools/check-hooks.mjs`
  因此扫 `lib` + `dist`；只扫源码会误报失效。
- **首帧色没有共享模块**：Host 的 `lib/index.js` 是 ESM，客户端是手写模块工厂，两边不能
  import。`LIGHT_BG` / `DARK_BG` 只能靠 `tools/check-palette.mjs` 钉住与
  `--dsw-alias-bg-base` 相等——改画布色时两处一起改，别只改一处。
- **`--dsw-focus-ring-color` 不是"没颜色的环"**：它只在 pointer 模态下被官方设成
  `transparent`，颜色实际走 `focus.css` 的 fallback `--dsw-alias-state-business-primary`
  （我们已经把它改绿）。所以焦点环不用覆盖，别被审计工具里的 `transparent` 骗到。
- **只补有消费者的 token**：官方声明 430 个 `--dsw-*`，其中大量当前用量为 0（如
  `button-tool-bar-*`）。先跑 `audit-tokens.mjs` 看用量再决定，别凭"名字像颜色"就补一堆。
- **行内代码的可见性全压在 token 上，样式层抢不动**：官方 `._markdown :not(pre)>code` 把背景、
  `.5px` 描边、圆角、内边距写死在一条 `(0,1,2)` 特异性的规则里，字号还带 `!important`；零特异性
  的样式层只能补它没写的 `box-shadow` / `color`。那条描边是 `--dsw-alias-border-l1`（浅色 4% 黑），
  0.5px 下合成出来对画布只有 1.11:1，等于没有——所以底色必须自己拉开（现在 1.12:1，`check-palette`
  守住 1.10 下限），再用 1px 内环补边界。`:not(pre)` 不能省，否则代码块里的 `<code>` 会被框住整块。

## 提交约定

- 一个阶段一个 commit（3A/3B/3C/3D 各一个），消息用中文，写清"改了什么 + 为什么"。
- **返工结论写进本文件的「踩坑记录」，不要堆到 README**：本仓库一半的价值在"为什么这么改"，
  README 要保持简洁。
- **文档**：`README.md` 英文、`README.zh.md` 中文，两者结构必须一致，改一个同步另一个；只放
  "是什么 / 怎么装 / 怎么改 / 限制 / 参与 / 许可"。许可证 MIT（`LICENSE`，版权归 badai147）。
  变更记录写进 `CHANGELOG.md`（英文）/ `CHANGELOG.zh.md`（中文），同样两份同步。
- **CHANGELOG 每条一句话**：一条一个句子，不写小标题、不写数值与论证；中英一条对一条
  （`tools/check-manifest.mjs` 校验条目数与句数）。
- 换行一律 LF，由 `.gitattributes` 钉住。不接受 PR，issue 欢迎（别把 README 改成"欢迎 PR"）。

## 发布

打 tag 即发布：`git tag v0.1.0 && git push origin v0.1.0`。GitHub Actions
（`.github/workflows/publish.yml`）在 ubuntu + node 22 上跑 `npm publish`，仓库需配 `NPM_TOKEN`
secret（npm Automation token）。零依赖所以不装依赖、不跑构建。

**tag 的版本号必须等于 `package.json` 的 `version`**，否则 workflow 在 publish 前就失败。发新版
流程：改 `version` → 补 `CHANGELOG.md` → 提交并推到 master → 打 `v<version>` tag 推送。

## 已知边界（改不到，别浪费时间）

- Windows 原生标题栏 overlay 颜色由桌面 shell 写死（`lib/main.js` 的 `chromeFallbackFill()`）；
  页面加载完成后那条标题栏由前端用 `--dsw-specific-sidebar-fill` 重画。
- macOS 标题栏的蓝紫渐变写在 ui-layout 样式表里；`--dsw-desktop-window-tint` 属于桌面 shell
  自己的文档，不在 Web GUI 文档内。
- Windows 上做不出"真的毛玻璃透桌面"（窗口不透明），只能做分层色 + 半透明菜单的视觉近似。
- 组件内部字号/字重/布局写死在哈希 CSS module 里，不要为了"再精修"去命中它们。
