/**
 * 自动化工作流编排页面
 * 核心理念：选择测试用例 → 为该用例编排自动化执行步骤流
 * 基于 React Flow (@xyflow/react) 实现
 */
import { useState, useCallback, useEffect, useRef, type DragEvent } from "react"
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
import { Button } from "@/components/ui/button"
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
  Save,
  Play,
  Layers,
  Workflow,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  FlaskConical,
  Zap,
  Globe,
  Cpu,
  MousePointerClick,
  type LucideIcon,
} from "lucide-react"
import { nodeTypes } from "@/components/workflow/nodes"
import { fetchFlow, saveFlow, createRunJob, subscribeRunJob, callLocalAgent, reportAgentResult, getCaseExecution, type TestCase, type NodeResult } from "@/services/api"
import { StepPalette } from "@/components/workflow/StepPalette"
import { PropertyPanel } from "@/components/workflow/PropertyPanel"
import { TestCasePickerDialog } from "@/components/workflow/TestCasePicker"
import { RunResultToast } from "@/components/workflow/RunResultToast"
import { DeviceBar, type DeviceConfig } from "@/components/workflow/DeviceBar"
import type { LogEntry, RunResult } from "@/components/workflow/types"

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
  const [panelOpen, setPanelOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<Node, Edge> | null>(null)

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [nodeResults, setNodeResults] = useState<NodeResult[]>([])
  const sseCleanupRef = useRef<(() => void) | null>(null)

  // 全局设备配置（device_type + device_serial）
  const [deviceConfig, setDeviceConfig] = useState<DeviceConfig>({
    device_type: "android",
    device_serial: null,
  })

  // 切换测试用例时加载对应 flow
  useEffect(() => {
    setNodes([])
    setEdges([])
    setLogs([])
    setRunResult(null)
    setNodeResults([])
    if (!testCase) return
    fetchFlow(testCase.id)
      .then((flow) => {
        if (!flow) return
        setNodes(flow.nodes as Node[])
        setEdges(
          (flow.edges as Edge[]).map((e) => ({
            ...e,
            type: "default",
            animated: true,
            style: { strokeDasharray: "6 3" },
            markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
          }))
        )
      })
      .catch(console.error)
    // 加载最近一次执行结果（含截图和日志）
    getCaseExecution(testCase.id)
      .then((data) => {
        if (!data) return
        setNodeResults(data.node_results)
        const ts = new Date(data.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        setLogs(data.node_results.map((r) => ({
          nodeId: r.node_id,
          label: r.label,
          status: r.success ? "success" : "error",
          message: r.message,
          duration: Math.round(r.duration * 1000),
          timestamp: ts,
        })))
      })
      .catch(console.error)
  }, [testCase, setNodes, setEdges])

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({
        ...params,
        type: "default",
        animated: true,
        style: { strokeDasharray: "6 3" },
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      }, eds)),
    [setEdges],
  )

  const onReconnect = useCallback(
    (oldEdge: Edge, newConn: Connection) => setEdges((els) => reconnectEdge(oldEdge, newConn, els)),
    [setEdges],
  )

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

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setPanelOpen(true)
  }, [])
  const onPaneClick = useCallback(() => setPanelOpen(false), [])

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
      setPanelOpen(false)
      setSelectedNode(null)
    },
    [setNodes, setEdges],
  )

  const handleClear = useCallback(() => {
    setNodes([])
    setEdges([])
    setPanelOpen(false)
    setSelectedNode(null)
    setLogs([])
    setRunResult(null)
    setNodeResults([])
  }, [setNodes, setEdges])

  useEffect(() => {
    if (!selectedNode) return
    if (panelOpen) return
    const timer = setTimeout(() => setSelectedNode(null), 220)
    return () => clearTimeout(timer)
  }, [panelOpen, selectedNode])

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

  const handleRun = useCallback(async () => {
    console.log("🔵 handleRun 开始执行")
    if (!testCase || nodes.length === 0) {
      console.log("🔵 handleRun 退出: 无 testCase 或 nodes 为空")
      return
    }

    console.log("🔵 准备清理 SSE")
    sseCleanupRef.current?.()
    sseCleanupRef.current = null

    console.log("🔵 设置状态")
    setIsRunning(true)
    setLogs([])
    setRunResult(null)
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: undefined } })))

    const fmt = () => {
      const d = new Date()
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
    }

    console.log("🔵 调用 createRunJob")
    let jid: string
    try {
      jid = await createRunJob(testCase.id)
      console.log("🔵 createRunJob 成功, jobId:", jid)
    } catch (err) {
      console.error("🔴 创建执行任务失败:", err)
      setIsRunning(false)
      return
    }

    let passed = 0
    let failed = 0

    console.log("🔵 调用 subscribeRunJob")
    const cleanup = subscribeRunJob(jid, (ev) => {
      // 使用同步方式处理事件，在内部处理异步操作
      try {
        if (ev.type === "node_start" && ev.node_id) {
          setNodes((nds) => nds.map((n) => n.id === ev.node_id ? { ...n, data: { ...n.data, status: "running" } } : n))
          setLogs((prev) => [...prev, { nodeId: ev.node_id!, label: ev.label || ev.node_id!, status: "running", message: "执行中...", timestamp: fmt() }])

        } else if (ev.type === "delegate_to_agent" && ev.node_id) {
          const nodeId = ev.node_id
          const label = ev.label || nodeId
          setLogs((prev) => [...prev, { nodeId, label, status: "running", message: "→ 本地Agent 执行中...", timestamp: fmt() }])

          // 在 setTimeout 中处理异步操作，防止 async 回调的未捕获异常
          setTimeout(async () => {
            let success = false
            let message = "本地 Agent 未运行，请先执行: open-test agent install"
            let duration = 0
            let screenshot: string | null = null
            try {
              const nodeType = nodes.find((n) => n.id === nodeId)?.type ?? ""
              const nodeData = {
                ...(ev.node_data ?? {}),
                _node_type: nodeType,
                device_type: deviceConfig.device_type,
                ...(deviceConfig.device_serial ? { device_serial: deviceConfig.device_serial } : {}),
              }
              const result = await callLocalAgent(nodeId, nodeData)
              success = result.success
              message = result.message
              duration = result.duration
              screenshot = result.screenshot ?? null
              // 立即更新该节点截图，不等全部执行完
              if (screenshot) {
                setNodeResults((prev) => [
                  ...prev.filter((r) => r.node_id !== nodeId),
                  { node_id: nodeId, label, success, message, duration, screenshot },
                ])
              }
            } catch {
              // Agent 不可达，使用默认错误信息
            }

            setLogs((prev) => [...prev, {
              nodeId, label, status: success ? "success" : "error",
              message: `Agent: ${message}`,
              duration: Math.round(duration * 1000),
              timestamp: fmt(),
            }])
            try {
              await reportAgentResult(jid, nodeId, success, message, duration, screenshot)
            } catch (err) {
              console.error("报告 Agent 结果失败:", err)
            }
          }, 0)

        } else if (ev.type === "node_done" && ev.node_id) {
          const status = ev.success ? "success" : "error"
          const durationMs = ev.duration != null ? Math.round(ev.duration * 1000) : undefined
          if (ev.success) passed++; else failed++
          setNodes((nds) => nds.map((n) => n.id === ev.node_id ? { ...n, data: { ...n.data, status } } : n))
          setLogs((prev) => [...prev, {
            nodeId: ev.node_id!, label: ev.label || ev.node_id!, status, message: ev.message || undefined,
            duration: durationMs, timestamp: fmt(),
          }])

        } else if (ev.type === "complete") {
          setIsRunning(false)
          setRunResult({ total: passed + failed, passed, failed })
          sseCleanupRef.current = null
        } else if (ev.type === "error") {
          setIsRunning(false)
          sseCleanupRef.current = null
        }
      } catch (err) {
        console.error("处理 SSE 事件失败:", err)
      }
    })

    sseCleanupRef.current = cleanup
  }, [testCase, nodes, setNodes, deviceConfig])

  const tm = testCase ? (TYPE_META[testCase.case_type] || TYPE_META.api) : null

  return (
    <div className="flex h-full">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            {/* 步骤面板 - 悬浮在画布左上角 */}
            <StepPalette />

            {/* 顶部工具栏：直接绝对定位在画布 div 上，避免被 ReactFlow overflow:hidden 裁切 */}
            <div className="absolute top-3 inset-x-0 z-10 flex justify-center pointer-events-none">
              <div className="flex items-center gap-2 pointer-events-auto">
                {/* 测试用例容器 */}
                <div className="flex items-center bg-sidebar/95 backdrop-blur-sm border border-border/80 shadow-sm rounded-xl p-1 h-11">
                  {testCase && tm ? (
                    <button
                      className="h-9 flex items-center gap-2 cursor-pointer hover:bg-muted/60 px-2.5 rounded-lg transition-all duration-200"
                      onClick={() => setTcPickerOpen(true)}
                    >
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", tm.color.replace("text-", "bg-").split(" ")[0], tm.color.split(" ").slice(2).join(" "))}>
                        <tm.icon className={cn("w-3.5 h-3.5", tm.color.split(" ")[1])} />
                      </div>
                      <span className="text-sm font-semibold max-w-[120px] truncate">{testCase.name}</span>
                      <span className="text-xs text-muted-foreground hidden sm:block">{testCase.module}</span>
                    </button>
                  ) : (
                    <button
                      className="h-9 flex items-center gap-2 px-2.5 rounded-lg hover:bg-muted/60 transition-all duration-200 text-sm text-muted-foreground border border-dashed border-border/60"
                      onClick={() => setTcPickerOpen(true)}
                    >
                      <div className="w-7 h-7 rounded-lg bg-coral/15 flex items-center justify-center">
                        <FlaskConical className="w-4 h-4 text-coral" />
                      </div>
                      选择测试用例
                    </button>
                  )}
                </div>

                {/* 执行结果容器 */}
                {runResult && (
                  <div className={cn(
                    "h-11 flex items-center bg-sidebar/95 backdrop-blur-sm border border-border/80 shadow-sm rounded-xl px-2 py-1",
                    runResult.failed === 0
                      ? "text-green-500"
                      : "text-red-400"
                  )}>
                    <div className={cn(
                      "h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-sm font-semibold",
                      runResult.failed === 0 ? "bg-green-500/10" : "bg-red-500/10"
                    )}>
                      {runResult.failed === 0
                        ? <><CheckCircle2 className="w-4 h-4" />{runResult.passed}/{runResult.total}</>
                        : <><XCircle className="w-4 h-4" />{runResult.failed} 失败</>}
                    </div>
                  </div>
                )}

                {/* 统计容器 */}
                <div className="h-11 flex items-center gap-3 bg-sidebar/95 backdrop-blur-sm border border-border/80 shadow-sm rounded-xl px-3 text-sm text-muted-foreground">
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

                {/* 设备选择胶囊 */}
                <DeviceBar value={deviceConfig} onChange={setDeviceConfig} />

                {/* 操作容器 */}
                <div className="h-11 flex items-center gap-1 bg-sidebar/95 backdrop-blur-sm border border-border/80 shadow-sm rounded-xl px-1.5">
                  {nodes.length > 0 && (
                    <button
                      className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all duration-200"
                      onClick={() => setClearDialogOpen(true)}
                      disabled={isRunning}
                      title="清空画布"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    className="h-9 flex items-center gap-2 px-2.5 rounded-lg hover:bg-muted/60 transition-all duration-200 text-sm font-semibold disabled:opacity-40 whitespace-nowrap"
                    onClick={handleSave}
                    disabled={isSaving || !testCase}
                    title="保存"
                  >
                    <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </div>
                    保存
                  </button>
                  <button
                    type="button"
                    className="h-9 flex items-center gap-2 px-3 rounded-lg bg-coral hover:bg-coral/90 text-white text-sm font-semibold transition-all duration-200 disabled:opacity-40 shadow-sm shadow-coral/30 whitespace-nowrap"
                    onClick={(e) => {
                      console.log("🔵 按钮点击事件")
                      e.preventDefault()
                      e.stopPropagation()
                      handleRun()
                    }}
                    disabled={isRunning || !testCase || nodes.length === 0}
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                      {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    </div>
                    {isRunning ? "执行中" : "执行"}
                  </button>
                </div>
              </div>
            </div>

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
              connectionLineType={ConnectionLineType.Bezier}
              defaultEdgeOptions={{
                type: "default",
                animated: true,
                style: { strokeDasharray: "6 3" },
                markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
              }}
              defaultViewport={{ x: 100, y: 100, zoom: 1.0 }}
              minZoom={0.1}
              maxZoom={4}
              fitViewOptions={{
                padding: 0.2,
                maxZoom: 1.2,
                minZoom: 0.5,
              }}
              fitView

              snapToGrid
              snapGrid={[16, 16]}
              deleteKeyCode={["Backspace", "Delete"]}
              className="workflow-canvas"
            >
              <Background gap={16} size={1} className="!bg-background" />

              <Controls className="!rounded-2xl !border-white/10 !bg-sidebar/90 !backdrop-blur-sm !shadow-sm" />
              <MiniMap
                className="!rounded-2xl !border-white/10 !bg-sidebar/90 !backdrop-blur-sm"
                nodeColor={(node) => {
                  const cm: Record<string, string> = {
                    httpRequest: "#3b82f6",
                    appLaunchApp: "#a855f7", appClick: "#a855f7", appLongPress: "#a855f7",
                    appDoubleClick: "#a855f7", appType: "#a855f7", appClearText: "#a855f7",
                    appSwipe: "#a855f7", appTapXy: "#a855f7", appWaitElement: "#a855f7",
                    appGetText: "#a855f7", appScreenshot: "#a855f7", appPressKey: "#a855f7",
                    sqlQuery: "#10b981", assertion: "#8b5cf6", extract: "#06b6d4",
                    script: "#f59e0b", wait: "#64748b", condition: "#ec4899",
                  }
                  return cm[node.type || ""] || "#6b7280"
                }}
                maskColor="rgba(0,0,0,0.08)"
              />

              {/* 空画布占位 */}
              {nodes.length === 0 && (
                <Panel position="top-center">
                  {!testCase ? (
                    <div className="flex flex-col items-center mt-25 pointer-events-auto select-none gap-5">
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

            {selectedNode && (
              <div className="absolute inset-y-0 right-0 z-30 pointer-events-none">
                <div
                  className={cn(
                    "h-full transition-all duration-200 ease-out overflow-hidden pointer-events-auto",
                    panelOpen ? "w-90 opacity-100" : "w-0 opacity-0"
                  )}
                >
                  <div
                    className={cn(
                      "h-full w-90 transition-transform duration-200 ease-out",
                      panelOpen ? "translate-x-0" : "translate-x-full"
                    )}
                  >
                    <PropertyPanel
                      node={selectedNode}
                      onClose={() => setPanelOpen(false)}
                      onUpdate={onUpdateNode}
                      onDelete={onDeleteNode}
                      logs={logs}
                      nodeResults={nodeResults}
                      deviceConfig={deviceConfig}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <RunResultToast result={runResult} onClose={() => setRunResult(null)} />

      <TestCasePickerDialog
        open={tcPickerOpen}
        onOpenChange={setTcPickerOpen}
        onSelect={setTestCase}
      />

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
