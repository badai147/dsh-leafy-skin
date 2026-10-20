// 发布清单自检（开发工具，不参与插件运行）。
//
//   node tools/check-manifest.mjs
//
// 发版前最容易犯的不是代码错，而是清单错：新文件忘了写进 `files`、README 的
// 版本兼容表没跟着改、两份 CHANGELOG 只改了一份、图标超出 Host 的 256 KiB 上限。
// 这些在本地都不会报错，等 npm 上缺文件才发现。这里把它们变成机械检查。
import { readFile, readdir, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { ROOT } from './palette.mjs'

const read = (name) => readFile(join(ROOT, name), 'utf8')
const problems = []
const ok = (label) => console.log(`  OK    ${label}`)
const fail = (label, detail) => {
  console.log(`  FAIL  ${label}${detail ? `（${detail}）` : ''}`)
  problems.push(label)
}

const pkg = JSON.parse(await read('package.json'))
console.log(`package.json 版本：${pkg.version}`)

// ── 1. 版本号与两份 CHANGELOG 的顶部条目一致 ───────────────────────────────────
for (const file of ['CHANGELOG.md', 'CHANGELOG.zh.md']) {
  const text = await read(file)
  const latest = /^## \[([^\]]+)\]/m.exec(text)?.[1]
  if (latest === pkg.version) ok(`${file} 最新条目 == ${pkg.version}`)
  else fail(`${file} 最新条目`, `文件里是 ${latest ?? '缺失'}`)
}

// ── 2. README 的版本兼容表第一行跟着版本走 ────────────────────────────────────
for (const file of ['README.md', 'README.zh.md']) {
  const text = await read(file)
  const row = /^\|\s*v([^|\s]+)\s*\|/m.exec(text)?.[1]
  if (row === pkg.version) ok(`${file} 兼容表首行 == v${pkg.version}`)
  else fail(`${file} 兼容表首行`, `文件里是 v${row ?? '缺失'}`)
}

// ── 3. files 清单里的每一项都真实存在 ─────────────────────────────────────────
const expand = async (entry) => {
  if (!entry.includes('*')) {
    try {
      await stat(join(ROOT, entry))
      return [entry]
    } catch {
      return []
    }
  }
  const dir = dirname(entry)
  const pattern = new RegExp(`^${entry.slice(dir.length === 0 ? 0 : dir.length + 1).replace(/\*/g, '[^/]*')}$`)
  const files = await readdir(join(ROOT, dir)).catch(() => [])
  return files.filter((name) => pattern.test(name)).map((name) => join(dir, name))
}
for (const entry of pkg.files) {
  const matches = await expand(entry)
  if (matches.length > 0) ok(`files: ${entry}（${matches.length} 个）`)
  else fail(`files: ${entry}`, '磁盘上不存在')
}

// ── 4. 入口与对外导出都指向真实文件 ───────────────────────────────────────────
const targets = []
const collect = (value) => {
  if (typeof value === 'string' && !value.includes('*')) targets.push(value)
  else if (value && typeof value === 'object') Object.values(value).forEach(collect)
}
targets.push(pkg.main, pkg.icon)
collect(pkg.exports)
for (const target of [...new Set(targets)].filter(Boolean)) {
  try {
    await stat(join(ROOT, target))
    ok(`入口存在：${target}`)
  } catch {
    fail(`入口存在：${target}`, '磁盘上不存在')
  }
}

// ── 5. 图标体积（Host 读插件图标的上限 256 KiB） ──────────────────────────────
if (pkg.icon) {
  const size = (await stat(join(ROOT, pkg.icon))).size
  if (size <= 256 * 1024) ok(`图标体积 ${(size / 1024).toFixed(1)} KiB`)
  else fail('图标体积', `超过 256 KiB（${(size / 1024).toFixed(1)} KiB）`)
}

// ── 6. 中英文 README 结构一致 ─────────────────────────────────────────────────
const headings = async (file) => [...(await read(file)).matchAll(/^(#{2,3}) /gm)].map((match) => match[1].length).join(',')
for (const pair of [['README.md', 'README.zh.md'], ['CHANGELOG.md', 'CHANGELOG.zh.md']]) {
  const [a, b] = await Promise.all(pair.map(headings))
  if (a === b) ok(`${pair[0]} / ${pair[1]} 标题层级一致`)
  else fail(`${pair[0]} / ${pair[1]} 标题层级`, `${a} vs ${b}`)
}

if (problems.length > 0) {
  console.error(`\n${problems.length} 项清单问题。`)
  process.exit(1)
}
console.log('\n清单检查：通过。')
