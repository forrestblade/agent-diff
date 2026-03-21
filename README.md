# agent-diff

Post-session CLI that diffs your repo against a saved snapshot and produces a structured summary of everything the agent changed.

## Install

```bash
npm install -g agent-diff
```

## Usage

**Before a session:**
```bash
agent-diff snapshot
# Saved session start: abc1234
```

**After a session:**
```bash
agent-diff report
```

```
Session: abc1234..def5678 (5 commits, 23 minutes)

Files (12 changed):
  + src/match.ts (new)
  + src/__tests__/match.test.ts (new)
  ~ package.json (+3, -1)
  ~ src/index.ts (+2, -0)
  - old-file.ts (deleted)

Dependencies:
  + @valencets/resultkit ^0.2.0
  ~ typescript 5.8.0 → 5.9.0

Stats: +245 -67 across 12 files in 5 commits
```

## Commands

### `agent-diff snapshot`

Saves the current `git HEAD` commit hash to `.agent-session` in the current directory. Run this before starting a Claude Code session.

### `agent-diff report`

Generates a diff report from the snapshot to the current HEAD.

**Options:**
- `--format cli` — colored terminal output (default)
- `--format json` — structured JSON for programmatic use
- `--format markdown` — PR-friendly markdown
- `--since <commit>` — diff from a specific commit instead of the snapshot

### Examples

```bash
# JSON output for scripting
agent-diff report --format json | jq '.files[] | select(.status == "A")'

# Markdown for PR description
agent-diff report --format markdown > session-summary.md

# Diff from a specific commit
agent-diff report --since abc1234
```

## Output Formats

### CLI (default)
Colored terminal output with `+` for added, `~` for modified, `-` for deleted.

### JSON
```json
{
  "startCommit": "abc1234",
  "endCommit": "def5678",
  "commitCount": 5,
  "duration": "0h 23m",
  "files": [
    { "status": "A", "path": "src/match.ts", "insertions": 45, "deletions": 0 },
    { "status": "M", "path": "package.json", "insertions": 3, "deletions": 1 }
  ],
  "stats": { "insertions": 245, "deletions": 67, "filesChanged": 12 },
  "dependencies": [
    { "name": "@valencets/resultkit", "action": "added", "to": "^0.2.0" }
  ],
  "commits": [
    { "hash": "def5678", "subject": "Add match/matchOn", "author": "Forrest", "date": "2026-03-21T18:05:49-05:00" }
  ]
}
```

### Markdown
Structured markdown with headers, bullet lists, suitable for pasting into PRs.

## Requirements

- Node.js >= 22
- Git repository
- ESM only

## License

MIT
