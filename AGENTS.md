# AGENTS.md — dsh-leafy-skin 仓库工作须知

给在本仓库里干活的 AI/人看的。全局规则见 `~/.dsh/AGENTS.md`（先读它），这里只写本仓库特有的东西。

## 这是什么

DSH Web GUI 的**护眼绿叶皮肤插件**：`@deepseek-ai/dsh-client-ui-theme` 提供 token 机制，
本插件在**当前主题之上**叠一层调色板覆盖（浅色翡翠 / 深色薄荷），外加一层可关的样式层补
token 够不到的细节。插件名即目录名，形态照 `dsh-global-rules` 那套：`dsh.bundle.patch` +
`dsh.client` + 手写 `__ModuleLoader__` 工厂，**零依赖、零构建**。

## 三层结构与边界

| 层 | 位置 | 机制 | 生效方式 |
|---|---|---|---|
| token 层 | `lib/client.js` 的 `TOKENS` | `ctx.theme.overrideTokens(PLUGIN_ID, tokens)`，ui-layout 把值作为 inline style 写到 `<body>` | 客户端 HMR，约 1s |
| 样式层（可关） | `lib/client.js` 的 `CSS_LAYER` | 注入 `<style data-plugin="dsh-leafy-skin">` | 客户端 HMR，约 1s；开关 `ENABLE_CSS_LAYER` |
| Host 首帧 | `lib/index.js` | `webserver/index-inject` 追加引导 CSS（画布底色 / `--dsh-boot-bg`） | **Host 不热重载，必须重启 DSH** |

## 硬约束（改之前先看，违反会被自检拦下或被 DSH 升级打脸）

1. **token 值必须是 `{ light, dark }` 成对字符串**，裸字符串会被 `overrideTokens` 直接抛错，
   深/浅色其中一档也会不可读。
2. **样式层不许出现类选择器**（哈希类名如 `.BynINW_frame` 升级即失效），只用元素与官方公开钩子
   （`[data-menu-material]`、`[role=...]`、`::selection`、`prefers-reduced-motion` 等）。
3. **样式层一律套 `:where()` 归零特异性**：组件自己写的 `transition`/`animation` 必须永远优先，
   我们只补"组件没写"的空白。不加 `!important`。
4. **语义色不动**：错误红、警告黄、成功绿保持官方值。全绿会丢掉状态可读性。
5. **可比对比度底线**：正文/次要/三级文字与语法高亮颜色 ≥ 4.5:1（AA）；caption 与代码注释是
   刻意的弱化档，改动时必须在注释里说明"刻意"。
6. **不动 `~/.dsh` 下的官方文件**，只改本仓库；不要为了"更好看"去 patch 官方包。
7. **保持零构建**：不引入依赖、构建步骤或外置资源。样式内联成字符串是刻意的选择
   （官方 ui-theme 也这么干）；外置 `.css` 需要打包/取资源，违反此约束。

## 必跑的验证

```powershell
node tools/check-palette.mjs
```

会校验：token 形状、20 组文字/底色对比度、18 组语法高亮对比度，以及样式层的三条约束
（括号配平、无 `!important`、无类选择器）。**改完必跑**，别靠肉眼。

## 手感/动效的踩坑记录（别再走一遍）

- 缓动**不要用 `cubic-bezier(.2,0,0,1)`**：起步速度为零，短时长下观感是"先不动再猛走"，
  实测被评价为"生硬"。过渡类用 easeOutQuad `cubic-bezier(.25,.46,.45,.94)`、时长 ~200ms。
- **半透明玻璃表面绝不要用透明度淡入**：菜单底色是 `.material` 子层上的
  `--dsw-menu-surface-fill`（浅色仅 58% 不透明）+ `backdrop-filter`，淡入的中间帧是
  "模糊按全强度算、却按半透明合成"，肉眼能看到"先透一层糊、再变实"。
  入场只动 `translate`/`scale`（且用独立属性，别用 `transform` 简写），opacity 保持 1。
- **官方动效变量别乱改**（`--ds-ease-in-out`、`--ds-transition-duration*`）：它们是给侧栏收放
  这类尺寸动画用的，改快会让侧栏开合发顿。过渡手感归样式层管，两者职责分开。
- 兜底范围要够大：DSH 里大量可点区域是 `div`（列表行、卡片、菜单项），只兜表单控件不够，
  所以用 `:where(*)` 的零特异性全局兜底。
- 菜单定位走 inline `top/left`（`.portal`），不用 transform —— 这是"可以安全动
  translate/scale"的前提，改前先复核。

## 命令

```powershell
# 自检
node tools/check-palette.mjs

# 安装到 desktop profile（写入 dependencies 与 dsh.profile.bundles）
& "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" `
  plugin --profile desktop add C:\Users\badai\projects2\dsh-leafy-skin

# 停用（任选其一，都需重启）
#   1) 注释掉 cordis.patch.yml 的 insert 行
#   2) 从 ~/.dsh/profiles/desktop/package.json 的 dsh.profile.bundles 删掉 dsh-leafy-skin
#   3) dsh plugin --profile desktop remove dsh-leafy-skin
```

## 提交约定

- 一个阶段一个 commit（3A/3B/3C/3D 各一个），消息用中文，写清"改了什么 + 为什么"。
- **返工要把结论写进 `README.md` 的调优记录**：这个仓库的价值有一半在"为什么这么改"，
  只留代码会把踩过的坑重新踩一遍。
- 换行一律 LF，由 `.gitattributes` 钉住。

## 已知边界（改不到，别浪费时间）

- Windows 原生标题栏 overlay 颜色由桌面 shell 写死（`lib/main.js` 的 `chromeFallbackFill()`）；
  页面加载完成后那条标题栏由前端用 `--dsw-specific-sidebar-fill` 重画。
- macOS 标题栏的蓝紫渐变写在 ui-layout 样式表里；`--dsw-desktop-window-tint` 属于桌面 shell
  自己的文档，不在 Web GUI 文档内。
- Windows 上做不出"真的毛玻璃透桌面"（窗口不透明），只能做分层色 + 半透明菜单的视觉近似。
- 组件内部字号/字重/布局写死在哈希 CSS module 里，不要为了"再精修"去命中它们。
