function abbreviateCryptoAddress(value: string): string {
    if (value.length < 28) return value
    return `${value.slice(0, 10)}...${value.slice(-8)}`
}

function truncateCryptoText(text: string): string {
    const evmAddressRegex = /\b0x[a-fA-F0-9]{24,}\b/g
    const btcAddressRegex = /\b(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}\b/g
    return text
        .replace(evmAddressRegex, abbreviateCryptoAddress)
        .replace(btcAddressRegex, abbreviateCryptoAddress)
}

function truncateCellTextNodes(cell: Element): number {
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT)
    let truncated = 0
    let node = walker.nextNode()

    while (node) {
        const original = node.textContent || ''
        const processed = truncateCryptoText(original)
        if (processed !== original) {
            node.textContent = processed
            truncated++
        }
        node = walker.nextNode()
    }

    return truncated
}

export async function processCryptoTruncationInTables(container: HTMLElement | null): Promise<number> {
    if (!container) return 0

    const cells = container.querySelectorAll('table th, table td')
    if (cells.length === 0) return 0

    let truncated = 0
    cells.forEach((cell) => {
        truncated += truncateCellTextNodes(cell)
    })

    return truncated
}
