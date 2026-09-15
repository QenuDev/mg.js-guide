# The metadata block

The metadata block is the comment at the top of a userscript that the manager reads. Seven fields decide whether your mod installs, when it runs, and whether it can ever be updated.

```js
// ==UserScript==
// @name         My mod
// @namespace    https://github.com/you/my-mod
// @version      0.1.0
// @match        https://magicgarden.gg/*
// @run-at       document-start
// @grant        unsafeWindow
// @downloadURL  https://github.com/you/my-mod/releases/latest/download/my-mod.user.js
// @updateURL    https://github.com/you/my-mod/releases/latest/download/my-mod.user.js
// ==/UserScript==
```

| Field | What it does |
|---|---|
| `@name` | The name shown in the manager's list. Part of the script's identity. |
| `@namespace` | A URL you choose that groups your scripts. Also part of the identity. |
| `@version` | The installed version. Read `package.json` for it rather than typing it, so the two cannot disagree. |
| `@match` | The pages the script runs on. `https://magicgarden.gg/*` is what you want. |
| `@run-at` | When the script runs. Must be `document-start`, or the client attaches to a connection that already exists. |
| `@grant` | Extra APIs. `unsafeWindow` is required. |
| `@downloadURL` / `@updateURL` | Where the manager looks for a newer version. Usually the same URL. |

## Two fields never change after your first release

`@name` and `@namespace` together are how the manager identifies an installed script. Change either one and the manager does not see an update: it installs a second script, and the first one stays behind at its old version. Pick both before you release, even if you release privately to yourself first.

## `@grant unsafeWindow` is required

Without it the manager runs your script in a sandbox with its own `window`, so every hook the client installs goes onto a window the game never touches. Your mod then finds no connection and reads nothing.

```js
// @grant        unsafeWindow
```

If you also want settings saved through the manager's own store, add:

```js
// @grant        GM_getValue
// @grant        GM_setValue
```

That is optional. Without it, `createStorage()` falls back to `localStorage`, which works but is cleared with the site's data. See [Saving settings](storage.md).

## `@downloadURL` points at your own release

Both URLs must be absolute and must name a file that exists at that path once you have published. `releases/latest/download/<file>` resolves to the newest release that has an asset by that name, which is why the basename matters. [Releasing and updates](releasing.md) covers the other half.

Next: [Releasing and updates](releasing.md).
