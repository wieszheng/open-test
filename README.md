# Open Test — 自动化测试平台

可视化工作流编排 + 本地 Agent 执行，支持 API 接口测试与 Android App UI 自动化。

```
浏览器（工作流画布）
    │  点击执行
    ▼
后端服务 :8000          ← HTTP/断言/提取/等待 节点在此执行
    │  appUiAction 委派
    ▼
本地 Agent :7357        ← ADB/UI 节点在此执行（需连接 Android 设备）
```

---

## 快速启动

### 1. 后端服务

```bash
cd open-server
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. 前端

```bash
# 项目根目录
npm install
npm run dev          # 默认 http://localhost:5173
```

### 3. 本地 Agent（仅需 App UI 自动化时安装）

```bash
cd cli
pip install -e .                 # 安装 CLI
open-test agent install          # 注册为系统服务，开机自启
open-test agent status           # 验证是否运行
```

> 首次安装后系统服务自动启动，无需手动执行。

---

## 项目结构

```
open-test/
├── src/                          # 前端
│   ├── components/
│   │   ├── WorkflowEditor.tsx    # 工作流画布主页面
│   │   └── workflow/
│   │       ├── nodes.tsx         # 节点组件（各步骤类型的卡片）
│   │       ├── StepPalette.tsx   # 左侧步骤拖拽面板
│   │       ├── PropertyPanel.tsx # 右侧节点配置 + 执行日志
│   │       ├── TestCasePicker.tsx
│   │       ├── RunResultToast.tsx
│   │       └── types.ts
│   └── services/
│       └── api.ts                # 所有后端 API 调用
│
├── open-server/                  # 后端
│   └── app/
│       ├── main.py               # FastAPI 入口
│       ├── executor.py           # 工作流执行引擎
│       ├── run_jobs.py           # RunJob 内存存储 + SSE 事件总线
│       └── routers/
│           ├── run_jobs.py       # 执行任务路由
│           ├── workflows.py      # 工作流 CRUD
│           └── test_cases.py     # 测试用例 CRUD
│
└── cli/                          # 本地 Agent CLI
    └── open_test_agent/
        ├── main.py               # CLI 入口（click）
        ├── agent_server.py       # 本地 Agent HTTP 服务（FastAPI :7357）
        ├── install.py            # 系统服务安装/卸载
        └── drivers/
            └── adb.py            # ADB / uiautomator2 驱动
```

---

## 工作流步骤类型

| 类型 | 执行位置 | 说明 |
|------|---------|------|
| `httpRequest` | 服务端 | HTTP 请求，支持 GET/POST/PUT/DELETE/PATCH |
| `assertion` | 服务端 | 断言：状态码 / 包含文本 / JSONPath / 相等 |
| `extract` | 服务端 | 从响应提取变量，供后续步骤 `{{变量名}}` 引用 |
| `wait` | 服务端 | 等待指定秒数 |
| `condition` | 服务端 | 条件分支 |
| `script` | 服务端 | 自定义脚本（Python/JS/Shell，stub） |
| `sqlQuery` | 服务端 | SQL 查询（stub） |
| `webUiAction` | 服务端 | Web UI 操作（stub） |
| `appUiAction` | 本地 Agent | Android App UI 操作，通过 ADB 执行 |

### 变量传递

在任意字段中使用 `{{变量名}}` 引用 `extract` 步骤提取的变量：

```
# extract 步骤：提取 $.data.token → 变量名 auth_token
# 后续 httpRequest 的 Headers 字段：
{"Authorization": "Bearer {{auth_token}}"}
```

---

## App UI 操作（appUiAction）

### 支持的 action

| action | 参数 | 说明 |
|--------|------|------|
| `launch_app` | `app_id` | 启动 App，如 `com.example.app` |
| `click` | `selector` | 点击组件 |
| `type` | `selector`, `value` | 输入文本 |
| `swipe` | `value` | 滑动方向：`up/down/left/right` |
| `wait_element` | `selector` | 等待组件出现（10s 超时） |
| `screenshot` | — | 截图保存到 `/tmp/` |

### selector 格式

```
XPath:       //android.widget.Button[@text='登录']
Resource ID: com.example.app:id/btn_login
```

---

## 本地 Agent CLI

```bash
open-test agent install      # 安装系统服务（开机自启）
open-test agent uninstall    # 卸载系统服务
open-test agent status       # 查看运行状态 + 已连接设备
open-test agent start        # 前台启动（调试用，Ctrl+C 退出）
```

### Agent HTTP 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 状态 + 已连接设备列表 |
| POST | `/execute` | 执行单个节点 |
| GET | `/logs` | 查看最近执行日志（`?limit=N`） |
| GET | `/logs/stream` | SSE 实时尾随日志 |

**实时查看 Agent 日志（调试用）：**

```bash
curl -N http://localhost:7357/logs/stream
```

---

## 后端 API

### 执行任务（RunJob）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/run-jobs` | 创建并立即执行工作流，返回 `job_id` |
| GET | `/run-jobs/{id}/stream` | SSE 订阅执行事件 |
| POST | `/run-jobs/{id}/node-result` | 浏览器回传本地 Agent 结果 |
| GET | `/run-jobs/{id}` | 查询 Job 状态 |

### SSE 事件类型

```jsonc
{"type": "node_start",  "node_id": "...", "label": "..."}
{"type": "node_done",   "node_id": "...", "success": true, "message": "...", "duration": 0.35}
{"type": "delegate_to_agent", "node_id": "...", "node_data": {...}}   // appUiAction 委派
{"type": "complete",    "success": true,  "message": "4/4 通过"}
{"type": "error",       "message": "..."}
{"type": "heartbeat"}   // 保活，30s 一次
```

### 工作流 / 测试用例

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/test-cases/{id}/flow` | 获取工作流 |
| PUT | `/test-cases/{id}/flow` | 保存工作流 |
| GET | `/test-cases` | 用例列表 |
| POST | `/test-cases` | 创建用例 |
| PUT | `/test-cases/{id}` | 更新用例 |
| DELETE | `/test-cases/{id}` | 删除用例 |

---

## 开发指南

### 本地联调三服务

```bash
# 终端 1：后端
cd open-server && uvicorn app.main:app --reload --port 8000

# 终端 2：前端
npm run dev

# 终端 3：本地 Agent（前台模式，可看日志）
cd cli && open-test agent start
```

### 切换 ADB 真实执行

1. 连接 Android 设备（USB 或 WiFi ADB）
2. 安装 uiautomator2：`pip install open-test-agent[android]`
3. 编辑 [cli/open_test_agent/drivers/adb.py](cli/open_test_agent/drivers/adb.py)，将第 13 行改为：
   ```python
   STUB = False
   ```
4. 重启 Agent：`open-test agent start`

### Flow JSON 格式

工作流以 JSON 存储在数据库，可用 [cli/example_flow.json](cli/example_flow.json) 测试：

```bash
open-test run --file cli/example_flow.json
```

节点结构：

```jsonc
{
  "nodes": [
    {
      "id": "step_1",
      "type": "httpRequest",       // 节点类型
      "position": {"x": 100, "y": 100},
      "data": {
        "label": "获取用户列表",   // 显示名称
        "method": "GET",
        "url": "https://api.example.com/users"
      }
    }
  ],
  "edges": [
    {"id": "e1-2", "source": "step_1", "target": "step_2"}
  ]
}
```

### 执行引擎扩展

在 [open-server/app/executor.py](open-server/app/executor.py) 的 `_execute_node` 中注册新节点类型：

```python
handlers = {
    "httpRequest": _run_http,
    "myCustomNode": _run_my_custom,   # 新增
    ...
}
```

---

## 系统服务说明

| 系统 | 服务类型 | 配置文件 |
|------|---------|---------|
| macOS | launchd LaunchAgent | `~/Library/LaunchAgents/com.opentest.agent.plist` |
| Linux | systemd user service | `~/.config/systemd/user/open-test-agent.service` |
| Windows | 任务计划程序 | 任务名 `open-test-agent` |

服务日志（macOS）：

```bash
tail -f ~/Library/Logs/open-test-agent.log
tail -f ~/Library/Logs/open-test-agent-error.log
```
