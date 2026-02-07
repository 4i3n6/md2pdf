import { processMarkdown, estimatePageCount } from '@/processors/markdownProcessor'
import type { LoggerInterface } from '@/types/index'

interface PreviewRenderer {
    renderPreview(container: HTMLElement, html: string): Promise<void>
}

type RenderRequest = {
    container: HTMLElement
    markdown: string
    docName: string
}

function obterExtensaoDocumento(nome: string): string {
    const origem = (nome || '').trim()
    const partes = origem.split('.')
    if (partes.length < 2) return ''
    return (partes.pop() || '').toLowerCase().trim()
}

function obterFencePorExtensao(ext: string): string | null {
    if (ext === 'sql' || ext === 'ddl') return 'sql'
    if (ext === 'json') return 'json'
    if (ext === 'yaml' || ext === 'yml') return 'yaml'
    if (ext === 'js' || ext === 'javascript') return 'javascript'
    if (ext === 'ts' || ext === 'typescript') return 'typescript'
    if (ext === 'css') return 'css'
    if (ext === 'html' || ext === 'htm') return 'html'
    if (ext === 'xml') return 'xml'
    if (ext === 'sh' || ext === 'bash') return 'bash'
    if (ext === 'py' || ext === 'python') return 'python'
    if (ext === 'go') return 'go'
    if (ext === 'rs' || ext === 'rust') return 'rust'
    if (ext === 'java') return 'java'
    if (ext === 'c' || ext === 'cpp' || ext === 'h' || ext === 'hpp') return 'cpp'
    if (ext === 'php') return 'php'
    if (ext === 'rb' || ext === 'ruby') return 'ruby'
    return null
}

export class PreviewService {
    private renderEmExecucao: boolean = false
    private ultimoPedido: RenderRequest | null = null

    constructor(
        private renderer: PreviewRenderer,
        private logger: LoggerInterface
    ) {}

    requestRender(
        container: HTMLElement,
        markdown: string,
        docName: string = ''
    ): void {
        this.ultimoPedido = { container, markdown, docName }
        if (this.renderEmExecucao) return
        void this.processarFila()
    }

    private async processarFila(): Promise<void> {
        this.renderEmExecucao = true
        try {
            while (this.ultimoPedido) {
                const pedido = this.ultimoPedido
                this.ultimoPedido = null
                await this.renderizar(pedido)
            }
        } finally {
            this.renderEmExecucao = false
        }
    }

    private preprocessar(markdown: string, docName: string): string {
        const ext = obterExtensaoDocumento(docName)
        const fence = obterFencePorExtensao(ext)
        if (!fence) return markdown
        return `\`\`\`${fence}\n${markdown}\n\`\`\``
    }

    private async renderizar(pedido: RenderRequest): Promise<void> {
        if (!pedido.container) return

        const content = this.preprocessar(pedido.markdown, pedido.docName)
        const html = processMarkdown(content)

        await this.renderer.renderPreview(pedido.container, html)

        const estimatedPages = estimatePageCount(html)
        this.logger.log(`Renderizado em ~${estimatedPages} pagina(s) A4`, 'info')
    }
}

