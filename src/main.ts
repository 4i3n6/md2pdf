import { EditorView, basicSetup } from 'codemirror'
import { Compartment, type Extension } from '@codemirror/state'
import { language } from '@codemirror/language'
import { markdown } from '@codemirror/lang-markdown'
import 'highlight.js/styles/github.css'
import { togglePrintPreview } from './utils/printUtils'
import OfflineManager from './utils/offlineManager'
import SWUpdateNotifier from './utils/swUpdateNotifier'
import { PreviewService } from './services/previewService'
import { initSplitter } from './services/splitterService'
import { createSaveStatusService, isDocumentModified } from './services/saveStatusService'
import { createDocumentIoService } from './services/documentIoService'
import { setupKeyboardNavigation } from './services/keyboardNavigationService'
import { setupQuickTags } from './services/quickTagsService'
import { createPrintWorkflowService } from './services/printWorkflowService'
import { setupAppEvents } from './services/appEventsService'
import { createMarkdownDiagnosticsService } from './services/markdownDiagnosticsService'
import { languageLoaders } from './services/editorLanguageLoaders'
import {
  isMarkdownByName,
  getFileExtension,
  getEditorModeByName
} from './services/documentLanguageService'
import {
  loadDocPreferences,
  setupPreviewControls
} from './services/previewPreferencesService'
import { documentManager } from './services/documentManager'
import { uiRenderer } from './services/uiRenderer'
import { initI18n, t, getLocale } from './i18n/index'
import { LayoutBreakpoints, SaveConfig } from '@/constants'
import type { AppState, LoggerInterface, Document as AppDocument } from '@/types/index'
import { debounce } from '@/utils/debounce'
import { editorTheme } from './editorTheme'
import { confirm } from './services/modalService'
import './pwaRegister'
import './styles.css'
import './styles-print.css'

// Mobile detection - block app initialization on small screens
function isMobileViewport(): boolean {
  return window.innerWidth < LayoutBreakpoints.mobilePx;
}

// If mobile, don't initialize the app - CSS will show the overlay
if (isMobileViewport()) {
  // Prevent any further initialization
  throw new Error('Mobile viewport detected - app initialization blocked');
}

// Initialize i18n based on URL path
initI18n()

// System Logger (uses i18n locale for time formatting)
const APP_VERSION = __APP_VERSION__ || '0.0.0'
const LoggerLimits = {
  maxConsoleLines: 400
}

const Logger: LoggerInterface = {
  log: (msg: string, type: 'info' | 'error' | 'success' | 'warning' = 'info'): void => {
    const consoleEl = document.getElementById('console-log');
    if (!consoleEl) return;

    const time = new Date().toLocaleTimeString(getLocale(), { hour12: false });
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.textContent = `[${time}] ${msg}`;

    consoleEl.appendChild(line);
    while (consoleEl.childElementCount > LoggerLimits.maxConsoleLines) {
      if (!consoleEl.firstElementChild) {
        break;
      }
      consoleEl.removeChild(consoleEl.firstElementChild);
    }
    consoleEl.scrollTop = consoleEl.scrollHeight;
  },
  error: (msg: string): void => Logger.log(msg, 'error'),
  success: (msg: string): void => Logger.log(msg, 'success')
};

// Expose Logger globally for use across modules
declare global {
  interface Window {
    Logger: LoggerInterface;
  }
}
window.Logger = Logger;

const previewService = new PreviewService(uiRenderer, Logger)

function updateVersionUI(): void {
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
  const message = event.message || 'Unexpected error';
  Logger.error(`Unexpected error: ${message}`);
});

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent): void => {
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
  Logger.error(`Unhandled promise rejection: ${reason}`);
});

const state: AppState = {
  docs: [],
  currentId: null,
  editor: null
}

const markdownDiagnosticsService = createMarkdownDiagnosticsService({
  logger: Logger,
  getEditorView: () => state.editor,
  isMarkdownDocument: () => isMarkdownDocument()
})

const saveStatusService = createSaveStatusService({
  state,
  logger: Logger,
  getCurrentDoc,
  persistDocs: () => documentManager.persist(),
  updateMetrics,
  t,
  debounceMs: SaveConfig.debounceMs
})

const printWorkflowService = createPrintWorkflowService({
  logger: Logger,
  getCurrentDoc
})

const documentIoService = createDocumentIoService({
  state,
  logger: Logger,
  appVersion: APP_VERSION,
  documentManager,
  getCurrentDoc,
  renderList,
  renderPreview,
  updateMetrics,
  updateSaveStatus: () => saveStatusService.updateSaveStatus(),
  updateEditorLanguage
})

// Compartment for dynamic editor language switching
const languageCompartment = new Compartment();
let editorLanguageRequestId = 0;
let currentEditorMode = '';

// ============================================
// UTILITY FUNCTIONS
// ============================================

// ============================================
// CORE FUNCTIONS
// ============================================

function initSystem(): void {
  updateVersionUI();
  Logger.log('Initializing core...');
  Logger.log(`Version ${APP_VERSION}`);
  Logger.success('Markdown processor loaded');
  Logger.success('A4 print styles active');

  OfflineManager.init();
  OfflineManager.loadSyncQueue();
  OfflineManager.onStatusChange((isOnline: boolean): void => {
    const msg = isOnline
      ? 'Connection restored'
      : 'No connection - Offline mode active';
    Logger.log(msg, isOnline ? 'success' : 'warning');
  });
  Logger.success('Offline manager active');

  SWUpdateNotifier.init();
  Logger.success('Update notifier active');

  loadDocs();
  initEditor();
  setupAppEvents({
    logger: Logger,
    createDoc,
    printCurrentDocument: () => printWorkflowService.printCurrentDocument(),
    documentIoService,
    togglePrintPreview,
    getCurrentDoc,
    getDocumentExtension,
    saveDocs,
    renderList,
    renderPreview,
    updateEditorLanguage
  })
  setupQuickTags({ state, logger: Logger });
  setupPreviewControls(state, Logger);
  saveStatusService.setupSaveControls();
  setupKeyboardNavigation({ logger: Logger, createDoc, deleteDoc, togglePrintPreview });
  initSplitter(Logger);
  updateMetrics();
  saveStatusService.updateSaveStatus();
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

  saveStatusService.saveDocumentsNow()
}

function getDocumentExtension(name?: string): string {
  return getFileExtension(name ?? getCurrentDoc()?.name ?? '')
}

function isMarkdownDocument(name?: string): boolean {
  return isMarkdownByName(name ?? getCurrentDoc()?.name ?? '')
}

function getEditorMode(name?: string): string {
  return getEditorModeByName(name ?? getCurrentDoc()?.name ?? '')
}

async function loadEditorLanguage(name?: string): Promise<Extension> {
  if (isMarkdownDocument(name)) {
    return markdown()
  }

  const ext = getDocumentExtension(name)
  const loader = languageLoaders[ext]
  if (!loader) {
    return []
  }
  return await loader()
}

async function updateEditorLanguage(name?: string): Promise<void> {
  if (!state.editor) return

  const mode = getEditorMode(name)
  if (mode === currentEditorMode) {
    return
  }

  if (mode !== 'markdown') {
    markdownDiagnosticsService.clearDiagnostics()
  }

  const currentRequest = ++editorLanguageRequestId
  try {
    const extension = await loadEditorLanguage(name)
    if (!state.editor || currentRequest !== editorLanguageRequestId) {
      return
    }
    state.editor.dispatch({
      effects: languageCompartment.reconfigure(extension)
    })
    currentEditorMode = mode
    const activeLanguage = state.editor.state.facet(language)
    const languageName = activeLanguage?.name || 'none'
    Logger.log(`Editor set to ${mode} (${languageName})`)
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e)
    Logger.error(`Failed to load editor language: ${errorMsg}`)
    if (state.editor && currentRequest === editorLanguageRequestId) {
      state.editor.dispatch({
        effects: languageCompartment.reconfigure(markdown())
      })
      currentEditorMode = 'markdown'
    }
  }
}

function initEditor(): void {
  const el = document.getElementById('editor');
  if (!el) {
    Logger.error('Editor element not found!');
    return;
  }

  const doc = getCurrentDoc();

  const debouncedRender = debounce(renderPreview, 300);
  const debouncedUpdateMetrics = debounce(updateMetrics, 500);
  const debouncedValidate = debounce(markdownDiagnosticsService.updateDiagnostics, 300);

  state.editor = new EditorView({
    doc: doc ? doc.content : '',
    extensions: [
      basicSetup,
      languageCompartment.of(markdown()),
      EditorView.lineWrapping,
      markdownDiagnosticsService.decorationsField,
      markdownDiagnosticsService.hoverTooltipExtension,
      editorTheme,
      EditorView.updateListener.of((u): void => {
        if (u.docChanged) {
          const start = performance.now();
          const val = u.state.doc.toString();

          const active = getCurrentDoc();
          if (active) {
            active.content = val;
            active.updated = Date.now();
            saveStatusService.scheduleSave();
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
      loadDocPreferences(state, Logger, state.currentId);
    }
    void updateEditorLanguage(doc.name);
  }
}

function getCurrentDoc(): AppDocument | undefined {
  return state.docs.find((d) => d.id === state.currentId);
}

function renderPreview(md: string): void {
  const preview = document.getElementById('preview')
  if (!preview) return

  const currentDoc = getCurrentDoc()
  previewService.requestRender(preview, md, currentDoc?.name || '')
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
  if (currentDoc && isDocumentModified(currentDoc)) {
    saveStatusService.saveDocumentsNow();
  }
  state.currentId = id;

  const doc = getCurrentDoc();
  if (state.editor && doc) {
    state.editor.dispatch({
      changes: { from: 0, to: state.editor.state.doc.length, insert: doc.content }
    });
    renderPreview(doc.content);
    renderList();
    loadDocPreferences(state, Logger, id);
    saveStatusService.updateSaveStatus();
    void updateEditorLanguage(doc.name);
    Logger.log(`Switched to doc ID: ${id}`);
  }
}

function createDoc(): void {
  Logger.log('Creating new document...')
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
    void updateEditorLanguage(newDoc.name)
    Logger.success(`Document created [ID: ${newDoc.id}]`)
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    Logger.error('Failed to create document: ' + errorMessage)
  }
}

function deleteDoc(id: number): void {
  const doc = state.docs.find((d) => d.id === id)
  const docName = doc?.name || 'document'
  void confirm({
    title: 'Delete document',
    message: `Are you sure you want to delete "${docName}"?`,
    confirmLabel: 'Delete',
    variant: 'danger'
  }).then((confirmed) => {
    if (!confirmed) return
    const success = documentManager.delete(id)
    if (success) {
      if (state.currentId === id) {
        const docs = documentManager.getAll()
        if (docs.length > 0 && docs[0]) {
          // Do not set state.currentId before switchDoc — avoids early-return.
          switchDoc(docs[0].id)
        }
      }
      renderList()
      Logger.log(`Document ${id} removed.`)
    }
  })
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

// Boot
document.addEventListener('DOMContentLoaded', initSystem);

export { Logger };
