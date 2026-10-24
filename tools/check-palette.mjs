// 调色板自检（开发工具，不参与插件运行）。
//
//   node tools/check-palette.mjs
//
// 做四件事：
//   1) 形状校验：lib/client.js 里的 TOKENS 必须是「token -> { light, dark } 字符串对」，
//      裸字符串会被 DSH 的 overrideTokens 直接抛错（并导致深/浅色其中一档不可读）。
//   2) 首帧一致：Host 侧 lib/index.js 的引导色必须等于 token 层的画布色，否则页面
//      第一帧会比皮肤挂载后偏一档，肉眼能看到跳变。
//   3) 对比度复核：按 WCAG 2.1 相对亮度算关键「文字 / 底色」组合——包括把半透明
//      玻璃面先合成到底色上的组合，以及焦点环这类非文字元素（AA 门槛 3:1）。
//      另加一条非 WCAG 的设计门槛：行内代码底色与画布的可见性（≥ 1.10:1）。
//   4) 样式层三条约束：括号配平 / 无 !important / 无类选择器。
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ROOT, readClientSource, readTokens, extractCssLayer, contrast, composite } from './palette.mjs'

const source = await readClientSource()
const tokens = readTokens(source)

// ── 1. 形状校验 ────────────────────────────────────────────────────────────────
const problems = []
for (const [name, value] of Object.entries(tokens)) {
  if (typeof value === 'string') problems.push(`${name} 是裸字符串，需要 { light, dark } 成对`)
  else if (typeof value !== 'object' || value === null) problems.push(`${name} 不是对象`)
  else if (typeof value.light !== 'string' || typeof value.dark !== 'string') problems.push(`${name} 缺少 light/dark 字符串`)
}
console.log(`token 条目：${Object.keys(tokens).length}`)
if (problems.length > 0) {
  console.error('形状校验失败：')
  for (const line of problems) console.error(`  - ${line}`)
  process.exit(1)
}
console.log('形状校验：通过（全部为 { light, dark } 字符串对）')

// ── 1b. 首帧一致 ──────────────────────────────────────────────────────────────
// Host 的引导 CSS 先于客户端脚本生效；它写死两个画布色。这两处和 token 层没有
// 共享模块可用（客户端是手写模块工厂，不能 import），只能靠这里机械钉住。
const indexSource = await readFile(join(ROOT, 'lib', 'index.js'), 'utf8')
const bootLight = /const LIGHT_BG = '([^']+)'/.exec(indexSource)?.[1]
const bootDark = /const DARK_BG = '([^']+)'/.exec(indexSource)?.[1]
const canvas = tokens['--dsw-alias-bg-base']
const bootChecks = [
  ['浅色首帧 == --dsw-alias-bg-base.light', bootLight, canvas?.light],
  ['深色首帧 == --dsw-alias-bg-base.dark', bootDark, canvas?.dark],
]
let failures = 0
console.log('\n首帧一致（lib/index.js 的引导色 vs token 层画布色）：')
for (const [label, boot, token] of bootChecks) {
  const same = typeof boot === 'string' && boot.toLowerCase() === String(token).toLowerCase()
  console.log(`  ${same ? 'OK  ' : 'FAIL'}  ${label}（引导 ${boot ?? '缺失'} / token ${token ?? '缺失'}）`)
  if (!same) failures++
}

// ── 2. 关键组合对比度 ─────────────────────────────────────────────────────────
/**
 * 「别名由色阶派生」的几个入口——官方 design-platform.css 里同一别名在浅/深色下
 * 指向不同色阶，这里必须按档解析，否则校验结论会反过来。
 */
const DERIVED = {
  '--dsw-alias-label-primary': {
    light: '--dsw-static-neutral-bluish-1000',
    dark: '--dsw-static-neutral-bluish-50',
  },
  '--dsw-alias-label-primary-foreground': {
    light: '--dsw-static-neutral-bluish-00',
    dark: '--dsw-static-neutral-bluish-1000',
  },
  '--dsw-alias-state-business-primary': {
    light: '--dsw-static-deepseek-500',
    dark: '--dsw-static-deepseek-400',
  },
}

/** 取 token 在某档下的值，必要时沿派生表继续解析。 */
function value(name, mode, depth = 0) {
  const entry = tokens[name]
  if (entry !== undefined) return entry[mode]
  if (depth > 5) return undefined
  const target = DERIVED[name]?.[mode]
  return target === undefined ? undefined : value(target, mode, depth + 1)
}

const PAIRS = [
  ['浅色 正文 / 画布', '--dsw-alias-label-primary', '--dsw-alias-bg-base', 'text'],
  ['浅色 次要 / 画布', '--dsw-alias-label-secondary', '--dsw-alias-bg-base', 'text'],
  ['浅色 三级 / 画布', '--dsw-alias-label-tertiary', '--dsw-alias-bg-base', 'text'],
  ['浅色 说明 / 画布', '--dsw-alias-label-caption', '--dsw-alias-bg-base', 'caption'],
  ['浅色 正文 / 卡片', '--dsw-alias-label-primary', '--dsw-alias-bg-layer-2', 'text'],
  ['浅色 正文 / 侧栏', '--dsw-alias-label-primary', '--dsw-specific-sidebar-fill', 'text'],
  ['浅色 正文 / 气泡', '--dsw-alias-label-primary', '--dsw-specific-bubble', 'text'],
  ['浅色 正文 / 代码块', '--dsw-alias-label-primary', '--dsw-alias-markdown-code-block', 'text'],
  ['浅色 正文 / 行内代码', '--dsw-alias-label-primary', '--dsw-alias-markdown-inline-code', 'text'],
  ['浅色 链接 / 画布', '--dsw-static-deepseek-500', '--dsw-alias-bg-base', 'text'],
  ['浅色 按钮字 / 主按钮', '--dsw-static-neutral-bluish-00', '--dsw-alias-brand-primary', 'text'],
  ['深色 正文 / 画布', '--dsw-alias-label-primary', '--dsw-alias-bg-base', 'text'],
  ['深色 次要 / 画布', '--dsw-alias-label-secondary', '--dsw-alias-bg-base', 'text'],
  ['深色 三级 / 画布', '--dsw-alias-label-tertiary', '--dsw-alias-bg-base', 'text'],
  ['深色 说明 / 画布', '--dsw-alias-label-caption', '--dsw-alias-bg-base', 'caption'],
  ['深色 正文 / 卡片', '--dsw-alias-label-primary', '--dsw-alias-bg-layer-2', 'text'],
  ['深色 正文 / 侧栏', '--dsw-alias-label-primary', '--dsw-specific-sidebar-fill', 'text'],
  ['深色 正文 / 气泡', '--dsw-alias-label-primary', '--dsw-specific-bubble', 'text'],
  ['深色 正文 / 代码块', '--dsw-alias-label-primary', '--dsw-alias-markdown-code-block', 'text'],
  ['深色 正文 / 行内代码', '--dsw-alias-label-primary', '--dsw-alias-markdown-inline-code', 'text'],
  ['深色 链接 / 画布', '--dsw-static-deepseek-400', '--dsw-alias-bg-base', 'text'],
  ['深色 按钮字 / 主按钮', '--dsw-static-neutral-bluish-1000', '--dsw-alias-brand-primary', 'text'],
]

let pass = 0
console.log('\n对比度（AA 正文门槛 4.5:1）：')
for (const [label, fgName, bgName, kind] of PAIRS) {
  const mode = label.startsWith('深色') ? 'dark' : 'light'
  const fg = value(fgName, mode)
  const bg = value(bgName, mode)
  const ratio = contrast(fg, bg)
  if (ratio === null) {
    console.log(`     n/a  ${label}（${fg ?? fgName} on ${bg ?? bgName}：非 hex，跳过）`)
    continue
  }
  const text = ratio.toFixed(2).padStart(6)
  if (ratio >= 4.5) {
    console.log(`${text}  OK      ${label}`)
    pass++
  } else if (kind === 'caption') {
    console.log(`${text}  弱化    ${label}（caption 刻意低对比，官方原值同档）`)
  } else {
    console.log(`${text}  FAIL    ${label}`)
    failures++
  }
}

// ── 2b. 玻璃面：先合成再算 ────────────────────────────────────────────────────
// 菜单/锚定弹窗是「半透明的 --dsw-menu-surface-fill + backdrop-filter」。只看 token
// 原值会高估对比度，必须先把它按 alpha 合成到画布上再算文字。
console.log('\n玻璃面合成后的对比度（菜单 58% / 50% 不透明）：')
for (const mode of ['light', 'dark']) {
  const glass = value('--dsw-menu-surface-fill', mode)
  const base = value('--dsw-alias-bg-base', mode)
  const surface = composite(glass, base)
  const label = mode === 'light' ? '浅色' : '深色'
  if (surface === null) {
    console.log(`     n/a  ${label} 玻璃面（${glass} 叠 ${base}：非 hex，跳过）`)
    continue
  }
  for (const [name, kind] of [
    ['--dsw-alias-label-primary', 'text'],
    ['--dsw-alias-label-secondary', 'text'],
    ['--dsw-alias-label-caption', 'caption'],
  ]) {
    const ratio = contrast(value(name, mode), surface)
    const text = ratio.toFixed(2).padStart(6)
    const row = `${label} ${name.replace('--dsw-alias-', '')} / ${surface}`
    if (ratio >= 4.5) {
      console.log(`${text}  OK      ${row}`)
      pass++
    } else if (kind === 'caption') {
      console.log(`${text}  弱化    ${row}（caption 刻意低对比）`)
    } else {
      console.log(`${text}  FAIL    ${row}`)
      failures++
    }
  }
}

// ── 2c. 焦点环：AA 1.4.11 要求非文字元素 ≥ 3:1 ────────────────────────────────
// 键盘焦点环的颜色走官方 focus.css 的 fallback（--dsw-focus-ring-color 未定义时取
// --dsw-alias-state-business-primary），所以这里校验的是强调色本身。
console.log('\n焦点环（非文字门槛 3:1）：')
for (const mode of ['light', 'dark']) {
  const label = mode === 'light' ? '浅色' : '深色'
  for (const bgName of ['--dsw-alias-bg-base', '--dsw-alias-bg-layer-2', '--dsw-specific-sidebar-fill']) {
    const ratio = contrast(value('--dsw-alias-state-business-primary', mode), value(bgName, mode))
    const row = `${label} 焦点环 / ${bgName.replace('--dsw-', '')}`
    const text = ratio === null ? '   n/a' : ratio.toFixed(2).padStart(6)
    if (ratio !== null && ratio >= 3) {
      console.log(`${text}  OK      ${row}`)
      pass++
    } else {
      console.log(`${text}  FAIL    ${row}`)
      failures++
    }
  }
}

// ── 2d. 行内代码可见性：不是 WCAG 门槛，是"能不能看出这是个 chip"的下限 ────────
// 官方只给行内代码 .5px、4% 黑的描边，合成后对画布约 1.1:1，等于没有边；可见性
// 几乎全压在底色上。旧值 #E7F0E0 只有 1.04:1，读起来就是"正文换了个等宽字体"，
// 所以这里把「底色 / 画布」钉在 1.10 以上（当前 1.12 / 1.31）。
console.log('\n行内代码可见性（设计门槛 1.10:1，非 WCAG）：')
for (const mode of ['light', 'dark']) {
  const label = mode === 'light' ? '浅色' : '深色'
  const ratio = contrast(value('--dsw-alias-markdown-inline-code', mode), value('--dsw-alias-bg-base', mode))
  const text = ratio === null ? '   n/a' : ratio.toFixed(3).padStart(6)
  if (ratio !== null && ratio >= 1.1) {
    console.log(`${text}  OK      ${label} 行内代码底 / 画布`)
    pass++
  } else {
    console.log(`${text}  FAIL    ${label} 行内代码底 / 画布（低于 1.10 就看不出是代码）`)
    failures++
  }
}

// ── 3. 语法高亮配色：代码块里的可读性 ────────────────────────────────────────
// 注释是刻意弱化的（与 caption 同惯例），其余颜色按正文门槛 4.5:1 要求。
const SYNTAX = [
  '--shiki-token-constant',
  '--shiki-token-string',
  '--shiki-token-keyword',
  '--shiki-token-parameter',
  '--shiki-token-function',
  '--shiki-token-string-expression',
  '--shiki-token-punctuation',
  '--shiki-token-link',
]

console.log('\n语法高亮 / 代码块底色（AA 正文门槛 4.5:1）：')
for (const mode of ['light', 'dark']) {
  const bg = value('--dsw-alias-markdown-code-block', mode)
  for (const name of SYNTAX) {
    const ratio = contrast(value(name, mode), bg)
    if (ratio === null) {
      console.log(`     n/a  ${mode} ${name}（非 hex，跳过）`)
      continue
    }
    if (ratio >= 4.5) {
      console.log(`${ratio.toFixed(2).padStart(6)}  OK      ${mode} ${name}`)
      pass++
    } else {
      console.log(`${ratio.toFixed(2).padStart(6)}  FAIL    ${mode} ${name}`)
      failures++
    }
  }
  const comment = contrast(value('--shiki-token-comment', mode), bg)
  console.log(`${comment.toFixed(2).padStart(6)}  弱化    ${mode} --shiki-token-comment（注释刻意低对比）`)
}

// ── 4. 样式层（3D）自检 ────────────────────────────────────────────────────────
// 样式层是唯一"依赖组件实现细节"的地方，所以两条底线机械化把关：
//   ① 不允许类选择器（哈希类名升级即失效，普通类名我们也用不着）；
//   ② 不允许 !important。
// 顺带校验大括号/圆括号配平，避免字符串拼错导致样式静默失效。
const css = extractCssLayer(source)
console.log('\n样式层（3D）自检：')
if (css === null) {
  console.log('  未找到 CSS_LAYER（只有 token 层）')
} else {
  const balanced = (s, a, b) => (s.match(new RegExp(`\\${a}`, 'g')) ?? []).length === (s.match(new RegExp(`\\${b}`, 'g')) ?? []).length
  const classSelectors = [...css.matchAll(/\.[A-Za-z][\w-]*/g)].map((m) => m[0])
  const checks = [
    ['大括号配平', balanced(css, '{', '}')],
    ['圆括号配平', balanced(css, '(', ')')],
    ['无 !important', !css.includes('!important')],
    ['无类选择器', classSelectors.length === 0],
  ]
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${label}`)
    if (!ok) failures++
  }
  if (classSelectors.length > 0) console.error(`        发现类选择器：${classSelectors.join(', ')}`)
  console.log(`  样式层长度：${css.length} 字符`)
}

// ── 5. 刻意项：这些不达标是设计决定，理由必须在代码里写明 ────────────────────
console.log('\n刻意项（不参与上面的门槛，改动前先读注释）：')
console.log('  - --dsw-alias-label-caption / --shiki-token-comment：说明文字与注释的弱化档')
console.log('  - 错误 / 警告 / 成功 / diff 色相：语义色保持官方值，不绿化')
console.log('  - 静态色阶 --dsw-static-neutral-00：作为 color-mix 的提亮基色，保持纯白')

if (failures > 0) {
  console.error(`\n${failures} 项不达标。`)
  process.exit(1)
}
console.log(`\n全部通过（${pass} 项对比度达标）。`)
