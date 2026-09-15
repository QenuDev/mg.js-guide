# magicgarden.js guide

A task guide for building Magic Garden mods on the **magicgarden.js** packages, and for shipping them as
userscripts.

The library lives in two other repositories:

- [`QenuDev/MG.js`](https://github.com/QenuDev/MG.js) publishes `@mg.js/common`, `@mg.js/headless` and
  `@mg.js/bootstrapped`.
- [`QenuDev/bootstrapped-example`](https://github.com/QenuDev/bootstrapped-example) is one worked example
  userscript built on them.

This repository is the guide and nothing else. It contains no library code and is not published to npm.

## Scope

A page exists to get a mod written or to use one feature. How the library works inside belongs in its
design docs and the generated API reference, not here. If a page cannot answer "what do I type" or "why
did nothing happen", it does not belong in this repository.

## What is here

```
content/            one Markdown file per page, in reading order
guide.config.mjs    the table of contents: sections, pages, titles
scripts/            the build, the five checkers, and the action-table generator
site/               the shell: stylesheet and client script
.authoring/         the writing spec, and the generated action table
dist/               the built site (gitignored)
```

The built site is plain HTML, CSS and JavaScript. There is no framework and no runtime dependency: the
pages are static and the only fetch is the search index.

## Build and preview

```bash
npm install
npm run build        # writes dist/
npm run serve        # http://127.0.0.1:4173
```

`SITE_BASE` controls the link prefix, for a host that serves the site from a subdirectory:

```bash
SITE_BASE=/mg.js-guide/ npm run build
```

An empty `SITE_BASE` makes every link relative, which also works by opening `dist/index.html` directly.
Search needs HTTP, because the browser blocks the index fetch from a `file://` path.

## The checks

```bash
npm run verify
```

That runs five gates in order:

| Gate | What it catches |
|---|---|
| `check:snippets` | Every `ts` fence compiled against the real packages. A name that does not exist, or a call with the wrong arguments, fails here. |
| `build` | A page in the config with no file, a file with no config entry, and a cross-reference to a slug that does not exist. |
| `check:code` | A code block whose leading whitespace changed between the Markdown and the page. That is what a `<pre>` indented by the template looks like, and it is invisible in prose. |
| `check:links` | Broken in-page anchors, missing assets, and links between built pages. |

The snippet check compiles each fence as its own module, with its own imports. Where `@mg.js/*` resolves
depends on what is on disk:

- **A sibling checkout** at `../mg.js/packages` is preferred, so snippets are checked against the package
  source. `MG_PACKAGES` points somewhere else if the checkout is not a sibling.
- **The installed packages** in `node_modules` are the fallback, checked through their declarations. That
  is what a standalone clone gets, and it checks the released version.

Either way, a snippet that imports something a package does not export fails rather than typing as `any`.

The action table is generated rather than hand-copied:

```bash
npm run gen:actions   # regenerates content/action-list.md from the packages
```

## Adding a page

1. Add `['your-slug', 'Your title']` to the right section in `guide.config.mjs`.
2. Create `content/your-slug.md`, starting with a single `#` heading whose text matches the title.
3. Run `npm run verify`.

Cross-references are written as `[text](other-page.md)`. The build rewrites them to `.html` and fails on a
slug that does not exist.

`.authoring/spec.md` is the contract for anyone writing a page: the voice rules, the banned vocabulary,
and the sentence-level failures a word list misses.

## Licence

MIT. magicgarden.js is unofficial and not affiliated with Magic Garden.
