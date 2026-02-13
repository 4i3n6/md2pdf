/**
 * UTILITÁRIOS PARA IMPRESSÃO - MD2PDF
 * Funções de validação, otimização e controle de impressão
 */

import { ImpressaoLimites } from '@/constants'
import { logAviso, logErro, logInfo } from '@/utils/logger'

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

type PrintContentTarget = string | HTMLElement;

function criarContainerTemporario(htmlContent: string): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    return container;
}

async function aguardarImagensCarregadas(
    images: HTMLImageElement[],
    timeoutMs: number = 2000
): Promise<void> {
    const pendentes = images.filter((img) => !img.complete);
    if (pendentes.length === 0) return;

    await Promise.race([
        Promise.all(
            pendentes.map(
                (img) =>
                    new Promise<void>((resolve) => {
                        const onDone = (): void => resolve();
                        img.addEventListener('load', onDone, { once: true });
                        img.addEventListener('error', onDone, { once: true });
                    })
            )
        ),
        new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
    ]);
}

function obterDimensoesImagem(img: HTMLImageElement): { widthPx: number; heightPx: number } {
    const rect = img.getBoundingClientRect();
    const datasetWidth = Number(img.dataset['originalWidth'] || 0);
    const datasetHeight = Number(img.dataset['originalHeight'] || 0);

    return {
        widthPx: rect.width || datasetWidth || img.naturalWidth || 0,
        heightPx: rect.height || datasetHeight || img.naturalHeight || 0
    };
}

function obterLarguraTabela(table: HTMLTableElement): number {
    const rect = table.getBoundingClientRect();
    return rect.width || table.scrollWidth || table.offsetWidth || 0;
}

function obterLarguraContainer(container: HTMLElement): number {
    const rect = container.getBoundingClientRect();
    return rect.width || container.clientWidth || container.scrollWidth || 0;
}

function validarImagensNoContainer(container: HTMLElement, issues: string[]): void {
    const images = Array.from(container.querySelectorAll('img'));

    images.forEach((img, idx) => {
        const dims = obterDimensoesImagem(img);
        if (dims.widthPx <= 0 || dims.heightPx <= 0) return;

        const maxWidthMm = ImpressaoLimites.maxLarguraMm;
        const maxHeightMm = ImpressaoLimites.maxAlturaMm;
        const pxPorMm = ImpressaoLimites.pxPorMm;
        const imgWidthMm = dims.widthPx / pxPorMm;
        const imgHeightMm = dims.heightPx / pxPorMm;

        if (imgWidthMm > maxWidthMm || imgHeightMm > maxHeightMm) {
            issues.push(`⚠️ Imagem ${idx + 1}: ${Math.round(dims.widthPx)}x${Math.round(dims.heightPx)}px pode não caber na página A4`);
        }
    });
}

function validarTabelasNoContainer(container: HTMLElement, issues: string[]): void {
    const tables = Array.from(container.querySelectorAll('table'));

    tables.forEach((table, idx) => {
        const tableWidthPx = obterLarguraTabela(table);
        const containerWidthPx = obterLarguraContainer(container);
        if (tableWidthPx <= 0 || containerWidthPx <= 0) return;

        // Tolerancia para evitar falso positivo por bordas, arredondamento e scrollbar.
        // Avisa apenas quando o excesso é realmente perceptível no print.
        const toleranciaPx = Math.max(12, containerWidthPx * 0.02);
        const excessoNoContainer = Math.max(0, tableWidthPx - containerWidthPx);
        const excessoInterno = Math.max(0, table.scrollWidth - table.clientWidth);
        const excessoDetectado = Math.max(excessoNoContainer, excessoInterno);

        if (excessoDetectado > toleranciaPx) {
            issues.push(
                `⚠️ Tabela ${idx + 1}: ${Math.round(tableWidthPx)}px (área útil ${Math.round(containerWidthPx)}px, excesso ${Math.round(excessoDetectado)}px) pode transbordar na impressão`
            );
        }
    });
}

function validarUrlsLongasNoHtml(htmlContent: string, issues: string[]): void {
    const longLines = htmlContent.match(/https?:\/\/[^\s<>"]{80,}/g);
    if (longLines && longLines.length > 0) {
        issues.push(`⚠️ ${longLines.length} URL(s) muito longa(s) podem transbordar em impressão`);
    }
}

/**
 * Valida conteúdo renderizado para possíveis problemas de impressão
 * @param htmlContent - Conteúdo HTML renderizado
 * @returns Resultado da validação com lista de problemas encontrados
 */
export async function validatePrintContent(content: PrintContentTarget): Promise<ValidationResult> {
  const issues: string[] = [];

  if (!content || (typeof content === 'string' && content.length === 0)) {
    return { isValid: false, issues: ['Nenhum conteúdo para imprimir'] };
  }

  const container = typeof content === 'string' ? criarContainerTemporario(content) : content;
  const isLive = container.isConnected;

  if (isLive) {
    const images = Array.from(container.querySelectorAll('img'));
    if (images.length > 0) {
        await aguardarImagensCarregadas(images);
    }
    validarImagensNoContainer(container, issues);
    validarTabelasNoContainer(container, issues);
  }

  // Validar linhas muito longas (URLs)
  const htmlContent = typeof content === 'string' ? content : container.innerHTML;
  validarUrlsLongasNoHtml(htmlContent, issues);

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
let printPreviewEscapeHandler: ((e: KeyboardEvent) => void) | null = null;

function removerHandlerEscapePrintPreview(): void {
  if (!printPreviewEscapeHandler) return;
  document.removeEventListener('keydown', printPreviewEscapeHandler);
  printPreviewEscapeHandler = null;
}

function registrarHandlerEscapePrintPreview(): void {
  if (printPreviewEscapeHandler) return;

  printPreviewEscapeHandler = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && document.body.classList.contains('print-mode')) {
      exitPrintPreview();
    }
  };

  document.addEventListener('keydown', printPreviewEscapeHandler);
}

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
    const errorMsg = error instanceof Error ? error.message : String(error);
    logErro(`Erro ao otimizar para print: ${errorMsg}`);
    return false;
  }
}

/**
 * Restaura estado da página após impressão
 * @returns Sucesso da operação
 */
export function restoreAfterPrint(): boolean {
  try {
    // Limpar classe de preview e handlers temporários
    document.body.classList.remove('print-mode');
    removerHandlerEscapePrintPreview();

    // Limpar mapa de estados
    elementStates.clear();

    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logErro(`Erro ao restaurar após print: ${errorMsg}`);
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
  logger: (message: string) => void = logInfo
): Promise<boolean> {
  return new Promise((resolve) => {
    const executar = async (): Promise<void> => {
      try {
        // Validar conteúdo antes de imprimir
        const preview = document.getElementById('preview') as HTMLElement | null;
        if (!preview) {
          logger('Erro: elemento preview não encontrado');
          resolve(false);
          return;
        }

        const validation = await validatePrintContent(preview);
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
            logAviso('[Print] Fallback: restaurando apos timeout');
            doRestore();
          }
        }, 5000);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logErro(`Erro ao imprimir: ${errorMsg}`);
        restoreAfterPrint();
        resolve(false);
      }
    };

    executar();
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
    registrarHandlerEscapePrintPreview();
  } else {
    removerHandlerEscapePrintPreview();
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
    removerHandlerEscapePrintPreview();
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
export async function generatePrintReport(docName: string, htmlContent: string): Promise<string> {
  const stats = getPrintStatistics(htmlContent);
  const validation = await validatePrintContent(htmlContent);

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
