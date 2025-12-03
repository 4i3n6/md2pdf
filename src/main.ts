import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import 'highlight.js/styles/github.css';
import {
  processMarkdown,
  estimatePageCount,
  processImagesInPreview
} from './processors/markdownProcessor';
import {
  printDocument,
  validatePrintContent,
  togglePrintPreview
} from './utils/printUtils';
import { createReporter } from './utils/printReporter';
import OfflineManager from './utils/offlineManager';
import SWUpdateNotifier from './utils/swUpdateNotifier';
import type { Document, AppState, LoggerInterface } from '@/types/index';
import './styles.css';
import './styles-print.css';

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

// Estado da aplicação
const state: AppState = {
  docs: [],
  currentId: null,
  editor: null
};

// Documento padrão
const defaultDoc: Document = {
  id: 1,
  name: 'README.md',
  content: '# SISTEMA INICIADO\n\nPainel carregado com sucesso.\n\n- Editor Ativo\n- Renderizador Pronto\n- Memória OK',
  updated: Date.now()
};

// Core Functions

/**
 * Inicializa o sistema completo
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
  updateMetrics();
  Logger.success('Sistema pronto.');
}

/**
 * Carrega documentos do localStorage
 */
function loadDocs(): void {
  try {
    const raw = localStorage.getItem('md2pdf-docs-v2');
    if (raw) {
      state.docs = JSON.parse(raw);
      Logger.log(`Carregado ${state.docs.length} documentos do armazenamento local.`);
    } else {
      state.docs = [defaultDoc];
      Logger.log('Nenhum dado encontrado. Criando documento padrão.');
    }

    if (state.docs.length > 0 && state.docs[0]) {
      state.currentId = state.docs[0].id;
    }
    renderList();
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    Logger.error('Falha crítica no armazenamento: ' + errorMessage);
  }
}

/**
 * Salva documentos no localStorage
 */
function saveDocs(): void {
  try {
    localStorage.setItem('md2pdf-docs-v2', JSON.stringify(state.docs));
    updateMetrics();
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    Logger.error('Erro ao salvar: ' + errorMessage);
  }
}

/**
 * Inicializa o editor CodeMirror
 */
function initEditor(): void {
  const el = document.getElementById('editor');
  if (!el) {
    Logger.error('Elemento editor não encontrado!');
    return;
  }

  const doc = getCurrentDoc();

  state.editor = new EditorView({
    doc: doc ? doc.content : '',
    extensions: [
      basicSetup,
      markdown(),
      EditorView.lineWrapping,
      EditorView.theme({
        '&': { color: '#111827', backgroundColor: '#ffffff' },
        '.cm-content': { caretColor: '#2563eb' },
        '.cm-gutters': {
          backgroundColor: '#f3f4f6',
          color: '#6b7280',
          borderRight: '1px solid #d1d5db'
        },
        '.cm-activeLine': { backgroundColor: '#eff6ff' },
        '.cm-activeLineGutter': { color: '#2563eb', backgroundColor: '#eff6ff' }
      }),
      EditorView.updateListener.of((u): void => {
        if (u.docChanged) {
          const start = performance.now();
          const val = u.state.doc.toString();

          // Update State
          const active = getCurrentDoc();
          if (active) {
            active.content = val;
            active.updated = Date.now();
            saveDocs();
          }

          // Render
          renderPreview(val);

          const end = performance.now();
          const renderLatencyEl = document.getElementById('render-latency');
          if (renderLatencyEl) {
            renderLatencyEl.innerText = (end - start).toFixed(1) + 'ms';
          }
          flashStatus();
        }
      })
    ],
    parent: el
  });

  if (doc) {
    renderPreview(doc.content);
  }
}

/**
 * Obtém o documento atualmente selecionado
 */
function getCurrentDoc(): Document | undefined {
  return state.docs.find((d) => d.id === state.currentId);
}

/**
 * Renderiza o preview do markdown no elemento preview
 */
async function renderPreview(md: string): Promise<void> {
  const preview = document.getElementById('preview');
  if (!preview) return;

  // Usar processador customizado com sanitização
  const html = processMarkdown(md);
  preview.innerHTML = html;

  // Processar imagens para redimensionamento A4 (com cache localStorage)
  const imagesProcessed = await processImagesInPreview(preview, true);
  if (imagesProcessed > 0) {
    Logger.log(`✓ ${imagesProcessed} imagem(ns) otimizada(s) para A4`, 'success');
  }

  // Estimar páginas para log
  const estimatedPages = estimatePageCount(html);
  Logger.log(`Renderizado em ~${estimatedPages} página(s) A4`, 'info');
}

/**
 * Renderiza a lista de documentos no sidebar
 */
function renderList(): void {
  const list = document.getElementById('documents-list');
  if (!list) return;
  list.innerHTML = '';

  state.docs.forEach((doc: Document): void => {
    const item = document.createElement('div');
    item.className = `document-item ${doc.id === state.currentId ? 'active' : ''}`;

    const name = document.createElement('span');
    name.textContent = doc.name;

    const del = document.createElement('span');
    del.textContent = '[x]';
    del.style.fontSize = '9px';
    del.onclick = (e: MouseEvent): void => {
      e.stopPropagation();
      deleteDoc(doc.id);
    };

    item.appendChild(name);
    item.appendChild(del);

    item.onclick = (): void => switchDoc(doc.id);
    list.appendChild(item);
  });

  // Update input name
  const input = document.getElementById('doc-name') as HTMLInputElement | null;
  const current = getCurrentDoc();
  if (input && current) {
    input.value = current.name;
  }
}

/**
 * Alterna para um documento diferente
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
    Logger.log(`Alternado para doc ID: ${id}`);
  }
}

/**
 * Cria um novo documento
 */
function createDoc(): void {
  Logger.log('Tentando criar novo documento...');
  try {
    const newDoc: Document = {
      id: Date.now(),
      name: `UNTITLED_${Math.floor(Math.random() * 1000)}`,
      content: '',
      updated: Date.now()
    };
    state.docs.unshift(newDoc);
    state.currentId = newDoc.id;
    saveDocs();

    // Reset editor
    if (state.editor) {
      state.editor.dispatch({
        changes: { from: 0, to: state.editor.state.doc.length, insert: '' }
      });
    }
    renderList();
    renderPreview('');
    Logger.success(`Documento criado [ID: ${newDoc.id}]`);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    Logger.error('Falha ao criar documento: ' + errorMessage);
  }
}

/**
 * Deleta um documento
 */
function deleteDoc(id: number): void {
  if (state.docs.length <= 1) {
    Logger.error('Bloqueado: Mínimo 1 documento requerido.');
    return;
  }

  if (confirm('Confirmar exclusão?')) {
    state.docs = state.docs.filter((d) => d.id !== id);
    if (state.currentId === id) {
      const firstDoc = state.docs[0];
      if (firstDoc) {
        state.currentId = firstDoc.id;
        switchDoc(state.currentId);
      }
    }
    saveDocs();
    renderList();
    Logger.log(`Documento ${id} removido.`);
  }
}

// UI Utilities

/**
 * Pisca o indicador de status
 */
function flashStatus(): void {
  const dot = document.getElementById('status-indicator');
  if (dot) {
    dot.classList.add('active');
    setTimeout(() => dot.classList.remove('active'), 200);
  }
}

/**
 * Atualiza as métricas exibidas
 */
function updateMetrics(): void {
  // Simula uso de memória baseado no tamanho do texto
  const size = JSON.stringify(state.docs).length;
  const kb = (size / 1024).toFixed(2);
  const el = document.getElementById('mem-usage');
  if (el) {
    el.innerText = `${kb}KB`;
  }
}

/**
 * Faz o download do arquivo markdown atual
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
    link.download = `${doc.name}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Limpar URL temporária
    URL.revokeObjectURL(url);

    Logger.success(`✓ Download: ${doc.name}.md (${(blob.size / 1024).toFixed(2)}KB)`);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    Logger.error('Erro ao fazer download: ' + errorMessage);
  }
}

/**
 * Configura todos os event listeners
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
}

// Boot
document.addEventListener('DOMContentLoaded', initSystem);

// PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', (): void => {
    navigator.serviceWorker.register('/sw.js').then(
      (): void => {
        Logger.success('Service Worker registrado.');
      },
      (err: unknown): void => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        Logger.error('SW Falhou: ' + errorMessage);
      }
    );
  });
}

// Exportar Logger globalmente
export { Logger };
