/**
 * 自动化工作流编排页面
 * 核心理念：选择测试用例 → 为该用例编排自动化执行步骤流
 * 基于 React Flow (@xyflow/react) 实现
 */
import { useState, useCallback, useMemo, useEffect, type DragEvent } from "react"
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
  Clock,
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
import { fetchTestCases, fetchWorkflow, saveWorkflow, type TestCase } from "@/services/api"

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
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md"
                >
                  <ChevronRight className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-90")} />
                  <CatIcon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                  <Badge variant="secondary" className="ml-auto text-[11px] px-1.5 py-0 h-4 bg-muted/50">{catTemplates.length}</Badge>
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
                            <p className="text-[12px] font-medium truncate">{template.label}</p>
                            <p className="text-[10px] text-muted-foreground/50 truncate">{template.description}</p>
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

function FieldGroup({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {description && <p className="text-[10px] text-muted-foreground/60">{description}</p>}
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

const CASE_TYPE_OPTIONS = [
  { value: "all", label: "全部类型" },
  { value: "api", label: "接口测试" },
  { value: "ui", label: "UI测试" },
  { value: "e2e", label: "端到端" },
  { value: "unit", label: "单元测试" },
  { value: "perf", label: "性能测试" },
]

const PRIORITY_OPTIONS = [
  { value: "all", label: "全部优先级" },
  { value: "P0", label: "P0" },
  { value: "P1", label: "P1" },
  { value: "P2", label: "P2" },
  { value: "P3", label: "P3" },
]

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
  const [filterType, setFilterType] = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetchTestCases({ limit: 200 })
      .then((casesData) => setCases(casesData))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      // 搜索过滤
      if (search.trim()) {
        const s = search.toLowerCase()
        if (!c.name.toLowerCase().includes(s) && !c.description?.toLowerCase().includes(s)) {
          return false
        }
      }
      // 类型过滤
      if (filterType !== "all" && c.case_type !== filterType) {
        return false
      }
      // 优先级过滤
      if (filterPriority !== "all" && c.priority !== filterPriority) {
        return false
      }
      return true
    })
  }, [cases, search, filterType, filterPriority])

  const stats = useMemo(() => ({
    total: cases.length,
    workflowed: cases.filter(c => c.is_automated).length,
  }), [cases])

  const PRIORITY_COLORS: Record<string, string> = {
    P0: "bg-red-500/10 text-red-500 border-red-500/20",
    P1: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    P2: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    P3: "bg-green-500/10 text-green-500 border-green-500/20",
  }

  const TYPE_META: Record<string, { icon: LucideIcon; color: string }> = {
    api: { icon: Globe, color: "text-blue-500 bg-blue-500/10" },
    ui: { icon: MousePointerClick, color: "text-orange-500 bg-orange-500/10" },
    e2e: { icon: Workflow, color: "text-purple-500 bg-purple-500/10" },
    unit: { icon: Cpu, color: "text-emerald-500 bg-emerald-500/10" },
    perf: { icon: Zap, color: "text-amber-500 bg-amber-500/10" },
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-white/5">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-coral" />
              选择测试用例
            </DialogTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-pixel-blue" />
                {stats.total} 个用例
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {stats.workflowed} 已编排
              </span>
            </div>
          </div>

          {/* 筛选栏 */}
          <div className="flex items-center gap-3 mt-4">
            {/* 搜索框 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索用例名称..."
                className="pl-9 h-9 rounded-xl bg-muted/30 border-white/5"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* 类型筛选 */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-28 h-9 rounded-xl bg-muted/30 border-white/5 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 优先级筛选 */}
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-28 h-9 rounded-xl bg-muted/30 border-white/5 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        {/* 用例列表 */}
        <ScrollArea className="flex-1 min-h-0 h-full">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">暂无匹配的测试用例</p>
              <p className="text-xs mt-1">尝试调整筛选条件</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filtered.map((tc) => {
                const isAutomated = tc.is_automated
                const typeMeta = TYPE_META[tc.case_type] || TYPE_META.api
                const TypeIcon = typeMeta.icon

                return (
                  <div
                    key={tc.id}
                    onClick={() => { onSelect(tc); onOpenChange(false) }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200",
                      "hover:scale-[1.01] hover:shadow-md group",
                      isAutomated
                        ? "bg-gradient-to-r from-green-500/5 to-transparent border-green-500/20 hover:border-green-500/30"
                        : "bg-sidebar border-white/5 hover:bg-muted/30 hover:border-white/10"
                    )}
                  >
                    {/* 类型图标 */}
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", typeMeta.color)}>
                      <TypeIcon className="w-5 h-5" />
                    </div>

                    {/* 用例信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium truncate group-hover:text-coral transition-colors">
                          {tc.name}
                        </p>
                        <Badge className={cn("text-[10px] px-1.5 py-0 rounded-full shrink-0", PRIORITY_COLORS[tc.priority])}>
                          {tc.priority}
                        </Badge>
                        {isAutomated && (
                          <Badge className="text-[10px] px-1.5 py-0 rounded-full bg-green-500/10 text-green-400 border-green-500/20 shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                            已编排
                          </Badge>
                        )}
                        {!isAutomated && (
                          <Badge className="text-[10px] px-1.5 py-0 rounded-full bg-muted/50 text-muted-foreground border-0 shrink-0">
                            未编排
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {tc.description || "暂无描述"}
                      </p>
                      {tc.module && (
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          模块: {tc.module}
                        </p>
                      )}
                    </div>

                    {/* 统计信息 */}
                    {tc.total_runs > 0 && (
                      <div className="hidden sm:flex items-center gap-4 text-[11px] text-muted-foreground shrink-0">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{tc.total_runs}次</span>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1 font-medium",
                          tc.pass_rate >= 90 ? "text-green-500" : tc.pass_rate >= 70 ? "text-yellow-500" : "text-red-500"
                        )}>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{tc.pass_rate}%</span>
                        </div>
                      </div>
                    )}

                    {/* 选中指示器 */}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-coral transition-colors shrink-0" />
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* 底部统计 */}
        <div className="px-6 py-3 border-t border-white/5 bg-muted/20 shrink-0">
          <p className="text-xs text-muted-foreground text-center">
            共 {filtered.length} 个用例符合条件
            {filtered.length !== cases.length && `（共 ${cases.length} 个）`}
          </p>
        </div>
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
  const [rfInstance, setRfInstance] = useState<any>(null)

  // 当选择新的用例时，加载其流
  useEffect(() => {
    if (!testCase) {
      setNodes([])
      setEdges([])
      return
    }

    fetchWorkflow(testCase.id)
      .then((workflow) => {
        if (workflow && workflow.nodes && workflow.edges) {
          setNodes(workflow.nodes.map((n: Node) => ({
            ...n,
            data: { ...n.data, status: n.data?.status || "idle" },
          })))
          setEdges(
            workflow.edges.map((e: Edge) => ({
              ...e,
              type: "smoothstep",
              markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
            }))
          )
        } else {
          setNodes([])
          setEdges([])
        }
      })
      .catch(() => {
        setNodes([])
        setEdges([])
      })
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

  // 保存工作流
  const handleSave = useCallback(async () => {
    if (!testCase) return
    setIsSaving(true)
    try {
      await saveWorkflow(testCase.id, {
        name: `${testCase.name} - 工作流`,
        description: "",
        nodes,
        edges,
      })
    } catch (error) {
      console.error("保存工作流失败:", error)
    } finally {
      setIsSaving(false)
    }
  }, [testCase, nodes, edges])

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
            onInit={(instance) => setRfInstance(instance)}
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
