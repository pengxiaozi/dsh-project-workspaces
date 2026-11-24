'use strict'
// 测试用最小运行环境：加载动态客户端 bundle、模拟宿主 ctx。
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const ROOT = path.resolve(__dirname, '..')

function fakeDocument() {
  const head = { children: [], appendChild(node) { head.children.push(node) }, removeChild() {} }
  const body = { children: [], appendChild(node) { body.children.push(node) }, removeChild() {} }
  function makeEl(tag) {
    return {
      tagName: String(tag || 'div').toUpperCase(),
      style: {},
      className: '',
      dataset: {},
      children: [],
      textContent: '',
      setAttribute() {},
      removeAttribute() {},
      appendChild(node) { this.children.push(node) },
      removeChild() {},
      addEventListener() {},
      removeEventListener() {},
      click() { if (typeof this.onclick === 'function') this.onclick({ preventDefault() {} }) },
      getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 } },
    }
  }
  return {
    head,
    body,
    createElement: makeEl,
    createElementNS(ns, tag) { return makeEl(tag) },
    querySelector() { return null },
    querySelectorAll() { return [] },
  }
}

// 加载 client/client.js，返回 { exports, apply } 以及使用到的全局环境
function loadClient(options) {
  const opts = options || {}
  const React = require('react')
  const src = fs.readFileSync(path.join(ROOT, 'client', 'client.js'), 'utf8')
  const document = fakeDocument()
  const listeners = Object.create(null)
  const localStorageData = Object.assign({}, opts.localStorage || {})
  let captured = null

  const windowObj = {
    __ModuleLoader__: { load(desc) { captured = desc } },
    innerHeight: 800,
    innerWidth: 1200,
    devicePixelRatio: 1,
    addEventListener(type, fn) { (listeners[type] || (listeners[type] = [])).push(fn) },
    removeEventListener(type, fn) {
      const arr = listeners[type]
      if (!arr) return
      const i = arr.indexOf(fn)
      if (i >= 0) arr.splice(i, 1)
    },
    dispatchEvent(event) {
      const arr = (listeners[event.type] || []).slice()
      for (const fn of arr) fn(event)
      return true
    },
    confirm() { return true },
    getComputedStyle() { return { display: '', flex: '', gridTemplateRows: '', containerType: '' } },
    localStorage: {
      getItem(key) { return Object.prototype.hasOwnProperty.call(localStorageData, key) ? localStorageData[key] : null },
      setItem(key, value) { localStorageData[key] = String(value) },
      removeItem(key) { delete localStorageData[key] },
    },
    matchMedia() { return { matches: false, addEventListener() {}, removeEventListener() {} } },
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  }

  class FakeEvent {
    constructor(type, init) {
      this.type = type
      this.detail = (init && init.detail) || undefined
      this.defaultPrevented = false
    }
    preventDefault() { this.defaultPrevented = true }
    stopPropagation() {}
  }

  const sandbox = {
    window: windowObj,
    document,
    localStorage: windowObj.localStorage,
    CustomEvent: FakeEvent,
    Event: FakeEvent,
    console,
    setTimeout,
    clearTimeout,
    requestAnimationFrame(fn) { return setTimeout(fn, 0) },
    cancelAnimationFrame(id) { clearTimeout(id) },
    Promise,
    URL: Object.assign(Object.create(URL), { createObjectURL: () => 'blob:fake', revokeObjectURL() {} }),
    Blob: class Blob { constructor(parts, opts) { this.parts = parts; this.type = (opts && opts.type) || '' } },
    fetch: (...args) => global.fetch(...args),
    require(id) {
      if (id === 'react') return React
      if (id === '@deepseek-ai/dsh-client-ui-primitives') {
        return opts.primitives || {}
      }
      return {}
    },
  }
  sandbox.globalThis = sandbox
  sandbox.window.document = document
  vm.createContext(sandbox)
  vm.runInContext(src, sandbox, { filename: 'client/client.js' })
  if (!captured) throw new Error('client bundle 没有调用 __ModuleLoader__.load')
  const mod = captured.factory(sandbox.require)
  return { mod, sandbox, window: windowObj, document, dispatch(type, detail) {
    return windowObj.dispatchEvent(new FakeEvent(type, { detail }))
  } }
}

module.exports = { ROOT, loadClient, fakeDocument }
