import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
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
  Search,
  FileText,
  User,
  Play,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  MoreHorizontal,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Globe,
  Cpu,
  FlaskConical,
  AlertTriangle,
  FolderOpen,
  Layers,
  Folder,
  Settings,
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import {
  type TestCase,
  type TestCaseFormData,
  type TestCaseStats,
  type Directory,
  type DirectoryFormData,
  fetchTestCases,
  fetchTestCaseStats,
  createTestCase,
  updateTestCase,
  deleteTestCase,
  fetchDirectories,
  createDirectory,
  updateDirectory,
  deleteDirectory,
} from "@/services/api"

// ===================== 常量定义 =====================

const CASE_TYPES = [
  { value: "all", label: "全部类型", icon: FlaskConical },
  { value: "api", label: "接口测试", icon: Zap },
  { value: "ui", label: "UI测试", icon: Globe },
  { value: "e2e", label: "端到端", icon: Globe },
  { value: "unit", label: "单元测试", icon: Cpu },
  { value: "perf", label: "性能测试", icon: Clock },
]

const PRIORITIES = [
  { value: "P0", label: "P0 - 核心", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  { value: "P1", label: "P1 - 重要", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  { value: "P2", label: "P2 - 一般", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  { value: "P3", label: "P3 - 低优", color: "bg-green-500/10 text-green-500 border-green-500/20" },
]

const emptyTestCase: TestCaseFormData = {
  name: "",
  description: "",
  case_type: "api",
  priority: "P2",
  status: "active",
  module: "",
  directory_id: undefined,
  preconditions: "",
  test_steps: "",
  expected_results: "",
  author: "测试工程师",
  tags: [],
  is_parallel: true,
}

// ===================== 目录侧边栏 =====================
function DirectorySidebar({
  directories,
  activeId,
  onSelect,
  onEdit,
}: {
  directories: Directory[]
  activeId: string
  onSelect: (id: string) => void
  onEdit: (dir: Directory) => void
}) {
  // 颜色映射表
  const colorMap: Record<string, string> = {
    blue: "text-blue-500",
    green: "text-green-500",
    red: "text-red-500",
    orange: "text-orange-500",
    purple: "text-purple-500",
    yellow: "text-yellow-500",
    pink: "text-pink-500",
    cyan: "text-cyan-500",
  }

  const getIcon = (iconName: string) => {
    const iconMap: Record<string, typeof Folder> = {
      folder: Folder,
      layers: Layers,
      user: User,
      flask: FlaskConical,
      search: Search,
      alert: AlertTriangle,
      globe: Globe,
      file: FileText,
      zap: Zap,
    }
    return iconMap[iconName] || Folder
  }

  // 分离顶层目录和子目录
  const topLevelDirs = directories.filter((d) => !d.parent_id)
  const childDirs = directories.filter((d) => d.parent_id)

  // 获取子目录
  const getChildren = (parentId: number) => {
    return childDirs.filter((d) => d.parent_id === parentId)
  }

  const renderDirItem = (dir: Directory, isChild = false) => {
    const Icon = getIcon(dir.icon)
    const children = getChildren(dir.id)
    const iconColor = dir.color ? colorMap[dir.color] || "text-muted-foreground" : "text-muted-foreground"

    return (
      <div key={dir.id}>
        <div
          className={cn(
            "group flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors",
            activeId === String(dir.id)
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          )}
          style={{ paddingLeft: isChild ? "2rem" : undefined }}
        >
          <button
            onClick={() => onSelect(String(dir.id))}
            className="flex items-center gap-2 flex-1 min-w-0 w-full overflow-hidden"
          >
            <Icon className={cn("w-4 h-4 shrink-0", iconColor)} />
            <span className="text-left truncate max-w-[70px]" title={dir.name}>{dir.name}</span>
          </button>
          <Badge
            variant="secondary"
            className="text-xs py-0 px-1.5 h-5 bg-muted/50 shrink-0"
          >
            {dir.case_count}
          </Badge>
          <div className="hidden group-hover:flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(dir)
              }}
              className="p-1 hover:bg-muted rounded"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
        </div>
        {/* 渲染子目录 */}
        {children.map((child) => renderDirItem(child, true))}
      </div>
    )
  }

  return (
    <div className="w-56 shrink-0 overflow-hidden h-full">
      <div className="bg-sidebar rounded-2xl border border-white/5 p-3 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3 px-2 shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">目录</span>
          </div>
        </div>
        <ScrollArea className="h-0 flex-1 min-h-0">
          <div className="space-y-1 pr-2 w-full overflow-hidden">
            <button
              onClick={() => onSelect("all")}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                activeId === "all"
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="w-4 h-4 shrink-0 text-blue-500" />
              <span className="text-left truncate max-w-[100px]">全部用例</span>
            </button>

            {topLevelDirs.map((dir) => renderDirItem(dir))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

// ===================== 目录编辑对话框 =====================
function DirectoryFormDialog({
  open,
  onOpenChange,
  directory,
  directories,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  directory: Directory | null
  directories?: Directory[]
  onSave: (data: DirectoryFormData) => void
  onDelete: (id: number) => void
  isSaving?: boolean
  isDeleting?: boolean
}) {
  const [formData, setFormData] = useState<DirectoryFormData>({
    name: "",
    description: "",
    icon: "folder",
    color: "blue",
    sort_order: 0,
    parent_id: undefined,
  })

  // 获取可选的父目录（只允许选择顶层目录，且不能选择自己）
  const availableParentDirs = directories?.filter((d) => {
    if (!d.parent_id) {
      // 只选择顶层目录
      if (directory && d.id === directory.id) {
        return false // 不能选择自己
      }
      return true
    }
    return false
  }) || []

  useEffect(() => {
    if (directory) {
      setFormData({
        name: directory.name,
        description: directory.description,
        icon: directory.icon,
        color: directory.color,
        sort_order: directory.sort_order,
        parent_id: directory.parent_id,
      })
    } else {
      setFormData({
        name: "",
        description: "",
        icon: "folder",
        color: "blue",
        sort_order: 0,
        parent_id: undefined,
      })
    }
  }, [directory, open])

  const handleSave = () => {
    if (!formData.name?.trim()) return
    onSave(formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {directory ? "编辑目录" : "新建目录"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">目录名称</label>
            <Input
              placeholder="输入目录名称"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">描述</label>
            <Input
              placeholder="输入目录描述"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">父目录</label>
            <Select
              value={formData.parent_id ? String(formData.parent_id) : "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, parent_id: value === "none" ? undefined : Number(value) })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="无父目录（顶层目录）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无父目录（顶层目录）</SelectItem>
                {availableParentDirs.map((dir) => (
                  <SelectItem key={dir.id} value={String(dir.id)}>
                    {dir.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">最多支持2层目录结构</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">图标</label>
              <Select
                value={formData.icon || "folder"}
                onValueChange={(value) =>
                  setFormData({ ...formData, icon: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="folder">文件夹</SelectItem>
                  <SelectItem value="layers">层级</SelectItem>
                  <SelectItem value="user">用户</SelectItem>
                  <SelectItem value="flask">烧瓶</SelectItem>
                  <SelectItem value="search">搜索</SelectItem>
                  <SelectItem value="alert">警告</SelectItem>
                  <SelectItem value="globe">地球</SelectItem>
                  <SelectItem value="file">文件</SelectItem>
                  <SelectItem value="zap">闪电</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">颜色</label>
              <Select
                value={formData.color || "blue"}
                onValueChange={(value) =>
                  setFormData({ ...formData, color: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">蓝色</SelectItem>
                  <SelectItem value="green">绿色</SelectItem>
                  <SelectItem value="red">红色</SelectItem>
                  <SelectItem value="orange">橙色</SelectItem>
                  <SelectItem value="purple">紫色</SelectItem>
                  <SelectItem value="yellow">黄色</SelectItem>
                  <SelectItem value="pink">粉色</SelectItem>
                  <SelectItem value="cyan">青色</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {directory && (
            <div className="pt-2 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(directory.id)}
                disabled={isDeleting || directory.is_default}
                className="w-full"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                删除目录
              </Button>
              {directory.is_default && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  默认目录无法删除
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !formData.name?.trim()}
            className="bg-coral hover:bg-coral/90"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===================== 统计卡片 =====================
function StatsCards({ stats }: { stats: TestCaseStats | null }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-sidebar rounded-2xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <div className="w-4 h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-8 w-16 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-sidebar rounded-2xl p-4 border border-white/5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <FlaskConical className="w-4 h-4" />
          <span>总用例数</span>
        </div>
        <p className="text-2xl font-semibold">{stats.total}</p>
      </div>
      <div className="bg-sidebar rounded-2xl p-4 border border-white/5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <Zap className="w-4 h-4" />
          <span>自动化率</span>
        </div>
        <p className="text-2xl font-semibold">
          {Math.round(stats.automated / Math.max(stats.total, 1) * 100)}%
        </p>
      </div>
      <div className="bg-sidebar rounded-2xl p-4 border border-white/5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span>通过率</span>
        </div>
        <p className="text-2xl font-semibold text-green-500">{stats.pass_rate}%</p>
      </div>
      <div className="bg-sidebar rounded-2xl p-4 border border-white/5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <span>不稳定用例</span>
        </div>
        <p className="text-2xl font-semibold text-yellow-500">{stats.flaky}</p>
      </div>
    </div>
  )
}
// ===================== 用例卡片 =====================
function TestCaseCard({
  testCase,
  onEdit,
  onDelete,
  onView,
  isDeleting,
}: {
  testCase: TestCase
  onEdit: (tc: TestCase) => void
  onDelete: (id: number) => void
  onView: (tc: TestCase) => void
  isDeleting: boolean
}) {
  const priorityConfig = PRIORITIES.find((p) => p.value === testCase.priority)
  const typeConfig = CASE_TYPES.find((t) => t.value === testCase.case_type)

  return (
    <div
      className={cn(
        "bg-sidebar rounded-2xl p-4 border border-white/5 transition-colors group flex flex-col h-full relative",
        isDeleting && "opacity-50 pointer-events-none"
      )}
    >
      <Badge
        className={cn(
          "absolute top-4 right-4 text-xs",
          priorityConfig?.color || "bg-muted text-muted-foreground"
        )}
      >
        {testCase.priority}
      </Badge>

      <div className="flex items-start justify-between mb-3 pr-16">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pixel-blue/10 to-pixel-purple/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-pixel-blue" />
        </div>
      </div>

      <h3 className="font-medium text-sm mb-2 group-hover:text-pixel-blue transition-colors line-clamp-1">
        {testCase.name}
      </h3>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
        {testCase.description || "暂无描述"}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <Badge
          variant="secondary"
          className="rounded-full bg-muted/50 text-xs py-0 px-2"
        >
          {typeConfig?.label || testCase.case_type}
        </Badge>
        {testCase.module && (
          <Badge
            variant="secondary"
            className="rounded-full bg-muted/50 text-xs py-0 px-2"
          >
            {testCase.module}
          </Badge>
        )}
        {testCase.is_automated && (
          <Badge
            variant="secondary"
            className="rounded-full bg-pixel-green/10 text-pixel-green text-xs py-0 px-2"
          >
            <Zap className="w-3 h-3 mr-1" />
            自动化
          </Badge>
        )}
        {testCase.flaky && (
          <Badge
            variant="secondary"
            className="rounded-full bg-yellow-500/10 text-yellow-500 text-xs py-0 px-2"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            Flaky
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground/60 mb-3">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {testCase.author}
        </span>
        <span className="flex items-center gap-1">
          <Play className="w-3 h-3" />
          {testCase.total_runs}次
        </span>
      </div>

      <div className="flex items-center gap-3 mb-3 p-2 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-1 text-green-500">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-medium">{testCase.passed_runs}</span>
        </div>
        <div className="flex items-center gap-1 text-red-500">
          <XCircle className="w-4 h-4" />
          <span className="text-xs font-medium">{testCase.failed_runs}</span>
        </div>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {testCase.pass_rate}% 通过
        </span>
      </div>

      <div className="flex gap-2 mt-auto">
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 h-8 rounded-full bg-muted/50"
          onClick={() => onView(testCase)}
        >
          <Eye className="w-3.5 h-3.5 mr-1" />
          详情
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="flex-1 h-8 rounded-full bg-coral hover:bg-coral/90"
            >
              <MoreHorizontal className="w-3.5 h-3.5 mr-1" />
              操作
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(testCase)}>
              <Edit2 className="w-3.5 h-3.5 mr-2" />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(testCase.id)} disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 mr-2" />
              )}
              删除
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="w-3.5 h-3.5 mr-2" />
              导出
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ===================== 用例表单对话框 =====================
function TestCaseFormDialog({
  open,
  onOpenChange,
  testCase,
  onSave,
  directories,
  mode = "edit",
  isSaving = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  testCase: TestCase | null
  onSave: (tc: TestCase | TestCaseFormData) => void
  directories?: Directory[]
  mode?: "view" | "edit" | "create"
  isSaving?: boolean
}) {
  const isViewMode = mode === "view"
  const [formData, setFormData] = useState<Partial<TestCase | TestCaseFormData>>(
    testCase ?? { ...emptyTestCase }
  )
  const [tagInput, setTagInput] = useState("")

  useEffect(() => {
    if (testCase) {
      setFormData(testCase)
    } else {
      setFormData({ ...emptyTestCase })
    }
    setTagInput("")
  }, [testCase, open])

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      })
      setTagInput("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSave = () => {
    if (!formData.name?.trim()) return
    onSave(formData as TestCase | TestCaseFormData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {isViewMode ? "用例详情" : testCase ? "编辑用例" : "新建用例"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="px-2 pb-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">用例名称</label>
              {isViewMode ? (
                <p className="text-sm py-2">{formData.name}</p>
              ) : (
                <Input
                  placeholder="输入用例名称"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">用例类型</label>
                {isViewMode ? (
                  <p className="text-sm py-2">{CASE_TYPES.find((t) => t.value === formData.case_type)?.label}</p>
                ) : (
                  <Select
                    value={formData.case_type || "api"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, case_type: value as TestCase["case_type"] })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CASE_TYPES.filter((t) => t.value !== "all").map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">优先级</label>
                {isViewMode ? (
                  <p className="text-sm py-2">{formData.priority}</p>
                ) : (
                  <Select
                    value={formData.priority || "P2"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value as TestCase["priority"] })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">状态</label>
                {isViewMode ? (
                  <p className="text-sm py-2">{formData.status}</p>
                ) : (
                  <Select
                    value={formData.status || "active"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value as TestCase["status"] })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">活跃</SelectItem>
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="deprecated">已废弃</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">所属目录</label>
                {isViewMode ? (
                  <p className="text-sm py-2">
                    {directories?.find((d) => d.id === formData.directory_id)?.name || "-"}
                  </p>
                ) : (
                  <Select
                    value={formData.directory_id ? String(formData.directory_id) : "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, directory_id: value === "none" ? undefined : Number(value) })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择目录" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无目录</SelectItem>
                      {directories?.map((dir) => (
                        <SelectItem key={dir.id} value={String(dir.id)}>
                          {dir.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">所属模块</label>
              {isViewMode ? (
                <p className="text-sm py-2">{formData.module || "-"}</p>
              ) : (
                <Input
                  placeholder="输入模块名称"
                  value={formData.module || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, module: e.target.value })
                  }
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">描述</label>
              {isViewMode ? (
                <p className="text-sm py-2 text-muted-foreground">{formData.description || "暂无描述"}</p>
              ) : (
                <textarea
                  className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  placeholder="输入用例描述"
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">前置条件</label>
              {isViewMode ? (
                <p className="text-sm py-2 text-muted-foreground whitespace-pre-wrap">
                  {formData.preconditions || "无"}
                </p>
              ) : (
                <textarea
                  className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  placeholder="输入前置条件"
                  value={formData.preconditions || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, preconditions: e.target.value })
                  }
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">测试步骤</label>
              {isViewMode ? (
                <p className="text-sm py-2 text-muted-foreground whitespace-pre-wrap">
                  {formData.test_steps || "无"}
                </p>
              ) : (
                <textarea
                  className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  placeholder="输入测试步骤"
                  value={formData.test_steps || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, test_steps: e.target.value })
                  }
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">预期结果</label>
              {isViewMode ? (
                <p className="text-sm py-2 text-muted-foreground whitespace-pre-wrap">
                  {formData.expected_results || "无"}
                </p>
              ) : (
                <textarea
                  className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  placeholder="输入预期结果"
                  value={formData.expected_results || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, expected_results: e.target.value })
                  }
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">标签</label>
              {isViewMode ? (
                <div className="flex flex-wrap gap-2">
                  {formData.tags && formData.tags.length > 0 ? (
                    formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="rounded-full bg-muted/50">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">无标签</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="添加标签"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <Button type="button" variant="outline" onClick={handleAddTag}>
                      添加
                    </Button>
                  </div>
                  {formData.tags && formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="rounded-full bg-muted/50 cursor-pointer hover:bg-muted"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          {tag}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {!isViewMode && (
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.is_parallel !== false}
                    onChange={(e) =>
                      setFormData({ ...formData, is_parallel: e.target.checked })
                    }
                    className="rounded border-input"
                  />
                  可并行执行
                </label>
              </div>
            )}

            {isViewMode && "total_runs" in formData && formData.total_runs !== undefined && (
              <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">执行次数</p>
                  <p className="text-lg font-semibold">{formData.total_runs}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">通过率</p>
                  <p className="text-lg font-semibold text-green-500">{formData.pass_rate}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">平均耗时</p>
                  <p className="text-lg font-semibold">{formData.avg_duration?.toFixed(2)}s</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {!isViewMode && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.name?.trim()}
              className="bg-coral hover:bg-coral/90"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              保存
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ===================== 主组件 =====================
export function TestCaseMarket() {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [directories, setDirectories] = useState<Directory[]>([])
  const [stats, setStats] = useState<TestCaseStats | null>(null)
  const [activeType, setActiveType] = useState("all")
  const [activePriority, setActivePriority] = useState("all")
  const [activeDirectoryId, setActiveDirectoryId] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null)
  const [dialogMode, setDialogMode] = useState<"view" | "edit" | "create">("edit")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const [dirDialogOpen, setDirDialogOpen] = useState(false)
  const [editingDirectory, setEditingDirectory] = useState<Directory | null>(null)
  const [isDirSaving, setIsDirSaving] = useState(false)
  const [isDirDeleting, setIsDirDeleting] = useState(false)
  const [dirDeleteConfirmId, setDirDeleteConfirmId] = useState<number | null>(null)

  const loadDirectories = useCallback(async () => {
    try {
      const data = await fetchDirectories()
      setDirectories(data)
    } catch (error) {
      console.error("获取目录列表失败:", error)
    }
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchTestCaseStats()
      setStats(data)
    } catch (error) {
      console.error("获取统计数据失败:", error)
    }
  }, [])

  const loadTestCases = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchTestCases({
        case_type: activeType === "all" ? undefined : activeType,
        priority: activePriority === "all" ? undefined : activePriority,
        search: searchQuery.trim() || undefined,
      })
      const filtered = activeDirectoryId === "all"
        ? data
        : data.filter((tc: TestCase) => tc.directory_id === Number(activeDirectoryId))
      setTestCases(filtered)
    } catch (error) {
      console.error("加载用例失败:", error)
    } finally {
      setIsLoading(false)
    }
  }, [activeType, activePriority, searchQuery, activeDirectoryId])

  useEffect(() => {
    loadDirectories()
  }, [loadDirectories])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    loadTestCases()
  }, [loadTestCases])

  const handleCreate = () => {
    setEditingTestCase(null)
    setDialogMode("create")
    setDialogOpen(true)
  }

  const handleView = (tc: TestCase) => {
    setEditingTestCase(tc)
    setDialogMode("view")
    setDialogOpen(true)
  }

  const handleEdit = (tc: TestCase) => {
    setEditingTestCase(tc)
    setDialogMode("edit")
    setDialogOpen(true)
  }

  const handleSave = async (tc: TestCase | TestCaseFormData) => {
    setIsSaving(true)
    try {
      if ("id" in tc && tc.id) {
        await updateTestCase(tc.id, tc)
      } else {
        await createTestCase(tc as TestCaseFormData)
      }
      loadTestCases()
      loadStats()
      loadDirectories()
    } catch (error) {
      console.error("保存用例失败:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id)
  }

  const confirmDelete = async () => {
    if (!deleteConfirmId) return
    setDeletingId(deleteConfirmId)
    setDeleteConfirmId(null)
    try {
      await deleteTestCase(deleteConfirmId)
      loadTestCases()
      loadStats()
      loadDirectories()
    } catch (error) {
      console.error("删除用例失败:", error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleCreateDir = () => {
    setEditingDirectory(null)
    setDirDialogOpen(true)
  }

  const handleEditDir = (dir: Directory) => {
    setEditingDirectory(dir)
    setDirDialogOpen(true)
  }

  const handleSaveDir = async (data: DirectoryFormData) => {
    setIsDirSaving(true)
    try {
      if (editingDirectory) {
        await updateDirectory(editingDirectory.id, data)
      } else {
        await createDirectory(data)
      }
      loadDirectories()
    } catch (error) {
      console.error("保存目录失败:", error)
    } finally {
      setIsDirSaving(false)
      setEditingDirectory(null)
    }
  }

  const handleDeleteDir = (id: number) => {
    setDirDialogOpen(false)
    setDirDeleteConfirmId(id)
  }

  const confirmDeleteDir = async () => {
    if (!dirDeleteConfirmId) return
    setIsDirDeleting(true)
    try {
      await deleteDirectory(dirDeleteConfirmId)
      loadDirectories()
      loadTestCases()
      if (activeDirectoryId === String(dirDeleteConfirmId)) {
        setActiveDirectoryId("all")
      }
    } catch (error) {
      console.error("删除目录失败:", error)
    } finally {
      setIsDirDeleting(false)
      setDirDeleteConfirmId(null)
    }
  }

  return (
    <div className="flex gap-4 h-full">
      <DirectorySidebar
        directories={directories}
        activeId={activeDirectoryId}
        onSelect={setActiveDirectoryId}
        onEdit={handleEditDir}
      />

      <div className="flex-1 space-y-6 min-w-0 overflow-auto h-full">
        <StatsCards stats={stats} />

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜索用例..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-full bg-sidebar border-white/5"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-sidebar rounded-full border border-white/5">
            {CASE_TYPES.map((type) => {
              const Icon = type.icon
              const isActive = activeType === type.value
              return (
                <button
                  key={type.value}
                  onClick={() => setActiveType(type.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{type.label}</span>
                </button>
              )
            })}
          </div>

          <Select value={activePriority} onValueChange={setActivePriority}>
            <SelectTrigger className="w-32 h-10 rounded-full bg-sidebar border-white/5">
              <SelectValue placeholder="优先级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部优先级</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={handleCreateDir}
              className="h-10 rounded-full shrink-0"
            >
              <FolderOpen className="w-4 h-4 mr-1" />
              新建目录
            </Button>

            <Button
              onClick={handleCreate}
              className="h-10 rounded-full bg-coral hover:bg-coral/90 shrink-0"
            >
              <Plus className="w-4 h-4 mr-1" />
              新建用例
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-sidebar rounded-2xl p-4 border border-white/5"
              >
                <div className="flex items-start justify-between mb-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <Skeleton className="w-10 h-5 rounded-full" />
                </div>
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full mb-3" />
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full mb-3" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 flex-1 rounded-full" />
                  <Skeleton className="h-8 flex-1 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : testCases.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>暂无测试用例，点击上方按钮创建</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {testCases.map((tc) => (
              <TestCaseCard
                key={tc.id}
                testCase={tc}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                isDeleting={deletingId === tc.id}
              />
            ))}
          </div>
        )}

        <TestCaseFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          testCase={editingTestCase}
          onSave={handleSave}
          directories={directories}
          mode={dialogMode}
          isSaving={isSaving}
        />

        <AlertDialog
          open={deleteConfirmId !== null}
          onOpenChange={() => setDeleteConfirmId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除这个测试用例吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={confirmDelete}
                disabled={deletingId !== null}
              >
                {deletingId !== null ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "删除"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <DirectoryFormDialog
          open={dirDialogOpen}
          onOpenChange={setDirDialogOpen}
          directory={editingDirectory}
          directories={directories}
          onSave={handleSaveDir}
          onDelete={handleDeleteDir}
          isSaving={isDirSaving}
          isDeleting={isDirDeleting}
        />

        <AlertDialog
          open={dirDeleteConfirmId !== null}
          onOpenChange={() => setDirDeleteConfirmId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除目录</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除这个目录吗？目录下的用例将移至"无目录"。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={confirmDeleteDir}
                disabled={isDirDeleting}
              >
                {isDirDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "删除"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
