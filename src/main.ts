import { EditorView, basicSetup } from 'codemirror'
import { Decoration, hoverTooltip } from '@codemirror/view'
import { StateField, StateEffect, Compartment, type Extension } from '@codemirror/state'
import { language } from '@codemirror/language'
import { markdown } from '@codemirror/lang-markdown'
import 'highlight.js/styles/github.css'
import { processMarkdown, estimatePageCount } from './processors/markdownProcessor'
import { validateMarkdown, type MarkdownError } from './processors/markdownValidator'
import { printDocument, validatePrintContent, togglePrintPreview } from './utils/printUtils'
import { createReporter } from './utils/printReporter'
import OfflineManager from './utils/offlineManager'
import SWUpdateNotifier from './utils/swUpdateNotifier'
import { documentManager } from './services/documentManager'
import { uiRenderer } from './services/uiRenderer'
import { initI18n, t, getLocale } from './i18n/index'
import { BackupConfig, BreakpointsLayout, SalvamentoConfig, SplitterConfig, obterChavePreferenciasDocumento } from '@/constants'
import type { AppState, LoggerInterface, Document as AppDocument } from '@/types/index'
import './pwaRegister'
import './styles.css'
import './styles-print.css'

// Mobile detection - block app initialization on small screens
function isMobileViewport(): boolean {
  return window.innerWidth < BreakpointsLayout.mobilePx;
}

// If mobile, don't initialize the app - CSS will show the overlay
if (isMobileViewport()) {
  // Prevent any further initialization
  throw new Error('Mobile viewport detected - app initialization blocked');
}

// Initialize i18n based on URL path
initI18n()

// Logger do Sistema (uses i18n locale for time formatting)
const APP_VERSION = __APP_VERSION__ || '0.0.0'

const Logger: LoggerInterface = {
  log: (msg: string, type: 'info' | 'error' | 'success' | 'warning' = 'info'): void => {
    const consoleEl = document.getElementById('console-log');
    if (!consoleEl) return;

    const time = new Date().toLocaleTimeString(getLocale(), { hour12: false });
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.textContent = `[${time}] ${msg}`;

    consoleEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  },
  error: (msg: string): void => Logger.log(msg, 'error'),
  success: (msg: string): void => Logger.log(msg, 'success')
};

// Expor Logger globalmente para uso em outros modulos
declare global {
  interface Window {
    Logger: LoggerInterface;
  }
}
window.Logger = Logger;

function atualizarVersaoUI(): void {
  const versionEl = document.querySelector('[data-app-version]') as HTMLElement | null;
  if (versionEl) {
    versionEl.textContent = `v${APP_VERSION}`;
    const lang = document.documentElement.lang || 'en';
    const label = lang.startsWith('pt')
      ? `Versao do sistema ${APP_VERSION}`
      : `System version ${APP_VERSION}`;
    versionEl.setAttribute('aria-label', label);
  }
}

documentManager.setLogger(Logger);
uiRenderer.setLogger(Logger);

window.addEventListener('error', (event: ErrorEvent): void => {
    const message = event.message || 'Erro inesperado';
    Logger.error(`Erro inesperado: ${message}`);
});

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent): void => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    Logger.error(`Promise rejeitada: ${reason}`);
});

/**
 * Estado da aplicacao (UI-only)
 * Documentos sao gerenciados pelo DocumentManager
 */
const state: AppState = {
  docs: [],
  currentId: null,
  editor: null
}

// Compartimento para alternar linguagem do editor dinamicamente
const compartimentoLinguagem = new Compartment();
let requisicaoLinguagemEditor = 0;
let modoEditorAtual = '';

const extensoesMarkdown = new Set(['', 'md', 'markdown', 'txt']);

const carregarSql = async (): Promise<Extension> => {
    const { sql, PostgreSQL } = await import('@codemirror/lang-sql')
    return sql({ dialect: PostgreSQL })
}

const carregarJson = async (): Promise<Extension> => {
    const { json } = await import('@codemirror/lang-json')
    return json()
}

const carregarYaml = async (): Promise<Extension> => {
    const { yaml } = await import('@codemirror/lang-yaml')
    return yaml()
}

const carregarJavaScript = async (
    config?: { jsx?: boolean; typescript?: boolean }
): Promise<Extension> => {
    const { javascript } = await import('@codemirror/lang-javascript')
    return javascript(config)
}

const carregarCss = async (): Promise<Extension> => {
    const { css } = await import('@codemirror/lang-css')
    return css()
}

const carregarHtml = async (): Promise<Extension> => {
    const { html } = await import('@codemirror/lang-html')
    return html()
}

const carregarXml = async (): Promise<Extension> => {
    const { xml } = await import('@codemirror/lang-xml')
    return xml()
}

const carregarShell = async (): Promise<Extension> => {
    const [{ StreamLanguage }, { shell }] = await Promise.all([
        import('@codemirror/language'),
        import('@codemirror/legacy-modes/mode/shell')
    ])
    return StreamLanguage.define(shell)
}

const carregarPython = async (): Promise<Extension> => {
    const { python } = await import('@codemirror/lang-python')
    return python()
}

const carregarGo = async (): Promise<Extension> => {
    const { go } = await import('@codemirror/lang-go')
    return go()
}

const carregarRust = async (): Promise<Extension> => {
    const { rust } = await import('@codemirror/lang-rust')
    return rust()
}

const carregarJava = async (): Promise<Extension> => {
    const { java } = await import('@codemirror/lang-java')
    return java()
}

const carregarCpp = async (): Promise<Extension> => {
    const { cpp } = await import('@codemirror/lang-cpp')
    return cpp()
}

const carregarPhp = async (): Promise<Extension> => {
    const { php } = await import('@codemirror/lang-php')
    return php()
}

const carregarRuby = async (): Promise<Extension> => {
    const [{ StreamLanguage }, { ruby }] = await Promise.all([
        import('@codemirror/language'),
        import('@codemirror/legacy-modes/mode/ruby')
    ])
    return StreamLanguage.define(ruby)
}

const carregadoresLinguagem: Record<string, () => Promise<Extension>> = {
    sql: carregarSql,
    ddl: carregarSql,
    json: carregarJson,
    yaml: carregarYaml,
    yml: carregarYaml,
    js: () => carregarJavaScript(),
    javascript: () => carregarJavaScript(),
    jsx: () => carregarJavaScript({ jsx: true }),
    ts: () => carregarJavaScript({ typescript: true }),
    typescript: () => carregarJavaScript({ typescript: true }),
    tsx: () => carregarJavaScript({ typescript: true, jsx: true }),
    css: carregarCss,
    html: carregarHtml,
    htm: carregarHtml,
    xml: carregarXml,
    bash: carregarShell,
    sh: carregarShell,
    shell: carregarShell,
    py: carregarPython,
    python: carregarPython,
    go: carregarGo,
    rs: carregarRust,
    rust: carregarRust,
    java: carregarJava,
    c: carregarCpp,
    cpp: carregarCpp,
    h: carregarCpp,
    hpp: carregarCpp,
    php: carregarPhp,
    rb: carregarRuby,
    ruby: carregarRuby
}

// CodeMirror Decorations Setup
const updateDecorationsEffect = StateEffect.define<any>();

const markdownDecorationsField = StateField.define({
  create() {
    return Decoration.none;
  },
  
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(updateDecorationsEffect)) {
        return effect.value;
      }
    }
    return decorations.map(tr.changes);
  },
  
  provide(f) {
    return EditorView.decorations.from(f);
  }
});

// Global issues storage for tooltip and panel
let currentIssues: MarkdownError[] = [];

// Document preferences type
type DocumentPreferences = {
  font: string;
  align: string;
};

type BackupPayload = {
  version: number;
  appVersion: string;
  exportedAt: string;
  docs: AppDocument[];
  prefs: Record<string, DocumentPreferences>;
};

const DEFAULT_PREFS: DocumentPreferences = {
  font: "'JetBrains Mono', monospace",
  align: 'left'
};

function getDocPreferences(docId: number): DocumentPreferences {
  const key = obterChavePreferenciasDocumento(docId);
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return { ...DEFAULT_PREFS };
    }
  }
  return { ...DEFAULT_PREFS };
}

function saveDocPreferences(docId: number, prefs: DocumentPreferences): void {
  const key = obterChavePreferenciasDocumento(docId);
  localStorage.setItem(key, JSON.stringify(prefs));
}

function applyPreviewFont(font: string): void {
  const preview = document.getElementById('preview');
  if (preview) {
    preview.style.fontFamily = font;
  }
  
  const fontSelect = document.getElementById('preview-font') as HTMLSelectElement;
  if (fontSelect) {
    fontSelect.value = font;
  }
  
  if (state.currentId) {
    const prefs = getDocPreferences(state.currentId);
    prefs.font = font;
    saveDocPreferences(state.currentId, prefs);
  }
}

function applyPreviewAlign(align: string): void {
  const preview = document.getElementById('preview');
  if (preview) {
    preview.style.textAlign = align;
  }
  
  updateAlignButtons(align);
  
  if (state.currentId) {
    const prefs = getDocPreferences(state.currentId);
    prefs['align'] = align;
    saveDocPreferences(state.currentId, prefs);
  }
}

function updateAlignButtons(activeAlign: string): void {
  const buttons = document.querySelectorAll('.align-btn');
  buttons.forEach(btn => {
    const btnAlign = (btn as HTMLElement).dataset['align'];
    if (btnAlign === activeAlign) {
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    }
  });
}

function loadDocPreferences(docId: number): void {
  const prefs = getDocPreferences(docId);
  applyPreviewFont(prefs.font);
  applyPreviewAlign(prefs.align);
}

// ============================================
// SAVE STATUS MANAGEMENT
// ============================================

let saveStatusInterval: ReturnType<typeof setInterval> | null = null;
const SALVAR_DEBOUNCE_MS = SalvamentoConfig.debounceMs;

function formatTimeSinceSaved(lastSaved: number | null): string {
  if (!lastSaved) return t('time.never');
  
  const now = Date.now();
  const diff = now - lastSaved;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (seconds < 5) return t('save.savedNow');
  if (seconds < 60) return t('save.savedAgo', { time: t('time.seconds', { n: seconds }) });
  if (minutes < 60) return t('save.savedAgo', { time: t('time.minutes', { n: minutes }) });
  return t('save.savedAgo', { time: t('time.hours', { n: hours }) });
}

function documentoEstaModificado(doc: AppDocument): boolean {
    if (!doc.lastSaved) {
        return true;
    }
    return doc.updated > doc.lastSaved;
}

function updateSaveStatus(): void {
  const doc = getCurrentDoc();
  if (!doc) return;
  
  const statusEl = document.getElementById('save-status');
  if (!statusEl) return;
  
  if (documentoEstaModificado(doc)) {
    statusEl.className = 'save-status save-status-modified';
    statusEl.innerHTML = `<span class="save-dot modified"></span><span class="save-text">${t('save.notSaved')}</span>`;
    return;
  }

  const statusText = formatTimeSinceSaved(doc.lastSaved);
  statusEl.className = 'save-status save-status-saved';
  statusEl.innerHTML = `<span class="save-dot saved"></span><span class="save-text">${statusText}</span>`;
}

function marcarDocumentosSalvos(): void {
    const now = Date.now();
    state.docs.forEach((doc) => {
        if (!doc.lastSaved || doc.updated > doc.lastSaved) {
            doc.lastSaved = now;
        }
    });
}

function salvarDocumentosAgora(): void {
    marcarDocumentosSalvos();
    documentManager.persistir();
    updateMetrics();
    updateSaveStatus();
}

const salvarDocumentosDebounced = debounce(() => {
    salvarDocumentosAgora();
}, SALVAR_DEBOUNCE_MS);

function agendarSalvamento(): void {
    salvarDocumentosDebounced();
    updateSaveStatus();
}

function forceSave(): void {
  const doc = getCurrentDoc();
  if (!doc) {
    Logger.log(t('logs.noDocToSave'), 'warning');
    return;
  }
  
  salvarDocumentosAgora();
  Logger.success(t('logs.docSaved'));
}

function startSaveStatusUpdater(): void {
  if (saveStatusInterval) {
    clearInterval(saveStatusInterval);
  }
  saveStatusInterval = setInterval(() => {
    updateSaveStatus();
  }, 10000);
}

function setupSaveControls(): void {
  const forceSaveBtn = document.getElementById('force-save-btn');
  
  if (forceSaveBtn) {
    forceSaveBtn.addEventListener('click', forceSave);
  }
  
  document.addEventListener('keydown', (e: KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      forceSave();
    }
  });
  
  startSaveStatusUpdater();
  Logger.success('Controles de salvamento ativos');
}

// ============================================
// IMPORT/EXPORT FUNCTIONS
// ============================================

/**
 * Importa um arquivo .md do computador
 */
function importMarkdownFile(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.md,.markdown,.txt';
  
  input.onchange = async (e: Event): Promise<void> => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) {
      Logger.log('Nenhum arquivo selecionado', 'info');
      return;
    }
    
    try {
      const content = await file.text();
      const newDoc = documentManager.createFromImport(file.name, content);
      
      state.currentId = newDoc.id;
      
      if (state.editor) {
        state.editor.dispatch({
          changes: { from: 0, to: state.editor.state.doc.length, insert: content }
        });
      }
      
      renderList();
      renderPreview(content);
      updateSaveStatus();
      void atualizarLinguagemEditor(newDoc.name);
      
      Logger.success(`Arquivo importado: ${file.name}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      Logger.error(`Erro ao importar arquivo: ${errorMsg}`);
    }
  };
  
  input.click();
}

/**
 * Exporta o documento atual como arquivo .md
 */
function downloadMarkdownFile(): void {
  try {
    const doc = getCurrentDoc();
    if (!doc) {
      Logger.error('Nenhum documento carregado');
      return;
    }

    const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    Logger.success(`Download: ${doc.name} (${(blob.size / 1024).toFixed(2)}KB)`);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    Logger.error('Erro ao fazer download: ' + errorMessage);
  }
}

function gerarNomeBackup(): string {
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, '0');
  const data = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const hora = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `md2pdf-backup-${data}-${hora}.json`;
}

function montarBackupPayload(): BackupPayload {
  const docs = documentManager.getAll();
  const prefs: Record<string, DocumentPreferences> = {};

  docs.forEach((doc) => {
    prefs[String(doc.id)] = getDocPreferences(doc.id);
  });

  return {
    version: BackupConfig.versao,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    docs,
    prefs
  };
}

function normalizarBackupPayload(raw: unknown): BackupPayload | null {
  if (Array.isArray(raw)) {
    return {
      version: 0,
      appVersion: 'unknown',
      exportedAt: new Date().toISOString(),
      docs: raw as AppDocument[],
      prefs: {}
    };
  }

  if (!raw || typeof raw !== 'object') return null;

  const payload = raw as Partial<BackupPayload>;
  if (!Array.isArray(payload.docs)) return null;

  const prefsBrutas = payload.prefs && typeof payload.prefs === 'object'
    ? (payload.prefs as Record<string, unknown>)
    : {};

  const prefs: Record<string, DocumentPreferences> = {};
  Object.entries(prefsBrutas).forEach(([docId, valor]) => {
    if (!valor || typeof valor !== 'object') return;
    const pref = valor as Partial<DocumentPreferences>;
    if (typeof pref.font !== 'string' || typeof pref.align !== 'string') return;
    prefs[docId] = { font: pref.font, align: pref.align };
  });

  return {
    version: typeof payload.version === 'number' ? payload.version : 0,
    appVersion: typeof payload.appVersion === 'string' ? payload.appVersion : 'unknown',
    exportedAt: typeof payload.exportedAt === 'string' ? payload.exportedAt : new Date().toISOString(),
    docs: payload.docs as AppDocument[],
    prefs
  };
}

function aplicarBackup(payload: BackupPayload): void {
  documentManager.replaceAll(payload.docs);

  Object.entries(payload.prefs).forEach(([docId, pref]) => {
    const id = Number(docId);
    if (!Number.isNaN(id)) {
      saveDocPreferences(id, pref);
    }
  });

  const docsAtualizados = documentManager.getAll();
  state.docs = docsAtualizados;
  state.currentId = docsAtualizados[0]?.id ?? null;

  const docAtual = getCurrentDoc();
  if (state.editor) {
    state.editor.dispatch({
      changes: {
        from: 0,
        to: state.editor.state.doc.length,
        insert: docAtual?.content || ''
      }
    });
  }

  renderList();
  if (docAtual) {
    renderPreview(docAtual.content);
    loadDocPreferences(docAtual.id);
  } else {
    renderPreview('');
  }
  updateMetrics();
  updateSaveStatus();
}

function exportarBackupDocumentos(): void {
  try {
    const payload = montarBackupPayload();
    const content = JSON.stringify(payload, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = gerarNomeBackup();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    Logger.success(`Backup gerado com ${payload.docs.length} documento(s)`);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    Logger.error('Falha ao gerar backup: ' + errorMessage);
  }
}

async function processarArquivoBackup(file: File): Promise<void> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    const payload = normalizarBackupPayload(parsed);

    if (!payload) {
      Logger.error('Backup invalido ou formato nao reconhecido');
      return;
    }

    if (!confirm('Esta acao substitui todos os documentos atuais. Deseja continuar?')) {
      Logger.log('Restauracao cancelada pelo usuario', 'warning');
      return;
    }

    if (payload.version > BackupConfig.versao) {
      Logger.log('Backup gerado por versao mais nova. Alguns dados podem ser ignorados.', 'warning');
    }

    if (payload.appVersion !== 'unknown' && payload.appVersion !== APP_VERSION) {
      Logger.log(`Backup gerado na versao ${payload.appVersion}`, 'info');
    }

    aplicarBackup(payload);
    Logger.success(`Backup restaurado (${payload.docs.length} documento(s))`);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    Logger.error('Falha ao restaurar backup: ' + errorMessage);
  }
}

function importarBackupDocumentos(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';

  input.onchange = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    void processarArquivoBackup(file);
  };

  input.click();
}

// ============================================
// PREVIEW CONTROLS
// ============================================

function setupPreviewControls(): void {
  const fontSelect = document.getElementById('preview-font') as HTMLSelectElement | null;
  if (fontSelect) {
    fontSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const font = target.value;
      if (font) {
        applyPreviewFont(font);
        const fontName = font.split(',')[0]?.replace(/'/g, '') || font;
        Logger.log(`Fonte do documento: ${fontName}`);
      }
    });
  }
  
  document.querySelectorAll('.align-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const align = target.dataset['align'];
      if (align) {
        applyPreviewAlign(align);
        Logger.log(`Alinhamento: ${align}`);
      }
    });
  });
  
  const tagFontSelect = document.getElementById('tag-font') as HTMLSelectElement;
  tagFontSelect?.addEventListener('change', (e) => {
    const font = (e.target as HTMLSelectElement).value;
    if (font) {
      insertFontTag(font);
      (e.target as HTMLSelectElement).selectedIndex = 0;
    }
  });
  
  Logger.success('Controles do preview ativados');
}


// ============================================
// SPLITTER - Resizable Panels
// ============================================

const SPLITTER_STORAGE_KEY = SplitterConfig.storageKey;
const SPLITTER_MIN_RATIO = SplitterConfig.minRatio; // 30% minimum
const SPLITTER_MAX_RATIO = SplitterConfig.maxRatio; // 70% maximum
const SPLITTER_DEFAULT_RATIO = SplitterConfig.defaultRatio; // 50/50 default

function initSplitter(): void {
  const splitter = document.getElementById('workspace-splitter');
  const editorPane = document.getElementById('editor-pane');
  const workspace = document.querySelector('.workspace') as HTMLElement | null;
  
  if (!splitter || !editorPane || !workspace) {
    Logger.log('Splitter elements not found', 'warning');
    return;
  }
  
  // Load saved ratio
  const savedRatio = localStorage.getItem(SPLITTER_STORAGE_KEY);
  let currentRatio = savedRatio ? parseFloat(savedRatio) : SPLITTER_DEFAULT_RATIO;
  
  // Validate saved ratio
  if (isNaN(currentRatio) || currentRatio < SPLITTER_MIN_RATIO || currentRatio > SPLITTER_MAX_RATIO) {
    currentRatio = SPLITTER_DEFAULT_RATIO;
  }
  
  // Apply initial ratio
  applyRatio(currentRatio);
  
  let isDragging = false;
  let startX = 0;
  let startWidth = 0;
  
  // Mouse down - start dragging
  splitter.addEventListener('mousedown', (e: MouseEvent) => {
    isDragging = true;
    startX = e.clientX;
    startWidth = editorPane.offsetWidth;
    document.body.classList.add('splitter-dragging');
    e.preventDefault();
  });
  
  // Mouse move - drag
  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    const workspaceWidth = workspace.offsetWidth;
    const splitterWidth = splitter.offsetWidth;
    const availableWidth = workspaceWidth - splitterWidth;
    const newWidth = startWidth + deltaX;
    const newRatio = newWidth / availableWidth;
    
    // Apply limits
    currentRatio = Math.max(SPLITTER_MIN_RATIO, Math.min(SPLITTER_MAX_RATIO, newRatio));
    applyRatio(currentRatio);
  });
  
  // Mouse up - finish dragging
  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    
    isDragging = false;
    document.body.classList.remove('splitter-dragging');
    
    // Save ratio
    localStorage.setItem(SPLITTER_STORAGE_KEY, currentRatio.toString());
    Logger.log(`Panel ratio: ${Math.round(currentRatio * 100)}%`);
  });
  
  // Double click - restore 50/50
  splitter.addEventListener('dblclick', () => {
    currentRatio = SPLITTER_DEFAULT_RATIO;
    applyRatio(currentRatio);
    localStorage.setItem(SPLITTER_STORAGE_KEY, currentRatio.toString());
    Logger.log('Panel ratio reset to 50%');
  });
  
  function applyRatio(ratio: number): void {
    const workspaceWidth = workspace!.offsetWidth;
    const splitterWidth = splitter!.offsetWidth;
    const availableWidth = workspaceWidth - splitterWidth;
    const editorWidth = Math.round(availableWidth * ratio);
    editorPane!.style.width = `${editorWidth}px`;
  }
  
  // Handle window resize
  window.addEventListener('resize', () => {
    applyRatio(currentRatio);
  });
  
  Logger.success('Splitter initialized');
}

function insertFontTag(font: string): void {
  if (!state.editor) return;
  
  const { from, to } = state.editor.state.selection.main;
  if (from === to) {
    Logger.log('Selecione um texto para aplicar a fonte', 'warning');
    return;
  }
  
  const selectedText = state.editor.state.sliceDoc(from, to);
  const insert = `<span style="font-family: ${font}">${selectedText}</span>`;
  
  state.editor.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length }
  });
  
  state.editor.focus();
  Logger.log(`Fonte aplicada na selecao`);
}

// ============================================
// MARKDOWN VALIDATION
// ============================================

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function findIssueAtPosition(pos: number, issues: MarkdownError[], content: string): MarkdownError | null {
  const lines = content.split('\n');
  let charIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const lineStart = charIndex;
    const lineEnd = charIndex + (lines[i]?.length ?? 0);
    
    if (pos >= lineStart && pos <= lineEnd) {
      return issues.find(issue => issue.line === i + 1) || null;
    }
    charIndex = lineEnd + 1;
  }
  return null;
}

const markdownHoverTooltip = hoverTooltip((view, pos) => {
  const content = view.state.doc.toString();
  const issue = findIssueAtPosition(pos, currentIssues, content);
  
  if (!issue) return null;

  return {
    pos,
    above: true,
    create() {
      const dom = document.createElement('div');
      dom.className = 'md-tooltip';
      
      const icon = issue.severity === 'error' ? 'X' : 
                   issue.severity === 'warning' ? '!' : 'i';
      const iconClass = `md-tooltip-icon md-tooltip-icon-${issue.severity}`;
      
      let html = `
        <div class="md-tooltip-header">
          <span class="${iconClass}">${icon}</span>
          <span class="md-tooltip-message">${escapeHtml(issue.message)}</span>
        </div>
      `;
      
      if (issue.suggestion) {
        html += `
          <div class="md-tooltip-suggestion">
            <span class="md-tooltip-suggestion-label">Sugestao:</span>
            <code class="md-tooltip-suggestion-code">${escapeHtml(issue.suggestion)}</code>
          </div>
        `;
      }
      
      dom.innerHTML = html;
      return { dom };
    }
  };
});

function navigateToIssue(issue: MarkdownError): void {
  if (!state.editor) return;
  
  const content = state.editor.state.doc.toString();
  const lines = content.split('\n');
  
  let pos = 0;
  for (let i = 0; i < issue.line - 1 && i < lines.length; i++) {
    pos += (lines[i]?.length ?? 0) + 1;
  }
  pos += Math.max(0, issue.column - 1);
  
  state.editor.dispatch({
    selection: { anchor: pos },
    scrollIntoView: true
  });
  state.editor.focus();
  
  Logger.log(`Navegado para linha ${issue.line}, coluna ${issue.column}`);
}

function applyFix(issue: MarkdownError): void {
  if (!state.editor || !issue.suggestion) return;
  
  const content = state.editor.state.doc.toString();
  const lines = content.split('\n');
  
  let lineStart = 0;
  for (let i = 0; i < issue.line - 1 && i < lines.length; i++) {
    lineStart += (lines[i]?.length ?? 0) + 1;
  }
  
  const currentLine = lines[issue.line - 1] || '';
  const lineEnd = lineStart + currentLine.length;
  
  let from: number;
  let to: number;
  let insert: string;
  
  if (issue.suggestionRange?.from === -1) {
    from = content.length;
    to = content.length;
    insert = '\n' + issue.suggestion;
  } else if (issue.suggestionRange) {
    from = lineStart;
    to = lineEnd;
    insert = issue.suggestion;
  } else {
    from = lineStart;
    to = lineEnd;
    insert = issue.suggestion;
  }
  
  state.editor.dispatch({
    changes: { from, to, insert }
  });
  
  Logger.success(`Correcao aplicada na linha ${issue.line}`);
}

function renderProblemsPanel(issues: MarkdownError[]): void {
  const panel = document.getElementById('problems-panel');
  const countEl = document.getElementById('problems-count');
  
  if (!panel || !countEl) return;
  
  const total = issues.length;
  countEl.textContent = `(${total})`;
  countEl.className = `problems-badge ${total > 0 ? 'has-problems' : ''}`;
  
  panel.innerHTML = '';
  
  if (total === 0) {
    panel.innerHTML = '<div class="problems-empty">Nenhum problema detectado</div>';
    return;
  }
  
  issues.forEach((issue, index) => {
    const item = document.createElement('div');
    item.className = `problem-item problem-${issue.severity}`;
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    
    const icon = issue.severity === 'error' ? 'X' : 
                 issue.severity === 'warning' ? '!' : 'i';
    
    let html = `
      <span class="problem-icon">${icon}</span>
      <span class="problem-location">Ln ${issue.line}</span>
      <span class="problem-message">${escapeHtml(issue.message)}</span>
    `;
    
    if (issue.suggestion) {
      html += `<button class="problem-fix-btn" data-index="${index}" title="Aplicar correcao">[FIX]</button>`;
    }
    
    item.innerHTML = html;
    
    item.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('problem-fix-btn')) {
        const idx = parseInt((e.target as HTMLElement).dataset['index'] || '0');
        const issueToFix = issues[idx];
        if (issueToFix) {
          applyFix(issueToFix);
        }
        return;
      }
      navigateToIssue(issue);
    });
    
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigateToIssue(issue);
      }
    });
    
    panel.appendChild(item);
  });
}

// ============================================
// QUICK TAGS
// ============================================

function insertTag(tag: string): void {
  if (!state.editor) return;
  
  const view = state.editor;
  const { from, to } = view.state.selection.main;
  const hasSelection = from !== to;
  const selectedText = hasSelection ? view.state.sliceDoc(from, to) : '';
  
  let insert = '';
  let cursorOffset = 0;
  
  switch (tag) {
    case 'br':
      insert = '\n\n';
      cursorOffset = insert.length;
      break;
      
    case 'hr':
      insert = '\n---\n';
      cursorOffset = insert.length;
      break;
      
    case 'pagebreak':
      insert = '\n<!-- pagebreak -->\n';
      cursorOffset = insert.length;
      break;
      
    case 'code':
      if (hasSelection) {
        insert = '```\n' + selectedText + '\n```';
        cursorOffset = 4;
      } else {
        insert = '```\n\n```';
        cursorOffset = 4;
      }
      break;
      
    case 'quote':
      if (hasSelection) {
        insert = selectedText.split('\n').map(line => '> ' + line).join('\n');
        cursorOffset = insert.length;
      } else {
        insert = '> ';
        cursorOffset = 2;
      }
      break;
      
    case 'heading':
      if (hasSelection) {
        insert = '# ' + selectedText;
        cursorOffset = insert.length;
      } else {
        insert = '# ';
        cursorOffset = 2;
      }
      break;
      
    case 'bold':
      if (hasSelection) {
        insert = '**' + selectedText + '**';
        cursorOffset = insert.length;
      } else {
        insert = '**texto**';
        cursorOffset = 2;
      }
      break;
      
    case 'italic':
      if (hasSelection) {
        insert = '*' + selectedText + '*';
        cursorOffset = insert.length;
      } else {
        insert = '*texto*';
        cursorOffset = 1;
      }
      break;
      
    case 'list':
      if (hasSelection) {
        insert = selectedText.split('\n').map(line => '- ' + line).join('\n');
        cursorOffset = insert.length;
      } else {
        insert = '- ';
        cursorOffset = 2;
      }
      break;
      
    case 'link':
      if (hasSelection) {
        insert = '[' + selectedText + '](url)';
        cursorOffset = insert.length - 4;
      } else {
        insert = '[texto](url)';
        cursorOffset = 1;
      }
      break;
      
    case 'strike':
      if (hasSelection) {
        insert = '~~' + selectedText + '~~';
        cursorOffset = insert.length;
      } else {
        insert = '~~texto~~';
        cursorOffset = 2;
      }
      break;
      
    case 'numlist':
      if (hasSelection) {
        insert = selectedText.split('\n').map((line, i) => `${i + 1}. ` + line).join('\n');
        cursorOffset = insert.length;
      } else {
        insert = '1. ';
        cursorOffset = 3;
      }
      break;
      
    case 'checkbox':
      if (hasSelection) {
        insert = selectedText.split('\n').map(line => '- [ ] ' + line).join('\n');
        cursorOffset = insert.length;
      } else {
        insert = '- [ ] ';
        cursorOffset = 6;
      }
      break;
      
    case 'yaml':
      insert = '```yaml\nkey: value\nitems:\n  - item1\n  - item2\n```';
      cursorOffset = 8;
      break;
      
    case 'mermaid':
      insert = '```mermaid\nflowchart TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action]\n  B -->|No| D[End]\n```';
      cursorOffset = 12;
      break;

    case 'sql':
      insert = '```sql\nSELECT * FROM users WHERE id = 1;\n```';
      cursorOffset = 7;
      break;

    case 'ddl':
      insert = '```sql\nCREATE TABLE users (\n  id UUID PRIMARY KEY,\n  name VARCHAR(255) NOT NULL,\n  email VARCHAR(255) UNIQUE NOT NULL,\n  created_at TIMESTAMP DEFAULT NOW(),\n  updated_at TIMESTAMP DEFAULT NOW()\n);\n```';
      cursorOffset = 7;
      break;

    case 'table':
      insert = '\n| Coluna 1 | Coluna 2 | Coluna 3 |\n|----------|----------|----------|\n| dado 1   | dado 2   | dado 3   |\n';
      cursorOffset = 3;
      break;
      
    case 'mark-yellow':
      if (hasSelection) {
        insert = '<mark style="background:#fef08a">' + selectedText + '</mark>';
        cursorOffset = insert.length;
      } else {
        insert = '<mark style="background:#fef08a">texto</mark>';
        cursorOffset = 32;
      }
      break;
      
    case 'mark-green':
      if (hasSelection) {
        insert = '<mark style="background:#bbf7d0">' + selectedText + '</mark>';
        cursorOffset = insert.length;
      } else {
        insert = '<mark style="background:#bbf7d0">texto</mark>';
        cursorOffset = 32;
      }
      break;
      
    case 'mark-blue':
      if (hasSelection) {
        insert = '<mark style="background:#bfdbfe">' + selectedText + '</mark>';
        cursorOffset = insert.length;
      } else {
        insert = '<mark style="background:#bfdbfe">texto</mark>';
        cursorOffset = 32;
      }
      break;
      
    case 'mark-red':
      if (hasSelection) {
        insert = '<mark style="background:#fecaca">' + selectedText + '</mark>';
        cursorOffset = insert.length;
      } else {
        insert = '<mark style="background:#fecaca">texto</mark>';
        cursorOffset = 32;
      }
      break;
      
    case 'clear':
      if (hasSelection) {
        insert = selectedText.replace(/<[^>]*>/g, '');
        cursorOffset = insert.length;
        Logger.log('Tags HTML removidas da selecao');
      } else {
        Logger.log('Selecione um texto para remover tags', 'warning');
        return;
      }
      break;
      
    case 'align-left':
    case 'align-center':
    case 'align-right':
    case 'align-justify':
      if (hasSelection) {
        const alignValue = tag.replace('align-', '');
        insert = `<div style="text-align: ${alignValue}">${selectedText}</div>`;
        cursorOffset = insert.length;
      } else {
        Logger.log('Selecione um texto para alinhar', 'warning');
        return;
      }
      break;
      
    default:
      return;
  }
  
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + cursorOffset }
  });
  
  view.focus();
  Logger.log(`Tag "${tag}" inserida`);
}

function setupQuickTags(): void {
  const container = document.querySelector('.quick-tags-container');
  if (!container) return;
  
  container.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('tag-btn')) {
      const tag = target.dataset['tag'];
      if (tag) {
        insertTag(tag);
      }
    }
  });
  
  Logger.success('Quick Tags ativadas');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

// ============================================
// CORE FUNCTIONS
// ============================================

function initSystem(): void {
  atualizarVersaoUI();
  Logger.log('Inicializando nucleo...');
  Logger.log(`Versao ${APP_VERSION}`);
  Logger.success('Markdown processor carregado');
  Logger.success('Estilos de impressao A4 ativos');

  OfflineManager.init();
  OfflineManager.loadSyncQueue();
  OfflineManager.onStatusChange((isOnline: boolean): void => {
    const msg = isOnline
      ? 'Conexao restaurada'
      : 'Sem conexao - Modo offline ativo';
    Logger.log(msg, isOnline ? 'success' : 'warning');
  });
  Logger.success('Gerenciador offline ativo');

  SWUpdateNotifier.init();
  Logger.success('Monitor de atualizacoes ativo');

  loadDocs();
  initEditor();
  setupEvents();
  setupQuickTags();
  setupPreviewControls();
  setupSaveControls();
  setupKeyboardNavigation();
  initSplitter();
  updateMetrics();
  updateSaveStatus();
  Logger.success('Sistema pronto.');
}

function loadDocs(): void {
  documentManager.init()

  documentManager.subscribe((docs) => {
    state.docs = docs
    renderList()
  })

  state.docs = documentManager.getAll()
  if (state.docs.length > 0 && state.docs[0]) {
    state.currentId = state.docs[0].id
  }
  renderList()
}

function saveDocs(): void {
  const doc = getCurrentDoc()
  if (!doc) return

  salvarDocumentosAgora()
}

function obterExtensaoDocumento(nome?: string): string {
    const origem = (nome ?? getCurrentDoc()?.name ?? '').trim()
    const partes = origem.split('.')
    if (partes.length < 2) {
        return ''
    }
    return (partes.pop() || '').toLowerCase().trim()
}

function documentoEhMarkdown(nome?: string): boolean {
    return extensoesMarkdown.has(obterExtensaoDocumento(nome))
}

function obterModoEditor(nome?: string): string {
    if (documentoEhMarkdown(nome)) {
        return 'markdown'
    }
    const ext = obterExtensaoDocumento(nome)
    return ext || 'plaintext'
}

async function carregarLinguagemEditor(nome?: string): Promise<Extension> {
    if (documentoEhMarkdown(nome)) {
        return markdown()
    }

    const ext = obterExtensaoDocumento(nome)
    const carregador = carregadoresLinguagem[ext]
    if (!carregador) {
        return []
    }
    return await carregador()
}

async function atualizarLinguagemEditor(nome?: string): Promise<void> {
    if (!state.editor) return

    const modo = obterModoEditor(nome)
    if (modo === modoEditorAtual) {
        return
    }

    if (modo !== 'markdown') {
        limparDiagnosticosEditor()
    }

    const requisicaoAtual = ++requisicaoLinguagemEditor
    try {
        const extensao = await carregarLinguagemEditor(nome)
        if (!state.editor || requisicaoAtual !== requisicaoLinguagemEditor) {
            return
        }
        state.editor.dispatch({
            effects: compartimentoLinguagem.reconfigure(extensao)
        })
        modoEditorAtual = modo
        const linguagemAtiva = state.editor.state.facet(language)
        const nomeLinguagem = linguagemAtiva?.name || 'nenhuma'
        Logger.log(`Editor ajustado para ${modo} (${nomeLinguagem})`)
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        Logger.error(`Falha ao carregar linguagem do editor: ${errorMsg}`)
        if (state.editor && requisicaoAtual === requisicaoLinguagemEditor) {
            state.editor.dispatch({
                effects: compartimentoLinguagem.reconfigure(markdown())
            })
            modoEditorAtual = 'markdown'
        }
    }
}

function limparDiagnosticosEditor(): void {
    currentIssues = []
    renderProblemsPanel([])
    if (!state.editor) return
    try {
        state.editor.dispatch({
            effects: [updateDecorationsEffect.of(Decoration.none)]
        })
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        Logger.log(`Falha ao limpar diagnosticos: ${errorMsg}`, 'warning')
    }
}

function updateEditorDiagnostics(content: string): void {
  if (!state.editor) return;

  if (!documentoEhMarkdown()) {
    limparDiagnosticosEditor()
    return
  }

  const validation = validateMarkdown(content);
  const decorationRanges: any[] = [];
  const lines = content.split('\n');

  const allIssues = [...validation.errors, ...validation.warnings];
  currentIssues = allIssues;
  
  allIssues.forEach((issue) => {
    const lineIndex = Math.min(issue.line - 1, lines.length - 1);
    const line = lines[lineIndex];
    
    if (!line) return;

    let charIndex = 0;
    for (let i = 0; i < lineIndex; i++) {
      charIndex += (lines[i]?.length ?? 0) + 1;
    }

    const from = charIndex + Math.max(0, issue.column - 1);
    const to = Math.min(charIndex + line.length, content.length);

    const cssClass = issue.severity === 'error' 
      ? 'md-error' 
      : issue.severity === 'warning' 
      ? 'md-warning' 
      : 'md-info';

    try {
      const decoration = Decoration.mark({
        class: cssClass,
        title: issue.message
      });
      decorationRanges.push(decoration.range(from, to));
    } catch {
      // Ignorar erros de decoration
    }
  });
  
  renderProblemsPanel(allIssues);

  if (validation.errors.length > 0) {
    Logger.error(`${validation.errors.length} erro(s) de sintaxe Markdown`);
  }

  if (validation.warnings.length > 0) {
    Logger.log(`${validation.warnings.length} aviso(s) Markdown`, 'warning');
  }

  try {
    const decorationSet = Decoration.set(decorationRanges);
    state.editor.dispatch({
      effects: [updateDecorationsEffect.of(decorationSet)]
    });
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    Logger.log(`Validacao visual: ${errorMsg}`, 'warning');
  }
}

function initEditor(): void {
  const el = document.getElementById('editor');
  if (!el) {
    Logger.error('Elemento editor nao encontrado!');
    return;
  }

  const doc = getCurrentDoc();

  const debouncedRender = debounce(renderPreview, 300);
  const debouncedUpdateMetrics = debounce(updateMetrics, 500);
  const debouncedValidate = debounce(updateEditorDiagnostics, 300);

  state.editor = new EditorView({
    doc: doc ? doc.content : '',
    extensions: [
      basicSetup,
      compartimentoLinguagem.of(markdown()),
      EditorView.lineWrapping,
      markdownDecorationsField,
      markdownHoverTooltip,
      EditorView.theme({
        '&': { color: '#111827', backgroundColor: '#ffffff' },
        '.cm-content': { caretColor: '#0052cc' },
        '.cm-gutters': {
          backgroundColor: '#f3f4f6',
          color: '#4b5563',
          borderRight: '1px solid #d1d5db'
        },
        '.cm-activeLine': { backgroundColor: '#f0f4ff' },
        '.cm-activeLineGutter': { color: '#0052cc', backgroundColor: '#f0f4ff', fontWeight: '600' },
        '.cm-cursor': { borderLeftColor: '#0052cc' },
        '.cm-selectionBackground': { backgroundColor: '#3b82f6 !important' },
        '&.cm-focused .cm-selectionBackground': { backgroundColor: '#3b82f6 !important' },
        '.cm-selectionMatch': { backgroundColor: '#fef08a' },
        '.cm-heading': { color: '#111827', fontWeight: '700' },
        '.cm-heading1': { fontSize: '130%' },
        '.cm-heading2': { fontSize: '120%' },
        '.cm-heading3': { fontSize: '110%' },
        '.cm-emphasis': { fontStyle: 'italic', color: '#059669' },
        '.cm-strong': { fontWeight: 'bold', color: '#dc2626' },
        '.cm-link': { color: '#0052cc', textDecoration: 'underline' },
        '.cm-atom': { color: '#ae0a04' },
        '.cm-quote': { color: '#4b5563', fontStyle: 'italic' },
        '.cm-strikethrough': { textDecoration: 'line-through', color: '#6b7280' }
      }),
      EditorView.updateListener.of((u): void => {
        if (u.docChanged) {
          const start = performance.now();
          const val = u.state.doc.toString();

          const active = getCurrentDoc();
          if (active) {
            active.content = val;
            active.updated = Date.now();
            agendarSalvamento();
          }

          debouncedValidate(val);
          debouncedRender(val);
          debouncedUpdateMetrics();
          flashStatus();

          const end = performance.now();
          const renderLatencyEl = document.getElementById('render-latency');
          if (renderLatencyEl) {
            renderLatencyEl.innerText = (end - start).toFixed(1) + 'ms';
          }
        }
      })
    ],
    parent: el
  });

  if (doc) {
    renderPreview(doc.content);
    if (state.currentId) {
      loadDocPreferences(state.currentId);
    }
    void atualizarLinguagemEditor(doc.name);
  }
}

function getCurrentDoc(): AppDocument | undefined {
  return state.docs.find((d) => d.id === state.currentId);
}

async function renderPreview(md: string): Promise<void> {
  const preview = document.getElementById('preview')
  if (!preview) return

  // Pre-process content based on file extension
  let content = md
  const currentDoc = getCurrentDoc()
  if (currentDoc) {
    const ext = currentDoc.name.trim().split('.').pop()?.toLowerCase().trim()
    // Wrap non-markdown files in code blocks for syntax highlighting
    if (ext === 'sql' || ext === 'ddl') {
      content = '```sql\n' + md + '\n```'
    } else if (ext === 'json') {
      content = '```json\n' + md + '\n```'
    } else if (ext === 'yaml' || ext === 'yml') {
      content = '```yaml\n' + md + '\n```'
    } else if (ext === 'js' || ext === 'javascript') {
      content = '```javascript\n' + md + '\n```'
    } else if (ext === 'ts' || ext === 'typescript') {
      content = '```typescript\n' + md + '\n```'
    } else if (ext === 'css') {
      content = '```css\n' + md + '\n```'
    } else if (ext === 'html' || ext === 'htm') {
      content = '```html\n' + md + '\n```'
    } else if (ext === 'xml') {
      content = '```xml\n' + md + '\n```'
    } else if (ext === 'sh' || ext === 'bash') {
      content = '```bash\n' + md + '\n```'
    } else if (ext === 'py' || ext === 'python') {
      content = '```python\n' + md + '\n```'
    } else if (ext === 'go') {
      content = '```go\n' + md + '\n```'
    } else if (ext === 'rs' || ext === 'rust') {
      content = '```rust\n' + md + '\n```'
    } else if (ext === 'java') {
      content = '```java\n' + md + '\n```'
    } else if (ext === 'c' || ext === 'cpp' || ext === 'h' || ext === 'hpp') {
      content = '```cpp\n' + md + '\n```'
    } else if (ext === 'php') {
      content = '```php\n' + md + '\n```'
    } else if (ext === 'rb' || ext === 'ruby') {
      content = '```ruby\n' + md + '\n```'
    }
  }

  const html = processMarkdown(content)
  await uiRenderer.renderPreview(preview, html)

  const estimatedPages = estimatePageCount(html)
  Logger.log(`Renderizado em ~${estimatedPages} pagina(s) A4`, 'info')
}

function renderList(): void {
  const list = document.getElementById('documents-list')
  if (!list) return

  uiRenderer.renderDocumentList(
    list,
    state.docs,
    state.currentId,
    (id) => switchDoc(id),
    (id) => deleteDoc(id)
  )

  const input = document.getElementById('doc-name') as HTMLInputElement | null
  const current = getCurrentDoc()
  if (input && current) {
    uiRenderer.setDocumentNameInput(input, current.name)
  }
}

function switchDoc(id: number): void {
  if (id === state.currentId) return;
  const currentDoc = getCurrentDoc();
  if (currentDoc && documentoEstaModificado(currentDoc)) {
    salvarDocumentosAgora();
  }
  state.currentId = id;

  const doc = getCurrentDoc();
  if (state.editor && doc) {
    state.editor.dispatch({
      changes: { from: 0, to: state.editor.state.doc.length, insert: doc.content }
    });
    renderPreview(doc.content);
    renderList();
    loadDocPreferences(id);
    updateSaveStatus();
    void atualizarLinguagemEditor(doc.name);
    Logger.log(`Alternado para doc ID: ${id}`);
  }
}

function createDoc(): void {
  Logger.log('Criando novo documento...')
  try {
    const newDoc = documentManager.create()
    state.currentId = newDoc.id

    if (state.editor) {
      state.editor.dispatch({
        changes: { from: 0, to: state.editor.state.doc.length, insert: '' }
      })
    }
    renderList()
    renderPreview('')
    void atualizarLinguagemEditor(newDoc.name)
    Logger.success(`Documento criado [ID: ${newDoc.id}]`)
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    Logger.error('Falha ao criar documento: ' + errorMessage)
  }
}

function deleteDoc(id: number): void {
  if (confirm('Confirmar exclusao?')) {
    const success = documentManager.delete(id)
    if (success) {
      if (state.currentId === id) {
        const docs = documentManager.getAll()
        if (docs.length > 0 && docs[0]) {
          state.currentId = docs[0].id
          switchDoc(state.currentId)
        }
      }
      renderList()
      Logger.log(`Documento ${id} removido.`)
    }
  }
}

function flashStatus(): void {
  const dot = document.getElementById('status-indicator')
  if (dot) {
    uiRenderer.flashIndicator(dot, 200)
  }
}

function updateMetrics(): void {
  const size = documentManager.getSize()
  const el = document.getElementById('mem-usage')
  if (el) {
    uiRenderer.updateMemoryMetric(el, size)
  }
}

function setupEvents(): void {
  const btnNew = document.getElementById('new-doc-btn');
  if (btnNew) {
    btnNew.addEventListener('click', createDoc);
  }

  const btnDown = document.getElementById('download-btn');
  if (btnDown) {
    btnDown.addEventListener('click', async (): Promise<void> => {
      Logger.log('Validando conteudo para impressao...');

      const preview = document.getElementById('preview');
      if (!preview) {
        Logger.error('Preview nao encontrado');
        return;
      }

      const validation = await validatePrintContent(preview);

      if (validation.issues.length > 0) {
        validation.issues.forEach((issue): void => Logger.log(issue, 'warning'));
      }

      const doc = getCurrentDoc();
      const reporter = createReporter(preview.innerHTML, doc?.name || 'document');
      const checklist = reporter.generateChecklist();

      Logger.log('=== PRE-IMPRESSAO ===', 'info');
      checklist.checks.forEach((check): void => Logger.log(check, 'success'));
      checklist.warnings.forEach((warn): void => Logger.log(warn, 'warning'));

      const stats = reporter.analyze();
      Logger.log(
        `${stats.estimatedPages}pp | ${stats.words} palavras | ~${stats.readingTime}min`
      );

      Logger.log('Abrindo dialogo de impressao...');
      const success = await printDocument(doc?.name || 'document', (msg: string): void =>
        Logger.log(msg)
      );

      if (success) {
        Logger.success('Impressao finalizada com sucesso');
      }
    });
  }

  // Import MD Button
  const btnImportMd = document.getElementById('import-md-btn');
  if (btnImportMd) {
    btnImportMd.addEventListener('click', importMarkdownFile);
  }

  // Download MD Button
  const btnDownloadMd = document.getElementById('download-md-btn');
  if (btnDownloadMd) {
    btnDownloadMd.addEventListener('click', downloadMarkdownFile);
  }

  const btnBackup = document.getElementById('backup-btn');
  if (btnBackup) {
    btnBackup.addEventListener('click', exportarBackupDocumentos);
  }

  const btnRestore = document.getElementById('restore-btn');
  if (btnRestore) {
    btnRestore.addEventListener('click', importarBackupDocumentos);
  }

  // Atalhos de teclado globais
  document.addEventListener('keydown', (e: KeyboardEvent): void => {
    // Ctrl+Shift+P - Preview de impressao
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      togglePrintPreview();
      Logger.success(
        document.body.classList.contains('print-mode')
          ? 'Preview de Impressao Ativado (ESC para sair)'
          : 'Preview Desativado'
      );
    }
  });

  // Name Input
  const inputName = document.getElementById('doc-name') as HTMLInputElement | null;
  if (inputName) {
    inputName.addEventListener('input', (e: Event): void => {
      const target = e.target as HTMLInputElement;
      const doc = getCurrentDoc();
      if (doc) {
        const extAnterior = obterExtensaoDocumento(doc.name)
        doc.name = target.value;
        saveDocs();
        renderList();
        const extNovo = obterExtensaoDocumento(doc.name)
        if (extAnterior !== extNovo) {
          void renderPreview(doc.content);
          void atualizarLinguagemEditor(doc.name);
        }
      }
    });
  }

  // Copy Markdown Button
  const btnCopyMd = document.getElementById('copy-md-btn');
  if (btnCopyMd) {
    btnCopyMd.addEventListener('click', async (): Promise<void> => {
      const doc = getCurrentDoc();
      if (doc?.content) {
        try {
          await navigator.clipboard.writeText(doc.content);
          Logger.success('Conteudo copiado para area de transferencia');
          const originalText = btnCopyMd.textContent;
          btnCopyMd.textContent = '[ OK! ]';
          btnCopyMd.classList.add('copied');
          setTimeout(() => {
            btnCopyMd.textContent = originalText;
            btnCopyMd.classList.remove('copied');
          }, 1500);
        } catch (err) {
          Logger.error('Falha ao copiar: ' + String(err));
        }
      } else {
        Logger.log('Nenhum conteudo para copiar', 'warning');
      }
    });
  }

  // Atalho Ctrl+Shift+C para copiar
  document.addEventListener('keydown', (e: KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      btnCopyMd?.click();
    }
  });
}

function setupKeyboardNavigation(): void {
  document.addEventListener('keydown', (e: KeyboardEvent): void => {
    // Ctrl+N - Novo documento
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      createDoc();
    }

    // Ctrl+Shift+E - Exportar PDF
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      const btnDown = document.getElementById('download-btn') as HTMLButtonElement | null;
      if (btnDown) {
        btnDown.click();
      }
    }

    // Escape - Limpar print preview
    if (e.key === 'Escape') {
      if (document.body.classList.contains('print-mode')) {
        e.preventDefault();
        togglePrintPreview();
        Logger.log('Preview de Impressao desativado');
      }
    }
  });

  // Keyboard navigation em lista de documentos
  const documentsList = document.getElementById('documents-list') as HTMLElement | null;
  if (documentsList) {
    documentsList.addEventListener('keydown', (e: KeyboardEvent): void => {
      const items = Array.from(documentsList.querySelectorAll('.document-item')) as HTMLElement[];
      if (items.length === 0) return;

      const activeItem = document.querySelector('.document-item.active') as HTMLElement | null;
      let currentIndex = activeItem ? items.indexOf(activeItem) : -1;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, items.length - 1);
        (items[nextIndex] as HTMLElement).click();
        (items[nextIndex] as HTMLElement).focus();
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        (items[prevIndex] as HTMLElement).click();
        (items[prevIndex] as HTMLElement).focus();
      }

      if (e.key === 'Delete' && activeItem) {
        e.preventDefault();
        const docNameEl = activeItem.querySelector('.doc-name') as HTMLElement | null;
        const docName = docNameEl?.textContent || 'documento';
        if (confirm(`Tem certeza que deseja deletar "${docName}"?`)) {
          const docId = activeItem.getAttribute('data-doc-id');
          if (docId) {
            deleteDoc(parseInt(docId, 10));
          }
        }
      }

      if (e.key === 'Home') {
        e.preventDefault();
        (items[0] as HTMLElement).click();
        (items[0] as HTMLElement).focus();
      }

      if (e.key === 'End') {
        e.preventDefault();
        const lastItem = items[items.length - 1];
        (lastItem as HTMLElement).click();
        (lastItem as HTMLElement).focus();
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const target = e.target as HTMLElement;
        if (target.classList.contains('document-item')) {
          target.click();
        }
      }
    });

    const items = documentsList.querySelectorAll('.document-item') as NodeListOf<HTMLElement>;
    items.forEach((item: HTMLElement, index: number): void => {
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });
  }

  const editor = document.getElementById('editor') as HTMLElement | null;
  if (editor) {
    editor.addEventListener('keydown', (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        const firstDoc = documentsList?.querySelector('.document-item') as HTMLElement | null;
        if (firstDoc) {
          firstDoc.focus();
        }
      }
    });
  }

  Logger.success('Navegacao por teclado ativada');
  Logger.log('Atalhos: Ctrl+N=Novo | Ctrl+Shift+E=PDF | Arrow Keys=Navegar Docs');
}

// Boot
document.addEventListener('DOMContentLoaded', initSystem);

export { Logger };
