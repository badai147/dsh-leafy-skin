// 稳定钩子存在性检查（开发工具，不参与插件运行）。
//
//   node tools/check-hooks.mjs
//
// 样式层只允许用官方 JSX 里刻意加的稳定钩子（data-*）与元素/role 选择器，不用
// 哈希类名。钩子是官方代码里的"私有约定"：它不承诺跨版本稳定，但一旦消失，
// 我们的规则会静默失效——没有报错、只是皮肤"看起来没生效"。
//
// 这个脚本从 lib/client.js 的 CSS_LAYER 里抽出实际用到的 data-* 钩子，去已安装的
// DSH bundle 里找；找不到就失败。额外维护一份"允许但当前没用"的钩子清单，
// 用来区分「失效」和「还没用上」。
import { findDshAsar, openAsar, COMPOSED_BUNDLE, packageOf } from './asar.mjs'
import { readClientSource, extractCssLayer } from './palette.mjs'

const asarPath = findDshAsar()
if (asarPath === null) {
  console.log('未找到已安装的 DSH（可用 DSH_ASAR 指定 app.asar）；钩子检查跳过。')
  process.exit(0)
}

const css = extractCssLayer(await readClientSource())
if (css === null) {
  console.log('未找到 CSS_LAYER（只有 token 层），没有钩子需要检查。')
  process.exit(0)
}

/** CSS 里实际用到的 data-* 钩子。 */
const required = [...new Set([...css.matchAll(/data-[\w-]+/g)].map((match) => match[0]))].sort()

/** AGENTS.md 里允许、但当前样式层没用到的钩子（缺了只提示，不失败）。 */
const ALLOWED = [
  'data-input-scroll',
  'data-composer-placeholder',
  'data-menu-backing',
  'data-chat-flow-key',
  'data-chat-flow-kind',
  'data-ds-dark-theme',
  'data-ds-theme-source',
]

const asar = openAsar(asarPath)
const found = new Map() // hook -> Set(package)
for (const entry of asar.entries) {
  if (!COMPOSED_BUNDLE.test(entry.path)) continue
  const text = asar.read(entry)
  if (text === null) continue
  const pkg = packageOf(entry.path)
  for (const hook of [...required, ...ALLOWED]) {
    if (!text.includes(hook)) continue
    const packages = found.get(hook) ?? new Set()
    packages.add(pkg)
    found.set(hook, packages)
  }
}
asar.close()

console.log(`DSH app.asar：${asarPath}`)
console.log(`样式层用到的钩子：${required.length} 个\n`)

let failures = 0
for (const hook of required) {
  const packages = found.get(hook)
  if (packages === undefined) {
    console.log(`  FAIL  ${hook}（官方 bundle 里找不到）`)
    failures++
    continue
  }
  console.log(`  OK    ${hook}（${[...packages].slice(0, 3).join(', ')}）`)
}

const unused = ALLOWED.filter((hook) => !found.has(hook))
if (unused.length > 0) {
  console.log(`\n允许但当前版本没有出现（不算失败，升级后可能出现）：${unused.join(', ')}`)
}

if (failures > 0) {
  console.error(`\n${failures} 个钩子失效：官方改过 JSX，样式层对应的规则已经静默失配。`)
  console.error('处理方式：在已安装的 DSH 里找到新的稳定钩子，更新 lib/client.js 的 CSS_LAYER 与 AGENTS.md。')
  process.exit(1)
}
console.log('\n钩子检查：通过。')
