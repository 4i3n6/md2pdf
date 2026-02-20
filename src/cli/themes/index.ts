import * as fs from 'fs'
import * as path from 'path'

// Theme CSS — bundled as text by tsup's `.css` text loader.
// Vite types declare *.css as empty modules; tsup actually produces strings.
// The `as string` casts are safe because tsup's `loader: { '.css': 'text' }` guarantees string output.
import almondCss from './css/almond.css'
import awsmCss from './css/awsm.css'
import githubCss from './css/github.css'
import githubDarkCss from './css/github-dark.css'
import latexCss from './css/latex.css'
import modestCss from './css/modest.css'
import retroCss from './css/retro.css'
import sakuraCss from './css/sakura.css'
import waterCss from './css/water.css'
import waterDarkCss from './css/water-dark.css'

// Structural CSS for themed output
import printEssentialsCss from './print-essentials.css'
import componentsCss from './components.css'

export const PRINT_ESSENTIALS = printEssentialsCss as string
export const COMPONENT_STYLES = componentsCss as string

const THEMES: Record<string, string> = {
    'github': githubCss as string,
    'github-dark': githubDarkCss as string,
    'almond': almondCss as string,
    'awsm': awsmCss as string,
    'latex': latexCss as string,
    'modest': modestCss as string,
    'retro': retroCss as string,
    'sakura': sakuraCss as string,
    'water': waterCss as string,
    'water-dark': waterDarkCss as string,
}

export const THEME_NAMES = Object.keys(THEMES)

export function getThemeCss(nameOrPath: string): string {
    const builtin = THEMES[nameOrPath]
    if (builtin !== undefined) {
        return builtin
    }

    const resolved = path.resolve(nameOrPath)
    if (!fs.existsSync(resolved)) {
        throw new Error(
            `Unknown theme "${nameOrPath}". ` +
            `Built-in themes: ${THEME_NAMES.join(', ')}. ` +
            `Or provide a path to a custom CSS file.`
        )
    }

    return fs.readFileSync(resolved, 'utf-8')
}
