// 发布前检查：仓库里只放代码与文档，不夹带图片/截图。
// 运行：node scripts/check-publish.mjs（npm publish 前自动执行）
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const problems = []

// 1. README 里不能有 Markdown 图片
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8')
readme.split(/\r?\n/).forEach((line, i) => {
  if (/!\[[^\]]*\]\(/.test(line)) problems.push(`README.md:${i + 1} 含图片引用：${line.trim()}`)
})

// 2. 仓库里不能有图片文件（.git 目录跳过）
const imageExt = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.svg'])
const skipDirs = new Set(['.git', 'node_modules'])
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (imageExt.has(path.extname(entry.name).toLowerCase())) {
      problems.push(`图片文件：${path.relative(root, full)}`)
    }
  }
}
walk(root)

if (problems.length) {
  console.error('发布前检查未通过：')
  for (const p of problems) console.error(' - ' + p)
  process.exit(1)
}
console.log('发布前检查通过：只有代码与文案，没有图片。')
