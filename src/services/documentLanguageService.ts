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

const aliasesLinguagemCodigo: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    sh: 'bash',
    shell: 'bash',
    yml: 'yaml',
    md: 'markdown',
    text: 'plaintext',
    txt: 'plaintext',
    'c++': 'cpp',
    'c#': 'csharp',
    cs: 'csharp',
    ddl: 'sql',
    postgres: 'sql',
    postgresql: 'sql',
    psql: 'sql',
    htm: 'html',
    xhtml: 'xml'
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

export function normalizarLinguagemCodigo(nomeBruto?: string): string {
    const partes = (nomeBruto || 'plaintext')
        .toLowerCase()
        .trim()
        .split(/\s+/)
    const bruto = partes[0] || 'plaintext'
    const limpo = bruto.replace(/[^a-z0-9#+.-]/g, '')

    if (!limpo) return 'plaintext'

    return aliasesLinguagemCodigo[limpo] || limpo
}
