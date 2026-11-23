# dsh-project-workspaces

[DeepSeek Harness](https://github.com/deepseek-ai) 插件：一个插件搞定「项目 → 子工作区」——把项目根目录下的直接子目录注册成 DSH 原生 Workspace，记录项目层级，并**用侧边栏替换掉原生左侧工作区区域**（项目 → 子工作区 → 会话），标题栏的 `＋` 就是「新增工作区」弹窗。

- 宿主半边（`lib/index.js`）：`DSH_HOME/project-workspaces.json` 里的层级 + `/dsh-project-workspaces/*` HTTP 路由
- 客户端半边（`client/client.js`）：`sidebar.workspaces`（priority -100）、`settings.section`（设置 → 项目工作区）、`shell.overlay`（新增工作区 / 编辑弹窗）

## 安装

**方式一：从 npm 安装**（推荐）

```bash
cd "$DSH_HOME/profiles/<profile>"
npm install --save dsh-project-workspaces
```

**方式二：本地开发（link）**

```bash
git clone https://github.com/pengxiaozi/dsh-project-workspaces.git <plugins-dir>/dsh-project-workspaces
cd "$DSH_HOME/profiles/<profile>"
npm install --save "dsh-project-workspaces@link:<plugins-dir>/dsh-project-workspaces"
```

然后在同一目录的 `cordis.patch.yml` 里插入：

```yaml
- insert:
    - id: project-workspaces
      name: 'dsh-project-workspaces'
```

重启 DSH（宿主路由只在启动时注册）。

## 使用

三个入口打开同一个弹窗：设置 → 项目工作区；侧边栏工作区标题栏的 `＋`；项目行的 `＋`（给该项目添加子工作区）。

1. **项目目录**：点「浏览…」调原生目录选择器（`uiWorkspace.pickDirectory()`），也可直接粘贴路径
2. **项目名称**：默认取目录名，可改
3. **扫描（可选）** → 得到一棵可展开的目录树，勾选要独立成子工作区的目录（已注册的标「已注册·复用」，勾选后复用原 Workspace，不会重复创建）；
   - 默认只扫 1 层，标题右侧可切 **1 层 / 2 层 / 3 层 / 更深**，逐层往下展开（最多 6 层），勾父节点等于勾整棵子树
   - 自动忽略 `node_modules`、`.git`、`dist`、`build`、`vendor`、`__pycache__` 等依赖/构建目录，并提示忽略了多少个
   **不扫描也能创建**：不点扫描直接点「创建工作区」，会把项目根目录本身注册成一个 Workspace（叶子项目），适合一个目录就是一个项目的情况
4. **创建工作区**：为每个勾选的子目录创建（或复用）独立 Workspace，并把层级写入 `project-workspaces.json`

勾选列表下方提示：同一父目录下的子工作区（如 `public/web`、`public/page`）会在侧边栏自动合并到一个目录节点里——合并只发生在展示层，底层仍是各自独立的 Workspace。

`project-workspaces.json` 结构：

```json
{
  "roots": ["D:\\\\www\\\\site\\\\public"],
  "projects": [
    {
      "id": "d:\\\\www\\\\site\\\\public",
      "root": "D:\\\\www\\\\site\\\\public",
      "name": "site",
      "children": [{ "name": "admin", "path": "D:\\\\www\\\\site\\\\public\\\\admin" }]
    }
  ]
}
```

## 侧边栏（替换原生工作区区域）

- 槽位：`sidebar.workspaces`（single 槽位），**priority: -100** —— single 槽位是「占座」语义，占用者中 priority 数值最小的那个生效；原生 WorkspaceBrowser 用 0，所以用负数抢占。
- 数据来自 `/dsh-project-workspaces/state`（`projects` 层级 + `workspaces` 会话），监听变更后自动刷新
- 标题栏 `＋` 打开新增工作区弹窗，`⟳` 重新拉取 state，`⌕` 内联展开搜索（按 项目名 / 子工作区名 / 会话标题 过滤，命中时自动展开，`Esc` 关闭）
- **单行布局，逐项照抄原生 `Rows.module.css`**：
  - 行高 32px、圆角 `--dsw-radius-md`、行内起点 `calc(var(--dsh-sidebar-row-padding) - var(--dsh-sidebar-paint-inset) + 缩进)`、行间 2px、分组间 4px
  - 行内只有「图标槽 16×20 + 标题（14px / 20px）」：默认显示文件夹图标，**hover 时切换成三角箭头**（和原生一致，不额外占位）
  - 所有操作按钮（`✎` 重命名、`＋` 新建会话 / 添加子工作区）**只在 hover 时出现**，24×24、`margin:-4px`，不做常驻按钮
  - 会话行：左侧是原生 `StateDot` 状态位（占 16px 图标位）——进行中是旋转圆环（`ongoing`）、等你处理是琥珀点（`warning`）、刚跑完未看是绿点（`done`）、其余是灰点（`idle`）；标题缩进一级，右侧显示相对时间（`刚刚` / `N 分钟` / `N 小时` / `N 天`，10px `label-tertiary`），有待处理交互时这一格换成 `待批准` / `待确认` / `待回答`
  - 标题栏 36px、`justify-content:flex-end`、图标按钮 28×28（`--dsw-radius-sm`）、rail 模式 36×36
  - 路径、数量、「未注册」等副信息不单独占一行：路径进 `title` 悬停提示，未注册子目录用暗色文字 + 琥珀色状态点
- 项目节点：点击展开/收起；hover 出 `✎`（编辑弹窗：项目名称 / 别名 / 标签）、`▤`（在资源管理器中打开项目根目录）与 `＋`（添加子工作区，事件 detail 带 `{root, name}`）
- 重命名项目会同时把该项目的子 Workspace 原生标题改成 `新名称 / 子目录名`
- 子工作区节点：点击展开会话，hover 出 `✎`（编辑别名 / 标签）、`▤`（打开该子目录）、`＋` 新建会话（`uiWorkspace.startSession`）；会话行点击直接打开（`uiWorkspace.openSession`），当前会话高亮
- **别名与标签**：项目/子目录都能设别名（显示成 `public(学位申报系统)` 这种形式）和最多 8 个标签（如技术栈），只影响侧边栏显示，不改磁盘目录名；标签渲染成 10px 小 chip，窄侧边栏自动截断
- **编辑弹窗**：`shell.overlay` 里的第二个弹窗，字段为「目录（只读 + 打开目录）」「项目名称」「项目颜色」「别名」「标签（逗号分隔）」，底部实时预览侧边栏显示效果；编辑子工作区时「项目名称」同样可改，保存会连同项目名一起更新；保存走 `POST /dsh-project-workspaces/project/update`
- **快速打开目录**：`▤` 按钮调 `POST /dsh-project-workspaces/open`，宿主用 `explorer.exe`（Windows）/ `open`（macOS）/ `xdg-open`（Linux）拉起资源管理器
- **置顶**：项目行第一个按钮 `📌`（`IconPinOutlineRegular`）切换置顶；置顶的项目单独收在列表最上方的「置顶」分组里，普通项目在后面，顺序由 `/project/pin` 持久化
- **拖拽排序**：项目行可拖拽，拖到另一项目行的上半区插到它前面、下半区插到它后面（拖拽时显示 2px 主色指示线，源行半透明）；跨分组拖拽会先继承目标项目的置顶状态再重排，顺序由 `/project/reorder` 持久化（只提交显示顺序，未列出的项目原样保留）
- **会话导出**：会话行 `⇩` 导出单个会话、子工作区行 `⇩` 导出该工作区的全部会话、项目行 `⇩` 导出整个项目（含所有子工作区）的会话；服务端读 `sessionQuery.readSession` 汇成 Markdown（用户/助手消息、工具调用与结果，跳过 system/developer），文件名 `标签-会话导出-YYYYMMDD.md`，浏览器直接下载
- **临时会话**：标题栏的 `◷` 按钮直接开一个临时会话——在系统临时目录下建 `dsh-temp-<时间戳>` 并注册成工作区，会话立刻打开；临时工作区单独收在侧边栏的「临时会话」分组里，用完点行尾删除即可（只删工作区，不删项目）
- **叶子项目**：没有子工作区的项目直接把自己注册成一个 Workspace，侧边栏里点它就能开会话，不需要先扫描
- **递归扫描**：项目 → 子目录可以多层（`public/web/src`），子工作区按相对路径存进项目，侧边栏会按路径层级自动合并成目录节点
- **别名可留空**：别名只是侧边栏上的补充说明，留空就显示项目名称本身
- **当前会话高亮 + 自动滚动**：正在用的会话在侧边栏里始终有品牌色底 + 左侧 2px 竖条 + 品牌色标题；打开/切换会话时侧边栏自动滚到它，被折叠的工作区与目录、以及超过 6 条的会话列表都会为它自动展开
- **项目颜色**：编辑项目时可以从 8 个色标里挑一个，侧边栏里项目行的文件夹图标随之变色，深色浅色都适配
- **空态与加载骨架**：首次加载先铺 4 行脉冲骨架；没有任何项目时显示图标 + 说明 + 「新增工作区」按钮，筛选无结果时给出对应提示
- **项目状态角标**：项目行右侧用小圆点 + 数字显示该项目下「待处理 / 在跑 / 未读完成」的会话数，不用展开就知道哪个项目还在跑
- **标题栏总览**：窗口标题「工作区」旁边汇总全局待处理与在跑的数量，侧边栏窄的时候也能一眼看到
- **标签筛选**：标题栏下方把项目与子目录的标签做成 chip，点一个只看带该标签的项目，再点取消
- **Ctrl / Cmd + K 快速跳转**：任意位置按下即弹出命令面板，输入几个字筛项目 / 子工作区 / 工作区 / 会话，↑↓ 选择、回车直接打开

- **会话完成提示**：侧边栏订阅槽位给的 `useSessionStatus`（它的快照是 `ReadonlyMap<SessionId, { running, pendingInteraction, completionUnread }>`），当某个会话的 `completionUnread` 由 false 变 true（跑完且不在主视图）时右下角浮出提示条（`已完成`，绿色对勾）；`pendingInteraction` 出现时浮出橙色提示（`等待你处理`）。提示条 6 秒自动消失，点击直接打开该会话，同一会话只保留最新一条
- **会话重命名**：会话行 hover 出 `✎`，就地变成输入框，回车保存 / Esc 取消；走原生 `SessionFace.rename`（`sessions.using(id, { source: 'workspaceOperation' }, ref => ref.binding.session.rename(title))`），成功后侧边栏与原生列表同步更新
- **同父目录自动合并**：子工作区按相对项目根的路径分段聚成树，`public/web`、`public/page` 只出现一个 `public` 节点（右侧显示子工作区数量）
- **会话折叠**：单个工作区最多铺 6 行会话，多出来折成「还有 N 个会话」（展开后可「收起会话」），搜索命中时不受折叠限制
- 不属于任何项目的 Workspace **平铺在项目之后**（上方一条分隔线），不用分组标题；点开照样能看会话、新建会话
- 未注册/已失效的子目录仍会列出（暗色 + 黄点），不隐藏
- 侧边栏折叠为 rail（`wide === false`）时只渲染两枚图标：展开侧边栏 / 新增工作区
- state 接口不可用时回退为按 Workspace 标题 `根 / 子` 归组的旧逻辑
- 图标优先用原生 Fluent 图标（`require('@deepseek-ai/dsh-client-ui-primitives')` 的 `IconFolderOpenRegular` / `IconTriangleRightFillRegular` / `IconNewChatOutlineRegular` / `IconPlusOutlineRegular` / `IconSearchOutlineRegular` / `IconRefreshOutlineRegular` / `IconEditOutlineRegular` / `IconCloseOutlineRegular` / `IconCheckOutlineRegular` / `IconPanelLeftOutlineRegular` / `IconDownloadOutlineRegular` / `IconTrashOutlineRegular`），不可用时回退内联 SVG 或文字，不会白屏
- 全部颜色走 `--dsw-*` 主题令牌（`label-*` / `interactive-bg-hover` / `state-*` / `border-l*`），light/dark 自动跟随

## HTTP 路由（宿主插件）

| 路由 | 方法 | 说明 |
| --- | --- | --- |
| `/dsh-project-workspaces/health` | GET | `{ok:true, plugin}` 探活 |
| `/dsh-project-workspaces/state` | GET | `{ok, dshHome, roots, workspaces, projects}`；项目带 `path / alias / tags`，`projects[].children[]` 带 `alias / tags / registered / workspaceId / sessionCount` |
| `/dsh-project-workspaces/scan` | POST | `{root}` 扫描直接子目录并记住该根目录 |
| `/dsh-project-workspaces/tree` | POST | `{root, depth}` 递归扫描目录树（1–6 层，跳过依赖/构建目录），返回 `{tree, skipped, name}` |
| `/dsh-project-workspaces/register` | POST | `{root, subdirs[]}` 仅注册 Workspace（手动注册入口） |
| `/dsh-project-workspaces/project` | POST | `{root, name, children[]}` 注册子目录 + 写入/更新项目层级（同一根目录覆盖为最新一次勾选） |
| `/dsh-project-workspaces/project/rename` | POST | `{projectId, name}` 重命名项目（`projectId` 也接受项目根目录路径） |
| `/dsh-project-workspaces/project/update` | POST | `{projectId, name?, alias?, tags?, children?: [{path, alias?, tags?}]}` 更新项目名/别名/标签与子目录别名/标签（字段省略则不改；`tags` 支持数组或逗号字符串，最多 8 个） |
| `/dsh-project-workspaces/project/pin` | POST | `{projectId, pinned?}` 置顶/取消置顶（`pinned` 省略时取反），返回 `{ok, project, state}` |
| `/dsh-project-workspaces/project/reorder` | POST | `{projectIds[]}` 按给定顺序重排项目，未列出的项目追加在后面，返回 `{ok, state}` |
| `/dsh-project-workspaces/project/auto-group` | POST | `{minChildren=2}` 按父目录把现有 Workspace 自动归组为项目 |
| `/dsh-project-workspaces/temp-session` | POST | 在系统临时目录建 `dsh-temp-<时间戳>` 并注册工作区，返回 `{ok, workspaceId, path, title, state}` |
| `/dsh-project-workspaces/export` | POST | `{label, sessionIds[]}` 把若干会话渲染成 Markdown 返回 `{ok, filename, count, sessions[], content}`（会话由宿主 `sessionQuery` 读取） |
| `/dsh-project-workspaces/open` | POST | `{path}` 结束后台进程打开该目录（`explorer.exe` / `open` / `xdg-open`） |
| `/dsh-project-workspaces/project/remove` | POST | `{projectId}` 只把项目移出树，Workspace 会话历史保留 |
| `/dsh-project-workspaces/remove` | POST | `{workspaceId}` 删除 Workspace 注册（不删磁盘目录和会话记录） |

校验：子目录必须存在、必须是直接子目录（`relative()` 越界检查），不自动创建磁盘目录。

## 前端事件

- `dsh-project-workspaces:open-create`：`window` CustomEvent，`detail = { root?, name? }`，打开「新增工作区」弹窗（带 `root` 时是「给该项目添加子工作区」）。插件内部也走同一条总线（`openCreateDialog()`），事件保留兼容性。
- `dsh-project-workspaces:changed`：项目/Workspace 变更后广播，侧边栏据此刷新。

弹窗挂在 `shell.overlay` 槽位，不依赖设置页是否打开；样式同样走 `--dsw-*` 令牌（`bg-layer-1` / `border-l2` / `button-primary-fill` / `radius-md` / `radius-xl`），主按钮 `var(--dsw-alias-button-primary-fill, #4d6bfe)`。

## 已知限制

DSH 原生 Workspace 不能嵌套：会话 cwd 必须等于 Workspace 路径，所以「项目 → 子工作区」是插件层的树，底层仍是多个独立 Workspace，每个会话的写入沙箱边界是各自子目录。

替换原生工作区区域后，白板上补齐了置顶与拖拽排序（项目层）；原生其余能力不继承：归档、原生工作区对话框、`sidebar.workspaces.directoryFlow` 子槽位都不会出现。会话删除/归档请用会话标题栏菜单，Workspace 管理走「设置 → 项目工作区」。

宿主侧路由只在 DSH 启动时注册：改了 `lib/index.js` 必须完全退出 DSH 再打开；客户端侧（`client/client.js`）改完 F5 即可。

## 目录结构

```
client/client.js      客户端半边：侧边栏（替换原生工作区区域）、新增工作区弹窗、编辑弹窗、设置面板
lib/index.js          宿主半边：project-workspaces.json 持久化 + 16 条 HTTP 路由（含临时会话 / 导出 / 置顶 / 拖拽排序 / 递归扫描）
cordis.patch.yml      Loader patch（insert project-workspaces）
```

## License

MIT
