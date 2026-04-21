/**
 * 自动化步骤节点组件
 * 每个节点代表测试用例中的一个自动化执行步骤
 */
import { memo } from "react"
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Snowflake, Flame } from "lucide-react"
import {
  Globe,
  MousePointerClick,
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  Timer,
  GitBranch,
  Variable,
  FileJson,
  Terminal,
  Eye,
  Type,
  Pointer,
  Braces,
  Send,
  Smartphone,
  AppWindow,
  MoveUp,
  Hand,
  Keyboard,
  ScanLine,
  Eraser,
  Camera,
  type LucideIcon,
} from "lucide-react"

// ===================== 步骤节点数据类型 =====================

/** HTTP 请求步骤 */
export interface HttpStepData {
  label: string
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  url: string
  headers?: string
  body?: string
  timeout?: number
  status?: "idle" | "running" | "success" | "error"
  [key: string]: unknown
}

/** App UI 操作步骤（action 在创建时固定，不可修改） */
export interface AppUiStepData {
  label: string
  /** 操作类型，由 node type 决定，面板中只读 */
  action:
    | "launch_app"
    | "click"
    | "long_press"
    | "double_click"
    | "type"
    | "clear_text"
    | "swipe"
    | "tap_xy"
    | "wait_element"
    | "get_text"
    | "screenshot"
    | "press_key"
  selector?: string
  value?: string
  app_id?: string
  coordinates?: string
  duration_ms?: number
  key_code?: string
  var_name?: string
  status?: "idle" | "running" | "success" | "error"
  [key: string]: unknown
}

// App UI 各操作独立 node type
export type AppLaunchAppNode  = Node<AppUiStepData, "appLaunchApp">
export type AppClickNode      = Node<AppUiStepData, "appClick">
export type AppLongPressNode  = Node<AppUiStepData, "appLongPress">
export type AppDoubleClickNode= Node<AppUiStepData, "appDoubleClick">
export type AppTypeNode       = Node<AppUiStepData, "appType">
export type AppClearTextNode  = Node<AppUiStepData, "appClearText">
export type AppSwipeNode      = Node<AppUiStepData, "appSwipe">
export type AppTapXyNode      = Node<AppUiStepData, "appTapXy">
export type AppWaitElementNode= Node<AppUiStepData, "appWaitElement">
export type AppGetTextNode    = Node<AppUiStepData, "appGetText">
export type AppScreenshotNode = Node<AppUiStepData, "appScreenshot">
export type AppPressKeyNode   = Node<AppUiStepData, "appPressKey">

/** 所有 App UI 操作 node type 名称集合（用于判断） */
export const APP_UI_NODE_TYPES = new Set([
  "appLaunchApp","appClick","appLongPress","appDoubleClick",
  "appType","appClearText","appSwipe","appTapXy",
  "appWaitElement","appGetText","appScreenshot","appPressKey",
])

/** SQL 查询步骤 */
export interface SqlStepData {
  label: string
  connection?: string
  query?: string
  extractVar?: string
  status?: "idle" | "running" | "success" | "error"
  [key: string]: unknown
}

/** 断言步骤 */
export interface AssertStepData {
  label: string
  assertType: "status_code" | "json_path" | "contains" | "equals" | "regex" | "schema"
  expression?: string
  expected?: string
  status?: "idle" | "running" | "success" | "error"
  [key: string]: unknown
}

/** 变量提取步骤 */
export interface ExtractStepData {
  label: string
  source: "json_path" | "regex" | "header" | "cookie" | "html_css"
  expression?: string
  varName?: string
  status?: "idle" | "running" | "success" | "error"
  [key: string]: unknown
}

/** 脚本执行步骤 */
export interface ScriptStepData {
  label: string
  language: "python" | "javascript" | "shell"
  code?: string
  status?: "idle" | "running" | "success" | "error"
  [key: string]: unknown
}

/** 等待/延迟步骤 */
export interface WaitStepData {
  label: string
  seconds: number
  status?: "idle" | "running" | "success" | "error"
  [key: string]: unknown
}

/** 条件判断步骤 */
export interface ConditionStepData {
  label: string
  expression?: string
  status?: "idle" | "running" | "success" | "error"
  [key: string]: unknown
}

// ===================== 节点类型定义 =====================

export type HttpStepNode = Node<HttpStepData, "httpRequest">
export type AppUiStepNode = AppLaunchAppNode | AppClickNode | AppLongPressNode | AppDoubleClickNode | AppTypeNode | AppClearTextNode | AppSwipeNode | AppTapXyNode | AppWaitElementNode | AppGetTextNode | AppScreenshotNode | AppPressKeyNode
export type SqlStepNode = Node<SqlStepData, "sqlQuery">
export type AssertStepNode = Node<AssertStepData, "assertion">
export type ExtractStepNode = Node<ExtractStepData, "extract">
export type ScriptStepNode = Node<ScriptStepData, "script">
export type WaitStepNode = Node<WaitStepData, "wait">
export type ConditionStepNode = Node<ConditionStepData, "condition">
export type StepNode = HttpStepNode | AppUiStepNode | SqlStepNode | AssertStepNode | ExtractStepNode | ScriptStepNode | WaitStepNode | ConditionStepNode

// ===================== 步骤模板（拖拽面板用） =====================

export interface StepTemplate {
  type: string
  label: string
  icon: LucideIcon
  description: string
  category: string
  defaultData: Record<string, unknown>
}

export const STEP_TEMPLATES: StepTemplate[] = [
  // ---- 接口请求 ----
  {
    type: "httpRequest",
    label: "HTTP 请求",
    icon: Globe,
    description: "发送 HTTP/HTTPS 请求",
    category: "request",
    defaultData: { label: "HTTP 请求", method: "GET", url: "", headers: "", body: "" },
  },
  // ---- App UI 操作 ----
  {
    type: "appLaunchApp",
    label: "启动应用",
    icon: AppWindow,
    description: "启动目标 App",
    category: "app_ui",
    defaultData: { label: "启动应用", action: "launch_app", app_id: "" },
  },
  {
    type: "appClick",
    label: "点击",
    icon: Pointer,
    description: "点击 App 内组件",
    category: "app_ui",
    defaultData: { label: "点击", action: "click", selector: "" },
  },
  {
    type: "appLongPress",
    label: "长按",
    icon: Hand,
    description: "长按 App 内组件",
    category: "app_ui",
    defaultData: { label: "长按", action: "long_press", selector: "", duration_ms: 1000 },
  },
  {
    type: "appDoubleClick",
    label: "双击",
    icon: MousePointerClick,
    description: "双击 App 内组件",
    category: "app_ui",
    defaultData: { label: "双击", action: "double_click", selector: "" },
  },
  {
    type: "appType",
    label: "输入文本",
    icon: Type,
    description: "在 App 输入框输入",
    category: "app_ui",
    defaultData: { label: "输入文本", action: "type", selector: "", value: "" },
  },
  {
    type: "appClearText",
    label: "清空文本",
    icon: Eraser,
    description: "清空 App 输入框内容",
    category: "app_ui",
    defaultData: { label: "清空文本", action: "clear_text", selector: "" },
  },
  {
    type: "appSwipe",
    label: "滑动屏幕",
    icon: MoveUp,
    description: "在 App 屏幕滑动",
    category: "app_ui",
    defaultData: { label: "滑动屏幕", action: "swipe", value: "up" },
  },
  {
    type: "appTapXy",
    label: "坐标点击",
    icon: ScanLine,
    description: "按坐标点击屏幕",
    category: "app_ui",
    defaultData: { label: "坐标点击", action: "tap_xy", coordinates: "" },
  },
  {
    type: "appWaitElement",
    label: "等待",
    icon: Eye,
    description: "等待 App 组件出现",
    category: "app_ui",
    defaultData: { label: "等待", action: "wait_element", selector: "" },
  },
  {
    type: "appGetText",
    label: "获取文本",
    icon: Variable,
    description: "获取组件文本存入变量",
    category: "app_ui",
    defaultData: { label: "获取文本", action: "get_text", selector: "", var_name: "" },
  },
  {
    type: "appScreenshot",
    label: "截图",
    icon: Camera,
    description: "截取当前屏幕",
    category: "app_ui",
    defaultData: { label: "截图", action: "screenshot" },
  },
  {
    type: "appPressKey",
    label: "按键操作",
    icon: Keyboard,
    description: "按下系统按键",
    category: "app_ui",
    defaultData: { label: "按键操作", action: "press_key", key_code: "home" },
  },
  // ---- 数据处理 ----
  {
    type: "sqlQuery",
    label: "SQL 查询",
    icon: Database,
    description: "执行数据库查询",
    category: "data",
    defaultData: { label: "SQL 查询", connection: "default", query: "" },
  },
  {
    type: "extract",
    label: "变量提取",
    icon: Variable,
    description: "从响应中提取变量",
    category: "data",
    defaultData: { label: "变量提取", source: "json_path", expression: "", varName: "" },
  },
  {
    type: "script",
    label: "脚本执行",
    icon: Terminal,
    description: "执行自定义脚本",
    category: "data",
    defaultData: { label: "脚本执行", language: "python", code: "" },
  },
  // ---- 验证与控制 ----
  {
    type: "assertion",
    label: "断言验证",
    icon: CheckCircle2,
    description: "验证响应是否符合预期",
    category: "verify",
    defaultData: { label: "断言验证", assertType: "status_code", expression: "", expected: "" },
  },
  {
    type: "condition",
    label: "条件判断",
    icon: GitBranch,
    description: "根据结果走不同分支",
    category: "verify",
    defaultData: { label: "条件判断", expression: "" },
  },
  {
    type: "wait",
    label: "等待延迟",
    icon: Timer,
    description: "暂停等待指定秒数",
    category: "verify",
    defaultData: { label: "等待延迟", seconds: 2 },
  },
]

export const STEP_CATEGORIES = [
  { id: "request", label: "接口请求", icon: Send },
  { id: "app_ui", label: "App 操作", icon: Smartphone },
  { id: "data", label: "数据处理", icon: Braces },
  { id: "verify", label: "验证与控制", icon: CheckCircle2 },
]

// ===================== 节点色彩 =====================

const STEP_COLORS: Record<string, { border: string; bg: string; text: string; iconBg: string; ring: string }> = {
  httpRequest:    { border: "border-blue-500/30",   bg: "bg-blue-500/5",   text: "text-blue-500",   iconBg: "bg-blue-500/10",   ring: "ring-blue-500/20" },
  // App UI 操作共用紫色系
  appLaunchApp:   { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-500", iconBg: "bg-purple-500/10", ring: "ring-purple-500/20" },
  appClick:       { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-500", iconBg: "bg-purple-500/10", ring: "ring-purple-500/20" },
  appLongPress:   { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-500", iconBg: "bg-purple-500/10", ring: "ring-purple-500/20" },
  appDoubleClick: { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-500", iconBg: "bg-purple-500/10", ring: "ring-purple-500/20" },
  appType:        { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-500", iconBg: "bg-purple-500/10", ring: "ring-purple-500/20" },
  appClearText:   { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-500", iconBg: "bg-purple-500/10", ring: "ring-purple-500/20" },
  appSwipe:       { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-500", iconBg: "bg-purple-500/10", ring: "ring-purple-500/20" },
  appTapXy:       { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-500", iconBg: "bg-purple-500/10", ring: "ring-purple-500/20" },
  appWaitElement: { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-500", iconBg: "bg-purple-500/10", ring: "ring-purple-500/20" },
  appGetText:     { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-500", iconBg: "bg-purple-500/10", ring: "ring-purple-500/20" },
  appScreenshot:  { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-500", iconBg: "bg-purple-500/10", ring: "ring-purple-500/20" },
  appPressKey:    { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-500", iconBg: "bg-purple-500/10", ring: "ring-purple-500/20" },
  sqlQuery:    { border: "border-emerald-500/30", bg: "bg-emerald-500/5", text: "text-emerald-500", iconBg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
  assertion:   { border: "border-violet-500/30", bg: "bg-violet-500/5", text: "text-violet-500", iconBg: "bg-violet-500/10", ring: "ring-violet-500/20" },
  extract:     { border: "border-cyan-500/30", bg: "bg-cyan-500/5", text: "text-cyan-500", iconBg: "bg-cyan-500/10", ring: "ring-cyan-500/20" },
  script:      { border: "border-amber-500/30", bg: "bg-amber-500/5", text: "text-amber-500", iconBg: "bg-amber-500/10", ring: "ring-amber-500/20" },
  wait:        { border: "border-slate-500/30", bg: "bg-slate-500/5", text: "text-slate-400", iconBg: "bg-slate-500/10", ring: "ring-slate-500/20" },
  condition:   { border: "border-pink-500/30", bg: "bg-pink-500/5", text: "text-pink-500", iconBg: "bg-pink-500/10", ring: "ring-pink-500/20" },
}

function getStepIcon(type: string): LucideIcon {
  const iconMap: Record<string, LucideIcon> = {
    httpRequest:    Globe,
    appLaunchApp:   AppWindow,
    appClick:       Pointer,
    appLongPress:   Hand,
    appDoubleClick: MousePointerClick,
    appType:        Type,
    appClearText:   Eraser,
    appSwipe:       MoveUp,
    appTapXy:       ScanLine,
    appWaitElement: Eye,
    appGetText:     Variable,
    appScreenshot:  Camera,
    appPressKey:    Keyboard,
    sqlQuery:       Database,
    assertion:      CheckCircle2,
    extract:        FileJson,
    script:         Terminal,
    wait:           Timer,
    condition:      GitBranch,
  }
  return iconMap[type] ?? Smartphone
}

// ===================== 状态指示器 =====================

function StatusDot({ status }: { status?: string }) {
  if (!status || status === "idle") return null
  return (
    <div className="absolute -top-1.5 -right-1.5 z-10">
      {status === "running" && <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center"><Loader2 className="w-3 h-3 text-blue-400 animate-spin" /></div>}
      {status === "success" && <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-green-400" /></div>}
      {status === "error" && <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center"><XCircle className="w-3 h-3 text-red-400" /></div>}
    </div>
  )
}

// ===================== Handle 基础样式 =====================

const handleSourceClass = "!w-2.5 !h-2.5 !rounded-full !border-2 !bg-sidebar"
const handleTargetClass = "!w-2.5 !h-2.5 !rounded-full !border-2 !bg-sidebar"

// ===================== HTTP 请求 节点 =====================

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-500/10 text-green-500 border-green-500/20",
  POST: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  PUT: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  DELETE: "bg-red-500/10 text-red-500 border-red-500/20",
  PATCH: "bg-purple-500/10 text-purple-500 border-purple-500/20",
}

export const HttpRequestNode = memo(({ data, selected }: NodeProps<HttpStepNode>) => {
  const c = STEP_COLORS.httpRequest
  return (
    <div className={cn("relative rounded-2xl border-2 px-4 py-3 min-w-[220px] max-w-[280px] bg-sidebar shadow-sm transition-all", selected ? `${c.border} shadow-lg ring-2 ${c.ring}` : "border-white/10 hover:border-white/20")}>
      <StatusDot status={data.status} />
      <Handle type="target" position={Position.Left} className={cn(handleTargetClass, "!border-blue-500/40")} />
      <div className="flex items-center gap-2.5 mb-2">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shrink-0", c.iconBg, c.border)}>
          <Globe className={cn("w-4 h-4", c.text)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold truncate">{data.label}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={cn("text-[10px] px-1.5 py-0 rounded-xl font-mono font-bold border shrink-0", METHOD_COLORS[data.method] || METHOD_COLORS.GET)}>
          {data.method}
        </Badge>
        <span className="text-[10px] text-muted-foreground/60 font-mono truncate flex-1">{data.url || "/api/..."}</span>
      </div>
      <Handle type="source" position={Position.Right} className={cn(handleSourceClass, "!border-blue-500/40")} />
    </div>
  )
})
HttpRequestNode.displayName = "HttpRequestNode"

// ===================== App UI 操作 节点（通用渲染器，按 node type 区分图标） =====================

const APP_UI_ACTION_LABELS: Record<string, string> = {
  launch_app:   "启动 App",
  click:        "点击",
  long_press:   "长按",
  double_click: "双击",
  type:         "输入文本",
  clear_text:   "清空文本",
  swipe:        "滑动屏幕",
  tap_xy:       "坐标点击",
  wait_element: "等待",
  get_text:     "获取文本",
  screenshot:   "截图",
  press_key:    "按键操作",
}

/** 通用 App UI 操作节点渲染器，由 useNodeType() 感知自身 type */
function makeAppUiNode(nodeType: string) {
  const Component = memo(({ data, selected }: NodeProps) => {
    const c = STEP_COLORS[nodeType] ?? STEP_COLORS.appLaunchApp
    const Icon = getStepIcon(nodeType)
    const d = data as AppUiStepData
    const actionLabel = APP_UI_ACTION_LABELS[d.action as string] || d.action

    // 节点预览：按 action 决定副标题内容
    const getPreview = () => {
      if (d.action === "launch_app") {
        const isWarm = d.launch_type === "warm"
        return (
          <div className="space-y-1.5">
            {/* 第一行：Package ID */}
            <div className="text-[10px] text-muted-foreground/50 bg-muted/20 rounded-xl px-2 py-1 font-mono truncate">
              {d.app_id || "未配置"}
            </div>
            {/* 第二行：冷/热启动标签 */}
            <div className="flex gap-2">
              {/* 冷启动标签 */}
              <div className={cn(
                "flex-1 inline-flex items-center justify-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all",
                isWarm
                  ? "bg-muted/30 text-muted-foreground/40 border-white/10"
                  : "bg-blue-500/15 text-blue-400 border-blue-500/30"
              )}>
                <Snowflake className="w-2.5 h-2.5" />
                冷启动
              </div>
              {/* 热启动标签 */}
              <div className={cn(
                "flex-1 inline-flex items-center justify-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all",
                !isWarm
                  ? "bg-muted/30 text-muted-foreground/40 border-white/10"
                  : "bg-orange-500/15 text-orange-400 border-orange-500/30"
              )}>
                <Flame className="w-2.5 h-2.5" />
                热启动
              </div>
            </div>
          </div>
        )
      }
      return d.app_id || d.selector || d.coordinates || d.value || null
    }

    const preview = getPreview()

    return (
      <div className={cn("relative rounded-2xl border-2 px-4 py-3 min-w-[200px] max-w-[260px] bg-sidebar shadow-sm transition-all", selected ? `${c.border} shadow-lg ring-2 ${c.ring}` : "border-white/10 hover:border-white/20")}>
        <StatusDot status={d.status} />
        <Handle type="target" position={Position.Left} className={cn(handleTargetClass, "!border-purple-500/40")} />
        <div className="flex items-center gap-2.5 mb-1">
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shrink-0", c.iconBg, c.border)}>
            <Icon className={cn("w-4 h-4", c.text)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold truncate">{d.label}</p>
            <p className={cn("text-[10px]", c.text, "opacity-70")}>{actionLabel}</p>
          </div>
        </div>
        {preview && (
          typeof preview === "string" ? (
            <div className="mt-1.5 text-[10px] text-muted-foreground/50 bg-muted/20 rounded-xl px-2 py-1 font-mono truncate">{preview}</div>
          ) : (
            <div className="mt-1.5">{preview}</div>
          )
        )}
        <Handle type="source" position={Position.Right} className={cn(handleSourceClass, "!border-purple-500/40")} />
      </div>
    )
  })
  Component.displayName = `AppUiNode_${nodeType}`
  return Component
}

export const AppLaunchAppNode   = makeAppUiNode("appLaunchApp")
export const AppClickNode_      = makeAppUiNode("appClick")
export const AppLongPressNode_  = makeAppUiNode("appLongPress")
export const AppDoubleClickNode_= makeAppUiNode("appDoubleClick")
export const AppTypeNode_       = makeAppUiNode("appType")
export const AppClearTextNode_  = makeAppUiNode("appClearText")
export const AppSwipeNode_      = makeAppUiNode("appSwipe")
export const AppTapXyNode_      = makeAppUiNode("appTapXy")
export const AppWaitElementNode_= makeAppUiNode("appWaitElement")
export const AppGetTextNode_    = makeAppUiNode("appGetText")
export const AppScreenshotNode_ = makeAppUiNode("appScreenshot")
export const AppPressKeyNode_   = makeAppUiNode("appPressKey")

// ===================== SQL 查询 节点 =====================

export const SqlQueryNode = memo(({ data, selected }: NodeProps<SqlStepNode>) => {
  const c = STEP_COLORS.sqlQuery
  return (
    <div className={cn("relative rounded-2xl border-2 px-4 py-3 min-w-[200px] max-w-[260px] bg-sidebar shadow-sm transition-all", selected ? `${c.border} shadow-lg ring-2 ${c.ring}` : "border-white/10 hover:border-white/20")}>
      <StatusDot status={data.status} />
      <Handle type="target" position={Position.Left} className={cn(handleTargetClass, "!border-emerald-500/40")} />
      <div className="flex items-center gap-2.5 mb-1">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shrink-0", c.iconBg, c.border)}>
          <Database className={cn("w-4 h-4", c.text)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold truncate">{data.label}</p>
          <p className="text-[10px] text-muted-foreground">数据库: {data.connection || "default"}</p>
        </div>
      </div>
      {data.query && <div className="mt-1.5 text-[10px] text-muted-foreground/50 bg-muted/20 rounded-xl px-2 py-1 font-mono truncate">{data.query}</div>}
      <Handle type="source" position={Position.Right} className={cn(handleSourceClass, "!border-emerald-500/40")} />
    </div>
  )
})
SqlQueryNode.displayName = "SqlQueryNode"

// ===================== 断言验证 节点 =====================

const ASSERT_LABELS: Record<string, string> = {
  status_code: "状态码", json_path: "JSON Path", contains: "包含",
  equals: "相等", regex: "正则", schema: "Schema",
}

export const AssertionNode = memo(({ data, selected }: NodeProps<AssertStepNode>) => {
  const c = STEP_COLORS.assertion
  return (
    <div className={cn("relative rounded-2xl border-2 px-4 py-3 min-w-[200px] max-w-[260px] bg-sidebar shadow-sm transition-all", selected ? `${c.border} shadow-lg ring-2 ${c.ring}` : "border-white/10 hover:border-white/20")}>
      <StatusDot status={data.status} />
      <Handle type="target" position={Position.Left} className={cn(handleTargetClass, "!border-violet-500/40")} />
      <div className="flex items-center gap-2.5 mb-1">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shrink-0", c.iconBg, c.border)}>
          <CheckCircle2 className={cn("w-4 h-4", c.text)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold truncate">{data.label}</p>
          <p className="text-[10px] text-muted-foreground">{ASSERT_LABELS[data.assertType] || data.assertType}</p>
        </div>
      </div>
      {data.expression && <div className="mt-1.5 text-[10px] text-muted-foreground/50 bg-muted/20 rounded-xl px-2 py-1 font-mono truncate">{data.expression} → {data.expected}</div>}
      <Handle type="source" position={Position.Right} className={cn(handleSourceClass, "!border-violet-500/40")} />
    </div>
  )
})
AssertionNode.displayName = "AssertionNode"

// ===================== 变量提取 节点 =====================

export const ExtractNode = memo(({ data, selected }: NodeProps<ExtractStepNode>) => {
  const c = STEP_COLORS.extract
  return (
    <div className={cn("relative rounded-2xl border-2 px-4 py-3 min-w-[200px] max-w-[260px] bg-sidebar shadow-sm transition-all", selected ? `${c.border} shadow-lg ring-2 ${c.ring}` : "border-white/10 hover:border-white/20")}>
      <StatusDot status={data.status} />
      <Handle type="target" position={Position.Left} className={cn(handleTargetClass, "!border-cyan-500/40")} />
      <div className="flex items-center gap-2.5 mb-1">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shrink-0", c.iconBg, c.border)}>
          <Variable className={cn("w-4 h-4", c.text)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold truncate">{data.label}</p>
          <p className="text-[10px] text-muted-foreground">{data.source === "json_path" ? "JSONPath" : data.source === "regex" ? "正则" : data.source === "header" ? "Header" : data.source === "cookie" ? "Cookie" : "CSS"}</p>
        </div>
      </div>
      {data.varName && <div className="mt-1.5 text-[10px] bg-muted/20 rounded-xl px-2 py-1 font-mono truncate"><span className="text-cyan-500">${`{${data.varName}}`}</span> = {data.expression}</div>}
      <Handle type="source" position={Position.Right} className={cn(handleSourceClass, "!border-cyan-500/40")} />
    </div>
  )
})
ExtractNode.displayName = "ExtractNode"

// ===================== 脚本执行 节点 =====================

export const ScriptNode = memo(({ data, selected }: NodeProps<ScriptStepNode>) => {
  const c = STEP_COLORS.script
  return (
    <div className={cn("relative rounded-2xl border-2 px-4 py-3 min-w-[200px] max-w-[260px] bg-sidebar shadow-sm transition-all", selected ? `${c.border} shadow-lg ring-2 ${c.ring}` : "border-white/10 hover:border-white/20")}>
      <StatusDot status={data.status} />
      <Handle type="target" position={Position.Left} className={cn(handleTargetClass, "!border-amber-500/40")} />
      <div className="flex items-center gap-2.5 mb-1">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shrink-0", c.iconBg, c.border)}>
          <Terminal className={cn("w-4 h-4", c.text)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold truncate">{data.label}</p>
          <p className="text-[10px] text-muted-foreground">{data.language}</p>
        </div>
      </div>
      {data.code && <div className="mt-1.5 text-[10px] text-muted-foreground/50 bg-muted/20 rounded-xl px-2 py-1 font-mono truncate">{data.code.substring(0, 60)}</div>}
      <Handle type="source" position={Position.Right} className={cn(handleSourceClass, "!border-amber-500/40")} />
    </div>
  )
})
ScriptNode.displayName = "ScriptNode"

// ===================== 等待延迟 节点 =====================

export const WaitNode = memo(({ data, selected }: NodeProps<WaitStepNode>) => {
  const c = STEP_COLORS.wait
  return (
    <div className={cn("relative rounded-2xl border-2 px-3 py-2.5 min-w-[140px] bg-sidebar shadow-sm transition-all", selected ? `${c.border} shadow-lg ring-2 ${c.ring}` : "border-white/10 hover:border-white/20")}>
      <StatusDot status={data.status} />
      <Handle type="target" position={Position.Left} className={cn(handleTargetClass, "!border-slate-500/40")} />
      <div className="flex items-center gap-2">
        <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center border shrink-0", c.iconBg, c.border)}>
          <Timer className={cn("w-3.5 h-3.5", c.text)} />
        </div>
        <div>
          <p className="text-[12px] font-semibold">{data.label}</p>
          <p className="text-[10px] text-muted-foreground">{data.seconds}s</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className={cn(handleSourceClass, "!border-slate-500/40")} />
    </div>
  )
})
WaitNode.displayName = "WaitNode"

// ===================== 条件判断 节点 =====================

export const ConditionNode = memo(({ data, selected }: NodeProps<ConditionStepNode>) => {
  const c = STEP_COLORS.condition
  return (
    <div className={cn("relative rounded-2xl border-2 px-4 py-3 min-w-[200px] bg-sidebar shadow-sm transition-all", selected ? `${c.border} shadow-lg ring-2 ${c.ring}` : "border-white/10 hover:border-white/20")}>
      <StatusDot status={data.status} />
      <Handle type="target" position={Position.Left} className={cn(handleTargetClass, "!border-pink-500/40")} />
      <div className="flex items-center gap-2.5">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shrink-0", c.iconBg, c.border)}>
          <GitBranch className={cn("w-4 h-4", c.text)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold truncate">{data.label}</p>
          {data.expression && <p className="text-[10px] text-muted-foreground/50 font-mono truncate">{data.expression}</p>}
        </div>
      </div>
      {/* True / False 输出 */}
      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        <div className="flex items-center justify-end gap-1 text-[9px] font-bold text-green-500 bg-green-500/8 border border-green-500/20 rounded-xl px-2 py-1">
          <CheckCircle2 className="w-2.5 h-2.5" />True
        </div>
        <div className="flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-500/8 border border-red-500/20 rounded-xl px-2 py-1">
          <XCircle className="w-2.5 h-2.5" />False
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="true" style={{ top: "42%" }} className={cn(handleSourceClass, "!border-green-500/60 !bg-green-500/20")} />
      <Handle type="source" position={Position.Right} id="false" style={{ top: "72%" }} className={cn(handleSourceClass, "!border-red-500/60 !bg-red-500/20")} />
    </div>
  )
})
ConditionNode.displayName = "ConditionNode"

// ===================== 导出节点类型映射 =====================

export const nodeTypes = {
  httpRequest:    HttpRequestNode,
  appLaunchApp:   AppLaunchAppNode,
  appClick:       AppClickNode_,
  appLongPress:   AppLongPressNode_,
  appDoubleClick: AppDoubleClickNode_,
  appType:        AppTypeNode_,
  appClearText:   AppClearTextNode_,
  appSwipe:       AppSwipeNode_,
  appTapXy:       AppTapXyNode_,
  appWaitElement: AppWaitElementNode_,
  appGetText:     AppGetTextNode_,
  appScreenshot:  AppScreenshotNode_,
  appPressKey:    AppPressKeyNode_,
  sqlQuery:       SqlQueryNode,
  assertion:      AssertionNode,
  extract:        ExtractNode,
  script:         ScriptNode,
  wait:           WaitNode,
  condition:      ConditionNode,
}
