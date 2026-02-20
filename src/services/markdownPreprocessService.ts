import { getFencePreviewByName } from '@/services/documentLanguageService'

export function preprocessMarkdownForPreview(markdown: string, docName: string): string {
    const fence = getFencePreviewByName(docName)
    if (!fence) return markdown
    return `\`\`\`${fence}\n${markdown}\n\`\`\``
}
