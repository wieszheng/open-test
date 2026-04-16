import { useEffect } from "react"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, X } from "lucide-react"
import type { RunResult } from "./types"

export function RunResultToast({
  result,
  onClose,
}: {
  result: RunResult | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!result) return
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [result, onClose])

  if (!result) return null
  const allPassed = result.failed === 0

  return (
    <div className={cn(
      "fixed bottom-8 right-8 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-4 duration-300",
      allPassed
        ? "bg-green-500/10 border-green-500/20 text-green-400"
        : "bg-red-500/10 border-red-500/20 text-red-400",
    )}>
      {allPassed
        ? <CheckCircle2 className="w-5 h-5 shrink-0" />
        : <XCircle className="w-5 h-5 shrink-0" />}
      <div>
        <p className="text-sm font-semibold">{allPassed ? "全部通过" : "存在失败步骤"}</p>
        <p className="text-[11px] opacity-70">
          {result.passed}/{result.total} 步骤通过
          {result.failed > 0 && `，${result.failed} 个失败`}
        </p>
      </div>
      <button onClick={onClose} className="ml-2 p-1 rounded-full hover:bg-white/10 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
