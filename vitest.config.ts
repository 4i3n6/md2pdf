import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/main.ts',
                'src/pwaRegister.ts',
                'src/vite-env.d.ts',
                'src/env.d.ts',
                'src/**/*.d.ts'
            ]
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@processors': path.resolve(__dirname, './src/processors'),
            '@utils': path.resolve(__dirname, './src/utils')
        }
    }
})
