# Publishing TokenSlim to npm

Two packages are published: **`@tokenslim/core`** (engine) and **`@tokenslim/cli`** (command line). Everything else in the monorepo is marked `private` and is never published.

> The unscoped name `tokenslim` is already taken on npm by another project, which is why the packages live under the `@tokenslim` scope.

## One-time setup

1. **Create an npm account** (if you don't have one): https://www.npmjs.com/signup
2. **Create the `tokenslim` organization** (required for the `@tokenslim/...` scope, free for public packages): npmjs.com → profile menu → **Add Organization** → name it `tokenslim` → choose the free/public plan.
3. **Create a token**: npmjs.com → **Access Tokens** → Generate New Token → **Granular Access Token** with *Read and write* permission on packages in the `tokenslim` org (or a classic **Automation** token).
4. **Add the token to GitHub**: repo → **Settings → Secrets and variables → Actions → New repository secret** → name it `NPM_TOKEN`, paste the token.

## Publish via GitHub Actions (recommended)

- Go to the repo's **Actions** tab → **Publish to npm** → **Run workflow**, or
- Publish a **GitHub Release** — the workflow runs automatically.

The workflow runs all tests first, verifies the demo is in sync with the engine, and skips any version that is already on the registry (safe to re-run).

## Publish manually (alternative)

```bash
npm login                      # log in as a member of the tokenslim org
npm test                       # must pass

cd packages/core
npm publish --access public

cd ../cli
npm publish --access public    # depends on @tokenslim/core being published first
```

## Releasing a new version

1. Bump `version` in `packages/core/package.json` and `packages/cli/package.json` (keep them aligned; also bump the `@tokenslim/core` dependency range in the CLI if needed).
2. Run `npm test` and `node scripts/build-demo.js`.
3. Commit, push, and run the publish workflow again.
