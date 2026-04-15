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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Save,
  Play,
  Search,
  ChevronRight,
  Layers,
  GripVertical,
  Workflow,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  Settings,
  X,
  FlaskConical,
  Zap,
  Globe,
  Cpu,
  MousePointerClick,
  Terminal,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from "lucide-react"
import {
  nodeTypes,
  STEP_TEMPLATES,
  STEP_CATEGORIES,
} from "@/components/workflow/nodes"
import { fetchTestCases, fetchFlow, saveFlow, fetchWorkflowedCaseIds, type TestCase } from "@/services/api"

// ===================== 类型定义 =====================

/** 执行日志条目 */
interface LogEntry {
  nodeId: string
  label: string
  status: "running" | "success" | "error"
  duration?: number
  message?: string
  timestamp: string
}

/** 执行结果摘要 */
interface RunResult {
  total: number
  passed: number
  failed: number
}

// ===================== 步骤面板（左侧拖拽区） =====================

function StepPalette() {
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
    <div className="shrink-0 w-[236px] rounded-2xl bg-sidebar border border-white/5 flex flex-col z-10 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <Layers className="w-4 h-4 text-coral" />
        <span className="text-sm font-semibold">步骤面板</span>
      </div>

      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索步骤..."
            className="h-8 pl-8 text-xs rounded-2xl bg-muted/30 border-white/5"
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
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl"
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
                          className="flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-grab active:cursor-grabbing border border-transparent hover:border-white/10 transition-all hover:bg-muted/20 group"
                        >
                          <div className="w-6 h-6 rounded-xl flex items-center justify-center shrink-0 bg-muted/40 border border-white/5">
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
        <button onClick={onClose} className="p-1 rounded-xl hover:bg-muted/50 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {/* 步骤名称 */}
          <FieldGroup label="步骤名称">
            <Input value={(d.label as string) || ""} onChange={(e) => setField("label", e.target.value)} className="h-8 text-sm rounded-2xl" />
          </FieldGroup>

          {/* ---- HTTP 请求配置 ---- */}
          {node.type === "httpRequest" && (
            <>
              <FieldGroup label="请求方法">
                <Select value={(d.method as string) || "GET"} onValueChange={(v) => setField("method", v)}>
                  <SelectTrigger className="h-8 text-sm rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="URL" description="支持 {{variable}} 变量引用">
                <Input value={(d.url as string) || ""} onChange={(e) => setField("url", e.target.value)} placeholder="/api/v1/users" className="h-8 text-xs font-mono rounded-2xl" />
              </FieldGroup>
              <FieldGroup label="Headers (JSON)" description="请求头，每行一对 key: value">
                <Textarea value={(d.headers as string) || ""} onChange={(e) => setField("headers", e.target.value)} placeholder='{"Authorization":"Bearer {{token}}"}' rows={3} className="text-xs font-mono rounded-2xl resize-none" />
              </FieldGroup>
              <FieldGroup label="Body (JSON)" description="仅 POST/PUT/PATCH 生效">
                <Textarea value={(d.body as string) || ""} onChange={(e) => setField("body", e.target.value)} placeholder='{"key":"value"}' rows={4} className="text-xs font-mono rounded-2xl resize-none" />
              </FieldGroup>
              <FieldGroup label="超时 (ms)" description="默认 30000ms">
                <Input type="number" value={(d.timeout as number) || 30000} onChange={(e) => setField("timeout", Number(e.target.value))} className="h-8 text-sm rounded-2xl" />
              </FieldGroup>
            </>
          )}

          {/* ---- Web UI 操作配置 ---- */}
          {node.type === "webUiAction" && (
            <>
              <FieldGroup label="操作类型">
                <Select value={(d.action as string) || "click"} onValueChange={(v) => setField("action", v)}>
                  <SelectTrigger className="h-8 text-sm rounded-2xl"><SelectValue /></SelectTrigger>
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
                <FieldGroup label="URL" description="完整 URL，如 https://example.com/login">
                  <Input value={(d.url as string) || ""} onChange={(e) => setField("url", e.target.value)} placeholder="https://example.com" className="h-8 text-xs font-mono rounded-2xl" />
                </FieldGroup>
              ) : (
                <FieldGroup label="元素选择器" description="CSS 选择器，如 #submit-btn 或 .input-name">
                  <Input value={(d.selector as string) || ""} onChange={(e) => setField("selector", e.target.value)} placeholder="#submit-btn / .input-name" className="h-8 text-xs font-mono rounded-2xl" />
                </FieldGroup>
              )}
              {["type", "upload"].includes(d.action as string) && (
                <FieldGroup label={d.action === "upload" ? "文件路径" : "输入值"}>
                  <Input value={(d.value as string) || ""} onChange={(e) => setField("value", e.target.value)} className="h-8 text-xs rounded-2xl" />
                </FieldGroup>
              )}
            </>
          )}

          {/* ---- App UI 操作配置 ---- */}
          {node.type === "appUiAction" && (
            <>
              <FieldGroup label="操作类型">
                <Select value={(d.action as string) || "click"} onValueChange={(v) => setField("action", v)}>
                  <SelectTrigger className="h-8 text-sm rounded-2xl"><SelectValue /></SelectTrigger>
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
                  <Input value={(d.app_id as string) || ""} onChange={(e) => setField("app_id", e.target.value)} placeholder="com.example.app" className="h-8 text-xs font-mono rounded-2xl" />
                </FieldGroup>
              ) : (
                <FieldGroup label="组件选择器" description="XPath 或 Resource ID">
                  <Input value={(d.selector as string) || ""} onChange={(e) => setField("selector", e.target.value)} placeholder="//android.widget.Button[@text='OK']" className="h-8 text-xs font-mono rounded-2xl" />
                </FieldGroup>
              )}
              {["type", "swipe"].includes(d.action as string) && (
                <FieldGroup label={d.action === "swipe" ? "滑动方向(up/down/left/right)" : "输入值"}>
                  <Input value={(d.value as string) || ""} onChange={(e) => setField("value", e.target.value)} className="h-8 text-xs rounded-2xl" />
                </FieldGroup>
              )}
            </>
          )}

          {/* ---- SQL 配置 ---- */}
          {node.type === "sqlQuery" && (
            <>
              <FieldGroup label="数据库连接" description="在配置中预设的连接名称">
                <Input value={(d.connection as string) || ""} onChange={(e) => setField("connection", e.target.value)} placeholder="prod_db" className="h-8 text-sm rounded-2xl" />
              </FieldGroup>
              <FieldGroup label="SQL 语句">
                <Textarea value={(d.query as string) || ""} onChange={(e) => setField("query", e.target.value)} placeholder="SELECT * FROM users WHERE id = ?" rows={4} className="text-xs font-mono rounded-2xl resize-none" />
              </FieldGroup>
              <FieldGroup label="结果存入变量" description="后续步骤通过 {{变量名}} 引用">
                <Input value={(d.extractVar as string) || ""} onChange={(e) => setField("extractVar", e.target.value)} placeholder="sql_result" className="h-8 text-xs font-mono rounded-2xl" />
              </FieldGroup>
            </>
          )}

          {/* ---- 断言配置 ---- */}
          {node.type === "assertion" && (
            <>
              <FieldGroup label="断言类型">
                <Select value={(d.assertType as string) || "status_code"} onValueChange={(v) => setField("assertType", v)}>
                  <SelectTrigger className="h-8 text-sm rounded-2xl"><SelectValue /></SelectTrigger>
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
              <FieldGroup label="表达式" description="如 $.data.token 或 response.status">
                <Input value={(d.expression as string) || ""} onChange={(e) => setField("expression", e.target.value)} placeholder="$.data.token" className="h-8 text-xs font-mono rounded-2xl" />
              </FieldGroup>
              <FieldGroup label="期望值" description="支持 not_empty / any 等特殊关键字">
                <Input value={(d.expected as string) || ""} onChange={(e) => setField("expected", e.target.value)} placeholder="200" className="h-8 text-xs font-mono rounded-2xl" />
              </FieldGroup>
            </>
          )}

          {/* ---- 变量提取配置 ---- */}
          {node.type === "extract" && (
            <>
              <FieldGroup label="提取方式">
                <Select value={(d.source as string) || "json_path"} onValueChange={(v) => setField("source", v)}>
                  <SelectTrigger className="h-8 text-sm rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json_path">JSONPath</SelectItem>
                    <SelectItem value="regex">正则匹配</SelectItem>
                    <SelectItem value="header">Response Header</SelectItem>
                    <SelectItem value="cookie">Cookie</SelectItem>
                    <SelectItem value="html_css">CSS 选择器</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="表达式" description="如 $.data.token 或正则表达式">
                <Input value={(d.expression as string) || ""} onChange={(e) => setField("expression", e.target.value)} placeholder="$.data.token" className="h-8 text-xs font-mono rounded-2xl" />
              </FieldGroup>
              <FieldGroup label="变量名" description="后续步骤通过 {{变量名}} 引用">
                <Input value={(d.varName as string) || ""} onChange={(e) => setField("varName", e.target.value)} placeholder="auth_token" className="h-8 text-xs font-mono rounded-2xl" />
              </FieldGroup>
            </>
          )}

          {/* ---- 脚本配置 ---- */}
          {node.type === "script" && (
            <>
              <FieldGroup label="脚本语言">
                <Select value={(d.language as string) || "python"} onValueChange={(v) => setField("language", v)}>
                  <SelectTrigger className="h-8 text-sm rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="shell">Shell</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="代码" description="可通过 env.get('变量名') 读取上下文变量">
                <Textarea value={(d.code as string) || ""} onChange={(e) => setField("code", e.target.value)} placeholder="# your code here" rows={8} className="text-xs font-mono rounded-2xl resize-none" />
              </FieldGroup>
            </>
          )}

          {/* ---- 等待配置 ---- */}
          {node.type === "wait" && (
            <FieldGroup label="等待秒数" description="执行下一步前的等待时间">
              <Input type="number" value={(d.seconds as number) || 2} onChange={(e) => setField("seconds", Number(e.target.value))} className="h-8 text-sm rounded-2xl" />
            </FieldGroup>
          )}

          {/* ---- 条件配置 ---- */}
          {node.type === "condition" && (
            <FieldGroup label="条件表达式" description="满足条件走 True 分支，否则走 False 分支">
              <Textarea value={(d.expression as string) || ""} onChange={(e) => setField("expression", e.target.value)} placeholder="response.status === 200" rows={3} className="text-xs font-mono rounded-2xl resize-none" />
            </FieldGroup>
          )}

          {/* 删除 */}
          <div className="pt-3 border-t border-white/5">
            <Button variant="destructive" size="sm" className="w-full rounded-2xl h-8" onClick={() => onDelete(node.id)}>
              <Trash2 className="w-3.5 h-3.5 mr-2" />删除步骤
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function FieldGroup({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {description && <p className="text-[10px] text-muted-foreground/50 leading-relaxed">{description}</p>}
      {children}
    </div>
  )
}

// ===================== 测试用例选择器 (Dialog) =====================

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
  const [workflowedIds, setWorkflowedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      fetchTestCases({ limit: 100 }),
      fetchWorkflowedCaseIds(),
    ])
      .then(([tcList, ids]) => {
        setCases(tcList)
        setWorkflowedIds(new Set(ids))
      })
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
            <Input placeholder="搜索用例名称..." className="pl-9 h-9 rounded-2xl" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-sidebar hover:bg-muted/30 cursor-pointer transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium truncate group-hover:text-coral transition-colors">{tc.name}</p>
                      <Badge className={cn("text-[10px] px-1.5 py-0 rounded-full shrink-0", PRIORITY_COLORS[tc.priority])}>{tc.priority}</Badge>
                      {workflowedIds.has(tc.id) && (
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

// ===================== 执行日志面板 =====================

function LogPanel({
  logs,
  isRunning,
  collapsed,
  onToggle,
}: {
  logs: LogEntry[]
  isRunning: boolean
  collapsed: boolean
  onToggle: () => void
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // 新日志自动滚动到底部
  useEffect(() => {
    if (!collapsed) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, collapsed])

  return (
    <div className="h-full flex flex-col">
      {/* 日志面板标题栏 */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full px-4 h-9 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border-b border-white/5"
      >
        <Terminal className="w-3.5 h-3.5 text-coral" />
        <span>执行日志</span>
        {logs.length > 0 && (
          <Badge variant="secondary" className="ml-1 text-[9px] px-1.5 py-0 h-4 bg-muted/50">{logs.length}</Badge>
        )}
        {isRunning && (
          <span className="flex items-center gap-1 ml-2 text-blue-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            执行中...
          </span>
        )}
        <span className="ml-auto">
          {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {/* 日志内容 */}
      {!collapsed && (
        <div className="h-[calc(100%-36px)] overflow-y-auto px-4 py-2 font-mono text-[11px] space-y-1">
          {logs.length === 0 ? (
            <p className="text-muted-foreground/40 py-6 text-center">点击「执行」开始运行流程，日志将在此显示</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <span className="text-muted-foreground/30 shrink-0 w-14">{log.timestamp}</span>
                {log.status === "running" && <Loader2 className="w-3 h-3 text-blue-400 animate-spin shrink-0" />}
                {log.status === "success" && <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />}
                {log.status === "error" && <XCircle className="w-3 h-3 text-red-400 shrink-0" />}
                <span className={cn(
                  "truncate",
                  log.status === "running" && "text-blue-400",
                  log.status === "success" && "text-green-400",
                  log.status === "error" && "text-red-400",
                )}>
                  {log.label}
                </span>
                {log.duration !== undefined && (
                  <span className="text-muted-foreground/40 shrink-0 ml-auto">{log.duration}ms</span>
                )}
                {log.message && (
                  <span className="text-muted-foreground/50 shrink-0 truncate max-w-[200px]">{log.message}</span>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}

// ===================== 执行结果 Toast =====================

function RunResultToast({
  result,
  onClose,
}: {
  result: RunResult | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!result) return
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [result, onClose])

  if (!result) return null
  const allPassed = result.failed === 0

  return (
    <div className={cn(
      "fixed bottom-8 right-8 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-4 duration-300",
      allPassed
        ? "bg-green-500/10 border-green-500/20 text-green-400"
        : "bg-red-500/10 border-red-500/20 text-red-400",
    )}>
      {allPassed
        ? <CheckCircle2 className="w-5 h-5 shrink-0" />
        : <XCircle className="w-5 h-5 shrink-0" />}
      <div>
        <p className="text-sm font-semibold">{allPassed ? "全部通过" : "存在失败步骤"}</p>
        <p className="text-[11px] opacity-70">
          {result.passed}/{result.total} 步骤通过
          {result.failed > 0 && `，${result.failed} 个失败`}
        </p>
      </div>
      <button onClick={onClose} className="ml-2 p-1 rounded-full hover:bg-white/10 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
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
  const [clearDialogOpen, setClearDialogOpen] = useState(false)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<Node, Edge> | null>(null)

  // 执行日志 & 结果
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logCollapsed, setLogCollapsed] = useState(true)
  const [runResult, setRunResult] = useState<RunResult | null>(null)

  // 当选择新的用例时，加载其流，重置日志
  useEffect(() => {
    setNodes([])
    setEdges([])
    setLogs([])
    setRunResult(null)
    if (!testCase) return
    fetchFlow(testCase.id)
      .then((flow) => {
        if (!flow) return
        setNodes(flow.nodes as Node[])
        setEdges(
          (flow.edges as Edge[]).map((e) => ({
            ...e,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
          }))
        )
      })
      .catch(console.error)
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

  // 清空画布
  const handleClear = useCallback(() => {
    setNodes([])
    setEdges([])
    setSelectedNode(null)
    setLogs([])
    setRunResult(null)
  }, [setNodes, setEdges])

  // 保存工作流
  const handleSave = useCallback(async () => {
    if (!testCase) return
    setIsSaving(true)
    try {
      await saveFlow(testCase.id, { nodes, edges })
    } catch (err) {
      console.error("保存失败", err)
    } finally {
      setIsSaving(false)
    }
  }, [testCase, nodes, edges])

  // 模拟运行步骤（带日志收集）
  const handleRun = useCallback(() => {
    if (nodes.length === 0) return
    setIsRunning(true)
    setLogs([])
    setLogCollapsed(false)
    setRunResult(null)

    const ids = nodes.map((n) => n.id)
    const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]))
    let i = 0
    let passedCount = 0
    let failedCount = 0

    const fmt = () => {
      const d = new Date()
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
    }

    const iv = setInterval(() => {
      if (i >= ids.length) {
        clearInterval(iv)
        setIsRunning(false)
        setRunResult({ total: ids.length, passed: passedCount, failed: failedCount })
        return
      }
      const nid = ids[i]
      const nodeLabel = (nodeMap[nid]?.data?.label as string) || nid
      const ts = fmt()

      // 更新节点为 running
      setNodes((nds) => nds.map((n) => n.id === nid ? { ...n, data: { ...n.data, status: "running" } } : n))
      setLogs((prev) => [...prev, { nodeId: nid, label: nodeLabel, status: "running", timestamp: ts }])

      setTimeout(() => {
        const success = Math.random() > 0.12
        const duration = Math.floor(Math.random() * 400) + 50
        if (success) passedCount++ ; else failedCount++

        setNodes((nds) => nds.map((n) => n.id === nid ? { ...n, data: { ...n.data, status: success ? "success" : "error" } } : n))
        setLogs((prev) => prev.map((l) =>
          l.nodeId === nid && l.status === "running"
            ? { ...l, status: success ? "success" : "error", duration, message: success ? "OK" : "AssertionError: expected 200 but got 500" }
            : l
        ))
      }, 500)

      i++
    }, 800)
  }, [nodes, setNodes])

  const tm = testCase ? (TYPE_META[testCase.case_type] || TYPE_META.api) : null

  // 统计执行结果（用于 toolbar badge）
  const lastRunResult = runResult

  return (
    <div className="flex h-full">
      {/* 主区域 */}
      <div className="flex flex-1 overflow-hidden">
        <StepPalette />

        {/* React Flow 画布 + 悬浮日志面板 */}
        <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onReconnect={onReconnect}
              onInit={(instance) => setRfInstance(instance as ReactFlowInstance<Node, Edge>)}
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

              {/* 悬浮顶部工具栏 */}
              <Panel position="top-center" className="pointer-events-auto">
                <div className="flex items-center gap-2">
                  {/* 左胶囊：测试用例选择 */}
                  <div className="flex items-center gap-1 bg-sidebar/90 backdrop-blur-md border border-border/60 shadow-xl rounded-full px-1.5 py-1 h-9">
                    {testCase && tm ? (
                      <button
                        className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/60 px-2 py-1 rounded-full transition-colors"
                        onClick={() => setTcPickerOpen(true)}
                      >
                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", tm.color.replace("text-", "bg-").split(" ")[0], tm.color.split(" ").slice(2).join(" "))}>
                          <tm.icon className={cn("w-2.5 h-2.5", tm.color.split(" ")[1])} />
                        </div>
                        <span className="text-xs font-medium max-w-[120px] truncate">{testCase.name}</span>
                        <span className="text-[10px] text-muted-foreground hidden sm:block">{testCase.module}</span>
                      </button>
                    ) : (
                      <button
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-muted/60 transition-colors text-xs text-muted-foreground border border-dashed border-border/60"
                        onClick={() => setTcPickerOpen(true)}
                      >
                        <FlaskConical className="w-3.5 h-3.5 text-coral" />
                        选择测试用例
                      </button>
                    )}
                    {/* 执行结果 Badge */}
                    {lastRunResult && (
                      <div className={cn(
                        "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ml-0.5",
                        lastRunResult.failed === 0
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}>
                        {lastRunResult.failed === 0
                          ? <><CheckCircle2 className="w-2.5 h-2.5" />{lastRunResult.passed}/{lastRunResult.total}</>
                          : <><XCircle className="w-2.5 h-2.5" />{lastRunResult.failed} 失败</>}
                      </div>
                    )}
                  </div>

                  {/* 中胶囊：步骤 & 连接统计 */}
                  <div className="flex items-center gap-3 bg-sidebar/90 backdrop-blur-md border border-border/60 shadow-xl rounded-full px-3 h-9 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {nodes.length}
                    </span>
                    <span className="w-px h-3 bg-border/60" />
                    <span className="flex items-center gap-1">
                      <Workflow className="w-3 h-3" />
                      {edges.length}
                    </span>
                  </div>

                  {/* 右胶囊：操作按钮 */}
                  <div className="flex items-center gap-0.5 bg-sidebar/90 backdrop-blur-md border border-border/60 shadow-xl rounded-full px-1.5 py-1 h-9">
                    {nodes.length > 0 && (
                      <button
                        className="p-1.5 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        onClick={() => setClearDialogOpen(true)}
                        disabled={isRunning}
                        title="清空画布"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-muted/60 transition-colors text-xs disabled:opacity-40"
                      onClick={handleSave}
                      disabled={isSaving || !testCase}
                      title="保存"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span className="hidden sm:block">保存</span>
                    </button>
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-coral hover:bg-coral/90 text-white text-xs font-medium transition-colors disabled:opacity-40 shadow-sm shadow-coral/30"
                      onClick={handleRun}
                      disabled={isRunning || !testCase || nodes.length === 0}
                    >
                      {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      {isRunning ? "执行中" : "执行"}
                    </button>
                  </div>
                </div>
              </Panel>

              <Controls className="!rounded-2xl !border-white/10 !bg-sidebar/90 !backdrop-blur-sm !shadow-lg" />
              <MiniMap
                className="!rounded-2xl !border-white/10 !bg-sidebar/90 !backdrop-blur-sm"
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
                  {!testCase ? (
                    /* 未选用例：大按钮 CTA */
                    <div className="flex flex-col items-center mt-20 pointer-events-auto select-none gap-5">
                      <div className="w-20 h-20 rounded-3xl bg-muted/20 border border-white/5 flex items-center justify-center">
                        <Workflow className="w-9 h-9 text-muted-foreground/20" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground/60 mb-1">选择一个测试用例开始编排自动化流程</p>
                        <p className="text-[11px] text-muted-foreground/30">从左侧面板拖拽步骤，连接节点构建执行流</p>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-2xl h-9 bg-coral hover:bg-coral/90 shadow-lg shadow-coral/20"
                        onClick={() => setTcPickerOpen(true)}
                      >
                        <FlaskConical className="w-4 h-4 mr-2" />
                        选择测试用例
                      </Button>
                    </div>
                  ) : (
                    /* 已选用例但无步骤：拖拽引导 */
                    <div className="flex flex-col items-center mt-20 pointer-events-none select-none gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-muted/20 border border-dashed border-white/10 flex items-center justify-center animate-pulse">
                        <Layers className="w-7 h-7 text-coral/30" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground/50 mb-1">从左侧面板拖拽步骤到画布</p>
                        <p className="text-[11px] text-muted-foreground/30">支持 HTTP 请求、UI 操作、断言、变量提取等步骤类型</p>
                      </div>
                    </div>
                  )}
                </Panel>
              )}
            </ReactFlow>

            {/* 悬浮日志面板 */}
            <div className={cn(
              "absolute bottom-3 left-3 right-3 z-10 rounded-2xl border border-white/5 bg-sidebar/95 backdrop-blur-md shadow-xl transition-all duration-300 overflow-hidden",
              logCollapsed ? "h-9" : "h-52",
            )}>
              <LogPanel
                logs={logs}
                isRunning={isRunning}
                collapsed={logCollapsed}
                onToggle={() => setLogCollapsed((v) => !v)}
              />
            </div>
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

      {/* 执行完成 Toast */}
      <RunResultToast result={runResult} onClose={() => setRunResult(null)} />

      {/* 选择测试用例 Dialog */}
      <TestCasePickerDialog
        open={tcPickerOpen}
        onOpenChange={setTcPickerOpen}
        onSelect={setTestCase}
      />

      {/* 清空画布二次确认 */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清空画布</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将删除画布上的全部步骤和连接，无法撤销。确定继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => { handleClear(); setClearDialogOpen(false) }}
            >
              清空
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
