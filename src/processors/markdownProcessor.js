import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { calculatePrintDimensions, validateImageForA4 } from './imageProcessor.js';

/**
 * Renderer customizado otimizado para impressão em A4
 * Cada função retorna HTML com classes específicas para print styling
 */
const printRenderer = {
    heading(token) {
        const level = token.depth;
        const id = token.text
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '');
        return `<h${level} id="${id}" class="markdown-heading markdown-h${level}">${token.text}</h${level}>\n`;
    },

    paragraph(token) {
        return `<p class="markdown-paragraph">${token.text}</p>\n`;
    },

    image(token) {
        // Nota: Dimensionamento real ocorre em processImagesForPrint()
        // Aqui apenas indicamos que é uma imagem para processamento posterior
        return `<figure class="markdown-image" style="page-break-inside: avoid;">
            <img src="${token.href}" 
                 alt="${token.text || 'Image'}" 
                 class="markdown-img"
                 data-print-image="true"
                 loading="lazy"
                 onerror="this.style.display='none'">
            <figcaption class="markdown-figcaption">${token.text || 'Image'}</figcaption>
        </figure>\n`;
    },

    table(token) {
        let rows = '';
        for (let i = 0; i < token.rows.length; i++) {
            const row = token.rows[i];
            const cells = row.map((cell, j) => {
                const tag = i === 0 && token.header ? 'th' : 'td';
                return `<${tag}>${cell}</${tag}>`;
            }).join('');
            rows += `<tr>${cells}</tr>`;
        }
        
        return `<figure class="markdown-table" style="page-break-inside: avoid;">
            <table class="markdown-table-content">
                ${rows}
            </table>
        </figure>\n`;
    },

    tablerow(token) {
        // Manipulado em table() acima
        return '';
    },

    tablecell(token) {
        // Manipulado em table() acima
        return '';
    },

    codespan(token) {
        const sanitized = DOMPurify.sanitize(token.text);
        return `<code class="markdown-code-inline">${sanitized}</code>`;
    },

    code(token) {
        const sanitized = DOMPurify.sanitize(token.text);
        const lang = token.lang || 'plaintext';
        return `<pre class="markdown-code-block" data-lang="${lang}"><code class="language-${lang}">${sanitized}</code></pre>\n`;
    },

    blockquote(token) {
        return `<blockquote class="markdown-blockquote" style="page-break-inside: avoid;">
            ${token.text}
        </blockquote>\n`;
    },

    link(token) {
        return `<a href="${token.href}" title="${token.title || ''}" class="markdown-link">${token.text}</a>`;
    },

    list(token) {
        const tag = token.ordered ? 'ol' : 'ul';
        const className = token.ordered ? 'markdown-list-ordered' : 'markdown-list-unordered';
        return `<${tag} class="${className}">\n${token.items.map(item => `<li>${item.text}</li>`).join('\n')}\n</${tag}>\n`;
    },

    listitem(token) {
        return token.text;
    },

    hr() {
        return `<hr class="markdown-hr" style="page-break-after: always;">\n`;
    },

    br() {
        return '<br>\n';
    },

    text(token) {
        return token.text;
    }
};

/**
 * Configuração do marked para GitHub Flavored Markdown
 */
marked.setOptions({
    gfm: true,
    breaks: true,
    pedantic: false,
    mangle: true,
    smartypants: true
});

marked.use({ renderer: printRenderer });

/**
 * Configuração DOMPurify com tags e atributos permitidos
 * Balanceado entre segurança e funcionalidade
 */
const DOMPURIFY_CONFIG = {
    ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'strong', 'em', 'u', 's', 'del',
        'a', 'img', 'code', 'pre',
        'ul', 'ol', 'li',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
        'blockquote', 'figure', 'figcaption',
        'hr', 'div', 'span',
        'section', 'article', 'aside', 'nav'
    ],
    ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'id', 'class',
        'data-lang', 'loading', 'onerror',
        'style', 'role', 'aria-label'
    ],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: false
};

/**
 * Processa markdown para HTML seguro e otimizado para print
 * @param {string} markdown - Conteúdo em markdown
 * @returns {string} HTML sanitizado e pronto para renderização
 */
export function processMarkdown(markdown) {
    try {
        if (!markdown || typeof markdown !== 'string') {
            return '<p class="error">Erro: conteúdo inválido</p>';
        }

        // Parse com marked
        const dirty = marked(markdown);

        // Sanitizar com DOMPurify
        const clean = DOMPurify.sanitize(dirty, DOMPURIFY_CONFIG);

        return clean;
    } catch (e) {
        console.error('Erro ao processar markdown:', e);
        return `<p class="error">Erro ao processar markdown: ${DOMPurify.sanitize(e.message)}</p>`;
    }
}

/**
 * Valida markdown antes de processar (detecção de patterns perigosos)
 * @param {string} markdown - Conteúdo em markdown
 * @returns {object} { isValid: boolean, warnings: string[] }
 */
export function validateMarkdown(markdown) {
    const warnings = [];

    // Detectar HTML potencialmente perigoso
    if (/<script|<iframe|<object|on\w+=/i.test(markdown)) {
        warnings.push('Conteúdo contém tags potencialmente perigosas (serão removidas)');
    }

    // Detectar URLs muito longas
    const longUrls = markdown.match(/https?:\/\/[^\s]{100,}/g);
    if (longUrls) {
        warnings.push(`${longUrls.length} URL(ns) muito longa(s) podem transbordar em impressão`);
    }

    return {
        isValid: warnings.length === 0,
        warnings
    };
}

/**
 * Estima número de páginas A4 baseado no conteúdo
 * Cálculo aproximado: 45 linhas por página A4 com fonte padrão
 * @param {string} html - HTML processado
 * @returns {number} Número estimado de páginas
 */
export function estimatePageCount(html) {
    const lines = html.split('\n').length;
    const wordsPerLine = 12; // Estimativa
    const charsPerPage = 45 * wordsPerLine * 5; // 45 linhas * 12 palavras * 5 chars/palavra
    const totalChars = html.length;
    return Math.ceil(totalChars / charsPerPage) || 1;
}

/**
 * Integração com processador de imagens para redimensionar imagens em HTML
 * Processa todas as imagens marcadas com data-print-image para A4
 * @param {HTMLElement} container - Container com HTML renderizado
 * @param {boolean} useCache - Usar cache de dimensões (localStorage)
 * @returns {Promise<number>} Número de imagens processadas
 */
export async function processImagesInPreview(container, useCache = true) {
    if (!container) return 0;
    
    try {
        const { processImagesForPrint } = await import('./imageProcessor.js');
        return await processImagesForPrint(container, useCache);
    } catch (e) {
        console.error('Erro ao processar imagens para print:', e);
        return 0;
    }
}
