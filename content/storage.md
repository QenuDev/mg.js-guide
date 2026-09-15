# Saving settings

Settings the player chooses should survive a reload. `createStorage()` gives you a key-value store that picks the right backend for the page.

```ts
import { createStorage } from '@mg.js/bootstrapped';

interface Settings {
  showPanel: boolean;
  alarmMinutes: number;
}

const storage = createStorage({ prefix: 'mgjs:my-mod:' });

const settings = storage.get<Settings>('settings', { showPanel: true, alarmMinutes: 5 });
console.log(settings);

storage.set('settings', { showPanel: false, alarmMinutes: 10 });
```

Pass your own prefix. `clear()` removes only keys under that prefix, so two mods on one page cannot read or delete each other's settings.

## What the store gives you

| Method | What it does |
|---|---|
| `get(key, fallback)` | The stored value, or `fallback` when the key is absent or unreadable. |
| `getOrNull(key)` | The stored value, or `null`. |
| `set(key, value)` | Writes the value and returns it. Values are stored as JSON. |
| `remove(key)` | Deletes one key. |
| `keys()` | The keys this store holds, unprefixed. |
| `clear()` | Deletes every key under this store's prefix, and returns how many. |
| `backend` | `'gm'`, `'localStorage'` or `'memory'`. |
| `durable` | `false` when the backend is memory, which happens in private mode. |

```ts
import { createStorage } from '@mg.js/bootstrapped';

const storage = createStorage({ prefix: 'mgjs:my-mod:' });
console.log(storage.backend, storage.durable);
console.log(storage.keys());
console.log(storage.clear());
```

`set` returns the value rather than a success flag, because a write that failed is not distinguishable from one that succeeded until you read it back.

## Save settings, not game state

Store things the player chose: toggles, positions, a wishlist, the last room you were in.

Do not store anything you can read from `client.state`. A cached copy of the garden or a player list goes stale on the next patch, and the store is already the authority. The one exception worth the trade is a catalogue response, which saves a network request; keep a timestamp with it if you do.

If `storage.durable` is false, the player is in private mode or a blocked-storage context, and everything you write is gone at the end of the session. Say so in the UI rather than failing quietly.

Next: [When it does not work](debugging.md).
