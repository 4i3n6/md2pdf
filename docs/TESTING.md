# 🧪 TESTE DE FEATURES - MD2PDF v1.1.21

## Status do Servidor

✅ **Servidor rodando em: http://localhost:3000**

---

## Comandos Rapidos

- `npm run typecheck` (valida tipos)
- `npm run build` (gera dist)
- `npm run smoke` (valida dist)

---

## 🎯 Checklist de Testes - TODAS AS 3 SPRINTS

### SPRINT 1: Infraestrutura ✅

- [ ] **DOMPurify Instalado**
  - Comando: `npm list dompurify`
  - Esperado: versão instalada

- [ ] **Markdown Processor Carregado**
  - No console do navegador: `curl http://localhost:3000/src/processors/markdownProcessor.ts`
  - Esperado: arquivo respondendo 200

- [ ] **CSS Print Carregado**
  - No DevTools: Inspecionar elemento → verificar se styles-print.css está no <head>
  - Esperado: arquivo carregado com @media print

- [ ] **Logger Funciona**
  - Abrir aplicação
  - Verificar console de logs no painel (direita)
  - Esperado: "Sistema pronto" mensagem

- [ ] **Migracao de Storage v2 -> v3**
  - No DevTools, criar `md2pdf-docs-v2` com JSON valido e remover `md2pdf-docs-v3`
  - Recarregar a pagina
  - Esperado: documentos aparecem e `md2pdf-docs-v3` e criado

---

### SPRINT 2: Funcionalidade ✅

- [ ] **Preview Renderiza Markdown**
  - Digitar: `# Teste\n\nParágrafo com **negrito**`
  - Esperado: Preview mostra "Teste" como H1 e texto formatado

- [ ] **Status de Salvamento**
  - Digitar no editor
  - Esperado: status mostra "Nao salvo"
  - Aguardar ~1s sem editar ou usar Ctrl/Cmd+S
  - Esperado: status muda para "Salvo agora"

- [ ] **Validação Prévio ao Imprimir**
  - Clicar em [ EXP_PDF ]
  - Verificar se aparece mensagem de validação
  - Esperado: Avisos aparecem se houver problemas

- [ ] **Cache localStorage**
  - Abrir DevTools → Application → localStorage
  - Procurar por `md2pdf-`
  - Esperado: múltiplas chaves de cache

- [ ] **Imagens Redimensionadas**
  - Colar markdown: `![Test](https://via.placeholder.com/2000x1500)`
  - Inspencionar <img> no DevTools
  - Esperado: atributo `style` com dimensões calculadas

---

### SPRINT 3: Otimização ✅

- [ ] **Print Preview Mode (Ctrl+Shift+P)**
  - Digitar markdown
  - Pressionar Ctrl+Shift+P
  - Esperado: tela fica cinza, preview em fullscreen

- [ ] **ESC para Sair do Preview**
  - Em print preview mode
  - Pressionar ESC
  - Esperado: volta ao normal

- [ ] **Print Reporter Funciona**
  - Clicar [ EXP_PDF ]
  - Verificar console de logs
  - Esperado: mostra estatísticas (palavras, páginas, etc)

- [ ] **Checklist Automático**
  - Colar conteúdo com problema
  - Clicar [ EXP_PDF ]
  - Esperado: mostra avisos específicos

- [ ] **Backup/Restauracao Completa**
  - Gerar backup
  - Criar novo documento vazio ou apagar docs
  - Restaurar backup
  - Esperado: lista e conteudo restaurados

---

## 📋 Teste Completo (Passo a Passo)

### 1. Renderização Básica
```markdown
# Documento de Teste

Este é um **parágrafo** com _itálico_.

## Seção 2

- Item 1
- Item 2
- Item 3

### Código

```javascript
const x = 1;
```

### Tabela

| A | B |
|---|---|
| 1 | 2 |

### Imagem

![Placeholder](https://via.placeholder.com/1200x800)

### Link

[Google](https://google.com)

> Uma citação importante
```

**Esperado:**
- Preview renderiza todos os elementos
- Nenhum erro no console
- Logs mostram "Renderizado em ~X páginas A4"

---

### 2. Impressão (PDF)
1. Digitar ou colar markdown acima
2. Clicar [ EXP_PDF ]
3. Sistema valida conteúdo
4. Dialog de impressão abre
5. Escolher "Salvar como PDF"
6. Abrir PDF gerado

**Verificar no PDF:**
- ✓ Margens de 20mm
- ✓ Imagem redimensionada
- ✓ Tabela legível
- ✓ Fonte serifada (Georgia)
- ✓ Link mostra URL
- ✓ Sem elementos de UI (sidebar, top-bar)
- ✓ Sem console de logs

---

### 3. Preview de Impressão
1. Com markdown carregado
2. Pressionar **Ctrl+Shift+P** (ou Cmd+Shift+P no Mac)
3. Tela muda para modo preview

**Esperado:**
- Fundo cinza
- Preview em full-screen
- Barra preta no topo com mensagem
- Markdown em caixa branca com sombra

4. Pressionar **ESC**
5. Volta ao normal

---

### 4. Validação de Imagens Grandes
```markdown
# Teste de Imagem Grande

![Imagem 3000x2400](https://via.placeholder.com/3000x2400)

Texto após imagem.
```

**Esperado:**
- Clicar [ EXP_PDF ]
- Aparece aviso: "⚠️ Imagem 1: 3000x2400px pode não caber"
- Dialog pergunta: "Há problemas no conteúdo. Continuar?"

---

### 5. Validação de Tabelas Largas
```markdown
# Tabela Teste

| Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 |
|----------|----------|----------|----------|----------|----------|
| A        | B        | C        | D        | E        | F        |
| 1        | 2        | 3        | 4        | 5        | 6        |
```

**Esperado:**
- Clicar [ EXP_PDF ]
- Possível aviso sobre largura
- PDF mostra tabela formatada corretamente

---

### 6. Relatório de Documento
1. Digitar bastante markdown (100+ linhas)
2. Clicar [ EXP_PDF ]
3. Verificar console de logs

**Esperado nos logs:**
```
=== PRÉ-IMPRESSÃO ===
✓ Conteúdo detectado
✓ 5 imagem(ns) detectada(s)
✓ 2 tabela(s) detectada(s)

📄 3pp | 📝 250 palavras | ⏱️ ~1min
```

---

## 🔍 Troubleshooting

### Servidor não inicia
```bash
# Verificar porta
lsof -i :3000

# Matar processo existente
kill -9 <PID>

# Reiniciar
npm run dev
```

### Markdown não renderiza
- Verificar sintaxe no editor
- Console do navegador (F12) pode ter erros
- Tentar recarregar página (F5)

### Imagens não aparecem
- Verificar URL no editor (deve ser HTTPS ou localhost)
- CORS pode bloquear cross-origin
- Testar em modo privado

### Impressão muito lenta
- Muitas imagens (>50)? Processamento em batch
- localStorage cheio? Auto-cleanup ativa
- Aguardar processamento completar

---

## 📊 Relatório de Teste

Após executar testes acima, preencher:

- [ ] SPRINT 1 - Todas as features
- [ ] SPRINT 2 - Todas as features
- [ ] SPRINT 3 - Todas as features
- [ ] Build produção: `npm run build`
- [ ] Sem erros no console
- [ ] PDF gerado com qualidade

**Status Final:** ✅ PRONTO PARA PRODUÇÃO

---

## 🎯 Comandos Rápidos

```bash
# Dev
npm run dev

# Build
npm run build

# Preview (após build)
npm run preview

# Limpar node_modules
rm -rf node_modules && npm install

# Limpar cache
rm -rf node_modules/.vite

# Limpar localStorage (console do navegador)
localStorage.clear()
```

---

## 📱 Testar em Mobile

1. Iniciar com: `npm run dev -- --host`
2. Acessar de outro dispositivo: `http://<seu-ip>:3000`
3. Testar responsividade (viewport mobile)
4. Print preview em mobile (limitado)

---

## ✨ Conclusão

Quando todos os testes acima forem ✅, o projeto está:
- Funcionando 100%
- Pronto para produção
- Testado em todos os browsers
- Validado em múltiplos casos de uso

🚀 **LAUNCH READY!** 🚀
