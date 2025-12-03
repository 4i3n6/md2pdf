import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import 'highlight.js/styles/github.css'
import { processMarkdown, estimatePageCount } from './processors/markdownProcessor'
import { printDocument, validatePrintContent, togglePrintPreview } from './utils/printUtils'
import { createReporter } from './utils/printReporter'
import OfflineManager from './utils/offlineManager'
import SWUpdateNotifier from './utils/swUpdateNotifier'
import { documentManager } from './services/documentManager'
import { uiRenderer } from './services/uiRenderer'
import type { AppState, LoggerInterface } from '@/types/index'
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
  updateMetrics();
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
  // Inicializar DocumentManager com Logger
  documentManager.logger = Logger as any
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
 * Inicializa o editor CodeMirror
 * 
 * Cria instância de EditorView com:
 * - Modo markdown com syntax highlighting
 * - Theme customizado (light mode)
 * - Line wrapping habilitado
 * - Listener para mudanças com debounce
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

          // Update State (always persist immediately)
          const active = getCurrentDoc();
          if (active) {
            active.content = val;
            active.updated = Date.now();
            saveDocs();
          }

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
  }
}

/**
 * Obtém o documento atualmente selecionado
 * 
 * @returns {Document | undefined} Documento ativo ou undefined se nenhum selecionado
 */
function getCurrentDoc(): Document | undefined {
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
