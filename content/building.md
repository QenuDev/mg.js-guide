# Building your userscript

A userscript is one file with no imports, because the manager evaluates it as a plain script. Bundle your mod into a single file and put the metadata block at the top of it.

## The build script

```bash
npm install --save-dev esbuild tsx
```

```ts
import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const pkg = JSON.parse(await readFile('package.json', 'utf8')) as { version: string };

const banner = `// ==UserScript==
// @name         My mod
// @namespace    https://github.com/you/my-mod
// @version      ${pkg.version}
// @match        https://magicgarden.gg/*
// @run-at       document-start
// @grant        unsafeWindow
// @downloadURL  https://github.com/you/my-mod/releases/latest/download/my-mod.user.js
// @updateURL    https://github.com/you/my-mod/releases/latest/download/my-mod.user.js
// ==/UserScript==
`;

await build({
  entryPoints: ['src/main.ts'],
  outfile: 'dist/my-mod.user.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  minify: false,
  sourcemap: false,
  banner: { js: banner },
  legalComments: 'none',
});

console.log('built dist/my-mod.user.js');
```

```json
{
  "scripts": {
    "build": "tsx scripts/build.ts"
  },
  "devDependencies": {
    "esbuild": "^0.25.0",
    "tsx": "^4.19.0"
  }
}
```

## Why each setting

| Setting | Why |
|---|---|
| `bundle: true` | The file must contain the library. A userscript cannot import. |
| `format: 'iife'` | Wraps everything in one function, so your names cannot collide with the game's. |
| `banner` | Puts the metadata block at the very top. See below. |
| `minify: false` | The bundle is what you debug in devtools; mangled names cost more than the bytes save. |
| `sourcemap: false` | A userscript has nowhere to put a map file. |

Use the `banner` option rather than writing `metadata + code` yourself. The bundler also emits `"use strict"` and the IIFE opening above your code, and a prepend that happens to be right today lands in the wrong place the moment the bundler changes what it emits. A banner is placed by the bundler, so it stays first.

## Check the output

```bash
stat -c%s dist/my-mod.user.js
head -20 dist/my-mod.user.js
```

The first line must be `// ==UserScript==`. The size should be a few hundred KiB, because the bundle carries the whole library. Tens of KiB means the library did not make it in.

Install the file in Tampermonkey and load the game. If nothing happens, [When it does not work](debugging.md) has the checklist.

Next: [The metadata block](userscript-metadata.md).
