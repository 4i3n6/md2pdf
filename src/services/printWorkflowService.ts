import { validatePrintContent, printDocument, type ValidationResult } from '@/utils/printUtils'
import { createReporter } from '@/utils/printReporter'
import type { Document, LoggerInterface } from '@/types/index'
import { runPipeline, type PipelineStage } from '@/utils/pipeline'

type PrintWorkflowContext = {
    preview: HTMLElement | null
    validation: ValidationResult | null
    docName: string
    success: boolean
    abort: boolean
}

type PrintWorkflowDeps = {
    logger: LoggerInterface
    getCurrentDoc: () => Document | undefined
}

export function createPrintWorkflowService(deps: PrintWorkflowDeps) {
    function getPreview(): HTMLElement | null {
        return document.getElementById('preview')
    }

    function logPrePrint(html: string, docName: string): void {
        const reporter = createReporter(html, docName)
        const checklist = reporter.generateChecklist()

        deps.logger.log('=== PRE-PRINT ===', 'info')
        checklist.checks.forEach((check) => { deps.logger.log(check, 'success') })
        checklist.warnings.forEach((warn) => { deps.logger.log(warn, 'warning') })

        const stats = reporter.analyze()
        deps.logger.log(
            `${stats.estimatedPages}pp | ${stats.words} words | ~${stats.readingTime}min`
        )
    }

    const printStages: PipelineStage<PrintWorkflowContext>[] = [
        {
            id: 'initial-validation',
            run: (ctx): void => {
                deps.logger.log('Validating content for print...')
                ctx.preview = getPreview()
                if (!ctx.preview) {
                    deps.logger.error('Preview element not found')
                    ctx.abort = true
                }
            }
        },
        {
            id: 'validate-preview',
            enabled: (ctx) => !ctx.abort && !!ctx.preview,
            run: async (ctx): Promise<void> => {
                const validation = await validatePrintContent(ctx.preview as HTMLElement)
                ctx.validation = validation

                if (validation.issues.length > 0) {
                    validation.issues.forEach((issue) => { deps.logger.log(issue, 'warning') })
                }
            }
        },
        {
            id: 'generate-pre-print-report',
            enabled: (ctx) => !ctx.abort && !!ctx.preview,
            run: (ctx): void => {
                const doc = deps.getCurrentDoc()
                ctx.docName = doc?.name || 'document'
                logPrePrint((ctx.preview as HTMLElement).innerHTML, ctx.docName)
            }
        },
        {
            id: 'open-print-dialog',
            enabled: (ctx) =>
                !ctx.abort && !!ctx.preview && !!ctx.validation,
            run: async (ctx): Promise<void> => {
                deps.logger.log('Opening print dialog...')
                const options = ctx.validation
                    ? {
                          previewElement: ctx.preview as HTMLElement,
                          validation: ctx.validation
                      }
                    : {
                          previewElement: ctx.preview as HTMLElement
                      }
                ctx.success = await printDocument(
                    ctx.docName,
                    (msg: string): void => deps.logger.log(msg),
                    options
                )
            }
        },
        {
            id: 'log-final',
            enabled: (ctx) => !ctx.abort && ctx.success,
            run: (): void => {
                deps.logger.success('Print completed successfully')
            }
        }
    ]

    async function printCurrentDocument(): Promise<void> {
        try {
            const ctx: PrintWorkflowContext = {
                preview: null,
                validation: null,
                docName: 'document',
                success: false,
                abort: false
            }
            await runPipeline(ctx, printStages)
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e)
            deps.logger.error('Print workflow failed: ' + errorMessage)
        }
    }

    return {
        printCurrentDocument
    }
}
