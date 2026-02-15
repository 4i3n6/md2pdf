function abreviarEnderecoCriptografico(valor: string): string {
    if (valor.length < 28) return valor
    return `${valor.slice(0, 10)}...${valor.slice(-8)}`
}

function truncarTextoCripto(texto: string): string {
    const regexEnderecoEvm = /\b0x[a-fA-F0-9]{24,}\b/g
    const regexEnderecoBtc = /\b(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}\b/g
    return texto
        .replace(regexEnderecoEvm, abreviarEnderecoCriptografico)
        .replace(regexEnderecoBtc, abreviarEnderecoCriptografico)
}

function truncarTextoNosDaCelula(celula: Element): number {
    const walker = document.createTreeWalker(celula, NodeFilter.SHOW_TEXT)
    let truncamentos = 0
    let nodo = walker.nextNode()

    while (nodo) {
        const textoOriginal = nodo.textContent || ''
        const textoTruncado = truncarTextoCripto(textoOriginal)
        if (textoTruncado !== textoOriginal) {
            nodo.textContent = textoTruncado
            truncamentos++
        }
        nodo = walker.nextNode()
    }

    return truncamentos
}

export async function processCryptoTruncationInTables(container: HTMLElement | null): Promise<number> {
    if (!container) return 0

    const celulas = container.querySelectorAll('table th, table td')
    if (celulas.length === 0) return 0

    let truncamentos = 0
    celulas.forEach((celula) => {
        truncamentos += truncarTextoNosDaCelula(celula)
    })

    return truncamentos
}
