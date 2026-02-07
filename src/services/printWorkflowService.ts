import { validatePrintContent, printDocument } from '@/utils/printUtils'
import { createReporter } from '@/utils/printReporter'
import type { Document, LoggerInterface } from '@/types/index'

type PrintWorkflowDeps = {
    logger: LoggerInterface
    getCurrentDoc: () => Document | undefined
}

export function createPrintWorkflowService(deps: PrintWorkflowDeps) {
    async function imprimirDocumentoAtual(): Promise<void> {
        try {
            deps.logger.log('Validando conteudo para impressao...')

            const preview = document.getElementById('preview')
            if (!preview) {
                deps.logger.error('Preview nao encontrado')
                return
            }

            const validation = await validatePrintContent(preview)

            if (validation.issues.length > 0) {
                validation.issues.forEach((issue): void => deps.logger.log(issue, 'warning'))
            }

            const doc = deps.getCurrentDoc()
            const reporter = createReporter(preview.innerHTML, doc?.name || 'document')
            const checklist = reporter.generateChecklist()

            deps.logger.log('=== PRE-IMPRESSAO ===', 'info')
            checklist.checks.forEach((check): void => deps.logger.log(check, 'success'))
            checklist.warnings.forEach((warn): void => deps.logger.log(warn, 'warning'))

            const stats = reporter.analyze()
            deps.logger.log(
                `${stats.estimatedPages}pp | ${stats.words} palavras | ~${stats.readingTime}min`
            )

            deps.logger.log('Abrindo dialogo de impressao...')
            const success = await printDocument(doc?.name || 'document', (msg: string): void =>
                deps.logger.log(msg)
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

