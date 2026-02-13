import { validatePrintContent, printDocument } from '@/utils/printUtils'
import { createReporter } from '@/utils/printReporter'
import type { Document, LoggerInterface } from '@/types/index'

type PrintWorkflowDeps = {
    logger: LoggerInterface
    getCurrentDoc: () => Document | undefined
}

export function createPrintWorkflowService(deps: PrintWorkflowDeps) {
    function obterPreview(): HTMLElement | null {
        return document.getElementById('preview')
    }

    function logarPreImpressao(html: string, docName: string): void {
        const reporter = createReporter(html, docName)
        const checklist = reporter.generateChecklist()

        deps.logger.log('=== PRE-IMPRESSAO ===', 'info')
        checklist.checks.forEach((check): void => deps.logger.log(check, 'success'))
        checklist.warnings.forEach((warn): void => deps.logger.log(warn, 'warning'))

        const stats = reporter.analyze()
        deps.logger.log(
            `${stats.estimatedPages}pp | ${stats.words} palavras | ~${stats.readingTime}min`
        )
    }

    async function imprimirDocumentoAtual(): Promise<void> {
        try {
            deps.logger.log('Validando conteudo para impressao...')

            const preview = obterPreview()
            if (!preview) {
                deps.logger.error('Preview nao encontrado')
                return
            }

            const validation = await validatePrintContent(preview)

            if (validation.issues.length > 0) {
                validation.issues.forEach((issue): void => deps.logger.log(issue, 'warning'))
            }

            const doc = deps.getCurrentDoc()
            const docName = doc?.name || 'document'
            logarPreImpressao(preview.innerHTML, docName)

            deps.logger.log('Abrindo dialogo de impressao...')
            const success = await printDocument(
                docName,
                (msg: string): void => deps.logger.log(msg),
                { previewElement: preview, validation }
            )

            if (success) {
                deps.logger.success('Impressao finalizada com sucesso')
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e)
            deps.logger.error('Falha no fluxo de impressao: ' + errorMessage)
        }
    }

    return {
        imprimirDocumentoAtual
    }
}
