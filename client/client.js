window.__ModuleLoader__.load({
  id: 'dsh-project-workspaces',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')
    const h = React.createElement
    const { useEffect, useState } = React
    const NS = 'dsh-project-workspaces'
    const STATE_URL = '/dsh-project-workspaces/state'
    const OPEN_CREATE_EVENT = 'dsh-project-workspaces:open-create'
    const CHANGED_EVENT = 'dsh-project-workspaces:changed'
    // 一个工作区下默认最多铺 6 行会话，多出来的折成「还有 N 个会话」
    const SESSION_PREVIEW = 6
    // 项目色标：空串 = 默认色；其它值直接写进 style.color
    const PROJECT_COLORS = [
      { value: '', label: '默认' },
      { value: '#4d6bfe', label: '品牌蓝' },
      { value: '#2ea043', label: '绿' },
      { value: '#c98a00', label: '琥珀' },
      { value: '#d14343', label: '红' },
      { value: '#8b5cf6', label: '紫' },
      { value: '#0ea5e9', label: '青' },
      { value: '#ec4899', label: '粉' },
    ]
    // Fluent 图标来自原生 primitives；动态插件加载时机不确定，失败时回退内联 SVG。
    let primitives = null
    try { primitives = require('@deepseek-ai/dsh-client-ui-primitives') || null } catch (err) { primitives = null }
    const PI = primitives || {}
    function fluent(name, size, extra) {
      const Cmp = PI[name]
      if (!Cmp || (typeof Cmp !== 'function' && typeof Cmp !== 'object')) return null
      return h(Cmp, Object.assign({ size: size || 16 }, extra || {}))
    }
    // 尺寸/间距全部照抄原生 sidebar：WorkspaceBrowser.module.css + Rows.module.css
    const SIDEBAR_CSS = [
      '.sbw{--sbw-toolbar-height:36px;position:relative;z-index:1;flex:1 1 auto;min-height:0;display:flex;flex-direction:column;box-sizing:border-box;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,inherit)}',
      // 照抄原生 WorkspaceBrowser：侧边栏把工作区区域包在 container-type:size 里，
      // 用 100cqh 取「这块区域的一屏高」，不依赖祖先有没有确定高度。
      '.sbw-region{display:flex;flex-direction:column;min-height:0;height:100%}',
      '.sbw-region > .sbw{overflow:hidden}',

      '.sbw-wide{flex:1 1 auto;min-height:0;max-height:none}',
      '.sbw-hd{flex:none;display:flex;align-items:center;justify-content:flex-end;gap:4px;height:36px;padding-left:var(--dsh-sidebar-row-padding,12px);box-sizing:border-box;border-radius:var(--dsw-radius-md,12px);color:var(--dsw-alias-label-tertiary)}',
      '.sbw-hd:not(.open){margin-right:-4px;padding-right:1px}',
      '.sbw-hd-label{font-weight:500;letter-spacing:.02em}',
      '.sbw-hd-label{position:relative;left:-1px;flex:none;max-width:45%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:20px;font-size:13px;color:var(--dsw-alias-label-tertiary)}',
      '.sbw-hd-search{flex:1;max-width:28px;min-width:0;display:flex;align-items:center;margin-left:auto}',
      '.sbw-hd-search.open{max-width:none}',
      '.sbw-hd-actions{flex:none;display:flex;align-items:center;gap:4px;max-width:60px}',
      '.sbw-ibtn{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:none;border-radius:var(--dsw-radius-sm,8px);padding:0;background:transparent;cursor:pointer;color:var(--dsw-alias-label-secondary)}',
      '.sbw-ibtn:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.sbw-ibtn:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}',
      '.sbw-search{flex:none;display:flex;align-items:center;width:100%;height:28px;border-radius:var(--dsw-radius-sm,8px);background:transparent;cursor:text;color:var(--dsw-alias-label-secondary);overflow:hidden;box-sizing:border-box}',
      '.sbw-search.open{height:32px;padding:0 4px 0 0;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,12px);color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary))}',
      '.sbw-search input{flex:1;width:0;min-width:0;border:none;outline:none;background:transparent;font-family:inherit;font-size:13px;line-height:18px;color:var(--dsw-alias-label-primary)}',
      '.sbw-search input::placeholder{color:var(--dsw-alias-label-tertiary)}',
      '.sbw-debug{flex:none;padding:2px 12px 4px;font-size:10px;line-height:14px;color:var(--dsw-alias-label-tertiary);border-top:0.5px dashed var(--dsw-alias-border-l2,rgba(127,127,127,.2))}' +
      '.sbw-scroll{flex:1;min-height:0;display:flex;flex-direction:column}',
      '.sbw-wide .sbw-scroll{display:block;flex:1 1 auto;min-height:0;max-height:none;-webkit-overflow-scrolling:touch;margin-left:-4px;margin-right:calc(2px - var(--dsh-sidebar-inline-padding,8px));padding-left:4px;padding-right:calc(var(--dsh-sidebar-inline-padding,8px) - var(--dsh-scrollbar-width,8px) - 2px);overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable}',
      '.sbw-wide .sbw-scroll{touch-action:pan-y}',
      '.sbw-skel{padding:2px 8px}',
      '.sbw-skel-row{display:flex;align-items:center;gap:8px;height:32px;padding-left:calc(var(--dsh-sidebar-row-padding,12px) - 3px)}',
      '.sbw-skel-ico{flex:none;width:16px;height:16px;border-radius:var(--dsw-radius-xs,4px);background:color-mix(in srgb,var(--dsw-alias-label-primary,#111) 8%,transparent);animation:sbw-pulse 1.2s ease-in-out infinite}',
      '.sbw-skel-line{height:10px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#111) 8%,transparent);animation:sbw-pulse 1.2s ease-in-out infinite}',
      '@keyframes sbw-pulse{0%,100%{opacity:.55}50%{opacity:1}}',
      '.sbw-empty-state{display:flex;flex-direction:column;align-items:center;gap:6px;padding:28px 18px;text-align:center}',
      '.sbw-empty-ico{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;margin-bottom:2px;border-radius:var(--dsw-radius-lg,16px);background:color-mix(in srgb,var(--dsw-alias-label-primary,#111) 6%,transparent);color:var(--dsw-alias-label-tertiary)}',
      '.sbw-empty-title{font-size:13px;line-height:20px;font-weight:500;color:var(--dsw-alias-label-primary)}',
      '.sbw-empty-desc{max-width:240px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}',
      '.sbw-empty-btn{display:inline-flex;align-items:center;gap:4px;height:28px;margin-top:6px;padding:0 12px;border:none;border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-button-primary-fill,#4d6bfe);color:var(--dsw-alias-label-on-color,#fff);font-family:inherit;font-size:12px;cursor:pointer}',
      '.sbw-empty-btn:hover{background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-button-primary-fill,#3f5bee))}',
      '.sbw-list{flex:1;min-height:0;padding-bottom:16px}',
      '.sbw-wide .sbw-scroll::-webkit-scrollbar{width:6px}',
      '.sbw-wide .sbw-scroll::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--dsw-alias-label-primary,#111) 14%,transparent);border-radius:999px}',
      '.sbw-wide .sbw-scroll::-webkit-scrollbar-thumb:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary,#111) 26%,transparent)}',
      '.sbw-wide .sbw-scroll::-webkit-scrollbar-track{background:transparent}',
      '.sbw-list > * + *{margin-top:3px}',
      '.sbw-row{display:flex;align-items:center;gap:var(--dsh-sidebar-label-gap,8px);height:34px;transition:background-color 130ms ease,color 120ms ease;border-radius:var(--dsw-radius-md,12px);border-inline:var(--dsh-sidebar-paint-inset,3px) solid transparent;background-clip:padding-box;box-sizing:border-box;padding:0 8px;padding-inline-start:calc(var(--dsh-sidebar-row-padding,12px) - var(--dsh-sidebar-paint-inset,3px) + var(--sbw-indent,0px));cursor:pointer;color:var(--dsw-alias-label-primary);-webkit-user-select:none;user-select:none}',
      '.sbw-row:hover{background-color:var(--dsw-alias-interactive-bg-hover)}',
      '.sbw-row:active{background-color:color-mix(in srgb,var(--dsw-alias-label-primary,#111) 8%,transparent)}',
      '.sbw-slot{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:20px;color:var(--dsw-alias-label-tertiary)}',
      '.sbw-folder-active{color:var(--dsw-alias-state-business-primary)}',
      '.sbw-chev{display:none;color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary))}',
      '@media (hover:hover){.sbw-proj:hover .sbw-chev{display:inline-flex}.sbw-proj:hover .sbw-folder{display:none}}',
      '.sbw-arrow{transition:transform 150ms ease}',
      '.sbw-arrow-open{transform:rotate(90deg)}',
      '.sbw-text{flex:1;min-width:0;display:flex;flex-direction:row;align-items:center;gap:4px;overflow:hidden}',
      '.sbw-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px;line-height:22px;font-weight:400}',
      '.sbw-proj .sbw-title{font-weight:500;letter-spacing:.01em}',
      '.sbw-sess .sbw-title{font-size:14px;line-height:22px;color:var(--dsw-alias-label-secondary)}',
      '.sbw-proj .sbw-title{font-weight:500}',
      '.sbw-dir .sbw-title{font-size:14.5px;line-height:22px}',

      '.sbw-title.dim{color:var(--dsw-alias-label-tertiary)}',
      '.sbw-actions{flex:none;display:none;align-items:center;gap:13px}',
      '.sbw-row:hover .sbw-actions,.sbw-row:focus-within .sbw-actions,.sbw-actions.show{display:inline-flex}',
      '.sbw-danger:hover{color:var(--dsw-alias-state-error-primary,#d14343)}',
  '.sbw-mini{flex:none;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;margin:-4px;padding:0;border:none;border-radius:var(--dsw-radius-xs,4px);background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}',
      '.sbw-mini:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.sbw-input{flex:1;min-width:0;font-family:inherit;font-size:14px;line-height:20px;padding:0 2px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-button-elevated-fill,var(--dsw-alias-bg-layer-1));color:inherit;outline:none}',
      '.sbw-sess{height:32px;gap:0}',
      '.sbw-sess .sbw-title{margin:0 6px 0 var(--dsh-sidebar-label-gap,6px)}',
      '.sbw-sess.running{background:var(--sbw-run-bg,color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 10%, transparent));color:var(--sbw-run-fg,inherit)}',
      '.sbw-sess.running .sbw-title{color:inherit}',
      '.sbw-sess.running:hover{filter:brightness(.985)}',
      '.sbw-now{display:flex;align-items:center;gap:6px;flex:none;margin:0 10px 6px 12px;padding:0 8px;height:24px;border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-layer-2,#f5f6f8);border:0.5px solid var(--dsw-alias-border-l1,rgba(127,127,127,.16));cursor:pointer;overflow:hidden;color:var(--dsw-alias-label-secondary)}' +
      '.sbw-now-dot{flex:none;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-brand-primary,#4d6bfe)}' +
      '.sbw-now-label{flex:none;font-size:12px;line-height:17px;color:var(--dsw-alias-brand-primary,#4d6bfe)}' +
      '.sbw-now-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:19px;color:var(--dsw-alias-label-primary);font-weight:500}' +
      '.sbw-list.flat > :not(.sbw-flat){display:none}',
      '.sbw-flat{display:flex;flex-direction:column}',
      '.sbw-flat-row{gap:8px}',
      '.sbw-ws-hint{flex:none;max-width:40%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.sbw-hd-cur{flex:0 1 auto;min-width:0;max-width:138px;display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 8px;margin-left:2px;border:0.5px solid var(--dsw-alias-border-l1,rgba(127,127,127,.18));border-radius:999px;background:var(--dsw-alias-bg-layer-2,#f5f6f8);color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:16px;cursor:pointer;overflow:hidden}',
      '.sbw-hd-cur:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.sbw-hd-cur-dot{flex:none;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-business-primary,#4d6bfe)}',
      '.sbw-hd-cur-t{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.sbw-branch{position:relative}',
      '.sbw-tabs{height:auto}',
      '.sbw-ibtn.on{background:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 14%, transparent);color:var(--dsw-alias-brand-primary,#4d6bfe)}',
      '.sbw-cur{flex:none;font-size:11px;line-height:17px;padding:0 6px;border-radius:999px;color:var(--dsw-alias-brand-primary,#4d6bfe);background:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 16%, transparent)}' +
      '.sbw-sess.selected{position:relative;background-color:rgba(77,107,254,.18);background-color:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 20%, transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 30%, transparent)}',
      '.sbw-sess.selected::before{content:"";position:absolute;top:6px;bottom:6px;left:5px;width:3px;border-radius:2px;background:var(--dsw-alias-brand-primary,#4d6bfe)}',
      '.sbw-sess.selected .sbw-title{color:var(--dsw-alias-brand-primary,#4d6bfe);font-weight:600}',
      '.sbw-sess.selected:hover{background-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 22%,transparent)}',
      '.sbw-sess.selected .sbw-time{color:var(--dsw-alias-brand-primary,#4d6bfe);opacity:.85}',
      // 当前会话的祖先行（工作区 / 合并目录 / 项目）用主色文件夹 + 左侧细线，便于定位
      '.sbw-row.has-active .sbw-folder{color:var(--dsw-alias-brand-primary,#4d6bfe)}',
      '.sbw-row.has-active .sbw-title{font-weight:500}',
      '.sbw-dot{flex:none;width:7px;height:7px;border-radius:50%;background:currentColor;color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary))}',
      '.sbw-dot.ongoing{width:8px;height:8px;background:transparent;border:1.5px solid var(--dsw-alias-state-business-primary,#4d6bfe);border-top-color:transparent;animation:sbw-spin .8s linear infinite}',
      '.sbw-dot.warning{color:var(--dsw-alias-state-warn-primary,#c98a00)}',
      '.sbw-dot.done{color:var(--dsw-alias-state-success-primary,#2ea043)}',
      '@keyframes sbw-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '.sbw-trail{flex:none;font-size:11.5px;line-height:16px;color:var(--dsw-alias-state-warn-primary,#c98a00);margin-inline-end:-1px}',
      '.sbw-input.sbw-input-sess{flex:1;min-width:0;margin:0 6px;height:24px;font-size:13px}',
      '.sbw-time{flex:none;margin-left:auto;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary);margin-inline-end:-1px}',
      '.sbw-empty-page{padding:16px 12px;font-size:13px;line-height:20px}',
      '.sbw-empty{padding:8px 12px;padding-inline-start:calc(var(--dsh-sidebar-row-padding,12px) + var(--sbw-indent,0px));color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.sbw-roll{margin-left:auto;flex:none;max-width:46%;overflow:hidden;display:flex;align-items:center;gap:6px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.sbw-roll-item{display:inline-flex;align-items:center;gap:3px;font-size:12px}',
      '.sbw-folder-hit{padding:0;border:none;background:transparent;cursor:pointer;color:inherit}',
      '.sbw-folder-hit:hover{color:var(--dsw-alias-brand-primary,#4d6bfe)}',
      '.sbw-folder{position:relative}',
      '.sbw-folder::after{pointer-events:none}',
      '.sbw-folder.act-ongoing::after{content:"";position:absolute;right:-3px;top:-2px;width:7px;height:7px;border-radius:50%;border:1.5px solid var(--dsw-alias-bg-base,#fff);border-top-color:var(--dsw-alias-state-business-primary,#4d6bfe);border-right-color:var(--dsw-alias-state-business-primary,#4d6bfe);background:var(--dsw-alias-bg-base,#fff);box-sizing:border-box}',
      '.sbw-folder.act-warning::after{content:"";position:absolute;right:-2px;top:-1px;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-warn-primary,#c98a00);box-shadow:0 0 0 1.5px var(--dsw-alias-bg-base,#fff)}',
      '.sbw-folder.act-done::after{content:"";position:absolute;right:-2px;top:-1px;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary,#2ea043);box-shadow:0 0 0 1.5px var(--dsw-alias-bg-base,#fff)}',
      '.sbw-tabs{display:flex;gap:4px;overflow-x:auto;padding:0 8px 6px 12px;scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 18px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 18px),transparent)}',
      '.sbw-tabs::-webkit-scrollbar{display:none}',
      '.sbw-tab{flex:none;display:inline-flex;align-items:center;gap:5px;max-width:168px;height:24px;padding:0 9px;border:none;border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;cursor:pointer;transition:background-color 130ms ease,color 130ms ease}',
      '.sbw-tab:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));color:var(--dsw-alias-label-primary)}',
      '.sbw-tab.on{background:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 14%, transparent);color:var(--dsw-alias-brand-primary,#4d6bfe)}',
      '.sbw-tab.pending{color:var(--dsw-alias-state-warn-primary,#c98a00)}',
      '.sbw-tab-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.sbw-roll-btn{padding:0;border:none;background:transparent;cursor:pointer;color:inherit;font:inherit}',
      '.sbw-roll-btn:hover{color:var(--dsw-alias-label-primary)}',
      '.sbw-filter-all{font-weight:500}' +
      '.sbw-filter-hint{display:flex;align-items:center;gap:6px;padding:2px 12px 6px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}' +
      '.sbw-filter-clear{padding:0;border:none;background:transparent;cursor:pointer;color:var(--dsw-alias-brand-primary,#4d6bfe);font:inherit}' +
      '.sbw-filters{display:flex;flex-wrap:wrap;gap:4px;padding:0 8px 6px 12px}',
      '.sbw-filter{height:25px;padding:0 11px;border:0.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.24));border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#111) 4%,transparent);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:22px;cursor:pointer;transition:background-color 120ms ease,border-color 120ms ease,color 120ms ease}',
      '.sbw-filter:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.sbw-filter.on{border-color:transparent;background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 14%,transparent);color:var(--dsw-alias-brand-primary,#4d6bfe);font-weight:500}',
      '.sbw-hd-sum{flex:none;display:inline-flex;align-items:center;gap:4px;margin-right:4px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.sbw-sect-head{height:26px;display:flex;align-items:center;padding-left:calc(var(--dsh-sidebar-row-padding,12px) - 3px);font-size:12px;line-height:18px;font-weight:500;color:var(--dsw-alias-label-tertiary);letter-spacing:0.02em;opacity:.9}',
      '.sbw-pin.pinned{color:var(--dsw-alias-brand-primary,#4d6bfe);opacity:1}',
      '.sbw-dragging{opacity:0.45}',
      '.sbw-drop-before{box-shadow:inset 0 2px 0 var(--dsw-alias-brand-primary,#4d6bfe)}',
      '.sbw-drop-after{box-shadow:inset 0 -2px 0 var(--dsw-alias-brand-primary,#4d6bfe)}',
      '.sbw-more .sbw-title{font-size:12.5px;color:var(--dsw-alias-label-tertiary)}',
      '.sbw-more:hover .sbw-title{color:var(--dsw-alias-label-primary)}',
      '.sbw-more .sbw-chev-inline{display:inline-flex;margin-left:auto;color:var(--dsw-alias-label-tertiary)}',
      '.sbw-count{flex:none;font-size:12px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.sbw-tags{flex:none;display:inline-flex;align-items:center;gap:4px;margin-left:4px;overflow:hidden;max-width:120px}',
      '.sbw-tag{flex:none;max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;line-height:16px;padding:0 6px;border-radius:999px;border:.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.24));background:color-mix(in srgb,var(--dsw-alias-label-primary,#111) 5%,transparent);color:var(--dsw-alias-label-tertiary)}',
      '.sbw-alias{flex:none;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.sbw-loose{margin-top:8px;padding-top:8px;border-top:1px dashed var(--dsw-alias-border-l1,rgba(127,127,127,.2))}',
      '.sbw-dir .sbw-folder{color:var(--dsw-alias-label-secondary)}',
      '.sbw-msg{margin:4px 4px 8px;padding:8px 10px;border-radius:var(--dsw-radius-md,12px);font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}',
      '.sbw-hint{padding:4px 12px 8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}',
      '.sbw-rail{flex:none;display:flex;flex-direction:column;align-items:flex-start}',
      '.sbw-rail .sbw-hd{gap:0;padding-left:0;margin-bottom:12px;justify-content:flex-start}',
      '.sbw-rail .sbw-ibtn{width:36px;height:36px;border-radius:var(--dsw-radius-md,12px);color:var(--dsw-alias-label-primary)}',
    ].join('')
    let styleEl = null
    function ensureStyle() {
      if (styleEl || typeof document === 'undefined') return
      styleEl = document.createElement('style')
      styleEl.setAttribute('data-dsh-project-workspaces', '')
      styleEl.textContent = CSS
      document.head.appendChild(styleEl)
    }

    function FolderIcon(props) {
      const fluentIcon = fluent(props.open ? 'IconFolderOpenRegular' : 'IconFolderCloseRegular', 16)
      if (fluentIcon) return fluentIcon
      return h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': 'true' },
        h('path', { d: 'M1.5 3.25h3.94c.3 0 .59.14.78.38l.75.95h7.53c.55 0 1 .45 1 1v7.42c0 .55-.45 1-1 1H1.5c-.55 0-1-.45-1-1V4.25c0-.55.45-1 1-1Z', fill: 'currentColor' })
      )
    }
    function ChevronIcon(props) {
      const className = 'sbw-arrow' + (props.open ? ' sbw-arrow-open' : '')
      const fluentIcon = fluent('IconTriangleRightFillRegular', 12, { className: className })
      if (fluentIcon) return fluentIcon
      return h('svg', { width: 12, height: 12, viewBox: '0 0 12 12', 'aria-hidden': 'true', className: className },
        h('path', { d: 'M4 2.25 8.75 6 4 9.75Z', fill: 'currentColor' })
      )
    }
    function glyph(name, size, text) {
      const fluentIcon = fluent(name, size)
      return fluentIcon || text
    }
    function useSnapshot(source) {
      const [snap, setSnap] = useState(function () { return source && source.getSnapshot ? source.getSnapshot() : {} })
      useEffect(function () {
        if (!source || typeof source.subscribe !== 'function') return undefined
        setSnap(source.getSnapshot())
        return source.subscribe(function () { setSnap(source.getSnapshot()) })
      }, [source])
      return snap || {}
    }
    function sessionLabel(summary) {
      if (!summary) return '未命名会话'
      const label = summary.displayTitle || summary.title || summary.name || summary.label || summary.summary
      if (label) return String(label)
      const id = String(summary.id || summary.sessionId || '')
      return id ? '会话 ' + id.slice(0, 8) : '未命名会话'
    }
    function sessionStamp(summary) {
      if (!summary) return 0
      const keys = ['updatedAt', 'updated_at', 'lastActiveAt', 'lastMessageAt', 'createdAt', 'created_at', 'timestamp']
      for (const key of keys) {
        const raw = summary[key]
        if (raw === undefined || raw === null || raw === '') continue
        const num = typeof raw === 'number' ? raw : Date.parse(String(raw))
        if (Number.isFinite(num) && num > 0) return num
      }
      return 0
    }
    function formatRelative(stamp) {
      const diff = Date.now() - stamp
      if (!Number.isFinite(diff) || diff < 0) return ''
      const minute = 60000
      const hour = minute * 60
      const day = hour * 24
      if (diff < minute) return '刚刚'
      if (diff < hour) return Math.floor(diff / minute) + ' 分钟'
      if (diff < day) return Math.floor(diff / hour) + ' 小时'
      if (diff < day * 7) return Math.floor(diff / day) + ' 天'
      return Math.floor(diff / day) + ' 天'
    }
    function normalizePath(value) {
      return String(value || '').replace(/[\\\\/]+$/, '').toLowerCase()
    }
    function baseName(target) {
      const parts = String(target || '').split(/[\\\\/]/).filter(Boolean)
      return parts.length ? parts[parts.length - 1] : '项目'
    }
    function buildGroups(items) {
      const groups = new Map()
      for (const ws of items || []) {
        const title = String(ws.title || '')
        let root = ''
        let child = title
        const slash = title.indexOf(' / ')
        if (slash > 0) { root = title.slice(0, slash); child = title.slice(slash + 3) }
        if (!root) {
          const parts = String(ws.path || '').split(/[\\\\/]+/).filter(Boolean)
          root = parts.length > 1 ? parts[parts.length - 2] : (parts[0] || '项目')
          child = title || parts[parts.length - 1] || '项目'
        }
        if (!groups.has(root)) groups.set(root, [])
        groups.get(root).push({ ws: ws, child: child })
      }
      return Array.from(groups.entries()).map(function (entry) { return { root: entry[0], children: entry[1] } })
    }
    // 「新增工作区」弹窗的进程内总线：侧边栏 + 设置面板都能直接拉起弹窗，
    // 同时保留 window 事件，方便脚本或其他插件触发。
    const dialogListeners = new Set()
    function openCreateDialog(detail) {
      const payload = detail || {}
      for (const listener of Array.from(dialogListeners)) {
        try { listener(payload) } catch (err) { void err }
      }
      try { window.dispatchEvent(new CustomEvent(OPEN_CREATE_EVENT, { detail: payload })) } catch (err) { void err }
    }
    function useCreateDialogSeed() {
      const [seed, setSeed] = useState(null)
      useEffect(function () {
        dialogListeners.add(setSeed)
        function onOpen(event) { setSeed(event && event.detail ? event.detail : {}) }
        window.addEventListener(OPEN_CREATE_EVENT, onOpen)
        return function () {
          dialogListeners.delete(setSeed)
          window.removeEventListener(OPEN_CREATE_EVENT, onOpen)
        }
      }, [])
      return [seed, setSeed]
    }
    // 「编辑目录」弹窗的进程内总线：projectId + 目标路径（项目根或子目录）。
    const editListeners = new Set()
    function openEditDialog(target) {
      const payload = target || {}
      for (const listener of Array.from(editListeners)) {
        try { listener(payload) } catch (err) { void err }
      }
    }
    // 会话完成提示总线：侧边栏监听会话状态，完成时给 shell.overlay 里的提示条推一条消息
    const completionListeners = new Set()
    function notifyCompletion(payload) {
      completionListeners.forEach(function (fn) {
        try { fn(payload) } catch (err) { /* 单个监听器出错不影响其它 */ }
      })
    }
    function useCompletionToasts() {
      const [items, setItems] = useState([])
      const [held, setHeld] = useState('')
      useEffect(function () {
        function listener(payload) {
          setItems(function (prev) {
            const rest = prev.filter(function (item) { return item.sessionId !== payload.sessionId })
            return rest.concat([payload]).slice(-3)
          })
        }
        completionListeners.add(listener)
        return function () { completionListeners.delete(listener) }
      }, [])
      useEffect(function () {
        if (!items.length) return undefined
        const timers = items
          .filter(function (item) { return item.key !== held })
          .map(function (item) {
            return setTimeout(function () {
              setItems(function (prev) { return prev.filter(function (next) { return next.key !== item.key }) })
            }, 10000)
          })
        return function () { timers.forEach(clearTimeout) }
      }, [items, held])
      return [items, setItems, held, setHeld]
    }
    // 会话列表弹窗总线：点某个目录的图标就能把该目录下的会话摊开成一个列表
    const sessionListListeners = new Set()

    function openSessionList(payload) {
      sessionListListeners.forEach(function (listener) {
        try { listener(payload) } catch (err) { /* 忽略单个监听器异常 */ }
      })
    }

    function useSessionListSeed() {
      const [seed, setSeed] = useState(null)
      useEffect(function () {
        const listener = function (value) { setSeed(value) }
        sessionListListeners.add(listener)
        return function () { sessionListListeners.delete(listener) }
      }, [])
      return [seed, setSeed]
    }

    function useEditDialogSeed() {
      const [seed, setSeed] = useState(null)
      useEffect(function () {
        editListeners.add(setSeed)
        return function () { editListeners.delete(setSeed) }
      }, [])
      return [seed, setSeed]
    }
    function displayName(name, alias) {
      const base = String(name || '')
      const extra = String(alias || '').trim()
      return extra ? base + '(' + extra + ')' : base
    }
    // 标签分隔：逗号/分号/顿号/竖线都算分隔符（和服务端 normalizeTags 保持一致）
    function splitTags(value) {
      if (!value) return []
      const list = Array.isArray(value) ? value : String(value).split(/[,\uFF0C;\uFF1B\u3001|]/)
      const out = []
      for (const item of list) {
        const tag = String(item == null ? '' : item).trim()
        if (!tag) continue
        if (out.some(function (known) { return known.toLowerCase() === tag.toLowerCase() })) continue
        out.push(tag)
        if (out.length >= 8) break
      }
      return out
    }
    function tagChips(tags) {
      if (!tags || !tags.length) return null
      return h('span', { className: 'sbw-tags' }, tags.map(function (tag, index) {
        return h('span', { key: index, className: 'sbw-tag' }, tag)
      }))
    }

    // 把服务端返回的项目原始数据映射成侧边栏使用的结构（子目录 -> 已注册的 Workspace）
    function mapProjects(rawProjects, wsItems) {
      const byPath = new Map()
      const byId = new Map()
      for (const ws of wsItems || []) {
        byPath.set(normalizePath(ws.path), ws)
        byId.set(String(ws.workspaceId), ws)
      }
      return (rawProjects || []).map(function (project) {
        const children = (project.children || []).map(function (child) {
          const ws = byPath.get(normalizePath(child.path)) || byId.get(String(child.workspaceId || '')) || null
          return { child: Object.assign({}, child, { tags: splitTags(child.tags) }), ws: ws || null }
        })
        const selfWs = byPath.get(normalizePath(project.path || project.root)) || byId.get(String(project.workspaceId || '')) || null
        return {
          id: project.id,
          root: project.name || baseName(project.root),
          path: project.path || project.root,
          alias: project.alias || '',
          tags: splitTags(project.tags),
          pinned: project.pinned === true,
          color: project.color || '',
          selfWs: selfWs || null,
          children: children,
        }
      })
    }

    function SidebarBrowser(props) {
      ensureStyle()
      const sessions = props.sessions
      const workspaces = props.workspaces
      const uiWorkspace = props.uiWorkspace
      const wide = props.wide !== false
      const expandSidebar = typeof props.expandSidebar === 'function' ? props.expandSidebar : function () {}
      const wsSnap = useSnapshot(workspaces && workspaces.list)
      const sessionSnap = useSnapshot(sessions && sessions.list)
      const [tree, setTree] = useState(null)
      const [uiConfig, setUiConfig] = useState({})
      const [query, setQuery] = useState('')
      const [tagFilter, setTagFilter] = useState('')
      const [searchOpen, setSearchOpen] = useState(false)
      const [openRoots, setOpenRoots] = useState({})
      const [openChildren, setOpenChildren] = useState({})
      const [moreOpen, setMoreOpen] = useState({})
      const [error, setError] = useState('')
      const [loaded, setLoaded] = useState(false)
      const [renaming, setRenaming] = useState('')
      const [renameValue, setRenameValue] = useState('')
      const [busy, setBusy] = useState(false)
      const [dragId, setDragId] = useState('')
      const [dropHint, setDropHint] = useState(null)
      const [renamingSession, setRenamingSession] = useState('')
      const [sessionRenameValue, setSessionRenameValue] = useState('')
      const [lastPicked, setLastPicked] = useState('')
      const [flatMode, setFlatMode] = useState(false)
      const [sessionRenameBusy, setSessionRenameBusy] = useState(false)
      const scrollRef = React.useRef(null)
      const sessionNodes = React.useRef({})
      async function commitRename(project) {
        const name = renameValue.trim()
        if (!project) { setRenaming(''); return }
        if (!name) { setError('项目名称不能为空'); return }
        if (name === project.root) { setRenaming(''); return }
        setBusy(true)
        setError('')
        try {
          const response = await fetch('/dsh-project-workspaces/project/rename', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ projectId: project.id, name: name }),
          })
          const body = await response.json().catch(function () { return {} })
          if (!response.ok || body.ok === false) throw new Error(body.error || ('重命名失败：' + response.status))
          try {
            if (workspaces && typeof workspaces.rename === 'function') {
              for (const item of project.children || []) {
                const ws = item.ws
                if (!ws || !ws.workspaceId) continue
                await workspaces.rename(ws.workspaceId, name + ' / ' + item.child.name)
              }
            }
          } catch (err) { void err }
          setRenaming('')
          await loadTree()
          try { window.dispatchEvent(new CustomEvent(CHANGED_EVENT)) } catch (err) { void err }
        } catch (err) {
          setError(String(err && err.message ? err.message : err))
        } finally {
          setBusy(false)
        }
      }
      async function newTempSession() {
        if (busy) return
        setBusy(true); setError('')
        try {
          const body = await postJson(API.tempSession, {})
          await loadTree()
          notifyChanged()
          if (body && body.workspaceId && uiWorkspace && typeof uiWorkspace.startSession === 'function') {
            await uiWorkspace.startSession(body.workspaceId)
          }
        } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
      }
      async function loadTree() {
        try {
          const response = await fetch(STATE_URL, { credentials: 'same-origin' })
          const body = await response.json().catch(function () { return {} })
          if (!response.ok || body.ok === false) throw new Error(body.error || ('读取项目失败：' + response.status))
          setTree(body.projects || [])
          setUiConfig(body.ui || {})
          setError('')
        } catch (err) {
          setTree(null)
          setError(String(err && err.message ? err.message : err))
        } finally {
          setLoaded(true)
        }
      }
      useEffect(function () { loadTree() }, [])
      useEffect(function () {
        function onChange() { loadTree() }
        window.addEventListener(CHANGED_EVENT, onChange)
        return function () { window.removeEventListener(CHANGED_EVENT, onChange) }
      }, [])
      async function postJson(url, payload) {
        const response = await fetch(url, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload || {}),
        })
        const body = await response.json().catch(function () { return {} })
        if (!response.ok || body.ok === false) throw new Error(body.error || ('请求失败：' + response.status))
        return body
      }
      async function togglePin(project) {
        setError('')
        try {
          await postJson(API.projectPin, { projectId: project.id, pinned: !project.pinned })
          await loadTree()
        } catch (err) {
          setError(String(err && err.message ? err.message : err))
        }
      }
      // 拖拽结束后：按「置顶组在前、其余在后」的显示顺序重排，并把被拖的项目归到目标所在分组
      async function moveProject(sourceId, targetId, after) {
        if (!sourceId || !targetId || sourceId === targetId) return
        const list = Array.isArray(tree) ? tree : []
        const source = list.find(function (item) { return item.id === sourceId })
        const target = list.find(function (item) { return item.id === targetId })
        if (!source || !target) return
        const pinnedIds = list.filter(function (item) { return item.pinned === true }).map(function (item) { return item.id })
        const normalIds = list.filter(function (item) { return item.pinned !== true }).map(function (item) { return item.id })
        const order = pinnedIds.concat(normalIds).filter(function (id) { return id !== sourceId })
        const index = order.indexOf(targetId)
        if (index < 0) order.push(sourceId)
        else order.splice(after ? index + 1 : index, 0, sourceId)
        setBusy(true)
        setError('')
        try {
          if (source.pinned !== target.pinned) {
            await postJson(API.projectPin, { projectId: sourceId, pinned: target.pinned === true })
          }
          await postJson(API.projectReorder, { projectIds: order })
          await loadTree()
        } catch (err) {
          setError(String(err && err.message ? err.message : err))
        } finally {
          setBusy(false)
        }
      }
      function projectDragProps(project) {
        return {
          draggable: renaming !== project.id,
          onDragStart: function (event) {
            setDragId(project.id)
            try {
              event.dataTransfer.setData('text/plain', project.id)
              event.dataTransfer.effectAllowed = 'move'
            } catch (err) { void err }
          },
          onDragOver: function (event) {
            if (!dragId || dragId === project.id) return
            event.preventDefault()
            try { event.dataTransfer.dropEffect = 'move' } catch (err) { void err }
            const rect = event.currentTarget.getBoundingClientRect()
            const after = (event.clientY - rect.top) > rect.height / 2
            setDropHint({ id: project.id, after: after })
          },
          onDragLeave: function () {
            setDropHint(function (hint) { return hint && hint.id === project.id ? null : hint })
          },
          onDrop: function (event) {
            event.preventDefault()
            const hint = dropHint
            const source = dragId
            setDragId('')
            setDropHint(null)
            if (!source || source === project.id) return
            void moveProject(source, project.id, hint && hint.id === project.id ? hint.after : false)
          },
          onDragEnd: function () {
            setDragId('')
            setDropHint(null)
          },
        }
      }
      function projectHasCurrent(project) {
        if (!currentId || !project) return false
        if (project.selfWs && hasCurrentSession(project.selfWs)) return true
        for (const item of (project.children || [])) {
          if (item.ws && hasCurrentSession(item.ws)) return true
        }
        return false
      }
      function projectRowClass(project, base) {
        let cls = base
        if (projectHasCurrent(project)) cls += ' has-active'
        if (dragId === project.id) cls += ' sbw-dragging'
        if (dropHint && dropHint.id === project.id) cls += dropHint.after ? ' sbw-drop-after' : ' sbw-drop-before'
        return cls
      }

      const wsItems = (wsSnap && wsSnap.items) || []
      const summaries = (function () {
        const map = Object.assign({}, (sessionSnap && sessionSnap.byId) || {})
        const list = (sessionSnap && sessionSnap.items) || []
        for (const item of list) {
          if (!item) continue
          const id = String(item.id || item.sessionId || '')
          if (id && !map[id]) map[id] = item
        }
        return map
      })()
      const activeSessionId = String(
        (sessionSnap && (sessionSnap.activeSessionId || sessionSnap.currentSessionId || sessionSnap.selectedSessionId || sessionSnap.activeId || sessionSnap.selectedId || (sessionSnap.active && sessionSnap.active.id) || (sessionSnap.current && sessionSnap.current.id))) || ''
      )
      // 快照给不出「当前会话」时，用最近一次手动打开的会话兜底，保证始终有一行处于选中态
      const currentId = activeSessionId || String(lastPicked || '')
      const projects = Array.isArray(tree) ? mapProjects(tree, wsItems) : null
      // 落在项目根目录下、但还没写进项目里（老数据 / 后来手动加的工作区）→ 渲染时自动挂到该项目下面，
      // 免得同一条目录树被拆成「项目里一部分 + 下面平铺一部分」。
      if (projects) {
        const claimed = new Set()
        projects.forEach(function (project) {
          if (project.selfWs) claimed.add(String(project.selfWs.workspaceId))
          project.children.forEach(function (item) { if (item.ws) claimed.add(String(item.ws.workspaceId)) })
        })
        wsItems.forEach(function (ws) {
          const wsId = String(ws.workspaceId)
          if (claimed.has(wsId)) return
          const target = normalizePath(ws.path)
          let best = null
          let bestLen = -1
          projects.forEach(function (project) {
            const root = normalizePath(project.path)
            if (!root || target === root) return
            if (target.indexOf(root + '/') !== 0) return
            if (root.length > bestLen) { best = project; bestLen = root.length }
          })
          if (!best) return
          const segs = relSegments(best.path, ws.path)
          // 只在「直接子目录 / 一层子目录」时自动挂；更深说明它其实属于另一个项目，
          // 硬塞进上层项目（比如 WWW）只会变成很长一串，反而不如留在下面平铺。
          if (segs.length > 2) return
          best.children.push({
            child: { name: segs.join('/') || baseName(ws.path), path: ws.path, alias: '', tags: [], auto: true },
            ws: ws,
          })
          claimed.add(wsId)
        })
      }
      const legacy = buildGroups(wsItems)
      // 没归入任何项目的 Workspace 平铺在项目后面，直接按工作区行显示（不再有「其他 Workspace」分组标题）
      const covered = new Set()
      if (projects) {
        for (const project of projects) {
          if (project.selfWs) covered.add(String(project.selfWs.workspaceId))
          for (const item of project.children) {
            if (item.ws) covered.add(String(item.ws.workspaceId))
          }
        }
      }
      const loose = wsItems.filter(function (ws) { return !covered.has(String(ws.workspaceId)) })
      const needle = query.trim().toLowerCase()
      React.useEffect(function () {
        if (!currentId) return
        const node = sessionNodes.current[currentId]
        const box = scrollRef.current
        if (!node || !box) return
        try {
          const row = node.getBoundingClientRect()
          const view = box.getBoundingClientRect()
          if (!row || !view || !view.height) return
          if (row.top >= view.top && row.bottom <= view.bottom) return
          const offset = (row.top - view.top) - Math.max(0, Math.round((view.height - row.height) / 3))
          box.scrollTop = Math.max(0, box.scrollTop + offset)
        } catch (err) {
          if (typeof node.scrollIntoView === 'function') node.scrollIntoView({ block: 'nearest' })
        }
      }, [currentId, tree, openRoots, openChildren, moreOpen, needle])
      function matchesSession(id) {
        if (!needle) return false
        const summary = summaries[id]
        return sessionLabel(summary).toLowerCase().indexOf(needle) >= 0
      }
      // 会话状态：原生 useSessionStatus 的快照是 ReadonlyMap<SessionId, { running, pendingInteraction, completionUnread }>
      const useSessionStatus = props.useSessionStatus
      let statusMap = null
      try {
        statusMap = typeof useSessionStatus === 'function' ? useSessionStatus(function (map) { return map }) : null
      } catch (err) { statusMap = null }
      function statusOf(id) {
        if (!statusMap) return null
        const keys = [id, String(id)]
        for (const key of keys) {
          try {
            if (typeof statusMap.get === 'function') {
              const hit = statusMap.get(key)
              if (hit) return hit
            } else if (statusMap[key]) {
              return statusMap[key]
            }
          } catch (err) { /* 忽略非法 key */ }
        }
        return null
      }
      function statusDotState(id, summary) {
        const st = statusOf(id)
        if (st && st.pendingInteraction) return 'warning'
        const running = st ? st.running === true : Boolean(summary && (summary.running === true || summary.status === 'running'))
        if (running) return 'ongoing'
        if (st && st.completionUnread) return 'done'
        return ''
      }
      function statusTrailing(id) {
        const st = statusOf(id)
        if (!st || !st.pendingInteraction) return ''
        if (st.pendingInteraction === 'approval') return '待批准'
        if (st.pendingInteraction === 'plan-review') return '待确认'
        if (st.pendingInteraction === 'question') return '待回答'
        return '待处理'
      }
      function statusDot(state) {
        const Cmp = PI.StateDot
        if (Cmp && (typeof Cmp === 'function' || typeof Cmp === 'object')) {
          return h(Cmp, { state: state || 'idle' })
        }
        return h('span', { className: 'sbw-dot' + (state ? ' ' + state : '') })
      }
      // 会话完成提示：原生 completionUnread 变为 true（跑完且不在主视图）时提示；出现待处理交互时也提示
      const statusSeen = React.useRef(null)
      useEffect(function () {
        if (!statusMap) return
        const prev = statusSeen.current
        const next = {}
        let ids = []
        try {
          if (typeof statusMap.keys === 'function') ids = Array.from(statusMap.keys())
          else if (typeof statusMap.forEach === 'function') statusMap.forEach(function (value, key) { ids.push(key) })
          else ids = Object.keys(statusMap)
        } catch (err) { ids = [] }
        ids.forEach(function (rawId) {
          const id = String(rawId)
          const entry = statusOf(rawId) || {}
          const snapshot = {
            running: entry.running === true,
            pending: entry.pendingInteraction ? String(entry.pendingInteraction) : '',
            unread: entry.completionUnread === true,
          }
          next[id] = snapshot
          if (!prev) return
          const before = prev[id]
          if (!before) return
          const summary = summaries[id]
          const title = summary ? sessionLabel(summary) : '会话 ' + id.slice(0, 8)
          if (snapshot.unread && !before.unread) {
            notifyCompletion({ key: id + ':done:' + Date.now(), sessionId: id, title: title, kind: 'done' })
          } else if (before.running && !snapshot.running) {
            // 主视图里的会话不会置 completionUnread，靠 running 由 true 变 false 兜底
            notifyCompletion({ key: id + ':done:' + Date.now(), sessionId: id, title: title, kind: 'done' })
          }
          if (snapshot.pending && snapshot.pending !== before.pending) {
            notifyCompletion({ key: id + ':warn:' + Date.now(), sessionId: id, title: title, kind: 'warning' })
          }
        })
        statusSeen.current = next
      }, [statusMap])
      function hasCurrentSession(ws) {
        if (!currentId || !ws) return false
        return sessionIdsOf(ws).map(String).indexOf(String(currentId)) >= 0
      }
      function nodeHasCurrent(node) {
        if (!currentId || !node) return false
        if (node.item && node.item.ws && hasCurrentSession(node.item.ws)) return true
        for (const child of (node.children || [])) {
          if (nodeHasCurrent(child)) return true
        }
        return false
      }
      function sessionIdsOf(ws) {
        const own = (ws && ws.sessionIds) || []
        const wsId = String((ws && ws.workspaceId) || '')
        if (!wsId) return own
        // ws.sessionIds 有时不完整（新会话还没回写），和会话快照里的 workspaceId 取并集
        const seen = new Set(own.map(String))
        const ids = own.slice()
        for (const id of Object.keys(summaries)) {
          const summary = summaries[id]
          if (!summary) continue
          const owner = String(summary.workspaceId || (summary.workspace && summary.workspace.id) || '')
          if (owner === wsId && !seen.has(String(id))) {
            seen.add(String(id))
            ids.push(id)
          }
        }
        return ids
      }
      function isRootOpen(key) { return openRoots[key] !== false }
      function isChildOpen(key, ws) {
        if (openChildren[key] !== false) return true
        // 当前打开的会话所在的工作区，即使被折叠也强制展开，保证它在侧边栏里可见
        if (!ws || !currentId) return false
        return sessionIdsOf(ws).map(String).indexOf(currentId) >= 0
      }
      function toggleRoot(key) {
        setOpenRoots(function (prev) {
          const next = Object.assign({}, prev)
          next[key] = !isRootOpen(key)
          return next
        })
      }
      function toggleChild(key) {
        setOpenChildren(function (prev) {
          const next = Object.assign({}, prev)
          next[key] = !isChildOpen(key)
          return next
        })
      }
      function toggleMore(key) {
        setMoreOpen(function (prev) {
          const next = Object.assign({}, prev)
          next[key] = prev[key] !== true
          return next
        })
      }
      async function newSession(ws) {
        setError('')
        try {
          if (uiWorkspace && typeof uiWorkspace.startSession === 'function') uiWorkspace.startSession(ws.workspaceId)
          else {
            const id = await sessions.create({ workspaceId: ws.workspaceId })
            if (sessions && typeof sessions.open === 'function') sessions.open(id)
          }
        } catch (err) { setError(String(err && err.message ? err.message : err)) }
      }
      function openSession(id) {
        setError('')
        setLastPicked(String(id || ''))
        noteOpened(id)
        try {
          if (uiWorkspace && typeof uiWorkspace.openSession === 'function') uiWorkspace.openSession(id)
          else if (sessions && typeof sessions.open === 'function') sessions.open(id)
          else throw new Error('当前 DSH 没有暴露会话打开接口')
        } catch (err) { setError(String(err && err.message ? err.message : err)) }
      }
      async function openDir(path) {
        setError('')
        try { await postJson(API.open, { path: path }) }
        catch (err) { setError(errorText(err)) }
      }
      function confirmAction(text) {
        try {
          if (typeof window !== 'undefined' && typeof window.confirm === 'function') return window.confirm(text)
        } catch (err) { void err }
        return true
      }
      async function removeWorkspace(ws, label) {
        if (!ws || !ws.workspaceId) return
        const name = label || ws.title || baseName(ws.path)
        if (!confirmAction('删除工作区「' + name + '」？\n只会从 DSH 移除这个工作区，不会删除磁盘目录；它名下的会话也会一并从侧边栏消失。')) return
        setError('')
        try {
          await postJson(API.remove, { workspaceId: ws.workspaceId, path: ws.path })
          await loadTree()
          notifyChanged()
        } catch (err) { setError(errorText(err)) }
      }
      async function removeProjectItem(project) {
        if (!project || !project.id) return
        const name = displayName(project.root, project.alias)
        if (!confirmAction('从侧边栏移除项目「' + name + '」？\n只移除项目分组，子工作区会回到「未归组」列表，不会被删除。')) return
        setError('')
        try {
          await postJson(API.projectRemove, { projectId: project.id })
          await loadTree()
          notifyChanged()
        } catch (err) { setError(errorText(err)) }
      }
      function downloadText(filename, text) {
        try {
          const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()
          setTimeout(function () {
            try {
              URL.revokeObjectURL(url)
              link.remove()
            } catch (err) { void err }
          }, 0)
        } catch (err) {
          setError('导出失败：' + (err && err.message ? err.message : String(err)))
        }
      }
      async function exportSessions(wsList, label) {
        const name = label || '会话'
        const ids = []
        for (const ws of wsList || []) {
          if (!ws) continue
          for (const id of sessionIdsOf(ws)) {
            const key = String(id)
            if (ids.indexOf(key) < 0) ids.push(key)
          }
        }
        if (!ids.length) {
          setError('「' + name + '」名下还没有会话可以导出')
          return
        }
        setError('')
        try {
          const body = await postJson(API.exportSessions, { label: name, sessionIds: ids })
          if (!body || !body.content) throw new Error('导出内容为空')
          downloadText(body.filename || (name + '-会话导出.md'), body.content)
        } catch (err) {
          setError(errorText(err))
        }
      }
      // 行结构照抄原生 ProjectRow / SessionRow：folder → chevron → title → hover actions
      function rowShell(options) {
        const shellProps = {
          key: options.rowKey,
          className: options.className,
          role: 'treeitem',
          title: options.title || undefined,
          style: options.style,
          onClick: options.onClick,
        }
        if (options.drag) Object.assign(shellProps, options.drag)
        // 目录图标右下角的小徽标：正在回答 = 转圈，等待处理 = 琥珀点，未读完成 = 绿点
        const actClass = options.activity ? ' act-' + options.activity : ''
        const folderClass = 'sbw-slot sbw-folder' + (options.active ? ' sbw-folder-active' : '') + actClass + (options.onFolderClick ? ' sbw-folder-hit' : '')
        const folderStyle = options.color ? { color: options.color } : undefined
        const folderInner = options.icon || FolderIcon({ open: options.open })
        // 文件夹图标可以点：弹出该目录下所有会话，方便在长列表里直接挑
        const folderNode = options.onFolderClick
          ? h('button', {
            className: folderClass,
            style: folderStyle,
            title: options.folderTitle || '列出这里的会话',
            onClick: function (e) { e.stopPropagation(); options.onFolderClick(e) },
          }, folderInner)
          : h('span', { className: folderClass, style: folderStyle }, folderInner)
        return h('div', shellProps,
          folderNode,
          h('span', { className: 'sbw-slot sbw-chev' }, ChevronIcon({ open: options.open })),
          options.text,
          options.actions
        )
      }
      // 会话重命名走原生 SessionFace.rename：先 retain 一个引用，再调用 binding.session.rename
      async function renameSessionTitle(sessionId, title) {
        const svc = props.sessions
        if (!svc || typeof svc.using !== 'function') throw new Error('当前版本不支持重命名会话')
        const result = await svc.using(sessionId, { source: 'workspaceOperation' }, function (reference) {
          return reference.binding.session.rename(title)
        })
        if (!result || result.ok !== true) {
          const message = result && result.error && result.error.message ? result.error.message : '重命名失败'
          throw new Error(message)
        }
        return result.value
      }
      async function commitSessionRename(id, summary) {
        const title = String(sessionRenameValue || '').trim()
        if (!title || title === sessionLabel(summary)) {
          setRenamingSession('')
          return
        }
        setSessionRenameBusy(true)
        try {
          await renameSessionTitle(id, title)
          setRenamingSession('')
          setSessionRenameValue('')
          loadTree()
          notifyChanged()
        } catch (err) {
          setError(String((err && err.message) || err))
        } finally {
          setSessionRenameBusy(false)
        }
      }
      function sessionRows(ws, key, depth) {
        if (!isChildOpen(key)) return null
        const ids = sessionIdsOf(ws)
        const visible = needle ? ids.filter(matchesSession) : ids
        const indent = { '--sbw-indent': (depth * 12) + 'px' }
        if (!ids.length) return h('div', { className: 'sbw-empty', style: indent }, '暂无会话')
        if (!visible.length) return null
        // 当前会话就在这个工作区里时，直接铺开全部会话，保证它落在可见范围
        const activeInside = String(currentId) !== '' && visible.map(String).indexOf(currentId) >= 0
        const expanded = moreOpen[key] === true || activeInside
        const shown = expanded || needle ? visible : visible.slice(0, SESSION_PREVIEW)
        const rows = shown.map(function (id) {
          const summary = summaries[id]
          const active = String(id) === String(currentId)
          const renaming = renamingSession === String(id)
          const status = statusOf(id)
          const running = Boolean(status && status.running && !status.pendingInteraction)
          return h('div', {
            key: key + ':' + String(id),
            className: 'sbw-row sbw-sess' + (active ? ' selected' : '') + (running ? ' running' : ''),
            role: 'treeitem',
            title: sessionLabel(summary),
            style: indent,
            onClick: function () {
              if (renaming) return
              openSession(id)
            },
            ref: function (node) {
              if (node) sessionNodes.current[String(id)] = node
            },
          },
            h('span', { className: 'sbw-slot', title: (function () {
              const st = statusOf(id)
              if (st && st.pendingInteraction) return '等待你处理，点一下打开'
              if (st && st.running) return '正在回答，点一下打开'
              if (st && st.completionUnread) return '已完成，点一下打开'
              return '点一下打开'
            })() }, statusDot(statusDotState(id, summary))),
            renaming
              ? h('input', {
                  className: 'sbw-input sbw-input-sess',
                  value: sessionRenameValue,
                  autoFocus: true,
                  disabled: sessionRenameBusy,
                  onClick: function (e) { e.stopPropagation() },
                  onChange: function (e) { setSessionRenameValue(e.target.value) },
                  onKeyDown: function (e) {
                    if (e.key === 'Enter') { e.preventDefault(); commitSessionRename(id, summary) }
                    else if (e.key === 'Escape') { e.preventDefault(); setRenamingSession('') }
                  },
                })
              : h('span', { className: 'sbw-title' }, sessionLabel(summary)),
            active ? h('span', { className: 'sbw-cur' }, '当前') : null,
            (function () {
              const trail = statusTrailing(id)
              if (trail) return h('span', { className: 'sbw-trail' }, trail)
              const stamp = sessionStamp(summary)
              if (!stamp) return null
              const text = formatRelative(stamp)
              return text ? h('span', { className: 'sbw-time' }, text) : null
            })(),
            h('span', { className: 'sbw-actions' },
              renaming
                ? [
                    h('button', {
                      key: 'ok',
                      className: 'sbw-mini',
                      title: '保存名称',
                      disabled: sessionRenameBusy,
                      onClick: function (e) {
                        e.stopPropagation()
                        commitSessionRename(id, summary)
                      },
                    }, glyph('IconCheckOutlineRegular', 14, '✓')),
                    h('button', {
                      key: 'cancel',
                      className: 'sbw-mini',
                      title: '取消',
                      onClick: function (e) {
                        e.stopPropagation()
                        setRenamingSession('')
                      },
                    }, glyph('IconCloseOutlineRegular', 14, '✕')),
                  ]
                : [
                    h('button', {
                      key: 'rename',
                      className: 'sbw-mini',
                      title: '重命名会话',
                      onClick: function (e) {
                        e.stopPropagation()
                        setRenamingSession(String(id))
                        setSessionRenameValue(sessionLabel(summary))
                      },
                    }, glyph('IconEditOutlineRegular', 14, '✎')),
                    h('button', {
                      key: 'export',
                      className: 'sbw-mini',
                      title: '导出这个会话',
                      onClick: function (e) {
                        e.stopPropagation()
                        exportSessions([ws], sessionLabel(summary))
                      },
                    }, glyph('IconDownloadOutlineRegular', 14, '⇩')),
                  ]
            )
          )
        })
        if (!needle && visible.length > SESSION_PREVIEW) {
          rows.push(h('div', {
            key: key + ':more',
            className: 'sbw-row sbw-sess sbw-more',
            role: 'treeitem',
            title: expanded ? '收起会话列表' : '展开其余 ' + (visible.length - SESSION_PREVIEW) + ' 个会话',
            style: indent,
            onClick: function () { toggleMore(key) },
          },
            h('span', { className: 'sbw-slot' }),
            h('span', { className: 'sbw-title' }, expanded ? '收起会话' : '还有 ' + (visible.length - SESSION_PREVIEW) + ' 个会话'),
            expanded ? null : h('span', { className: 'sbw-chev sbw-chev-inline' }, ChevronIcon({ open: false }))
          ))
        }
        return rows
      }
      // 点文件夹图标时用：把要列出的 Workspace id 收集起来
      function wsIdsOf(wsList) {
        const out = []
        ;(wsList || []).forEach(function (ws) {
          if (ws && ws.workspaceId && out.indexOf(String(ws.workspaceId)) < 0) out.push(String(ws.workspaceId))
        })
        return out
      }

      function nodeWsIds(node) {
        const out = []
        const walk = function (current) {
          if (!current) return
          if (current.item && current.item.ws && current.item.ws.workspaceId) {
            const id = String(current.item.ws.workspaceId)
            if (out.indexOf(id) < 0) out.push(id)
          }
          if (current.children) current.children.forEach(function (entry) { walk(entry) })
        }
        walk(node)
        return out
      }

      function workspaceNode(ws, label, key, depth, meta) {
        const open = isChildOpen(key, ws)
        const info = meta || {}
        const child = info.child || null
        const actions = []
        if (info.projectId) {
          actions.push(h('button', {
            key: 'edit',
            className: 'sbw-mini',
            title: '编辑名称 / 别名 / 标签',
            onClick: function (e) {
              e.stopPropagation()
              openEditDialog({ projectId: info.projectId, path: child ? child.path : ws.path })
            },
          }, glyph('IconEditOutlineRegular', 14, '✎')))
          actions.push(h('button', {
            key: 'open',
            className: 'sbw-mini',
            title: '在资源管理器中打开目录',
            onClick: function (e) { e.stopPropagation(); openDir(child ? child.path : ws.path) },
          }, glyph('IconFolderOpenRegular', 14, '▤')))
        }
        actions.push(h('button', {
          key: 'new',
          className: 'sbw-mini',
          title: '新建会话',
          onClick: function (e) { e.stopPropagation(); newSession(ws) },
        }, glyph('IconNewChatOutlineRegular', 14, '＋')))
        actions.push(h('button', {
          key: 'export',
          className: 'sbw-mini',
          title: '导出该工作区的全部会话',
          onClick: function (e) { e.stopPropagation(); exportSessions([ws], label || ws.title) },
        }, glyph('IconDownloadOutlineRegular', 14, '⇩')))
        actions.push(h('button', {
          key: 'del',
          className: 'sbw-mini sbw-danger',
          title: '删除工作区',
          onClick: function (e) { e.stopPropagation(); removeWorkspace(ws, label || ws.title) },
        }, glyph('IconTrashOutlineRegular', 14, '删')))
        return h('div', { key: key },
          rowShell({
            className: 'sbw-row sbw-ws' + (hasCurrentSession(ws) ? ' has-active' : ''),
            title: withActivity(ws.path, wsActivity(ws)),
            open: open,
            activity: wsActivity(ws),
            onFolderClick: function () { openSessionList({ title: (label || ws.title || ws.path), wsIds: wsIdsOf([ws]) }) },
            style: { '--sbw-indent': (depth * 12) + 'px' },
            onClick: function () { toggleChild(key) },
            text: h('span', { className: 'sbw-text' },
              h('span', { className: 'sbw-title' }, displayName(label, child && child.alias)),
              tagChips(child && child.tags)
            ),
            actions: h('span', { className: 'sbw-actions' }, actions),
          }),
          h('div', { className: 'sbw-branch', style: { '--sbw-guide': ((depth + 1) * 14 + 6) + 'px' } }, sessionRows(ws, key, depth + 1))
        )
      }
      // 子目录按相对项目根目录的路径分段聚成一棵树：同父目录（public/web、public/page）自动合并到 public 下
      function relSegments(root, target) {
        const a = String(root || '').split(/[\\/]+/).filter(Boolean)
        const b = String(target || '').split(/[\\/]+/).filter(Boolean)
        let i = 0
        while (i < a.length && i < b.length && a[i].toLowerCase() === b[i].toLowerCase()) i++
        return b.slice(i)
      }
      function childTree(project) {
        const root = { name: project.root, path: project.path, children: new Map(), item: null }
        for (const item of project.children) {
          const segs = relSegments(project.path, item.child.path)
          // 只合并「同一个父目录下」的兄弟子工作区（相对路径两层，如 public/web、public/page）；
          // 更深的工作区（trunk/public/other/xxx）说明它本来就属于另一个应用目录，
          // 一路嵌套下去会变成一长串空目录，直接平铺成一行更清楚。
          if (segs.length > 2) {
            const key = item.child.name
            if (!root.children.has(key)) root.children.set(key, { name: key, path: item.child.path, children: new Map(), item: null })
            root.children.get(key).item = item
            continue
          }
          const parts = segs.length ? segs : [item.child.name]
          let node = root
          let acc = String(project.path || '').replace(/[\\/]+$/, '')
          for (const seg of parts) {
            acc = acc + '/' + seg
            if (!node.children.has(seg)) node.children.set(seg, { name: seg, path: acc, children: new Map(), item: null })
            node = node.children.get(seg)
          }
          node.item = item
        }
        return root
      }
      function countLeaves(node) {
        let total = node.item ? 1 : 0
        for (const child of node.children.values()) total += countLeaves(child)
        return total
      }
      // 目录节点下面是否挂着「当前打开的会话」，是的话该目录也强制展开
      function dirHasActive(node) {
        if (!currentId) return false
        if (node.item && node.item.ws && sessionIdsOf(node.item.ws).map(String).indexOf(currentId) >= 0) return true
        for (const child of node.children.values()) {
          if (dirHasActive(child)) return true
        }
        return false
      }
      function dirNode(node, key, depth, project) {
        const indent = { '--sbw-indent': (depth * 12) + 'px' }
        const hasChildren = node.children.size > 0
        if (!hasChildren) {
          const item = node.item
          if (!item) return null
          if (!item.ws) {
            return h('div', { key: key, className: 'sbw-row', role: 'treeitem', style: indent, title: 'Workspace 尚未注册或已失效，到「设置 → 项目工作区」重新注册' },
              h('span', { className: 'sbw-slot' }, statusDot('warning')),
              h('span', { className: 'sbw-text' }, h('span', { className: 'sbw-title dim' }, node.name))
            )
          }
          return workspaceNode(item.ws, node.name, key, depth, { projectId: project && project.id, child: item.child })
        }
        const open = isChildOpen(key) || dirHasActive(node)
        const rows = []
        rows.push(rowShell({
          rowKey: key + ':row',
          className: 'sbw-row sbw-dir' + (nodeHasCurrent(node) ? ' has-active' : ''),
          title: withActivity(node.path + ' · ' + countLeaves(node) + ' 个子工作区', nodeActivity(node)),
          open: open,
          activity: nodeActivity(node),
          onFolderClick: function () { openSessionList({ title: node.name, wsIds: nodeWsIds(node) }) },
          style: indent,
          onClick: function () { toggleChild(key) },
          text: h('span', { className: 'sbw-text' }, h('span', { className: 'sbw-title' }, node.name)),
          actions: h('span', { className: 'sbw-count' }, String(countLeaves(node)))
        }))
        if (!open) return h('div', { key: key }, rows)
        for (const entry of Array.from(node.children.entries()).sort(function (a, b) { return a[0].localeCompare(b[0]) })) {
          const child = dirNode(entry[1], key + '/' + entry[0], depth + 1, project)
          if (child) rows.push(child)
        }
        if (node.item && node.item.ws) {
          rows.push(workspaceNode(node.item.ws, '本目录', key + '/__self__', depth + 1, { projectId: project && project.id, child: node.item.child }))
        }
        return h('div', { key: key, className: 'sbw-branch', style: { '--sbw-guide': (depth * 14 + 20) + 'px' } }, rows)
      }
      // 项目级状态汇总：把项目下所有工作区的会话按 running / 待处理 / 未读 归类
      // 一组会话状态里最需要被看见的那个：等待处理 > 正在回答 > 未读完成
      function rollupActivity(rollup) {
        if (!rollup) return ''
        if (rollup.pending) return 'warning'
        if (rollup.running) return 'ongoing'
        if (rollup.unread) return 'done'
        return ''
      }
      function activityText(activity) {
        if (activity === 'ongoing') return '正在回答'
        if (activity === 'warning') return '等待你处理'
        if (activity === 'done') return '有已完成未查看'
        return ''
      }
      function withActivity(text, activity) {
        const word = activityText(activity)
        return word ? (text + ' · ' + word) : text
      }
      function wsRollup(ws) {
        let running = 0
        let pending = 0
        let unread = 0
        if (ws) {
          sessionIdsOf(ws).forEach(function (id) {
            const status = statusOf(id)
            if (!status) return
            if (status.pendingInteraction) pending += 1
            else if (status.running) running += 1
            else if (status.completionUnread) unread += 1
          })
        }
        return { running: running, pending: pending, unread: unread }
      }
      function wsActivity(ws) { return rollupActivity(wsRollup(ws)) }
      // 合并目录节点：整棵子树里只要有在跑的会话，父目录图标也带徽标
      function nodeActivity(node) {
        if (node.item && node.item.ws) {
          const own = wsRollup(node.item.ws)
          if (own.pending) return 'warning'
          if (own.running) return 'ongoing'
          if (own.unread) return 'done'
        }
        let found = ''
        for (const child of node.children.values()) {
          const act = nodeActivity(child)
          if (act === 'warning') return 'warning'
          if (act === 'ongoing') found = found === 'done' ? 'ongoing' : (found || 'ongoing')
          else if (act === 'done' && !found) found = 'done'
        }
        return found
      }
      function projectRollup(project) {
        const ids = []
        const collect = function (ws) {
          if (!ws) return
          sessionIdsOf(ws).forEach(function (id) { ids.push(String(id)) })
        }
        if (project.children) project.children.forEach(function (item) { if (item && item.ws) collect(item.ws) })
        collect(project.selfWs)
        let running = 0
        let pending = 0
        let unread = 0
        const runningIds = []
        const pendingIds = []
        const unreadIds = []
        ids.forEach(function (id) {
          const status = statusOf(id)
          if (!status) return
          if (status.pendingInteraction) { pending += 1; pendingIds.push(id) }
          else if (status.running) { running += 1; runningIds.push(id) }
          else if (status.completionUnread) { unread += 1; unreadIds.push(id) }
        })
        return {
          running: running, pending: pending, unread: unread, total: ids.length,
          runningIds: runningIds, pendingIds: pendingIds, unreadIds: unreadIds,
        }
      }
      // 角标里的数字点一下直接跳到那个会话，省得展开找
      function rollupPick(ids, event) {
        if (event) event.stopPropagation()
        if (ids && ids.length) openSession(ids[0])
      }
      function rollupBadge(rollup) {
        if (!rollup || (!rollup.running && !rollup.pending && !rollup.unread)) return null
        return h('span', { className: 'sbw-roll', title: rollup.pending ? '有会话等待你处理' : (rollup.running ? '有会话正在回答' : '有会话已完成未查看') },
          rollup.pending ? h('button', { className: 'sbw-roll-item sbw-roll-btn', title: '打开等待你处理的会话', onClick: function (e) { rollupPick(rollup.pendingIds, e) } }, statusDot('warning'), String(rollup.pending)) : null,
          rollup.running ? h('button', { className: 'sbw-roll-item sbw-roll-btn', title: '打开正在回答的会话', onClick: function (e) { rollupPick(rollup.runningIds, e) } }, statusDot('ongoing'), String(rollup.running)) : null,
          rollup.unread ? h('button', { className: 'sbw-roll-item sbw-roll-btn', title: '打开已完成的会话', onClick: function (e) { rollupPick(rollup.unreadIds, e) } }, statusDot('done'), String(rollup.unread)) : null
        )
      }
      function projectNode(project) {
        const rootOpen = isRootOpen(project.id)
        const children = project.children.filter(function (item) {
          if (!needle) return true
          if (String(item.child.name).toLowerCase().indexOf(needle) >= 0) return true
          const ws = item.ws
          if (!ws) return false
          return sessionIdsOf(ws).some(matchesSession)
        })
        if (needle && !children.length && String(project.root + ' ' + project.path).toLowerCase().indexOf(needle) < 0) return null
        const open = needle ? true : (rootOpen || Boolean(project.selfWs && currentId && sessionIdsOf(project.selfWs).map(String).indexOf(currentId) >= 0))
        // 叶子项目：项目根目录自身就是一个 Workspace，没有再细分的子工作区
        if (!project.children.length && project.selfWs) {
          const ws = project.selfWs
          return h('div', { key: project.id },
            rowShell({
              className: projectRowClass(project, 'sbw-row sbw-ws sbw-leaf'),
              title: withActivity(ws.path, wsActivity(ws)),
              open: open,
              color: project.color,
              activity: wsActivity(ws),
              onFolderClick: function () { openSessionList({ title: displayName(project.root, project.alias), wsIds: wsIdsOf([ws]) }) },
              style: { '--sbw-indent': '0px' },
              drag: projectDragProps(project),
              onClick: function () { toggleRoot(project.id) },
              text: h('span', { className: 'sbw-text' },
                h('span', { className: 'sbw-title' }, displayName(project.root, project.alias)),
                tagChips(project.tags),
                rollupBadge(projectRollup(project))
              ),
              actions: h('span', { className: 'sbw-actions' },
                h('button', { className: 'sbw-mini sbw-pin' + (project.pinned ? ' pinned' : ''), title: project.pinned ? '取消置顶' : '置顶项目', onClick: function (e) { e.stopPropagation(); togglePin(project) } }, glyph('IconPinOutlineRegular', 14, '📌')),
                h('button', { className: 'sbw-mini', title: '编辑名称 / 别名 / 标签', onClick: function (e) { e.stopPropagation(); openEditDialog({ projectId: project.id, path: project.path }) } }, glyph('IconEditOutlineRegular', 14, '✎')),
                h('button', { className: 'sbw-mini', title: '在资源管理器中打开目录', onClick: function (e) { e.stopPropagation(); openDir(project.path) } }, glyph('IconFolderOpenRegular', 14, '▤')),
                h('button', { className: 'sbw-mini', title: '新建会话', onClick: function (e) { e.stopPropagation(); newSession(ws) } }, glyph('IconNewChatOutlineRegular', 14, '＋')),
                h('button', { className: 'sbw-mini', title: '导出该项目的全部会话', onClick: function (e) { e.stopPropagation(); exportSessions([ws], project.name || project.root) } }, glyph('IconDownloadOutlineRegular', 14, '⇩')),
                h('button', { className: 'sbw-mini sbw-danger', title: '删除工作区', onClick: function (e) { e.stopPropagation(); removeWorkspace(ws, project.root) } }, glyph('IconTrashOutlineRegular', 14, '删'))
              ),
            }),
            open ? h('div', { className: 'sbw-branch', style: { '--sbw-guide': '20px' } }, sessionRows(ws, project.id, 1)) : null
          )
        }
        const isRenaming = renaming === project.id
        return h('div', { key: project.id },
          rowShell({
            className: projectRowClass(project, 'sbw-row sbw-proj'),
            title: withActivity(project.path, rollupActivity(projectRollup(project))),
            open: open,
            color: project.color,
            activity: rollupActivity(projectRollup(project)),
            onFolderClick: function () {
              const list = (project.children || []).map(function (item) { return item.ws }).concat(project.selfWs ? [project.selfWs] : [])
              openSessionList({ title: displayName(project.name || project.root, project.alias), wsIds: wsIdsOf(list) })
            },
            drag: projectDragProps(project),
            onClick: function () { if (!isRenaming) toggleRoot(project.id) },
            text: isRenaming
              ? h('input', {
                className: 'sbw-input',
                autoFocus: true,
                value: renameValue,
                disabled: busy,
                onClick: function (e) { e.stopPropagation() },
                onChange: function (e) { setRenameValue(e.target.value) },
                onKeyDown: function (e) {
                  if (e.key === 'Enter') { e.preventDefault(); commitRename(project) }
                  else if (e.key === 'Escape') { e.preventDefault(); setRenaming('') }
                },
              })
              : h('span', { className: 'sbw-text' },
                h('span', { className: 'sbw-title' }, displayName(project.name || project.root, project.alias)),
                tagChips(project.tags),
                rollupBadge(projectRollup(project))
              ),
            actions: isRenaming
              ? h('span', { className: 'sbw-actions show' },
                h('button', { className: 'sbw-mini', title: '保存项目名称', disabled: busy, onClick: function (e) { e.stopPropagation(); commitRename(project) } }, glyph('IconCheckOutlineRegular', 14, '✓')),
                h('button', { className: 'sbw-mini', title: '取消', onClick: function (e) { e.stopPropagation(); setRenaming('') } }, glyph('IconCloseOutlineRegular', 14, '✕'))
              )
              : h('span', { className: 'sbw-actions' },
                h('button', { className: 'sbw-mini sbw-pin' + (project.pinned ? ' pinned' : ''), title: project.pinned ? '取消置顶' : '置顶项目', onClick: function (e) { e.stopPropagation(); togglePin(project) } }, glyph('IconPinOutlineRegular', 14, '📌')),
                h('button', { className: 'sbw-mini', title: '编辑名称 / 别名 / 标签', onClick: function (e) { e.stopPropagation(); openEditDialog({ projectId: project.id, path: project.path }) } }, glyph('IconEditOutlineRegular', 14, '✎')),
                h('button', { className: 'sbw-mini', title: '在资源管理器中打开目录', onClick: function (e) { e.stopPropagation(); openDir(project.path) } }, glyph('IconFolderOpenRegular', 14, '▤')),
                h('button', { className: 'sbw-mini', title: '给该项目添加子工作区', onClick: function (e) { e.stopPropagation(); openCreateDialog({ root: project.path || project.root, name: project.name || '' }) } }, glyph('IconPlusOutlineRegular', 14, '＋')),
                h('button', { className: 'sbw-mini', title: '导出该项目的全部会话', onClick: function (e) { e.stopPropagation(); exportSessions(project.children.map(function (item) { return item.ws }).concat(project.selfWs ? [project.selfWs] : []), project.name || project.root) } }, glyph('IconDownloadOutlineRegular', 14, '⇩')),
                h('button', { className: 'sbw-mini sbw-danger', title: '移除项目（不删除工作区）', onClick: function (e) { e.stopPropagation(); removeProjectItem(project) } }, glyph('IconTrashOutlineRegular', 14, '删'))
              ),
          }),
          open ? (function () {
            const root = childTree({ root: project.root, path: project.path, children: children })
            return h('div', { className: 'sbw-branch', style: { '--sbw-guide': '20px' } },
              Array.from(root.children.entries())
                .sort(function (a, b) { return a[0].localeCompare(b[0]) })
                .map(function (entry) { return dirNode(entry[1], project.id + '/d:' + entry[0], 1, project) }))
          })() : null
        )
      }
      if (!wide) {
        return h('div', { className: 'sbw sbw-rail' },
          h('div', { className: 'sbw-hd' },
            h('button', { className: 'sbw-ibtn', title: '展开工作区', onClick: function () { try { expandSidebar() } catch (err) { void err } } }, glyph('IconPanelLeftOutlineRegular', 16, '▤')),
            h('button', { className: 'sbw-ibtn', title: '新建临时会话', onClick: newTempSession }, glyph('IconClockOutlineRegular', 16, '◷')),
            h('button', { className: 'sbw-ibtn', title: '新建项目', onClick: function () { openCreateDialog({}) } }, glyph('IconPlusOutlineRegular', 16, '＋'))
          )
        )
      }
      // 标题栏总览：全站在跑 / 待处理的会话数，收起侧边栏前也能一眼看到
      function firstStatusId(kind) {
        const map = statusMap
        if (!map) return ''
        const ids = []
        const visit = function (status, key) {
          if (!status) return
          const pending = status.pendingInteraction
          const running = Boolean(status.running) && !pending
          const hit = kind === 'pending' ? pending : running
          if (hit) ids.push(String(key))
        }
        try {
          if (typeof map.forEach === 'function') map.forEach(visit)
          else Object.keys(map).forEach(function (key) { visit(map[key], key) })
        } catch (err) {
          return ''
        }
        return ids[0] || ''
      }
      const headerSum = (function () {
        if (!statusMap) return null
        const runningIds = []
        const pendingIds = []
        const each = function (status, key) {
          if (!status) return
          const id = String(key)
          if (status.pendingInteraction) pendingIds.push(id)
          else if (status.running) runningIds.push(id)
        }
        if (typeof statusMap.forEach === 'function') statusMap.forEach(function (status, key) { each(status, key) })
        else Object.keys(statusMap).forEach(function (key) { each(statusMap[key], key) })
        return (runningIds.length || pendingIds.length)
          ? { running: runningIds.length, pending: pendingIds.length, runningIds: runningIds, pendingIds: pendingIds }
          : null
      })()
      // 当前会话：并进标题栏，点一下把列表滚到它
      const currentLabel = currentId && summaries[currentId] ? sessionLabel(summaries[currentId]) : ''
      const currentChip = (currentId && currentLabel && !searchOpen && !flatMode)
        ? h('button', {
          className: 'sbw-hd-cur',
          title: '当前会话：' + currentLabel + '（点击定位）',
          onClick: function () {
            const node = sessionNodes.current[currentId]
            if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({ block: 'center' })
          },
        },
          h('span', { className: 'sbw-hd-cur-dot' }),
          h('span', { className: 'sbw-hd-cur-t' }, currentLabel))
        : null
      // 顶部标签条：把正在回答 / 等待处理（以及未读完成）的会话铺在最上面，点一下就切过去
      const activeTabs = (function () {
        const rows = []
        Object.keys(summaries).forEach(function (id) {
          const status = statusOf(id)
          if (!status) return
          const pending = Boolean(status.pendingInteraction)
          const running = Boolean(status.running)
          const unread = Boolean(status.completionUnread)
          if (!pending && !running && !unread) return
          rows.push({
            id: String(id),
            label: sessionLabel(summaries[id]),
            pending: pending,
            running: running,
            unread: unread,
            rank: pending ? 0 : (running ? 1 : 2),
          })
        })
        rows.sort(function (a, b) { return a.rank - b.rank })
        return rows.slice(0, 8)
      })()
      const wsTitleById = (function () {
        const map = {}
        wsItems.forEach(function (ws) {
          if (ws && ws.workspaceId) map[String(ws.workspaceId)] = String(ws.title || baseName(ws.path) || '')
        })
        return map
      })()
      // 「所有会话」平铺视图：不按项目分组，按最近更新倒序，方便会话多时直接找
      const flatRows = (function () {
        const rows = []
        Object.keys(summaries).forEach(function (id) {
          const summary = summaries[id]
          if (!summary) return
          const label = sessionLabel(summary)
          const hint = wsTitleById[String(summary.workspaceId || '')] || ''
          if (needle && (label + ' ' + hint).toLowerCase().indexOf(needle) < 0) return
          rows.push({ id: String(id), label: label, hint: hint, stamp: sessionStamp(summary) || 0, summary: summary })
        })
        rows.sort(function (a, b) { return b.stamp - a.stamp })
        return rows
      })()
      const allTags = (function () {
        const set = new Set()
        ;(projects || []).forEach(function (project) {
          (project.tags || []).forEach(function (tag) { set.add(tag) })
          ;(project.children || []).forEach(function (item) { ((item.child && item.child.tags) || []).forEach(function (tag) { set.add(tag) }) })
        })
        return Array.from(set).sort(function (a, b) { return a.localeCompare(b, 'zh-CN') })
      })()
      const projectHasTag = function (project, tag) {
        if ((project.tags || []).indexOf(tag) >= 0) return true
        return (project.children || []).some(function (item) { return ((item.child && item.child.tags) || []).indexOf(tag) >= 0 })
      }
      const taggedProjects = tagFilter ? (projects || []).filter(function (project) { return projectHasTag(project, tagFilter) }) : (projects || [])
      const hasProjects = taggedProjects.length
      const pinnedProjects = taggedProjects.filter(function (project) { return project.pinned === true })
      const normalProjects = taggedProjects.filter(function (project) { return project.pinned !== true })
      const looseVisible = tagFilter ? [] : needle
        ? loose.filter(function (ws) {
          if (String(ws.title || baseName(ws.path) || '').toLowerCase().indexOf(needle) >= 0) return true
          return sessionIdsOf(ws).some(matchesSession)
        })
        : loose
      const isTempWs = function (ws) { return String(ws.title || '').indexOf('临时会话') === 0 }
      const tempVisible = looseVisible.filter(isTempWs)
      const otherLoose = looseVisible.filter(function (ws) { return !isTempWs(ws) })
      const empty = !hasProjects && !looseVisible.length && !(legacy.length && !tree)
      // 排查用：localStorage.setItem('DSH_PW_DEBUG','1') 后刷新，侧边栏底部会显示测得的高度
      const debugFit = React.useRef({ total: 0, limit: 0, top: 0 }).current
      const showDebug = (function () {
        try { return window.localStorage && window.localStorage.getItem('DSH_PW_DEBUG') === '1' } catch (err) { return false }
      })()
      const rootRef = React.useRef(null)
      // 兜底：不管祖先有没有给出确定高度，都按视口算一次列表可用高度，保证能滚动
      useEffect(function () {
        // 关键：原生侧边栏里装工作区的那块区域，高度是 grid 的 max-content 行 ——
        // 由内容撑开。所以「填满」不能只靠量高度（会循环），得把这一行的行高改成 1fr，
        // 让它去吃剩下的空间；下面的 footer 插件（设置、其他入口）在另一块区域，不受影响。
        const undo = []
        function adaptLayout() {
          const rootEl = rootRef.current
          if (!rootEl) return
          let el = rootEl
          let grid = null
          let region = null
          for (let i = 0; i < 6 && el && el.parentElement; i += 1) {
            const parent = el.parentElement
            let display = ''
            try {
              display = window.getComputedStyle(parent).display
            } catch (err) {
              display = ''
            }
            if (display === 'grid') {
              grid = parent
              region = el
              break
            }
            el = parent
          }
          if (!grid || !region || region.dataset.pwRegion === '1') return
          try {
            const style = window.getComputedStyle(grid)
            // 注意：computed 的 grid-template-rows 已经把 max-content 解析成像素了，
            // 所以要「把最后一行改成 1fr」，只能用解析后的像素列表替换最后一项。
            const rows = String(style.gridTemplateRows || '').trim().split(/\s+/).filter(Boolean)
            if (!rows.length) return
            // 我们的面板必须是这一格里的最后一个子元素，才敢动行高；
            // 否则下面还挂着别的插件，改了会把它们挤掉。
            if (grid.lastElementChild !== region) return
            // 用几何位置判断我们在第几行：把每行的起点累加，找包住 region 顶部的那一行。
            // （不能盲信「最后一行」——有些布局后面还有空行/隐藏行。）
            const gridRect = grid.getBoundingClientRect()
            const regionRect = region.getBoundingClientRect()
            const gap = parseFloat(style.rowGap) || 0
            let cursor = gridRect.top + (parseFloat(style.paddingTop) || 0) - (grid.scrollTop || 0)
            let rowIndex = -1
            for (let i = 0; i < rows.length; i += 1) {
              const height = parseFloat(rows[i]) || 0
              if (regionRect.top >= cursor - 1 && regionRect.top < cursor + height + gap + 1) {
                rowIndex = i
                break
              }
              cursor += height + gap
            }
            if (rowIndex < 0) rowIndex = rows.length - 1
            const next = rows.slice()
            next[rowIndex] = '1fr'
            const previous = grid.style.gridTemplateRows
            grid.style.gridTemplateRows = next.join(' ')
            region.dataset.pwRegion = '1'
            region.classList.add('sbw-region')
            undo.push(function () {
              grid.style.gridTemplateRows = previous
              try { delete region.dataset.pwRegion } catch (err) { region.removeAttribute('data-pw-region') }
              region.classList.remove('sbw-region')
            })
          } catch (err) {
            // 拿不到布局信息就退回下面的量高兜底
          }
        }
        function fit() {
          const box = scrollRef.current
          const root = rootRef.current
          if (!box || !root) return
          if (typeof root.getBoundingClientRect !== 'function') return
          const rect = root.getBoundingClientRect()
          if (!rect || typeof rect.top !== 'number') return
          const viewport = (typeof window !== 'undefined' && window.innerHeight) || 0
          if (!viewport) return
          // 找最近的「自己有确定高度、并且会滚动」的祖先（原生侧边栏是 .scrollArea：
          // flex:1 + min-height:0 + overflow-y:auto）。它的高度不由我们的内容决定，
          // 拿它的底边当可用区域才不会循环。
          let limit = viewport
          let el = root
          for (let i = 0; i < 8 && el; i += 1) {
            const parent = el.parentElement
            if (!parent) break
            const parentRect = parent.getBoundingClientRect()
            let overflowY = ''
            try {
              const style = window.getComputedStyle(parent)
              overflowY = style.getPropertyValue('overflow-y') || style.overflowY || ''
            } catch (err) {
              overflowY = ''
            }
            const scrolls = overflowY === 'auto' || overflowY === 'scroll'
            if (scrolls && parentRect && parentRect.height > 0) {
              limit = Math.min(viewport, parentRect.bottom)
              break
            }
            el = parent
          }
          const region = root.parentElement
          if (region && region.classList.contains('sbw-region')) {
            // grid 行已经给了 1fr，但保险起见再按 region 的底边封一次顶：
            // 这样无论 flex 高度能否解析，列表区都能收缩并滚动。
            if (root.style.minHeight) root.style.minHeight = ''
            if (root.style.height) root.style.height = ''
            if (box.style.maxHeight) box.style.maxHeight = ''
            try {
              const regionRect = region.getBoundingClientRect()
              if (regionRect && regionRect.bottom > 0) {
                const capped = Math.max(140, Math.round(regionRect.bottom - rect.top - 6))
                if (root.style.maxHeight !== capped + 'px') root.style.maxHeight = capped + 'px'
                if (root.style.overflow !== 'hidden') root.style.overflow = 'hidden'
              }
            } catch (err) { /* 拿不到几何就不封顶，交给 grid 行 */ }
            debugFit.total = 0
            debugFit.limit = Math.round(limit)
            debugFit.top = Math.round(rect.top)
            return
          }
          const total = Math.max(160, Math.round(limit - rect.top - 4))
          if (total > 0) {
            if (root.style.minHeight) root.style.minHeight = ''
            if (root.style.maxHeight !== total + 'px') root.style.maxHeight = total + 'px'
            if (root.style.overflow !== 'hidden') root.style.overflow = 'hidden'
          }
          debugFit.total = total
          debugFit.limit = Math.round(limit)
          debugFit.top = Math.round(rect.top)
        }
        adaptLayout()
        fit()
        const timer = setTimeout(function () { adaptLayout(); fit() }, 60)
        window.addEventListener('resize', fit)
        let observer = null
        if (typeof ResizeObserver === 'function' && rootRef.current) {
          observer = new ResizeObserver(function () { fit() })
          observer.observe(rootRef.current)
        }
        return function () {
          clearTimeout(timer)
          window.removeEventListener('resize', fit)
          if (observer) observer.disconnect()
          while (undo.length) {
            const restore = undo.pop()
            try { restore() } catch (err) { /* 忽略 */ }
          }
        }
      }, [loaded, searchOpen, tagFilter, Boolean(tree), activeTabs.length])

      const uiSettings = uiConfig || {}
      const uiVars = {}
      if (uiSettings.runningBg) uiVars['--sbw-run-bg'] = uiSettings.runningBg
      if (uiSettings.runningFg) uiVars['--sbw-run-fg'] = uiSettings.runningFg
      return h('div', { className: 'sbw sbw-wide', style: uiVars, ref: rootRef },
        h('div', { className: 'sbw-hd' + (searchOpen ? ' open' : '') },
          searchOpen ? null : h('span', { className: 'sbw-hd-label' }, flatMode ? ('所有会话 · ' + flatRows.length) : '工作区'),
          currentChip,
          searchOpen || !headerSum ? null : h('span', { className: 'sbw-hd-sum', title: (headerSum.running ? headerSum.running + ' 个会话正在回答' : '') + (headerSum.pending ? (headerSum.running ? '，' : '') + headerSum.pending + ' 个等待你处理' : '') },
            headerSum.pending ? h('button', {
              className: 'sbw-roll-item sbw-roll-btn',
              title: headerSum.pending + ' 个会话等待你处理（点一下打开）',
              onClick: function (event) {
                event.stopPropagation()
                const id = headerSum.pendingIds[0] || firstStatusId('pending')
                if (id) openSession(id)
              },
            }, statusDot('warning'), String(headerSum.pending)) : null,
            headerSum.running ? h('button', {
              className: 'sbw-roll-item sbw-roll-btn',
              title: headerSum.running + ' 个会话正在回答（点一下打开）',
              onClick: function (event) {
                event.stopPropagation()
                const id = headerSum.runningIds[0] || firstStatusId('running')
                if (id) openSession(id)
              },
            }, statusDot('ongoing'), String(headerSum.running)) : null
          ),
          searchOpen
            ? h('div', { className: 'sbw-hd-search open' },
              h('label', { className: 'sbw-search open' },
                h('input', {
                  autoFocus: true,
                  value: query,
                  placeholder: '搜索项目 / 工作区 / 会话',
                  onChange: function (e) { setQuery(e.target.value) },
                  onKeyDown: function (e) { if (e.key === 'Escape') { setQuery(''); setSearchOpen(false) } },
                })
              )
            )
            : h('div', { className: 'sbw-hd-search' },
              h('button', {
                className: 'sbw-ibtn',
                title: '搜索',
                onClick: function () { setSearchOpen(true) },
              }, glyph('IconSearchOutlineRegular', 16, '⌕'))
            ),
          h('div', { className: 'sbw-hd-actions' },
            searchOpen
              ? h('button', { className: 'sbw-ibtn', title: '关闭搜索', onClick: function () { setQuery(''); setSearchOpen(false) } }, glyph('IconCloseOutlineRegular', 16, '✕'))
              : null,
            searchOpen
              ? null
              : h('button', {
                className: 'sbw-ibtn' + (flatMode ? ' on' : ''),
                title: flatMode ? '回到项目视图' : '所有会话（平铺，按最近更新排序）',
                onClick: function () { setFlatMode(!flatMode) },
              }, flatMode ? glyph('IconFolderOpenRegular', 16, '▤') : glyph('IconFlatListOutlineRegular', 16, '≡')),
            searchOpen
              ? null
              : h('button', { className: 'sbw-ibtn', title: '新建临时会话', onClick: newTempSession }, glyph('IconClockOutlineRegular', 16, '◷')),
            searchOpen
              ? null
              : h('button', { className: 'sbw-ibtn', title: '新建项目', onClick: function () { openCreateDialog({}) } }, glyph('IconPlusOutlineRegular', 16, '＋')),
            searchOpen
              ? null
              : h('button', { className: 'sbw-ibtn', title: '刷新', onClick: loadTree }, glyph('IconRefreshOutlineRegular', 16, '⟳'))
          )
        ),
        error ? h('div', { className: 'sbw-msg' }, error) : null,
        activeTabs.length > 1
          ? h('div', { className: 'sbw-tabs' }, activeTabs.map(function (tab) {
            return h('button', {
              key: 'tab:' + tab.id,
              className: 'sbw-tab' + (tab.pending ? ' pending' : '') + (String(tab.id) === String(currentId) ? ' on' : ''),
              title: tab.label + (tab.pending ? ' · 等待你处理' : (tab.running ? ' · 正在回答' : ' · 已完成未查看')),
              onClick: function () { openSession(tab.id) },
            },
              statusDot(tab.pending ? 'warning' : (tab.running ? 'ongoing' : 'done')),
              h('span', { className: 'sbw-tab-label' }, tab.label))
          }))
          : null,

        allTags.length
          ? h('div', { className: 'sbw-filters' }, [
            h('button', {
              key: 'tag:__all__',
              className: 'sbw-filter sbw-filter-all' + (tagFilter ? '' : ' on'),
              title: '显示全部项目',
              onClick: function () { setTagFilter('') },
            }, '全部'),
          ].concat(allTags.map(function (tag) {
            return h('button', {
              key: 'tag:' + tag,
              className: 'sbw-filter' + (tagFilter === tag ? ' on' : ''),
              title: tagFilter === tag ? '取消筛选' : '只看带「' + tag + '」标签的项目',
              onClick: function () { setTagFilter(tagFilter === tag ? '' : tag) },
            }, tag)
          })))
          : null,
        tagFilter
          ? h('div', { className: 'sbw-filter-hint' }, '只看「' + tagFilter + '」：' + taggedProjects.length + ' / ' + (projects || []).length + ' 个项目',
            h('button', { className: 'sbw-filter-clear', onClick: function () { setTagFilter('') } }, '显示全部'))
          : null,
        showDebug
          ? h('div', { className: 'sbw-debug' }, 'minH=' + debugFit.total + ' · limit=' + debugFit.limit + ' · top=' + debugFit.top + ' · viewport=' + ((typeof window !== 'undefined' && window.innerHeight) || 0))
          : null,
        h('div', { className: 'sbw-scroll', ref: scrollRef },
          h('div', { className: 'sbw-list' + (flatMode ? ' flat' : '') },
            flatMode
              ? h('div', { className: 'sbw-flat' },
                flatRows.length
                  ? flatRows.map(function (row) {
                    const status = statusOf(row.id)
                    const pending = Boolean(status && status.pendingInteraction)
                    const running = Boolean(status && status.running && !status.pendingInteraction)
                    const active = String(row.id) === String(currentId)
                    return h('div', {
                      key: 'flat:' + row.id,
                      className: 'sbw-row sbw-sess sbw-flat-row' + (active ? ' selected' : '') + (running ? ' running' : ''),
                      role: 'treeitem',
                      title: row.hint ? row.label + ' · ' + row.hint : row.label,
                      onClick: function () { openSession(row.id) },
                      ref: function (node) { if (node) sessionNodes.current[String(row.id)] = node },
                    },
                      statusDot(pending ? 'warning' : (running ? 'ongoing' : (status && status.completionUnread ? 'done' : ''))),
                      h('span', { className: 'sbw-title' }, row.label),
                      row.hint ? h('span', { className: 'sbw-ws-hint' }, row.hint) : null,
                      h('span', { className: 'sbw-time' }, formatRelative(row.stamp)))
                  })
                  : h('div', { className: 'sbw-empty' }, needle ? '没有匹配的会话' : '还没有会话'))
              : null,
            !loaded ? h('div', { className: 'sbw-skel' }, [0, 1, 2, 3].map(function (index) {
              return h('div', { key: index, className: 'sbw-skel-row' },
                h('span', { className: 'sbw-skel-ico' }),
                h('span', { className: 'sbw-skel-line', style: { width: (56 + ((index * 17) % 30)) + '%' } }))
            })) : null,
            loaded && empty ? h('div', { className: 'sbw-empty-state' },
              h('div', { className: 'sbw-empty-ico' }, glyph('IconFolderOpenRegular', 26, '▤')),
              h('div', { className: 'sbw-empty-title' }, tagFilter ? '没有带「' + tagFilter + '」标签的项目' : '还没有工作区'),
              h('div', { className: 'sbw-empty-desc' }, tagFilter
                ? '再点一次上方的标签可以取消筛选。'
                : '选一个项目根目录并命名，勾选要独立开的子目录，就能拆成多个工作区。'),
              tagFilter ? null : h('button', { className: 'sbw-empty-btn', onClick: function () { openCreateDialog() } },
                glyph('IconPlusOutlineRegular', 14, '＋'), '新建项目')
            ) : null,
            !empty && !hasProjects && !tagFilter ? h('div', { className: 'sbw-hint' }, '提示：点 ＋ 新建项目，或到「设置 → 项目工作区」点「按父目录自动归组」。') : null,
            pinnedProjects.length ? h('div', { className: 'sbw-group sbw-sect' },
              h('div', { className: 'sbw-sect-head' }, '置顶'),
              pinnedProjects.map(projectNode)
            ) : null,
            tempVisible.length ? h('div', { className: 'sbw-group sbw-sect' },
              h('div', { className: 'sbw-sect-head' }, '临时会话'),
              tempVisible.map(function (ws) {
                return workspaceNode(ws, ws.title || baseName(ws.path), 'loose:' + String(ws.workspaceId), 0)
              })
            ) : null,
            normalProjects.length ? h('div', { className: 'sbw-group' }, normalProjects.map(projectNode)) : null,
            otherLoose.length ? h('div', { className: 'sbw-loose' }, otherLoose.map(function (ws) {
              return workspaceNode(ws, ws.title || baseName(ws.path), 'loose:' + String(ws.workspaceId), 0)
            })) : null,
            !tree && legacy.length ? h('div', { className: 'sbw-hint' }, '（项目接口不可用，已回退为按 Workspace 标题归组）') : null,
            !tree ? legacy.map(function (group) {
              const depKey = 'legacy:' + group.root
              const rootOpen = isRootOpen(depKey) || Boolean(needle)
              return h('div', { key: depKey },
                rowShell({
                  className: 'sbw-row sbw-proj',
                  open: rootOpen,
                  onClick: function () { toggleRoot(depKey) },
                  text: h('span', { className: 'sbw-text' }, h('span', { className: 'sbw-title' }, group.root)),
                }),
                rootOpen ? group.children.map(function (item, index) {
                  return workspaceNode(item.ws, item.child, depKey + ':' + index + ':' + String(item.ws.workspaceId), 1)
                }) : null
              )
            }) : null
          )
        )
      )
    }
    const API = {
      state: '/dsh-project-workspaces/state',
      scan: '/dsh-project-workspaces/scan',
      tree: '/dsh-project-workspaces/tree',
      register: '/dsh-project-workspaces/register',
      remove: '/dsh-project-workspaces/remove',
      project: '/dsh-project-workspaces/project',
      projectRemove: '/dsh-project-workspaces/project/remove',
      projectRename: '/dsh-project-workspaces/project/rename',
      projectUpdate: '/dsh-project-workspaces/project/update',
      projectPin: '/dsh-project-workspaces/project/pin',
      projectReorder: '/dsh-project-workspaces/project/reorder',
      exportSessions: '/dsh-project-workspaces/export',
      ui: '/dsh-project-workspaces/ui',
      tempSession: '/dsh-project-workspaces/temp-session',
      open: '/dsh-project-workspaces/open',
      autoGroup: '/dsh-project-workspaces/project/auto-group'
    }
    const DIALOG_CSS = '.pw{display:flex;flex-direction:column;gap:12px;padding:4px 2px 24px;font-size:13px;font-family:var(--dsw-font-family,inherit);color:var(--dsw-alias-label-primary)}' +
      '.pw-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}' +
      '.pw-title{margin:0 0 4px;font-size:16px;line-height:22px;font-weight:600}' +
      '.pw-sub{margin:0;max-width:780px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}' +
      '.pw-card{display:flex;flex-direction:column;gap:10px;padding:12px 14px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1);border:0.5px solid var(--dsw-alias-border-l2)}' +
      '.pw-card h3{margin:0;font-size:13px;font-weight:600}' +
      '.pw-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}' +
      '.pw-input{flex:1 1 320px;min-width:220px;box-sizing:border-box;height:34px;padding:0 10px;border:0.5px solid var(--dsw-alias-border-l4,rgba(127,127,127,.36));border-radius:var(--dsw-radius-md,10px);background:var(--dsw-specific-input-major,var(--dsw-alias-button-elevated-fill,transparent));color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;outline:none;transition:border-color 120ms ease,box-shadow 120ms ease}' +
      '.pw-input:hover{border-color:var(--dsw-alias-border-l4,var(--dsw-alias-border-l3,rgba(127,127,127,.5)))}' +
      '.pw-input:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 14%,transparent)}' +
      '.pw-btn{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;padding:0 14px;border:0.5px solid var(--dsw-alias-border-l4,rgba(127,127,127,.36));border-radius:var(--dsw-radius-md,10px);background:transparent;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;cursor:pointer;transition:background-color 120ms ease,border-color 120ms ease,transform 120ms ease}' +
      '.pw-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}' +
      '.pw-btn.primary{border-color:transparent;background:var(--dsw-alias-button-primary-fill,#4d6bfe);color:var(--dsw-alias-label-on-color,#fff);font-weight:500;box-shadow:0 1px 2px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 40%,transparent)}' +
      '.pw-btn.primary:hover{background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-button-primary-fill,#3f5bee))}' +
      '.pw-btn:disabled{opacity:.45;cursor:not-allowed}' +
      '.pw-list{display:flex;flex-direction:column;gap:4px}' +
      '.pw-dir,.pw-ws{display:flex;align-items:center;gap:8px;min-height:32px;padding:0 8px;border-radius:var(--dsw-radius-sm,8px);font-size:13px;line-height:20px}' +
      '.pw-dir{cursor:pointer;user-select:none}' +
      '.pw-dir:hover,.pw-ws:hover{background:var(--dsw-alias-interactive-bg-hover)}' +
      '.pw-dir input[type=checkbox]{flex:none;width:14px;height:14px;margin:0;accent-color:var(--dsw-alias-brand-primary)}' +
      '.pw-ws{justify-content:space-between;gap:12px}' +
      '.pw-dir b{font-weight:500}' +
      '.pw-muted{color:var(--dsw-alias-label-tertiary)}' +
      '.pw-field .pw-muted{margin-top:6px;font-size:12px;line-height:18px}' +
      '.pw-path{font-family:var(--ds-font-family-code,ui-monospace,Consolas,monospace);font-size:11px;line-height:16px;word-break:break-all;color:var(--dsw-alias-label-tertiary)}' +
      '.pw-tag{flex:none;padding:0 6px;border-radius:var(--dsw-radius-xs,4px);font-size:11px;line-height:18px;color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-interactive-bg-hover)}' +
      '.pw-msg{padding:8px 10px;border-radius:var(--dsw-radius-md,12px);font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}' +
      '.pw-msg.err{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent)}' +
      '.pw-project{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:var(--dsw-radius-md,12px);border:0.5px solid var(--dsw-alias-border-l2)}' +
      '.pw-project-head{display:flex;align-items:center;justify-content:space-between;gap:10px}' +
      '.pw-child{display:flex;align-items:center;gap:8px;margin-left:12px;padding:4px 8px;border-radius:var(--dsw-radius-sm,8px);font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}' +
    '.pw-cmd-mask{align-items:flex-start;padding-top:12vh}' +
    '.pw-cmd-card{width:min(560px,calc(100vw - 48px));background:var(--dsw-alias-bg-layer-1,#fff);border:0.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.24));border-radius:var(--dsw-radius-lg,16px);box-shadow:0 16px 48px rgba(0,0,0,.24);padding:8px}' +
    '.pw-cmd-input{width:100%;height:36px;border:none;outline:none;background:transparent;font-size:14px;line-height:20px;color:var(--dsw-alias-label-primary)}' +
    '.pw-cmd-list{max-height:320px;overflow-y:auto;margin-top:4px}' +
    '.pw-cmd-row{display:flex;align-items:center;gap:8px;height:32px;padding:0 8px;border-radius:var(--dsw-radius-sm,8px);cursor:pointer}' +
    '.pw-cmd-row.on{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}' +
    '.pw-cmd-kind{flex:none;padding:0 4px;border:0.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.24));border-radius:var(--dsw-radius-xs,4px);font-size:10px;line-height:16px;color:var(--dsw-alias-label-tertiary)}' +
    '.pw-cmd-label{flex:none;max-width:50%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:18px;color:var(--dsw-alias-label-primary)}' +
    '.pw-cmd-hint{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}' +
    '.pw-cmd-empty{padding:14px 10px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}' +
    '.pw-toasts{position:fixed;top:calc(env(titlebar-area-height, 38px) + 12px + var(--sbw-band-h, 0px));right:calc(env(titlebar-area-x, 0px) + 16px);display:flex;flex-direction:column;gap:8px;z-index:2147483000;pointer-events:none}' +
    '.pw-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:8px;min-width:220px;max-width:320px;padding:10px 12px;border:0.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1,#fff);box-shadow:0 8px 24px rgba(0,0,0,.16);cursor:pointer}' +
    '.pw-toast{animation:pw-toast-in .16s ease-out}' +
    '@keyframes pw-toast-in{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:none}}' +
    '.pw-toast:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08))}' +
    '.pw-toast-dot{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:20px;color:var(--dsw-alias-state-success-primary,#2f9e44)}' +
    '.pw-toast-dot.warn{color:var(--dsw-alias-state-warn-primary,#d9480f)}' +
    '.pw-toast-body{display:flex;flex-direction:column;gap:2px;min-width:0}' +
    '.pw-toast-title{font-size:13px;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.pw-toast-sub{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}' +
    '.pw-modal{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.28))}' +
      '.pw-modal-card{display:flex;flex-direction:column;gap:16px;width:min(620px,calc(100vw - 48px));max-height:min(86vh,760px);overflow:hidden;box-sizing:border-box;padding:20px 22px 16px;border-radius:var(--dsw-radius-xl,20px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border:0.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.2));box-shadow:0 24px 64px rgba(0,0,0,.22),0 2px 8px rgba(0,0,0,.08);font-family:var(--dsw-font-family,inherit)}' +
    '.pw-modal-card.sm{width:min(520px,calc(100vw - 48px));min-height:300px}' +
    '.pw-modal-card.lg{height:min(86vh,620px)}' +
    '.pw-modal-body-scroll{scrollbar-gutter:stable}' +
      '.pw-modal-head{flex:none;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}' +
      '.pw-modal-title{margin:0 0 2px;font-size:16px;line-height:22px;font-weight:600}' +
      '.pw-modal-sub{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}' +
      '.pw-close{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}' +
      '.pw-close:hover{background:var(--dsw-alias-interactive-bg-hover)}' +
      '.pw-field{display:flex;flex-direction:column;gap:6px}' +
      '.pw-label{font-size:12px;line-height:18px;font-weight:500;color:var(--dsw-alias-label-secondary)}' +
      '.pw-control{display:flex;align-items:center;gap:8px;min-width:0}' +
      '.pw-field .pw-input{flex:1 1 auto;width:100%;min-width:0}' +
      '.pw-dirs{max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:2px;padding:4px;border:0.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.2));border-radius:var(--dsw-radius-md,12px);background:color-mix(in srgb,var(--dsw-alias-label-primary,#111) 2%,transparent)}' +
      '.pw-step{display:flex;align-items:center;gap:6px;margin-bottom:6px}' +
      '.pw-step-num{flex:none;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-bg-layer-2,#f2f3f5);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:16px;text-align:center}' +
      '.pw-step-text{flex:none;font-size:12px;line-height:18px;font-weight:500;color:var(--dsw-alias-label-primary)}' +
      '.pw-step-hint{flex:none;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}' +
      '.pw-scanline{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}' +
      '.pw-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:16px;overflow-y:auto;overscroll-behavior:contain;padding-right:2px;scrollbar-gutter:stable}' +
      '.pw-summary{display:flex;flex-direction:column;gap:4px;margin-top:2px;padding:8px 10px;border:0.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.2));border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1,transparent)}' +
      '.pw-summary-line{display:flex;gap:8px;font-size:12px;line-height:18px}' +
      '.pw-summary-key{flex:none;width:44px;color:var(--dsw-alias-label-tertiary)}' +
      '.pw-summary-val{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}' +
      '.pw-field-head{display:flex;align-items:center;justify-content:space-between;gap:8px}' +
      '.pw-depth{display:flex;align-items:center;gap:4px}' +
      '.pw-depth-btn{height:22px;padding:0 8px;border:0.5px solid var(--dsw-alias-border-l4,rgba(127,127,127,.4));border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:18px;cursor:pointer}' +
      '.pw-depth-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}' +
      '.pw-depth-btn.on{border-color:var(--dsw-alias-brand-primary,#4d6bfe);color:var(--dsw-alias-brand-primary,#4d6bfe)}' +
      '.pw-tree .pw-tree-row{display:flex;align-items:center;gap:6px;min-height:28px;padding-right:6px;border-radius:var(--dsw-radius-sm,8px);transition:background-color 120ms ease}' +
      '.pw-tree .pw-tree-row:hover{background:var(--dsw-alias-interactive-bg-hover)}' +
      '.pw-tree-tri{flex:none;width:14px;height:18px;border:none;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px;padding:0;cursor:pointer}' +
      '.pw-tree-tri.pw-tree-leaf{cursor:default;opacity:.45}' +
      '.pw-tree-name{flex:none;max-width:46%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:18px;cursor:pointer}' +
      '.pw-tree-rel{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:18px;color:var(--dsw-alias-label-tertiary)}' +
      '.pw-tree-foot{display:flex;align-items:center;gap:10px;margin-top:4px}' +
      '.pw-link{border:none;background:transparent;padding:0;color:var(--dsw-alias-brand-primary,#4d6bfe);font-size:12px;line-height:18px;cursor:pointer}' +
      '.pw-colors{display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
      '.pw-color{width:22px;height:22px;padding:0;border:0.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.24));border-radius:999px;cursor:pointer;transition:transform 120ms ease,box-shadow 120ms ease}' +
      '.pw-color:hover{transform:scale(1.08)}' +
      '.pw-color.on{box-shadow:0 0 0 2px var(--dsw-alias-bg-layer-1,#fff),0 0 0 4px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 60%,transparent)}' +
      '.pw-color-none{background:color-mix(in srgb,var(--dsw-alias-label-primary,#111) 8%,transparent);position:relative}' +
      '.pw-color-none::after{content:"";position:absolute;left:5px;right:5px;top:50%;height:1px;background:var(--dsw-alias-label-tertiary);transform:rotate(-45deg)}' +
      '.pw-color-line{display:flex;align-items:center;gap:8px;min-width:0}' +
      '.pw-color-line input[type=color]{flex:none;width:32px;height:32px;padding:0;border:0.5px solid var(--dsw-alias-border-l4,rgba(127,127,127,.4));border-radius:8px;background:transparent;cursor:pointer}' +
      '.pw-row-wrap{flex-wrap:wrap}' +
      '.pw-preview{display:flex;align-items:center;gap:8px;height:32px;margin-top:10px;padding:0 10px;border-radius:var(--dsw-radius-md,12px);font-size:13px;color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 10%,transparent)}' +
      '.pw-preview-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-business-primary,#4d6bfe)}' +
      '.pw-sess-list{max-height:min(46vh,420px);overflow-y:auto;display:flex;flex-direction:column;gap:2px;padding:4px;border:0.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.2));border-radius:var(--dsw-radius-md,12px)}' +
      '.pw-sess-row{display:flex;align-items:center;gap:8px;min-height:32px;padding:0 8px;border-radius:var(--dsw-radius-sm,8px);cursor:pointer}' +
      '.pw-sess-row:hover{background:var(--dsw-alias-interactive-bg-hover)}' +
      '.pw-sess-dot{flex:none;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-business-primary,#4d6bfe)}' +
      '.pw-sess-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:18px}' +
      '.pw-sess-time{flex:none;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}' +
      '.pw-footer{flex:none;position:sticky;bottom:-2px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0 2px;background:var(--dsw-alias-bg-layer-1,transparent);border-top:0.5px solid var(--dsw-alias-border-l1,rgba(127,127,127,.16))}' +
      '.pw-footer-actions{display:flex;align-items:center;gap:8px}'
    // 整体观感微调：更克制的分隔、hover 过渡、焦点圈、按钮层次
    const REFINE_CSS = [
      '.sbw-hd-label{font-size:13.5px;font-weight:600;letter-spacing:.01em;color:var(--dsw-alias-label-secondary)}',
      '.sbw-hd{padding-bottom:2px}',
      '.sbw-sect-head{font-weight:600;letter-spacing:.02em;text-transform:none}',
      '.sbw-row{transition:background-color 120ms ease,color 120ms ease}',
      '.sbw-ibtn{transition:background-color 120ms ease,color 120ms ease,transform 120ms ease}',
      '.sbw-ibtn:hover{transform:translateY(-1px)}',
      '.sbw-ibtn:active{transform:none}',
      '.sbw-tab{box-shadow:inset 0 0 0 .5px var(--dsw-alias-border-l2,rgba(127,127,127,.22));transition:background-color 120ms ease,box-shadow 120ms ease}',
      '.sbw-tab:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.sbw-tab.on{box-shadow:inset 0 0 0 .5px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 32%,transparent)}',
      '.sbw-filter{transition:background-color 120ms ease,color 120ms ease,border-color 120ms ease}',
      '.sbw-empty-ico{width:40px;height:40px;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 10%,transparent);color:var(--dsw-alias-brand-primary,#4d6bfe)}',
      '.sbw-now{transition:background-color 120ms ease,box-shadow 120ms ease}',
      '.sbw-now:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 14%,transparent)}',
      '.sbw-empty-btn{transition:transform 120ms ease,background-color 120ms ease}',
      '.sbw-empty-btn:hover{transform:translateY(-1px)}',
      '.pw-btn{transition:background-color 120ms ease,border-color 120ms ease,box-shadow 120ms ease,transform 120ms ease}',
      '.pw-btn:hover{transform:translateY(-1px)}',
      '.pw-btn:active{transform:none}',
      '.pw-btn.primary{box-shadow:0 2px 8px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 28%,transparent)}',
      '.pw-btn.primary:hover{box-shadow:0 4px 14px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 34%,transparent)}',
      '.pw-btn:focus-visible,.pw-input:focus-visible,.pw-dir:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 18%,transparent)}',
      '.pw-tree-row{border-radius:var(--dsw-radius-sm,8px);transition:background-color 120ms ease}',
      '.pw-tree-row:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.pw-step-num{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 14%,transparent);color:var(--dsw-alias-brand-primary,#4d6bfe);font-weight:600}',
      '.pw-summary{background:var(--dsw-alias-bg-layer-2,#f5f6f8)}',
      '.pw-card{border-color:var(--dsw-alias-border-l2,rgba(127,127,127,.2))}',
      '.pw-toast{border-radius:var(--dsw-radius-lg,14px);transition:transform 120ms ease,box-shadow 120ms ease}',
      '.pw-toast:hover{transform:translateX(-2px);box-shadow:0 10px 28px rgba(0,0,0,.2)}',
      '.sbw-tab{height:22px;padding:0 8px;font-size:11.5px;line-height:16px}',
      '.sbw-filter{height:22px;font-size:11.5px;line-height:16px}',
      '.sbw-sect-head{margin-top:2px}',
      '.sbw-branch > * + *{margin-top:1px}',
    ].join('')

    const TABS_CSS = [
      '.pwt-band{box-sizing:border-box;z-index:40;display:flex;align-items:center;height:38px;padding:0 14px;gap:10px;background:var(--dsw-alias-bg-base,#fff);border-bottom:0.5px solid var(--dsw-alias-border-l1,rgba(127,127,127,.16))}',
      '.pwt-probe{position:absolute;width:1px;height:1px;pointer-events:none;opacity:0}',
      '.pwt-inner{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:10px}',
      '.pwt{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:6px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;scroll-behavior:smooth;-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 18px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 18px),transparent)}',
      '.pwt::-webkit-scrollbar{display:none}',
      '.pwt-tab{flex:none;display:inline-flex;align-items:center;max-width:220px;height:28px;border-radius:8px;background:var(--dsw-alias-bg-layer-2,#f2f3f5);border:0.5px solid transparent;transition:background-color 120ms ease,border-color 120ms ease,transform 120ms ease}',
      '.pwt-tab:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}',
      '.pwt-tab.on{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 13%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 28%,transparent)}',
      '.pwt-hit{flex:1 1 auto;min-width:0;display:inline-flex;align-items:center;height:100%;padding:0 8px 0 11px;border:none;background:transparent;cursor:pointer;color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:13px;line-height:18px}',
      '.pwt-tab.on .pwt-hit{color:var(--dsw-alias-brand-primary,#4d6bfe);font-weight:500}',
      '.pwt-t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pwt-x{flex:none;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;margin-right:5px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;opacity:0;transition:opacity 120ms ease,background-color 120ms ease,color 120ms ease}',
      '.pwt-tab:hover .pwt-x,.pwt-tab.on .pwt-x{opacity:1}',
      '.pwt-x:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.08));color:var(--dsw-alias-label-primary)}',
      '.pwt-add{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:none;border-radius:8px;background:var(--dsw-alias-bg-layer-2,#f2f3f5);color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background-color 120ms ease,color 120ms ease}',
      '.pwt-add:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.08));color:var(--dsw-alias-label-primary)}',
    ].join('')

    const CSS = SIDEBAR_CSS + DIALOG_CSS + REFINE_CSS + TABS_CSS

    async function request(url, init) {
      const response = await fetch(url, Object.assign({ credentials: 'same-origin' }, init || {}))
      const body = await response.json().catch(function () { return {} })
      if (!response.ok || body.ok === false) throw new Error(body.error || ('请求失败：' + response.status))
      return body
    }
    function postJson(url, payload) {
      return request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload || {}) })
    }
    function errorText(err) {
      return String(err && err.message ? err.message : err)
    }
    function samePath(a, b) {
      return String(a || '').replace(/[\\/]+$/, '').toLowerCase() === String(b || '').replace(/[\\/]+$/, '').toLowerCase()
    }
    function notifyChanged() {
      if (typeof window === 'undefined') return
      try { window.dispatchEvent(new CustomEvent(CHANGED_EVENT)) } catch (err) { void err }
    }
    function CreateDialog(props) {
      ensureStyle()
      const services = props.services || {}
      const ui = services.uiWorkspace
      const [root, setRoot] = useState(props.initialRoot || '')
      const [name, setName] = useState(props.initialName || '')
      const [tree, setTree] = useState(null)
      const [depth, setDepth] = useState(1)
      const [picked, setPicked] = useState({})
      const [collapsed, setCollapsed] = useState({})
      const [skipped, setSkipped] = useState([])
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')
      const [message, setMessage] = useState('')
      function resetScan() {
        setTree(null)
        setPicked({})
        setCollapsed({})
        setSkipped([])
      }
      function flatten(nodes, out) {
        for (const node of nodes || []) {
          out.push(node)
          if (node.children && node.children.length) flatten(node.children, out)
        }
        return out
      }
      function subtreeRels(node) {
        const out = []
        const walk = function (item) {
          out.push(item.rel)
          if (item.children) item.children.forEach(walk)
        }
        walk(node)
        return out
      }
      function toggleNode(node, deep) {
        // 默认只勾这一个目录；按住 Alt/Ctrl/Shift 点才连子目录一起勾
        const rels = deep ? subtreeRels(node) : [node.rel]
        const all = rels.every(function (rel) { return !!picked[rel] })
        setPicked(function (prev) {
          const next = Object.assign({}, prev)
          rels.forEach(function (rel) {
            if (all) delete next[rel]
            else next[rel] = true
          })
          return next
        })
      }
      function toggleOne(rel) {
        setPicked(function (prev) {
          const next = Object.assign({}, prev)
          if (next[rel]) delete next[rel]
          else next[rel] = true
          return next
        })
      }
      function toggleExpand(rel) {
        setCollapsed(function (prev) {
          const next = Object.assign({}, prev)
          next[rel] = !next[rel]
          return next
        })
      }
      function selectedRels() {
        return Object.keys(picked).filter(function (rel) { return !!picked[rel] }).sort()
      }
      async function browse() {
        if (!ui || typeof ui.pickDirectory !== 'function') { setError('当前 DSH 没有暴露目录选择器，请直接输入路径'); return }
        setError('')
        try {
          const dir = await ui.pickDirectory()
          if (!dir) return
          setRoot(dir)
          if (!name.trim()) setName(baseName(dir))
          resetScan()
        } catch (err) { setError(errorText(err)) }
      }
      async function scan(nextDepth) {
        const path = String(root || '').trim()
        const want = Number(nextDepth) >= 1 ? Number(nextDepth) : depth
        if (!path) { setError('先选择或输入项目根目录'); return }
        setBusy(true); setError(''); setMessage('')
        try {
          const body = await postJson(API.tree, { root: path, depth: want })
          setDepth(want)
          const nextTree = body.tree || []
          setTree(nextTree)
          setSkipped(body.skipped || [])
          setCollapsed({})
          // 重新扫描后，把已经不存在的勾选清掉，避免残留旧路径
          const alive = new Set()
          flatten(nextTree, []).forEach(function (node) { alive.add(node.rel) })
          setPicked(function (prev) {
            const next = {}
            Object.keys(prev).forEach(function (rel) { if (prev[rel] && alive.has(rel)) next[rel] = true })
            return next
          })
          if (!name.trim()) setName(body.name || baseName(path))
        } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
      }
      async function submit() {
        const path = String(root || '').trim()
        if (!path) { setError('先选择或输入项目根目录'); return }
        // 不扫描也能创建：没有勾选子目录时，只把项目根目录注册成一个工作区
        const rels = selectedRels()
        setBusy(true); setError(''); setMessage('')
        try {
          const body = await postJson(API.project, { root: path, name: name.trim() || baseName(path), children: rels })
          notifyChanged()
          if (props.onCreated) props.onCreated(body.project, body.state)
        } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
      }
      const selected = selectedRels()
      const selectedCount = selected.length
      const canSubmit = !busy && !!String(root || '').trim()
      function onNameKey(event) {
        if (event.key !== 'Enter') return
        event.preventDefault()
        if (canSubmit) submit()
      }
      function renderNodes(nodes, level) {
        return (nodes || []).map(function (node) {
          const rels = subtreeRels(node)
          const selfPicked = !!picked[node.rel]
          const descPicked = rels.slice(1).some(function (rel) { return !!picked[rel] })
          const hasKids = node.children && node.children.length > 0
          // 第二层及更深默认收起，避免一次把整棵树铺开
          const isCollapsed = collapsed[node.rel] === undefined ? level >= 1 : !!collapsed[node.rel]
          let rows = [h('div', { className: 'pw-tree-row', key: node.rel, style: { paddingLeft: (6 + level * 14) + 'px' } },
            hasKids
              ? h('button', { className: 'pw-tree-tri', title: isCollapsed ? '展开' : '收起', onClick: function () { toggleExpand(node.rel) } }, isCollapsed ? '▸' : '▾')
              : h('span', { className: 'pw-tree-tri pw-tree-leaf' }, '·'),
            h('input', {
              type: 'checkbox',
              className: !selfPicked && descPicked ? 'pw-cb-partial' : '',
              checked: selfPicked,
              disabled: busy,
              onChange: function (event) {
                const deep = Boolean(event && (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey))
                toggleNode(node, deep)
              },
            }),
            h('span', { className: 'pw-tree-name', onClick: function () { if (hasKids) toggleExpand(node.rel) } }, node.name),
            node.registered ? h('span', { className: 'pw-tag' }, '已注册·复用') : null,
            !hasKids && node.hasChildren ? h('span', { className: 'pw-tag' }, '还有更深层') : null,
            node.rel !== node.name ? h('span', { className: 'pw-tree-rel' }, node.rel) : null
          )]
          if (hasKids && !isCollapsed) rows = rows.concat(renderNodes(node.children, level + 1))
          return rows
        })
      }
      const allNodes = tree ? flatten(tree, []) : []
      const projectName = name.trim() || (root ? baseName(root) : '')
      const stepHead = function (num, text, hint) {
        return h('div', { className: 'pw-step' },
          h('span', { className: 'pw-step-num' }, String(num)),
          h('span', { className: 'pw-step-text' }, text),
          hint ? h('span', { className: 'pw-step-hint' }, hint) : null)
      }
      const summaryWorkspaces = selectedCount
        ? '1 个根目录 + ' + selectedCount + ' 个子工作区（共 ' + (selectedCount + 1) + ' 个）'
        : '1 个根目录工作区'
      // 打开弹窗的那次点击可能「穿透」到遮罩上（React 18 同步渲染），
      // 加一个很短的守卫窗口，避免刚打开就被自己关掉。
      const openedAt = React.useRef(Date.now())
      function backdropClick(event, close) {
        if (Date.now() - openedAt.current < 300) return
        if (event && event.target !== event.currentTarget) return
        close()
      }
      return h('div', { className: 'pw-modal', onClick: function (event) { backdropClick(event, props.onClose) } },
        h('div', { className: 'pw-modal-card lg', onClick: function (e) { e.stopPropagation() } },
          h('div', { className: 'pw-modal-head' },
            h('div', null,
              h('h3', { className: 'pw-modal-title' }, props.title || '新建项目'),
              h('div', { className: 'pw-modal-sub' }, '一个项目 = 一个根目录 + 若干独立子工作区。先选目录、起名字，再决定要不要拆子工作区。')
            ),
            h('button', { className: 'pw-close', title: '关闭', onClick: props.onClose }, glyph('IconCloseOutlineRegular', 16, '×'))
          ),
          error ? h('div', { className: 'pw-msg err' }, error) : null,
          message ? h('div', { className: 'pw-msg' }, message) : null,
          h('div', { className: 'pw-body' },
            h('div', { className: 'pw-field' },
              stepHead(1, '项目根目录'),
              h('div', { className: 'pw-control' },
                h('input', {
                  className: 'pw-input',
                  placeholder: '例如 D:\\\\\\\\www\\\\\\\\public 或 /home/www/public',
                  value: root,
                  onChange: function (e) { setRoot(e.target.value); resetScan() },
                  onKeyDown: function (e) { if (e.key === 'Enter') { e.preventDefault(); scan() } },
                }),
                h('button', { className: 'pw-btn', disabled: busy, onClick: browse }, glyph('IconFolderOpenRegular', 16), '浏览…')
              ),
              h('div', { className: 'pw-muted' }, '选择项目最外层的目录（不要选到某个子目录里）。')
            ),
            h('div', { className: 'pw-field' },
              stepHead(2, '项目名称'),
              h('input', {
                className: 'pw-input',
                placeholder: '不填就用目录名，例如 public',
                value: name,
                onChange: function (e) { setName(e.target.value) },
                onKeyDown: onNameKey,
              })
            ),
            h('div', { className: 'pw-field' },
              stepHead(3, tree === null ? '子工作区' : '子工作区（已选 ' + selectedCount + ' / 共 ' + allNodes.length + '）', '可选'),
              h('div', { className: 'pw-scanline' },
                h('button', { className: 'pw-btn', disabled: busy, onClick: function () { scan() } },
                  glyph('IconRefreshOutlineRegular', 16), busy ? '扫描中…' : (tree === null ? '扫描子目录' : '重新扫描')),
                tree !== null && allNodes.length
                  ? h('div', { className: 'pw-depth' },
                    [1, 2, 3, 6].map(function (value) {
                      return h('button', {
                        key: 'd' + value,
                        className: 'pw-depth-btn' + (depth === value ? ' on' : ''),
                        disabled: busy,
                        title: value === 6 ? '一直展开到 6 层（不继续往下）' : '展开到第 ' + value + ' 层',
                        onClick: function () { scan(value) },
                      }, value === 6 ? '更深' : value + ' 层')
                    })
                  )
                  : null
              ),
              tree === null
                ? h('div', { className: 'pw-msg' }, '不扫描也可以创建，那样只把根目录注册成一个工作区。想按子目录拆开，就点上面的「扫描子目录」再勾选。')
                : allNodes.length
                  ? h('div', null,
                    h('div', { className: 'pw-dirs pw-tree' }, renderNodes(tree, 0)),
                    h('div', { className: 'pw-tree-foot' },
                      h('button', { className: 'pw-link', disabled: busy, onClick: function () { const next = {}; allNodes.forEach(function (node) { next[node.rel] = true }); setPicked(next) } }, '全选'),
                      h('button', { className: 'pw-link', disabled: busy, onClick: function () { setPicked({}) } }, '清空'),
                      skipped.length ? h('span', { className: 'pw-muted' }, '已忽略 ' + skipped.length + ' 个依赖/构建目录') : null
                    ),
                    h('div', { className: 'pw-muted' }, '勾中的每个目录 = 一个独立工作区（会话 cwd 就是它）；默认只勾当前这一层，按住 Alt / Ctrl 点方框才会连子目录一起勾。')
                  )
                  : h('div', { className: 'pw-msg' }, '该目录下没有子目录')
            ),
          ),
          h('div', { className: 'pw-summary' },
            h('div', { className: 'pw-summary-line' },
              h('span', { className: 'pw-summary-key' }, '项目'),
              h('span', { className: 'pw-summary-val' }, projectName ? projectName + ' · ' + root : '还没有选择目录')
            ),
            h('div', { className: 'pw-summary-line' },
              h('span', { className: 'pw-summary-key' }, '工作区'),
              h('span', { className: 'pw-summary-val' }, summaryWorkspaces)
            )
          ),
          h('div', { className: 'pw-footer' },
            h('div', { className: 'pw-muted' }, canSubmit ? '创建后可以在侧边栏拖拽排序、置顶或改别名。' : '先选择项目根目录'),
            h('div', { className: 'pw-footer-actions' },
              h('button', { className: 'pw-btn', disabled: busy, onClick: props.onClose }, '取消'),
              h('button', { className: 'pw-btn primary', disabled: !canSubmit, onClick: submit }, busy ? '创建中…' : '创建项目')
            )
          )
        )
      )
    }
    function EditDialog(props) {
      ensureStyle()
      const project = props.project
      const child = props.child || null
      const [name, setName] = useState(project.name || project.root || '')
      const [alias, setAlias] = useState(child ? (child.alias || '') : (project.alias || ''))
      const [tags, setTags] = useState(((child ? child.tags : project.tags) || []).join(', '))
      const [color, setColor] = useState(project.color || '')
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')
      const target = child ? child.path : project.path
      const base = child ? child.name : (project.name || project.root)
      const parsedTags = String(tags || '').split(/[,\uFF0C;\uFF1B\u3001|]/).map(function (tag) { return tag.trim() }).filter(Boolean)
      const preview = displayName(base, alias)
      async function openFolder() {
        try { await postJson(API.open, { path: target }) } catch (err) { setError(errorText(err)) }
      }
      async function save() {
        if (busy) return
        if (!String(name).trim()) { setError('项目名称不能为空'); return }
        setBusy(true); setError('')
        try {
          const payload = { projectId: project.id }
          // 项目名在这里始终可以改（编辑子工作区时也能顺手改父项目名）
          payload.name = String(name).trim()
          if (child) {
            // 只改这个子目录自己的别名/标签，绝不能带到项目上（否则整个项目所有目录显示同一个别名）
            payload.children = [{ path: child.path, alias: alias, tags: parsedTags }]
          } else {
            payload.alias = alias
            payload.tags = parsedTags
            payload.color = color
          }
          await postJson(API.projectUpdate, payload)
          notifyChanged()
          props.onSaved()
        } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
      }
      // 打开弹窗的那次点击可能「穿透」到遮罩上（React 18 同步渲染），
      // 加一个很短的守卫窗口，避免刚打开就被自己关掉。
      const openedAt = React.useRef(Date.now())
      function backdropClick(event, close) {
        if (Date.now() - openedAt.current < 300) return
        if (event && event.target !== event.currentTarget) return
        close()
      }
      return h('div', { className: 'pw-modal', onClick: function (event) { backdropClick(event, props.onClose) } },
        h('div', { className: 'pw-modal-card sm', onClick: function (e) { e.stopPropagation() } },
          h('div', { className: 'pw-modal-head' },
            h('div', null,
              h('h3', { className: 'pw-modal-title' }, child ? '编辑子工作区' : '编辑项目'),
              h('div', { className: 'pw-modal-sub' }, '别名和标签只影响侧边栏显示，不改磁盘目录名。')
            ),
            h('button', { className: 'pw-close', title: '关闭', onClick: props.onClose }, glyph('IconCloseOutlineRegular', 16, '\u00D7'))
          ),
          error ? h('div', { className: 'pw-msg err' }, error) : null,
          h('div', { className: 'pw-field' },
            h('label', { className: 'pw-label' }, '目录'),
            h('div', { className: 'pw-control' },
              h('input', { className: 'pw-input', value: target, readOnly: true }),
              h('button', { className: 'pw-btn', onClick: openFolder }, glyph('IconFolderOpenRegular', 16), '打开目录')
            )
          ),
          h('div', { className: 'pw-field' },
            h('label', { className: 'pw-label' }, '项目名称'),
            h('input', {
              className: 'pw-input',
              value: name,
              placeholder: '例如 public',
              onChange: function (e) { setName(e.target.value) },
            }),
            child ? h('div', { className: 'pw-muted' }, '改这里会重命名整个项目；子工作区本身的名称取自目录名。') : null
          ),
          child ? null : h('div', { className: 'pw-field' },
            h('label', { className: 'pw-label' }, '项目颜色'),
            h('div', { className: 'pw-colors' }, PROJECT_COLORS.map(function (item) {
              return h('button', {
                key: item.value || 'default',
                type: 'button',
                className: 'pw-color' + (color === item.value ? ' on' : '') + (item.value ? '' : ' pw-color-none'),
                title: item.label,
                style: item.value ? { background: item.value } : undefined,
                onClick: function () { setColor(item.value) },
              })
            }))
          ),
          h('div', { className: 'pw-field' },
            h('label', { className: 'pw-label' }, '别名'),
            h('input', {
              className: 'pw-input',
              value: alias,
              placeholder: '显示成 public(学位申报系统) 里的括号内容，留空则不显示',
              onChange: function (e) { setAlias(e.target.value) },
            })
          ),
          h('div', { className: 'pw-field' },
            h('label', { className: 'pw-label' }, '标签'),
            h('input', {
              className: 'pw-input',
              value: tags,
              placeholder: '用逗号分隔，例如 PHP, CI4, 前端',
              onChange: function (e) { setTags(e.target.value) },
            }),
            h('div', { className: 'pw-muted' }, parsedTags.length ? '将显示 ' + parsedTags.length + ' 个标签' : '不设置标签')
          ),
          h('div', { className: 'pw-footer' },
            h('div', { className: 'pw-muted' }, '侧边栏显示：' + preview),
            h('div', { className: 'pw-footer-actions' },
              h('button', { className: 'pw-btn', disabled: busy, onClick: props.onClose }, '取消'),
              h('button', { className: 'pw-btn primary', disabled: busy, onClick: save }, busy ? '保存中…' : '保存')
            )
          )
        )
      )
    }
    // Ctrl/Cmd+K 快速跳转：一次列出项目、子工作区、会话，回车直达
    function CommandPalette(props) {
      ensureStyle()
      const services = props.services || {}
      const ui = services.uiWorkspace
      const [open, setOpen] = useState(false)
      const [query, setQuery] = useState('')
      const [cursor, setCursor] = useState(0)
      const [data, setData] = useState(null)
      const sessionSnap = useSnapshot(services.sessions && services.sessions.list)
      const wsSnapForPalette = useSnapshot(services.workspaces && services.workspaces.list)
      useEffect(function () {
        function onKey(event) {
          const mod = event.ctrlKey || event.metaKey
          if (mod && String(event.key || '').toLowerCase() === 'k') {
            event.preventDefault()
            setOpen(true)
            setQuery('')
            setCursor(0)
            return
          }
          if (event.key === 'Escape') setOpen(false)
        }
        function onOpenPalette() { setOpen(true); setQuery(''); setCursor(0) }
        window.addEventListener('keydown', onKey)
        window.addEventListener('dsh-project-workspaces:open-palette', onOpenPalette)
        return function () {
          window.removeEventListener('keydown', onKey)
          window.removeEventListener('dsh-project-workspaces:open-palette', onOpenPalette)
        }
      }, [])
      useEffect(function () {
        if (!open) return undefined
        let alive = true
        request(API.state).then(function (body) { if (alive) setData(body) }).catch(function () { if (alive) setData({ projects: [], workspaces: [] }) })
        return function () { alive = false }
      }, [open])
      if (!open) return null
      const rows = []
      const push = function (row) { rows.push(row) }
      const paletteProjects = mapProjects((data && data.projects) || [], (wsSnapForPalette && wsSnapForPalette.items) || [])
      ;paletteProjects.forEach(function (project) {
        push({ key: 'p:' + project.id, kind: '项目', label: displayName(project.name || project.root, project.alias), hint: project.path, run: function () {
          const target = project.selfWs || (project.children.find(function (item) { return !!item.ws }) || {}).ws
          if (target && ui && typeof ui.startSession === 'function') ui.startSession(target.workspaceId)
        } })
        ;(project.children || []).forEach(function (item) {
          if (!item.ws) return
          push({ key: 'w:' + item.ws.workspaceId, kind: '子工作区', label: displayName(item.child.name, item.child.alias), hint: item.child.path, run: function () {
            if (ui && typeof ui.startSession === 'function') ui.startSession(item.ws.workspaceId)
          } })
        })
      })
      ;((data && data.workspaces) || []).forEach(function (workspace) {
        push({ key: 'ws:' + workspace.workspaceId, kind: '工作区', label: workspace.title || baseName(workspace.path), hint: workspace.path, run: function () {
          if (ui && typeof ui.startSession === 'function') ui.startSession(workspace.workspaceId)
        } })
      })
      ;(((sessionSnap && sessionSnap.byId) ? Object.keys(sessionSnap.byId).map(function (id) { return sessionSnap.byId[id] }) : ((sessionSnap && sessionSnap.items) || []))).forEach(function (summary) {
        if (!summary || !summary.id) return
        push({ key: 's:' + summary.id, kind: '会话', label: sessionLabel(summary), hint: summary.workspaceId || '', run: function () {
          noteOpened(summary.id)
          if (ui && typeof ui.openSession === 'function') ui.openSession(summary.id)
        } })
      })
      const lowered = query.trim().toLowerCase()
      const filtered = lowered
        ? rows.filter(function (row) { return (row.label + ' ' + row.hint + ' ' + row.kind).toLowerCase().indexOf(lowered) >= 0 })
        : rows
      const visible = filtered.slice(0, 40)
      const active = Math.min(Math.max(cursor, 0), Math.max(visible.length - 1, 0))
      const close = function () { setOpen(false) }
      const run = function (row) {
        if (!row) return
        close()
        try { row.run() } catch (err) { void err }
      }
      return h('div', { className: 'pw-modal pw-cmd-mask', onClick: close },
        h('div', { className: 'pw-cmd-card', onClick: function (e) { e.stopPropagation() } },
          h('input', {
            className: 'pw-cmd-input',
            autoFocus: true,
            placeholder: '搜索项目 / 子工作区 / 会话，回车打开',
            value: query,
            onChange: function (e) { setQuery(e.target.value); setCursor(0) },
            onKeyDown: function (e) {
              if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(active + 1) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(Math.max(active - 1, 0)) }
              else if (e.key === 'Enter') { e.preventDefault(); run(visible[active]) }
              else if (e.key === 'Escape') { e.preventDefault(); close() }
            },
          }),
          visible.length
            ? h('div', { className: 'pw-cmd-list' }, visible.map(function (row, index) {
              return h('div', {
                key: row.key,
                className: 'pw-cmd-row' + (index === active ? ' on' : ''),
                onMouseEnter: function () { setCursor(index) },
                onClick: function () { run(row) },
              },
              h('span', { className: 'pw-cmd-kind' }, row.kind),
              h('span', { className: 'pw-cmd-label' }, row.label),
              h('span', { className: 'pw-cmd-hint' }, row.hint))
            }))
            : h('div', { className: 'pw-cmd-empty' }, query ? '没有匹配的项目或会话' : '还没有项目，先按 Esc 关闭再点「＋ 新建项目」')
        )
      )
    }

    // 一个目录下的会话列表：侧边栏里滚起来费劲时，点文件夹图标直接摊开成弹窗
    function SessionListDialog(props) {
      ensureStyle()
      const pair = useSessionListSeed()
      const seed = pair[0]
      const setSeed = pair[1]
      const snapshot = useSnapshot(props.services.sessions.list)
      const [query, setQuery] = useState('')
      useEffect(function () { setQuery('') }, [seed])
      if (!seed) return null
      const wanted = seed.wsIds || []
      const all = (snapshot.items || []).filter(function (item) {
        if (!wanted.length) return true
        return wanted.map(String).indexOf(String(item.workspaceId)) >= 0
      })
      const needle = query.trim().toLowerCase()
      const list = needle
        ? all.filter(function (item) { return sessionLabel(item).toLowerCase().indexOf(needle) >= 0 })
        : all
      const sorted = list.slice().sort(function (a, b) { return sessionStamp(b) - sessionStamp(a) })
      function close() { setSeed(null) }
      return h('div', { className: 'pw-modal', onClick: close },
        h('div', { className: 'pw-modal-card sm', onClick: function (e) { e.stopPropagation() } },
          h('div', { className: 'pw-modal-head' },
            h('div', null,
              h('h3', { className: 'pw-modal-title' }, seed.title || '会话'),
              h('div', { className: 'pw-modal-sub' }, all.length + ' 个会话' + (needle ? '，匹配 ' + list.length + ' 个' : ''))
            ),
            h('button', { className: 'pw-close', title: '关闭', onClick: close }, glyph('IconCloseOutlineRegular', 16, '\u00D7'))
          ),
          h('div', { className: 'pw-field' },
            h('input', {
              className: 'pw-input',
              autoFocus: true,
              value: query,
              placeholder: '过滤会话名称',
              onChange: function (e) { setQuery(e.target.value) },
              onKeyDown: function (e) { if (e.key === 'Escape') { e.preventDefault(); close() } },
            })
          ),
          all.length
            ? h('div', { className: 'pw-sess-list' }, sorted.length
              ? sorted.map(function (item) {
                return h('div', {
                  key: String(item.id),
                  className: 'pw-sess-row',
                  title: sessionLabel(item),
                  onClick: function () { noteOpened(item.id); props.services.uiWorkspace.openSession(item.id); close() },
                },
                  h('span', { className: 'pw-sess-dot' }),
                  h('span', { className: 'pw-sess-title' }, sessionLabel(item)),
                  h('span', { className: 'pw-sess-time' }, formatRelative(sessionStamp(item)))
                )
              })
              : h('div', { className: 'pw-muted' }, '没有匹配的会话'))
            : h('div', { className: 'pw-muted' }, '这个目录下还没有会话')
        )
      )
    }

    function OverlayHost(props) {
      const createPair = useCreateDialogSeed()
      const editPair = useEditDialogSeed()
      const seed = createPair[0]
      const setSeed = createPair[1]
      const editSeed = editPair[0]
      const setEditSeed = editPair[1]
      const [editData, setEditData] = useState(null)
      useEffect(function () {
        if (!editSeed) { setEditData(null); return undefined }
        let alive = true
        setEditData(null)
        request(API.state).then(function (body) {
          if (!alive) return
          const project = (body.projects || []).find(function (item) { return item.id === editSeed.projectId })
          if (!project) { setEditData({ error: '项目不存在，可能已被移除' }); return }
          const path = editSeed.path || ''
          const isProject = samePath(path, project.path) || samePath(path, project.root)
          const child = isProject ? null : (project.children || []).find(function (item) { return samePath(item.path, path) })
          if (!isProject && !child) { setEditData({ error: '子工作区不存在，可能在设置页被移除' }); return }
          setEditData({ project: project, child: child })
        }).catch(function (err) { if (alive) setEditData({ error: errorText(err) }) })
        return function () { alive = false }
      }, [editSeed])
      let dialog = null
      if (seed) {
        dialog = h(CreateDialog, {
          services: props.services,
          title: seed.root ? '添加子工作区' : '新建项目',
          initialRoot: seed.root || '',
          initialName: seed.name || '',
          onClose: function () { setSeed(null) },
          onCreated: function () { setSeed(null) }
        })
      } else if (editSeed) {
        if (editData && editData.error) {
          dialog = h('div', { className: 'pw-modal', onClick: function () { setEditSeed(null) } },
            h('div', { className: 'pw-modal-card sm', onClick: function (e) { e.stopPropagation() } },
              h('div', { className: 'pw-modal-head' },
                h('div', null, h('h3', { className: 'pw-modal-title' }, '编辑目录')),
                h('button', { className: 'pw-close', title: '关闭', onClick: function () { setEditSeed(null) } }, glyph('IconCloseOutlineRegular', 16, '\u00D7'))
              ),
              h('div', { className: 'pw-msg err' }, editData.error)
            )
          )
        } else if (editData) {
          dialog = h(EditDialog, {
            project: editData.project,
            child: editData.child,
            onClose: function () { setEditSeed(null) },
            onSaved: function () { setEditSeed(null) }
          })
        } else {
          // 还在读 state：先撑一个「载入中」的卡片，别让弹窗闪一下又消失
          dialog = h('div', { className: 'pw-modal', onClick: function () { setEditSeed(null) } },
            h('div', { className: 'pw-modal-card sm', onClick: function (e) { e.stopPropagation() } },
              h('div', { className: 'pw-modal-head' },
                h('div', null, h('h3', { className: 'pw-modal-title' }, '编辑目录')),
                h('button', { className: 'pw-close', title: '关闭', onClick: function () { setEditSeed(null) } }, glyph('IconCloseOutlineRegular', 16, '\u00D7'))
              ),
              h('div', { className: 'pw-muted' }, '正在读取项目信息…')
            )
          )
        }
      }
      return h(React.Fragment, null, dialog, h(SessionListDialog, { services: props.services }), h(CommandPalette, { services: props.services }), h(CompletionToasts, { services: props.services }))
    }

    // 会话完成提示条：右下角堆叠，6 秒自动消失，点击打开对应会话
    function CompletionToasts(props) {
      ensureStyle()
      const pair = useCompletionToasts()
      const items = pair[0]
      const setItems = pair[1]
      const held = pair[2]
      const setHeld = pair[3]
      if (!items.length) return null
      return h('div', { className: 'pw-toasts' }, items.map(function (item) {
        const done = item.kind !== 'warning'
        return h('div', {
          key: item.key,
          className: 'pw-toast',
          title: done ? '点击打开这个会话' : '点击去处理这个会话',
          onMouseEnter: function () { setHeld(item.key) },
          onMouseLeave: function () { setHeld(function (prev) { return prev === item.key ? '' : prev }) },
          onClick: function () {
            setItems(function (prev) { return prev.filter(function (next) { return next.key !== item.key }) })
            try {
              const ws = props.services && props.services.uiWorkspace
              if (ws && typeof ws.openSession === 'function') ws.openSession(item.sessionId)
            } catch (err) { /* 打不开就只当作提示 */ }
          }
        },
        h('span', { className: 'pw-toast-dot' + (done ? ' done' : ' warn') }, glyph(done ? 'IconCheckCircleOutlineRegular' : 'IconWarningOutlineRegular', 16, done ? '\u2713' : '!')),
        h('span', { className: 'pw-toast-body' },
          h('span', { className: 'pw-toast-title' }, item.title),
          h('span', { className: 'pw-toast-sub' }, done ? '已完成' : '等待你处理')
        )
        )
      }))
    }

    function Panel(props) {
      ensureStyle()
      const [state, setState] = useState(null)
      const [root, setRoot] = useState('')
      const [picked, setPicked] = useState({})
      const [busy, setBusy] = useState(false)
      const [dialog, setDialog] = useState(false)
      const [error, setError] = useState('')
      const [message, setMessage] = useState('')
      async function load() {
        try { setState(await request(API.state)); setError('') } catch (err) { setError(errorText(err)) }
      }
      useEffect(function () { load() }, [])
      async function scan() {
        if (!root.trim()) return
        setBusy(true); setError(''); setMessage('')
        try { const body = await postJson(API.scan, { root: root.trim() }); setState(body); setPicked({}) }
        catch (err) { setError(errorText(err)) } finally { setBusy(false) }
      }
      async function register(rootPath, dirs) {
        const names = dirs.filter(function (d) { return picked[d.path] }).map(function (d) { return d.name })
        if (!names.length) { setError('先勾选要注册的子目录'); return }
        setBusy(true); setError(''); setMessage('')
        try {
          const body = await postJson(API.register, { root: rootPath, subdirs: names })
          setState(body.state); setPicked({}); setMessage('已注册 ' + body.created.length + ' 个 Workspace；左侧工作区列表会出现对应子目录。')
          notifyChanged()
        } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
      }
      async function remove(workspaceId) {
        setBusy(true); setError(''); setMessage('')
        try { const body = await postJson(API.remove, { workspaceId: workspaceId }); setState(body.state); setMessage('已移除 Workspace 注册，目录和会话历史未删除。'); notifyChanged() }
        catch (err) { setError(errorText(err)) } finally { setBusy(false) }
      }
      async function removeProject(projectId) {
        setBusy(true); setError(''); setMessage('')
        try { const body = await postJson(API.projectRemove, { projectId: projectId }); setState(body.state); setMessage('已移出项目树，Workspace 注册和会话历史都保留。'); notifyChanged() }
        catch (err) { setError(errorText(err)) } finally { setBusy(false) }
      }
      const [runBg, setRunBg] = useState('')
      const [runFg, setRunFg] = useState('')
      useEffect(function () {
        if (!state) return
        const ui = state.ui || {}
        setRunBg(ui.runningBg || '')
        setRunFg(ui.runningFg || '')
      }, [state])
      async function saveUi(bg, fg) {
        setBusy(true); setError(''); setMessage('')
        try {
          const body = await postJson(API.ui, { runningBg: bg, runningFg: fg })
          setState(body.state)
          setMessage(bg || fg ? '已保存外观设置，左侧正在回答的会话会立即换色。' : '已恢复默认外观。')
          notifyChanged()
        } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
      }
      async function autoGroup() {
        setBusy(true); setError(''); setMessage('')
        try {
          const body = await postJson(API.autoGroup, { minChildren: 2 })
          setState(body.state)
          const created = body.created || []
          const updated = body.updated || []
          setMessage(!created.length && !updated.length
            ? '没有需要归组的 Workspace（同一父目录下至少要有 2 个已注册子目录）。'
            : '已按父目录归组：新建 ' + created.length + ' 个项目' + (created.length ? '（' + created.join('、') + '）' : '') + (updated.length ? '，并入 ' + updated.length + ' 个已有项目' : '') + '。')
          notifyChanged()
        } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
      }
      if (!state) return h('div', { className: 'pw' }, h('h2', { className: 'pw-title' }, '项目工作区（子目录会话）'), h('div', { className: 'pw-muted' }, '正在读取…'))
      const roots = state.roots || []
      const workspaces = state.workspaces || []
      const projects = state.projects || []
      return h('div', { className: 'pw' },
        h('div', { className: 'pw-head' },
          h('div', null,
            h('h2', { className: 'pw-title' }, '项目工作区（子目录会话）'),
            h('p', { className: 'pw-sub' }, '一个项目 = 根目录 + 若干独立子工作区。点「新建项目」选目录、命名并勾选子目录；左侧工作区面板按 项目 → 子工作区 → 会话 展示。')
          ),
          h('div', { className: 'pw-row' },
            h('button', { className: 'pw-btn primary', onClick: function () { setDialog(true) } }, '＋ 新建项目'),
            h('button', { className: 'pw-btn', disabled: busy, onClick: autoGroup }, '按父目录自动归组'),
            h('button', { className: 'pw-btn', onClick: load }, '刷新')
          )
        ),
        error ? h('div', { className: 'pw-msg err' }, error) : null,
        message ? h('div', { className: 'pw-msg' }, message) : null,
        h('div', { className: 'pw-card' },
          h('h3', null, '外观（正在回答的会话）'),
          h('p', { className: 'pw-muted' }, '只影响左侧工作区列表里「正在回答」的会话行；留空即用主题默认色。'),
            h('p', { className: 'pw-muted' }, '侧边栏状态：蓝环＝正在回答，琥珀点＝等你处理，绿点＝已完成未查看；目录图标右上角的小圆点是它下面会话的状态汇总。'),
          h('div', { className: 'pw-row pw-row-wrap' },
            h('label', { className: 'pw-field' },
              h('span', null, '背景色'),
              h('div', { className: 'pw-color-line' },
                h('input', { type: 'color', value: runBg || '#eef2ff', onChange: function (e) { setRunBg(e.target.value) } }),
                h('input', { className: 'pw-input', value: runBg, placeholder: '#eef2ff 或留空', onChange: function (e) { setRunBg(e.target.value) } })
              )
            ),
            h('label', { className: 'pw-field' },
              h('span', null, '文字色'),
              h('div', { className: 'pw-color-line' },
                h('input', { type: 'color', value: runFg || '#1f2937', onChange: function (e) { setRunFg(e.target.value) } }),
                h('input', { className: 'pw-input', value: runFg, placeholder: '#1f2937 或留空', onChange: function (e) { setRunFg(e.target.value) } })
              )
            )
          ),
          h('div', { className: 'pw-preview', style: { background: runBg || undefined, color: runFg || undefined } },
            h('span', { className: 'pw-preview-dot' }),
            h('span', null, '正在回答的会话看起来是这样')
          ),
          h('div', { className: 'pw-row' },
            h('button', { className: 'pw-btn primary', disabled: busy, onClick: function () { saveUi(String(runBg || '').trim(), String(runFg || '').trim()) } }, '保存外观'),
            h('button', { className: 'pw-btn', disabled: busy, onClick: function () { setRunBg(''); setRunFg(''); saveUi('', '') } }, '恢复默认')
          )
        ),
        h('div', { className: 'pw-card' },
          h('h3', null, '项目（根目录 → 子工作区）'),
          projects.length
            ? h('div', { className: 'pw-list' }, projects.map(function (project) {
              return h('div', { className: 'pw-project', key: project.id },
                h('div', { className: 'pw-project-head' },
                  h('div', null,
                    h('div', null, h('b', null, project.name), h('span', { className: 'pw-muted' }, '  ' + project.children.length + ' 个子工作区')),
                    h('div', { className: 'pw-path' }, project.root)
                  ),
                  h('div', { className: 'pw-row' },
                    h('button', { className: 'pw-btn', disabled: busy, onClick: function () { openCreateDialog({ root: project.root, name: project.name }) } }, '添加子工作区'),
                    h('button', { className: 'pw-btn', disabled: busy, onClick: function () { removeProject(project.id) } }, '移出项目树')
                  )
                ),
                project.children.length
                  ? project.children.map(function (child) {
                    return h('div', { className: 'pw-child', key: child.path },
                      h('b', null, child.name),
                      h('span', { className: 'pw-path' }, child.path),
                      child.registered ? h('span', { className: 'pw-muted' }, child.sessionCount + ' 个会话') : h('span', { className: 'pw-muted' }, 'Workspace 已失效'),
                      child.workspaceId ? h('button', { className: 'pw-btn', disabled: busy, onClick: function () { remove(child.workspaceId) } }, '移除注册') : null
                    )
                  })
                  : h('div', { className: 'pw-muted' }, '还没有子工作区')
              )
            }))
            : h('div', { className: 'pw-muted' }, '还没有项目。点右上角「＋ 新建项目」开始。')
        ),
        h('div', { className: 'pw-card' },
          h('h3', null, '手动注册子目录'),
          h('div', { className: 'pw-row' },
            h('input', { className: 'pw-input', placeholder: '例如 D:\\www\\public 或 /home/www/public', value: root, onChange: function (e) { setRoot(e.target.value) }, onKeyDown: function (e) { if (e.key === 'Enter') scan() } }),
            h('button', { className: 'pw-btn', disabled: busy, onClick: scan }, busy ? '扫描中…' : '扫描子目录')
          ),
          h('div', { className: 'pw-muted' }, '只扫描直接子目录；不存在的目录不会被注册，也不会自动创建。')
        ),
        roots.map(function (item) {
          const dirs = item.dirs || []
          const selectedCount = dirs.filter(function (d) { return picked[d.path] }).length
          return h('div', { className: 'pw-card', key: item.root },
            h('div', { className: 'pw-row', style: { justifyContent: 'space-between' } },
              h('div', null, h('h3', null, item.root), h('div', { className: 'pw-muted' }, item.error || (dirs.length + ' 个直接子目录'))),
              h('button', { className: 'pw-btn primary', disabled: busy || !selectedCount, onClick: function () { register(item.root, dirs) } }, '注册选中（' + selectedCount + '）')
            ),
            item.error ? null : h('div', { className: 'pw-list' }, dirs.map(function (dir) {
              return h('label', { className: 'pw-dir', key: dir.path },
                h('input', { type: 'checkbox', checked: !!picked[dir.path], disabled: busy, onChange: function () { setPicked(function (prev) { var next = Object.assign({}, prev); next[dir.path] = !next[dir.path]; return next }) } }),
                h('b', null, dir.name),
                h('span', { className: 'pw-path' }, dir.path),
                dir.registered ? h('span', { className: 'pw-muted' }, '已注册·复用') : null
              )
            }))
          )
        }),
        h('div', { className: 'pw-card' },
          h('h3', null, '已注册 Workspace'),
          workspaces.length ? h('div', { className: 'pw-list' }, workspaces.map(function (ws) {
            return h('div', { className: 'pw-ws', key: ws.workspaceId },
              h('div', null, h('div', null, h('b', null, ws.title)), h('div', { className: 'pw-path' }, ws.path), h('div', { className: 'pw-muted' }, ws.sessionCount + ' 个会话')),
              h('button', { className: 'pw-btn', disabled: busy, onClick: function () { remove(ws.workspaceId) } }, '移除注册')
            )
          })) : h('div', { className: 'pw-muted' }, '还没有注册 Workspace。')
        ),
        h('div', { className: 'pw-card' },
          h('h3', null, '已知限制'),
          h('div', { className: 'pw-muted' }, '原生 Workspace 的会话 cwd 必须等于 Workspace 路径，所以层级只做在插件与侧边栏：「项目 → 子工作区」是展示上的树，DSH 底层仍是多个独立 Workspace；每个会话的沙箱写入边界仍是各自子目录。')
        ),
        dialog ? h(CreateDialog, {
          services: props.services,
          title: '新建项目',
          onClose: function () { setDialog(false) },
          onCreated: function (project, nextState) { setDialog(false); if (nextState) setState(nextState); else load(); setMessage('已创建项目「' + project.name + '」，共 ' + project.children.length + ' 个子工作区。') }
        }) : null
      )
    }
      // ── 右侧顶部会话标签条：最近打开的会话排成一行，点一下切过去 ──
      const LAST_KEY = 'dsh-project-workspaces:last'
      let lastOpenedId = ''
      try { lastOpenedId = String((window.localStorage && window.localStorage.getItem(LAST_KEY)) || '') } catch (err) { lastOpenedId = '' }
      function noteOpened(id) {
        const value = String(id || '')
        if (!value) return
        lastOpenedId = value
        try { if (window.localStorage) window.localStorage.setItem(LAST_KEY, value) } catch (err) { void err }
        try { window.dispatchEvent(new CustomEvent('dsh-project-workspaces:opened', { detail: { id: value } })) } catch (err) { void err }
      }
      const TABS_KEY = 'dsh-project-workspaces:tabs'
      const MAX_TABS = 8
      const BAND_HEIGHT = 36
      function readTabs() {
        try {
          const raw = window.localStorage && window.localStorage.getItem(TABS_KEY)
          const list = raw ? JSON.parse(raw) : null
          return Array.isArray(list) ? list.map(String).filter(Boolean) : []
        } catch (err) { return [] }
      }
      function writeTabs(list) {
        try { if (window.localStorage) window.localStorage.setItem(TABS_KEY, JSON.stringify(list)) } catch (err) { void err }
      }
      function SessionTabs(props) {
        const services = (props && props.services) || {}
        const snap = useSnapshot(services.sessions && services.sessions.list)
        const summaries = {}
        if (snap) {
          if (snap.byId) Object.keys(snap.byId).forEach(function (id) { summaries[String(id)] = snap.byId[id] })
          const items = (snap && snap.items) || []
          for (let i = 0; i < items.length; i += 1) { const item = items[i]; if (item && item.id) summaries[String(item.id)] = item }
        }
        const activeId = String((snap && (snap.activeSessionId || snap.currentSessionId || snap.selectedSessionId
          || snap.activeId || snap.selectedId
          || (snap.active && snap.active.id) || (snap.current && snap.current.id))) || '') || lastOpenedId
        const [order, setOrder] = useState(readTabs)
        const [box, setBox] = useState(null)          // { left, top, width, header }
        const [inlineFallback, setInlineFallback] = useState(false)
        const [dismissed, setDismissed] = useState({})
        const probeRef = React.useRef(null)
        const listRef = React.useRef(null)
        const tabRefs = React.useRef({})
        // 点击标签后保持它原来的位置，不再自动挪到最前面

        // 让标题栏让出 38px，再把标签条贴到它正上方（先推再量，避免量到旧位置）
        useEffect(function () {
          let headerEl = null
          let previousMargin = ''
          function measure() {
            const node = probeRef.current
            if (!node || typeof node.getBoundingClientRect !== 'function') return
            const rect0 = node.getBoundingClientRect()
            if (!rect0) return
            let best = node.parentElement
            let cur = node.parentElement
            for (let i = 0; i < 6 && cur && cur.parentElement; i += 1) {
              const rr = cur.getBoundingClientRect()
              if (!rr || rr.height > 98) break
              if (rr.width > rect0.width + 4) best = cur
              cur = cur.parentElement
            }
            const header = best || node.parentElement
            if (!header || !header.style) return
            if (header !== headerEl) {
              if (headerEl) { try { headerEl.style.marginTop = previousMargin || '' } catch (err) { void err } }
              headerEl = header
              previousMargin = header.style.marginTop
            }
            header.style.marginTop = BAND_HEIGHT + 'px'
            const hr = header.getBoundingClientRect()
            if (!hr || !hr.width) return
            setBox({ left: Math.round(hr.left), top: Math.round(hr.top), width: Math.round(hr.width), header: header })
            try { document.documentElement.style.setProperty('--sbw-band-h', BAND_HEIGHT + 'px') } catch (err) { void err }
          }
          measure()
          const timer = setTimeout(measure, 80)
          const timer2 = setTimeout(function () {
            measure()
            // 量不出来时退回「就地一条」，至少保证能看见能切
            setBox(function (prev) { if (!prev) setInlineFallback(true); return prev })
          }, 400)
          function onResize() { measure() }
          window.addEventListener('resize', onResize)
          let observer = null
          try {
            if (window.ResizeObserver && probeRef.current) {
              observer = new window.ResizeObserver(function () { measure() })
              observer.observe(probeRef.current)
            }
          } catch (err) { void err }
          return function () {
            clearTimeout(timer)
            clearTimeout(timer2)
            window.removeEventListener('resize', onResize)
            if (observer) { try { observer.disconnect() } catch (err) { void err } }
            if (headerEl) { try { headerEl.style.marginTop = previousMargin || '' } catch (err) { void err } }
            try { document.documentElement.style.removeProperty('--sbw-band-h') } catch (err) { void err }
          }
        }, [])
        useEffect(function () {
          function onOpened(event) {
            const id = String((event && event.detail && event.detail.id) || '')
            if (!id) return
            setDismissed(function (prev) { if (!prev[id]) return prev; const next = Object.assign({}, prev); delete next[id]; return next })
            setOrder(function (prev) {
              if (prev.indexOf(id) >= 0) return prev
              const next = prev.concat(id).slice(-MAX_TABS)
              writeTabs(next)
              return next
            })
          }
          window.addEventListener('dsh-project-workspaces:opened', onOpened)
          return function () { window.removeEventListener('dsh-project-workspaces:opened', onOpened) }
        }, [])
        // 新出现的会话（例如「新建会话」）自动补进标签栏
        const knownRef = React.useRef({})
        useEffect(function () {
          const keys = Object.keys(summaries)
          const fresh = []
          for (let i = 0; i < keys.length; i += 1) {
            const key = keys[i]
            if (knownRef.current[key]) continue
            knownRef.current[key] = true
            if (knownRef.current.__ready) fresh.push(key)
          }
          if (!knownRef.current.__ready) { knownRef.current.__ready = true; return }
          if (!fresh.length) return
          fresh.sort(function (a, b) { return (sessionStamp(summaries[b]) || 0) - (sessionStamp(summaries[a]) || 0) })
          noteOpened(fresh[0])
        })
        function drop(id) {
          setDismissed(function (prev) { const next = Object.assign({}, prev); next[id] = true; return next })
          setOrder(function (prev) {
            const next = prev.filter(function (x) { return x !== id })
            writeTabs(next)
            return next
          })
        }
        function openAll() {
          try { window.dispatchEvent(new CustomEvent('dsh-project-workspaces:open-palette')) } catch (err) { void err }
        }
        const highlightId = activeId || ''
        const merged = order.slice()
        if (highlightId && merged.indexOf(highlightId) < 0 && !dismissed[highlightId]) merged.push(highlightId)
        const list = merged.filter(function (id) { return summaries[id] }).slice(0, MAX_TABS)
        if (!list.length) return h('span', { ref: probeRef, className: 'pwt-probe' })
        if (!activeId && list.length) { /* 没有明确当前会话时不高亮 */ }
        const style = box
          ? { left: box.left + 'px', top: (box.top - BAND_HEIGHT) + 'px', width: box.width + 'px', position: 'fixed' }
          : (inlineFallback ? { position: 'relative', width: '100%' } : { position: 'absolute', left: '-9999px', top: '0px', width: '520px' })
        return h('div', { className: 'pwt-band', style: style },
          h('span', { ref: probeRef, className: 'pwt-probe' }),
          list.length
            ? h('div', { className: 'pwt-inner' },
              h('div', {
                className: 'pwt',
                role: 'tablist',
                ref: listRef,
                onWheel: function (e) {
                  const el = listRef.current
                  if (!el || !el.scrollWidth || el.scrollWidth <= el.clientWidth) return
                  if (!e.deltaY) return
                  el.scrollLeft += e.deltaY
                  if (e.preventDefault) e.preventDefault()
                },
              },
                list.map(function (id) {
                  return h('div', { key: 'tab:' + id, ref: function (node) { if (node) tabRefs.current[id] = node }, className: 'pwt-tab' + (highlightId && id === highlightId ? ' on' : ''), role: 'tab', title: sessionLabel(summaries[id]) },
                    h('button', {
                      className: 'pwt-hit',
                      onClick: function (e) {
                        e.stopPropagation()
                        noteOpened(id)
                        if (services.uiWorkspace && typeof services.uiWorkspace.openSession === 'function') services.uiWorkspace.openSession(id)
                      },
                    }, h('span', { className: 'pwt-t' }, sessionLabel(summaries[id]))),
                    h('button', {
                      className: 'pwt-x',
                      title: '从标签栏移除（不会删除会话）',
                      onClick: function (e) { e.stopPropagation(); drop(id) },
                    }, glyph('IconCloseOutlineRegular', 12, '×')))
                })),
              h('button', { className: 'pwt-add', title: '打开会话列表（Ctrl+K）', onClick: function (e) { e.stopPropagation(); openAll() } }, glyph('IconFlatListOutlineRegular', 14, '≡')))
            : null)
      }

    function apply(ctx) {
      const sessions = ctx.get('sessions')
      const workspaces = ctx.get('workspaces')
      const uiWorkspace = ctx.get('uiWorkspace')
      const services = { uiWorkspace: uiWorkspace, workspaces: workspaces, sessions: sessions }
      if (sessions && workspaces) {
        ctx.slots.inject('sidebar.workspaces', function () {
          return ctx.slots.register({
            name: 'sidebar.workspaces',
            priority: -100,
            inject: function () { return { sessions: sessions, workspaces: workspaces, uiWorkspace: uiWorkspace } },
          }, function (props) {
            return h(SidebarBrowser, Object.assign({}, props, { sessions: sessions, workspaces: workspaces, uiWorkspace: uiWorkspace }))
          })
        })
      }
      ctx.slots.inject('settings.section', function () {
        return ctx.slots.register({
          name: 'settings.section',
          id: NS,
          order: 64,
          label: function () { return '项目工作区' },
          inject: function () { return { services: services } },
        }, function (props) { return h(Panel, { services: (props && props.services) || services }) })
      })
      ctx.slots.inject('conversation.header.leading', function () {
        return ctx.slots.register({
          name: 'conversation.header.leading',
          inject: function () { return { services: services } },
        }, function (props) { return h(SessionTabs, { services: (props && props.services) || services }) })
      })
      ctx.slots.inject('shell.overlay', function () {
        return ctx.slots.register({ name: 'shell.overlay', id: NS + '-create', order: 80 }, function () {
          return h(OverlayHost, { services: services })
        })
      })
    }
    exports.name = NS
    exports.inject = ['slots', 'sessions', 'workspaces', 'uiWorkspace']
    exports.apply = apply
    return module.exports
  },
})
