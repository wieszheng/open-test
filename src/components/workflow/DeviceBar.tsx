/**
 * 顶部设备选择悬浮组件
 * 全局绑定一条用例跑哪种设备类型 + 哪台具体设备
 * 设备列表轮询 /health 接口实时刷新
 */
import { useEffect, useRef, useState, useCallback } from "react"
import { Smartphone, RefreshCw, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"

const LOCAL_AGENT = "http://localhost:7357"

export type DeviceType = "android" | "harmony"

export interface DeviceConfig {
  device_type: DeviceType
  device_serial: string | null  // null = 默认设备
}

interface DeviceList {
  android: string[]
  harmony: string[]
}

const TYPE_LABEL: Record<DeviceType, string> = {
  android: "Android",
  harmony: "HarmonyOS",
}

const TYPE_COLOR: Record<DeviceType, string> = {
  android: "text-green-400",
  harmony: "text-blue-400",
}

export function DeviceBar({
  value,
  onChange,
}: {
  value: DeviceConfig
  onChange: (cfg: DeviceConfig) => void
}) {
  const [devices, setDevices] = useState<DeviceList>({ android: [], harmony: [] })
  const [loading, setLoading] = useState(false)
  const [agentOnline, setAgentOnline] = useState(false)

  // 始终持有最新的 value，fetchDevices 通过 ref 读取，避免 interval 闭包过期问题
  const valueRef = useRef(value)
  valueRef.current = value

  const fetchDevices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${LOCAL_AGENT}/health`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const data = await res.json()
        const list: DeviceList = {
          android: data.devices?.android ?? [],
          harmony: data.devices?.harmony ?? [],
        }
        setDevices(list)
        setAgentOnline(true)

        // 从 ref 读最新的 value，不依赖闭包捕获
        const cur = valueRef.current
        const curList = list[cur.device_type]
        // 当前 serial 已离线，重置为该平台第一台
        if (cur.device_serial && !curList.includes(cur.device_serial)) {
          onChange({ ...cur, device_serial: curList[0] ?? null })
        }
        // 首次或无 serial 时，自动选第一台
        if (!cur.device_serial && curList.length > 0) {
          onChange({ ...cur, device_serial: curList[0] })
        }
      } else {
        setAgentOnline(false)
      }
    } catch {
      setAgentOnline(false)
    } finally {
      setLoading(false)
    }
  }, [onChange])   // 不再依赖 value，通过 valueRef 读取最新值

  // 启动时立即获取，然后每 5s 轮询；fetchDevices 稳定，不会反复重建 interval
  useEffect(() => {
    fetchDevices()
    const id = setInterval(fetchDevices, 5000)
    return () => clearInterval(id)
  }, [fetchDevices])

  // 切换 device_type 时自动选第一台对应设备
  const handleTypeChange = (type: DeviceType) => {
    const firstSerial = devices[type][0] ?? null
    onChange({ device_type: type, device_serial: firstSerial })
  }

  const handleSerialChange = (serial: string) => {
    onChange({ ...value, device_serial: serial })
  }

  const curDevices = devices[value.device_type]
  const displaySerial = value.device_serial
    ? value.device_serial.length > 16
      ? value.device_serial.slice(0, 14) + "…"
      : value.device_serial
    : curDevices.length > 0
      ? "选择设备"
      : "无设备"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
            "bg-sidebar/90 backdrop-blur-md border border-border/60 shadow-sm h-9",
            "hover:bg-muted/60 transition-colors text-xs",
            "focus:outline-none"
          )}
        >
          {/* 状态指示点 */}
          <span className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            !agentOnline ? "bg-muted-foreground/40" :
            curDevices.length === 0 ? "bg-amber-400" : "bg-green-400"
          )} />

          <Smartphone className={cn("w-3.5 h-3.5 shrink-0", TYPE_COLOR[value.device_type])} />

          <span className={cn("font-medium", TYPE_COLOR[value.device_type])}>
            {TYPE_LABEL[value.device_type]}
          </span>

          {value.device_serial && (
            <>
              <span className="text-border/80">·</span>
              <span className="text-muted-foreground font-mono">{displaySerial}</span>
            </>
          )}

          {!agentOnline && (
            <span className="text-[10px] text-muted-foreground/50 hidden sm:block">Agent 离线</span>
          )}

          <ChevronDown className="w-3 h-3 text-muted-foreground/60 ml-0.5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="center" className="w-52 rounded-2xl">
        {/* 设备类型 */}
        <DropdownMenuLabel className="text-[10px] text-muted-foreground/60 font-normal px-3 py-1.5">
          设备平台
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value.device_type}
          onValueChange={(v) => handleTypeChange(v as DeviceType)}
        >
          <DropdownMenuRadioItem value="android" className="cursor-pointer rounded-xl mx-1">
            <span className="text-green-400 font-medium">Android</span>
            {devices.android.length > 0 && (
              <span className="ml-auto text-[10px] text-muted-foreground">{devices.android.length} 台</span>
            )}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="harmony" className="cursor-pointer rounded-xl mx-1">
            <span className="text-blue-400 font-medium">HarmonyOS</span>
            {devices.harmony.length > 0 && (
              <span className="ml-auto text-[10px] text-muted-foreground">{devices.harmony.length} 台</span>
            )}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        {/* 设备列表 */}
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-[10px] text-muted-foreground/60 font-normal">设备列表</span>
          <button
            onClick={(e) => { e.stopPropagation(); fetchDevices() }}
            className="p-0.5 rounded hover:bg-muted/50 transition-colors"
            title="刷新设备列表"
          >
            <RefreshCw className={cn("w-3 h-3 text-muted-foreground/50", loading && "animate-spin")} />
          </button>
        </div>

        {!agentOnline ? (
          <div className="px-3 py-2 text-[11px] text-muted-foreground/50 text-center">
            Agent 未运行
            <br />
            <span className="text-[10px]">open-test agent start</span>
          </div>
        ) : curDevices.length === 0 ? (
          <div className="px-3 py-2 text-[11px] text-muted-foreground/50 text-center">
            无已连接设备
          </div>
        ) : (
          <DropdownMenuRadioGroup
            value={value.device_serial ?? ""}
            onValueChange={handleSerialChange}
          >
            {curDevices.map((s) => (
              <DropdownMenuRadioItem key={s} value={s} className="cursor-pointer rounded-xl mx-1">
                <span className="font-mono text-xs truncate max-w-[140px]">{s}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
