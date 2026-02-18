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
  suggestion?: string;
  suggestionRange?: {
    from: number;
    to: number;
  };
}

/**
 * Resultado da validação de sintaxe Markdown
 */
export interface MarkdownValidationResult {
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
export function validateMarkdown(markdown: string): MarkdownValidationResult {
  const errors: MarkdownError[] = [];
  const warnings: MarkdownError[] = [];

  if (!markdown || markdown.length === 0) {
    return { isValid: true, errors, warnings };
  }

  const lines = markdown.split('\n');
  
  // Detectar linhas que estao dentro de blocos de codigo para ignorar validacao
  const linesInCodeBlock = new Set<number>();
  let inCodeBlock = false;
  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      linesInCodeBlock.add(index);
    } else if (inCodeBlock) {
      linesInCodeBlock.add(index);
    }
  });

  // Validações por linha
  lines.forEach((line, lineIndex) => {
    const lineNum = lineIndex + 1;
    const trimmed = line.trim();
    
    // IMPORTANTE: Ignorar linhas dentro de blocos de codigo
    if (linesInCodeBlock.has(lineIndex)) {
      return;
    }

    // 1. Validar headings (###...)
    const headingMatch = line.match(/^(#+)(.*)$/);
    if (headingMatch) {
      const hashes = headingMatch[1] || '';
      const hashCount = hashes.length;
      const rest = headingMatch[2] || '';
      
      if (hashCount > 6) {
        errors.push({
          line: lineNum,
          column: 1,
          message: `Markdown suporta no máximo 6 níveis de heading (encontrado: ${hashCount})`,
          severity: 'error',
          code: 'INVALID_HEADING_LEVEL',
          suggestion: '######' + rest,
          suggestionRange: { from: 1, to: line.length + 1 }
        });
      }
      
      // Aviso: heading sem espaço após #
      if (rest && !rest.startsWith(' ')) {
        const fixedLine = hashes + ' ' + rest.trimStart();
        warnings.push({
          line: lineNum,
          column: hashCount + 1,
          message: 'Heading deve ter espaço após "#"',
          severity: 'warning',
          code: 'HEADING_MISSING_SPACE',
          suggestion: fixedLine,
          suggestionRange: { from: 1, to: line.length + 1 }
        });
      }
    }

    // 2. Validar links [text](url)
    const linkRegex = /\[([^\]]*)\]\(([^)]*)\)/g;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(line)) !== null) {
      const text = linkMatch[1];
      const url = linkMatch[2];

      // Se ambos estao vazios, reportar apenas um erro
      if (!text && !url) {
        errors.push({
          line: lineNum,
          column: linkMatch.index + 1,
          message: 'Link vazio: []() - adicione texto e URL',
          severity: 'error',
          code: 'EMPTY_LINK'
        });
      } else if (!text) {
        errors.push({
          line: lineNum,
          column: linkMatch.index + 1,
          message: 'Link sem texto: [](url)',
          severity: 'error',
          code: 'EMPTY_LINK_TEXT'
        });
      } else if (!url) {
        errors.push({
          line: lineNum,
          column: linkMatch.index + 1,
          message: 'Link sem URL: [text]()',
          severity: 'error',
          code: 'EMPTY_LINK_URL'
        });
      } else if (!url.match(/^(https?:|#|\/|mailto:)/)) {
        // Aviso: URL sem protocolo
        warnings.push({
          line: lineNum,
          column: linkMatch.index + 1,
          message: 'URL deveria comecar com http:, https:, #, / ou mailto:',
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
    // Ignorar linhas que são bullet points (começam com * seguido de espaço)
    const isBulletPoint = /^\s*\*\s/.test(line);
    
    if (!isBulletPoint) {
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
    }

    // 6. Validar listas (-, *, +)
    if (line.match(/^\s*([-*+])\s+\S/) && !trimmed.startsWith('---')) {
      // Lista válida, apenas log
    }

    // 7. Validar blockquotes (>)
    if (trimmed.startsWith('>') && !trimmed.match(/^>\s/)) {
      const fixedLine = trimmed.replace(/^>([^\s])/, '> $1');
      warnings.push({
        line: lineNum,
        column: 1,
        message: 'Blockquote deveria ter espaço após ">"',
        severity: 'warning',
        code: 'BLOCKQUOTE_MISSING_SPACE',
        suggestion: fixedLine,
        suggestionRange: { from: 1, to: line.length + 1 }
      });
    }

    // 8. Validar código em bloco (```)
    // Serão validados em conjunto
  });

  // 9. Validar blocos de código em bloco (triplo backtick)
  const codeBlockRegex = /```([a-z0-9#+-]*)\n([\s\S]*?)```/g;
  let codeBlockMatch;
  let codeBlockCount = 0;
  
  while ((codeBlockMatch = codeBlockRegex.exec(markdown)) !== null) {
    codeBlockCount++;
    const language = codeBlockMatch[1];
    
    // Validar se é linguagem conhecida (apenas aviso)
    const knownLanguages = [
      'bash',
      'c',
      'c#',
      'c++',
      'cpp',
      'csharp',
      'css',
      'cs',
      'ddl',
      'go',
      'html',
      'java',
      'javascript',
      'jsx',
      'json',
      'markdown',
      'md',
      'php',
      'plaintext',
      'postgres',
      'postgresql',
      'psql',
      'python',
      'ruby',
      'rust',
      'shell',
      'sh',
      'sql',
      'text',
      'ts',
      'tsx',
      'typescript',
      'txt',
      'xhtml',
      'htm',
      'xml',
      'yaml',
      'yml',
      'mermaid'
    ];
    
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
      code: 'UNCLOSED_CODE_BLOCK',
      suggestion: '```',
      suggestionRange: { from: -1, to: -1 }
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
    INVALID_HEADING_LEVEL: 'Nivel de heading invalido',
    HEADING_MISSING_SPACE: 'Espaco ausente apos heading',
    EMPTY_LINK: 'Link completamente vazio',
    EMPTY_LINK_TEXT: 'Texto do link vazio',
    EMPTY_LINK_URL: 'URL do link vazia',
    LINK_MISSING_PROTOCOL: 'URL sem protocolo',
    MISSING_IMAGE_ALT: 'Texto alternativo (alt) da imagem ausente',
    EMPTY_IMAGE_SRC: 'Src da imagem vazio',
    UNBALANCED_BACKTICKS: 'Backticks desbalanceados',
    UNBALANCED_EMPHASIS: 'Enfase (bold/italic) desbalanceada',
    BLOCKQUOTE_MISSING_SPACE: 'Espaco ausente apos blockquote',
    UNCLOSED_CODE_BLOCK: 'Bloco de codigo nao fechado',
    UNKNOWN_CODE_LANGUAGE: 'Linguagem desconhecida',
    INVALID_TABLE: 'Tabela invalida'
  };

  return descriptions[code] || 'Erro desconhecido';
}
