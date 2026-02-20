/**
 * Build script for Node.js Single Executable Application (SEA).
 *
 * Steps (Node v22 LTS):
 *   1. Build CLI bundle with tsup (dist-cli/index.js)
 *   2. Generate SEA blob from sea-config.json
 *   3. Copy the current node binary
 *   4. Remove code signature (macOS only)
 *   5. Inject the blob with postject
 *   6. Re-sign the binary (macOS only)
 *
 * Usage:
 *   node scripts/build-sea.mjs              # builds for current platform
 *   node scripts/build-sea.mjs --skip-cli   # skip tsup build (if already done)
 */

import { execSync } from 'child_process'
import { copyFileSync, existsSync, chmodSync, mkdirSync } from 'fs'
import { join, resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '..')
const DIST = join(ROOT, 'dist-cli')
const SEA_CONFIG = join(ROOT, 'sea-config.json')
const BLOB_PATH = join(DIST, 'sea-prep.blob')

const platform = process.platform
const arch = process.arch
const skipCli = process.argv.includes('--skip-cli')

const EXT = platform === 'win32' ? '.exe' : ''
const OUTPUT_NAME = `md2pdf-${platform}-${arch}${EXT}`
const OUTPUT_PATH = join(DIST, OUTPUT_NAME)

function run(cmd, opts = {}) {
    console.log(`  $ ${cmd}`)
    execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts })
}

function step(msg) {
    console.log(`\n→ ${msg}`)
}

// ── 1. Build CLI bundle ──────────────────────────────────────────────
if (!skipCli) {
    step('Building CLI bundle with tsup...')
    run('npx tsup')
}

if (!existsSync(join(DIST, 'index.js'))) {
    console.error('Error: dist-cli/index.js not found. Run npm run build:cli first.')
    process.exit(1)
}

// ── 2. Generate SEA blob ─────────────────────────────────────────────
step('Generating SEA preparation blob...')
run(`node --experimental-sea-config ${SEA_CONFIG}`)

if (!existsSync(BLOB_PATH)) {
    console.error('Error: SEA blob was not generated.')
    process.exit(1)
}

// ── 3. Copy node binary ──────────────────────────────────────────────
step(`Copying node binary → ${OUTPUT_NAME}`)
copyFileSync(process.execPath, OUTPUT_PATH)
chmodSync(OUTPUT_PATH, 0o755)

// ── 4. Remove code signature (macOS only) ────────────────────────────
if (platform === 'darwin') {
    step('Removing code signature (macOS)...')
    run(`codesign --remove-signature "${OUTPUT_PATH}"`)
}

// ── 5. Inject SEA blob with postject ─────────────────────────────────
step('Injecting SEA blob with postject...')

const sentinelFuse = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'
const postjectArgs = [
    `"${OUTPUT_PATH}"`,
    'NODE_SEA_BLOB',
    `"${BLOB_PATH}"`,
    '--sentinel-fuse', sentinelFuse,
]

if (platform === 'darwin') {
    postjectArgs.push('--macho-segment-name', 'NODE_SEA')
}

run(`npx postject ${postjectArgs.join(' ')}`)

// ── 6. Re-sign (macOS only) ──────────────────────────────────────────
if (platform === 'darwin') {
    step('Re-signing binary (macOS ad-hoc)...')
    run(`codesign --sign - "${OUTPUT_PATH}"`)
}

// ── Done ─────────────────────────────────────────────────────────────
step(`Done! Executable: ${OUTPUT_PATH}`)
console.log(`\n  Test with: ${OUTPUT_PATH} --help\n`)
