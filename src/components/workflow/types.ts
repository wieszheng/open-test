/** 执行日志条目 */
export interface LogEntry {
  nodeId: string
  label: string
  status: "running" | "success" | "error"
  duration?: number
  message?: string
  timestamp: string
}

/** 执行结果摘要 */
export interface RunResult {
  total: number
  passed: number
  failed: number
}
