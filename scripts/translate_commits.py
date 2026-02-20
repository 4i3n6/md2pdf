SUBJECTS = {
    "chore(os): automatizar tags e changelog para releases padrão top": "chore(release): automate tag and changelog generation",
    "docs: adicionar CHANGELOG.md e configurar sincronizacao de versao": "docs: add CHANGELOG.md and configure version synchronization",
    "chore(os): remover rastros de ferramentas locais do repositorio": "chore: remove local development tool traces from repository",
    "chore(os): preparar projeto para open source (licenca, guia de contribuicao, ci)": "chore: prepare project for open source (license, contributing guide, ci)",
    "fix(manual): atualizar versao no manual e automatizar futuras atualizacoes": "fix(manual): update version references and automate future updates",
    "fix(site): automatizar atualizacao de versao no rodape": "fix(site): automate footer version update",
    "fix(MarkdownValidator): ignorar imagens regex e adicionar testes": "fix(MarkdownValidator): ignore image regex patterns and add tests",
    "test(DocumentManager): criar testes unitarios para servico de documentos": "test(DocumentManager): add unit tests for document service",
    "build(test): adicionar jsdom e configurar vitest para ambiente dom": "build(test): add jsdom and configure vitest for dom environment",
    "feat: substituir confirm() nativo por modal customizado (modalService)": "feat: replace native confirm() with custom modal service",
    "refactor: extrair tema do CodeMirror para src/editorTheme.ts": "refactor: extract CodeMirror theme to src/editorTheme.ts",
    "refactor: desambiguar tipos ValidationResult duplicados e corrigir erros de typecheck": "refactor: disambiguate duplicate ValidationResult types and fix typecheck errors",
    "docs: corrigir AGENTS.md \u2014 projeto usa TypeScript, n\u00e3o JavaScript vanilla": "docs: fix AGENTS.md \u2014 project uses TypeScript, not vanilla JavaScript",
    "fix: evitar loop de bump em commits de arquivos de versao": "fix: prevent version bump loop in version file commits",
    "fix: aplicar truncamento cripto diretamente no DOM de tabelas": "fix: apply crypto address truncation directly to table DOM",
    "fix: forcar truncamento de enderecos crypto em qualquer conteudo da tabela": "fix: enforce crypto address truncation for all table cell content",
    "fix: truncar enderecos crypto em celulas de tabela": "fix: truncate crypto addresses in table cells",
    "refactor: extrair service de status de salvamento": "refactor: extract save status service",
    "refactor: extrair debounce util": "refactor: extract debounce utility",
    "refactor: extrair preferencias e controles do preview": "refactor: extract preview preferences and controls",
    "refactor: extrair splitter para service": "refactor: extract splitter to dedicated service",
    "refactor: extrair preview service e serializar renders": "refactor: extract preview service and serialize renders",
    "refactor: centralizar acesso ao storage": "refactor: centralize storage access layer",
    "fix: corrigir delete do doc ativo e harden do localStorage": "fix: fix active document deletion and harden localStorage handling",
    "docs: adicionar checklist QA e fortalecer smoke test": "docs: add QA checklist and strengthen smoke test",
    "fix: sw e highlight sql": "fix: service worker and SQL syntax highlighting",
    "feat: evolucao enterprise": "feat: enterprise-grade feature set",
    "fix: for\u00e7ar fonte monoespaciada e margens em styles-print.css com !important": "fix: enforce monospace font and print margins in styles-print.css",
    "fix: usar fonte monoespaciada e reduzir margens de impress\u00e3o para 10-12mm": "fix: use monospace font and reduce print margins to 10-12mm",
    "fix: revert fonte para Georgia serif (original)": "fix: revert font to Georgia serif",
    "fix: compactar drasticamente espa\u00e7amento de impress\u00e3o para melhor aproveitamento de p\u00e1gina A4": "fix: compact print spacing for better A4 page utilization",
    "feat: adicionar bot\u00e3o de download MD na barra lateral": "feat: add MD download button to sidebar",
    "fix: reduzir fonte para 10pt e melhorar legibilidade da impress\u00e3o com sans-serif": "fix: reduce font to 10pt and improve print legibility with sans-serif",
    "fix: corrigir visibilidade do conte\u00fado na impress\u00e3o removendo display:none do app-grid": "fix: fix content visibility in print by removing display:none from app-grid",
    "Merge pull request #1 from zzkteam/fix/sql-syntax-highlighting": "Merge pull request #1 from 4i3n6/fix/sql-syntax-highlighting",
}

BODY_REPLACEMENTS = {
    "feat: replace native confirm() with custom modal service": (
        "- Create src/services/modalService.ts with confirm() -> Promise<boolean>\n"
        "  - Design system: uses project CSS variables (--bg-core, --accent, etc.)\n"
        "  - Accessible: role=dialog, aria-modal, focus managed on confirm button\n"
        "  - Keyboard: Enter confirms, Escape cancels, click outside cancels\n"
        "  - Variants: danger (red), warning (amber), info (blue)\n"
        "- main.ts: deleteDoc uses confirm() with danger variant\n"
        "- printUtils.ts: confirmPrintWithWarnings uses confirm() with warning variant\n"
        "- documentIoService.ts: backup restore uses confirm() with warning variant\n"
    ),
    "refactor: extract CodeMirror theme to src/editorTheme.ts": (
        "- Create src/editorTheme.ts with named color palette (colors.accent, colors.text, etc.)\n"
        "- Remove inline EditorView.theme() block from main.ts (25 lines -> 1 line)\n"
        "- main.ts imports editorTheme as a reusable extension\n"
        "- Simplifies color customization without touching initialization logic\n"
    ),
    "refactor: disambiguate duplicate ValidationResult types and fix typecheck errors": (
        "- Rename ValidationResult in markdownValidator.ts -> MarkdownValidationResult\n"
        "- Rename local ValidationResult in imageProcessor.ts -> ImageValidationResult\n"
        "- Remove orphaned ValidationResult from types/index.ts (was not imported anywhere)\n"
        "- Fix TS2345 in base64.ts: Uint8Array access with fallback ?? 0\n"
        "- Fix TS2532/TS2322 in mermaidProcessor.ts: explicit guard before accessing viewBoxParts[2/3]\n"
        "\n"
        "typecheck: 0 errors\n"
    ),
}

NOISE_MARKERS = [
    "Co-Authored-By: Claude",
    "Generated with [Claude Code]",
    "\U0001f916",
]


def clean_body(body: str) -> str:
    lines = body.split("\n")
    cleaned = [l for l in lines if not any(m in l for m in NOISE_MARKERS)]
    result = "\n".join(cleaned).rstrip()
    return result


msg = commit.message.decode("utf-8", errors="replace")
parts = msg.split("\n", 1)
subject = parts[0].strip()
body = parts[1] if len(parts) > 1 else ""

subject = SUBJECTS.get(subject, subject)

if subject in BODY_REPLACEMENTS:
    body = BODY_REPLACEMENTS[subject]
elif body:
    body = clean_body(body)

if body.strip():
    new_msg = subject + "\n\n" + body.strip() + "\n"
else:
    new_msg = subject + "\n"

commit.message = new_msg.encode("utf-8")
