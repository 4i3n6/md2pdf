import { PrintLimits } from '@/constants'
import { logWarn, logError, logInfo } from '@/utils/logger'
import { runPipeline, type PipelineStage } from '@/utils/pipeline'
import { confirm } from '@/services/modalService'

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
}

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

function createTempContainer(htmlContent: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  return container;
}

async function waitForImages(
  images: HTMLImageElement[],
  timeoutMs: number = 2000
): Promise<void> {
  const pending = images.filter((img) => !img.complete);
  if (pending.length === 0) return;

  await Promise.race([
    Promise.all(
      pending.map(
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

function getImageDimensions(img: HTMLImageElement): { widthPx: number; heightPx: number } {
  const rect = img.getBoundingClientRect();
  const datasetWidth = Number(img.dataset['originalWidth'] || 0);
  const datasetHeight = Number(img.dataset['originalHeight'] || 0);

  return {
    widthPx: rect.width || datasetWidth || img.naturalWidth || 0,
    heightPx: rect.height || datasetHeight || img.naturalHeight || 0
  };
}

function getTableWidth(table: HTMLTableElement): number {
  const rect = table.getBoundingClientRect();
  return rect.width || table.scrollWidth || table.offsetWidth || 0;
}

function getContainerWidth(container: HTMLElement): number {
  const rect = container.getBoundingClientRect();
  return rect.width || container.clientWidth || container.scrollWidth || 0;
}

function validateImages(container: HTMLElement, issues: string[]): void {
  const images = Array.from(container.querySelectorAll('img'));

  images.forEach((img, idx) => {
    const dims = getImageDimensions(img);
    if (dims.widthPx <= 0 || dims.heightPx <= 0) return;

    const maxWidthMm = PrintLimits.maxWidthMm;
    const maxHeightMm = PrintLimits.maxHeightMm;
    const pxPorMm = PrintLimits.pxPerMm;
    const imgWidthMm = dims.widthPx / pxPorMm;
    const imgHeightMm = dims.heightPx / pxPorMm;

    if (imgWidthMm > maxWidthMm || imgHeightMm > maxHeightMm) {
      issues.push(`⚠️ Image ${idx + 1}: ${Math.round(dims.widthPx)}x${Math.round(dims.heightPx)}px may not fit on A4 page`);
    }
  });
}

function validateTables(container: HTMLElement, issues: string[]): void {
  const tables = Array.from(container.querySelectorAll('table'));
  const containerWidthPx = getContainerWidth(container);
  if (containerWidthPx <= 0) return;

  // Tolerance to avoid false positives from borders, rounding, and scrollbar.
  // Only warn when the overflow is actually perceptible in print.
  const tolerancePx = Math.max(12, containerWidthPx * 0.02);

  tables.forEach((table, idx) => {
    const tableWidthPx = getTableWidth(table);
    if (tableWidthPx <= 0) return;
    const overflowInContainer = Math.max(0, tableWidthPx - containerWidthPx);
    const overflowInternal = Math.max(0, table.scrollWidth - table.clientWidth);
    const overflowDetected = Math.max(overflowInContainer, overflowInternal);

    if (overflowDetected > tolerancePx) {
      issues.push(
        `⚠️ Table ${idx + 1}: ${Math.round(tableWidthPx)}px (usable area ${Math.round(containerWidthPx)}px, excess ${Math.round(overflowDetected)}px) may overflow in print`
      );
    }
  });
}

function validateLongUrls(htmlContent: string, issues: string[]): void {
  const longLines = htmlContent.match(/https?:\/\/[^\s<>"]{80,}/g);
  if (longLines && longLines.length > 0) {
    issues.push(`⚠️ ${longLines.length} long URL(s) may overflow in print output`);
  }
}

const printValidationPipeline: PipelineStage<ValidationPipelineContext>[] = [
  {
    id: 'validate-images-print',
    enabled: (ctx) => ctx.isLive,
    run: async (ctx): Promise<void> => {
      const images = Array.from(ctx.container.querySelectorAll('img'));
      if (images.length > 0) {
        await waitForImages(images);
      }
      validateImages(ctx.container, ctx.issues);
    }
  },
  {
    id: 'validate-tables-print',
    enabled: (ctx) => ctx.isLive,
    run: (ctx): void => {
      validateTables(ctx.container, ctx.issues);
    }
  },
  {
    id: 'validate-long-urls-print',
    run: (ctx): void => {
      validateLongUrls(ctx.htmlContent, ctx.issues);
    }
  }
]

function getPreviewElement(options?: PrintDocumentOptions): HTMLElement | null {
  if (options && 'previewElement' in options) {
    return options.previewElement ?? null;
  }
  return document.getElementById('preview') as HTMLElement | null;
}

async function getValidationForPrint(
  preview: HTMLElement,
  options?: PrintDocumentOptions
): Promise<ValidationResult> {
  if (options?.validation) {
    return options.validation;
  }
  return await validatePrintContent(preview);
}

async function confirmPrintWithWarnings(
  validation: ValidationResult,
  logger: (message: string) => void
): Promise<boolean> {
  if (validation.issues.length === 0) return true;

  validation.issues.forEach((issue) => { logger(issue) });
  return confirm({
    title: 'Print warnings',
    message: `${validation.issues.length} warning(s) detected.\nContinue anyway?`,
    confirmLabel: 'Print anyway',
    variant: 'warning'
  });
}

function applyTemporaryPdfTitle(docName: string): () => void {
  const originalTitle = document.title;
  const pdfName = docName.replace(/\.md$/i, '');
  document.title = pdfName;
  return (): void => {
    document.title = originalTitle;
  };
}

function openPrintDialogWithRestore(onRestore: () => void): void {
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
      logWarn('[Print] Fallback: restoring after timeout');
      doRestore();
    }
  }, PrintTimings.fallbackRestoreTimeoutMs);
}

export async function validatePrintContent(content: PrintContentTarget): Promise<ValidationResult> {
  const issues: string[] = [];

  if (!content || (typeof content === 'string' && content.length === 0)) {
    return { isValid: false, issues: ['No content to print'] };
  }

  const container = typeof content === 'string' ? createTempContainer(content) : content;
  const ctx: ValidationPipelineContext = {
    container,
    htmlContent: typeof content === 'string' ? content : container.innerHTML,
    isLive: container.isConnected,
    issues
  }
  await runPipeline(ctx, printValidationPipeline)

  return {
    isValid: issues.length === 0,
    issues,
  };
}

let printPreviewEscapeHandler: ((e: KeyboardEvent) => void) | null = null;

function removeEscapePrintPreviewHandler(): void {
  if (!printPreviewEscapeHandler) return;
  document.removeEventListener('keydown', printPreviewEscapeHandler);
  printPreviewEscapeHandler = null;
}

function registerEscapePrintPreviewHandler(): void {
  if (printPreviewEscapeHandler) return;

  printPreviewEscapeHandler = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && document.body.classList.contains('print-mode')) {
      exitPrintPreview();
    }
  };

  document.addEventListener('keydown', printPreviewEscapeHandler);
}

function setPrintPreviewActive(active: boolean): void {
  if (active) {
    document.body.classList.add('print-mode');
    registerEscapePrintPreviewHandler();
    return;
  }

  document.body.classList.remove('print-mode');
  removeEscapePrintPreviewHandler();
}

export function optimizeForPrint(): boolean {
  try {
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logError(`Failed to optimize for print: ${errorMsg}`);
    return false;
  }
}

export function restoreAfterPrint(): boolean {
  try {
    setPrintPreviewActive(false);

    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logError(`Error restoring after print: ${errorMsg}`);
    return false;
  }
}

export function printDocument(
  docName: string = 'document',
  logger: (message: string) => void = logInfo,
  options?: PrintDocumentOptions
): Promise<boolean> {
  return new Promise((resolve) => {
    const execute = async (): Promise<void> => {
      let restoreTitle: (() => void) | null = null;

      try {
        const preview = getPreviewElement(options);
        if (!preview) {
          logger('Error: preview element not found');
          resolve(false);
          return;
        }

        const validation = await getValidationForPrint(preview, options);
        if (!confirmPrintWithWarnings(validation, logger)) {
          resolve(false);
          return;
        }

        restoreTitle = applyTemporaryPdfTitle(docName);
        openPrintDialogWithRestore(() => {
          restoreTitle?.();
          restoreAfterPrint();
          resolve(true);
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logError(`Print failed: ${errorMsg}`);
        restoreTitle?.();
        restoreAfterPrint();
        resolve(false);
      }
    };

    execute();
  });
}

export function togglePrintPreview(): void {
  const active = document.body.classList.contains('print-mode');
  setPrintPreviewActive(!active);
}

export function enterPrintPreview(): boolean {
  if (document.body.classList.contains('print-mode')) return false;
  setPrintPreviewActive(true);
  return true;
}

export function exitPrintPreview(): boolean {
  if (!document.body.classList.contains('print-mode')) return false;
  setPrintPreviewActive(false);
  return true;
}

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
    estimatedPages: Math.ceil(words / 250 + images * 0.5),
    estimatedReadTime: Math.ceil(words / 200),
  };
}

export async function generatePrintReport(docName: string, htmlContent: string): Promise<string> {
  const stats = getPrintStatistics(htmlContent);
  const validation = await validatePrintContent(htmlContent);

  return `
=== PRINT REPORT ===
Document: ${docName}
Words: ${stats.words}
Paragraphs: ${stats.paragraphs}
Images: ${stats.images}
Tables: ${stats.tables}
Lists: ${stats.lists}
Estimated pages: ${stats.estimatedPages}
Reading time: ~${stats.estimatedReadTime}min
Status: ${validation.isValid ? '✓ READY TO PRINT' : '⚠️ HAS WARNINGS'}
${validation.issues.length > 0 ? 'Warnings:\n' + validation.issues.map((i) => '  ' + i).join('\n') : ''}
====================
  `.trim();
}
