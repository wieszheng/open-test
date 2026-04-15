import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CodeBlock } from "@/components/ui/code-block";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Code2,
  Star,
  Download,
  Eye,
  Clock,
  User,
  Grid3X3,
  List,
  Sparkles,
  Bot,
  Globe,
  Database,
  Terminal,
  Activity,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
  fetchScripts,
  fetchFeaturedScripts,
  createScript as apiCreateScript,
  updateScript as apiUpdateScript,
  deleteScript as apiDeleteScript,
  type Script,
} from "@/services/api";

// ===================== 脚本类型配置 =====================
interface ScriptCategory {
  id: string;
  label: string;
  icon: typeof Bot;
  count: number;
}

const categories: ScriptCategory[] = [
  { id: "all", label: "全部", icon: Grid3X3, count: 0 },
  { id: "api", label: "API 测试", icon: Database, count: 0 },
  { id: "ui", label: "UI 自动化", icon: Globe, count: 0 },
  { id: "performance", label: "性能测试", icon: Activity, count: 0 },
  { id: "ai", label: "AI 脚本", icon: Bot, count: 0 },
  { id: "custom", label: "自定义", icon: Terminal, count: 0 },
];

// 空脚本模板
// 空脚本模板
const emptyScript = {
  name: "",
  description: "",
  category: "api",
  author: "测试工程师",
  tags: [],
  featured: false,
  code: "",
  language: "python",
};

// 支持的编程语言
const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "shell", label: "Shell" },
  { value: "sql", label: "SQL" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
];

// ===================== 精选脚本卡片 =====================
function FeaturedScriptsCard() {
  const [featuredScripts, setFeaturedScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchFeaturedScripts(4)
      .then(setFeaturedScripts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="bg-sidebar border-white/5">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <CardTitle className="text-lg">精选脚本</CardTitle>
          <Badge
            variant="secondary"
            className="rounded-full bg-yellow-500/10 text-yellow-400 text-xs"
          >
            Editor&apos;s Pick
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-muted/50 rounded-2xl p-4 border border-white/5"
              >
                <div className="flex items-start justify-between mb-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <Skeleton className="w-12 h-4" />
                </div>
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full mb-3" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredScripts.map((script) => (
            <div
              key={script.id}
              className="bg-muted/50 rounded-2xl p-4 border border-white/5 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral/20 to-lavender/20 flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-coral" />
                </div>
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="text-sm font-medium">{script.rating}</span>
                </div>
              </div>
              <h3 className="font-medium text-sm mb-2 group-hover:text-coral transition-colors">
                {script.name}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {script.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground/60">
                  {script.author}
                </span>
                <div className="flex items-center gap-2 text-muted-foreground/40">
                  <span className="flex items-center gap-1 text-xs">
                    <Download className="w-3 h-3" />
                    {script.downloads}
                  </span>
                </div>
              </div>
            </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===================== 脚本列表项（列表视图） =====================
function ScriptListItem({
  script,
  onEdit,
  onDelete,
  onView,
  isDeleting,
}: {
  script: Script;
  onEdit: (script: Script) => void;
  onDelete: (id: number) => void;
  onView: (script: Script) => void;
  isDeleting: boolean;
}) {
  return (
    <div className={cn(
      "bg-sidebar rounded-2xl p-4 border border-white/5 transition-colors group",
      isDeleting && "opacity-50 pointer-events-none"
    )}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral/10 to-lavender/10 flex items-center justify-center shrink-0">
          <Code2 className="w-6 h-6 text-coral" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h3 className="font-medium group-hover:text-coral transition-colors mb-1">
                {script.name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {script.description}
              </p>
            </div>
            <div className="flex items-center gap-1 text-yellow-400 shrink-0">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-medium">{script.rating}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {script.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="rounded-full bg-muted/50 text-xs"
              >
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {script.author}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(script.updated_at).toLocaleDateString("zh-CN")}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {script.views}
              </span>
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                {script.downloads}
              </span>
            </div>

            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-full bg-muted/50"
                disabled={isDeleting}
                onClick={() => onView(script)}
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                查看
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-full bg-muted/50 hover:text-coral"
                disabled={isDeleting}
                onClick={() => onEdit(script)}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                编辑
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-full bg-muted/50 hover:text-red-500"
                disabled={isDeleting}
                onClick={() => onDelete(script.id)}
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                )}
                {isDeleting ? "删除中" : "删除"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== 脚本卡片（网格视图） =====================
function ScriptCard({
  script,
  onEdit,
  onDelete,
  onView,
  isDeleting,
}: {
  script: Script;
  onEdit: (script: Script) => void;
  onDelete: (id: number) => void;
  onView: (script: Script) => void;
  isDeleting: boolean;
}) {
  return (
    <div className={cn(
      "bg-sidebar rounded-2xl p-4 border border-white/5 transition-colors group flex flex-col h-full relative",
      isDeleting && "opacity-50 pointer-events-none"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral/10 to-lavender/10 flex items-center justify-center">
          <Code2 className="w-5 h-5 text-coral" />
        </div>
        {/* 评分 + 操作按钮 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-yellow-400">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="text-sm font-medium">{script.rating}</span>
          </div>
          {/* 操作按钮 */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full bg-muted/80 hover:bg-muted"
              disabled={isDeleting}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(script);
              }}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full bg-muted/80 hover:text-red-500"
              disabled={isDeleting}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(script.id);
              }}
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <h3 className="font-medium text-sm mb-2 group-hover:text-coral transition-colors line-clamp-1">
        {script.name}
      </h3>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
        {script.description}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {script.tags.slice(0, 2).map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="rounded-full bg-muted/50 text-xs py-0 px-2"
          >
            {tag}
          </Badge>
        ))}
        {script.tags.length > 2 && (
          <Badge
            variant="secondary"
            className="rounded-full bg-muted/50 text-xs py-0 px-2"
          >
            +{script.tags.length - 2}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground/60 mb-3">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {script.author}
        </span>
        <span className="flex items-center gap-1">
          <Download className="w-3 h-3" />
          {script.downloads}
        </span>
      </div>

      <div className="flex gap-2 mt-auto">
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 h-8 rounded-full bg-muted/50"
          onClick={() => onView(script)}
        >
          <Eye className="w-3.5 h-3.5 mr-1" />
          查看
        </Button>
        <Button
          size="sm"
          className="flex-1 h-8 rounded-full bg-coral hover:bg-coral/90"
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          使用
        </Button>
      </div>
    </div>
  );
}

// ===================== 脚本列表 =====================
function ScriptList({
  scripts,
  activeCategory,
  viewMode,
  onEdit,
  onDelete,
  onView,
  isLoading,
  deletingId,
}: {
  scripts: Script[];
  activeCategory: string;
  viewMode: "grid" | "list";
  onEdit: (script: Script) => void;
  onDelete: (id: number) => void;
  onView: (script: Script) => void;
  isLoading: boolean;
  deletingId: number | null;
}) {
  const filteredScripts =
    activeCategory === "all"
      ? scripts
      : scripts.filter((s) => s.category === activeCategory);

  // 加载状态
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="bg-sidebar rounded-2xl p-4 border border-white/5"
          >
            <div className="flex items-start justify-between mb-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <Skeleton className="w-12 h-4" />
            </div>
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-full mb-3" />
            <div className="flex flex-wrap gap-1.5 mb-3">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="flex gap-2 mt-3">
              <Skeleton className="h-8 flex-1 rounded-full" />
              <Skeleton className="h-8 flex-1 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredScripts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Code2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>暂无脚本，点击上方按钮创建</p>
      </div>
    );
  }

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredScripts.map((script) => (
          <ScriptCard
            key={script.id}
            script={script}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
            isDeleting={deletingId === script.id}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredScripts.map((script) => (
        <ScriptListItem
          key={script.id}
          script={script}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          isDeleting={deletingId === script.id}
        />
      ))}
    </div>
  );
}

// ===================== 脚本表单对话框 =====================
function ScriptFormDialog({
  open,
  onOpenChange,
  script,
  onSave,
  mode = "edit",
  isSaving = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script: Script | null;
  onSave: (script: Script) => void;
  mode?: "view" | "edit" | "create";
  isSaving?: boolean;
}) {
  const isViewMode = mode === "view";
  const [formData, setFormData] = useState<Partial<Script>>(
    script ?? { ...emptyScript },
  );
  const [tagInput, setTagInput] = useState("");

  // 当 script 或 open 变化时重置表单
  useEffect(() => {
    if (script) {
      setFormData(script);
    } else {
      setFormData({ ...emptyScript });
    }
    setTagInput("");
  }, [script, open]);

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = () => {
    if (!formData.name?.trim()) return;
    const scriptData = {
      ...formData,
      id: script?.id,
    };
    onSave(scriptData as Script);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {isViewMode ? "查看脚本" : script ? "编辑脚本" : "新建脚本"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="px-2 pb-4 space-y-4">
            {/* 名称 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">脚本名称</label>
              {isViewMode ? (
                <p className="text-sm py-2">{formData.name}</p>
              ) : (
                <Input
                  placeholder="输入脚本名称"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              )}
            </div>

            {/* 分类 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">分类</label>
              {isViewMode ? (
                <p className="text-sm py-2">
                  {categories.find((c) => c.id === formData.category)?.label ||
                    formData.category}
                </p>
              ) : (
                <Select
                  value={formData.category || "api"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((c) => c.id !== "all")
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 描述 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">描述</label>
              {isViewMode ? (
                <p className="text-sm py-2">{formData.description}</p>
              ) : (
                <textarea
                  className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  placeholder="输入脚本描述"
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              )}
            </div>

            {/* 代码内容 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">代码内容</label>
                {!isViewMode && (
                  <Select
                    value={formData.language || "python"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, language: value })
                    }
                  >
                    <SelectTrigger className="w-32 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {isViewMode ? (
                <CodeBlock
                  code={formData.code || ""}
                  language={formData.language || "python"}
                  maxHeight="300px"
                />
              ) : (
                <textarea
                  className="flex min-h-[200px] w-full rounded-lg border border-input bg-charcoal px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                  placeholder="# 在此输入脚本代码..."
                  value={formData.code || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  spellCheck={false}
                />
              )}
            </div>

            {/* 标签 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">标签</label>
              {isViewMode ? (
                <div className="flex flex-wrap gap-2">
                  {formData.tags && formData.tags.length > 0 ? (
                    formData.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="rounded-full bg-muted/50"
                      >
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">无标签</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="输入标签后按回车添加"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddTag}
                    >
                      添加
                    </Button>
                  </div>
                  {formData.tags && formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="rounded-full bg-muted/50 cursor-pointer hover:bg-muted pr-1"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          {tag}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {isViewMode ? "关闭" : "取消"}
          </Button>
          {!isViewMode && (
            <Button
              onClick={handleSave}
              disabled={!formData.name?.trim() || isSaving}
              className="hover:bg-coral/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {script ? "保存中..." : "创建中..."}
                </>
              ) : (
                script ? "保存" : "创建"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===================== 主组件 =====================
/**
 * ScriptMarket 组件 - 脚本市场页面（支持增删改查）
 */
export function ScriptMarket() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [dialogMode, setDialogMode] = useState<"view" | "edit" | "create">(
    "edit",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // 加载脚本数据
  const loadScripts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchScripts({ category: activeCategory === "all" ? undefined : activeCategory });
      setScripts(data);
    } catch (error) {
      console.error("加载脚本失败:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    loadScripts();
  }, [loadScripts]);

  // 根据分类统计数量
  const categoriesWithCount = categories.map((cat) => ({
    ...cat,
    count:
      cat.id === "all"
        ? scripts.length
        : scripts.filter((s) => s.category === cat.id).length,
  }));

  // 过滤脚本
  let filteredScripts = scripts;
  if (activeCategory !== "all") {
    filteredScripts = filteredScripts.filter((s) => s.category === activeCategory);
  }
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredScripts = filteredScripts.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.tags.some((t) => t.toLowerCase().includes(query)),
    );
  }

  // 创建脚本
  const handleCreate = () => {
    setEditingScript(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  // 查看脚本
  const handleView = (script: Script) => {
    setEditingScript(script);
    setDialogMode("view");
    setDialogOpen(true);
  };

  // 编辑脚本
  const handleEdit = (script: Script) => {
    setEditingScript(script);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  // 保存脚本（创建或更新）
  const handleSave = async (script: Script) => {
    setIsSaving(true);
    try {
      if (script.id) {
        await apiUpdateScript(script.id, script);
      } else {
        await apiCreateScript(script);
      }
      loadScripts();
    } catch (error) {
      console.error("保存脚本失败:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // 删除脚本
  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await apiDeleteScript(id);
      loadScripts();
    } catch (error) {
      console.error("删除脚本失败:", error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 精选脚本 - 固定显示 */}
      <FeaturedScriptsCard />

      {/* 搜索框、分类和视图切换 */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 新建按钮 */}
        <Button
          onClick={handleCreate}
          className="h-10 rounded-full bg-coral hover:bg-coral/90 shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" />
          新建脚本
        </Button>

        {/* 搜索框 */}
        <div className="relative w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜索脚本..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-full bg-sidebar border-white/5"
          />
        </div>

        {/* 分类胶囊按钮组 */}
        <div className="flex items-center gap-1 p-1 bg-sidebar rounded-full border border-white/5">
          {categoriesWithCount.slice(0, 5).map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{cat.label}</span>
                <span className="text-xs opacity-60">({cat.count})</span>
              </button>
            );
          })}
        </div>

        {/* 视图切换 - 右侧 */}
        <div className="flex gap-1 p-1 bg-sidebar rounded-full border border-white/5 ml-auto">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-2 rounded-full transition-colors",
              viewMode === "list"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-2 rounded-full transition-colors",
              viewMode === "grid"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 脚本列表 */}
      <ScriptList
        scripts={filteredScripts}
        activeCategory={activeCategory}
        viewMode={viewMode}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        isLoading={isLoading}
        deletingId={deletingId}
      />

      {/* 脚本表单对话框 */}
      <ScriptFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        script={editingScript}
        onSave={handleSave}
        mode={dialogMode}
        isSaving={isSaving}
      />
    </div>
  );
}
