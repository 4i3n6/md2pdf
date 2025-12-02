# 📋 ANÁLISE DE PROBLEMAS DE IMPRESSÃO - MD2PDF

## 🔍 Diagnóstico de Problemas Identificados

### 1. **Responsabilidade Única Violada**
**Problema**: A função `renderPreview()` (main.js:130) apenas define `innerHTML` com HTML gerado pelo marked, sem controle sobre layout de impressão.

```javascript
function renderPreview(md) {
    const preview = document.getElementById('preview');
    if (preview) preview.innerHTML = marked(md);
}
```

**Impacto**:
- Sem separação entre renderização de tela e impressão
- Estilos de impressão (@media print) precisam resolver conflitos com estilos de visualização
- Sem oportunidade para otimizar HTML especificamente para PDF

---

### 2. **Falta de Tratamento de Formatação Específica para PDF**
**Problema**: O markdown renderizado assume comportamentos CSS genéricos que não são ideais para impressão.

**Impactos concretos**:
- **Quebras de página**: Não há controle sobre `page-break-inside`, `page-break-after`
- **Viúvas/órfãs**: Linhas isoladas aparecem em páginas diferentes
- **Imagens não redimensionadas**: Podem transbordar páginas A4 (210mm x 297mm)
- **Tabelas longas**: Podem quebrar sem cabeçalho repetido
- **Cores de fundo**: Navegadores desabilitam por padrão, afetando contraste

---

### 3. **Configuração Incompleta do Marked.js**
**Problema**: Opções limitadas no marked (main.js:25).

```javascript
marked.setOptions({ gfm: true, breaks: true });
```

**Faltam**:
- Renderer customizado para otimizar HTML para print
- Sanitização de tags perigosas (XSS)
- Tratamento de imagens com fallback
- Extensões para funcionalidades avançadas (KaTeX, Mermaid)

---

### 4. **CSS de Impressão Muito Simples**
**Problema**: Regras @media print (styles.css:262-284) são genéricas e não tratam casos reais.

```css
@media print {
    .markdown-body { 
        font-family: "Inter", sans-serif !important; 
        /* Muda de monospace para sans-serif */
    }
}
```

**Issues**:
- Mudança de fonte quebra visual esperado (é um editor técnico!)
- Sem `orphans`, `widows`, `page-break-*`
- Sem redimensionamento de imagens
- Sem handling de URLs de links
- Sem otimização de espaçamento vertical

---

### 5. **Sem Validação de HTML no Markdown**
**Problema**: Markdown aceita HTML inline, que pode quebrar layout em impressão.

```markdown
# Título
<div style="margin: 2000px; width: 150%;"></div>
Conteúdo quebrado
```

---

## 🏗️ SOLUÇÃO ARQUITETURAL PROPOSTA

### Objetivo: Separação de Responsabilidades

```
┌─────────────────────────────────────────┐
│  Editor (CodeMirror)                    │
└────────────────┬────────────────────────┘
                 │ markdown content
                 ▼
┌─────────────────────────────────────────┐
│  Processor Layer (Sanitização + Parse)  │
├─────────────────────────────────────────┤
│ • DOMPurify (sanitizar HTML)            │
│ • Marked com renderer customizado       │
│ • Validação de estrutura                │
└────────────────┬────────────────────────┘
                 │ sanitized HTML
        ┌────────┴────────┐
        ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│ Screen Renderer  │  │ Print Renderer   │
├──────────────────┤  ├──────────────────┤
│ • Layout flex    │  │ • A4 optimized   │
│ • Cores UI       │  │ • Page breaks    │
│ • Scroll area    │  │ • Sans-serif     │
└──────────────────┘  │ • Print colors   │
                      │ • Img resize     │
                      └──────────────────┘
```

---

## ✅ IMPLEMENTAÇÃO RECOMENDADA

### Fase 1: Processamento de Markdown (Crítica)

#### 1.1 Instalar dependências
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

#### 1.2 Criar `src/processors/markdownProcessor.js`

```javascript
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Renderer customizado para print-friendly HTML
const printRenderer = {
  heading(token) {
    const level = token.depth;
    const id = token.text.toLowerCase().replace(/\s+/g, '-');
    return `<h${level} id="${id}" class="markdown-heading">${token.text}</h${level}>\n`;
  },
  
  image(token) {
    const maxWidth = 800; // px
    const maxHeight = 600; // px
    return `<figure class="markdown-image">
      <img src="${token.href}" alt="${token.text}" 
           style="max-width: ${maxWidth}px; max-height: ${maxHeight}px; width: 100%;">
      <figcaption>${token.text || 'Image'}</figcaption>
    </figure>\n`;
  },
  
  table(token) {
    return `<figure class="markdown-table">
      <table>
        <thead>${token.header}</thead>
        <tbody>${token.rows.join('')}</tbody>
      </table>
    </figure>\n`;
  },
  
  codespan(token) {
    return `<code class="inline-code">${DOMPurify.sanitize(token.text)}</code>`;
  },
  
  code(token) {
    return `<pre class="code-block"><code>${DOMPurify.sanitize(token.text)}</code></pre>\n`;
  },
  
  blockquote(token) {
    return `<blockquote class="markdown-blockquote">${token.text}</blockquote>\n`;
  }
};

// Registrar renderer
marked.use({ renderer: printRenderer });

// Configuração segura
marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false,
  mangle: true,
  smartypants: true
});

// Função exportada
export function processMarkdown(markdown) {
  try {
    // Parse com marked
    const dirty = marked(markdown);
    
    // Sanitizar com DOMPurify
    const clean = DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'strong', 'em', 'u', 's',
        'a', 'img', 'code', 'pre',
        'ul', 'ol', 'li',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'blockquote', 'figure', 'figcaption',
        'hr', 'div', 'span'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'id', 'class', 'style']
    });
    
    return clean;
  } catch (e) {
    console.error('Markdown processing error:', e);
    return `<p class="error">Erro ao processar markdown: ${e.message}</p>`;
  }
}
```

#### 1.3 Atualizar `src/main.js`

```javascript
import { processMarkdown } from './processors/markdownProcessor.js';

// Substituir renderPreview existente
function renderPreview(md) {
    const preview = document.getElementById('preview');
    if (preview) {
        const html = processMarkdown(md);
        preview.innerHTML = html;
    }
}
```

---

### Fase 2: CSS Otimizado para Impressão

#### 2.1 Criar `src/styles-print.css`

```css
/* Print Media Queries - Separadas para clareza */

@media print {
  /* Reset de visualização */
  * {
    orphans: 3;
    widows: 3;
    page-break-inside: avoid;
  }
  
  /* Body e container */
  body, html {
    margin: 0;
    padding: 0;
    width: 100%;
    height: auto;
  }
  
  /* Esconder elementos de UI */
  .app-grid, .sidebar, .top-bar, .pane-header,
  .editor-frame, #console-log, .workspace {
    display: none !important;
  }
  
  /* Preview como conteúdo principal */
  #preview-wrapper {
    display: block !important;
    padding: 0;
    margin: 0;
    width: 100%;
    background: white;
    overflow: visible;
  }
  
  /* Markdown body - otimizado para A4 */
  .markdown-body {
    max-width: 210mm; /* Largura A4 */
    margin: 0 auto;
    padding: 20mm; /* Margem padrão A4 */
    border: none;
    box-shadow: none;
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #000;
    background: white;
  }
  
  /* Headings */
  .markdown-body h1, .markdown-body h2, .markdown-body h3 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    page-break-after: avoid;
    border: none;
    text-transform: none;
    letter-spacing: normal;
  }
  
  .markdown-body h1 {
    font-size: 24pt;
    font-weight: bold;
    border-bottom: 2px solid #000;
    padding-bottom: 0.3em;
  }
  
  .markdown-body h2 {
    font-size: 18pt;
    font-weight: bold;
    border-bottom: 1px solid #666;
    padding-bottom: 0.2em;
  }
  
  .markdown-body h3 {
    font-size: 14pt;
    font-weight: bold;
  }
  
  /* Parágrafos */
  .markdown-body p {
    margin: 0 0 1em 0;
    text-align: justify;
  }
  
  /* Links - mostrar URL em print */
  .markdown-body a {
    color: #0066cc;
    text-decoration: underline;
  }
  
  .markdown-body a::after {
    content: " (" attr(href) ")";
    font-size: 0.8em;
    color: #666;
  }
  
  /* Código */
  .markdown-body code {
    background: white;
    border: 1px solid #ccc;
    padding: 2px 4px;
    font-family: 'Courier New', monospace;
    font-size: 10pt;
    color: #000;
  }
  
  .markdown-body pre {
    background: #f5f5f5;
    border: 1px solid #ccc;
    padding: 10pt;
    overflow-x: auto;
    page-break-inside: avoid;
    font-size: 9pt;
    line-height: 1.4;
  }
  
  /* Listas */
  .markdown-body ul, .markdown-body ol {
    margin: 0.5em 0;
    padding-left: 2em;
  }
  
  .markdown-body li {
    margin-bottom: 0.3em;
  }
  
  /* Blockquotes */
  .markdown-body blockquote {
    background: white;
    border-left: 4px solid #666;
    margin: 1em 0;
    padding: 0 0 0 1em;
    page-break-inside: avoid;
    font-style: italic;
    color: #333;
  }
  
  /* Tabelas */
  .markdown-body table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    page-break-inside: avoid;
    border: 1px solid #ccc;
  }
  
  .markdown-body th, .markdown-body td {
    border: 1px solid #ccc;
    padding: 8pt;
    text-align: left;
  }
  
  .markdown-body th {
    background: #f0f0f0;
    font-weight: bold;
  }
  
  /* Imagens */
  .markdown-image {
    margin: 1em 0;
    page-break-inside: avoid;
    text-align: center;
  }
  
  .markdown-image img {
    max-width: 100%;
    height: auto;
    max-height: 180mm; /* Altura máxima na página */
  }
  
  .markdown-image figcaption {
    font-size: 9pt;
    color: #666;
    margin-top: 0.5em;
    font-style: italic;
  }
  
  /* Quebras de página */
  hr {
    page-break-after: always;
    border: none;
    border-top: 2px solid #000;
    margin: 2em 0;
  }
  
  /* Avoid orphans em elementos importantes */
  .markdown-body h1,
  .markdown-body h2,
  .markdown-body h3 {
    page-break-after: avoid;
  }
  
  /* Table headers repetidas */
  thead {
    display: table-header-group;
  }
  
  /* Rodapé com número de página (navegadores modernos) */
  @page {
    size: A4;
    margin: 20mm;
    
    @bottom-center {
      content: "Página " counter(page) " de " counter(pages);
      font-size: 10pt;
      color: #999;
    }
  }
}
```

#### 2.2 Importar no `src/main.js`

```javascript
import './styles-print.css';
```

---

### Fase 3: Funções Auxiliares para Impressão

#### 3.1 Criar `src/utils/printUtils.js`

```javascript
/**
 * Utilitário para controle de impressão
 */

export function optimizeForPrint(contentElement) {
  // Validar elemento
  if (!contentElement) {
    console.error('Content element not found');
    return false;
  }
  
  // Remover elementos desnecessários
  const elementsToRemove = [
    '.editor-frame',
    '.sidebar',
    '.top-bar',
    '.pane-header:not([data-print="visible"])'
  ];
  
  elementsToRemove.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.style.display = 'none';
    });
  });
  
  return true;
}

export function restoreAfterPrint() {
  // Restaurar visibilidade após impressão
  document.querySelectorAll('[style*="display: none"]').forEach(el => {
    el.style.display = '';
  });
}

export function printDocument(title = 'document') {
  return new Promise((resolve) => {
    // Otimizar antes de imprimir
    optimizeForPrint(document.getElementById('preview'));
    
    // Aguardar render
    setTimeout(() => {
      // Abrir diálogo de impressão
      window.print();
      
      // Restaurar após impressão (função nativa do navegador)
      window.addEventListener('afterprint', () => {
        restoreAfterPrint();
        resolve(true);
      }, { once: true });
    }, 100);
  });
}

export function validateMarkdownForPrint(html) {
  const issues = [];
  
  // Validar imagens muito grandes
  const images = document.querySelectorAll('.markdown-image img');
  images.forEach((img, i) => {
    if (img.width > 800 || img.height > 600) {
      issues.push(`Imagem ${i + 1}: Dimensões (${img.width}x${img.height}) podem não caber na página`);
    }
  });
  
  // Validar tabelas muito largas
  const tables = document.querySelectorAll('table');
  tables.forEach((table, i) => {
    if (table.offsetWidth > 180) {
      issues.push(`Tabela ${i + 1}: Pode transbordar a página (${table.offsetWidth}mm)`);
    }
  });
  
  return issues;
}
```

#### 3.2 Integrar em `src/main.js`

```javascript
import { printDocument, validateMarkdownForPrint } from './utils/printUtils.js';

// Atualizar evento de download
const btnDown = document.getElementById('download-btn');
if (btnDown) {
    btnDown.addEventListener('click', async () => {
        Logger.log('Iniciando sequência de impressão...');
        
        // Validar antes de imprimir
        const issues = validateMarkdownForPrint();
        if (issues.length > 0) {
            issues.forEach(issue => Logger.error(issue));
        }
        
        // Imprimir
        await printDocument(getCurrentDoc().name);
        Logger.success('Diálogo de impressão fechado.');
    });
}
```

---

### Fase 4: Tratamento de Casos Extremos

#### 4.1 Adicionar em `src/processors/markdownProcessor.js`

```javascript
// Estender renderer para casos extremos
const extendedRenderer = {
  ...printRenderer,
  
  // Redimensionar imagens automaticamente
  image(token) {
    const aspect = getImageAspect(token.href);
    const width = aspect?.width || 800;
    const height = aspect?.height || 600;
    
    // Calcular dimensões proportionais para A4
    const maxWidth = 170; // mm em A4
    const scale = Math.min(1, maxWidth / (width / 3.779)); // converter px para mm
    
    return `<figure class="markdown-image" style="page-break-inside: avoid;">
      <img src="${token.href}" alt="${token.text}" 
           loading="lazy"
           style="max-width: 100%; width: ${width * scale}px; height: auto;">
      <figcaption>${token.text || 'Image'}</figcaption>
    </figure>\n`;
  },
  
  // Tabelas com suporte a page-break
  table(token) {
    return `<table class="markdown-table" style="page-break-inside: avoid; width: 100%;">
      ${token.header}
      ${token.rows.join('')}
    </table>\n`;
  }
};

// Função auxiliar (stub)
function getImageAspect(src) {
  // Implementar cache de dimensões de imagem
  return null;
}
```

---

## 📊 Resumo de Melhorias

| Problema | Solução | Prioridade |
|----------|---------|-----------|
| Sem processamento de markdown customizado | Renderer customizado + DOMPurify | **CRÍTICA** |
| CSS de print incompleto | Novo `styles-print.css` com A4 | **CRÍTICA** |
| Imagens sem redimensionamento | Image processor com max-width | **ALTA** |
| Sem validação de conteúdo | `validateMarkdownForPrint()` | **ALTA** |
| Tabelas quebram em impressão | CSS `page-break-inside: avoid` | **ALTA** |
| Fontes mono em print | Fallback para serifada | **MÉDIA** |
| Sem sanitização HTML | DOMPurify integrado | **CRÍTICA** |

---

## 🚀 Plano de Implementação

**Semana 1 (Crítica)**:
1. ✅ Instalar DOMPurify
2. ✅ Criar `markdownProcessor.js`
3. ✅ Criar `styles-print.css`
4. ✅ Integrar em main.js

**Semana 2 (Melhorias)**:
1. ✅ Criar `printUtils.js`
2. ✅ Adicionar validação de conteúdo
3. ✅ Testar em múltiplos navegadores
4. ✅ Testar impressão real em PDF

**Semana 3 (Otimizações)**:
1. ✅ Redimensionamento automático de imagens
2. ✅ Cache de dimensões
3. ✅ Suporte a page breaks customizados
4. ✅ Preview de impressão (modo anônimo)

---

## 🧪 Testes Recomendados

```javascript
// test-print.js
const testCases = [
  '# Título simples',
  '![Image](https://via.placeholder.com/1600x1200)',
  '| Col1 | Col2 |\n|-----|-----|\n| A | B |',
  '```javascript\nconst x = 1;\n```',
  '<div style="width: 2000px;">Conteúdo quebrado</div>' // Deve ser sanitizado
];

testCases.forEach(md => {
  const html = processMarkdown(md);
  console.log('✓ Processado:', md.substring(0, 30));
});
```

---

## 📝 Conclusão

O projeto está **estruturalmente sólido**, mas falta **separação de responsabilidades** entre renderização de tela e impressão. Com as mudanças propostas:

✅ Segurança aprimorada (DOMPurify)
✅ Impressão profissional (A4 otimizado)
✅ Código mais manutenível (padrão de processor)
✅ UX melhorada (validação prévia)

**Impacto**: Nenhuma quebra de funcionalidade existente, apenas melhorias internas.
