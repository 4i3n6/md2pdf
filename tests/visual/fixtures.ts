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
