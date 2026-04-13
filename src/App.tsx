import { useState } from "react";
import {
  CapsuleSidebar,
  Logo,
  type MenuItem,
} from "@/components/CapsuleSidebar";
import { Header } from "@/components/Header";
import { Console } from "@/components/Console";
import { ScriptMarket } from "@/components/ScriptMarket";
import { TestCaseMarket } from "@/components/TestCaseMarket";

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
  Code2,
  FlaskConical,
} from "lucide-react";

function App() {
  const [activeMenuId, setActiveMenuId] = useState("home");
  const [activeTab, setActiveTab] = useState("console");
  const [isDarkMode, setIsDarkMode] = useState(false);

  const menuItems: MenuItem[] = [
    { id: "home", icon: Home, label: "首页" },
    { id: "script-market", icon: Code2, label: "脚本市场" },
    { id: "test-cases", icon: FlaskConical, label: "测试用例" },
    { id: "favorites", icon: Heart, label: "收藏" },
    { id: "bookmarks", icon: Bookmark, label: "书签" },
    { id: "profile", icon: User, label: "个人中心" },
    { id: "settings", icon: Settings, label: "设置" },
    { id: "help", icon: HelpCircle, label: "帮助中心", disabled: true },
  ];

  const handleMenuSelect = (id: string) => {
    setActiveMenuId(id);
    console.log("选中了菜单项:", id);
  };

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="flex min-h-screen">
      {/* 右上角 Logo */}
      <div className="fixed top-4 left-6 z-50">
        <Logo />
      </div>

      {/* 胶囊侧边菜单栏 */}
      <aside className="fixed left-5 top-1/2 -translate-y-1/2 z-50">
        <CapsuleSidebar
          items={menuItems}
          activeId={activeMenuId}
          onSelect={handleMenuSelect}
        />
      </aside>

      {/* 顶部导航栏 - 固定 */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDarkMode={isDarkMode}
        onThemeToggle={handleThemeToggle}
      />

      {/* 主内容区域 */}
      <main className="flex-1 ml-19">
        <div className="p-8">
          {/* 脚本市场页面 */}
          {activeMenuId === "script-market" && <ScriptMarket />}

          {/* 测试用例页面 */}
          {activeMenuId === "test-cases" && <TestCaseMarket />}

          {/* 控制台页面 */}
          {activeTab === "console" && activeMenuId === "home" && <Console />}


          {/* 测试环境页面 */}
          {activeTab === "env" && (
            <div className="text-center py-20">
              <p className="text-muted-foreground">测试环境页面开发中...</p>
            </div>
          )}

          {/* 测试报告页面 */}
          {activeTab === "report" && (
            <div className="text-center py-20">
              <p className="text-muted-foreground">测试报告页面开发中...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
