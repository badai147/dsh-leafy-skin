// 只读解析 DSH 桌面版的 app.asar（开发工具用，不参与插件运行）。
//
// 为什么要拆出来：官方样式表与稳定钩子都只在**已安装的 DSH**里，不在本仓库。
// audit-tokens（覆盖矩阵）与 check-hooks（钩子存在性）都要读同一份 asar，
// 解析逻辑放一处，避免两边对「怎么读」各写一套。
//
// asar 格式：8 字节 pickle 头（uint32 4 / uint32 headerSize）+ 头部 JSON + 文件数据。
// 头部 JSON 里的 offset 是相对数据区（8 + headerSize）的偏移；打包时被排除在
// asar 外（unpacked）的文件没有 offset，读不到，按「不存在」处理。
import { existsSync, openSync, readSync, closeSync } from 'node:fs'
import { join } from 'node:path'

/** 找已安装的 DSH app.asar：DSH_ASAR 环境变量优先，其次各平台默认安装位。 */
export function findDshAsar() {
  const candidates = []
  if (process.env.DSH_ASAR) candidates.push(process.env.DSH_ASAR)
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    candidates.push(join(process.env.LOCALAPPDATA, 'Programs', 'DeepSeek Harness', 'resources', 'app.asar'))
  }
  if (process.platform === 'darwin') {
    candidates.push('/Applications/DeepSeek Harness.app/Contents/Resources/app.asar')
  }
  if (process.platform === 'linux') {
    candidates.push('/opt/DeepSeek Harness/resources/app.asar')
  }
  return candidates.find((file) => existsSync(file)) ?? null
}

/** 打开 asar，返回 { entries, read, close }。 */
export function openAsar(file) {
  const fd = openSync(file, 'r')
  const head = Buffer.alloc(16)
  readSync(fd, head, 0, 16, 0)
  const headerSize = head.readUInt32LE(4)
  const jsonSize = head.readUInt32LE(12)
  const json = Buffer.alloc(jsonSize)
  readSync(fd, json, 0, jsonSize, 16)
  const base = 8 + headerSize

  const entries = []
  const walk = (node, prefix) => {
    if (node.files) {
      for (const [name, child] of Object.entries(node.files)) {
        walk(child, prefix === '' ? name : `${prefix}/${name}`)
      }
      return
    }
    // 头部里的 offset/size 可能是数字也可能是字符串，统一转成数字；unpacked 文件是 NaN。
    entries.push({ path: prefix, offset: Number(node.offset), size: Number(node.size) })
  }
  walk(JSON.parse(json.toString('utf8')), '')

  return {
    entries,
    /** 读单个文件文本；unpacked / 缺偏移的文件返回 null。 */
    read(entry) {
      if (!Number.isFinite(entry.offset) || !Number.isFinite(entry.size)) return null
      const buffer = Buffer.alloc(entry.size)
      readSync(fd, buffer, 0, entry.size, base + entry.offset)
      return buffer.toString('utf8')
    },
    close() {
      closeSync(fd)
    },
  }
}

/** 官方客户端包的 bundle 路径（只有这些文件里会出现 token 与稳定钩子）。 */
export const OFFICIAL_BUNDLE = /node_modules\/@deepseek-ai\/([^/]+)\/lib\/.*\.js$/

/**
 * 钩子检查的范围要更宽：部分稳定钩子只出现在组合后的前端构建产物里
 * （dsh-web-frontend/dist/assets/*.js），源码 bundle 里反而没有。
 */
export const COMPOSED_BUNDLE = /@deepseek-ai\/([^/]+)\/(?:lib|dist)\/.*\.js$/

/** 取 bundle 路径对应的官方包名。 */
export function packageOf(path) {
  return COMPOSED_BUNDLE.exec(path)?.[1] ?? null
}
