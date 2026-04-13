import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Activity,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  Globe,
  Database,
  Smartphone,
  Play,
  Square,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
} from "lucide-react"
import { useState } from "react"

// ===================== 欢迎卡片 =====================
function HeroCard() {
  return (
    <Card className="relative overflow-hidden bg-sidebar border-white/5">
      {/* 背景光晕效果 */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      <CardContent className="p-6 relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1.5">
              <Globe className="w-4 h-4" />
              <span>北京, 中国</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold mb-1.5">你好，测试工程师</h1>
            <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
              测试环境运行平稳。所有节点均在线，资源使用率处于最佳状态，自动化测试任务正在按计划执行。
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground hidden sm:block">
            <p>11 Apr, 2026</p>
            <p>21:32 PM</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div className="bg-muted/50 rounded-2xl p-3 flex items-center gap-3 border border-white/5">
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CPU 使用率</p>
              <p className="text-lg font-medium">
                45% <span className="text-xs text-green-400 font-normal">正常</span>
              </p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-2xl p-3 flex items-center gap-3 border border-white/5">
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">内存占用</p>
              <p className="text-base font-medium">
                28GB <span className="text-xs text-yellow-400 font-normal">偏高</span>
              </p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-2xl p-3 flex items-center gap-3 border border-white/5">
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">网络延迟</p>
              <p className="text-base font-medium">
                12 ms <span className="text-xs text-green-400 font-normal">极佳</span>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ===================== 实时监控卡片 =====================
function LiveMonitorCard() {
  return (
    <Card className="bg-sidebar border-white/5">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-lg">实时执行监控</CardTitle>
          <p className="text-xs text-muted-foreground">自动化测试节点实时画面</p>
        </div>
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {/* 主视图 */}
          <div className="flex-1 relative rounded-2xl overflow-hidden bg-charcoal border border-white/5 group">
            <div className="absolute top-3 right-3 bg-red-500/20 text-red-500 text-xs px-2 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md z-10 border border-red-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Live
            </div>

            {/* 模拟终端输出 */}
            <div className="p-4 font-mono text-xs text-gray-400 h-40 flex flex-col justify-end">
              <p className="text-green-400">✓ [API] User Login - 120ms</p>
              <p className="text-green-400">✓ [API] Fetch Profile - 85ms</p>
              <p className="text-yellow-400">⚠ [UI] Render Dashboard - 1.2s (Slow)</p>
              <p className="text-green-400">✓ [UI] Click Settings - 45ms</p>
              <p className="text-pixel-blue animate-pulse">⟳ [E2E] Running Checkout Flow...</p>
            </div>

            <div className="absolute bottom-3 left-3 bg-white/10 backdrop-blur-md text-xs px-3 py-1.5 rounded-full border border-white/10">
              Node-01 (Web UI)
            </div>
          </div>

          {/* 次要视图 */}
          <div className="w-1/3 relative rounded-2xl overflow-hidden bg-charcoal border border-white/5 hidden sm:block">
            <div className="p-4 font-mono text-xs text-gray-500 h-40 flex flex-col justify-end opacity-50">
              <p>GET /api/v1/users 200</p>
              <p>POST /api/v1/auth 201</p>
              <p>GET /api/v1/items 200</p>
            </div>
            <div className="absolute bottom-3 left-3 bg-white/10 backdrop-blur-md text-xs px-3 py-1.5 rounded-full border border-white/10">
              Node-02 (API)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ===================== 运行中的任务卡片 =====================
function ActiveTasksCard() {
  const [tasks, setTasks] = useState([
    { id: 1, name: "核心接口回归", type: "API Tests", active: true, icon: Database, time: "12hr 32min" },
    { id: 2, name: "Web 端 UI 测试", type: "E2E Tests", active: true, icon: Globe, time: "5hr 12min" },
    { id: 3, name: "移动端兼容性", type: "App Tests", active: false, icon: Smartphone, time: "16hr 52min" },
    { id: 4, name: "高并发压测", type: "Load Tests", active: true, icon: Activity, time: "24hr" },
  ])

  const toggleTask = (id: number) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, active: !task.active } : task
    ))
  }

  return (
    <Card className="bg-sidebar border-white/5">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg">运行中的测试任务</CardTitle>
          <p className="text-xs text-muted-foreground">当前正在执行的自动化套件</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-coral animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {tasks.map((task) => {
            const Icon = task.icon
            return (
              <div
                key={task.id}
                className="bg-muted/50 rounded-2xl p-3.5 border border-white/5 hover:bg-muted transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-sidebar">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  {/* 开关 */}
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={cn(
                      "w-10 h-6 rounded-full p-1 cursor-pointer transition-colors",
                      task.active ? "bg-coral" : "bg-muted-foreground/30"
                    )}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full bg-white transition-transform",
                        task.active ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
                <div>
                  <h3 className="font-medium text-sm mb-1">{task.name}</h3>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{task.type}</span>
                    <span>{task.time}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ===================== 最近测试报告卡片 =====================
function RecentReportsCard() {
  const reports = [
    { id: 1, name: "支付链路回归", env: "Staging", status: "passed", time: "Active 4hr ago", icon: Database },
    { id: 2, name: "用户中心重构", env: "Dev", status: "failed", time: "Active 3hr ago", icon: Globe },
    { id: 3, name: "订单接口压测", env: "Perf", status: "passed", time: "Active 8hr ago", icon: Activity },
  ]

  return (
    <Card className="bg-sidebar border-white/5">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg">最近执行的测试计划</CardTitle>
          <p className="text-xs text-muted-foreground">上次运行的测试集状态</p>
        </div>
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {reports.map((report) => {
            const Icon = report.icon
            return (
              <div
                key={report.id}
                className="bg-muted/50 rounded-2xl p-3.5 border border-white/5 relative overflow-hidden group hover:bg-muted transition-colors"
              >
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <h3 className="font-medium text-sm mb-1">{report.name}</h3>
                    <p className="text-xs text-muted-foreground">{report.env} Environment</p>
                  </div>
                </div>

                <div className="flex justify-between items-end relative z-10">
                  <p className="text-xs text-muted-foreground/60">{report.time}</p>
                  {report.status === "passed" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>

                <Icon className="absolute -bottom-2 -right-2 w-16 h-16 text-white/[0.03] group-hover:text-white/[0.08] transition-colors" />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ===================== 测试执行耗时趋势卡片 =====================
function TestDurationTrendCard() {
  // 模拟趋势数据点
  const trendData = [
    { day: "周一", value: 245 },
    { day: "周二", value: 198 },
    { day: "周三", value: 312 },
    { day: "周四", value: 156 },
    { day: "周五", value: 189 },
    { day: "周六", value: 134 },
    { day: "周日", value: 98 },
  ]

  const maxValue = Math.max(...trendData.map(d => d.value))
  const minValue = Math.min(...trendData.map(d => d.value))
  const avgValue = Math.round(trendData.reduce((a, b) => a + b.value, 0) / trendData.length)

  // 路径点计算
  const width = 280
  const height = 80
  const padding = 4
  const points = trendData.map((d, i) => {
    const x = padding + (i * (width - padding * 2)) / (trendData.length - 1)
    const y = height - padding - ((d.value - minValue) / (maxValue - minValue)) * (height - padding * 2)
    return { x, y }
  })

  // 生成 SVG 路径
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`

  return (
    <Card className="bg-sidebar border-white/5">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg">测试执行耗时趋势</CardTitle>
          <p className="text-xs text-muted-foreground">近 7 天平均执行时长统计</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="rounded-full bg-muted/50 text-xs">
            周环比
            <TrendingDown className="w-3 h-3 ml-1 text-green-400" />
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* 统计概览 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-muted/50 rounded-2xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">平均耗时</span>
            </div>
            <p className="text-lg font-semibold">{avgValue}<span className="text-xs font-normal text-muted-foreground ml-1">s</span></p>
          </div>
          <div className="bg-muted/50 rounded-2xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-coral" />
              <span className="text-xs text-muted-foreground">最长耗时</span>
            </div>
            <p className="text-lg font-semibold">{maxValue}<span className="text-xs font-normal text-muted-foreground ml-1">s</span></p>
          </div>
          <div className="bg-muted/50 rounded-2xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs text-muted-foreground">最短耗时</span>
            </div>
            <p className="text-lg font-semibold">{minValue}<span className="text-xs font-normal text-muted-foreground ml-1">s</span></p>
          </div>
        </div>

        {/* 趋势图表 */}
        <div className="bg-muted/30 rounded-2xl p-4 border border-white/5">
          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            {/* 渐变填充 */}
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(251, 146, 60)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(251, 146, 60)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* 区域填充 */}
            <path d={areaPath} fill="url(#trendGradient)" />
            {/* 折线 */}
            <path d={linePath} fill="none" stroke="rgb(251, 146, 60)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* 数据点 */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="3"
                fill="rgb(251, 146, 60)"
                stroke="rgb(30, 30, 35)"
                strokeWidth="2"
              />
            ))}
          </svg>

          {/* X 轴标签 */}
          <div className="flex justify-between mt-2 px-1">
            {trendData.map((d, i) => (
              <span key={i} className="text-xs text-muted-foreground/60">{d.day}</span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ===================== AI 推广卡片 =====================
function AIPromoCard() {
  return (
    <Card className="bg-sidebar border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-yellow-500/10 rounded-full blur-[50px] pointer-events-none" />

      <CardContent className="p-6 relative z-10 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4 border border-white/10">
          <Sparkles className="w-6 h-6 text-yellow-400" />
        </div>

        <h2 className="text-xl font-semibold mb-2">AI 智能生成用例</h2>
        <p className="text-sm text-muted-foreground mb-5 max-w-[200px] leading-relaxed">
          接入大模型能力，自动分析需求文档，一键生成高覆盖率测试用例。
        </p>

        <button className="w-full py-3 rounded-full bg-gradient-to-r from-coral to-lavender text-white font-medium hover:opacity-90 transition-opacity shadow-lg">
          立即体验 (Beta)
        </button>
      </CardContent>
    </Card>
  )
}

// ===================== 主组件 =====================
/**
 * Console 组件 - 控制台页面
 */
export function Console() {
  return (
    <div className="grid grid-cols-12 gap-4 pt-14">
      {/* 顶部行 */}
      <div className="col-span-12 lg:col-span-7">
        <HeroCard />
      </div>
      <div className="col-span-12 lg:col-span-5">
        <LiveMonitorCard />
      </div>

      {/* 中间行 */}
      <div className="col-span-12 lg:col-span-5">
        <ActiveTasksCard />
      </div>
      <div className="col-span-12 lg:col-span-7">
        <RecentReportsCard />
      </div>

      {/* 底部行 */}
      <div className="col-span-12 lg:col-span-8">
        <TestDurationTrendCard />
      </div>
      <div className="col-span-12 lg:col-span-4">
        <AIPromoCard />
      </div>
    </div>
  )
}
