# Drawing on the screen

There are two places to put something: the page, and the game's canvas.

**Use the page for panels, buttons and readouts.** A shadow root keeps the game's stylesheet out and yours in, and you get ordinary HTML instead of a canvas coordinate system.

```ts
const host = document.createElement('div');
const shadow = host.attachShadow({ mode: 'open' });
shadow.innerHTML = `
  <style>
    .panel {
      position: fixed; top: 80px; right: 16px; z-index: 9999;
      padding: 10px 12px; border-radius: 8px; background: #1d1d29; color: #eee;
      font: 13px system-ui, sans-serif;
    }
  </style>
  <div class="panel"><span id="players">...</span> players here</div>
`;
document.body.append(host);

const players = shadow.querySelector('#players');
if (players !== null) players.textContent = '4';
```

Position it with `position: fixed` and a `z-index` above the game. The game cannot see inside the shadow root, so nothing you write there can break it.

## Drawing inside the game's canvas

Use this for things that have to sit on the world itself, such as a label over a plant. The client already has the game's Pixi constructors, so ask it for them rather than importing Pixi.

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const stage = client.render.stage.getStageRoot();
if (stage !== null) {
  const label = await client.render.text.createText({
    text: 'ready',
    x: 0,
    y: 0,
    zIndex: 10,
    label: 'my-mod-label',
  });
  stage.addChild(label);
  console.log('added a text node labelled', label.label);
}
```

`createText` waits for the constructors if the game has not built its stage yet. `createTextSync` is the same call without the wait, for when you already know they are there.

To place text over an existing node, such as one the game owns, use `createTextOver(TextCtor, target, options)`. It attaches to the target's parent, which is what works when the target is a Rive canvas that cannot take children.

## Cleaning up

A Pixi node is not freed by dropping your reference to it. Remove it, and call `client.stop()` when your mod goes away.

```ts
import { BootstrappedClient } from '@mg.js/bootstrapped';

const client = new BootstrappedClient();
await client.start();
await client.waitForAttachment();

const stage = client.render.stage.getStageRoot();
const existing = client.render.stage.findByLabel('my-mod-label');
if (stage !== null && existing !== null) {
  client.render.text.destroyText(existing);
  console.log('removed the label, stage:', stage.label);
}
```

`client.render.stage.findByLabel(label)` finds a node you named when you created it, and `findNode` does the same by a predicate. That is how you find your own nodes again after a reload without keeping a variable in the right scope.

Next: [Saving settings](storage.md).
