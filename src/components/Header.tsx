import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Search,
  Sun,
  Moon,
  Bell,
  User,
  Monitor,
  FlaskConical,
  FileText,
  Bug,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

/** 内容类型按钮配置 */
interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const tabItems: TabItem[] = [
  { id: "console", label: "控制台", icon: Monitor },
  { id: "env", label: "测试环境", icon: FlaskConical },
  { id: "report", label: "测试报告", icon: FileText },
];

interface HeaderProps {
  /** 自定义类名 */
  className?: string;
  /** 当前选中的 Tab */
  activeTab?: string;
  /** Tab 变化回调 */
  onTabChange?: (id: string) => void;
  /** 是否为深色模式 */
  isDarkMode?: boolean;
  /** 主题切换回调 */
  onThemeToggle?: () => void;
}

/**
 * Header 组件 - 页面顶部导航栏
 *
 * 包含：
 * - 内容按钮组（控制台、测试环境、测试报告）
 * - 搜索框
 * - 主题切换、通知、个人信息
 */
export function Header({
  className,
  activeTab: controlledActiveTab,
  onTabChange,
  isDarkMode = false,
  onThemeToggle,
}: HeaderProps) {
  const [internalActiveTab, setInternalActiveTab] = useState("console");
  const [notificationCount] = useState(3); // 模拟通知数量

  const activeTab = controlledActiveTab ?? internalActiveTab;

  const handleTabClick = (id: string) => {
    setInternalActiveTab(id);
    onTabChange?.(id);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <header
        className={cn(
          "sticky top-0 z-40 shrink-0 flex items-center justify-between gap-4 px-6 py-4 bg-background/80 backdrop-blur-md",
          className,
        )}
      >
        {/* 左侧：内容按钮组 */}
        <div className="flex items-center gap-1 p-1.5 bg-sidebar rounded-full shadow-sm">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleTabClick(item.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium",
                      "transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
                    )}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* 右侧：功能按钮组 + 搜索框 */}
        <div className="flex items-center gap-3">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜索..."
              className="w-80 h-10 pl-9 pr-4 rounded-full bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary shadow-sm bg-sidebar"
            />
          </div>

          {/* 主题切换 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onThemeToggle}
                className="size-9 rounded-full bg-sidebar"
              >
                {isDarkMode ? (
                  <Sun className="size-5" />
                ) : (
                  <Moon className="size-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isDarkMode ? "切换亮色模式" : "切换深色模式"}
            </TooltipContent>
          </Tooltip>

          {/* 通知 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-full bg-sidebar relative"
              >
                <Bell className="size-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-coral text-[10px] font-medium text-white flex items-center justify-center">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">通知</TooltipContent>
          </Tooltip>

          {/* 个人信息 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 rounded-full pl-1 pr-4 py-1 cursor-pointer hover:bg-sidebar-accent transition-colors bg-sidebar shadow-sm">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                  alt="User"
                  className="w-7 h-7 rounded-full bg-primary/20"
                />
                <span className="text-sm font-medium text-foreground hidden sm:block">
                  测试工程师
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">个人信息</TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
}
