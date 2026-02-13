import { processMarkdown, estimatePageCount } from '@/processors/markdownProcessor'
import { preprocessarMarkdownParaPreview } from '@/services/markdownPreprocessService'
import type { LoggerInterface } from '@/types/index'

interface PreviewRenderer {
    renderPreview(container: HTMLElement, html: string): Promise<void>
}

type RenderRequest = {
    container: HTMLElement
    markdown: string
    docName: string
}

function pedidosIguais(a: RenderRequest, b: RenderRequest): boolean {
    return a.container === b.container && a.markdown === b.markdown && a.docName === b.docName
}

export class PreviewService {
    private renderEmExecucao: boolean = false
    private ultimoPedido: RenderRequest | null = null
    private ultimaEstimativaPaginas: number | null = null
    private ultimoLogEstimativaTs: number = 0
    private ultimoMarkdownProcessado: string | null = null
    private ultimoHtmlProcessado: string = ''

    constructor(
        private renderer: PreviewRenderer,
        private logger: LoggerInterface
    ) {}

    requestRender(
        container: HTMLElement,
        markdown: string,
        docName: string = ''
    ): void {
        const proximoPedido: RenderRequest = { container, markdown, docName }
        if (this.ultimoPedido && pedidosIguais(this.ultimoPedido, proximoPedido)) {
            return
        }

        this.ultimoPedido = proximoPedido
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

    private async renderizar(pedido: RenderRequest): Promise<void> {
        if (!pedido.container || !pedido.container.isConnected) return

        const content = preprocessarMarkdownParaPreview(pedido.markdown, pedido.docName)
        const html = this.obterHtmlRenderizado(content)

        await this.renderer.renderPreview(pedido.container, html)

        const estimatedPages = estimatePageCount(html)
        this.logarEstimativaPaginas(estimatedPages)
    }

    private obterHtmlRenderizado(markdownPreprocessado: string): string {
        if (this.ultimoMarkdownProcessado === markdownPreprocessado) {
            return this.ultimoHtmlProcessado
        }

        const html = processMarkdown(markdownPreprocessado)
        this.ultimoMarkdownProcessado = markdownPreprocessado
        this.ultimoHtmlProcessado = html
        return html
    }

    private logarEstimativaPaginas(estimatedPages: number): void {
        const agora = Date.now()
        const mudouEstimativa = this.ultimaEstimativaPaginas !== estimatedPages
        const passouJanelaLog = agora - this.ultimoLogEstimativaTs >= 2000

        if (!mudouEstimativa && !passouJanelaLog) {
            return
        }

        this.ultimaEstimativaPaginas = estimatedPages
        this.ultimoLogEstimativaTs = agora
        this.logger.log(`Renderizado em ~${estimatedPages} pagina(s) A4`, 'info')
    }
}
