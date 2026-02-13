const cercasPorExtensao: Record<string, string> = {
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

function obterExtensaoDocumento(nome: string): string {
    const origem = (nome || '').trim()
    const partes = origem.split('.')
    if (partes.length < 2) return ''
    return (partes.pop() || '').toLowerCase().trim()
}

export function preprocessarMarkdownParaPreview(markdown: string, docName: string): string {
    const ext = obterExtensaoDocumento(docName)
    const fence = cercasPorExtensao[ext]
    if (!fence) return markdown
    return `\`\`\`${fence}\n${markdown}\n\`\`\``
}
