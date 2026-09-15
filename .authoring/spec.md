# Authoring spec

Everything a page in this guide has to obey. Read it before writing, and treat it as the contract: the
build runs four checkers against what you write, and a page that fails them is a page that does not
ship. The workspace's prose rules are separate, and `../.logs/prose-rules.md` covers them.

---

## 1. The voice

Write like a person explaining a thing they have built and used. Short sentences. Concrete nouns. The
reader is a competent programmer who has never seen Magic Garden's protocol and does not want to be
entertained.

### 1.1 Hard rules

The mechanical rules (banned words, forbidden characters, framing constructions, heading levels, list
indentation) are workspace rules rather than rules of this guide. They live at `../.logs/prose-rules.md`
with a checker beside them, and they apply to every repository in the workspace. Read them there, and run
`node ../.logs/check-prose.mjs` from the workspace root before shipping a page.

Nothing about that style is checked by this repository's build, because a clone of this guide should get
the site and not this workspace's taste.

### 1.2 Judgement rules

- **Start with the task.** The first sentence after the `#` title says what the page accomplishes. No
  preamble about why the topic matters.
- **Do not announce structure.** Never write "In this section we will" or "Now that we have". The
  headings do that work.
- **Do not pad.** A 200-word page that answers the question beats a 900-word page that circles it. Aim
  for 300 to 700 words unless the page is a reference table.
- **Say what happens, not how good it is.** "The socket patch is installed once per page" beats "The
  library handles this robustly".
- **Name the mechanism.** "The game's own counter is module-local, so the patch has to sit on
  `WebSocket.prototype.send`" beats "the library deals with this".
- **Prefer the concrete number.** "180 polls at 500 ms" beats "polling for a while".
- **You may address the reader as "you"** in an instruction. Do not use "we" for the reader. "We" is
  acceptable only where the guide's authors are the subject.
- **State limits plainly.** "There is no headless way to obtain an `mc_jwt` cookie" is a feature of the
  page, not an embarrassment.
- **Never invent an API.** If a name is not in section 3 of this spec, or not in the generated API
  reference at `.authoring/actions.md`, do not use it. If you need something that is missing, write the
  page around what exists and note the gap in your summary.

### 1.3 Sentences that read as machine-written

Participial tails, inflated verbs, uniform sentence length and the rule of three are described in
`../.logs/prose-rules.md`, under the judgement rules. They are listed there rather than here so that one
file governs every repository.
- **Earn every adjective.** If removing it does not change the meaning, remove it. `vibrant`, `robust`,
  `seamless`, `powerful`, `rich`, `intricate` are almost never carrying information here.
- **Do not open consecutive sentences with a connective.** `Additionally`, `Furthermore`, `Moreover`,
  `However`, `Therefore` at the start of a sentence is a tic. Join the clauses or drop the connective.
- **No summary paragraph at the end of a section.** The last fact is the end.
- **No redemptive arc.** Do not follow a limitation with reassurance. State the limitation and stop.
- **Do not moralise.** No paragraph telling the reader to be careful, responsible or respectful. If the
  facts are serious, they carry themselves.
- **Do not hedge with an empty disclaimer.** Not "while specific details are limited". Say what is
  known, or say it is unknown.

### 1.4 The test to apply before you deliver

Read each paragraph and ask whether it would survive being read aloud to a colleague. If a sentence
exists to lead into the next one, cut it. If a paragraph restates what the heading already said, cut
it. If a claim has no number, name or file behind it, either add one or cut the claim.

---

## 2. Page mechanics

- One file per page at `content/<slug>.md`. The slug is fixed by `guide.config.mjs`; do not rename it.
- The file starts with a single `#` heading whose text matches the page title in the config.
- Then prose. Use `##` for major steps and `###` for a sub-step or a note about one.
- Cross-references are written as `[text](page-slug.md)` or `[text](page-slug.md#anchor)`. The build
  rewrites them to `.html` and fails on a slug that does not exist. Do not write `.html` yourself.
- External links are plain Markdown and go to real URLs only. Never invent a URL.
- Tables are allowed and encouraged for name-to-meaning mappings.
- Blockquotes are for a warning the reader must not miss. One per page at most.

### 2.1 Code fences

- TypeScript fences are tagged `ts`. Bash is `bash`. Shell output is `text`. JSON is `json`.
- **Every `ts` fence is compiled by `npm run check:snippets` against the real packages.** If it does not
  typecheck, the build fails.
- Therefore a `ts` snippet must be a self-contained module: it declares its own imports at the top and
  does not rely on a variable from an earlier snippet on the page. Give it its own
  `const client = new BootstrappedClient()` if it needs a client.
- Keep snippets to what the page is about. A reader should be able to copy one and run it.
- Do not use `any`, `as any`, `@ts-ignore`, `@ts-expect-error`, or a non-null `!`. The packages are
  written under `strict` with `noUncheckedIndexedAccess`, and the guide's snippets are held to the same
  standard.
- Do not lean on `console.log` for narration, but use it to show a value. A snippet that computes a
  result and then discards it is worse than one that prints it, because the reader cannot see what came
  back. Never leave a bare expression statement such as `result.sequence;` in a snippet.

---

## 3. Verified API facts

This section is the source of truth for names. It was checked against the packages at version `0.1.2`.
Where it is silent, `.authoring/actions.md` (the generated action table) and `../mg.js/docs/DESIGN.md` are authoritative.

### 3.1 The three packages

| Package | What it is | Owns a socket | Has a renderer |
|---|---|---|---|
| `@mg.js/common` | The wire contract, the state engine, the catalogues. Zero dependencies. | no | no |
| `@mg.js/bootstrapped` | The in-page client. Attaches to the game's own connection. | no, it rides the host's | yes |
| `@mg.js/headless` | The standalone client. Opens its own WebSocket, authenticates, reconnects. | yes | no |

- `common` has 71 distinct wire actions exposed as 72 typed methods. `fuseCrystal` is the extra one: it
  shares `PlaceCrystal`'s wire string and sets `intent`.
- The bootstrapped and headless clients are both built on a shared `ClientCore` from `common`, so
  envelope building, sequencing and ack correlation are identical in both.

### 3.2 `@mg.js/bootstrapped`

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';
```

Constructor takes `BootstrappedClientOptions`, all optional. `new BootstrappedClient()` is valid.

Properties and methods on `BootstrappedClient`:

| Member | Type | Notes |
|---|---|---|
| `start()` | `Promise<void>` | Idempotent and cross-realm safe. A second call in the same page rejoins the running client. |
| `waitForAttachment()` | `Promise<Attachment>` | Resolves once the socket is bound, or the room object is bound. |
| `stop(reason?)` | `Promise<void>` | Tears down hooks, timers, and the namespace when the ref count reaches zero. |
| `actions` | `GameActions` | The 72 typed action methods. |
| `store` | `ObservableStore` | The game state tree. |
| `render` | `RenderFacade` | `stage`, `capture`, `text`, `graphics`, `sprite`, `rive`, `worldScene()`. |
| `jotai` | `JotaiBridge \| null` | Access to the game's own jotai atoms, when the bridge found them. |
| `catalog` | `CatalogClient \| null` | Populated when catalogue capture succeeded. |
| `events` | `Emitter<ClientEvents>` | `open`, `ready`, `close`, `error`. |
| `isReady` | `boolean` | True after `Welcome` has been applied. |
| `selfPlayerId` | `string \| null` | Your player id in the room. |
| `attachmentKind` | `AttachmentKind \| null` | Which path attached. See the attachment pages. |
| `attachmentReport` | `AttachmentReport \| null` | Full report, including attempts and failures. |
| `report` | `BootstrappedReport` | A diagnostic snapshot for a badge or a bug report. |
| `room`, `game` | `unknown` | The live game objects, when the attachment path exposes them. |
| `lastError` | `MgError \| null` | The most recent error the client saw. |
| `isInstalled` | `boolean` | Whether the page hooks are installed. |
| `readFrontier()` | `number \| null` | The sequence number the game's own traffic has reached. |
| `send(raw)` | `void` | Send a raw frame. |
| `claimSequence()`, `peekSequence()`, `resyncSequence(frontier?)` | `number` / `number` / `void` | Sequence control for a mod that sends its own frames. |

`client.store`:

| Member | Type | Notes |
|---|---|---|
| `get(path)` | `unknown` | JSON Pointer read. |
| `has(path)` | `boolean` | |
| `snapshot()` | `unknown` | A deep clone of the whole tree. |
| `root`, `room`, `game` | `unknown` | Shortcuts for `''`, `/data`, `/child/data`. |
| `version` | `number` | Bumps on every applied change. |
| `stats` | `{ version, patchCount, patchFailures, subscribers }` | |
| `subscribe(path, handler, options?)` | `Unsubscribe` | Fires for the path, an ancestor, or a descendant. `{ fireImmediately: true }` delivers the current value. |
| `subscribeAll(handler)` | `Unsubscribe` | |

The handler receives a `StateChange`: `{ version, changedPaths, watchedPath, value, patches?, wasSnapshot }`.

`client.actions` is a `GameActions` instance. Every method takes **one params object**, not positional
arguments, and returns a `CommandHandle`. Method names are camelCase versions of the wire action:
`harvestCrop({ slot, slotsIndex, cropItemId })`, `plantSeed({ slot, species })`, `waterPlant({ slot })`,
`purchaseShopItem({ shop, item })`, `feedPet({ petItemId, cropItemId })`, `ridePet({ petItemId })`,
`placeDecor({ decorId, tileType, localTileIndex, rotation? })`, `chat({ message })`,
`emote({ emoteType })`, `move({ x, y })`, `teleport({ x, y })`, `savePetTeam(...)`,
`applyPetTeam(...)`, `putItemInStorage(...)`, `retrieveItemFromStorage(...)`.

`CommandHandle` is `PromiseLike<CommandResult>`: `await` it, or read `.result`, `.settled`,
`.requestId`, `.sequence`, `.action`. A `CommandResult` carries `confirmed` (boolean) and a reason.
The default mode reports `confirmed: false` when the server's reply cannot be correlated, which is
documented behaviour rather than a failure. See [Sending commands](sending-commands.md).

`client.render`:

| Member | Notes |
|---|---|
| `stage` | `PixiStage`: `capture`, `getCtors`, `getGraphicsCtor`, `findByLabel`, `findNode`. |
| `capture` | The Pixi init-hook handle, or `null` before `start()` or when rendering is disabled. |
| `text` | `createText`, `createTextSync`, `createTextOver`, `updateText`, `destroyText`, `detach`. |
| `graphics` | `createBadge`, `createBadgeSync`, `Badge`. |
| `sprite` | `createSprite`, `createSpriteSync`, `createTextureCache`, `textureFrom`, `loadImageSource`. |
| `rive` | `RiveRegistry`: `sharedArtboards`, `wrapArtboard`, `isArtboardLike`. |
| `worldScene(config, options?)` | `new WorldScene`, with the cinematic claim wired to the game's atom when the bridge found it. |

`getCtors()` returns Pandi constructors recovered from the live stage: `Container`, `Graphics`, `Text`,
`Sprite`, `Texture`, `Rectangle` and the rest. It throws `PixiCtorsTimeoutError` if the game has not
built its stage yet, which is why `tryGetCtors` exists.

`client.jotai` is a `JotaiBridge` with `find(labelSuffix)`, `findContaining(fragment)`, `labels()`,
`read(atom)`, `write(atom, value)`, `readByLabel(labelSuffix)`, `writeByLabel(labelSuffix, value)`,
and `ready` / `atomCount` getters.

### 3.3 `@mg.js/headless`

```ts
import { HeadlessClient, RoomSocket, CookieAuthProvider, GuestAuthProvider, StaticAuthProvider } from '@mg.js/headless';
```

| Member | Notes |
|---|---|
| `start()` | Opens the socket and runs the handshake. |
| `waitUntilReady()` | Resolves after `Welcome`. |
| `stop(reason?)` | Closes and stops reconnecting. |
| `actions`, `store` | Same shapes as the bootstrapped client. |
| `events` | `open`, `ready`, `close`, `confirmationRequired`, `reconnect`, `stopped`, `headers-dropped`. |
| `welcome` | The `WelcomeMessage`, or `null`. |
| `selfPlayerId`, `isReady`, `isConnecting`, `willReconnect`, `reconnectAttempt` | Status. |
| `url`, `roomSlug`, `sessionDocumentId`, `connectionAttempt` | Session identity. |
| `version` | The resolved game version. |
| `headersBlocked` | True when the WebSocket runtime dropped the headers. |
| `uptimeSeconds` | `number \| null`. |
| `report` | `HeadlessReport` for diagnostics. |
| `confirmSupersededReconnect()`, `awaitingSupersedeConfirmation` | For close code 4250 and 4300. |
| `sequencer` | The `CommandSequencer`, or `null` before the first connection. |
| `transport` | The `StandaloneTransport`, or `null`. |

Auth providers: `CookieAuthProvider` (from an `mc_jwt` cookie value), `GuestAuthProvider`,
`StaticAuthProvider`. `RoomSocket` is the thinner class the protocol reference names; in the guide,
prefer `HeadlessClient` and mention `RoomSocket` once.

Close codes worth naming: `4200` `PlayerLeftVoluntarily`, `4250` `UserSessionSuperseded`,
`4500` `PlayerKicked`, `4710` `VersionExpired`, `4720` `UserDataSchemaAhead`, `4840` `SessionExpired`,
`4900` `Banned`. There are 18 in total. Terminal codes must not be reconnected on.

### 3.4 `@mg.js/common`

```ts
import { CatalogClient, PlatformApiSource, RemoteJsonSource, StaticCatalogSource, ObservableStore } from '@mg.js/common';
```

- `new CatalogClient({ sources: [new PlatformApiSource(), new RemoteJsonSource({ baseUrl })], })` and
  `await catalog.load()` returns `{ version, shops, plants, missing }` and more.
- `PlatformApiSource` reads the game's own `/platform/v1` endpoints (version, shops, weather).
- `RemoteJsonSource` reads entities from any HTTP mirror of the game's `/data` tree.
- `StaticCatalogSource` serves a captured catalogue with no network.
- State helpers: `parsePointer`, `getPointer`, `joinPointer`, `escapeToken`, `pointerContains`,
  `applyPatch`, `deepClone`, `deepEqual`, and typed path helpers `player`, `players`, `activityLogs`.
- Protocol helpers: `parseFrame`, `buildFlatFrame`, `buildWrappedFrame`, `buildRoomFrame`,
  `serialiseFrame`, `randomRoomSlug`, `randomUuid`, `analyzeClose`, `CLOSE_CODES`.

### 3.5 The page realm and coexistence

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';
import { getNamespace, defineGlobal, readGlobal, onNamespaceEvent, onTeardown } from '@mg.js/bootstrapped';
```

- The single page global is `window.__mgjs`. The live client is at `window.__mgjs.globals.client`.
- `defineGlobal(name, value)` publishes a value for other mods. `readGlobal(name)` reads one.
- `onNamespaceEvent(name, handler)` subscribes across bundle loads. `onTeardown(fn)` registers cleanup
  that runs when the client stops.
- The socket patch is installed once per page and reference counted, so two mods that both import the
  library share one patch. A mod that replaces the game's send function without renumbering breaks
  every sequenced command in the page. `installRenumberHook` and `Renumberer` exist for the case where
  a third mod has already wrapped `send`.

### 3.6 Userscript facts

- `@mg.js/bootstrapped` is a library and does nothing on its own. A userscript needs an entry file that
  starts a client and produces a visible effect.
- The bundle must be a single IIFE with zero imports, because a userscript is evaluated as a classic
  script and `@run-at document-start` leaves no time for a module graph to resolve.
- The metadata block must be the first thing in the file.
- `@namespace` is the update identity. Changing it after release detaches every existing install.
- The example repo `bootstrapped-example` builds `magicgarden.user.js` with esbuild, unminified, with
  the metadata block as an esbuild `banner`.
- The bundle-size gate in the example is a budget check, not a hard failure.

---

## 4. Page inventory

Each page has one job. Do not expand a page's scope; if something does not fit, it belongs on another
page, and you should say so in your summary rather than adding a section.

**The scope rule for this guide.** A page exists to get a mod written or to use one feature. Leave the
internals to the library's design docs and the generated API reference. Concretely, do not explain: which
of the library's internal attachment paths won, how outbound messages are shaped or numbered, how
acknowledgements are correlated, what the coexistence hooks patch, how constructors are recovered, or
what a state patch contains beyond the value your code reads. If a reader can accomplish the task without
that fact, cut it. When in doubt, cut it. The reader can ask for the deeper explanation.

| Slug | Job |
|---|---|
| `what-is-mgjs` | What the wrapper is, which package to install, what it saves you from writing, and one working example. |
| `setup` | Install, the smallest complete mod, the four calls that matter, and the timing requirement for a userscript. |
| `reading-state` | Reading values by path, the handful of documented paths, and narrowing what comes back. |
| `watching-changes` | Subscribing to a path, what the handler receives, watching a list, firing immediately, unsubscribing. |
| `drawing` | A DOM panel in a shadow root, and a Pixi node for things on the world. Cleaning up. |
| `storage` | `createStorage()`, what the methods do, what to save and what not to. |
| `debugging` | Five checks in order: is it attached, did the command go out, did the state change, is it a guessed field name, did the game update. Then the console. |
| `building` | The esbuild recipe for a single-file userscript, what each option is for, and how to check the output. |
| `userscript-metadata` | The fields that matter and which ones must never change after a first release. |
| `releasing` | Tagging, the release workflow, and how an update reaches an installed copy. |
| `headless` | Starting a Node client, reading and acting from it, and staying alive across disconnects. |
| `auth` | Where `mc_jwt` comes from, refreshing it, guests, and one session at a time. |
| `action-list` | Generated from the packages. Do not hand-edit; run `npm run gen:actions`. |

## 5. Delivering a page

1. Write the file to `content/<slug>.md`.
2. Run `npm run verify`. Fix what it reports.
3. Report back: the slug, the word count, any API name you wanted and could not find, and any claim you
   had to leave vague because the spec did not cover it.

Do not edit `guide.config.mjs`, `scripts/`, `site/`, or another page's file. Do not run `npm install`,
`git`, or any state-changing command.
