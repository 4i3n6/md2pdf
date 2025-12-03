/**
 * Manual Page Generator
 * Generates static HTML pages from content.json and a single template
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MANUAL_DIR = join(ROOT, 'manual');
const CONTENT_FILE = join(MANUAL_DIR, 'content.json');

// Load content
const content = JSON.parse(readFileSync(CONTENT_FILE, 'utf-8'));
const { site, pages } = content;

// Template functions
function htmlHead(page, isSubpage = false) {
    const cssPath = isSubpage ? '../manual.css' : './manual.css';
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${page.description}">
    <meta name="keywords" content="${page.keywords}">
    <meta name="author" content="${site.title}">
    <title>${page.title} | ${site.title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="icon" href="/favicon.ico">
    <link rel="stylesheet" href="${cssPath}">
</head>`;
}

function htmlHeader() {
    return `
    <header class="header">
        <div class="header-content">
            <a href="/" class="logo">${site.title}</a>
            <span class="logo-subtitle">Manual</span>
            <nav class="header-nav">
                <a href="/">Home</a>
                <a href="/app">Abrir App</a>
            </nav>
        </div>
    </header>`;
}

function htmlBreadcrumb(page) {
    if (page.isIndex) {
        return `
        <nav class="breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span class="breadcrumb-separator">&gt;</span>
            <span class="breadcrumb-current">Manual</span>
        </nav>`;
    }
    return `
        <nav class="breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span class="breadcrumb-separator">&gt;</span>
            <a href="/manual/">Manual</a>
            <span class="breadcrumb-separator">&gt;</span>
            <span class="breadcrumb-current">${page.title}</span>
        </nav>`;
}

function htmlFooter() {
    return `
    <footer class="footer">
        <div class="footer-content">
            <div class="footer-links">
                <a href="/app">Abrir ${site.title}</a>
                <a href="/manual/">Manual</a>
                <a href="/">Página Inicial</a>
            </div>
            <p class="footer-version">${site.title} v${site.version} | ${site.tagline}</p>
        </div>
    </footer>`;
}

function htmlPageNav(page) {
    if (!page.prev && !page.next) return '';
    
    const prevSlug = page.prev?.slug === 'index' ? '/manual/' : `/manual/${page.prev?.slug}/`;
    const nextSlug = page.next?.slug === 'index' ? '/manual/' : `/manual/${page.next?.slug}/`;
    
    let nav = '\n            <nav class="page-nav">';
    
    if (page.prev) {
        nav += `
                <a href="${prevSlug}">
                    <span class="nav-arrow">&larr;</span>
                    <div class="nav-direction">
                        <span class="nav-label">Anterior</span>
                        <span class="nav-title">${page.prev.title}</span>
                    </div>
                </a>`;
    }
    
    if (page.next) {
        nav += `
                <a href="${nextSlug}">
                    <div class="nav-direction">
                        <span class="nav-label">Próximo</span>
                        <span class="nav-title">${page.next.title}</span>
                    </div>
                    <span class="nav-arrow">&rarr;</span>
                </a>`;
    }
    
    nav += '\n            </nav>';
    return nav;
}

// Content rendering helpers
function renderList(items) {
    return `
                <ul>
                    ${items.map(item => `<li>${item}</li>`).join('\n                    ')}
                </ul>`;
}

function renderSteps(steps) {
    return `
                <ol class="steps">
                    ${steps.map(step => `<li>
                        <strong>${step.title}</strong>
                        ${step.text}
                    </li>`).join('\n                    ')}
                </ol>`;
}

function renderTable(table) {
    return `
                <table>
                    <thead>
                        <tr>
                            ${table.headers.map(h => `<th>${h}</th>`).join('\n                            ')}
                        </tr>
                    </thead>
                    <tbody>
                        ${table.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('\n                        ')}
                    </tbody>
                </table>`;
}

function renderShortcuts(shortcuts) {
    return `
                <table class="shortcuts-table">
                    <thead>
                        <tr>
                            <th>Atalho</th>
                            <th>Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${shortcuts.map(s => {
                            const sep = s.separator || '+';
                            const keys = s.keys.map(k => `<kbd>${k}</kbd>`).join(sep);
                            return `<tr>
                            <td>${keys}</td>
                            <td>${s.action}</td>
                        </tr>`;
                        }).join('\n                        ')}
                    </tbody>
                </table>`;
}

function renderInfoBox(box, highlight = false) {
    const cls = highlight ? 'info-box highlight' : 'info-box';
    const titleHtml = box.title ? `<strong>${box.title}</strong>\n                    ` : '';
    return `
                <div class="${cls}">
                    ${titleHtml}<p>${box.text}</p>
                </div>`;
}

function renderSection(section) {
    let html = `
            <section>
                <h2>${section.title}</h2>`;
    
    // Content paragraphs
    if (section.content) {
        html += section.content.map(p => `\n                <p>${p}</p>`).join('');
    }
    
    // Info box (before list)
    if (section.infoBox) {
        html += renderInfoBox(section.infoBox);
    }
    
    // Content after info box
    if (section.contentAfter) {
        html += section.contentAfter.map(p => `\n                <p>${p}</p>`).join('');
    }
    
    // Table
    if (section.table) {
        html += renderTable(section.table);
    }
    
    // Highlighted info box
    if (section.infoBoxHighlight) {
        html += renderInfoBox(section.infoBoxHighlight, true);
    }
    
    // Steps
    if (section.steps) {
        html += renderSteps(section.steps);
    }
    
    // List
    if (section.list) {
        html += renderList(section.list);
    }
    
    // Shortcuts table
    if (section.shortcuts) {
        html += renderShortcuts(section.shortcuts);
    }
    
    // Multiple info boxes
    if (section.infoBoxes) {
        html += section.infoBoxes.map(box => renderInfoBox(box)).join('');
    }
    
    // Subsections (for nested content like install instructions)
    if (section.subsections) {
        for (const sub of section.subsections) {
            html += `\n                <h3>${sub.subtitle}</h3>`;
            if (sub.list) {
                html += renderList(sub.list);
            }
        }
    }
    
    // Warning list
    if (section.warningList) {
        html += `
                <div class="info-box">
                    <ul>
                        ${section.warningList.map(item => `<li>${item}</li>`).join('\n                        ')}
                    </ul>
                </div>`;
    }
    
    html += '\n            </section>';
    return html;
}

// Index page specific rendering
function renderIndexPage(page) {
    const c = page.content;
    
    let html = `
        <article class="content">
            <h1>${page.title}</h1>
            
            <section class="intro">
                ${c.intro.map(p => `<p>${p}</p>`).join('\n                ')}
            </section>

            <section class="toc">
                <h2>Índice</h2>
                <nav class="toc-list" aria-label="Índice do manual">
                    ${c.toc.map(item => `<a href="/manual/${item.slug}/" class="toc-item">
                        <span class="toc-number">${item.number}</span>
                        <div class="toc-content">
                            <span class="toc-title">${item.title}</span>
                            <span class="toc-desc">${item.desc}</span>
                        </div>
                    </a>`).join('\n                    ')}
                </nav>
            </section>

            <section class="tips">
                <h2>Dicas Rápidas</h2>
                <div class="tips-grid">
                    ${c.tips.map(tip => `<div class="tip-card">
                        <span class="tip-icon">${tip.icon}</span>
                        <div class="tip-content">
                            <strong>${tip.title}</strong>
                            <p>${tip.text}</p>
                        </div>
                    </div>`).join('\n                    ')}
                </div>
            </section>
        </article>`;
    
    return html;
}

// Regular page rendering
function renderRegularPage(page) {
    const title = page.pageTitle || page.title;
    
    let html = `
        <article class="content">
            <h1>${title}</h1>`;
    
    // Highlight box at top
    if (page.highlightBox) {
        html += `
            <div class="info-box highlight">
                <p>${page.highlightBox}</p>
            </div>`;
    }
    
    // Intro paragraph
    if (page.intro) {
        html += `
            <section class="intro">
                <p>${page.intro}</p>
            </section>`;
    }
    
    // Sections
    if (page.sections) {
        html += page.sections.map(s => renderSection(s)).join('');
    }
    
    // Warning box at bottom
    if (page.warningBox) {
        html += `
            <div class="info-box">
                <p>${page.warningBox}</p>
            </div>`;
    }
    
    // Tips section
    if (page.tips) {
        html += `
            <section class="tips">
                <h2>Dicas</h2>
                <div class="tips-grid">
                    ${page.tips.map(tip => `<div class="tip-card">
                        <span class="tip-icon">${tip.icon}</span>
                        <div class="tip-content">
                            <strong>${tip.title}</strong>
                            <p>${tip.text}</p>
                        </div>
                    </div>`).join('\n                    ')}
                </div>
            </section>`;
    }
    
    // Page navigation
    html += htmlPageNav(page);
    
    html += '\n        </article>';
    return html;
}

// Generate full page HTML
function generatePage(page, isSubpage = false) {
    const content = page.isIndex ? renderIndexPage(page) : renderRegularPage(page);
    
    return `${htmlHead(page, isSubpage)}
<body>
${htmlHeader()}

    <main class="main">
${htmlBreadcrumb(page)}
${content}
    </main>
${htmlFooter()}
</body>
</html>`;
}

// Main build function
function buildManual() {
    console.log('Building manual pages...');
    
    // Track generated files for cleanup
    const generatedDirs = [];
    
    for (const page of pages) {
        const isIndex = page.slug === 'index';
        const html = generatePage(page, !isIndex);
        
        let outputPath;
        if (isIndex) {
            outputPath = join(MANUAL_DIR, 'index.html');
        } else {
            const pageDir = join(MANUAL_DIR, page.slug);
            if (!existsSync(pageDir)) {
                mkdirSync(pageDir, { recursive: true });
            }
            generatedDirs.push(pageDir);
            outputPath = join(pageDir, 'index.html');
        }
        
        writeFileSync(outputPath, html, 'utf-8');
        console.log(`  Generated: ${outputPath.replace(ROOT, '')}`);
    }
    
    console.log(`\nDone! Generated ${pages.length} pages.`);
}

// Run
buildManual();
