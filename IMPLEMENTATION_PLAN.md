# 🎯 PLANO DE IMPLEMENTAÇÃO - CORREÇÃO DE IMPRESSÃO DO MD2PDF

## 📊 Resumo Executivo

**Objetivo**: Resolver 5 problemas críticos de impressão/PDF do MD2PDF  
**Escopo**: 3 semanas, 4 módulos novos, 0 quebras de funcionalidade  
**Risco**: Baixo (mudanças internas isoladas)  
**Impacto**: Impressão profissional A4 com segurança aprimorada

---

## 🔍 Problemas a Resolver

| ID | Problema | Severidade | Impacto |
|----|----------|-----------|--------|
| P1 | Sem processador de markdown customizado | 🔴 CRÍTICA | Sem otimização para print |
| P2 | CSS de print incompleto | 🔴 CRÍTICA | Layout quebrado em PDF |
| P3 | Sem sanitização HTML | 🔴 CRÍTICA | Risco XSS, layout quebrado |
| P4 | Imagens sem redimensionamento | 🟡 ALTA | Transbordam páginas A4 |
| P5 | Tabelas quebram em impressão | 🟡 ALTA | Conteúdo ilegível em PDF |

---

## 📋 Estrutura de Solução

```
SPRINT 1: Infraestrutura (Semana 1)
  ├─ P-1.1: Instalar DOMPurify
  ├─ P-1.2: Criar markdownProcessor.js
  ├─ P-1.3: Criar styles-print.css
  └─ P-1.4: Integrar em main.js

SPRINT 2: Funcionalidade (Semana 2)
  ├─ P-2.1: Criar printUtils.js
  ├─ P-2.2: Adicionar validação de conteúdo
  ├─ P-2.3: Testar em navegadores
  └─ P-2.4: Testar impressão real

SPRINT 3: Otimizações (Semana 3)
  ├─ P-3.1: Image processor com resize
  ├─ P-3.2: Cache de dimensões
  ├─ P-3.3: Preview de impressão
  └─ P-3.4: Documentação final
```

---

## 🔧 SPRINT 1: INFRAESTRUTURA (Semana 1)

### ✅ Task P-1.1: Instalar DOMPurify

**O que fazer**:
```bash
npm install dompurify
```

**Por quê**:
- Sanitizar HTML gerado por marked.js
- Prevenir XSS attacks
- Remover estilos perigosos que quebram layout

**Arquivo afetado**: `package.json`  
**Tempo estimado**: 5 minutos  
**Risco**: Nenhum (apenas dependência)

---

### ✅ Task P-1.2: Criar `src/processors/markdownProcessor.js`

**Objetivo**: Processador central que combina marked.js + DOMPurify com renderer customizado

**Responsabilidades**:
1. Parse de markdown com marked.js
2. Rendering customizado otimizado para print
3. Sanitização com DOMPurify
4. Tratamento de erros

**Estrutura do arquivo**:

```javascript
// src/processors/markdownProcessor.js

import { marked } from 'marked';
import DOMPurify from 'dompurify';

// 1. RENDERER CUSTOMIZADO
const printRenderer = {
  heading(token) { /* ... */ },
  image(token) { /* ... */ },
  table(token) { /* ... */ },
  codespan(token) { /* ... */ },
  code(token) { /* ... */ },
  blockquote(token) { /* ... */ }
};

// 2. CONFIGURAÇÃO MARKED
marked.setOptions({ /* ... */ });

// 3. FUNÇÃO PRINCIPAL
export function processMarkdown(markdown) {
  try {
    const dirty = marked(markdown);
    const clean = DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [ /* ... */ ],
      ALLOWED_ATTR: [ /* ... */ ]
    });
    return clean;
  } catch (e) {
    console.error('Markdown error:', e);
    return `<p class="error">Erro: ${e.message}</p>`;
  }
}
```

**Decisões de Design**:
- ❓ **Renderer separado ou inline?** → Separado (melhor manutenção)
- ❓ **Sanitizar before ou after marked?** → After marked (menos overhead)
- ❓ **Allowed tags agressivo ou restritivo?** → Balanceado (segurança + funcionalidade)

**Tempo estimado**: 2 horas  
**Risco**: Baixo (novo módulo isolado)  
**Testes**: Testar 10 casos de markdown diferentes

---

### ✅ Task P-1.3: Criar `src/styles-print.css`

**Objetivo**: Estilos específicos para A4 profissional em impressão

**Responsabilidades**:
1. Reset de visualização para print
2. Otimização para tamanho A4 (210x297mm)
3. Margens padrão de impressão
4. Quebras de página inteligentes
5. Tipografia em serifado

**Tempo estimado**: 1.5 horas  
**Risco**: Baixo (CSS isolado em @media print)  
**Compatibilidade**: Chrome, Firefox, Safari (Edge limitado em @page)

---

### ✅ Task P-1.4: Integrar em `src/main.js`

**O que fazer**:

1. **Importar processador**:
```javascript
import { processMarkdown } from './processors/markdownProcessor.js';
import './styles-print.css';
```

2. **Substituir renderPreview**:
```javascript
function renderPreview(md) {
    const preview = document.getElementById('preview');
    if (preview) {
        const html = processMarkdown(md);
        preview.innerHTML = html;
    }
}
```

3. **Adicionar log de sucesso**:
```javascript
Logger.success('Markdown processor integrado');
```

**Impacto**:
- Funcionalidade existente mantida 100%
- Apenas melhoria interna de como HTML é gerado
- Nenhuma mudança em entrada/saída do usuário

**Tempo estimado**: 30 minutos  
**Risco**: Nenhum (substituição drop-in)  
**Validação**: Testar que preview ainda funciona igual

---

## 🚀 SPRINT 2: FUNCIONALIDADE (Semana 2)

### ✅ Task P-2.1: Criar `src/utils/printUtils.js`

**Objetivo**: Utilitários para validação e controle de impressão

**Responsabilidades**:
- Validar imagens (dimensões máximas)
- Validar tabelas (não ultrapassam A4)
- Otimizar visibilidade antes de imprimir
- Restaurar estado após impressão

**Tempo estimado**: 1 hora  
**Risco**: Baixo (novas funções, sem modificar existentes)

---

### ✅ Task P-2.2: Adicionar Validação ao Click de "Download"

**O que fazer** em `src/main.js`:

Integrar validação que alerta usuário sobre problemas antes de imprimir.

**Benefícios**:
- ✅ Alerta prévio ao usuário
- ✅ Chance de corrigir antes de abrir impressora
- ✅ Melhor UX

**Tempo estimado**: 30 minutos  
**Risco**: Nenhum (apenas adiciona validação)

---

### ✅ Task P-2.3: Testar em Navegadores

**Navegadores a testar**:
- ✅ Chrome/Chromium (primary)
- ✅ Firefox (importante)
- ✅ Safari (importante)
- ✅ Edge (compatibilidade)

**Casos de teste**:
- Heading, Paragraph, List, Code, Image
- Table, Blockquote, Link, Mixed content
- XSS attempts (deve ser sanitizado)

**Checklist de teste**:
- [ ] Preview renderiza corretamente
- [ ] Impressão abre diálogo
- [ ] PDF gerado está legível
- [ ] Sem erros no console
- [ ] Sem XSS alerts
- [ ] Imagens aparecem
- [ ] Tabelas formatadas
- [ ] Cores corretas em B&W

**Tempo estimado**: 3 horas  
**Risco**: Médio (descobrir incompatibilidades)

---

### ✅ Task P-2.4: Testar Impressão Real

**Método 1: Simulação no Browser**:
- DevTools → More Tools → Rendering → Emulate CSS media feature prefers-color-scheme
- DevTools → More Tools → Rendering → Emulate Print Media

**Método 2: Print Preview**:
- Chrome: Ctrl+Shift+P → "Print"
- Firefox: Ctrl+Shift+P → "Print"
- Safari: Cmd+P

**Método 3: Salvar como PDF**:
- Imprimir → Destination: "Save as PDF"
- Verificar visualmente

**Checklist**:
- [ ] Margens corretas (20mm todos os lados)
- [ ] Fonte legível (não muito pequena)
- [ ] Imagens não cortadas
- [ ] Tabelas completas
- [ ] Cores visíveis (preto/cinza)
- [ ] Sem URLs longas transpassando
- [ ] Quebras de página naturais

**Tempo estimado**: 2 horas

---

## ⚡ SPRINT 3: OTIMIZAÇÕES (Semana 3)

### ✅ Task P-3.1: Image Processor com Redimensionamento Automático

**Objetivo**: Garantir que imagens nunca excedam limites A4

**Criar `src/processors/imageProcessor.js`** com funções:
- `getImageDimensions(src)` - Obter dimensões reais
- `calculatePrintDimensions(width, height)` - Calcular proporcional

**Tempo estimado**: 1.5 horas  
**Risco**: Baixo (processamento assíncrono)

---

### ✅ Task P-3.2: Cache de Dimensões de Imagem

**Objetivo**: Evitar recalcular dimensões de mesma imagem

**Criar em `src/utils/imageCache.js`**:
- Cache em Map() com chave de URL
- Métodos: `getCachedDimensions()`, `clearImageCache()`

**Benefícios**:
- ✅ Mais rápido em segundo acesso
- ✅ Menos requisições de rede
- ✅ Melhor performance em documentos longos

**Tempo estimado**: 30 minutos

---

### ✅ Task P-3.3: Preview de Impressão

**Objetivo**: Mostrar ao usuário como ficará antes de imprimir

**Opções**:
- A: Modal com Preview (mais tempo)
- B: Simples emulação de CSS (menos tempo)
- C: Pular por agora

**Tempo estimado**: 1 hora (opção B) ou 2 horas (opção A)  
**Risco**: Baixo (interface novo, não afeta core)

---

### ✅ Task P-3.4: Documentação Final

**O que documentar**:
1. PRINT_SETUP.md - Guia para usuários
2. src/processors/README.md - Como estender processadores
3. Inline comments - Explicar decisões de design
4. CHANGELOG.md - Registrar todas as mudanças

**Tempo estimado**: 1 hora

---

## 📊 Cronograma Completo

```
SEMANA 1
├─ Seg-Ter: P-1.1 + P-1.2 (instalar + processador)
├─ Qua: P-1.3 (CSS print)
├─ Qui: P-1.4 (integração)
└─ Sex: Review + Testes básicos

SEMANA 2
├─ Seg-Ter: P-2.1 + P-2.2 (utils + validação)
├─ Qua-Qui: P-2.3 (testes navegadores)
├─ Sex: P-2.4 (testes reais)
└─ Final: Integração com main

SEMANA 3
├─ Seg-Ter: P-3.1 + P-3.2 (image processor + cache)
├─ Qua: P-3.3 (print preview)
├─ Qui: P-3.4 (documentação)
└─ Sex: QA final + Deploy
```

---

## ✅ Checklist de Aceitação

**Critérios de Conclusão**:

- [ ] Todos os 5 problemas resolvidos
- [ ] Nenhuma funcionalidade quebrada
- [ ] Código segue convenções do projeto
- [ ] 100% compatibilidade com navegadores
- [ ] Impressão A4 profissional validada
- [ ] Documentação atualizada
- [ ] Code review aprovado
- [ ] Testes passam em todos os navegadores

---

## 🎯 Decisões Pendentes

**Preciso da sua opinião sobre**:

1. **Priority da Preview de Impressão (P-3.3)?**
   - A: Implementar modal fancy (mais tempo)
   - B: Simples emulação de CSS (menos tempo)
   - C: Pular por agora (pode adicionar depois)

2. **Suporte a Edge no CSS @page?**
   - Edge não suporta `@page` bem
   - A: Adicionar fallback para Edge
   - B: Documentar limitação
   - C: Ignorar Edge

3. **Nível de sanitização?**
   - A: Apenas tags essenciais (seguro)
   - B: Permitir mais HTML (flexível)
   - C: Usar configuração padrão DOMPurify

4. **Cache de imagens persistente?**
   - A: localStorage (permanente)
   - B: Memory (por sessão)
   - C: Sem cache (simples)

---

## 🚀 Próximos Passos

1. **Você aprova este plano?** (Sim/Não/Sugestões)
2. **Responder as 4 decisões pendentes acima**
3. **Confirmar cronograma realista para seu time**
4. **Iniciar implementação na SPRINT 1**
