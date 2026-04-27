import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Sun,
  Moon,
  Bell,
  Home,
  Code2,
  FlaskConical,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

/** 顶部菜单项配置 */
interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const menuItems: MenuItem[] = [
  { id: "home", label: "首页", icon: Home },
  { id: "script-market", label: "脚本市场", icon: Code2 },
  { id: "test-cases", label: "测试用例", icon: FlaskConical },
  { id: "automation", label: "自动化", icon: Workflow },
];

interface HeaderProps {
  /** 自定义类名 */
  className?: string;
  /** 当前选中的菜单项 */
  activeMenuId?: string;
  /** 菜单变化回调 */
  onMenuSelect?: (id: string) => void;
  /** 是否为深色模式 */
  isDarkMode?: boolean;
  /** 主题切换回调 */
  onThemeToggle?: () => void;
}

/**
 * Header 组件 - 页面顶部导航栏
 *
 * 包含：
 * - 左侧：Logo + OpenTest
 * - 中间：顶部菜单栏（首页、脚本市场、测试用例、自动化）
 * - 右侧：主题切换、通知、个人信息
 */
export function Header({
  className,
  activeMenuId: controlledActiveMenuId,
  onMenuSelect,
  isDarkMode = false,
  onThemeToggle,
}: HeaderProps) {
  const [internalActiveMenuId, setInternalActiveMenuId] = useState("home");
  const [notificationCount] = useState(3); // 模拟通知数量

  const activeMenuId = controlledActiveMenuId ?? internalActiveMenuId;

  const handleMenuClick = (id: string) => {
    setInternalActiveMenuId(id);
    onMenuSelect?.(id);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <header
        className={cn(
          "sticky top-0 z-40 shrink-0 flex items-center justify-between gap-6 px-6 py-3 bg-background/80 backdrop-blur-md border-b border-border/40",
          className,
        )}
      >
        {/* 左侧：Logo + OpenTest */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-coral to-orange-500 flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-sm">O</span>
          </div>
          <span className="text-lg font-semibold text-foreground">OpenTest</span>
        </div>

        {/* 中间：顶部菜单栏 */}
        <div className="flex items-center gap-1 p-1 bg-sidebar rounded-full shadow-sm">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenuId === item.id;

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleMenuClick(item.id)}
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

        {/* 右侧：功能按钮组 */}
        <div className="flex items-center gap-2 shrink-0">
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
              <div className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 cursor-pointer hover:bg-sidebar-accent transition-colors bg-sidebar shadow-sm">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                  alt="User"
                  className="w-7 h-7 rounded-full bg-primary/20"
                />
                <span className="text-sm font-medium text-foreground">
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
