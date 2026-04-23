import React, { useState, useRef, useEffect, useCallback } from "react"
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
import { Settings, X, Trash2, RefreshCw, AlertCircle, ScanLine, Type } from "lucide-react"
import type { DeviceConfig } from "./DeviceBar"
import { APP_UI_NODE_TYPES } from "./nodes"

// ── 支持内联点选的 action ──────────────────────────────────────────────────────
// 不包含：launch_app / screenshot / press_key / swipe（无需元素定位）

const PICKER_ACTIONS = new Set([
  "click", "long_press", "double_click",
  "type", "clear_text",
  "tap_xy", "wait_element", "get_text",
])

const AGENT_BASE = "http://localhost:7357"

// ── 类型 ──────────────────────────────────────────────────────────────────────

interface PickResult { x: number; y: number; selector?: string; text?: string; bounds?: { x1: number; y1: number; x2: number; y2: number } }
interface ScreenData { image: string; width: number; height: number }
interface DomElement {
  id: string; text: string; type: string; description: string; selector: string
  x1: number; y1: number; x2: number; y2: number
}
interface OcrRegion {
  text: string; confidence: number
  x1: number; y1: number; x2: number; y2: number
}

// ── Canvas 绘制 ────────────────────────────────────────────────────────────────

function cv(dv: number, dTotal: number, cTotal: number) { return dv / dTotal * cTotal }

function drawBox(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  stroke: string, fill: string, dashed: boolean,
) {
  ctx.save()
  ctx.strokeStyle = stroke; ctx.fillStyle = fill
  ctx.lineWidth = dashed ? 3.2 : 4
  ctx.setLineDash(dashed ? [3, 3] : [])
  ctx.fillRect(x1, y1, x2 - x1, y2 - y1)
  ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
  ctx.restore()
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x1: number, y1: number, bg: string, cw: number) {
  ctx.save()
  ctx.font = "bold 11px monospace"
  const tw = ctx.measureText(text).width + 8
  const lx = Math.min(x1, cw - tw - 2); const ly = Math.max(y1 - 18, 2)
  ctx.fillStyle = bg
  ctx.beginPath(); ctx.roundRect(lx, ly, tw, 16, 4); ctx.fill()
  ctx.fillStyle = "#fff"; ctx.fillText(text, lx + 4, ly + 12)
  ctx.restore()
}

function drawMarker(ctx: CanvasRenderingContext2D, cx: number, cy: number, cw: number, ch: number) {
  // 白色描边底层（增强对比）
  ctx.save()
  ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 3; ctx.setLineDash([8, 5])
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(cw, cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, ch); ctx.stroke()
  ctx.restore()
  // 红色线条
  ctx.save()
  ctx.strokeStyle = "#ff2d2d"; ctx.lineWidth = 1.8; ctx.setLineDash([8, 5])
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(cw, cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, ch); ctx.stroke()
  ctx.restore()
  // 圆圈 + 中心点
  ctx.save()
  ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 3.5; ctx.setLineDash([])
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
  ctx.save()
  ctx.strokeStyle = "#ff2d2d"; ctx.lineWidth = 2.5; ctx.setLineDash([])
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = "#ff2d2d"
  ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "rgba(255,255,255,0.9)"
  ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function hitTest(devX: number, devY: number, items: Array<{ x1: number; y1: number; x2: number; y2: number }>) {
  let best: number | null = null; let bestArea = Infinity
  items.forEach((el, i) => {
    if (devX >= el.x1 && devX <= el.x2 && devY >= el.y1 && devY <= el.y2) {
      const a = (el.x2 - el.x1) * (el.y2 - el.y1)
      if (a < bestArea) { bestArea = a; best = i }
    }
  })
  return best
}

// ── 建模数据类型 ───────────────────────────────────────────────────────────────

export interface ModelingData {
  screenData: ScreenData
  domElements: DomElement[]
  ocrRegions: OcrRegion[]
}

// ── 内联画布组件 ──────────────────────────────────────────────────────────────

function InlinePicker({
  deviceSerial, deviceType, action, initialData, initialBounds, onPick, onDataReady,
}: {
  deviceSerial?: string
  deviceType?: string
  action: string
  initialData?: ModelingData | null
  initialBounds?: { x1: number; y1: number; x2: number; y2: number } | null
  onPick: (r: PickResult) => void
  onDataReady?: (data: ModelingData) => void
}) {
  // 从 initialBounds 匹配已选的 DOM / OCR 元素，或直接恢复坐标标记
  function resolveInitialSel() {
    if (!initialBounds) return { sel: null, marker: null, picked: null }
    const { x1, y1, x2, y2 } = initialBounds
    const cx = Math.round((x1 + x2) / 2); const cy = Math.round((y1 + y2) / 2)
    // 用中心点命中测试，优先精确匹配 bounds
    const elems = initialData?.domElements ?? []
    const di = elems.findIndex(e => e.x1 === x1 && e.y1 === y1 && e.x2 === x2 && e.y2 === y2)
    if (di >= 0) {
      const el = elems[di]
      return { sel: { type: "dom" as const, idx: di }, marker: null,
        picked: { x: cx, y: cy, selector: el.selector || undefined, text: el.text || undefined, bounds: initialBounds } }
    }
    const ocrs = initialData?.ocrRegions ?? []
    const oi = ocrs.findIndex(r => r.x1 === x1 && r.y1 === y1 && r.x2 === x2 && r.y2 === y2)
    if (oi >= 0) {
      const r = ocrs[oi]
      return { sel: { type: "ocr" as const, idx: oi }, marker: null,
        picked: { x: cx, y: cy, text: r.text, bounds: initialBounds } }
    }
    // tap_xy 坐标回显：用中心点作为 marker
    return { sel: { type: "xy" as const }, marker: { devX: cx, devY: cy },
      picked: { x: cx, y: cy, bounds: initialBounds } }
  }

  const init = resolveInitialSel()

  const [screenData,  setScreenData]  = useState<ScreenData | null>(initialData?.screenData ?? null)
  const [domElements, setDomElements] = useState<DomElement[]>(initialData?.domElements ?? [])
  const [ocrRegions,  setOcrRegions]  = useState<OcrRegion[]>(initialData?.ocrRegions ?? [])
  const [progress,    setProgress]    = useState(initialData ? 100 : 0)
  const [error,       setError]       = useState<string | null>(null)

  const [showDom, setShowDom] = useState(true)
  const [showOcr, setShowOcr] = useState(true)

  const [hov,    setHov]    = useState<{ type: "dom" | "ocr"; idx: number } | null>(null)
  const [sel,    setSel]    = useState<{ type: "dom" | "ocr" | "xy"; idx?: number } | null>(init.sel)
  const [marker, setMarker] = useState<{ devX: number; devY: number } | null>(init.marker)
  const [picked, setPicked] = useState<PickResult | null>(init.picked)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef    = useRef<HTMLImageElement | null>(null)

  // 重绘
  const redraw = useCallback(() => {
    const canvas = canvasRef.current; const img = imgRef.current
    if (!canvas || !img) return
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(img, 0, 0)
    const dw = screenData?.width ?? canvas.width; const dh = screenData?.height ?? canvas.height
    const cw = canvas.width; const ch = canvas.height

    // DOM 层（tap_xy 不绘制，开关关闭时跳过）
    if (action !== "tap_xy" && showDom) {
      domElements.forEach((el, i) => {
        const x1c = cv(el.x1, dw, cw); const y1c = cv(el.y1, dh, ch)
        const x2c = cv(el.x2, dw, cw); const y2c = cv(el.y2, dh, ch)
        const isHov = hov?.type === "dom" && hov.idx === i
        const isSel = sel?.type === "dom" && sel.idx === i
        if (isSel) {
          drawBox(ctx, x1c, y1c, x2c, y2c, "#22c55e", "rgba(0,0,0,0)", false)
        } else if (isHov) {
          drawBox(ctx, x1c, y1c, x2c, y2c, "#60a5fa", "rgba(0,0,0,0)", false)
        } else {
          drawBox(ctx, x1c, y1c, x2c, y2c, "rgba(96,165,250,0.65)", "rgba(0,0,0,0)", true)
        }
      })
    }

    // OCR 层（开关关闭时跳过）
    if (action !== "tap_xy" && showOcr) {
      ocrRegions.forEach((r, i) => {
        const x1c = cv(r.x1, dw, cw); const y1c = cv(r.y1, dh, ch)
        const x2c = cv(r.x2, dw, cw); const y2c = cv(r.y2, dh, ch)
        const isHov = hov?.type === "ocr" && hov.idx === i
        const isSel = sel?.type === "ocr" && sel.idx === i
        if (isSel) {
          drawBox(ctx, x1c, y1c, x2c, y2c, "#f59e0b", "rgba(245,158,11,0.14)", false)
          drawLabel(ctx, r.text, x1c, y1c, "rgba(245,158,11,0.92)", cw)
        } else if (isHov) {
          drawBox(ctx, x1c, y1c, x2c, y2c, "#fb923c", "rgba(251,146,60,0.10)", false)
          drawLabel(ctx, r.text, x1c, y1c, "rgba(251,146,60,0.92)", cw)
        } else {
          drawBox(ctx, x1c, y1c, x2c, y2c, "rgba(251,146,60,0.70)", "rgba(251,146,60,0.04)", true)
        }
      })
    }

    // 坐标标记
    if (marker) drawMarker(ctx, cv(marker.devX, dw, cw), cv(marker.devY, dh, ch), cw, ch)
  }, [screenData, domElements, ocrRegions, showDom, showOcr, hov, sel, marker])

  useEffect(() => { redraw() }, [redraw])

  useEffect(() => {
    if (!screenData) return
    const img = new Image()
    img.onload = () => { imgRef.current = img; redraw() }
    img.src = screenData.image
    return () => { img.onload = null }
  }, [screenData]) // eslint-disable-line react-hooks/exhaustive-deps

  // 获取数据
  const fetchAll = useCallback(async () => {
    imgRef.current = null
    setScreenData(null); setDomElements([]); setOcrRegions([])
    setSel(null); setHov(null); setMarker(null); setPicked(null)
    setError(null); setProgress(5)

    const p = new URLSearchParams()
    if (deviceSerial) p.set("serial", deviceSerial)
    if (deviceType)   p.set("device_type", deviceType)
    const qs = p.toString() ? `?${p.toString()}` : ""

    try {
      // 1. 截图（33%）
      const sr = await fetch(`${AGENT_BASE}/screenshot${qs}`, { signal: AbortSignal.timeout(15_000) })
      if (!sr.ok) throw new Error(`截图失败 ${sr.status}`)
      const sd: ScreenData = await sr.json()
      setScreenData(sd); setProgress(33)

      // tap_xy 仅需截图，跳过 DOM + OCR
      if (action === "tap_xy") {
        setProgress(100)
        onDataReady?.({ screenData: sd, domElements: [], ocrRegions: [] })
      } else {
        // 2. DOM（66%）
        let domResult: DomElement[] = []
        let ocrResult: OcrRegion[]  = []

        await Promise.allSettled([
          fetch(`${AGENT_BASE}/layout${qs}`, { signal: AbortSignal.timeout(30_000) })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.elements) { domResult = data.elements; setDomElements(data.elements) }
              setProgress(p => Math.max(p, 66))
            })
            .catch(() => setProgress(p => Math.max(p, 66))),

          // 3. OCR（100%）
          fetch(`${AGENT_BASE}/ocr${qs}`, { signal: AbortSignal.timeout(60_000) })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.regions) { ocrResult = data.regions; setOcrRegions(data.regions) }
              setProgress(100)
            })
            .catch(() => setProgress(100)),
        ])

        // 建模完成，回传持久化数据
        onDataReady?.({ screenData: sd, domElements: domResult, ocrRegions: ocrResult })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "未知错误"
      setError(/fetch|Failed|ECONNREFUSED|NetworkError/i.test(msg)
        ? "无法连接到本地 Agent（localhost:7357）"
        : msg)
      setProgress(100)
    }
  }, [deviceSerial, deviceType, onDataReady])

  // 有初始缓存数据时不触发自动拉取
  useEffect(() => { if (!initialData) fetchAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 鼠标
  function getPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current; if (!canvas || !screenData) return null
    const rect = canvas.getBoundingClientRect()
    const cx = (e.clientX - rect.left) * (canvas.width  / rect.width)
    const cy = (e.clientY - rect.top)  * (canvas.height / rect.height)
    return {
      devX: Math.round(cx / canvas.width  * screenData.width),
      devY: Math.round(cy / canvas.height * screenData.height),
      cx, cy,
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e); if (!pos) return
    if (showDom) {
      const di = hitTest(pos.devX, pos.devY, domElements)
      if (di !== null) { setHov({ type: "dom", idx: di }); return }
    }
    if (showOcr) {
      const oi = hitTest(pos.devX, pos.devY, ocrRegions)
      if (oi !== null) { setHov({ type: "ocr", idx: oi }); return }
    }
    setHov(null)
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e); if (!pos) return

    // DOM 优先（开关开启时）
    if (showDom) {
      const di = hitTest(pos.devX, pos.devY, domElements)
      if (di !== null) {
        const el = domElements[di]
        const cx = Math.round((el.x1 + el.x2) / 2); const cy = Math.round((el.y1 + el.y2) / 2)
        setSel({ type: "dom", idx: di }); setMarker(null)
        const r: PickResult = { x: cx, y: cy, selector: el.selector || undefined, text: el.text || undefined,
          bounds: { x1: el.x1, y1: el.y1, x2: el.x2, y2: el.y2 } }
        setPicked(r); onPick(r); return
      }
    }

    // OCR 次之（开关开启时）
    if (showOcr) {
      const oi = hitTest(pos.devX, pos.devY, ocrRegions)
      if (oi !== null) {
        const r2 = ocrRegions[oi]
        const cx = Math.round((r2.x1 + r2.x2) / 2); const cy = Math.round((r2.y1 + r2.y2) / 2)
        setSel({ type: "ocr", idx: oi }); setMarker(null)
        const r: PickResult = { x: cx, y: cy, text: r2.text,
          bounds: { x1: r2.x1, y1: r2.y1, x2: r2.x2, y2: r2.y2 } }
        setPicked(r); onPick(r); return
      }
    }

    // 坐标兜底：仅 tap_xy 节点允许
    if (action === "tap_xy") {
      setSel({ type: "xy" }); setMarker({ devX: pos.devX, devY: pos.devY })
      const r: PickResult = { x: pos.devX, y: pos.devY,
        bounds: { x1: pos.devX, y1: pos.devY, x2: pos.devX, y2: pos.devY } }
      setPicked(r); onPick(r)
    }
  }

  const isLoading = progress < 100 && !error
  const label = picked
    ? (picked.selector || picked.text ? (picked.selector || picked.text)! : `${picked.x}, ${picked.y}`)
    : null

  return (
    <div className="space-y-1.5">
      {/* 标题行：已选信息 + 图层开关 + 刷新按钮 */}
      <div className="flex items-center gap-1.5">
        <div className="flex-1 min-w-0">
          {label ? (
            <p className="text-[10px] font-mono truncate text-muted-foreground">
              <span className="text-primary/80">{action === "tap_xy" ? "坐标 " : "元素 "}</span>
              {label}
              {picked && (picked.selector || picked.text) && (
                <span className="text-muted-foreground/40 ml-1">({picked.x},{picked.y})</span>
              )}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/30">
              {screenData ? "点击选取" : "—"}
            </p>
          )}
        </div>
        {/* 图层开关（非 tap_xy 才显示） */}
        {action !== "tap_xy" && screenData && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowDom(v => !v)}
              title="DOM 层"
              className={cn(
                "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all",
                showDom
                  ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                  : "text-muted-foreground/30 border-white/10 hover:border-white/20",
              )}
            >
              <ScanLine className="w-2.5 h-2.5" />
              {domElements.length > 0 && <span className="opacity-60">{domElements.length}</span>}
            </button>
            <button
              onClick={() => setShowOcr(v => !v)}
              title="OCR 层"
              className={cn(
                "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all",
                showOcr
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "text-muted-foreground/30 border-white/10 hover:border-white/20",
              )}
            >
              <Type className="w-2.5 h-2.5" />
              {ocrRegions.length > 0 && <span className="opacity-60">{ocrRegions.length}</span>}
            </button>
          </div>
        )}
        <button
          onClick={fetchAll}
          disabled={isLoading}
          className="p-1 rounded-lg hover:bg-muted/60 disabled:opacity-40 transition-colors shrink-0"
          title="刷新截图"
        >
          <RefreshCw className={cn("w-3 h-3 text-muted-foreground", isLoading && "animate-spin")} />
        </button>
      </div>

      {/* 画布 */}
      <div className="relative rounded-xl overflow-hidden bg-black/60">
        <canvas
          ref={canvasRef}
          className="block select-none w-full h-full object-contain"
          style={{ cursor: screenData && !isLoading ? "crosshair" : "default" }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHov(null)}
        />

        {/* 蒙层加载 */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 px-4">
            <div className="w-full max-w-[200px] space-y-2">
              <div className="flex items-center justify-center gap-3 text-center">
                <span className="text-[12px] text-muted-foreground/80">
                  {progress < 33 ? "截图中..." : progress < 66 ? "解析布局..." : "OCR 识别..."}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-coral to-orange-400 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 无截图空状态 */}
        {!screenData && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] text-muted-foreground/30">—</span>
          </div>
        )}

        {/* 错误 */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center bg-black/50">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── FieldGroup ────────────────────────────────────────────────────────────────

function FieldGroup({
  label, description, children,
}: {
  label: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {description && <p className="text-[10px] text-muted-foreground/50 leading-relaxed">{description}</p>}
      {children}
    </div>
  )
}

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
    <div className="w-90 shrink-0 h-full rounded-2xl bg-sidebar border-l border-white/5 flex flex-col z-10 overflow-hidden">
      {/* 标题栏 */}
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

          {/* ── 内联点选画布（所有支持的 App UI 操作节点） ── */}
          {showPicker && (
            <FieldGroup label="数据建模" description="点击截图选取元素或坐标，自动填入下方字段">
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
          )}

          {/* ── App UI 操作字段 ── */}
          {APP_UI_NODE_TYPES.has(node.type ?? "") && (
            <>
              {/* launch_app */}
              {action === "launch_app" && (
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

              {/* tap_xy — 坐标字段 */}
              {action === "tap_xy" && (
                <FieldGroup label="坐标 (x,y)">
                  <Input
                    value={(d.coordinates as string) || ""}
                    onChange={(e) => setField("coordinates", e.target.value)}
                    placeholder="540,960"
                    className="h-8 text-xs font-mono rounded-2xl"
                  />
                </FieldGroup>
              )}

              {/* press_key */}
              {action === "press_key" && (
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

              {/* swipe */}
              {action === "swipe" && (
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

              {/* 组件选择器（click/double_click/long_press/type/clear_text/wait_element/get_text） */}
              {action && !["launch_app", "tap_xy", "press_key", "swipe", "screenshot"].includes(action) && (
                <FieldGroup label="组件选择器" description="Resource ID / 文字 / XPath，可从上方截图点选自动填入">
                  <Input
                    value={(d.selector as string) || ""}
                    onChange={(e) => setField("selector", e.target.value)}
                    placeholder='com.app:id/btn_login 或 登录'
                    className="h-8 text-xs font-mono rounded-2xl"
                  />
                </FieldGroup>
              )}

              {/* type: 输入值 */}
              {action === "type" && (
                <FieldGroup label="输入值" description="支持 {{variable}} 变量引用">
                  <Input value={(d.value as string) || ""} onChange={(e) => setField("value", e.target.value)} placeholder="输入内容" className="h-8 text-xs rounded-2xl" />
                </FieldGroup>
              )}

              {/* long_press: 时长 */}
              {action === "long_press" && (
                <FieldGroup label="按压时长 (ms)" description="默认 1000ms">
                  <Input type="number" value={(d.duration_ms as number) || 1000} onChange={(e) => setField("duration_ms", Number(e.target.value))} className="h-8 text-sm rounded-2xl" />
                </FieldGroup>
              )}

              {/* get_text: 变量名 */}
              {action === "get_text" && (
                <FieldGroup label="存入变量名" description="后续步骤通过 {{变量名}} 引用">
                  <Input value={(d.var_name as string) || ""} onChange={(e) => setField("var_name", e.target.value)} placeholder="element_text" className="h-8 text-xs font-mono rounded-2xl" />
                </FieldGroup>
              )}
            </>
          )}

          {/* ── HTTP 请求 ── */}
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
              <FieldGroup label="Headers (JSON)">
                <Textarea value={(d.headers as string) || ""} onChange={(e) => setField("headers", e.target.value)} placeholder='{"Authorization":"Bearer {{token}}"}' rows={3} className="text-xs font-mono rounded-2xl resize-none" />
              </FieldGroup>
              <FieldGroup label="Body (JSON)" description="仅 POST/PUT/PATCH 生效">
                <Textarea value={(d.body as string) || ""} onChange={(e) => setField("body", e.target.value)} placeholder='{"key":"value"}' rows={4} className="text-xs font-mono rounded-2xl resize-none" />
              </FieldGroup>
              <FieldGroup label="超时 (ms)">
                <Input type="number" value={(d.timeout as number) || 30000} onChange={(e) => setField("timeout", Number(e.target.value))} className="h-8 text-sm rounded-2xl" />
              </FieldGroup>
            </>
          )}

          {/* ── SQL ── */}
          {node.type === "sqlQuery" && (
            <>
              <FieldGroup label="数据库连接">
                <Input value={(d.connection as string) || ""} onChange={(e) => setField("connection", e.target.value)} placeholder="prod_db" className="h-8 text-sm rounded-2xl" />
              </FieldGroup>
              <FieldGroup label="SQL 语句">
                <Textarea value={(d.query as string) || ""} onChange={(e) => setField("query", e.target.value)} placeholder="SELECT * FROM users WHERE id = ?" rows={4} className="text-xs font-mono rounded-2xl resize-none" />
              </FieldGroup>
              <FieldGroup label="结果存入变量">
                <Input value={(d.extractVar as string) || ""} onChange={(e) => setField("extractVar", e.target.value)} placeholder="sql_result" className="h-8 text-xs font-mono rounded-2xl" />
              </FieldGroup>
            </>
          )}

          {/* ── 断言 ── */}
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
              <FieldGroup label="表达式">
                <Input value={(d.expression as string) || ""} onChange={(e) => setField("expression", e.target.value)} placeholder="$.data.token" className="h-8 text-xs font-mono rounded-2xl" />
              </FieldGroup>
              <FieldGroup label="期望值">
                <Input value={(d.expected as string) || ""} onChange={(e) => setField("expected", e.target.value)} placeholder="200" className="h-8 text-xs font-mono rounded-2xl" />
              </FieldGroup>
            </>
          )}

          {/* ── 变量提取 ── */}
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
              <FieldGroup label="表达式">
                <Input value={(d.expression as string) || ""} onChange={(e) => setField("expression", e.target.value)} placeholder="$.data.token" className="h-8 text-xs font-mono rounded-2xl" />
              </FieldGroup>
              <FieldGroup label="变量名">
                <Input value={(d.varName as string) || ""} onChange={(e) => setField("varName", e.target.value)} placeholder="auth_token" className="h-8 text-xs font-mono rounded-2xl" />
              </FieldGroup>
            </>
          )}

          {/* ── 脚本 ── */}
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
              <FieldGroup label="代码">
                <Textarea value={(d.code as string) || ""} onChange={(e) => setField("code", e.target.value)} placeholder="# your code here" rows={8} className="text-xs font-mono rounded-2xl resize-none" />
              </FieldGroup>
            </>
          )}

          {/* ── 等待 ── */}
          {node.type === "wait" && (
            <FieldGroup label="等待秒数">
              <Input type="number" value={(d.seconds as number) || 2} onChange={(e) => setField("seconds", Number(e.target.value))} className="h-8 text-sm rounded-2xl" />
            </FieldGroup>
          )}

          {/* ── 条件 ── */}
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
