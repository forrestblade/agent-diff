export { saveSnapshot, loadSnapshot } from './snapshot.js'
export { generateReport } from './diff-engine.js'
export { parseDependencyChanges } from './dep-parser.js'
export { formatCli } from './formatters/cli.js'
export { formatJson } from './formatters/json.js'
export { formatMarkdown } from './formatters/markdown.js'
export {
  FileStatus,
  DiffErrorCode,
  type FileChange,
  type DepChange,
  type SessionReport,
  type CommitInfo,
  type DiffError
} from './types.js'
