# Reacting to changes

`client.state.watch(target, handler)` runs your handler when something under `target` changes. `target` is
any object you read from the state tree, so you name the thing you care about rather than a path:

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const self = client.state.self;
if (self === null) throw new Error('not in the room yet');

const garden = self.garden;
if (garden === null) throw new Error('my garden is not readable yet');

const stop = client.state.watch(garden, () => {
  console.log('my garden changed');
});

stop();
```

Watch rather than poll. There is no safe polling interval to pick, and a subscription costs nothing
between changes.

## The handler does not fire when you subscribe

This is the important difference from a one-shot read. `watch` tells you about *changes*, so if you want
to react to something *arriving*, seed a baseline first:

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const self = client.state.self;
if (self === null) throw new Error('not in the room yet');

// Everyone already here is not a new arrival.
const seen = new Set(client.state.room.players.map((player) => player.id));

client.state.watch(client.state.room.players, () => {
  for (const player of client.state.room.players) {
    if (seen.has(player.id)) continue;
    seen.add(player.id);
    console.log(player.name, 'joined');
  }
});
```

## Watching a crop ripen

`ready` is not a field the server sends. The game computes it from a crop's `endTime`, so no state frame
ever announces the moment a crop finishes. If `watch` only ran on frames, this would be the one thing in
the game you could never be told about.

So `watch` also wakes on the clock: when the server clock passes an `endTime` under what you are watching,
your handler runs, exactly as if a frame had arrived.

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const self = client.state.self;
if (self === null) throw new Error('not in the room yet');

const garden = self.garden;
if (garden === null) throw new Error('my garden is not readable yet');

// A crop's id is only unique within its tile, so identify it by both.
const announced = new Set<string>();

client.state.watch(garden, () => {
  for (const tile of garden.tiles) {
    for (const crop of tile.plots) {
      const key = `${tile.id}:${crop.id}`;
      if (!crop.ready || announced.has(key)) continue;
      announced.add(key);
      console.log(tile.id, crop.species, 'is ready');
    }
  }
});
```

Note the key: `tile.id` and `crop.id` together. Two tiles can each hold a crop whose own id is `0`, so the
crop's id alone does not identify it, and holding the crop object is not enough either, because reading
the state again gives you a fresh object each time.

## Reading inside the handler is safe

By the time your handler runs, the change has already been applied, so re-reading gives you the new
values. There is no need to look at what changed and patch up your own copy.

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

client.state.watch(client.state.room.players, () => {
  console.log('players now:', client.state.room.players.length);
  console.log('at version:', client.state.version);
});
```

If you want to watch a collection that is not an object in the tree, pass the array:

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const self = client.state.self;
if (self === null) throw new Error('not in the room yet');

client.state.watch(self.pets, () => {
  console.log('pets changed:', self.pets.length);
});
```

## Keeping track of a growing list

The activity log is capped by the game, so its length is not a reliable watermark. Its newest timestamp
is, because entries are appended in time order:

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const self = client.state.self;
if (self === null) throw new Error('not in the room yet');

let countedUpTo = client.state.now();

client.state.watch(self.activityLog, () => {
  for (const entry of self.activityLog) {
    if (entry.timestamp <= countedUpTo) continue;
    countedUpTo = Math.max(countedUpTo, entry.timestamp);
    console.log('new entry:', entry.action);
  }
});
```

## When you want a path instead

Subscriptions by path still exist on the store, under `client.store`. Reach for them when you want the raw
patch stream rather than the objects:

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const stop = client.store.subscribe('/data/chat', (change) => {
  console.log('paths that moved:', change.changedPaths);
});

stop();
```

`change.changedPaths` is often more useful than the value. It tells you what moved without you comparing
anything.

## Unsubscribing

Every `watch` returns a function. Call it when your mod stops, or reloading your script leaves handlers
attached to the client you replaced.

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const stop = client.state.watch(client.state.room.players, () => console.log('players changed'));
stop();
await client.stop('done');
```

Next: [Drawing on the screen](drawing.md).
