/**
 * Constantes centrais da aplicacao
 */

const a4LarguraMm = 210
const a4AlturaMm = 297
const margemMm = 20

export const ChavesStorage = {
    documentos: 'md2pdf-docs-v3',
    documentosLegado: 'md2pdf-docs-v2',
    preferenciasDocumentoPrefixo: 'md2pdf-doc-prefs-',
    splitterRatio: 'md2pdf-splitter-ratio',
    filaSync: 'md2pdf-sync-queue',
    cacheImagens: 'md2pdf-image-cache-v1'
}

export const ImpressaoLimites = {
    a4LarguraMm,
    a4AlturaMm,
    margemMm,
    maxLarguraMm: a4LarguraMm - margemMm * 2,
    maxAlturaMm: a4AlturaMm - margemMm * 2,
    pxPorMm: 3.779
}

export const CacheImagensConfig = {
    expiracaoMs: 30 * 24 * 60 * 60 * 1000,
    maxTamanhoBytes: 50 * 1024,
    versao: 1,
    storageKey: ChavesStorage.cacheImagens
}

export const BreakpointsLayout = {
    mobilePx: 768
}

export const SplitterConfig = {
    storageKey: ChavesStorage.splitterRatio,
    minRatio: 0.30,
    maxRatio: 0.70,
    defaultRatio: 0.50
}

export const SalvamentoConfig = {
    debounceMs: 800
}

export const MermaidConfig = {
    maxLarguraPaginaPx: 480
}

export const BackupConfig = {
    versao: 1
}

export function obterChavePreferenciasDocumento(docId: number): string {
    return `${ChavesStorage.preferenciasDocumentoPrefixo}${docId}`
}
