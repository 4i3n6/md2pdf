/**
 * TEMA DO EDITOR CODEMIRROR
 *
 * Define a aparência visual do editor para o estilo "painel financeiro hacker"
 * (fundo branco, acentos em azul #0052cc, tipografia monoespaçada).
 *
 * Centralizado aqui para facilitar customização sem tocar em main.ts.
 * Para alterar cores, edite as constantes abaixo.
 */

import { EditorView } from 'codemirror'

// ─── Paleta de cores ────────────────────────────────────────────────────────
const cores = {
    /** Texto principal */
    texto: '#111827',
    /** Fundo do editor */
    fundo: '#ffffff',
    /** Cor de acento primária (cursor, linha ativa, links) */
    acento: '#0052cc',
    /** Fundo suave da linha ativa */
    linhaAtiva: '#f0f4ff',
    /** Fundo das calhas (gutters) */
    calha: '#f3f4f6',
    /** Texto das calhas */
    calhaTexto: '#4b5563',
    /** Borda das calhas */
    calhaBorda: '#d1d5db',
    /** Seleção de texto */
    selecao: '#3b82f6',
    /** Destaque de correspondência de seleção */
    correspondencia: '#fef08a',
    /** Texto de citação (blockquote) e calha */
    citacao: '#4b5563',
    /** Texto secundário / riscado */
    secundario: '#6b7280',
    /** Ênfase (itálico) */
    enfase: '#059669',
    /** Negrito */
    negrito: '#dc2626',
    /** Átomos / valores especiais */
    atomo: '#ae0a04',
} as const

// ─── Extensão de tema ────────────────────────────────────────────────────────
export const editorTheme = EditorView.theme({
    '&': {
        color: cores.texto,
        backgroundColor: cores.fundo,
    },
    '.cm-content': {
        caretColor: cores.acento,
    },
    '.cm-gutters': {
        backgroundColor: cores.calha,
        color: cores.calhaTexto,
        borderRight: `1px solid ${cores.calhaBorda}`,
    },
    '.cm-activeLine': {
        backgroundColor: cores.linhaAtiva,
    },
    '.cm-activeLineGutter': {
        color: cores.acento,
        backgroundColor: cores.linhaAtiva,
        fontWeight: '600',
    },
    '.cm-cursor': {
        borderLeftColor: cores.acento,
    },
    '.cm-selectionBackground': {
        backgroundColor: `${cores.selecao} !important`,
    },
    '&.cm-focused .cm-selectionBackground': {
        backgroundColor: `${cores.selecao} !important`,
    },
    '.cm-selectionMatch': {
        backgroundColor: cores.correspondencia,
    },
    // ── Markdown-specific ──────────────────────────────────────────────────
    '.cm-heading': {
        color: cores.texto,
        fontWeight: '700',
    },
    '.cm-heading1': { fontSize: '130%' },
    '.cm-heading2': { fontSize: '120%' },
    '.cm-heading3': { fontSize: '110%' },
    '.cm-emphasis': {
        fontStyle: 'italic',
        color: cores.enfase,
    },
    '.cm-strong': {
        fontWeight: 'bold',
        color: cores.negrito,
    },
    '.cm-link': {
        color: cores.acento,
        textDecoration: 'underline',
    },
    '.cm-atom': {
        color: cores.atomo,
    },
    '.cm-quote': {
        color: cores.citacao,
        fontStyle: 'italic',
    },
    '.cm-strikethrough': {
        textDecoration: 'line-through',
        color: cores.secundario,
    },
})
