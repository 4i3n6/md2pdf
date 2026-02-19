/**
 * Manual Page Generator - Bilingual Support
 * Generates static HTML pages from content.json for EN and PT
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Language configurations
const LANGUAGES = {
    en: {
        code: 'en',
        locale: 'en-US',
        dir: join(ROOT, 'manual'),
        contentFile: join(ROOT, 'manual', 'content.json'),
        basePath: '/manual/',
        appPath: '/app',
        homePath: '/',
        altLang: 'pt',
        altPath: '/pt/manual/',
        strings: {
            manual: 'Manual',
            home: 'Home',
            openApp: 'Open App',
            onThisPage: 'On this page',
            previous: 'Previous',
            next: 'Next',
            toc: 'Table of Contents',
            quickTips: 'Quick Tips',
            tips: 'Tips',
            shortcut: 'Shortcut',
            action: 'Action'
        }
    },
    pt: {
        code: 'pt',
        locale: 'pt-BR',
        dir: join(ROOT, 'pt', 'manual'),
        contentFile: join(ROOT, 'pt', 'manual', 'content.json'),
        basePath: '/pt/manual/',
        appPath: '/pt/app',
        homePath: '/pt/',
        altLang: 'en',
        altPath: '/manual/',
        strings: {
            manual: 'Manual',
            home: 'Início',
            openApp: 'Abrir App',
            onThisPage: 'Nesta página',
            previous: 'Anterior',
            next: 'Próximo',
            toc: 'Índice',
            quickTips: 'Dicas Rápidas',
            tips: 'Dicas',
            shortcut: 'Atalho',
            action: 'Ação'
        }
    }
};

// Template functions
function htmlHead(page, lang, isSubpage = false) {
    const cssPath = isSubpage ? '../manual.css' : './manual.css';
    const canonical = `https://md2pdf.xyz${lang.basePath}${page.slug === 'index' ? '' : page.slug + '/'}`;
    const altCanonical = `https://md2pdf.xyz${lang.altPath}${page.altSlug || (page.slug === 'index' ? '' : page.slug + '/')}`;

    return `<!DOCTYPE html>
<html lang="${lang.locale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${page.description}">
    <meta name="keywords" content="${page.keywords}">
    <meta name="author" content="MD2PDF">
    <title>${page.title} | MD2PDF</title>
    <link rel="canonical" href="${canonical}">
    <link rel="alternate" hreflang="${lang.code}" href="${canonical}">
    <link rel="alternate" hreflang="${lang.altLang}" href="${altCanonical}">
    <link rel="alternate" hreflang="x-default" href="https://md2pdf.xyz/manual/${page.slug === 'index' ? '' : page.slug + '/'}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="icon" href="/favicon.ico">
    <link rel="stylesheet" href="${cssPath}">
</head>`;
}

function htmlHeader(lang, site) {
    return `
    <header class="header">
        <div class="header-content">
            <a href="${lang.homePath}" class="logo">${site.title}</a>
            <span class="logo-subtitle">${lang.strings.manual}</span>
            <nav class="header-nav">
                <a href="${lang.homePath}">${lang.strings.home}</a>
                <a href="${lang.appPath}">${lang.strings.openApp}</a>
            </nav>
        </div>
    </header>`;
}

function htmlSidebar(currentSlug, navigation, lang) {
    const items = navigation.map(item => {
        const href = item.slug === 'index' ? lang.basePath : `${lang.basePath}${item.slug}/`;
        const activeClass = item.slug === currentSlug ? ' active' : '';
        return `<a href="${href}" class="sidebar-item${activeClass}">
                    <span class="sidebar-icon">${item.icon}</span>
                    <span class="sidebar-title">${item.title}</span>
                </a>`;
    }).join('\n                ');

    return `
        <aside class="sidebar">
            <nav class="sidebar-nav" aria-label="${lang.strings.manual}">
                ${items}
            </nav>
        </aside>`;
}

function htmlAnchors(anchors, lang) {
    if (!anchors || anchors.length === 0) return '';

    const items = anchors.map(a =>
        `<a href="#${a.id}" class="anchor-item">${a.title}</a>`
    ).join('\n                    ');

    return `
            <nav class="page-anchors" aria-label="${lang.strings.onThisPage}">
                <span class="anchors-title">${lang.strings.onThisPage}</span>
                <div class="anchors-list">
                    ${items}
                </div>
            </nav>`;
}

function htmlBreadcrumb(page, lang) {
    if (page.isIndex) {
        return `
            <nav class="breadcrumb" aria-label="Breadcrumb">
                <a href="${lang.homePath}">${lang.strings.home}</a>
                <span class="breadcrumb-separator">&gt;</span>
                <span class="breadcrumb-current">${lang.strings.manual}</span>
            </nav>`;
    }
    return `
            <nav class="breadcrumb" aria-label="Breadcrumb">
                <a href="${lang.homePath}">${lang.strings.home}</a>
                <span class="breadcrumb-separator">&gt;</span>
                <a href="${lang.basePath}">${lang.strings.manual}</a>
                <span class="breadcrumb-separator">&gt;</span>
                <span class="breadcrumb-current">${page.title}</span>
            </nav>`;
}

function htmlFooter(lang, site) {
    return `
    <footer class="footer">
        <div class="footer-content">
            <div class="footer-links">
                <a href="${lang.appPath}">${lang.strings.openApp}</a>
                <a href="${lang.basePath}">${lang.strings.manual}</a>
                <a href="${lang.homePath}">${lang.strings.home}</a>
            </div>
            <p class="footer-version">${site.title} <span>v${site.version}</span> | ${site.tagline}</p>
        </div>
    </footer>`;
}

function htmlPageNav(page, lang) {
    if (!page.prev && !page.next) return '';

    const prevSlug = page.prev?.slug === 'index' ? lang.basePath : `${lang.basePath}${page.prev?.slug}/`;
    const nextSlug = page.next?.slug === 'index' ? lang.basePath : `${lang.basePath}${page.next?.slug}/`;

    let nav = '\n            <nav class="page-nav">';

    if (page.prev) {
        nav += `
                <a href="${prevSlug}">
                    <span class="nav-arrow">&larr;</span>
                    <div class="nav-direction">
                        <span class="nav-label">${lang.strings.previous}</span>
                        <span class="nav-title">${page.prev.title}</span>
                    </div>
                </a>`;
    }

    if (page.next) {
        nav += `
                <a href="${nextSlug}">
                    <div class="nav-direction">
                        <span class="nav-label">${lang.strings.next}</span>
                        <span class="nav-title">${page.next.title}</span>
                    </div>
                    <span class="nav-arrow">&rarr;</span>
                </a>`;
    }

    nav += '\n            </nav>';
    return nav;
}

// Content rendering helpers
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

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

function renderShortcuts(shortcuts, lang) {
    return `
                <table class="shortcuts-table">
                    <thead>
                        <tr>
                            <th>${lang.strings.shortcut}</th>
                            <th>${lang.strings.action}</th>
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

function renderCodeExample(example) {
    const escapedCode = escapeHtml(example.code);
    return `
                <div class="code-example">
                    <pre><code>${escapedCode}</code></pre>
                    ${example.description ? `<p class="code-description">${example.description}</p>` : ''}
                </div>`;
}

function renderSection(section, lang) {
    const idAttr = section.id ? ` id="${section.id}"` : '';
    let html = `
            <section${idAttr}>
                <h2>${section.title}</h2>`;

    if (section.content) {
        html += section.content.map(p => `\n                <p>${p}</p>`).join('');
    }

    if (section.codeExample) {
        html += renderCodeExample(section.codeExample);
    }

    if (section.infoBox) {
        html += renderInfoBox(section.infoBox);
    }

    if (section.contentAfter) {
        html += section.contentAfter.map(p => `\n                <p>${p}</p>`).join('');
    }

    if (section.table) {
        html += renderTable(section.table);
    }

    if (section.infoBoxHighlight) {
        html += renderInfoBox(section.infoBoxHighlight, true);
    }

    if (section.steps) {
        html += renderSteps(section.steps);
    }

    if (section.list) {
        html += renderList(section.list);
    }

    if (section.shortcuts) {
        html += renderShortcuts(section.shortcuts, lang);
    }

    if (section.infoBoxes) {
        html += section.infoBoxes.map(box => renderInfoBox(box)).join('');
    }

    if (section.subsections) {
        for (const sub of section.subsections) {
            html += `\n                <h3>${sub.subtitle}</h3>`;
            if (sub.codeExample) {
                html += renderCodeExample(sub.codeExample);
            }
            if (sub.list) {
                html += renderList(sub.list);
            }
        }
    }

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

function renderIndexPage(page, lang) {
    const c = page.content;

    let html = `
            <h1>${page.title}</h1>
            
            <section class="intro">
                ${c.intro.map(p => `<p>${p}</p>`).join('\n                ')}
            </section>

            <section class="toc">
                <h2>${lang.strings.toc}</h2>
                <nav class="toc-list" aria-label="${lang.strings.toc}">
                    ${c.toc.map(item => `<a href="${lang.basePath}${item.slug}/" class="toc-item">
                        <span class="toc-number">${item.number}</span>
                        <div class="toc-content">
                            <span class="toc-title">${item.title}</span>
                            <span class="toc-desc">${item.desc}</span>
                        </div>
                    </a>`).join('\n                    ')}
                </nav>
            </section>

            <section class="tips">
                <h2>${lang.strings.quickTips}</h2>
                <div class="tips-grid">
                    ${c.tips.map(tip => `<div class="tip-card">
                        <span class="tip-icon">${tip.icon}</span>
                        <div class="tip-content">
                            <strong>${tip.title}</strong>
                            <p>${tip.text}</p>
                        </div>
                    </div>`).join('\n                    ')}
                </div>
            </section>`;

    return html;
}

function renderRegularPage(page, lang) {
    const title = page.pageTitle || page.title;

    let html = `
            <h1>${title}</h1>`;

    if (page.anchors) {
        html += htmlAnchors(page.anchors, lang);
    }

    if (page.highlightBox) {
        html += `
            <div class="info-box highlight">
                <p>${page.highlightBox}</p>
            </div>`;
    }

    if (page.intro) {
        html += `
            <section class="intro">
                <p>${page.intro}</p>
            </section>`;
    }

    if (page.sections) {
        html += page.sections.map(s => renderSection(s, lang)).join('');
    }

    if (page.warningBox) {
        html += `
            <div class="info-box">
                <p>${page.warningBox}</p>
            </div>`;
    }

    if (page.tips) {
        html += `
            <section class="tips">
                <h2>${lang.strings.tips}</h2>
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

    html += htmlPageNav(page, lang);

    return html;
}

function generatePage(page, lang, site, navigation, isSubpage = false) {
    const articleContent = page.isIndex ? renderIndexPage(page, lang) : renderRegularPage(page, lang);

    return `${htmlHead(page, lang, isSubpage)}
<body>
${htmlHeader(lang, site)}

    <div class="layout">
${htmlSidebar(page.slug, navigation, lang)}

        <main class="main">
${htmlBreadcrumb(page, lang)}

            <article class="content">
${articleContent}
            </article>
        </main>
    </div>
${htmlFooter(lang, site)}
</body>
</html>`;
}

function buildLanguage(langKey) {
    const lang = LANGUAGES[langKey];

    // Check if content file exists
    if (!existsSync(lang.contentFile)) {
        console.log(`  Skipping ${langKey}: No content.json found at ${lang.contentFile}`);
        return 0;
    }

    // Load content
    const content = JSON.parse(readFileSync(lang.contentFile, 'utf-8'));
    const { site, navigation, pages } = content;

    // Ensure output directory exists
    if (!existsSync(lang.dir)) {
        mkdirSync(lang.dir, { recursive: true });
    }

    // Copy CSS if not exists (for PT)
    const cssSource = join(ROOT, 'manual', 'manual.css');
    const cssDest = join(lang.dir, 'manual.css');
    if (existsSync(cssSource) && !existsSync(cssDest)) {
        copyFileSync(cssSource, cssDest);
        console.log(`  Copied: manual.css to ${langKey}`);
    }

    // Generate pages
    for (const page of pages) {
        const isIndex = page.slug === 'index';
        const html = generatePage(page, lang, site, navigation, !isIndex);

        let outputPath;
        if (isIndex) {
            outputPath = join(lang.dir, 'index.html');
        } else {
            const pageDir = join(lang.dir, page.slug);
            if (!existsSync(pageDir)) {
                mkdirSync(pageDir, { recursive: true });
            }
            outputPath = join(pageDir, 'index.html');
        }

        writeFileSync(outputPath, html, 'utf-8');
        console.log(`  Generated: ${outputPath.replace(ROOT, '')}`);
    }

    return pages.length;
}

// Main build function
function buildManual() {
    console.log('Building manual pages...');

    let totalPages = 0;

    // Build English (default)
    console.log('\n[EN] Building English manual...');
    totalPages += buildLanguage('en');

    // Build Portuguese
    console.log('\n[PT] Building Portuguese manual...');
    totalPages += buildLanguage('pt');

    console.log(`\nDone! Generated ${totalPages} total pages.`);
}

// Run
buildManual();
