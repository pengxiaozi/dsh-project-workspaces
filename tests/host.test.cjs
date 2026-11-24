'use strict'
// 宿主路由回归测试：直接 import lib/index.js，用假 ctx 收集路由后发请求。
// 覆盖：/project 增量合并、/project/update 颜色与子目录别名、/tree 递归扫描跳过、
//       /remove 清理项目、/project/reorder 与 /project/pin。
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-pw-host-'))
process.env.DSH_HOME = TMP

function makeRegistry(initial) {
  const map = new Map()
  let seq = 0
  for (const item of initial || []) {
    const id = item.id || 'ws-' + ++seq
    map.set(id, { id, path: item.path, title: item.title || path.basename(item.path), sessionIds: item.sessionIds || [] })
  }
  return {
    list() { return [...map.values()] },
    get(id) { return map.get(id) },
    resolveByPath(p) {
      const target = path.resolve(p).toLowerCase()
      for (const ws of map.values()) if (path.resolve(ws.path).toLowerCase() === target) return ws
      return undefined
    },
    create(p, title) {
      const id = 'ws-' + ++seq
      const ws = { id, path: p, title: title || path.basename(p), sessionIds: [] }
      map.set(id, ws)
      return ws
    },
    delete(id) { return map.delete(id) },
    insertBefore() {},
  }
}

async function boot(options) {
  process.env.DSH_HOME = fs.mkdtempSync(path.join(TMP, 'home-'))
  const mod = await import('file://' + path.join(__dirname, '..', 'lib', 'index.js').replace(/\\/g, '/'))
  const routes = new Map()
  const effects = []
  const registry = makeRegistry(options && options.workspaces)
  const ctx = {
    effect(fn) { effects.push(fn); return fn },
    get(name) {
      if (name === 'workspaceRegistry') return registry
      if (name === 'webServer') return null
      if (name === 'sessionQuery') return options && options.sessionQuery
      if (name === 'clientModules') return { rebuilt() {} }
      return null
    },
    inject(names, runner) { runner({ workspaceRegistry: registry, webServer: { register(entry) {
      routes.set(entry.path, entry.handler)
      return () => routes.delete(entry.path)
    } } }) },
  }
  mod.apply(ctx)
  return { mod, routes, registry, ctx, effects }
}

function req(handler, { method = 'GET', body, query } = {}) {
  return new Promise((resolve) => {
    const reqObj = {
      method,
      headers: {},
      on(event, fn) {
        if (event === 'data' && body !== undefined) fn(Buffer.from(JSON.stringify(body)))
        if (event === 'end') fn()
        return reqObj
      },
      [Symbol.asyncIterator]: async function* () {
        if (body !== undefined) yield Buffer.from(JSON.stringify(body))
      },
    }
    let status = 200
    let payload = ''
    const res = {
      set statusCode(v) { status = v },
      get statusCode() { return status },
      setHeader() {},
      writeHead(code) { status = code },
      end(chunk) { payload = chunk == null ? '' : String(chunk); resolve({ status, body: safeJson(payload) }) },
    }
    handler(Object.assign(reqObj, { query: query || {} }), res)
  })
}

function safeJson(text) {
  try { return JSON.parse(text) } catch { return text }
}

function mk(...parts) {
  const full = path.join(TMP, ...parts)
  fs.mkdirSync(full, { recursive: true })
  return full.replace(/\\/g, '/')
}

function readState() {
  const file = path.join(process.env.DSH_HOME, 'project-workspaces.json')
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

test('宿主插件基础：注册 health / state 路由', async () => {
  const { routes } = await boot()
  assert.ok(routes.has('/dsh-project-workspaces/state'), '缺少 state 路由')
  assert.ok(routes.has('/dsh-project-workspaces/health'), '缺少 health 路由')
})

test('/project 第二次提交是增量合并，不覆盖已有子目录', async () => {
  const root = mk('proj')
  const a = mk('proj', 'a')
  const b = mk('proj', 'b')
  mk('proj', 'c')
  const { routes, registry } = await boot({
    workspaces: [
      { path: a, title: 'a' },
      { path: b, title: 'b' },
      { path: mk('proj', 'c'), title: 'c' },
    ],
  })
  const first = await req(routes.get('/dsh-project-workspaces/project'), { method: 'POST', body: { root, name: 'proj', children: ['a'] } })
  assert.equal(first.status, 200)
  const second = await req(routes.get('/dsh-project-workspaces/project'), { method: 'POST', body: { root, name: '', children: ['b'] } })
  assert.equal(second.status, 200)
  const saved = readState()
  assert.equal(saved.projects.length, 1, '不应重复创建项目')
  const names = saved.projects[0].children.map((c) => c.name).sort()
  assert.deepEqual(names, ['a', 'b'], '旧子目录 a 必须保留')
  assert.equal(saved.projects[0].name, 'proj', '不传名时应沿用旧名')
  assert.equal(registry.list().length, 3)
})

test('/project/update 支持颜色、别名与子目录别名（含反斜杠路径）', async () => {
  const root = mk('proj2')
  const childDir = mk('proj2', 'a')
  const { routes } = await boot({ workspaces: [{ path: childDir, title: 'a' }] })
  await req(routes.get('/dsh-project-workspaces/project'), { method: 'POST', body: { root, name: 'proj', children: ['a'] } })
  let saved = readState()
  const projectId = saved.projects[0].id
  const res = await req(routes.get('/dsh-project-workspaces/project/update'), {
    method: 'POST',
    body: {
      projectId,
      color: '#2ea043',
      tags: ['PHP', 'CI4'],
      children: [{ path: childDir.replace(/\//g, '\\'), alias: '甲目录', tags: ['Vue'] }],
    },
  })
  assert.equal(res.status, 200)
  saved = readState()
  const project = saved.projects[0]
  assert.equal(project.color, '#2ea043')
  assert.deepEqual(project.tags, ['PHP', 'CI4'])
  assert.equal(project.children[0].alias, '甲目录')
  assert.deepEqual(project.children[0].tags, ['Vue'])
})

test('/tree 递归扫描：深度生效，依赖目录被跳过', async () => {
  const { routes } = await boot()
  const root = fs.mkdtempSync(path.join(TMP, 'scan-'))
  fs.mkdirSync(path.join(root, 'web', 'src'), { recursive: true })
  fs.mkdirSync(path.join(root, 'web', 'node_modules', 'x'), { recursive: true })
  fs.mkdirSync(path.join(root, 'api'), { recursive: true })
  const res = await req(routes.get('/dsh-project-workspaces/tree'), { method: 'POST', body: { root, depth: 2 } })
  assert.equal(res.status, 200)
  const names = res.body.tree.map((n) => n.name).sort()
  assert.deepEqual(names, ['api', 'web'])
  const web = res.body.tree.find((n) => n.name === 'web')
  assert.deepEqual(web.children.map((n) => n.name).sort(), ['src'], 'node_modules 必须被跳过')
  assert.ok(res.body.skipped.some((s) => s.includes('node_modules')))
})

test('/remove 删除工作区时同步清理项目子目录', async () => {
  const root = mk('proj3')
  const childDir = mk('proj3', 'a')
  const { routes, registry } = await boot({ workspaces: [{ path: childDir, title: 'a', id: 'wa' }] })
  await req(routes.get('/dsh-project-workspaces/project'), { method: 'POST', body: { root, name: 'proj', children: ['a'] } })
  const res = await req(routes.get('/dsh-project-workspaces/remove'), { method: 'POST', body: { workspaceId: 'wa', path: childDir } })
  assert.equal(res.status, 200)
  assert.equal(registry.list().length, 0)
  const saved = readState()
  assert.equal(saved.projects.length, 0, '子目录清空后项目应被移除')
})

test('/project/reorder 与 /project/pin 生效且保留其它项目', async () => {
  const dirs = { a: mk('pin', 'a'), b: mk('pin', 'b'), c: mk('pin', 'c') }
  const { routes } = await boot({
    workspaces: [
      { path: mk('pin', 'a', 'a1'), title: 'a1' },
      { path: mk('pin', 'b', 'b1'), title: 'b1' },
      { path: mk('pin', 'c', 'c1'), title: 'c1' },
    ],
  })
  for (const key of ['a', 'b', 'c']) {
    await req(routes.get('/dsh-project-workspaces/project'), { method: 'POST', body: { root: dirs[key], name: key, children: [key + '1'] } })
  }
  let saved = readState()
  assert.deepEqual(saved.projects.map((p) => p.name), ['c', 'b', 'a'], '新建项目应在最前')
  const ids = saved.projects.map((p) => p.id)
  await req(routes.get('/dsh-project-workspaces/project/reorder'), { method: 'POST', body: { projectIds: [ids[2], ids[0]] } })
  saved = readState()
  assert.deepEqual(saved.projects.map((p) => p.name), ['a', 'c', 'b'], '未列出的项目应原样追加')
  await req(routes.get('/dsh-project-workspaces/project/pin'), { method: 'POST', body: { projectId: ids[0], pinned: true } })
  saved = readState()
  assert.equal(saved.projects.find((p) => p.id === ids[0]).pinned, true)
})

test('清理：临时目录可删除', () => {
  assert.ok(fs.existsSync(TMP))
})
