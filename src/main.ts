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
import {
  isFileSystemAccessSupported,
  openFileFromDisk,
  saveFileToDisk,
  openFileFallback,
  downloadFileFallback
} from './services/fileSystemService'
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

// Expor Logger globalmente para uso em outros módulos
declare global {
  interface Window {
    Logger: LoggerInterface;
  }
}
window.Logger = Logger;

/**
 * Estado da aplicação (UI-only)
 * Documentos são gerenciados pelo DocumentManager
 */
const state: AppState = {
  docs: [],
  currentId: null,
  editor: null
}

// CodeMirror Decorations Setup
/**
 * StateEffect para atualizar decorations de validação de Markdown
 */
const updateDecorationsEffect = StateEffect.define<any>();

/**
 * StateField para gerenciar decorations de validação
 */
const markdownDecorationsField = StateField.define({
  create() {
    return Decoration.none;
  },
  
  update(decorations, tr) {
    // Se há um efeito de atualização, usar o novo valor
    for (const effect of tr.effects) {
      if (effect.is(updateDecorationsEffect)) {
        return effect.value;
      }
    }
    // Caso contrário, mapear as decorations para as mudanças
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

/**
 * Obtém preferências de um documento do localStorage
 */
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

/**
 * Salva preferências de um documento no localStorage
 */
function saveDocPreferences(docId: number, prefs: DocumentPreferences): void {
  const key = `md2pdf-doc-prefs-${docId}`;
  localStorage.setItem(key, JSON.stringify(prefs));
}

/**
 * Aplica fonte ao preview do documento
 */
function applyPreviewFont(font: string): void {
  const preview = document.getElementById('preview');
  if (preview) {
    preview.style.fontFamily = font;
  }
  
  // Atualizar dropdown visual
  const fontSelect = document.getElementById('preview-font') as HTMLSelectElement;
  if (fontSelect) {
    fontSelect.value = font;
  }
  
  // Salvar preferência do documento atual
  if (state.currentId) {
    const prefs = getDocPreferences(state.currentId);
    prefs.font = font;
    saveDocPreferences(state.currentId, prefs);
  }
}

/**
 * Aplica alinhamento ao preview do documento
 */
function applyPreviewAlign(align: string): void {
  const preview = document.getElementById('preview');
  if (preview) {
    preview.style.textAlign = align;
  }
  
  // Atualizar botões visuais
  updateAlignButtons(align);
  
  // Salvar preferência do documento atual
  if (state.currentId) {
    const prefs = getDocPreferences(state.currentId);
    prefs['align'] = align;
    saveDocPreferences(state.currentId, prefs);
  }
}

/**
 * Atualiza estado visual dos botões de alinhamento
 */
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

/**
 * Carrega preferências de um documento e aplica ao preview
 */
function loadDocPreferences(docId: number): void {
  const prefs = getDocPreferences(docId);
  applyPreviewFont(prefs.font);
  applyPreviewAlign(prefs.align);
}

// ============================================
// SAVE STATUS MANAGEMENT
// ============================================

let saveStatusInterval: ReturnType<typeof setInterval> | null = null;
let diskAutoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
const DISK_AUTO_SAVE_DELAY = 2000; // 2 segundos de debounce para auto-save no disco

/**
 * Formata tempo relativo desde último salvamento
 */
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

/**
 * Atualiza o indicador de status de salvamento na UI
 */
function updateSaveStatus(): void {
  const doc = getCurrentDoc();
  if (!doc) return;
  
  const statusEl = document.getElementById('save-status');
  const storageEl = document.getElementById('storage-badge');
  
  if (!statusEl) return;
  
  // Atualizar badge de storage
  if (storageEl) {
    storageEl.className = `storage-badge storage-${doc.storage}`;
    storageEl.textContent = doc.storage.toUpperCase();
    storageEl.title = doc.storage === 'local' 
      ? 'Armazenado no navegador' 
      : doc.storage === 'disk' 
      ? 'Arquivo no disco' 
      : 'Sincronizado na nuvem';
  }
  
  // Determinar status visual
  let statusClass: string;
  let dotHtml: string;
  let statusText: string;
  
  if (doc.isDirty) {
    statusClass = 'save-status-modified';
    dotHtml = '<span class="save-dot modified"></span>';
    statusText = 'Nao salvo';
  } else {
    statusClass = 'save-status-saved';
    dotHtml = '<span class="save-dot saved"></span>';
    statusText = formatTimeSinceSaved(doc.lastSaved);
  }
  
  statusEl.className = `save-status ${statusClass}`;
  statusEl.innerHTML = `${dotHtml}<span class="save-text">${statusText}</span>`;
}

/**
 * Define documento como modificado (dirty)
 */
function markDocumentDirty(): void {
  const doc = getCurrentDoc();
  if (!doc) return;
  
  doc.isDirty = true;
  updateSaveStatus();
  
  // Para arquivos do disco, agendar auto-save debounced
  if (doc.storage === 'disk' && doc.fileHandle && isFileSystemAccessSupported()) {
    scheduleDiskAutoSave();
  }
}

/**
 * Agenda auto-save para arquivo do disco com debounce
 */
function scheduleDiskAutoSave(): void {
  // Cancelar timeout anterior se existir
  if (diskAutoSaveTimeout) {
    clearTimeout(diskAutoSaveTimeout);
  }
  
  diskAutoSaveTimeout = setTimeout(async () => {
    const doc = getCurrentDoc();
    if (!doc || !doc.isDirty || doc.storage !== 'disk' || !doc.fileHandle) {
      return;
    }
    
    try {
      await saveFileToDisk(doc.content, { handle: doc.fileHandle });
      markDocumentSaved();
      // Nao logar para nao poluir - auto-save silencioso
    } catch (e) {
      // Falha silenciosa no auto-save - usuario pode salvar manualmente
      const errorMsg = e instanceof Error ? e.message : String(e);
      Logger.log(`Auto-save falhou: ${errorMsg}`, 'warning');
    }
  }, DISK_AUTO_SAVE_DELAY);
}

/**
 * Define documento como salvo
 */
function markDocumentSaved(): void {
  const doc = getCurrentDoc();
  if (!doc) return;
  
  doc.isDirty = false;
  doc.lastSaved = Date.now();
  updateSaveStatus();
}

/**
 * Mostra status de "salvando..."
 */
function showSavingStatus(): void {
  const statusEl = document.getElementById('save-status');
  if (!statusEl) return;
  
  statusEl.className = 'save-status save-status-saving';
  statusEl.innerHTML = '<span class="save-dot saving"></span><span class="save-text">Salvando...</span>';
}

/**
 * Mostra status de erro ao salvar
 */
function showSaveError(): void {
  const statusEl = document.getElementById('save-status');
  if (!statusEl) return;
  
  statusEl.className = 'save-status save-status-error';
  statusEl.innerHTML = '<span class="save-dot error"></span><span class="save-text">Erro ao salvar</span>';
}

/**
 * Força salvamento manual do documento atual
 * Para documentos do disco, salva diretamente no arquivo
 */
async function forceSave(): Promise<void> {
  const doc = getCurrentDoc();
  if (!doc) {
    Logger.log('Nenhum documento para salvar', 'warning');
    return;
  }
  
  showSavingStatus();
  
  try {
    // Sempre salvar no localStorage primeiro (backup)
    documentManager.setContent(doc.id, doc.content);
    
    // Se for arquivo do disco com handle, salvar no disco também
    if (doc.storage === 'disk' && doc.fileHandle && isFileSystemAccessSupported()) {
      await saveFileToDisk(doc.content, { handle: doc.fileHandle });
      Logger.success(`Salvo no disco: ${doc.name}`);
    } else {
      Logger.success('Documento salvo');
    }
    
    markDocumentSaved();
  } catch (e) {
    showSaveError();
    const errorMsg = e instanceof Error ? e.message : String(e);
    Logger.error('Erro ao salvar: ' + errorMsg);
  }
}

/**
 * Inicia intervalo para atualizar tempo relativo de salvamento
 */
function startSaveStatusUpdater(): void {
  // Atualizar a cada 10 segundos
  if (saveStatusInterval) {
    clearInterval(saveStatusInterval);
  }
  saveStatusInterval = setInterval(() => {
    const doc = getCurrentDoc();
    if (doc && !doc.isDirty) {
      updateSaveStatus();
    }
  }, 10000);
}

/**
 * Configura event listeners para controles de salvamento
 */
function setupSaveControls(): void {
  const forceSaveBtn = document.getElementById('force-save-btn');
  
  if (forceSaveBtn) {
    forceSaveBtn.addEventListener('click', forceSave);
  }
  
  // Atalho Ctrl+S para salvar
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
// FILE SYSTEM ACCESS API INTEGRATION
// ============================================

/**
 * Abre um arquivo do disco e cria um novo documento
 */
async function handleOpenFile(): Promise<void> {
  try {
    if (isFileSystemAccessSupported()) {
      const result = await openFileFromDisk();
      
      // Criar documento a partir do arquivo
      const newDoc = documentManager.createFromFile(
        result.name,
        result.content,
        result.handle
      );
      
      // Alternar para o novo documento
      state.currentId = newDoc.id;
      
      if (state.editor) {
        state.editor.dispatch({
          changes: { from: 0, to: state.editor.state.doc.length, insert: newDoc.content }
        });
      }
      
      renderList();
      renderPreview(newDoc.content);
      updateSaveStatus();
      
      Logger.success(`Arquivo aberto: ${result.name}`);
    } else {
      // Fallback para browsers sem suporte
      const result = await openFileFallback();
      
      // Criar documento sem handle (será salvo como local)
      const newDoc = documentManager.create(result.name);
      documentManager.setContent(newDoc.id, result.content);
      
      state.currentId = newDoc.id;
      
      if (state.editor) {
        state.editor.dispatch({
          changes: { from: 0, to: state.editor.state.doc.length, insert: result.content }
        });
      }
      
      renderList();
      renderPreview(result.content);
      updateSaveStatus();
      
      Logger.success(`Arquivo importado: ${result.name} (modo local)`);
      Logger.log('File System Access API nao suportada - salvo localmente', 'warning');
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'File selection cancelled') {
        Logger.log('Selecao de arquivo cancelada', 'info');
      } else {
        Logger.error(`Erro ao abrir arquivo: ${error.message}`);
      }
    }
  }
}

/**
 * Salva o documento atual no disco
 */
async function handleSaveToDisk(): Promise<void> {
  const doc = getCurrentDoc();
  if (!doc) {
    Logger.log('Nenhum documento para salvar', 'warning');
    return;
  }
  
  try {
    showSavingStatus();
    
    if (isFileSystemAccessSupported()) {
      const handle = await saveFileToDisk(doc.content, {
        suggestedName: doc.name,
        handle: doc.fileHandle
      });
      
      // Atualizar documento com novo handle (caso seja Save As)
      documentManager.setFileHandle(doc.id, handle);
      
      // Atualizar nome se mudou (Save As)
      if (handle.name !== doc.name) {
        documentManager.rename(doc.id, handle.name);
        renderList();
      }
      
      markDocumentSaved();
      Logger.success(`Salvo no disco: ${handle.name}`);
    } else {
      // Fallback: download tradicional
      downloadFileFallback(doc.content, doc.name);
      markDocumentSaved();
      Logger.success(`Download iniciado: ${doc.name}`);
    }
  } catch (error) {
    showSaveError();
    if (error instanceof Error) {
      if (error.message === 'Save cancelled') {
        Logger.log('Salvamento cancelado', 'info');
        updateSaveStatus(); // Restaurar status anterior
      } else {
        Logger.error(`Erro ao salvar: ${error.message}`);
      }
    }
  }
}

/**
 * Configura event listeners para operacoes de arquivo
 */
function setupFileSystemControls(): void {
  const openBtn = document.getElementById('open-file-btn');
  const saveDiskBtn = document.getElementById('save-disk-btn');
  
  if (openBtn) {
    openBtn.addEventListener('click', handleOpenFile);
  }
  
  if (saveDiskBtn) {
    saveDiskBtn.addEventListener('click', handleSaveToDisk);
  }
  
  // Atalhos de teclado
  document.addEventListener('keydown', (e: KeyboardEvent): void => {
    // Ctrl+O para abrir arquivo
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      handleOpenFile();
    }
    
    // Ctrl+Shift+S para salvar no disco (Save As)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      handleSaveToDisk();
    }
  });
  
  // Mostrar/esconder botoes baseado no suporte
  if (!isFileSystemAccessSupported()) {
    if (saveDiskBtn) {
      saveDiskBtn.title = 'Download arquivo (File System Access API nao suportada)';
    }
  }
  
  Logger.success('Controles de arquivo ativos');
}

/**
 * Configura event listeners dos controles do preview
 */
function setupPreviewControls(): void {
  // Dropdown de fonte
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
  
  // Botões de alinhamento
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
  
  // Dropdown de fonte para seleção (QUICK_TAGS)
  const tagFontSelect = document.getElementById('tag-font') as HTMLSelectElement;
  tagFontSelect?.addEventListener('change', (e) => {
    const font = (e.target as HTMLSelectElement).value;
    if (font) {
      insertFontTag(font);
      (e.target as HTMLSelectElement).selectedIndex = 0; // Reset para "Aa"
    }
  });
  
  Logger.success('Controles do preview ativados');
}

/**
 * Insere tag de fonte na seleção do editor
 */
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

/**
 * Escapa HTML para exibição segura
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Encontra issue na posição do cursor
 */
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

/**
 * Extension para hover tooltip de erros/avisos Markdown
 */
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

/**
 * Navega para a posição de uma issue no editor
 */
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

/**
 * Aplica correção automática de uma issue
 */
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
    // Append no final do documento
    from = content.length;
    to = content.length;
    insert = '\n' + issue.suggestion;
  } else if (issue.suggestionRange) {
    // Substituir linha inteira
    from = lineStart;
    to = lineEnd;
    insert = issue.suggestion;
  } else {
    // Substituir linha inteira (fallback)
    from = lineStart;
    to = lineEnd;
    insert = issue.suggestion;
  }
  
  state.editor.dispatch({
    changes: { from, to, insert }
  });
  
  Logger.success(`Correcao aplicada na linha ${issue.line}`);
}

/**
 * Renderiza o painel de problemas no sidebar
 */
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
    
    // Click para navegar (exceto no botão FIX)
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
    
    // Keyboard navigation
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigateToIssue(issue);
      }
    });
    
    panel.appendChild(item);
  });
}

/**
 * Insere uma tag Markdown na posição do cursor ou envolve o texto selecionado
 * 
 * @param tag - Tipo de tag a inserir
 */
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
      // Quebra de linha simples (Markdown: linha vazia)
      insert = '\n\n';
      cursorOffset = insert.length;
      break;
      
    case 'hr':
      // Linha horizontal / quebra de pagina
      insert = '\n---\n';
      cursorOffset = insert.length;
      break;
      
    case 'code':
      // Bloco de codigo
      if (hasSelection) {
        insert = '```\n' + selectedText + '\n```';
        cursorOffset = 4; // Posiciona apos ```\n
      } else {
        insert = '```\n\n```';
        cursorOffset = 4; // Posiciona dentro do bloco
      }
      break;
      
    case 'quote':
      // Blockquote
      if (hasSelection) {
        // Adicionar > no inicio de cada linha selecionada
        insert = selectedText.split('\n').map(line => '> ' + line).join('\n');
        cursorOffset = insert.length;
      } else {
        insert = '> ';
        cursorOffset = 2;
      }
      break;
      
    case 'heading':
      // Heading
      if (hasSelection) {
        insert = '# ' + selectedText;
        cursorOffset = insert.length;
      } else {
        insert = '# ';
        cursorOffset = 2;
      }
      break;
      
    case 'bold':
      // Negrito
      if (hasSelection) {
        insert = '**' + selectedText + '**';
        cursorOffset = insert.length;
      } else {
        insert = '**texto**';
        cursorOffset = 2; // Posiciona antes de "texto"
      }
      break;
      
    case 'italic':
      // Italico
      if (hasSelection) {
        insert = '*' + selectedText + '*';
        cursorOffset = insert.length;
      } else {
        insert = '*texto*';
        cursorOffset = 1; // Posiciona antes de "texto"
      }
      break;
      
    case 'list':
      // Lista
      if (hasSelection) {
        // Adicionar - no inicio de cada linha selecionada
        insert = selectedText.split('\n').map(line => '- ' + line).join('\n');
        cursorOffset = insert.length;
      } else {
        insert = '- ';
        cursorOffset = 2;
      }
      break;
      
    case 'link':
      // Link
      if (hasSelection) {
        insert = '[' + selectedText + '](url)';
        cursorOffset = insert.length - 4; // Posiciona em "url"
      } else {
        insert = '[texto](url)';
        cursorOffset = 1; // Posiciona antes de "texto"
      }
      break;
      
    case 'strike':
      // Tachado (strikethrough)
      if (hasSelection) {
        insert = '~~' + selectedText + '~~';
        cursorOffset = insert.length;
      } else {
        insert = '~~texto~~';
        cursorOffset = 2;
      }
      break;
      
    case 'numlist':
      // Lista numerada
      if (hasSelection) {
        insert = selectedText.split('\n').map((line, i) => `${i + 1}. ` + line).join('\n');
        cursorOffset = insert.length;
      } else {
        insert = '1. ';
        cursorOffset = 3;
      }
      break;
      
    case 'checkbox':
      // Checkbox / Tarefa
      if (hasSelection) {
        insert = selectedText.split('\n').map(line => '- [ ] ' + line).join('\n');
        cursorOffset = insert.length;
      } else {
        insert = '- [ ] ';
        cursorOffset = 6;
      }
      break;
      
    case 'table':
      // Tabela
      insert = '\n| Coluna 1 | Coluna 2 | Coluna 3 |\n|----------|----------|----------|\n| dado 1   | dado 2   | dado 3   |\n';
      cursorOffset = 3; // Posiciona em "Coluna 1"
      break;
      
    case 'mark-yellow':
      // Destaque amarelo (usando HTML inline que funciona em MD)
      if (hasSelection) {
        insert = '<mark style="background:#fef08a">' + selectedText + '</mark>';
        cursorOffset = insert.length;
      } else {
        insert = '<mark style="background:#fef08a">texto</mark>';
        cursorOffset = 32;
      }
      break;
      
    case 'mark-green':
      // Destaque verde
      if (hasSelection) {
        insert = '<mark style="background:#bbf7d0">' + selectedText + '</mark>';
        cursorOffset = insert.length;
      } else {
        insert = '<mark style="background:#bbf7d0">texto</mark>';
        cursorOffset = 32;
      }
      break;
      
    case 'mark-blue':
      // Destaque azul
      if (hasSelection) {
        insert = '<mark style="background:#bfdbfe">' + selectedText + '</mark>';
        cursorOffset = insert.length;
      } else {
        insert = '<mark style="background:#bfdbfe">texto</mark>';
        cursorOffset = 32;
      }
      break;
      
    case 'mark-red':
      // Destaque vermelho
      if (hasSelection) {
        insert = '<mark style="background:#fecaca">' + selectedText + '</mark>';
        cursorOffset = insert.length;
      } else {
        insert = '<mark style="background:#fecaca">texto</mark>';
        cursorOffset = 32;
      }
      break;
      
    case 'clear':
      // Remover tags HTML da selecao
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
      // Alinhamento por selecao
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
  
  // Aplicar a insercao/substituicao
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + cursorOffset }
  });
  
  view.focus();
  Logger.log(`Tag "${tag}" inserida`);
}

/**
 * Configura event listeners para os botoes de quick tags
 */
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

// Utility Functions

/**
 * Cria uma função debounced que atrasa execução até N ms após última chamada
 * 
 * @template T Tipo da função
 * @param {T} fn - Função a debounce
 * @param {number} delay - Delay em millisegundos
 * @returns {(...args: Parameters<T>) => void} Função debounced
 * 
 * @example
 *   const debouncedFn = debounce(() => console.log('hello'), 300)
 *   debouncedFn() // Não executa
 *   debouncedFn() // Não executa
 *   // Após 300ms: "hello" é impresso uma vez
 */
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

// Core Functions

/**
 * Inicializa o sistema completo
 * 
 * Carrega configuração offline, notificador de atualizações,
 * documentos salvos e inicia o editor com event listeners
 * 
 * @returns {void}
 */
function initSystem(): void {
  Logger.log('Inicializando núcleo...');
  Logger.success('✓ Markdown processor carregado (com sanitização DOMPurify)');
  Logger.success('✓ Estilos de impressão A4 ativos');

  // Inicializa gerenciamento offline
  OfflineManager.init();
  OfflineManager.loadSyncQueue();
  OfflineManager.onStatusChange((isOnline: boolean): void => {
    const msg = isOnline
      ? '✓ Conexão restaurada - Funcionamento online'
      : '⚠️ Sem conexão - Modo offline ativo';
    Logger.log(msg, isOnline ? 'success' : 'warning');
  });
  Logger.success('✓ Gerenciador offline ativo');

  // Inicializa notificador de updates
  SWUpdateNotifier.init();
  Logger.success('✓ Monitor de atualizações ativo');

  loadDocs();
  initEditor();
  setupEvents();
  setupQuickTags();
  setupPreviewControls();
  setupSaveControls();
  setupFileSystemControls();
  setupKeyboardNavigation();
  updateMetrics();
  updateSaveStatus();
  Logger.success('Sistema pronto.');
}

/**
 * Carrega documentos via DocumentManager
 * 
 * Inicializa DocumentManager, carrega docs do localStorage,
 * e inscreve no observable para atualizações.
 * 
 * @returns {void}
 */
function loadDocs(): void {
   // Inicializar DocumentManager
   documentManager.init()

  // Inscrever para mudanças
  documentManager.subscribe((docs) => {
    state.docs = docs
    renderList()
  })

  // Carregar docs iniciais
  state.docs = documentManager.getAll()
  if (state.docs.length > 0 && state.docs[0]) {
    state.currentId = state.docs[0].id
  }
  renderList()
}

/**
 * Salva documentos via DocumentManager
 * 
 * Atualiza conteúdo do documento ativo no DocumentManager.
 * DocumentManager cuida de persister em localStorage.
 * 
 * @returns {void}
 */
function saveDocs(): void {
  const doc = getCurrentDoc()
  if (!doc) return

  documentManager.setContent(doc.id, doc.content)
  updateMetrics()
}

/**
 * Aplica diagnostics (erros/avisos) ao editor CodeMirror
 * 
 * Valida Markdown e mostra erros como underlines vermelhas
 * e avisos como underlines amarelas no editor
 * 
 * @param content - Conteúdo Markdown a validar
 * @returns {void}
 */
function updateEditorDiagnostics(content: string): void {
  if (!state.editor) return;

  // Validar Markdown
  const validation = validateMarkdown(content);

  // Construir decorations para erros e avisos
  const decorationRanges: any[] = [];
  const lines = content.split('\n');

  // Processar erros e avisos
  const allIssues = [...validation.errors, ...validation.warnings];
  
  // Armazenar globalmente para tooltip e painel
  currentIssues = allIssues;
  
  allIssues.forEach((issue) => {
    const lineIndex = Math.min(issue.line - 1, lines.length - 1);
    const line = lines[lineIndex];
    
    if (!line) return;

     // Encontrar posição no documento completo
     let charIndex = 0;
     for (let i = 0; i < lineIndex; i++) {
       charIndex += (lines[i]?.length ?? 0) + 1; // +1 para newline
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
    } catch (e) {
      // Ignorar erros de decoration para uma range específica
    }
  });
  
  // Renderizar painel de problemas
  renderProblemsPanel(allIssues);

  // Log de erros/avisos para o console do sistema (apenas se houver novos)
  if (validation.errors.length > 0) {
    Logger.error(`${validation.errors.length} erro(s) de sintaxe Markdown`);
  }

  if (validation.warnings.length > 0) {
    Logger.log(`${validation.warnings.length} aviso(s) Markdown`, 'warning');
  }

  // Aplicar decorations ao editor via StateEffect
  try {
    const decorationSet = Decoration.set(decorationRanges);
    state.editor.dispatch({
      effects: [updateDecorationsEffect.of(decorationSet)]
    });
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    Logger.log(`⚠️ Validação visual: ${errorMsg}`, 'warning');
  }
}

/**
 * Inicializa o editor CodeMirror
 * 
 * Cria instância de EditorView com:
 * - Modo markdown com syntax highlighting
 * - Theme customizado (light mode)
 * - Line wrapping habilitado
 * - Listener para mudanças com debounce
 * - Validação de sintaxe Markdown
 * 
 * @returns {void}
 */
function initEditor(): void {
  const el = document.getElementById('editor');
  if (!el) {
    Logger.error('Elemento editor não encontrado!');
    return;
  }

  const doc = getCurrentDoc();

  // Debounce functions for performance optimization
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
        
        // Selection highlighting - cor azul vibrante
        '.cm-selectionBackground': { backgroundColor: '#3b82f6 !important' },
        '&.cm-focused .cm-selectionBackground': { backgroundColor: '#3b82f6 !important' },
        '.cm-selectionMatch': { backgroundColor: '#fef08a' },
        
        // Markdown specific syntax coloring
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

          // Marcar como modificado (dirty) imediatamente
          markDocumentDirty();

          // Update State (always persist immediately)
          const active = getCurrentDoc();
          if (active) {
            active.content = val;
            active.updated = Date.now();
            saveDocs();
            // Marcar como salvo após persistir
            markDocumentSaved();
          }

           // Validar sintaxe Markdown em tempo real (com debounce para performance)
           debouncedValidate(val);

          // Debounced Render (300ms delay)
          debouncedRender(val);

          // Debounced Metrics Update (500ms delay)
          debouncedUpdateMetrics();

          // Visual feedback
          flashStatus();

          // Update latency display
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
    // Carregar preferências do documento inicial
    if (state.currentId) {
      loadDocPreferences(state.currentId);
    }
  }
}

/**
 * Obtém o documento atualmente selecionado
 * 
 * @returns {Document | undefined} Documento ativo ou undefined se nenhum selecionado
 */
function getCurrentDoc(): AppDocument | undefined {
  return state.docs.find((d) => d.id === state.currentId);
}

/**
 * Renderiza o preview do markdown no elemento preview
 * 
 * Processa markdown para HTML com sanitização,
 * delega renderização para UIRenderer que cuida de imagens A4.
 * 
 * @param {string} md - Conteúdo markdown a renderizar
 * @returns {Promise<void>}
 */
async function renderPreview(md: string): Promise<void> {
  const preview = document.getElementById('preview')
  if (!preview) return

  // Processar markdown (sanitização ocorre aqui)
  const html = processMarkdown(md)

  // Renderizar via UIRenderer (que processa imagens)
  await uiRenderer.renderPreview(preview, html)

  // Estimar páginas para log
  const estimatedPages = estimatePageCount(html)
  Logger.log(`Renderizado em ~${estimatedPages} página(s) A4`, 'info')
}

/**
 * Renderiza a lista de documentos no sidebar
 * 
 * Delega para UIRenderer para renderização sem efeitos colaterais.
 * Atualiza input de nome do documento ativo.
 * 
 * @returns {void}
 */
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

  // Update input name
  const input = document.getElementById('doc-name') as HTMLInputElement | null
  const current = getCurrentDoc()
  if (input && current) {
    uiRenderer.setDocumentNameInput(input, current.name)
  }
}

/**
 * Alterna para um documento diferente
 * 
 * Carrega documento selecionado no editor, renderiza preview e lista.
 * 
 * @param {number} id - ID do documento a selecionar
 * @returns {void}
 */
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

/**
 * Cria um novo documento
 * 
 * Delega para DocumentManager que cuida de criação e persistência.
 * Atualiza editor e renderiza interface.
 * 
 * @returns {void}
 */
function createDoc(): void {
  Logger.log('Tentando criar novo documento...')
  try {
    const newDoc = documentManager.create()
    state.currentId = newDoc.id

    // Reset editor
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

/**
 * Deleta um documento
 * 
 * Delega para DocumentManager que cuida de lógica de deleção.
 * Alterna para primeiro documento se deletar o ativo.
 * 
 * @param {number} id - ID do documento a deletar
 * @returns {void}
 */
function deleteDoc(id: number): void {
  if (confirm('Confirmar exclusão?')) {
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

// UI Utilities

/**
 * Pisca o indicador de status
 * 
 * Delega para UIRenderer para renderização do flash.
 * 
 * @returns {void}
 */
function flashStatus(): void {
  const dot = document.getElementById('status-indicator')
  if (dot) {
    uiRenderer.flashIndicator(dot, 200)
  }
}

/**
 * Atualiza as métricas exibidas
 * 
 * Obtém tamanho total do DocumentManager e atualiza
 * elemento de exibição de memória (mem-usage).
 * 
 * @returns {void}
 */
function updateMetrics(): void {
  const size = documentManager.getSize()
  const el = document.getElementById('mem-usage')
  if (el) {
    uiRenderer.updateMemoryMetric(el, size)
  }
}

/**
 * Faz o download do arquivo markdown atual
 * 
 * Cria blob com conteúdo markdown e inicia download via link temporário.
 * Limpa URL após conclusão.
 * 
 * @returns {void}
 */
function downloadMarkdownFile(): void {
  try {
    const doc = getCurrentDoc();
    if (!doc) {
      Logger.error('Nenhum documento carregado');
      return;
    }

    // Criar blob com conteúdo MD
    const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);

     // Criar e disparar download
     const link = document.createElement('a');
     link.href = url;
     link.download = doc.name; // Já contém .md
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);

     // Limpar URL temporária
     URL.revokeObjectURL(url);

     Logger.success(`✓ Download: ${doc.name} (${(blob.size / 1024).toFixed(2)}KB)`);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    Logger.error('Erro ao fazer download: ' + errorMessage);
  }
}

/**
 * Configura todos os event listeners
 * 
 * Registra listeners para:
 * - Botão novo documento
 * - Botão download PDF
 * - Botão download Markdown
 * - Atalhos de teclado (Ctrl+Shift+P para preview de impressão)
 * - Input de nome de documento
 * 
 * @returns {void}
 */
function setupEvents(): void {
  // Create Button
  const btnNew = document.getElementById('new-doc-btn');
  if (btnNew) {
    btnNew.addEventListener('click', createDoc);
  } else {
    Logger.error('Botão Novo Doc não encontrado no DOM');
  }

  // Download com validação
  const btnDown = document.getElementById('download-btn');
  if (btnDown) {
    btnDown.addEventListener('click', async (): Promise<void> => {
      Logger.log('Validando conteúdo para impressão...');

      const preview = document.getElementById('preview');
      if (!preview) {
        Logger.error('Preview não encontrado');
        return;
      }

      // Validar conteúdo
      const validation = validatePrintContent(preview.innerHTML);

      // Mostrar avisos se houver
      if (validation.issues.length > 0) {
        validation.issues.forEach((issue): void => Logger.log(issue, 'warning'));
      }

      // Gerar relatório detalhado com PrintReporter
      const doc = getCurrentDoc();
      const reporter = createReporter(preview.innerHTML, doc?.name || 'document');
      const checklist = reporter.generateChecklist();

      // Mostrar checklist
      Logger.log('=== PRÉ-IMPRESSÃO ===', 'info');
      checklist.checks.forEach((check): void => Logger.log(check, 'success'));
      checklist.warnings.forEach((warn): void => Logger.log(warn, 'warning'));

      // Gerar relatório resumido
      const stats = reporter.analyze();
      Logger.log(
        `📄 ${stats.estimatedPages}pp | 📝 ${stats.words} palavras | ⏱️ ~${stats.readingTime}min`
      );

      // Iniciar impressão com printUtils melhorado
      Logger.log('Abrindo diálogo de impressão...');
      const success = await printDocument(doc?.name || 'document', (msg: string): void =>
        Logger.log(msg)
      );

      if (success) {
        Logger.success('✓ Impressão finalizada com sucesso');
      }
    });
  }

  // Download MD Button
  const btnDownloadMd = document.getElementById('download-md-btn');
  if (btnDownloadMd) {
    btnDownloadMd.addEventListener('click', downloadMarkdownFile);
  } else {
    Logger.error('Botão Download MD não encontrado no DOM');
  }

  // Atalhos de teclado globais
  document.addEventListener('keydown', (e: KeyboardEvent): void => {
    // Ctrl+Shift+P (ou Cmd+Shift+P no Mac) - Preview de impressão
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      togglePrintPreview();
      Logger.success(
        document.body.classList.contains('print-mode')
          ? '📋 Preview de Impressão Ativado (ESC para sair)'
          : '✓ Preview Desativado'
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
        renderList(); // Pode ser lento em cada tecla, mas mantém sync
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
          Logger.success('Conteúdo copiado para área de transferência');
          // Feedback visual
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
        Logger.log('Nenhum conteúdo para copiar', 'warning');
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

/**
 * Configura navegação por teclado (WCAG 2.1 AA)
 * 
 * Implementa atalhos:
 * - Ctrl+N: Novo documento
 * - Ctrl+Shift+E: Exportar PDF
 * - Escape: Limpar preview de impressão
 * - Keyboard focus management em lista de documentos
 * 
 * @returns {void}
 */
function setupKeyboardNavigation(): void {
  document.addEventListener('keydown', (e: KeyboardEvent): void => {
    // Ctrl+N (ou Cmd+N no Mac) - Novo documento
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      createDoc();
    }

    // Ctrl+Shift+E (ou Cmd+Shift+E no Mac) - Exportar PDF
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
        Logger.log('✓ Preview de Impressão desativado');
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

      // Arrow Down - Próximo item
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, items.length - 1);
        (items[nextIndex] as HTMLElement).click();
        (items[nextIndex] as HTMLElement).focus();
      }

      // Arrow Up - Item anterior
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        (items[prevIndex] as HTMLElement).click();
        (items[prevIndex] as HTMLElement).focus();
      }

      // Delete - Deletar documento (com confirmação)
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

      // Home - Primeiro item
      if (e.key === 'Home') {
        e.preventDefault();
        (items[0] as HTMLElement).click();
        (items[0] as HTMLElement).focus();
      }

      // End - Último item
      if (e.key === 'End') {
        e.preventDefault();
        const lastItem = items[items.length - 1];
        (lastItem as HTMLElement).click();
        (lastItem as HTMLElement).focus();
      }

      // Enter - Ativar documento (já faz click, mas reforçar para acessibilidade)
      if (e.key === 'Enter') {
        e.preventDefault();
        const target = e.target as HTMLElement;
        if (target.classList.contains('document-item')) {
          target.click();
        }
      }
    });

    // Fazer itens focáveis
    const items = documentsList.querySelectorAll('.document-item') as NodeListOf<HTMLElement>;
    items.forEach((item: HTMLElement, index: number): void => {
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });
  }

  // Focus na navegação do editor
  const editor = document.getElementById('editor') as HTMLElement | null;
  if (editor) {
    editor.addEventListener('keydown', (e: KeyboardEvent): void => {
      // Ctrl+Shift+I - Focus na lista de documentos (para retroceder)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        const firstDoc = documentsList?.querySelector('.document-item') as HTMLElement | null;
        if (firstDoc) {
          firstDoc.focus();
        }
      }
    });
  }

  Logger.success('✓ Navegação por teclado ativada');
  Logger.log('Atalhos: Ctrl+N=Novo | Ctrl+Shift+E=PDF | Arrow Keys=Navegar Docs');
}

// Boot
document.addEventListener('DOMContentLoaded', initSystem);

// PWA - Gerenciado automaticamente pelo Vite PWA
// O registerSW é injetado automaticamente pelo vite-plugin-pwa

// Exportar Logger globalmente
export { Logger };
