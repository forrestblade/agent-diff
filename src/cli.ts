import { saveSnapshot, loadSnapshot } from './snapshot.js'
import { generateReport } from './diff-engine.js'
import { formatCli } from './formatters/cli.js'
import { formatJson } from './formatters/json.js'
import { formatMarkdown } from './formatters/markdown.js'
import type { SessionReport } from './types.js'

const COMMANDS = {
  snapshot: 'Save session start point',
  report: 'Generate diff report'
} as const

type FormatName = 'cli' | 'json' | 'markdown'

const FORMATTERS: Record<FormatName, (report: SessionReport) => string> = {
  cli: formatCli,
  json: formatJson,
  markdown: formatMarkdown
}

function parseArgs (args: readonly string[]): { readonly command: string | undefined; readonly format: FormatName; readonly since: string | undefined } {
  let format: FormatName = 'cli'
  let since: string | undefined
  const command = args[0]

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--format' && i + 1 < args.length) {
      const next = args[i + 1]
      if (next === 'cli' || next === 'json' || next === 'markdown') {
        format = next
      }
      i++
    } else if (arg === '--since' && i + 1 < args.length) {
      since = args[i + 1]
      i++
    }
  }

  return { command, format, since }
}

async function runSnapshot (): Promise<void> {
  const dir = process.cwd()
  const result = await saveSnapshot(dir)

  if (result.isErr()) {
    process.stderr.write(`Error: ${result.error.message}\n`)
    process.exitCode = 1
    return
  }

  process.stdout.write(`Snapshot saved: ${result.value}\n`)
}

async function runReport (format: FormatName, since: string | undefined): Promise<void> {
  const dir = process.cwd()
  let fromCommit: string

  if (since !== undefined) {
    fromCommit = since
  } else {
    const snapshotResult = await loadSnapshot(dir)
    if (snapshotResult.isErr()) {
      process.stderr.write(`Error: ${snapshotResult.error.message}\n`)
      process.stderr.write('Run "agent-diff snapshot" first, or use --since <commit>\n')
      process.exitCode = 1
      return
    }
    fromCommit = snapshotResult.value
  }

  const { execSync } = await import('node:child_process')
  const { fromThrowable } = await import('@valencets/resultkit')

  const safeHead = fromThrowable(
    () => execSync('git rev-parse HEAD', { cwd: dir, encoding: 'utf-8' }).trim(),
    (e: unknown) => e instanceof Error ? e.message : String(e)
  )

  const headResult = safeHead()
  if (headResult.isErr()) {
    process.stderr.write(`Error: ${headResult.error}\n`)
    process.exitCode = 1
    return
  }

  const toCommit = headResult.value
  const reportResult = generateReport(fromCommit, toCommit, dir)

  if (reportResult.isErr()) {
    process.stderr.write(`Error: ${reportResult.error.message}\n`)
    process.exitCode = 1
    return
  }

  const formatter = FORMATTERS[format]
  process.stdout.write(formatter(reportResult.value) + '\n')
}

function printHelp (): void {
  process.stdout.write('Usage: agent-diff <command> [options]\n\n')
  process.stdout.write('Commands:\n')
  const entries = Object.entries(COMMANDS)
  for (const [name, desc] of entries) {
    process.stdout.write(`  ${name.padEnd(12)} ${desc}\n`)
  }
  process.stdout.write('\nOptions:\n')
  process.stdout.write('  --format <cli|json|markdown>  Output format (default: cli)\n')
  process.stdout.write('  --since <commit>              Use specific commit instead of snapshot\n')
}

const COMMAND_MAP: Record<string, (format: FormatName, since: string | undefined) => Promise<void>> = {
  snapshot: async () => runSnapshot(),
  report: async (format, since) => runReport(format, since)
}

export async function run (args: readonly string[]): Promise<void> {
  const { command, format, since } = parseArgs(args)

  if (command === undefined || command === '--help' || command === '-h') {
    printHelp()
    return
  }

  const handler = COMMAND_MAP[command]

  if (handler === undefined) {
    process.stderr.write(`Unknown command: ${command}\n`)
    printHelp()
    process.exitCode = 1
    return
  }

  await handler(format, since)
}
