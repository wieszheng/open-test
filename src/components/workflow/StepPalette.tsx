import { useState, useMemo, type DragEvent } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronRight, Layers, GripVertical, Search } from "lucide-react"
import { STEP_TEMPLATES, STEP_CATEGORIES } from "@/components/workflow/nodes"

export function StepPalette() {
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCats, setExpandedCats] = useState<string[]>(STEP_CATEGORIES.map((c) => c.id))

  const toggleCat = (id: string) =>
    setExpandedCats((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id])

  const filteredTemplates = useMemo(() => {
    if (!searchTerm.trim()) return STEP_TEMPLATES
    const t = searchTerm.toLowerCase()
    return STEP_TEMPLATES.filter((n) => n.label.includes(t) || n.description.includes(t))
  }, [searchTerm])

  const onDragStart = (event: DragEvent, template: typeof STEP_TEMPLATES[0]) => {
    event.dataTransfer.setData("application/reactflow-type", template.type)
    event.dataTransfer.setData("application/reactflow-data", JSON.stringify(template.defaultData))
    event.dataTransfer.effectAllowed = "move"
  }

  return (
    <div className="w-61 rounded-2xl bg-sidebar border border-white/5 flex flex-col z-10 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <Layers className="w-4 h-4 text-coral" />
        <span className="text-sm font-semibold">步骤面板</span>
      </div>

      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索步骤..."
            className="h-8 pl-8 rounded-2xl bg-muted/30 border-white/5"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 pb-3 space-y-1">
          {STEP_CATEGORIES.map((cat) => {
            const CatIcon = cat.icon
            const isExpanded = expandedCats.includes(cat.id)
            const catTemplates = filteredTemplates.filter((t) => t.category === cat.id)
            if (catTemplates.length === 0 && searchTerm) return null
            return (
              <div key={cat.id}>
                <button
                  onClick={() => toggleCat(cat.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl"
                >
                  <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-90")} />
                  <CatIcon className="w-3.5 h-3.5" />
                  <span className="text-[13px]">{cat.label}</span>
                  <Badge variant="secondary" className="ml-auto text-[11px] px-1.5 py-0 h-4 bg-muted/50">{catTemplates.length}</Badge>
                </button>
                {isExpanded && (
                  <div className="ml-2 space-y-0.5 mt-0.5">
                    {catTemplates.map((template, i) => {
                      const Icon = template.icon
                      return (
                        <div
                          key={`${template.type}-${i}`}
                          draggable
                          onDragStart={(e) => onDragStart(e, template)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-grab active:cursor-grabbing border border-transparent hover:border-white/10 transition-all hover:bg-muted/20 group"
                        >
                          <div className="w-6 h-6 rounded-xl flex items-center justify-center shrink-0 bg-muted/40 border border-white/5">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-medium truncate">{template.label}</p>
                            <p className="text-[10px] text-muted-foreground/80 truncate">{template.description}</p>
                          </div>
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
