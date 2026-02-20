import { load as yamlLoad } from 'js-yaml'
import { escapeHtml, decodeBase64 } from './utils'
import { renderYamlToHtml, renderAsCodeBlock } from '../shared/yamlRenderer'

const YAML_BLOCK_REGEX =
    /<div\s+class="yaml-block"\s+data-yaml-source="([^"]+)"\s+data-yaml-type="([^"]*)"[^>]*>[\s\S]*?<\/div>/g

export function processYamlBlocksInHtml(html: string): string {
    return html.replace(YAML_BLOCK_REGEX, (_match, b64Source: string, yamlType: string) => {
        const source = decodeBase64(b64Source)
        if (!source) return _match

        try {
            const data = yamlLoad(source)
            const rendered = renderYamlToHtml(data, escapeHtml)
            return `<div class="yaml-block yaml-rendered" data-yaml-type="${yamlType}">${rendered}</div>`
        } catch (e) {
            const errorMessage =
                e instanceof Error ? e.message : 'Unknown parsing error'
            return `<div class="yaml-block yaml-error-container">${renderAsCodeBlock(source, errorMessage, escapeHtml)}</div>`
        }
    })
}
