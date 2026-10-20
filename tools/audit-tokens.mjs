// token 覆盖矩阵（开发工具，不参与插件运行）。
//
//   node tools/audit-tokens.mjs            # 打印矩阵
//   node tools/audit-tokens.mjs --strict   # CI 用：有消费、未覆盖、又没写理由的 token 直接失败
//
// 数据来源是**已安装的 DSH**：官方样式表声明了哪些 --dsw-*、哪些被客户端 bundle
// 真正消费、消费了几次。皮肤是"叠加层"，最容易出的问题不是颜色不好看，而是
// 某处组件读了一个写死的灰/蓝，我们以为它会跟着色阶变——这个工具就是拿来终结
// 这种猜测的。
//
// 状态含义：
//   covered  本皮肤的 TOKENS 里直接覆盖
//   derived  本身不覆盖，但取值是 var(--x) / color-mix(... var(--x) ...) 链，
//            末端 token 已覆盖，会自动跟着变
//   miss     写死的颜色（或链条断在未覆盖的 token 上）——要么补，要么在 EXEMPT 写理由
import { findDshAsar, openAsar, OFFICIAL_BUNDLE, packageOf } from './asar.mjs'
import { readClientSource, readTokens } from './palette.mjs'

const args = process.argv.slice(2)
const strict = args.includes('--strict')
const requireDsh = args.includes('--require')
const showAll = args.includes('--all')
const asarFlag = args.indexOf('--asar')
const asarPath = asarFlag !== -1 ? args[asarFlag + 1] : findDshAsar()
const topFlag = args.indexOf('--top')
const top = topFlag !== -1 ? Number(args[topFlag + 1]) : 40

/**
 * 豁免清单：不覆盖是**有意的**，每条都必须写清理由。
 * 这是"覆盖矩阵"能长期可信的前提——否则以后为了过 CI 会随手加豁免。
 */
const EXEMPT = [
  { test: /^--dsw-focus-ring-/, why: '焦点环：颜色走 focus.css 的 fallback（--dsw-focus-ring-color 只在 pointer 模态下为 transparent），width 是几何' },
  { test: /^--dsw-font-|^--dsh-font-|^--ds-font-/, why: '字号/字重/行高几何，字体栈已单独覆盖' },
  { test: /^--dsw-menu-backdrop-filter$/, why: '玻璃材质参数（blur/saturate），不是颜色' },
  { test: /^--dsw-mask-blur$/, why: '遮罩模糊参数，不是颜色' },
  { test: /^--dsw-corner-shape$/, why: '圆角形状（superellipse），不是颜色' },
  { test: /^--dsw-elevation-/, why: '阴影几何；描边颜色另有 --dsw-elevation-stroke-color 覆盖' },
  { test: /^--dsw-static-(amber|red|green)-\d/, why: '语义色阶（错误/警告/成功），刻意保持官方色相' },
  { test: /^--dsw-static-blue-(?!500$)\d/, why: '分类色：上下文占用表的多色分段，保留色相以便区分' },
  { test: /^--dsw-alias-(code|file)-diff-/, why: 'diff 语义色（红/绿），色相保持官方值' },
  { test: /^--dsw-alias-interactive-bg-hover-danger$/, why: '危险态叠色（红），语义色不动' },
  { test: /^--dsw-alias-bg-mask-/, why: '遮罩：纯黑 alpha 是正确取值，绿化会变脏' },
  { test: /^--dsw-alias-border-inverted/, why: '反色描边：深色浮层上的白色 alpha' },
  { test: /^--dsw-static-neutral-00$/, why: '提亮基色：被 color-mix 当作纯白使用（深色模式 5% 提亮卡片），必须保持纯白' },
  { test: /^--dsw-alias-button-tool-bar-/, why: '当前版本无消费者（用量 0），等真有消费者再补' },
  { test: /^--dsw-alias-state-(error|warn|success)/, why: '语义状态色（错误/警告/成功），色相保持官方值' },
  { test: /^--dsh-(content|code|terminal)-/, why: '字号/行高派生计算，由 ui-theme 的字体设置拥有，不是颜色' },
  { test: /^--ds-(ease|transition)-/, why: '官方动效曲线：刻意不在全局改（见 AGENTS 踩坑记录）' },
]

/** 取 token 的豁免理由，没有则返回 null。 */
function exemption(name) {
  return EXEMPT.find((item) => item.test.test(name))?.why ?? null
}

if (asarPath === null) {
  const message = '未找到已安装的 DSH（可用 DSH_ASAR 或 --asar 指定 app.asar）；覆盖矩阵跳过。'
  if (requireDsh) {
    console.error(message)
    process.exit(1)
  }
  console.log(message)
  process.exit(0)
}

const asar = openAsar(asarPath)
console.log(`DSH app.asar：${asarPath}`)

// ── 1. 官方样式表里声明的 token 与浅/深取值 ───────────────────────────────────
const themeEntry = asar.entries.find((entry) => entry.path.includes('@deepseek-ai/dsh-client-ui-theme/lib/client.js'))
if (!themeEntry) {
  console.error('app.asar 里找不到 @deepseek-ai/dsh-client-ui-theme/lib/client.js')
  process.exit(1)
}
const themeSource = asar.read(themeEntry)
if (themeSource === null) {
  console.error('ui-theme 的 client.js 是 unpacked 文件，当前工具读不到')
  process.exit(1)
}

/** 把 CSS 拆成「选择器 -> 声明块」，用来区分浅色 / 深色取值。 */
function* cssRules(css) {
  let depth = 0
  let selectorStart = 0
  let bodyStart = 0
  let selector = ''
  for (let i = 0; i < css.length; i++) {
    const ch = css[i]
    if (ch === '{') {
      if (depth === 0) {
        selector = css.slice(selectorStart, i).trim()
        bodyStart = i + 1
      }
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) {
        yield { selector, body: css.slice(bodyStart, i) }
        selectorStart = i + 1
      }
    }
  }
}

const official = new Map() // token -> { light?, dark?, other? }
for (const literal of themeSource.matchAll(/([A-Za-z_$][\w$]*_css_default)\s*=\s*"((?:[^"\\]|\\.)*)"/g)) {
  const css = JSON.parse(`"${literal[2]}"`)
  for (const rule of cssRules(css)) {
    const mode = /data-ds-dark-theme/.test(rule.selector) ? 'dark' : /\bbody\b/.test(rule.selector) ? 'light' : 'other'
    for (const declaration of rule.body.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
      const entry = official.get(declaration[1]) ?? {}
      if (entry[mode] === undefined) entry[mode] = declaration[2].trim()
      official.set(declaration[1], entry)
    }
  }
}

// ── 2. 本皮肤的覆盖集 ─────────────────────────────────────────────────────────
const tokens = readTokens(await readClientSource())
const covered = new Set(Object.keys(tokens))

/** 收集值里的 var(--x) 引用。 */
function references(value) {
  return [...String(value).matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1])
}

/** token 是否（直接或经 var 链）被覆盖。 */
function resolve(name, seen) {
  if (covered.has(name)) return 'covered'
  const entry = official.get(name)
  if (entry === undefined) return 'miss'
  const value = entry.light ?? entry.dark ?? entry.other
  const refs = references(value)
  if (refs.length === 0) return 'miss'
  if (seen.has(name) || seen.size > 6) return 'miss'
  const next = new Set(seen).add(name)
  return refs.every((ref) => resolve(ref, next) === 'covered' || resolve(ref, next) === 'derived') ? 'derived' : 'miss'
}

// ── 3. 官方 bundle 里的真实消费量 ─────────────────────────────────────────────
const usage = new Map() // token -> 次数
const consumers = new Map() // token -> Map(package -> 次数)
let bundleCount = 0
for (const entry of asar.entries) {
  if (!OFFICIAL_BUNDLE.test(entry.path)) continue
  const text = asar.read(entry)
  if (text === null) continue
  bundleCount++
  const pkg = packageOf(entry.path)
  for (const match of text.matchAll(/var\(\s*(--[\w-]+)/g)) {
    const name = match[1]
    usage.set(name, (usage.get(name) ?? 0) + 1)
    const perPackage = consumers.get(name) ?? new Map()
    perPackage.set(pkg, (perPackage.get(pkg) ?? 0) + 1)
    consumers.set(name, perPackage)
  }
}
asar.close()

// ── 4. 汇总 ───────────────────────────────────────────────────────────────────
const names = [...official.keys()]
const rows = names.map((name) => {
  const entry = official.get(name)
  return {
    name,
    status: covered.has(name) ? 'covered' : resolve(name, new Set()),
    usage: usage.get(name) ?? 0,
    light: entry.light ?? entry.other ?? '',
    dark: entry.dark ?? '',
    consumers: [...(consumers.get(name) ?? new Map()).entries()].sort((a, b) => b[1] - a[1]),
  }
})
const count = (status) => rows.filter((row) => row.status === status).length
console.log(`官方声明 token：${names.length}｜直接覆盖：${count('covered')}｜派生覆盖：${count('derived')}｜未覆盖：${count('miss')}`)
console.log(`用量扫描：${bundleCount} 个官方 bundle`)

const pad = (text, width) => String(text).padEnd(width)
const nameWidth = Math.min(64, Math.max(52, ...names.map((name) => name.length + 2)))
const shown = rows
  .filter((row) => row.usage > 0 || showAll)
  .sort((a, b) => b.usage - a.usage || a.name.localeCompare(b.name))
  .slice(0, showAll ? Infinity : top)

console.log(`\n${pad('token', nameWidth)}${pad('状态', 9)}${pad('用量', 6)}消费包（前二）`)
for (const row of shown) {
  const who = row.consumers.slice(0, 2).map(([pkg, times]) => `${pkg}×${times}`).join(', ')
  const status = row.status === 'miss' && exemption(row.name) !== null ? 'exempt' : row.status
  console.log(`${pad(row.name, nameWidth)}${pad(status, 9)}${pad(row.usage, 6)}${who}`)
}

// ── 5. 需要人看的清单 ─────────────────────────────────────────────────────────
const actionable = rows.filter((row) => row.status === 'miss' && exemption(row.name) === null)
const usedButMissing = actionable.filter((row) => row.usage > 0).sort((a, b) => b.usage - a.usage)
console.log(`\n有消费但未覆盖、且没写豁免理由：${usedButMissing.length}`)
for (const row of usedButMissing.slice(0, 20)) {
  console.log(`  ${row.name}（用量 ${row.usage}，浅 ${row.light} / 深 ${row.dark}）`)
}

// ── 6. --strict ───────────────────────────────────────────────────────────────
const THRESHOLD = 3
if (strict) {
  const failing = actionable.filter((row) => row.usage >= THRESHOLD)
  if (failing.length > 0) {
    console.error(`\n覆盖矩阵不通过：${failing.length} 个 token 有消费（≥ ${THRESHOLD}）却未覆盖，也没有豁免理由。`)
    for (const row of failing) console.error(`  - ${row.name}：用量 ${row.usage}，${row.light} / ${row.dark}`)
    console.error('处理方式：覆盖它（把 token 加进 TOKENS），或在 tools/audit-tokens.mjs 的 EXEMPT 里写清理由。')
    process.exit(1)
  }
  console.log('\n覆盖矩阵：通过。')
}
