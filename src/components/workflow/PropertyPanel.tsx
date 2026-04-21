import React, { useState } from "react"
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
import { Settings, X, Trash2, Crosshair } from "lucide-react"
import type { LogEntry } from "./types"
import type { DeviceConfig } from "./DeviceBar"
import { ScreenshotPicker } from "./ScreenshotPicker"
import { APP_UI_NODE_TYPES } from "./nodes"
import type { NodeResult } from "@/services/api"

function FieldGroup({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {description && <p className="text-[10px] text-muted-foreground/50 leading-relaxed">{description}</p>}
      {children}
    </div>
  )
}

export function PropertyPanel({
  node,
  onClose,
  onUpdate,
  onDelete,
  logs,
  nodeResults = [],
  deviceConfig,
}: {
  node: Node | null
  onClose: () => void
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
  logs: LogEntry[]
  nodeResults?: NodeResult[]
  deviceConfig?: DeviceConfig
}) {
  if (!node) return null
  const d = node.data as Record<string, unknown>

  const setField = (key: string, value: unknown) => onUpdate(node.id, { ...d, [key]: value })

  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <div className="w-72 shrink-0 h-full rounded-2xl bg-sidebar border-l border-white/5 flex flex-col z-10 overflow-hidden">
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

          {/* ---- App UI 操作配置 ---- */}
          {APP_UI_NODE_TYPES.has(node.type ?? "") && (
            <>
              {/* launch_app */}
              {d.action === "launch_app" && (
                <>
                  <FieldGroup label="App Package ID" description="例如：com.example.app">
                    <Input value={(d.app_id as string) || ""} onChange={(e) => setField("app_id", e.target.value)} placeholder="com.example.app" className="h-8 text-xs font-mono rounded-2xl" />
                  </FieldGroup>
                  <FieldGroup label="启动方式">
                    <Select value={(d.launch_type as string) || "cold"} onValueChange={(v) => setField("launch_type", v)}>
                      <SelectTrigger className="h-8 text-sm rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cold">冷启动 - 完全重启应用</SelectItem>
                        <SelectItem value="warm">热启动 - 从后台恢复</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                </>
              )}

              {/* tap_xy */}
              {d.action === "tap_xy" && (
                <>
                  <FieldGroup label="坐标 (x,y)" description="点击📸按钮在截图上选取，或手动输入像素坐标">
                    <div className="flex gap-1.5">
                      <Input
                        value={(d.coordinates as string) || ""}
                        onChange={(e) => setField("coordinates", e.target.value)}
                        placeholder="540,960"
                        className="h-8 text-xs font-mono rounded-2xl flex-1"
                      />
                      <button
                        onClick={() => setPickerOpen(true)}
                        title="在设备截图上点选坐标"
                        className="h-8 w-8 shrink-0 rounded-2xl border border-white/10 bg-muted/30 hover:bg-muted/60 flex items-center justify-center transition-colors"
                      >
                        <Crosshair className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </FieldGroup>
                  <ScreenshotPicker
                    open={pickerOpen}
                    onClose={() => setPickerOpen(false)}
                    onSelect={(x, y) => setField("coordinates", `${x},${y}`)}
                    deviceSerial={deviceConfig?.device_serial ?? undefined}
                    deviceType={deviceConfig?.device_type}
                  />
                </>
              )}

              {/* press_key */}
              {d.action === "press_key" && (
                <FieldGroup label="按键名称" description="home / back / recent / volume_up / volume_down / power / enter">
                  <Select value={(d.key_code as string) || "home"} onValueChange={(v) => setField("key_code", v)}>
                    <SelectTrigger className="h-8 text-sm rounded-2xl"><SelectValue /></SelectTrigger>
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

              {/* selector-based actions */}
              {!["launch_app", "tap_xy", "press_key", "swipe", "screenshot"].includes(d.action as string) && (
                <FieldGroup label="组件选择器" description="XPath 或 Resource ID，如 //android.widget.Button[@text='OK'] 或 com.app:id/btn_login">
                  <Input value={(d.selector as string) || ""} onChange={(e) => setField("selector", e.target.value)} placeholder="//android.widget.Button[@text='OK']" className="h-8 text-xs font-mono rounded-2xl" />
                </FieldGroup>
              )}

              {/* type: input value */}
              {d.action === "type" && (
                <FieldGroup label="输入值" description="支持 {{variable}} 变量引用">
                  <Input value={(d.value as string) || ""} onChange={(e) => setField("value", e.target.value)} placeholder="输入内容" className="h-8 text-xs rounded-2xl" />
                </FieldGroup>
              )}

              {/* swipe: direction */}
              {d.action === "swipe" && (
                <FieldGroup label="滑动方向">
                  <Select value={(d.value as string) || "up"} onValueChange={(v) => setField("value", v)}>
                    <SelectTrigger className="h-8 text-sm rounded-2xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="up">向上</SelectItem>
                      <SelectItem value="down">向下</SelectItem>
                      <SelectItem value="left">向左</SelectItem>
                      <SelectItem value="right">向右</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>
              )}

              {/* long_press: duration */}
              {d.action === "long_press" && (
                <FieldGroup label="按压时长 (ms)" description="默认 1000ms">
                  <Input type="number" value={(d.duration_ms as number) || 1000} onChange={(e) => setField("duration_ms", Number(e.target.value))} className="h-8 text-sm rounded-2xl" />
                </FieldGroup>
              )}

              {/* get_text: var_name */}
              {d.action === "get_text" && (
                <FieldGroup label="存入变量名" description="后续步骤通过 {{变量名}} 引用">
                  <Input value={(d.var_name as string) || ""} onChange={(e) => setField("var_name", e.target.value)} placeholder="element_text" className="h-8 text-xs font-mono rounded-2xl" />
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

          {/* 执行日志 */}
          {(() => {
            const nodeLogs = logs.filter((l) => l.nodeId === node.id)
            if (nodeLogs.length === 0) return null
            return (
              <div className="pt-3 border-t border-white/5 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">执行日志</p>
                <div className="h-60 overflow-y-auto rounded-xl bg-muted/40 border border-border/40 p-2.5 space-y-0.5 font-mono text-[11px] leading-5">
                  {nodeLogs.map((log, i) => {
                    const prefix = log.status === "running" ? "·" : log.status === "success" ? "✓" : "✗"
                    const dur = log.duration !== undefined ? ` (${log.duration}ms)` : ""
                    return (
                      <div key={i} className="flex gap-1.5 text-foreground/70">
                        <span className="shrink-0 text-foreground/30">{log.timestamp}</span>
                        <span className={cn("shrink-0 font-bold", log.status === "error" && "text-foreground")}>{prefix}</span>
                        <span className="break-all">{log.message || (log.status === "running" ? "执行中..." : "OK")}{dur}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* 执行截图 */}
          {(() => {
            const nr = nodeResults.find((r) => r.node_id === node.id)
            if (!nr?.screenshot) return null
            return (
              <div className="pt-3 border-t border-white/5 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">执行截图</p>
                <img
                  src={nr.screenshot}
                  alt="执行截图"
                  className="w-full rounded-xl border border-border/40 object-contain"
                />
              </div>
            )
          })()}
        </div>
      </ScrollArea>
    </div>
  )
}
