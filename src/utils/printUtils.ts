/**
 * UTILITÁRIOS PARA IMPRESSÃO - MD2PDF
 * Funções de validação, otimização e controle de impressão
 */

import { ImpressaoLimites } from '@/constants'
import { logAviso, logErro, logInfo } from '@/utils/logger'
import { runPipeline, type PipelineStage } from '@/utils/pipeline'

/**
 * Resultado de validação de conteúdo para impressão
 */
export interface ValidationResult {
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

export interface PrintDocumentOptions {
  previewElement?: HTMLElement | null;
  validation?: ValidationResult;
}

type ValidationPipelineContext = {
  container: HTMLElement;
  htmlContent: string;
  isLive: boolean;
  issues: string[];
}

const PrintTimings = {
  afterPrintRestoreDelayMs: 100,
  fallbackRestoreTimeoutMs: 5000
} as const;

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
    const containerWidthPx = obterLarguraContainer(container);
    if (containerWidthPx <= 0) return;

    // Tolerancia para evitar falso positivo por bordas, arredondamento e scrollbar.
    // Avisa apenas quando o excesso é realmente perceptível no print.
    const toleranciaPx = Math.max(12, containerWidthPx * 0.02);

    tables.forEach((table, idx) => {
        const tableWidthPx = obterLarguraTabela(table);
        if (tableWidthPx <= 0) return;
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

const validadoresConteudoImpressao: PipelineStage<ValidationPipelineContext>[] = [
    {
        id: 'validar-imagens-print',
        enabled: (contexto) => contexto.isLive,
        run: async (contexto): Promise<void> => {
            const images = Array.from(contexto.container.querySelectorAll('img'));
            if (images.length > 0) {
                await aguardarImagensCarregadas(images);
            }
            validarImagensNoContainer(contexto.container, contexto.issues);
        }
    },
    {
        id: 'validar-tabelas-print',
        enabled: (contexto) => contexto.isLive,
        run: (contexto): void => {
            validarTabelasNoContainer(contexto.container, contexto.issues);
        }
    },
    {
        id: 'validar-urls-longas-print',
        run: (contexto): void => {
            validarUrlsLongasNoHtml(contexto.htmlContent, contexto.issues);
        }
    }
]

function obterPreviewElement(options?: PrintDocumentOptions): HTMLElement | null {
  if (options && 'previewElement' in options) {
    return options.previewElement ?? null;
  }
  return document.getElementById('preview') as HTMLElement | null;
}

async function obterValidacaoParaImpressao(
  preview: HTMLElement,
  options?: PrintDocumentOptions
): Promise<ValidationResult> {
  if (options?.validation) {
    return options.validation;
  }
  return await validatePrintContent(preview);
}

function confirmarImpressaoComAvisos(
  validation: ValidationResult,
  logger: (message: string) => void
): boolean {
  if (validation.issues.length === 0) return true;

  validation.issues.forEach((issue) => logger(issue));
  return confirm(`${validation.issues.length} aviso(s) de impressão.\nContinuar mesmo assim?`);
}

function aplicarTituloPdfTemporario(docName: string): () => void {
  const originalTitle = document.title;
  const pdfName = docName.replace(/\.md$/i, '');
  document.title = pdfName;
  return (): void => {
    document.title = originalTitle;
  };
}

function abrirDialogoComRestauracao(onRestore: () => void): void {
  let hasRestored = false;

  const doRestore = (): void => {
    if (hasRestored) return;
    hasRestored = true;
    onRestore();
  };

  const afterPrintHandler = (): void => {
    setTimeout(doRestore, PrintTimings.afterPrintRestoreDelayMs);
  };

  window.addEventListener('afterprint', afterPrintHandler, { once: true });
  window.print();

  setTimeout(() => {
    if (!hasRestored) {
      logAviso('[Print] Fallback: restaurando apos timeout');
      doRestore();
    }
  }, PrintTimings.fallbackRestoreTimeoutMs);
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
  const contexto: ValidationPipelineContext = {
    container,
    htmlContent: typeof content === 'string' ? content : container.innerHTML,
    isLive: container.isConnected,
    issues
  }
  await runPipeline(contexto, validadoresConteudoImpressao)

  return {
    isValid: issues.length === 0,
    issues,
  };
}

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

function definirPrintPreviewAtivo(ativo: boolean): void {
  if (ativo) {
    document.body.classList.add('print-mode');
    registrarHandlerEscapePrintPreview();
    return;
  }

  document.body.classList.remove('print-mode');
  removerHandlerEscapePrintPreview();
}

/**
 * Otimiza página para impressão (esconde elementos desnecessários)
 * NOTA: Não modificamos mais o DOM - deixamos o CSS @media print cuidar disso
 * @returns Sucesso da operação
 */
export function optimizeForPrint(): boolean {
  try {
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
    definirPrintPreviewAtivo(false);

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
  logger: (message: string) => void = logInfo,
  options?: PrintDocumentOptions
): Promise<boolean> {
  return new Promise((resolve) => {
    const executar = async (): Promise<void> => {
      let restaurarTitulo: (() => void) | null = null;

      try {
        const preview = obterPreviewElement(options);
        if (!preview) {
          logger('Erro: elemento preview não encontrado');
          resolve(false);
          return;
        }

        const validation = await obterValidacaoParaImpressao(preview, options);
        if (!confirmarImpressaoComAvisos(validation, logger)) {
          resolve(false);
          return;
        }

        restaurarTitulo = aplicarTituloPdfTemporario(docName);
        abrirDialogoComRestauracao(() => {
          restaurarTitulo?.();
          restoreAfterPrint();
          resolve(true);
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logErro(`Erro ao imprimir: ${errorMsg}`);
        restaurarTitulo?.();
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
  const ativo = document.body.classList.contains('print-mode');
  definirPrintPreviewAtivo(!ativo);
}

/**
 * Entra em modo de preview (não toggle)
 * @returns Se entrou ou já estava
 */
export function enterPrintPreview(): boolean {
  if (document.body.classList.contains('print-mode')) return false;
  definirPrintPreviewAtivo(true);
  return true;
}

/**
 * Sai do modo de preview
 * @returns Se saiu ou já estava fora
 */
export function exitPrintPreview(): boolean {
  if (!document.body.classList.contains('print-mode')) return false;
  definirPrintPreviewAtivo(false);
  return true;
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
