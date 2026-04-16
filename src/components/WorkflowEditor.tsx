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
import { fetchFlow, saveFlow, createRunJob, subscribeRunJob, callLocalAgent, reportAgentResult, type TestCase } from "@/services/api"
import { StepPalette } from "@/components/workflow/StepPalette"
import { PropertyPanel } from "@/components/workflow/PropertyPanel"
import { TestCasePickerDialog } from "@/components/workflow/TestCasePicker"
import { RunResultToast } from "@/components/workflow/RunResultToast"
import type { LogEntry, RunResult } from "@/components/workflow/types"

const TYPE_META: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  api:  { icon: Globe,            label: "API", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  ui:   { icon: MousePointerClick, label: "UI",  color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  e2e:  { icon: Workflow,          label: "E2E", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  unit: { icon: Cpu,               label: "单元", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  perf: { icon: Zap,               label: "性能", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
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

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const sseCleanupRef = useRef<(() => void) | null>(null)

  // 切换测试用例时加载对应 flow
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

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({
        ...params,
        type: "smoothstep",
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

  const handleClear = useCallback(() => {
    setNodes([])
    setEdges([])
    setSelectedNode(null)
    setLogs([])
    setRunResult(null)
  }, [setNodes, setEdges])

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
    if (!testCase || nodes.length === 0) return

    sseCleanupRef.current?.()
    sseCleanupRef.current = null

    setIsRunning(true)
    setLogs([])
    setRunResult(null)
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: undefined } })))

    const fmt = () => {
      const d = new Date()
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
    }

    let jid: string
    try {
      jid = await createRunJob(testCase.id)
    } catch {
      setIsRunning(false)
      return
    }

    let passed = 0
    let failed = 0

    const cleanup = subscribeRunJob(jid, async (ev) => {
      if (ev.type === "node_start" && ev.node_id) {
        setNodes((nds) => nds.map((n) => n.id === ev.node_id ? { ...n, data: { ...n.data, status: "running" } } : n))
        setLogs((prev) => [...prev, { nodeId: ev.node_id!, label: ev.label || ev.node_id!, status: "running", message: "执行中...", timestamp: fmt() }])

      } else if (ev.type === "delegate_to_agent" && ev.node_id) {
        const nodeId = ev.node_id
        const label = ev.label || nodeId
        setLogs((prev) => [...prev, { nodeId, label, status: "running", message: "→ 本地Agent 执行中...", timestamp: fmt() }])

        let success = false
        let message = "本地 Agent 未运行，请先执行: open-test agent install"
        let duration = 0
        try {
          const result = await callLocalAgent(nodeId, ev.node_data ?? {})
          success = result.success
          message = result.message
          duration = result.duration
        } catch {
          // Agent 不可达，使用默认错误信息
        }

        setLogs((prev) => [...prev, {
          nodeId, label, status: success ? "success" : "error",
          message: `Agent: ${message}`,
          duration: Math.round(duration * 1000),
          timestamp: fmt(),
        }])
        await reportAgentResult(jid, nodeId, success, message, duration)

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
    })

    sseCleanupRef.current = cleanup
  }, [testCase, nodes, setNodes])

  const tm = testCase ? (TYPE_META[testCase.case_type] || TYPE_META.api) : null

  return (
    <div className="flex h-full">
      <div className="flex flex-1 overflow-hidden">
        <StepPalette />

        <div className="flex-1 flex flex-col overflow-hidden">
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
                  {/* 左胶囊：测试用例选择 + 执行结果 */}
                  <div className="flex items-center gap-1 bg-sidebar/90 backdrop-blur-md border border-border/60 shadow-sm rounded-full px-1.5 py-1 h-9">
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
                    {runResult && (
                      <div className={cn(
                        "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ml-0.5",
                        runResult.failed === 0
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}>
                        {runResult.failed === 0
                          ? <><CheckCircle2 className="w-2.5 h-2.5" />{runResult.passed}/{runResult.total}</>
                          : <><XCircle className="w-2.5 h-2.5" />{runResult.failed} 失败</>}
                      </div>
                    )}
                  </div>

                  {/* 中胶囊：步骤 & 连接统计 */}
                  <div className="flex items-center gap-3 bg-sidebar/90 backdrop-blur-md border border-border/60 shadow-sm rounded-full px-3 h-9 text-xs text-muted-foreground">
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
                  <div className="flex items-center gap-0.5 bg-sidebar/90 backdrop-blur-md border border-border/60 shadow-sm rounded-full px-1.5 py-1 h-9">
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

              <Controls className="!rounded-2xl !border-white/10 !bg-sidebar/90 !backdrop-blur-sm !shadow-sm" />
              <MiniMap
                className="!rounded-2xl !border-white/10 !bg-sidebar/90 !backdrop-blur-sm"
                nodeColor={(node) => {
                  const cm: Record<string, string> = {
                    httpRequest: "#3b82f6", webUiAction: "#f97316", appUiAction: "#a855f7",
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
          </div>
        </div>

        {selectedNode && (
          <PropertyPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onUpdate={onUpdateNode}
            onDelete={onDeleteNode}
            logs={logs}
          />
        )}
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
