# SDD - Midias e Diagramas

## 1. Objetivo
Definir o processamento de imagens, diagramas Mermaid e blocos YAML no preview.

## 2. Escopo
- Redimensionar imagens para A4.
- Cache de dimensoes de imagens.
- Renderizacao de Mermaid e YAML via lazy loading.

## 3. Componentes e Responsabilidades
- `src/processors/imageProcessor.ts`: calcula dimensoes e aplica estilos.
- `src/utils/imageCache.ts`: cache em memoria + localStorage.
- `src/processors/mermaidProcessor.ts`: renderiza Mermaid em SVG.
- `src/processors/yamlProcessor.ts`: renderiza YAML em HTML.

## 4. Fluxo principal
1. Preview injeta HTML com `data-*` para mermaid/yaml.
2. `processImagesInPreview()` ajusta dimensoes de imagens.
3. `processMermaidDiagrams()` renderiza SVG e captions.
4. `processYamlBlocks()` parseia YAML e gera HTML.

## 5. Dados e Persistencia
- Cache de imagens: `md2pdf-image-cache-v1`.
- Metadados em `data-*` no DOM (somente runtime).

## 6. Interfaces (UI/APIs)
- Imagens em `<img>` com `data-print-image`.
- Mermaid em `<div class="mermaid">` com `data-mermaid-source`.
- YAML em `<div class="yaml-block">` com `data-yaml-source`.

## 7. Erros e Logs
- Falhas em imagens caem em fallback com `maxWidth: 100%`.
- Mermaid/YAML exibem bloco de erro no preview.

## 8. Seguranca e Privacidade
- Mermaid usa `securityLevel: 'strict'`.
- YAML e Mermaid usam base64 para sobreviver ao DOMPurify.

## 9. Performance e Limites
- Processamento de imagens em lotes (`maxConcurrent = 5`).
- Mermaid/YAML sao carregados apenas quando usados.

## 10. Testes e Validacao
- Markdown com imagem grande deve ser redimensionado.
- Mermaid valido gera SVG.
- YAML invalido gera fallback com erro.

## 11. Riscos e Pendencias
- Imagens sem CORS podem falhar ao carregar dimensoes.
- Diagramas muito grandes podem quebrar layout de print.
