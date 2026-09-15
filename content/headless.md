# Running it in Node

`@mg.js/headless` is the same client without a browser. It opens its own connection, so it runs as a normal Node process.

```bash
npm install @mg.js/headless
```

```ts
import { HeadlessClient, CookieAuthProvider } from '@mg.js/headless';

const client = new HeadlessClient({
  auth: new CookieAuthProvider({ token: process.env.MC_JWT ?? '' }),
  room: process.env.MC_ROOM,
});

client.events.on('ready', () => console.log('connected as', client.selfPlayerId));
client.events.on('close', (event) => console.log('closed with code', event.info.code));

await client.start();
await client.waitUntilReady();

console.log('players:', client.state.room.players.length, 'room:', client.roomSlug);
console.log('chat:', client.state.room.chat.length);

await client.stop('done');
```

`client.actions` and `client.state` are the same as the in-page client, so anything you wrote against one works against the other. The difference is that the headless client owns the connection: it resolves the game version, reconnects when the socket drops, and stops on the close codes where reconnecting cannot help.

## What you can read and do

```ts
import { HeadlessClient, CookieAuthProvider } from '@mg.js/headless';

const client = new HeadlessClient({ auth: new CookieAuthProvider({ token: process.env.MC_JWT ?? '' }) });
await client.start();
await client.waitUntilReady();

client.store.subscribeAll((change) => console.log(change.changedPaths));
const result = await client.actions.checkWeatherStatus();
console.log('sent:', result.ok, 'sequence:', result.sequence);

await client.stop('done');
```

Leave `room` out for a private room of your own. Pass a slug to join one.

## Leaving it running

A bot differs from a script in that it has to survive disconnects. The default policy retries on a backoff and gives up on the codes where a retry cannot work, such as being kicked or banned, so you do not need to write that.

```ts
import { HeadlessClient, CookieAuthProvider } from '@mg.js/headless';

const client = new HeadlessClient({ auth: new CookieAuthProvider({ token: process.env.MC_JWT ?? '' }) });

client.events.on('reconnect', (event) => console.log('retrying in', event.plan.delayMs, 'ms'));
client.events.on('stopped', (event) => console.log('gave up:', event.reason));

await client.start();
await client.waitUntilReady();
console.log('uptime:', client.uptimeSeconds, 'headers blocked:', client.headersBlocked);
await client.stop('done');
```

`client.headersBlocked` being true means Node's built-in WebSocket dropped the headers, which on some Node versions includes the cookie. If authentication fails for no visible reason, check it.

## Before anything else: a session

A headless client needs a cookie that only a browser session can produce, and the library cannot fetch one for you. Read [Getting a session](auth.md) first if you have not.

Next: [Getting a session](auth.md).
