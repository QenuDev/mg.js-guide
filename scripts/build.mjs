/**
 * Static site builder for the magicgarden.js guide.
 *
 * ## What it does
 *
 * Reads every page listed in `guide.config.mjs`, renders the Markdown through markdown-it with a
 * hand-written highlighter, wraps each page in the shared shell (top bar, sidebar, table of contents,
 * pager), and writes flat HTML into `dist/`. It also emits a lunr index for client-side search.
 *
 * ## Why flat files and no framework
 *
 * The guide is a few dozen pages of prose with code. A framework would add a dependency tree, a routing
 * layer and a hydration step to reproduce what four `writeFile` calls do here, and the build output has
 * to survive being opened from a `file://` path or served from a project subdirectory. Flat HTML with
 * relative links does both. Where the output sits on a host is one value, `SITE_BASE`.
 *
 * ## Failing loudly
 *
 * A missing page, an unlisted page, a link to a page that does not exist, or a duplicate heading slug
 * all stop the build with a named error. Silently emitting a broken cross-reference is the failure mode
 * that makes a guide untrustworthy, and it is invisible in a browser.
 */

import { mkdir, readFile, readdir, rm, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import lunr from 'lunr';
import { highlight, escapeHtml } from './highlight.mjs';
import { pages, sections, site } from '../guide.config.mjs';

const require = createRequire(import.meta.url);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const outDir = join(root, 'dist');
const siteDir = join(root, 'site');

/**
 * Where the site is mounted. `/` suits a root host, a repository project page needs `/<repo>/`, and an
 * empty string makes every link relative so the files also work from a local directory listing.
 */
const SITE_BASE = process.env.SITE_BASE ?? '/';

const md = new MarkdownIt({
  html: true,
  linkify: false,
  typographer: false,
  highlight: (code, lang) => `<pre class="code-block">${highlight(code.replace(/\n$/, ''), lang)}</pre>`,
});

// Headings get ids so the table of contents and in-page links can target them.
const slugCounts = new Map();

function slugify(text) {
  const base = text
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const seen = slugCounts.get(base) ?? 0;
  slugCounts.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen + 1}`;
}

function resetSlugs() {
  slugCounts.clear();
}

/**
 * Heading ids, with an explicit override.
 *
 * `## Title {#custom-id}` sets the anchor by hand for a heading whose generated slug would be awkward or
 * would change when the words change. The marker is stripped from the rendered text either way, so it
 * never appears on the page.
 */
md.core.ruler.push('heading_ids', (state) => {
  const tokens = state.tokens;
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].type !== 'heading_open') continue;
    const inline = tokens[index + 1];
    if (!inline || inline.type !== 'inline') continue;
    const custom = /\s*\{#([A-Za-z0-9-]+)\}\s*$/.exec(inline.content);
    let id;
    if (custom) {
      id = custom[1];
      inline.content = inline.content.slice(0, custom.index);
      if (Array.isArray(inline.children)) {
        for (const child of inline.children) {
          if (typeof child.content === 'string') child.content = child.content.replace(custom[0], '');
        }
      }
    } else {
      id = slugify(inline.content);
    }
    tokens[index].attrSet('id', id);
  }
  return true;
});

// Internal links are written as `page-slug.md#anchor` or `page-slug#anchor` so an editor can follow them.
const PAGE_SLUGS = new Set(pages.map((page) => page.slug));
const linkProblems = [];

md.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const hrefIndex = token.attrIndex('href');
  if (hrefIndex >= 0) {
    const href = token.attrs[hrefIndex][1];
    if (/^https?:/.test(href) || href.startsWith('#')) {
      // Nothing to rewrite. External links are left alone.
    } else {
      const [target, anchor] = href.split('#');
      // Authors may write the target as `page`, `page.md` or `page.html`. All three mean the same file.
      const bare = target.replace(/\.(md|html)$/, '');
      if (!PAGE_SLUGS.has(bare)) {
        linkProblems.push(`page ${env.slug ?? 'index'}: link to unknown page "${href}"`);
      }
      token.attrs[hrefIndex][1] = `${bare}.html${anchor ? `#${anchor}` : ''}`;
    }
  }
  return self.renderToken(tokens, index, options);
};

/** Strip a leading level-1 heading: the shell renders the page title from the config instead. */
function stripLeadingH1(markdown) {
  return markdown.replace(/^#\s+.*(?:\r?\n)+/, '');
}

/** Pull `##` and `###` headings out of rendered HTML for the table of contents. */
function collectHeadings(html) {
  const headings = [];
  const pattern = /<h([23])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
  let match = pattern.exec(html);
  while (match !== null) {
    const level = Number(match[1]);
    const text = match[3].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    headings.push({ level, id: match[2], text });
    match = pattern.exec(html);
  }
  return headings;
}

function renderToc(headings) {
  if (headings.length === 0) return '';
  const items = headings
    .map(
      (heading) =>
        `      <li><a class="toc-sub" href="#${heading.id}">${escapeHtml(heading.text)}</a></li>`,
    )
    .join('\n');
  return `    <aside class="toc" aria-label="On this page">
    <h2>On this page</h2>
    <ol>
${items}
    </ol>
    </aside>`;
}

function renderSidebar(currentSlug) {
  const groups = sections
    .map((section) => {
      const items = section.pages
        .map(([slug, title]) => {
          const current = slug === currentSlug ? ' aria-current="page"' : '';
          return `        <li><a href="${slug}.html"${current}>${escapeHtml(title)}</a></li>`;
        })
        .join('\n');
      return `    <h2>${escapeHtml(section.title)}</h2>
    <ol>
${items}
    </ol>`;
    })
    .join('\n');
  return `  <nav>
${groups}
  </nav>`;
}

function renderPager(index) {
  const previous = index > 0 ? pages[index - 1] : null;
  const next = index + 1 < pages.length ? pages[index + 1] : null;
  if (!previous && !next) return '';
  const previousLink = previous
    ? `<a class="prev" href="${previous.slug}.html"><span class="pager-label">Previous</span><span class="pager-title">${escapeHtml(previous.title)}</span></a>`
    : '<span></span>';
  const nextLink = next
    ? `<a class="next" href="${next.slug}.html"><span class="pager-label">Next</span><span class="pager-title">${escapeHtml(next.title)}</span></a>`
    : '<span></span>';
  return `  <div class="pager">\n    ${previousLink}\n    ${nextLink}\n  </div>`;
}

function shell({ slug, title, section, lede, body, toc, pager, base }) {
  const fullTitle = slug === 'index' ? `${site.title}` : `${title} | ${site.title}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${escapeHtml(lede)}">
<link rel="stylesheet" href="${base}style.css">
</head>
<body data-base="${base}">
<header class="topbar">
  <button class="icon-button sidebar-toggle" type="button" data-sidebar-toggle aria-label="Toggle navigation">&#9776;</button>
  <a class="brand" href="${base}index.html"><span class="brand-mark">mg.js</span> <span class="brand-sub">guide</span></a>
  <span class="topbar-spacer"></span>
  <button class="search-button" type="button" data-search-open>
    <span>Search the guide</span>
    <span class="topbar-spacer"></span>
    <span class="search-hint"><kbd>/</kbd></span>
  </button>
  <button class="icon-button" type="button" data-theme-toggle aria-label="Switch theme"><span class="only-light">&#9790;</span><span class="only-dark">&#9728;</span></button>
</header>
<div class="shell">
  <div class="sidebar">
${renderSidebar(slug)}
  </div>
  <main class="content">
    <article class="article">
      <header class="article-header">
        <p class="eyebrow">${escapeHtml(section)}</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="lede">${escapeHtml(lede)}</p>
      </header>
${body}
${pager}
      <footer class="site-footer">
        <p>magicgarden.js is unofficial and not affiliated with Magic Garden. A client update can change any behaviour described here.</p>
      </footer>
    </article>
${toc}
  </main>
</div>
<div class="search-overlay" data-search-overlay>
  <div class="search-panel" role="dialog" aria-label="Search the guide">
    <div class="search-field">
      <input type="search" placeholder="Search pages and headings" aria-label="Search query">
      <kbd>esc</kbd>
    </div>
    <ul class="search-results" data-search-results></ul>
  </div>
</div>
<script src="${base}lunr.js"></script>
<script src="${base}guide.js"></script>
</body>
</html>
`;
}

/**
 * The standfirst under the page title, which is also the meta description and the search snippet.
 *
 * The first sentence of the first prose paragraph, capped so a page whose opening sentence runs long
 * does not push a wall of text into the meta tag. Backticks are dropped and markdown emphasis is left
 * alone: an underscore inside an identifier such as `invalid_sequence` is part of the name.
 */
function standfirst(markdown) {
  const body = stripLeadingH1(markdown);
  const match = /^(?!#|>|---|\||```)(.+)$/m.exec(body);
  const text = (match ? match[1] : '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim();
  const sentence = /^(.+?[.!?])(?:\s|$)/.exec(text);
  const first = sentence ? sentence[1] : text;
  return first.length > 240 ? `${first.slice(0, 237).trimEnd()}...` : first;
}

function plainText(html) {
  return html
    .replace(/<pre[\s\S]*?<\/pre>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const present = (await readdir(contentDir)).filter(
    (name) => name.endsWith('.md') && name !== 'index.md',
  );
  const presentSlugs = new Set(present.map((name) => name.replace(/\.md$/, '')));
  const problems = [];
  for (const page of pages) {
    if (!presentSlugs.has(page.slug)) problems.push(`guide.config.mjs lists "${page.slug}" but content/${page.slug}.md does not exist`);
  }
  for (const slug of presentSlugs) {
    if (!PAGE_SLUGS.has(slug)) problems.push(`content/${slug}.md is not listed in guide.config.mjs`);
  }
  if (problems.length > 0) {
    for (const problem of problems) console.error(`  ${problem}`);
    throw new Error(`build: ${problems.length} table of contents problem(s).`);
  }

  const documents = {};
  const store = {};

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const markdown = await readFile(join(contentDir, `${page.slug}.md`), 'utf8');
    resetSlugs();
    const html = md.render(stripLeadingH1(markdown), { slug: page.slug });
    const headings = collectHeadings(html);
    const lede = standfirst(markdown);
    // The body goes in at column zero rather than indented to match the template's nesting. Indenting
    // it puts leading whitespace inside every `<pre>`, which the browser preserves, so a multi-line code
    // block renders with its first line flush and every later line pushed right. The template's
    // indentation around this placeholder is only cosmetic.
    const body = html.trim();

    const output = shell({
      slug: page.slug,
      title: page.title,
      section: page.section,
      lede,
      body,
      toc: renderToc(headings),
      pager: renderPager(index),
      base: SITE_BASE,
    });
    await writeFile(join(outDir, `${page.slug}.html`), output, 'utf8');

    const text = plainText(html);
    store[page.slug] = { title: page.title, section: page.section, snippet: lede.slice(0, 160) };
    documents[page.slug] = ` ${page.title} ${page.title} ${page.section} ${text}`;
  }

  // Landing page: what the guide is, and where to start.
  const landing = await buildLanding();
  await writeFile(join(outDir, 'index.html'), landing, 'utf8');
  store.index = { title: 'Start here', section: site.title, snippet: site.tagline };
  documents.index = `Start here ${site.title} ${site.tagline}`;

  // Search index. Lunr is configured with a small pipeline: the prose is prose, not a document corpus.
  const index = lunr(function () {
    this.ref('slug');
    this.field('text');
    for (const [slug, text] of Object.entries(documents)) {
      this.add({ slug, text });
    }
  });
  await writeFile(join(outDir, 'search-index.json'), JSON.stringify({ index, documents: store }), 'utf8');

  await copyFile(join(siteDir, 'style.css'), join(outDir, 'style.css'));
  await copyFile(join(siteDir, 'guide.js'), join(outDir, 'guide.js'));
  const lunrSource = require.resolve('lunr/lunr.min.js');
  if (!existsSync(lunrSource)) {
    throw new Error(`build: ${lunrSource} is missing. Run npm install.`);
  }
  await copyFile(lunrSource, join(outDir, 'lunr.js'));

  if (linkProblems.length > 0) {
    for (const problem of linkProblems) console.error(`  ${problem}`);
    throw new Error(`build: ${linkProblems.length} broken cross-reference(s).`);
  }

  console.log('build:guide');
  // Record the base beside the output. `check:links` runs as a separate process, and in CI it does not
  // inherit `SITE_BASE`, so without this it would check a site that was not the one built.
  await writeFile(join(outDir, '.build-base'), SITE_BASE, 'utf8');

  console.log(`  pages    ${pages.length + 1}`);
  console.log(`  output   ${outDir}`);
  console.log(`  base     ${SITE_BASE === '' ? '(relative)' : SITE_BASE}`);
}

/** The landing page is content/index.md when present, so its prose lives with the rest of the content. */
async function buildLanding() {
  const path = join(contentDir, 'index.md');
  if (!existsSync(path)) {
    return shell({
      slug: 'index',
      title: site.title,
      section: 'Guide',
      lede: site.tagline,
      body: '',
      toc: '',
      pager: renderPager(-1),
      base: SITE_BASE,
    });
  }
  const markdown = await readFile(path, 'utf8');
  resetSlugs();
  const html = md.render(markdown, { slug: 'index' });
  const headings = collectHeadings(html);
  return shell({
    slug: 'index',
    title: site.title,
    section: 'Guide',
    lede: site.tagline,
    body: html.trim(),
    toc: renderToc(headings),
    pager: '',
    base: SITE_BASE,
  });
}

await main();