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
import { createSaveStatusService, documentoEstaModificado } from './services/saveStatusService'
import { createDocumentIoService } from './services/documentIoService'
import { setupKeyboardNavigation } from './services/keyboardNavigationService'
import { setupQuickTags } from './services/quickTagsService'
import { createPrintWorkflowService } from './services/printWorkflowService'
import { setupAppEvents } from './services/appEventsService'
import { createMarkdownDiagnosticsService } from './services/markdownDiagnosticsService'
import { carregadoresLinguagem } from './services/editorLanguageLoaders'
import {
  documentoEhMarkdownPorNome,
  obterExtensaoDocumentoArquivo,
  obterModoEditorPorNome
} from './services/documentLanguageService'
import {
  loadDocPreferences,
  setupPreviewControls
} from './services/previewPreferencesService'
import { documentManager } from './services/documentManager'
import { uiRenderer } from './services/uiRenderer'
import { initI18n, t, getLocale } from './i18n/index'
import { BreakpointsLayout, SalvamentoConfig } from '@/constants'
import type { AppState, LoggerInterface, Document as AppDocument } from '@/types/index'
import { debounce } from '@/utils/debounce'
import { editorTheme } from './editorTheme'
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
const LimitesLogger = {
  maxLinhasConsole: 400
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
    while (consoleEl.childElementCount > LimitesLogger.maxLinhasConsole) {
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

// Expor Logger globalmente para uso em outros modulos
declare global {
  interface Window {
    Logger: LoggerInterface;
  }
}
window.Logger = Logger;

const previewService = new PreviewService(uiRenderer, Logger)

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

const markdownDiagnosticsService = createMarkdownDiagnosticsService({
  logger: Logger,
  getEditorView: () => state.editor,
  documentoEhMarkdown: () => documentoEhMarkdown()
})

const saveStatusService = createSaveStatusService({
  state,
  logger: Logger,
  getCurrentDoc,
  persistDocs: () => documentManager.persistir(),
  updateMetrics,
  t,
  debounceMs: SalvamentoConfig.debounceMs
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
  atualizarLinguagemEditor
})

// Compartimento para alternar linguagem do editor dinamicamente
const compartimentoLinguagem = new Compartment();
let requisicaoLinguagemEditor = 0;
let modoEditorAtual = '';

// ============================================
// UTILITY FUNCTIONS
// ============================================

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
  setupAppEvents({
    logger: Logger,
    createDoc,
    imprimirDocumentoAtual: () => printWorkflowService.imprimirDocumentoAtual(),
    documentIoService,
    togglePrintPreview,
    getCurrentDoc,
    obterExtensaoDocumento,
    saveDocs,
    renderList,
    renderPreview,
    atualizarLinguagemEditor
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

  saveStatusService.salvarDocumentosAgora()
}

function obterExtensaoDocumento(nome?: string): string {
  return obterExtensaoDocumentoArquivo(nome ?? getCurrentDoc()?.name ?? '')
}

function documentoEhMarkdown(nome?: string): boolean {
  return documentoEhMarkdownPorNome(nome ?? getCurrentDoc()?.name ?? '')
}

function obterModoEditor(nome?: string): string {
  return obterModoEditorPorNome(nome ?? getCurrentDoc()?.name ?? '')
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
    markdownDiagnosticsService.clearDiagnostics()
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

function initEditor(): void {
  const el = document.getElementById('editor');
  if (!el) {
    Logger.error('Elemento editor nao encontrado!');
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
      compartimentoLinguagem.of(markdown()),
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
            saveStatusService.agendarSalvamento();
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
    void atualizarLinguagemEditor(doc.name);
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
  if (currentDoc && documentoEstaModificado(currentDoc)) {
    saveStatusService.salvarDocumentosAgora();
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
  const doc = state.docs.find((d) => d.id === id)
  const nome = doc?.name || 'documento'
  if (confirm(`Tem certeza que deseja deletar "${nome}"?`)) {
    const success = documentManager.delete(id)
    if (success) {
      if (state.currentId === id) {
        const docs = documentManager.getAll()
        if (docs.length > 0 && docs[0]) {
          // Nao setar state.currentId antes do switchDoc, para evitar early-return.
          switchDoc(docs[0].id)
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

// Boot
document.addEventListener('DOMContentLoaded', initSystem);

export { Logger };
