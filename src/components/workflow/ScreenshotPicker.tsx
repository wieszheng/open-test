/**
 * 截图坐标点选器
 *
 * 单画布叠加三层：
 *   底层  截图（始终显示）
 *   中层  DOM 控件树边框（可开关，并行加载）
 *   顶层  OCR 文字区域边框（可开关，并行加载）
 *
 * 点击时：DOM 元素命中 > OCR 区域命中 > 坐标回退
 * onSelect 回调返回 { x, y, selector?, text? }
 */
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Loader2, RefreshCw, Crosshair, AlertCircle, ScanLine, Type } from "lucide-react"

const AGENT_BASE = "http://localhost:7357"

// ── 类型 ──────────────────────────────────────────────────────────────────────

export interface PickResult {
  x: number
  y: number
  selector?: string
  text?: string
}

// 仅供外部指定打开时的默认图层可见性
export type PickMode = "screenshot" | "dom" | "ocr"

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (result: PickResult) => void
  deviceSerial?: string
  deviceType?: string
  defaultMode?: PickMode  // 保留兼容，影响图层默认开关
}

interface ScreenData { image: string; width: number; height: number }

interface DomElement {
  id: string; text: string; type: string; description: string
  selector: string
  x1: number; y1: number; x2: number; y2: number
}

interface OcrRegion {
  text: string; confidence: number
  x1: number; y1: number; x2: number; y2: number
}

interface Marker { cx: number; cy: number; devX: number; devY: number }

// ── 坐标转换 ──────────────────────────────────────────────────────────────────

function toCv(dv: number, devTotal: number, cvTotal: number) {
  return dv / devTotal * cvTotal
}

// ── Canvas 绘制 ────────────────────────────────────────────────────────────────

function drawDomLayer(
  ctx: CanvasRenderingContext2D,
  elements: DomElement[],
  dw: number, dh: number,
  cw: number, ch: number,
  hovered: number | null,
  selected: number | null,
) {
  elements.forEach((el, i) => {
    const x1 = toCv(el.x1, dw, cw); const y1 = toCv(el.y1, dh, ch)
    const w  = toCv(el.x2 - el.x1, dw, cw)
    const h  = toCv(el.y2 - el.y1, dh, ch)
    const isHov = i === hovered; const isSel = i === selected

    ctx.save()
    if (isSel) {
      ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 2; ctx.fillStyle = "rgba(34,197,94,0.12)"
    } else if (isHov) {
      ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 2; ctx.fillStyle = "rgba(96,165,250,0.10)"
    } else {
      ctx.strokeStyle = "rgba(96,165,250,0.45)"; ctx.lineWidth = 0.8; ctx.fillStyle = "rgba(96,165,250,0.03)"
    }
    ctx.setLineDash(isSel || isHov ? [] : [3, 3])
    ctx.fillRect(x1, y1, w, h); ctx.strokeRect(x1, y1, w, h)
    ctx.restore()

    if (isHov || isSel) {
      const label = el.text || el.id || el.type
      if (!label) return
      ctx.save()
      ctx.font = "bold 11px monospace"
      const tw = ctx.measureText(label).width + 8
      const lx = Math.min(x1, cw - tw - 2); const ly = Math.max(y1 - 18, 2)
      ctx.fillStyle = isSel ? "rgba(34,197,94,0.92)" : "rgba(59,130,246,0.92)"
      ctx.beginPath(); ctx.roundRect(lx, ly, tw, 16, 4); ctx.fill()
      ctx.fillStyle = "#fff"; ctx.fillText(label, lx + 4, ly + 12)
      ctx.restore()
    }
  })
}

function drawOcrLayer(
  ctx: CanvasRenderingContext2D,
  regions: OcrRegion[],
  dw: number, dh: number,
  cw: number, ch: number,
  hovered: number | null,
  selected: number | null,
) {
  regions.forEach((r, i) => {
    const x1 = toCv(r.x1, dw, cw); const y1 = toCv(r.y1, dh, ch)
    const w  = toCv(r.x2 - r.x1, dw, cw)
    const h  = toCv(r.y2 - r.y1, dh, ch)
    const isHov = i === hovered; const isSel = i === selected

    ctx.save()
    if (isSel) {
      ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2; ctx.fillStyle = "rgba(245,158,11,0.15)"
    } else if (isHov) {
      ctx.strokeStyle = "#fb923c"; ctx.lineWidth = 2; ctx.fillStyle = "rgba(251,146,60,0.10)"
    } else {
      ctx.strokeStyle = "rgba(251,146,60,0.50)"; ctx.lineWidth = 0.8; ctx.fillStyle = "rgba(251,146,60,0.04)"
    }
    ctx.setLineDash(isSel || isHov ? [] : [3, 3])
    ctx.fillRect(x1, y1, w, h); ctx.strokeRect(x1, y1, w, h)
    ctx.restore()

    if (isHov || isSel) {
      ctx.save()
      ctx.font = "bold 11px monospace"
      const tw = ctx.measureText(r.text).width + 8
      const lx = Math.min(x1, cw - tw - 2); const ly = Math.max(y1 - 18, 2)
      ctx.fillStyle = isSel ? "rgba(245,158,11,0.92)" : "rgba(251,146,60,0.92)"
      ctx.beginPath(); ctx.roundRect(lx, ly, tw, 16, 4); ctx.fill()
      ctx.fillStyle = "#fff"; ctx.fillText(r.text, lx + 4, ly + 12)
      ctx.restore()
    }
  })
}

function drawMarker(ctx: CanvasRenderingContext2D, m: Marker, cw: number, ch: number) {
  const { cx, cy } = m
  ctx.save()
  ctx.strokeStyle = "rgba(255,60,60,0.75)"; ctx.lineWidth = 1.2; ctx.setLineDash([6, 4])
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(cw, cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, ch); ctx.stroke()
  ctx.restore()
  ctx.save()
  ctx.strokeStyle = "#ff3c3c"; ctx.lineWidth = 2; ctx.setLineDash([])
  ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
  ctx.save()
  ctx.fillStyle = "#ff3c3c"
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

// ── 命中测试（最小面积优先） ───────────────────────────────────────────────────

function hitTest(
  devX: number, devY: number,
  items: Array<{ x1: number; y1: number; x2: number; y2: number }>,
): number | null {
  let best: number | null = null; let bestArea = Infinity
  items.forEach((el, i) => {
    if (devX >= el.x1 && devX <= el.x2 && devY >= el.y1 && devY <= el.y2) {
      const area = (el.x2 - el.x1) * (el.y2 - el.y1)
      if (area < bestArea) { bestArea = area; best = i }
    }
  })
  return best
}

// ── 组件 ─────────────────────────────────────────────────────────────────────

export function ScreenshotPicker({
  open, onClose, onSelect,
  deviceSerial, deviceType,
  defaultMode,
}: Props) {
  // 图层开关（根据 defaultMode 设置初始值）
  const [showDom, setShowDom] = useState(defaultMode !== "screenshot")
  const [showOcr, setShowOcr] = useState(defaultMode === "ocr")

  // 数据
  const [screenData,  setScreenData]  = useState<ScreenData | null>(null)
  const [domElements, setDomElements] = useState<DomElement[]>([])
  const [ocrRegions,  setOcrRegions]  = useState<OcrRegion[]>([])

  // 加载状态（每层独立）
  const [loadingScreen, setLoadingScreen] = useState(false)
  const [loadingDom,    setLoadingDom]    = useState(false)
  const [loadingOcr,    setLoadingOcr]    = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  // 交互状态
  const [hovDom,    setHovDom]    = useState<number | null>(null)
  const [hovOcr,    setHovOcr]    = useState<number | null>(null)
  const [selDom,    setSelDom]    = useState<number | null>(null)
  const [selOcr,    setSelOcr]    = useState<number | null>(null)
  const [marker,    setMarker]    = useState<Marker | null>(null)
  const [pickResult, setPickResult] = useState<PickResult | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef    = useRef<HTMLImageElement | null>(null)

  // ── 全量重绘 ─────────────────────────────────────────────────────────────────

  const redraw = useCallback(() => {
    const canvas = canvasRef.current; const img = imgRef.current
    if (!canvas || !img) return
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(img, 0, 0)
    const dw = screenData?.width  ?? canvas.width
    const dh = screenData?.height ?? canvas.height
    const cw = canvas.width; const ch = canvas.height

    if (showDom && domElements.length > 0)
      drawDomLayer(ctx, domElements, dw, dh, cw, ch, hovDom, selDom)
    if (showOcr && ocrRegions.length > 0)
      drawOcrLayer(ctx, ocrRegions, dw, dh, cw, ch, hovOcr, selOcr)
    if (marker)
      drawMarker(ctx, marker, cw, ch)
  }, [screenData, domElements, ocrRegions, showDom, showOcr, hovDom, hovOcr, selDom, selOcr, marker])

  useEffect(() => { redraw() }, [redraw])

  useEffect(() => {
    if (!screenData) return
    const img = new Image()
    img.onload = () => { imgRef.current = img; redraw() }
    img.src = screenData.image
    return () => { img.onload = null }
  }, [screenData]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 数据获取 ─────────────────────────────────────────────────────────────────

  const qs = useCallback(() => {
    const p = new URLSearchParams()
    if (deviceSerial) p.set("serial", deviceSerial)
    if (deviceType)   p.set("device_type", deviceType)
    return p.toString() ? `?${p.toString()}` : ""
  }, [deviceSerial, deviceType])

  const toConnErr = (msg: string) =>
    /fetch|Failed|ECONNREFUSED|NetworkError/i.test(msg)
      ? "无法连接到本地 Agent（localhost:7357），请确认 Agent 已启动"
      : msg

  /** 并行获取截图 + DOM + OCR，截图先到先显示 */
  const fetchAll = useCallback(async () => {
    // 重置
    imgRef.current = null
    setScreenData(null); setDomElements([]); setOcrRegions([])
    setSelDom(null); setSelOcr(null); setHovDom(null); setHovOcr(null)
    setMarker(null); setPickResult(null); setError(null)

    const q = qs()

    // 截图（最快，优先渲染）
    setLoadingScreen(true)
    const fetchScreen = fetch(`${AGENT_BASE}/screenshot${q}`, { signal: AbortSignal.timeout(15_000) })
      .then(r => r.ok ? r.json() as Promise<ScreenData> : Promise.reject(new Error(`截图 ${r.status}`)))
      .then(data => { setScreenData(data); setLoadingScreen(false) })
      .catch(e => { setError(toConnErr(e instanceof Error ? e.message : "截图失败")); setLoadingScreen(false) })

    // DOM（并行）
    setLoadingDom(true)
    const fetchDom = fetch(`${AGENT_BASE}/layout${q}`, { signal: AbortSignal.timeout(30_000) })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`DOM ${r.status}`)))
      .then(data => { setDomElements(data.elements ?? []); setLoadingDom(false) })
      .catch(() => setLoadingDom(false))

    // OCR（并行，最慢）
    setLoadingOcr(true)
    const fetchOcr = fetch(`${AGENT_BASE}/ocr${q}`, { signal: AbortSignal.timeout(60_000) })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`OCR ${r.status}`)))
      .then(data => { setOcrRegions(data.regions ?? []); setLoadingOcr(false) })
      .catch(() => setLoadingOcr(false))

    await fetchScreen
    await Promise.allSettled([fetchDom, fetchOcr])
  }, [qs])

  useEffect(() => { if (open) fetchAll() }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 鼠标事件 ─────────────────────────────────────────────────────────────────

  function mouseToDevice(e: React.MouseEvent<HTMLCanvasElement>) {
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
    const pos = mouseToDevice(e); if (!pos) return
    setHovDom(showDom ? hitTest(pos.devX, pos.devY, domElements) : null)
    setHovOcr(showOcr ? hitTest(pos.devX, pos.devY, ocrRegions)  : null)
  }

  const handleMouseLeave = () => { setHovDom(null); setHovOcr(null) }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = mouseToDevice(e); if (!pos) return

    // DOM 优先
    if (showDom) {
      const di = hitTest(pos.devX, pos.devY, domElements)
      if (di !== null) {
        const el = domElements[di]
        const cx = Math.round((el.x1 + el.x2) / 2)
        const cy = Math.round((el.y1 + el.y2) / 2)
        setSelDom(di); setSelOcr(null); setMarker(null)
        setPickResult({ x: cx, y: cy, selector: el.selector || undefined, text: el.text || undefined })
        return
      }
    }

    // OCR 次之
    if (showOcr) {
      const oi = hitTest(pos.devX, pos.devY, ocrRegions)
      if (oi !== null) {
        const r  = ocrRegions[oi]
        const cx = Math.round((r.x1 + r.x2) / 2)
        const cy = Math.round((r.y1 + r.y2) / 2)
        setSelOcr(oi); setSelDom(null); setMarker(null)
        setPickResult({ x: cx, y: cy, text: r.text })
        return
      }
    }

    // 坐标兜底
    setSelDom(null); setSelOcr(null)
    setMarker({ cx: pos.cx, cy: pos.cy, devX: pos.devX, devY: pos.devY })
    setPickResult({ x: pos.devX, y: pos.devY })
  }

  // ── 图层切换 ─────────────────────────────────────────────────────────────────

  const toggleDom = () => {
    setShowDom(v => !v)
    setSelDom(null); setHovDom(null)
    if (pickResult && !pickResult.text && selDom !== null) {
      setPickResult(null)
    }
  }
  const toggleOcr = () => {
    setShowOcr(v => !v)
    setSelOcr(null); setHovOcr(null)
    if (pickResult?.text && selOcr !== null) {
      setPickResult(null)
    }
  }

  // ── 预览文字 ─────────────────────────────────────────────────────────────────

  const previewText = (() => {
    if (!pickResult) return null
    const parts: string[] = []
    if (pickResult.selector) parts.push(pickResult.selector)
    else if (pickResult.text) parts.push(`"${pickResult.text}"`)
    parts.push(`(${pickResult.x}, ${pickResult.y})`)
    return parts.join("  ")
  })()

  const anyLoading  = loadingScreen || loadingDom || loadingOcr
  const cursor      = screenData && !loadingScreen ? "crosshair" : "default"

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex flex-col gap-0 p-0 max-w-[360px] overflow-hidden">

        {/* ── 标题栏 + 图层开关 ── */}
        <DialogHeader className="px-4 pt-3 pb-2.5 border-b border-border/40 shrink-0 space-y-0">
          <div className="flex items-center gap-2">
            <DialogTitle className="flex items-center gap-1.5 text-sm font-semibold">
              <Crosshair className="w-4 h-4 text-muted-foreground shrink-0" />
              元素点选
            </DialogTitle>
            {screenData && (
              <span className="text-[10px] font-mono text-muted-foreground/40">
                {screenData.width}×{screenData.height}
              </span>
            )}

            {/* 图层开关 — 靠右 */}
            <div className="ml-auto flex items-center gap-1">
              {/* DOM 开关 */}
              <button
                onClick={toggleDom}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-all",
                  showDom
                    ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                    : "text-muted-foreground/40 border-white/10 hover:border-white/20",
                )}
              >
                {loadingDom
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <ScanLine className="w-3 h-3" />}
                DOM
                {domElements.length > 0 && showDom && (
                  <span className="text-[9px] opacity-60">{domElements.length}</span>
                )}
              </button>

              {/* OCR 开关 */}
              <button
                onClick={toggleOcr}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-all",
                  showOcr
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "text-muted-foreground/40 border-white/10 hover:border-white/20",
                )}
              >
                {loadingOcr
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Type className="w-3 h-3" />}
                OCR
                {ocrRegions.length > 0 && showOcr && (
                  <span className="text-[9px] opacity-60">{ocrRegions.length}</span>
                )}
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* ── 截图画布 ── */}
        <div
          className="relative bg-black/80 overflow-auto flex items-center justify-center"
          style={{ minHeight: 240, maxHeight: "62vh" }}
        >
          <canvas
            ref={canvasRef}
            className="block select-none"
            style={{ width: "100%", height: "auto", cursor }}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />

          {/* 截图加载遮罩 */}
          {loadingScreen && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">正在截取屏幕...</span>
            </div>
          )}

          {/* 错误 */}
          {!loadingScreen && error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center bg-black/70">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
            </div>
          )}

          {/* 空状态 */}
          {!loadingScreen && !error && !screenData && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-muted-foreground/40">等待截图...</span>
            </div>
          )}

          {/* DOM / OCR 加载角标（截图已显示，后台继续加载） */}
          {screenData && (loadingDom || loadingOcr) && (
            <div className="absolute top-2 right-2 flex gap-1">
              {loadingDom && (
                <div className="flex items-center gap-1 bg-black/60 rounded-lg px-2 py-0.5">
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-400" />
                  <span className="text-[10px] text-blue-400">DOM</span>
                </div>
              )}
              {loadingOcr && (
                <div className="flex items-center gap-1 bg-black/60 rounded-lg px-2 py-0.5">
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400" />
                  <span className="text-[10px] text-amber-400">OCR</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 底部操作栏 ── */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border/40 shrink-0 bg-muted/20">
          <div className="flex-1 min-w-0">
            {previewText ? (
              <p className="text-xs font-mono truncate">
                <span className="text-muted-foreground">已选：</span>
                <span className="font-semibold text-foreground">{previewText}</span>
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground/40">
                {screenData ? "点击选取元素或坐标" : "—"}
              </p>
            )}
          </div>
          <Button
            variant="outline" size="sm"
            className="h-8 rounded-xl shrink-0"
            onClick={(e) => { e.stopPropagation(); fetchAll() }}
            disabled={anyLoading}
          >
            {anyLoading
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            刷新
          </Button>
          <Button
            size="sm"
            className="h-8 rounded-xl shrink-0"
            disabled={!pickResult}
            onClick={() => { if (pickResult) { onSelect(pickResult); onClose() } }}
          >
            <Crosshair className="w-3.5 h-3.5 mr-1.5" />确认
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}
