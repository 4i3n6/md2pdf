/**
 * UTILITÁRIOS PARA IMPRESSÃO - MD2PDF
 * Funções de validação, otimização e controle de impressão
 */

/**
 * Resultado de validação de conteúdo para impressão
 */
interface ValidationResult {
  isValid: boolean;
  issues: string[];
}

/**
 * Estatísticas do documento para impressão
 */
interface PrintStatistics {
  words: number;
  paragraphs: number;
  images: number;
  tables: number;
  lists: number;
  estimatedPages: number;
  estimatedReadTime: number;
}

/**
 * Valida conteúdo renderizado para possíveis problemas de impressão
 * @param htmlContent - Conteúdo HTML renderizado
 * @returns Resultado da validação com lista de problemas encontrados
 */
export function validatePrintContent(htmlContent: string): ValidationResult {
  const issues: string[] = [];

  if (!htmlContent) {
    return { isValid: false, issues: ['Nenhum conteúdo para imprimir'] };
  }

  // Validar imagens muito grandes
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  const images = tempDiv.querySelectorAll('img');
  images.forEach((img, idx) => {
    // Tentar carregar dimensões
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      const maxWidth = 170; // mm em A4
      const maxHeight = 250; // mm em A4
      const imgWidthMm = img.naturalWidth / 3.779; // px to mm
      const imgHeightMm = img.naturalHeight / 3.779;

      if (imgWidthMm > maxWidth || imgHeightMm > maxHeight) {
        issues.push(`⚠️ Imagem ${idx + 1}: ${img.naturalWidth}x${img.naturalHeight}px pode não caber na página A4`);
      }
    }
  });

  // Validar tabelas muito largas
  const tables = tempDiv.querySelectorAll('table');
  tables.forEach((table, idx) => {
    const tableWidthMm = table.offsetWidth / 3.779;
    if (tableWidthMm > 170) {
      issues.push(`⚠️ Tabela ${idx + 1}: ${Math.round(tableWidthMm)}mm de largura pode não caber na página A4 (máx 170mm)`);
    }
  });

  // Validar linhas muito longas (URLs)
  const longLines = htmlContent.match(/https?:\/\/[^\s<>"]{80,}/g);
  if (longLines && longLines.length > 0) {
    issues.push(`⚠️ ${longLines.length} URL(s) muito longa(s) podem transbordar em impressão`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Armazena estado original dos elementos antes de modificar para print
 * Chave: seletor CSS, Valor: array com dados do estado original
 */
const elementStates = new Map<string, Array<{ el: HTMLElement; originalStyle: string }>>();

/**
 * Otimiza página para impressão (esconde elementos desnecessários)
 * NOTA: Não modificamos mais o DOM - deixamos o CSS @media print cuidar disso
 * @returns Sucesso da operação
 */
export function optimizeForPrint(): boolean {
  try {
    // Limpar estados anteriores
    elementStates.clear();
    
    // Não precisamos mais esconder elementos manualmente
    // O CSS @media print em styles-print.css já cuida disso
    // Isso evita problemas de restauração do DOM
    
    return true;
  } catch (error) {
    console.error('Erro ao otimizar para print:', error);
    return false;
  }
}

/**
 * Restaura estado da página após impressão
 * @returns Sucesso da operação
 */
export function restoreAfterPrint(): boolean {
  try {
    // Limpar qualquer classe ou estilo residual que possa ter sido adicionado
    document.body.classList.remove('print-mode');
    
    // Forçar re-render removendo e re-adicionando estilos inline
    const allElements = document.querySelectorAll('.sidebar, .top-bar, .pane-header, .editor-frame, #console-log, .app-grid, .workspace, .pane-container');
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      // Limpar qualquer estilo inline que possa ter sido adicionado
      htmlEl.style.display = '';
      htmlEl.style.width = '';
      htmlEl.style.visibility = '';
    });

    // Limpar mapa de estados
    elementStates.clear();

    return true;
  } catch (error) {
    console.error('Erro ao restaurar após print:', error);
    return false;
  }
}

/**
 * Abre diálogo de impressão com validação e otimização
 * @param _docName - Nome do documento (para título)
 * @param logger - Função de logging (opcional)
 * @returns Promise que resolve quando usuário fecha diálogo
 */
export function printDocument(
  docName: string = 'document',
  logger: (message: string) => void = console.log
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Validar conteúdo antes de imprimir
      const preview = document.getElementById('preview') as HTMLElement | null;
      if (!preview) {
        logger('Erro: elemento preview não encontrado');
        resolve(false);
        return;
      }

      const validation = validatePrintContent(preview.innerHTML);
      if (validation.issues.length > 0) {
        validation.issues.forEach((issue) => logger(issue));

        // Perguntar ao usuário se deseja continuar
        if (!confirm(`${validation.issues.length} aviso(s) de impressão.\nContinuar mesmo assim?`)) {
          resolve(false);
          return;
        }
      }

      // Guardar título original e definir nome do documento como título
      // Navegadores usam o título da página como nome padrão do PDF
      const originalTitle = document.title;
      const pdfName = docName.replace(/\.md$/i, ''); // Remove extensão .md
      document.title = pdfName;

      // Flag para evitar múltiplas restaurações
      let hasRestored = false;
      
      const doRestore = (): void => {
        if (hasRestored) return;
        hasRestored = true;
        // Restaurar título original
        document.title = originalTitle;
        restoreAfterPrint();
        resolve(true);
      };

      // Aguardar fechamento do diálogo de impressão
      const afterPrintHandler = (): void => {
        // Pequeno delay para garantir que o navegador terminou o processo
        setTimeout(doRestore, 100);
      };

      // Registrar handler ANTES de chamar print()
      window.addEventListener('afterprint', afterPrintHandler, { once: true });

      // Abrir diálogo de impressão
      // O CSS @media print cuida de esconder/mostrar elementos automaticamente
      window.print();

      // Fallback: se afterprint não disparar em 5 segundos, restaurar mesmo assim
      // Alguns navegadores (especialmente ao salvar como PDF) podem não disparar afterprint
      setTimeout(() => {
        if (!hasRestored) {
          console.log('[Print] Fallback: restaurando após timeout');
          doRestore();
        }
      }, 5000);

    } catch (error) {
      console.error('Erro ao imprimir:', error);
      restoreAfterPrint();
      resolve(false);
    }
  });
}

/**
 * Ativa modo de preview de impressão (emula print media no CSS)
 * Permite ao usuário ver como ficará a impressão sem abrir print dialog
 * Pressione ESC para sair
 */
export function togglePrintPreview(): void {
  const isEntering = !document.body.classList.contains('print-mode');
  document.body.classList.toggle('print-mode');

  if (isEntering) {
    // Adicionar listener para ESC quando entrar no modo
    const escapeHandler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && document.body.classList.contains('print-mode')) {
        document.body.classList.remove('print-mode');
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }
}

/**
 * Entra em modo de preview (não toggle)
 * @returns Se entrou ou já estava
 */
export function enterPrintPreview(): boolean {
  if (!document.body.classList.contains('print-mode')) {
    togglePrintPreview();
    return true;
  }
  return false;
}

/**
 * Sai do modo de preview
 * @returns Se saiu ou já estava fora
 */
export function exitPrintPreview(): boolean {
  if (document.body.classList.contains('print-mode')) {
    document.body.classList.remove('print-mode');
    return true;
  }
  return false;
}

/**
 * Calcula estatísticas do documento para impressão
 * @param htmlContent - Conteúdo HTML
 * @returns Estatísticas (palavras, parágrafos, imagens, etc)
 */
export function getPrintStatistics(htmlContent: string): PrintStatistics {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  const text = tempDiv.textContent ?? '';
  const words = text.split(/\s+/).filter((w) => w.length > 0).length;
  const paragraphs = tempDiv.querySelectorAll('p').length;
  const images = tempDiv.querySelectorAll('img').length;
  const tables = tempDiv.querySelectorAll('table').length;
  const lists = tempDiv.querySelectorAll('ul, ol').length;

  return {
    words,
    paragraphs,
    images,
    tables,
    lists,
    estimatedPages: Math.ceil(words / 250 + images * 0.5), // Estimativa simples
    estimatedReadTime: Math.ceil(words / 200), // minutos
  };
}

/**
 * Gera relatório de impressão para logging
 * @param docName - Nome do documento
 * @param htmlContent - Conteúdo HTML
 * @returns Relatório formatado
 */
export function generatePrintReport(docName: string, htmlContent: string): string {
  const stats = getPrintStatistics(htmlContent);
  const validation = validatePrintContent(htmlContent);

  return `
=== RELATÓRIO DE IMPRESSÃO ===
Documento: ${docName}
Palavras: ${stats.words}
Parágrafos: ${stats.paragraphs}
Imagens: ${stats.images}
Tabelas: ${stats.tables}
Listas: ${stats.lists}
Páginas estimadas: ${stats.estimatedPages}
Tempo de leitura: ~${stats.estimatedReadTime}min
Status: ${validation.isValid ? '✓ PRONTO PARA IMPRESSÃO' : '⚠️ COM AVISOS'}
${validation.issues.length > 0 ? 'Avisos:\n' + validation.issues.map((i) => '  ' + i).join('\n') : ''}
============================
  `.trim();
}
