export const markdownFidelidadeRender = `
# Fidelity Check

Texto de teste com **negrito**, *italico* e \`inline-code\`.

## Lista

- [x] Item concluido
- [ ] Item pendente

## Tabela

| Nome | Status | Valor |
|:-----|:------:|------:|
| alpha | ok | 10 |
| beta | warn | 20 |

\`\`\`javascript
function soma(a, b) {
  return a + b
}
\`\`\`
`.trim()

export const markdownFidelidadeImpressao = `
# Print Width Check

Paragrafo para validar quebra de linhas no modo de impressao.

| Coluna A | Coluna B | Coluna C | Coluna D |
|:---------|:---------|:---------|---------:|
| Um valor bem longo para forcar wrap e manter fidelidade visual | outro valor extenso para simular documento real | mais texto longo para teste de celula | 1234567890 |
| Conteudo normal | conteudo normal | conteudo normal | 42 |

URL muito longa para validar wrap:
https://example.com/segmento-super-longo-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
`.trim()

const tallPrintImageSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="2200" viewBox="0 0 1200 2200">
  <rect width="1200" height="2200" fill="#111827" />
  <rect x="80" y="80" width="1040" height="2040" fill="#0f766e" rx="36" />
  <text x="600" y="1020" fill="#ecfeff" font-size="132" text-anchor="middle" font-family="monospace">
    Tall Print Image
  </text>
  <text x="600" y="1180" fill="#ccfbf1" font-size="56" text-anchor="middle" font-family="monospace">
    A4 sizing regression guard
  </text>
</svg>
`.trim())

const tallPrintImageDataUri = `data:image/svg+xml;charset=utf-8,${tallPrintImageSvg}`

export const markdownPrintImageSizing = `
# Print Image Height Check

![Tall print image](${tallPrintImageDataUri})
`.trim()
