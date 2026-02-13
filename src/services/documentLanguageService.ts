const extensoesMarkdown = new Set(['', 'md', 'markdown', 'txt'])

const fencesPreviewPorExtensao: Record<string, string> = {
    sql: 'sql',
    ddl: 'sql',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    js: 'javascript',
    javascript: 'javascript',
    ts: 'typescript',
    typescript: 'typescript',
    css: 'css',
    html: 'html',
    htm: 'html',
    xml: 'xml',
    sh: 'bash',
    bash: 'bash',
    py: 'python',
    python: 'python',
    go: 'go',
    rs: 'rust',
    rust: 'rust',
    java: 'java',
    c: 'cpp',
    cpp: 'cpp',
    h: 'cpp',
    hpp: 'cpp',
    php: 'php',
    rb: 'ruby',
    ruby: 'ruby'
}

export function obterExtensaoDocumentoArquivo(nome?: string): string {
    const origem = (nome || '').trim()
    const partes = origem.split('.')
    if (partes.length < 2) return ''
    return (partes.pop() || '').toLowerCase().trim()
}

export function documentoEhMarkdownPorNome(nome?: string): boolean {
    return extensoesMarkdown.has(obterExtensaoDocumentoArquivo(nome))
}

export function obterModoEditorPorNome(nome?: string): string {
    if (documentoEhMarkdownPorNome(nome)) return 'markdown'
    const ext = obterExtensaoDocumentoArquivo(nome)
    return ext || 'plaintext'
}

export function obterFencePreviewPorNome(nome?: string): string | null {
    const ext = obterExtensaoDocumentoArquivo(nome)
    return fencesPreviewPorExtensao[ext] || null
}
