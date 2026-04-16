import React from "react"
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
import { Settings, X, Trash2 } from "lucide-react"
import type { LogEntry } from "./types"

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
}: {
  node: Node | null
  onClose: () => void
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
  logs: LogEntry[]
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
              {d.action === "navigate" ? (
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
              {d.action === "launch_app" ? (
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

          {/* 执行日志 */}
          {(() => {
            const nodeLogs = logs.filter((l) => l.nodeId === node.id)
            if (nodeLogs.length === 0) return null
            return (
              <div className="pt-3 border-t border-white/5 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">执行日志</p>
                <div className="h-36 overflow-y-auto rounded-xl bg-muted/40 border border-border/40 p-2.5 space-y-0.5 font-mono text-[11px] leading-5">
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
        </div>
      </ScrollArea>
    </div>
  )
}
