# Releasing and updates

A release is a git tag. The tag drives the build, and the file it attaches is what the manager downloads.

```bash
npm version 0.1.1 --no-git-tag-version
git add package.json
git commit -m "release 0.1.1"
git tag v0.1.1
git push origin main --tags
```

`npm version` updates `package.json`, which your build script reads for `@version`. The tag and the version then agree, which is what makes an update visible.

## The workflow

```yaml
name: release
on:
  push:
    tags: ['v*']
permissions:
  contents: write
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - name: Tag must match package.json
        run: |
          version=$(node -p "require('./package.json').version")
          if [ "v$version" != "$GITHUB_REF_NAME" ]; then
            echo "::error::tag $GITHUB_REF_NAME does not match $version"
            exit 1
          fi
      - run: npm run build
      - env:
          GH_TOKEN: ${{ github.token }}
        run: |
          gh release create "$GITHUB_REF_NAME" dist/my-mod.user.js \
            --title "$GITHUB_REF_NAME" --generate-notes
```

The tag check is the one step worth keeping. A tag that disagrees with `package.json` publishes a script claiming a different version than the release it sits in, and installed copies never see the update.

`gh release create` names the asset after the file you give it. That basename has to match the end of `@downloadURL`, so do not rename the build output.

## How an update is found

The manager checks `@updateURL` on its own schedule, downloads the file, reads its metadata, and compares that `@version` against the installed one. A higher version is offered as an update; the new file comes from `@downloadURL`.

| What changed | What the player sees |
|---|---|
| `@version` went up, asset attached | An update prompt. |
| `@version` unchanged | Nothing, however many commits landed. |
| Asset missing or renamed | Nothing. The manager downloaded an error page. |

Version comparison is on dot-separated numbers, so `0.1.10` is newer than `0.1.9`. Keep it numeric.

## Check a release after pushing

```bash
curl -sI https://github.com/you/my-mod/releases/latest/download/my-mod.user.js | head -3
curl -s https://github.com/you/my-mod/releases/latest/download/my-mod.user.js | head -1
```

The first should be a `302`. The second must print `// ==UserScript==`, not an HTML error page.

An existing install updates on its own schedule, so a player may sit on an old version for a while after you publish. Nothing you can set changes that.
