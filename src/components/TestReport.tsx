/** 测试报告页面组件 */
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Download,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  RefreshCw,
  FileText,
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import {
  type TestExecution,
  fetchTestExecutions,
  fetchConsoleStats,
  type ConsoleStats,
} from "@/services/api"

// ===================== 统计卡片 =====================

function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  color: string
}) {
  return (
    <Card className="bg-sidebar border-white/5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-semibold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div className={cn(
                "flex items-center gap-1 mt-2 text-xs",
                trend === "up" && "text-green-400",
                trend === "down" && "text-red-400",
                trend === "neutral" && "text-muted-foreground"
              )}>
                {trend === "up" && <TrendingUp className="w-3 h-3" />}
                {trend === "down" && <TrendingDown className="w-3 h-3" />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            color
          )}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ===================== 通过率进度条 =====================

function PassRateBar({ rate }: { rate: number }) {
  const getColor = (r: number) => {
    if (r >= 90) return "bg-green-500"
    if (r >= 70) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">通过率</span>
        <span className={cn(
          "font-medium",
          rate >= 90 && "text-green-400",
          rate >= 70 && rate < 90 && "text-yellow-400",
          rate < 70 && "text-red-400"
        )}>
          {rate.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getColor(rate))}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
    </div>
  )
}

// ===================== 执行历史列表项 =====================

function ExecutionRow({
  execution,
}: {
  execution: TestExecution
}) {
  const passRate = execution.total_cases > 0
    ? (execution.passed_cases / execution.total_cases * 100)
    : 0

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-sidebar border border-white/5 hover:bg-muted/30 transition-colors">
      {/* 状态图标 */}
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        execution.failed_cases > 0
          ? "bg-red-500/10 text-red-400"
          : "bg-green-500/10 text-green-400"
      )}>
        {execution.failed_cases > 0 ? (
          <XCircle className="w-5 h-5" />
        ) : (
          <CheckCircle2 className="w-5 h-5" />
        )}
      </div>

      {/* 执行信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium truncate">
            测试执行 #{execution.id}
          </span>
          <Badge variant="secondary" className="text-xs">
            {execution.environment}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(execution.timestamp)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {execution.duration.toFixed(2)}s
          </span>
        </div>
      </div>

      {/* 统计数据 */}
      <div className="flex items-center gap-6 shrink-0">
        <div className="text-right">
          <p className="text-sm font-medium">{execution.total_cases}</p>
          <p className="text-xs text-muted-foreground">总计</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-green-400">{execution.passed_cases}</p>
          <p className="text-xs text-muted-foreground">通过</p>
        </div>
        <div className="text-right">
          <p className={cn(
            "text-sm font-medium",
            execution.failed_cases > 0 ? "text-red-400" : "text-muted-foreground"
          )}>
            {execution.failed_cases}
          </p>
          <p className="text-xs text-muted-foreground">失败</p>
        </div>
        <div className="w-20">
          <PassRateBar rate={passRate} />
        </div>
      </div>

      {/* 操作 */}
      <Button variant="ghost" size="icon" className="shrink-0">
        <FileText className="w-4 h-4" />
      </Button>
    </div>
  )
}

// ===================== 主组件 =====================

export function TestReport() {
  const [executions, setExecutions] = useState<TestExecution[]>([])
  const [stats, setStats] = useState<ConsoleStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [envFilter, setEnvFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [execData, statsData] = await Promise.all([
          fetchTestExecutions({ limit: 50 }),
          fetchConsoleStats(),
        ])
        setExecutions(execData)
        setStats(statsData)
      } catch (error) {
        console.error("加载测试报告数据失败:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // 计算统计数据
  const computedStats = useMemo(() => {
    if (executions.length === 0) {
      return {
        totalRuns: 0,
        totalPassed: 0,
        totalFailed: 0,
        avgDuration: 0,
        overallPassRate: 0,
      }
    }

    const totalRuns = executions.reduce((sum, e) => sum + e.total_cases, 0)
    const totalPassed = executions.reduce((sum, e) => sum + e.passed_cases, 0)
    const totalFailed = executions.reduce((sum, e) => sum + e.failed_cases, 0)
    const avgDuration = executions.reduce((sum, e) => sum + e.duration, 0) / executions.length
    const overallPassRate = totalRuns > 0 ? (totalPassed / totalRuns * 100) : 0

    return { totalRuns, totalPassed, totalFailed, avgDuration, overallPassRate }
  }, [executions])

  // 获取环境列表
  const environments = useMemo(() => {
    const envs = new Set(executions.map((e) => e.environment))
    return Array.from(envs)
  }, [executions])

  // 筛选执行记录
  const filteredExecutions = useMemo(() => {
    return executions.filter((e) => {
      // 环境筛选
      if (envFilter !== "all" && e.environment !== envFilter) {
        return false
      }
      // 状态筛选
      if (statusFilter === "passed" && e.failed_cases > 0) {
        return false
      }
      if (statusFilter === "failed" && e.failed_cases === 0) {
        return false
      }
      return true
    })
  }, [executions, envFilter, statusFilter])

  // 刷新数据
  const handleRefresh = async () => {
    setLoading(true)
    try {
      const [execData, statsData] = await Promise.all([
        fetchTestExecutions({ limit: 50 }),
        fetchConsoleStats(),
      ])
      setExecutions(execData)
      setStats(statsData)
    } catch (error) {
      console.error("刷新数据失败:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">测试报告</h1>
          <p className="text-sm text-muted-foreground mt-1">
            查看测试执行历史和分析报告
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            刷新
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            导出报告
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="总执行次数"
          value={executions.length}
          subtitle={`来自 ${environments.length} 个环境`}
          icon={Activity}
          trend="up"
          trendValue="+12%"
          color="bg-blue-500/10 text-blue-400"
        />
        <StatsCard
          title="总用例数"
          value={computedStats.totalRuns}
          subtitle={`平均 ${computedStats.avgDuration.toFixed(1)}s/次`}
          icon={BarChart3}
          trend="neutral"
          color="bg-purple-500/10 text-purple-400"
        />
        <StatsCard
          title="总通过数"
          value={computedStats.totalPassed}
          subtitle={`失败 ${computedStats.totalFailed} 个`}
          icon={CheckCircle2}
          trend={computedStats.totalFailed === 0 ? "up" : "down"}
          trendValue={computedStats.totalFailed === 0 ? "全部通过" : "有问题"}
          color="bg-green-500/10 text-green-400"
        />
        <StatsCard
          title="整体通过率"
          value={`${computedStats.overallPassRate.toFixed(1)}%`}
          subtitle={stats ? `用例总数: ${stats.total_cases}` : ""}
          icon={TrendingUp}
          trend={computedStats.overallPassRate >= 90 ? "up" : computedStats.overallPassRate >= 70 ? "neutral" : "down"}
          trendValue={computedStats.overallPassRate >= 90 ? "优秀" : computedStats.overallPassRate >= 70 ? "良好" : "需改进"}
          color={
            computedStats.overallPassRate >= 90
              ? "bg-green-500/10 text-green-400"
              : computedStats.overallPassRate >= 70
              ? "bg-yellow-500/10 text-yellow-400"
              : "bg-red-500/10 text-red-400"
          }
        />
      </div>

      {/* 筛选栏 */}
      <Card className="bg-sidebar border-white/5">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* 搜索框 */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索执行记录..."
                className="pl-9 h-9 rounded-xl bg-muted/30 border-white/5"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* 环境筛选 */}
            <Select value={envFilter} onValueChange={setEnvFilter}>
              <SelectTrigger className="w-36 h-9 rounded-xl bg-muted/30 border-white/5 text-sm">
                <SelectValue placeholder="选择环境" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部环境</SelectItem>
                {environments.map((env) => (
                  <SelectItem key={env} value={env}>
                    {env}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 状态筛选 */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28 h-9 rounded-xl bg-muted/30 border-white/5 text-sm">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="passed">已通过</SelectItem>
                <SelectItem value="failed">有失败</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 执行历史列表 */}
      <Card className="bg-sidebar border-white/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">执行历史</CardTitle>
            <p className="text-xs text-muted-foreground">
              共 {filteredExecutions.length} 条记录
            </p>
          </div>
          <Button variant="ghost" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            更多筛选
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : filteredExecutions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Activity className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">暂无测试执行记录</p>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {filteredExecutions.map((execution) => (
                <ExecutionRow key={execution.id} execution={execution} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
