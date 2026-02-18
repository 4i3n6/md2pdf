/**
 * MODAL SERVICE
 *
 * Substitui confirm() nativo por modais customizados que:
 * - Respeitam o design system (variáveis CSS do projeto)
 * - Suportam navegação por teclado (Enter = confirmar, Escape = cancelar)
 * - São acessíveis (role=dialog, aria-modal, foco gerenciado)
 * - Retornam Promise<boolean> — mesma semântica do confirm()
 */

export type ModalVariant = 'danger' | 'warning' | 'info'

export interface ModalOptions {
    titulo: string
    mensagem: string
    textoBotaoConfirmar?: string
    textoBotaoCancelar?: string
    variante?: ModalVariant
}

const CSS_MODAL = `
.md2pdf-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: md2pdf-fade-in 0.12s ease;
}

@keyframes md2pdf-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
}

.md2pdf-modal {
    background: var(--bg-core, #ffffff);
    border: 1px solid var(--border, #d1d5db);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18), 0 4px 8px rgba(0, 0, 0, 0.08);
    width: 420px;
    max-width: calc(100vw - 32px);
    font-family: var(--font-mono, monospace);
    animation: md2pdf-slide-in 0.14s ease;
}

@keyframes md2pdf-slide-in {
    from { transform: translateY(-12px); opacity: 0; }
    to   { transform: translateY(0);     opacity: 1; }
}

.md2pdf-modal-header {
    padding: 14px 16px 12px;
    border-bottom: 1px solid var(--border, #d1d5db);
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--bg-panel, #f3f4f6);
}

.md2pdf-modal-icon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
    flex-shrink: 0;
    color: #ffffff;
}

.md2pdf-modal-icon.danger  { background: var(--error,   #ae0a04); }
.md2pdf-modal-icon.warning { background: #b45309; }
.md2pdf-modal-icon.info    { background: var(--accent,  #0052cc); }

.md2pdf-modal-titulo {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-main, #111827);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.md2pdf-modal-body {
    padding: 20px 16px;
    font-size: 12px;
    color: var(--text-main, #111827);
    line-height: 1.6;
    white-space: pre-wrap;
}

.md2pdf-modal-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--border, #d1d5db);
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    background: var(--bg-panel, #f3f4f6);
}

.md2pdf-modal-btn {
    background: var(--bg-core, #ffffff);
    color: var(--text-main, #111827);
    border: 1px solid var(--border, #d1d5db);
    padding: 6px 14px;
    font-family: var(--font-mono, monospace);
    font-weight: 600;
    font-size: 11px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: all 0.1s;
}

.md2pdf-modal-btn:hover {
    background: var(--bg-panel, #f3f4f6);
    border-color: var(--text-main, #111827);
}

.md2pdf-modal-btn:focus-visible {
    outline: 3px solid var(--accent, #0052cc);
    outline-offset: 2px;
}

.md2pdf-modal-btn.confirmar.danger {
    background: var(--error, #ae0a04);
    color: #ffffff;
    border-color: var(--error, #ae0a04);
}
.md2pdf-modal-btn.confirmar.danger:hover {
    background: #8b0000;
    border-color: #8b0000;
}

.md2pdf-modal-btn.confirmar.warning {
    background: #b45309;
    color: #ffffff;
    border-color: #b45309;
}
.md2pdf-modal-btn.confirmar.warning:hover {
    background: #92400e;
    border-color: #92400e;
}

.md2pdf-modal-btn.confirmar.info {
    background: var(--accent, #0052cc);
    color: #ffffff;
    border-color: var(--accent, #0052cc);
}
.md2pdf-modal-btn.confirmar.info:hover {
    background: #003d99;
    border-color: #003d99;
}
`

let estilosInjetados = false

function injetarEstilos(): void {
    if (estilosInjetados) return
    const style = document.createElement('style')
    style.id = 'md2pdf-modal-styles'
    style.textContent = CSS_MODAL
    document.head.appendChild(style)
    estilosInjetados = true
}

function obterIconeVariante(variante: ModalVariant): string {
    if (variante === 'danger') return '!'
    if (variante === 'warning') return '!'
    return 'i'
}

/**
 * Exibe um modal de confirmação customizado.
 *
 * @param opcoes - Configuração do modal
 * @returns Promise<boolean> — true se confirmado, false se cancelado
 *
 * @example
 *   const ok = await confirmar({
 *     titulo: 'Deletar documento',
 *     mensagem: 'Tem certeza?',
 *     variante: 'danger'
 *   })
 *   if (ok) { ... }
 */
export function confirmar(opcoes: ModalOptions): Promise<boolean> {
    return new Promise((resolve) => {
        injetarEstilos()

        const variante = opcoes.variante ?? 'info'
        const textoBotaoConfirmar = opcoes.textoBotaoConfirmar ?? 'Confirmar'
        const textoBotaoCancelar = opcoes.textoBotaoCancelar ?? 'Cancelar'

        // ── Overlay ────────────────────────────────────────────────────────
        const overlay = document.createElement('div')
        overlay.className = 'md2pdf-modal-overlay'
        overlay.setAttribute('role', 'dialog')
        overlay.setAttribute('aria-modal', 'true')
        overlay.setAttribute('aria-labelledby', 'md2pdf-modal-titulo')

        // ── Modal ──────────────────────────────────────────────────────────
        const modal = document.createElement('div')
        modal.className = 'md2pdf-modal'

        // Header
        const header = document.createElement('div')
        header.className = 'md2pdf-modal-header'

        const icone = document.createElement('div')
        icone.className = `md2pdf-modal-icon ${variante}`
        icone.textContent = obterIconeVariante(variante)
        icone.setAttribute('aria-hidden', 'true')

        const titulo = document.createElement('span')
        titulo.className = 'md2pdf-modal-titulo'
        titulo.id = 'md2pdf-modal-titulo'
        titulo.textContent = opcoes.titulo

        header.appendChild(icone)
        header.appendChild(titulo)

        // Body
        const body = document.createElement('div')
        body.className = 'md2pdf-modal-body'
        body.textContent = opcoes.mensagem

        // Footer
        const footer = document.createElement('div')
        footer.className = 'md2pdf-modal-footer'

        const btnCancelar = document.createElement('button')
        btnCancelar.className = 'md2pdf-modal-btn cancelar'
        btnCancelar.textContent = textoBotaoCancelar
        btnCancelar.type = 'button'

        const btnConfirmar = document.createElement('button')
        btnConfirmar.className = `md2pdf-modal-btn confirmar ${variante}`
        btnConfirmar.textContent = textoBotaoConfirmar
        btnConfirmar.type = 'button'

        footer.appendChild(btnCancelar)
        footer.appendChild(btnConfirmar)

        modal.appendChild(header)
        modal.appendChild(body)
        modal.appendChild(footer)
        overlay.appendChild(modal)

        // ── Limpeza e resolução ────────────────────────────────────────────
        const fechar = (resultado: boolean): void => {
            document.removeEventListener('keydown', onKeydown)
            overlay.remove()
            resolve(resultado)
        }

        // ── Eventos ────────────────────────────────────────────────────────
        btnCancelar.addEventListener('click', () => fechar(false))
        btnConfirmar.addEventListener('click', () => fechar(true))

        // Clicar fora do modal cancela
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) fechar(false)
        })

        const onKeydown = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') {
                e.preventDefault()
                fechar(false)
            }
            if (e.key === 'Enter') {
                e.preventDefault()
                fechar(true)
            }
        }
        document.addEventListener('keydown', onKeydown)

        // ── Montar no DOM e focar ──────────────────────────────────────────
        document.body.appendChild(overlay)
        btnConfirmar.focus()
    })
}
