#!/usr/bin/env node
/**
 * Version Bump Script
 * 
 * Automatically increments the patch version on each build.
 * Updates package.json and i18n files to keep version in sync.
 * 
 * Usage:
 *   node scripts/bump-version.mjs        # Increment patch (1.1.0 -> 1.1.1)
 *   node scripts/bump-version.mjs minor  # Increment minor (1.1.0 -> 1.2.0)
 *   node scripts/bump-version.mjs major  # Increment major (1.1.0 -> 2.0.0)
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

/**
 * Increments version based on type
 * @param {string} version - Current version (e.g., "1.1.0")
 * @param {string} type - Type of increment: "patch", "minor", or "major"
 * @returns {string} New version
 */
function incrementVersion(version, type = 'patch') {
  const [major, minor, patch] = version.split('.').map(Number)
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`
  }
}

/**
 * Updates version in a file using regex replacement
 * @param {string} filePath - Path to file
 * @param {string} oldVersion - Version to replace
 * @param {string} newVersion - New version
 */
function updateFileVersion(filePath, oldVersion, newVersion) {
  try {
    let content = readFileSync(filePath, 'utf-8')
    const versionRegex = new RegExp(`v?${oldVersion.replace(/\./g, '\\.')}`, 'g')
    content = content.replace(versionRegex, (match) => {
      // Preserve 'v' prefix if present
      return match.startsWith('v') ? `v${newVersion}` : newVersion
    })
    writeFileSync(filePath, content, 'utf-8')
    console.log(`  Updated: ${filePath}`)
  } catch (err) {
    console.error(`  Error updating ${filePath}:`, err.message)
  }
}

// Main execution
const bumpType = process.argv[2] || 'patch'

// Read current version from package.json
const packageJsonPath = join(rootDir, 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
const currentVersion = packageJson.version

// Calculate new version
const newVersion = incrementVersion(currentVersion, bumpType)

console.log(`\nBumping version: ${currentVersion} -> ${newVersion} (${bumpType})\n`)

// Update package.json
packageJson.version = newVersion
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8')
console.log(`  Updated: package.json`)

// Update i18n files
const i18nFiles = [
  join(rootDir, 'src/i18n/en.ts'),
  join(rootDir, 'src/i18n/pt.ts')
]

for (const file of i18nFiles) {
  updateFileVersion(file, currentVersion, newVersion)
}

console.log(`\nVersion bumped to ${newVersion}\n`)
