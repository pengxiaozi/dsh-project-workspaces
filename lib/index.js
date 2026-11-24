import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'

export const name = 'dsh-project-workspaces'

function safeFileName(name) {
  const cleaned = String(name || '会话').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim()
  return cleaned.slice(0, 60) || '会话'
}

function dayStamp(ms) {
  const date = ms ? new Date(ms) : new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return String(date.getFullYear()) + pad(date.getMonth() + 1) + pad(date.getDate())
}

function timeStamp(ms) {
  if (!ms) return ''
  try {
    return new Date(ms).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return ''
  }
}

/** 把一个消息的内容块拍平成 Markdown 纯文本；工具调用、图片等只留占位。 */
function contentText(blocks) {
  if (!Array.isArray(blocks)) return ''
  const parts = []
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue
    if (block.type === 'text') parts.push(String(block.text || ''))
    else if (block.type === 'image') parts.push('[图片]')
    else if (block.type === 'file') parts.push('[文件' + (block.attachment && block.attachment.name ? ' ' + block.attachment.name : '') + ']')
  }
  return parts.filter((part) => part && part.trim()).join('\n\n')
}

function clip(text, limit) {
  const value = String(text || '').trim()
  if (value.length <= limit) return value
  return value.slice(0, limit) + '\n…（已截断，共 ' + value.length + ' 字符）'
}

/** 把一个会话的原始事件日志渲染成可读的 Markdown。 */
function renderSessionMarkdown(title, header, events) {
  const out = []
  out.push('# ' + String(title || '会话'))
  out.push('')
  out.push('- 会话 ID：`' + String((header && header.id) || '') + '`')
  out.push('- 工作目录：`' + String((header && header.cwd) || '—') + '`')
  out.push('- 创建时间：' + (timeStamp(header && header.createdAt) || '—'))
  out.push('')
  for (const event of Array.isArray(events) ? events : []) {
    if (!event || typeof event !== 'object') continue
    const data = event.data || {}
    const when = timeStamp(event.time)
    if (event.type === 'user/message') {
      const text = contentText(data.content)
      if (!text) continue
      out.push('## 用户' + (when ? ' · ' + when : ''))
      out.push('')
      out.push(text)
      out.push('')
    } else if (event.type === 'assistant/message') {
      const text = contentText(data.message && data.message.content)
      if (!text) continue
      out.push('## 助手' + (when ? ' · ' + when : ''))
      out.push('')
      out.push(text)
      out.push('')
    } else if (event.type === 'tool/call') {
      const args = clip(String(data.arguments || ''), 300).replace(/\s+/g, ' ')
      out.push('> 工具调用 `' + String(data.name || '') + '`' + (args ? ' — ' + args : ''))
      out.push('')
    } else if (event.type === 'tool/result') {
      const text = contentText(data.message && data.message.content)
      if (!text) continue
      out.push('> 工具结果：' + clip(text.replace(/\s+/g, ' '), 400))
      out.push('')
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n')
}

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 1024 * 1024) { reject(new Error('请求体过大')); req.destroy(); return }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try { resolveBody(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}) }
      catch (error) { reject(new Error('JSON 格式错误：' + error.message)) }
    })
    req.on('error', reject)
  })
}

function dshHome() {
  return resolve(process.env.DSH_HOME || join(process.env.USERPROFILE || process.env.HOME || '.', '.dsh'))
}

function dataPath() {
  return join(dshHome(), 'project-workspaces.json')
}

function normalizeTags(value) {
  const list = Array.isArray(value)
    ? value
    : String(value || '').split(/[,，;；、|]/)
  const out = []
  for (const item of list) {
    const tag = String(item == null ? '' : item).trim()
    if (!tag) continue
    if (out.some((known) => known.toLowerCase() === tag.toLowerCase())) continue
    out.push(tag)
    if (out.length >= 8) break
  }
  return out
}

function normalizeProject(input) {
  if (!input || typeof input !== 'object') return null
  const root = String(input.root || '').trim()
  if (!root) return null
  const children = Array.isArray(input.children)
    ? input.children.map((child) => {
      if (!child) return null
      const path = String(child.path || '').trim()
      if (!path) return null
      return {
        name: String(child.name || basename(path)),
        path,
        alias: String(child.alias || '').trim(),
        tags: normalizeTags(child.tags),
      }
    }).filter(Boolean)
    : []
  return {
    id: String(input.id || resolve(root).toLowerCase()),
    root,
    name: String(input.name || basename(root)),
    alias: String(input.alias || '').trim(),
    tags: normalizeTags(input.tags),
    // 置顶：侧边栏里单独放到最上面的「置顶」分组
    pinned: input.pinned === true,
    // 项目色标：侧边栏里给文件夹图标上色，空串表示用默认色
    color: String(input.color || '').trim(),
    children,
  }
}

// 侧边栏显示设置：只接受安全颜色字符串，避免把任意 CSS 写进样式表
function normalizeColor(value) {
  const text = String(value || '').trim()
  if (!text || text.length > 40) return ''
  if (/[;{}<>]/.test(text)) return ''
  if (!/^(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|[a-zA-Z]+)$/.test(text)) return ''
  return text
}

function normalizeUi(input) {
  const value = input && typeof input === 'object' ? input : {}
  return {
    runningBg: normalizeColor(value.runningBg),
    runningFg: normalizeColor(value.runningFg),
  }
}

function loadState() {
  try {
    const raw = readFileSync(dataPath(), 'utf8')
    const parsed = JSON.parse(raw)
    return {
      roots: Array.isArray(parsed.roots) ? parsed.roots.map(String) : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects.map(normalizeProject).filter(Boolean) : [],
      ui: normalizeUi(parsed.ui),
    }
  } catch {
    return { roots: [], projects: [], ui: normalizeUi(null) }
  }
}

function saveState(state) {
  mkdirSync(dirname(dataPath()), { recursive: true })
  writeFileSync(dataPath(), JSON.stringify(state, null, 2) + '\n', 'utf8')
}

function registryOf(ctx) {
  return ctx.get('workspaceRegistry') || ctx.workspaceRegistry
}

function workspaceRows(ctx) {
  const registry = registryOf(ctx)
  if (!registry || typeof registry.list !== 'function') return []
  return registry.list().map((workspace) => ({
    workspaceId: workspace.id,
    path: workspace.path,
    title: workspace.title,
    sessionCount: Array.isArray(workspace.sessionIds) ? workspace.sessionIds.length : 0,
  }))
}

function existingByPath(registry) {
  const map = new Map()
  if (!registry || typeof registry.list !== 'function') return map
  for (const workspace of registry.list()) {
    if (!workspace || !workspace.path) continue
    map.set(resolve(workspace.path).toLowerCase(), workspace)
  }
  return map
}

function inside(root, child) {
  const rel = relative(root, child)
  return rel !== '' && !rel.startsWith('..') && !rel.startsWith('/') && !rel.startsWith('\\')
}

// 扫描时跳过的目录名：依赖目录、构建产物、版本库、编辑器缓存等，注册成工作区没有意义
const SCAN_SKIP = new Set([
  'node_modules', '.git', '.svn', '.hg', '.idea', '.vscode', '.next', '.nuxt', '.turbo',
  '.cache', '.venv', 'venv', '__pycache__', 'vendor', 'dist', 'build', 'out', 'target',
  'coverage', 'bin', 'obj', 'tmp', 'temp', 'logs',
])

function isScanSkipped(name) {
  return SCAN_SKIP.has(String(name))
}

function hasSubdir(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true }).some((entry) => entry.isDirectory() && !isScanSkipped(entry.name))
  } catch {
    return false
  }
}

// 递归扫描：depth 为向下展开的层数（1 = 只看直接子目录），返回树 + 被跳过的相对路径
function scanTree(rootInput, options) {
  const root = resolve(String(rootInput || '').trim())
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error('根目录不存在或不是目录：' + root)
  const wanted = Number(options && options.depth)
  const depth = Math.min(Math.max(Number.isFinite(wanted) && wanted >= 1 ? Math.floor(wanted) : 1, 1), 6)
  const skipped = []
  const walk = (dir, relDir, level) => {
    let entries = []
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return [] }
    const nodes = []
    const dirs = entries.filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    for (const entry of dirs) {
      const rel = relDir ? relDir + '/' + entry.name : entry.name
      if (isScanSkipped(entry.name)) { skipped.push(rel); continue }
      const node = { name: entry.name, rel, path: join(dir, entry.name), children: [], hasChildren: false }
      if (level < depth) node.children = walk(node.path, rel, level + 1)
      else node.hasChildren = hasSubdir(node.path)
      nodes.push(node)
    }
    return nodes
  }
  const tree = walk(root, '', 1)
  return { root, name: basename(root), depth, tree, skipped, skippedCount: skipped.length }
}

function scanRoot(rootInput) {
  const root = resolve(String(rootInput || '').trim())
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error('根目录不存在或不是目录：' + root)
  const dirs = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, path: join(root, entry.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  return { root, dirs }
}

function statePayload(ctx) {
  const saved = loadState()
  const workspaces = workspaceRows(ctx)
  const byPath = new Map(workspaces.map((item) => [resolve(item.path).toLowerCase(), item]))
  const roots = saved.roots.map((root) => {
    let dirs = []
    let error = ''
    try {
      dirs = scanRoot(root).dirs.map((dir) => ({ ...dir, registered: byPath.has(resolve(dir.path).toLowerCase()) }))
    } catch (err) {
      error = err.message
    }
    return { root, dirs, error }
  })
  const projects = saved.projects.map((project) => {
    const self = byPath.get(resolve(project.path || project.root).toLowerCase())
    return {
      ...project,
      path: project.path || project.root,
      // 项目根目录自身就是一个 Workspace 时（叶子项目），把 id 一并带出，侧边栏可直接打开
      workspaceId: self ? self.workspaceId : '',
      registered: Boolean(self),
      sessionCount: self ? self.sessionCount : 0,
      children: project.children.map((child) => {
        const workspace = byPath.get(resolve(child.path).toLowerCase())
        return {
          name: child.name,
          path: child.path,
          alias: child.alias || '',
          tags: Array.isArray(child.tags) ? child.tags : [],
          workspaceId: workspace ? workspace.workspaceId : '',
          registered: Boolean(workspace),
          sessionCount: workspace ? workspace.sessionCount : 0,
        }
      }),
    }
  })
  return { ok: true, dshHome: dshHome(), ui: saved.ui, roots, workspaces, projects }
}

function apply(ctx) {
  try {
    const clientModules = ctx.get('clientModules')
    if (clientModules && typeof clientModules.rebuilt === 'function') clientModules.rebuilt('dsh-project-workspaces')
  } catch {
    // client bundle rebuild is best effort
  }
  ctx.inject(['workspaceRegistry', 'webServer'], (host) => {
    const webServer = host.webServer || ctx.get('webServer')
    if (!webServer || typeof webServer.register !== 'function') return
    const registry = () => host.workspaceRegistry || ctx.get('workspaceRegistry')

    const offState = webServer.register({
      kind: 'exact', path: '/dsh-project-workspaces/state',
      handler: (_req, res) => {
        try { json(res, 200, statePayload(ctx)) } catch (error) { json(res, 500, { ok: false, error: error.message }) }
      },
    })

    const offHealth = webServer.register({
      kind: 'exact', path: '/dsh-project-workspaces/health',
      handler: (_req, res) => {
        json(res, 200, { ok: true, plugin: 'dsh-project-workspaces' })
      },
    })

    const offTree = webServer.register({
      kind: 'exact', path: '/dsh-project-workspaces/tree',
      handler: async (req, res) => {
        try {
          if (req.method !== 'POST') return json(res, 405, { ok: false, error: '只支持 POST' })
          const body = await readBody(req)
          const scanned = scanTree(body.root, { depth: body.depth })
          // 标记已经注册成 Workspace 的目录，弹窗里灰字提示「已注册·复用」
          const byPath = new Map(workspaceRows(ctx).map((item) => [resolve(item.path).toLowerCase(), item]))
          const mark = (nodes) => nodes.forEach((node) => {
            node.registered = byPath.has(resolve(node.path).toLowerCase())
            if (node.children && node.children.length) mark(node.children)
          })
          mark(scanned.tree)
          json(res, 200, Object.assign({ ok: true }, scanned))
        } catch (error) { json(res, 400, { ok: false, error: error.message }) }
      },
    })

    const offScan = webServer.register({
      kind: 'exact', path: '/dsh-project-workspaces/scan',
      handler: async (req, res) => {
        try {
          if (req.method !== 'POST') return json(res, 405, { ok: false, error: '只支持 POST' })
          const body = await readBody(req)
          const { root } = scanRoot(body.root)
          const saved = loadState()
          if (!saved.roots.includes(root)) saved.roots.push(root)
          saveState(saved)
          json(res, 200, statePayload(ctx))
        } catch (error) { json(res, 400, { ok: false, error: error.message }) }
      },
    })

    const offRegister = webServer.register({
      kind: 'exact', path: '/dsh-project-workspaces/register',
      handler: async (req, res) => {
        try {
          if (req.method !== 'POST') return json(res, 405, { ok: false, error: '只支持 POST' })
          const body = await readBody(req)
          const root = resolve(String(body.root || '').trim())
          if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error('根目录不存在或不是目录：' + root)
          const registry = registryOf(ctx)
          if (!registry || typeof registry.create !== 'function') throw new Error('workspaceRegistry 不可用')
          const names = Array.isArray(body.subdirs) ? body.subdirs.map(String) : []
          if (!names.length) throw new Error('没有选择子目录')
          const existing = existingByPath(registry)
          const created = []
          for (const name of names) {
            const child = resolve(root, name)
            if (!inside(root, child)) throw new Error('子目录越界：' + name)
            if (!existsSync(child) || !statSync(child).isDirectory()) throw new Error('子目录不存在：' + name)
            const title = basename(root) + ' / ' + basename(child)
            const workspace = existing.get(child.toLowerCase()) || await registry.create(child, title)
            created.push({ workspaceId: workspace.id, path: workspace.path, title: workspace.title })
          }
          const saved = loadState()
          if (!saved.roots.includes(root)) { saved.roots.push(root); saveState(saved) }
          json(res, 200, { ok: true, created, state: statePayload(ctx) })
        } catch (error) { json(res, 400, { ok: false, error: error.message }) }
      },
    })

    const offProject = webServer.register({
      kind: 'exact', path: '/dsh-project-workspaces/project',
      handler: async (req, res) => {
        try {
          if (req.method !== 'POST') return json(res, 405, { ok: false, error: '只支持 POST' })
          const body = await readBody(req)
          const root = resolve(String(body.root || '').trim())
          if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error('项目根目录不存在或不是目录：' + root)
          const name = String(body.name || '').trim() || basename(root)
          const registry = registryOf(ctx)
          if (!registry || typeof registry.create !== 'function') throw new Error('workspaceRegistry 不可用')
          const names = (Array.isArray(body.children) ? body.children : [])
            .map((item) => (typeof item === 'string' ? item : String((item && item.name) || '')).trim())
            .filter(Boolean)
          // 允许空列表：项目根目录自身就是一个 Workspace 时，建成「叶子项目」
          const existing = existingByPath(registry)
          const children = []
          for (const childName of names) {
            const child = resolve(root, childName)
            if (!inside(root, child)) throw new Error('子目录越界：' + childName)
            if (!existsSync(child) || !statSync(child).isDirectory()) throw new Error('子目录不存在：' + childName)
            const title = name + ' / ' + basename(child)
            if (!existing.has(child.toLowerCase())) await registry.create(child, title)
            children.push({ name: basename(child), path: child })
          }
          // 没有任何子工作区时，把项目根目录自身注册成一个工作区（叶子项目），不扫描也能用
          if (!children.length && !existing.has(root.toLowerCase())) {
            await registry.create(root, name)
          }
          const saved = loadState()
          const id = root.toLowerCase()
          const index = saved.projects.findIndex((project) => project.id === id || resolve(project.root).toLowerCase() === id)
          const prev = index >= 0 ? saved.projects[index] : null
          // 重新勾选子目录不应该丢掉已有的别名/标签：按子目录名沿用旧值
          const prevChildren = new Map()
          for (const item of (prev && Array.isArray(prev.children) ? prev.children : [])) {
            prevChildren.set(String(item.path || '').toLowerCase(), item)
            if (!prevChildren.has(String(item.name))) prevChildren.set(String(item.name), item)
          }
          const mergedChildren = children.map((child) => {
            const old = prevChildren.get(String(child.path).toLowerCase()) || prevChildren.get(child.name)
            return {
              name: child.name,
              path: child.path,
              alias: (old && old.alias) || '',
              tags: (old && Array.isArray(old.tags)) ? old.tags : [],
            }
          })
          const record = {
            id,
            root,
            name,
            alias: (prev && prev.alias) || '',
            tags: (prev && Array.isArray(prev.tags)) ? prev.tags : [],
            pinned: Boolean(prev && prev.pinned),
            children: mergedChildren,
          }
          // 新建的项目排到最前面；已有项目保持原位置
          if (index >= 0) saved.projects[index] = record
          else saved.projects.unshift(record)
          if (!saved.roots.includes(root)) saved.roots.push(root)
          saveState(saved)
          json(res, 200, { ok: true, project: record, state: statePayload(ctx) })
        } catch (error) { json(res, 400, { ok: false, error: error.message }) }
      },
    })

    const offProjectRemove = webServer.register({
      kind: 'exact', path: '/dsh-project-workspaces/project/remove',
      handler: async (req, res) => {
        try {
          if (req.method !== 'POST') return json(res, 405, { ok: false, error: '只支持 POST' })
          const body = await readBody(req)
          const id = String(body.projectId || '').trim().toLowerCase()
          if (!id) throw new Error('缺少 projectId')
          const saved = loadState()
          saved.projects = saved.projects.filter((project) => project.id !== id && resolve(project.root).toLowerCase() !== id)
          saveState(saved)
          json(res, 200, { ok: true, state: statePayload(ctx) })
        } catch (error) { json(res, 400, { ok: false, error: error.message }) }
      },
    })

    const offProjectRename = webServer.register({
      kind: 'exact', path: '/dsh-project-workspaces/project/rename',
      handler: async (req, res) => {
        try {
          if (req.method !== 'POST') return json(res, 405, { ok: false, error: '只支持 POST' })
          const body = await readBody(req)
          const id = String(body.projectId || '').trim().toLowerCase()
          const name = String(body.name || '').trim()
          if (!id) throw new Error('缺少 projectId')
          if (!name) throw new Error('项目名称不能为空')
          const saved = loadState()
          const project = saved.projects.find((item) => item.id === id || resolve(item.root).toLowerCase() === id)
          if (!project) throw new Error('项目不存在：' + id)
          project.name = name
          saveState(saved)
          json(res, 200, { ok: true, project: { ...project, children: project.children }, state: statePayload(ctx) })
        } catch (error) { json(res, 400, { ok: false, error: error.message }) }
      },
    })

    const offProjectUpdate = webServer.register({
      kind: 'exact', path: '/dsh-project-workspaces/project/update',
      handler: async (req, res) => {
        try {
          if (req.method !== 'POST') return json(res, 405, { ok: false, error: '只支持 POST' })
          const body = await readBody(req)
          const id = String(body.projectId || '').trim().toLowerCase()
          if (!id) throw new Error('缺少 projectId')
          const saved = loadState()
          const project = saved.projects.find((item) => item.id === id || resolve(item.root).toLowerCase() === id)
          if (!project) throw new Error('项目不存在：' + id)
          if (body.name !== undefined) {
            const nextName = String(body.name || '').trim()
            if (!nextName) throw new Error('项目名称不能为空')
            project.name = nextName
          }
          if (body.alias !== undefined) project.alias = String(body.alias || '').trim()
          if (body.tags !== undefined) project.tags = normalizeTags(body.tags)
          if (body.color !== undefined) project.color = String(body.color || '').trim()
          if (Array.isArray(body.children)) {
            for (const patch of body.children) {
              if (!patch) continue
              const target = String(patch.path || '').trim()
              if (!target) continue
              const key = resolve(target).toLowerCase()
              const child = project.children.find((item) => resolve(item.path).toLowerCase() === key)
              if (!child) continue
              if (patch.alias !== undefined) child.alias = String(patch.alias || '').trim()
              if (patch.tags !== undefined) child.tags = normalizeTags(patch.tags)
            }
          }
          saveState(saved)
          json(res, 200, { ok: true, project, state: statePayload(ctx) })
        } catch (error) { json(res, 400, { ok: false, error: error.message }) }
      },
    })

    const offProjectPin = webServer.register({
      kind: 'exact', path: '/dsh-project-workspaces/project/pin',
      handler: async (req, res) => {
        try {
          if (req.method !== 'POST') return json(res, 405, { ok: false, error: '只支持 POST' })
          const body = await readBody(req)
          const id = String(body.projectId || '').trim().toLowerCase()
          if (!id) throw new Error('缺少 projectId')
          const saved = loadState()
          const project = saved.projects.find((item) => item.id === id || resolve(item.root).toLowerCase() === id)
          if (!project) throw new Error('项目不存在：' + id)
          project.pinned = body.pinned === undefined ? !project.pinned : body.pinned === true
          saveState(saved)
          json(res, 200, { ok: true, project, state: statePayload(ctx) })
        } catch (error) { json(res, 400, { ok: false, error: error.message }) }
      },
    })

    const offProjectReorder = webServer.register({
      kind: 'exact', path: '/dsh-project-workspaces/project/reorder',
      handler: async (req, res) => {
        try {
          if (req.method !== 'POST') return json(res, 405, { ok: false, error: '只支持 POST' })
          const body = await readBody(req)
          const ids = Array.isArray(body.projectIds)
            ? body.projectIds.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean)
            : []
          if (!ids.length) throw new Error('缺少 projectIds')
          const saved = loadState()
          const byId = new Map()
          for (const project of saved.projects) byId.set(String(project.id).toLowerCase(), project)
          const ordered = []
          for (const id of ids) {
            const project = byId.get(id)
            if (!project) continue
            byId.delete(id)
            ordered.push(project)
          }
          // 没出现在请求里的项目（例如刚被其它端创建）原样追加，避免丢数据
          for (const project of saved.projects) {
            if (byId.has(String(project.id).toLowerCase())) ordered.push(project)
          }
          saved.projects = ordered
          saveState(saved)
          json(res, 200, { ok: true, state: statePayload(ctx) })
        } catch (error) { json(res, 400, { ok: false, error: error.message }) }
      },
    })

    const offOpen = webServer.register({
      kind: 'exact', path: '/dsh-project-workspaces/open',
      handler: async (req, res) => {
        try {
          if (req.method !== 'POST') return json(res, 405, { ok: false, error: '只支持 POST' })
          const body = await readBody(req)
          const target = resolve(String(body.path || '').trim())
          if (!target) throw new Error('缺少 path')
          if (!existsSync(target)) throw new Error('目录不存在：' + target)
          const command = process.platform === 'win32' ? 'explorer.exe'
            : process.platform === 'darwin' ? 'open' : 'xdg-open'
          const child = spawn(command, [target], { detached: true, stdio: 'ignore' })
          child.unref()
          json(res, 200, { ok: true, path: target })
        } catch (error) { json(res, 400, { ok: false, error: error.message }) }
      },
    })

    const offAutoGroup = webServer.register({
      kind: 'exact', path: '/dsh-project-workspaces/project/auto-group',
      handler: async (req, res) => {
        try {
          if (req.method !== 'POST') return json(res, 405, { ok: false, error: '只支持 POST' })
          const body = await readBody(req)
          const minChildren = Number(body.minChildren) > 0 ? Number(body.minChildren) : 2
          const registry = registryOf(ctx)
          if (!registry || typeof registry.list !== 'function') throw new Error('workspaceRegistry 不可用')
          const saved = loadState()
          const known = new Map(saved.projects.map((project) => [resolve(project.root).toLowerCase(), project]))
          const groups = new Map()
          for (const workspace of registry.list()) {
            const path = String(workspace && workspace.path || '').trim()
            if (!path) continue
            const parent = dirname(path)
            if (!parent || parent === path) continue
            const key = resolve(parent).toLowerCase()
            const bucket = groups.get(key) || { root: parent, children: [] }
            bucket.children.push({ name: basename(path), path })
            groups.set(key, bucket)
          }
          const created = []
          const updated = []
          for (const [key, group] of groups) {
            if (group.children.length < minChildren) continue
            const project = known.get(key)
            if (project) {
              const have = new Set(project.children.map((child) => resolve(child.path).toLowerCase()))
              const added = group.children.filter((child) => !have.has(resolve(child.path).toLowerCase()))
              if (!added.length) continue
              project.children = project.children.concat(added)
              updated.push(project.name)
            } else {
              const next = normalizeProject({ root: group.root, name: basename(group.root), children: group.children })
              if (!next) continue
              saved.projects.push(next)
              known.set(key, next)
              created.push(next.name)
            }
          }
          if (created.length || updated.length) saveState(saved)
          json(res, 200, { ok: true, created, updated, state: statePayload(ctx) })
        } catch (error) { json(res, 400, { ok: false, error: error.message }) }
      },
    })

    const offUi = webServer.register({
      kind: 'exact', path: '/dsh-project-workspaces/ui',
      handler: async (req, res) => {
        try {
          if (req.method !== 'POST') return json(res, 405, { ok: false, error: '只支持 POST' })
          const body = await readBody(req)
          const saved = loadState()
          const next = normalizeUi({ ...saved.ui, ...body })
          saved.ui = next
          saveState(saved)
          json(res, 200, { ok: true, ui: next, state: statePayload(ctx) })
        } catch (error) { json(res, 400, { ok: false, error: error.message }) }
      },
    })

    const offTempSession = webServer.register({
      kind: 'exact', path: '/dsh-project-workspaces/temp-session',
      handler: async (req, res) => {
        try {
          if (req.method !== 'POST') return json(res, 405, { ok: false, error: '只支持 POST' })
          const registry = registryOf(ctx)
          if (!registry || typeof registry.create !== 'function') throw new Error('workspaceRegistry 不可用')
          const now = new Date()
          const pad = (value) => String(value).padStart(2, '0')
          const stamp = String(now.getFullYear()) + pad(now.getMonth() + 1) + pad(now.getDate()) +
            '-' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds())
          const dir = join(tmpdir(), 'dsh-temp-' + stamp)
          mkdirSync(dir, { recursive: true })
          const title = '临时会话 ' + timeStamp(now.getTime())
          const workspace = await registry.create(dir, title)
          json(res, 200, { ok: true, workspaceId: workspace.id, path: dir, title, state: statePayload(ctx) })
        } catch (error) { json(res, 400, { ok: false, error: error.message }) }
      },
    })

    const offExport = webServer.register({
      kind: 'exact', path: '/dsh-project-workspaces/export',
      handler: async (req, res) => {
        try {
          if (req.method !== 'POST') return json(res, 405, { ok: false, error: '只支持 POST' })
          const body = await readBody(req)
          const query = ctx.get && ctx.get('sessionQuery')
          if (!query || typeof query.readSession !== 'function') throw new Error('sessionQuery 不可用')
          const ids = Array.isArray(body.sessionIds)
            ? body.sessionIds.map((value) => String(value || '')).filter(Boolean)
            : (body.sessionId ? [String(body.sessionId)] : [])
          if (!ids.length) throw new Error('没有可导出的会话')
          const rendered = []
          const exported = []
          for (const id of ids) {
            let snapshot = null
            try {
              snapshot = await query.readSession(id)
            } catch {
              snapshot = null
            }
            if (!snapshot) continue
            let title = id
            try {
              const folded = await query.readTitle(id)
              if (folded && folded.title) title = String(folded.title)
            } catch {
              // 标题只是锦上添花，读不到就用会话 id
            }
            rendered.push(renderSessionMarkdown(title, snapshot.session, snapshot.events))
            exported.push({ id, title, events: Array.isArray(snapshot.events) ? snapshot.events.length : 0 })
          }
          if (!rendered.length) throw new Error('会话读取失败，可能已被归档或删除')
          const content = rendered.join('\n\n---\n\n')
          const filename = safeFileName(body.label) + '-会话导出-' + dayStamp() + '.md'
          json(res, 200, { ok: true, filename, count: exported.length, sessions: exported, content })
        } catch (error) { json(res, 400, { ok: false, error: error.message }) }
      },
    })

    const offRemove = webServer.register({
      kind: 'exact', path: '/dsh-project-workspaces/remove',
      handler: async (req, res) => {
        try {
          if (req.method !== 'POST') return json(res, 405, { ok: false, error: '只支持 POST' })
          const body = await readBody(req)
          const registry = registryOf(ctx)
          if (!registry || typeof registry.delete !== 'function') throw new Error('workspaceRegistry 不可用')
          const workspaceId = String(body.workspaceId || '')
          const target = (typeof registry.get === 'function' && workspaceId) ? registry.get(workspaceId) : null
          const targetPath = resolve(String(body.path || (target && target.path) || '')).toLowerCase()
          const ok = await registry.delete(workspaceId)
          // 同步清理项目树里对该工作区的引用；子工作区清空的项目一并移除，避免留下空节点
          const saved = loadState()
          const before = saved.projects.length
          saved.projects = saved.projects
            .map((project) => ({
              ...project,
              children: (project.children || []).filter((child) => {
                const sameId = String(child.workspaceId || '') && String(child.workspaceId) === workspaceId
                const samePath = resolve(child.path).toLowerCase() === targetPath
                return !(sameId || samePath)
              }),
            }))
            .filter((project) => (project.children || []).length > 0)
          if (saved.projects.length !== before) saveState(saved)
          json(res, 200, { ok: true, deleted: ok, state: statePayload(ctx) })
        } catch (error) { json(res, 400, { ok: false, error: error.message }) }
      },
    })

    ctx.effect(() => () => { offState(); offHealth(); offScan(); offRegister(); offProject(); offProjectRemove(); offProjectRename(); offProjectUpdate(); offProjectPin(); offProjectReorder(); offTree(); offOpen(); offUi(); offTempSession(); offExport(); offAutoGroup(); offRemove() }, 'dsh-project-workspaces routes')
    void registry
  })
}

export { apply }
export const testApi = { scanRoot, scanTree, isScanSkipped, inside, statePayload }
