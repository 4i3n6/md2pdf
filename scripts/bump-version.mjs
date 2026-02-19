#!/usr/bin/env node
/**
 * Version Bump Script
 * 
 * Automatically increments the version and syncs across all files.
 * Single source of truth: package.json
 * 
 * Usage:
 *   node scripts/bump-version.mjs        # Increment patch (1.1.0 -> 1.1.1)
 *   node scripts/bump-version.mjs minor  # Increment minor (1.1.0 -> 1.2.0)
 *   node scripts/bump-version.mjs major  # Increment major (1.1.0 -> 2.0.0)
 *   node scripts/bump-version.mjs sync   # Sync current version to all files (no increment)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

// All files that contain version references
const VERSION_FILES = [
  'src/i18n/en.ts',
  'src/i18n/pt.ts',
  'app.html',
  'pt/app.html',
  'index.html',
  'pt/index.html',
  'manual/index.html',
  'pt/manual/index.html',
  'manual/content.json',
  'pt/manual/content.json',
  'README.md',
  'CHANGELOG.md'
]

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
 * Finds and replaces version patterns in file content
 * Handles both "1.2.3" and "v1.2.3" formats
 * @param {string} content - File content
 * @param {string} newVersion - New version to set
 * @returns {string} Updated content
 */
function replaceVersionInContent(content, newVersion) {
  let result = content

  // Replace version: 'vX.X.X' pattern (i18n files)
  result = result.replace(/(version:\s*['"])v?\d+\.\d+\.\d+(['"])/g, `$1v${newVersion}$2`)

  // Replace >vX.X.X< pattern (HTML files)
  result = result.replace(/(>)v?\d+\.\d+\.\d+(<)/g, `$1v${newVersion}$2`)

  // Replace "version": "X.X.X" pattern (JSON files)
  result = result.replace(/("version":\s*")\d+\.\d+\.\d+(")/g, `$1${newVersion}$2`)

  // Replace SISTEMA DE CONVERSÃO vX.X.X pattern (README.md)
  result = result.replace(/(SISTEMA DE CONVERSÃO v)\d+\.\d+\.\d+/g, `$1${newVersion}`)

  // Replace [X.X.X] pattern (CHANGELOG.md)
  result = result.replace(/(\[)\d+\.\d+\.\d+(\])/g, `$1${newVersion}$2`)

  return result
}

/**
 * Updates version in a specific file
 * @param {string} filePath - Path to file
 * @param {string} newVersion - New version
 */
function updateFileVersion(filePath, newVersion) {
  const fullPath = join(rootDir, filePath)

  if (!existsSync(fullPath)) {
    console.log(`  Skipped (not found): ${filePath}`)
    return
  }

  try {
    const content = readFileSync(fullPath, 'utf-8')
    const updated = replaceVersionInContent(content, newVersion)

    if (content !== updated) {
      writeFileSync(fullPath, updated, 'utf-8')
      console.log(`  Updated: ${filePath}`)
    } else {
      console.log(`  No changes: ${filePath}`)
    }
  } catch (err) {
    console.error(`  Error updating ${filePath}:`, err.message)
  }
}

function updatePackageLockVersion(newVersion) {
  const packageLockPath = join(rootDir, 'package-lock.json')
  if (!existsSync(packageLockPath)) {
    console.log('  Skipped: package-lock.json')
    return
  }

  try {
    const lock = JSON.parse(readFileSync(packageLockPath, 'utf-8'))
    lock.version = newVersion

    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = newVersion
    }

    writeFileSync(packageLockPath, JSON.stringify(lock, null, 2) + '\n', 'utf-8')
    console.log('  Updated: package-lock.json')
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`  Error updating package-lock.json: ${errorMsg}`)
  }
}

// Main execution
const bumpType = process.argv[2] || 'patch'
const isSync = bumpType === 'sync'

// Read current version from package.json
const packageJsonPath = join(rootDir, 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
const currentVersion = packageJson.version

// Calculate new version (or keep current for sync)
const newVersion = isSync ? currentVersion : incrementVersion(currentVersion, bumpType)

if (isSync) {
  console.log(`\nSyncing version ${newVersion} to all files\n`)
} else {
  console.log(`\nBumping version: ${currentVersion} -> ${newVersion} (${bumpType})\n`)

  // Update package.json
  packageJson.version = newVersion
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8')
  console.log(`  Updated: package.json`)
}

// Update all version files
for (const file of VERSION_FILES) {
  updateFileVersion(file, newVersion)
}
updatePackageLockVersion(newVersion)

// Create Git Tag if --tag is present
if (process.argv.includes('--tag') \u0026\u0026!isSync) {
  try {
    const tagName = `v${newVersion}`
    console.log(`\nCreating git tag: ${tagName}...`)
    execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, { stdio: 'inherit' })
    console.log(`Tag created successfully.`)
  } catch (err) {
    console.error(`  Error creating git tag:`, err.message)
  }
}

console.log(`\nVersion ${isSync ? 'synced' : 'bumped'} to ${newVersion}\n`)
