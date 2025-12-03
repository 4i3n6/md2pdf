#!/bin/bash

echo "🔍 Verificando possíveis erros de importação..."
echo ""

echo "1. Verificando se DOMPurify está sendo importado corretamente:"
grep -n "import.*DOMPurify" src/processors/markdownProcessor.js

echo ""
echo "2. Verificando se há erros de sintaxe em main.js:"
node --check src/main.js 2>&1 || echo "❌ Há erro em main.js"

echo ""
echo "3. Verificando package.json:"
cat package.json | grep -E '"type"|"main"|"module"'

echo ""
echo "4. Listando arquivos criados:"
ls -la src/processors/
ls -la src/utils/

