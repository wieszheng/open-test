/**
 * 自动化工作流编排页面
 * 核心理念：选择测试用例 → 为该用例编排自动化执行步骤流
 * 基于 React Flow (@xyflow/react) 实现
 */
import { useState, useCallback, useRef, useMemo, useEffect, type DragEvent } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  reconnectEdge,
  MarkerType,
  ConnectionLineType,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Save,
  Play,
  Search,
  ChevronRight,
  ChevronLeft,
  Layers,
  GripVertical,
  Workflow,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Trash2,
  Settings,
  X,
  FlaskConical,
  Zap,
  Globe,
  Cpu,
  MousePointerClick,
  type LucideIcon,
} from "lucide-react"
import {
  nodeTypes,
  STEP_TEMPLATES,
  STEP_CATEGORIES,
} from "@/components/workflow/nodes"
import { fetchTestCases, type TestCase } from "@/services/api"

// ===================== 类型定义 =====================

/** 测试用例的自动化步骤流 */
interface AutomationFlow {
  testCaseId: number
  testCase: TestCase
  nodes: Node[]
  edges: Edge[]
  lastModified?: string
}

// ===================== Mock 测试用例列表 =====================

const MOCK_TEST_CASES: TestCase[] = [
  { id: 1, name: "用户登录接口测试", description: "POST /api/v1/login 验证用户名/密码正确返回 token，错误返回 401", case_type: "api", priority: "P0", status: "active", module: "用户", preconditions: "用户已注册", test_steps: "1.发送登录请求 2.校验响应", expected_results: "返回200+token", author: "张三", tags: ["login", "auth"], is_automated: true, is_parallel: true, total_runs: 128, passed_runs: 126, failed_runs: 2, pass_rate: 98, avg_duration: 1.2, flaky: false, created_at: "2026-01-01", updated_at: "2026-04-10" },
  { id: 2, name: "创建订单接口测试", description: "POST /api/v1/orders 验证创建订单、库存扣减、价格计算", case_type: "api", priority: "P0", status: "active", module: "订单", preconditions: "用户已登录，商品存在", test_steps: "1.获取token 2.创建订单 3.校验订单数据", expected_results: "订单创建成功", author: "李四", tags: ["order", "create"], is_automated: true, is_parallel: false, total_runs: 95, passed_runs: 90, failed_runs: 5, pass_rate: 94, avg_duration: 2.8, flaky: true, created_at: "2026-01-15", updated_at: "2026-04-08" },
  { id: 3, name: "注册页面 UI 测试", description: "验证注册表单各字段校验、密码强度提示、注册提交流程", case_type: "ui", priority: "P0", status: "active", module: "用户", preconditions: "无", test_steps: "1.打开注册页 2.验证表单校验 3.提交注册", expected_results: "注册成功跳转", author: "王五", tags: ["register", "ui"], is_automated: true, is_parallel: false, total_runs: 50, passed_runs: 48, failed_runs: 2, pass_rate: 96, avg_duration: 8.5, flaky: false, created_at: "2026-02-01", updated_at: "2026-04-05" },
  { id: 4, name: "商品搜索接口测试", description: "GET /api/v1/products?q=xxx 验证关键词搜索、分页、排序", case_type: "api", priority: "P1", status: "active", module: "商品", preconditions: "无", test_steps: "1.搜索商品 2.校验结果", expected_results: "搜索结果正确", author: "张三", tags: ["search", "product"], is_automated: false, is_parallel: true, total_runs: 80, passed_runs: 79, failed_runs: 1, pass_rate: 99, avg_duration: 0.8, flaky: false, created_at: "2026-01-20", updated_at: "2026-04-11" },
  { id: 5, name: "购物车结算 E2E 测试", description: "从加入购物车到确认支付完成的完整流程", case_type: "e2e", priority: "P0", status: "active", module: "支付", preconditions: "用户已登录、购物车有商品", test_steps: "1.查看购物车 2.下单 3.支付 4.校验", expected_results: "支付成功", author: "赵六", tags: ["payment", "e2e"], is_automated: true, is_parallel: false, total_runs: 30, passed_runs: 28, failed_runs: 2, pass_rate: 93, avg_duration: 15.2, flaky: true, created_at: "2026-03-01", updated_at: "2026-04-12" },
  { id: 6, name: "用户权限校验测试", description: "验证不同角色（admin/editor/viewer）的接口权限边界", case_type: "api", priority: "P1", status: "active", module: "权限", preconditions: "多角色账户", test_steps: "1.以各角色登录 2.请求受限接口", expected_results: "权限拦截正确", author: "李四", tags: ["auth", "rbac"], is_automated: false, is_parallel: true, total_runs: 40, passed_runs: 38, failed_runs: 2, pass_rate: 95, avg_duration: 3.5, flaky: false, created_at: "2026-02-10", updated_at: "2026-04-09" },
]

// ===================== Mock 已有自动化步骤流 =====================

const MOCK_FLOWS: Record<number, { nodes: Node[]; edges: Edge[] }> = {
  1: {
    // 用户登录接口测试的自动化步骤
    nodes: [
      { id: "s1", type: "httpRequest", position: { x: 0, y: 120 }, data: { label: "登录请求", method: "POST", url: "/api/v1/login", body: '{ "username": "test", "password": "123456" }', status: "success" } },
      { id: "s2", type: "assertion", position: { x: 320, y: 40 }, data: { label: "校验状态码", assertType: "status_code", expression: "response.status", expected: "200", status: "success" } },
      { id: "s3", type: "extract", position: { x: 320, y: 200 }, data: { label: "提取 Token", source: "json_path", expression: "$.data.token", varName: "auth_token", status: "success" } },
      { id: "s4", type: "assertion", position: { x: 620, y: 40 }, data: { label: "校验 Token 非空", assertType: "json_path", expression: "$.data.token", expected: "not_empty", status: "success" } },
      { id: "s5", type: "httpRequest", position: { x: 620, y: 200 }, data: { label: "获取用户信息", method: "GET", url: "/api/v1/user/profile", status: "success" } },
      { id: "s6", type: "assertion", position: { x: 920, y: 120 }, data: { label: "校验用户名", assertType: "json_path", expression: "$.data.username", expected: "test", status: "success" } },
    ],
    edges: [
      { id: "e1-2", source: "s1", target: "s2" },
      { id: "e1-3", source: "s1", target: "s3" },
      { id: "e2-4", source: "s2", target: "s4" },
      { id: "e3-5", source: "s3", target: "s5", animated: true, label: "use token" },
      { id: "e4-6", source: "s4", target: "s6" },
      { id: "e5-6", source: "s5", target: "s6" },
    ],
  },
  3: {
    // 注册页面 UI 测试的自动化步骤
    nodes: [
      { id: "s1", type: "webUiAction", position: { x: 0, y: 120 }, data: { label: "打开注册页", action: "navigate", url: "https://app.example.com/register" } },
      { id: "s2", type: "webUiAction", position: { x: 300, y: 40 }, data: { label: "输入用户名", action: "type", selector: "#username", value: "newuser01" } },
      { id: "s3", type: "webUiAction", position: { x: 300, y: 200 }, data: { label: "输入密码", action: "type", selector: "#password", value: "Abc@123456" } },
      { id: "s4", type: "webUiAction", position: { x: 580, y: 120 }, data: { label: "点击注册按钮", action: "click", selector: "button[type=submit]" } },
      { id: "s5", type: "wait", position: { x: 820, y: 120 }, data: { label: "等待跳转", seconds: 2 } },
      { id: "s6", type: "assertion", position: { x: 1020, y: 120 }, data: { label: "校验跳转成功", assertType: "contains", expression: "window.location", expected: "/dashboard" } },
    ],
    edges: [
      { id: "e1-2", source: "s1", target: "s2" },
      { id: "e1-3", source: "s1", target: "s3" },
      { id: "e2-4", source: "s2", target: "s4" },
      { id: "e3-4", source: "s3", target: "s4" },
      { id: "e4-5", source: "s4", target: "s5" },
      { id: "e5-6", source: "s5", target: "s6" },
    ],
  },
  2: {
    // 创建订单接口测试的自动化步骤
    nodes: [
      { id: "s1", type: "httpRequest", position: { x: 0, y: 120 }, data: { label: "用户登录", method: "POST", url: "/api/v1/login", body: '{"username":"buyer","password":"pass"}' } },
      { id: "s2", type: "extract", position: { x: 300, y: 120 }, data: { label: "提取 Token", source: "json_path", expression: "$.data.token", varName: "token" } },
      { id: "s3", type: "sqlQuery", position: { x: 580, y: 40 }, data: { label: "查询库存", connection: "prod_db", query: "SELECT stock FROM products WHERE id=1" } },
      { id: "s4", type: "httpRequest", position: { x: 580, y: 200 }, data: { label: "创建订单", method: "POST", url: "/api/v1/orders", body: '{"product_id":1,"qty":1}' } },
      { id: "s5", type: "assertion", position: { x: 880, y: 120 }, data: { label: "校验订单创建", assertType: "status_code", expression: "response.status", expected: "201" } },
      { id: "s6", type: "sqlQuery", position: { x: 880, y: 280 }, data: { label: "校验库存扣减", connection: "prod_db", query: "SELECT stock FROM products WHERE id=1" } },
    ],
    edges: [
      { id: "e1-2", source: "s1", target: "s2" },
      { id: "e2-3", source: "s2", target: "s3" },
      { id: "e2-4", source: "s2", target: "s4", animated: true },
      { id: "e4-5", source: "s4", target: "s5" },
      { id: "e4-6", source: "s4", target: "s6" },
    ],
  },
}

// ===================== 步骤面板（左侧拖拽区） =====================

function StepPalette({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCats, setExpandedCats] = useState<string[]>(STEP_CATEGORIES.map((c) => c.id))

  const toggleCat = (id: string) =>
    setExpandedCats((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id])

  const filteredTemplates = useMemo(() => {
    if (!searchTerm.trim()) return STEP_TEMPLATES
    const t = searchTerm.toLowerCase()
    return STEP_TEMPLATES.filter((n) => n.label.includes(t) || n.description.includes(t))
  }, [searchTerm])

  const onDragStart = (event: DragEvent, template: typeof STEP_TEMPLATES[0]) => {
    event.dataTransfer.setData("application/reactflow-type", template.type)
    event.dataTransfer.setData("application/reactflow-data", JSON.stringify(template.defaultData))
    event.dataTransfer.effectAllowed = "move"
  }

  return (
    <div className={cn(
      "shrink-0 h-full bg-sidebar border-r border-white/5 transition-all duration-300 flex flex-col z-10",
      collapsed ? "w-0 overflow-hidden" : "w-[236px]",
    )}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-coral" />
          <span className="text-sm font-semibold">步骤面板</span>
        </div>
        <button onClick={onToggle} className="p-1 rounded-md hover:bg-muted/50 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索步骤..."
            className="h-8 pl-8 text-xs rounded-lg bg-muted/30 border-white/5"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 pb-3 space-y-1">
          {STEP_CATEGORIES.map((cat) => {
            const CatIcon = cat.icon
            const isExpanded = expandedCats.includes(cat.id)
            const catTemplates = filteredTemplates.filter((t) => t.category === cat.id)
            if (catTemplates.length === 0 && searchTerm) return null
            return (
              <div key={cat.id}>
                <button
                  onClick={() => toggleCat(cat.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md"
                >
                  <ChevronRight className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-90")} />
                  <CatIcon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                  <Badge variant="secondary" className="ml-auto text-[9px] px-1.5 py-0 h-4 bg-muted/50">{catTemplates.length}</Badge>
                </button>
                {isExpanded && (
                  <div className="ml-2 space-y-0.5 mt-0.5">
                    {catTemplates.map((template, i) => {
                      const Icon = template.icon
                      return (
                        <div
                          key={`${template.type}-${i}`}
                          draggable
                          onDragStart={(e) => onDragStart(e, template)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing border border-transparent hover:border-white/10 transition-all hover:bg-muted/20 group"
                        >
                          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-muted/40 border border-white/5">
                            <Icon className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium truncate">{template.label}</p>
                            <p className="text-[9px] text-muted-foreground/50 truncate">{template.description}</p>
                          </div>
                          <GripVertical className="w-3 h-3 text-muted-foreground/15 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

// ===================== 属性面板（右侧） =====================

function PropertyPanel({
  node,
  onClose,
  onUpdate,
  onDelete,
}: {
  node: Node | null
  onClose: () => void
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
}) {
  if (!node) return null
  const d = node.data as Record<string, unknown>

  const setField = (key: string, value: unknown) => onUpdate(node.id, { ...d, [key]: value })

  return (
    <div className="w-72 shrink-0 h-full bg-sidebar border-l border-white/5 flex flex-col z-10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">步骤配置</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-muted/50 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {/* 步骤名称 */}
          <FieldGroup label="步骤名称">
            <Input value={(d.label as string) || ""} onChange={(e) => setField("label", e.target.value)} className="h-8 text-sm rounded-lg" />
          </FieldGroup>

          {/* ---- HTTP 请求配置 ---- */}
          {node.type === "httpRequest" && (
            <>
              <FieldGroup label="请求方法">
                <Select value={(d.method as string) || "GET"} onValueChange={(v) => setField("method", v)}>
                  <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="URL">
                <Input value={(d.url as string) || ""} onChange={(e) => setField("url", e.target.value)} placeholder="/api/v1/users" className="h-8 text-xs font-mono rounded-lg" />
              </FieldGroup>
              <FieldGroup label="Headers (JSON)">
                <Textarea value={(d.headers as string) || ""} onChange={(e) => setField("headers", e.target.value)} placeholder='{"Authorization":"Bearer {{token}}"}' rows={3} className="text-xs font-mono rounded-lg resize-none" />
              </FieldGroup>
              <FieldGroup label="Body (JSON)">
                <Textarea value={(d.body as string) || ""} onChange={(e) => setField("body", e.target.value)} placeholder='{"key":"value"}' rows={4} className="text-xs font-mono rounded-lg resize-none" />
              </FieldGroup>
              <FieldGroup label="超时 (ms)">
                <Input type="number" value={(d.timeout as number) || 30000} onChange={(e) => setField("timeout", Number(e.target.value))} className="h-8 text-sm rounded-lg" />
              </FieldGroup>
            </>
          )}

          {/* ---- Web UI 操作配置 ---- */}
          {node.type === "webUiAction" && (
            <>
              <FieldGroup label="操作类型">
                <Select value={(d.action as string) || "click"} onValueChange={(v) => setField("action", v)}>
                  <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="navigate">打开Web页面</SelectItem>
                    <SelectItem value="click">点击Web元素</SelectItem>
                    <SelectItem value="type">输入文本(Web)</SelectItem>
                    <SelectItem value="select">选择下拉(Web)</SelectItem>
                    <SelectItem value="wait_element">等待Web元素</SelectItem>
                    <SelectItem value="screenshot">Web截图</SelectItem>
                    <SelectItem value="upload">Web上传文件</SelectItem>
                    <SelectItem value="scroll">滚动Web页面</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              {(d.action === "navigate") ? (
                <FieldGroup label="URL">
                  <Input value={(d.url as string) || ""} onChange={(e) => setField("url", e.target.value)} placeholder="https://example.com" className="h-8 text-xs font-mono rounded-lg" />
                </FieldGroup>
              ) : (
                <FieldGroup label="元素选择器">
                  <Input value={(d.selector as string) || ""} onChange={(e) => setField("selector", e.target.value)} placeholder="#submit-btn / .input-name" className="h-8 text-xs font-mono rounded-lg" />
                </FieldGroup>
              )}
              {["type", "upload"].includes(d.action as string) && (
                <FieldGroup label={d.action === "upload" ? "文件路径" : "输入值"}>
                  <Input value={(d.value as string) || ""} onChange={(e) => setField("value", e.target.value)} className="h-8 text-xs rounded-lg" />
                </FieldGroup>
              )}
            </>
          )}

          {/* ---- App UI 操作配置 ---- */}
          {node.type === "appUiAction" && (
            <>
              <FieldGroup label="操作类型">
                <Select value={(d.action as string) || "click"} onValueChange={(v) => setField("action", v)}>
                  <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="launch_app">启动 App</SelectItem>
                    <SelectItem value="click">点击App组件</SelectItem>
                    <SelectItem value="type">输入文本(App)</SelectItem>
                    <SelectItem value="swipe">屏幕滑动</SelectItem>
                    <SelectItem value="wait_element">等待App组件</SelectItem>
                    <SelectItem value="screenshot">App截图</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              {(d.action === "launch_app") ? (
                <FieldGroup label="App Package ID" description="例如：com.example.app">
                  <Input value={(d.app_id as string) || ""} onChange={(e) => setField("app_id", e.target.value)} placeholder="com.example.app" className="h-8 text-xs font-mono rounded-lg" />
                </FieldGroup>
              ) : (
                <FieldGroup label="组件选择器" description="XPath 或 Resource ID">
                  <Input value={(d.selector as string) || ""} onChange={(e) => setField("selector", e.target.value)} placeholder="//android.widget.Button[@text='OK']" className="h-8 text-xs font-mono rounded-lg" />
                </FieldGroup>
              )}
              {["type", "swipe"].includes(d.action as string) && (
                <FieldGroup label={d.action === "swipe" ? "滑动方向(up/down/left/right)" : "输入值"}>
                  <Input value={(d.value as string) || ""} onChange={(e) => setField("value", e.target.value)} className="h-8 text-xs rounded-lg" />
                </FieldGroup>
              )}
            </>
          )}

          {/* ---- SQL 配置 ---- */}
          {node.type === "sqlQuery" && (
            <>
              <FieldGroup label="数据库连接">
                <Input value={(d.connection as string) || ""} onChange={(e) => setField("connection", e.target.value)} placeholder="prod_db" className="h-8 text-sm rounded-lg" />
              </FieldGroup>
              <FieldGroup label="SQL 语句">
                <Textarea value={(d.query as string) || ""} onChange={(e) => setField("query", e.target.value)} placeholder="SELECT * FROM users WHERE id = ?" rows={4} className="text-xs font-mono rounded-lg resize-none" />
              </FieldGroup>
              <FieldGroup label="结果存入变量">
                <Input value={(d.extractVar as string) || ""} onChange={(e) => setField("extractVar", e.target.value)} placeholder="sql_result" className="h-8 text-xs font-mono rounded-lg" />
              </FieldGroup>
            </>
          )}

          {/* ---- 断言配置 ---- */}
          {node.type === "assertion" && (
            <>
              <FieldGroup label="断言类型">
                <Select value={(d.assertType as string) || "status_code"} onValueChange={(v) => setField("assertType", v)}>
                  <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status_code">状态码</SelectItem>
                    <SelectItem value="json_path">JSON Path</SelectItem>
                    <SelectItem value="contains">包含文本</SelectItem>
                    <SelectItem value="equals">完全相等</SelectItem>
                    <SelectItem value="regex">正则匹配</SelectItem>
                    <SelectItem value="schema">JSON Schema</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="表达式">
                <Input value={(d.expression as string) || ""} onChange={(e) => setField("expression", e.target.value)} placeholder="$.data.token" className="h-8 text-xs font-mono rounded-lg" />
              </FieldGroup>
              <FieldGroup label="期望值">
                <Input value={(d.expected as string) || ""} onChange={(e) => setField("expected", e.target.value)} placeholder="200" className="h-8 text-xs font-mono rounded-lg" />
              </FieldGroup>
            </>
          )}

          {/* ---- 变量提取配置 ---- */}
          {node.type === "extract" && (
            <>
              <FieldGroup label="提取方式">
                <Select value={(d.source as string) || "json_path"} onValueChange={(v) => setField("source", v)}>
                  <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json_path">JSONPath</SelectItem>
                    <SelectItem value="regex">正则匹配</SelectItem>
                    <SelectItem value="header">Response Header</SelectItem>
                    <SelectItem value="cookie">Cookie</SelectItem>
                    <SelectItem value="html_css">CSS 选择器</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="表达式">
                <Input value={(d.expression as string) || ""} onChange={(e) => setField("expression", e.target.value)} placeholder="$.data.token" className="h-8 text-xs font-mono rounded-lg" />
              </FieldGroup>
              <FieldGroup label="变量名">
                <Input value={(d.varName as string) || ""} onChange={(e) => setField("varName", e.target.value)} placeholder="auth_token" className="h-8 text-xs font-mono rounded-lg" />
              </FieldGroup>
            </>
          )}

          {/* ---- 脚本配置 ---- */}
          {node.type === "script" && (
            <>
              <FieldGroup label="脚本语言">
                <Select value={(d.language as string) || "python"} onValueChange={(v) => setField("language", v)}>
                  <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="shell">Shell</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="代码">
                <Textarea value={(d.code as string) || ""} onChange={(e) => setField("code", e.target.value)} placeholder="# your code here" rows={8} className="text-xs font-mono rounded-lg resize-none" />
              </FieldGroup>
            </>
          )}

          {/* ---- 等待配置 ---- */}
          {node.type === "wait" && (
            <FieldGroup label="等待秒数">
              <Input type="number" value={(d.seconds as number) || 2} onChange={(e) => setField("seconds", Number(e.target.value))} className="h-8 text-sm rounded-lg" />
            </FieldGroup>
          )}

          {/* ---- 条件配置 ---- */}
          {node.type === "condition" && (
            <FieldGroup label="条件表达式">
              <Textarea value={(d.expression as string) || ""} onChange={(e) => setField("expression", e.target.value)} placeholder="response.status === 200" rows={3} className="text-xs font-mono rounded-lg resize-none" />
            </FieldGroup>
          )}

          {/* 删除 */}
          <div className="pt-3 border-t border-white/5">
            <Button variant="destructive" size="sm" className="w-full rounded-xl h-8" onClick={() => onDelete(node.id)}>
              <Trash2 className="w-3.5 h-3.5 mr-2" />删除步骤
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

// ===================== 测试用例选择器 (Dialog) =====================

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function TestCasePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (tc: TestCase) => void
}) {
  const [cases, setCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetchTestCases({ limit: 100 })
      .then(setCases)
      .catch(() => setCases(MOCK_TEST_CASES))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = useMemo(() => {
    if (!search.trim()) return cases
    const s = search.toLowerCase()
    return cases.filter((c) => c.name.toLowerCase().includes(s) || c.description.toLowerCase().includes(s))
  }, [cases, search])

  const PRIORITY_COLORS: Record<string, string> = {
    P0: "bg-red-500/10 text-red-500 border-red-500/20",
    P1: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    P2: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    P3: "bg-green-500/10 text-green-500 border-green-500/20",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-coral" />
            选择要编排的测试用例
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="搜索用例名称..." className="pl-9 h-9 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">暂无匹配的测试用例</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((tc) => (
                <div
                  key={tc.id}
                  onClick={() => { onSelect(tc); onOpenChange(false) }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-sidebar hover:bg-muted/30 cursor-pointer transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium truncate group-hover:text-coral transition-colors">{tc.name}</p>
                      <Badge className={cn("text-[10px] px-1.5 py-0 rounded-full shrink-0", PRIORITY_COLORS[tc.priority])}>{tc.priority}</Badge>
                      {MOCK_FLOWS[tc.id] && (
                        <Badge className="text-[10px] px-1.5 py-0 rounded-full bg-green-500/10 text-green-400 border-green-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />已编排
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{tc.description || "暂无描述"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// ===================== 主组件: 自动化步骤流画布 =====================

const TYPE_META: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  api: { icon: Globe, label: "API", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  ui: { icon: MousePointerClick, label: "UI", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  e2e: { icon: Workflow, label: "E2E", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  unit: { icon: Cpu, label: "单元", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  perf: { icon: Zap, label: "性能", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
}

export function WorkflowEditor() {
  const [testCase, setTestCase] = useState<TestCase | null>(null)
  const [tcPickerOpen, setTcPickerOpen] = useState(false)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)

  // 当选择新的用例时，加载其流
  useEffect(() => {
    if (testCase && MOCK_FLOWS[testCase.id]) {
      setNodes(MOCK_FLOWS[testCase.id].nodes)
      setEdges(
        MOCK_FLOWS[testCase.id].edges.map((e) => ({
          ...e,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
        }))
      )
    } else {
      setNodes([])
      setEdges([])
    }
  }, [testCase, setNodes, setEdges])

  // 连接
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({
          ...params,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
        }, eds),
      ),
    [setEdges],
  )

  const onReconnect = useCallback(
    (oldEdge: Edge, newConn: Connection) => setEdges((els) => reconnectEdge(oldEdge, newConn, els)),
    [setEdges],
  )

  // 拖放
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData("application/reactflow-type")
      const dataStr = event.dataTransfer.getData("application/reactflow-data")
      if (!type || !rfInstance) return
      const position = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      setNodes((nds) => nds.concat({ id: `step_${Date.now()}`, type, position, data: JSON.parse(dataStr) }))
    },
    [rfInstance, setNodes],
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => setSelectedNode(node), [])
  const onPaneClick = useCallback(() => setSelectedNode(null), [])

  const onUpdateNode = useCallback(
    (id: string, data: Record<string, unknown>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data } : n)))
      setSelectedNode((prev) => (prev?.id === id ? { ...prev, data } : prev))
    },
    [setNodes],
  )

  const onDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
      setSelectedNode(null)
    },
    [setNodes, setEdges],
  )

  // 模拟保存
  const handleSave = useCallback(() => {
    setIsSaving(true)
    setTimeout(() => setIsSaving(false), 800)
  }, [])

  // 模拟运行步骤
  const handleRun = useCallback(() => {
    setIsRunning(true)
    const ids = nodes.map((n) => n.id)
    let i = 0
    const iv = setInterval(() => {
      if (i >= ids.length) { clearInterval(iv); setIsRunning(false); return }
      const nid = ids[i]
      setNodes((nds) => nds.map((n) => n.id === nid ? { ...n, data: { ...n.data, status: "running" } } : n))
      setTimeout(() => {
        setNodes((nds) => nds.map((n) => n.id === nid ? { ...n, data: { ...n.data, status: Math.random() > 0.12 ? "success" : "error" } } : n))
      }, 500)
      i++
    }, 800)
  }, [nodes, setNodes])

  const tm = testCase ? (TYPE_META[testCase.case_type] || TYPE_META.api) : null

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] pt-14">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-sidebar/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          {panelCollapsed && (
            <button onClick={() => setPanelCollapsed(false)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* 测试用例信息 或 提示绑定 */}
          {testCase && tm ? (
            <div className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1.5 pr-3 rounded-lg transition-colors border border-transparent hover:border-white/10" onClick={() => setTcPickerOpen(true)}>
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center border shrink-0", tm.color.replace("text-", "bg-").split(" ")[0], tm.color.split(" ").slice(2).join(" "))}>
                <tm.icon className={cn("w-3.5 h-3.5", tm.color.split(" ")[1])} />
              </div>
              <div>
                <span className="text-sm font-semibold">{testCase.name}</span>
                <div className="flex items-center gap-1.5 -mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{testCase.module}</span>
                </div>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="rounded-xl h-9 border-dashed border-white/20 bg-transparent hover:bg-white/5" onClick={() => setTcPickerOpen(true)}>
              <FlaskConical className="w-4 h-4 mr-2 text-coral" />
              选择测试用例
            </Button>
          )}

        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground mr-2">
            {nodes.length} 步骤 · {edges.length} 连接
          </div>
          <Button variant="ghost" size="sm" className="rounded-xl h-8" onClick={handleSave} disabled={isSaving || !testCase}>
            {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            保存
          </Button>
          <Button size="sm" className="rounded-xl h-8 bg-coral hover:bg-coral/90" onClick={handleRun} disabled={isRunning || !testCase || nodes.length === 0}>
            {isRunning ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
            {isRunning ? "执行中..." : "执行"}
          </Button>
        </div>
      </div>

      {/* 主区域 */}
      <div className="flex flex-1 overflow-hidden">
        <StepPalette collapsed={panelCollapsed} onToggle={() => setPanelCollapsed(true)} />

        {/* React Flow 画布 */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            connectionLineType={ConnectionLineType.SmoothStep}
            defaultEdgeOptions={{
              type: "smoothstep",
              markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
            }}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            snapToGrid
            snapGrid={[16, 16]}
            deleteKeyCode={["Backspace", "Delete"]}
            className="workflow-canvas"
          >
            <Background gap={16} size={1} className="!bg-background" />
            <Controls className="!rounded-xl !border-white/10 !bg-sidebar/90 !backdrop-blur-sm !shadow-lg" />
            <MiniMap
              className="!rounded-xl !border-white/10 !bg-sidebar/90 !backdrop-blur-sm"
              nodeColor={(node) => {
                const cm: Record<string, string> = {
                  httpRequest: "#3b82f6", webUiAction: "#f97316", appUiAction: "#a855f7", sqlQuery: "#10b981",
                  assertion: "#8b5cf6", extract: "#06b6d4", script: "#f59e0b",
                  wait: "#64748b", condition: "#ec4899",
                }
                return cm[node.type || ""] || "#6b7280"
              }}
              maskColor="rgba(0,0,0,0.08)"
            />
            {/* 空画布占位 */}
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="text-center mt-40 pointer-events-none select-none">
                  <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-4">
                    <Workflow className="w-8 h-8 text-muted-foreground/20" />
                  </div>
                  {testCase ? (
                    <p className="text-sm text-muted-foreground/40 mb-1">从左侧面板拖拽步骤到画布</p>
                  ) : (
                    <p className="text-sm text-muted-foreground/40 mb-1">请先在控制栏选择测试用例</p>
                  )}
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* 属性面板 */}
        {selectedNode && (
          <PropertyPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onUpdate={onUpdateNode}
            onDelete={onDeleteNode}
          />
        )}
      </div>

      <TestCasePickerDialog
        open={tcPickerOpen}
        onOpenChange={setTcPickerOpen}
        onSelect={setTestCase}
      />
    </div>
  )
}
