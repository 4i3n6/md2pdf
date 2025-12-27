/**
 * English (EN-US) translations
 * MD2PDF - Transform Markdown into Beautiful PDFs
 */

export const en = {
  // Language metadata
  lang: 'en',
  locale: 'en-US',
  dir: 'ltr',

  // App Header
  header: {
    brand: 'MD2PDF',
    version: 'v1.1.18',
    manualLink: 'Manual',
    manualTitle: 'Open user manual',
  },

  // Top Metrics
  metrics: {
    memory: 'MEM',
    latency: 'LATENCY',
    systemOnline: 'SYSTEM: ONLINE',
    systemOffline: 'SYSTEM: OFFLINE',
  },

  // Sidebar
  sidebar: {
    docIndex: 'DOC_INDEX',
    actions: 'ACTIONS',
    quickTags: 'QUICK_TAGS',
    problems: 'PROBLEMS',
    sysLogs: 'SYS_LOGS',
  },

  // Action Buttons
  actions: {
    newDoc: 'New document',
    newDocTitle: 'Create new document (Ctrl+N)',
    importMd: 'IMPORT MD',
    importMdTitle: 'Import .md file from computer',
    exportMd: 'EXPORT MD',
    exportMdTitle: 'Export document as .md file',
    exportPdf: '[ EXP_PDF ]',
    exportPdfTitle: 'Export document as PDF (Ctrl+Shift+E)',
  },

  // Quick Tags
  tags: {
    clear: 'CLR',
    clearTitle: 'Remove HTML tags from selection',
    lineBreak: 'Line break',
    horizontalRule: 'Horizontal rule / Page break',
    codeBlock: 'Code block',
    quote: 'Blockquote',
    heading: 'Heading',
    bold: 'Bold',
    italic: 'Italic',
    strikethrough: 'Strikethrough',
    list: 'List',
    numberedList: 'Numbered list',
    checkbox: 'Checkbox / Task',
    link: 'Link',
    table: 'Table',
    highlightYellow: 'Yellow highlight',
    highlightGreen: 'Green highlight',
    highlightBlue: 'Blue highlight',
    highlightRed: 'Red highlight',
    fontSelect: 'Apply font to selection',
    alignLeft: 'Align left',
    alignCenter: 'Center',
    alignRight: 'Align right',
    alignJustify: 'Justify',
  },

  // Editor
  editor: {
    inputStream: 'INPUT_STREAM',
    docNameLabel: 'Document name',
    docNamePlaceholder: 'Untitled',
  },

  // Preview
  preview: {
    renderOutput: 'RENDER_OUTPUT',
    fontLabel: 'Document font',
    alignLabel: 'Text alignment',
  },

  // Save Status
  save: {
    saved: 'Saved',
    savedNow: 'Saved now',
    savedAgo: 'Saved {time} ago',
    saving: 'Saving...',
    notSaved: 'Not saved',
    error: 'Save error',
    forceSave: 'Force save',
    forceSaveTitle: 'Force save (Ctrl+S)',
  },

  // Copy Button
  copy: {
    button: 'COPY',
    title: 'Copy Markdown content (Ctrl+Shift+C)',
    success: 'Copied!',
  },

  // Problems Panel
  problems: {
    title: 'PROBLEMS',
    empty: 'No problems detected',
    line: 'Ln',
    fix: '[FIX]',
    fixTitle: 'Apply fix',
  },

  // Document List
  documents: {
    deleteTitle: 'Click to delete (or press Delete)',
    openTitle: 'Click to open {name} (Delete to remove)',
    deleteConfirm: 'Confirm deletion?',
    deleteConfirmNamed: 'Are you sure you want to delete "{name}"?',
  },

  // Time formatting
  time: {
    seconds: '{n}s',
    minutes: '{n}min',
    hours: '{n}h',
    never: 'Never saved',
  },

  // Log Messages
  logs: {
    // System
    initStarted: 'INIT SEQUENCE STARTED...',
    initCore: 'Initializing core...',
    systemReady: 'System ready.',
    
    // Processors
    markdownLoaded: 'Markdown processor loaded',
    printStylesActive: 'A4 print styles active',
    offlineManagerActive: 'Offline manager active',
    updateMonitorActive: 'Update monitor active',
    saveControlsActive: 'Save controls active',
    previewControlsActive: 'Preview controls active',
    quickTagsActive: 'Quick Tags active',
    keyboardNavActive: 'Keyboard navigation active',
    
    // Shortcuts info
    shortcutsInfo: 'Shortcuts: Ctrl+N=New | Ctrl+Shift+E=PDF | Arrow Keys=Navigate Docs',
    
    // Connection
    connectionRestored: 'Connection restored',
    offlineMode: 'No connection - Offline mode active',
    
    // Documents
    docCreated: 'Document created [ID: {id}]',
    docRemoved: 'Document {id} removed.',
    docSwitched: 'Switched to doc ID: {id}',
    docSaved: 'Document saved',
    docsLoaded: 'Loaded {count} documents',
    
    // Files
    fileImported: 'File imported: {name}',
    fileExported: 'Download: {name} ({size}KB)',
    noFileSelected: 'No file selected',
    
    // Validation
    syntaxErrors: '{count} Markdown syntax error(s)',
    syntaxWarnings: '{count} Markdown warning(s)',
    navigatedTo: 'Navigated to line {line}, column {col}',
    fixApplied: 'Fix applied on line {line}',
    
    // Preview
    rendered: 'Rendered in ~{pages} A4 page(s)',
    imagesOptimized: '{count} image(s) optimized for A4',
    
    // Tags
    tagInserted: 'Tag "{tag}" inserted',
    fontApplied: 'Font applied to selection',
    htmlTagsRemoved: 'HTML tags removed from selection',
    selectTextForFont: 'Select text to apply font',
    selectTextForAlign: 'Select text to align',
    selectTextForTags: 'Select text to remove tags',
    
    // Print
    validatingPrint: 'Validating content for print...',
    previewNotFound: 'Preview not found',
    prePrint: '=== PRE-PRINT ===',
    printStats: '{pages}pp | {words} words | ~{time}min',
    openingPrintDialog: 'Opening print dialog...',
    printSuccess: 'Print completed successfully',
    printPreviewOn: 'Print Preview Activated (ESC to exit)',
    printPreviewOff: 'Print Preview deactivated',
    
    // Copy
    copiedToClipboard: 'Content copied to clipboard',
    copyFailed: 'Copy failed: {error}',
    nothingToCopy: 'No content to copy',
    
    // Errors
    errorCreatingDoc: 'Failed to create document: {error}',
    errorSaving: 'Error saving: {error}',
    errorImporting: 'Error importing file: {error}',
    errorExporting: 'Error downloading: {error}',
    editorNotFound: 'Editor element not found!',
    noDocToSave: 'No document to save',
    noDocLoaded: 'No document loaded',
    minOneDoc: 'Blocked: Minimum 1 document required.',
    docNotFound: 'Document {id} not found',
    
    // Font/Align
    docFont: 'Document font: {font}',
    alignment: 'Alignment: {align}',
    
    // Creating
    creatingDoc: 'Creating new document...',
  },

  // Validation Messages
  validation: {
    headingLevel: 'Markdown supports max 6 heading levels (found: {level})',
    headingSpace: 'Heading should have space after "#"',
    emptyLink: 'Empty link: []() - add text and URL',
    emptyLinkText: 'Link without text: [](url)',
    emptyLinkUrl: 'Link without URL: [text]()',
    linkProtocol: 'URL should start with http:, https:, #, / or mailto:',
    missingImageAlt: 'Image should have alt text',
    emptyImageSrc: 'Image cannot have empty src: ![alt]()',
    unbalancedBackticks: 'Odd number of backticks (`) - unbalanced inline code',
    unbalancedEmphasis: 'Odd number of * (asterisks) - unbalanced italic/bold',
    blockquoteSpace: 'Blockquote should have space after ">"',
    unclosedCodeBlock: 'Unclosed code block - missing 3 backticks (```)',
    unknownLanguage: 'Unknown language: "{lang}" (may not highlight)',
    invalidTable: 'Table should have at least 2 columns',
  },

  // Accessibility
  a11y: {
    skipToMain: 'Skip to main editor',
    docListHelp: 'Use up/down arrows to navigate documents. Enter to open, Delete to remove. Ctrl+N for new.',
    appLabel: 'MD2PDF - Markdown to PDF Conversion Application',
    topBarLabel: 'System real-time status',
    sidebarLabel: 'Side panel for documents and controls',
    docListLabel: 'Document list',
    workspaceLabel: 'Workspace - Editor and Preview',
    editorLabel: 'Markdown Editor',
    previewLabel: 'A4 output preview',
    problemsLabel: 'Syntax problems list',
    logsLabel: 'System log',
    insertMarkdown: 'Insert Markdown elements',
    renderStatus: 'Render status indicator',
    saveStatus: 'Save status',
  },
}

export type Translations = typeof en
