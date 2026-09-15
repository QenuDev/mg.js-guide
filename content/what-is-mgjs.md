# What mg.js is

magicgarden.js is an unofficial wrapper for the WebSocket protocol Magic Garden uses, published as three npm packages.

| Package | What it is | Where it runs |
|---|---|---|
| `@mg.js/bootstrapped` | A client that attaches to the game already open in your browser. This is what a userscript uses. | The page |
| `@mg.js/headless` | A client that opens its own connection. | Node |
| `@mg.js/common` | Shared types, state, and the action list. You will import from it alongside one of the two above. | Both |

Everything the game can do is a method on `client.actions`: `client.actions.chat({ message: 'hi' })`, `client.actions.harvestCrop({ slot: 3 })`. Everything the game knows is read from `client.state` as objects: `client.state.room.players`, `client.state.self?.garden?.tiles`, `client.state.room.chat`.

The wrapper handles the parts that are easy to get wrong:

- **Which shape each message takes.** Some actions go out one way and some another, and sending one the wrong way gets no answer at all.
- **Message numbering.** The game and your mod share one counter, and a gap makes the server reject everything after it.
- **Reading the connection.** It captures the socket the game already opened, so you do not have to find it.
- **Finding the data.** `client.state` reads the documented game locations by name, so your mod is not a pile of JSON Pointer strings.

Put together, a working mod is a handful of lines:

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

console.log('connected as', client.selfPlayerId);
client.actions.chat({ message: 'hello from my mod' });
```

## What it is not

magicgarden.js is not made by the game's developers and is not endorsed by them. It encodes the protocol as observed, so a game update can break something. [When it does not work](debugging.md) covers what that looks like.

The library also does not do anything on its own. Installing it produces no visible effect until your mod starts a client and draws something.

Next: [Setup](setup.md) writes that mod.
