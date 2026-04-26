import { useState, useRef, type DragEvent } from "react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronDown, ChevronUp, Layers, Globe, Smartphone, Braces, CheckCircle2, type LucideIcon } from "lucide-react"
import { STEP_TEMPLATES, STEP_CATEGORIES } from "@/components/workflow/nodes"

/** 分类颜色映射 */
const CAT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  request: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" },
  app_ui:  { bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/30" },
  data:    { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30" },
  verify:  { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/30" },
}

/** 分类图标映射 */
const CAT_ICONS: Record<string, LucideIcon> = {
  request: Globe,
  app_ui:  Smartphone,
  data:    Braces,
  verify:  CheckCircle2,
}

/**
 * 步骤面板悬浮组件
 * 顶部悬浮按钮，鼠标悬浮展开/收起内容
 */
export function StepPalette() {
  const [isExpanded, setIsExpanded] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const onDragStart = (event: DragEvent, template: typeof STEP_TEMPLATES[0]) => {
    event.dataTransfer.setData("application/reactflow-type", template.type)
    event.dataTransfer.setData("application/reactflow-data", JSON.stringify(template.defaultData))
    event.dataTransfer.effectAllowed = "move"
  }

  return (
    <div
      ref={panelRef}
      className="absolute top-3 left-3 z-20 w-[240px]"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="bg-sidebar/95 backdrop-blur-sm border border-border/80 rounded-xl shadow-sm overflow-hidden">
        {/* 悬浮触发按钮 */}
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-2 w-full transition-all duration-200"
          )}
        >
          <div className="w-7 h-7 rounded-lg bg-coral/15 flex items-center justify-center">
            <Layers className="w-4 h-4 text-coral" />
          </div>
          <span className="text-sm font-semibold flex-1 text-left">步骤</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* 展开的内容面板 */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-200 ease-out",
            isExpanded ? "max-h-[60vh] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <ScrollArea className="h-[60vh]">
            {/* 分类网格 */}
            <div className="p-3 space-y-3">
              {STEP_CATEGORIES.map((cat) => {
                const CatIcon = CAT_ICONS[cat.id] || Layers
                const colors = CAT_COLORS[cat.id] || CAT_COLORS.request
                const catTemplates = STEP_TEMPLATES.filter((t) => t.category === cat.id)

                return (
                  <div key={cat.id}>
                    {/* 分类标题 */}
                    <div className={cn("flex items-center gap-2 px-2.5 py-1.5 mb-2 rounded-lg", colors.bg)}>
                      <CatIcon className={cn("w-4 h-4", colors.text)} />
                      <span className={cn("text-sm font-semibold", colors.text)}>{cat.label}</span>
                      <span className={cn("text-xs ml-auto opacity-60", colors.text)}>
                        {catTemplates.length}
                      </span>
                    </div>

                    {/* 步骤网格 */}
                    <div className="grid grid-cols-3 gap-2">
                      {catTemplates.map((template, i) => {
                        const Icon = template.icon
                        return (
                          <div
                            key={`${template.type}-${i}`}
                            draggable
                            onDragStart={(e) => onDragStart(e, template)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 px-2 py-1 rounded-xl cursor-grab active:cursor-grabbing",
                              "bg-transparent border border-transparent transition-all duration-150 group"
                            )}
                          >
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border transition-all duration-150", colors.bg, colors.border, "group-hover:scale-105 group-hover:shadow-md")}>
                              <Icon className={cn("w-5 h-5 transition-transform duration-150", colors.text)} />
                            </div>
                            <span className="text-xs font-medium text-center leading-tight truncate w-full">
                              {template.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
