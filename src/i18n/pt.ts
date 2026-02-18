/**
 * Portuguese (PT-BR) translations
 * MD2PDF - Transforme Markdown em PDFs Bonitos
 */

import type { Translations } from './en'

export const pt: Translations = {
  // Language metadata
  lang: 'pt',
  locale: 'pt-BR',
  dir: 'ltr',

  // App Header
  header: {
    brand: 'MD2PDF',
    version: 'v1.1.64',
    manualLink: 'Manual',
    manualTitle: 'Abrir manual de uso',
  },

  // Top Metrics
  metrics: {
    memory: 'MEM',
    latency: 'LATÊNCIA',
    systemOnline: 'SISTEMA: ONLINE',
    systemOffline: 'SISTEMA: OFFLINE',
  },

  // Sidebar
  sidebar: {
    docIndex: 'DOC_INDEX',
    actions: 'AÇÕES',
    quickTags: 'TAGS_RÁPIDAS',
    problems: 'PROBLEMAS',
    sysLogs: 'LOGS_SISTEMA',
  },

  // Action Buttons
  actions: {
    newDoc: 'Novo documento',
    newDocTitle: 'Criar novo documento (Ctrl+N)',
    importMd: 'IMPORTAR MD',
    importMdTitle: 'Importar arquivo .md do computador',
    exportMd: 'EXPORTAR MD',
    exportMdTitle: 'Exportar documento como arquivo .md',
    exportPdf: '[ EXP_PDF ]',
    exportPdfTitle: 'Exportar documento como PDF (Ctrl+Shift+E)',
  },

  // Quick Tags
  tags: {
    clear: 'CLR',
    clearTitle: 'Remover tags HTML da seleção',
    lineBreak: 'Quebra de linha',
    horizontalRule: 'Linha horizontal / Quebra de página',
    codeBlock: 'Bloco de código',
    quote: 'Citação (blockquote)',
    heading: 'Título (heading)',
    bold: 'Negrito',
    italic: 'Itálico',
    strikethrough: 'Tachado (riscado)',
    list: 'Lista',
    numberedList: 'Lista numerada',
    checkbox: 'Checkbox / Tarefa',
    link: 'Link',
    table: 'Tabela',
    highlightYellow: 'Destaque amarelo',
    highlightGreen: 'Destaque verde',
    highlightBlue: 'Destaque azul',
    highlightRed: 'Destaque vermelho',
    fontSelect: 'Aplicar fonte na seleção',
    alignLeft: 'Alinhar à esquerda',
    alignCenter: 'Centralizar',
    alignRight: 'Alinhar à direita',
    alignJustify: 'Justificar',
  },

  // Editor
  editor: {
    inputStream: 'ENTRADA',
    docNameLabel: 'Nome do documento',
    docNamePlaceholder: 'Sem título',
  },

  // Preview
  preview: {
    renderOutput: 'SAÍDA',
    fontLabel: 'Fonte do documento',
    fontSizeLabel: 'Tamanho da fonte',
    alignLabel: 'Alinhamento do texto',
    mermaidLoading: 'Carregando diagrama...',
    mermaidAriaLabel: 'Diagrama Mermaid',
    mermaidErrorLabel: 'Erro no diagrama:',
    mermaidDecodeError: 'Não foi possível decodificar a fonte do Mermaid.'
  },

  // Save Status
  save: {
    saved: 'Salvo',
    savedNow: 'Salvo agora',
    savedAgo: 'Salvo há {time}',
    saving: 'Salvando...',
    notSaved: 'Não salvo',
    error: 'Erro ao salvar',
    forceSave: 'Forçar salvamento',
    forceSaveTitle: 'Forçar salvamento (Ctrl+S)',
  },

  // Copy Button
  copy: {
    button: 'COPIAR',
    title: 'Copiar conteúdo Markdown (Ctrl+Shift+C)',
    success: 'Copiado!',
  },

  // Problems Panel
  problems: {
    title: 'PROBLEMAS',
    empty: 'Nenhum problema detectado',
    line: 'Ln',
    fix: '[CORRIGIR]',
    fixTitle: 'Aplicar correção',
  },

  // Document List
  documents: {
    deleteTitle: 'Clique para deletar (ou pressione Delete)',
    openTitle: 'Clique para abrir {name} (Delete para remover)',
    deleteConfirm: 'Confirmar exclusão?',
    deleteConfirmNamed: 'Tem certeza que deseja deletar "{name}"?',
  },

  // Time formatting
  time: {
    seconds: '{n}s',
    minutes: '{n}min',
    hours: '{n}h',
    never: 'Nunca salvo',
  },

  // Log Messages
  logs: {
    // System
    initStarted: 'SEQUÊNCIA DE INICIALIZAÇÃO...',
    initCore: 'Inicializando núcleo...',
    systemReady: 'Sistema pronto.',
    
    // Processors
    markdownLoaded: 'Processador Markdown carregado',
    printStylesActive: 'Estilos de impressão A4 ativos',
    offlineManagerActive: 'Gerenciador offline ativo',
    updateMonitorActive: 'Monitor de atualizações ativo',
    saveControlsActive: 'Controles de salvamento ativos',
    previewControlsActive: 'Controles do preview ativados',
    quickTagsActive: 'Tags Rápidas ativadas',
    keyboardNavActive: 'Navegação por teclado ativada',
    
    // Shortcuts info
    shortcutsInfo: 'Atalhos: Ctrl+N=Novo | Ctrl+Shift+E=PDF | Setas=Navegar Docs',
    
    // Connection
    connectionRestored: 'Conexão restaurada',
    offlineMode: 'Sem conexão - Modo offline ativo',
    
    // Documents
    docCreated: 'Documento criado [ID: {id}]',
    docRemoved: 'Documento {id} removido.',
    docSwitched: 'Alternado para doc ID: {id}',
    docSaved: 'Documento salvo',
    docsLoaded: 'Carregados {count} documentos',
    
    // Files
    fileImported: 'Arquivo importado: {name}',
    fileExported: 'Download: {name} ({size}KB)',
    noFileSelected: 'Nenhum arquivo selecionado',
    
    // Validation
    syntaxErrors: '{count} erro(s) de sintaxe Markdown',
    syntaxWarnings: '{count} aviso(s) Markdown',
    navigatedTo: 'Navegado para linha {line}, coluna {col}',
    fixApplied: 'Correção aplicada na linha {line}',
    
    // Preview
    rendered: 'Renderizado em ~{pages} página(s) A4',
    imagesOptimized: '{count} imagem(ns) otimizada(s) para A4',
    
    // Tags
    tagInserted: 'Tag "{tag}" inserida',
    fontApplied: 'Fonte aplicada na seleção',
    htmlTagsRemoved: 'Tags HTML removidas da seleção',
    selectTextForFont: 'Selecione um texto para aplicar a fonte',
    selectTextForAlign: 'Selecione um texto para alinhar',
    selectTextForTags: 'Selecione um texto para remover tags',
    
    // Print
    validatingPrint: 'Validando conteúdo para impressão...',
    previewNotFound: 'Preview não encontrado',
    prePrint: '=== PRÉ-IMPRESSÃO ===',
    printStats: '{pages}pp | {words} palavras | ~{time}min',
    openingPrintDialog: 'Abrindo diálogo de impressão...',
    printSuccess: 'Impressão finalizada com sucesso',
    printPreviewOn: 'Preview de Impressão Ativado (ESC para sair)',
    printPreviewOff: 'Preview de Impressão desativado',
    
    // Copy
    copiedToClipboard: 'Conteúdo copiado para área de transferência',
    copyFailed: 'Falha ao copiar: {error}',
    nothingToCopy: 'Nenhum conteúdo para copiar',
    
    // Errors
    errorCreatingDoc: 'Falha ao criar documento: {error}',
    errorSaving: 'Erro ao salvar: {error}',
    errorImporting: 'Erro ao importar arquivo: {error}',
    errorExporting: 'Erro ao fazer download: {error}',
    editorNotFound: 'Elemento editor não encontrado!',
    noDocToSave: 'Nenhum documento para salvar',
    noDocLoaded: 'Nenhum documento carregado',
    minOneDoc: 'Bloqueado: Mínimo 1 documento requerido.',
    docNotFound: 'Documento {id} não encontrado',
    
    // Font/Align
    docFont: 'Fonte do documento: {font}',
    alignment: 'Alinhamento: {align}',
    
    // Creating
    creatingDoc: 'Criando novo documento...',
  },

  // Validation Messages
  validation: {
    headingLevel: 'Markdown suporta no máximo 6 níveis de heading (encontrado: {level})',
    headingSpace: 'Heading deve ter espaço após "#"',
    emptyLink: 'Link vazio: []() - adicione texto e URL',
    emptyLinkText: 'Link sem texto: [](url)',
    emptyLinkUrl: 'Link sem URL: [text]()',
    linkProtocol: 'URL deveria começar com http:, https:, #, / ou mailto:',
    missingImageAlt: 'Imagem deveria ter texto alternativo (alt text)',
    emptyImageSrc: 'Imagem não pode ter src vazia: ![alt]()',
    unbalancedBackticks: 'Número ímpar de backticks (`) - código inline desbalanceado',
    unbalancedEmphasis: 'Número ímpar de * (asteriscos) - italic/bold desbalanceado',
    blockquoteSpace: 'Blockquote deveria ter espaço após ">"',
    unclosedCodeBlock: 'Bloco de código não fechado - faltam 3 backticks (```)',
    unknownLanguage: 'Linguagem desconhecida: "{lang}" (pode não fazer highlighting)',
    invalidTable: 'Tabela deveria ter no mínimo 2 colunas',
  },

  // Accessibility
  a11y: {
    skipToMain: 'Ir para editor principal',
    docListHelp: 'Use setas para cima/baixo para navegar documentos. Enter para abrir, Delete para remover. Ctrl+N para novo.',
    appLabel: 'MD2PDF - Aplicação de Conversão de Markdown para PDF',
    topBarLabel: 'Status do sistema em tempo real',
    sidebarLabel: 'Painel lateral de documentos e controles',
    docListLabel: 'Lista de documentos',
    workspaceLabel: 'Espaço de trabalho - Editor e Visualização',
    editorLabel: 'Editor de Markdown',
    previewLabel: 'Visualização de saída em A4',
    problemsLabel: 'Lista de problemas de sintaxe',
    logsLabel: 'Log de sistema',
    insertMarkdown: 'Inserir elementos Markdown',
    renderStatus: 'Indicador de status de renderização',
    saveStatus: 'Status de salvamento',
  },
}
