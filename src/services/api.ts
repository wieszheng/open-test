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
  language?: string
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
  language?: string
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

// ===================== 测试用例 API =====================

export interface TestCase {
  id: number
  name: string
  description: string
  case_type: "api" | "ui" | "e2e" | "unit" | "perf"
  priority: "P0" | "P1" | "P2" | "P3"
  status: "active" | "deprecated" | "draft"
  module: string
  directory_id?: number
  preconditions: string
  test_steps: string
  expected_results: string
  author: string
  tags: string[]
  script_id?: number
  is_automated: boolean
  is_parallel: boolean
  total_runs: number
  passed_runs: number
  failed_runs: number
  pass_rate: number
  avg_duration: number
  last_run_time?: string
  flaky: boolean
  created_at: string
  updated_at: string
}

export interface TestCaseFormData {
  name: string
  description?: string
  case_type?: string
  priority?: string
  status?: string
  module?: string
  directory_id?: number
  preconditions?: string
  test_steps?: string
  expected_results?: string
  author?: string
  tags?: string[]
  script_id?: number
  is_automated?: boolean
  is_parallel?: boolean
}

// ===================== 目录 API =====================

export interface Directory {
  id: number
  name: string
  description: string
  icon: string
  color: string
  sort_order: number
  parent_id?: number
  case_count: number
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface DirectoryFormData {
  name: string
  description?: string
  icon?: string
  color?: string
  sort_order?: number
  parent_id?: number
}

export async function fetchDirectories(): Promise<Directory[]> {
  const res = await fetch(`${API_BASE}/directories`)
  if (!res.ok) throw new Error("获取目录列表失败")
  return res.json()
}

export async function createDirectory(data: DirectoryFormData): Promise<Directory> {
  const res = await fetch(`${API_BASE}/directories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("创建目录失败")
  return res.json()
}

export async function updateDirectory(
  id: number,
  data: Partial<DirectoryFormData>
): Promise<Directory> {
  const res = await fetch(`${API_BASE}/directories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("更新目录失败")
  return res.json()
}

export async function deleteDirectory(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/directories/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error("删除目录失败")
}

export interface TestCaseStats {
  total: number
  automated: number
  manual: number
  flaky: number
  pass_rate: number
  by_type: Record<string, number>
  by_priority: Record<string, number>
  by_status: Record<string, number>
  by_module: Record<string, number>
}

export async function fetchTestCases(params?: {
  skip?: number
  limit?: number
  case_type?: string
  priority?: string
  status?: string
  module?: string
  search?: string
}): Promise<TestCase[]> {
  const searchParams = new URLSearchParams()
  if (params?.skip) searchParams.set("skip", String(params.skip))
  if (params?.limit) searchParams.set("limit", String(params.limit))
  if (params?.case_type) searchParams.set("case_type", params.case_type)
  if (params?.priority) searchParams.set("priority", params.priority)
  if (params?.status) searchParams.set("status", params.status)
  if (params?.module) searchParams.set("module", params.module)
  if (params?.search) searchParams.set("search", params.search)

  const res = await fetch(`${API_BASE}/test-cases?${searchParams}`)
  if (!res.ok) throw new Error("获取测试用例列表失败")
  return res.json()
}

export async function fetchTestCaseStats(): Promise<TestCaseStats> {
  const res = await fetch(`${API_BASE}/test-cases/stats`)
  if (!res.ok) throw new Error("获取测试用例统计失败")
  return res.json()
}

export async function fetchTestCase(id: number): Promise<TestCase> {
  const res = await fetch(`${API_BASE}/test-cases/${id}`)
  if (!res.ok) throw new Error("获取测试用例详情失败")
  return res.json()
}

export async function createTestCase(data: TestCaseFormData): Promise<TestCase> {
  const res = await fetch(`${API_BASE}/test-cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("创建测试用例失败")
  return res.json()
}

export async function updateTestCase(
  id: number,
  data: Partial<TestCaseFormData>
): Promise<TestCase> {
  const res = await fetch(`${API_BASE}/test-cases/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("更新测试用例失败")
  return res.json()
}

export async function deleteTestCase(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/test-cases/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error("删除测试用例失败")
}

// ===================== 工作流 API =====================

export interface Workflow {
  id: number
  test_case_id: number
  name: string
  description: string
  nodes: unknown[]
  edges: unknown[]
  is_enabled: boolean
  total_runs: number
  last_run_status: string
  created_at: string
  updated_at: string
}

export interface WorkflowFormData {
  name: string
  description?: string
  nodes: unknown[]
  edges: unknown[]
}

export async function fetchWorkflow(testCaseId: number): Promise<Workflow | null> {
  const res = await fetch(`${API_BASE}/workflows/${testCaseId}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error("获取工作流失败")
  return res.json()
}

export async function saveWorkflow(
  testCaseId: number,
  data: WorkflowFormData
): Promise<Workflow> {
  const res = await fetch(`${API_BASE}/workflows/${testCaseId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("保存工作流失败")
  return res.json()
}

export async function deleteWorkflow(workflowId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/workflows/${workflowId}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error("删除工作流失败")
}
