import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Home,
  Search,
  Bell,
  Settings,
  User,
  Heart,
  Bookmark,
  Mail,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

/**
 * Logo 组件 - 品牌标识 (SVG 图标)
 */

export function Logo() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* 背景圆角矩形 */}
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="8"
        fill="currentColor"
        className="text-primary"
      />
      {/* 内部方框 - 表示测试/容器 */}
      <rect
        x="7"
        y="7"
        width="18"
        height="18"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-coral"
      />
      {/* 打开的箭头/标签 - 表示 Open */}
      <path
        d="M11 12L14 15L17 12"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 12L20 15L23 12"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 底部横线 */}
      <path
        d="M10 21H22"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface MenuItem {
  /** 菜单项唯一标识 */
  id: string;
  /** 显示的图标 */
  icon: LucideIcon;
  /** 悬浮提示文本 */
  label: string;
  /** 是否禁用 */
  disabled?: boolean;
}

interface CapsuleSidebarProps {
  /** 自定义类名 */
  className?: string;
  /** 菜单数据 */
  items?: MenuItem[];
  /** 当前选中项 */
  activeId?: string;
  /** 选中项变化回调 */
  onSelect?: (id: string) => void;
}

/**
 * 默认菜单配置
 */
const defaultMenuItems: MenuItem[] = [
  { id: "home", icon: Home, label: "首页" },
  { id: "search", icon: Search, label: "搜索" },
  { id: "notifications", icon: Bell, label: "通知" },
  { id: "messages", icon: Mail, label: "消息" },
  { id: "favorites", icon: Heart, label: "收藏" },
  { id: "bookmarks", icon: Bookmark, label: "书签" },
  { id: "profile", icon: User, label: "个人中心" },
  { id: "settings", icon: Settings, label: "设置" },
  { id: "help", icon: HelpCircle, label: "帮助中心", disabled: true },
];

/**
 * 胶囊样式侧边菜单栏组件
 *
 * 特点：
 * - 垂直排列的胶囊形按钮
 * - 悬浮显示完整文字提示
 * - 支持当前项高亮
 * - 平滑过渡动画
 */
export function CapsuleSidebar({
  className,
  items = defaultMenuItems,
  activeId: controlledActiveId,
  onSelect,
}: CapsuleSidebarProps) {
  const [internalActiveId, setInternalActiveId] = useState<string>("home");

  const activeId = controlledActiveId ?? internalActiveId;

  const handleSelect = (item: MenuItem) => {
    if (item.disabled) return;

    setInternalActiveId(item.id);
    onSelect?.(item.id);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <nav
        className={cn(
          "flex flex-col items-center gap-2 p-2 bg-sidebar rounded-2xl shadow-lg",
          className,
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSelect(item)}
                  disabled={item.disabled}
                  className={cn(
                    "group relative w-11 h-11 rounded-2xl",
                    "hover:bg-sidebar-accent",
                    isActive &&
                      "bg-primary text-primary-foreground shadow-md hover:bg-primary/90",
                  )}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  {/* 图标 */}
                  <Icon
                    className={cn(
                      "size-5 transition-transform duration-300",
                      "group-hover:scale-110",
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </Button>
              </TooltipTrigger>

              <TooltipContent side="right" sideOffset={12}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}

export { type MenuItem };
