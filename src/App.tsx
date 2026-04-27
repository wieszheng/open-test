import { useState } from "react";
import { Header } from "@/components/Header";
import { Console } from "@/components/Console";
import { ScriptMarket } from "@/components/ScriptMarket";
import { TestCaseMarket } from "@/components/TestCaseMarket";
import { WorkflowEditor } from "@/components/WorkflowEditor";

function App() {
  const [activeMenuId, setActiveMenuId] = useState("home");
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleMenuSelect = (id: string) => {
    setActiveMenuId(id);
    console.log("选中了菜单项:", id);
  };

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="flex flex-col h-screen">
      {/* 顶部导航栏 */}
      <Header
        activeMenuId={activeMenuId}
        onMenuSelect={handleMenuSelect}
        isDarkMode={isDarkMode}
        onThemeToggle={handleThemeToggle}
      />

      {/* 主内容区域 */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto p-6">
          {activeMenuId === "home" && <Console />}
          {activeMenuId === "script-market" && <ScriptMarket />}
          {activeMenuId === "test-cases" && <TestCaseMarket />}
          {activeMenuId === "automation" && <WorkflowEditor />}
        </div>
      </main>
    </div>
  );
}

export default App;
