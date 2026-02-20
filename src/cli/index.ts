import { Command } from 'commander'
import * as fs from 'fs'
import * as path from 'path'
import { processMarkdown } from './markdownProcessor'
import { processYamlBlocksInHtml } from './yamlProcessor'
import { buildHtmlDocument } from './htmlTemplate'
import { generatePdf } from './pdfGenerator'
import { parseMargins } from './utils'
import { getThemeCss, THEME_NAMES } from './themes'
import { sanitizeFragment } from './sanitizer'

// Injected by tsup's `define` from package.json at build time.
declare const CLI_VERSION: string

const program = new Command()

program
    .name('md2pdf')
    .description('Convert Markdown files to PDF')
    .version(CLI_VERSION, '-v, --version')
    .argument('<input>', 'Markdown file to convert')
    .argument('[output]', 'Output PDF path (default: <input-name>.pdf)')
    .option('--page-size <size>', 'Paper size: A4, Letter, Legal', 'A4')
    .option('--landscape', 'Landscape orientation', false)
    .option('--margin <mm>', 'Page margins (default: 10), supports "10" or "10,15,10,15"', '10')
    .option('--no-mermaid', 'Skip Mermaid diagram rendering')
    .option('--no-highlight', 'Skip syntax highlighting')
    .option('--no-yaml', 'Skip YAML block rendering')
    .option('--theme <name|path>', `Visual theme (${THEME_NAMES.join(', ')}) or path to custom CSS`)
    .option('--timeout <ms>', 'Puppeteer timeout in ms', '30000')
    .option('--debug', 'Keep intermediate .debug.html file', false)
    .action(async (input: string, output: string | undefined, opts: {
        pageSize: string
        landscape: boolean
        margin: string
        mermaid: boolean
        highlight: boolean
        yaml: boolean
        theme: string | undefined
        timeout: string
        debug: boolean
    }) => {
        try {
            await run(input, output, opts)
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            process.stderr.write(`Error: ${msg}\n`)
            process.exit(2)
        }
    })

interface CliOptions {
    pageSize: string
    landscape: boolean
    margin: string
    mermaid: boolean
    highlight: boolean
    yaml: boolean
    theme: string | undefined
    timeout: string
    debug: boolean
}

function resolvePaths(input: string, output: string | undefined) {
    const inputPath = path.resolve(input)
    if (!fs.existsSync(inputPath)) {
        process.stderr.write(`Error: Input file not found: ${inputPath}\n`)
        process.exit(1)
    }

    const inputDir = path.dirname(inputPath)
    const inputName = path.basename(inputPath, path.extname(inputPath))
    const outputPath = output
        ? path.resolve(output)
        : path.join(inputDir, `${inputName}.pdf`)

    return { inputPath, inputDir, outputPath }
}

function markdownToHtml(markdown: string, opts: CliOptions): string {
    process.stderr.write('Processing markdown...\n')
    let fragment = processMarkdown(markdown, {
        highlight: opts.highlight,
        mermaid: opts.mermaid,
        yaml: opts.yaml
    })

    if (opts.yaml) {
        process.stderr.write('Processing YAML blocks...\n')
        fragment = processYamlBlocksInHtml(fragment)
    }

    fragment = sanitizeFragment(fragment)

    const theme = opts.theme
        ? { themeCss: getThemeCss(opts.theme) }
        : undefined

    return buildHtmlDocument(fragment, theme)
}

async function run(
    input: string,
    output: string | undefined,
    opts: CliOptions
): Promise<void> {
    const { inputPath, inputDir, outputPath } = resolvePaths(input, output)
    const timeout = parseInt(opts.timeout, 10) || 30000

    process.stderr.write(`Converting: ${path.basename(inputPath)}\n`)

    const markdown = fs.readFileSync(inputPath, 'utf-8')
    const htmlDocument = markdownToHtml(markdown, opts)

    process.stderr.write('Generating PDF...\n')
    await generatePdf(htmlDocument, outputPath, inputDir, {
        pageSize: opts.pageSize,
        landscape: opts.landscape,
        margin: parseMargins(opts.margin),
        mermaid: opts.mermaid,
        timeout,
        debug: opts.debug
    })

    process.stderr.write(`Done: ${outputPath}\n`)
}

program.parse()
