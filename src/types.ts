export const FileStatus = { ADDED: 'A', MODIFIED: 'M', DELETED: 'D', RENAMED: 'R' } as const
export type FileStatus = typeof FileStatus[keyof typeof FileStatus]

export interface FileChange {
  readonly status: FileStatus
  readonly path: string
  readonly insertions: number
  readonly deletions: number
  readonly oldPath?: string
}

export interface DepChange {
  readonly name: string
  readonly action: 'added' | 'removed' | 'updated'
  readonly from?: string
  readonly to?: string
}

export interface SessionReport {
  readonly startCommit: string
  readonly endCommit: string
  readonly commitCount: number
  readonly commits: readonly CommitInfo[]
  readonly files: readonly FileChange[]
  readonly stats: { readonly insertions: number; readonly deletions: number; readonly filesChanged: number }
  readonly dependencies: readonly DepChange[]
  readonly duration: string
}

export interface CommitInfo {
  readonly hash: string
  readonly subject: string
  readonly author: string
  readonly date: string
}

export const DiffErrorCode = {
  GIT_FAILED: 'GIT_FAILED',
  NO_SNAPSHOT: 'NO_SNAPSHOT',
  IO_FAILED: 'IO_FAILED',
  NOT_A_REPO: 'NOT_A_REPO'
} as const

export interface DiffError {
  readonly code: string
  readonly message: string
}
