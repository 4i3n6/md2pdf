# AGENTS.md - Guia para Agentes de Código

## Comandos Essenciais

```bash
npm run dev      # Desenvolvimento (porta 3000, abre automaticamente)
npm run build    # Build para produção em ./dist
npm run preview  # Preview da build de produção
```

**Nota:** Este projeto não possui lint ou testes. Build deve executar sem erros.

## Convenções de Código

### Imports & Estrutura
- **Imports**: ES6 modules (`import`/`export`)
- **Tipo de projeto**: CommonJS type, mas código usa ES6 imports (processado por Vite)
- Ordem: dependências externas → módulos locais → estilos CSS

### Formatação & Nomenclatura
- **Idioma**: Português para comentários, variáveis, funções do sistema
- **Padrão**: camelCase para variáveis/funções (ex: `initSystem`, `getCurrentDoc`)
- **Constantes**: camelCase com PascalCase para objetos (ex: `Logger`, `state`)
- **Espaçamento**: 4 espaços de indentação

### Tipos & Validação
- **Tipagem**: JavaScript vanilla, sem TypeScript
- **Validação**: Validação simples com try/catch; log de erros obrigatório

### Tratamento de Erros
- Sempre usar Logger (objeto disponível globalmente)
- Padrão: `Logger.error()` para erros, `Logger.success()` para sucesso, `Logger.log()` para info
- Confirmações críticas com `confirm()` nativo

### Arquitetura & Padrões
- **Padrão**: State management simples com objeto `state` global
- **DOM**: Seleção por ID com `document.getElementById()`
- **Eventos**: Event listeners com `addEventListener`
- **Renderização**: Funções puras como `renderList()`, `renderPreview()` sem side effects desnecessários
- **Persistência**: localStorage com chave `md2pdf-docs-v2`

### Build & Otimizações
- **Minificação**: Terser com `drop_console: true` e `drop_debugger: true`
- **Code splitting**: Automático para codemirror, marked
- **PWA**: Vite PWA plugin ativo com service worker auto-update
- **Limites**: Chunk size warning em 1000KB

### Boas Práticas
- ✅ Manter funções pequenas e focadas (máx 30 linhas)
- ✅ Comentários apenas para lógica não óbvia
- ✅ Salvar docs após cada modificação crítica (`saveDocs()`)
- ✅ Usar Logger para todas as operações do sistema
- ❌ Evitar console.log direto (será removido no build)
- ❌ Não adicionar dependências sem justificar
