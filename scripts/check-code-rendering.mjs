/**
 * Check that code blocks render exactly as they were written.
 *
 * ## Why this exists
 *
 * The shell template used to indent the whole page body to match its own nesting. That is invisible in
 * prose, but the whitespace lands inside `<pre>`, which the browser preserves, so every code block
 * rendered with its first line flush and all the rest pushed right. The bug survived a build, three
 * checkers and a read-through, because nothing compared the rendered block against the source.
 *
 * So this compares them. For each page, the fenced blocks in the markdown are read in order and checked
 * against the `<pre>` blocks in the built page: same count, same first line, and the same amount of
 * leading whitespace on every line. A block that gained or lost indentation fails by name.
 *
 * Runs after the build, because that is the only point where both halves exist.
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const distDir = join(root, 'dist');

/** Every fenced code block in a markdown file, in order. */
function fencedBlocks(markdown) {
  const blocks = [];
  const pattern = /^[ \t]*```[^\n]*\r?\n([\s\S]*?)^[ \t]*```[ \t]*$/gm;
  let match = pattern.exec(markdown);
  while (match !== null) {
    blocks.push(match[1].replace(/\n$/, ''));
    match = pattern.exec(markdown);
  }
  return blocks;
}

/** Every rendered code block in a page, as plain text. */
function renderedBlocks(html) {
  const blocks = [];
  const pattern = /<pre class="code-block">([\s\S]*?)<\/pre>/g;
  let match = pattern.exec(html);
  while (match !== null) {
    const text = match[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
    blocks.push(text.replace(/^\n/, '').replace(/\n$/, ''));
    match = pattern.exec(html);
  }
  return blocks;
}

/** The leading whitespace of each line, so an indentation difference is caught without diffing text. */
function leadingWhitespace(text) {
  return text.split('\n').map((line) => line.match(/^[ \t]*/)[0].length);
}

for (const name of ['index.md']) {
  if (!existsSync(join(contentDir, name))) console.error(`  content/${name} is missing, so the landing page cannot be checked`);
}

async function main() {
  if (!existsSync(distDir)) {
    throw new Error('check:code: dist/ is missing. Run `npm run build` first.');
  }

  const files = (await readdir(contentDir)).filter((name) => name.endsWith('.md')).sort();
  const problems = [];
  let compared = 0;

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const builtPath = join(distDir, `${slug}.html`);
    if (!existsSync(builtPath)) {
      problems.push(`${file}: dist/${slug}.html was not built`);
      continue;
    }

    const expected = fencedBlocks(await readFile(join(contentDir, file), 'utf8'));
    if (expected.length === 0) continue;
    const rendered = renderedBlocks(await readFile(builtPath, 'utf8'));

    if (rendered.length !== expected.length) {
      problems.push(`${file}: ${expected.length} fenced block(s) in the source, ${rendered.length} in the page`);
      continue;
    }

    for (let index = 0; index < expected.length; index += 1) {
      const before = leadingWhitespace(expected[index]);
      const after = leadingWhitespace(rendered[index]);
      const firstExpected = expected[index].split('\n')[0];
      const firstRendered = rendered[index].split('\n')[0];

      if (firstRendered !== firstExpected) {
        problems.push(
          `${file} block ${index + 1}: first line differs\n      source:   ${JSON.stringify(firstExpected)}\n      rendered: ${JSON.stringify(firstRendered)}`,
        );
        continue;
      }
      if (before.join(',') !== after.join(',')) {
        problems.push(
          `${file} block ${index + 1}: indentation changed\n      source:   [${before.join(', ')}]\n      rendered: [${after.join(', ')}]`,
        );
        continue;
      }
      compared += 1;
    }
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(`  ${problem}`);
    throw new Error(`check:code: ${problems.length} code block problem(s).`);
  }

  console.log(`check:code: ${compared} code blocks render as written.`);
}

await main();
