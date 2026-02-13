import { defineConfig, devices } from '@playwright/test'

const portaPreview = Number(process.env['PLAYWRIGHT_PORT'] || '3399')
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] || `http://127.0.0.1:${portaPreview}`
const deveBuildarAntes = process.env['PLAYWRIGHT_SKIP_BUILD'] !== '1'
const comandoPreview = deveBuildarAntes
    ? `npm run build && npm run preview -- --host 127.0.0.1 --port ${portaPreview}`
    : `npm run preview -- --host 127.0.0.1 --port ${portaPreview}`

export default defineConfig({
    testDir: './tests/visual',
    fullyParallel: false,
    retries: process.env['CI'] ? 2 : 0,
    timeout: 45_000,
    expect: {
        timeout: 10_000
    },
    reporter: [
        ['list'],
        ['html', { open: 'never' }]
    ],
    use: {
        baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        viewport: { width: 1600, height: 1200 }
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ],
    webServer: process.env['PLAYWRIGHT_BASE_URL']
        ? undefined
        : {
            command: comandoPreview,
            port: portaPreview,
            timeout: 180_000,
            reuseExistingServer: true
        }
})
