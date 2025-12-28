/**
 * Smoke test wrapper (legado)
 * Use `npm run smoke`
 */

const { execSync } = require('node:child_process')

try {
    execSync('node scripts/smoke-test.mjs', { stdio: 'inherit' })
} catch (e) {
    process.exit(1)
}
