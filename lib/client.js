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

		// ── 2. 强调色阶：deepseek 蓝族 → 叶绿族 ───────────────────────────
		// 链接、业务态、焦点环、信息按钮、气泡高亮都从这一族派生。
		"--dsw-static-deepseek-50": { light: "#E7F3E2", dark: "#16241A" },
		"--dsw-static-deepseek-100": { light: "#D5E9CB", dark: "#1B2E20" },
		"--dsw-static-deepseek-200": { light: "#BCDCB0", dark: "#22392A" },
		"--dsw-static-deepseek-300": { light: "#9BCB8C", dark: "#4E8C64" },
		"--dsw-static-deepseek-400": { light: "#6FB763", dark: "#7BD79C" },
		"--dsw-static-deepseek-450": { light: "#5AA95A", dark: "#6FCB8A" },
		"--dsw-static-deepseek-500": { light: "#2E7D4F", dark: "#57B87A" },
		"--dsw-static-deepseek-600": { light: "#24663F", dark: "#46996A" },
		"--dsw-static-deepseek-700-delete": { light: "#1B4F30", dark: "#34764F" },
		"--dsw-static-deepseek-800": { light: "#163F27", dark: "#274F38" },
		"--dsw-static-deepseek-900": { light: "#0F2C1C", dark: "#16301F" },

		// ── 3. 表面：显式指定，避免色阶里一个值被两种角色共用 ──────────────
		"--dsw-alias-bg-base": { light: "#F1F6ED", dark: "#131A12" },
		"--dsw-alias-bg-document-preview": { light: "#E4EDDE", dark: "#0F150E" },
		"--dsw-alias-bg-layer-1": { light: "#F8FBF5", dark: "#1F2820" },
		"--dsw-alias-bg-layer-2": { light: "#FDFEFC", dark: "#263024" },
		"--dsw-alias-bg-layer-3": { light: "#FFFFFF", dark: "#2E392B" },
		"--dsw-alias-bg-overlay": { light: "#E9EFE4", dark: "#2A3629" },
		"--dsw-alias-bg-module-platform": { light: "#E9F1E4", dark: "#2E392B" },
		"--dsw-alias-bg-multi-select": { light: "#E4EDDE", dark: "#232D20" },
		"--dsw-specific-sidebar-fill": { light: "#E8F0E3", dark: "#182018" },
		"--dsw-specific-sidebar-nav-item-active": { light: "#DCE8D6", dark: "#2E392B" },
		"--dsw-specific-sidebar-nav-item-hover": { light: "#E2EBDC", dark: "#222C20" },
		"--dsw-specific-sidebar-nav-item-active-accent": { light: "#CFE3C6", dark: "#3A4A34" },
		"--dsw-specific-selector": { light: "#E9F1E4", dark: "#2E392B" },
		"--dsw-specific-tip": { light: "#E9F1E4", dark: "#2E392B" },
		"--dsw-specific-input-major": { light: "#FFFFFF", dark: "#222C20" },
		"--dsw-specific-login-input": { light: "#F3F7EF", dark: "#182018" },
		"--dsw-specific-bubble": { light: "#E4F1DF", dark: "#1D2A1E" },
		"--dsw-specific-bubble-highlight": { light: "#C9E3C2", dark: "#2C3D2E" },
		"--dsw-menu-surface-fill": { light: "#F6F9F394", dark: "#2B352C73" },
		"--dsw-alias-menu-group-header-fill": { light: "#F6F9F3F0", dark: "#2E3A2FF0" },
		"--dsw-specific-menu": { light: "#F6F9F394", dark: "#2B352C73" },

		// ── 4. 文字：分级对比度（说明文字保持官方的弱化惯例） ──────────────
		"--dsw-alias-label-secondary": { light: "#4C5B47", dark: "#B9C7B4" },
		"--dsw-alias-label-tertiary": { light: "#5F7159", dark: "#94A38F" },
		"--dsw-alias-label-caption": { light: "#93A78A", dark: "#8FA386" },
		"--dsw-alias-label-primary-bluish": { light: "#143D24", dark: "#D3E8C9" },
		"--dsw-alias-label-deep-diving": { light: "#1F5C36", dark: "#8FD9A8" },
		"--dsw-alias-label-deep-diving-shimmer": { light: "#3E9A5C", dark: "#A9E4BC" },

		// ── 5. 品牌与选中 ────────────────────────────────────────────────
		// brand-primary：浅色下主按钮由近黑变深林绿，深色下变叶绿（配深色字）。
		"--dsw-alias-brand-primary": { light: "#1B3B27", dark: "#6FCB8A" },
		"--dsw-alias-bg-document-selection": {
			light: "color-mix(in srgb, #4CAF6E 40%, transparent)",
			dark: "color-mix(in srgb, #4CAF6E 40%, transparent)"
		},
		"--dsw-alias-onboarding-accent": { light: "#2E7D4F", dark: "#6FCB8A" },

		// ── 6. 代码块与滚动条（走的是纯 neutral 家族，不随色阶变绿） ───────
		"--dsw-alias-markdown-inline-code": { light: "#EDF3E8", dark: "#1E2820" },
		"--dsw-alias-markdown-code-block": { light: "#EAF1E4", dark: "#141C15" },
		"--dsw-alias-markdown-code-block-banner": { light: "#E4EDDD", dark: "#1A241A" },
		"--dsw-alias-scrollbar-bg-l1": { light: "#D5E1CF", dark: "#3A4736" },
		"--dsw-alias-scrollbar-bg-l2": { light: "#C7D6BF", dark: "#4A5A44" },
		"--dsw-alias-scrollbar-hover-l1": { light: "#BCCCB5", dark: "#4E5F48" },
		"--dsw-alias-scrollbar-hover-l2": { light: "#AEC0A6", dark: "#5A6B52" },

		// ── 7. 交互叠色（浅色原来是偏蓝的 #263148 系 alpha） ───────────────
		"--dsw-alias-interactive-bg-hover": { light: "#1E3A240F", dark: "#FFFFFF14" },
		"--dsw-alias-interactive-bg-active": { light: "#1E3A241A", dark: "#FFFFFF24" },
		"--dsw-alias-interactive-bg-hover-accent": { light: "#1E3A2424", dark: "#FFFFFF3D" },

		// ── 8. 思考块顶部渐变（原来是纯白/冷灰，绿底上会发白） ─────────────
		"--dsw-linear-gradient-think": {
			light: "linear-gradient(180deg, #F1F6ED 20.19%, #F1F6ED00 100%)",
			dark: "linear-gradient(180deg, #131A12 20.19%, #131A1200 100%)"
		},
		"--dsw-linear-think-select": {
			light: "linear-gradient(180deg, #E9F1E3 20.19%, #E9F1E300 100%)",
			dark: "linear-gradient(180deg, #232C21 20.19%, #232C2100 100%)"
		},

		// ── 9. 状态点与引导页（引导页三组渐变原来是蓝紫/蓝/青，改成绿/橄榄/青绿） ──
		"--dsw-alias-state-idle-primary": { light: "#B7C9AC", dark: "#5A6B52" },
		"--dsw-alias-onboarding-secondary-fill": { light: "#F8FBF5", dark: "#3A4A34" },
		"--dsw-alias-onboarding-checkbox-border": {
			light: "color-mix(in srgb, #0E140C 20%, transparent)",
			dark: "#FFFFFF1F"
		},
		"--dsw-gradient-onboarding-violet-stops": {
			light: "#1F5C36 33.102%, #4E9E62 50.954%, #C9E3C2 85.326%, #1F5C36",
			dark: "#1F5C36 33.102%, #4E9E62 50.954%, #C9E3C2 85.326%, #1F5C36"
		},
		"--dsw-gradient-onboarding-blue-stops": {
			light: "#2E7D4F 18.75%, #52A96A 51.78%, #A9E4BC 86.252%, #2E7D4F",
			dark: "#2E7D4F 18.75%, #52A96A 51.78%, #A9E4BC 86.252%, #2E7D4F"
		},
		"--dsw-gradient-onboarding-cyan-stops": {
			light: "#1F6F6B 21.154%, #3FA98F 50.954%, #B7EBD8 85.326%, #1F6F6B",
			dark: "#1F6F6B 21.154%, #3FA98F 50.954%, #B7EBD8 85.326%, #1F6F6B"
		},

		// ── 10. 代码语法高亮（shiki，原来是蓝/紫/粉的冷色，改成与绿底和谐的暖绿系） ──
		// 保留色相差异（常量/字符串/关键字/函数各自可辨），只把冷暖调过来；
		// 注释沿用弱化惯例，对比度低于正文门槛是刻意的。
		"--shiki-token-constant": { light: "#1C6E8C", dark: "#6FC3DD" },
		"--shiki-token-string": { light: "#2A7248", dark: "#8CDCA6" },
		"--shiki-token-comment": { light: "#7C8F76", dark: "#8FA386" },
		"--shiki-token-keyword": { light: "#A4552B", dark: "#E0A06A" },
		"--shiki-token-parameter": { light: "#9A560F", dark: "#E8B472" },
		"--shiki-token-function": { light: "#5C6B2F", dark: "#C7D08A" },
		"--shiki-token-string-expression": { light: "#35734B", dark: "#9ADFAF" },
		"--shiki-token-punctuation": { light: "#5A6A57", dark: "#A9B7A4" },
		"--shiki-token-link": { light: "#2B7A4B", dark: "#8CDDA8" }
	};

	/**
	 * 叠上 leafy 调色板层。layer 由本次 effect 持有，插件卸载/热更新时自动摘除，
	 * 因此停用插件即可回到官方配色。
	 * @param ctx - client cordis 上下文。
	 */
	function apply(ctx) {
		ctx.effect(() => ctx.theme.overrideTokens(PLUGIN_ID, TOKENS), "leafy-skin: palette layer");
	}

	exports.apply = apply;
	exports.inject = inject;
	return module.exports;
}});
