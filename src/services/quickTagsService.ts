import type { AppState, LoggerInterface } from '@/types/index'

type QuickTagsDeps = {
    state: AppState
    logger: LoggerInterface
}

export function setupQuickTags(deps: QuickTagsDeps): void {
    function insertTag(tag: string): void {
        if (!deps.state.editor) return

        const view = deps.state.editor
        const { from, to } = view.state.selection.main
        const hasSelection = from !== to
        const selectedText = hasSelection ? view.state.sliceDoc(from, to) : ''

        let insert = ''
        let cursorOffset = 0

        switch (tag) {
            case 'br':
                insert = '\n\n'
                cursorOffset = insert.length
                break

            case 'hr':
                insert = '\n---\n'
                cursorOffset = insert.length
                break

            case 'pagebreak':
                insert = '\n<!-- pagebreak -->\n'
                cursorOffset = insert.length
                break

            case 'code':
                if (hasSelection) {
                    insert = '```\n' + selectedText + '\n```'
                    cursorOffset = 4
                } else {
                    insert = '```\n\n```'
                    cursorOffset = 4
                }
                break

            case 'quote':
                if (hasSelection) {
                    insert = selectedText.split('\n').map(line => '> ' + line).join('\n')
                    cursorOffset = insert.length
                } else {
                    insert = '> '
                    cursorOffset = 2
                }
                break

            case 'heading':
                if (hasSelection) {
                    insert = '# ' + selectedText
                    cursorOffset = insert.length
                } else {
                    insert = '# '
                    cursorOffset = 2
                }
                break

            case 'bold':
                if (hasSelection) {
                    insert = '**' + selectedText + '**'
                    cursorOffset = insert.length
                } else {
                    insert = '**texto**'
                    cursorOffset = 2
                }
                break

            case 'italic':
                if (hasSelection) {
                    insert = '*' + selectedText + '*'
                    cursorOffset = insert.length
                } else {
                    insert = '*texto*'
                    cursorOffset = 1
                }
                break

            case 'list':
                if (hasSelection) {
                    insert = selectedText.split('\n').map(line => '- ' + line).join('\n')
                    cursorOffset = insert.length
                } else {
                    insert = '- '
                    cursorOffset = 2
                }
                break

            case 'link':
                if (hasSelection) {
                    insert = '[' + selectedText + '](url)'
                    cursorOffset = insert.length - 4
                } else {
                    insert = '[texto](url)'
                    cursorOffset = 1
                }
                break

            case 'strike':
                if (hasSelection) {
                    insert = '~~' + selectedText + '~~'
                    cursorOffset = insert.length
                } else {
                    insert = '~~texto~~'
                    cursorOffset = 2
                }
                break

            case 'numlist':
                if (hasSelection) {
                    insert = selectedText.split('\n').map((line, i) => `${i + 1}. ` + line).join('\n')
                    cursorOffset = insert.length
                } else {
                    insert = '1. '
                    cursorOffset = 3
                }
                break

            case 'checkbox':
                if (hasSelection) {
                    insert = selectedText.split('\n').map(line => '- [ ] ' + line).join('\n')
                    cursorOffset = insert.length
                } else {
                    insert = '- [ ] '
                    cursorOffset = 6
                }
                break

            case 'yaml':
                insert = '```yaml\nkey: value\nitems:\n  - item1\n  - item2\n```'
                cursorOffset = 8
                break

            case 'mermaid':
                insert = '```mermaid\nflowchart TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action]\n  B -->|No| D[End]\n```'
                cursorOffset = 12
                break

            case 'sql':
                insert = '```sql\nSELECT * FROM users WHERE id = 1;\n```'
                cursorOffset = 7
                break

            case 'ddl':
                insert = '```sql\nCREATE TABLE users (\n  id UUID PRIMARY KEY,\n  name VARCHAR(255) NOT NULL,\n  email VARCHAR(255) UNIQUE NOT NULL,\n  created_at TIMESTAMP DEFAULT NOW(),\n  updated_at TIMESTAMP DEFAULT NOW()\n);\n```'
                cursorOffset = 7
                break

            case 'table':
                insert = '\n| Coluna 1 | Coluna 2 | Coluna 3 |\n|----------|----------|----------|\n| dado 1   | dado 2   | dado 3   |\n'
                cursorOffset = 3
                break

            case 'mark-yellow':
                if (hasSelection) {
                    insert = '<mark style="background:#fef08a">' + selectedText + '</mark>'
                    cursorOffset = insert.length
                } else {
                    insert = '<mark style="background:#fef08a">texto</mark>'
                    cursorOffset = 32
                }
                break

            case 'mark-green':
                if (hasSelection) {
                    insert = '<mark style="background:#bbf7d0">' + selectedText + '</mark>'
                    cursorOffset = insert.length
                } else {
                    insert = '<mark style="background:#bbf7d0">texto</mark>'
                    cursorOffset = 32
                }
                break

            case 'mark-blue':
                if (hasSelection) {
                    insert = '<mark style="background:#bfdbfe">' + selectedText + '</mark>'
                    cursorOffset = insert.length
                } else {
                    insert = '<mark style="background:#bfdbfe">texto</mark>'
                    cursorOffset = 32
                }
                break

            case 'mark-red':
                if (hasSelection) {
                    insert = '<mark style="background:#fecaca">' + selectedText + '</mark>'
                    cursorOffset = insert.length
                } else {
                    insert = '<mark style="background:#fecaca">texto</mark>'
                    cursorOffset = 32
                }
                break

            case 'clear':
                if (hasSelection) {
                    insert = selectedText.replace(/<[^>]*>/g, '')
                    cursorOffset = insert.length
                    deps.logger.log('Tags HTML removidas da selecao')
                } else {
                    deps.logger.log('Selecione um texto para remover tags', 'warning')
                    return
                }
                break

            case 'align-left':
            case 'align-center':
            case 'align-right':
            case 'align-justify':
                if (hasSelection) {
                    const alignValue = tag.replace('align-', '')
                    insert = `<div style="text-align: ${alignValue}">${selectedText}</div>`
                    cursorOffset = insert.length
                } else {
                    deps.logger.log('Selecione um texto para alinhar', 'warning')
                    return
                }
                break

            default:
                return
        }

        view.dispatch({
            changes: { from, to, insert },
            selection: { anchor: from + cursorOffset }
        })

        view.focus()
        deps.logger.log(`Tag "${tag}" inserida`)
    }

    const container = document.querySelector('.quick-tags-container')
    if (!container) return

    container.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        if (target.classList.contains('tag-btn')) {
            const tag = target.dataset['tag']
            if (tag) {
                insertTag(tag)
            }
        }
    })

    deps.logger.success('Quick Tags ativadas')
}

