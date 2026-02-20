import { describe, it, expect } from 'vitest'
import { validateMarkdown, getErrorDescription } from './markdownValidator'

describe('Orquestrador de Validacao (Markdown Validator)', () => {
    it('deve retornar valido para string vazia', () => {
        const result = validateMarkdown('')
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
    })

    it('deve identificar heading valido', () => {
        const result = validateMarkdown('# Titulo H1')
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
    })

    it('deve identificar erro em heading com nivel > 6', () => {
        const result = validateMarkdown('####### Nivel 7 invalido')
        expect(result.isValid).toBe(false)
        expect(result.errors[0].code).toBe('INVALID_HEADING_LEVEL')
    })

    it('deve identificar aviso em heading sem espaco', () => {
        const result = validateMarkdown('#SemEspaco')
        expect(result.warnings[0].code).toBe('HEADING_MISSING_SPACE')
        expect(result.isValid).toBe(true) // Ainda é válido, só tem aviso
    })

    it('deve validar links corretamente', () => {
        // Link valido
        let result = validateMarkdown('[Google](https://google.com)')
        expect(result.errors).toHaveLength(0)

        // Link vazio
        result = validateMarkdown('[]()')
        expect(result.errors[0].code).toBe('EMPTY_LINK')

        // Link sem texto
        result = validateMarkdown('[](https://google.com)')
        expect(result.errors[0].code).toBe('EMPTY_LINK_TEXT')

        // Link sem URL
        result = validateMarkdown('[Google]()')
        expect(result.errors[0].code).toBe('EMPTY_LINK_URL')
    })

    it('deve validar imagens', () => {
        // Imagem valida
        let result = validateMarkdown('![Logo](https://site.com/logo.png)')
        expect(result.errors).toHaveLength(0)

        // Imagem sem alt (warning)
        result = validateMarkdown('![](https://site.com/logo.png)')
        expect(result.warnings[0].code).toBe('MISSING_IMAGE_ALT')

        // Imagem sem src (erro)
        result = validateMarkdown('![Logo]()')
        expect(result.errors[0].code).toBe('EMPTY_IMAGE_SRC')
    })

    it('deve validar blocos de codigo nao fechados', () => {
        const markdown = `
\`\`\`javascript
const a = 1
`
        const result = validateMarkdown(markdown)
        expect(result.isValid).toBe(false)
        expect(result.errors[0].code).toBe('UNCLOSED_CODE_BLOCK')
    })

    it('deve validar formatacao inline desbalanceada', () => {
        // Backticks
        let result = validateMarkdown('Codigo `inline nao fechado')
        expect(result.warnings[0].code).toBe('UNBALANCED_BACKTICKS')

        // Bold/Italic
        result = validateMarkdown('Texto *negrito nao fechado')
        expect(result.warnings[0].code).toBe('UNBALANCED_EMPHASIS')
    })

    it('deve ignorar validacao dentro de blocos de codigo', () => {
        const markdown = `
\`\`\`
# Isso nao e um heading real
[Link](invalido)
\`\`\`
`
        const result = validateMarkdown(markdown)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
    })
})

describe('Utilitarios de Erro', () => {
    it('deve retornar descricao de erro conhecida', () => {
        const desc = getErrorDescription('INVALID_HEADING_LEVEL')
        expect(desc).toBe('Invalid heading level')
    })

    it('deve retornar mensagem padrao para erro desconhecido', () => {
        const desc = getErrorDescription('ERRO_MUITO_LOUCO')
        expect(desc).toBe('Unknown error')
    })
})
