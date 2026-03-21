import type { DepChange } from './types.js'

const DEP_LINE_RE = /^\s*"([^"]+)":\s*"([^"]+)"/

export function parseDependencyChanges (diffOutput: string): readonly DepChange[] {
  if (!diffOutput.trim()) return []

  const lines = diffOutput.split('\n')
  const removed = new Map<string, string>()
  const added = new Map<string, string>()

  let inDepSection = false

  for (const line of lines) {
    // Detect dependency section headers in the diff
    if (line.includes('"dependencies"') || line.includes('"devDependencies"')) {
      inDepSection = true
      continue
    }

    // End of a section (closing brace at the right indentation)
    if (inDepSection && /^[+-]?\s{2}\}/.test(line)) {
      inDepSection = false
      continue
    }

    if (!inDepSection) continue

    const isRemoved = line.startsWith('-')
    const isAdded = line.startsWith('+')

    if (!isRemoved && !isAdded) continue

    const match = DEP_LINE_RE.exec(line.slice(1))
    if (!match) continue

    const [, name, version] = match
    if (name === undefined || version === undefined) continue

    if (isRemoved) {
      removed.set(name, version)
    } else {
      added.set(name, version)
    }
  }

  const changes: DepChange[] = []

  for (const [name, version] of added) {
    const oldVersion = removed.get(name)
    if (oldVersion !== undefined) {
      if (oldVersion !== version) {
        changes.push({ name, action: 'updated', from: oldVersion, to: version })
      }
      removed.delete(name)
    } else {
      changes.push({ name, action: 'added', to: version })
    }
  }

  for (const [name, version] of removed) {
    changes.push({ name, action: 'removed', from: version })
  }

  return changes
}
