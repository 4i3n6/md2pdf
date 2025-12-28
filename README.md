# MD2PDF - Conversor Markdown para PDF

> **SISTEMA DE CONVERSÃO v1.1.21 | STATUS: PRONTO PARA PRODUÇÃO**

Clone ultrapolido e otimizado do markdowntopdf.com com interface moderna estilo **painel financeiro hacker**. Conversor de Markdown para PDF gratuito, sem limites e sem necessidade de autenticação.

## ⚡ RECURSOS DO SISTEMA

### Core Features
- ✓ **Interface Hacker** - Tema claro estilo painel financeiro/terminal
- ✓ **Sem autenticação** - Use imediatamente sem cadastro
- ✓ **Sem rate limiting** - Conversões ilimitadas
- ✓ **100% Client-Side** - Zero dependência de servidor

### Editor & Preview
- ✓ **CodeMirror 6** - Editor profissional monospace
- ✓ **Preview em tempo real** - Renderização instantânea
- ✓ **GitHub Flavored Markdown** - Suporte completo a GFM
- ✓ **Syntax Highlighting** - Código destacado no preview

### Funcionalidades
- ✓ **Armazenamento local** - Múltiplos documentos via localStorage
- ✓ **Drag & Drop** - Arraste arquivos .md para o editor
- ✓ **Atalhos de teclado** - Ctrl/Cmd+S para salvar, Ctrl/Cmd+P para PDF
- ✓ **Modos de visualização** - Split, Editor-only ou Preview-only
- ✓ **Backup completo** - Exportação e restauração de todos os documentos
- ✓ **Export PDF nativo** - Window.print() do navegador
- ✓ **PWA Ready** - Instalável como app

## 📦 Instalação

```bash
# Clone o repositório
git clone <seu-repo>
cd md2pdf

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

## 🛠️ Comandos Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Typecheck
npm run typecheck

# Smoke test (requer build)
npm run smoke

# Preview da build de produção
npm run preview
```

## 📚 Documentacao

- `docs/README.md` (indice geral)
- `docs/sdd/README.md` (SDD por funcionalidade)

## 🎯 Como Usar

1. **Abra a aplicação** - Acesse http://localhost:3000 após executar `npm run dev`
2. **Digite ou cole seu Markdown** no editor à esquerda
3. **Veja o preview em tempo real** à direita
4. **Clique em "Download PDF"** para gerar o PDF (abre a caixa de diálogo de impressão)
5. **Salve como PDF** na caixa de diálogo de impressão do navegador

## ⌨️ Atalhos de Teclado

- `Ctrl/Cmd + S` - Salvar documento
- `Ctrl/Cmd + P` - Baixar/Imprimir como PDF

## 🔧 Tecnologias Utilizadas

- **Vite** - Build tool e dev server
- **CodeMirror 6** - Editor de código
- **Marked.js** - Parser de Markdown para HTML
- **LocalStorage API** - Armazenamento local de documentos
- **Window.print()** - Geração nativa de PDFs

## 📝 Recursos do Markdown Suportados

- Cabeçalhos (H1-H6)
- Negrito, itálico, tachado
- Listas ordenadas e não ordenadas
- Links e imagens
- Código inline e blocos de código
- Tabelas
- Citações (blockquotes)
- Linhas horizontais
- HTML inline (quando permitido)

## 🎨 Personalização

### Alterar cores do tema

Edite as variáveis CSS em `src/styles.css`:

```css
:root {
    --primary: #10b981;       /* Cor primária */
    --primary-dark: #059669;  /* Cor primária escura */
    --sidebar-bg: #1f2937;    /* Fundo da sidebar */
    /* ... */
}
```

### Modificar conteúdo padrão

Edite o `defaultDoc` em `src/services/documentManager.ts`

## 🚀 Deploy

### Vercel

```bash
npm run build
# Faça deploy da pasta 'dist'
```

### Netlify

```bash
npm run build
# Faça deploy da pasta 'dist'
```

### GitHub Pages

```bash
npm run build
# Faça commit e push da pasta 'dist'
```

## 📄 Licença

Projeto de código aberto - use como quiser!

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se livre para:

- Reportar bugs
- Sugerir novos recursos
- Enviar pull requests
- Melhorar a documentação

## 🎯 Diferenças do Original

- ❌ Removida autenticação
- ❌ Removido rate limiting
- ❌ Removido backend
- ✅ Adicionado armazenamento local
- ✅ Interface simplificada
- ✅ Código mais limpo e manutenível
- ✅ 100% client-side

## 🔒 Privacidade

Todos os dados são armazenados **apenas no seu navegador** (localStorage). Nenhum dado é enviado para servidores externos.
