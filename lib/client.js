// dsh-leafy-skin client bundle —— 把 leafy 调色板叠到当前 DSH 主题之上。
//
// 手写 __ModuleLoader__ 工厂（无构建步骤、无 react 依赖）。
// 机制：ctx.theme.overrideTokens(source, tokens)。token 值必须是
// { light, dark } 成对字符串；ui-layout 的展示转换器会把它们作为 inline
// style 写到 <body> 上（body.style.setProperty），因此优先级高于任何样式表，
// 且切浅色/深色/跟随系统时自动取对应那一档。
//
// token 命名与官方 @deepseek-ai/dsh-client-ui-theme 的 design-platform.css 一一对应：
//   --dsw-static-neutral-bluish-*  结构色阶（表面、文字、hover、边框的骨架）
//   --dsw-static-deepseek-*        强调色族（链接、业务态、信息按钮、气泡）
//   --dsw-alias-* / --dsw-specific-*  语义别名（组件只读这一层）
// 覆盖色阶能让所有派生别名自动跟着变绿；少数一个色阶被两种角色共用的地方
// （例如浅色当文字、深色当表面）用显式别名覆盖拆开。
window.__ModuleLoader__.load({ id: "dsh-leafy-skin", factory: () => {

	var module = { exports: {} };
	var exports = module.exports;
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

	const PLUGIN_ID = "dsh-leafy-skin";
	const inject = ["theme"];

	/**
	 * 3D 样式层总开关。
	 *
	 * token 层之外的样式细节都挂在这里；改成 false 就只剩 token 层（等于 3C 的状态），
	 * 不用动别的代码。
	 */
	const ENABLE_CSS_LAYER = true;

	/**
	 * leafy 调色板：token -> { light, dark }。
	 * 调色原则：① 不纯白不纯黑（大面积降到 L*≈96，减少眩光）
	 *           ② 色相统一在绿系，避免蓝绿混杂
	 *           ③ 正文/次要文字守 WCAG AA，说明文字沿用官方的弱化惯例
	 * 改完可用 `node tools/check-palette.mjs` 复核形状与对比度。
	 */
	const TOKENS = {

		// ── 1. 结构色阶：偏蓝的 neutral-bluish → 绿灰 ──────────────────────
		// 浅色档是浅绿灰（表面/文字），深色档是深苔绿（深色模式的表面/文字）。
		"--dsw-static-neutral-bluish-00": { light: "#FFFFFF", dark: "#FFFFFF" },
		"--dsw-static-neutral-bluish-50": { light: "#F6FAF3", dark: "#F4F8F0" },
		"--dsw-static-neutral-bluish-60": { light: "#EFF5EA", dark: "#EEF4E9" },
		"--dsw-static-neutral-bluish-75": { light: "#E9F1E3", dark: "#E7EFE1" },
		"--dsw-static-neutral-bluish-100": { light: "#E1EBD9", dark: "#E1EBD9" },
		"--dsw-static-neutral-bluish-150": { light: "#DAE6D2", dark: "#D8E4D0" },
		"--dsw-static-neutral-bluish-200": { light: "#D0DEC7", dark: "#D0DEC7" },
		"--dsw-static-neutral-bluish-300": { light: "#B7C9AC", dark: "#B7C9AC" },
		"--dsw-static-neutral-bluish-400": { light: "#93A78A", dark: "#93A78A" },
		"--dsw-static-neutral-bluish-500": { light: "#7C9074", dark: "#7C9074" },
		"--dsw-static-neutral-bluish-600": { light: "#64775D", dark: "#64775D" },
		"--dsw-static-neutral-bluish-700": { light: "#57694F", dark: "#57694F" },
		"--dsw-static-neutral-bluish-750": { light: "#3C4938", dark: "#3C4938" },
		"--dsw-static-neutral-bluish-800": { light: "#2E392B", dark: "#2E392B" },
		"--dsw-static-neutral-bluish-850": { light: "#263024", dark: "#263024" },
		"--dsw-static-neutral-bluish-875": { light: "#1F2820", dark: "#1F2820" },
		"--dsw-static-neutral-bluish-900": { light: "#182018", dark: "#182018" },
		"--dsw-static-neutral-bluish-950": { light: "#131A12", dark: "#131A12" },
		"--dsw-static-neutral-bluish-1000": { light: "#0E140C", dark: "#0E140C" },

		// ── 2. 强调色阶：deepseek 蓝族 → 翡翠/薄荷族 ───────────────────────
		// 链接、业务态、焦点环、信息按钮、气泡高亮都从这一族派生。
		// 浅色走翡翠（偏蓝的绿，饱和度略高做视觉焦点），深色走薄荷（更亮更清透）。
		"--dsw-static-deepseek-50": { light: "#E4F4EC", dark: "#12261C" },
		"--dsw-static-deepseek-100": { light: "#D2EDDD", dark: "#173023" },
		"--dsw-static-deepseek-200": { light: "#BAE5CE", dark: "#1D3B2B" },
		"--dsw-static-deepseek-300": { light: "#8FD3AE", dark: "#3F8F6A" },
		"--dsw-static-deepseek-400": { light: "#5FC492", dark: "#8CE4B4" },
		"--dsw-static-deepseek-450": { light: "#3FA878", dark: "#63D9A0" },
		"--dsw-static-deepseek-500": { light: "#1A774F", dark: "#4FC894" },
		"--dsw-static-deepseek-600": { light: "#176B48", dark: "#3FA97C" },
		"--dsw-static-deepseek-700-delete": { light: "#12573A", dark: "#338C67" },
		"--dsw-static-deepseek-800": { light: "#0E4830", dark: "#276B4C" },
		"--dsw-static-deepseek-900": { light: "#0A3524", dark: "#1B4634" },

		// ── 3. 表面：雾绿画布 + 抬升面板 + 深一档的侧栏 ────────────────────
		// 画布（内容底）退后、面板抬起、侧栏再深一档形成 chrome 层，三档拉开层次；
		// 深色模式同一逻辑：画布最亮的面板抬起，侧栏比画布更深。
		"--dsw-alias-bg-base": { light: "#EDF3E6", dark: "#121810" },
		"--dsw-alias-bg-document-preview": { light: "#E2ECD9", dark: "#0D120C" },
		"--dsw-alias-bg-layer-1": { light: "#F8FBF2", dark: "#182018" },
		"--dsw-alias-bg-layer-2": { light: "#FDFEFB", dark: "#212B21" },
		"--dsw-alias-bg-layer-3": { light: "#FFFFFF", dark: "#2A362A" },
		"--dsw-alias-bg-overlay": { light: "#E7EFDF", dark: "#26312A" },
		"--dsw-alias-bg-module-platform": { light: "#E8F0E0", dark: "#2A362A" },
		"--dsw-alias-bg-multi-select": { light: "#E2ECD9", dark: "#1E2820" },
		"--dsw-specific-sidebar-fill": { light: "#E4EDDA", dark: "#0D120C" },
		"--dsw-specific-sidebar-nav-item-active": { light: "#D8E6CD", dark: "#263024" },
		"--dsw-specific-sidebar-nav-item-hover": { light: "#DEE9D4", dark: "#1B2318" },
		"--dsw-specific-sidebar-nav-item-active-accent": { light: "#C4E9D2", dark: "#2E5B44" },
		"--dsw-specific-selector": { light: "#E8F0E0", dark: "#2A362A" },
		"--dsw-specific-tip": { light: "#E8F0E0", dark: "#2A362A" },
		"--dsw-specific-input-major": { light: "#FFFFFF", dark: "#1E2820" },
		"--dsw-specific-login-input": { light: "#F2F7EC", dark: "#141A12" },
		"--dsw-specific-bubble": { light: "#DFF0E6", dark: "#172E22" },
		"--dsw-specific-bubble-highlight": { light: "#C2E9D3", dark: "#24402E" },
		"--dsw-menu-surface-fill": { light: "#FBFDF794", dark: "#24302480" },
		"--dsw-alias-menu-group-header-fill": { light: "#FBFDF7F0", dark: "#26332AF0" },
		"--dsw-specific-menu": { light: "#FBFDF794", dark: "#24302480" },
		"--dsw-alias-settings-card-fill": { light: "#FBFDF8", dark: "#1E2A1E" },
		"--dsw-alias-settings-card-stroke": { light: "#122C1A14", dark: "#FFFFFF17" },

		// ── 4. 文字：分级对比度（说明文字保持官方的弱化惯例） ──────────────
		"--dsw-alias-label-secondary": { light: "#56654F", dark: "#AAB9A6" },
		"--dsw-alias-label-tertiary": { light: "#5F7159", dark: "#8A9985" },
		"--dsw-alias-label-caption": { light: "#93A78A", dark: "#8FA386" },
		"--dsw-alias-label-primary-bluish": { light: "#143D24", dark: "#D3E8C9" },
		"--dsw-alias-label-deep-diving": { light: "#14724E", dark: "#9BE8C0" },
		"--dsw-alias-label-deep-diving-shimmer": { light: "#2E9A72", dark: "#B8F2D2" },

		// ── 5. 品牌与选中 ────────────────────────────────────────────────
		// brand-primary：浅色主按钮用翡翠绿（白字），深色用亮薄荷（配深色字）。
		"--dsw-alias-brand-primary": { light: "#14724E", dark: "#63D9A0" },
		"--dsw-alias-bg-document-selection": {
			light: "color-mix(in srgb, #5FCB9B 45%, transparent)",
			dark: "color-mix(in srgb, #5FCB9B 45%, transparent)"
		},
		"--dsw-alias-onboarding-accent": { light: "#14724E", dark: "#63D9A0" },

		// ── 6. 代码块与滚动条（走的是纯 neutral 家族，不随色阶变绿） ───────
		// 代码块底色比画布再深一档，和正文拉开；行内代码只轻一档不抢眼。
		"--dsw-alias-markdown-inline-code": { light: "#E7F0E0", dark: "#1C2620" },
		"--dsw-alias-markdown-code-block": { light: "#E4EEDC", dark: "#1A241A" },
		"--dsw-alias-markdown-code-block-banner": { light: "#DCE8D3", dark: "#212D20" },
		"--dsw-alias-markdown-code-segment-unselected": { light: "#E1EBD9", dark: "#182018" },
		"--dsw-alias-markdown-code-segment-selected": { light: "#F8FBF2", dark: "#232E22" },
		"--dsw-alias-scrollbar-bg-l1": { light: "#C3D3BA", dark: "#46543F" },
		"--dsw-alias-scrollbar-bg-l2": { light: "#BCCEB2", dark: "#52614A" },
		"--dsw-alias-scrollbar-hover-l1": { light: "#AFC1A5", dark: "#566A4E" },
		"--dsw-alias-scrollbar-hover-l2": { light: "#A6B99C", dark: "#5F7256" },

		// ── 7. 交互叠色（浅色原来是偏蓝的 #263148 系 alpha；强度比官方再明确一档） ──
		"--dsw-alias-interactive-bg-hover": { light: "#1E3A2414", dark: "#FFFFFF17" },
		"--dsw-alias-interactive-bg-active": { light: "#1E3A2424", dark: "#FFFFFF29" },
		"--dsw-alias-interactive-bg-hover-accent": { light: "#1E3A242E", dark: "#FFFFFF42" },

		// ── 8. 思考块顶部渐变（原来是纯白/冷灰，绿底上会发白） ─────────────
		"--dsw-linear-gradient-think": {
			light: "linear-gradient(180deg, #F1F6ED 20.19%, #F1F6ED00 100%)",
			dark: "linear-gradient(180deg, #131A12 20.19%, #131A1200 100%)"
		},
		"--dsw-linear-think-select": {
			light: "linear-gradient(180deg, #E9F1E3 20.19%, #E9F1E300 100%)",
			dark: "linear-gradient(180deg, #232C21 20.19%, #232C2100 100%)"
		},

		// ── 9. 状态点与引导页（引导页三组渐变原来是蓝紫/蓝/青，改成翡翠/薄荷/青绿） ──
		"--dsw-alias-state-idle-primary": { light: "#B7C9AC", dark: "#5A6B52" },
		"--dsw-alias-onboarding-secondary-fill": { light: "#F8FBF2", dark: "#2C4033" },
		"--dsw-alias-onboarding-checkbox-border": {
			light: "color-mix(in srgb, #0E140C 20%, transparent)",
			dark: "#FFFFFF1F"
		},
		"--dsw-gradient-onboarding-violet-stops": {
			light: "#0E4830 33.102%, #2E9A72 50.954%, #C2E9D3 85.326%, #0E4830",
			dark: "#0E4830 33.102%, #2E9A72 50.954%, #C2E9D3 85.326%, #0E4830"
		},
		"--dsw-gradient-onboarding-blue-stops": {
			light: "#14724E 18.75%, #35A87C 51.78%, #A9E8CB 86.252%, #14724E",
			dark: "#14724E 18.75%, #35A87C 51.78%, #A9E8CB 86.252%, #14724E"
		},
		"--dsw-gradient-onboarding-cyan-stops": {
			light: "#125E5A 21.154%, #2E9E8E 50.954%, #B0EEDD 85.326%, #125E5A",
			dark: "#125E5A 21.154%, #2E9E8E 50.954%, #B0EEDD 85.326%, #125E5A"
		},

		// ── 10. 代码语法高亮（shiki，原来是蓝/紫/粉的冷色，改成与绿底和谐的暖绿系） ──
		// 保留色相差异（常量/字符串/关键字/函数各自可辨），只把冷暖调过来；
		// 注释沿用弱化惯例，对比度低于正文门槛是刻意的。
		"--shiki-token-constant": { light: "#1C6E8C", dark: "#6FC3DD" },
		"--shiki-token-string": { light: "#2A7248", dark: "#8CDCA6" },
		"--shiki-token-comment": { light: "#7C8F76", dark: "#8FA386" },
		"--shiki-token-keyword": { light: "#9C4E26", dark: "#E0A06A" },
		"--shiki-token-parameter": { light: "#9A560F", dark: "#E8B472" },
		"--shiki-token-function": { light: "#5C6B2F", dark: "#C7D08A" },
		"--shiki-token-string-expression": { light: "#35734B", dark: "#9ADFAF" },
		"--shiki-token-punctuation": { light: "#5A6A57", dark: "#A9B7A4" },
		"--shiki-token-link": { light: "#276F44", dark: "#8CDDA8" },

		// ── 11. 空间与质感：圆角尺度、绿墨阴影、低对比描边 ────────────────
		// 圆角从官方的 4/8/12/16/20/28 收到 6/8/10/14/18/18：12→10、16→14 更接近
		// Linear 那种克制的圆角，输入框/按钮仍是 8–10px 的"柔和"档。
		"--dsw-radius-xs": { light: "6px", dark: "6px" },
		"--dsw-radius-sm": { light: "8px", dark: "8px" },
		"--dsw-radius-md": { light: "10px", dark: "10px" },
		"--dsw-radius-lg": { light: "14px", dark: "14px" },
		"--dsw-radius-xl": { light: "18px", dark: "18px" },
		"--dsw-radius-panel": { light: "18px", dark: "18px" },

		// 阴影：把官方的中性黑 alpha 换成"绿墨"（#122C1A / #040A05），
		// 在绿底上不显脏；同时加大扩散半径、降低单层不透明度 → 弥散而非硬边。
		"--dsw-shadow-lv1": {
			light: "0 1px 2px 0 #122C1A0A, 0 4px 12px 0 #122C1A08",
			dark: "0 1px 2px 0 #040A0514, 0 4px 12px 0 #040A0512"
		},
		"--dsw-shadow-lv1-blur": {
			light: "0 6px 18px 0 #122C1A0A",
			dark: "0 6px 18px 0 #040A0514"
		},
		"--dsw-shadow-lv2": {
			light: "0 2px 6px 0 #122C1A0A, 0 10px 28px 0 #122C1A0D",
			dark: "0 2px 6px 0 #040A0517, 0 10px 28px 0 #040A051C"
		},
		"--dsw-shadow-lv3": {
			light: "0 0 0 .5px #122C1A0F, 0 10px 28px 0 #122C1A0F, 0 28px 56px 0 #122C1A14",
			dark: "0 0 0 .5px #FFFFFF14, 0 10px 28px 0 #040A051F, 0 28px 56px 0 #040A0524"
		},

		// 描边：四档低对比绿墨阶梯（替掉纯黑 alpha）。浅色 4/8/10/14%，
		// 深色 5/9/12.5/16%，整体比官方再轻一档，减少"框感"。
		"--dsw-alias-border-l1": { light: "#122C1A0A", dark: "#FFFFFF0D" },
		"--dsw-alias-border-l2": { light: "#122C1A14", dark: "#FFFFFF17" },
		"--dsw-alias-border-l2-darkmode-thin": { light: "#122C1A14", dark: "#FFFFFF0F" },
		"--dsw-alias-border-l3": { light: "#122C1A1A", dark: "#FFFFFF20" },
		"--dsw-alias-border-l4": { light: "#122C1A24", dark: "#FFFFFF29" },

		// 高层级表面的发丝描边（elevation 的 0.5px 描边层取它）压到 7%/8%。
		// 注意 geometry（--dsw-elevation-panel/soft 的模糊与层次）在官方是
		// `body,body *` 逐元素重声明，token 层改不动，只能改这个描边色。
		"--dsw-elevation-stroke-color": { light: "#122C1A12", dark: "#FFFFFF14" },

		// ── 12. 排版与动效：字体栈、滚动条几何、过渡时长与缓动 ────────────
		// 字体栈：Latin 走 Inter（有则用）/ Segoe UI Variable，中文优先 Noto Sans SC
		// （本机已安装，比微软雅黑更现代），再退回官方原有回退链。
		"--dsw-font-family": {
			light: 'Inter, "Segoe UI Variable Text", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
			dark: 'Inter, "Segoe UI Variable Text", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif'
		},
		// 代码字体：把本机已装的 Cascadia Code 提到 Consolas 之前。
		"--ds-font-family-code": {
			light: '"Cascadia Code", "JetBrains Mono", "SF Mono", "Fira Code", Consolas, "Liberation Mono", Menlo, Courier, "PingFang SC", "Microsoft YaHei"',
			dark: '"Cascadia Code", "JetBrains Mono", "SF Mono", "Fira Code", Consolas, "Liberation Mono", Menlo, Courier, "PingFang SC", "Microsoft YaHei"'
		},
		// 滚动条：5px → 8px 更好抓，2px 透明边做视觉内缩（看起来仍是细圆条），
		// 轨道两端留 4px 避免顶到圆角。
		"--dsh-scrollbar-width": { light: "8px", dark: "8px" },
		"--dsh-scrollbar-thumb-border": { light: "2px", dark: "2px" },
		"--dsh-scrollbar-track-margin": { light: "4px", dark: "4px" }
		// 注意：官方动效变量（--ds-transition-duration* / --ds-ease-in-out）不再覆盖。
		// 试过改快并换成 cubic-bezier(.2,0,0,1)，手感反而"先不动再猛走"更生硬——
		// 那几个变量是给侧栏收放这类尺寸动画用的，官方取值本来就是为它们调的。
		// 过渡手感改由下面的样式层负责（那是"变色反馈"层，两者职责不同）。
	};

	/**
	 * 3D 样式层的 CSS。只做 token 层够不到的三件事：文本选中高亮、全局过渡兜底、
	 * 菜单/浮层入场。
	 *
	 * 设计要点：DSH 里"只写了 :hover 没写 transition"的元素很多（尤其是一堆 div 行、
	 * 卡片、菜单项），所以过渡必须做成**零特异性的全局兜底**（:where(*)），
	 * 而不是点名几个表单控件——点名的那版被验证为"手感依旧生硬"。
	 *
	 * 三条硬约束（tools/check-palette.mjs 会机械校验）：
	 *   ① 不用哈希类名（`.BynINW_frame` 这种升级即失效），只用元素与官方公开钩子；
	 *   ② 一律套 :where() 归零特异性，组件自己写的 transition/animation 永远优先，
	 *      我们只在组件没写的地方补，避免打架；
	 *   ③ 不用 !important。
	 *
	 * 为什么内联成字符串而不是外置 lib/skin.css：外置文件要引入打包/取资源的步骤，
	 * 与"零构建"原则冲突（官方 ui-theme 也是这么内联它的样式表的）。
	 */
	const CSS_LAYER = [
		// ① 文本选中高亮：官方全包只有 PDF 文本层与 xterm 无障碍树定义了 ::selection，
		//    普通文本选区一直是 Chromium 默认的浅蓝——皮肤里最后一块非绿。
		"::selection{background:#B9E8CE;color:#0E140C}",
		"body[data-ds-dark-theme] ::selection{background:#2E5B44;color:#E9F1E6}",

		// ② 全局默认过渡（兜底层）：DSH 里大量可点区域是 div（行、卡片、菜单项），
		//    它们大多只写了 :hover 没写 transition，只兜表单控件根本不够。
		//    曲线用 easeOutQuad（起步快、收尾柔）——比 Material 强调曲线的
		//    "先不动再猛走"顺滑得多；时长 .2s 比 .16s 更能看出过渡而不是"闪一下"。
		//    只动变色/淡入类属性，绝不碰尺寸与位移（那是布局，抖起来更难看）。
		":where(*){transition:" +
			"background-color .2s cubic-bezier(.25,.46,.45,.94)," +
			"border-color .2s cubic-bezier(.25,.46,.45,.94)," +
			"color .2s cubic-bezier(.25,.46,.45,.94)," +
			"fill .2s cubic-bezier(.25,.46,.45,.94)," +
			"stroke .2s cubic-bezier(.25,.46,.45,.94)," +
			"opacity .2s cubic-bezier(.25,.46,.45,.94)}",

		// ③ 交互控件：再补阴影（悬浮浮起感）与 transform（按下回弹），
		//    这两样只给控件，不给通用元素——通用元素上的 transform 可能是
		//    拖拽时用 inline style 逐帧写的，加过渡会拖出滞后感。
		":where(button,a,[role=\"button\"],[role=\"tab\"],[role=\"menuitem\"],label,summary){" +
			"transition:background-color .2s cubic-bezier(.25,.46,.45,.94)," +
			"border-color .2s cubic-bezier(.25,.46,.45,.94)," +
			"color .2s cubic-bezier(.25,.46,.45,.94)," +
			"fill .2s cubic-bezier(.25,.46,.45,.94)," +
			"stroke .2s cubic-bezier(.25,.46,.45,.94)," +
			"opacity .2s cubic-bezier(.25,.46,.45,.94)," +
			"box-shadow .24s cubic-bezier(.25,.46,.45,.94)," +
			"transform .16s cubic-bezier(.25,.46,.45,.94)}",
		":where(input,textarea,select){" +
			"transition:background-color .2s cubic-bezier(.25,.46,.45,.94)," +
			"border-color .2s cubic-bezier(.25,.46,.45,.94)," +
			"color .2s cubic-bezier(.25,.46,.45,.94)," +
			"box-shadow .24s cubic-bezier(.25,.46,.45,.94)}",

		// ④ 菜单/浮层：入场只做"位移 + 微缩"，**全程 opacity 保持 1**。
		//    为什么不用透明度淡入：菜单底色是独立子层（.material）上的
		//    var(--dsw-menu-surface-fill)（浅色仅 58% 不透明）+ backdrop blur，
		//    按透明度淡入时中间帧是"模糊按全强度算、却按半透明合成"，
		//    观感就是"先透一层糊、再变实"——实测被一眼看出来。
		//    只动 translate/scale 则每一帧都是实心的，物理上不存在"透"的过程。
		//    两点安全性：① 菜单定位走 inline top/left（.portal），不用 transform；
		//    ② 用独立的 translate/scale 属性而不是 transform 简写，即使某个调用方
		//    真传了 inline transform，也只会叠加、不会把定位顶掉。
		//    代价：动画期间会新建包含块（官方为此特意把模糊隔离在子层里），
		//    窗口只有 160ms，且嵌套子菜单用的是 absolute，不受影响。
		":where([data-menu-material],[role=\"dialog\"],[role=\"menu\"],[role=\"listbox\"]){" +
			"transition:background-color .2s cubic-bezier(.25,.46,.45,.94)," +
			"box-shadow .24s cubic-bezier(.25,.46,.45,.94)}",
		"@keyframes leafy-surface-in{from{translate:0 -3px;scale:.985}to{translate:0 0;scale:1}}",
		":where([data-menu-material]){animation:leafy-surface-in .16s cubic-bezier(.25,.46,.45,.94)}",

		// ⑤ 输入框（composer）：光标色 + 聚焦时的柔光"抬升"。
		//    composer 不是 textarea，是 Lexical 的 contenteditable，官方给了两个稳定属性：
		//    [data-composer-card]（带底色/圆角/阴影的卡片）与 [data-composer-input]（编辑区）。
		//    抬升感用**阴影**表达而不是位移：卡片里可能挂 position:fixed 的浮层（提示条、
		//    下拉），给卡片加 translate/transform 会让它们改用卡片当参照系、坐标整块飞掉，
		//    为 1px 的位移冒这个险不值当；阴影在视觉上同样是"浮起来"。
		//    光圈走 ::after 而不是直接改卡片的 box-shadow：卡片那条 class 规则特异性更高，
		//    零特异性的我们赢不了它（这正是我们想要的——不跟组件抢属性）。
		//    颜色取自 --dsw-alias-state-business-primary（浅色翡翠 / 深色薄荷），跟随主题。
		":where([data-composer-input],input,textarea){caret-color:var(--dsw-alias-state-business-primary)}",
		":where([data-composer-card])::after{" +
			"content:\"\";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;" +
			"transition:opacity .18s cubic-bezier(.25,.46,.45,.94);" +
			"box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent)," +
			"0 6px 16px -6px color-mix(in srgb, var(--dsw-alias-state-business-primary) 16%, transparent)}",
		":where([data-composer-card]):has([data-composer-input]:focus)::after{opacity:1}",

		// ⑥ 尊重系统的"减少动态效果"：只关掉我们兜底的那些（组件自己写的特异性更高，
		//    仍按官方自己的无障碍处理走）。输入框光圈只是透明度淡入、不含位移，
		//    与官方 Toast 的处理一致，保留。
		"@media (prefers-reduced-motion:reduce){:where(*){transition:none;animation:none}}",
	].join("");

	/**
	 * 挂上 3D 样式层。样式由本次 effect 持有，插件卸载/热更新时随标签一起移除。
	 * @param ctx - client cordis 上下文。
	 */
	function installCssLayer(ctx) {
		if (!ENABLE_CSS_LAYER || typeof document === "undefined") {
			return;
		}
		ctx.effect(() => {
			const tag = document.createElement("style");
			tag.dataset.plugin = PLUGIN_ID;
			tag.dataset.pluginCss = `${PLUGIN_ID}/skin.css`;
			tag.textContent = CSS_LAYER;
			document.head.appendChild(tag);
			return () => {
				tag.remove();
			};
		}, "leafy-skin: css layer");
	}

	/**
	 * 叠上 leafy 调色板层 + 可选的样式层。两层都由 effect 持有，
	 * 插件卸载/热更新时自动摘除，因此停用插件即可回到官方配色与官方细节。
	 * @param ctx - client cordis 上下文。
	 */
	function apply(ctx) {
		ctx.effect(() => ctx.theme.overrideTokens(PLUGIN_ID, TOKENS), "leafy-skin: palette layer");
		installCssLayer(ctx);
	}

	exports.apply = apply;
	exports.inject = inject;
	return module.exports;
}});
