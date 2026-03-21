import type { SessionReport } from '../types.js'

export function formatJson (report: SessionReport): string {
  return JSON.stringify(report, null, 2)
}
