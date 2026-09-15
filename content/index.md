# magicgarden.js guide

**magicgarden.js** wraps the protocol Magic Garden uses, so a mod can act on what it reads: find a ripe crop at `client.state.self?.garden?.tiles` and harvest it, instead of writing a socket client.

This guide is task-shaped. Every page tells you how to do one thing, and stops when it is done. Anything deeper belongs in the [API reference](https://qenudev.github.io/MG.js/).

<table>
<tr><th>If you want to</th><th>Read</th></tr>
<tr><td>Know what the packages are and start a client</td><td><a href="what-is-mgjs.html">What mg.js is</a>, then <a href="setup.html">Setup</a></td></tr>
<tr><td>Read something out of the game</td><td><a href="reading-state.html">Reading game state</a></td></tr>
<tr><td>Notice when crops, pets or shops change</td><td><a href="watching-changes.html">Reacting to changes</a></td></tr>
<tr><td>Put a panel or a label on the screen</td><td><a href="drawing.html">Drawing on the screen</a></td></tr>
<tr><td>Remember a setting between reloads</td><td><a href="storage.html">Saving settings</a></td></tr>
<tr><td>Ship a Tampermonkey script other people can install</td><td><a href="building.html">Building your userscript</a></td></tr>
<tr><td>Run a bot or an API in Node</td><td><a href="headless.html">Running it in Node</a></td></tr>
<tr><td>Find out whether an action exists and what it takes</td><td><a href="action-list.html">Every action</a></td></tr>
<tr><td>Fix something that does not work</td><td><a href="debugging.html">When it does not work</a></td></tr>
</table>

## Two warnings before you start

**Do not guess field names.** Only a handful of paths are documented. The rest change between game builds, and a wrong name reads as `undefined` rather than failing. Print the object first.

**Do not run anything unattended that plays the game for someone.** The library will send whatever you ask it to. Being banned is close code `4900`, and the client treats it as final.

## Where this runs out

magicgarden.js is unofficial and not affiliated with Magic Garden. The protocol is not a public interface, so a game update can break something. [When it does not work](debugging.html) covers the symptoms and the fix for each.

The [API reference](https://qenudev.github.io/MG.js/) is generated from the source and lists every export with its full type, which makes it the authority on names when a page here is vague.
