import { validatePrintContent, printDocument, type ValidationResult } from '@/utils/printUtils'
import { createReporter } from '@/utils/printReporter'
import type { Document, LoggerInterface } from '@/types/index'
import { runPipeline, type PipelineStage } from '@/utils/pipeline'

type PrintWorkflowContext = {
    preview: HTMLElement | null
    validation: ValidationResult | null
    docName: string
    sucesso: boolean
    abortar: boolean
}

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

    const etapasImpressao: PipelineStage<PrintWorkflowContext>[] = [
        {
            id: 'validacao-inicial',
            run: (contexto): void => {
                deps.logger.log('Validando conteudo para impressao...')
                contexto.preview = obterPreview()
                if (!contexto.preview) {
                    deps.logger.error('Preview nao encontrado')
                    contexto.abortar = true
                }
            }
        },
        {
            id: 'validar-preview',
            enabled: (contexto) => !contexto.abortar && !!contexto.preview,
            run: async (contexto): Promise<void> => {
                const validation = await validatePrintContent(contexto.preview as HTMLElement)
                contexto.validation = validation

                if (validation.issues.length > 0) {
                    validation.issues.forEach((issue): void => deps.logger.log(issue, 'warning'))
                }
            }
        },
        {
            id: 'gerar-relatorio-pre-impressao',
            enabled: (contexto) => !contexto.abortar && !!contexto.preview,
            run: (contexto): void => {
                const doc = deps.getCurrentDoc()
                contexto.docName = doc?.name || 'document'
                logarPreImpressao((contexto.preview as HTMLElement).innerHTML, contexto.docName)
            }
        },
        {
            id: 'abrir-dialogo-impressao',
            enabled: (contexto) =>
                !contexto.abortar && !!contexto.preview && !!contexto.validation,
            run: async (contexto): Promise<void> => {
                deps.logger.log('Abrindo dialogo de impressao...')
                const options = contexto.validation
                    ? {
                          previewElement: contexto.preview as HTMLElement,
                          validation: contexto.validation
                      }
                    : {
                          previewElement: contexto.preview as HTMLElement
                      }
                contexto.sucesso = await printDocument(
                    contexto.docName,
                    (msg: string): void => deps.logger.log(msg),
                    options
                )
            }
        },
        {
            id: 'log-final',
            enabled: (contexto) => !contexto.abortar && contexto.sucesso,
            run: (): void => {
                deps.logger.success('Impressao finalizada com sucesso')
            }
        }
    ]

    async function imprimirDocumentoAtual(): Promise<void> {
        try {
            const contexto: PrintWorkflowContext = {
                preview: null,
                validation: null,
                docName: 'document',
                sucesso: false,
                abortar: false
            }
            await runPipeline(contexto, etapasImpressao)
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e)
            deps.logger.error('Falha no fluxo de impressao: ' + errorMessage)
        }
    }

    return {
        imprimirDocumentoAtual
    }
}
