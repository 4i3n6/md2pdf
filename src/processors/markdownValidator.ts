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

export interface MarkdownValidationResult {
  isValid: boolean;
  errors: MarkdownError[];
  warnings: MarkdownError[];
}

export function validateMarkdown(markdown: string): MarkdownValidationResult {
  const errors: MarkdownError[] = [];
  const warnings: MarkdownError[] = [];

  if (!markdown || markdown.length === 0) {
    return { isValid: true, errors, warnings };
  }

  const lines = markdown.split('\n');

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

  lines.forEach((line, lineIndex) => {
    const lineNum = lineIndex + 1;
    const trimmed = line.trim();

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
          message: `Markdown supports a maximum of 6 heading levels (found: ${hashCount})`,
          severity: 'error',
          code: 'INVALID_HEADING_LEVEL',
          suggestion: '######' + rest,
          suggestionRange: { from: 1, to: line.length + 1 }
        });
      }

      if (rest && !rest.startsWith(' ')) {
        const fixedLine = hashes + ' ' + rest.trimStart();
        warnings.push({
          line: lineNum,
          column: hashCount + 1,
          message: 'Heading must have a space after "#"',
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
      if (linkMatch.index > 0 && line[linkMatch.index - 1] === '!') {
        continue;
      }
      const text = linkMatch[1];
      const url = linkMatch[2];

      if (!text && !url) {
        errors.push({
          line: lineNum,
          column: linkMatch.index + 1,
          message: 'Empty link: []() - add text and URL',
          severity: 'error',
          code: 'EMPTY_LINK'
        });
      } else if (!text) {
        errors.push({
          line: lineNum,
          column: linkMatch.index + 1,
          message: 'Link without text: [](url)',
          severity: 'error',
          code: 'EMPTY_LINK_TEXT'
        });
      } else if (!url) {
        errors.push({
          line: lineNum,
          column: linkMatch.index + 1,
          message: 'Link without URL: [text]()',
          severity: 'error',
          code: 'EMPTY_LINK_URL'
        });
      } else if (!url.match(/^(https?:|#|\/|mailto:)/)) {
        warnings.push({
          line: lineNum,
          column: linkMatch.index + 1,
          message: 'URL should start with http:, https:, #, / or mailto:',
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
          message: 'Image should have alternative text (alt text)',
          severity: 'warning',
          code: 'MISSING_IMAGE_ALT'
        });
      }

      if (!src) {
        errors.push({
          line: lineNum,
          column: imageMatch.index + 1,
          message: 'Image cannot have empty src: ![alt]()',
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
        message: 'Odd number of backticks (`) - unbalanced inline code',
        severity: 'warning',
        code: 'UNBALANCED_BACKTICKS'
      });
    }

    const isBulletPoint = /^\s*\*\s/.test(line);

    if (!isBulletPoint) {
      const boldCount = (line.match(/\*\*/g) || []).length;
      const italicCount = (line.match(/\*/g) || []).length - boldCount * 2;

      if (italicCount % 2 !== 0) {
        warnings.push({
          line: lineNum,
          column: 1,
          message: 'Odd number of * (asterisks) - unbalanced italic/bold',
          severity: 'warning',
          code: 'UNBALANCED_EMPHASIS'
        });
      }
    }

    if (trimmed.startsWith('>') && !trimmed.match(/^>\s/)) {
      const fixedLine = trimmed.replace(/^>([^\s])/, '> $1');
      warnings.push({
        line: lineNum,
        column: 1,
        message: 'Blockquote should have a space after ">"',
        severity: 'warning',
        code: 'BLOCKQUOTE_MISSING_SPACE',
        suggestion: fixedLine,
        suggestionRange: { from: 1, to: line.length + 1 }
      });
    }

  });

  const codeBlockRegex = /```([a-z0-9#+-]*)\n([\s\S]*?)```/g;
  let codeBlockMatch;
  let codeBlockCount = 0;

  while ((codeBlockMatch = codeBlockRegex.exec(markdown)) !== null) {
    codeBlockCount++;
    const language = codeBlockMatch[1];

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
        message: `Unknown language: "${language}" (may not be highlighted)`,
        severity: 'info',
        code: 'UNKNOWN_CODE_LANGUAGE'
      });
    }
  }

  const backtickTriples = (markdown.match(/```/g) || []).length;
  if (backtickTriples % 2 !== 0) {
    const lastLine = lines.length;
    errors.push({
      line: lastLine,
      column: 1,
      message: 'Unclosed code block - missing 3 backticks (```)',
      severity: 'error',
      code: 'UNCLOSED_CODE_BLOCK',
      suggestion: '```',
      suggestionRange: { from: -1, to: -1 }
    });
  }

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
          message: 'Table should have at least 2 columns',
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

export function getErrorDescription(code: string): string {
  const descriptions: Record<string, string> = {
    INVALID_HEADING_LEVEL: 'Invalid heading level',
    HEADING_MISSING_SPACE: 'Missing space after heading marker',
    EMPTY_LINK: 'Completely empty link',
    EMPTY_LINK_TEXT: 'Link text is empty',
    EMPTY_LINK_URL: 'Link URL is empty',
    LINK_MISSING_PROTOCOL: 'URL missing protocol',
    MISSING_IMAGE_ALT: 'Image is missing alternative text',
    EMPTY_IMAGE_SRC: 'Image src is empty',
    UNBALANCED_BACKTICKS: 'Unbalanced backticks',
    UNBALANCED_EMPHASIS: 'Unbalanced emphasis (bold/italic)',
    BLOCKQUOTE_MISSING_SPACE: 'Missing space after blockquote marker',
    UNCLOSED_CODE_BLOCK: 'Code block is not closed',
    UNKNOWN_CODE_LANGUAGE: 'Unknown code language',
    INVALID_TABLE: 'Invalid table'
  };

  return descriptions[code] || 'Unknown error';
}
