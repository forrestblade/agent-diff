import { FileStatus, type SessionReport } from '../types.js'

const BOLD = '\x1b[1m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'
const RESET = '\x1b[0m'

const STATUS_DISPLAY: Record<string, { readonly prefix: string; readonly color: string; readonly label: string }> = {
  [FileStatus.ADDED]: { prefix: '+', color: GREEN, label: 'new' },
  [FileStatus.MODIFIED]: { prefix: '~', color: YELLOW, label: 'modified' },
  [FileStatus.DELETED]: { prefix: '-', color: RED, label: 'deleted' },
  [FileStatus.RENAMED]: { prefix: '>', color: CYAN, label: 'renamed' }
}

function formatFileEntry (file: { readonly status: string; readonly path: string; readonly insertions: number; readonly deletions: number; readonly oldPath?: string }): string {
  const display = STATUS_DISPLAY[file.status] ?? { prefix: '?', color: RESET, label: 'unknown' }

  if (file.status === FileStatus.ADDED) {
    const total = file.insertions
    return `  ${display.color}${display.prefix} ${file.path}${RESET} (${display.label}, ${String(total)} lines)`
  }

  if (file.status === FileStatus.DELETED) {
    return `  ${display.color}${display.prefix} ${file.path}${RESET} (${display.label})`
  }

  if (file.status === FileStatus.RENAMED) {
    return `  ${display.color}${display.prefix} ${file.oldPath ?? ''} -> ${file.path}${RESET} (+${String(file.insertions)}, -${String(file.deletions)})`
  }

  return `  ${display.color}${display.prefix} ${file.path}${RESET} (+${String(file.insertions)}, -${String(file.deletions)})`
}

export function formatCli (report: SessionReport): string {
  const lines: string[] = []
  const shortStart = report.startCommit.slice(0, 7)
  const shortEnd = report.endCommit.slice(0, 7)

  lines.push(`${BOLD}Session: ${shortStart}..${shortEnd} (${String(report.commitCount)} commits, ${report.duration})${RESET}`)
  lines.push('')

  // Files section
  lines.push(`${BOLD}Files (${String(report.stats.filesChanged)} changed):${RESET}`)
  for (const file of report.files) {
    lines.push(formatFileEntry(file))
  }
  lines.push('')

  // Dependencies section
  if (report.dependencies.length > 0) {
    lines.push(`${BOLD}Dependencies:${RESET}`)
    for (const dep of report.dependencies) {
      if (dep.action === 'added') {
        lines.push(`  ${GREEN}+ ${dep.name} ${dep.to ?? ''}${RESET}`)
      } else if (dep.action === 'removed') {
        lines.push(`  ${RED}- ${dep.name} ${dep.from ?? ''}${RESET}`)
      } else {
        lines.push(`  ${YELLOW}~ ${dep.name} ${dep.from ?? ''} -> ${dep.to ?? ''}${RESET}`)
      }
    }
    lines.push('')
  }

  // Stats line
  lines.push(`${BOLD}Stats:${RESET} +${String(report.stats.insertions)} -${String(report.stats.deletions)} across ${String(report.stats.filesChanged)} files in ${String(report.commitCount)} commits`)

  return lines.join('\n')
}
