import { obterFencePreviewPorNome } from '@/services/documentLanguageService'

export function preprocessarMarkdownParaPreview(markdown: string, docName: string): string {
    const fence = obterFencePreviewPorNome(docName)
    if (!fence) return markdown
    return `\`\`\`${fence}\n${markdown}\n\`\`\``
}
