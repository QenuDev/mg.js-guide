/**
 * A small tokenizer for the languages the guide quotes.
 *
 * ## Why not a real highlighter
 *
 * A full TextMate highlighter (shiki) would colour these snippets slightly better and cost a WASM
 * grammar engine plus a grammar file per language, packed into the build. The guide quotes TypeScript,
 * Bash, HTML and JSON, none of them with exotic syntax, and it never highlights at runtime. One ordered
 * regex is enough to make the snippets readable, keeps the build's dependency list at markdown-it plus
 * lunr, and cannot break when a grammar file changes shape.
 *
 * ## How it works
 *
 * One alternation, tried in order at each position, so the first matching branch wins. That ordering is
 * the whole correctness story: a comment is tried before punctuation, a string before a comment, and a
 * template literal before a division sign. Anything not matched is emitted as plain text, so an
 * unfamiliar construct comes out unstyled instead of mangled.
 */

const TOKEN = new RegExp(
  [
    // Comments first: they may contain quotes and brackets that would otherwise open a token.
    '(?<comment>\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)',
    // Template literals, with `${...}` treated as one stretch of code. Nested braces and nested
    // templates inside those braces are not tracked, which is why the body is deliberately greedy.
    '(?<template>`(?:\\\\[\\s\\S]|[^`\\\\])*`)',
    '(?<string>\'(?:\\\\[\\s\\S]|[^\'\\\\\\n])*\'|"(?:\\\\[\\s\\S]|[^"\\\\\\n])*")',
    '(?<number>\\b\\d[\\d_]*(?:\\.\\d+)?(?:n\\b)?)',
    // Keywords and built-in types, only when they stand alone rather than inside a longer identifier.
    '(?<keyword>\\b(?:await|async|break|case|catch|class|const|continue|declare|default|delete|do|else|enum|export|extends|false|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|private|protected|public|readonly|return|satisfies|set|static|super|switch|this|throw|true|try|type|typeof|undefined|var|void|while|yield)\\b)',
    '(?<type>\\b(?:any|bigint|boolean|never|number|object|string|symbol|unknown|Array|Boolean|Date|Error|JSON|Map|Math|Number|Object|Promise|Record|RegExp|Set|String|WeakMap|WeakSet|console|document|process|window)\\b)',
    '(?<fn>\\b[A-Za-z_$][\\w$]*(?=\\())',
    '(?<punct>[{}()\\[\\];,.?:=+\\-*/%<>!&|^~@]+)',
  ].join('|'),
  'g',
);

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

/** Escape the three characters that would otherwise be read as markup. Idempotent. */
export function escapeHtml(text) {
  return text.replace(/[&<>]/g, (character) => ESCAPES[character]);
}

/**
 * Wrap one line of code in classed spans.
 *
 * The input is raw source, not escaped text, so the string branches can match the real quote characters.
 * Escaping happens per emitted piece, which keeps source and output in one pass.
 *
 * @param {string} line
 * @returns {string}
 */
function highlightLine(line) {
  let out = '';
  let last = 0;
  TOKEN.lastIndex = 0;
  let match = TOKEN.exec(line);
  while (match !== null) {
    if (match.index > last) out += escapeHtml(line.slice(last, match.index));
    const groups = match.groups ?? {};
    const kind = Object.keys(groups).find((name) => groups[name] !== undefined);
    out +=
      kind === undefined
        ? escapeHtml(match[0])
        : `<span class="tok-${kind}">${escapeHtml(match[0])}</span>`;
    last = match.index + match[0].length;
    match = TOKEN.exec(line);
  }
  return out + escapeHtml(line.slice(last));
}

/**
 * Highlight a whole block.
 *
 * @param {string} code
 * @param {string} lang Language tag from the fence. Anything unrecognised is tokenized the same way,
 *   because the tokenizer is generic and an unknown tag is more likely to be a typo than a new language.
 * @returns {string}
 */
export function highlight(code, lang = 'typescript') {
  const normalized = code.replace(/\r\n?/g, '\n');
  if (lang === 'text' || lang === 'output') return escapeHtml(normalized);
  return normalized
    .split('\n')
    .map((line) => highlightLine(line))
    .join('\n');
}
