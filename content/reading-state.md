# Reading game state

`client.state` reads the game as objects. You walk from the room to a player, from a player to their
garden, and from a garden to a crop, and each of those gives you typed fields rather than a raw tree.

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

console.log('players here:', client.state.room.players.length);
console.log('host:', client.state.room.hostPlayerId ?? 'nobody yet');

for (const player of client.state.room.players) {
  console.log(player.name, player.coins);
}
```

## Your own player

`client.state.self` is you, and it is `null` until the room has told the client who you are. That is the
one shortcut in the tree, because only the library knows which player is you.

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const self = client.state.self;
if (self === null) {
  console.log('not in the room yet');
} else {
  console.log('I am', self.name, 'with', self.coins, 'coins');
}
```

If you would rather wait than branch, `state.when` resolves the moment the value arrives:

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const self = await client.state.when(
  () => client.state.self,
  (value): value is NonNullable<typeof value> => value !== null,
  { timeoutMs: 30_000 },
);

console.log('I am', self.name);
```

## The garden has three levels

A player has a garden, a garden has tiles, and a tile holds the crops planted on it. That is the shape
the game sends, and it is worth holding in your head once:

```
garden -> tiles -> plots
```

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const self = client.state.self;
if (self === null) throw new Error('not in the room yet');

for (const tile of self.garden?.tiles ?? []) {
  for (const crop of tile.plots) {
    console.log(tile.id, crop.species, crop.ready ? 'ready' : `${crop.remainingMs}ms left`);
  }
}
```

Every tile has an `id`, which is the square it occupies, and always an array of `plots`. A tile with
nothing planted on it has an empty `plots` array, so a loop like the one above needs no null checks.

A crop carries what the game puts on it:

| Field | Type | What it is |
|---|---|---|
| `id` | `number` | The crop's own id within its tile. |
| `species` | `string` | What is planted, e.g. `Carrot`. |
| `mutations` | `Mutation[]` | Every mutation on it, e.g. `['Gold', 'Wet']`. |
| `size` | `number` | The crop's size. |
| `preserved` | `boolean` | True when it was preserved, which changes what it yields. |
| `ready` | `boolean` | True when it has finished growing. |
| `remainingMs` | `number` | Milliseconds until it finishes, or `0`. |
| `startTime`, `endTime` | `number` | Server milliseconds. |
| `x`, `y`, `rotation`, `flipped` | `number`, `number`, `number`, `boolean` | Where and how the game draws it. |

## `ready` is judged against the game's clock

A crop's `endTime` is a server timestamp, and your machine's clock can be minutes off. The client anchors
a clock to the server when it connects and refreshes it with every state frame, which is what the game
does, so `ready` agrees with what you see on screen.

That is also why you should not compare `endTime` to `Date.now()` yourself. Use `crop.ready`, or
`client.state.now()`, which is the server clock in milliseconds, and `client.state.skewMs` for how far
your machine is from it.

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

console.log('server time:', client.state.now());
console.log('my machine is off by:', client.state.skewMs, 'ms');
```

## People, pets and the log

Pets are the ones a player has out in the world. A pet in a bag or a storage is an inventory item, which
is a different thing.

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const self = client.state.self;
if (self === null) throw new Error('not in the room yet');

for (const pet of self.pets) {
  console.log(pet.name || pet.species, 'hunger', pet.hunger, pet.abilities);
}

for (const entry of self.activityLog) {
  console.log(entry.action, 'at', entry.timestamp);
}
```

To find someone else's pet, walk the room. `self` and the matching entry in `room.players` are the same
object, so there is no third place a player can be hiding:

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const pet = client.state.room.players
  .flatMap((player) => player.pets)
  .find((candidate) => candidate.name === 'Frost');

console.log(pet?.species ?? 'not out in this room');
```

A `Pet` has `id`, `species`, `name`, `xp`, `hunger`, `mutations`, `abilities`, `targetScale` and
`sourceEggId`. An `ActivityEntry` has `action`, `timestamp` and `parameters`.

## A player's garden can be missing

`player.garden` is `null` when the client could not match a room player to their data in the game tree. A
garden with no tiles is a different thing: that player has nothing planted.

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

for (const player of client.state.room.players) {
  if (player.garden === null) {
    console.log(player.name, 'is in the room but their garden is not readable');
    continue;
  }
  console.log(player.name, 'has', player.garden.tiles.length, 'tiles');
}
```

Treat `null` as a reason not to act rather than as an empty garden. A harvest loop that reads `null` as
"nothing to do" and an empty garden as "nothing to do" behaves identically right up until the day the
match fails and it quietly harvests nothing instead of telling you.

## Mutation names are not their ids

The game shows a different word for some mutations, so ask rather than showing the id:

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';
import { MUTATIONS, mutationName } from '@mg.js/common';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const self = client.state.self;
const crop = self?.garden?.tiles.flatMap((tile) => tile.plots)[0];

for (const mutation of crop?.mutations ?? []) {
  console.log(mutation, 'is shown as', mutationName(mutation));
}
console.log('known mutations:', Object.keys(MUTATIONS).length);
```

`Ambershine` shows as `Amberlit`, `Dawncharged` as `Dawnbound`, `Ambercharged` as `Amberbound`.
`MUTATIONS` has the rest: `name`, `group`, `coinMultiplier` and `baseChance` for each.

## Fields this library does not know about

The game adds fields without warning. Everything above is typed from the build the library was written
against, but every object also carries `record`, which reads it by name:

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const tile = client.state.self?.garden?.tiles[0];
console.log('planted at:', tile?.record.number('plantedAt'));
console.log('what the game actually sent:', tile?.record.fields());
console.log('raw:', tile?.record.raw);
```

That is the escape hatch. If you find yourself needing it for something permanent, it is worth reporting,
because a field worth reading twice is a field worth typing.

Next: [Reacting to changes](watching-changes.md).
