import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { saveSnapshot, loadSnapshot } from '../snapshot.js'

describe('snapshot', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'agent-diff-test-'))
    execSync('git init', { cwd: tempDir })
    execSync('git config user.email "test@test.com"', { cwd: tempDir })
    execSync('git config user.name "Test"', { cwd: tempDir })
    execSync('touch init.txt && git add . && git commit -m "init"', { cwd: tempDir })
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe('saveSnapshot', () => {
    it('writes .agent-session with correct commit hash', async () => {
      const result = await saveSnapshot(tempDir)
      expect(result.isOk()).toBe(true)
      if (result.isErr()) return

      const expectedHash = execSync('git rev-parse HEAD', { cwd: tempDir, encoding: 'utf-8' }).trim()
      expect(result.value).toBe(expectedHash)

      const fileContent = readFileSync(join(tempDir, '.agent-session'), 'utf-8').trim()
      expect(fileContent).toBe(expectedHash)
    })
  })

  describe('loadSnapshot', () => {
    it('reads back the saved commit hash', async () => {
      await saveSnapshot(tempDir)
      const result = await loadSnapshot(tempDir)
      expect(result.isOk()).toBe(true)
      if (result.isErr()) return

      const expectedHash = execSync('git rev-parse HEAD', { cwd: tempDir, encoding: 'utf-8' }).trim()
      expect(result.value).toBe(expectedHash)
    })

    it('errors when no .agent-session exists', async () => {
      const result = await loadSnapshot(tempDir)
      expect(result.isErr()).toBe(true)
      if (result.isOk()) return

      expect(result.error.code).toBe('NO_SNAPSHOT')
    })
  })
})
