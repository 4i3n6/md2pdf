import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { marked } from 'marked';
import { processMarkdown, validateMarkdown, estimatePageCount, processImagesInPreview } from './processors/markdownProcessor.js';
import { printDocument, validatePrintContent, generatePrintReport } from './utils/printUtils.js';
import './styles.css'; // Importação do CSS para o Vite processar
import './styles-print.css'; // Estilos otimizados para impressão A4

// Logger do Sistema
const Logger = {
    log: (msg, type = 'info') => {
        const consoleEl = document.getElementById('console-log');
        if (!consoleEl) return;
        
        const time = new Date().toLocaleTimeString('pt-BR', { hour12: false });
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        line.textContent = `[${time}] ${msg}`;
        
        consoleEl.appendChild(line);
        consoleEl.scrollTop = consoleEl.scrollHeight;
    },
    error: (msg) => Logger.log(msg, 'error'),
    success: (msg) => Logger.log(msg, 'success')
};

// Nota: Configuração do marked movida para src/processors/markdownProcessor.js
// com renderer customizado e sanitização DOMPurify integrada

const state = {
    docs: [],
    currentId: null,
    editor: null
};

const defaultDoc = {
    id: 1,
    name: 'README.md',
    content: '# SISTEMA INICIADO\n\nPainel carregado com sucesso.\n\n- Editor Ativo\n- Renderizador Pronto\n- Memória OK',
    updated: Date.now()
};

// Core Functions
function initSystem() {
     Logger.log('Inicializando núcleo...');
     Logger.success('✓ Markdown processor carregado (com sanitização DOMPurify)');
     Logger.success('✓ Estilos de impressão A4 ativos');
     loadDocs();
     initEditor();
     setupEvents();
     updateMetrics();
     Logger.success('Sistema pronto.');
 }

function loadDocs() {
    try {
        const raw = localStorage.getItem('md2pdf-docs-v2');
        if (raw) {
            state.docs = JSON.parse(raw);
            Logger.log(`Carregado ${state.docs.length} documentos do armazenamento local.`);
        } else {
            state.docs = [defaultDoc];
            Logger.log('Nenhum dado encontrado. Criando documento padrão.');
        }
        
        if (state.docs.length > 0) {
            state.currentId = state.docs[0].id;
        }
        renderList();
    } catch (e) {
        Logger.error('Falha crítica no armazenamento: ' + e.message);
    }
}

function saveDocs() {
    try {
        localStorage.setItem('md2pdf-docs-v2', JSON.stringify(state.docs));
        updateMetrics();
    } catch (e) {
        Logger.error('Erro ao salvar: ' + e.message);
    }
}

function initEditor() {
    const el = document.getElementById('editor');
    if (!el) return Logger.error('Elemento editor não encontrado!');

    const doc = getCurrentDoc();
    
    state.editor = new EditorView({
        doc: doc ? doc.content : '',
        extensions: [
            basicSetup,
            markdown(),
            EditorView.lineWrapping,
            EditorView.theme({
                "&": { color: "#111827", backgroundColor: "#ffffff" },
                ".cm-content": { caretColor: "#2563eb" },
                ".cm-gutters": { backgroundColor: "#f3f4f6", color: "#6b7280", borderRight: "1px solid #d1d5db" },
                ".cm-activeLine": { backgroundColor: "#eff6ff" },
                ".cm-activeLineGutter": { color: "#2563eb", backgroundColor: "#eff6ff" }
            }),
            EditorView.updateListener.of((u) => {
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
                    document.getElementById('render-latency').innerText = (end - start).toFixed(1) + 'ms';
                    flashStatus();
                }
            })
        ],
        parent: el
    });
    
    if (doc) renderPreview(doc.content);
}

function getCurrentDoc() {
    return state.docs.find(d => d.id === state.currentId);
}

async function renderPreview(md) {
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

function renderList() {
    const list = document.getElementById('documents-list');
    if (!list) return;
    list.innerHTML = '';

    state.docs.forEach(doc => {
        const item = document.createElement('div');
        item.className = `document-item ${doc.id === state.currentId ? 'active' : ''}`;
        
        const name = document.createElement('span');
        name.textContent = doc.name;
        
        const del = document.createElement('span');
        del.textContent = '[x]';
        del.style.fontSize = '9px';
        del.onclick = (e) => { e.stopPropagation(); deleteDoc(doc.id); };

        item.appendChild(name);
        item.appendChild(del);
        
        item.onclick = () => switchDoc(doc.id);
        list.appendChild(item);
    });
    
    // Update input name
    const input = document.getElementById('doc-name');
    const current = getCurrentDoc();
    if (input && current) input.value = current.name;
}

function switchDoc(id) {
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

function createDoc() {
    Logger.log('Tentando criar novo documento...');
    try {
        const newDoc = {
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
        Logger.error('Falha ao criar documento: ' + e.message);
    }
}

function deleteDoc(id) {
    if (state.docs.length <= 1) return Logger.error('Bloqueado: Mínimo 1 documento requerido.');
    
    if (confirm('Confirmar exclusão?')) {
        state.docs = state.docs.filter(d => d.id !== id);
        if (state.currentId === id) {
            state.currentId = state.docs[0].id;
            switchDoc(state.currentId);
        }
        saveDocs();
        renderList();
        Logger.log(`Documento ${id} removido.`);
    }
}

// UI Utilities
function flashStatus() {
    const dot = document.getElementById('status-indicator');
    if (dot) {
        dot.classList.add('active');
        setTimeout(() => dot.classList.remove('active'), 200);
    }
}

function updateMetrics() {
    // Simula uso de memória baseado no tamanho do texto
    const size = JSON.stringify(state.docs).length;
    const kb = (size / 1024).toFixed(2);
    const el = document.getElementById('mem-usage');
    if (el) el.innerText = `${kb}KB`;
}

function setupEvents() {
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
        btnDown.addEventListener('click', async () => {
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
                validation.issues.forEach(issue => Logger.log(issue, 'warning'));
            }

            // Gerar relatório
            const doc = getCurrentDoc();
            const report = generatePrintReport(doc?.name || 'document', preview.innerHTML);
            Logger.log(report, 'info');

            // Iniciar impressão com printUtils melhorado
            Logger.log('Abrindo diálogo de impressão...');
            const success = await printDocument(doc?.name || 'document', (msg) => Logger.log(msg));
            
            if (success) {
                Logger.success('Impressão finalizada');
            }
        });
    }

    // Name Input
    const inputName = document.getElementById('doc-name');
    if (inputName) {
        inputName.addEventListener('input', (e) => {
            const doc = getCurrentDoc();
            if (doc) {
                doc.name = e.target.value;
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
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
            () => Logger.success('Service Worker registrado.'),
            (err) => Logger.error('SW Falhou: ' + err)
        );
    });
}