# Setup

Install the in-page client:

```bash
npm install @mg.js/bootstrapped
```

Node 22 or newer. The packages are ESM, so your project needs `"type": "module"`.

`@mg.js/bootstrapped` depends on `@mg.js/common`, so one install brings both. You import from `@mg.js/common` for its helpers, and unlike the example mod, which declares it, you do not have to put it in your own `dependencies`. Declaring it is still a reasonable way to pin the version you tested against.

## The whole mod

One file is enough while you are developing. `tsx` runs it directly, so there is no build step yet.

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

console.log('connected as', client.selfPlayerId);
```

```json
{
  "name": "mg-mod",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/main.ts"
  },
  "dependencies": {
    "@mg.js/bootstrapped": "^0.1.3"
  },
  "devDependencies": {
    "tsx": "^4.19.0"
  }
}
```

To try it, load the file into a page that already has the game open. The quickest way while developing is the Tampermonkey editor: paste the file in, with a metadata block above it, and the game reloads onto your script. [Building your userscript](building.md) turns the same file into something you can install and share.

## The four lines that matter

- `new BootstrappedClient()` takes an options object, and every field in it is optional.
- `start()` installs the hooks and returns. It does not wait for the game.
- `waitForAttachment()` is the call that waits, and it is the one you `await` before reading anything.
- `stop()` releases everything. Call it when your mod is done, or a second reload of your script leaves two clients behind.

`client.isReady` is `false` until the first state arrives. Reads before that return `undefined`, so wait for `waitForAttachment()` or subscribe with `fireImmediately` rather than reading straight after `start()`.

## Run it at the right time

The client has to install its hooks before the game opens its connection, so a userscript needs `@run-at document-start`. A script that starts later attaches to less or to nothing. [The metadata block](userscript-metadata.md) has the fields.

Next: [Reading game state](reading-state.md).
