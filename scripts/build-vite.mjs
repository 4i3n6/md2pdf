import { spawn } from 'node:child_process'

const viteCmd = process.platform === 'win32'
    ? 'node_modules/.bin/vite.cmd'
    : 'node_modules/.bin/vite'

const args = ['build']
const child = spawn(viteCmd, args, {
    stdio: ['inherit', 'pipe', 'pipe']
})

let buildFinalizado = false
let killTimer = null
let encerradoForcado = false

function marcarFinalizacaoSeDetectada(data) {
    const texto = data.toString()
    if (!buildFinalizado && /built in/i.test(texto)) {
        buildFinalizado = true
        iniciarTimerDeSaida()
    }
}

function iniciarTimerDeSaida() {
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
