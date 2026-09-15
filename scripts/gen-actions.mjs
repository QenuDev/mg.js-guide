/**
 * Generate `.authoring/actions.md`, the action table the guide's reference page is written from.
 *
 * ## Why this is generated
 *
 * The action list is 72 methods with parameters, and it is the one page in the guide where a wrong name
 * is a broken copy-paste for the reader. Transcribing it by hand is a chance to be wrong 72 times. The
 * registry and the param interfaces are the same files the packages ship, so the table is derived from
 * them instead.
 *
 * Run with `npm run gen:actions`. The output is committed, because the guide should build without the
 * sibling packages checked out.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagesRoot =
  process.env.MG_PACKAGES ??
  resolve(root, '../mg.js/packages');

const registryPath = join(packagesRoot, 'common/src/actions/registry.ts');
const paramsPath = join(packagesRoot, 'common/src/actions/params.ts');
const actionsPath = join(packagesRoot, 'common/src/actions/game-actions.ts');

/** The object literal behind `X as const satisfies T`, or `X` itself. */
function objectLiteralOf(node) {
  if (node === undefined) return null;
  if (ts.isObjectLiteralExpression(node)) return node;
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return objectLiteralOf(node.expression);
  if (ts.isParenthesizedExpression(node)) return objectLiteralOf(node.expression);
  return null;
}

/** Read the registry's `ACTION_SPECS` object literal into plain records. */
function readRegistry(sourceText, fileName) {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.ES2022, true);
  const specs = [];
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText() === 'ACTION_SPECS') {
      const object = objectLiteralOf(node.initializer);
      for (const property of object?.properties ?? []) {
        const action = property.name?.getText().replace(/^['"]|['"]$/g, '');
        if (action === undefined) continue;
        const spec = { action, wire: '', form: '', category: '', params: '', note: '' };
        for (const field of property.initializer?.properties ?? []) {
          const key = field.name?.getText();
          const value = field.initializer?.getText() ?? '';
          spec[key] = value.replace(/^['"]|['"]$/g, '');
        }
        specs.push(spec);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specs;
}

/** Map interface name to its fields, in declaration order. */
function readInterfaces(sourceText, fileName) {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.ES2022, true);
  const interfaces = new Map();
  const visit = (node) => {
    if (ts.isInterfaceDeclaration(node)) {
      const fields = node.members
        .filter((member) => ts.isPropertySignature(member))
        .map((member) => ({
          name: member.name.getText().replace(/^['"]|['"]$/g, ''),
          optional: member.questionToken !== undefined,
          type: member.type?.getText() ?? 'unknown',
          doc: ts.displayPartsToString(member.jsDoc?.[0]?.comment ?? '').replace(/\s+/g, ' ').trim(),
        }));
      interfaces.set(node.name.getText(), fields);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return interfaces;
}

/** Map method name to its signature and the wire action its body actually sends. */
function readMethods(sourceText, fileName) {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.ES2022, true);
  const methods = new Map();
  const visit = (node) => {
    if (ts.isClassDeclaration(node) && node.name?.getText() === 'GameActions') {
      for (const member of node.members) {
        if (!ts.isMethodDeclaration(member)) continue;
        const name = member.name.getText();
        if (name === 'constructor') continue;
        const parameter = member.parameters[0];
        // The wire action is the first string argument of `this.sender.send(...)` in the body. Reading
        // it from the body rather than inferring it from the method name is what keeps `fuseCrystal`
        // (which sends `PlaceCrystal`) and `useReplenishPotion` correct.
        let wire = null;
        const findSend = (child) => {
          if (
            wire === null &&
            ts.isCallExpression(child) &&
            ts.isPropertyAccessExpression(child.expression) &&
            child.expression.name.getText() === 'send' &&
            child.arguments[0] !== undefined &&
            ts.isStringLiteral(child.arguments[0])
          ) {
            wire = child.arguments[0].text;
          }
          ts.forEachChild(child, findSend);
        };
        findSend(member);
        methods.set(name, {
          wire,
          params: parameter?.type?.getText() ?? null,
          optionalParams:
            parameter?.questionToken !== undefined || parameter?.initializer !== undefined,
          doc: ts.displayPartsToString(member.jsDoc?.[0]?.comment ?? '').replace(/\s+/g, ' ').trim(),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return methods;
}

function typeNameOf(text) {
  return text.replace(/^.*<|>$/g, '').trim();
}

async function main() {
  const [registryText, paramsText, actionsText] = await Promise.all([
    readFile(registryPath, 'utf8'),
    readFile(paramsPath, 'utf8'),
    readFile(actionsPath, 'utf8'),
  ]);

  const specs = readRegistry(registryText, registryPath);
  const interfaces = readInterfaces(paramsText, paramsPath);
  const methods = readMethods(actionsText, actionsPath);

  const byCategory = new Map();
  for (const spec of specs) {
    const list = byCategory.get(spec.category) ?? [];
    list.push(spec);
    byCategory.set(spec.category, list);
  }

  const lines = [
    '# Action reference, generated',
    '',
    'Generated from `packages/common/src/actions/` in the mg.js repository. Do not edit by hand: run',
    '`npm run gen:actions`. The form column is which of the three outbound shapes the action must use:',
    '`flat`, `wrapped` or `room`.',
    '',
    `${specs.length} wire actions, ${methods.size} methods.`,
    '',
  ];

  // Group by category, then list methods in registry order, then any method whose wire action the
  // registry does not name (which would mean a method was added without a spec).
  const order = ['session', 'social', 'movement', 'shop', 'garden', 'decor', 'pets', 'inventory'];
  const covered = new Set();
  for (const category of order) {
    const list = byCategory.get(category) ?? [];
    if (list.length === 0) continue;
    lines.push(`## ${category}`, '');
    lines.push('| Method | Wire | Form | Parameters |');
    lines.push('|---|---|---|---|');
    for (const spec of list) {
      for (const [method, record] of methods) {
        if (record.wire !== spec.wire) continue;
        covered.add(method);
        const fields = record.params ? interfaces.get(typeNameOf(record.params)) : undefined;
        const params =
          fields && fields.length > 0
            ? fields
                .map((field) => `${field.name}${field.optional ? '?' : ''}: ${field.type}`)
                .join(', ')
            : '(none)';
        lines.push(`| \`${method}\` | \`${spec.wire}\` | ${spec.form} | ${params} |`);
      }
    }
    lines.push('');
    for (const spec of list) {
      if (!spec.note) continue;
      const owners = [...methods].filter(([, record]) => record.wire === spec.wire).map(([name]) => name);
      lines.push(`- \`${owners.join('`, `') || spec.wire}\`: ${spec.note}`);
    }
    lines.push('');
  }

  // Two methods can share one wire action, so `covered` is keyed by method and misses none. A method
  // the loop above did not reach is a real gap and is called out rather than dropped.
  const missed = [...methods].filter(([name]) => !covered.has(name));
  if (missed.length > 0) {
    lines.push('## Methods with no registry entry', '');
    for (const [name, record] of missed) {
      lines.push(`- \`${name}\` sends \`${record.wire ?? '(no send call found)'}\``);
    }
    lines.push('');
  }

  lines.push('## Parameter interfaces', '');
  lines.push('The exact type of every params object the table above refers to, with each optional field marked', '');
  for (const [name, fields] of interfaces) {
    if (fields.length === 0) {
      lines.push(`### ${name}`, '', 'No parameters.', '');
      continue;
    }
    lines.push(`### ${name}`, '');
    for (const field of fields) {
      lines.push(`- \`${field.name}${field.optional ? '?' : ''}: ${field.type}\`${field.doc ? `: ${field.doc}` : ''}`);
    }
    lines.push('');
  }

  const output = `${lines.join('\n')}\n`;
  await writeFile(join(root, '.authoring/actions.md'), output, 'utf8');

  // The guide page is the generated table minus the generator's own header, with a reader-facing
  // introduction. Keeping it in sync mechanically is the point: a hand-copied table rots.
  const body = output.slice(output.indexOf('## session'));
  const page = [
    '# Every action',
    '',
    'Every action the library can send, grouped by category. The **Method** column is what you call on',
    '`client.actions`; the **Wire** column is the string that goes out; the **Form** column is which of the',
    'three outbound shapes the action uses.',
    '',
    'One rule matters more than the rest of this page: an action sent in the wrong form gets no answer.',
    'The protocol document calls that "the single most common way a hand-rolled client does nothing for no',
    'visible reason", and `FormRegistry` exists so that no action method can get it wrong by accident.',
    '',
    'This table is generated from `packages/common/src/actions/` in the mg.js repository, so it cannot',
    'drift from the code. `fuseCrystal` sits against `PlaceCrystal` because it is a convenience over that',
    'wire action with `intent: { type: "merge" }` rather than a wire command of its own.',
    '',
    'Every method takes one params object, not positional arguments, and returns a handle you can `await`.',
    'The store it reads from is covered in [Reading game state](reading-state.md).',
    '',
    body,
  ].join('\n');
  await writeFile(join(root, 'content/action-list.md'), page, 'utf8');

  console.log(`gen:actions: ${specs.length} actions, ${interfaces.size} parameter interfaces`);
}

await main();
