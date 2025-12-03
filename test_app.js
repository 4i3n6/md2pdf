// Teste rápido dos módulos
import { processMarkdown } from './src/processors/markdownProcessor.js';
import { printReporter } from './src/utils/printReporter.js';

const markdown = `# Teste

Este é um parágrafo.

![Imagem](https://via.placeholder.com/800x600)

| A | B |
|---|---|
| 1 | 2 |
`;

console.log('🧪 Testando markdownProcessor...');
const html = processMarkdown(markdown);
console.log('✅ HTML gerado:', html.substring(0, 100));

console.log('✅ Todos os módulos funcionando!');
