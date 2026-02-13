import { processImagesInPreview } from '@/processors/markdownProcessor'
import { processMermaidDiagrams } from '@/processors/mermaidProcessor'
import { processYamlBlocks } from '@/processors/yamlProcessor'
import type { LoggerInterface } from '@/types/index'

type PreviewPosProcessador = {
    executar: (container: HTMLElement) => Promise<number>
    mensagemSucesso: (quantidade: number) => string
    mensagemErro: string
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
    }
]

export async function executarPosProcessamentoPreview(
    container: HTMLElement,
    logger?: LoggerInterface
): Promise<void> {
    for (const processador of processadores) {
        try {
            const processados = await processador.executar(container)
            if (processados > 0) {
                logger?.log?.(processador.mensagemSucesso(processados), 'success')
            }
        } catch (e) {
            logger?.error?.(`${processador.mensagemErro}: ${String(e)}`)
        }
    }
}
