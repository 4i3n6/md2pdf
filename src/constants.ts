/**
 * Central application constants
 */

const a4WidthMm = 210
const a4HeightMm = 297
const marginMm = 10

export const StorageKeys = {
    documents: 'md2pdf-docs-v3',
    legacyDocuments: 'md2pdf-docs-v2',
    docPreferencesPrefix: 'md2pdf-doc-prefs-',
    splitterRatio: 'md2pdf-splitter-ratio',
    syncQueue: 'md2pdf-sync-queue',
    imageCache: 'md2pdf-image-cache-v1'
}

export const PrintLimits = {
    a4WidthMm,
    a4HeightMm,
    marginMm,
    maxWidthMm: a4WidthMm - marginMm * 2,
    maxHeightMm: a4HeightMm - marginMm * 2,
    pxPerMm: 3.779
}

export const ImageCacheConfig = {
    expirationMs: 30 * 24 * 60 * 60 * 1000,
    maxSizeBytes: 50 * 1024,
    version: 1,
    storageKey: StorageKeys.imageCache
}

export const LayoutBreakpoints = {
    mobilePx: 768
}

export const SplitterConfig = {
    storageKey: StorageKeys.splitterRatio,
    minRatio: 0.30,
    maxRatio: 0.70,
    defaultRatio: 0.50
}

export const SaveConfig = {
    debounceMs: 800
}

export const MermaidConfig = {
    maxPageWidthPx: 760
}

export const BackupConfig = {
    version: 1
}

export function getDocPreferencesKey(docId: number): string {
    return `${StorageKeys.docPreferencesPrefix}${docId}`
}
