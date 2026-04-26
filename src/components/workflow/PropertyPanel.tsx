import { useCallback, type ReactNode } from "react"
import type { Node } from "@xyflow/react"
import { cn } from "@/lib/utils"
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
import { Settings, X, Trash2, ScanLine, Type } from "lucide-react"
import type { DeviceConfig } from "./DeviceBar"
import { APP_UI_NODE_TYPES } from "./nodes"
import { InlinePicker, type PickResult, type ModelingData } from "./InlinePicker"

// ── 支持内联点选的 action ──────────────────────────────────────────────────────
// 不包含：launch_app / screenshot / press_key / swipe（无需元素定位）

const PICKER_ACTIONS = new Set([
  "click", "long_press", "double_click",
  "type", "clear_text",
  "tap_xy", "wait_element", "get_text",
])

// ── FieldGroup ────────────────────────────────────────────────────────────────

function FieldGroup({
  label, description, children,
}: {
  label: string; description?: string; children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-foreground/85 tracking-wide">{label}</label>
      {description && <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{description}</p>}
      {children}
    </div>
  )
}

function Section({
  title,
  icon,
  children,
  className,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-xl border border-border/70 bg-card/35 p-3.5 space-y-3", className)}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </section>
  )
}

const INPUT_CLASS = "h-9 text-sm rounded-lg border-border/70 bg-background/70"
const TEXTAREA_CLASS = "text-xs font-mono rounded-lg border-border/70 bg-background/70 resize-none"
const SELECT_TRIGGER_CLASS = "h-9 text-sm rounded-lg border-border/70 bg-background/70"

// ── PropertyPanel ─────────────────────────────────────────────────────────────

export function PropertyPanel({
  node,
  onClose,
  onUpdate,
  onDelete,
  deviceConfig,
}: {
  node: Node | null
  onClose: () => void
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
  // 以下保留签名兼容，暂不渲染
  logs?: unknown[]
  nodeResults?: unknown[]
  deviceConfig?: DeviceConfig
}) {
  if (!node) return null
  const d = node.data as Record<string, unknown>
  const setField = (key: string, value: unknown) => onUpdate(node.id, { ...d, [key]: value })

  const action = d.action as string | undefined
  const showPicker = APP_UI_NODE_TYPES.has(node.type ?? "") && !!action && PICKER_ACTIONS.has(action)

  // 从节点数据中读取已持久化的建模缓存
  const modelingData = (d._modelingData as ModelingData | undefined) ?? null

  /** 建模完成后将数据写回节点（持久化到 workflow） */
  const handleDataReady = useCallback((data: ModelingData) => {
    onUpdate(node.id, { ...d, _modelingData: data })
  }, [node.id, d, onUpdate])

  /** 点选结果回填对应字段，同时保存 bounds 用于回显 */
  const handlePick = (r: PickResult) => {
    if (action === "tap_xy") {
      onUpdate(node.id, { ...d, coordinates: `${r.x},${r.y}`, _selBounds: r.bounds ?? null })
    } else if (r.selector) {
      onUpdate(node.id, { ...d, selector: r.selector, _selBounds: r.bounds ?? null })
    } else if (r.text) {
      onUpdate(node.id, { ...d, selector: r.text, _selBounds: r.bounds ?? null })
    }
  }

  return (
    <div className="w-90 shrink-0 h-full rounded-2xl bg-sidebar/95 backdrop-blur-sm border-l border-border/70 flex flex-col z-10 overflow-hidden">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-border/70 shrink-0 bg-sidebar/95">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">步骤配置</span>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded-md bg-muted/60 text-foreground/80 font-medium truncate max-w-[150px]">
            {(d.label as string) || "未命名步骤"}
          </span>
          <span className="px-2 py-1 rounded-md bg-coral/10 text-coral font-medium">
            {node.type || "unknown"}
          </span>
          {action && (
            <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-500 font-medium">
              {action}
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">

          <Section title="基础信息" icon={<Type className="w-4 h-4 text-coral" />}>
            <FieldGroup label="步骤名称">
              <Input value={(d.label as string) || ""} onChange={(e) => setField("label", e.target.value)} className={INPUT_CLASS} />
            </FieldGroup>
          </Section>

          {/* ── 内联点选画布（所有支持的 App UI 操作节点） ── */}
          {showPicker && (
            <Section title="数据建模" icon={<ScanLine className="w-4 h-4 text-blue-500" />}>
              <FieldGroup label="元素/坐标点选" description="点击截图选取元素或坐标，自动填入下方字段">
                <InlinePicker
                  key={node.id}
                  deviceSerial={deviceConfig?.device_serial ?? undefined}
                  deviceType={deviceConfig?.device_type}
                  action={action!}
                  initialData={modelingData}
                  initialBounds={(d._selBounds as { x1: number; y1: number; x2: number; y2: number } | null) ?? null}
                  onPick={handlePick}
                  onDataReady={handleDataReady}
                />
              </FieldGroup>
            </Section>
          )}

          {/* ── App UI 操作字段 ── */}
          {APP_UI_NODE_TYPES.has(node.type ?? "") && (
            <Section title="App UI 参数">
              {/* launch_app */}
              {action === "launch_app" && (
                <>
                  <FieldGroup label="App Package ID" description="例如：com.example.app">
                    <Input value={(d.app_id as string) || ""} onChange={(e) => setField("app_id", e.target.value)} placeholder="com.example.app" className={cn(INPUT_CLASS, "font-mono")} />
                  </FieldGroup>
                  <FieldGroup label="启动方式">
                    <Select value={(d.launch_type as string) || "cold"} onValueChange={(v) => setField("launch_type", v)}>
                      <SelectTrigger className={SELECT_TRIGGER_CLASS}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cold">冷启动 - 完全重启应用</SelectItem>
                        <SelectItem value="warm">热启动 - 从后台恢复</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                </>
              )}

              {/* tap_xy — 坐标字段 */}
              {action === "tap_xy" && (
                <FieldGroup label="坐标 (x,y)">
                  <Input
                    value={(d.coordinates as string) || ""}
                    onChange={(e) => setField("coordinates", e.target.value)}
                    placeholder="540,960"
                    className={cn(INPUT_CLASS, "font-mono")}
                  />
                </FieldGroup>
              )}

              {/* press_key */}
              {action === "press_key" && (
                <FieldGroup label="按键名称" description="home / back / recent / volume_up / volume_down / power / enter">
                  <Select value={(d.key_code as string) || "home"} onValueChange={(v) => setField("key_code", v)}>
                    <SelectTrigger className={SELECT_TRIGGER_CLASS}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Home 键</SelectItem>
                      <SelectItem value="back">返回键</SelectItem>
                      <SelectItem value="recent">最近任务键</SelectItem>
                      <SelectItem value="volume_up">音量+</SelectItem>
                      <SelectItem value="volume_down">音量-</SelectItem>
                      <SelectItem value="power">电源键</SelectItem>
                      <SelectItem value="enter">回车键</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>
              )}

              {/* swipe */}
              {action === "swipe" && (
                <FieldGroup label="滑动方向">
                  <Select value={(d.value as string) || "up"} onValueChange={(v) => setField("value", v)}>
                    <SelectTrigger className={SELECT_TRIGGER_CLASS}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="up">向上</SelectItem>
                      <SelectItem value="down">向下</SelectItem>
                      <SelectItem value="left">向左</SelectItem>
                      <SelectItem value="right">向右</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>
              )}

              {/* 组件选择器（click/double_click/long_press/type/clear_text/wait_element/get_text） */}
              {action && !["launch_app", "tap_xy", "press_key", "swipe", "screenshot"].includes(action) && (
                <FieldGroup label="组件选择器" description="Resource ID / 文字 / XPath，可从上方截图点选自动填入">
                  <Input
                    value={(d.selector as string) || ""}
                    onChange={(e) => setField("selector", e.target.value)}
                    placeholder='com.app:id/btn_login 或 登录'
                    className={cn(INPUT_CLASS, "font-mono")}
                  />
                </FieldGroup>
              )}

              {/* type: 输入值 */}
              {action === "type" && (
                <FieldGroup label="输入值" description="支持 {{variable}} 变量引用">
                  <Input value={(d.value as string) || ""} onChange={(e) => setField("value", e.target.value)} placeholder="输入内容" className={INPUT_CLASS} />
                </FieldGroup>
              )}

              {/* long_press: 时长 */}
              {action === "long_press" && (
                <FieldGroup label="按压时长 (ms)" description="默认 1000ms">
                  <Input type="number" value={(d.duration_ms as number) || 1000} onChange={(e) => setField("duration_ms", Number(e.target.value))} className={INPUT_CLASS} />
                </FieldGroup>
              )}

              {/* get_text: 变量名 */}
              {action === "get_text" && (
                <FieldGroup label="存入变量名" description="后续步骤通过 {{变量名}} 引用">
                  <Input value={(d.var_name as string) || ""} onChange={(e) => setField("var_name", e.target.value)} placeholder="element_text" className={cn(INPUT_CLASS, "font-mono")} />
                </FieldGroup>
              )}
            </Section>
          )}

          {/* ── HTTP 请求 ── */}
          {node.type === "httpRequest" && (
            <Section title="HTTP 请求参数">
              <FieldGroup label="请求方法">
                <Select value={(d.method as string) || "GET"} onValueChange={(v) => setField("method", v)}>
                  <SelectTrigger className={SELECT_TRIGGER_CLASS}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="URL" description="支持 {{variable}} 变量引用">
                <Input value={(d.url as string) || ""} onChange={(e) => setField("url", e.target.value)} placeholder="/api/v1/users" className={cn(INPUT_CLASS, "font-mono")} />
              </FieldGroup>
              <FieldGroup label="Headers (JSON)">
                <Textarea value={(d.headers as string) || ""} onChange={(e) => setField("headers", e.target.value)} placeholder='{"Authorization":"Bearer {{token}}"}' rows={3} className={TEXTAREA_CLASS} />
              </FieldGroup>
              <FieldGroup label="Body (JSON)" description="仅 POST/PUT/PATCH 生效">
                <Textarea value={(d.body as string) || ""} onChange={(e) => setField("body", e.target.value)} placeholder='{"key":"value"}' rows={4} className={TEXTAREA_CLASS} />
              </FieldGroup>
              <FieldGroup label="超时 (ms)">
                <Input type="number" value={(d.timeout as number) || 30000} onChange={(e) => setField("timeout", Number(e.target.value))} className={INPUT_CLASS} />
              </FieldGroup>
            </Section>
          )}

          {/* ── SQL ── */}
          {node.type === "sqlQuery" && (
            <Section title="SQL 查询参数">
              <FieldGroup label="数据库连接">
                <Input value={(d.connection as string) || ""} onChange={(e) => setField("connection", e.target.value)} placeholder="prod_db" className={INPUT_CLASS} />
              </FieldGroup>
              <FieldGroup label="SQL 语句">
                <Textarea value={(d.query as string) || ""} onChange={(e) => setField("query", e.target.value)} placeholder="SELECT * FROM users WHERE id = ?" rows={4} className={TEXTAREA_CLASS} />
              </FieldGroup>
              <FieldGroup label="结果存入变量">
                <Input value={(d.extractVar as string) || ""} onChange={(e) => setField("extractVar", e.target.value)} placeholder="sql_result" className={cn(INPUT_CLASS, "font-mono")} />
              </FieldGroup>
            </Section>
          )}

          {/* ── 断言 ── */}
          {node.type === "assertion" && (
            <Section title="断言参数">
              <FieldGroup label="断言类型">
                <Select value={(d.assertType as string) || "status_code"} onValueChange={(v) => setField("assertType", v)}>
                  <SelectTrigger className={SELECT_TRIGGER_CLASS}><SelectValue /></SelectTrigger>
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
                <Input value={(d.expression as string) || ""} onChange={(e) => setField("expression", e.target.value)} placeholder="$.data.token" className={cn(INPUT_CLASS, "font-mono")} />
              </FieldGroup>
              <FieldGroup label="期望值">
                <Input value={(d.expected as string) || ""} onChange={(e) => setField("expected", e.target.value)} placeholder="200" className={cn(INPUT_CLASS, "font-mono")} />
              </FieldGroup>
            </Section>
          )}

          {/* ── 变量提取 ── */}
          {node.type === "extract" && (
            <Section title="变量提取参数">
              <FieldGroup label="提取方式">
                <Select value={(d.source as string) || "json_path"} onValueChange={(v) => setField("source", v)}>
                  <SelectTrigger className={SELECT_TRIGGER_CLASS}><SelectValue /></SelectTrigger>
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
                <Input value={(d.expression as string) || ""} onChange={(e) => setField("expression", e.target.value)} placeholder="$.data.token" className={cn(INPUT_CLASS, "font-mono")} />
              </FieldGroup>
              <FieldGroup label="变量名">
                <Input value={(d.varName as string) || ""} onChange={(e) => setField("varName", e.target.value)} placeholder="auth_token" className={cn(INPUT_CLASS, "font-mono")} />
              </FieldGroup>
            </Section>
          )}

          {/* ── 脚本 ── */}
          {node.type === "script" && (
            <Section title="脚本参数">
              <FieldGroup label="脚本语言">
                <Select value={(d.language as string) || "python"} onValueChange={(v) => setField("language", v)}>
                  <SelectTrigger className={SELECT_TRIGGER_CLASS}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="shell">Shell</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="代码">
                <Textarea value={(d.code as string) || ""} onChange={(e) => setField("code", e.target.value)} placeholder="# your code here" rows={8} className={TEXTAREA_CLASS} />
              </FieldGroup>
            </Section>
          )}

          {/* ── 等待 ── */}
          {node.type === "wait" && (
            <Section title="等待参数">
              <FieldGroup label="等待秒数">
                <Input type="number" value={(d.seconds as number) || 2} onChange={(e) => setField("seconds", Number(e.target.value))} className={INPUT_CLASS} />
              </FieldGroup>
            </Section>
          )}

          {/* ── 条件 ── */}
          {node.type === "condition" && (
            <Section title="条件分支参数">
              <FieldGroup label="条件表达式" description="满足条件走 True 分支，否则走 False 分支">
                <Textarea value={(d.expression as string) || ""} onChange={(e) => setField("expression", e.target.value)} placeholder="response.status === 200" rows={3} className={TEXTAREA_CLASS} />
              </FieldGroup>
            </Section>
          )}

        </div>
      </ScrollArea>

      {/* 底部操作栏 */}
      <div className="shrink-0 p-3 border-t border-border/70 bg-sidebar/95">
        <Button variant="destructive" size="sm" className="w-full rounded-lg h-9" onClick={() => onDelete(node.id)}>
          <Trash2 className="w-4 h-4 mr-2" />删除步骤
        </Button>
      </div>
    </div>
  )
}
