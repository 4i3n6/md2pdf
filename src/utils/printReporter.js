/**
 * RELATÓRIO DE IMPRESSÃO AVANÇADO - MD2PDF
 * Gera relatórios detalhados e estatísticas do documento
 */

/**
 * Classe para gerar relatórios de impressão
 */
class PrintReporter {
    constructor(htmlContent, docName = 'document') {
        this.html = htmlContent;
        this.docName = docName;
        this.timestamp = new Date();
    }

    /**
     * Analisar conteúdo e gerar estatísticas detalhadas
     */
    analyze() {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.html;

        const stats = {
            // Texto
            text: tempDiv.textContent || '',
            words: (tempDiv.textContent || '').split(/\s+/).filter(w => w.length > 0).length,
            characters: (tempDiv.textContent || '').length,
            
            // Estrutura
            headings: {
                h1: tempDiv.querySelectorAll('h1').length,
                h2: tempDiv.querySelectorAll('h2').length,
                h3: tempDiv.querySelectorAll('h3').length,
                h4: tempDiv.querySelectorAll('h4').length,
                h5: tempDiv.querySelectorAll('h5').length,
                h6: tempDiv.querySelectorAll('h6').length
            },
            paragraphs: tempDiv.querySelectorAll('p').length,
            
            // Listas
            lists: {
                unordered: tempDiv.querySelectorAll('ul').length,
                ordered: tempDiv.querySelectorAll('ol').length,
                items: tempDiv.querySelectorAll('li').length
            },
            
            // Mídia
            images: tempDiv.querySelectorAll('img').length,
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
            readingTime: Math.ceil((tempDiv.textContent || '').split(/\s+/).length / 200),
            estimatedPages: Math.ceil(((tempDiv.textContent || '').length / 3500) + 
                                    (tempDiv.querySelectorAll('img').length * 0.5)),
        };

        return stats;
    }

    /**
     * Gerar relatório em formato texto estruturado
     */
    generateTextReport() {
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
  Total de Headings:       ${Object.values(stats.headings).reduce((a,b) => a+b, 0)}

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
  Formato:                 A4 (210mm × 297mm)
  Margens:                 20mm

════════════════════════════════════════════════════════════════
`;
    }

    /**
     * Gerar relatório em JSON (para integração com APIs)
     */
    generateJsonReport() {
        const stats = this.analyze();
        return {
            document: {
                name: this.docName,
                createdAt: this.timestamp.toISOString(),
                sizeKb: (this.html.length / 1024).toFixed(2)
            },
            content: {
                words: stats.words,
                characters: stats.characters,
                paragraphs: stats.paragraphs,
                headings: stats.headings,
                headingsTotal: Object.values(stats.headings).reduce((a,b) => a+b, 0)
            },
            structure: {
                lists: stats.lists,
                images: stats.images,
                links: stats.links,
                tables: {
                    count: stats.tables,
                    rows: stats.tableRows,
                    cells: stats.tableCells
                },
                code: {
                    blocks: stats.codeBlocks,
                    inline: stats.codeInline
                },
                blockquotes: stats.blockquotes
            },
            print: {
                estimatedPages: stats.estimatedPages,
                readingTimeMinutes: stats.readingTime,
                format: 'A4',
                margins: '20mm'
            }
        };
    }

    /**
     * Gerar HTML visual do relatório
     */
    generateHtmlReport() {
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
        <li>Formato: A4 (210mm × 297mm)</li>
        <li>Margens: 20mm</li>
    </ul>
</div>
        `;
    }

    /**
     * Gerar checklist de impressão
     */
    generateChecklist() {
        const stats = this.analyze();
        const checks = [];

        if (stats.words > 0) checks.push('✓ Conteúdo detectado');
        if (stats.images > 0) checks.push(`✓ ${stats.images} imagem(ns) detectada(s)`);
        if (stats.tables > 0) checks.push(`✓ ${stats.tables} tabela(s) detectada(s)`);
        if (stats.links > 0) checks.push(`✓ ${stats.links} link(s) detectado(s)`);
        
        // Avisos
        const warnings = [];
        if (stats.estimatedPages > 100) warnings.push('⚠️  Documento muito longo (100+ páginas)');
        if (stats.images > 50) warnings.push('⚠️  Muitas imagens (50+) - pode ser lento');
        if (stats.tableRows > 1000) warnings.push('⚠️  Tabelas muito grandes (1000+ linhas)');
        
        return {
            checks,
            warnings,
            ready: warnings.length === 0
        };
    }
}

export { PrintReporter };

/**
 * Helper functions
 */

export function createReporter(htmlContent, docName) {
    return new PrintReporter(htmlContent, docName);
}

export function reportToConsole(htmlContent, docName) {
    const reporter = new PrintReporter(htmlContent, docName);
    console.log(reporter.generateTextReport());
}

export function reportToHtml(htmlContent, docName) {
    const reporter = new PrintReporter(htmlContent, docName);
    return reporter.generateHtmlReport();
}

export function getAnalysis(htmlContent) {
    const reporter = new PrintReporter(htmlContent);
    return reporter.analyze();
}
