import { describe, it, expect } from 'vitest'
import { parseDependencyChanges } from '../dep-parser.js'

describe('parseDependencyChanges', () => {
  it('parses added dependency from diff', () => {
    const diff = `
diff --git a/package.json b/package.json
index abc..def 100644
--- a/package.json
+++ b/package.json
@@ -5,6 +5,7 @@
   "dependencies": {
     "existing-pkg": "^1.0.0",
+    "new-pkg": "^2.0.0",
   }
`
    const changes = parseDependencyChanges(diff)
    expect(changes).toHaveLength(1)
    expect(changes[0]).toEqual({ name: 'new-pkg', action: 'added', to: '^2.0.0' })
  })

  it('parses removed dependency from diff', () => {
    const diff = `
diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -5,7 +5,6 @@
   "dependencies": {
-    "old-pkg": "^1.0.0",
     "remaining-pkg": "^3.0.0"
   }
`
    const changes = parseDependencyChanges(diff)
    expect(changes).toHaveLength(1)
    expect(changes[0]).toEqual({ name: 'old-pkg', action: 'removed', from: '^1.0.0' })
  })

  it('parses updated dependency (version change)', () => {
    const diff = `
diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -5,7 +5,7 @@
   "dependencies": {
-    "some-pkg": "^1.0.0",
+    "some-pkg": "^2.0.0",
   }
`
    const changes = parseDependencyChanges(diff)
    expect(changes).toHaveLength(1)
    expect(changes[0]).toEqual({ name: 'some-pkg', action: 'updated', from: '^1.0.0', to: '^2.0.0' })
  })

  it('handles empty diff (no dep changes)', () => {
    const changes = parseDependencyChanges('')
    expect(changes).toHaveLength(0)
  })

  it('handles diff with no dependency sections', () => {
    const diff = `
diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -1,3 +1,3 @@
-  "name": "old-name",
+  "name": "new-name",
`
    const changes = parseDependencyChanges(diff)
    expect(changes).toHaveLength(0)
  })

  it('parses devDependencies changes', () => {
    const diff = `
diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -10,6 +10,7 @@
   "devDependencies": {
     "typescript": "^5.0.0",
+    "vitest": "^4.0.0",
   }
`
    const changes = parseDependencyChanges(diff)
    expect(changes).toHaveLength(1)
    expect(changes[0]).toEqual({ name: 'vitest', action: 'added', to: '^4.0.0' })
  })
})
