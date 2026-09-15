# When it does not work

Most problems are one of five things. Check them in this order.

## 1. Is the client attached?

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

console.log('attachment:', client.attachmentKind);
console.log('ready:', client.isReady);
console.log('player id:', client.selfPlayerId);
console.log('state version:', client.state.version);
```

`attachmentKind` is `'room-connection'`, `'raw-socket'` or `'none'`. `'none'` means no connection was found, and every read returns `undefined`.

If it is `'raw-socket'` and `selfPlayerId` is still null, the hooks went onto the wrong window. That is what a missing `@grant unsafeWindow` looks like: your `window` is a sandbox copy the game never touches. [The metadata block](userscript-metadata.md) has the field.

`waitForAttachment()` gives up after 90 seconds. If it resolves with `'none'`, the usual cause is starting too late, so check `@run-at document-start`.

## 2. Did the action go out?

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const result = await client.actions.chat({ message: 'test' });
console.log('ok:', result.ok, 'confirmed:', result.confirmed, 'sequence:', result.sequence);
if (!result.ok && result.rejection !== undefined) {
  console.log('rejected:', result.rejection.code, result.rejection.message);
}
```

`ok` is the outcome. `confirmed: false` is normal and does not mean it failed: the server's reply carries no id, so the client cannot always prove which command a reply belongs to.

If `rejection.code` is `invalid_sequence`, the counter drifted and the client fixes it by itself; retry once. Everything else means the server understood and refused.

## 3. Did the state change?

A command that is accepted does not return anything useful. The result shows up in the store. Watch it instead of trusting the reply:

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

client.store.subscribeAll((change) => console.log(change.changedPaths));
console.log('listening at version', client.state.version);
```

If nothing arrives in a few seconds, the command did not take effect.

## 4. Is it a field name you guessed?

The library types every field it knows about, but the game adds new ones without warning. `undefined` where you expected a number is usually this. Print the object and look:

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const tile = client.state.self?.garden?.tiles[0];
console.log('tiles:', client.state.self?.garden?.tiles.length);
console.log('crops on the first tile:', tile?.plots);
console.log('fields the game actually sent:', tile?.record.fields());
console.log('the whole object:', JSON.stringify(tile?.record.raw, null, 2));
```

If a field you need is not typed, `record` reads it by name: `tile.record.number('plantedAt')`. That works immediately, without waiting for a library release.

## 5. Did the game update?

The game ships new builds without warning, and a build can change a field name or a message format. Two symptoms point here:

- The connection closes with code `4700` or `4710`. The client refetches the version and reconnects by itself, so there is nothing to fix.
- An action that used to work is now rejected with `invalid_message`. That means the message is the wrong shape for the current build.

Report the second one against the library. There is a runtime override for the case where you need to keep working in the meantime, but it is a workaround rather than a fix:

```ts
import { FormRegistry } from '@mg.js/common';

const registry = new FormRegistry();
registry.setActionForm('HarvestCrop', 'wrapped');
console.log('overridden:', registry.activeOverrides.size);
```

## The console

A failed startup logs to the browser console under `mg:`, and `client.lastError` holds the most recent error:

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

console.log('last error:', client.lastError?.code, client.lastError?.message);
console.log('full report:', JSON.stringify(client.report));
```

Next: [Building your userscript](building.md).
