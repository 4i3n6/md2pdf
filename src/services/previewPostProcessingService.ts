import { processImagesInPreview } from '@/processors/markdownProcessor'
import { processMermaidDiagrams } from '@/processors/mermaidProcessor'
import { processYamlBlocks } from '@/processors/yamlProcessor'
import { processCryptoTruncationInTables } from '@/processors/cryptoTableTruncationProcessor'
import type { LoggerInterface } from '@/types/index'
import { runPipeline, type PipelineStage } from '@/utils/pipeline'

type PreviewPostProcessor = {
    execute: (container: HTMLElement) => Promise<number>
    successMessage: (count: number) => string
    errorMessage: string
}

type PreviewPostProcessingContext = {
    container: HTMLElement
    logger: LoggerInterface | undefined
}

const processors: PreviewPostProcessor[] = [
    {
        execute: (container) => processImagesInPreview(container, true),
        successMessage: (count) => `${count} image(s) optimized for A4`,
        errorMessage: 'Failed to process images'
    },
    {
        execute: processMermaidDiagrams,
        successMessage: (count) => `${count} Mermaid diagram(s) rendered`,
        errorMessage: 'Failed to process Mermaid diagrams'
    },
    {
        execute: processYamlBlocks,
        successMessage: (count) => `${count} YAML block(s) rendered`,
        errorMessage: 'Failed to process YAML blocks'
    },
    {
        execute: processCryptoTruncationInTables,
        successMessage: (count) => `${count} crypto value(s) truncated in table(s)`,
        errorMessage: 'Failed to truncate crypto values in tables'
    }
]

const postProcessingStages: PipelineStage<PreviewPostProcessingContext>[] = processors.map(
    (processor, idx) => ({
        id: `preview-post-processor-${idx + 1}`,
        run: async (ctx): Promise<void> => {
            const processed = await processor.execute(ctx.container)
            if (processed > 0) {
                ctx.logger?.log?.(processor.successMessage(processed), 'success')
            }
        },
        onError: (error, ctx): void => {
            ctx.logger?.error?.(`${processor.errorMessage}: ${String(error)}`)
        }
    })
)

export async function runPreviewPostProcessing(
    container: HTMLElement,
    logger?: LoggerInterface
): Promise<void> {
    await runPipeline({ container, logger }, postProcessingStages)
}
