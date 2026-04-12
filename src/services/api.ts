/**
 * API 服务
 */
const API_BASE = "http://localhost:8000";

// ===================== 类型定义 =====================
export interface Script {
  id: number
  name: string
  description: string
  code: string
  category: string
  author: string
  tags: string[]
  rating: number
  downloads: number
  views: number
  featured: boolean
  created_at: string
  updated_at: string
}

export interface ScriptFormData {
  name: string
  description: string
  code: string
  category: string
  author: string
  tags: string[]
  featured?: boolean
}

export interface TestExecution {
  id: number
  timestamp: string
  duration: number
  total_cases: number
  passed_cases: number
  failed_cases: number
  environment: string
}

export interface TestDurationTrend {
  date: string
  avg_duration: number
  min_duration: number
  max_duration: number
  total_executions: number
}

export interface ConsoleStats {
  total_tests: number
  total_cases: number
  passed_cases: number
  failed_cases: number
  avg_duration: number
  trend: TestDurationTrend[]
}

// ===================== API 函数 =====================

// 脚本 API
export async function fetchScripts(params?: {
  skip?: number
  limit?: number
  category?: string
  search?: string
}): Promise<Script[]> {
  const searchParams = new URLSearchParams()
  if (params?.skip) searchParams.set("skip", String(params.skip))
  if (params?.limit) searchParams.set("limit", String(params.limit))
  if (params?.category) searchParams.set("category", params.category)
  if (params?.search) searchParams.set("search", params.search)

  const res = await fetch(`${API_BASE}/scripts?${searchParams}`)
  if (!res.ok) throw new Error("获取脚本列表失败")
  return res.json()
}

export async function fetchFeaturedScripts(limit = 4): Promise<Script[]> {
  const res = await fetch(`${API_BASE}/scripts/featured?limit=${limit}`)
  if (!res.ok) throw new Error("获取精选脚本失败")
  return res.json()
}

export async function fetchScript(id: number): Promise<Script> {
  const res = await fetch(`${API_BASE}/scripts/${id}`)
  if (!res.ok) throw new Error("获取脚本详情失败")
  return res.json()
}

export async function createScript(data: ScriptFormData): Promise<Script> {
  const res = await fetch(`${API_BASE}/scripts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("创建脚本失败")
  return res.json()
}

export async function updateScript(
  id: number,
  data: Partial<ScriptFormData>
): Promise<Script> {
  const res = await fetch(`${API_BASE}/scripts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("更新脚本失败")
  return res.json()
}

export async function deleteScript(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/scripts/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error("删除脚本失败")
}

export async function incrementViews(id: number): Promise<Script> {
  const res = await fetch(`${API_BASE}/scripts/${id}/views`, {
    method: "POST",
  })
  if (!res.ok) throw new Error("增加浏览量失败")
  return res.json()
}

export async function incrementDownloads(id: number): Promise<Script> {
  const res = await fetch(`${API_BASE}/scripts/${id}/downloads`, {
    method: "POST",
  })
  if (!res.ok) throw new Error("增加下载量失败")
  return res.json()
}

// 控制台 API
export async function fetchConsoleStats(days = 7): Promise<ConsoleStats> {
  const res = await fetch(`${API_BASE}/console/stats?days=${days}`)
  if (!res.ok) throw new Error("获取控制台统计失败")
  return res.json()
}

export async function fetchTestExecutions(params?: {
  skip?: number
  limit?: number
}): Promise<TestExecution[]> {
  const searchParams = new URLSearchParams()
  if (params?.skip) searchParams.set("skip", String(params.skip))
  if (params?.limit) searchParams.set("limit", String(params.limit))

  const res = await fetch(`${API_BASE}/console/executions?${searchParams}`)
  if (!res.ok) throw new Error("获取测试执行记录失败")
  return res.json()
}
