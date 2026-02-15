#!/usr/bin/env node
/**
 * Git Hooks Installer
 * 
 * Installs git hooks for automatic version bumping.
 * Run this once after cloning the repository.
 * 
 * Usage:
 *   node scripts/install-hooks.mjs
 */

import { writeFileSync, chmodSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const hooksDir = join(rootDir, '.git', 'hooks')

// Pre-commit hook content
const preCommitHook = `#!/bin/sh
#
# Pre-commit hook: Auto-increment version on each commit
# This ensures version is always updated when code changes
#

# Get list of staged files excluding files touched by automatic version sync.
# If only these files are staged, skip bump to avoid recursive commits.
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -Ev "^(package.json|package-lock.json|src/i18n/en.ts|src/i18n/pt.ts|app.html|pt/app.html|scripts/bump-version.mjs)$")

# Only bump version if there are actual code changes
if [ -n "$STAGED_FILES" ]; then
  echo "[pre-commit] Bumping version..."
  
  # Run version bump
  node scripts/bump-version.mjs patch
  
  # Stage the updated version files
  git add package.json
  git add package-lock.json
  git add src/i18n/en.ts
  git add src/i18n/pt.ts
  git add app.html
  git add pt/app.html
  
  echo "[pre-commit] Version bumped and staged"
fi

exit 0
`

// Ensure hooks directory exists
if (!existsSync(hooksDir)) {
  console.error('Error: .git/hooks directory not found. Is this a git repository?')
  process.exit(1)
}

// Write pre-commit hook
const preCommitPath = join(hooksDir, 'pre-commit')
writeFileSync(preCommitPath, preCommitHook, 'utf-8')
chmodSync(preCommitPath, '755')

console.log('\nGit hooks installed successfully!')
console.log(`  Created: ${preCommitPath}`)
console.log('\nVersion will be automatically bumped on each commit.\n')
