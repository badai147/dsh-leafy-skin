// 共享的调色板解析与对比度工具（开发工具用，不参与插件运行）。
//
// 三个自检脚本（check-palette / audit-tokens / check-hooks）都要读 lib/client.js 里的
// TOKENS 表与 CSS_LAYER，读法必须一致，否则「脚本说没问题」和「插件真的跑」会分叉。
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const CLIENT = join(ROOT, 'lib', 'client.js')

/** 从某个标记开始，按大括号配平截取一个字面量对象/数组并求值。 */
export function extractLiteral(source, marker) {
  const start = source.indexOf(marker)
  if (start === -1) throw new Error(`找不到 \`${marker}\``)
  const open = source.indexOf('{', start)
  const openArray = source.indexOf('[', start)
  const isArray = openArray !== -1 && (open === -1 || openArray < open)
  const from = isArray ? openArray : open
  let depth = 0
  for (let i = from; i < source.length; i++) {
    if (isArray ? source[i] === '[' : source[i] === '{') depth++
    else if (isArray ? source[i] === ']' : source[i] === '}') {
      depth--
      if (depth === 0) return new Function(`return (${source.slice(from, i + 1)})`)()
    }
  }
  throw new Error(`\`${marker}\` 字面量没有闭合`)
}

/** 读 lib/client.js 源码。 */
export async function readClientSource() {
  return readFile(CLIENT, 'utf8')
}

/** 取出 TOKENS（token -> { light, dark }）。 */
export function readTokens(source) {
  return extractLiteral(source, 'const TOKENS = ')
}

/** 取出样式层 CSS 字符串。 */
export function extractCssLayer(source) {
  const start = source.indexOf('const CSS_LAYER =')
  if (start === -1) return null
  const open = source.indexOf('[', start)
  const end = source.indexOf('].join("")', open)
  if (end === -1) throw new Error('CSS_LAYER 数组没有以 ].join("") 收尾')
  return new Function(`return ${source.slice(open, end + 1)}.join("")`)()
}

/** 解析 #rgb / #rrggbb / #rrggbbaa，返回 { r, g, b, a }（0–255，a 为 0–1）。 */
export function parseColor(value) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(String(value).trim())
  if (!hex) return null
  let digits = hex[1]
  if (digits.length === 3) digits = [...digits].map((c) => c + c).join('')
  const channel = (i) => parseInt(digits.slice(i, i + 2), 16)
  return {
    r: channel(0),
    g: channel(2),
    b: channel(4),
    a: digits.length === 8 ? channel(6) / 255 : 1,
  }
}

/** 相对亮度（WCAG 2.1；忽略 alpha，用于不透明底）。 */
export function luminance(value) {
  const color = parseColor(value)
  if (color === null) return null
  const [r, g, b] = [color.r, color.g, color.b]
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** 两色对比度；任一不可解析时返回 null。 */
export function contrast(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)]
  if (a === null || b === null) return null
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

/** 把半透明前景合成到不透明底色上，返回 #rrggbb。 */
export function composite(over, under) {
  const top = parseColor(over)
  const bottom = parseColor(under)
  if (top === null || bottom === null) return null
  const mix = (a, b) => Math.round(a * top.a + b * (1 - top.a))
  const hex = (n) => n.toString(16).padStart(2, '0')
  return `#${hex(mix(top.r, bottom.r))}${hex(mix(top.g, bottom.g))}${hex(mix(top.b, bottom.b))}`
}
