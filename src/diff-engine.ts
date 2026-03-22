import { execFileSync } from 'node:child_process'
import { fromThrowable, ok, err, type Result } from '@valencets/resultkit'
import { DiffErrorCode, FileStatus, type CommitInfo, type DiffError, type FileChange, type SessionReport } from './types.js'
import { parseDependencyChanges } from './dep-parser.js'

const GIT_REF_PATTERN = /^[a-zA-Z0-9._/^~{}-]+$/

function validateRef (ref: string): Result<string, DiffError> {
  if (!GIT_REF_PATTERN.test(ref)) {
    return err({ code: DiffErrorCode.GIT_FAILED, message: `Invalid git ref: ${ref}` })
  }
  return ok(ref)
}

const safeGit = fromThrowable(
  (args: readonly string[], dir: string) => execFileSync('git', args, { cwd: dir, encoding: 'utf-8' }).trim(),
  (e): DiffError => ({
    code: DiffErrorCode.GIT_FAILED,
    message: e instanceof Error ? e.message : String(e)
  })
)

const STATUS_MAP: Record<string, FileChange['status']> = {
  A: FileStatus.ADDED,
  M: FileStatus.MODIFIED,
  D: FileStatus.DELETED
}

function parseFileChanges (nameStatusOutput: string, numstatOutput: string): readonly FileChange[] {
  if (!nameStatusOutput) return []

  const statsByPath = new Map<string, { readonly insertions: number; readonly deletions: number }>()

  if (numstatOutput) {
    for (const line of numstatOutput.split('\n')) {
      if (!line.trim()) continue
      const parts = line.split('\t')
      const ins = parts[0]
      const del = parts[1]
      const path = parts[2]
      if (ins === undefined || del === undefined || path === undefined) continue
      statsByPath.set(path, {
        insertions: ins === '-' ? 0 : Number(ins),
        deletions: del === '-' ? 0 : Number(del)
      })
    }
  }

  const files: FileChange[] = []

  for (const line of nameStatusOutput.split('\n')) {
    if (!line.trim()) continue
    const parts = line.split('\t')
    const rawStatus = parts[0]
    if (rawStatus === undefined) continue

    // Handle renames: R100\told-path\tnew-path
    if (rawStatus.startsWith('R')) {
      const oldPath = parts[1]
      const newPath = parts[2]
      if (oldPath === undefined || newPath === undefined) continue
      const stats = statsByPath.get(newPath) ?? { insertions: 0, deletions: 0 }
      files.push({
        status: FileStatus.RENAMED,
        path: newPath,
        oldPath,
        insertions: stats.insertions,
        deletions: stats.deletions
      })
      continue
    }

    const status = STATUS_MAP[rawStatus]
    const path = parts[1]
    if (status === undefined || path === undefined) continue
    const stats = statsByPath.get(path) ?? { insertions: 0, deletions: 0 }
    files.push({
      status,
      path,
      insertions: stats.insertions,
      deletions: stats.deletions
    })
  }

  return files
}

function parseCommits (logOutput: string): readonly CommitInfo[] {
  if (!logOutput) return []

  const lines = logOutput.split('\n')
  const commits: CommitInfo[] = []

  for (let i = 0; i + 3 < lines.length; i += 4) {
    const hash = lines[i]
    const subject = lines[i + 1]
    const author = lines[i + 2]
    const date = lines[i + 3]
    if (hash === undefined || subject === undefined || author === undefined || date === undefined) continue
    commits.push({ hash, subject, author, date })
  }

  return commits
}

function parseTotalStats (shortstatOutput: string): { readonly insertions: number; readonly deletions: number; readonly filesChanged: number } {
  if (!shortstatOutput) return { insertions: 0, deletions: 0, filesChanged: 0 }

  const filesMatch = /(\d+) files? changed/.exec(shortstatOutput)
  const insMatch = /(\d+) insertions?\(\+\)/.exec(shortstatOutput)
  const delMatch = /(\d+) deletions?\(-\)/.exec(shortstatOutput)

  return {
    filesChanged: filesMatch?.[1] !== undefined ? Number(filesMatch[1]) : 0,
    insertions: insMatch?.[1] !== undefined ? Number(insMatch[1]) : 0,
    deletions: delMatch?.[1] !== undefined ? Number(delMatch[1]) : 0
  }
}

function computeDuration (commits: readonly CommitInfo[]): string {
  if (commits.length < 2) return '0h 0m'

  const first = commits[0]
  const last = commits[commits.length - 1]
  if (first === undefined || last === undefined) return '0h 0m'

  const startMs = new Date(first.date).getTime()
  const endMs = new Date(last.date).getTime()
  const diffMs = Math.abs(endMs - startMs)
  const totalMinutes = Math.round(diffMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${String(hours)}h ${String(minutes)}m`
}

export function generateReport (fromCommit: string, toCommit: string, dir: string): Result<SessionReport, DiffError> {
  const fromRef = validateRef(fromCommit)
  if (fromRef.isErr()) return err(fromRef.error)
  const toRef = validateRef(toCommit)
  if (toRef.isErr()) return err(toRef.error)

  const range = `${fromRef.value}..${toRef.value}`

  const nameStatusResult = safeGit(['diff', range, '--name-status'], dir)
  if (nameStatusResult.isErr()) return err(nameStatusResult.error)

  const numstatResult = safeGit(['diff', range, '--numstat'], dir)
  if (numstatResult.isErr()) return err(numstatResult.error)

  const logResult = safeGit(['log', range, '--format=%H%n%s%n%an%n%aI', '--reverse'], dir)
  if (logResult.isErr()) return err(logResult.error)

  const shortstatResult = safeGit(['diff', range, '--shortstat'], dir)
  if (shortstatResult.isErr()) return err(shortstatResult.error)

  const depDiffResult = safeGit(['diff', range, '--', 'package.json'], dir)
  const depDiffOutput = depDiffResult.isOk() ? depDiffResult.value : ''

  const files = parseFileChanges(nameStatusResult.value, numstatResult.value)
  const commits = parseCommits(logResult.value)
  const stats = parseTotalStats(shortstatResult.value)
  const dependencies = parseDependencyChanges(depDiffOutput)
  const duration = computeDuration(commits)

  return ok({
    startCommit: fromCommit,
    endCommit: toCommit,
    commitCount: commits.length,
    commits,
    files,
    stats,
    dependencies,
    duration
  })
}
