# Getting a session

To connect as yourself, the client needs the `mc_jwt` cookie from a signed-in browser session. There is no login call, no password exchange and no API key in the protocol, so a Node process has to be handed the value.

## Where to get it

1. Sign in to Magic Garden in a browser.
2. Open devtools, then Application, then Cookies for `magicgarden.gg`.
3. Copy the value of `mc_jwt`.
4. Put it where your process reads configuration, such as the `MC_JWT` environment variable.

```ts
import { HeadlessClient, CookieAuthProvider } from '@mg.js/headless';

const client = new HeadlessClient({
  auth: new CookieAuthProvider({ token: process.env.MC_JWT ?? '' }),
});
await client.start();
await client.waitUntilReady();
console.log('connected as', client.selfPlayerId);
await client.stop('done');
```

Treat the value like a password. It is the whole of your session.

## If the token expires

Pass a function instead of a value, and the client reads it again on every connection attempt. A long-running process then picks up a refreshed token without a restart.

```ts
import { CookieAuthProvider } from '@mg.js/headless';

const provider = new CookieAuthProvider({ getCookie: () => process.env.MC_JWT });
const contribution = await provider.prepare();
console.log('header names:', Object.keys(contribution.headers ?? {}).join(', ') || '(none)');
```

## Without a session

`GuestAuthProvider` connects with no credentials. It is useful for checking that the socket, the version lookup and the handshake all work, and nothing else: the server closes a guest connection with code `4840`, `SessionExpired`.

```ts
import { HeadlessClient, GuestAuthProvider } from '@mg.js/headless';

const client = new HeadlessClient({ auth: new GuestAuthProvider() });
await client.start();
await client.waitUntilReady();
console.log('headers blocked:', client.headersBlocked);
await client.stop('guest test done');
```

## One session at a time

Your cookie is one session. If the same cookie connects twice, the server closes the older connection with code `4250` and the client stops rather than reconnecting, because retrying in a loop makes the two connections fight over the session.

```ts
import { HeadlessClient, CookieAuthProvider } from '@mg.js/headless';

const client = new HeadlessClient({ auth: new CookieAuthProvider({ token: process.env.MC_JWT ?? '' }) });
client.events.on('confirmationRequired', (event) => console.log('superseded:', event.analysis.code));
await client.start();
console.log('waiting for confirmation:', client.awaitingSupersedeConfirmation);
await client.stop('done');
```

That means you cannot run a bot and keep the game open in a browser on the same account. Call `client.confirmSupersededReconnect()` to take the session back, which reconnects on a longer delay.

Next: [Every action](action-list.md).
