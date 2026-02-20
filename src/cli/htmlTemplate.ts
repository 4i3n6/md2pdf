import printCss from '../styles-print.css'
import hljsCss from 'highlight.js/styles/github.css'
import { PRINT_ESSENTIALS, COMPONENT_STYLES } from './themes'

const CLI_OVERRIDES = `
body {
    margin: 0;
    padding: 0;
    background: white;
    font-size: 10pt;
    font-family: 'Liberation Mono', 'DejaVu Sans Mono', 'Consolas', 'Monaco', monospace;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}

.markdown-body {
    max-width: none;
    width: 100%;
    padding: 0;
    margin: 0;
    background: white;
    color: black;
    line-height: 1.6;
}

.markdown-body > :first-child {
    margin-top: 0 !important;
}

.markdown-body > :last-child {
    margin-bottom: 0 !important;
}
`

const THEMED_OVERRIDES = `
body {
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}

.markdown-body {
    max-width: none;
    width: 100%;
    padding: 0;
    margin: 0;
}

.markdown-body > :first-child {
    margin-top: 0 !important;
}

.markdown-body > :last-child {
    margin-bottom: 0 !important;
}
`

export interface ThemeOptions {
    themeCss: string
}

export function buildHtmlDocument(
    fragment: string,
    theme?: ThemeOptions
): string {
    if (theme) {
        return buildThemedDocument(fragment, theme.themeCss)
    }
    return buildDefaultDocument(fragment)
}

function buildDefaultDocument(fragment: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MD2PDF</title>
<style>
${hljsCss}
</style>
<style>
${printCss}
</style>
<style>
${CLI_OVERRIDES}
</style>
</head>
<body>
<div class="markdown-body">
${fragment}
</div>
</body>
</html>`
}

function buildThemedDocument(fragment: string, themeCss: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MD2PDF</title>
<style>
${hljsCss}
</style>
<style>
${themeCss}
</style>
<style>
${PRINT_ESSENTIALS}
</style>
<style>
${COMPONENT_STYLES}
</style>
<style>
${THEMED_OVERRIDES}
</style>
</head>
<body>
<div class="markdown-body">
${fragment}
</div>
</body>
</html>`
}
