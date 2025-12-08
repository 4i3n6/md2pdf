import { EditorView, basicSetup } from 'codemirror'
import { Decoration, hoverTooltip } from '@codemirror/view'
import { StateField, StateEffect } from '@codemirror/state'
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
import type { AppState, LoggerInterface, Document as AppDocument } from '@/types/index'
import './pwaRegister'
import './styles.css'
import './styles-print.css'

// Logger do Sistema
const Logger: LoggerInterface = {
  log: (msg: string, type: 'info' | 'error' | 'success' | 'warning' = 'info'): void => {
    const consoleEl = document.getElementById('console-log');
    if (!consoleEl) return;

    const time = new Date().toLocaleTimeString('pt-BR', { hour12: false });
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

/**
 * Estado da aplicacao (UI-only)
 * Documentos sao gerenciados pelo DocumentManager
 */
const state: AppState = {
  docs: [],
  currentId: null,
  editor: null
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

const DEFAULT_PREFS: DocumentPreferences = {
  font: "'JetBrains Mono', monospace",
  align: 'left'
};

function getDocPreferences(docId: number): DocumentPreferences {
  const key = `md2pdf-doc-prefs-${docId}`;
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
  const key = `md2pdf-doc-prefs-${docId}`;
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

function formatTimeSinceSaved(lastSaved: number | null): string {
  if (!lastSaved) return 'Nunca salvo';
  
  const now = Date.now();
  const diff = now - lastSaved;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (seconds < 5) return 'Salvo agora';
  if (seconds < 60) return `Salvo ha ${seconds}s`;
  if (minutes < 60) return `Salvo ha ${minutes}min`;
  return `Salvo ha ${hours}h`;
}

function updateSaveStatus(): void {
  const doc = getCurrentDoc();
  if (!doc) return;
  
  const statusEl = document.getElementById('save-status');
  if (!statusEl) return;
  
  const statusText = formatTimeSinceSaved(doc.lastSaved);
  statusEl.className = 'save-status save-status-saved';
  statusEl.innerHTML = `<span class="save-dot saved"></span><span class="save-text">${statusText}</span>`;
}

function forceSave(): void {
  const doc = getCurrentDoc();
  if (!doc) {
    Logger.log('Nenhum documento para salvar', 'warning');
    return;
  }
  
  documentManager.setContent(doc.id, doc.content);
  updateSaveStatus();
  Logger.success('Documento salvo');
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
  Logger.log('Inicializando nucleo...');
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

  documentManager.setContent(doc.id, doc.content)
  updateMetrics()
}

function updateEditorDiagnostics(content: string): void {
  if (!state.editor) return;

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
      markdown(),
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
            saveDocs();
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
  }
}

function getCurrentDoc(): AppDocument | undefined {
  return state.docs.find((d) => d.id === state.currentId);
}

async function renderPreview(md: string): Promise<void> {
  const preview = document.getElementById('preview')
  if (!preview) return

  const html = processMarkdown(md)
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

      const validation = validatePrintContent(preview.innerHTML);

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
        doc.name = target.value;
        saveDocs();
        renderList();
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
