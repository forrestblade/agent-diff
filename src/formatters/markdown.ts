import { FileStatus, type SessionReport } from '../types.js'

const STATUS_LABELS: Record<string, string> = {
  [FileStatus.ADDED]: 'Added',
  [FileStatus.MODIFIED]: 'Modified',
  [FileStatus.DELETED]: 'Deleted',
  [FileStatus.RENAMED]: 'Renamed'
}

export function formatMarkdown (report: SessionReport): string {
  const lines: string[] = []
  const shortStart = report.startCommit.slice(0, 7)
  const shortEnd = report.endCommit.slice(0, 7)

  lines.push('# Session Report')
  lines.push('')
  lines.push(`**Range:** \`${shortStart}..${shortEnd}\` | **Commits:** ${String(report.commitCount)} | **Duration:** ${report.duration}`)
  lines.push('')

  // Files
  lines.push('## Files Changed')
  lines.push('')
  lines.push('| Status | File | Insertions | Deletions |')
  lines.push('|--------|------|------------|-----------|')
  for (const file of report.files) {
    const label = STATUS_LABELS[file.status] ?? 'Unknown'
    const path = file.status === FileStatus.RENAMED
      ? `${file.oldPath ?? ''} -> ${file.path}`
      : file.path
    lines.push(`| ${label} | \`${path}\` | +${String(file.insertions)} | -${String(file.deletions)} |`)
  }
  lines.push('')

  // Commits
  lines.push('## Commits')
  lines.push('')
  for (const commit of report.commits) {
    lines.push(`- \`${commit.hash.slice(0, 7)}\` ${commit.subject} (${commit.author})`)
  }
  lines.push('')

  // Dependencies
  if (report.dependencies.length > 0) {
    lines.push('## Dependencies')
    lines.push('')
    for (const dep of report.dependencies) {
      if (dep.action === 'added') {
        lines.push(`- **Added:** ${dep.name} ${dep.to ?? ''}`)
      } else if (dep.action === 'removed') {
        lines.push(`- **Removed:** ${dep.name} ${dep.from ?? ''}`)
      } else {
        lines.push(`- **Updated:** ${dep.name} ${dep.from ?? ''} -> ${dep.to ?? ''}`)
      }
    }
    lines.push('')
  }

  // Stats
  lines.push('## Stats')
  lines.push('')
  lines.push(`- **Files changed:** ${String(report.stats.filesChanged)}`)
  lines.push(`- **Insertions:** +${String(report.stats.insertions)}`)
  lines.push(`- **Deletions:** -${String(report.stats.deletions)}`)

  return lines.join('\n')
}
