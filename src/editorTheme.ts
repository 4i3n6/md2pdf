import { EditorView } from 'codemirror'

const colors = {
    text: '#111827',
    background: '#ffffff',
    accent: '#0052cc',
    activeLine: '#f0f4ff',
    gutter: '#f3f4f6',
    gutterText: '#4b5563',
    gutterBorder: '#d1d5db',
    selection: '#3b82f6',
    selectionMatch: '#fef08a',
    quote: '#4b5563',
    muted: '#6b7280',
    emphasis: '#059669',
    strong: '#dc2626',
    atom: '#ae0a04',
} as const

export const editorTheme = EditorView.theme({
    '&': {
        color: colors.text,
        backgroundColor: colors.background,
    },
    '.cm-content': {
        caretColor: colors.accent,
    },
    '.cm-gutters': {
        backgroundColor: colors.gutter,
        color: colors.gutterText,
        borderRight: `1px solid ${colors.gutterBorder}`,
    },
    '.cm-activeLine': {
        backgroundColor: colors.activeLine,
    },
    '.cm-activeLineGutter': {
        color: colors.accent,
        backgroundColor: colors.activeLine,
        fontWeight: '600',
    },
    '.cm-cursor': {
        borderLeftColor: colors.accent,
    },
    '.cm-selectionBackground': {
        backgroundColor: `${colors.selection} !important`,
    },
    '&.cm-focused .cm-selectionBackground': {
        backgroundColor: `${colors.selection} !important`,
    },
    '.cm-selectionMatch': {
        backgroundColor: colors.selectionMatch,
    },
    // ── Markdown-specific ──────────────────────────────────────────────────
    '.cm-heading': {
        color: colors.text,
        fontWeight: '700',
    },
    '.cm-heading1': { fontSize: '130%' },
    '.cm-heading2': { fontSize: '120%' },
    '.cm-heading3': { fontSize: '110%' },
    '.cm-emphasis': {
        fontStyle: 'italic',
        color: colors.emphasis,
    },
    '.cm-strong': {
        fontWeight: 'bold',
        color: colors.strong,
    },
    '.cm-link': {
        color: colors.accent,
        textDecoration: 'underline',
    },
    '.cm-atom': {
        color: colors.atom,
    },
    '.cm-quote': {
        color: colors.quote,
        fontStyle: 'italic',
    },
    '.cm-strikethrough': {
        textDecoration: 'line-through',
        color: colors.muted,
    },
})
