import { defineConfig } from 'tsup'
import pkg from './package.json'

export default defineConfig({
    entry: ['src/cli/index.ts'],
    outDir: 'dist-cli',
    format: ['cjs'],
    target: 'node18',
    platform: 'node',
    clean: true,
    splitting: false,
    banner: { js: '#!/usr/bin/env node' },
    external: ['mermaid'],
    loader: { '.css': 'text' },
    noExternal: ['marked', 'highlight.js', 'js-yaml', 'commander', 'puppeteer-core', 'sanitize-html'],
    tsconfig: 'tsconfig.cli.json',
    define: {
        'CLI_VERSION': JSON.stringify(pkg.version)
    }
})
