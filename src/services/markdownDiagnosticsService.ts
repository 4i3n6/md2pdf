import { EditorView } from 'codemirror'
import { Decoration, hoverTooltip } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'
import { validateMarkdown, type MarkdownError } from '@/processors/markdownValidator'
import type { LoggerInterface } from '@/types/index'

type MarkdownDiagnosticsDeps = {
    logger: LoggerInterface
    getEditorView: () => EditorView | null
    isMarkdownDocument: () => boolean
}

function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

function findIssueAtPosition(pos: number, issues: MarkdownError[], content: string): MarkdownError | null {
    const lines = content.split('\n')
    let charIndex = 0

    for (let i = 0; i < lines.length; i++) {
        const lineStart = charIndex
        const lineEnd = charIndex + (lines[i]?.length ?? 0)

        if (pos >= lineStart && pos <= lineEnd) {
            return issues.find(issue => issue.line === i + 1) || null
        }
        charIndex = lineEnd + 1
    }
    return null
}

export function createMarkdownDiagnosticsService(deps: MarkdownDiagnosticsDeps) {
    const updateDecorationsEffect = StateEffect.define<any>()

    const decorationsField = StateField.define({
        create() {
            return Decoration.none
        },

        update(decorations, tr) {
            for (const effect of tr.effects) {
                if (effect.is(updateDecorationsEffect)) {
                    return effect.value
                }
            }
            return decorations.map(tr.changes)
        },

        provide(f) {
            return EditorView.decorations.from(f)
        }
    })

    let currentIssues: MarkdownError[] = []

    const hoverTooltipExtension = hoverTooltip((view, pos) => {
        const content = view.state.doc.toString()
        const issue = findIssueAtPosition(pos, currentIssues, content)

        if (!issue) return null

        return {
            pos,
            above: true,
            create() {
                const dom = document.createElement('div')
                dom.className = 'md-tooltip'

                const icon = issue.severity === 'error' ? 'X' :
                    issue.severity === 'warning' ? '!' : 'i'
                const iconClass = `md-tooltip-icon md-tooltip-icon-${issue.severity}`

                let html = `
        <div class="md-tooltip-header">
          <span class="${iconClass}">${icon}</span>
          <span class="md-tooltip-message">${escapeHtml(issue.message)}</span>
        </div>
      `

                if (issue.suggestion) {
                    html += `
          <div class="md-tooltip-suggestion">
            <span class="md-tooltip-suggestion-label">Sugestao:</span>
            <code class="md-tooltip-suggestion-code">${escapeHtml(issue.suggestion)}</code>
          </div>
        `
                }

                dom.innerHTML = html
                return { dom }
            }
        }
    })

    function navigateToIssue(issue: MarkdownError): void {
        const editor = deps.getEditorView()
        if (!editor) return

        const content = editor.state.doc.toString()
        const lines = content.split('\n')

        let pos = 0
        for (let i = 0; i < issue.line - 1 && i < lines.length; i++) {
            pos += (lines[i]?.length ?? 0) + 1
        }
        pos += Math.max(0, issue.column - 1)

        editor.dispatch({
            selection: { anchor: pos },
            scrollIntoView: true
        })
        editor.focus()

        deps.logger.log(`Navegado para linha ${issue.line}, coluna ${issue.column}`)
    }

    function applyFix(issue: MarkdownError): void {
        const editor = deps.getEditorView()
        if (!editor || !issue.suggestion) return

        const content = editor.state.doc.toString()
        const lines = content.split('\n')

        let lineStart = 0
        for (let i = 0; i < issue.line - 1 && i < lines.length; i++) {
            lineStart += (lines[i]?.length ?? 0) + 1
        }

        const currentLine = lines[issue.line - 1] || ''
        const lineEnd = lineStart + currentLine.length

        let from: number
        let to: number
        let insert: string

        if (issue.suggestionRange?.from === -1) {
            from = content.length
            to = content.length
            insert = '\n' + issue.suggestion
        } else if (issue.suggestionRange) {
            from = lineStart
            to = lineEnd
            insert = issue.suggestion
        } else {
            from = lineStart
            to = lineEnd
            insert = issue.suggestion
        }

        editor.dispatch({
            changes: { from, to, insert }
        })

        deps.logger.success(`Correcao aplicada na linha ${issue.line}`)
    }

    function renderProblemsPanel(issues: MarkdownError[]): void {
        const panel = document.getElementById('problems-panel')
        const countEl = document.getElementById('problems-count')

        if (!panel || !countEl) return

        const total = issues.length
        countEl.textContent = `(${total})`
        countEl.className = `problems-badge ${total > 0 ? 'has-problems' : ''}`

        panel.innerHTML = ''

        if (total === 0) {
            panel.innerHTML = '<div class="problems-empty">Nenhum problema detectado</div>'
            return
        }

        issues.forEach((issue, index) => {
            const item = document.createElement('div')
            item.className = `problem-item problem-${issue.severity}`
            item.setAttribute('role', 'listitem')
            item.setAttribute('tabindex', '0')

            const icon = issue.severity === 'error' ? 'X' :
                issue.severity === 'warning' ? '!' : 'i'

            let html = `
      <span class="problem-icon">${icon}</span>
      <span class="problem-location">Ln ${issue.line}</span>
      <span class="problem-message">${escapeHtml(issue.message)}</span>
    `

            if (issue.suggestion) {
                html += `<button class="problem-fix-btn" data-index="${index}" title="Aplicar correcao">[FIX]</button>`
            }

            item.innerHTML = html

            item.addEventListener('click', (e) => {
                if ((e.target as HTMLElement).classList.contains('problem-fix-btn')) {
                    const idx = parseInt((e.target as HTMLElement).dataset['index'] || '0')
                    const issueToFix = issues[idx]
                    if (issueToFix) {
                        applyFix(issueToFix)
                    }
                    return
                }
                navigateToIssue(issue)
            })

            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigateToIssue(issue)
                }
            })

            panel.appendChild(item)
        })
    }

    function clearDiagnostics(): void {
        currentIssues = []
        renderProblemsPanel([])

        const editor = deps.getEditorView()
        if (!editor) return

        try {
            editor.dispatch({
                effects: [updateDecorationsEffect.of(Decoration.none)]
            })
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            deps.logger.log(`Falha ao limpar diagnosticos: ${errorMsg}`, 'warning')
        }
    }

    function updateDiagnostics(content: string): void {
        const editor = deps.getEditorView()
        if (!editor) return

        if (!deps.isMarkdownDocument()) {
            clearDiagnostics()
            return
        }

        const validation = validateMarkdown(content)
        const decorationRanges: any[] = []
        const lines = content.split('\n')

        const allIssues = [...validation.errors, ...validation.warnings]
        currentIssues = allIssues

        allIssues.forEach((issue) => {
            const lineIndex = Math.min(issue.line - 1, lines.length - 1)
            const line = lines[lineIndex]

            if (!line) return

            let charIndex = 0
            for (let i = 0; i < lineIndex; i++) {
                charIndex += (lines[i]?.length ?? 0) + 1
            }

            const from = charIndex + Math.max(0, issue.column - 1)
            const to = Math.min(charIndex + line.length, content.length)

            const cssClass = issue.severity === 'error'
                ? 'md-error'
                : issue.severity === 'warning'
                    ? 'md-warning'
                    : 'md-info'

            try {
                const decoration = Decoration.mark({
                    class: cssClass,
                    title: issue.message
                })
                decorationRanges.push(decoration.range(from, to))
            } catch {
                // Ignorar erros de decoration
            }
        })

        renderProblemsPanel(allIssues)

        if (validation.errors.length > 0) {
            deps.logger.error(`${validation.errors.length} erro(s) de sintaxe Markdown`)
        }

        if (validation.warnings.length > 0) {
            deps.logger.log(`${validation.warnings.length} aviso(s) Markdown`, 'warning')
        }

        try {
            const decorationSet = Decoration.set(decorationRanges)
            editor.dispatch({
                effects: [updateDecorationsEffect.of(decorationSet)]
            })
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            deps.logger.log(`Validacao visual: ${errorMsg}`, 'warning')
        }
    }

    return {
        decorationsField,
        hoverTooltipExtension,
        clearDiagnostics,
        updateDiagnostics
    }
}

