import { defineConfig } from 'tsup'

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
    noExternal: ['marked', 'highlight.js', 'js-yaml', 'commander', 'puppeteer-core'],
    tsconfig: 'tsconfig.cli.json'
})
