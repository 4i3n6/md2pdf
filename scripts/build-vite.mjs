import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const viteCmd = process.platform === 'win32'
    ? 'node_modules/.bin/vite.cmd'
    : 'node_modules/.bin/vite'

const args = ['build']
const child = spawn(viteCmd, args, {
    stdio: ['inherit', 'pipe', 'pipe']
})

let buildFinalizado = false
let killTimer = null
let monitorTimer = null
let encerradoForcado = false
const caminhoSw = join(process.cwd(), 'dist', 'sw.js')
const tempoMaximoEsperaMs = 15000
const intervaloMonitorMs = 500

function marcarFinalizacaoSeDetectada(data) {
    const texto = data.toString()
    if (!buildFinalizado && /built in/i.test(texto)) {
        buildFinalizado = true
        iniciarMonitoramentoSaida()
    }
}

function iniciarMonitoramentoSaida() {
    if (monitorTimer) return
    const inicio = Date.now()
    monitorTimer = setInterval(() => {
        const swGerado = existsSync(caminhoSw)
        const tempoDecorrido = Date.now() - inicio

        if (swGerado || tempoDecorrido >= tempoMaximoEsperaMs) {
            clearInterval(monitorTimer)
            monitorTimer = null
            iniciarTimerDeSaida(swGerado ? 500 : 2000)
        }
    }, intervaloMonitorMs)
}

function iniciarTimerDeSaida(delayMs = 2000) {
    if (killTimer) return
    killTimer = setTimeout(() => {
        if (child.killed) return
        encerradoForcado = true
        child.kill('SIGTERM')
        setTimeout(() => child.kill('SIGKILL'), 2000)
    }, 2000)
}

child.stdout.on('data', (data) => {
    process.stdout.write(data)
    marcarFinalizacaoSeDetectada(data)
})

child.stderr.on('data', (data) => {
    process.stderr.write(data)
    marcarFinalizacaoSeDetectada(data)
})

child.on('close', (code) => {
    if (killTimer) clearTimeout(killTimer)
    if (encerradoForcado && buildFinalizado) {
        process.exit(0)
    }
    process.exit(code ?? 1)
})
