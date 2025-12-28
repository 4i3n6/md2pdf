/**
 * RELATÓRIO DE IMPRESSÃO AVANÇADO - MD2PDF
 * Gera relatórios detalhados e estatísticas do documento
 */

import { ImpressaoLimites } from '@/constants'
import { logInfo } from '@/utils/logger'

const formatoA4 = `${ImpressaoLimites.a4LarguraMm}mm × ${ImpressaoLimites.a4AlturaMm}mm`
const margemA4 = `${ImpressaoLimites.margemMm}mm`

/**
 * Interface para contagem de headings por nível
 */
export interface HeadingsCount {
  h1: number;
  h2: number;
  h3: number;
  h4: number;
  h5: number;
  h6: number;
}

/**
 * Interface para estatísticas de listas
 */
export interface ListStats {
  unordered: number;
  ordered: number;
  items: number;
}

/**
 * Interface para estatísticas de tabelas
 */
export interface TableStats {
  count: number;
  rows: number;
  cells: number;
}

/**
 * Interface para estatísticas de código
 */
export interface CodeStats {
  blocks: number;
  inline: number;
}

/**
 * Interface para estatísticas completas do documento
 */
export interface DocumentStats {
  text: string;
  words: number;
  characters: number;
  headings: HeadingsCount;
  paragraphs: number;
  lists: ListStats;
  images: number;
  links: number;
  tables: number;
  tableRows: number;
  tableCells: number;
  codeBlocks: number;
  codeInline: number;
  blockquotes: number;
  readingTime: number;
  estimatedPages: number;
}

/**
 * Interface para relatório em JSON
 */
export interface JsonReport {
  document: {
    name: string;
    createdAt: string;
    sizeKb: string;
  };
  content: {
    words: number;
    characters: number;
    paragraphs: number;
    headings: HeadingsCount;
    headingsTotal: number;
  };
  structure: {
    lists: ListStats;
    images: number;
    links: number;
    tables: TableStats;
    code: CodeStats;
    blockquotes: number;
  };
  print: {
    estimatedPages: number;
    readingTimeMinutes: number;
    format: string;
    margins: string;
  };
}

/**
 * Interface para checklist de impressão
 */
export interface PrintChecklist {
  checks: string[];
  warnings: string[];
  ready: boolean;
}

/**
 * Classe para gerar relatórios de impressão
 */
export class PrintReporter {
  private html: string;
  private docName: string;
  private timestamp: Date;

  constructor(htmlContent: string, docName: string = 'document') {
    this.html = htmlContent;
    this.docName = docName;
    this.timestamp = new Date();
  }

  /**
   * Analisar conteúdo e gerar estatísticas detalhadas
   */
  analyze(): DocumentStats {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.html;

    const textContent = tempDiv.textContent || '';
    const wordArray = textContent.split(/\s+/).filter((w: string) => w.length > 0);
    const imageCount = tempDiv.querySelectorAll('img').length;

    const stats: DocumentStats = {
      // Texto
      text: textContent,
      words: wordArray.length,
      characters: textContent.length,

      // Estrutura
      headings: {
        h1: tempDiv.querySelectorAll('h1').length,
        h2: tempDiv.querySelectorAll('h2').length,
        h3: tempDiv.querySelectorAll('h3').length,
        h4: tempDiv.querySelectorAll('h4').length,
        h5: tempDiv.querySelectorAll('h5').length,
        h6: tempDiv.querySelectorAll('h6').length,
      },
      paragraphs: tempDiv.querySelectorAll('p').length,

      // Listas
      lists: {
        unordered: tempDiv.querySelectorAll('ul').length,
        ordered: tempDiv.querySelectorAll('ol').length,
        items: tempDiv.querySelectorAll('li').length,
      },

      // Mídia
      images: imageCount,
      links: tempDiv.querySelectorAll('a').length,

      // Tabelas
      tables: tempDiv.querySelectorAll('table').length,
      tableRows: tempDiv.querySelectorAll('tr').length,
      tableCells: tempDiv.querySelectorAll('th, td').length,

      // Código
      codeBlocks: tempDiv.querySelectorAll('pre').length,
      codeInline: tempDiv.querySelectorAll('code').length,

      // Blockquotes
      blockquotes: tempDiv.querySelectorAll('blockquote').length,

      // Computados
      readingTime: Math.ceil(wordArray.length / 200),
      estimatedPages: Math.ceil((textContent.length / 3500) + (imageCount * 0.5)),
    };

    return stats;
  }

  /**
   * Gerar relatório em formato texto estruturado
   */
  generateTextReport(): string {
    const stats = this.analyze();
    const now = new Date().toLocaleString('pt-BR');

    return `
╔════════════════════════════════════════════════════════════════╗
║                    RELATÓRIO DE IMPRESSÃO                      ║
╚════════════════════════════════════════════════════════════════╝

📄 DOCUMENTO
  Nome:                    ${this.docName}
  Data/Hora:               ${now}
  Tamanho Total:           ${(this.html.length / 1024).toFixed(2)} KB

📊 CONTEÚDO
  Palavras:                ${stats.words}
  Caracteres:              ${stats.characters}
  Parágrafos:              ${stats.paragraphs}
  Tempo de Leitura:        ~${stats.readingTime} minutos

🏗️  ESTRUTURA
  Headings H1:             ${stats.headings.h1}
  Headings H2:             ${stats.headings.h2}
  Headings H3:             ${stats.headings.h3}
  Total de Headings:       ${Object.values(stats.headings).reduce((a: number, b: number) => a + b, 0)}

📋 LISTAS
  Listas Não-Ordenadas:    ${stats.lists.unordered}
  Listas Ordenadas:        ${stats.lists.ordered}
  Total de Itens:          ${stats.lists.items}

🖼️  MÍDIA & LINKS
  Imagens:                 ${stats.images}
  Links:                   ${stats.links}

📊 TABELAS
  Tabelas:                 ${stats.tables}
  Linhas:                  ${stats.tableRows}
  Células:                 ${stats.tableCells}

💻 CÓDIGO
  Blocos de Código:        ${stats.codeBlocks}
  Código Inline:           ${stats.codeInline}

💬 CITAÇÕES
  Blockquotes:             ${stats.blockquotes}

📄 IMPRESSÃO
  Páginas Estimadas:       ${stats.estimatedPages}
  Tempo de Leitura:        ~${stats.readingTime} min
  Formato:                 A4 (${formatoA4})
  Margens:                 ${margemA4}

════════════════════════════════════════════════════════════════
`;
  }

  /**
   * Gerar relatório em JSON (para integração com APIs)
   */
  generateJsonReport(): JsonReport {
    const stats = this.analyze();
    const headingsTotal = Object.values(stats.headings).reduce(
      (a: number, b: number) => a + b,
      0
    );

    return {
      document: {
        name: this.docName,
        createdAt: this.timestamp.toISOString(),
        sizeKb: (this.html.length / 1024).toFixed(2),
      },
      content: {
        words: stats.words,
        characters: stats.characters,
        paragraphs: stats.paragraphs,
        headings: stats.headings,
        headingsTotal,
      },
      structure: {
        lists: stats.lists,
        images: stats.images,
        links: stats.links,
        tables: {
          count: stats.tables,
          rows: stats.tableRows,
          cells: stats.tableCells,
        },
        code: {
          blocks: stats.codeBlocks,
          inline: stats.codeInline,
        },
        blockquotes: stats.blockquotes,
      },
      print: {
        estimatedPages: stats.estimatedPages,
        readingTimeMinutes: stats.readingTime,
        format: 'A4',
        margins: margemA4,
      },
    };
  }

  /**
   * Gerar HTML visual do relatório
   */
  generateHtmlReport(): string {
    const stats = this.analyze();
    const now = new Date().toLocaleString('pt-BR');

    return `
<div class="print-report" style="font-family: monospace; font-size: 11pt; line-height: 1.6; margin-top: 20px; padding: 20px; border: 1px solid #ddd; background: #f9f9f9;">
    <h2 style="border-bottom: 2px solid #000; padding-bottom: 10px;">📋 Relatório de Impressão</h2>
    
    <h3 style="margin-top: 20px; color: #333;">Documento</h3>
    <p><strong>Nome:</strong> ${this.docName}</p>
    <p><strong>Data/Hora:</strong> ${now}</p>
    <p><strong>Tamanho:</strong> ${(this.html.length / 1024).toFixed(2)} KB</p>
    
    <h3 style="margin-top: 20px; color: #333;">Conteúdo</h3>
    <ul>
        <li>Palavras: ${stats.words}</li>
        <li>Caracteres: ${stats.characters}</li>
        <li>Parágrafos: ${stats.paragraphs}</li>
        <li>Tempo de Leitura: ~${stats.readingTime} minutos</li>
    </ul>
    
    <h3 style="margin-top: 20px; color: #333;">Mídia</h3>
    <ul>
        <li>Imagens: ${stats.images}</li>
        <li>Tabelas: ${stats.tables}</li>
        <li>Links: ${stats.links}</li>
        <li>Blocos de Código: ${stats.codeBlocks}</li>
    </ul>
    
    <h3 style="margin-top: 20px; color: #333;">Impressão</h3>
    <ul>
        <li>Páginas Estimadas: <strong>${stats.estimatedPages}</strong></li>
        <li>Formato: A4 (${formatoA4})</li>
        <li>Margens: ${margemA4}</li>
    </ul>
</div>
    `;
  }

  /**
   * Gerar checklist de impressão
   */
  generateChecklist(): PrintChecklist {
    const stats = this.analyze();
    const checks: string[] = [];
    const warnings: string[] = [];

    if (stats.words > 0) checks.push('✓ Conteúdo detectado');
    if (stats.images > 0) checks.push(`✓ ${stats.images} imagem(ns) detectada(s)`);
    if (stats.tables > 0) checks.push(`✓ ${stats.tables} tabela(s) detectada(s)`);
    if (stats.links > 0) checks.push(`✓ ${stats.links} link(s) detectado(s)`);

    // Avisos
    if (stats.estimatedPages > 100)
      warnings.push('⚠️  Documento muito longo (100+ páginas)');
    if (stats.images > 50)
      warnings.push('⚠️  Muitas imagens (50+) - pode ser lento');
    if (stats.tableRows > 1000)
      warnings.push('⚠️  Tabelas muito grandes (1000+ linhas)');

    return {
      checks,
      warnings,
      ready: warnings.length === 0,
    };
  }
}

/**
 * Helper functions
 */

/**
 * Criar uma instância de PrintReporter
 */
export function createReporter(
  htmlContent: string,
  docName: string = 'document'
): PrintReporter {
  return new PrintReporter(htmlContent, docName);
}

/**
 * Gerar relatório de texto e registrar no console
 */
export function reportToConsole(
  htmlContent: string,
  docName: string = 'document'
): void {
  const reporter = new PrintReporter(htmlContent, docName);
  logInfo(reporter.generateTextReport());
}

/**
 * Gerar relatório em HTML
 */
export function reportToHtml(
  htmlContent: string,
  docName: string = 'document'
): string {
  const reporter = new PrintReporter(htmlContent, docName);
  return reporter.generateHtmlReport();
}

/**
 * Analisar conteúdo HTML e obter estatísticas
 */
export function getAnalysis(htmlContent: string): DocumentStats {
  const reporter = new PrintReporter(htmlContent);
  return reporter.analyze();
}
