#!/usr/bin/env node
import { readFileSync } from 'fs'
import { existsSync } from 'fs'
import { resolve } from 'path'

const rootDir = process.cwd()

function lerJson(caminho) {
  const conteudo = readFileSync(resolve(rootDir, caminho), 'utf-8')
  return JSON.parse(conteudo)
}

function lerTexto(caminho) {
  return readFileSync(resolve(rootDir, caminho), 'utf-8')
}

const packageJson = lerJson('package.json')
const esperado = packageJson.version
const erros = []
const avisos = []

const arquivos = [
  { nome: 'package.json', padrao: new RegExp(`"version"\\s*:\\s*"${esperado}"`) },
  { nome: 'src/i18n/en.ts', padrao: new RegExp(`version:\\s*['"]v${esperado}['"]`) },
  { nome: 'src/i18n/pt.ts', padrao: new RegExp(`version:\\s*['"]v${esperado}['"]`) },
  { nome: 'app.html', padrao: new RegExp(`v${esperado}`) },
  { nome: 'pt/app.html', padrao: new RegExp(`v${esperado}`) }
]

if (existsSync(resolve(rootDir, 'dist/app.html'))) {
  const conteudoDist = lerTexto('dist/app.html')
  if (!new RegExp(`v${esperado}`).test(conteudoDist)) {
    avisos.push('dist/app.html existe, mas ainda está com versão anterior (execute npm run build)')
  }
}

for (const item of arquivos) {
  const texto = lerTexto(item.nome)
  if (!item.padrao.test(texto)) {
    erros.push(`${item.nome} -> não contém a versão ${esperado}`)
  }
}

const lockVersion = lerJson('package-lock.json')?.version
if (lockVersion && lockVersion !== esperado) {
  avisos.push(`package-lock.json -> versão ${lockVersion} diferente de ${esperado} (sincronize com npm install se necessário)`)
}

if (erros.length > 0) {
  console.error('[version:verify] Falha na verificação de versão:')
  for (const erro of erros) {
    console.error(`  - ${erro}`)
  }
  process.exit(1)
}

if (avisos.length > 0) {
  console.log('[version:verify] Avisos:')
  for (const aviso of avisos) {
    console.log(`  - ${aviso}`)
  }
}

console.log(`[version:verify] OK: versão ${esperado} consistente nos arquivos ${arquivos.map((f) => f.nome).join(', ')}.`)
