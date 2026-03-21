import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { generateReport } from '../diff-engine.js'
import { FileStatus } from '../types.js'

function git (cmd: string, cwd: string): string {
  return execSync(`git ${cmd}`, { cwd, encoding: 'utf-8' }).trim()
}

describe('generateReport', () => {
  let tempDir: string
  let startCommit: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'agent-diff-engine-'))
    git('init', tempDir)
    git('config user.email "test@test.com"', tempDir)
    git('config user.name "Test Author"', tempDir)

    // Initial commit
    writeFileSync(join(tempDir, 'existing.txt'), 'original content\n')
    git('add .', tempDir)
    git('commit -m "initial commit"', tempDir)
    startCommit = git('rev-parse HEAD', tempDir)
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('detects added files', () => {
    writeFileSync(join(tempDir, 'new-file.ts'), 'const x = 1\nconst y = 2\n')
    git('add .', tempDir)
    git('commit -m "add new file"', tempDir)
    const endCommit = git('rev-parse HEAD', tempDir)

    const result = generateReport(startCommit, endCommit, tempDir)
    expect(result.isOk()).toBe(true)
    if (result.isErr()) return

    const report = result.value
    const added = report.files.find((f) => f.path === 'new-file.ts')
    expect(added).toBeDefined()
    expect(added?.status).toBe(FileStatus.ADDED)
    expect(added?.insertions).toBe(2)
  })

  it('detects modified files', () => {
    writeFileSync(join(tempDir, 'existing.txt'), 'modified content\nmore lines\n')
    git('add .', tempDir)
    git('commit -m "modify file"', tempDir)
    const endCommit = git('rev-parse HEAD', tempDir)

    const result = generateReport(startCommit, endCommit, tempDir)
    expect(result.isOk()).toBe(true)
    if (result.isErr()) return

    const report = result.value
    const modified = report.files.find((f) => f.path === 'existing.txt')
    expect(modified).toBeDefined()
    expect(modified?.status).toBe(FileStatus.MODIFIED)
  })

  it('detects deleted files', () => {
    git('rm existing.txt', tempDir)
    git('commit -m "delete file"', tempDir)
    const endCommit = git('rev-parse HEAD', tempDir)

    const result = generateReport(startCommit, endCommit, tempDir)
    expect(result.isOk()).toBe(true)
    if (result.isErr()) return

    const report = result.value
    const deleted = report.files.find((f) => f.path === 'existing.txt')
    expect(deleted).toBeDefined()
    expect(deleted?.status).toBe(FileStatus.DELETED)
  })

  it('counts insertions and deletions correctly', () => {
    writeFileSync(join(tempDir, 'existing.txt'), 'line1\nline2\nline3\n')
    git('add .', tempDir)
    git('commit -m "update content"', tempDir)
    const endCommit = git('rev-parse HEAD', tempDir)

    const result = generateReport(startCommit, endCommit, tempDir)
    expect(result.isOk()).toBe(true)
    if (result.isErr()) return

    const report = result.value
    expect(report.stats.insertions).toBeGreaterThan(0)
    expect(report.stats.deletions).toBeGreaterThan(0)
  })

  it('lists commits in order', () => {
    writeFileSync(join(tempDir, 'a.txt'), 'a\n')
    git('add .', tempDir)
    git('commit -m "first change"', tempDir)

    writeFileSync(join(tempDir, 'b.txt'), 'b\n')
    git('add .', tempDir)
    git('commit -m "second change"', tempDir)

    const endCommit = git('rev-parse HEAD', tempDir)

    const result = generateReport(startCommit, endCommit, tempDir)
    expect(result.isOk()).toBe(true)
    if (result.isErr()) return

    const report = result.value
    expect(report.commitCount).toBe(2)
    expect(report.commits[0]?.subject).toBe('first change')
    expect(report.commits[1]?.subject).toBe('second change')
    expect(report.commits[0]?.author).toBe('Test Author')
  })

  it('returns correct start and end commits', () => {
    writeFileSync(join(tempDir, 'x.txt'), 'x\n')
    git('add .', tempDir)
    git('commit -m "some change"', tempDir)
    const endCommit = git('rev-parse HEAD', tempDir)

    const result = generateReport(startCommit, endCommit, tempDir)
    expect(result.isOk()).toBe(true)
    if (result.isErr()) return

    expect(result.value.startCommit).toBe(startCommit)
    expect(result.value.endCommit).toBe(endCommit)
  })
})
