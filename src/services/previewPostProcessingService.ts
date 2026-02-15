import { processImagesInPreview } from '@/processors/markdownProcessor'
import { processMermaidDiagrams } from '@/processors/mermaidProcessor'
import { processYamlBlocks } from '@/processors/yamlProcessor'
import { processCryptoTruncationInTables } from '@/processors/cryptoTableTruncationProcessor'
import type { LoggerInterface } from '@/types/index'
import { runPipeline, type PipelineStage } from '@/utils/pipeline'

type PreviewPosProcessador = {
    executar: (container: HTMLElement) => Promise<number>
    mensagemSucesso: (quantidade: number) => string
    mensagemErro: string
}

type PreviewPosProcessamentoContexto = {
    container: HTMLElement
    logger: LoggerInterface | undefined
}

const processadores: PreviewPosProcessador[] = [
    {
        executar: (container) => processImagesInPreview(container, true),
        mensagemSucesso: (quantidade) => `${quantidade} imagem(ns) otimizada(s) para A4`,
        mensagemErro: 'Erro ao processar imagens'
    },
    {
        executar: processMermaidDiagrams,
        mensagemSucesso: (quantidade) => `${quantidade} diagrama(s) Mermaid renderizado(s)`,
        mensagemErro: 'Erro ao processar diagramas Mermaid'
    },
    {
        executar: processYamlBlocks,
        mensagemSucesso: (quantidade) => `${quantidade} bloco(s) YAML renderizado(s)`,
        mensagemErro: 'Erro ao processar blocos YAML'
    },
    {
        executar: processCryptoTruncationInTables,
        mensagemSucesso: (quantidade) => `${quantidade} valor(es) cripto truncado(s) em tabela(s)`,
        mensagemErro: 'Erro ao truncar valores cripto em tabelas'
    }
]

const etapasPosProcessamento: PipelineStage<PreviewPosProcessamentoContexto>[] = processadores.map(
    (processador, idx) => ({
        id: `preview-pos-processador-${idx + 1}`,
        run: async (contexto): Promise<void> => {
            const processados = await processador.executar(contexto.container)
            if (processados > 0) {
                contexto.logger?.log?.(processador.mensagemSucesso(processados), 'success')
            }
        },
        onError: (erro, contexto): void => {
            contexto.logger?.error?.(`${processador.mensagemErro}: ${String(erro)}`)
        }
    })
)

export async function executarPosProcessamentoPreview(
    container: HTMLElement,
    logger?: LoggerInterface
): Promise<void> {
    await runPipeline({ container, logger }, etapasPosProcessamento)
}
