import { useState, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, FlaskConical, Loader2, CheckCircle2 } from "lucide-react"
import { fetchTestCases, fetchWorkflowedCaseIds, type TestCase } from "@/services/api"

const PRIORITY_COLORS: Record<string, string> = {
  P0: "bg-red-500/10 text-red-500 border-red-500/20",
  P1: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  P2: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  P3: "bg-green-500/10 text-green-500 border-green-500/20",
}

export function TestCasePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (tc: TestCase) => void
}) {
  const [cases, setCases] = useState<TestCase[]>([])
  const [workflowedIds, setWorkflowedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      fetchTestCases({ limit: 100 }),
      fetchWorkflowedCaseIds(),
    ])
      .then(([tcList, ids]) => {
        setCases(tcList)
        setWorkflowedIds(new Set(ids))
      })
      .finally(() => setLoading(false))
  }, [open])

  const filtered = useMemo(() => {
    if (!search.trim()) return cases
    const s = search.toLowerCase()
    return cases.filter((c) => c.name.toLowerCase().includes(s) || c.description.toLowerCase().includes(s))
  }, [cases, search])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-coral" />
            选择要编排的测试用例
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索用例名称..."
              className="pl-9 h-9 rounded-2xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">暂无匹配的测试用例</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((tc) => (
                <div
                  key={tc.id}
                  onClick={() => { onSelect(tc); onOpenChange(false) }}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-sidebar hover:bg-muted/30 cursor-pointer transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium truncate group-hover:text-coral transition-colors">{tc.name}</p>
                      <Badge className={cn("text-[10px] px-1.5 py-0 rounded-full shrink-0", PRIORITY_COLORS[tc.priority])}>
                        {tc.priority}
                      </Badge>
                      {workflowedIds.has(tc.id) && (
                        <Badge className="text-[10px] px-1.5 py-0 rounded-full bg-green-500/10 text-green-400 border-green-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />已编排
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{tc.description || "暂无描述"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
