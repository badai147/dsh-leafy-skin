// 调色板自检（开发工具，不参与插件运行）。
//
//   node tools/check-palette.mjs
//
// 做两件事：
//   1) 形状校验：lib/client.js 里的 TOKENS 必须是「token -> { light, dark } 字符串对」，
//      裸字符串会被 DSH 的 overrideTokens 直接抛错（并导致深/浅色其中一档不可读）。
//   2) 对比度复核：按 WCAG 2.1 相对亮度算关键「文字 / 底色」组合，
//      低于 4.5:1 会点出来（说明文字 caption 属于刻意弱化，单独标注）。
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLIENT = join(ROOT, 'lib', 'client.js')

/** 从 client bundle 里取出 TOKENS 对象字面量（纯数据，无函数调用）。 */
function extractTokens(source) {
  const start = source.indexOf('const TOKENS = {')
  if (start === -1) throw new Error('lib/client.js 里找不到 `const TOKENS = {`')
  const open = source.indexOf('{', start)
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return new Function(`return (${source.slice(open, i + 1)})`)()
    }
  }
  throw new Error('TOKENS 字面量没有闭合')
}

/** 单色 hex -> 相对亮度。非 hex（color-mix / gradient / alpha 简写）返回 null。 */
function luminance(value) {
  const hex = /^#([0-9a-f]{6})$/i.exec(String(value).trim())
  if (!hex) return null
  const channels = [0, 2, 4]
    .map((i) => parseInt(hex[1].slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

/** 两色对比度；任一不可解析时返回 null。 */
function contrast(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)]
  if (a === null || b === null) return null
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

const tokens = extractTokens(await readFile(CLIENT, 'utf8'))

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
  ['深色 链接 / 画布', '--dsw-static-deepseek-400', '--dsw-alias-bg-base', 'text'],
  ['深色 按钮字 / 主按钮', '--dsw-static-neutral-bluish-1000', '--dsw-alias-brand-primary', 'text'],
]

let failures = 0
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
  } else if (kind === 'caption') {
    console.log(`${text}  弱化    ${label}（caption 刻意低对比，官方原值同档）`)
  } else {
    console.log(`${text}  FAIL    ${label}`)
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
    } else {
      console.log(`${ratio.toFixed(2).padStart(6)}  FAIL    ${mode} ${name}`)
      failures++
    }
  }
  const comment = contrast(value('--shiki-token-comment', mode), bg)
  console.log(`${comment.toFixed(2).padStart(6)}  弱化    ${mode} --shiki-token-comment（注释刻意低对比）`)
}

if (failures > 0) {
  console.error(`\n${failures} 组对比度不达标。`)
  process.exit(1)
}
console.log('\n全部通过。')
