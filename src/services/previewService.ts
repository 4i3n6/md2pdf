import { processMarkdown, estimatePageCount } from '@/processors/markdownProcessor'
import { preprocessMarkdownForPreview } from '@/services/markdownPreprocessService'
import type { LoggerInterface } from '@/types/index'

interface PreviewRenderer {
    renderPreview(container: HTMLElement, html: string): Promise<void>
}

type RenderRequest = {
    container: HTMLElement
    markdown: string
    docName: string
}

function requestsAreEqual(a: RenderRequest, b: RenderRequest): boolean {
    return a.container === b.container && a.markdown === b.markdown && a.docName === b.docName
}

export class PreviewService {
    private renderInProgress: boolean = false
    private latestRequest: RenderRequest | null = null
    private lastPageEstimate: number | null = null
    private lastEstimateLogTs: number = 0
    private lastProcessedMarkdown: string | null = null
    private lastProcessedHtml: string = ''

    constructor(
        private renderer: PreviewRenderer,
        private logger: LoggerInterface
    ) {}

    requestRender(
        container: HTMLElement,
        markdown: string,
        docName: string = ''
    ): void {
        const nextRequest: RenderRequest = { container, markdown, docName }
        if (this.latestRequest && requestsAreEqual(this.latestRequest, nextRequest)) {
            return
        }

        this.latestRequest = nextRequest
        if (this.renderInProgress) return
        void this.processQueue()
    }

    private async processQueue(): Promise<void> {
        this.renderInProgress = true
        try {
            while (this.latestRequest) {
                const request = this.latestRequest
                this.latestRequest = null
                await this.render(request)
            }
        } finally {
            this.renderInProgress = false
        }
    }

    private async render(request: RenderRequest): Promise<void> {
        if (!request.container || !request.container.isConnected) return

        const content = preprocessMarkdownForPreview(request.markdown, request.docName)
        const html = this.getRenderedHtml(content)

        await this.renderer.renderPreview(request.container, html)

        const estimatedPages = estimatePageCount(html)
        this.logPageEstimate(estimatedPages)
    }

    private getRenderedHtml(preprocessedMarkdown: string): string {
        if (this.lastProcessedMarkdown === preprocessedMarkdown) {
            return this.lastProcessedHtml
        }

        const html = processMarkdown(preprocessedMarkdown)
        this.lastProcessedMarkdown = preprocessedMarkdown
        this.lastProcessedHtml = html
        return html
    }

    private logPageEstimate(estimatedPages: number): void {
        const now = Date.now()
        const estimateChanged = this.lastPageEstimate !== estimatedPages
        const logWindowElapsed = now - this.lastEstimateLogTs >= 2000

        if (!estimateChanged && !logWindowElapsed) {
            return
        }

        this.lastPageEstimate = estimatedPages
        this.lastEstimateLogTs = now
        this.logger.log(`Rendered in ~${estimatedPages} A4 page(s)`, 'info')
    }
}
