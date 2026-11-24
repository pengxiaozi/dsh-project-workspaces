'use strict'
// 客户端渲染回归测试：把 client bundle 载入假环境，直接挂载组件断言 DOM 结构。
// 覆盖：槽位注册、Windows 路径截断、卡片目录树展开、会话归档、会话标签条、无 DOM 祖先时不崩。
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { loadClient } = require('./helpers.cjs')

const TR = require('react-test-renderer')
const React = require('react')

function listOf(items) {
  return {
    getSnapshot() { return { items } },
    subscribe() { return () => {} },
  }
}

function makeEnv(options) {
  const opts = options || {}
  const opened = []
  const archived = []
  const started = []
  const registered = []
  const sessions = opts.sessions || []
  const workspaces = opts.workspaces || []
  const env = loadClient()
  const mod = env.mod
  const ctx = {
    effect() {},
    get(name) {
      if (name === 'sessions') return { list: listOf(sessions) }
      if (name === 'workspaces') return { list: listOf(workspaces), rename() {} }
      if (name === 'uiWorkspace') {
        return {
          openSession(id) { opened.push(String(id)) },
          async startSession(id) { started.push(String(id)) },
          async archiveSession(id) { archived.push(String(id)) },
          async pickDirectory() { return 'C:/picked' },
        }
      }
      return null
    },
    slots: {
      inject(name, fn) { fn() },
      register(options2, component) { registered.push({ name: options2.name, options: options2, component }) },
      registerFactory() {},
    },
  }
  mod.apply(ctx)
  const sidebar = registered.find((r) => r.name === 'sidebar.workspaces')
  const overlay = registered.find((r) => r.name === 'shell.overlay')
  const tabs = registered.find((r) => r.name === 'conversation.header.leading')
  return { env, sandbox: env.sandbox, mod, ctx, registered, sidebar, overlay, tabs, opened, archived, started }
}

async function flush() {
  for (let i = 0; i < 4; i++) {
    await TR.act(async () => { await new Promise((r) => setImmediate(r)) })
  }
}

function mountSidebar(env, options) {
  const opts = options || {}
  let renderer
  TR.act(() => {
    renderer = TR.create(React.createElement(env.sidebar.component, {
      wide: true,
      expandSidebar() {},
      sessions: { list: listOf(opts.sessions || []) },
      workspaces: { list: listOf(opts.workspaces || []) },
      uiWorkspace: { openSession() {}, async startSession() {}, async archiveSession() {} },
    }))
  })
  return renderer
}

function findByClass(renderer, cls) {
  return renderer.root.findAll((n) => n.props && typeof n.props.className === 'string' && n.props.className.split(' ').includes(cls))
}

const PROJECT_STATE = {
  projects: [{
    id: 'p1',
    root: 'D:\\devsoftware\\php\\phpstudy_pro\\WWW\\xwzx\\public',
    path: 'D:\\devsoftware\\php\\phpstudy_pro\\WWW\\xwzx\\public',
    name: 'public',
    alias: '专家组织换届',
    tags: ['zj'],
    color: '',
    pinned: false,
    children: [
      { name: 'web', path: 'D:\\devsoftware\\php\\phpstudy_pro\\WWW\\xwzx\\public\\web', alias: '', tags: [], registered: true, workspaceId: 'w-web', sessionCount: 1 },
      { name: 'admin', path: 'D:\\devsoftware\\php\\phpstudy_pro\\WWW\\xwzx\\public\\admin', alias: '', tags: [], registered: true, workspaceId: 'w-admin', sessionCount: 1 },
    ],
  }],
}

function stubFetch(state) {
  return async (url) => ({
    ok: true,
    status: 200,
    async json() { return Object.assign({ ok: true, dshHome: '/tmp', roots: [], workspaces: [], projects: [] }, state) },
  })
}

test('注册了侧边栏、设置面板、overlay 与标签条四个槽位', () => {
  const env = makeEnv()
  const names = env.registered.map((r) => r.name).sort()
  assert.deepEqual(names, ['conversation.header.leading', 'settings.section', 'shell.overlay', 'sidebar.workspaces'])
  assert.equal(env.sidebar.options.priority, -100, '侧边栏必须以 -100 抢占原生槽位')
})

test('Windows 绝对路径在卡片里被截断成 …/父/子', async () => {
  const sessions = [{ id: 's1', sessionId: 's1', title: '会话一', workspaceId: 'w-web' }]
  const workspaces = [{ id: 'w-web', workspaceId: 'w-web', path: PROJECT_STATE.projects[0].children[0].path, title: 'web', sessionIds: ['s1'] }]
  const env = makeEnv({ sessions, workspaces })
  global.fetch = stubFetch(PROJECT_STATE)
  const renderer = mountSidebar(env)
  await flush()
  const paths = findByClass(renderer, 'sbw-card-path')
  assert.ok(paths.length > 0, '卡片应渲染路径行')
  const text = JSON.stringify(paths.map((p) => p.props.children))
  assert.ok(!text.includes('devsoftware'), '不应出现完整绝对路径：' + text)
  assert.ok(text.includes('…/'), '应显示 …/ 形式的短路径：' + text)
  assert.ok(findByClass(renderer, 'sbw-card')[0], '卡片容器应存在')
})

test('目录树默认展开第一层，点击可收起（防回归：提前 return 导致子节点不渲染）', async () => {
  const NESTED = Object.assign({}, PROJECT_STATE, { projects: [Object.assign({}, PROJECT_STATE.projects[0], { children: [
    { name: 'public', path: PROJECT_STATE.projects[0].path + '\\public', alias: '', tags: [], registered: false, workspaceId: '', sessionCount: 0 },
    { name: 'web', path: PROJECT_STATE.projects[0].path + '\\public\\web', alias: '', tags: [], registered: true, workspaceId: 'w-web', sessionCount: 1 },
  ] })] })
  const env = makeEnv()
  global.fetch = stubFetch(NESTED)
  const renderer = mountSidebar(env)
  await flush()
  const dirs = findByClass(renderer, 'sbw-card-dir')
  assert.equal(dirs.length, 2, '第一层默认展开，应看到 public 与 web 两行，实际 ' + dirs.length)
  const before = findByClass(renderer, 'sbw-card-dir').length
  TR.act(() => { dirs[0].props.onClick({ stopPropagation() {}, preventDefault() {}, currentTarget: {} }) })
  await flush()
  const collapsed = findByClass(renderer, 'sbw-card-dir').length
  assert.ok(collapsed < before, '点 public 应收起子层，before=' + before + ' collapsed=' + collapsed)
  const again = findByClass(renderer, 'sbw-card-dir')[0]
  TR.act(() => { again.props.onClick({ stopPropagation() {}, preventDefault() {}, currentTarget: {} }) })
  await flush()
  assert.equal(findByClass(renderer, 'sbw-card-dir').length, before, '再次点击应恢复展开')
})

test('卡片里的会话可以归档，调用 uiWorkspace.archiveSession', async () => {
  const sessions = [{ id: 's1', sessionId: 's1', title: '会话一', workspaceId: 'w-web' }]
  const workspaces = [{ id: 'w-web', workspaceId: 'w-web', path: PROJECT_STATE.projects[0].children[0].path, title: 'web', sessionIds: ['s1'] }]
  const env = makeEnv({ sessions, workspaces })
  global.fetch = stubFetch(PROJECT_STATE)
  const archived = env.archived
  const renderer = mountSidebar(env)
  await flush()
  const rows = findByClass(renderer, 'sbw-card-sess')
  assert.ok(rows.length > 0, '卡片应渲染会话行')
  const btn = rows[0].findAll((n) => n.props && n.props.title === '归档这个会话')[0]
  assert.ok(btn, '会话行应有归档按钮')
  TR.act(() => { btn.props.onClick({ stopPropagation() {}, preventDefault() {}, currentTarget: {} }) })
  await flush()
  assert.deepEqual(archived, ['s1'])
})

test('会话标签条：打开会话后出现标签，点 × 移除', async () => {
  const env = makeEnv()
  global.fetch = stubFetch(PROJECT_STATE)
  const sessions = [{ id: 's1', sessionId: 's1', title: '会话一' }]
  env.sandbox.localStorage.setItem('dsh-project-workspaces:tabs', JSON.stringify(['s1']))
  let renderer
  TR.act(() => {
    renderer = TR.create(React.createElement(env.tabs.component, {
      services: {
        sessions: { list: listOf(sessions) },
        uiWorkspace: { openSession() {} },
      },
    }))
  })
  await flush()
  const tabsBefore = findByClass(renderer, 'pwt-tab')
  assert.equal(tabsBefore.length, 1, 'localStorage 里的会话应渲染成标签')
  const close = tabsBefore[0].findAll((n) => n.props && typeof n.props.className === 'string' && n.props.className.split(' ').includes('pwt-x'))[0]
  assert.ok(close, '标签应有关闭按钮')
  TR.act(() => { close.props.onClick({ stopPropagation() {}, preventDefault() {}, currentTarget: {} }) })
  await flush()
  assert.equal(findByClass(renderer, 'pwt-tab').length, 0, '关闭后标签应消失')
})

test('会话列表弹窗：session 快照缺 workspaceId 时仍能列出该工作区的会话（防回归：弹窗 0 个会话）', async () => {
  const sessions = [{ id: 's1', sessionId: 's1', title: '会话一' }]
  const workspaces = [{ id: 'w-web', workspaceId: 'w-web', path: PROJECT_STATE.projects[0].children[0].path, title: 'web', sessionIds: ['s1'] }]
  const env = makeEnv({ sessions, workspaces })
  global.fetch = stubFetch(PROJECT_STATE)
  let overlay
  TR.act(() => {
    overlay = TR.create(React.createElement(env.overlay.component, {
      services: {
        sessions: { list: listOf(sessions) },
        workspaces: { list: listOf(workspaces) },
        uiWorkspace: { openSession() {}, async archiveSession() {} },
      },
    }))
  })
  await flush()
  const api = env.sandbox.window.__dshProjectWorkspaces
  assert.ok(api && typeof api.openSessionList === 'function', '应暴露 openSessionList 调试入口')
  TR.act(() => { api.openSessionList({ title: 'web', wsIds: ['w-web'], sessionIds: ['s1'] }) })
  await flush()
  const rows = findByClass(overlay, 'pw-sess-row')
  assert.equal(rows.length, 1, '弹窗应列出该工作区的 1 条会话，实际 ' + rows.length)
  const subtitle = JSON.stringify(overlay.toJSON())
  assert.ok(!subtitle.includes('0 个会话'), '不应显示 0 个会话：' + subtitle.slice(0, 200))
})

test('会话列表弹窗：原生快照只有 {ids, byId} 没有 items 时也要列出会话', async () => {
  const sessions = [{ id: 's1', sessionId: 's1', title: '会话一', workspaceId: 'w-web' }]
  const byId = { s1: sessions[0] }
  const snapshot = { ids: ['s1'], byId, phase: 'idle' }
  const env = makeEnv({ sessions, workspaces: [] })
  global.fetch = stubFetch(PROJECT_STATE)
  let overlay
  TR.act(() => {
    overlay = TR.create(React.createElement(env.overlay.component, {
      services: {
        sessions: { list: { getSnapshot() { return snapshot }, subscribe() { return () => {} } } },
        workspaces: { list: listOf([]) },
        uiWorkspace: { openSession() {}, async archiveSession() {} },
      },
    }))
  })
  await flush()
  const api = env.sandbox.window.__dshProjectWorkspaces
  TR.act(() => { api.openSessionList({ title: 'web', wsIds: ['w-web'], sessionIds: ['s1'] }) })
  await flush()
  assert.equal(findByClass(overlay, 'pw-sess-row').length, 1, 'ids/byId 形态的快照也应列出 1 条会话')
})

test('挂载时没有可用布局祖先也不会抛错（防回归：量高逻辑崩溃）', async () => {
  const env = makeEnv()
  global.fetch = stubFetch(PROJECT_STATE)
  assert.doesNotThrow(() => mountSidebar(env, { sessions: [], workspaces: [] }))
  await flush()
})
