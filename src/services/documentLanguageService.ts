const markdownExtensions = new Set(['', 'md', 'markdown', 'txt'])

const fencesByExtension: Record<string, string> = {
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

const codeLanguageAliases: Record<string, string> = {
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

export function getFileExtension(name?: string): string {
    const source = (name || '').trim()
    const parts = source.split('.')
    if (parts.length < 2) return ''
    return (parts.pop() || '').toLowerCase().trim()
}

export function isMarkdownByName(name?: string): boolean {
    return markdownExtensions.has(getFileExtension(name))
}

export function getEditorModeByName(name?: string): string {
    if (isMarkdownByName(name)) return 'markdown'
    const ext = getFileExtension(name)
    return ext || 'plaintext'
}

export function getFencePreviewByName(name?: string): string | null {
    const ext = getFileExtension(name)
    return fencesByExtension[ext] || null
}

export function normalizeCodeLanguage(rawName?: string): string {
    const parts = (rawName || 'plaintext')
        .toLowerCase()
        .trim()
        .split(/\s+/)
    const raw = parts[0] || 'plaintext'
    const normalized = raw.replace(/[^a-z0-9#+.-]/g, '')

    if (!normalized) return 'plaintext'

    return codeLanguageAliases[normalized] || normalized
}
