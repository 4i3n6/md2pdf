import type { Extension } from '@codemirror/state'

const carregarSql = async (): Promise<Extension> => {
    const { sql, PostgreSQL } = await import('@codemirror/lang-sql')
    return sql({ dialect: PostgreSQL })
}

const carregarJson = async (): Promise<Extension> => {
    const { json } = await import('@codemirror/lang-json')
    return json()
}

const carregarYaml = async (): Promise<Extension> => {
    const { yaml } = await import('@codemirror/lang-yaml')
    return yaml()
}

const carregarJavaScript = async (
    config?: { jsx?: boolean; typescript?: boolean }
): Promise<Extension> => {
    const { javascript } = await import('@codemirror/lang-javascript')
    return javascript(config)
}

const carregarCss = async (): Promise<Extension> => {
    const { css } = await import('@codemirror/lang-css')
    return css()
}

const carregarHtml = async (): Promise<Extension> => {
    const { html } = await import('@codemirror/lang-html')
    return html()
}

const carregarXml = async (): Promise<Extension> => {
    const { xml } = await import('@codemirror/lang-xml')
    return xml()
}

const carregarShell = async (): Promise<Extension> => {
    const [{ StreamLanguage }, { shell }] = await Promise.all([
        import('@codemirror/language'),
        import('@codemirror/legacy-modes/mode/shell')
    ])
    return StreamLanguage.define(shell)
}

const carregarPython = async (): Promise<Extension> => {
    const { python } = await import('@codemirror/lang-python')
    return python()
}

const carregarGo = async (): Promise<Extension> => {
    const { go } = await import('@codemirror/lang-go')
    return go()
}

const carregarRust = async (): Promise<Extension> => {
    const { rust } = await import('@codemirror/lang-rust')
    return rust()
}

const carregarJava = async (): Promise<Extension> => {
    const { java } = await import('@codemirror/lang-java')
    return java()
}

const carregarCpp = async (): Promise<Extension> => {
    const { cpp } = await import('@codemirror/lang-cpp')
    return cpp()
}

const carregarPhp = async (): Promise<Extension> => {
    const { php } = await import('@codemirror/lang-php')
    return php()
}

const carregarRuby = async (): Promise<Extension> => {
    const [{ StreamLanguage }, { ruby }] = await Promise.all([
        import('@codemirror/language'),
        import('@codemirror/legacy-modes/mode/ruby')
    ])
    return StreamLanguage.define(ruby)
}

export const carregadoresLinguagem: Record<string, () => Promise<Extension>> = {
    sql: carregarSql,
    ddl: carregarSql,
    json: carregarJson,
    yaml: carregarYaml,
    yml: carregarYaml,
    js: () => carregarJavaScript(),
    javascript: () => carregarJavaScript(),
    jsx: () => carregarJavaScript({ jsx: true }),
    ts: () => carregarJavaScript({ typescript: true }),
    typescript: () => carregarJavaScript({ typescript: true }),
    tsx: () => carregarJavaScript({ typescript: true, jsx: true }),
    css: carregarCss,
    html: carregarHtml,
    htm: carregarHtml,
    xml: carregarXml,
    bash: carregarShell,
    sh: carregarShell,
    shell: carregarShell,
    py: carregarPython,
    python: carregarPython,
    go: carregarGo,
    rs: carregarRust,
    rust: carregarRust,
    java: carregarJava,
    c: carregarCpp,
    cpp: carregarCpp,
    h: carregarCpp,
    hpp: carregarCpp,
    php: carregarPhp,
    rb: carregarRuby,
    ruby: carregarRuby
}

