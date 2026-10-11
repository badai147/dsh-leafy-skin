# dsh-leafy-skin

护眼绿叶皮肤：把 DSH Web GUI 的 `--dsw-*` 设计 token 调色板叠成叶绿系（浅色 + 深色）。

## 它做什么

DSH 的界面颜色全部来自 `@deepseek-ai/dsh-client-ui-theme` 里的 token 样式表，组件只读
`--dsw-alias-*` / `--dsw-specific-*` 这类变量，不写死颜色。本插件通过官方的扩展点
`ctx.theme.overrideTokens(source, tokens)` 在**当前主题之上**叠一层调色板覆盖：

- token 值必须是 `{ light, dark }` 成对字符串，ui-layout 会把它们作为 inline style 写到
  `<body>` 上，所以优先级高于任何样式表，切浅色/深色/跟随系统时自动取对应那一档；
- 覆盖层由插件持有，插件卸载/热更新时自动摘除，官方配色即可恢复；
- 目前覆盖 116 个 token，分 12 组（见 `lib/client.js` 里 `TOKENS` 的分组注释）：
  绿灰色阶、翡翠/薄荷强调色阶、表面、文字、品牌与选中、代码块与滚动条、交互叠色、
  思考块渐变、状态点与引导页、代码语法高亮、圆角与阴影描边、排版与动效；
- Host 侧（`lib/index.js`）另外往 index 响应里追加一段首帧 CSS：ui-theme 的引导样式把画布
  底色与 `--dsh-boot-bg` 写死成 `#fff`/`#151517`，插件起来之前的第一帧要靠它才不会闪白；
- 另外有一层可选的**样式层**（见下节），补 token 管不到的细节；开关在 `lib/client.js`
  顶部的 `ENABLE_CSS_LAYER`，改成 `false` 就只剩 token 层。

调色原则：不纯白不纯黑（大面积降到 L\*≈96 减少眩光）、色相统一在绿系、正文/次要文字守住
WCAG AA、语义色（错误红/警告黄/成功绿）保持不变。

## 样式层（3D，可关）

有些细节没有任何 token 可改，只能用 CSS。这一层只做三件事：

1. **文本选中高亮**：官方全包只有 PDF 文本层和 xterm 无障碍树定义了 `::selection`，
   普通文本选区一直是 Chromium 默认的浅蓝——皮肤里最后一块非绿（薄荷选区 `#B9E8CE`，
   深色 `#2E5B44`，选中文字对比度 13.8:1 / 6.8:1）；
2. **交互控件过渡**：官方组件有 39 处 `:hover` 但只有 16 处 `transition`，
   给按钮/链接/输入框/菜单补上 160–200ms 的背景、边框、颜色、阴影过渡；
3. **菜单入场**：`[data-menu-material]`（官方公开钩子，app 里 4 处使用）淡入 140ms；
   只做透明度不做位移/缩放——transform 会新建包含块，可能影响菜单里 fixed 浮层的定位。

三条硬约束，由 `tools/check-palette.mjs` 机械校验（防止以后手滑破坏）：

- 只用元素选择器与官方公开钩子，**不用任何类选择器**（哈希类名升级即失效）；
- 一律套 `:where()` 归零特异性，组件自己写的 `transition`/`animation` 永远优先；
- 不用 `!important`；并且尊重系统的 `prefers-reduced-motion`。

样式以字符串内联在 `lib/client.js` 里（官方 ui-theme 也是这么内联自己的样式表的）：
外置 `.css` 需要引入打包/取资源步骤，与"零构建"原则冲突。

## 目录结构

```
package.json          # dsh.bundle.patch + dsh.client.inject，零依赖零构建
cordis.patch.yml      # 把插件插入 profile 的 layer stack
lib/index.js          # Host 侧入口：向 webserver/index-inject 追加首帧引导 CSS
lib/client.js         # 客户端 bundle：TOKENS 调色板 + 可关的样式层（CSS_LAYER）
tools/check-palette.mjs  # 开发自检：token 形状、对比度、样式层约束
```

## 安装 / 停用

安装（写入 profile 的 dependencies 与 `dsh.profile.bundles`）：

```powershell
& "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" `
  plugin --profile desktop add C:\Users\badai\projects2\dsh-leafy-skin
```

首次安装后需要重启 DSH 让 profile 重新组合；之后只改颜色的话，改完文件刷新页面即可。

停用（任选其一，都需要重启）：

1. 把本文件 `cordis.patch.yml` 的 insert 行注释掉；
2. 从 `~/.dsh/profiles/desktop/package.json` 的 `dsh.profile.bundles` 里删掉 `dsh-leafy-skin`；
3. `dsh plugin --profile desktop remove dsh-leafy-skin`。

## 改色流程

1. 改 `lib/client.js` 里的 `TOKENS`（每个分组前都有注释说明它管哪些部位）；
2. `node tools/check-palette.mjs` —— 校验 token 形状、关键文字/底色与语法高亮的对比度、
   以及样式层的三条约束；
3. 看效果：客户端 bundle 由 `dsh-client-hmr` 每 500ms stat 轮询一次（入口的 mtime/ctime/size），
   写完通常 1 秒内页面自动热替换，必要时手动刷新一次。

注意 `lib/index.js`（首帧 CSS）属于 Host 侧：profile 的 `hmr` 配置里 `root: []`，模块根是 opt-in 的，
所以 Host 代码改动不热重载，改完要重启 DSH 才生效。

## 已知边界（插件改不到的地方）

- Windows 原生标题栏 overlay 的颜色由桌面 shell 进程写死（浅色 `#f9fafb` / 深色 `#1b1b1c`，
  见 `lib/main.js` 的 `chromeFallbackFill()`），插件层够不着；页面加载完成后那条标题栏
  由前端用 `--dsw-specific-sidebar-fill` 重画，所以只有加载瞬间是官方灰白。
- macOS 标题栏那层蓝紫渐变写在 ui-layout 的样式表里（Windows 走
  `--dsw-specific-sidebar-fill`，不受影响）；`--dsw-desktop-window-tint` 属于桌面 shell
  自己的欢迎页/更新弹窗文档，不在 Web GUI 文档里。
- 品牌 logo、鲸鱼图标等图片资源不在 token 层。
- 纯 neutral 灰阶（`--dsw-static-neutral-*`）只在代码块内联底色、滚动条、空闲状态点用到，
  这三处已逐个用别名覆盖；其余保持官方中性灰，避免影响阴影与遮罩。
