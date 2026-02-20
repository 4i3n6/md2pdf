import type { Extension } from '@codemirror/state'

const loadSql = async (): Promise<Extension> => {
    const { sql, PostgreSQL } = await import('@codemirror/lang-sql')
    return sql({ dialect: PostgreSQL })
}

const loadJson = async (): Promise<Extension> => {
    const { json } = await import('@codemirror/lang-json')
    return json()
}

const loadYaml = async (): Promise<Extension> => {
    const { yaml } = await import('@codemirror/lang-yaml')
    return yaml()
}

const loadJavaScript = async (
    config?: { jsx?: boolean; typescript?: boolean }
): Promise<Extension> => {
    const { javascript } = await import('@codemirror/lang-javascript')
    return javascript(config)
}

const loadCss = async (): Promise<Extension> => {
    const { css } = await import('@codemirror/lang-css')
    return css()
}

const loadHtml = async (): Promise<Extension> => {
    const { html } = await import('@codemirror/lang-html')
    return html()
}

const loadXml = async (): Promise<Extension> => {
    const { xml } = await import('@codemirror/lang-xml')
    return xml()
}

const loadShell = async (): Promise<Extension> => {
    const [{ StreamLanguage }, { shell }] = await Promise.all([
        import('@codemirror/language'),
        import('@codemirror/legacy-modes/mode/shell')
    ])
    return StreamLanguage.define(shell)
}

const loadPython = async (): Promise<Extension> => {
    const { python } = await import('@codemirror/lang-python')
    return python()
}

const loadGo = async (): Promise<Extension> => {
    const { go } = await import('@codemirror/lang-go')
    return go()
}

const loadRust = async (): Promise<Extension> => {
    const { rust } = await import('@codemirror/lang-rust')
    return rust()
}

const loadJava = async (): Promise<Extension> => {
    const { java } = await import('@codemirror/lang-java')
    return java()
}

const loadCpp = async (): Promise<Extension> => {
    const { cpp } = await import('@codemirror/lang-cpp')
    return cpp()
}

const loadPhp = async (): Promise<Extension> => {
    const { php } = await import('@codemirror/lang-php')
    return php()
}

const loadRuby = async (): Promise<Extension> => {
    const [{ StreamLanguage }, { ruby }] = await Promise.all([
        import('@codemirror/language'),
        import('@codemirror/legacy-modes/mode/ruby')
    ])
    return StreamLanguage.define(ruby)
}

export const languageLoaders: Record<string, () => Promise<Extension>> = {
    sql: loadSql,
    ddl: loadSql,
    json: loadJson,
    yaml: loadYaml,
    yml: loadYaml,
    js: () => loadJavaScript(),
    javascript: () => loadJavaScript(),
    jsx: () => loadJavaScript({ jsx: true }),
    ts: () => loadJavaScript({ typescript: true }),
    typescript: () => loadJavaScript({ typescript: true }),
    tsx: () => loadJavaScript({ typescript: true, jsx: true }),
    css: loadCss,
    html: loadHtml,
    htm: loadHtml,
    xml: loadXml,
    bash: loadShell,
    sh: loadShell,
    shell: loadShell,
    py: loadPython,
    python: loadPython,
    go: loadGo,
    rs: loadRust,
    rust: loadRust,
    java: loadJava,
    c: loadCpp,
    cpp: loadCpp,
    h: loadCpp,
    hpp: loadCpp,
    php: loadPhp,
    rb: loadRuby,
    ruby: loadRuby
}

