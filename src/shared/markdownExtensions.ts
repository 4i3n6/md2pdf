/**
 * Shared marked extension tokenizers for Mermaid and YAML code blocks.
 * Used by both web and CLI processors.
 *
 * Each factory returns a marked extension config. The `renderFn` callback
 * allows each platform to provide its own renderer (different sanitization,
 * different base64 encoding, different i18n strings).
 */

import type { Tokens } from 'marked'
import { findFencedCodeBlock } from './markdownHelpers'

export interface ExtensionCallbacks {
    encodeBase64: (input: string) => string
    renderMermaid: (b64: string) => string
    renderYaml: (b64: string) => string
}

export function createMermaidExtension(callbacks: ExtensionCallbacks) {
    return {
        name: 'mermaidCodeBlock',
        level: 'block' as const,
        start(src: string) {
            return src.match(/^[ \t]*(?:`{3,}|~{3,})[ \t]*mermaid\b/i)?.index
        },
        tokenizer(src: string) {
            const match = findFencedCodeBlock(src, 'mermaid')
            if (match) {
                return {
                    type: 'mermaidCodeBlock',
                    raw: match.raw,
                    text: match.text
                }
            }
            return undefined
        },
        renderer(token: Tokens.Generic) {
            const data = token as { text?: string }
            const text = typeof data.text === 'string' ? data.text : ''
            const b64 = callbacks.encodeBase64(text)
            return callbacks.renderMermaid(b64)
        }
    }
}

export function createYamlExtension(callbacks: ExtensionCallbacks) {
    return {
        name: 'yamlCodeBlock',
        level: 'block' as const,
        start(src: string) {
            return src.match(/^[ \t]*(?:`{3,}|~{3,})[ \t]*ya?ml\b/i)?.index
        },
        tokenizer(src: string) {
            const match = findFencedCodeBlock(src, 'ya?ml', true)
            if (match) {
                return {
                    type: 'yamlCodeBlock',
                    raw: match.raw,
                    text: match.text
                }
            }
            return undefined
        },
        renderer(token: Tokens.Generic) {
            const data = token as { text?: string }
            const text = typeof data.text === 'string' ? data.text : ''
            const b64 = callbacks.encodeBase64(text)
            return callbacks.renderYaml(b64)
        }
    }
}
