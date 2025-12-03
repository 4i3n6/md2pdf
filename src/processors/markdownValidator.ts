/**
 * MARKDOWN SYNTAX VALIDATOR
 * 
 * Valida sintaxe Markdown e retorna lista de erros/avisos
 * para exibição no editor com CodeMirror diagnostics
 */

/**
 * Tipo para representar um erro de sintaxe
 */
export interface MarkdownError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
}

/**
 * Resultado da validação
 */
export interface ValidationResult {
  isValid: boolean;
  errors: MarkdownError[];
  warnings: MarkdownError[];
}

/**
 * Valida conteúdo Markdown e retorna lista de erros
 * 
 * @param markdown - Conteúdo Markdown a validar
 * @returns Resultado da validação com lista de erros/avisos
 */
export function validateMarkdown(markdown: string): ValidationResult {
  const errors: MarkdownError[] = [];
  const warnings: MarkdownError[] = [];
  
  if (!markdown || markdown.length === 0) {
    return { isValid: true, errors, warnings };
  }

  const lines = markdown.split('\n');

  // Validações por linha
  lines.forEach((line, lineIndex) => {
    const lineNum = lineIndex + 1;
    const trimmed = line.trim();

    // 1. Validar headings (###...)
    const headingMatch = line.match(/^(#+)\s+(.+)$/);
    if (headingMatch) {
      const hashes = headingMatch[1].length;
      if (hashes > 6) {
        errors.push({
          line: lineNum,
          column: 1,
          message: `Markdown suporta no máximo 6 níveis de heading (encontrado: ${hashes})`,
          severity: 'error',
          code: 'INVALID_HEADING_LEVEL'
        });
      }
      // Aviso: heading sem espaço após #
      if (!line.match(/^#+\s/)) {
        warnings.push({
          line: lineNum,
          column: hashes,
          message: 'Heading deve ter espaço após "#"',
          severity: 'warning',
          code: 'HEADING_MISSING_SPACE'
        });
      }
    }

    // 2. Validar links [text](url)
    const linkRegex = /\[([^\]]*)\]\(([^)]*)\)/g;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(line)) !== null) {
      const text = linkMatch[1];
      const url = linkMatch[2];

      if (!text) {
        errors.push({
          line: lineNum,
          column: linkMatch.index + 1,
          message: 'Link não pode ter texto vazio: [](url)',
          severity: 'error',
          code: 'EMPTY_LINK_TEXT'
        });
      }

      if (!url) {
        errors.push({
          line: lineNum,
          column: linkMatch.index + 1,
          message: 'Link não pode ter URL vazia: [text]()',
          severity: 'error',
          code: 'EMPTY_LINK_URL'
        });
      }

      // Aviso: URL sem protocolo
      if (url && !url.match(/^(https?:|#|\/)/)) {
        warnings.push({
          line: lineNum,
          column: linkMatch.index + 1,
          message: 'URL deveria começar com http:, https:, # ou /',
          severity: 'warning',
          code: 'LINK_MISSING_PROTOCOL'
        });
      }
    }

    // 3. Validar imagens ![alt](src)
    const imageRegex = /!\[([^\]]*)\]\(([^)]*)\)/g;
    let imageMatch;
    while ((imageMatch = imageRegex.exec(line)) !== null) {
      const alt = imageMatch[1];
      const src = imageMatch[2];

      if (!alt) {
        warnings.push({
          line: lineNum,
          column: imageMatch.index + 1,
          message: 'Imagem deveria ter texto alternativo (alt text)',
          severity: 'warning',
          code: 'MISSING_IMAGE_ALT'
        });
      }

      if (!src) {
        errors.push({
          line: lineNum,
          column: imageMatch.index + 1,
          message: 'Imagem não pode ter src vazia: ![alt]()',
          severity: 'error',
          code: 'EMPTY_IMAGE_SRC'
        });
      }
    }

    // 4. Validar code inline (backticks)
    const backtickCount = (line.match(/`/g) || []).length;
    if (backtickCount % 2 !== 0) {
      warnings.push({
        line: lineNum,
        column: line.indexOf('`') + 1,
        message: 'Número ímpar de backticks (`) - código inline desbalanceado',
        severity: 'warning',
        code: 'UNBALANCED_BACKTICKS'
      });
    }

    // 5. Validar bold/italic (** ou *)
    const boldCount = (line.match(/\*\*/g) || []).length;
    const italicCount = (line.match(/\*/g) || []).length - boldCount * 2;
    
    if (italicCount % 2 !== 0) {
      warnings.push({
        line: lineNum,
        column: 1,
        message: 'Número ímpar de * (asteriscos) - italic/bold desbalanceado',
        severity: 'warning',
        code: 'UNBALANCED_EMPHASIS'
      });
    }

    // 6. Validar listas (-, *, +)
    if (line.match(/^\s*([-*+])\s+\S/) && !trimmed.startsWith('---')) {
      // Lista válida, apenas log
    }

    // 7. Validar blockquotes (>)
    if (trimmed.startsWith('>') && !trimmed.match(/^>\s+\S/)) {
      warnings.push({
        line: lineNum,
        column: 1,
        message: 'Blockquote deveria ter espaço após ">"',
        severity: 'warning',
        code: 'BLOCKQUOTE_MISSING_SPACE'
      });
    }

    // 8. Validar código em bloco (```)
    // Serão validados em conjunto
  });

  // 9. Validar blocos de código em bloco (triplo backtick)
  const codeBlockRegex = /```([a-z]*)\n([\s\S]*?)```/g;
  let codeBlockMatch;
  let codeBlockCount = 0;
  
  while ((codeBlockMatch = codeBlockRegex.exec(markdown)) !== null) {
    codeBlockCount++;
    const language = codeBlockMatch[1];
    
    // Validar se é linguagem conhecida (apenas aviso)
    const knownLanguages = ['js', 'javascript', 'ts', 'typescript', 'python', 'java', 'cpp', 'c', 'html', 'css', 'json', 'xml', 'bash', 'sh', 'sql', 'php', 'ruby', 'go', 'rust', 'md', 'markdown'];
    
    if (language && !knownLanguages.includes(language.toLowerCase())) {
      const lineNum = markdown.substring(0, codeBlockMatch.index).split('\n').length;
      warnings.push({
        line: lineNum,
        column: 4,
        message: `Linguagem desconhecida: "${language}" (pode não fazer highlighting)`,
        severity: 'info',
        code: 'UNKNOWN_CODE_LANGUAGE'
      });
    }
  }

  // Validar se todos blocos de código foram fechados
  const backtickTriples = (markdown.match(/```/g) || []).length;
  if (backtickTriples % 2 !== 0) {
    const lastLine = lines.length;
    errors.push({
      line: lastLine,
      column: 1,
      message: 'Bloco de código não fechado - faltam 3 backticks (```)',
      severity: 'error',
      code: 'UNCLOSED_CODE_BLOCK'
    });
  }

  // 10. Validar tabelas simples (pipes)
  const tableRegex = /^\|(.+)\|$/gm;
  const tableLines = markdown.match(tableRegex) || [];
  
  if (tableLines.length > 0) {
    tableLines.forEach((tableLine) => {
      const lineNum = markdown.substring(0, markdown.indexOf(tableLine)).split('\n').length;
      const cells = tableLine.split('|').filter((c) => c.trim());
      
      if (cells.length < 2) {
        warnings.push({
          line: lineNum,
          column: 1,
          message: 'Tabela deveria ter no mínimo 2 colunas',
          severity: 'warning',
          code: 'INVALID_TABLE'
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Obtém descrição legível de um código de erro
 * 
 * @param code - Código do erro
 * @returns Descrição do erro
 */
export function getErrorDescription(code: string): string {
  const descriptions: Record<string, string> = {
    INVALID_HEADING_LEVEL: 'Nível de heading inválido',
    HEADING_MISSING_SPACE: 'Espaço ausente após heading',
    EMPTY_LINK_TEXT: 'Texto do link vazio',
    EMPTY_LINK_URL: 'URL do link vazia',
    LINK_MISSING_PROTOCOL: 'URL sem protocolo',
    MISSING_IMAGE_ALT: 'Texto alternativo (alt) da imagem ausente',
    EMPTY_IMAGE_SRC: 'Src da imagem vazio',
    UNBALANCED_BACKTICKS: 'Backticks desbalanceados',
    UNBALANCED_EMPHASIS: 'Ênfase (bold/italic) desbalanceada',
    BLOCKQUOTE_MISSING_SPACE: 'Espaço ausente após blockquote',
    UNCLOSED_CODE_BLOCK: 'Bloco de código não fechado',
    UNKNOWN_CODE_LANGUAGE: 'Linguagem desconhecida',
    INVALID_TABLE: 'Tabela inválida'
  };

  return descriptions[code] || 'Erro desconhecido';
}
