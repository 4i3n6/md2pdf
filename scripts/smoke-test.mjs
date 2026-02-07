import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

function logInfo(message) {
    process.stdout.write(`[smoke] ${message}\n`)
}

function logErro(message) {
    process.stderr.write(`[smoke] ${message}\n`)
}

function assertFileExists(filePath, hint) {
    if (existsSync(filePath)) return
    logErro(`Arquivo ausente: ${filePath}${hint ? ` (${hint})` : ''}`)
    process.exit(1)
}

function assertLooksLikeHtml(filePath) {
    const html = readFileSync(filePath, 'utf8')
    if (!html.includes('</html>')) {
        logErro(`${filePath} parece incompleto (nao contem </html>).`)
        process.exit(1)
    }
}

function assertJsonParses(filePath) {
    try {
        JSON.parse(readFileSync(filePath, 'utf8'))
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        logErro(`${filePath} nao eh JSON valido: ${msg}`)
        process.exit(1)
    }
}

function verificarDist() {
    const distDir = resolve('dist')
    const indexPath = join(distDir, 'index.html')
    const appPath = join(distDir, 'app.html')
    const ptIndexPath = join(distDir, 'pt', 'index.html')
    const ptAppPath = join(distDir, 'pt', 'app.html')
    const manualIndexPath = join(distDir, 'manual', 'index.html')
    const ptManualIndexPath = join(distDir, 'pt', 'manual', 'index.html')
    const swPath = join(distDir, 'sw.js')
    const manifestPath = join(distDir, 'manifest.webmanifest')
    const assetsDir = join(distDir, 'assets')

    assertFileExists(indexPath, 'Execute npm run build antes do smoke test')
    assertFileExists(appPath, 'Build do app (app.html) nao foi gerado')
    assertFileExists(ptIndexPath, 'Build PT (pt/index.html) nao foi gerado')
    assertFileExists(ptAppPath, 'Build PT (pt/app.html) nao foi gerado')
    assertFileExists(manualIndexPath, 'Build do manual (manual/index.html) nao foi gerado')
    assertFileExists(ptManualIndexPath, 'Build do manual PT (pt/manual/index.html) nao foi gerado')
    assertFileExists(swPath, 'Service Worker nao foi gerado')
    assertFileExists(manifestPath, 'Manifest PWA nao foi gerado')

    if (!existsSync(assetsDir)) {
        logErro('dist/assets nao encontrado. Build incompleto ou pasta removida.')
        process.exit(1)
    }

    const assets = readdirSync(assetsDir)
    const temJsOuCss = assets.some((arquivo) => arquivo.endsWith('.js') || arquivo.endsWith('.css'))
    if (!temJsOuCss) {
        logErro('Nenhum asset .js ou .css encontrado em dist/assets.')
        process.exit(1)
    }

    assertLooksLikeHtml(indexPath)
    assertLooksLikeHtml(appPath)
    assertLooksLikeHtml(ptIndexPath)
    assertLooksLikeHtml(ptAppPath)
    assertLooksLikeHtml(manualIndexPath)
    assertLooksLikeHtml(ptManualIndexPath)
    assertJsonParses(manifestPath)

    const workbox = existsSync(distDir)
        ? readdirSync(distDir).some((arquivo) => /^workbox-.*\.js$/.test(arquivo))
        : false
    if (!workbox) {
        logErro('Arquivo workbox-*.js nao encontrado em dist/. PWA pode estar incompleto.')
        process.exit(1)
    }

    logInfo('dist/index.html e assets basicos encontrados.')
    logInfo('app/pt/manual/pwa artefatos encontrados.')
}

verificarDist()
logInfo('Smoke test concluido com sucesso.')
