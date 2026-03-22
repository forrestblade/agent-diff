import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fromThrowable } from '@valencets/resultkit'
import type { Result } from '@valencets/resultkit'
import { DiffErrorCode, type DiffError } from './types.js'

const SESSION_FILE = '.agent-session'

const safeGit = fromThrowable(
  (args: readonly string[], dir: string) => execFileSync('git', [...args], { cwd: dir, encoding: 'utf-8' }).trim(),
  (e): DiffError => ({
    code: DiffErrorCode.GIT_FAILED,
    message: e instanceof Error ? e.message : String(e)
  })
)

const safeWriteFile = fromThrowable(
  (path: string, data: string) => writeFileSync(path, data, 'utf-8'),
  (e): DiffError => ({
    code: DiffErrorCode.IO_FAILED,
    message: e instanceof Error ? e.message : String(e)
  })
)

const safeReadFile = fromThrowable(
  (path: string) => readFileSync(path, 'utf-8').trim(),
  (e): DiffError => ({
    code: DiffErrorCode.NO_SNAPSHOT,
    message: `No snapshot found: ${e instanceof Error ? e.message : String(e)}`
  })
)

export function saveSnapshot (dir: string): Result<string, DiffError> {
  return safeGit(['rev-parse', 'HEAD'], dir)
    .andThen((hash) => {
      const filePath = join(dir, SESSION_FILE)
      return safeWriteFile(filePath, hash).map(() => hash)
    })
}

export function loadSnapshot (dir: string): Result<string, DiffError> {
  const filePath = join(dir, SESSION_FILE)
  return safeReadFile(filePath)
}
