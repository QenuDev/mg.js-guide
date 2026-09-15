/**
 * Check the built site for links that go nowhere.
 *
 * ## Why this runs on `dist/` and not on `content/`
 *
 * The interesting failures only exist after rendering: a `#anchor` that points at a heading whose slug
 * changed, a page that was renamed in `guide.config.mjs` while a page body still links to the old name,
 * an asset the shell references that the build forgot to copy. Checking the rendered output tests what a
 * reader's browser actually loads.
 *
 * ## Two link kinds
 *
 * `page.html#anchor` is checked against the ids in that page. A bare `#anchor` is checked against the ids
 * in the page it appears on. Anything with a scheme is skipped: this script cannot verify that a remote
 * URL still resolves, and claiming to would be worse than saying nothing.
 */

import { readFile, readdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');

/**
 * The same base the build wrote its links with, normalised to `/segment/` or `/`.
 *
 * A hosted build runs with `SITE_BASE=/<repo>/`, so the shell emits `/mg.js-guide/index.html`, while the
 * file on disk is still `dist/index.html`. Stripping just the leading slash leaves the base segment glued
 * to the filename, which is a link that can never resolve, so the prefix has to come off as well. This has
 * to read the same variable the build read, or it checks a site that was not built.
 */
const SITE_BASE = normalizeBase(process.env.SITE_BASE ?? recordedBase());

/**
 * The base the current `dist/` was built with, as recorded by the build.
 *
 * The environment is the first choice, because a caller who sets `SITE_BASE` explicitly means it. When it
 * is absent, which is the case in CI for the check step, the recorded value is the only way to know what
 * the links in `dist/` actually say.
 */
function recordedBase() {
  try {
    return readFileSync(join(distDir, '.build-base'), 'utf8');
  } catch {
    return '/';
  }
}

function normalizeBase(value) {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '/') return '/';
  return `/${trimmed.replace(/^\/+/, '').replace(/\/+$/, '')}/`;
}

/**
 * A link target as a path under `dist/`.
 *
 * Removes the site base, because the base is where the output is hosted rather than part of the file
 * name, and then the leading slash. A target that carries some other root segment is left alone, so it
 * still fails the existence check rather than being silently rewritten into a passing one.
 */
function localPathOf(target) {
  let path = target;
  if (path.startsWith(SITE_BASE)) path = path.slice(SITE_BASE.length);
  return path.replace(/^\//, '');
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function collectIds(html) {
  const ids = new Set();
  const pattern = /\sid="([^"]+)"/g;
  let match = pattern.exec(html);
  while (match !== null) {
    ids.add(match[1]);
    match = pattern.exec(html);
  }
  return ids;
}

async function main() {
  if (!existsSync(distDir)) {
    throw new Error('check:links: dist/ is missing. Run `npm run build` first.');
  }

  const files = (await readdir(distDir)).filter((name) => name.endsWith('.html')).sort();
  const pages = new Map();
  for (const file of files) {
    pages.set(file, await readFile(join(distDir, file), 'utf8'));
  }

  const problems = [];

  for (const [file, html] of pages) {
    const ids = collectIds(html);

    for (const asset of ['style.css', 'guide.js', 'lunr.js']) {
      if (!html.includes(asset)) continue;
      if (!existsSync(join(distDir, asset)))
        problems.push(`${file}: the shell loads ${asset}, which was not built`);
    }

    const linkPattern = /<a\s[^>]*href="([^"]+)"[^>]*>/g;
    let match = linkPattern.exec(html);
    while (match !== null) {
      const href = decodeEntities(match[1]);
      if (/^(https?:|mailto:|#?$)/.test(href)) {
        match = linkPattern.exec(html);
        continue;
      }
      if (href.startsWith('#')) {
        const anchor = decodeURIComponent(href.slice(1));
        if (anchor !== '' && !ids.has(anchor)) problems.push(`${file}: link to #${anchor}, which is not on this page`);
        match = linkPattern.exec(html);
        continue;
      }
      const [target, anchor] = href.split('#');
      // The shell writes links as `<base><file>`, so a hosted build produces `/mg.js-guide/page.html`
      // while a local one produces `/page.html`. Both address the same file under dist/ once the base
      // prefix and the leading slash come off.
      const local = localPathOf(target);
      const targetFile =
        local.endsWith('.html') || local.includes('.') ? local : `${local}.html`;
      if (!pages.has(targetFile)) {
        problems.push(`${file}: link to ${href}, and dist/${targetFile} does not exist`);
      } else if (anchor !== undefined && anchor !== '') {
        const targetIds = collectIds(pages.get(targetFile));
        if (!targetIds.has(decodeURIComponent(anchor))) {
          problems.push(`${file}: link to ${href}, and #${anchor} is not in ${targetFile}`);
        }
      }
      match = linkPattern.exec(html);
    }

    const imagePattern = /<img\s[^>]*src="([^"]+)"/g;
    let image = imagePattern.exec(html);
    while (image !== null) {
      const src = decodeEntities(image[1]);
      if (!/^https?:/.test(src) && !existsSync(join(distDir, localPathOf(src)))) {
        problems.push(`${file}: image ${src} was not built`);
      }
      image = imagePattern.exec(html);
    }
  }

  if (problems.length > 0) {
    for (const problem of problems.slice(0, 60)) console.error(`  ${problem}`);
    if (problems.length > 60) console.error(`  ... and ${problems.length - 60} more`);
    throw new Error(`check:links: ${problems.length} broken link(s) across ${files.length} pages.`);
  }

  console.log(`check:links: ${files.length} pages, no broken links.`);
}

await main();
