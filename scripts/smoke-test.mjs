import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

function logInfo(message) {
    process.stdout.write(`[smoke] ${message}\n`)
}

function logErro(message) {
    process.stderr.write(`[smoke] ${message}\n`)
}

function verificarDist() {
    const distDir = resolve('dist')
    const indexPath = join(distDir, 'index.html')
    const assetsDir = join(distDir, 'assets')

    if (!existsSync(indexPath)) {
        logErro('dist/index.html nao encontrado. Execute npm run build antes do smoke test.')
        process.exit(1)
    }

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

    const html = readFileSync(indexPath, 'utf8')
    if (!html.includes('</html>')) {
        logErro('index.html parece incompleto.')
        process.exit(1)
    }

    logInfo('dist/index.html e assets basicos encontrados.')
}

verificarDist()
logInfo('Smoke test concluido com sucesso.')
