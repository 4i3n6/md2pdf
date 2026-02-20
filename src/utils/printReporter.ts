import { PrintLimits } from '@/constants'
import { logInfo } from '@/utils/logger'

const a4Format = `${PrintLimits.a4WidthMm}mm × ${PrintLimits.a4HeightMm}mm`
const a4Margin = `${PrintLimits.marginMm}mm`

export interface HeadingsCount {
  h1: number;
  h2: number;
  h3: number;
  h4: number;
  h5: number;
  h6: number;
}

export interface ListStats {
  unordered: number;
  ordered: number;
  items: number;
}

export interface TableStats {
  count: number;
  rows: number;
  cells: number;
}

export interface CodeStats {
  blocks: number;
  inline: number;
}

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

export interface PrintChecklist {
  checks: string[];
  warnings: string[];
  ready: boolean;
}

export class PrintReporter {
  private html: string;
  private docName: string;
  private timestamp: Date;

  constructor(htmlContent: string, docName: string = 'document') {
    this.html = htmlContent;
    this.docName = docName;
    this.timestamp = new Date();
  }

  analyze(): DocumentStats {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.html;

    const textContent = tempDiv.textContent || '';
    const wordArray = textContent.split(/\s+/).filter((w: string) => w.length > 0);
    const imageCount = tempDiv.querySelectorAll('img').length;

    const stats: DocumentStats = {
      text: textContent,
      words: wordArray.length,
      characters: textContent.length,
      headings: {
        h1: tempDiv.querySelectorAll('h1').length,
        h2: tempDiv.querySelectorAll('h2').length,
        h3: tempDiv.querySelectorAll('h3').length,
        h4: tempDiv.querySelectorAll('h4').length,
        h5: tempDiv.querySelectorAll('h5').length,
        h6: tempDiv.querySelectorAll('h6').length,
      },
      paragraphs: tempDiv.querySelectorAll('p').length,
      lists: {
        unordered: tempDiv.querySelectorAll('ul').length,
        ordered: tempDiv.querySelectorAll('ol').length,
        items: tempDiv.querySelectorAll('li').length,
      },
      images: imageCount,
      links: tempDiv.querySelectorAll('a').length,
      tables: tempDiv.querySelectorAll('table').length,
      tableRows: tempDiv.querySelectorAll('tr').length,
      tableCells: tempDiv.querySelectorAll('th, td').length,
      codeBlocks: tempDiv.querySelectorAll('pre').length,
      codeInline: tempDiv.querySelectorAll('code').length,
      blockquotes: tempDiv.querySelectorAll('blockquote').length,
      readingTime: Math.ceil(wordArray.length / 200),
      estimatedPages: Math.ceil((textContent.length / 3500) + (imageCount * 0.5)),
    };

    return stats;
  }

  generateTextReport(): string {
    const stats = this.analyze();
    const now = new Date().toLocaleString('en-US');

    return `
╔════════════════════════════════════════════════════════════════╗
║                      PRINT REPORT                              ║
╚════════════════════════════════════════════════════════════════╝

DOCUMENT
  Name:                    ${this.docName}
  Date/Time:               ${now}
  Total Size:              ${(this.html.length / 1024).toFixed(2)} KB

CONTENT
  Words:                   ${stats.words}
  Characters:              ${stats.characters}
  Paragraphs:              ${stats.paragraphs}
  Reading Time:            ~${stats.readingTime} min

STRUCTURE
  Headings H1:             ${stats.headings.h1}
  Headings H2:             ${stats.headings.h2}
  Headings H3:             ${stats.headings.h3}
  Total Headings:          ${Object.values(stats.headings).reduce((a: number, b: number) => a + b, 0)}

LISTS
  Unordered Lists:         ${stats.lists.unordered}
  Ordered Lists:           ${stats.lists.ordered}
  Total Items:             ${stats.lists.items}

MEDIA & LINKS
  Images:                  ${stats.images}
  Links:                   ${stats.links}

TABLES
  Tables:                  ${stats.tables}
  Rows:                    ${stats.tableRows}
  Cells:                   ${stats.tableCells}

CODE
  Code Blocks:             ${stats.codeBlocks}
  Inline Code:             ${stats.codeInline}

BLOCKQUOTES
  Blockquotes:             ${stats.blockquotes}

PRINT
  Estimated Pages:         ${stats.estimatedPages}
  Reading Time:            ~${stats.readingTime} min
  Format:                  A4 (${a4Format})
  Margins:                 ${a4Margin}

════════════════════════════════════════════════════════════════
`;
  }

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
        margins: a4Margin,
      },
    };
  }

  generateHtmlReport(): string {
    const stats = this.analyze();
    const now = new Date().toLocaleString('en-US');

    return `
<div class="print-report" style="font-family: monospace; font-size: 11pt; line-height: 1.6; margin-top: 20px; padding: 20px; border: 1px solid #ddd; background: #f9f9f9;">
    <h2 style="border-bottom: 2px solid #000; padding-bottom: 10px;">Print Report</h2>

    <h3 style="margin-top: 20px; color: #333;">Document</h3>
    <p><strong>Name:</strong> ${this.docName}</p>
    <p><strong>Date/Time:</strong> ${now}</p>
    <p><strong>Size:</strong> ${(this.html.length / 1024).toFixed(2)} KB</p>

    <h3 style="margin-top: 20px; color: #333;">Content</h3>
    <ul>
        <li>Words: ${stats.words}</li>
        <li>Characters: ${stats.characters}</li>
        <li>Paragraphs: ${stats.paragraphs}</li>
        <li>Reading Time: ~${stats.readingTime} min</li>
    </ul>

    <h3 style="margin-top: 20px; color: #333;">Media</h3>
    <ul>
        <li>Images: ${stats.images}</li>
        <li>Tables: ${stats.tables}</li>
        <li>Links: ${stats.links}</li>
        <li>Code Blocks: ${stats.codeBlocks}</li>
    </ul>

    <h3 style="margin-top: 20px; color: #333;">Print</h3>
    <ul>
        <li>Estimated Pages: <strong>${stats.estimatedPages}</strong></li>
        <li>Format: A4 (${a4Format})</li>
        <li>Margins: ${a4Margin}</li>
    </ul>
</div>
    `;
  }

  generateChecklist(): PrintChecklist {
    const stats = this.analyze();
    const checks: string[] = [];
    const warnings: string[] = [];

    if (stats.words > 0) checks.push('✓ Content detected');
    if (stats.images > 0) checks.push(`✓ ${stats.images} image(s) detected`);
    if (stats.tables > 0) checks.push(`✓ ${stats.tables} table(s) detected`);
    if (stats.links > 0) checks.push(`✓ ${stats.links} link(s) detected`);

    if (stats.estimatedPages > 100)
      warnings.push('⚠️  Document is very long (100+ pages)');
    if (stats.images > 50)
      warnings.push('⚠️  Many images (50+) - may be slow');
    if (stats.tableRows > 1000)
      warnings.push('⚠️  Very large tables (1000+ rows)');

    return {
      checks,
      warnings,
      ready: warnings.length === 0,
    };
  }
}

export function createReporter(
  htmlContent: string,
  docName: string = 'document'
): PrintReporter {
  return new PrintReporter(htmlContent, docName);
}

export function reportToConsole(
  htmlContent: string,
  docName: string = 'document'
): void {
  const reporter = new PrintReporter(htmlContent, docName);
  logInfo(reporter.generateTextReport());
}

export function reportToHtml(
  htmlContent: string,
  docName: string = 'document'
): string {
  const reporter = new PrintReporter(htmlContent, docName);
  return reporter.generateHtmlReport();
}

export function getAnalysis(htmlContent: string): DocumentStats {
  const reporter = new PrintReporter(htmlContent);
  return reporter.analyze();
}
