#!/usr/bin/env node

import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const binName = process.platform === 'win32' ? 'playwright.cmd' : 'playwright'
const playwrightBin = path.resolve('node_modules', '.bin', binName)
const userArgs = process.argv.slice(2)

if (!existsSync(playwrightBin)) {
    console.error('[visual] @playwright/test nao encontrado no projeto.')
    console.error('[visual] Rode: npm install -D @playwright/test')
    console.error('[visual] Depois rode: npx playwright install chromium')
    process.exit(1)
}

const result = spawnSync(
    playwrightBin,
    ['test', '-c', 'playwright.config.ts', ...userArgs],
    { stdio: 'inherit' }
)

if (typeof result.status === 'number') {
    process.exit(result.status)
}

process.exit(1)
