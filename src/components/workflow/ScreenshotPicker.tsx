/**
 * 截图坐标点选器
 * - canvas 始终挂载（loading/error 用绝对遮罩），保证 canvasRef 在 effect 触发时已有效
 * - DialogFooter 替换为普通 div，避免 shadcn 默认 -mx-4/-mb-4 负边距与 p-0 父容器冲突
 */
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, RefreshCw, Crosshair, AlertCircle } from "lucide-react"

const AGENT_BASE = "http://localhost:7357"

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (x: number, y: number) => void
  deviceSerial?: string
  deviceType?: string
}

interface ScreenshotData {
  image: string
  width: number
  height: number
}

interface Marker {
  cx: number; cy: number
  devX: number; devY: number
}

// ── Canvas 标注 ───────────────────────────────────────────────────────────────

function drawMarker(ctx: CanvasRenderingContext2D, m: Marker, cw: number, ch: number) {
  const { cx, cy } = m

  // 十字线
  ctx.save()
  ctx.strokeStyle = "rgba(255,60,60,0.75)"
  ctx.lineWidth = 1.5
  ctx.setLineDash([6, 4])
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(cw, cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, ch); ctx.stroke()
  ctx.restore()

  // 准星圆
  ctx.save()
  ctx.strokeStyle = "#ff3c3c"
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()

  // 中心点
  ctx.save()
  ctx.fillStyle = "#ff3c3c"
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

}

// ── 组件 ─────────────────────────────────────────────────────────────────────

export function ScreenshotPicker({ open, onClose, onSelect, deviceSerial, deviceType }: Props) {
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [screenshotData, setScreenshotData] = useState<ScreenshotData | null>(null)
  const [marker,         setMarker]         = useState<Marker | null>(null)
  const [devCoord,       setDevCoord]       = useState<{ x: number; y: number } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef    = useRef<HTMLImageElement | null>(null)

  // ── 绘制 ──────────────────────────────────────────────────────────────────
  const redraw = useCallback((m: Marker | null) => {
    const canvas = canvasRef.current
    const img    = imgRef.current
    if (!canvas || !img) return
    canvas.width  = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(img, 0, 0)
    if (m) drawMarker(ctx, m, canvas.width, canvas.height)
  }, [])

  useEffect(() => {
    if (!screenshotData) return
    const img = new Image()
    img.onload = () => { imgRef.current = img; redraw(null) }
    img.src = screenshotData.image
    return () => { img.onload = null }
  }, [screenshotData, redraw])

  useEffect(() => {
    if (imgRef.current) redraw(marker)
  }, [marker, redraw])

  // ── 拉取截图 ───────────────────────────────────────────────────────────────
  const fetchScreenshot = useCallback(async () => {
    imgRef.current = null
    setMarker(null)
    setDevCoord(null)
    setError(null)
    setScreenshotData(null)
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (deviceSerial) params.set("serial", deviceSerial)
      if (deviceType)   params.set("device_type", deviceType)
      const qs  = params.toString() ? `?${params.toString()}` : ""
      const res = await fetch(`${AGENT_BASE}/screenshot${qs}`, { signal: AbortSignal.timeout(15_000) })
      if (!res.ok) throw new Error(`Agent 返回 ${res.status}`)
      const data = await res.json() as ScreenshotData
      // 注意：先关 loading，canvas 挂载后 effect 才能取到 canvasRef
      setLoading(false)
      setScreenshotData(data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "未知错误"
      setError(
        /fetch|Failed|ECONNREFUSED|NetworkError/i.test(msg)
          ? "无法连接到本地 Agent（localhost:7357），请确认 Agent 已启动"
          : msg,
      )
      setLoading(false)
    }
  }, [deviceSerial, deviceType])

  useEffect(() => { if (open) fetchScreenshot() }, [open, fetchScreenshot])

  // ── 点击坐标换算 ───────────────────────────────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !screenshotData) return
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    const cx     = (e.clientX - rect.left) * scaleX
    const cy     = (e.clientY - rect.top)  * scaleY
    const devX   = Math.round((cx / canvas.width)  * screenshotData.width)
    const devY   = Math.round((cy / canvas.height) * screenshotData.height)
    setMarker({ cx, cy, devX, devY })
    setDevCoord({ x: devX, y: devY })
  }

  // ── 渲染 ──────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/* flex 列布局；无 padding；去掉 grid gap */}
      <DialogContent className="flex flex-col gap-0 p-0 max-w-[340px] overflow-hidden">

        {/* 标题栏 */}
        <DialogHeader className="px-4 py-3 border-b border-border/40 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Crosshair className="w-4 h-4 text-muted-foreground shrink-0" />
            点选坐标
            {screenshotData && (
              <span className="ml-1 text-[10px] font-mono font-normal text-muted-foreground/50">
                {screenshotData.width}×{screenshotData.height}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* 截图区域：canvas 始终挂载，避免 canvasRef 在 effect 时为 null */}
        <div
          className="relative bg-black/70 overflow-auto flex items-center justify-center"
          style={{ minHeight: 240, maxHeight: "62vh" }}
        >

          {/* canvas 始终在 DOM 里；height:auto 保证按比例缩放居中 */}
          <canvas
            ref={canvasRef}
            className="block select-none"
            style={{
              width: "100%",
              height: "auto",
              cursor: screenshotData && !loading ? "crosshair" : "default",
            }}
            onClick={handleCanvasClick}
          />

          {/* 加载遮罩 */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">正在截取设备屏幕...</span>
            </div>
          )}

          {/* 错误遮罩 */}
          {!loading && error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center bg-black/60">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
            </div>
          )}

          {/* 空状态（打开但还没截图） */}
          {!loading && !error && !screenshotData && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-muted-foreground/40">等待截图...</span>
            </div>
          )}
        </div>

        {/* 底部操作栏（用普通 div，避免 DialogFooter 内置 -mx-4/-mb-4 负边距） */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border/40 shrink-0 bg-muted/20">
          <div className="flex-1 min-w-0">
            {devCoord ? (
              <p className="text-xs font-mono">
                <span className="text-muted-foreground">已选：</span>
                <span className="font-bold text-foreground">{devCoord.x}, {devCoord.y}</span>
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground/50">
                {screenshotData ? "点击图片选取坐标" : "—"}
              </p>
            )}
          </div>
          <Button
            variant="outline" size="sm"
            className="h-8 rounded-xl shrink-0"
            onClick={(e) => { e.stopPropagation(); fetchScreenshot() }}
            disabled={loading}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />刷新
          </Button>
          <Button
            size="sm"
            className="h-8 rounded-xl shrink-0"
            disabled={!devCoord}
            onClick={() => { if (devCoord) { onSelect(devCoord.x, devCoord.y); onClose() } }}
          >
            <Crosshair className="w-3.5 h-3.5 mr-1.5" />确认
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}
