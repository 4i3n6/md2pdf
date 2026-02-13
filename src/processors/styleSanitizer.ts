import DOMPurify from 'dompurify'

const tagsComStylePermitido = new Set(['span', 'div', 'mark', 'figure', 'blockquote', 'th', 'td'])
const propriedadesStylePermitidasPorTag: Record<string, Set<string>> = {
    span: new Set(['font-family', 'color']),
    div: new Set(['text-align', 'page-break-inside', 'break-inside']),
    mark: new Set(['background', 'background-color', 'color']),
    figure: new Set(['page-break-inside', 'break-inside']),
    blockquote: new Set(['page-break-inside', 'break-inside']),
    th: new Set(['text-align']),
    td: new Set(['text-align'])
}

const regexCorCss = /^(#[0-9a-f]{3,8}|rgb(a)?\([^)]{1,40}\)|hsl(a)?\([^)]{1,40}\)|transparent|black|white)$/i
const regexFonteCss = /^[a-z0-9\s,'"-]+$/i

function sanitizarValorCss(propriedade: string, valorBruto: string): string | null {
    const valor = valorBruto.trim()
    if (!valor) return null

    if (/url\s*\(|expression\s*\(|@import|javascript:/i.test(valor)) {
        return null
    }

    if (propriedade === 'text-align') {
        if (/^(left|right|center|justify)$/i.test(valor)) {
            return valor.toLowerCase()
        }
        return null
    }

    if (propriedade === 'font-family') {
        if (valor.length <= 120 && regexFonteCss.test(valor)) {
            return valor
        }
        return null
    }

    if (propriedade === 'background' || propriedade === 'background-color' || propriedade === 'color') {
        if (regexCorCss.test(valor)) {
            return valor.toLowerCase()
        }
        return null
    }

    if (propriedade === 'page-break-inside' || propriedade === 'break-inside') {
        if (/^(auto|avoid|avoid-page)$/i.test(valor)) {
            return valor.toLowerCase()
        }
        return null
    }

    return null
}

function sanitizarStyleInline(tagName: string, styleBruto: string): string {
    if (!styleBruto || !tagName) return ''
    if (!tagsComStylePermitido.has(tagName)) return ''

    const propriedadesPermitidas = propriedadesStylePermitidasPorTag[tagName]
    if (!propriedadesPermitidas) return ''

    const regrasSanitizadas: string[] = []
    const declaracoes = styleBruto.split(';')

    declaracoes.forEach((declaracao) => {
        const idxSeparador = declaracao.indexOf(':')
        if (idxSeparador <= 0) return

        const propriedade = declaracao.slice(0, idxSeparador).trim().toLowerCase()
        const valor = declaracao.slice(idxSeparador + 1)

        if (!propriedadesPermitidas.has(propriedade)) {
            return
        }

        const valorSanitizado = sanitizarValorCss(propriedade, valor)
        if (!valorSanitizado) return

        regrasSanitizadas.push(`${propriedade}: ${valorSanitizado}`)
    })

    return regrasSanitizadas.join('; ')
}

type HookData = {
    attrName?: string
    attrValue?: string
    keepAttr?: boolean
}

let hooksDomPurifyRegistrados = false

export function registrarHooksSanitizacaoStyle(): void {
    if (hooksDomPurifyRegistrados) return

    DOMPurify.addHook('uponSanitizeAttribute', (node: Element, data: HookData) => {
        if (!data || data.attrName !== 'style') return

        const tagName = node?.tagName?.toLowerCase() || ''
        const valorSanitizado = sanitizarStyleInline(tagName, String(data.attrValue || ''))
        if (!valorSanitizado) {
            data.keepAttr = false
            return
        }

        data.attrValue = valorSanitizado
        data.keepAttr = true
    })

    hooksDomPurifyRegistrados = true
}
