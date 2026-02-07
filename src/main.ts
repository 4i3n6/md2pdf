import { EditorView, basicSetup } from 'codemirror'
import { Decoration, hoverTooltip } from '@codemirror/view'
import { StateField, StateEffect, Compartment, type Extension } from '@codemirror/state'
import { language } from '@codemirror/language'
import { markdown } from '@codemirror/lang-markdown'
import 'highlight.js/styles/github.css'
import { validateMarkdown, type MarkdownError } from './processors/markdownValidator'
import { printDocument, validatePrintContent, togglePrintPreview } from './utils/printUtils'
import { createReporter } from './utils/printReporter'
import OfflineManager from './utils/offlineManager'
import SWUpdateNotifier from './utils/swUpdateNotifier'
import { PreviewService } from './services/previewService'
import { initSplitter } from './services/splitterService'
import { createSaveStatusService, documentoEstaModificado } from './services/saveStatusService'
import { createDocumentIoService } from './services/documentIoService'
import { setupKeyboardNavigation } from './services/keyboardNavigationService'
import { setupQuickTags } from './services/quickTagsService'
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

const saveStatusService = createSaveStatusService({
  state,
  logger: Logger,
  getCurrentDoc,
  persistDocs: () => documentManager.persistir(),
  updateMetrics,
  t,
  debounceMs: SalvamentoConfig.debounceMs
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
  setupEvents();
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
  if (confirm('Confirmar exclusao?')) {
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
    btnImportMd.addEventListener('click', documentIoService.importMarkdownFile);
  }

  // Download MD Button
  const btnDownloadMd = document.getElementById('download-md-btn');
  if (btnDownloadMd) {
    btnDownloadMd.addEventListener('click', documentIoService.downloadMarkdownFile);
  }

  const btnBackup = document.getElementById('backup-btn');
  if (btnBackup) {
    btnBackup.addEventListener('click', documentIoService.exportarBackupDocumentos);
  }

  const btnRestore = document.getElementById('restore-btn');
  if (btnRestore) {
    btnRestore.addEventListener('click', documentIoService.importarBackupDocumentos);
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

// Boot
document.addEventListener('DOMContentLoaded', initSystem);

export { Logger };
