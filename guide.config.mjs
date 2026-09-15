/**
 * The guide's table of contents.
 *
 * The site is built from this list rather than from directory listings, so the reading order is a
 * decision rather than an accident of filenames. Every entry names one file in `content/`; the build
 * fails when a listed page is missing and when a page in `content/` is unlisted, so neither half can
 * drift.
 *
 * Scope rule for this guide: a page exists to get a mod written or to use one feature. How the library
 * works inside belongs in its design docs and the generated API reference, not here.
 */

export const site = {
  title: 'magicgarden.js guide',
  tagline: 'Build a Magic Garden mod on the mg.js packages, and ship it as a userscript.',
  packagesRepository: 'https://github.com/QenuDev/MG.js',
  exampleRepository: 'https://github.com/QenuDev/bootstrapped-example',
  apiReference: 'https://qenudev.github.io/MG.js/',
};

export const sections = [
  {
    title: 'In-page mods',
    pages: [
      ['what-is-mgjs', 'What mg.js is'],
      ['setup', 'Setup'],
      ['reading-state', 'Reading game state'],
      ['watching-changes', 'Reacting to changes'],
      ['drawing', 'Drawing on the screen'],
      ['storage', 'Saving settings'],
      ['debugging', 'When it does not work'],
    ],
  },
  {
    title: 'Shipping a userscript',
    pages: [
      ['building', 'Building your userscript'],
      ['userscript-metadata', 'The metadata block'],
      ['releasing', 'Releasing and updates'],
    ],
  },
  {
    title: 'Headless',
    pages: [
      ['headless', 'Running it in Node'],
      ['auth', 'Getting a session'],
    ],
  },
  {
    title: 'Reference',
    pages: [
      ['action-list', 'Every action'],
    ],
  },
];

/** Flattened page list, in reading order. */
export const pages = sections.flatMap((section) =>
  section.pages.map(([slug, title]) => ({ slug, title, section: section.title })),
);
