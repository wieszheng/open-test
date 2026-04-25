import React, { useState, useEffect, useCallback, useMemo } from "react"
import { cn } from "@/lib/utils"
import { RefreshCw, AlertCircle, ScanLine, Type } from "lucide-react"

const AGENT_BASE = "http://localhost:7357"

export interface PickResult { x: number; y: number; selector?: string; text?: string; bounds?: { x1: number; y1: number; x2: number; y2: number } }
export interface ScreenData { image: string; width: number; height: number }
export interface DomElement {
  id: string; text: string; type: string; description: string; selector: string
  x1: number; y1: number; x2: number; y2: number
}
export interface OcrRegion {
  text: string; confidence: number
  x1: number; y1: number; x2: number; y2: number
}

export interface ModelingData {
  screenData: ScreenData
  domElements: DomElement[]
  ocrRegions: OcrRegion[]
}

export function InlinePicker({
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
  // Use unique key or useEffect to trigger refetch if needed.
  // We'll manage states here.
  
  const [screenData,  setScreenData]  = useState<ScreenData | null>(initialData?.screenData ?? null)
  const [domElements, setDomElements] = useState<DomElement[]>(initialData?.domElements ?? [])
  const [ocrRegions,  setOcrRegions]  = useState<OcrRegion[]>(initialData?.ocrRegions ?? [])
  const [progress,    setProgress]    = useState(initialData ? 100 : 0)
  const [error,       setError]       = useState<string | null>(null)

  const [showDom, setShowDom] = useState(true)
  const [showOcr, setShowOcr] = useState(true)

  const [hov,    setHov]    = useState<{ type: "dom" | "ocr"; idx: number } | null>(null)

  const sortedDom = useMemo(() => {
    return domElements.map((el, i) => ({ el, i }))
      .sort((a, b) => {
        const areaA = (a.el.x2 - a.el.x1) * (a.el.y2 - a.el.y1)
        const areaB = (b.el.x2 - b.el.x1) * (b.el.y2 - b.el.y1)
        return areaB - areaA
      })
  }, [domElements])

  const sortedOcr = useMemo(() => {
    return ocrRegions.map((r, i) => ({ r, i }))
      .sort((a, b) => {
        const areaA = (a.r.x2 - a.r.x1) * (a.r.y2 - a.r.y1)
        const areaB = (b.r.x2 - b.r.x1) * (b.r.y2 - b.r.y1)
        return areaB - areaA
      })
  }, [ocrRegions])
  
  // Try to resolve initial sel based on bounds
  const initSel = useMemo(() => {
    if (!initialBounds) return { sel: null, marker: null, picked: null }
    const { x1, y1, x2, y2 } = initialBounds
    const cx = Math.round((x1 + x2) / 2); const cy = Math.round((y1 + y2) / 2)
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
    return { sel: { type: "xy" as const }, marker: { devX: cx, devY: cy },
      picked: { x: cx, y: cy, bounds: initialBounds } }
  }, [initialBounds, initialData])

  const [sel,    setSel]    = useState<{ type: "dom" | "ocr" | "xy"; idx?: number } | null>(initSel.sel)
  const [marker, setMarker] = useState<{ devX: number; devY: number } | null>(initSel.marker)
  const [picked, setPicked] = useState<PickResult | null>(initSel.picked)

  const fetchAll = useCallback(async () => {
    setScreenData(null); setDomElements([]); setOcrRegions([])
    setSel(null); setHov(null); setMarker(null); setPicked(null)
    setError(null); setProgress(5)

    const p = new URLSearchParams()
    if (deviceSerial) p.set("serial", deviceSerial)
    if (deviceType)   p.set("device_type", deviceType)
    const qs = p.toString() ? `?${p.toString()}` : ""

    try {
      const sr = await fetch(`${AGENT_BASE}/screenshot${qs}`, { signal: AbortSignal.timeout(15_000) })
      if (!sr.ok) throw new Error(`截图失败 ${sr.status}`)
      const sd: ScreenData = await sr.json()
      setScreenData(sd); setProgress(33)

      if (action === "tap_xy") {
        setProgress(100)
        onDataReady?.({ screenData: sd, domElements: [], ocrRegions: [] })
      } else {
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

          fetch(`${AGENT_BASE}/ocr${qs}`, { signal: AbortSignal.timeout(60_000) })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.regions) { ocrResult = data.regions; setOcrRegions(data.regions) }
              setProgress(100)
            })
            .catch(() => setProgress(100)),
        ])

        onDataReady?.({ screenData: sd, domElements: domResult, ocrRegions: ocrResult })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "未知错误"
      setError(/fetch|Failed|ECONNREFUSED|NetworkError/i.test(msg)
        ? "无法连接到本地 Agent（localhost:7357）"
        : msg)
      setProgress(100)
    }
  }, [deviceSerial, deviceType, action, onDataReady])

  useEffect(() => { if (!initialData) fetchAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!screenData) return
    const rect = e.currentTarget.getBoundingClientRect()
    const xPercent = (e.clientX - rect.left) / rect.width
    const yPercent = (e.clientY - rect.top) / rect.height
    
    const devX = Math.round(xPercent * screenData.width)
    const devY = Math.round(yPercent * screenData.height)

    if (action === "tap_xy") {
      setSel({ type: "xy" }); setMarker({ devX, devY })
      const r: PickResult = { x: devX, y: devY, bounds: { x1: devX, y1: devY, x2: devX, y2: devY } }
      setPicked(r); onPick(r)
    }
  }

  const handleDomClick = (e: React.MouseEvent, i: number, el: DomElement) => {
    e.stopPropagation()
    const cx = Math.round((el.x1 + el.x2) / 2); const cy = Math.round((el.y1 + el.y2) / 2)
    setSel({ type: "dom", idx: i }); setMarker(null)
    const r: PickResult = { x: cx, y: cy, selector: el.selector || undefined, text: el.text || undefined,
      bounds: { x1: el.x1, y1: el.y1, x2: el.x2, y2: el.y2 } }
    setPicked(r); onPick(r)
  }

  const handleOcrClick = (e: React.MouseEvent, i: number, r2: OcrRegion) => {
    e.stopPropagation()
    const cx = Math.round((r2.x1 + r2.x2) / 2); const cy = Math.round((r2.y1 + r2.y2) / 2)
    setSel({ type: "ocr", idx: i }); setMarker(null)
    const r: PickResult = { x: cx, y: cy, text: r2.text,
      bounds: { x1: r2.x1, y1: r2.y1, x2: r2.x2, y2: r2.y2 } }
    setPicked(r); onPick(r)
  }

  const isLoading = progress < 100 && !error
  const label = picked
    ? (picked.selector || picked.text ? (picked.selector || picked.text)! : `${picked.x}, ${picked.y}`)
    : null

  const getPercentStyle = (x1: number, y1: number, x2: number, y2: number) => {
    if (!screenData) return {}
    return {
      left: `${(x1 / screenData.width) * 100}%`,
      top: `${(y1 / screenData.height) * 100}%`,
      width: `${((x2 - x1) / screenData.width) * 100}%`,
      height: `${((y2 - y1) / screenData.height) * 100}%`
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <div className="flex-1 min-w-0 flex items-center">
          {label ? (
            <div className="text-[10px] font-mono text-muted-foreground flex items-center w-full min-w-0">
              <span className="text-primary/80 shrink-0 whitespace-nowrap">{action === "tap_xy" ? "坐标 " : "元素 "}</span>
              <span className="truncate flex-1 ml-0.5" title={label}>{label}</span>
              {picked && (picked.selector || picked.text) && (
                <span className="text-muted-foreground/40 ml-1 shrink-0 whitespace-nowrap">({picked.x},{picked.y})</span>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground/30">
              {screenData ? "点击选取" : "—"}
            </span>
          )}
        </div>
        {action !== "tap_xy" && screenData && (
          <div className="flex items-center gap-0.5">
            <button onClick={() => setShowDom(v => !v)} title="DOM 层" className={cn("flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all", showDom ? "bg-blue-500/15 text-blue-400 border-blue-500/30" : "text-muted-foreground/30 border-white/10 hover:border-white/20")}>
              <ScanLine className="w-2.5 h-2.5" />
              {domElements.length > 0 && <span className="opacity-60">{domElements.length}</span>}
            </button>
            <button onClick={() => setShowOcr(v => !v)} title="OCR 层" className={cn("flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all", showOcr ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "text-muted-foreground/30 border-white/10 hover:border-white/20")}>
              <Type className="w-2.5 h-2.5" />
              {ocrRegions.length > 0 && <span className="opacity-60">{ocrRegions.length}</span>}
            </button>
          </div>
        )}
        <button onClick={fetchAll} disabled={isLoading} className="p-1 rounded-lg hover:bg-muted/60 disabled:opacity-40 transition-colors shrink-0" title="刷新截图">
          <RefreshCw className={cn("w-3 h-3 text-muted-foreground", isLoading && "animate-spin")} />
        </button>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-black/60 w-full" style={{ aspectRatio: screenData ? `${screenData.width}/${screenData.height}` : '16/9' }}>
        {screenData && (
          <div className="absolute inset-0 select-none" style={{ cursor: !isLoading ? "crosshair" : "default" }} onClick={!isLoading ? handleImageClick : undefined}>
            <img src={screenData.image} className="w-full h-full pointer-events-none object-fill" alt="Screen" />
            
            {/* OCR Regions (Rendered first so DOM has higher priority for clicks if overlapping) */}
            {action !== "tap_xy" && showOcr && sortedOcr.map(({ r, i }) => {
              const isSel = sel?.type === "ocr" && sel.idx === i
              const isHov = hov?.type === "ocr" && hov.idx === i
              return (
                <div
                  key={`ocr-${i}`}
                  style={getPercentStyle(r.x1, r.y1, r.x2, r.y2)}
                  className={cn(
                    "absolute border-2 border-dashed transition-colors flex items-start",
                    isSel ? "border-amber-500 border-solid bg-amber-500/20" : "border-orange-400/70 hover:border-orange-400 hover:bg-orange-400/10"
                  )}
                  onClick={(e) => handleOcrClick(e, i, r)}
                  onMouseEnter={() => setHov({ type: "ocr", idx: i })}
                  onMouseLeave={() => setHov(null)}
                >
                  {(isSel || isHov) && (
                    <div className="absolute -top-5 left-0 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-30">
                      {r.text}
                    </div>
                  )}
                </div>
              )
            })}

            {/* DOM Elements */}
            {action !== "tap_xy" && showDom && sortedDom.map(({ el, i }) => {
              const isSel = sel?.type === "dom" && sel.idx === i
              return (
                <div
                  key={`dom-${i}`}
                  style={getPercentStyle(el.x1, el.y1, el.x2, el.y2)}
                  className={cn(
                    "absolute border-2 border-dashed transition-colors",
                    isSel ? "border-green-500 border-solid bg-green-500/10" : "border-blue-400/60 hover:border-blue-400 hover:bg-blue-400/20"
                  )}
                  onClick={(e) => handleDomClick(e, i, el)}
                  onMouseEnter={() => setHov({ type: "dom", idx: i })}
                  onMouseLeave={() => setHov(null)}
                />
              )
            })}

            {/* XY Marker */}
            {marker && screenData && (
              <div 
                className="absolute pointer-events-none z-30" 
                style={{ 
                  left: `${(marker.devX / screenData.width) * 100}%`, 
                  top: `${(marker.devY / screenData.height) * 100}%`,
                  transform: 'translate(-50%, -50%)' 
                }}
              >
                {/* Cross lines */}
                <div className="absolute left-[-5000px] right-[-5000px] top-0 border-t border-dashed border-red-500/80 shadow-[0_0_2px_rgba(255,255,255,0.5)]" />
                <div className="absolute top-[-5000px] bottom-[-5000px] left-0 border-l border-dashed border-red-500/80 shadow-[0_0_2px_rgba(255,255,255,0.5)]" />
                
                {/* Circles */}
                <div className="absolute left-1/2 top-1/2 w-7 h-7 border-[3px] border-white/70 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute left-1/2 top-1/2 w-7 h-7 border-2 border-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute left-1/2 top-1/2 w-2.5 h-2.5 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute left-1/2 top-1/2 w-1 h-1 bg-white/90 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 px-4 z-40">
            <div className="w-full max-w-[200px] space-y-2">
              <div className="flex items-center justify-center gap-3 text-center">
                <span className="text-[12px] text-muted-foreground/80">
                  {progress < 33 ? "截图中..." : progress < 66 ? "解析布局..." : "OCR 识别..."}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300 ease-out rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        )}

        {!screenData && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] text-muted-foreground/30">—</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center bg-black/50 z-40">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
